import { clsx } from 'clsx'
import type { ReactNode, RefObject } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { HostCloudStatus, HostMenuButton, useMoldaHostChrome } from '../../hostChrome'
import { RequiresTool } from '../../toolAccess'
import {
  ChevronDown,
  CloudCheck,
  Download,
  FileBox,
  Loader2,
  Redo2,
  Save,
  TriangleAlert,
  Undo2,
  Upload,
} from '../../ui/icons'
import { SceneExitControl, type SceneExitMode } from './SceneExitControl'
import { SceneProjectName } from './SceneProjectName'

export function SceneWorkshopBar({
  editor,
  name,
  onExit,
  beforeExit,
  backup,
  cancelPreview,
  onUndo,
  onRedo,
  pendingPose,
  exportTrigger,
  importTrigger,
  onExport,
  onImport,
  tabs,
  help,
  requestTransition,
  draftCanUndo = false,
  draftCanRedo = false,
}: {
  editor: EditorStore<MoldaSceneDocument>
  name: string
  onExit?: (mode: SceneExitMode) => void
  beforeExit(): Promise<boolean>
  backup(): boolean
  cancelPreview(): void
  onUndo(): void
  onRedo(): void
  pendingPose: boolean
  draftCanUndo?: boolean
  draftCanRedo?: boolean
  exportTrigger: RefObject<HTMLButtonElement | null>
  importTrigger: RefObject<HTMLButtonElement | null>
  exportHintId: string
  importHintId: string
  onExport(): void
  onImport(): void
  tabs?: ReactNode
  help?: ReactNode
  requestTransition?(action: () => void): void
}) {
  const host = useMoldaHostChrome()
  const canUndo = useStore(editor, (state) => state.canUndo)
  const canRedo = useStore(editor, (state) => state.canRedo)
  const saveState = useStore(editor, (state) => state.saveState)
  const saveError = useStore(editor, (state) => state.saveError)
  const saving = saveState === 'saving'
  const saved = saveState === 'saved'
  const status = saved
    ? 'Salvo neste computador'
    : saving
      ? COPY.editor.saving
      : (saveError ?? COPY.editor.dirty)
  // Uma pose ainda não marcada NÃO está no projeto: o selo não pode dizer "Salvo" (fluxos, T29).
  const state = saveError
    ? 'error'
    : pendingPose
      ? 'pose'
      : saved
        ? 'saved'
        : saving
          ? 'saving'
          : 'dirty'
  const short = SCENE_SHELL_COPY.saveShort
  const label =
    state === 'error'
      ? short.error
      : state === 'pose'
        ? short.pose
        : state === 'saved'
          ? short.saved
          : short.saving
  const StatusIcon =
    state === 'error' || state === 'pose'
      ? TriangleAlert
      : saved
        ? CloudCheck
        : saving
          ? Loader2
          : Save
  return (
    <header className="mld-workshop-header mld-bar">
      <div className="mld-workshop-project">
        {host?.menu && <HostMenuButton menu={host.menu} />}
        {onExit && (
          <SceneExitControl
            editor={editor}
            onExit={onExit}
            beforeExit={beforeExit}
            backup={backup}
            cancelPreview={cancelPreview}
            requestTransition={requestTransition}
          />
        )}
        <SceneProjectName name={name} editor={editor} requestTransition={requestTransition} />
        <details className="relative shrink-0">
          <summary
            title={state === 'pose' ? SCENE_SHELL_COPY.posePendingSave : status}
            data-state={state}
            className="mld-save-status"
          >
            <StatusIcon
              aria-hidden="true"
              className={clsx(
                'size-4',
                state === 'saving' && 'animate-spin motion-reduce:animate-none',
              )}
            />
            {/* O erro e a pose por marcar nunca encolhem para só o ícone: são o recado. */}
            <span className={state === 'error' || state === 'pose' ? undefined : 'mld-save-short'}>
              {label}
            </span>
          </summary>
          <div className="mld-drop top-full left-0 mt-2">
            <p className="p-2 text-sm">
              {state === 'pose' ? SCENE_SHELL_COPY.posePendingSave : status}
            </p>
            {host?.status && <HostCloudStatus status={host.status} variant="bar" />}
            <button
              type="button"
              className="mld-menu-action"
              onClick={() => void editor.getState().flush()}
            >
              {COPY.scene.save}
            </button>
          </div>
        </details>
        {/*
         * Fora do menu, sempre montados: a região viva do erro de salvar (num `<details>`
         * fechado ela nunca era anunciada) e o selo da nuvem do host (sem internet, erro).
         */}
        <p role="status" className="sr-only">
          {saveError ?? ''}
        </p>
        {/* Na barra, a nuvem só aparece quando pede atenção; em repouso ela mora no menu. */}
        {(host?.status?.tone === 'warn' || host?.status?.tone === 'danger') && (
          <HostCloudStatus status={host.status} variant="bar" />
        )}
        <button
          type="button"
          className="sz-tool-icon-btn"
          aria-label={COPY.editor.undo}
          title="Desfazer (Ctrl+Z)"
          disabled={pendingPose ? !draftCanUndo : !canUndo}
          onClick={onUndo}
        >
          <Undo2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sz-tool-icon-btn"
          aria-label={COPY.editor.redo}
          title="Refazer (Ctrl+Shift+Z)"
          disabled={pendingPose || draftCanRedo ? !draftCanRedo : !canRedo}
          onClick={onRedo}
        >
          <Redo2 aria-hidden="true" />
        </button>
      </div>
      <div className="mld-workshop-tabs">{tabs}</div>
      <div className="mld-workshop-file-actions">
        {help}
        <RequiresTool family="files.import">
          <button
            ref={importTrigger}
            type="button"
            className="sz-tool-pill sz-tool-pill--outline text-sm"
            aria-label={NATIVE_IMPORT_COPY.open}
            onClick={onImport}
          >
            <Upload aria-hidden="true" />
            <span className="mld-bar-label">Trazer 3D</span>
          </button>
        </RequiresTool>
        <details className="relative">
          <summary className="sz-tool-pill sz-tool-pill--primary list-none text-sm [&::-webkit-details-marker]:hidden">
            <Download aria-hidden="true" />
            Salvar e exportar
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className="mld-drop top-full right-0 mt-2">
            <p className="px-2 py-1 text-xs text-mld-muted">
              Seu projeto é salvo automaticamente neste computador.
            </p>
            <button
              type="button"
              className="mld-menu-action"
              onClick={() => (requestTransition ? requestTransition(backup) : backup())}
            >
              <Download aria-hidden="true" />
              {COPY.scene.backup}
            </button>
            <RequiresTool family="files.export">
              <button
                ref={exportTrigger}
                type="button"
                className="mld-menu-action"
                onClick={onExport}
              >
                <FileBox aria-hidden="true" />
                {COPY.scene.glbExport.open}
              </button>
            </RequiresTool>
          </div>
        </details>
      </div>
    </header>
  )
}
