<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { isErrorCode } from '../occurrence/outcome'
/** A stored error code: a sentence for the known ones, the raw code kept beside it for support. */
defineProps<{ code: string }>()
const { t } = useI18n()
</script>
<template>
  <span class="text-danger-ink"><template v-if="isErrorCode(code)">{{ t(`errorCode.${code}`) }} <span class="font-mono text-xs text-muted">{{ code }}</span></template><span v-else class="font-mono text-xs">{{ code }}</span></span>
</template>
