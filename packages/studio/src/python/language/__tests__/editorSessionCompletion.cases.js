import { expect, test } from 'bun:test'
import { attachPythonEditorLanguage } from '../editorSession'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const event = () => {
  const listeners = new Set()
  return {
    listen(callback) {
      listeners.add(callback)
      return { dispose: () => listeners.delete(callback) }
    },
    fire(value) {
      for (const listener of [...listeners]) listener(value)
    },
  }
}
const disposable = () => ({ dispose() {} })
const positionAt = (text, offset) => {
  const lines = text.slice(0, offset).split('\n')
  return { lineNumber: lines.length, column: lines.at(-1).length + 1 }
}
const offsetAt = (text, position) =>
  text
    .split('\n')
    .slice(0, position.lineNumber - 1)
    .reduce((total, line) => total + line.length + 1, 0) +
  position.column -
  1

/** Controlled public editor/transport ports; the real editor session, providers and client execute. */
function fixture({ actionRejects = false } = {}) {
  const prefix = `completion_${crypto.randomUUID()}`
  const content = event(),
    cursor = event(),
    changed = event(),
    blurred = event()
  let text = 'tartaruga.\n',
    version = 1,
    dead = false,
    focused = true
  let position = positionAt(text, 10)
  let tree = { 'main.py': { kind: 'file', content: text } }
  const model = {
    uri: {
      path: `/${prefix}/main.py`,
      toString() {
        return this.path
      },
    },
    isDisposed: () => dead,
    dispose() {
      dead = true
    },
    getValue: () => text,
    getVersionId: () => version,
    getPositionAt: (offset) => positionAt(text, offset),
    getOffsetAt: (value) => offsetAt(text, value),
    getWordUntilPosition(value) {
      const line = text.split('\n')[value.lineNumber - 1].slice(0, value.column - 1)
      const word = /[\p{ID_Continue}]*$/u.exec(line)[0]
      return { word, startColumn: value.column - word.length, endColumn: value.column }
    },
    onDidChangeContent: content.listen,
  }
  let activeModel = model,
    completionProvider,
    currentToken
  const requests = [],
    results = [],
    actionCalls = [],
    commands = [],
    analysis = []
  const entered = deferred(),
    held = deferred()
  let heldCommand
  const reply = (command) => ({
    version: 1,
    id: command.id,
    kind: 'result',
    method: command.method,
    revision: command.revision,
    path: command.path,
    documentVersion: command.documentVersion,
    result:
      command.method === 'completions'
        ? [
            {
              name: 'forward',
              insertText: 'forward',
              sortText: '0',
              kind: 'method',
              additionalEdits: [],
            },
          ]
        : [],
  })
  const provider = {
    async open() {
      return {
        async send(command) {
          requests.push(command)
          if (command.kind === 'sync')
            return { version: 1, id: command.id, kind: 'synced', revision: command.revision }
          if (command.kind !== 'query') return { version: 1, id: command.id, kind: 'ack' }
          if (command.method === 'completions' && !heldCommand) {
            heldCommand = command
            entered.resolve()
            return held.promise
          }
          return reply(command)
        },
        close() {},
      }
    },
  }
  const editor = {
    getModel: () => activeModel,
    getPosition: () => position,
    getSelection: () => ({ isEmpty: () => true }),
    hasTextFocus: () => focused,
    onDidChangeModel: changed.listen,
    onDidChangeCursorSelection: cursor.listen,
    onDidBlurEditorText: blurred.listen,
    trigger(_source, id) {
      expect(id).toBe('hideSuggestWidget')
      commands.push(id)
      currentToken?.cancel()
    },
    getAction(id) {
      expect(id).toBe('editor.action.triggerSuggest')
      return {
        run() {
          commands.push('editor.action.triggerSuggest')
          const operation = actionRejects
            ? Promise.reject(new Error('EXPECTED_ACTION_FAILURE'))
            : ask().then((value) => {
                results.push(value)
              })
          // Store without a rejection handler: the production owner must consume a rejected run.
          actionCalls.push(operation)
          return operation
        },
      }
    },
  }
  const monaco = {
    editor: {
      CursorChangeReason: { NotSet: 0 },
      getModels: () => [model],
      onDidCreateModel: () => disposable(),
      onWillDisposeModel: () => disposable(),
      registerEditorOpener: () => disposable(),
      setModelMarkers() {},
    },
    languages: {
      CompletionItemKind: {
        Function: 1,
        Class: 2,
        Module: 3,
        Keyword: 4,
        Property: 5,
        Variable: 6,
      },
      registerCompletionItemProvider(_language, provider) {
        completionProvider = provider
        return disposable()
      },
      registerHoverProvider: () => disposable(),
      registerDefinitionProvider: () => disposable(),
      registerReferenceProvider: () => disposable(),
      registerDocumentSymbolProvider: () => disposable(),
      registerSignatureHelpProvider: () => disposable(),
    },
  }
  const session = attachPythonEditorLanguage({
    monaco,
    prefix,
    projectId: 'project',
    entrypoint: () => 'main.py',
    provider,
    editor,
    tree: () => tree,
    openFile() {},
    diagnostics() {},
    analysis: (state) => analysis.push(state),
  })
  function token() {
    const cancelled = event()
    return {
      isCancellationRequested: false,
      onCancellationRequested: cancelled.listen,
      cancel() {
        this.isCancellationRequested = true
        cancelled.fire()
      },
    }
  }
  function ask(cancellation = token()) {
    currentToken = cancellation
    return completionProvider.provideCompletionItems(
      model,
      position,
      { triggerKind: 0 },
      cancellation,
    )
  }
  function edit(value, newOffset = value.length - 1) {
    text = value
    version++
    position = positionAt(text, newOffset)
    content.fire()
    cursor.fire({ source: 'keyboard', reason: 0, selection: { isEmpty: () => true } })
  }
  return {
    entered: entered.promise,
    token,
    ask,
    requests,
    results,
    actionCalls,
    commands,
    analysis,
    insert(value) {
      edit(`tartaruga.${value}\n`)
    },
    edit,
    navigateAwayAndBack() {
      const saved = position
      position = { lineNumber: 1, column: 1 }
      cursor.fire({ source: 'keyboard', reason: 3, selection: { isEmpty: () => true } })
      position = saved
      cursor.fire({ source: 'keyboard', reason: 3, selection: { isEmpty: () => true } })
    },
    modelAwayAndBack() {
      activeModel = null
      changed.fire()
      activeModel = model
      changed.fire()
    },
    blurAndFocus() {
      focused = false
      blurred.fire()
      focused = true
    },
    orphan() {
      tree = {}
      session.update()
    },
    failFirst() {
      held.reject(new Error('EXPECTED_TRANSPORT_FAILURE'))
    },
    dispose() {
      session.dispose()
      if (heldCommand) held.resolve(reply(heldCommand))
    },
  }
}

