<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AppHeader from './components/AppHeader.vue'
import EmptyState from './components/EmptyState.vue'
import SkeletonBlock from './components/SkeletonBlock.vue'
import { useAuth } from './composables/useAuth'
import { provideToasts } from './composables/useToasts'
const { t } = useI18n()
const auth = useAuth()
const { toasts, push, dismiss } = provideToasts()
async function logout() {
  try {
    await auth.signOut()
  } catch {
    push(t('auth.logoutFailed'))
  }
}
</script>
<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface-raised focus:p-3">{{ t('app.skip') }}</a>
  <AppHeader :session="auth.session.value" :ready="auth.state.value === 'ready'" :pending="auth.pending.value" @logout="logout" />
  <main id="main" class="mx-auto max-w-screen-2xl px-5 py-8 sm:px-8 sm:py-10">
    <RouterView v-if="auth.state.value === 'ready'" :key="$route.path" />
    <div v-else-if="auth.state.value === 'loading'" class="panel p-8" :aria-label="t('common.loading')">
      <SkeletonBlock height="8rem" />
    </div>
    <div v-else class="panel mx-auto mt-12 max-w-xl p-8 text-center">
      <EmptyState :title="t(`auth.${auth.state.value}Title`)" :hint="t(`auth.${auth.state.value}Hint`)" />
      <button v-if="auth.state.value === 'signin'" class="button-primary" @click="auth.login">
        {{ t('auth.login') }}
      </button>
      <button v-if="auth.state.value === 'error' || auth.state.value === 'forbidden'" class="button" @click="auth.load">
        {{ t('common.retry') }}
      </button>
    </div>
  </main>
  <div class="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
    <div v-for="toast in toasts" :key="toast.id" class="panel flex items-center gap-3 p-4">
      <span class="text-sm">{{ toast.message }}</span><button class="icon-button" :aria-label="t('common.dismiss')" @click="dismiss(toast.id)">
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
