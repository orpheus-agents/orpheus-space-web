<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Status, SessionMode } from '../api/generated'
import { useSchedule } from '../composables/useSchedule'
import { useSettings } from '../composables/useSettings'
import { formatDate } from '../format'
import PageState from '../components/PageState.vue'
import RefreshStatus from '../components/RefreshStatus.vue'
import HistoryPanel from '../components/HistoryPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import RichText from '../components/RichText.vue'
const { t, locale } = useI18n()
const { timeZone } = useSettings()
const { data, error, pending, updatedAt, disconnected, refresh, toggle, busy, confirm, execute } = useSchedule()
</script>
<template>
  <PageState v-if="!data" :loading="pending" :error="error" @retry="refresh" />
  <template v-else>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="section-title break-words">{{ data.name }}</h1>
      <RefreshStatus :updated-at="updatedAt" :disconnected="disconnected" :pending="pending" @refresh="refresh" />
    </div>
    <div v-if="!data.deleted_at" class="mb-6 flex flex-wrap gap-3">
      <RouterLink class="button-primary" :to="`/schedules/${data.id}/edit`">{{ t('schedule.edit') }}</RouterLink>
      <button class="button" :disabled="busy" @click="toggle">
        {{ data.status === Status.active ? t('schedule.pause') : t('schedule.resume') }}
      </button>
      <button v-if="data.session_mode === SessionMode.reuse" class="button" :disabled="busy" @click="confirm = 'reset'">
        {{ t('schedule.reset') }}
      </button>
      <button class="button text-danger-ink" :disabled="busy" @click="confirm = 'delete'">{{ t('common.delete') }}</button>
    </div>
    <p v-else class="mb-6 text-sm text-muted">{{ t('schedule.deleted') }}</p>
    <div v-if="confirm" class="panel mb-6 flex flex-wrap items-center gap-4 p-5" role="alert">
      <p class="mr-auto">{{ confirm === 'delete' ? t('schedule.deleteConfirm') : t('schedule.resetConfirm') }}</p>
      <button class="button" :disabled="busy" @click="confirm = null">{{ t('common.cancel') }}</button><button class="button-primary" :disabled="busy" @click="execute">{{ t('common.confirm') }}</button>
    </div>
    <section class="panel mb-8 p-5">
      <dl class="mb-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.status') }}</dt>
          <dd><StatusBadge :tone="data.status === Status.active ? 'ok' : 'muted'" :label="t(`status.${data.status}`)" /></dd>
        </div>
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.owner') }}</dt>
          <dd>{{ data.owner_email ?? t('schedule.shared') }}</dd>
        </div>
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.cron') }}</dt>
          <dd class="font-mono"><span class="whitespace-nowrap">{{ data.cron }}</span> · {{ data.timezone }}</dd>
        </div>
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.next') }}</dt>
          <dd>{{ data.next_run_at ? formatDate(data.next_run_at, locale, timeZone) : t('common.none') }}</dd>
        </div>
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.model') }}</dt>
          <dd>{{ data.model ?? t('schedule.modelDefault') }}</dd>
        </div>
        <div>
          <dt class="caps mb-2 text-muted">{{ t('schedule.sessionMode') }}</dt>
          <dd>{{ t(`sessionMode.${data.session_mode}`) }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="caps mb-2 text-muted">{{ t('schedule.extraEnv') }}</dt>
          <dd class="font-mono">{{ data.env_from.join(', ') || t('common.none') }}</dd>
        </div>
      </dl>
      <h2 class="caps mb-3 text-muted">{{ t('schedule.prompt') }}</h2>
      <RichText :text="data.prompt" />
    </section>
    <HistoryPanel :id="data.id" />
  </template>
</template>
