import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CronDescription from './CronDescription.vue'
import { createTestI18n } from '../test/i18n'

it('shows a localized sentence with the expression only in its title', async () => {
  const i18n = createTestI18n('en')
  const wrapper = mount(CronDescription, { props: { expression: '*/30 * * * *' }, global: { plugins: [i18n] } })
  await vi.waitFor(() => expect(wrapper.text()).toBe('Every 30 minutes'))
  expect(wrapper.attributes('title')).toBe('*/30 * * * *')
  i18n.global.locale.value = 'ru'
  await vi.waitFor(() => expect(wrapper.text()).toBe('Каждые 30 минут'))
  await wrapper.setProps({ expression: '0 9 * * 1-5' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('09:00'))
  expect(wrapper.attributes('title')).toBe('0 9 * * 1-5')
  expect(wrapper.text()).not.toContain('0 9 * * 1-5')
  await wrapper.setProps({ expression: '' })
  expect(wrapper.text()).toBe('')
  wrapper.unmount()
})