for (const insertion of ['for', 'ação'])
  test(`a pending completion invalidated by ${insertion} requests the current revision once`, async () => {
    const f = fixture()
    try {
      const old = f.ask()
      await f.entered
      f.insert(insertion.slice(0, 1))
      f.insert(insertion)
      expect((await old).suggestions).toEqual([])
      await Promise.resolve()
      expect(f.actionCalls).toHaveLength(1)
      expect(f.commands).toEqual(['hideSuggestWidget', 'editor.action.triggerSuggest'])
      await f.actionCalls[0]
      expect(f.results[0].suggestions.map((item) => item.label)).toEqual(['forward'])
      const queries = f.requests.filter(
        (item) => item.kind === 'query' && item.method === 'completions',
      )
      expect(queries).toHaveLength(2)
      expect(queries[1].revision).toBeGreaterThan(queries[0].revision)
      expect(queries[1].offset).toBe(10 + insertion.length)
    } finally {
      f.dispose()
    }
  })

const negatives = {
  Escape: (_f, token) => token.cancel(),
  'cursor navigation A→B→A': (f) => f.navigateAwayAndBack(),
  'model navigation A→B→A': (f) => f.modelAwayAndBack(),
  'blur and refocus': (f) => f.blurAndFocus(),
  'orphaned model': (f) => f.orphan(),
  'changed prefix': (f) => f.edit('other.for\n'),
  'changed suffix': (f) => f.edit('tartaruga.for\nother\n'),
  'non identifier insertion': (f) => f.insert('for('),
  dispose: (f) => f.dispose(),
}
for (const [name, invalidate] of Object.entries(negatives))
  test(`a cancelled or displaced completion does not reopen IntelliSense: ${name}`, async () => {
    const f = fixture(),
      token = f.token()
    try {
      const old = f.ask(token)
      await f.entered
      f.insert('for')
      invalidate(f, token)
      expect((await old).suggestions).toEqual([])
      await Promise.resolve()
      expect(f.actionCalls).toHaveLength(0)
      expect(f.commands).toEqual([])
    } finally {
      f.dispose()
    }
  })

test('a newer completion request owns recovery instead of an older cancelled query', async () => {
  const f = fixture()
  try {
    const old = f.ask()
    await f.entered
    f.insert('for')
    const latest = f.ask()
    expect((await old).suggestions).toEqual([])
    expect((await latest).suggestions.map((item) => item.label)).toEqual(['forward'])
    expect(f.actionCalls).toHaveLength(0)
  } finally {
    f.dispose()
  }
})

test('a transport failure without an edit is visible and does not re-trigger', async () => {
  const f = fixture()
  try {
    const pending = f.ask()
    await f.entered
    f.failFirst()
    expect((await pending).suggestions).toEqual([])
    expect(f.actionCalls).toHaveLength(0)
    expect(f.analysis.some((state) => state.status === 'error')).toBe(true)
  } finally {
    f.dispose()
  }
})

test('a rejected public suggest action is consumed and reported without retrying the version', async () => {
  const f = fixture({ actionRejects: true })
  const unhandled = []
  const observe = (error) => unhandled.push(error)
  process.on('unhandledRejection', observe)
  try {
    const pending = f.ask()
    await f.entered
    f.insert('for')
    expect((await pending).suggestions).toEqual([])
    await Promise.resolve()
    expect(f.actionCalls).toHaveLength(1)
    // Yield only to observe rejection settlement; no debounce/readiness delay in the product.
    await new Promise((resolve) => setImmediate(resolve))
    expect(unhandled).toEqual([])
    expect(f.analysis.some((state) => state.message === 'EXPECTED_ACTION_FAILURE')).toBe(true)
  } finally {
    process.off('unhandledRejection', observe)
    f.dispose()
  }
})
