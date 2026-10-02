<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ApiError } from '../api/client'
import EmptyState from './EmptyState.vue'
import SkeletonBlock from './SkeletonBlock.vue'
defineProps<{ loading: boolean; error: unknown }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>
<template>
  <div class="panel p-6">
    <div v-if="loading && !error" class="space-y-5" :aria-label="t('common.loading')">
      <SkeletonBlock width="40%" height="2rem" /><SkeletonBlock height="12rem" />
    </div>
    <div v-else class="text-center" role="alert">
      <EmptyState
        :title="error instanceof ApiError && error.status === 404 ? t('common.notFound') : t('common.requestFailed')"
        :hint="error instanceof ApiError ? error.message : t('common.retryHint')"
      />
      <button class="button" @click="$emit('retry')">{{ t('common.retry') }}</button>
    </div>
  </div>
</template>
