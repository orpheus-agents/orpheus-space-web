<script setup lang="ts">
withDefaults(defineProps<{ width?: string; height?: string }>(), { width: '100%', height: '1rem' })
</script>
<template>
  <span class="block animate-pulse bg-line/70 motion-reduce:animate-none" :style="{ width, height }" aria-hidden="true" />
</template>
