import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { triggerDownload } from '../../../export/download'
import { exportLoadedSceneForStudio, sameSceneStudioContent } from '../../../export/studioLibrary'
import {
  convertSceneNodesToMesh,
  deleteSceneNodes,
  duplicateSceneNodes,
  groupSceneNodes,
  ungroupSceneNodes,
} from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { sceneToJson } from '../../../scene/documentJson'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneStorageObserver } from '../../../state/sceneStorageObserver'
import type { SceneViewportFactory, SceneViewportPort } from '../../../viewport/sceneViewportTypes'
import { Button } from '../../ui/Button'
import { Dialog, isMoldaDialogOpen } from '../../ui/Dialog'
import { isTypingTarget } from '../../ui/interaction'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { DeferredModule } from '../DeferredEditor'
import { WorkspaceInspector } from '../model/WorkspaceInspector'
import { type ResyncToStudio, useStudioResync } from '../useStudioResync'
import { SceneCanvas } from './SceneCanvas'
import { SceneComponentTools } from './SceneComponentTools'
import { SceneCreateMenu } from './SceneCreateMenu'
import { SceneExitControl, type SceneExitMode } from './SceneExitControl'
import { SceneGlbExportPanel } from './SceneGlbExportPanel'
import { SceneHierarchy } from './SceneHierarchy'
import { SceneModeTabs } from './SceneModeTabs'
import { SceneNodeProperties } from './SceneNodeProperties'
import { ScenePaintColumn } from './ScenePaintKid'
import { ScenePaintPalette } from './ScenePaintPalette'
import { SceneStorageNotice } from './SceneStorageNotice'
import { useSceneWorkshop } from './useSceneWorkshop'

const loadPaint = () => import('./ScenePaintEditor').then((module) => module.ScenePaintEditor)
const loadImport = () => import('./SceneImportPanel').then((module) => module.SceneImportPanel)
const loadClips = () => import('./SceneAnimationClips').then((module) => module.SceneAnimationClips)
const loadTimeline = () =>
  import('./SceneAnimationTimeline').then((module) => module.SceneAnimationTimeline)
const loadAnimationInspector = () =>
  import('./SceneAnimationInspector').then((module) => module.SceneAnimationInspector)

