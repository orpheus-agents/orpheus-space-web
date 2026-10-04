<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '../api/generated'
import DescribedName from './DescribedName.vue'
const props = defineProps<{ codes: string[]; items: Service[] | null; unavailable: boolean }>()
const { t } = useI18n()
const entries = computed(() => props.codes.map((code) => ({ code, service: props.items?.find((item) => item.code === code) })))
</script>
<template>
  <span v-if="!codes.length">{{ t('services.emptySelection') }}</span>
  <ul v-else class="flex flex-wrap gap-x-1.5 gap-y-1">
    <li v-for="(entry, index) in entries" :key="entry.code" class="min-w-0 break-words">
      <DescribedName v-if="entry.service" :name="entry.service.name" :description="entry.service.description">
        <ul :aria-label="t('services.env')" class="mt-2 space-y-0.5 border-t border-line pt-2 font-mono text-xs">
          <li v-for="name in entry.service.env_from" :key="name" class="break-all">{{ name }}</li>
        </ul>
      </DescribedName>
      <span v-else-if="items !== null && !unavailable" class="text-muted">{{ t('services.missingCode', { code: entry.code }) }}</span>
      <template v-else>{{ entry.code }}</template><span v-if="index < entries.length - 1" aria-hidden="true">,</span>
    </li>
  </ul>
</template>
