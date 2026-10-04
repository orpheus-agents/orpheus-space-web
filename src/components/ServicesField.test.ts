import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ServicesField from './ServicesField.vue'
import SelectedServices from './SelectedServices.vue'
import { services } from '../test/fixtures'

it('shows names, descriptions and collapsed ENV details without selecting defaults', async () => {
  const wrapper = mount(ServicesField, { props: { storedCodes: [], modelValue: [], items: services().items, unavailable: false } })
  expect(wrapper.text()).toContain('GitLab')
  expect(wrapper.text()).toContain('Work with repositories and merge requests')
  expect(wrapper.findAll('input').every((node) => !(node.element as HTMLInputElement).checked)).toBe(true)
  expect(wrapper.get('details').attributes('open')).toBeUndefined()
  expect(wrapper.get('summary').attributes('aria-label')).toBe('ENV variables for GitLab')
  expect(wrapper.get('details').text()).toContain('GITLAB_TOKEN')
  const descriptionId = wrapper.get('input[value="gitlab"]').attributes('aria-describedby')
  expect(wrapper.get(`[id="${descriptionId}"]`).text()).toBe('Work with repositories and merge requests')
  await wrapper.get('input[value="orpheus-space"]').setValue(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['orpheus-space']]])
  wrapper.unmount()
})

it('preserves selected codes through offline and empty catalogs and allows removal', async () => {
  const wrapper = mount(ServicesField, { props: { storedCodes: ['retired'], modelValue: ['retired'], items: null, unavailable: true, error: 'Select available services.' } })
  expect(wrapper.get<HTMLInputElement>('input[value="retired"]').element.checked).toBe(true)
  expect(wrapper.text()).not.toContain('Unavailable service')
  expect(wrapper.get('[role=alert]').text()).toBe('Select available services.')
  expect(wrapper.get('fieldset').attributes('aria-invalid')).toBe('true')
  await wrapper.setProps({ items: [], unavailable: false })
  expect(wrapper.text()).toContain('Unavailable service')
  await wrapper.get('input[value="retired"]').setValue(false)
  expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
  await wrapper.setProps({ modelValue: [] })
  const input = wrapper.get<HTMLInputElement>('input[value="retired"]')
  expect(input.element.checked).toBe(false)
  expect(wrapper.get(`[id="${input.attributes('aria-describedby')}"]`).text()).toBe('Unavailable service')
  await input.setValue(true)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['retired']])
  wrapper.unmount()
})

it('keeps the last loaded options usable after a catalog refresh fails', async () => {
  const wrapper = mount(ServicesField, { props: { storedCodes: [], modelValue: ['gitlab'], items: services().items, unavailable: false } })
  await wrapper.setProps({ unavailable: true })
  expect(wrapper.text()).toContain('Work with repositories')
  expect(wrapper.text()).not.toContain('Unavailable service')
  await wrapper.get('input[value="orpheus-space"]').setValue(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['gitlab', 'orpheus-space']]])
  wrapper.unmount()
})

it('renders selected services on read-only cards and follows catalog descriptions', async () => {
  const wrapper = mount(SelectedServices, { props: { codes: ['gitlab', 'retired'], items: services().items, unavailable: false } })
  expect(wrapper.find('input').exists()).toBe(false)
  expect(wrapper.text()).toContain('GitLab')
  expect(wrapper.text()).toContain('retiredUnavailable service')
  const updated = services().items
  updated[0].description = 'Updated catalog description'
  await wrapper.setProps({ items: updated })
  expect(wrapper.text()).toContain('Updated catalog description')
  await wrapper.setProps({ items: null, unavailable: true })
  expect(wrapper.text()).toContain('gitlab')
  expect(wrapper.text()).not.toContain('Unavailable service')
  await wrapper.setProps({ codes: [] })
  expect(wrapper.text()).toContain('No services selected')
  wrapper.unmount()
})
