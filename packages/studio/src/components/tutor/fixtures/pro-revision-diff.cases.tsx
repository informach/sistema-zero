import { afterEach, expect, mock, test } from 'bun:test'
import path from 'node:path'
import { act, cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'

let pythonRegistered = false,
  contributionLoads = 0,
  disposedWrites = 0
type Model = { language: string; disposed: boolean; setValue(value: string): void; dispose(): void }
const all: Model[] = []
mock.module('monaco-editor/esm/vs/editor/editor.api.js', () => ({
  Uri: { parse: (value: string) => value },
  editor: {
    createModel: () => {
      const model: Model = {
        language: 'plaintext',
        disposed: false,
        setValue() {},
        dispose() {
          this.disposed = true
        },
      }
      all.push(model)
      return model
    },
    createDiffEditor: () => ({
      createViewModel: () => ({ dispose() {} }),
      setModel() {},
      dispose() {},
      updateOptions() {},
    }),
    setModelLanguage: (model: Model, language: string) => {
      if (model.disposed) disposedWrites++
      model.language = language === 'python' && !pythonRegistered ? 'plaintext' : language
    },
  },
}))
mock.module('monaco-editor/esm/vs/basic-languages/python/python.contribution.js', () => {
  contributionLoads++
  if (process.env.STUDIO_DIFF_IMPORT_FAILURE === '1') throw new Error('QA_PYTHON_IMPORT_FAILED')
  pythonRegistered = true
  return {}
})
mock.module(path.resolve('src/monaco/workers.ts'), () => ({ configureMonacoWorkers() {} }))
const { default: Diff } = await import('../ProRevisionDiff')
afterEach(cleanup)
const live = () => all.filter((model) => !model.disposed)

if (process.env.STUDIO_DIFF_IMPORT_FAILURE === '1') {
  test('review108 failed Python registration stays observable and cleans up its pair', async () => {
    const view = render(<Diff path="main.py" before="a = 1" after="a = 2" />)
    await act(async () => {})
    expect(view.getByRole('alert').textContent).toContain('Não foi possível carregar as cores')
    expect(live().map((model) => model.language)).toEqual(['plaintext', 'plaintext'])
    view.rerender(<Diff path="main.ts" before="c" after="d" />)
    await act(async () => {})
    expect(view.queryByRole('alert')).toBeNull()
    expect(live().map((model) => model.language)).toEqual([
      'sz-pro-typescript',
      'sz-pro-typescript',
    ])
    view.unmount()
    expect(live()).toEqual([])
    expect(disposedWrites).toBe(0)
  })
} else {
  test('review108 JS does not request the Python contribution', async () => {
    const before = contributionLoads
    render(<Diff path="main.ts" before="a" after="b" />)
    await act(async () => {})
    expect(contributionLoads).toBe(before)
    expect(live().map((model) => model.language)).toEqual([
      'sz-pro-typescript',
      'sz-pro-typescript',
    ])
  })
  test('review108 independent diff registers Python before selecting its models', async () => {
    render(
      <StrictMode>
        <Diff path="src/main.py" before="a = 1" after="a = 2" />
      </StrictMode>,
    )
    await act(async () => {})
    expect(live().map((model) => model.language)).toEqual(['python', 'python'])
    expect(contributionLoads).toBe(1)
    expect(disposedWrites).toBe(0)
  })
  test('review108 a withdrawn Python path cannot overwrite the successor language', async () => {
    const view = render(<Diff path="old.py" before="a" after="b" />)
    view.rerender(<Diff path="next.ts" before="c" after="d" />)
    await act(async () => {})
    expect(live().map((model) => model.language)).toEqual([
      'sz-pro-typescript',
      'sz-pro-typescript',
    ])
    view.unmount()
    await act(async () => {})
    expect(live()).toEqual([])
    expect(disposedWrites).toBe(0)
  })
}
