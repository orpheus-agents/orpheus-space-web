<script setup lang="ts">
import { computed, defineAsyncComponent, useId } from 'vue'
import { Box, Clock3, UserRound } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { SessionMode, Status } from '../api/generated'
import { formatOffset, timeZones } from '../composables/useSettings'
import { formatDate } from '../format'
import type { useScheduleEditor } from '../composables/useScheduleEditor'
import CatalogField from './CatalogField.vue'
import ServicesField from './ServicesField.vue'
import CronBuilder from './CronBuilder.vue'
import FieldError from './FieldError.vue'
import HeaderMenu from './HeaderMenu.vue'
const { editor } = defineProps<{ editor: ReturnType<typeof useScheduleEditor> }>()
const { t, locale } = useI18n()
const { form, fieldErrors } = editor
const MarkdownEditor = defineAsyncComponent(() => import('./MarkdownEditor.vue'))
const promptErrorId = useId()
const zoneId = useId()
const modelHintId = useId()
const profileModel = computed(() => editor.catalogs.profiles.data.value?.items.find((item) => item.name === form.profile)?.model)
const zoneOptions = computed(() => timeZones().map((value) => ({ value, label: value })))
function changeZone(value: string) {
  form.timezone = value
  editor.invalidatePreview()
}
</script>
<template>
  <form class="space-y-6" @submit.prevent="editor.save">
    <div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section class="panel space-y-5 p-5">
        <label class="block"><span class="mb-2 block caps text-muted">{{ t('schedule.name') }}</span><input v-model="form.name" class="field w-full" required maxlength="200"><FieldError :message="fieldErrors.name" /></label>
        <div>
          <span class="mb-2 block caps text-muted">{{ t('schedule.prompt') }}</span>
          <MarkdownEditor
            v-model="form.prompt"
            :label="t('schedule.prompt')"
            :placeholder="t('schedule.promptHint')"
            :error="fieldErrors.prompt"
            :error-id="promptErrorId"
          />
          <FieldError :id="promptErrorId" :message="fieldErrors.prompt" />
        </div>
        <label class="block"><span class="mb-2 block caps text-muted">{{ t('schedule.owner') }}</span><input
          v-model="form.owner_email"
          :readonly="!editor.canManageAll.value"
          :aria-label="t('schedule.owner')"
          type="email"
          class="field w-full"
          :placeholder="t('schedule.shared')"
        ><FieldError :message="fieldErrors.owner_email" /><span class="mt-2 block text-xs text-muted">{{ editor.canManageAll.value ? t('schedule.ownerHint') : t('schedule.ownOwnerHint') }}</span></label>
      </section>
      <section class="panel space-y-5 p-5">
        <h2 class="panel-title">{{ t('schedule.timing') }}</h2>
        <label class="block"><span class="mb-2 block caps text-muted">{{ t('schedule.status') }}</span><select v-model="form.status" class="field w-full">
          <option v-for="status in Object.values(Status)" :key="status" :value="status">{{ t(`status.${status}`) }}</option>
        </select></label>
        <CronBuilder v-model="form.cron" :error="fieldErrors.cron" @update:model-value="editor.invalidatePreview" />
        <div>
          <label :for="zoneId" class="mb-2 block caps text-muted">{{ t('settings.timezone') }}</label>
          <HeaderMenu
            :field-id="zoneId"
            :label="t('settings.timezone')"
            :icon="Clock3"
            :model-value="form.timezone"
            :text="`${form.timezone} (${formatOffset(form.timezone)})`"
            :options="zoneOptions"
            searchable
            @update:model-value="changeZone"
          />
          <FieldError :message="fieldErrors.timezone" /><span class="mt-2 block text-xs text-muted">{{ t('cron.zoneHint') }}</span>
        </div>
        <button class="button" type="button" :disabled="editor.previewBusy.value" @click="editor.preview">
          {{ t('schedule.preview') }}
        </button>
        <div v-if="editor.times.value.length" class="border-t border-line pt-4">
          <p class="mb-3 text-xs text-muted">{{ t('schedule.previewZone', { zone: form.timezone }) }}</p>
          <ol class="space-y-2 font-mono text-xs">
            <li v-for="time in editor.times.value" :key="time">{{ formatDate(time, locale, form.timezone) }}</li>
          </ol>
        </div>
      </section>
    </div>
    <section class="panel space-y-5 p-5">
      <h2 class="panel-title">{{ t('schedule.execution') }}</h2>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="min-w-0 space-y-5">
          <CatalogField v-model="form.profile" :label="t('schedule.profile')" :icon="UserRound" :items="editor.catalogs.profiles.data.value?.items ?? null" :unavailable="editor.catalogs.profiles.disconnected.value" :error="fieldErrors.profile" />
          <div>
            <label class="block"><span class="mb-2 block caps text-muted">{{ t('schedule.modelOptional') }}</span><input v-model="form.model" :aria-describedby="modelHintId" class="field w-full" :placeholder="profileModel ? t('schedule.modelFromProfile', { model: profileModel }) : t('schedule.modelDefault')"><FieldError :message="fieldErrors.model" /></label>
            <p :id="modelHintId" class="mt-2 text-xs text-muted">{{ t('schedule.modelHint') }}</p>
          </div>
        </div>
        <CatalogField v-model="form.template" :label="t('schedule.template')" :icon="Box" :items="editor.catalogs.templates.data.value?.items ?? null" :unavailable="editor.catalogs.templates.disconnected.value" :error="fieldErrors.template" />
      </div>
      <label class="block max-w-md"><span class="mb-2 block caps text-muted">{{ t('schedule.sessionMode') }}</span><select v-model="form.session_mode" class="field w-full">
        <option v-for="mode in Object.values(SessionMode)" :key="mode" :value="mode">{{ t(`sessionMode.${mode}`) }}</option>
      </select></label>
      <p class="text-sm text-muted">{{ t('schedule.sessionHint') }}</p>
      <ServicesField v-model="form.services" :stored-codes="editor.storedServices.value" :items="editor.catalogs.services.data.value?.items ?? null" :unavailable="editor.catalogs.services.disconnected.value" :error="fieldErrors.services" />
    </section>
    <div class="flex flex-wrap gap-3">
      <button class="button-primary" type="submit" :disabled="editor.busy.value || !editor.canSave.value">{{ t('common.save') }}</button>
      <RouterLink class="button" :to="editor.id ? `/schedules/${editor.id}` : '/schedules'">{{ t('common.cancel') }}</RouterLink>
    </div>
  </form>
</template>
