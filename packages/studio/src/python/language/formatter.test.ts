import { afterEach, expect, it } from 'bun:test'
import type * as Monaco from 'monaco-editor'
import { attachPythonFormatter } from './formatter'

const originalWorker = globalThis.Worker
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const dispose of cleanups.splice(0)) dispose()
  globalThis.Worker = originalWorker
})

/** Transport-only double; the real Ruff WASM and Monaco history are qualified in browser tests. */
class FormatTransport extends EventTarget {
  static created: FormatTransport[] = []
  messages: { id: number; source: string }[] = []
  terminated = 0
  constructor() {
    super()
    FormatTransport.created.push(this)
  }
  postMessage(data: { id: number; source: string }) {
    this.messages.push(data)
  }
  terminate() {
    this.terminated++
  }
  reply(value: string) {
    this.dispatchEvent(
      new MessageEvent('message', { data: { id: this.messages.at(-1)!.id, value } }),
    )
  }
}
function fixture() {
  FormatTransport.created = []
  globalThis.Worker = FormatTransport as unknown as typeof Worker
  let provider!: Monaco.languages.DocumentFormattingEditProvider
  const monaco = {
    languages: {
      registerDocumentFormattingEditProvider(_language: string, value: typeof provider) {
        provider = value
        return { dispose() {} }
      },
    },
  } as unknown as typeof Monaco
  const attachment = attachPythonFormatter(monaco, 'formatter_test')
  cleanups.push(attachment.dispose)
  let source = 'x=1\n',
    version = 1
  const model = {
    uri: {
      path: 'formatter_test/main.py',
      toString() {
        return this.path
      },
    },
    getValue: () => source,
    getVersionId: () => version,
    isDisposed: () => false,
    getFullModelRange: () => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 1,
    }),
  } as unknown as Monaco.editor.ITextModel
  const listeners = new Set<Parameters<Monaco.CancellationToken['onCancellationRequested']>[0]>()
  let cancelled = false
  const token: Monaco.CancellationToken = {
    get isCancellationRequested() {
      return cancelled
    },
    onCancellationRequested(listener) {
      listeners.add(listener)
      return { dispose: () => listeners.delete(listener) }
    },
  }
  return {
    attachment,
    model,
    format: () =>
      Promise.resolve(
        provider.provideDocumentFormattingEdits(model, { tabSize: 4, insertSpaces: true }, token),
      ),
    edit(value: string) {
      source = value
      version++
    },
    cancel() {
      cancelled = true
      for (const listener of listeners) listener(undefined)
    },
  }
}

it('loads no worker before formatting and refuses a late result after source changes', async () => {
  const editor = fixture()
  expect(FormatTransport.created).toHaveLength(0)
  const pending = editor.format()
  const worker = FormatTransport.created[0]!
  editor.edit('x=2\n')
  worker.reply('x = 1\n')
  expect(await pending).toEqual([])
  const next = editor.format()
  worker.reply('x = 2\n')
  expect(await next).toMatchObject([{ text: 'x = 2\n' }])
  expect(FormatTransport.created).toHaveLength(1)
})

it('physically terminates formatting when the editor closes or Monaco cancels', async () => {
  const first = fixture()
  const pending = first.format(),
    worker = FormatTransport.created[0]!
  first.cancel()
  expect(await pending).toEqual([])
  expect(worker.terminated).toBe(1)
  first.attachment.dispose()
  const second = fixture()
  const next = second.format(),
    other = FormatTransport.created[0]!
  second.attachment.dispose()
  other.reply('obsolete = True\n')
  expect(await next).toEqual([])
  expect(other.terminated).toBe(1)
})

it('recovers with a new worker after a loading failure and checks quotas before allocating', async () => {
  const editor = fixture()
  editor.edit('x'.repeat(1024 * 1024 + 1))
  await expect(editor.format()).rejects.toThrow('limite')
  expect(FormatTransport.created).toHaveLength(0)
  editor.edit('x=1\n')
  const failed = editor.format()
  const failure = failed.then(
    () => null,
    (error: unknown) => error,
  )
  FormatTransport.created[0]!.dispatchEvent(new Event('error'))
  expect(await failure).toBeInstanceOf(Error)
  expect(((await failure) as Error).message).toContain('carregado')
  expect(FormatTransport.created[0]!.terminated).toBe(1)
  const retried = editor.format()
  expect(FormatTransport.created).toHaveLength(2)
  FormatTransport.created[1]!.reply('x = 1\n')
  expect(await retried).toMatchObject([{ text: 'x = 1\n' }])
})
