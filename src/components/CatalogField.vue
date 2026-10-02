<script setup lang="ts">
import { computed, useId, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Profile } from '../api/generated'
import HeaderMenu from './HeaderMenu.vue'
import FieldError from './FieldError.vue'
const props = defineProps<{
  modelValue: string
  label: string
  icon: Component
  items: Pick<Profile, 'name' | 'description' | 'is_default'>[] | null
  unavailable: boolean
  error?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()
const id = useId()
const selected = computed(() => props.items?.find((item) => item.name === props.modelValue))
const missing = computed(() => props.items !== null && !props.unavailable && !!props.modelValue && !selected.value)
const options = computed(() => {
  const choices = (props.items ?? []).map((item) => ({ value: item.name, label: item.name, description: item.description, note: item.is_default ? t('catalog.default') : undefined, disabled: false }))
  if (missing.value) choices.unshift({ value: props.modelValue, label: props.modelValue, description: null, note: t('catalog.missing'), disabled: true })
  return choices
})
</script>
<template>
  <div class="min-w-0">
    <label :for="id" class="mb-2 block caps text-muted">{{ label }}</label>
    <HeaderMenu
      :field-id="id" :label="label" :icon="icon" :model-value="modelValue"
      :text="modelValue || t('catalog.choose')" :options="options" searchable
      :disabled="items === null" :described-by="`${id}-hint`" :invalid="!!error"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div :id="`${id}-hint`" class="mt-2 space-y-1 text-sm text-muted">
      <p v-if="selected?.description" class="whitespace-pre-line break-words">{{ selected.description }}</p>
      <p v-if="missing">{{ t('catalog.missingHint') }}</p>
      <p v-else-if="unavailable">{{ t('catalog.unavailable') }}</p>
      <p v-else-if="items === null">{{ t('catalog.loading') }}</p>
      <p v-else-if="!modelValue">{{ t('catalog.chooseHint') }}</p>
      <FieldError :message="error" />
    </div>
  </div>
</template>
