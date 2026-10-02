import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Clock3 } from 'lucide-vue-next'
import HeaderMenu from './HeaderMenu.vue'

function factory(searchable = false) {
  return mount(HeaderMenu, {
    attachTo: document.body,
    props: {
      label: 'Time zone',
      icon: Clock3,
      modelValue: 'UTC',
      options: [
        { value: 'UTC', label: 'UTC' },
        { value: 'Europe/Moscow', label: 'Europe/Moscow' },
      ],
      searchable,
    },
  })
}

describe('HeaderMenu', () => {
  it('opens on the current option, moves with arrows and emits the chosen one', async () => {
    const wrapper = factory()
    expect(wrapper.find('[role=listbox]').exists()).toBe(false)
    await wrapper.find('button[aria-haspopup]').trigger('click')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('[role=option]')
    expect(items).toHaveLength(2)
    expect(items[0].attributes('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(items[0].element)
    await wrapper.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1].element)
    await items[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Europe/Moscow']])
    expect(wrapper.find('[role=listbox]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('button[aria-haspopup]').element)
    wrapper.unmount()
  })
  it('focuses the search field, filters options and returns focus on Escape', async () => {
    const wrapper = factory(true)
    await wrapper.find('button[aria-haspopup]').trigger('click')
    await wrapper.vm.$nextTick()
    const search = wrapper.find('input[type=search]')
    expect(document.activeElement).toBe(search.element)
    await search.setValue('mos')
    expect(wrapper.findAll('[role=option]').map((item) => item.text())).toEqual(['Europe/Moscow'])
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role=listbox]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('button[aria-haspopup]').element)
    wrapper.unmount()
  })
})
describe('HeaderMenu as a field', () => {
  it('shows the text instead of the icon and opens a full-width list', async () => {
    const wrapper = mount(HeaderMenu, {
      attachTo: document.body,
      props: {
        label: 'Time zone',
        icon: Clock3,
        modelValue: 'UTC',
        options: [{ value: 'UTC', label: 'UTC' }],
        text: 'UTC (UTC)',
        fieldId: 'zone',
      },
    })
    const trigger = wrapper.find('button[aria-haspopup]')
    expect(trigger.attributes('id')).toBe('zone')
    expect(trigger.classes()).toContain('field')
    expect(trigger.text()).toBe('UTC (UTC)')
    expect(trigger.find('svg').exists()).toBe(true)
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.panel').classes()).toContain('w-full')
    wrapper.unmount()
  })
})
