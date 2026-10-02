<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useNow } from '../composables/useNow'
import { useSettings } from '../composables/useSettings'
import { formatDate, formatRelativeTime } from '../format'
defineProps<{ timestamp: string }>()
const { locale } = useI18n()
const now = useNow()
const { timeZone } = useSettings()
</script>
<template>
  <time :datetime="timestamp" :title="formatDate(timestamp, locale, timeZone)">{{
    formatRelativeTime(timestamp, Math.max(now, Date.now()), locale)
  }}</time>
</template>
