import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DescribedName from './DescribedName.vue'

let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })

it('keeps names without descriptions as plain text', async () => {
  wrapper = mount(DescribedName, { props: { name: 'removed-profile', description: null } })
  expect(wrapper.text()).toBe('removed-profile')
  expect(wrapper.find('button').exists()).toBe(false)
  expect(document.querySelector('[role=tooltip]')).toBeNull()
})

it('shows escaped descriptions on focus, dismisses on Escape', async () => {
  wrapper = mount(DescribedName, { props: { name: 'default', description: '<script>unsafe</script>' }, attachTo: document.body })
  const button = wrapper.get('button')
  await button.trigger('focus')
  await flushPromises()
  const tooltip = document.querySelector('[role=tooltip]')!
  expect(tooltip.textContent).toBe('<script>unsafe</script>')
  expect(tooltip.querySelector('script')).toBeNull()
  expect(button.attributes('aria-describedby')).toBe(tooltip.id)
  await button.trigger('click')
  await button.trigger('keydown', { key: 'Escape' })
  expect(document.querySelector('[role=tooltip]')).toBeNull()
  await button.trigger('focus')
  await button.trigger('blur')
  expect(document.querySelector('[role=tooltip]')).toBeNull()
})

it('allows hovering the tooltip, hides after leaving and cleans up on unmount', async () => {
  vi.useFakeTimers()
  wrapper = mount(DescribedName, { props: { name: 'codex', description: 'Development tools' }, attachTo: document.body })
  await wrapper.get('button').trigger('mouseenter')
  await wrapper.get('button').trigger('mouseleave')
  document.querySelector('[role=tooltip]')!.dispatchEvent(new MouseEvent('mouseenter'))
  await vi.advanceTimersByTimeAsync(200)
  expect(document.querySelector('[role=tooltip]')).not.toBeNull()
  document.querySelector('[role=tooltip]')!.dispatchEvent(new MouseEvent('mouseleave'))
  await vi.advanceTimersByTimeAsync(200)
  expect(document.querySelector('[role=tooltip]')).toBeNull()
  await wrapper.get('button').trigger('mouseenter')
  wrapper.unmount()
  expect(document.querySelector('[role=tooltip]')).toBeNull()
})

it('attaches window handlers only while visible, without duplicating them', async () => {
  const add = vi.spyOn(window, 'addEventListener')
  const remove = vi.spyOn(window, 'removeEventListener')
  wrapper = mount(DescribedName, { props: { name: 'default', description: null }, attachTo: document.body })
  const events = ['scroll', 'keydown', 'resize']
  const added = () => add.mock.calls.filter(([name]) => events.includes(name))
  const removed = () => remove.mock.calls.filter(([name]) => events.includes(name))
  expect(added()).toHaveLength(0)
  await wrapper.setProps({ description: 'Research' })
  expect(added()).toHaveLength(0)
  await wrapper.get('button').trigger('focus')
  const handlers = [...added()]
  expect(handlers.map(([name]) => name).sort()).toEqual([...events].sort())
  await wrapper.get('button').trigger('mouseenter')
  expect(added()).toHaveLength(3)
  await wrapper.get('button').trigger('keydown', { key: 'Escape' })
  expect(removed()).toEqual(handlers)
  await wrapper.get('button').trigger('focus')
  expect(added()).toHaveLength(6)
  await wrapper.setProps({ description: null })
  expect(document.querySelector('[role=tooltip]')).toBeNull()
  expect(removed()).toHaveLength(6)
})

it('replaces a focused tooltip when another name is hovered and clears active state on unmount', async () => {
  wrapper = mount({
    components: { DescribedName },
    template: '<div><DescribedName name="first" description="First description" /><DescribedName name="second" description="Second description" /></div>',
  }, { attachTo: document.body })
  const [first, second] = wrapper.findAll('button')
  first!.element.focus()
  await flushPromises()
  expect(document.querySelectorAll('[role=tooltip]')).toHaveLength(1)
  await second!.trigger('mouseenter')
  expect(document.querySelectorAll('[role=tooltip]')).toHaveLength(1)
  expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Second description')
  expect(first!.attributes('aria-describedby')).toBeUndefined()
  // The now-inactive first instance must not close the active second tooltip.
  await first!.trigger('blur')
  expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Second description')
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await flushPromises()
  expect(document.querySelector('[role=tooltip]')).toBeNull()
  await first!.trigger('mouseenter')
  wrapper.unmount()
  expect(document.querySelector('[role=tooltip]')).toBeNull()
  wrapper = mount(DescribedName, { props: { name: 'next', description: 'Next description' }, attachTo: document.body })
  await wrapper.get('button').trigger('focus')
  expect(document.querySelectorAll('[role=tooltip]')).toHaveLength(1)
})
