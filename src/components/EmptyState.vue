<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
// A Bayer-dithered field fading to the right, the empty-state texture from branding/interface.md.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const COLUMNS = 24
const ROWS = 6
const dots = Array.from({ length: COLUMNS * ROWS }, (_, index) => ({
  x: index % COLUMNS,
  y: Math.floor(index / COLUMNS),
})).filter(({ x, y }) => BAYER[y % 4][x % 4] / 16 < 1 - x / COLUMNS)
</script>
<template>
  <div class="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
    <svg class="h-6 w-24 text-muted" viewBox="0 0 96 24" aria-hidden="true">
      <rect v-for="dot in dots" :key="`${dot.x}-${dot.y}`" :x="dot.x * 4" :y="dot.y * 4" width="3" height="3" fill="currentColor" />
    </svg>
    <p class="text-sm font-medium text-ink">{{ title }}</p>
    <p v-if="hint" class="max-w-sm text-xs text-muted">{{ hint }}</p>
  </div>
</template>
