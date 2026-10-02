<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { describe } from '../cron'
const props = defineProps<{ expression: string }>()
const { locale } = useI18n()
const description = ref('')
watch([() => props.expression, locale], async ([expression, language], _, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  description.value = ''
  const text = expression.trim() ? await describe(expression, language) : ''
  if (current) description.value = text
}, { immediate: true })
</script>
<template>
  <span v-if="description" :title="expression">{{ description }}</span>
</template>
