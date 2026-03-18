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
  HubSpotActivityEngagement,
  HubSpotActivityContent,
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

  async fetchActivityEngagementsForDeal(dealId: string): Promise<HubSpotActivityContent[]> {
    const assocData = await this.get<HubSpotPaginatedResponse<HubSpotAssociation>>(
      `/crm/v3/objects/deals/${dealId}/associations/engagements`,
    );

    const ninety_days_ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const engagements: HubSpotActivityEngagement[] = [];
    for (const assoc of assocData.results) {
      const engagement = await this.get<HubSpotActivityEngagement>(
        `/crm/v3/objects/engagements/${assoc.id}?properties=hs_engagement_type,hs_timestamp,hs_body_preview,hs_task_status,hs_meeting_title,hs_meeting_outcome,hs_call_body,hs_email_subject`,
      );
      engagements.push(engagement);
    }

    return engagements
      .filter((e) => {
        const ts = new Date(e.properties.hs_timestamp);
        return ts >= ninety_days_ago;
      })
      .sort(
        (a, b) =>
          new Date(b.properties.hs_timestamp).getTime() -
          new Date(a.properties.hs_timestamp).getTime(),
      )
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        type: (e.properties.hs_engagement_type ?? 'unknown').toLowerCase(),
        timestamp: new Date(e.properties.hs_timestamp),
        content: this.extractActivityContent(e),
      }));
  }

  private extractActivityContent(e: HubSpotActivityEngagement): string {
    const p = e.properties;
    const type = (p.hs_engagement_type ?? '').toUpperCase();

    let raw = '';
    if (type === 'MEETING') {
      const title = p.hs_meeting_title ?? '';
      const outcome = p.hs_meeting_outcome ?? '';
      raw = [title, outcome].filter(Boolean).join(' — ');
    } else if (type === 'CALL') {
      raw = p.hs_call_body ?? p.hs_body_preview ?? '';
    } else if (type === 'EMAIL') {
      raw = p.hs_email_subject ?? p.hs_body_preview ?? '';
    } else {
      raw = p.hs_body_preview ?? '';
    }

    return raw.slice(0, 300).trim() || '(no content)';
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
