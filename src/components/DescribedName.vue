<script lang="ts">
let activeHide: (() => void) | undefined
</script>
<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'

const props = defineProps<{ name: string; description?: string | null }>()
const id = useId()
const trigger = ref<HTMLButtonElement>()
const tooltip = ref<HTMLElement>()
const visible = ref(false)
const position = ref({ left: '0px', top: '0px' })
let timer: ReturnType<typeof setTimeout> | undefined
function cancelHide() { clearTimeout(timer) }
function hide() {
  cancelHide()
  if (!visible.value) return
  visible.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('keydown', escape)
  window.removeEventListener('resize', updatePosition)
  if (activeHide === hide) activeHide = undefined
}
function leave() {
  cancelHide()
  if (document.activeElement !== trigger.value) timer = setTimeout(hide, 100)
}
async function show() {
  cancelHide()
  if (!props.description || !trigger.value) return
  if (!visible.value) {
    activeHide?.()
    activeHide = hide
    visible.value = true
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', updatePosition)
  }
  await nextTick()
  updatePosition()
}
function updatePosition() {
  if (!visible.value || !tooltip.value || !trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  if (rect.bottom < 0 || rect.top > window.innerHeight) { hide(); return }
  const box = tooltip.value.getBoundingClientRect()
  position.value = {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - box.width - 8)) + 'px',
    top: Math.max(8, rect.bottom + box.height + 8 <= window.innerHeight ? rect.bottom + 8 : rect.top - box.height - 8) + 'px',
  }
}
function escape(event: KeyboardEvent) { if (event.key === 'Escape') hide() }
watch(() => [props.name, props.description], hide)
onUnmounted(hide)
</script>
<template>
  <span v-if="!description">{{ name }}</span>
  <template v-else>
    <button
      ref="trigger"
      type="button"
      class="cursor-help border-b border-dotted border-muted text-left"
      :aria-describedby="visible ? id : undefined"
      @mouseenter="show"
      @mouseleave="leave"
      @focus="show"
      @blur="hide"
      @click.stop="show"
    >
      {{ name }}
    </button>
    <Teleport to="body">
      <span
        v-if="visible"
        :id="id"
        ref="tooltip"
        role="tooltip"
        class="fixed z-50 max-h-64 w-max max-w-[min(20rem,calc(100vw-1rem))] overflow-y-auto whitespace-pre-line break-words border border-line bg-surface-raised px-3 py-2 font-sans text-sm font-normal leading-5 text-ink"
        :style="position"
        @mouseenter="cancelHide"
        @mouseleave="leave"
      >{{ description }}</span>
    </Teleport>
  </template>
</template>
