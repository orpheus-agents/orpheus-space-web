<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/EmptyState.vue'
const { t } = useI18n()
</script>
<template><EmptyState :title="t('common.notFound')" :hint="t('common.retryHint')" /></template>
