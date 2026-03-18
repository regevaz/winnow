import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { HubspotOAuthService } from '../hubspot-oauth.service';
import { PrismaService } from '../../prisma/prisma.service';

const BASE_CONFIG = {
  'hubspot.clientId': 'test-client-id',
  'hubspot.clientSecret': 'test-client-secret',
  'hubspot.redirectUri': 'http://localhost:3000/api/hubspot/callback',
};

const mockOrg = {
  id: 'org-uuid',
  name: 'Test Org',
  crmType: 'hubspot',
  hubspotPortalId: null,
  hubspotAccessToken: null,
  hubspotRefreshToken: null,
  hubspotTokenExpiresAt: null,
  hubspotOAuthState: null,
  crmConnectedAt: null,
  createdAt: new Date(),
};

describe('HubspotOAuthService', () => {
  let service: HubspotOAuthService;
  let prisma: {
    organization: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    configService = {
      get: jest.fn((key: string) => BASE_CONFIG[key as keyof typeof BASE_CONFIG]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubspotOAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<HubspotOAuthService>(HubspotOAuthService);
  });

  describe('generateAuthUrl()', () => {
    it('returns a valid HubSpot authorization URL', async () => {
      prisma.organization.update.mockResolvedValue({});

      const url = await service.generateAuthUrl('org-uuid');

      expect(url).toContain('https://app.hubspot.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=');
      expect(url).toContain('state=');
    });

    it('stores the state token on the organization', async () => {
      await service.generateAuthUrl('org-uuid');

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-uuid' },
          data: expect.objectContaining({ hubspotOAuthState: expect.any(String) }),
        }),
      );
    });

    it('encodes orgId in the state', async () => {
      await service.generateAuthUrl('org-uuid');

      const updateCall = prisma.organization.update.mock.calls[0][0];
      const state: string = updateCall.data.hubspotOAuthState;
      const decoded = Buffer.from(state, 'base64url').toString();

      expect(decoded.startsWith('org-uuid:')).toBe(true);
    });

    it('throws when clientId is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.generateAuthUrl('org-uuid')).rejects.toThrow('Missing required config');
    });
  });

  describe('handleCallback()', () => {
    const buildState = (orgId: string) =>
      Buffer.from(`${orgId}:some-uuid`).toString('base64url');

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 1800,
            token_type: 'Bearer',
            hub_id: 99999,
          }),
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('exchanges code and stores tokens', async () => {
      const state = buildState('org-uuid');
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        hubspotOAuthState: state,
      });

      const returnedOrgId = await service.handleCallback('auth-code-123', state);

      expect(returnedOrgId).toBe('org-uuid');
      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-uuid' },
          data: expect.objectContaining({
            hubspotPortalId: '99999',
            hubspotAccessToken: 'new-access-token',
            hubspotRefreshToken: 'new-refresh-token',
            hubspotTokenExpiresAt: expect.any(Date),
            hubspotOAuthState: null,
          }),
        }),
      );
    });

    it('throws UnauthorizedException when state does not match stored value', async () => {
      const state = buildState('org-uuid');
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        hubspotOAuthState: 'a-different-state',
      });

      await expect(service.handleCallback('auth-code-123', state)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when org not found', async () => {
      const state = buildState('org-uuid');
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.handleCallback('auth-code-123', state)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when HubSpot token exchange fails', async () => {
      const state = buildState('org-uuid');
      prisma.organization.findUnique.mockResolvedValue({
        ...mockOrg,
        hubspotOAuthState: state,
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid_grant'),
      });

      await expect(service.handleCallback('bad-code', state)).rejects.toThrow(
        'HubSpot code exchange failed',
      );
    });
  });

  describe('getAccessToken()', () => {
    it('returns stored access token when not expired', async () => {
      const futureExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        ...mockOrg,
        hubspotAccessToken: 'valid-token',
        hubspotRefreshToken: 'refresh-token',
        hubspotTokenExpiresAt: futureExpiry,
      });

      const token = await service.getAccessToken('org-uuid');

      expect(token).toBe('valid-token');
    });

    it('refreshes token when it is about to expire', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 1000); // 30 sec — within buffer
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        ...mockOrg,
        hubspotAccessToken: 'expiring-token',
        hubspotRefreshToken: 'refresh-token',
        hubspotTokenExpiresAt: soonExpiry,
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'refreshed-token',
            refresh_token: 'new-refresh-token',
            expires_in: 1800,
            token_type: 'Bearer',
            hub_id: 99999,
          }),
      });

      const token = await service.getAccessToken('org-uuid');

      expect(token).toBe('refreshed-token');
    });

    it('deduplicates concurrent refresh requests for the same org', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 1000);
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        ...mockOrg,
        hubspotAccessToken: 'expiring-token',
        hubspotRefreshToken: 'refresh-token',
        hubspotTokenExpiresAt: soonExpiry,
      });

      let fetchCallCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'refreshed-token',
              refresh_token: 'new-refresh-token',
              expires_in: 1800,
              token_type: 'Bearer',
              hub_id: 99999,
            }),
        });
      });

      // Trigger 3 concurrent refresh calls
      const [t1, t2, t3] = await Promise.all([
        service.getAccessToken('org-uuid'),
        service.getAccessToken('org-uuid'),
        service.getAccessToken('org-uuid'),
      ]);

      expect(t1).toBe('refreshed-token');
      expect(t2).toBe('refreshed-token');
      expect(t3).toBe('refreshed-token');
      // Only one actual HTTP call should have been made
      expect(fetchCallCount).toBe(1);
    });

    it('throws when org has no OAuth tokens', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        ...mockOrg,
        hubspotAccessToken: null,
        hubspotRefreshToken: null,
      });

      await expect(service.getAccessToken('org-uuid')).rejects.toThrow('no HubSpot OAuth tokens');
    });
  });

  describe('disconnect()', () => {
    it('clears all OAuth fields on the organization', async () => {
      await service.disconnect('org-uuid');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-uuid' },
        data: {
          hubspotPortalId: null,
          hubspotAccessToken: null,
          hubspotRefreshToken: null,
          hubspotTokenExpiresAt: null,
          hubspotOAuthState: null,
        },
      });
    });
  });
});
