<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Status } from '../api/generated'
import { useSchedules } from '../composables/useSchedules'
import { useSettings } from '../composables/useSettings'
import { formatDate } from '../format'
import RefreshStatus from '../components/RefreshStatus.vue'
import PageState from '../components/PageState.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import OccurrenceStatus from '../components/OccurrenceStatus.vue'
import RelativeTime from '../components/RelativeTime.vue'
import CronDescription from '../components/CronDescription.vue'
const { t, locale } = useI18n()
const { timeZone } = useSettings()
const { data, error, pending, updatedAt, disconnected, refresh, owners, unowned, status, cursor, apply, page, toggle, busy } =
  useSchedules()
</script>
<template>
  <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
    <h1 class="section-title">{{ t('nav.schedules') }}</h1>
    <RouterLink class="button-primary" to="/schedules/new">{{ t('schedule.create') }}</RouterLink>
  </div>
  <form class="panel mb-5 flex flex-wrap items-end gap-4 p-5" @submit.prevent="apply">
    <label class="flex min-w-60 flex-1 flex-col gap-2"><span class="caps text-muted">{{ t('schedule.ownerFilter') }}</span><input v-model="owners" class="field" :disabled="unowned" :placeholder="t('schedule.emailExample')"></label>
    <label class="flex flex-col gap-2"><span class="caps text-muted">{{ t('schedule.status') }}</span><select v-model="status" class="field">
      <option value="">{{ t('common.all') }}</option>
      <option v-for="item in Object.values(Status)" :key="item" :value="item">{{ t(`status.${item}`) }}</option>
    </select></label>
    <label class="flex h-10 items-center gap-2 text-sm"><input v-model="unowned" type="checkbox">{{ t('schedule.sharedOnly') }}</label>
    <button class="button" type="submit">{{ t('common.apply') }}</button>
  </form>
  <div class="mb-4 flex justify-end">
    <RefreshStatus :updated-at="updatedAt" :disconnected="disconnected" :pending="pending" @refresh="refresh" />
  </div>
  <PageState v-if="!data" :loading="pending" :error="error" @retry="refresh" />
  <template v-else>
    <EmptyState v-if="!data.items.length" :title="t('schedule.empty')" :hint="t('schedule.emptyHint')" />
    <div v-else class="panel overflow-x-auto">
      <table class="data-table w-full">
        <thead>
          <tr>
            <th>{{ t('schedule.name') }}</th>
            <th>{{ t('schedule.owner') }}</th>
            <th>{{ t('schedule.status') }}</th>
            <th>{{ t('schedule.lastRun') }}</th>
            <th>{{ t('schedule.next') }}</th>
            <th>{{ t('schedule.timing') }}</th>
            <th>
              <span class="sr-only">{{ t('common.actions') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in data.items" :key="task.id">
            <td class="min-w-48">
              <RouterLink :to="`/schedules/${task.id}`" class="font-semibold hover:underline">{{ task.name }}</RouterLink>
            </td>
            <td>{{ task.owner_email ?? t('schedule.shared') }}</td>
            <td><StatusBadge :tone="task.status === Status.active ? 'ok' : 'muted'" :label="t(`status.${task.status}`)" /></td>
            <td class="whitespace-nowrap">
              <div v-if="task.last_occurrence" class="flex items-center gap-2 font-mono text-xs"><OccurrenceStatus :occurrence="task.last_occurrence" /><RelativeTime class="text-muted" :timestamp="task.last_occurrence.scheduled_at" /></div>
              <span v-else class="text-sm text-muted">{{ t('schedule.neverRan') }}</span>
            </td>
            <td class="whitespace-nowrap font-mono text-xs">
              {{ task.next_run_at ? formatDate(task.next_run_at, locale, timeZone) : t('common.none') }}
            </td>
            <td>
              <CronDescription :expression="task.cron" /><span class="ml-2 whitespace-nowrap text-xs text-muted">{{ task.timezone }}</span>
            </td>
            <td>
              <button class="button" :disabled="busy" @click="toggle(task)">
                {{ task.status === Status.active ? t('schedule.pause') : t('schedule.resume') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-5 flex justify-end gap-3">
      <button v-if="cursor" class="button" @click="page()">{{ t('common.firstPage') }}</button><button v-if="data.next_cursor" class="button" @click="page(data.next_cursor)">{{ t('common.nextPage') }}</button>
    </div>
  </template>
</template>
