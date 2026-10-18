import {
  isPythonLanguageSourcePath,
  type PythonLanguageMethod,
} from '@sistemazero/core/studio/python-language'
import type { PythonLanguageProvider } from '@sistemazero/core/studio/python-language-results'
import type * as Monaco from 'monaco-editor'
import type { ProjectTree } from '../../core/proProject'
import type { ProWorkspaceLanguage, ProWorkspaceQueries } from '../../modes/pro/workspace/language'
import { inferLanguage } from '../../monaco/languages'
import {
  buildMonacoModelPath,
  findMonacoModel,
  getMonacoModelPath,
  isModelInPathPrefix,
  reserveMonacoModelUri,
  setMonacoModelPath,
  synchronizeMonacoModel,
} from '../../monaco/modelPaths'
import type { ProTextEdit } from '../../monaco/pro/languageService'
import type { ProAnalysisState, ProEditorDiagnostic } from '../../monaco/pro/session'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import { createPythonLanguageClient, PythonLanguageStale } from './client'
import {
  pythonDocumentCoordinates,
  pythonDocumentOffset,
  samePythonEditorText,
} from './editorCoordinates'
import { type PythonEditorAnswer, registerPythonEditorProviders } from './providers'

type Model = Monaco.editor.ITextModel
const MARKER_OWNER = 'sz-python-pyright'
function sameSources(left: ProjectTree, right: ProjectTree) {
  const paths = (tree: ProjectTree) =>
    Object.keys(tree).filter(
      (path) => isPythonLanguageSourcePath(path) && tree[path]?.kind === 'file',
    )
  const before = paths(left),
    after = paths(right)
  return (
    before.length === after.length &&
    before.every((path) => {
      const a = left[path],
        b = right[path]
      return a?.kind === 'file' && b?.kind === 'file' && a.content === b.content
    })
  )
}
function snapshotCoordinates(tree: ProjectTree) {
  const indices = new Map<string, ReturnType<typeof pythonDocumentCoordinates>>()
  return (path: string) => {
    const cached = indices.get(path)
    if (cached) return cached
    const file = tree[path]
    if (file?.kind !== 'file' || !isPythonLanguageSourcePath(path))
      throw new PythonLanguageStale('O arquivo não pertence à fonte analisada.')
    const index = pythonDocumentCoordinates(file.content)
    indices.set(path, index)
    return index
  }
}
/** The editor instance, rather than the project ID alone, owns models and remote analysis. */
export function attachPythonEditorLanguage(input: {
  monaco: typeof Monaco
  prefix: string
  projectId: string
  entrypoint(): string
  provider: PythonLanguageProvider
  editor: Monaco.editor.IStandaloneCodeEditor
  tree(): ProjectTree
  openFile(path: string): void
  diagnostics(items: ProEditorDiagnostic[]): void
  analysis(state: ProAnalysisState): void
  renameFiles?(tree: ProjectTree, from: string, to: string): Promise<ProTextEdit[]>
  referencesToFile?(tree: ProjectTree, path: string): Promise<string[]>
  validateRename?(tree: ProjectTree, name: string, edits: ProTextEdit[]): Promise<void>
}) {
  const { monaco, prefix, editor } = input
  const client = createPythonLanguageClient(input.provider, input.projectId, input.entrypoint)
  let disposed = false,
    generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let activeDiagnostics: AbortController | undefined
  const listeners = new Map<Model, Monaco.IDisposable>()
  const pathOf = (model: Model) => getMonacoModelPath(model).slice(prefix.length + 1)
  const owned = (model: Model) =>
    !model.isDisposed() &&
    isModelInPathPrefix(model, prefix) &&
    isPythonLanguageSourcePath(pathOf(model))
  const snapshot = (expected?: ProjectTree) => {
    if (disposed) throw new PythonLanguageStale('O ambiente de análise Python mudou.')
    const tree = expected ?? input.tree()
    const result = { ...tree }
    for (const model of monaco.editor.getModels()) {
      if (!owned(model) || tree[pathOf(model)]?.kind !== 'file') continue
      const path = pathOf(model),
        value = model.getValue()
      const saved = tree[path]
      if (saved?.kind === 'file' && samePythonEditorText(saved.content, value)) continue
      if (expected) throw new PythonLanguageStale('O código mudou. Abra a operação novamente.')
      result[path] = { kind: 'file', content: value }
    }
    return result
  }
  function failed(error: unknown) {
    if (!disposed && !(error instanceof PythonLanguageStale))
      input.analysis({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Não foi possível analisar o código Python.',
      })
  }
  async function diagnose(captured: number, signal: AbortSignal) {
    const tree = snapshot()
    client.update(tree)
    const active = editor.getModel()
    const path =
      active && owned(active) && tree[pathOf(active)]?.kind === 'file'
        ? pathOf(active)
        : Object.keys(tree).find(
            (path) => isPythonLanguageSourcePath(path) && tree[path]?.kind === 'file',
          )
    if (!path) {
      input.diagnostics([])
      input.analysis({ status: 'ready' })
      return
    }
    const items = await client.query('projectDiagnostics', path, { signal })
    if (disposed || captured !== generation || signal.aborted || !sameSources(tree, snapshot()))
      return
    const hashes = new Map<string, string>()
    const coordinates = snapshotCoordinates(tree)
    const diagnostics = items.map((item): ProEditorDiagnostic => {
      const file = tree[item.path]
      if (file?.kind !== 'file')
        throw new Error('A análise apontou um arquivo que não está neste projeto.')
      const position = coordinates(item.path).position(item.start)
      if (!hashes.has(item.path)) hashes.set(item.path, studioTutorSourceHash(file.content))
      return {
        path: item.path,
        code: item.code,
        source: 'pyright',
        line: position.line + 1,
        column: position.character + 1,
        sourceHash: hashes.get(item.path)!,
        severity: item.severity,
        message: item.message,
      }
    })
    for (const model of monaco.editor.getModels()) {
      if (!owned(model)) continue
      monaco.editor.setModelMarkers(
        model,
        MARKER_OWNER,
        items
          .filter((item) => item.path === pathOf(model))
          .map((item) => ({
            ...coordinates(item.path).range(item.start, item.length),
            code: String(item.code),
            message: item.message,
            source: 'Pyright',
            severity:
              item.severity === 'error'
                ? monaco.MarkerSeverity.Error
                : item.severity === 'warning'
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
          })),
      )
    }
    input.diagnostics(diagnostics)
    input.analysis({ status: 'ready' })
  }
  const update = () => {
    if (disposed) return
    const captured = ++generation
    activeDiagnostics?.abort()
    if (timer) clearTimeout(timer)
    // Invalidate obsolete answers immediately; only the expensive request is debounced.
    try {
      client.update(snapshot())
    } catch (error) {
      failed(error)
      return
    }
    input.analysis({ status: 'pending' })
    timer = setTimeout(() => {
      timer = undefined
      const controller = new AbortController()
      activeDiagnostics = controller
      void diagnose(captured, controller.signal)
        .catch((error) => {
          if (captured === generation && !controller.signal.aborted) failed(error)
        })
        .finally(() => {
          if (activeDiagnostics === controller) activeDiagnostics = undefined
        })
    }, 500)
  }
  async function query<K extends PythonLanguageMethod>(
    method: K,
    model: Model,
    offset: number | undefined,
    token: Monaco.CancellationToken,
  ): Promise<PythonEditorAnswer<K> | undefined> {
    if (disposed || !owned(model) || token.isCancellationRequested) return
    const version = model.getVersionId(),
      captured = generation
    const controller = new AbortController()
    const subscription = token.onCancellationRequested(() => controller.abort())
    try {
      const sources = snapshot()
      client.update(sources)
      const file = sources[pathOf(model)]
      if (file?.kind !== 'file') return
      const documentOffset =
        offset === undefined
          ? undefined
          : pythonDocumentOffset(file.content, model.getValue(), model.getPositionAt(offset))
      if (documentOffset === null)
        throw new PythonLanguageStale('O código mudou durante a análise.')
      const result = await client.query(method, pathOf(model), {
        offset: documentOffset,
        signal: controller.signal,
      })
      if (
        disposed ||
        captured !== generation ||
        model.isDisposed() ||
        model.getVersionId() !== version ||
        token.isCancellationRequested
      )
        return
      if (!sameSources(sources, snapshot()))
        throw new PythonLanguageStale('O código mudou durante a análise.')
      const coordinates = snapshotCoordinates(sources)
      const targets = new Map<string, Model>()
      return {
        result,
        projection: {
          range(target, start, length) {
            return coordinates(pathOf(target)).range(start, length)
          },
          definitionModel(path) {
            if (disposed) return null
            const cached = targets.get(path)
            if (cached) return cached
            const target = definitionModel(sources, path)
            if (target) targets.set(path, target)
            return target
          },
        },
      }
    } catch (error) {
      if (!controller.signal.aborted && captured === generation) failed(error)
      return undefined
    } finally {
      subscription.dispose()
    }
  }
  function definitionModel(tree: ProjectTree, path: string) {
    const file = tree[path]
    if (file?.kind !== 'file' || !isPythonLanguageSourcePath(path)) return null
    return (
      findMonacoModel(monaco.editor.getModels(), buildMonacoModelPath(prefix, path)) ??
      monaco.editor.createModel(
        file.content,
        'python',
        monaco.Uri.parse(reserveMonacoModelUri(monaco.editor, prefix, path)),
      )
    )
  }
  async function workspaceRequest<K extends keyof ProWorkspaceQueries>(
    tree: ProjectTree | undefined,
    method: K,
    ...args: ProWorkspaceQueries[K]['args']
  ): Promise<ProWorkspaceQueries[K]['result']> {
    const current = snapshot(tree),
      captured = generation
    client.update(current)
    const path = args[0]
    let result: ProWorkspaceQueries[keyof ProWorkspaceQueries]['result']
    if (method === 'renameFile') {
      if (!input.renameFiles)
        throw new Error(
          'A atualização dos imports Python ainda não está disponível neste ambiente.',
        )
      result = await input.renameFiles(current, path, args[1] as string)
    } else if (method === 'renameSymbol') {
      if (!input.validateRename)
        throw new Error('A validação da renomeação Python não está disponível neste ambiente.')
      result = await client.query('renameSymbol', path, {
        offset: args[1] as number,
        name: args[2] as string,
      })
      await input.validateRename(current, args[2] as string, result)
    } else if (method === 'references')
      result = await client.query('references', path, { offset: args[1] as number })
    else result = await client.query('symbols', path)
    if (disposed || captured !== generation || !sameSources(current, snapshot()))
      throw new PythonLanguageStale('O código mudou. Abra a operação novamente.')
    return result as ProWorkspaceQueries[K]['result']
  }
  const workspace: ProWorkspaceLanguage = {
    async referencesToFile(tree, path) {
      if (!input.referencesToFile)
        throw new Error('A análise das dependências Python não está disponível.')
      const current = snapshot(tree),
        captured = generation
      const result = await input.referencesToFile(current, path)
      if (disposed || captured !== generation || !sameSources(current, snapshot()))
        throw new PythonLanguageStale('O código mudou. Abra a operação novamente.')
      return result
    },
    documentOffset: pythonDocumentOffset,
    request: (method, ...args) => workspaceRequest(undefined, method, ...args),
    requestForTree: (tree, method, ...args) => workspaceRequest(tree, method, ...args),
    synchronizeDocument(tree, pathMap) {
      const view = editor.saveViewState()
      for (const model of monaco.editor.getModels()) {
        if (!isModelInPathPrefix(model, prefix)) continue
        const old = pathOf(model),
          path = pathMap[old] ?? old
        if (path !== old) {
          setMonacoModelPath(model, buildMonacoModelPath(prefix, path))
          monaco.editor.setModelLanguage(model, inferLanguage(path))
        }
        const file = tree[path]
        monaco.editor.setModelMarkers(model, MARKER_OWNER, [])
        if (file?.kind === 'file' && !samePythonEditorText(file.content, model.getValue()))
          synchronizeMonacoModel(model, () => model.setValue(file.content))
      }
      const active = editor.getModel()
      if (view && active && tree[pathOf(active)]?.kind === 'file') editor.restoreViewState(view)
      client.update(tree)
      update()
    },
  }
  const providers = registerPythonEditorProviders(monaco, prefix, { query })
  const observe = (model: Model) => {
    if (!owned(model) || listeners.has(model)) return
    listeners.set(model, model.onDidChangeContent(update))
    update()
  }
  const created = monaco.editor.onDidCreateModel(observe)
  const removed = monaco.editor.onWillDisposeModel((model) => {
    listeners.get(model)?.dispose()
    listeners.delete(model)
  })
  for (const model of monaco.editor.getModels()) observe(model)
  let destination: { path: string; selection?: Monaco.IRange | Monaco.IPosition } | null = null
  const reveal = () => {
    const model = editor.getModel()
    if (!destination || !model || pathOf(model) !== destination.path) return
    const { selection } = destination
    destination = null
    if (selection) {
      if ('startLineNumber' in selection) {
        editor.setSelection(selection)
        editor.revealRangeInCenterIfOutsideViewport(selection)
      } else {
        editor.setPosition(selection)
        editor.revealPositionInCenterIfOutsideViewport(selection)
      }
    }
    editor.focus()
  }
  const changed = editor.onDidChangeModel(() => {
    reveal()
    update()
  })
  const opener = monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource, selection) {
      if (source !== editor) return false
      const model = monaco.editor.getModel(resource)
      if (!model || !owned(model) || input.tree()[pathOf(model)]?.kind !== 'file') return false
      destination = { path: pathOf(model), selection }
      input.openFile(destination.path)
      reveal()
      return true
    },
  })
  update()
  return {
    workspace,
    update,
    retry() {
      client.retry()
      update()
    },
    dispose() {
      if (disposed) return
      disposed = true
      generation++
      if (timer) clearTimeout(timer)
      activeDiagnostics?.abort()
      client.dispose()
      providers.dispose()
      created.dispose()
      removed.dispose()
      changed.dispose()
      opener.dispose()
      for (const [model, listener] of listeners) {
        listener.dispose()
        if (!model.isDisposed()) monaco.editor.setModelMarkers(model, MARKER_OWNER, [])
      }
      listeners.clear()
    },
  }
}
