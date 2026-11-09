import { lazy, type ReactNode, Suspense, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import {
  PythonBlocklyEditor,
  type PythonBlocklyEditorProps,
} from '../../components/blocks/PythonBlocklyEditor'
import type { PythonSourceCursorPosition } from '../../components/code/PythonSourceEditor'
import { ClassicDock } from '../../components/layout/ClassicDock'
import { EditorSkeleton } from '../../components/layout/LoadingViews'
import { NarrowPanels } from '../../components/layout/NarrowPanels'
import { ClassicStage, useClassicStage } from '../../components/preview/ClassicStage'
import { PythonEditorPreview } from '../../components/preview/PythonEditorPreview'
import { pythonStageSubject } from '../../components/preview/stageSubject'
import { isPythonProject } from '../../core/editableProject'
import type { MonacoHighlight } from '../../monaco/MonacoTabs'
import { usePythonStartingExtension } from '../../python/extensions/useStartingExtension'
import {
  pythonModelPositionToOffset,
  pythonOffsetToPosition,
} from '../../python/language/sourceEdits'
import type { PythonSourceRange } from '../../python/language/types'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useEditorHistory, usePendingEditorEdits } from '../../state/studioStores'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioLayout } from '../../studio/layoutContext'

const SourceEditor = lazy(() =>
  import('../../components/code/PythonSourceEditor').then((module) => ({
    default: module.PythonSourceEditor,
  })),
)

export interface PythonClassicWorkspaceProps {
  mode: 'blocks' | 'bridge'
  /** Present only for the current qualified environment. Never retain an old grant here. */
  blockly?: Pick<PythonBlocklyEditorProps, 'codecs' | 'palette' | 'officialModules'>
  unavailable?: ReactNode
  /** Preserve file recovery in blocks mode without mounting a hidden source editor normally. */
  sourceFallback?: boolean
}

/** Shared composition; the host supplies its qualified catalog and pedagogical selection. */
export function PythonClassicWorkspace(props: PythonClassicWorkspaceProps) {
  const projectId = useProjectStore((state) => state.project?.id)
  return <PythonClassicProjectWorkspace key={projectId} {...props} />
}

