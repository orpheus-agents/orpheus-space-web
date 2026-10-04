import { expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ServicesField from './ServicesField.vue'
import SelectedServices from './SelectedServices.vue'
import { services } from '../test/fixtures'

it('shows names and descriptions without selecting defaults and lists ENV names of the selection on demand', async () => {
  const wrapper = mount(ServicesField, { props: { storedCodes: [], modelValue: [], items: services().items, unavailable: false } })
  expect(wrapper.findAll('input').every((node) => !(node.element as HTMLInputElement).checked)).toBe(true)
  const input = wrapper.get('input[value="gitlab"]')
  expect(wrapper.get(`[id="${input.attributes('aria-labelledby')}"]`).text()).toBe('GitLab')
  expect(wrapper.get(`[id="${input.attributes('aria-describedby')}"]`).text()).toBe('Work with repositories and merge requests')
  // The whole row is the label, so the description is a click target too.
  expect(wrapper.get('label').text()).toBe('GitLabWork with repositories and merge requests')
  expect(wrapper.find('details').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('GITLAB_TOKEN')
  await wrapper.get('input[value="orpheus-space"]').setValue(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['orpheus-space']]])
  await wrapper.setProps({ modelValue: ['orpheus-space'] })
  const details = wrapper.get('details')
  expect(details.attributes('open')).toBeUndefined()
  expect(details.get('summary').text()).toBe('ENV variables of the selected services')
  expect(details.findAll('dt').map((node) => node.text())).toEqual(['Orpheus Space'])
  expect(details.findAll('dd span').map((node) => node.text())).toEqual(['ORPHEUS_SPACE_HOST', 'ORPHEUS_SPACE_API_KEY'])
  await wrapper.setProps({ modelValue: ['gitlab', 'orpheus-space'] })
  expect(details.findAll('dt').map((node) => node.text())).toEqual(['GitLab', 'Orpheus Space'])
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

it('lists selected services by name and follows catalog details in the tooltip', async () => {
  const wrapper = mount(SelectedServices, { props: { codes: ['gitlab', 'retired'], items: services().items, unavailable: false }, attachTo: document.body })
  expect(wrapper.find('input').exists()).toBe(false)
  expect(wrapper.findAll('li').map((node) => node.text())).toEqual(['GitLab,', 'retired (unavailable)'])
  // Descriptions and ENV names take no room in the card until a name is focused or hovered.
  expect(document.body.textContent).not.toContain('Work with repositories')
  expect(document.body.textContent).not.toContain('GITLAB_TOKEN')
  await wrapper.get('button').trigger('focus')
  await flushPromises()
  const tooltip = () => document.querySelector('[role=tooltip]')
  expect(tooltip()!.querySelector('p')!.textContent).toBe('Work with repositories and merge requests')
  expect(tooltip()!.querySelector('ul')!.getAttribute('aria-label')).toBe('ENV variables')
  expect([...tooltip()!.querySelectorAll('li')].map((node) => node.textContent)).toEqual(['GITLAB_HOST', 'GITLAB_TOKEN'])
  const updated = services().items
  updated[0].description = 'Updated catalog description'
  await wrapper.setProps({ items: updated })
  await wrapper.get('button').trigger('focus')
  await flushPromises()
  expect(tooltip()!.querySelector('p')!.textContent).toBe('Updated catalog description')
  await wrapper.setProps({ items: null, unavailable: true })
  expect(tooltip()).toBeNull()
  expect(wrapper.find('button').exists()).toBe(false)
  expect(wrapper.findAll('li').map((node) => node.text())).toEqual(['gitlab,', 'retired'])
  await wrapper.setProps({ codes: [] })
  expect(wrapper.text()).toBe('Not selected')
  wrapper.unmount()
})
