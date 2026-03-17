import { ActivityType } from '@winnow/core';

export function mapEngagementType(hsType: string, status?: string): ActivityType | null {
  switch (hsType) {
    case 'NOTE':
    case 'CALL':
    case 'EMAIL':
    case 'MEETING':
      return 'note_created';
    case 'TASK':
      return status === 'COMPLETED' ? 'task_completed' : 'task_created';
    default:
      return null;
  }
}
