import { deriveSeniorityLevel } from '@winnow/core';
import { HubSpotContact } from '../types/hubspot-api.types';

export interface MappedContact {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  seniorityLevel: string;
  role: null;
  addedAt: Date;
}

export function mapContact(contact: HubSpotContact): MappedContact {
  const p = contact.properties;
  return {
    externalId: contact.id,
    email: p.email,
    firstName: p.firstname ?? '',
    lastName: p.lastname ?? '',
    title: p.jobtitle ?? null,
    seniorityLevel: deriveSeniorityLevel(p.jobtitle ?? null),
    role: null,
    addedAt: new Date(p.createdate),
  };
}
