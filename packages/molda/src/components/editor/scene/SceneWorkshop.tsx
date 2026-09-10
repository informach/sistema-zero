import { lazy, Suspense, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { triggerDownload } from '../../../export/download'
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
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'
import { Button } from '../../ui/Button'
import { Dialog, isMoldaDialogOpen } from '../../ui/Dialog'
import { isTypingTarget } from '../../ui/interaction'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { WorkspaceInspector } from '../model/WorkspaceInspector'
import { SceneCanvas } from './SceneCanvas'
import { SceneComponentTools } from './SceneComponentTools'
import { SceneCreateMenu } from './SceneCreateMenu'
import { SceneExitControl, type SceneExitMode } from './SceneExitControl'
import { SceneGlbExportPanel } from './SceneGlbExportPanel'
import { SceneHierarchy } from './SceneHierarchy'
import { SceneNodeProperties } from './SceneNodeProperties'
import { SceneStorageNotice } from './SceneStorageNotice'
import { useSceneWorkshop } from './useSceneWorkshop'

const ScenePaintEditor = lazy(() =>
  import('./ScenePaintEditor').then((module) => ({ default: module.ScenePaintEditor })),
)
const SceneImportPanel = lazy(() =>
  import('./SceneImportPanel').then((module) => ({ default: module.SceneImportPanel })),
)
const SceneAnimationClips = lazy(() =>
  import('./SceneAnimationClips').then((module) => ({ default: module.SceneAnimationClips })),
)
const SceneAnimationTimeline = lazy(() =>
  import('./SceneAnimationTimeline').then((module) => ({ default: module.SceneAnimationTimeline })),
)
const SceneAnimationInspector = lazy(() =>
  import('./SceneAnimationInspector').then((module) => ({
    default: module.SceneAnimationInspector,
  })),
)

/** Internal workshop shared with the development host; no cloud writer activation here. */
export function SceneWorkshop({
  editor,
  storage,
  onExit,
  viewportFactory,
  theme = 'light',
}: {
  editor: EditorStore<MoldaSceneDocument>
  storage?: SceneStorageObserver
  onExit?: (mode: SceneExitMode) => void
  viewportFactory?: SceneViewportFactory
  theme?: 'light' | 'dark'
}) {
  const workshop = useSceneWorkshop(editor)
  const [mode, setMode] = useState<'model' | 'animation'>('model')
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
  function changeMode(next: typeof mode) {
    if (next === mode) return
    workshop.cancelGesture()
    workshop.paint.close()
    workshop.components.close()
    workshop.flipbook.setImage(null)
    const source = editor.getState().asset
    const clip = next === 'animation' ? source.animations?.[0] : null
    try {
      workshop.animation.setClip(clip ? source : null, clip?.id ?? null)
    } catch (error) {
      workshop.animation.reportError(error)
    }
    setMode(next)
  }
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
          if (workshop.paint.drawing || workshop.paint.busy) workshop.paint.cancel()
          else workshop.paint.close()
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
      <fieldset
        aria-label={copy.animationModes}
        className="flex gap-2 border-b border-mld-border px-3 py-2"
      >
        <Button
          className="text-sm"
          variant={mode === 'model' ? 'primary' : 'ghost'}
          aria-pressed={mode === 'model'}
          onClick={() => changeMode('model')}
        >
          {copy.modelMode}
        </Button>
        <Button
          className="text-sm"
          variant={mode === 'animation' ? 'primary' : 'ghost'}
          aria-pressed={mode === 'animation'}
          onClick={() => changeMode('animation')}
        >
          {copy.animationMode}
        </Button>
      </fieldset>
      {mode === 'animation' ? (
        <Suspense fallback={<p role="status">{copy.appearanceLoading}</p>}>
          <SceneAnimationClips workshop={workshop} />
        </Suspense>
      ) : (
        <div className="flex flex-wrap gap-2 border-b border-mld-border p-2">
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
      {(workshop.message || (!workshop.paint.session && workshop.paint.error)) && (
        <p
          role="alert"
          className="border-b border-mld-border bg-mld-surface px-4 py-2 text-sm text-mld-danger"
        >
          {workshop.message ?? workshop.paint.error}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          <SceneCanvas
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
            paint={workshop.paint.actions}
            flipbook={workshop.flipbook}
            animation={workshop.animation}
            animationPose={workshop.animationPose}
            onEndPaint={() => {
              if (workshop.paint.drawing || workshop.paint.busy) workshop.paint.cancel()
              else workshop.paint.close()
            }}
          />
          {mode === 'animation' && (
            <Suspense fallback={<p role="status">{copy.appearanceLoading}</p>}>
              <SceneAnimationTimeline workshop={workshop} />
            </Suspense>
          )}
        </div>
        <WorkspaceInspector docked={docked} onBeforeClose={workshop.cancelGesture}>
          <h3 className="mld-display text-lg">{copy.hierarchy}</h3>
          <Button
            className="w-full text-sm"
            aria-pressed={workshop.additive}
            onClick={() => workshop.setAdditive(!workshop.additive)}
          >
            {copy.addSelection}
          </Button>
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
            <Suspense fallback={<p role="status">{copy.appearanceLoading}</p>}>
              <SceneAnimationInspector workshop={workshop} />
            </Suspense>
          ) : workshop.paint.session ? (
            <Suspense fallback={<p role="status">{copy.appearanceLoading}</p>}>
              <ScenePaintEditor workshop={workshop} />
            </Suspense>
          ) : workshop.components.selection ? (
            <SceneComponentTools {...workshop.components} />
          ) : (
            <SceneNodeProperties workshop={workshop} />
          )}
        </WorkspaceInspector>
      </div>
      <Dialog
        open={exportOpen}
        title={copy.glbExport.title}
        onClose={() => setExportOpen(false)}
        returnFocusTo={exportTrigger}
      >
        {exportOpen && (
          <SceneGlbExportPanel
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
          <Suspense fallback={<p role="status">{NATIVE_IMPORT_COPY.validating}</p>}>
            <SceneImportPanel
              key={document.id}
              editor={editor}
              viewportFactory={viewportFactory}
              blocked={pendingPose}
              canAdopt={() => !hasPendingPose()}
              onClose={() => setImportOpen(false)}
              onImported={() => {
                workshop.select(null, false)
                workshop.setIsolation(null)
                workshop.animation.setClip(null, null)
                setImportOpen(false)
              }}
            />
          </Suspense>
        )}
      </Dialog>
    </section>
  )
}
