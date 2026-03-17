import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HubSpotPipeline,
  HubSpotDeal,
  HubSpotContact,
  HubSpotEngagement,
  HubSpotPropertyHistoryEntry,
  HubSpotPaginatedResponse,
  HubSpotAssociation,
} from './types/hubspot-api.types';

const BASE_URL = 'https://api.hubapi.com';

@Injectable()
export class HubspotApiClient {
  private readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('hubspot.accessToken') ?? '';
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HubSpot API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async fetchPipelines(): Promise<HubSpotPipeline[]> {
    const data = await this.get<HubSpotPaginatedResponse<HubSpotPipeline>>(
      '/crm/v3/pipelines/deals',
    );
    return data.results;
  }

  async fetchAllDeals(): Promise<HubSpotDeal[]> {
    const deals: HubSpotDeal[] = [];
    let after: string | undefined;

    do {
      const params = new URLSearchParams({
        properties:
          'dealname,amount,currency,closedate,pipeline,dealstage,createdate,hs_lastmodifieddate,hubspot_owner_id',
        limit: '100',
      });
      if (after) params.set('after', after);

      const data = await this.get<HubSpotPaginatedResponse<HubSpotDeal>>(
        `/crm/v3/objects/deals?${params.toString()}`,
      );

      deals.push(...data.results);
      after = data.paging?.next?.after;
    } while (after);

    return deals;
  }

  async fetchContactsForDeal(dealId: string): Promise<HubSpotContact[]> {
    const assocData = await this.get<HubSpotPaginatedResponse<HubSpotAssociation>>(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`,
    );

    const contacts: HubSpotContact[] = [];
    for (const assoc of assocData.results) {
      const contact = await this.get<HubSpotContact>(
        `/crm/v3/objects/contacts/${assoc.id}?properties=email,firstname,lastname,jobtitle,createdate`,
      );
      contacts.push(contact);
    }

    return contacts;
  }

  async fetchEngagementsForDeal(dealId: string): Promise<HubSpotEngagement[]> {
    const assocData = await this.get<HubSpotPaginatedResponse<HubSpotAssociation>>(
      `/crm/v3/objects/deals/${dealId}/associations/engagements`,
    );

    const engagements: HubSpotEngagement[] = [];
    for (const assoc of assocData.results) {
      const engagement = await this.get<HubSpotEngagement>(
        `/crm/v3/objects/engagements/${assoc.id}?properties=hs_engagement_type,hs_timestamp,hs_body_preview,hs_task_status`,
      );
      engagements.push(engagement);
    }

    return engagements;
  }

  async fetchStageHistory(dealId: string): Promise<HubSpotPropertyHistoryEntry[]> {
    const data = await this.get<{
      propertiesWithHistory: { dealstage: HubSpotPropertyHistoryEntry[] };
    }>(
      `/crm/v3/objects/deals/${dealId}?propertiesWithHistory=dealstage`,
    );

    return data.propertiesWithHistory?.dealstage ?? [];
  }

  async fetchOwnerName(ownerId: string): Promise<string> {
    const data = await this.get<{
      id: string;
      firstName: string;
      lastName: string;
    }>(`/crm/v3/owners/${ownerId}`);

    return `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
  }
}
