<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useScheduleEditor } from '../composables/useScheduleEditor'
import ScheduleForm from '../components/ScheduleForm.vue'
import RefreshStatus from '../components/RefreshStatus.vue'
import PageState from '../components/PageState.vue'
const { t } = useI18n()
const editor = useScheduleEditor()
</script>
<template>
  <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
    <h1 class="section-title">{{ editor.id ? t('schedule.edit') : t('schedule.create') }}</h1>
    <RefreshStatus :updated-at="null" :disconnected="editor.catalogs.disconnected.value" :pending="editor.catalogs.pending.value" @refresh="editor.catalogs.refresh" />
  </div>
  <PageState
    v-if="editor.loading.value || editor.error.value"
    :loading="editor.loading.value"
    :error="editor.error.value"
    @retry="editor.load"
  />
  <ScheduleForm v-else :editor="editor" />
</template>
