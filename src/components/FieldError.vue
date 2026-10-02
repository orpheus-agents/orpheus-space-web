<script setup lang="ts">
/** A validation message under its field; renders nothing without one. */
defineProps<{ message?: string }>()
</script>
<template>
  <span v-if="message" class="mt-2 block text-sm text-danger-ink" role="alert">{{ message }}</span>
</template>
