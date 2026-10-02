import { OccurrenceState, type Occurrence } from '../api/generated'

/** One accent: states in motion glow, ok is the accent marker with plain text, settled states are ink,
 * failures are danger, the rest is muted. */
export type Tone = 'live' | 'ok' | 'settled' | 'failed' | 'muted'

/** Core run statuses, stored verbatim by the worker; unknown values keep their raw name. */
export const RUN_STATUSES = ['accepted', 'starting', 'running', 'cancelling', 'finalizing', 'completed', 'failed', 'cancelled'] as const

function isRunStatus(value: string): boolean {
  return (RUN_STATUSES as readonly string[]).includes(value)
}

function stateTone(state: OccurrenceState): Tone {
  switch (state) {
    case OccurrenceState.pending:
    case OccurrenceState.dispatching:
    case OccurrenceState.accepted:
      return 'live'
    case OccurrenceState.failed:
      return 'failed'
    case OccurrenceState.skipped:
    case OccurrenceState.cancelled:
      return 'muted'
  }
}

function runTone(status: string): Tone {
  switch (status) {
    case 'completed':
      return 'settled'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'muted'
    default:
      return 'live'
  }
}

/** A translation key, or the raw value when the core reports a status the dictionary lacks. */
export type Outcome = { label: string; translate: boolean; tone: Tone }

/** What a schedule's run came to: the run status once the core accepted it, the dispatch state otherwise. */
export function outcome(occurrence: Pick<Occurrence, 'state' | 'run_status'>): Outcome {
  if (occurrence.state === OccurrenceState.accepted && occurrence.run_status) return runOutcome(occurrence.run_status)
  return { label: `occurrence.${occurrence.state}`, translate: true, tone: stateTone(occurrence.state) }
}

export function runOutcome(status: string): Outcome {
  return isRunStatus(status) ? { label: `runStatus.${status}`, translate: true, tone: runTone(status) } : { label: status, translate: false, tone: runTone(status) }
}

/** Codes Space or the core store on an occurrence; the dictionary keeps a sentence for each. */
export const ERROR_CODES = [
  'previous_run_active',
  'schedule_inactive',
  'validation_error',
  'unknown_profile',
  'unknown_template',
  'capacity_exhausted',
  'session_busy',
  'idempotency_conflict',
  'unauthorized',
  'session_not_found',
  'run_not_found',
  'token_limit_exceeded',
  'session_unavailable',
  'storage_unavailable',
  'core_unavailable',
  'multiple_runs_not_allowed',
  'request_too_large',
] as const

export function isErrorCode(value: string): value is (typeof ERROR_CODES)[number] {
  return (ERROR_CODES as readonly string[]).includes(value)
}

/** The first stored problem: the dispatch error, then the run's own error. */
export function problemCode(occurrence: Pick<Occurrence, 'error_code' | 'run_error_code'>): string | null {
  return occurrence.error_code ?? occurrence.run_error_code ?? null
}

export function durationSeconds(occurrence: Pick<Occurrence, 'execution_started_at' | 'finished_at'>): number | null {
  if (!occurrence.execution_started_at || !occurrence.finished_at) return null
  const seconds = (Date.parse(occurrence.finished_at) - Date.parse(occurrence.execution_started_at)) / 1000
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}
