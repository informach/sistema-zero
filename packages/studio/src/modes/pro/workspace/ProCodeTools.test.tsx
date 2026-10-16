import { expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import type * as Monaco from 'monaco-editor'
import type { ProjectTree } from '../../../core/proProject'
import type { ProLanguageSession } from '../../../monaco/pro/session'
import { ProCodeTools } from './ProCodeTools'

function toolsFixture(language: ProLanguageSession | null) {
  const content = 'const score = 1; const stars = score'
  const tree: ProjectTree = { 'main.ts': { kind: 'file', content } }
  return {
    path: 'main.ts',
    tree,
    language,
    editor: {
      current: {
        getModel: () => ({
          uri: { path: '/test/main.ts' },
          getValue: () => content,
          getOffsetAt: () => 6,
          getWordAtPosition: () => ({ word: 'score' }),
        }),
        getPosition: () => ({ lineNumber: 1, column: 7 }),
      } as unknown as Monaco.editor.IStandaloneCodeEditor,
    },
    navigate: () => {},
    back: () => {},
    canGoBack: false,
    prepare: () => {},
    busy: false,
    recover: () => {},
    search: () => {},
    format: () => {},
  }
}

it('loads an already open symbols panel when the language session becomes ready', async () => {
  const props = toolsFixture(null)
  const view = render(<ProCodeTools {...props} />)
  fireEvent.click(view.getByRole('button', { name: 'Símbolos do arquivo' }))
  const language = {
    request: async () => [{ name: 'score', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  expect(view.queryByRole('button', { name: 'score' })).not.toBeNull()
})

it('keeps the latest reference search when an older request finishes afterwards', async () => {
  const first = Promise.withResolvers<unknown>()
  const second = Promise.withResolvers<unknown>()
  let calls = 0
  const props = toolsFixture({
    request: () => (++calls === 1 ? first.promise : second.promise),
  } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  const search = () => {
    fireEvent.click(view.getByRole('button', { name: 'Comandos…' }))
    fireEvent.click(view.getByRole('button', { name: /Localizar referências.*Shift/ }))
  }
  search()
  search()
  await act(async () => second.resolve([{ path: 'main.ts', span: { start: 23, length: 5 } }]))
  expect(view.getByRole('region', { name: 'Referências encontradas' }).textContent).toContain(
    'main.ts:1',
  )
  await act(async () => first.resolve([]))
  expect(view.queryByRole('region', { name: 'Referências encontradas' })).not.toBeNull()
  expect(view.queryByText(/Nenhuma referência encontrada/)).toBeNull()
})

it('discards symbols from a replaced language session and loads the replacement', async () => {
  const old = Promise.withResolvers<unknown>()
  const props = toolsFixture({ request: () => old.promise } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  fireEvent.click(view.getByRole('button', { name: 'Símbolos do arquivo' }))
  const language = {
    request: async () => [{ name: 'current', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  await act(async () => old.resolve([{ name: 'outdated', start: 6, depth: 0 }]))
  expect(view.queryByRole('button', { name: 'outdated' })).toBeNull()
  expect(view.queryByRole('button', { name: 'current' })).not.toBeNull()
})

it('shows a symbols failure and clears it when the language session recovers', async () => {
  const props = toolsFixture({
    request: async () => {
      throw new Error('A análise foi interrompida.')
    },
  } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  await act(async () => {
    fireEvent.click(view.getByRole('button', { name: 'Símbolos do arquivo' }))
  })
  expect(view.getByRole('status').textContent).toContain('A análise foi interrompida.')
  expect(view.queryByText('Analisando símbolos…')).toBeNull()
  const language = {
    request: async () => [{ name: 'score', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  expect(view.queryByText('A análise foi interrompida.')).toBeNull()
  expect(view.getByRole('button', { name: 'score' })).toBeDefined()
})

it.each([
  'resolve',
  'reject',
] as const)('ignores an old reference %s after file A → B → A', async (finish) => {
  const request = Promise.withResolvers<unknown>()
  const props = toolsFixture({ request: () => request.promise } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  fireEvent.click(view.getByRole('button', { name: 'Comandos…' }))
  fireEvent.click(view.getByRole('button', { name: /Localizar referências.*Shift/ }))
  view.rerender(<ProCodeTools {...props} path="other.ts" />)
  view.rerender(<ProCodeTools {...props} />)
  await act(async () => {
    if (finish === 'resolve') request.resolve([{ path: 'main.ts', span: { start: 6, length: 5 } }])
    else request.reject(new Error('old request failed'))
  })
  expect(view.queryByRole('region', { name: 'Referências encontradas' })).toBeNull()
  expect(view.queryByText(/old request failed/)).toBeNull()
})

it('does not reopen references when a pending search completes after dismissal', async () => {
  const pending = Promise.withResolvers<unknown>()
  let calls = 0
  const items = [{ path: 'main.ts', span: { start: 6, length: 5 } }]
  const props = toolsFixture({
    request: () => (++calls === 1 ? Promise.resolve(items) : pending.promise),
  } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  const search = () => {
    fireEvent.click(view.getByRole('button', { name: 'Comandos…' }))
    fireEvent.click(view.getByRole('button', { name: /Localizar referências.*Shift/ }))
  }
  search()
  await act(async () => {
    await Promise.resolve()
  })
  search()
  fireEvent.click(view.getByRole('button', { name: 'Fechar referências' }))
  await act(async () => pending.resolve(items))
  expect(view.queryByRole('region', { name: 'Referências encontradas' })).toBeNull()
})

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
    language: language.current,
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
  fireEvent.click(view.getByRole('button', { name: 'Símbolos do arquivo' }))
  expect(calls).toBe(1)
  expect(view.getByRole('status').textContent).toContain('Analisando')
  await act(async () => finish([{ name: 'score', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: 'score' })).toBeDefined()
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
  expect(view.queryByRole('button', { name: 'points' })).toBeNull()
  await act(async () => finish([{ name: 'stars', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: 'stars' })).toBeDefined()
})
