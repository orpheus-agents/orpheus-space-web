<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useScheduleEditor } from '../composables/useScheduleEditor'
import ScheduleForm from '../components/ScheduleForm.vue'
import PageState from '../components/PageState.vue'
const { t } = useI18n()
const editor = useScheduleEditor()
</script>
<template>
  <h1 class="section-title mb-8">{{ editor.id ? t('schedule.edit') : t('schedule.create') }}</h1>
  <PageState
    v-if="editor.loading.value || editor.error.value"
    :loading="editor.loading.value"
    :error="editor.error.value"
    @retry="editor.load"
  />
  <ScheduleForm v-else :editor="editor" />
</template>
