import { expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import type * as Monaco from 'monaco-editor'
import type { ProjectTree } from '../../../core/proProject'
import type { ProLanguageSession } from '../../../monaco/pro/session'
import { pythonDocumentOffset } from '../../../python/language/editorCoordinates'
import type { ProWorkspaceLanguage } from './language'
import { ProCodeTools, type ProEditorTools } from './ProCodeTools'

// As janelas abrem pelas ações que o componente publica para a faixa do editor.
let tools: ProEditorTools | null = null

function toolsFixture(language: ProLanguageSession | null) {
  const content = 'const score = 1; const stars = score'
  const tree: ProjectTree = { 'main.ts': { kind: 'file', content } }
  return {
    path: 'main.ts',
    tree,
    language,
    editor: {
      current: {
        focus: () => {},
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
    onToolsReady: (next: ProEditorTools | null) => {
      tools = next
    },
  }
}

it('renders the file map incrementally and searches symbols beyond the initial page', async () => {
  const items = Array.from({ length: 500 }, (_, index) => ({
    name: `item${index}`,
    kind: 'const',
    start: 6,
    length: 5,
    depth: 0,
  }))
  const props = toolsFixture({ request: async () => items } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  await act(async () => tools?.openSymbols())
  const panel = view.getByRole('region', { name: 'Mapa do arquivo' })
  expect(panel.querySelectorAll('li').length).toBe(100)
  fireEvent.click(view.getByRole('button', { name: 'Mostrar mais símbolos' }))
  expect(panel.querySelectorAll('li').length).toBe(200)
  fireEvent.change(view.getByRole('searchbox', { name: 'Buscar no mapa do arquivo' }), {
    target: { value: 'item499' },
  })
  expect(panel.querySelectorAll('li').length).toBe(1)
  expect(view.queryByRole('button', { name: /^item499\b/ })).not.toBeNull()
  fireEvent.change(view.getByRole('searchbox', { name: 'Buscar no mapa do arquivo' }), {
    target: { value: '' },
  })
  expect(panel.querySelectorAll('li').length).toBe(100)
})

it('maps a normalized Python editor cursor to the unchanged saved source for references and symbols', async () => {
  const source = '# a\r\n# b\nvalor = 1\nprint(valor)\n'
  const buffer = source.replace(/\r\n/g, '\n')
  const calls: unknown[][] = []
  const language = {
    documentOffset: pythonDocumentOffset,
    request: async (method: string, ...args: unknown[]) => {
      calls.push([method, ...args])
      return method === 'symbols'
        ? [{ name: 'valor', start: source.indexOf('valor'), depth: 0 }]
        : []
    },
  } as unknown as ProWorkspaceLanguage
  const props = toolsFixture(null)
  const view = render(
    <ProCodeTools
      {...props}
      path="main.py"
      tree={{ 'main.py': { kind: 'file', content: source } }}
      language={language}
      editor={{
        current: {
          getModel: () => ({
            uri: { path: '/test/main.py' },
            getValue: () => buffer,
            getWordAtPosition: () => ({ word: 'valor' }),
          }),
          getPosition: () => ({ lineNumber: 4, column: 7 }),
        } as unknown as Monaco.editor.IStandaloneCodeEditor,
      }}
    />,
  )
  await act(async () => tools?.openSymbols())
  expect(view.queryByRole('button', { name: /^valor\b/ })).not.toBeNull()
  act(() => tools?.openCommands())
  await act(async () => {
    fireEvent.click(view.getByRole('button', { name: /Onde isto é usado.*Shift/ }))
  })
  expect(calls).toContainEqual(['references', 'main.py', source.lastIndexOf('valor')])
  expect(view.queryByText(/Clique no nome dentro do código/)).toBeNull()
})

it('loads an already open symbols panel when the language session becomes ready', async () => {
  const props = toolsFixture(null)
  const view = render(<ProCodeTools {...props} />)
  act(() => tools?.openSymbols())
  const language = {
    request: async () => [{ name: 'score', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  expect(view.queryByRole('button', { name: /^score\b/ })).not.toBeNull()
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
    act(() => tools?.openCommands())
    fireEvent.click(view.getByRole('button', { name: /Onde isto é usado.*Shift/ }))
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

it('keeps every reference reachable through bounded pages and resets a new search', async () => {
  const items = Array.from({ length: 251 }, (_, index) => ({
    path: `reference-${index}.ts`,
    span: { start: 0, length: 5 },
  }))
  let calls = 0
  const props = toolsFixture({
    request: async () => (++calls === 1 ? items : items.slice(0, 1)),
  } as unknown as ProLanguageSession)
  for (const item of items) props.tree[item.path] = { kind: 'file', content: 'score' }
  const visits: unknown[] = []
  const view = render(<ProCodeTools {...props} navigate={(...location) => visits.push(location)} />)
  const search = async () => {
    act(() => tools?.openCommands())
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: /Onde isto é usado.*Shift/ }))
    })
  }
  await search()
  const panel = view.getByRole('region', { name: 'Referências encontradas' })
  expect(panel.textContent).toContain('100 de 251')
  expect(panel.querySelectorAll('button').length).toBe(102)
  fireEvent.click(view.getByRole('button', { name: 'Mostrar mais referências' }))
  expect(panel.textContent).toContain('200 de 251')
  fireEvent.click(view.getByRole('button', { name: 'Mostrar mais referências' }))
  expect(panel.textContent).toContain('251 de 251')
  fireEvent.click(view.getByRole('button', { name: 'reference-250.ts:1' }))
  expect(visits).toEqual([['reference-250.ts', 1, 1]])
  expect(view.queryByRole('button', { name: 'Mostrar mais referências' })).toBeNull()
  await search()
  expect(panel.textContent).toContain('1 de 1')
  expect(view.queryByRole('button', { name: 'reference-250.ts:1' })).toBeNull()
})

it('discards symbols from a replaced language session and loads the replacement', async () => {
  const old = Promise.withResolvers<unknown>()
  const props = toolsFixture({ request: () => old.promise } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  act(() => tools?.openSymbols())
  const language = {
    request: async () => [{ name: 'current', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  await act(async () => old.resolve([{ name: 'outdated', start: 6, depth: 0 }]))
  expect(view.queryByRole('button', { name: /^outdated\b/ })).toBeNull()
  expect(view.queryByRole('button', { name: /^current\b/ })).not.toBeNull()
})

it('shows a symbols failure and clears it when the language session recovers', async () => {
  const props = toolsFixture({
    request: async () => {
      throw new Error('A análise foi interrompida.')
    },
  } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  await act(async () => {
    act(() => tools?.openSymbols())
  })
  expect(view.getByRole('status').textContent).toContain('A análise foi interrompida.')
  expect(view.queryByText('Analisando símbolos…')).toBeNull()
  const language = {
    request: async () => [{ name: 'score', start: 6, depth: 0 }],
  } as unknown as ProLanguageSession
  await act(async () => view.rerender(<ProCodeTools {...props} language={language} />))
  expect(view.queryByText('A análise foi interrompida.')).toBeNull()
  expect(view.getByRole('button', { name: /^score\b/ })).toBeDefined()
})

it.each([
  'resolve',
  'reject',
] as const)('ignores an old reference %s after file A → B → A', async (finish) => {
  const request = Promise.withResolvers<unknown>()
  const props = toolsFixture({ request: () => request.promise } as unknown as ProLanguageSession)
  const view = render(<ProCodeTools {...props} />)
  act(() => tools?.openCommands())
  fireEvent.click(view.getByRole('button', { name: /Onde isto é usado.*Shift/ }))
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
    act(() => tools?.openCommands())
    fireEvent.click(view.getByRole('button', { name: /Onde isto é usado.*Shift/ }))
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
    onToolsReady: (next: ProEditorTools | null) => {
      tools = next
    },
  }
  const view = render(<ProCodeTools {...props} />)
  act(() => tools?.openSymbols())
  expect(calls).toBe(1)
  expect(view.getByRole('status').textContent).toContain('Lendo o mapa')
  await act(async () => finish([{ name: 'score', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: /^score\b/ })).toBeDefined()
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
  expect(view.queryByRole('button', { name: /^points\b/ })).toBeNull()
  await act(async () => finish([{ name: 'stars', start: 6, depth: 0 }]))
  expect(view.getByRole('button', { name: /^stars\b/ })).toBeDefined()
})

it('keeps the expanded file map window when an edit refreshes the symbols of the same file', async () => {
  // Revisão completa da missão (Pro, item 2): a janela ficava presa à identidade da lista e
  // voltava a 100 a cada edição, levando embora o símbolo que a criança estava vendo.
  const items = () =>
    Array.from({ length: 500 }, (_, index) => ({
      name: `item${index}`,
      kind: 'const',
      start: 6,
      length: 5,
      depth: 0,
    }))
  let content = 'const score = 1; const stars = score'
  const props = toolsFixture({ request: async () => items() } as unknown as ProLanguageSession)
  const model = props.editor.current as unknown as { getModel: () => { getValue: () => string } }
  const original = model.getModel
  model.getModel = () => ({ ...original(), getValue: () => content })
  const view = render(<ProCodeTools {...props} />)
  await act(async () => tools?.openSymbols())
  const panel = view.getByRole('region', { name: 'Mapa do arquivo' })
  fireEvent.click(view.getByRole('button', { name: 'Mostrar mais símbolos' }))
  expect(panel.querySelectorAll('li').length).toBe(200)
  content = `${content} `
  const tree: ProjectTree = { 'main.ts': { kind: 'file', content } }
  await act(async () => view.rerender(<ProCodeTools {...props} tree={tree} />))
  await act(async () => {})
  expect(panel.querySelectorAll('li').length).toBe(200)
})

it('opens the map and finds the name in a file with mixed line breaks, which the editor normalizes', async () => {
  // O projeto guarda o texto como veio (CRLF e LF juntos); o Monaco mostra o mesmo texto com uma
  // quebra só. Os dois são o mesmo documento: o mapa não pode ficar em "Lendo o mapa…".
  const saved = 'const score = 1;\r\nconst stars = score\n'
  const shown = 'const score = 1;\nconst stars = score\n'
  const calls: unknown[][] = []
  const language = {
    request: async (method: string, ...args: unknown[]) => {
      calls.push([method, ...args])
      return method === 'symbols' ? [{ name: 'score', start: 6, depth: 0 }] : []
    },
  } as unknown as ProLanguageSession
  const props = toolsFixture(language)
  props.tree['main.ts'] = { kind: 'file', content: saved }
  const editor = props.editor.current as unknown as { getModel: () => Record<string, unknown> }
  const original = editor.getModel
  editor.getModel = () => ({ ...original(), getValue: () => shown })
  const view = render(<ProCodeTools {...props} />)
  await act(async () => tools?.openSymbols())
  expect(view.queryByText('Lendo o mapa…')).toBeNull()
  expect(view.queryByRole('button', { name: /^score\b/ })).not.toBeNull()
  await act(async () => tools?.findReferences())
  expect(view.queryByText(/Clique no nome dentro do código/)).toBeNull()
  expect(calls).toContainEqual(['references', 'main.ts', 6])
})
