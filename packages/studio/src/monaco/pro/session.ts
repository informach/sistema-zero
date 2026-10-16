import type * as Monaco from 'monaco-editor'
import type { ProjectTree } from '#core'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import { inferLanguage } from '../languages'
import {
  buildMonacoModelPath,
  findMonacoModel,
  getMonacoModelPath,
  isModelInPathPrefix,
  releaseMonacoModelUri,
  reserveMonacoModelUri,
  setMonacoModelPath,
  synchronizeMonacoModel,
} from '../modelPaths'
import { PRO_JS_LANGUAGE, PRO_TS_LANGUAGE, proLanguage } from './languages'
import type { ProLanguageQueries } from './protocol'
import { createProLanguageClient } from './workerClient'

export interface ProProjectLanguageInput {
  tree: ProjectTree
  dependencies: Readonly<Record<string, string>>
  availableDependencyFiles?: readonly string[]
}
export interface ProEditorDiagnostic {
  path: string
  code: number
  line: number
  message: string
  column?: number
  sourceHash?: string
  severity?: 'error' | 'warning' | 'info'
}
type Model = Monaco.editor.ITextModel
type Session = ReturnType<typeof attachProLanguageService>
const sessions = new Map<string, Session>()
let providersRegistered = false

function range(model: Model, start: number, length: number): Monaco.IRange {
  const from = model.getPositionAt(start)
  const to = model.getPositionAt(start + length)
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column,
  }
}

function findSession(model: Model) {
  for (const [prefix, session] of sessions) if (isModelInPathPrefix(model, prefix)) return session
  return undefined
}

function registerProviders(monaco: typeof Monaco) {
  if (providersRegistered) return
  providersRegistered = true
  for (const language of [PRO_TS_LANGUAGE, PRO_JS_LANGUAGE]) {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', '"', "'", '/', '@'],
      async provideCompletionItems(model, position, _context, token) {
        const session = findSession(model)
        if (!session) return { suggestions: [] }
        const result = await session.query('completions', model, model.getOffsetAt(position))
        if (token.isCancellationRequested || model.isDisposed()) return { suggestions: [] }
        const word = model.getWordUntilPosition(position)
        return {
          suggestions: result.map((item) => ({
            label: item.name,
            insertText: item.insertText ?? item.name,
            sortText: item.sortText,
            kind: /function|method/.test(item.kind)
              ? monaco.languages.CompletionItemKind.Function
              : /class|interface/.test(item.kind)
                ? monaco.languages.CompletionItemKind.Class
                : /property/.test(item.kind)
                  ? monaco.languages.CompletionItemKind.Property
                  : monaco.languages.CompletionItemKind.Variable,
            range: item.replacementSpan
              ? range(model, item.replacementSpan.start, item.replacementSpan.length)
              : {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: word.startColumn,
                  endColumn: word.endColumn,
                },
          })),
        }
      },
    })
    monaco.languages.registerHoverProvider(language, {
      async provideHover(model, position, token) {
        const result = await findSession(model)?.query('hover', model, model.getOffsetAt(position))
        if (!result || token.isCancellationRequested || model.isDisposed()) return null
        return {
          range: range(model, result.span.start, result.span.length),
          contents: [
            { value: `\`\`\`typescript\n${result.text}\n\`\`\`` },
            { value: result.documentation },
          ],
        }
      },
    })
    monaco.languages.registerDocumentFormattingEditProvider(language, {
      async provideDocumentFormattingEdits(model, _options, token) {
        const edits = await findSession(model)?.query('format', model)
        return token.isCancellationRequested || model.isDisposed()
          ? []
          : (edits ?? []).map((edit) => ({
              range: range(model, edit.span.start, edit.span.length),
              text: edit.newText,
            }))
      },
    })
    monaco.languages.registerDefinitionProvider(language, {
      async provideDefinition(model, position, token) {
        const session = findSession(model)
        if (!session) return []
        const definitions = await session.query('definitions', model, model.getOffsetAt(position))
        if (token.isCancellationRequested) return []
        return definitions.flatMap((definition) => {
          const target = session.definitionModel(definition.path)
          return target
            ? [
                {
                  uri: target.uri,
                  range: range(target, definition.span.start, definition.span.length),
                },
              ]
            : []
        })
      },
    })
  }
}

