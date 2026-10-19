import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { LessonFormBufferSlot } from '../src/lib/lesson-form-buffer'

if (typeof document === 'undefined') GlobalRegistrator.register({ url: 'http://localhost/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

test('capture observes accepted working values before their React DOM commit', async () => {
  const buffer = new LessonFormBufferSlot<{ title: string; choices: string[] }>(() => true).open(
    'block',
    { title: 'Inicial', choices: ['A'] },
  )
  const container = document.createElement('div')
  const root = createRoot(container)
  let captured: ReturnType<typeof buffer.getSnapshot> | null = null
  const getCapture = (): ReturnType<typeof buffer.getSnapshot> | null => captured
  let renderedWhenCaptured = ''
  function Form() {
    const form = useSyncExternalStore(buffer.subscribe, buffer.getSnapshot, buffer.getSnapshot)
    return (
      <>
        <output>{form.title}</output>
        <button
          type="button"
          onClick={() => {
            buffer.update((previous) => ({ ...previous, title: 'Novo' }))
            buffer.update((previous) => ({ ...previous, choices: [...previous.choices, 'B'] }))
            renderedWhenCaptured = container.querySelector('output')?.textContent ?? ''
            captured = structuredClone(buffer.getSnapshot())
          }}
        >
          Atualizar e capturar
        </button>
      </>
    )
  }
  try {
    await act(async () => root.render(<Form />))
    await act(async () => container.querySelector('button')!.click())
    expect(renderedWhenCaptured).toBe('Inicial')
    expect(getCapture()).toEqual({ title: 'Novo', choices: ['A', 'B'] })
    expect(container.querySelector('output')?.textContent).toBe('Novo')
  } finally {
    await act(async () => root.unmount())
  }
})
