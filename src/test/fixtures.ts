import { ProfileHarness, type Profiles, type Templates, SessionMode, Status, OccurrenceState, type Schedule, type Occurrence } from '../api/generated'
export const taskID = '11111111-1111-4111-8111-111111111111'
export const occurrenceID = '22222222-2222-4222-8222-222222222222'
export const timestamp = '2026-10-01T10:00:00Z'
export function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: taskID,
    url: null,
    name: 'Daily report',
    prompt: 'Summarize incidents',
    cron: '0 9 * * *',
    timezone: 'Europe/Moscow',
    status: Status.active,
    model: null,
    profile: 'default',
    template: 'fixture',
    session_mode: SessionMode.reuse,
    owner_email: 'alice@example.com',
    env_from: ['B'],
    created_at: timestamp,
    updated_at: timestamp,
    next_run_at: timestamp,
    deleted_at: null,
    last_occurrence: null,
    ...overrides,
  }
}
export function occurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: occurrenceID,
    schedule_id: taskID,
    scheduled_at: timestamp,
    state: OccurrenceState.accepted,
    created_at: timestamp,
    updated_at: timestamp,
    session_id: taskID,
    run_id: occurrenceID,
    run_status: 'completed',
    observed_at: timestamp,
    execution_started_at: timestamp,
    finished_at: timestamp,
    run_error_code: null,
    sync_error_code: null,
    error_code: null,
    attempts: 1,
    next_attempt_at: null,
    ...overrides,
  }
}

export function profiles(): Profiles {
  return { items: [
    { name: 'default', description: 'General agent', harness: ProfileHarness.codex, model: 'default-model', codex: {}, instructions: '', is_default: true },
    { name: 'research', description: 'Search and compare sources', harness: ProfileHarness.codex, model: 'research-model', codex: {}, instructions: '', is_default: false },
  ] }
}
export function templates(): Templates {
  return { items: [
    { name: 'fixture', description: 'Standard tools', is_default: true },
    { name: 'reports:v2', description: 'Tools for reports', is_default: false },
  ] }
}
