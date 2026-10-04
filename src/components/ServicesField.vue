<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '../api/generated'
import FieldError from './FieldError.vue'
import SkeletonBlock from './SkeletonBlock.vue'
const props = defineProps<{ modelValue: string[]; storedCodes: string[]; items: Service[] | null; unavailable: boolean; error?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t } = useI18n()
const id = useId()
const entries = computed(() => [...new Set([...(props.items?.map((item) => item.code) ?? []), ...props.storedCodes, ...props.modelValue])].map((code) => ({ code, service: props.items?.find((item) => item.code === code) })))
const selected = computed(() => entries.value.flatMap((entry) => entry.service && props.modelValue.includes(entry.code) ? [entry.service] : []))
const loaded = computed(() => props.items !== null && !props.unavailable)
function select(code: string, checked: boolean) {
  emit('update:modelValue', checked ? [...props.modelValue, code].sort() : props.modelValue.filter((item) => item !== code))
}
</script>
<template>
  <fieldset :aria-describedby="`${id}-hint ${id}-error`" :aria-invalid="!!error">
    <legend class="caps mb-3 text-muted">{{ t('services.title') }}</legend>
    <p :id="`${id}-hint`" class="mb-3 text-sm text-muted">{{ t('services.hint') }}</p>
    <p v-if="unavailable" class="mb-3 text-sm text-muted">{{ t('catalog.unavailable') }}</p>
    <SkeletonBlock v-else-if="items === null" height="3rem" />
    <p v-else-if="!entries.length" class="text-sm text-muted">{{ t('services.emptyCatalog') }}</p>
    <ul class="gap-x-8 lg:columns-2">
      <li v-for="(entry, index) in entries" :key="entry.code" class="break-inside-avoid py-1">
        <label class="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 text-sm sm:grid-cols-[auto_10rem_minmax(0,1fr)]">
          <input
            type="checkbox" class="mt-1 accent-accent" :value="entry.code" :checked="modelValue.includes(entry.code)"
            :aria-labelledby="`${id}-name-${index}`" :aria-describedby="entry.service || loaded ? `${id}-description-${index}` : undefined"
            @change="select(entry.code, ($event.target as HTMLInputElement).checked)"
          >
          <span :id="`${id}-name-${index}`" class="min-w-0 break-words font-medium">{{ entry.service?.name ?? entry.code }}</span>
          <span v-if="entry.service || loaded" :id="`${id}-description-${index}`" class="col-start-2 min-w-0 whitespace-pre-line break-words text-muted sm:col-start-3">{{ entry.service?.description ?? t('services.missing') }}</span>
        </label>
      </li>
    </ul>
    <details v-if="selected.length" class="mt-3 text-sm">
      <summary class="cursor-pointer text-muted">{{ t('services.selectedEnv') }}</summary>
      <dl class="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
        <template v-for="service in selected" :key="service.code">
          <dt class="text-muted">{{ service.name }}</dt>
          <dd class="flex flex-wrap gap-x-3 font-mono"><span v-for="name in service.env_from" :key="name" class="break-all">{{ name }}</span></dd>
        </template>
      </dl>
    </details>
    <FieldError :id="`${id}-error`" :message="error" />
  </fieldset>
</template>
