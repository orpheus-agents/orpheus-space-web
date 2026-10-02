<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Occurrence } from '../api/generated'
import { outcome, runOutcome, type Outcome } from '../occurrence/outcome'
import StatusBadge from './StatusBadge.vue'
/** The outcome of an occurrence, or a stored run status alone when `status` is given. */
const props = defineProps<{ occurrence?: Pick<Occurrence, 'state' | 'run_status'>; status?: string }>()
const { t } = useI18n()
const shown = computed<Outcome | null>(() => (props.status != null ? runOutcome(props.status) : props.occurrence ? outcome(props.occurrence) : null))
</script>
<template>
  <StatusBadge v-if="shown" :tone="shown.tone" :label="shown.translate ? t(shown.label) : shown.label" />
</template>
