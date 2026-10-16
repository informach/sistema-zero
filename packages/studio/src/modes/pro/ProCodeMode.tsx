import type { JSX } from 'react'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ProjectTree } from '#core'
import { FontSizeControls } from '../../components/code/FontSizeControls'
import { useCodeHistory } from '../../components/code/useCodeHistory'
import { useFormatIssueLogger } from '../../components/code/useFormatIssueLogger'
import { EditorSkeleton } from '../../components/layout/LoadingViews'
import { useProTutorDock } from '../../components/layout/proTutorDock'
import { proFileDescriptions } from '../../core/proLearningGuides'
import type { MonacoHighlight } from '../../monaco/MonacoTabs'
import { getMonacoModelPath } from '../../monaco/modelPaths'
import type { ProEditorDiagnostic } from '../../monaco/pro/session'
import { useProjectStore } from '../../state/projectStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'
import { useProCandidatePreview } from '../../studio/pro-candidate-preview'
import { useStudioTheme } from '../../studio/theme'
import { useStudioTutor } from '../../studio/tutor'
import { ProCodeEditor } from './ProCodeEditor'
import { ProPreview } from './ProPreview'
import { ProWebContainerProvider } from './ProWebContainerProvider'
import {
  closeWorkspaceFile,
  openWorkspaceFile,
  pinWorkspaceFile,
  reconcileWorkspace,
  remapWorkspace,
} from './workspace/model'
import { ProBottomPanel } from './workspace/ProBottomPanel'
import { ProCodeTools } from './workspace/ProCodeTools'
import { ProNavigator } from './workspace/ProNavigator'
import { ProOperationReview } from './workspace/ProOperationReview'
import { ProWorkspaceLayout } from './workspace/ProWorkspaceLayout'
import { useProOperations } from './workspace/useProOperations'
import { useProWorkspace } from './workspace/useProWorkspace'

const EMPTY_TREE: ProjectTree = {}

/**
 * Variante do modo Código para projetos PROFISSIONAIS (`kind: 'pro'`): árvore de
 * arquivos real (ProFileTree), edição da `tree` via `setProFileContent`, e
 * preview = dev-server (ProPreview) dentro do `ProWebContainerProvider` (sync
 * único do FS). O `PreviewIframe`/`FileExplorer` clássicos NUNCA renderizam aqui.
 */
