<script setup lang="ts">
import { computed } from 'vue'
import type { Tone } from '../occurrence/outcome'
const props = defineProps<{ tone: Tone; label: string }>()
const classes = computed(
  () =>
    ({
      live: { marker: 'bg-accent', text: 'font-semibold text-accent-ink' },
      ok: { marker: 'bg-accent', text: 'text-ink' },
      settled: { marker: 'bg-ink', text: 'text-ink' },
      failed: { marker: 'bg-danger', text: 'text-danger-ink' },
      muted: { marker: 'bg-muted', text: 'text-muted' },
    })[props.tone],
)
</script>
<template>
  <span class="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs" :class="classes.text"><span class="marker" :class="classes.marker" aria-hidden="true" />{{ label }}</span>
</template>