function PythonClassicProjectWorkspace({
  mode,
  blockly,
  unavailable,
  sourceFallback = false,
}: PythonClassicWorkspaceProps) {
  const project = useProjectStore((state) => state.project)
  const store = useProjectStoreApi()
  const pending = usePendingEditorEdits()
  const history = useEditorHistory()
  const config = useStudioConfig()
  const { isNarrow } = useStudioLayout()
  const showPreview = useUIStore((state) => state.showPreview) && config.preview
  const [selected, setSelected] = useState<string>()
  const [highlight, setHighlight] = useState<{ source: string; value: MonacoHighlight } | null>(
    null,
  )
  const [cursor, setCursor] = useState<{
    path: string
    source: string
    offset: number
    nonce: number
  }>()
  const nonce = useRef(0)
  const stage = useClassicStage(
    mode === 'bridge'
      ? { normal: [35, 35, 30], large: [25, 25, 50] }
      : { normal: [65, 35], large: [50, 50] },
    showPreview,
  )
  // O ponto de partida escolhido no "Criar um jogo novo" (Turtle, Pygame Zero) entra aqui.
  usePythonStartingExtension()
  if (!project || !isPythonProject(project) || project.kind !== 'classic') return null
  const path =
    selected &&
    project.files[selected] !== undefined &&
    // Com blocos, só .py (a Ponte também só tem abas .py); o código de recuperação abre tudo.
    ((!blockly && (mode === 'bridge' || sourceFallback)) || selected.endsWith('.py'))
      ? selected
      : project.python.entrypoint
  const changeFile = (file: string) => {
    pending?.flush()
    setSelected(file)
    setHighlight(null)
    setCursor(undefined)
  }
  const selectRange = (range: PythonSourceRange) => {
    const current = store.getState().project
    if (
      !current ||
      !isPythonProject(current) ||
      current.kind !== 'classic' ||
      current.id !== project.id
    )
      return
    const source = current.files[path]
    if (source === undefined) return
    const start = pythonOffsetToPosition(source, range.start)
    const end = pythonOffsetToPosition(source, range.end)
    setHighlight({
      source,
      value: {
        file: path,
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
        nonce: ++nonce.current,
      },
    })
  }
  const selectSource = (position: PythonSourceCursorPosition) => {
    if (!position.explicit || !position.file.endsWith('.py')) return
    const current = store.getState().project
    if (
      !current ||
      !isPythonProject(current) ||
      current.kind !== 'classic' ||
      current.id !== project.id
    )
      return
    const source = current.files[position.file]
    if (source === undefined) return
    const offset = pythonModelPositionToOffset(
      source,
      position.source,
      position.line,
      position.column,
    )
    if (offset === undefined) return
    setCursor({
      path: position.file,
      source,
      offset,
      nonce: ++nonce.current,
    })
  }
  // Os .py do projeto: o cabeçalho dos blocos troca de arquivo por eles (a linha "Arquivo" de
  // antes saiu, redesenho de 11/2026).
  const pythonFiles = Object.keys(project.files).filter((file) => file.endsWith('.py'))
  const source = (
    <Suspense fallback={<EditorSkeleton message="Carregando o código Python…" />}>
      <SourceEditor
        activeFile={path}
        onActiveFileChange={changeFile}
        // Ponte com blocos: abas só com os .py (README e NOTICE não têm blocos, redesenho de
        // 11/2026). Sem blocos (o código de recuperação), todos os arquivos continuam abríveis.
        openFiles={blockly ? pythonFiles : undefined}
        highlight={
          highlight && project.files[highlight.value.file] === highlight.source
            ? highlight.value
            : null
        }
        onCursorChange={selectSource}
      />
    </Suspense>
  )
  const visual = !blockly ? (
    <div className="flex h-full min-h-0 flex-col">
      {unavailable}
      {mode === 'blocks' && sourceFallback && <div className="min-h-0 flex-1">{source}</div>}
    </div>
  ) : path.endsWith('.py') ? (
    <PythonBlocklyEditor
      {...blockly}
      path={path}
      files={pythonFiles}
      onChangeFile={changeFile}
      onSelectRange={selectRange}
      sourceCursor={cursor?.path === path ? cursor : undefined}
    />
  ) : (
    <p className="p-4 text-sm text-sz-fg-soft">
      Este arquivo é editado no modo fonte. Selecione um arquivo .py para ver seus blocos.
    </p>
  )
  const preview = (
    <ClassicStage
      subject={pythonStageSubject(project)}
      phone={stage.phone}
      cards="error"
      onToggleLarge={isNarrow ? undefined : stage.toggleLarge}
      onShowBlock={stage.showBlock}
      onOpenProblems={stage.openProblems}
    >
      <PythonEditorPreview />
    </ClassicStage>
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        {isNarrow ? (
          <NarrowPanels
            editorPanes={[
              {
                id: 'blocks',
                label: 'Blocos',
                content: visual,
                onSelect: () => history?.markActive('blocks'),
              },
              ...(mode === 'bridge'
                ? [
                    {
                      id: 'code',
                      label: 'Código Python',
                      content: source,
                      onSelect: () => history?.markActive('code'),
                    },
                  ]
                : []),
            ]}
            preview={config.preview ? preview : undefined}
            previewRequest={stage.previewRequest}
            dock={<ClassicDock variant="tab" onRevealBlock={stage.revealBlocks} />}
            editorRequest={stage.editorRequest}
            dockRequest={stage.dockRequest}
          />
        ) : (
          <PanelGroup ref={stage.group} direction="horizontal">
            <Panel
              id="python-blocks"
              order={1}
              defaultSize={mode === 'bridge' ? (showPreview ? 35 : 50) : showPreview ? 65 : 100}
              minSize={20}
            >
              {visual}
            </Panel>
            {mode === 'bridge' && (
              <>
                <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
                <Panel
                  id="python-source"
                  order={2}
                  defaultSize={showPreview ? 35 : 50}
                  minSize={20}
                >
                  {source}
                </Panel>
              </>
            )}
            {showPreview && (
              <>
                <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
                <Panel
                  id="python-preview"
                  order={3}
                  defaultSize={mode === 'bridge' ? 30 : 35}
                  minSize={20}
                >
                  {preview}
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>
    </div>
  )
}
