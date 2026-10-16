import { expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import type * as Monaco from 'monaco-editor'
import type { ProjectTree } from '../../../core/proProject'
import type { ProLanguageSession } from '../../../monaco/pro/session'
import { ProCodeTools } from './ProCodeTools'

it('keeps syntactic symbols for an unchanged file and discards an old response after editing', async () => {
  let calls = 0
  let finish: (value: Array<{ name: string; start: number; depth: number }>) => void = () => {}
  const language = {
    current: {
      request: () => {
        calls++
        return new Promise((resolve) => {
          finish = resolve
        })
      },
    } as unknown as ProLanguageSession,
  }
  let content = 'const score = 1'
  const editor = {
    current: {
      getModel: () => ({ getValue: () => content }),
    } as unknown as Monaco.editor.IStandaloneCodeEditor,
  }
  const tree: ProjectTree = { 'main.ts': { kind: 'file', content } }
  const props = {
    path: 'main.ts',
    tree,
    language,
    editor,
    navigate: () => {},
    back: () => {},
    canGoBack: false,
    prepare: () => {},
    busy: false,
    recover: () => {},
    search: () => {},
    format: () => {},
  }
  const view = render(<ProCodeTools {...props} />)
  fireEvent.click(view.getByRole('button', { name: 'Mapa do arquivo' }))
  expect(calls).toBe(1)
  expect(view.getByRole('status').textContent).toContain('Analisando')
  await act(async () => finish([{ name: 'score', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: 'score', exact: true })).toBeDefined()
  view.rerender(
    <ProCodeTools
      {...props}
      tree={{ ...tree, 'other.ts': { kind: 'file', content: 'const y = 2' } }}
    />,
  )
  expect(calls).toBe(1)
  content = 'const points = 1'
  view.rerender(<ProCodeTools {...props} tree={{ 'main.ts': { kind: 'file', content } }} />)
  expect(calls).toBe(2)
  const old = finish
  content = 'const stars = 1'
  view.rerender(<ProCodeTools {...props} tree={{ 'main.ts': { kind: 'file', content } }} />)
  await act(async () => old([{ name: 'points', start: 6, depth: 0 }]))
  expect(view.queryByRole('button', { name: 'points', exact: true })).toBeNull()
  await act(async () => finish([{ name: 'stars', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: 'stars', exact: true })).toBeDefined()
})
