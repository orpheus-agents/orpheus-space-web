<script setup lang="ts">
import { nextTick, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOccurrences } from '../composables/useOccurrences'
import { useSettings } from '../composables/useSettings'
import { formatDate } from '../format'
import { problemCode } from '../occurrence/outcome'
import RefreshStatus from './RefreshStatus.vue'
import PageState from './PageState.vue'
import EmptyState from './EmptyState.vue'
import RelativeTime from './RelativeTime.vue'
import OccurrenceCard from './OccurrenceCard.vue'
import OccurrenceStatus from './OccurrenceStatus.vue'
import ErrorCode from './ErrorCode.vue'
const props = defineProps<{ id: string }>()
const { t, locale } = useI18n()
const { timeZone } = useSettings()
const state = useOccurrences(toRef(props, 'id'))
const { data, pending, error, refresh, updatedAt, disconnected } = state.history
const card = ref<HTMLElement>()
// The card sits under the table; bring it into view when a row is chosen.
watch(state.selected, async (selected) => {
  if (!selected) return
  await nextTick()
  card.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
})
</script>
<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="panel-title">{{ t('history.title') }}</h2>
      <RefreshStatus :updated-at="updatedAt" :disconnected="disconnected" :pending="pending" @refresh="refresh" />
    </div>
    <PageState v-if="!data" :loading="pending" :error="error" @retry="refresh" />
    <EmptyState v-else-if="!data.items.length" :title="t('history.empty')" :hint="t('history.emptyHint')" />
    <div v-else class="panel overflow-x-auto">
      <table class="data-table w-full">
        <thead>
          <tr>
            <th>{{ t('history.scheduled') }}</th>
            <th>{{ t('history.state') }}</th>
            <th>{{ t('history.status') }}</th>
            <th>{{ t('history.error') }}</th>
            <th>{{ t('history.observed') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="run in data.items" :key="run.id" :class="{ 'bg-surface-subtle': state.selected.value === run.id }">
            <td class="whitespace-nowrap">
              <button class="text-left underline underline-offset-4" @click="state.selected.value = run.id">
                {{ formatDate(run.scheduled_at, locale, timeZone) }}
              </button>
            </td>
            <td><OccurrenceStatus :occurrence="{ state: run.state, run_status: null }" /></td>
            <td><OccurrenceStatus v-if="run.run_status" :status="run.run_status" /><span v-else class="text-muted">{{ t('common.none') }}</span></td>
            <td class="max-w-xs text-sm">
              <ErrorCode v-if="problemCode(run)" :code="problemCode(run)!" /><span v-else class="text-muted">{{ t('common.none') }}</span>
            </td>
            <td class="whitespace-nowrap">
              <RelativeTime v-if="run.observed_at" :timestamp="run.observed_at" /><span v-else class="text-muted">{{ t('common.none') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex justify-end gap-3">
      <button v-if="state.cursor.value" class="button" @click="state.cursor.value = undefined">{{ t('common.firstPage') }}</button><button v-if="data?.next_cursor" class="button" @click="state.cursor.value = data.next_cursor">{{ t('common.nextPage') }}</button>
    </div>
    <div v-if="state.selected.value" ref="card" class="scroll-mt-6">
      <OccurrenceCard :state="state" @close="state.selected.value = null" />
    </div>
  </section>
</template>
