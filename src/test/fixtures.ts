import { ProfileHarness, SettingsBrowser_auth, type Profiles, type Settings, type Template, type Templates, type Services, SessionMode, Status, OccurrenceState, type Schedule, type Occurrence } from '../api/generated'
export const taskID = '11111111-1111-4111-8111-111111111111'
export const occurrenceID = '22222222-2222-4222-8222-222222222222'
export const timestamp = '2026-10-01T10:00:00Z'
export function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: taskID,
    url: null,
    can_edit: true,
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
    services: ['gitlab'],
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
export function template(overrides: Partial<Template> = {}): Template {
  const name = overrides.name ?? 'fixture'
  const [templateName, tag = null] = name.split(':')
  return { id: '33333333-3333-4333-8333-333333333333', name, template_name: templateName, tag, description: 'Standard tools', active: true, is_default: name === 'fixture', ...overrides }
}
export function templates(): Templates {
  return { items: [
    template(),
    template({ id: '44444444-4444-4444-8444-444444444444', name: 'reports:v2', description: 'Tools for reports' }),
  ], next_cursor: null, prev_cursor: null }
}
export function settings(overrides: Partial<Settings> = {}): Settings {
  return { browser_auth: SettingsBrowser_auth.anonymous, default_template: 'fixture', ...overrides }
}
/** Answers a template catalog request like Space: exact `name`, `active` and `name_contains` filters over `items`. */
export function templatePage(url: string, items = templates().items): Templates {
  const query = new URL(url, 'http://localhost').searchParams
  const name = query.get('name'), contains = query.get('name_contains')?.toLowerCase(), active = query.get('active')
  return {
    items: items.filter((item) => (name === null || item.name === name) && (contains === undefined || item.name.toLowerCase().includes(contains)) && (active === null || String(item.active) === active)),
    next_cursor: null, prev_cursor: null,
  }
}

export function services(): Services {
  return { items: [
    { code: 'gitlab', name: 'GitLab', description: 'Work with repositories and merge requests', env_from: ['GITLAB_HOST', 'GITLAB_TOKEN'] },
    { code: 'orpheus-space', name: 'Orpheus Space', description: 'Manage scheduled tasks', env_from: ['ORPHEUS_SPACE_HOST', 'ORPHEUS_SPACE_API_KEY'] },
  ] }
}
