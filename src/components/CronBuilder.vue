<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { build, convert, describe, formatTime, HOUR_STEPS, KINDS, MINUTE_STEPS, parse, parseTime, WEEK, type Plan, type Weekday } from '../cron'
/** Edits a five-field cron as a plain schedule; the expression stays the model. */
const props = defineProps<{ modelValue: string; error?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t, locale } = useI18n()
const plan = ref<Plan>(parse(props.modelValue))
const description = ref('')
watch(
  () => props.modelValue,
  (value) => {
    if (value !== (build(plan.value) ?? '')) plan.value = parse(value)
  },
)
watch(
  () => props.modelValue,
  async (value) => {
    description.value = value.trim() ? await describe(value, locale.value) : ''
  },
  { immediate: true },
)
watch(locale, async () => {
  description.value = props.modelValue.trim() ? await describe(props.modelValue, locale.value) : ''
})
function apply(next: Plan) {
  plan.value = next
  emit('update:modelValue', build(next) ?? '')
}
function changeKind(event: Event) {
  const kind = KINDS.find((item) => item === (event.target as HTMLSelectElement).value)
  if (kind) apply(convert(plan.value, kind, props.modelValue))
}
const time = computed(() => ('hour' in plan.value ? formatTime(plan.value.hour, plan.value.minute) : ''))
function changeTime(event: Event) {
  const parsed = parseTime((event.target as HTMLInputElement).value)
  if (parsed && 'hour' in plan.value) apply({ ...plan.value, ...parsed })
}
function toggleDay(day: Weekday, checked: boolean) {
  if (plan.value.kind !== 'weekly') return
  const days = checked ? [...plan.value.days, day] : plan.value.days.filter((item) => item !== day)
  apply({ ...plan.value, days: WEEK.filter((item) => days.includes(item)) })
}
function changeNumber(event: Event, field: 'day' | 'minute' | 'every') {
  const value = Number((event.target as HTMLInputElement | HTMLSelectElement).value)
  if (Number.isInteger(value)) apply({ ...plan.value, [field]: value } as Plan)
}
// 7 January 2024 is a Sunday, cron weekday 0.
const dayName = (day: Weekday) => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 7 + day))
const incomplete = computed(() => plan.value.kind === 'weekly' && plan.value.days.length === 0)
</script>
<template>
  <div class="space-y-4">
    <label class="block"><span class="mb-2 block caps text-muted">{{ t('cron.repeat') }}</span><select class="field w-full" :value="plan.kind" @change="changeKind">
      <option v-for="kind in KINDS" :key="kind" :value="kind">{{ t(`cron.kind.${kind}`) }}</option>
    </select></label>
    <div v-if="'hour' in plan" class="flex flex-wrap items-end gap-4">
      <label class="block"><span class="mb-2 block caps text-muted">{{ t('cron.at') }}</span><input type="time" class="field w-32" required :value="time" @change="changeTime"></label>
      <label v-if="plan.kind === 'monthly'" class="block"><span class="mb-2 block caps text-muted">{{ t('cron.dayOfMonth') }}</span><input
        type="number"
        class="field w-24"
        min="1"
        max="31"
        required
        :value="plan.day"
        @change="changeNumber($event, 'day')"
      ></label>
    </div>
    <p v-if="plan.kind === 'monthly' && plan.day > 28" class="text-xs text-muted">{{ t('cron.dayHint') }}</p>
    <fieldset v-if="plan.kind === 'weekly'">
      <legend class="mb-2 caps text-muted">{{ t('cron.days') }}</legend>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        <label v-for="day in WEEK" :key="day" class="flex items-center gap-2 text-sm"><input
          type="checkbox"
          :checked="plan.days.includes(day)"
          @change="toggleDay(day, ($event.target as HTMLInputElement).checked)"
        >{{ dayName(day) }}</label>
      </div>
      <p v-if="incomplete" class="mt-2 text-sm text-danger-ink" role="alert">{{ t('cron.noDays') }}</p>
    </fieldset>
    <div v-if="plan.kind === 'hourly'" class="flex flex-wrap items-end gap-4">
      <label class="block"><span class="mb-2 block caps text-muted">{{ t('cron.repeat') }}</span><select class="field w-44" :value="plan.every" @change="changeNumber($event, 'every')">
        <option v-for="n in HOUR_STEPS" :key="n" :value="n">{{ t('cron.hours', { n }, n) }}</option>
      </select></label>
      <label class="block"><span class="mb-2 block caps text-muted">{{ t('cron.atMinute') }}</span><input
        type="number"
        class="field w-24"
        min="0"
        max="59"
        required
        :value="plan.minute"
        @change="changeNumber($event, 'minute')"
      ></label>
    </div>
    <label v-if="plan.kind === 'minutes'" class="block"><span class="mb-2 block caps text-muted">{{ t('cron.repeat') }}</span><select class="field w-44" :value="plan.every" @change="changeNumber($event, 'every')">
      <option v-for="n in MINUTE_STEPS" :key="n" :value="n">{{ t('cron.minutes', { n }, n) }}</option>
    </select></label>
    <label v-if="plan.kind === 'custom'" class="block"><span class="mb-2 block caps text-muted">{{ t('cron.expression') }}</span><input
      :value="plan.expression"
      :aria-label="t('cron.expression')"
      class="field w-full font-mono"
      required
      @input="apply({ kind: 'custom', expression: ($event.target as HTMLInputElement).value })"
    ><span class="mt-2 block text-xs text-muted">{{ t('cron.expressionHint') }}</span></label>
    <p v-if="error" class="text-sm text-danger-ink" role="alert">{{ error }}</p>
    <p v-else-if="description" class="text-sm"><span class="text-muted">{{ description }}</span> <span class="ml-1 whitespace-nowrap font-mono text-xs text-muted">{{ modelValue }}</span></p>
  </div>
</template>
