import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { UserRound } from 'lucide-vue-next'
import CatalogField from './CatalogField.vue'
import { profiles } from '../test/fixtures'

it('keeps removed names visible and offers available replacements', async () => {
  const wrapper = mount(CatalogField, { props: { modelValue: 'retired', label: 'Profile', icon: UserRound, items: profiles().items, unavailable: false } })
  expect(wrapper.get('button[aria-haspopup]').text()).toContain('retired')
  expect(wrapper.text()).toContain('This option is no longer available')
  await wrapper.get('button[aria-haspopup]').trigger('click')
  const options = wrapper.findAll('[role=option]')
  expect(options[0].attributes('disabled')).toBeDefined()
  await options[1].trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([['default']])
  await wrapper.setProps({ modelValue: 'default', error: 'Choose another profile.' })
  expect(wrapper.text()).toContain('General agent')
  expect(wrapper.get('button[aria-haspopup]').attributes('aria-invalid')).toBe('true')
  await wrapper.setProps({ items: null, unavailable: true })
  expect(wrapper.get('button[aria-haspopup]').text()).toContain('default')
  expect(wrapper.text()).not.toContain('no longer available')
  expect(wrapper.get('button[aria-haspopup]').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('keeps an open loaded list usable when a refresh fails', async () => {
  const wrapper = mount(CatalogField, { props: { modelValue: '', label: 'Profile', icon: UserRound, items: profiles().items, unavailable: false } })
  await wrapper.get('button[aria-haspopup]').trigger('click')
  await wrapper.setProps({ unavailable: true })
  expect(wrapper.get('button[aria-haspopup]').attributes('disabled')).toBeUndefined()
  expect(wrapper.get('[role=listbox]').isVisible()).toBe(true)
  expect(wrapper.text()).toContain('Could not load the choices')
  await wrapper.findAll('[role=option]')[1].trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([['research']])
  wrapper.unmount()
})
