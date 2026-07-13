import type { JSX } from 'react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { type ProjectTree, t } from '#core'
import { FontSizeControls } from '../../components/code/FontSizeControls'
import { MonacoTabs } from '../../components/code/LazyMonacoTabs'
import { ProFileTree } from '../../components/code/ProFileTree'
import { useFormatIssueLogger } from '../../components/code/useFormatIssueLogger'
import { EditorSkeleton } from '../../components/layout/LoadingViews'
import { NarrowPanels } from '../../components/layout/NarrowPanels'
import { useProjectStore } from '../../state/projectStore'
import { CODE_FONT_SIZE_DEFAULT, useSettingsStore } from '../../state/settingsStore'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioLayout } from '../../studio/layoutContext'
import { useStudioTheme } from '../../studio/theme'
import { ProPreview } from './ProPreview'
import { ProWebContainerProvider } from './ProWebContainerProvider'

const EMPTY_TREE: ProjectTree = {}

/** Ordem de preferência para o arquivo aberto por padrão ao carregar o projeto. */
const DEFAULT_OPEN_CANDIDATES = ['src/main.tsx', 'src/main.ts', 'src/App.tsx', 'index.html']

/**
 * Variante do modo Código para projetos PROFISSIONAIS (`kind: 'pro'`): árvore de
 * arquivos real (ProFileTree), edição da `tree` via `setProFileContent`, e
 * preview = dev-server (ProPreview) dentro do `ProWebContainerProvider` (sync
 * único do FS). O `PreviewIframe`/`FileExplorer` clássicos NUNCA renderizam aqui.
 */
export function ProCodeMode(): JSX.Element {
  const { projectId, tree } = useProjectStore(
    useShallow((s) => ({
      projectId: s.project?.id,
      tree: s.project?.tree ?? EMPTY_TREE,
    })),
  )
  const setProFileContent = useProjectStore((s) => s.setProFileContent)
  const studioConfig = useStudioConfig()
  const showPreview = useUIStore((s) => s.showPreview) && studioConfig.preview
  const codeFontSize = useSettingsStore((s) => s.codeFontSize)
  const studioTheme = useStudioTheme()
  const { isNarrow } = useStudioLayout()

  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const onFormatIssue = useFormatIssueLogger()

  // Auto-abre o arquivo padrão UMA VEZ por carga de projeto. Antes o efeito
  // disparava sempre que `openFiles.length === 0`, então fechar a última aba
  // reabria o default no mesmo instante — o aluno não conseguia ficar sem abas.
  const autoOpenedProjectRef = useRef<string | null>(null)
  useEffect(() => {
    if (autoOpenedProjectRef.current === projectId) return
    const fileKeys = Object.entries(tree)
      .filter(([, node]) => node.kind === 'file')
      .map(([path]) => path)
    // Sem arquivos ainda (árvore vazia no 1º render): espera o próximo tick com a
    // árvore carregada antes de marcar este projeto como já auto-aberto.
    if (fileKeys.length === 0) return
    autoOpenedProjectRef.current = projectId ?? null
    // Respeita abas que o usuário já abriu manualmente antes do efeito rodar.
    if (openFiles.length > 0) return
    const initial = DEFAULT_OPEN_CANDIDATES.find((c) => fileKeys.includes(c)) ?? fileKeys[0]
    if (initial) {
      setOpenFiles([initial])
      setActiveFile(initial)
    }
  }, [tree, projectId, openFiles.length])

  // Fecha abas de arquivos que sumiram da árvore (excluídos/renomeados).
  useEffect(() => {
    setOpenFiles((prev) => {
      const next = prev.filter((p) => tree[p]?.kind === 'file')
      return next.length === prev.length ? prev : next
    })
  }, [tree])

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
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
    setActiveFile(path)
  }

  const handleCloseFile = (name: string) => {
    if (activeFile === name) {
      const visible = filesArray.map((f) => f.name)
      const idx = visible.indexOf(name)
      setActiveFile(visible[idx + 1] ?? visible[idx - 1] ?? '')
    }
    setOpenFiles((prev) => prev.filter((p) => p !== name))
  }

  const codeEditor = (
    <Suspense fallback={<EditorSkeleton message="Carregando editor de código…" />}>
      <MonacoTabs
        files={filesArray}
        modelPathPrefix={projectId}
        activeFile={activeFile}
        onActiveFileChange={setActiveFile}
        onChange={(name, value) => setProFileContent(name, value)}
        theme={studioTheme === 'light' ? 'light' : 'vs-dark'}
        fontSize={codeFontSize || CODE_FONT_SIZE_DEFAULT}
        formatLabel={t('editor.format')}
        onFormatIssue={onFormatIssue}
        tabsRightSlot={<FontSizeControls />}
        canCloseFile={() => true}
        onCloseFile={handleCloseFile}
      />
    </Suspense>
  )

  if (isNarrow) {
    return (
      <ProWebContainerProvider>
        <NarrowPanels
          editorPanes={[{ id: 'code', label: t('tab.code'), content: codeEditor }]}
          preview={showPreview ? <ProPreview /> : undefined}
          filesDrawer={(close) => (
            <ProFileTree
              activeFile={activeFile}
              onSelectFile={(path) => {
                handleSelectFile(path)
                close()
              }}
            />
          )}
        />
      </ProWebContainerProvider>
    )
  }

  return (
    <ProWebContainerProvider>
      <PanelGroup direction="horizontal" className="h-full w-full">
        <Panel defaultSize={20} minSize={14} maxSize={30}>
          <ProFileTree activeFile={activeFile} onSelectFile={handleSelectFile} />
        </Panel>
        <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
        <Panel defaultSize={showPreview ? 45 : 80} minSize={28}>
          {codeEditor}
        </Panel>
        {showPreview && (
          <>
            <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
            <Panel defaultSize={35} minSize={20}>
              <ProPreview />
            </Panel>
          </>
        )}
      </PanelGroup>
    </ProWebContainerProvider>
  )
}