export function attachProLanguageService(
  monaco: typeof Monaco,
  prefix: string,
  input: () => ProProjectLanguageInput,
  report: (message: string | null) => void,
  navigation: {
    editor: Monaco.editor.IStandaloneCodeEditor
    openFile(path: string): void
    diagnostics?(items: ProEditorDiagnostic[]): void
  },
) {
  registerProviders(monaco)
  const client = createProLanguageClient()
  let sent: Record<string, string> = {}
  let sentAvailable: readonly string[] | undefined
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let generation = 0
  let preparation: Promise<void> = Promise.resolve()
  let destination: { path: string; selection?: Monaco.IRange | Monaco.IPosition } | null = null
  const revealDestination = () => {
    const model = navigation.editor.getModel()
    if (!destination || !model || pathOf(model) !== destination.path) return
    const { selection } = destination
    destination = null
    if (!selection) return
    if ('startLineNumber' in selection) {
      navigation.editor.setSelection(selection)
      navigation.editor.revealRangeInCenterIfOutsideViewport(selection)
    } else {
      navigation.editor.setPosition(selection)
      navigation.editor.revealPositionInCenterIfOutsideViewport(selection)
    }
    navigation.editor.focus()
  }
  const modelChanged = navigation.editor.onDidChangeModel(revealDestination)
  const opener = monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource, selection) {
      if (source !== navigation.editor) return false
      const target = monaco.editor.getModel(resource)
      const full = target ? getMonacoModelPath(target) : resource.path.replace(/^\/+/, '')
      if (!full.startsWith(`${prefix}/`)) return false
      const path = full.slice(prefix.length + 1)
      if (input().tree[path]?.kind !== 'file') return false
      destination = { path, selection }
      navigation.openFile(path)
      revealDestination()
      return true
    },
  })
  const listeners = new Map<Model, Monaco.IDisposable>()
  const pathOf = (model: Model) => getMonacoModelPath(model).slice(prefix.length + 1)
  const snapshot = (expectedTree?: ProjectTree) => {
    const project = input()
    const tree = expectedTree ?? project.tree
    const next = { ...project.dependencies }
    for (const [path, node] of Object.entries(tree))
      if (node.kind === 'file') next[path] = node.content
    // The active Monaco buffer can precede React's next commit by one event.
    for (const model of monaco.editor.getModels())
      if (isModelInPathPrefix(model, prefix) && tree[pathOf(model)]?.kind === 'file') {
        if (expectedTree && next[pathOf(model)] !== model.getValue())
          throw new Error('O código está sendo atualizado. Confira o arquivo e tente novamente.')
        next[pathOf(model)] = model.getValue()
      }
    return next
  }
  const prepare = (expectedTree?: ProjectTree) => {
    const operation = preparation
      .catch(() => undefined)
      .then(async () => {
        if (disposed) throw new Error('Serviço de linguagem encerrado.')
        const next = snapshot(expectedTree)
        const patch: Record<string, string | null> = {}
        for (const [path, text] of Object.entries(next)) if (sent[path] !== text) patch[path] = text
        for (const path of Object.keys(sent)) if (!(path in next)) patch[path] = null
        const available = input().availableDependencyFiles
        if (!Object.keys(patch).length && available === sentAvailable) return
        await client.update(patch, available !== sentAvailable ? (available ?? []) : undefined)
        sent = next
        sentAvailable = available
      })
    preparation = operation
    return operation
  }
  const diagnose = async (epoch: number) => {
    await prepare()
    const sources = sent
    const gathered: ProEditorDiagnostic[] = []
    const seen = new Set<string>()
    const sourceHashes = new Map<string, string>()
    for (const [path, node] of Object.entries(input().tree)) {
      if (disposed || epoch !== generation) return
      if (node.kind !== 'file') continue
      if (!/\.[cm]?[jt]sx?$/.test(path) && !/^(?:tsconfig|jsconfig)\.json$/.test(path)) continue
      const text = sources[path]
      if (text === undefined) continue
      const model = findMonacoModel(monaco.editor.getModels(), buildMonacoModelPath(prefix, path))
      const version = model?.getVersionId()
      const diagnostics = await client.query('diagnostics', path)
      if (
        disposed ||
        epoch !== generation ||
        (model && (model.isDisposed() || model.getVersionId() !== version))
      )
        continue
      if (model)
        monaco.editor.setModelMarkers(
          model,
          'sz-pro-typescript',
          diagnostics
            .filter((item) => item.path === path)
            .map((item) => ({
              ...range(model, item.start, item.length),
              code: String(item.code),
              message: item.message,
              source: 'TypeScript',
              severity:
                item.severity === 'error'
                  ? monaco.MarkerSeverity.Error
                  : item.severity === 'warning'
                    ? monaco.MarkerSeverity.Warning
                    : monaco.MarkerSeverity.Info,
            })),
        )
      for (const item of diagnostics) {
        const source = sources[item.path]
        const key = `${item.path}:${item.start}:${item.code}:${item.message}`
        if (
          source === undefined ||
          input().tree[item.path]?.kind !== 'file' ||
          seen.has(key) ||
          gathered.length >= 100
        )
          continue
        seen.add(key)
        const lines = source.slice(0, item.start).split(/\r\n|\r|\n/)
        let sourceHash = sourceHashes.get(item.path)
        if (sourceHash === undefined) {
          sourceHash = studioTutorSourceHash(source)
          sourceHashes.set(item.path, sourceHash)
        }
        gathered.push({
          path: item.path,
          code: item.code,
          line: lines.length,
          column: (lines.at(-1)?.length ?? 0) + 1,
          sourceHash,
          severity: item.severity,
          message: item.message,
        })
      }
    }
    if (!disposed && epoch === generation) {
      report(null)
      navigation.diagnostics?.(gathered)
    }
  }
  const update = () => {
    if (disposed) return
    const epoch = ++generation
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void diagnose(epoch).catch((error: unknown) => {
        if (!disposed) report(error instanceof Error ? error.message : String(error))
      })
    }, 200)
  }
  const observe = (model: Model) => {
    if (!isModelInPathPrefix(model, prefix) || listeners.has(model)) return
    listeners.set(model, model.onDidChangeContent(update))
    update()
  }
  const created = monaco.editor.onDidCreateModel(observe)
  const removed = monaco.editor.onWillDisposeModel((model) => {
    listeners.get(model)?.dispose()
    listeners.delete(model)
    if (isModelInPathPrefix(model, prefix)) releaseMonacoModelUri(model)
  })
  for (const model of monaco.editor.getModels()) observe(model)
  const session = {
    update,
    async requestForTree<K extends keyof ProLanguageQueries>(
      tree: ProjectTree,
      method: K,
      ...args: ProLanguageQueries[K]['args']
    ): Promise<ProLanguageQueries[K]['result']> {
      await prepare(tree)
      return client.query(method, ...args)
    },
    synchronizeDocument(tree: ProjectTree, pathMap: Readonly<Record<string, string>>) {
      const view = navigation.editor.saveViewState()
      for (const model of monaco.editor.getModels()) {
        if (!isModelInPathPrefix(model, prefix)) continue
        const oldPath = pathOf(model)
        const path = pathMap[oldPath] ?? oldPath
        if (path !== oldPath) {
          setMonacoModelPath(model, buildMonacoModelPath(prefix, path))
          // A renamed buffer keeps its identity, but its language belongs to the new path.
          monaco.editor.setModelLanguage(model, proLanguage(inferLanguage(path)))
          monaco.editor.setModelMarkers(model, 'sz-pro-typescript', [])
        }
        const node = tree[path]
        if (node?.kind === 'file' && model.getValue() !== node.content)
          // A document operation has its own guarded recovery. Reset only edited buffers'
          // text undo so Ctrl+Z cannot undo one import out of a multi-file operation.
          synchronizeMonacoModel(model, () => model.setValue(node.content))
      }
      const active = navigation.editor.getModel()
      if (view && active && tree[pathOf(active)]?.kind === 'file')
        navigation.editor.restoreViewState(view)
      update()
    },
    async request<K extends keyof ProLanguageQueries>(
      method: K,
      ...args: ProLanguageQueries[K]['args']
    ): Promise<ProLanguageQueries[K]['result']> {
      await prepare()
      return client.query(method, ...args)
    },
    async query<K extends keyof ProLanguageQueries>(
      method: K,
      model: Model,
      offset?: number,
    ): Promise<ProLanguageQueries[K]['result']> {
      await prepare()
      const path = pathOf(model)
      const args = (offset === undefined ? [path] : [path, offset]) as ProLanguageQueries[K]['args']
      return client.query(method, ...args)
    },
    definitionModel(path: string): Model | null {
      // Dependency sources are not editable project documents. Hover still
      // exposes their types; navigation opens only files owned by this project.
      if (input().tree[path]?.kind !== 'file') return null
      const content = sent[path]
      if (content === undefined) return null
      const uri = monaco.Uri.parse(reserveMonacoModelUri(monaco.editor, prefix, path))
      return (
        findMonacoModel(monaco.editor.getModels(), buildMonacoModelPath(prefix, path)) ??
        monaco.editor.createModel(
          content,
          /\.[cm]?tsx?$/.test(path) ? PRO_TS_LANGUAGE : PRO_JS_LANGUAGE,
          uri,
        )
      )
    },
    dispose() {
      disposed = true
      if (timer) clearTimeout(timer)
      created.dispose()
      removed.dispose()
      opener.dispose()
      modelChanged.dispose()
      for (const [model, listener] of listeners) {
        listener.dispose()
        if (!model.isDisposed()) monaco.editor.setModelMarkers(model, 'sz-pro-typescript', [])
      }
      listeners.clear()
      sessions.delete(prefix)
      client.dispose()
    },
  }
  sessions.set(prefix, session)
  update()
  return session
}

export type ProLanguageSession = ReturnType<typeof attachProLanguageService>