/** Internal workshop shared with the development host; no cloud writer activation here. */
export function SceneWorkshop({
  editor,
  storage,
  onExit,
  viewportFactory,
  theme = 'light',
  resyncToStudio,
  canResyncToStudio,
}: {
  editor: EditorStore<MoldaSceneDocument>
  storage?: SceneStorageObserver
  onExit?: (mode: SceneExitMode) => void
  viewportFactory?: SceneViewportFactory
  theme?: 'light' | 'dark'
  /** A VOLTA da ponte: depois de SALVAR, reenvia a criação ao host já no formato do Estúdio. */
  resyncToStudio?: ResyncToStudio
  canResyncToStudio?: (id: string) => Promise<boolean>
}) {
  const workshop = useSceneWorkshop(editor)
  // Resync the exact saved snapshot, retaining its profile and explicit loss review.
  const savedAsset = useStore(editor, (state) => state.savedAsset)
  const setWorkshopMessage = workshop.setMessage
  const studioSync = useStudioResync({
    savedAsset,
    send: resyncToStudio,
    canSend: canResyncToStudio,
    exportAsset: exportLoadedSceneForStudio,
    sameContent: sameSceneStudioContent,
    // Sem isto a falha da ponte é MUDA aqui, enquanto o editor antigo avisa: o jogo ficaria
    // com o modelo velho para sempre e a criança não teria como saber.
    onFailure: (message) => setWorkshopMessage(message ?? COPY.editor.studioSyncFailed),
  })
  const { mode, changeMode } = workshop
  const [exportViewport, setExportViewport] = useState<SceneViewportPort | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const importTrigger = useRef<HTMLButtonElement>(null)
  const exportTrigger = useRef<HTMLButtonElement>(null)
  const exportPoseHintId = useId()
  const importPoseHintId = useId()
  function hasPendingPose() {
    const { pending, dragging } = workshop.animationPose.getSnapshot()
    return pending || dragging
  }
  const pendingPose = useSyncExternalStore(
    workshop.animationPose.subscribe,
    hasPendingPose,
    () => false,
  )
  const faceToggle = useRef<HTMLButtonElement>(null)
  function closeFaces() {
    workshop.components.close()
    faceToggle.current?.focus()
  }
  function escapeFaces() {
    if (workshop.components.check.busy || workshop.components.check.preview)
      workshop.components.check.cancel()
    else if (workshop.components.preview.tool) workshop.components.preview.cancel()
    else if (workshop.components.transform.dragging) workshop.components.transform.cancel()
    else closeFaces()
  }
  const { document, selected, run } = workshop
  const canUndo = useStore(editor, (state) => state.canUndo)
  const canRedo = useStore(editor, (state) => state.canRedo)
  const saveState = useStore(editor, (state) => state.saveState)
  const saveError = useStore(editor, (state) => state.saveError)
  const copy = COPY.scene
  const docked = useMediaQuery('(min-width: 1024px)')
  const canConvert = document.nodes.some(
    (node) =>
      node.kind === 'mesh' &&
      workshop.covered.has(node.id) &&
      workshop.index.geometries.get(node.geometryId)?.kind !== 'mesh',
  )
  function backup() {
    try {
      const snapshot = editor.getState().asset
      if (
        !triggerDownload(
          JSON.stringify(sceneToJson(snapshot)),
          `${snapshot.id}.molda.json`,
          'application/json',
        )
      )
        throw new Error('Download unavailable')
      workshop.setMessage(null)
      return true
    } catch {
      workshop.setMessage(copy.backupError)
      return false
    }
  }
  return (
    <section
      data-molda-theme={theme}
      aria-label={copy.title}
      onKeyDown={(event) => {
        if (event.defaultPrevented || isTypingTarget(event.target) || isMoldaDialogOpen()) return
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault()
          workshop.cancelGesture()
          if (event.shiftKey) editor.getState().redo()
          else editor.getState().undo()
        } else if (mode === 'animation' && event.key === 'Escape') {
          event.preventDefault()
          workshop.animation.pause()
          workshop.animationPose.cancel()
        } else if (mode === 'model' && event.key === 'Delete' && selected.length) {
          event.preventDefault()
          if (workshop.components.selection) workshop.components.remove()
          else run((source) => deleteSceneNodes(source, selected), 'clear')
        } else if (workshop.paint.session && event.key === 'Escape') {
          event.preventDefault()
          workshop.endPaint()
        } else if (workshop.components.selection && event.key === 'Escape') {
          event.preventDefault()
          escapeFaces()
        } else if (
          workshop.components.selection &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'a'
        ) {
          event.preventDefault()
          workshop.components.choose('all')
        }
      }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-mld-bg text-mld-text"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-mld-border px-3 py-2">
        {onExit && (
          <SceneExitControl
            editor={editor}
            onExit={onExit}
            beforeExit={() => studioSync.prepareExit(editor.getState().savedAsset)}
            backup={backup}
            cancelPreview={() => {
              workshop.cancelGesture()
              workshop.paint.close()
              workshop.components.close()
              workshop.flipbook.setImage(null)
            }}
          />
        )}
        <h1 tabIndex={-1} className="mld-display mr-auto truncate text-xl">
          {document.name}
        </h1>
        <SceneModeTabs mode={mode} onChange={changeMode} />
        <span role="status" className="text-sm text-mld-muted">
          {saveState === 'saved'
            ? COPY.editor.saved
            : saveState === 'saving'
              ? COPY.editor.saving
              : (saveError ?? COPY.editor.dirty)}
        </span>
        <Button
          className="text-sm"
          disabled={!canUndo}
          onClick={() => {
            workshop.cancelGesture()
            editor.getState().undo()
          }}
        >
          {COPY.editor.undo}
        </Button>
        <Button
          className="text-sm"
          disabled={!canRedo}
          onClick={() => {
            workshop.cancelGesture()
            editor.getState().redo()
          }}
        >
          {COPY.editor.redo}
        </Button>
        <Button className="text-sm" onClick={() => void editor.getState().flush()}>
          {copy.save}
        </Button>
        <Button className="text-sm" onClick={backup}>
          {copy.backup}
        </Button>
        <Button
          ref={exportTrigger}
          className="text-sm"
          disabled={pendingPose}
          aria-describedby={pendingPose ? exportPoseHintId : undefined}
          onClick={() => {
            if (hasPendingPose()) return
            workshop.cancelGesture()
            workshop.paint.close()
            workshop.components.close()
            if (hasPendingPose()) return
            setExportOpen(true)
          }}
        >
          {copy.glbExport.open}
        </Button>
        {pendingPose && (
          <p id={exportPoseHintId} className="text-xs text-mld-muted">
            {copy.glbExport.pendingPose}
          </p>
        )}
        <Button
          ref={importTrigger}
          className="text-sm"
          disabled={pendingPose}
          aria-describedby={pendingPose ? importPoseHintId : undefined}
          onClick={() => {
            if (hasPendingPose()) return
            workshop.cancelGesture()
            workshop.paint.close()
            workshop.components.close()
            if (hasPendingPose()) return
            setImportOpen(true)
          }}
        >
          {NATIVE_IMPORT_COPY.open}
        </Button>
        {pendingPose && (
          <p id={importPoseHintId} className="text-xs text-mld-muted">
            {NATIVE_IMPORT_COPY.pendingPose}
          </p>
        )}
      </header>
      {storage && <SceneStorageNotice observer={storage} />}
      {mode === 'animation' && (
        <DeferredModule
          load={loadClips}
          props={{ workshop }}
          onBack={() => changeMode('model')}
          backLabel={copy.glbExport.close}
        />
      )}
      {/* O erro da pintura mora na coluna da aba Pintar, junto das ferramentas. */}
      {workshop.message && (
        <p
          role="alert"
          className="border-b border-mld-border bg-mld-surface px-4 py-2 text-sm text-mld-danger"
        >
          {workshop.message}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {mode === 'paint' && (
          <div className="flex shrink-0 flex-wrap gap-1 border-mld-border border-b p-2 lg:w-52 lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:border-r lg:border-b-0">
            <ScenePaintColumn workshop={workshop} />
          </div>
        )}
        {mode === 'model' && (
          <div className="flex shrink-0 flex-wrap gap-1 border-mld-border border-b p-2 lg:w-52 lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:border-r lg:border-b-0">
            <SceneCreateMenu run={run} />
            <Button
              ref={faceToggle}
              className="text-sm"
              disabled={!workshop.components.canEdit}
              aria-pressed={workshop.components.selection !== null}
              onClick={() =>
                workshop.components.selection ? closeFaces() : workshop.components.open()
              }
            >
              {workshop.components.selection
                ? copy.finishFaces
                : selected.length === 1 && workshop.index.skinsByNode.has(selected[0]!)
                  ? copy.editSkinBase
                  : copy.editFaces}
            </Button>
            <Button
              className="text-sm"
              disabled={!canConvert}
              title={copy.convertMeshHint}
              onClick={() => run((source) => convertSceneNodesToMesh(source, selected))}
            >
              {copy.convertMesh}
            </Button>
            <Button
              className="text-sm"
              disabled={!selected.length}
              onClick={() =>
                run(
                  (source) => groupSceneNodes(source, selected, { name: copy.groupName }),
                  'created',
                )
              }
            >
              {copy.group}
            </Button>
            <Button
              className="text-sm"
              disabled={
                !selected.length ||
                selected.some((id) => workshop.index.scene.nodes.get(id)?.kind !== 'group')
              }
              onClick={() => run((source) => ungroupSceneNodes(source, selected), 'clear')}
            >
              {copy.ungroup}
            </Button>
            <Button
              className="text-sm"
              disabled={!selected.length}
              onClick={() => run((source) => duplicateSceneNodes(source, selected), 'created')}
            >
              {copy.duplicate}
            </Button>
            <Button
              className="text-sm"
              disabled={!selected.length || workshop.components.selection !== null}
              onClick={() => run((source) => deleteSceneNodes(source, selected), 'clear')}
            >
              {copy.remove}
            </Button>
          </div>
        )}
        {/*
         * Palco e inspetor num contêiner só: abaixo de lg a gaveta "Peças e cores" (e o gatilho
         * dela, em cima à direita) se posiciona por ele, abaixo da faixa de comandos.
         */}
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <SceneCanvas
              onViewport={setExportViewport}
              mode={mode}
              document={document}
              selection={selected}
              isolation={workshop.isolation}
              onSelect={workshop.select}
              onSelectMany={workshop.selectMany}
              factory={viewportFactory}
              onThumb={(thumb) => workshop.editor.getState().setThumb(thumb)}
              transform={
                mode === 'animation'
                  ? workshop.animationPose.transformActions(selected)
                  : workshop.transform
              }
              transformTools={workshop.components.transformTools}
              componentSelection={workshop.components.selection}
              facePreviewOpen={
                workshop.components.preview.tool !== null ||
                workshop.components.check.busy ||
                !!workshop.components.check.preview
              }
              onSelectComponent={workshop.components.select}
              onSelectComponents={workshop.components.selectMany}
              onEndFaces={escapeFaces}
              onInterrupt={workshop.cancelGesture}
              skinPaint={workshop.skinPaint}
              paintTarget={workshop.paint.session?.target ?? null}
              paintMirror={workshop.paint.mirror}
              paint={workshop.paint.actions}
              flipbook={workshop.flipbook}
              animation={workshop.animation}
              animationPose={workshop.animationPose}
              onEndPaint={workshop.endPaint}
            />
            {mode === 'paint' && <ScenePaintPalette paint={workshop.paint} palette={document} />}
            {mode === 'animation' && (
              <DeferredModule
                load={loadTimeline}
                props={{ workshop }}
                onBack={() => changeMode('model')}
                backLabel={copy.glbExport.close}
              />
            )}
          </div>
          <WorkspaceInspector docked={docked} onBeforeClose={workshop.cancelGesture}>
            <h3 className="mld-display text-lg">{copy.hierarchy}</h3>
            {/* Em Pintar a escolha é de uma peça por vez: somar à seleção não tem sentido lá. */}
            {mode !== 'paint' && (
              <Button
                className="w-full text-sm"
                aria-pressed={workshop.additive}
                onClick={() => workshop.setAdditive(!workshop.additive)}
              >
                {copy.addSelection}
              </Button>
            )}
            <Button
              className="w-full text-sm"
              disabled={!selected.length && workshop.isolation === null}
              aria-pressed={workshop.isolation !== null}
              onClick={() => workshop.setIsolation(workshop.isolation ? null : selected)}
            >
              {COPY.editor.model.isolation.toggle}
            </Button>
            {!document.nodes.length && <p className="text-sm text-mld-muted">{copy.empty}</p>}
            <SceneHierarchy
              index={workshop.index.scene}
              selected={selected}
              onSelect={workshop.select}
            />
            {mode === 'animation' ? (
              <DeferredModule
                load={loadAnimationInspector}
                props={{ workshop }}
                onBack={() => changeMode('model')}
                backLabel={copy.glbExport.close}
              />
            ) : mode === 'paint' ? (
              <DeferredModule
                load={loadPaint}
                props={{ workshop }}
                onBack={() => changeMode('model')}
                backLabel={copy.glbExport.close}
              />
            ) : workshop.components.selection ? (
              <SceneComponentTools {...workshop.components} />
            ) : (
              <SceneNodeProperties workshop={workshop} />
            )}
          </WorkspaceInspector>
        </div>
      </div>
      <Dialog
        open={exportOpen}
        title={copy.glbExport.title}
        onClose={() => setExportOpen(false)}
        returnFocusTo={exportTrigger}
      >
        {exportOpen && (
          <SceneGlbExportPanel
            viewport={exportViewport}
            key={document.id}
            editor={editor}
            onClose={() => setExportOpen(false)}
          />
        )}
      </Dialog>
      <Dialog
        open={importOpen}
        title={NATIVE_IMPORT_COPY.title}
        onClose={() => setImportOpen(false)}
        returnFocusTo={importTrigger}
        wide
      >
        {importOpen && (
          <DeferredModule
            key={document.id}
            load={loadImport}
            onBack={() => setImportOpen(false)}
            backLabel={copy.glbExport.close}
            props={{
              editor,
              viewportFactory,
              blocked: pendingPose,
              canAdopt: () => !hasPendingPose(),
              onClose: () => setImportOpen(false),
              onImported: () => {
                workshop.select(null, false)
                workshop.setIsolation(null)
                workshop.animation.setClip(null, null)
                setImportOpen(false)
              },
            }}
          />
        )}
      </Dialog>
      {studioSync.review && (
        <section aria-label={copy.glbExport.changes} className="border-t border-mld-border p-3">
          <p className="font-semibold">{copy.glbExport.studio.review}</p>
          <ul className="list-disc pl-5 text-sm">
            {studioSync.review.losses.map((loss) => (
              <li key={loss}>{loss}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => void studioSync.approveReview()}>
              {copy.glbExport.studio.accept}
            </Button>
            <Button variant="outline" onClick={studioSync.dismissReview}>
              {copy.glbExport.studio.keep}
            </Button>
          </div>
        </section>
      )}
    </section>
  )
}
