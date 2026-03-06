import { DealContact, ActivityType } from '@winnow/core';
import { uuid, randomInt, addDays, subtractDays, randomElement } from './utils';
import { generateFirstName, generateLastName, generateEmail, generateTitle } from './names';
import { deriveSeniorityLevel } from './utils';

export function generateContact(
  _dealId: string,
  companyName: string,
  addedAt: Date,
  seniorityPreference?: 'c_level' | 'vp' | 'director' | 'manager' | 'individual'
): DealContact {
  const firstName = generateFirstName();
  const lastName = generateLastName();
  const title = generateTitle(seniorityPreference);
  const seniorityLevel = deriveSeniorityLevel(title);

  return {
    id: uuid(),
    externalId: `contact-${uuid()}`,
    email: generateEmail(firstName, lastName, companyName),
    firstName,
    lastName,
    title,
    seniorityLevel,
    role: Math.random() > 0.5 ? 'Decision Maker' : 'Influencer',
    addedAt,
  };
}

export function generateContacts(
  dealId: string,
  companyName: string,
  count: number,
  dealCreatedAt: Date,
  dealAmount: number
): DealContact[] {
  const contacts: DealContact[] = [];

  // For larger deals, ensure we have some senior contacts
  const needsSeniorContacts = dealAmount > 5000000; // $50k+

  for (let i = 0; i < count; i++) {
    // Add contacts at various points in the deal lifecycle
    const daysAfterCreation = randomInt(0, 30);
    const addedAt = addDays(dealCreatedAt, daysAfterCreation);

    let seniorityPreference: 'c_level' | 'vp' | 'director' | 'manager' | 'individual' | undefined;

    // First contact for large deals should be senior
    if (i === 0 && needsSeniorContacts) {
      const rand = Math.random();
      if (rand < 0.3) seniorityPreference = 'c_level';
      else if (rand < 0.6) seniorityPreference = 'vp';
      else seniorityPreference = 'director';
    }

    contacts.push(generateContact(dealId, companyName, addedAt, seniorityPreference));
  }

  return contacts;
}

export interface DealActivity {
  id: string;
  type: ActivityType;
  timestamp: Date;
  description: string | null;
}

const ACTIVITY_DESCRIPTIONS: Record<ActivityType, string[]> = {
  stage_change: ['Stage updated'],
  contact_added: ['New contact added to deal'],
  note_created: [
    'Called prospect, left voicemail',
    'Demo went well, next steps discussed',
    'Pricing questions addressed',
    'Technical questions answered',
    'Follow-up email sent',
  ],
  task_created: [
    'Schedule demo',
    'Send proposal',
    'Follow up on pricing',
    'Schedule technical call',
    'Send contract',
  ],
  task_completed: [
    'Demo completed',
    'Proposal sent',
    'Technical call completed',
    'Contract sent',
  ],
  field_updated: [
    'Close date updated',
    'Amount updated',
    'Deal owner changed',
  ],
};

export function generateActivity(type: ActivityType, timestamp: Date): DealActivity {
  return {
    id: uuid(),
    type,
    timestamp,
    description: randomElement(ACTIVITY_DESCRIPTIONS[type]),
  };
}

export function generateActivities(
  dealCreatedAt: Date,
  currentDate: Date,
  stageChanges: { fromStage: string; toStage: string; changedAt: Date }[],
  isStale: boolean = false
): DealActivity[] {
  const activities: DealActivity[] = [];

  // Add stage change activities
  for (const change of stageChanges) {
    activities.push(generateActivity('stage_change', change.changedAt));
  }

  if (isStale) {
    // For stale deals, only add old activities
    const staleCutoff = subtractDays(currentDate, 14);
    const activityCount = randomInt(1, 3);

    for (let i = 0; i < activityCount; i++) {
      const daysSinceCreation = randomInt(0, Math.floor((staleCutoff.getTime() - dealCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));
      const timestamp = addDays(dealCreatedAt, daysSinceCreation);

      const activityType = randomElement<ActivityType>(['note_created', 'task_completed', 'field_updated']);
      activities.push(generateActivity(activityType, timestamp));
    }
  } else {
    // For active deals, add recent activities
    const activityCount = randomInt(3, 8);
    const daysSinceCreation = Math.floor((currentDate.getTime() - dealCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < activityCount; i++) {
      const daysAgo = randomInt(0, Math.min(daysSinceCreation, 30));
      const timestamp = subtractDays(currentDate, daysAgo);

      const activityType = randomElement<ActivityType>([
        'note_created',
        'task_created',
        'task_completed',
        'contact_added',
        'field_updated',
      ]);

      activities.push(generateActivity(activityType, timestamp));
    }
  }

  // Sort activities chronologically
  return activities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
