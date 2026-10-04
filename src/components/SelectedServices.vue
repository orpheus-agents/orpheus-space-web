<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Service } from '../api/generated'
import EmptyState from './EmptyState.vue'
import ServiceCard from './ServiceCard.vue'
defineProps<{ codes: string[]; items: Service[] | null; unavailable: boolean }>()
const { t } = useI18n()
</script>
<template>
  <EmptyState v-if="!codes.length" :title="t('services.emptySelection')" />
  <div v-else class="grid gap-3 sm:grid-cols-2">
    <ServiceCard v-for="code in codes" :key="code" :code="code" :service="items?.find((item) => item.code === code)" :missing="items !== null && !unavailable && !items.some((item) => item.code === code)" />
  </div>
</template>
