<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '../api/generated'
defineProps<{ code: string; service?: Service; missing: boolean }>()
const { t } = useI18n()
const descriptionId = useId()
</script>
<template>
  <div class="min-w-0 border border-line p-4">
    <slot :description-id="service || missing ? descriptionId : undefined"><p class="break-words text-sm font-medium">{{ service?.name ?? code }}</p></slot>
    <p v-if="service" :id="descriptionId" class="mt-2 whitespace-pre-line break-words text-sm text-muted">{{ service.description }}</p>
    <p v-else-if="missing" :id="descriptionId" class="mt-2 text-sm text-muted">{{ t('services.missing') }}</p>
    <details v-if="service" class="mt-3 text-sm">
      <summary class="cursor-pointer text-muted" :aria-label="t('services.envFor', { name: service.name })">{{ t('services.env') }}</summary>
      <ul class="mt-2 space-y-1 font-mono text-xs">
        <li v-for="name in service.env_from" :key="name" class="break-all">{{ name }}</li>
      </ul>
    </details>
  </div>
</template>
