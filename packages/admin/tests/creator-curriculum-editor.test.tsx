import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { creatorCurriculumFixture } from '../../core/tests/fixtures/creator-curriculum'
import { CreatorCurriculumEditor } from '../src/components/admin/creator-curriculum-editor'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})
async function mount(disabled = false) {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let current = creatorCurriculumFixture()
  function Fixture() {
    const [value, setValue] = useState(current)
    return (
      <CreatorCurriculumEditor
        value={value}
        courses={[]}
        disabled={disabled}
        onChange={(next) => {
          current = next
          setValue(next)
        }}
      />
    )
  }
  await act(async () => root.render(<Fixture />))
  cleanups.push(async () => {
    await act(async () => root.unmount())
    element.remove()
  })
  return { element, read: () => current }
}
test('curriculum authoring retains UUIDs not present in current catalog without deleting them', async () => {
  const { element, read } = await mount()
  expect(element.textContent).toContain('Vínculo indisponível')
  expect(read().stages[0]!.base2dCourseId).toBe(
    creatorCurriculumFixture().stages[0]!.base2dCourseId,
  )
  expect(element.textContent).toContain('Extras são opcionais')
  expect(element.querySelector('a[href="/admin/professor/maestrias"]')).not.toBeNull()
})
test('editing one power updates its distinct mechanic without reordering posts or other powers', async () => {
  const { element, read } = await mount()
  const input = [...element.querySelectorAll('input')].find((item) => item.value === 'Relógio')!
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, 'Relógio da missão')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  expect(read().stages[0]!.powers[0]!.title).toBe('Relógio da missão')
  expect(read().stages[0]!.powers[0]!.mechanicId).toBe('timer')
  expect(read().stages[1]!.powers[0]!.title).toBe('Relógio')
})
test('read-only staff can inspect a mastery but cannot change its requirements', async () => {
  const { element } = await mount(true)
  const button = [...element.querySelectorAll('button')].find(
    (item) => item.textContent === 'python2d',
  )!
  await act(async () => button.click())
  expect(element.textContent).toContain('Critérios essenciais do projeto')
  expect(
    [...element.querySelectorAll('input, select')].every(
      (item) => (item as HTMLInputElement).disabled,
    ),
  ).toBe(true)
})
