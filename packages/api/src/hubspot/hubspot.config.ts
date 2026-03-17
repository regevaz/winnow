export const HUBSPOT_CONFIG = 'HUBSPOT_CONFIG';

export interface HubspotConfig {
  accessToken: string;
}

export const hubspotConfigFactory = (): { hubspot: HubspotConfig } => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN is required');
  return { hubspot: { accessToken: token } };
};
