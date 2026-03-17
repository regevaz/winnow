import { mapEngagementType } from '../mappers/activity-type.mapper';

describe('mapEngagementType', () => {
  it('maps NOTE to note_created', () => {
    expect(mapEngagementType('NOTE')).toBe('note_created');
  });

  it('maps CALL to note_created', () => {
    expect(mapEngagementType('CALL')).toBe('note_created');
  });

  it('maps EMAIL to note_created', () => {
    expect(mapEngagementType('EMAIL')).toBe('note_created');
  });

  it('maps MEETING to note_created', () => {
    expect(mapEngagementType('MEETING')).toBe('note_created');
  });

  it('maps TASK with COMPLETED status to task_completed', () => {
    expect(mapEngagementType('TASK', 'COMPLETED')).toBe('task_completed');
  });

  it('maps TASK without status to task_created', () => {
    expect(mapEngagementType('TASK')).toBe('task_created');
  });

  it('maps TASK with non-COMPLETED status to task_created', () => {
    expect(mapEngagementType('TASK', 'IN_PROGRESS')).toBe('task_created');
  });

  it('returns null for unknown type', () => {
    expect(mapEngagementType('UNKNOWN')).toBeNull();
  });
});
