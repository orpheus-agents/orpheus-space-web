<script setup lang="ts">
import { computed, useId } from 'vue'
import { Box } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Template } from '../api/generated'
import type { TemplateState, useTemplateOptions } from '../composables/useTemplates'
import HeaderMenu from './HeaderMenu.vue'
import FieldError from './FieldError.vue'
import StatusBadge from './StatusBadge.vue'
const props = defineProps<{
  modelValue: string
  current: Template | null
  state: TemplateState
  /** The new form is still resolving the configured default. */
  resolvingDefault: boolean
  options: ReturnType<typeof useTemplateOptions>
  error?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()
const id = useId()
const label = computed(() => t('schedule.template'))
// A just chosen option describes itself until its exact check confirms it.
const shown = computed(() => props.current ?? props.options.items.value.find((item) => item.name === props.modelValue) ?? null)
const blocked = computed(() => props.state === 'inactive' || props.state === 'missing')
const note = (item: Pick<Template, 'is_default'>) => (item.is_default ? t('catalog.default') : undefined)
const choices = computed(() => {
  const rest = props.options.items.value.filter((item) => item.name !== props.modelValue)
    .map((item) => ({ value: item.name, label: item.name, description: item.description, note: note(item), disabled: false }))
  if (!props.modelValue) return rest
  const pinned = {
    value: props.modelValue, label: props.modelValue, description: shown.value?.description,
    note: props.state === 'inactive' ? t('template.inactive') : props.state === 'missing' ? t('catalog.missing') : shown.value ? note(shown.value) : undefined,
    disabled: blocked.value,
  }
  return [pinned, ...rest]
})
const hint = computed(() => {
  if (props.state === 'empty') return t(props.resolvingDefault ? 'catalog.loading' : 'catalog.chooseHint')
  if (props.state === 'active' || (props.state === 'loading' && shown.value)) return undefined
  return t(`template.state.${props.state}`)
})
function end() {
  if (!props.options.moreError.value) void props.options.more()
}
</script>
<template>
  <div class="min-w-0">
    <label :for="id" class="mb-2 block caps text-muted">{{ label }}</label>
    <HeaderMenu
      :field-id="id" :label="label" :icon="Box" :model-value="modelValue"
      :text="modelValue || t('catalog.choose')" :options="choices" searchable remote
      :described-by="`${id}-hint`" :invalid="!!error"
      @update:model-value="emit('update:modelValue', $event)" @search="options.search" @end="end"
    >
      <template #footer>
        <div class="px-3 py-2 text-sm text-muted" aria-live="polite">
          <p v-if="options.error.value" class="flex flex-wrap items-center justify-between gap-2">
            {{ t('catalog.unavailable') }}<button type="button" class="button h-8 px-3" @click="options.reload">{{ t('common.retry') }}</button>
          </p>
          <p v-else-if="options.pending.value">{{ t('catalog.loading') }}</p>
          <p v-else-if="options.loaded.value && !options.items.value.length">{{ t('settings.nothingFound') }}</p>
          <p v-if="options.moreError.value">{{ t('template.moreFailed') }}</p>
          <button
            v-if="options.next.value"
            type="button"
            class="button mt-1 h-8 w-full"
            :aria-busy="options.loadingMore.value"
            @click="options.more"
          >
            {{ options.loadingMore.value ? t('catalog.loading') : t('template.more') }}
          </button>
        </div>
      </template>
    </HeaderMenu>
    <div :id="`${id}-hint`" class="mt-2 space-y-1 text-sm text-muted">
      <StatusBadge v-if="state === 'inactive'" tone="muted" :label="t('template.inactive')" />
      <p v-if="shown?.description" class="whitespace-pre-line break-words">{{ shown.description }}</p>
      <FieldError v-if="error" :message="error" />
      <p v-else-if="hint">{{ hint }}</p>
    </div>
  </div>
</template>
