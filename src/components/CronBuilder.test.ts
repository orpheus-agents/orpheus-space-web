import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CronBuilder from './CronBuilder.vue'

describe('CronBuilder', () => {
  it('reads a weekday expression and rebuilds it from the controls', async () => {
    const wrapper = mount(CronBuilder, { props: { modelValue: '30 18 * * 1-5' } })
    const kind = wrapper.find('select')
    expect((kind.element as HTMLSelectElement).value).toBe('weekdays')
    expect((wrapper.find('input[type=time]').element as HTMLInputElement).value).toBe('18:30')
    await wrapper.find('input[type=time]').setValue('07:05')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['5 7 * * 1-5'])
    await kind.setValue('weekly')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['5 7 * * 1,2,3,4,5'])
    const boxes = wrapper.findAll('input[type=checkbox]')
    expect(boxes).toHaveLength(7)
    await boxes[0].setValue(false)
    await boxes[6].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['5 7 * * 2,3,4,5,0'])
    for (const box of boxes.slice(1, 5)) await box.setValue(false)
    await boxes[6].setValue(false)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    // Simulate the parent's v-model feedback, including the incomplete expression.
    await wrapper.setProps({ modelValue: '' })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('weekly')
    expect(wrapper.find('[role=alert]').text()).toBe('Choose at least one day.')
    await wrapper.findAll('input[type=checkbox]')[2].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['5 7 * * 3'])
    wrapper.unmount()
  })
  it('keeps unknown expressions editable as text and explains readable ones', async () => {
    const wrapper = mount(CronBuilder, { props: { modelValue: '0 9 L * *' } })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('custom')
    const text = wrapper.find('input.font-mono')
    expect((text.element as HTMLInputElement).value).toBe('0 9 L * *')
    await text.setValue('*/10 * * * *')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['*/10 * * * *'])
    await wrapper.setProps({ modelValue: '*/10 * * * *' })
    // The description arrives after cronstrue loads lazily.
    await vi.waitFor(() => expect(wrapper.text()).toContain('Every 10 minutes'))
    await wrapper.setProps({ modelValue: '0 9 * * *', error: 'Check the cron expression.' })
    await flushPromises()
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('daily')
    expect(wrapper.find('[role=alert]').text()).toBe('Check the cron expression.')
    wrapper.unmount()
  })
  it('shows an option for a saved every-minute schedule', () => {
    const wrapper = mount(CronBuilder, { props: { modelValue: '* * * * *' } })
    expect((wrapper.findAll('select')[1].element as HTMLSelectElement).value).toBe('1')
    wrapper.unmount()
  })
  it('switches to interval plans with pluralized options', async () => {
    const wrapper = mount(CronBuilder, { props: { modelValue: '0 9 * * *' } })
    await wrapper.find('select').setValue('hourly')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['0 * * * *'])
    const every = wrapper.findAll('select')[1]
    expect(every.findAll('option').map((option) => option.text())).toContain('Every 2 hours')
    await every.setValue('6')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['0 */6 * * *'])
    await wrapper.find('input[type=number]').setValue('15')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['15 */6 * * *'])
    wrapper.unmount()
  })
})
