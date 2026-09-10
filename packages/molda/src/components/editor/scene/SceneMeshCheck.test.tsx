import { expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { type ComponentProps, StrictMode, useLayoutEffect } from 'react'
import { COPY } from '../../../core/copy'
import { SceneMeshCheck } from './SceneMeshCheck'

type Check = ComponentProps<typeof SceneMeshCheck>['check']

function idle(): Check {
  return {
    busy: false,
    preview: null,
    error: null,
    disabled: false,
    issues: null,
    cancel: () => {},
    confirm: () => {},
    inspect: () => undefined,
    repair: () => undefined,
    select: () => {},
  }
}

test('mesh check restores the keyboard target during the DOM commit, before passive effects', () => {
  const observed: Array<string | null> = []
  function ObserveCommit({ check }: { check: Check }) {
    // The parent layout effect observes the completed child DOM before paint/passive effects.
    useLayoutEffect(() => {
      observed.push(document.activeElement?.textContent ?? null)
    })
    return <SceneMeshCheck check={check} />
  }
  const initial = idle()
  const element = (check: Check) => (
    <StrictMode>
      <ObserveCommit check={check} />
    </StrictMode>
  )
  const view = render(element(initial))
  try {
    const details = view.container.querySelector('details')
    if (!details) throw new Error('Missing mesh check panel')
    details.open = true
    view.rerender(element({ ...initial, busy: true }))
    expect(observed.at(-1)).toBe(COPY.scene.previewCancel)
    view.rerender(element({ ...initial, issues: [] }))
    expect(observed.at(-1)).toBe(COPY.scene.meshCheckRun)
    const preview: Check['preview'] = { kind: 'unused-points', count: 1, ids: ['orphan'] }
    view.rerender(element({ ...initial, busy: true, preview }))
    expect(observed.at(-1)).toBe(COPY.scene.previewCancel)
    view.rerender(element({ ...initial, preview }))
    expect(observed.at(-1)).toBe(COPY.scene.previewConfirm)
    view.rerender(element(initial))
    expect(observed.at(-1)).toBe(COPY.scene.meshCheckRun)
    view.rerender(element({ ...initial, busy: true }))
    view.rerender(element({ ...initial, error: COPY.scene.meshCheckFailed }))
    expect(observed.at(-1)).toBe(COPY.scene.meshCheckRun)
  } finally {
    view.unmount()
  }
})

test('mesh check leaves focus alone on mount and on unrelated report updates', () => {
  const initial = idle()
  const element = (check: Check) => (
    <StrictMode>
      <button type="button">Outra ferramenta</button>
      <SceneMeshCheck check={check} />
    </StrictMode>
  )
  const view = render(element(initial))
  try {
    const inspect = view.getByRole('button', { name: COPY.scene.meshCheckRun })
    expect(document.activeElement === inspect).toBe(false)
    const other = view.getByRole('button', { name: 'Outra ferramenta' })
    other.focus()
    view.rerender(element({ ...initial, issues: [] }))
    expect(document.activeElement === other).toBe(true)
    view.rerender(element({ ...initial, error: COPY.scene.meshCheckFailed }))
    expect(document.activeElement === other).toBe(true)
  } finally {
    view.unmount()
  }
})
