import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { HubspotOAuthService } from './hubspot-oauth.service';

@Controller('api/hubspot')
export class HubspotOAuthController {
  constructor(private readonly oauthService: HubspotOAuthService) {}

  /**
   * Initiates the HubSpot OAuth flow.
   * Redirects the user to HubSpot's authorization page.
   *
   * Usage: GET /api/hubspot/connect?orgId=<uuid>
   *
   * In production this orgId would come from the authenticated session,
   * not a query param.
   */
  @Get('connect')
  async connect(
    @Query('orgId') orgId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    const authUrl = await this.oauthService.generateAuthUrl(orgId);
    res.redirect(authUrl);
  }

  /**
   * HubSpot OAuth callback — exchanges the auth code for tokens.
   * Redirects the user to the dashboard on success.
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!code || !state) {
      throw new BadRequestException('code and state are required');
    }

    await this.oauthService.handleCallback(code, state);
    res.redirect('/dashboard?connected=hubspot');
  }

  /**
   * Disconnects HubSpot — clears stored OAuth tokens for the org.
   */
  @Post('disconnect')
  async disconnect(@Body('orgId') orgId: string): Promise<{ ok: boolean }> {
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }

    await this.oauthService.disconnect(orgId);
    return { ok: true };
  }
}
