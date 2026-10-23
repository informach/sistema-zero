import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { type LessonFormBuffer, LessonFormBufferSlot } from '../src/lib/lesson-form-buffer'

if (typeof document === 'undefined') GlobalRegistrator.register({ url: 'http://localhost/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

test('React observes the slot itself without a second state for its opening or fields', async () => {
  const slot = new LessonFormBufferSlot<{ title: string }>(() => true)
  const container = document.createElement('div')
  const root = createRoot(container)
  let domInsideOpen = ''
  function Fields({ opening }: { opening: LessonFormBuffer<{ title: string }> }) {
    const value = useSyncExternalStore(opening.subscribe, opening.getSnapshot, opening.getSnapshot)
    return <output>{value.title}</output>
  }
  function Form() {
    const opening = useSyncExternalStore(slot.subscribe, slot.getCurrent, slot.getCurrent)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            slot.open('A', { title: 'A' })
            domInsideOpen = container.querySelector('output')?.textContent ?? ''
          }}
        >
          Abrir
        </button>
        {opening ? <Fields opening={opening} /> : <output>Fechado</output>}
      </>
    )
  }
  try {
    await act(async () => root.render(<Form />))
    await act(async () => container.querySelector('button')!.click())
    expect(domInsideOpen).toBe('Fechado')
    expect(container.querySelector('output')?.textContent).toBe('A')
    const first = slot.getCurrent()
    if (!first) throw new Error('Expected current real opening')
    await act(async () => {
      first.update((value) => ({ ...value, title: 'Accepted before renew' }))
      slot.renew(first)
    })
    expect(container.querySelector('output')?.textContent).toBe('Accepted before renew')
    expect(slot.close(first)).toBe(false)
    const renewed = slot.getCurrent()
    if (!renewed) throw new Error('Expected renewed real opening')
    await act(async () => {
      slot.close(renewed)
      slot.open('A', { title: 'New A' })
    })
    expect(renewed.set({ title: 'Old callback' })).toBe(false)
    expect(container.querySelector('output')?.textContent).toBe('New A')
    await act(async () => {
      const current = slot.getCurrent()
      if (current) slot.close(current)
    })
    expect(container.querySelector('output')?.textContent).toBe('Fechado')
  } finally {
    await act(async () => root.unmount())
  }
})
