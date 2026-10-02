<script setup lang="ts" generic="T extends string">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, type Component } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
/** An icon menu in the header, or a form field showing `text` when it is given. */
const props = defineProps<{
  label: string
  icon: Component
  modelValue: T
  options: { value: T; label: string }[]
  searchable?: boolean
  text?: string
  fieldId?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const { t } = useI18n()
const id = useId()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const search = ref<HTMLInputElement>()
const list = ref<HTMLElement>()
const open = ref(false)
const query = ref('')
const normalize = (value: string) => value.toLowerCase().replace(/[\s/_]+/g, ' ')
const shown = computed(() => {
  const needle = normalize(query.value.trim())
  return needle ? props.options.filter((option) => normalize(option.label).includes(needle)) : props.options
})
const items = () => [...(list.value?.querySelectorAll<HTMLElement>('[role=option]') ?? [])]
async function show() {
  open.value = true
  query.value = ''
  await nextTick()
  if (props.searchable) search.value?.focus()
  else (items().find((item) => item.getAttribute('aria-selected') === 'true') ?? items()[0])?.focus()
}
function hide(focusTrigger = false) {
  open.value = false
  if (focusTrigger) trigger.value?.focus()
}
function choose(value: T) {
  emit('update:modelValue', value)
  hide(true)
}
function focusItem(delta: number) {
  const all = items()
  if (!all.length) return
  const index = all.indexOf(document.activeElement as HTMLElement)
  all[index === -1 ? (delta > 0 ? 0 : all.length - 1) : (index + delta + all.length) % all.length].focus()
}
function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') hide(true)
  else if (event.key === 'ArrowDown') focusItem(1)
  else if (event.key === 'ArrowUp') focusItem(-1)
  else return
  event.preventDefault()
}
function onFocusout(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) open.value = false
}
function onDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
<template>
  <div ref="root" class="relative" @keydown="onKeydown" @focusout="onFocusout">
    <button
      :id="fieldId"
      ref="trigger"
      type="button"
      :class="text === undefined ? ['icon-button', { 'bg-surface-subtle text-ink': open }] : 'field flex items-center justify-between gap-3 text-left'"
      :title="text === undefined ? label : undefined"
      :aria-label="label"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      @click="open ? hide() : show()"
    >
      <template v-if="text === undefined"><component :is="icon" class="h-4 w-4" aria-hidden="true" /></template>
      <template v-else><span class="truncate">{{ text }}</span><ChevronDown class="h-4 w-4 shrink-0 text-muted" aria-hidden="true" /></template>
    </button>
    <div v-if="open" class="panel absolute top-10 z-40 min-w-44 p-1" :class="text === undefined ? 'right-0' : 'left-0 w-full'">
      <input
        v-if="searchable"
        ref="search"
        v-model="query"
        type="search"
        class="field mb-1 h-8"
        :placeholder="t('settings.search')"
        :aria-label="t('settings.search')"
        :aria-controls="`${id}-list`"
      >
      <div :id="`${id}-list`" ref="list" role="listbox" :aria-label="label" class="max-h-72 overflow-y-auto">
        <button
          v-for="option in shown"
          :key="option.value"
          type="button"
          role="option"
          tabindex="-1"
          :aria-selected="option.value === modelValue"
          class="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-surface-subtle focus-visible:bg-surface-subtle"
          @click="choose(option.value)"
        >
          <span class="min-w-0 truncate">{{ option.label }}</span><Check v-if="option.value === modelValue" class="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        <p v-if="!shown.length" class="px-3 py-3 text-sm text-muted">{{ t('settings.nothingFound') }}</p>
      </div>
    </div>
  </div>
</template>
