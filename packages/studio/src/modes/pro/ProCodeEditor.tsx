import { lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { MonacoTabsProps } from '../../monaco/MonacoTabs'
import { getMonacoModelPath } from '../../monaco/modelPaths'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioTutor } from '../../studio/tutor'
import { resolveStudioTutorReference } from '../../studio/tutorProContext'
import { studioTutorSourceHash } from '../../studio/tutorSafety'
import { readDependencyDeclarations } from './dependencyDeclarations'
import { useProWebContainer } from './ProWebContainerProvider'

// Register the Pro context menu before constructing an editor, within its lazy chunk.
const MonacoTabs = lazy(() =>
  import('./ProMonacoTabs').then((module) => ({ default: module.MonacoTabs })),
)

export function ProCodeEditor(props: MonacoTabsProps) {
  const { state, webcontainerRef, dependencyRevision, syncError } = useProWebContainer()
  const store = useProjectStoreApi()
  const project = useProjectStore((store) => store.project)
  const { config, proEditor, proCapture, proValidateReference, requestProHelp } = useStudioTutor()
  const editorRef = useRef<Parameters<NonNullable<MonacoTabsProps['onEditorReady']>>[0]>(null)
  const [readyEditor, setReadyEditor] =
    useState<Parameters<NonNullable<MonacoTabsProps['onEditorReady']>>[0]>(null)
  const [navigationNotice, setNavigationNotice] = useState<string | null>(null)
  const [dependencies, setDependencies] = useState<Record<string, string>>({})
  const [availableDependencyFiles, setAvailableDependencyFiles] = useState<string[]>([])
  const languageInput = useMemo(
    () => ({ tree: project?.tree ?? {}, dependencies, availableDependencyFiles }),
    [project?.tree, dependencies, availableDependencyFiles],
  )
  const [indexing, setIndexing] = useState(false)
  const [issue, setIssue] = useState<string | null>(null)
  useEffect(() => {
    if (!project?.id) return
    const installedPackages: Array<{ name: string; version: string }> = []
    for (const [path, content] of Object.entries(dependencies)) {
      if (!/^node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/.test(path)) continue
      try {
        const manifest: unknown = JSON.parse(content)
        if (
          manifest &&
          typeof manifest === 'object' &&
          'name' in manifest &&
          'version' in manifest &&
          typeof manifest.name === 'string' &&
          typeof manifest.version === 'string'
        )
          installedPackages.push({
            name: manifest.name.slice(0, 160),
            version: manifest.version.slice(0, 80),
          })
      } catch {
        /* A partially written npm manifest is not evidence of installation. */
      }
    }
    proEditor.current = {
      ...(proEditor.current?.projectId === project.id ? proEditor.current : {}),
      projectId: project.id,
      synchronization: syncError ? 'conflict' : 'ready',
      installation:
        state !== 'mounted' ? 'unavailable' : indexing ? 'indexing' : issue ? 'error' : 'ready',
      installedPackages,
    }
  }, [project?.id, dependencies, indexing, issue, state, syncError, proEditor])
  useEffect(() => {
    const projectId = project?.id
    const liveModel = () => {
      const model = editorRef.current?.getModel()
      if (!model || model.isDisposed()) return null
      const uri = getMonacoModelPath(model)
      return { model, path: uri.slice(uri.indexOf('/') + 1) }
    }
    proCapture.current = () => {
      if (
        !projectId ||
        store.getState().project?.id !== projectId ||
        proEditor.current?.projectId !== projectId
      )
        return null
      const live = liveModel(),
        range = editorRef.current?.getSelection()
      const context = { ...proEditor.current }
      delete context.selection
      if (live) context.activeFile = live.path
      if (live && range && !range.isEmpty()) {
        context.selection = {
          path: live.path,
          startLine: range.startLineNumber,
          startColumn: range.startColumn,
          endLine: range.endLineNumber,
          endColumn: range.endColumn,
          documentVersion: live.model.getVersionId(),
          sourceHash: studioTutorSourceHash(live.model.getValue()),
        }
      }
      return context
    }
    proValidateReference.current = (reference) => {
      const current = store.getState().project
      if (!projectId || current?.id !== projectId) return null
      const node = current.tree?.[reference.path],
        live = liveModel()
      const content =
        live?.path === reference.path
          ? live.model.getValue()
          : node?.kind === 'file'
            ? node.content
            : undefined
      const resolved = resolveStudioTutorReference(reference, content)
      setNavigationNotice(
        resolved && reference.startLine !== undefined && resolved.startLine === undefined
          ? 'Este trecho não corresponde mais à versão analisada. Abri o arquivo sem marcar linhas; selecione novamente para pedir ajuda.'
          : null,
      )
      return resolved
    }
    return () => {
      proCapture.current = null
      proValidateReference.current = null
    }
  }, [project?.id, store, proEditor, proCapture, proValidateReference])
  useEffect(() => {
    if (!readyEditor || !config || !project?.id) return
    const actions = (['explain', 'investigate', 'change'] as const).map((intent) =>
      readyEditor.addAction({
        id: `studio-zappy-${intent}`,
        label:
          intent === 'change'
            ? 'Pedir mudança nestas linhas com Zappy Pro'
            : intent === 'explain'
              ? 'Explicar seleção com Zappy Pro'
              : 'Investigar seleção com Zappy Pro',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: intent === 'explain' ? 2 : intent === 'investigate' ? 3 : 4,
        run: () => {
          const context = proCapture.current?.()
          if (!context) return
          requestProHelp({ projectId: context.projectId, intent, selection: context.selection })
        },
      }),
    )
    return () => {
      for (const action of actions) action.dispose()
    }
  }, [readyEditor, config, project?.id, proCapture, requestProHelp])
  // biome-ignore lint/correctness/useExhaustiveDependencies: npm completion events invalidate the installed declaration snapshot.
  useEffect(() => {
    const wc = webcontainerRef.current
    if (state !== 'mounted' || !wc) return
    let active = true
    setIndexing(true)
    const timer = setTimeout(() => {
      void readDependencyDeclarations(wc.fs, () => active)
        .then(({ files, availableFiles }) => {
          if (!active) return
          setDependencies(files)
          setAvailableDependencyFiles(availableFiles)
          const compiler = files['node_modules/typescript/package.json']
          const installed: unknown = compiler ? JSON.parse(compiler) : null
          setIssue(
            installed &&
              typeof installed === 'object' &&
              'version' in installed &&
              installed.version !== '5.9.3'
              ? 'O editor usa TypeScript 5.9.3. Alinhe a versão do projeto para obter os mesmos diagnósticos.'
              : null,
          )
        })
        .catch((error: unknown) => {
          if (active) setIssue(error instanceof Error ? error.message : String(error))
        })
        .finally(() => {
          if (active) setIndexing(false)
        })
    }, 500)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [state, webcontainerRef, dependencyRevision, project?.id])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a different project must never inherit the previous dependency index.
  useEffect(() => {
    setDependencies({})
    setAvailableDependencyFiles([])
    setIssue(null)
  }, [project?.id])
  return (
    <div className="flex h-full min-h-0 flex-col">
      {(indexing || issue) && (
        <div role="status" className="shrink-0 px-3 py-1 text-xs">
          {indexing ? 'Reconhecendo bibliotecas instaladas…' : issue}
        </div>
      )}
      {navigationNotice && (
        <p role="status" className="px-3 py-1 text-xs">
          {navigationNotice}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <MonacoTabs
          {...props}
          onEditorReady={(editor) => {
            editorRef.current = editor
            setReadyEditor(editor)
            props.onEditorReady?.(editor)
          }}
          onProDiagnostics={(diagnostics) => {
            props.onProDiagnostics?.(diagnostics)
            if (project?.id && proEditor.current?.projectId === project.id)
              proEditor.current = {
                ...proEditor.current,
                diagnostics: diagnostics.slice(0, 20).map((item) => {
                  const file = store.getState().project?.tree?.[item.path]
                  const model = editorRef.current?.getModel()
                  const modelPath = model ? getMonacoModelPath(model) : ''
                  return {
                    ...item,
                    source: 'typescript' as const,
                    ...(item.sourceHash
                      ? { sourceHash: item.sourceHash }
                      : file?.kind === 'file'
                        ? { sourceHash: studioTutorSourceHash(file.content) }
                        : {}),
                    ...(model && modelPath.slice(modelPath.indexOf('/') + 1) === item.path
                      ? { documentVersion: model.getVersionId() }
                      : {}),
                  }
                }),
              }
          }}
          proProject={languageInput}
        />
      </div>
    </div>
  )
}
