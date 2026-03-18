import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  hub_id: number;
}

const TOKEN_ENDPOINT = 'https://api.hubapi.com/oauth/v1/token';
const AUTHORIZE_URL = 'https://app.hubspot.com/oauth/authorize';
const OAUTH_SCOPES = 'crm.objects.deals.read crm.objects.contacts.read crm.objects.owners.read';

// Buffer (seconds) before token expiry to trigger a refresh
const REFRESH_BUFFER_SECONDS = 60;

@Injectable()
export class HubspotOAuthService {
  private readonly logger = new Logger(HubspotOAuthService.name);
  // Deduplicates concurrent refresh requests per org
  private readonly refreshPromises = new Map<string, Promise<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateAuthUrl(orgId: string): Promise<string> {
    const clientId = this.requireConfig('hubspot.clientId');
    const redirectUri = this.requireConfig('hubspot.redirectUri');

    const state = Buffer.from(`${orgId}:${randomUUID()}`).toString('base64url');

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { hubspotOAuthState: state },
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
      state,
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const decoded = Buffer.from(state, 'base64url').toString();
    const orgId = decoded.split(':')[0];

    if (!orgId) {
      throw new UnauthorizedException('Malformed OAuth state');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });

    if (!org || org.hubspotOAuthState !== state) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const tokens = await this.exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        hubspotPortalId: String(tokens.hub_id),
        hubspotAccessToken: tokens.access_token,
        hubspotRefreshToken: tokens.refresh_token,
        hubspotTokenExpiresAt: expiresAt,
        hubspotOAuthState: null,
        crmConnectedAt: new Date(),
      },
    });

    this.logger.log(`HubSpot OAuth complete for org ${orgId}, portal ${tokens.hub_id}`);

    return orgId;
  }

  async getAccessToken(orgId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    if (!org.hubspotAccessToken || !org.hubspotRefreshToken) {
      throw new Error(`Organization ${orgId} has no HubSpot OAuth tokens — run the connect flow first`);
    }

    const now = Date.now();
    const expiresAt = org.hubspotTokenExpiresAt?.getTime() ?? 0;
    const isExpiringSoon = expiresAt - now < REFRESH_BUFFER_SECONDS * 1000;

    if (isExpiringSoon) {
      return this.refreshAccessToken(orgId, org.hubspotRefreshToken);
    }

    return org.hubspotAccessToken;
  }

  async disconnect(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        hubspotPortalId: null,
        hubspotAccessToken: null,
        hubspotRefreshToken: null,
        hubspotTokenExpiresAt: null,
        hubspotOAuthState: null,
      },
    });

    this.logger.log(`HubSpot disconnected for org ${orgId}`);
  }

  private async refreshAccessToken(orgId: string, refreshToken: string): Promise<string> {
    // Return the in-flight promise if a refresh is already in progress for this org
    const existing = this.refreshPromises.get(orgId);
    if (existing) return existing;

    const promise = this.doRefresh(orgId, refreshToken).finally(() => {
      this.refreshPromises.delete(orgId);
    });

    this.refreshPromises.set(orgId, promise);
    return promise;
  }

  private async doRefresh(orgId: string, refreshToken: string): Promise<string> {
    const clientId = this.requireConfig('hubspot.clientId');
    const clientSecret = this.requireConfig('hubspot.clientSecret');

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HubSpot token refresh failed (${response.status}): ${body}`);
    }

    const tokens: HubSpotTokenResponse = await response.json() as HubSpotTokenResponse;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        hubspotAccessToken: tokens.access_token,
        hubspotRefreshToken: tokens.refresh_token,
        hubspotTokenExpiresAt: expiresAt,
      },
    });

    this.logger.log(`Refreshed HubSpot token for org ${orgId}`);

    return tokens.access_token;
  }

  private async exchangeCode(code: string): Promise<HubSpotTokenResponse> {
    const clientId = this.requireConfig('hubspot.clientId');
    const clientSecret = this.requireConfig('hubspot.clientSecret');
    const redirectUri = this.requireConfig('hubspot.redirectUri');

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HubSpot code exchange failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<HubSpotTokenResponse>;
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`Missing required config: ${key}`);
    return value;
  }
}