export function ProCodeMode(): JSX.Element {
  const t = useT()
  const { projectId, tree, templateId } = useProjectStore(
    useShallow((s) => ({
      projectId: s.project?.id,
      tree: s.project?.tree ?? EMPTY_TREE,
      templateId: s.project?.proMeta?.templateId,
    })),
  )
  const setProFileContent = useProjectStore((s) => s.setProFileContent)
  const studioConfig = useStudioConfig()
  const { focusNonce } = useProCandidatePreview()
  // No ESTREITO (abas) o olhinho da Topbar não é renderizado, então `showPreview`
  // ali é só uma preferência velha de desktop. Se ela apagasse a aba, quem
  // desligou o preview no computador abriria no celular sem preview E sem botão
  // para trazer de volta. A aba existe sempre que o host oferece preview.
  const previewAvailable = studioConfig.preview
  const codeFontSize = useSettingsStore((s) => (s.codeFontSizeChosen ? s.codeFontSize : 15))
  const studioTheme = useStudioTheme()
  const tutorDock = useProTutorDock()
  const [diagnostics, setDiagnostics] = useState<ProEditorDiagnostic[] | null>(null)

  const workspace = useProWorkspace(projectId, tree)
  const { state: workspaceState, change: changeWorkspace } = workspace
  const { openFiles, activeFile } = workspaceState
  const [codeRequest, setCodeRequest] = useState(0)
  const editorRef = useRef<Parameters<ReturnType<typeof useCodeHistory>>[0]>(null)
  const formatRef = useRef<(() => void) | null>(null)
  const [locations, setLocations] = useState<Array<{ path: string; line: number; column: number }>>(
    [],
  )
  const remember = useCallback(() => {
    const model = editorRef.current?.getModel(),
      position = editorRef.current?.getPosition()
    if (!model || !position) return
    const full = getMonacoModelPath(model)
    const location = {
      path: full.slice(full.indexOf('/') + 1),
      line: position.lineNumber,
      column: position.column,
    }
    setLocations((previous) => {
      const last = previous.at(-1)
      return last?.path === location.path &&
        last.line === location.line &&
        last.column === location.column
        ? previous
        : [...previous.slice(-39), location]
    })
  }, [])
  const operations = useProOperations(projectId, (next, pathMap) => {
    changeWorkspace((previous) => {
      const mapped = reconcileWorkspace(remapWorkspace(previous, pathMap), next)
      const temporary = previous.temporaryFile
      const oldNode = temporary ? tree[temporary] : undefined
      const nextNode = mapped.temporaryFile ? next[mapped.temporaryFile] : undefined
      return mapped.temporaryFile &&
        (pathMap[temporary ?? ''] ||
          (oldNode?.kind === 'file' &&
            nextNode?.kind === 'file' &&
            oldNode.content !== nextNode.content))
        ? pinWorkspaceFile(mapped, mapped.temporaryFile)
        : mapped
    })
    setCodeRequest((previous) => previous + 1)
    setLocations((previous) =>
      previous
        .map((item) => ({ ...item, path: pathMap[item.path] ?? item.path }))
        .filter((item) => next[item.path]?.kind === 'file'),
    )
  })
  const [searchRequest, setSearchRequest] = useState(0)
  const [revealRequest, setRevealRequest] = useState(0)
  const descriptions = useMemo(() => proFileDescriptions(templateId, tree), [templateId, tree])
  const {
    config: tutorConfig,
    proEditor,
    proNavigate,
    proValidateReference,
    proCapture,
    requestProHelp,
  } = useStudioTutor()
  const askFromCode = (intent: 'explain' | 'investigate' | 'change') => {
    const context = proCapture.current?.()
    if (context)
      requestProHelp({ projectId: context.projectId, intent, selection: context.selection })
  }
  const [tutorHighlight, setTutorHighlight] = useState<MonacoHighlight | null>(null)
  useEffect(() => {
    proNavigate.current = (requested) => {
      const reference = proValidateReference.current?.(requested)
      if (!reference) return
      if (tree[reference.path]?.kind !== 'file') return
      setCodeRequest((previous) => previous + 1)
      remember()
      changeWorkspace((previous) => openWorkspaceFile(previous, reference.path, true))
      const { startLine, endLine } = reference
      setTutorHighlight((previous) =>
        startLine !== undefined && endLine !== undefined
          ? {
              file: reference.path,
              startLine,
              endLine,
              nonce: (previous?.nonce ?? 0) + 1,
            }
          : null,
      )
    }
    return () => {
      proNavigate.current = null
    }
  }, [tree, proNavigate, proValidateReference, changeWorkspace, remember])
  useEffect(() => {
    if (!projectId) return
    proEditor.current = {
      ...(proEditor.current?.projectId === projectId ? proEditor.current : {}),
      projectId,
      activeFile,
    }
  }, [projectId, activeFile, proEditor])
  useEffect(
    () => () => {
      proEditor.current = null
    },
    [proEditor],
  )
  const onFormatIssue = useFormatIssueLogger()
  // Desfazer/refazer da barra: aqui o alvo é sempre o código.
  const onCodeEditorReady = useCodeHistory()

  const filesArray = useMemo(
    () =>
      openFiles
        .map((path) => {
          const node = tree[path]
          return node?.kind === 'file' ? { name: path, value: node.content } : null
        })
        .filter((f): f is { name: string; value: string } => f !== null),
    [openFiles, tree],
  )

  const handleSelectFile = (path: string) => {
    const node = tree[path]
    if (node?.kind !== 'file') return
    setCodeRequest((previous) => previous + 1)
    if (path !== activeFile) remember()
    setTutorHighlight(null)
    changeWorkspace((previous) => openWorkspaceFile(previous, path))
  }

  const handleCloseFile = (name: string) => {
    changeWorkspace((previous) => closeWorkspaceFile(previous, name))
  }

  const navigator = (close?: () => void) => (
    <ProNavigator
      tree={tree}
      onInsert={(example) => {
        const node = tree[activeFile]
        if (node?.kind === 'file')
          void operations.prepare({
            kind: 'example',
            path: activeFile,
            source: node.content,
            asset: example.asset,
            text: example.code,
            name: example.name,
            label: example.label,
          })
      }}
      onRequestOperation={(intent) => void operations.prepare(intent)}
      operationsBusy={operations.busy}
      activeFile={activeFile}
      descriptions={descriptions}
      searchRequest={searchRequest}
      revealRequest={revealRequest}
      collapsedPaths={workspaceState.collapsed}
      onCollapsedChange={(collapsed) => changeWorkspace((previous) => ({ ...previous, collapsed }))}
      onSelectFile={(path) => {
        handleSelectFile(path)
        close?.()
      }}
      onPinFile={(path) => changeWorkspace((previous) => openWorkspaceFile(previous, path, true))}
      onResult={(result) => {
        remember()
        handleSelectFile(result.path)
        setTutorHighlight((previous) => ({
          file: result.path,
          startLine: result.line,
          endLine: result.line,
          startColumn: result.column,
          nonce: (previous?.nonce ?? 0) + 1,
        }))
        close?.()
      }}
    />
  )

  const codeEditor = (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label="Código do projeto"
      onKeyDownCapture={(event) => {
        // Ctrl+K is a Monaco chord prefix. Keep it intact; this action has its own scoped shortcut.
        if (
          (event.ctrlKey || event.metaKey) &&
          event.altKey &&
          !event.shiftKey &&
          event.key.toLowerCase() === 'k' &&
          tutorConfig &&
          editorRef.current?.hasTextFocus()
        ) {
          event.preventDefault()
          event.stopPropagation()
          askFromCode('change')
          return
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          event.key.toLowerCase() === 'p'
        ) {
          event.preventDefault()
          event.stopPropagation()
          setSearchRequest((previous) => previous + 1)
        }
      }}
    >
      <ProOperationReview operations={operations} />
      <ProCodeTools
        help={tutorConfig ? askFromCode : undefined}
        search={() => setSearchRequest((previous) => previous + 1)}
        format={() => formatRef.current?.()}
        path={activeFile}
        tree={tree}
        language={operations.language}
        editor={editorRef}
        busy={operations.busy}
        prepare={(intent) => void operations.prepare(intent)}
        recover={() => operations.setHistoryOpen(true)}
        canGoBack={locations.some((item) => tree[item.path]?.kind === 'file')}
        navigate={(path, line, column) => {
          if (tree[path]?.kind !== 'file') return
          setCodeRequest((previous) => previous + 1)
          remember()
          changeWorkspace((previous) => openWorkspaceFile(previous, path, true))
          setTutorHighlight((previous) => ({
            file: path,
            startLine: line,
            endLine: line,
            startColumn: column,
            nonce: (previous?.nonce ?? 0) + 1,
          }))
        }}
        back={() => {
          const valid = locations.filter((item) => tree[item.path]?.kind === 'file')
          const target = valid.pop()
          setLocations(valid)
          if (!target) return
          setCodeRequest((previous) => previous + 1)
          changeWorkspace((previous) => openWorkspaceFile(previous, target.path, true))
          setTutorHighlight((previous) => ({
            file: target.path,
            startLine: target.line,
            endLine: target.line,
            startColumn: target.column,
            nonce: (previous?.nonce ?? 0) + 1,
          }))
        }}
      />
      {workspace.error && (
        <p role="status" className="px-3 py-2 text-xs text-sz-error">
          {workspace.error}{' '}
          <button type="button" onClick={workspace.dismissError}>
            Fechar
          </button>
        </p>
      )}
      {activeFile && (
        <nav
          aria-label={t('pro.breadcrumb')}
          className="flex shrink-0 flex-wrap items-center gap-1 border-b border-sz-border-soft px-3 py-1 text-xs"
        >
          {activeFile.split('/').map((part, index, parts) => (
            <button
              key={parts.slice(0, index + 1).join('/')}
              type="button"
              className="min-h-8 rounded px-1 hover:bg-sz-panel"
              onClick={() => {
                setRevealRequest((previous) => previous + 1)
                changeWorkspace((previous) => ({
                  ...previous,
                  collapsed: previous.collapsed.filter(
                    (path) => !activeFile.startsWith(`${path}/`),
                  ),
                }))
              }}
            >
              {index ? '/ ' : ''}
              {part}
            </button>
          ))}
          {workspaceState.temporaryFile === activeFile && (
            <button
              type="button"
              className="ml-auto min-h-8 rounded px-2 text-sz-accent"
              onClick={() => changeWorkspace((previous) => pinWorkspaceFile(previous, activeFile))}
            >
              {t('pro.pinTab')}
            </button>
          )}
          {openFiles.length > 1 && (
            <button
              type="button"
              className="min-h-8 rounded px-2"
              onClick={() =>
                changeWorkspace((previous) => ({
                  ...previous,
                  openFiles: [activeFile],
                  temporaryFile: null,
                }))
              }
            >
              {t('pro.closeOtherTabs')}
            </button>
          )}
        </nav>
      )}
      <div className="min-h-0 flex-1">
        <Suspense fallback={<EditorSkeleton message="Carregando editor de código…" />}>
          <ProCodeEditor
            key={projectId}
            files={filesArray}
            modelPathPrefix={projectId}
            activeFile={activeFile}
            highlight={tutorHighlight}
            onActiveFileChange={handleSelectFile}
            onChange={(name, value) => {
              changeWorkspace((previous) => pinWorkspaceFile(previous, name))
              setProFileContent(name, value)
            }}
            theme={studioTheme === 'light' ? 'light' : 'vs-dark'}
            fontSize={codeFontSize}
            formatLabel={t('pro.organizeCode')}
            onFormatIssue={onFormatIssue}
            onFormatReady={(run) => {
              formatRef.current = run
            }}
            tabsRightSlot={<FontSizeControls defaultSize={15} />}
            canCloseFile={() => true}
            onCloseFile={handleCloseFile}
            temporaryFile={workspaceState.temporaryFile}
            onPinFile={(path) => changeWorkspace((previous) => pinWorkspaceFile(previous, path))}
            onEditorReady={(editor) => {
              editorRef.current = editor
              onCodeEditorReady(editor)
            }}
            onProLanguageReady={(session) => {
              operations.language.current = session
              if (!session) setDiagnostics(null)
            }}
            onProDiagnostics={setDiagnostics}
          />
        </Suspense>
      </div>
    </section>
  )

  return (
    <ProWebContainerProvider>
      <ProWorkspaceLayout
        navigator={navigator}
        editor={codeEditor}
        preview={previewAvailable ? <ProPreview /> : null}
        tutor={tutorDock}
        preferences={workspaceState}
        change={changeWorkspace}
        gameRequest={focusNonce}
        searchRequest={searchRequest}
        codeRequest={codeRequest}
        bottom={
          <ProBottomPanel
            tree={tree}
            diagnostics={diagnostics}
            selected={workspaceState.bottom}
            onSelect={(bottom) => changeWorkspace((previous) => ({ ...previous, bottom }))}
            navigate={(path, line, column) => {
              setCodeRequest((previous) => previous + 1)
              remember()
              changeWorkspace((previous) => ({
                ...openWorkspaceFile(previous, path, true),
                layout: 'split',
              }))
              setTutorHighlight((previous) => ({
                file: path,
                startLine: line,
                endLine: line,
                startColumn: column,
                nonce: (previous?.nonce ?? 0) + 1,
              }))
            }}
          />
        }
      />
    </ProWebContainerProvider>
  )
}
