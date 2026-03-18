export const HUBSPOT_CONFIG = 'HUBSPOT_CONFIG';

export interface HubspotConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export const hubspotConfigFactory = (): { hubspot: HubspotConfig } => {
  return {
    hubspot: {
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
      clientId: process.env.HUBSPOT_CLIENT_ID,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
      redirectUri: process.env.HUBSPOT_REDIRECT_URI,
    },
  };
};
