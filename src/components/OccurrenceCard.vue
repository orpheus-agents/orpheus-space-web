<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OccurrenceState } from '../api/generated'
import type { useOccurrences } from '../composables/useOccurrences'
import { useSettings } from '../composables/useSettings'
import { formatDate, formatDuration } from '../format'
import { durationSeconds, problemCode } from '../occurrence/outcome'
import PageState from './PageState.vue'
import RefreshStatus from './RefreshStatus.vue'
import RelativeTime from './RelativeTime.vue'
import RichText from './RichText.vue'
import OccurrenceStatus from './OccurrenceStatus.vue'
import ErrorCode from './ErrorCode.vue'
const props = defineProps<{ state: ReturnType<typeof useOccurrences> }>()
defineEmits<{ close: [] }>()
const { t, locale } = useI18n()
const { timeZone } = useSettings()
const run = computed(() => props.state.card.data.value)
const duration = computed(() => (run.value ? durationSeconds(run.value) : null))
const waiting = computed(() => run.value?.state === OccurrenceState.pending || run.value?.state === OccurrenceState.dispatching)
// Only an accepted run has a result in the core; closed occurrences without one say so once.
const noRun = computed(() => run.value !== null && run.value.run_id === null && !waiting.value)
</script>
<template>
  <section class="panel p-5">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h3 class="panel-title">{{ t('history.run') }}</h3>
      <button class="button" @click="$emit('close')">{{ t('common.close') }}</button>
    </div>
    <PageState v-if="!run" :loading="state.card.pending.value" :error="state.card.error.value" @retry="state.refresh" />
    <template v-else>
      <RefreshStatus
        :updated-at="state.card.updatedAt.value"
        :disconnected="state.card.disconnected.value"
        :pending="state.card.pending.value || (state.active.value && state.resultPending.value)"
        @refresh="state.refresh"
      />
      <dl class="my-5 grid gap-4 break-all text-sm sm:grid-cols-2">
        <div>
          <dt class="caps mb-1 text-muted">{{ t('history.scheduled') }}</dt>
          <dd>{{ formatDate(run.scheduled_at, locale, timeZone) }}</dd>
        </div>
        <div>
          <dt class="caps mb-1 text-muted">{{ t('history.state') }}</dt>
          <dd><OccurrenceStatus :occurrence="{ state: run.state, run_status: null }" /></dd>
        </div>
        <div v-if="run.run_status">
          <dt class="caps mb-1 text-muted">{{ t('history.status') }}</dt>
          <dd><OccurrenceStatus :status="run.run_status" /></dd>
        </div>
        <div v-if="run.observed_at">
          <dt class="caps mb-1 text-muted">{{ t('history.observed') }}</dt>
          <dd><RelativeTime :timestamp="run.observed_at" /></dd>
        </div>
        <div v-if="run.execution_started_at">
          <dt class="caps mb-1 text-muted">{{ t('history.started') }}</dt>
          <dd>{{ formatDate(run.execution_started_at, locale, timeZone) }}</dd>
        </div>
        <div v-if="run.finished_at">
          <dt class="caps mb-1 text-muted">{{ t('history.finished') }}</dt>
          <dd>{{ formatDate(run.finished_at, locale, timeZone) }}<span v-if="duration !== null" class="ml-2 font-mono text-xs text-muted">{{ formatDuration(duration, locale) }}</span></dd>
        </div>
        <div v-if="waiting">
          <dt class="caps mb-1 text-muted">{{ t('history.attempts') }}</dt>
          <dd>{{ run.attempts }}<template v-if="run.next_attempt_at"> · {{ t('history.nextAttempt') }} <RelativeTime :timestamp="run.next_attempt_at" /></template></dd>
        </div>
        <div v-if="run.session_id">
          <dt class="caps mb-1 text-muted">{{ t('history.session') }}</dt>
          <dd class="font-mono">{{ run.session_id }}</dd>
        </div>
        <div v-if="run.run_id">
          <dt class="caps mb-1 text-muted">{{ t('history.runId') }}</dt>
          <dd class="font-mono">{{ run.run_id }}</dd>
        </div>
        <div v-if="problemCode(run)" class="sm:col-span-2">
          <dt class="caps mb-1 text-muted">{{ t('history.error') }}</dt>
          <dd><ErrorCode :code="problemCode(run)!" /></dd>
        </div>
      </dl>
      <p v-if="run.sync_error_code" class="mb-4 text-sm text-danger-ink">{{ t('history.syncError') }} <ErrorCode :code="run.sync_error_code" /></p>
      <p v-if="noRun" class="border-t border-line pt-5 text-sm text-muted">{{ t('history.noRun') }}</p>
      <div v-else-if="state.active.value" class="border-t border-line pt-5" :aria-busy="state.resultPending.value">
        <p v-if="state.resultPending.value && !state.result.value" class="text-sm text-muted">{{ t('common.loading') }}</p>
        <p v-if="state.resultProblem.value" class="mt-4 text-sm text-danger-ink" role="alert">{{ t(state.resultProblem.value) }}</p>
        <div v-if="state.result.value" :class="{ 'mt-5': state.resultProblem.value }">
          <p class="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span>{{ t('history.fetched', { time: formatDate(state.result.value.fetched_at, locale, timeZone) }) }}</span><span aria-hidden="true">·</span><OccurrenceStatus :status="state.result.value.run_status" />
          </p>
          <RichText v-if="state.result.value.final_message" :text="state.result.value.final_message.text" />
          <p v-else class="text-sm text-muted">{{ t('history.noResult') }}</p>
          <p v-if="state.result.value.error" class="mt-4 text-sm text-danger-ink">
            {{ state.result.value.error.code }}: {{ state.result.value.error.message }}
          </p>
        </div>
      </div>
    </template>
  </section>
</template>
