import type { JSX } from 'react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { CANONICAL_FILES, type ExtraFile, FILE_NAMES, type FileName, t } from '#core'
import { FileExplorer } from '../components/code/FileExplorer'
import { FontSizeControls } from '../components/code/FontSizeControls'
import { MonacoTabs } from '../components/code/LazyMonacoTabs'
import { EditorSkeleton } from '../components/layout/LoadingViews'
import { PreviewIframe } from '../components/preview/PreviewIframe'
import { useProjectStore } from '../state/projectStore'
import { CODE_FONT_SIZE_DEFAULT, useSettingsStore } from '../state/settingsStore'
import { useUIStore } from '../state/uiStore'
import { useStudioTheme } from '../studio/theme'

const EMPTY_EXTRA_FILES: ExtraFile[] = []

export function CodeMode(): JSX.Element {
  const { hasProject, projectId, files, extras } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      projectId: s.project?.id,
      files: s.project?.files,
      extras: s.project?.extraFiles ?? EMPTY_EXTRA_FILES,
    })),
  )
  const setFile = useProjectStore((s) => s.setFile)
  const setExtraFile = useProjectStore((s) => s.setExtraFile)
  const showPreview = useUIStore((s) => s.showPreview)
  const codeFontSize = useSettingsStore((s) => s.codeFontSize)
  const studioTheme = useStudioTheme()
  const [activeFile, setActiveFile] = useState<string>('index.html')
  // Nomes dos arquivos EXTRAS abertos como aba. Os canônicos estão sempre
  // abertos. Fechar uma aba só remove o extra daqui (UI) — o arquivo continua
  // no projeto e reabre ao ser clicado no FileExplorer.
  const [openExtras, setOpenExtras] = useState<string[]>([])

  // Remove de `openExtras` qualquer extra que deixou de existir (excluído no
  // FileExplorer ou troca de projeto), evitando abas órfãs.
  useEffect(() => {
    setOpenExtras((prev) => {
      const existing = new Set((extras ?? []).map((f) => f.name))
      const next = prev.filter((name) => existing.has(name))
      return next.length === prev.length ? prev : next
    })
  }, [extras])

  // Memoizado: só recalcula quando os arquivos/abas mudam, não a cada re-render
  // (ex.: alternar preview ou fonte) — evita remontar abas do Monaco. Os extras
  // visíveis seguem a ordem do projeto, filtrados pelos que estão abertos.
  const filesArray = useMemo(() => {
    if (!files) return []
    const canonical = FILE_NAMES.map((name) => ({ name, value: files[name] }))
    const openSet = new Set(openExtras)
    const extraArr = (extras ?? [])
      .filter((f) => openSet.has(f.name))
      .map((f) => ({ name: f.name, value: f.content }))
    return [...canonical, ...extraArr]
  }, [files, extras, openExtras])

  if (!hasProject) return <div />

  const handleChange = (name: string, value: string) => {
    if (CANONICAL_FILES.has(name)) {
      setFile(name as FileName, value)
    } else {
      setExtraFile(name, value)
    }
  }

  // Selecionar um arquivo no FileExplorer: abre a aba (se for extra ainda
  // fechado) e a torna ativa.
  const handleSelectFile = (name: string) => {
    if (!CANONICAL_FILES.has(name)) {
      setOpenExtras((prev) => (prev.includes(name) ? prev : [...prev, name]))
    }
    setActiveFile(name)
  }

  // Fechar a aba de um extra: remove de openExtras e, se era a aba ativa, troca
  // para a aba vizinha (ou index.html como último recurso).
  const handleCloseFile = (name: string) => {
    if (CANONICAL_FILES.has(name)) return
    if (activeFile === name) {
      const visible = filesArray.map((f) => f.name)
      const idx = visible.indexOf(name)
      const neighbor = visible[idx + 1] ?? visible[idx - 1] ?? 'index.html'
      setActiveFile(neighbor)
    }
    setOpenExtras((prev) => prev.filter((n) => n !== name))
  }

  return (
    <PanelGroup direction="horizontal" className="h-full w-full">
      <Panel defaultSize={18} minSize={14} maxSize={26}>
        <FileExplorer activeFile={activeFile} onSelectFile={handleSelectFile} />
      </Panel>
      <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
      <Panel defaultSize={showPreview ? 47 : 82} minSize={30}>
        <Suspense fallback={<EditorSkeleton message="Carregando editor de código…" />}>
          <MonacoTabs
            files={filesArray}
            modelPathPrefix={projectId}
            activeFile={activeFile}
            onActiveFileChange={setActiveFile}
            onChange={handleChange}
            theme={studioTheme === 'light' ? 'light' : 'vs-dark'}
            fontSize={codeFontSize || CODE_FONT_SIZE_DEFAULT}
            formatLabel={t('editor.format')}
            tabsRightSlot={<FontSizeControls />}
            canCloseFile={(name) => !CANONICAL_FILES.has(name)}
            onCloseFile={handleCloseFile}
          />
        </Suspense>
      </Panel>
      {showPreview && (
        <>
          <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
          <Panel defaultSize={35} minSize={20}>
            <PreviewIframe />
          </Panel>
        </>
      )}
    </PanelGroup>
  )
}
