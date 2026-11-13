import { expect, it, vi } from 'vitest'
import { ref, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import TemplateField from './TemplateField.vue'
import { template } from '../test/fixtures'
import type { Template } from '../api/generated'
import type { TemplateState, useTemplateOptions } from '../composables/useTemplates'

function options(items: Template[] = [template({ id: '44444444-4444-4444-8444-444444444444', name: 'reports:v2', description: 'Tools for reports' })]) {
  return {
    items: shallowRef(items), next: ref<string | null>(null), loaded: ref(true), pending: ref(false), loadingMore: ref(false),
    error: shallowRef<unknown>(null), moreError: shallowRef<unknown>(null),
    reload: vi.fn(async () => undefined), more: vi.fn(async () => undefined), search: vi.fn(),
  } satisfies ReturnType<typeof useTemplateOptions>
}
function field(state: TemplateState, current: Template | null, list = options(), modelValue = 'fixture') {
  return mount(TemplateField, { attachTo: document.body, props: { modelValue, current, state, resolvingDefault: false, options: list } })
}
const open = (wrapper: ReturnType<typeof field>) => wrapper.get('button[aria-haspopup]').trigger('click')

it('pins an inactive current template with a mark and lets the user choose only active ones', async () => {
  const wrapper = field('inactive', template({ active: false }))
  expect(wrapper.text()).toContain('Inactive')
  expect(wrapper.text()).toContain('Choose an active template to save changes.')
  expect(wrapper.text()).toContain('Standard tools')
  await open(wrapper)
  const choices = wrapper.findAll('[role=option]')
  expect(choices.map((choice) => choice.text())).toEqual(['fixtureInactiveStandard tools', 'reports:v2Tools for reports'])
  expect(choices[0].attributes('disabled')).toBeDefined()
  await wrapper.get('input[type=search]').trigger('keydown', { key: 'ArrowDown' })
  expect(document.activeElement).toBe(choices[1].element)
  await choices[1].trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([['reports:v2']])
  await wrapper.setProps({ error: 'Choose an active template to save changes.' })
  expect(wrapper.get('[role=alert]').text()).toBe('Choose an active template to save changes.')
  expect(wrapper.findAll('p').filter((node) => node.text() === 'Choose an active template to save changes.')).toHaveLength(0)
  wrapper.unmount()
})

it('tells a removed template from an unchecked one', async () => {
  const wrapper = field('missing', null)
  expect(wrapper.text()).toContain('This template is no longer registered.')
  await open(wrapper)
  expect(wrapper.findAll('[role=option]')[0].text()).toContain('Unavailable')
  await wrapper.setProps({ state: 'unavailable' })
  expect(wrapper.text()).toContain('Could not check the template.')
  expect(wrapper.text()).not.toContain('no longer registered')
  expect(wrapper.findAll('[role=option]')[0].attributes('disabled')).toBeUndefined()
  // A just chosen option describes itself while its exact check is still running.
  await wrapper.setProps({ modelValue: 'reports:v2', state: 'loading' })
  expect(wrapper.text()).toContain('Tools for reports')
  expect(wrapper.text()).not.toContain('Checking the template')
  wrapper.unmount()
})

it('searches on the server, loads more by keyboard and scroll, and keeps a failed page retryable', async () => {
  const list = options()
  list.next.value = 'second'
  const wrapper = field('active', template(), list)
  await open(wrapper)
  await wrapper.get('input[type=search]').setValue('rep')
  expect(list.search).toHaveBeenLastCalledWith('rep')
  expect(wrapper.findAll('[role=option]')).toHaveLength(2)
  const more = wrapper.get('button:not([role=option]):not([aria-haspopup])')
  expect(more.text()).toBe('Show more')
  expect(more.attributes('tabindex')).toBeUndefined()
  await more.trigger('click')
  expect(list.more).toHaveBeenCalledTimes(1)
  const scroller = wrapper.get('.overflow-y-auto')
  Object.defineProperties(scroller.element, { scrollHeight: { value: 600 }, clientHeight: { value: 288 }, scrollTop: { value: 300, writable: true } })
  await scroller.trigger('scroll')
  expect(list.more).toHaveBeenCalledTimes(2)
  list.moreError.value = new Error('failed')
  await wrapper.vm.$nextTick()
  await scroller.trigger('scroll')
  expect(list.more).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('Could not load more templates.')
  expect(wrapper.text()).toContain('Show more')
  list.items.value = []
  list.next.value = null
  list.moreError.value = null
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('Nothing found')
  list.error.value = new Error('failed')
  await wrapper.vm.$nextTick()
  await wrapper.findAll('button').find((button) => button.text() === 'Try again')!.trigger('click')
  expect(list.reload).toHaveBeenCalled()
  wrapper.unmount()
})

it('explains a pending default and an explicit choice without inventing one', async () => {
  const wrapper = mount(TemplateField, { props: { modelValue: '', current: null, state: 'empty', resolvingDefault: true, options: options() } })
  expect(wrapper.get('button[aria-haspopup]').text()).toBe('Choose an option')
  expect(wrapper.text()).toContain('Loading choices…')
  await wrapper.setProps({ resolvingDefault: false })
  expect(wrapper.text()).toContain('No default is available. Choose an option.')
})
