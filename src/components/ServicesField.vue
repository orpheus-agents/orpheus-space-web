<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '../api/generated'
import EmptyState from './EmptyState.vue'
import FieldError from './FieldError.vue'
import ServiceCard from './ServiceCard.vue'
import SkeletonBlock from './SkeletonBlock.vue'
const props = defineProps<{ modelValue: string[]; storedCodes: string[]; items: Service[] | null; unavailable: boolean; error?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t } = useI18n()
const id = useId()
const entries = computed(() => [...new Set([...(props.items?.map((item) => item.code) ?? []), ...props.storedCodes, ...props.modelValue])].map((code) => ({ code, service: props.items?.find((item) => item.code === code) })))
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
    <EmptyState v-else-if="!entries.length" :title="t('services.emptyCatalog')" />
    <div class="grid gap-3 sm:grid-cols-2">
      <ServiceCard v-for="entry in entries" :key="entry.code" v-slot="{ descriptionId }" :code="entry.code" :service="entry.service" :missing="items !== null && !unavailable && !entry.service">
        <label class="flex cursor-pointer items-start gap-3 text-sm font-medium">
          <input type="checkbox" :aria-describedby="descriptionId" class="mt-1 accent-accent" :value="entry.code" :checked="modelValue.includes(entry.code)" @change="select(entry.code, ($event.target as HTMLInputElement).checked)">
          <span class="min-w-0 break-words">{{ entry.service?.name ?? entry.code }}</span>
        </label>
      </ServiceCard>
    </div>
    <FieldError :id="`${id}-error`" :message="error" />
  </fieldset>
</template>
