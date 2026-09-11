import { useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { NATIVE_IMPORT_COPY } from '../../../core/nativeImportCopy'
import { SCENE_SHELL_COPY } from '../../../core/sceneShellCopy'
import { triggerDownload } from '../../../export/download'
import { exportLoadedSceneForStudio, sameSceneStudioContent } from '../../../export/studioLibrary'
import { deleteSceneNodes, duplicateSceneNodes } from '../../../scene/commands'
import { scenePalette } from '../../../scene/composite'
import type { ModelSceneNode, MoldaSceneDocument } from '../../../scene/document'
import { sceneToJson } from '../../../scene/documentJson'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneStorageObserver } from '../../../state/sceneStorageObserver'
import type { SceneViewportFactory, SceneViewportPort } from '../../../viewport/sceneViewportTypes'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Dialog, isMoldaDialogOpen } from '../../ui/Dialog'
import { Focus, ListChecks } from '../../ui/icons'
import { isTypingTarget } from '../../ui/interaction'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { DeferredModule } from '../DeferredEditor'
import { WorkspaceInspector } from '../model/WorkspaceInspector'
import { type ResyncToStudio, useStudioResync } from '../useStudioResync'
import { SceneCanvas, type SceneCanvasSlots } from './SceneCanvas'
import { SceneComponentTools } from './SceneComponentTools'
import type { SceneExitMode } from './SceneExitControl'
import { SceneGlbExportPanel } from './SceneGlbExportPanel'
import { SceneHierarchy, type SceneHierarchyShape } from './SceneHierarchy'
import { SceneModelColumn } from './SceneModelColumn'
import { SceneModeTabs } from './SceneModeTabs'
import { SceneNodeProperties } from './SceneNodeProperties'
import { ScenePaintCloseUp } from './ScenePaintCloseUp'
import { ScenePaintColumn } from './ScenePaintKid'
import { ScenePaintPalette } from './ScenePaintPalette'
import { SceneStorageNotice } from './SceneStorageNotice'
import { SceneSurfaceStrip } from './SceneSurfaceStrip'
import { SceneUpcomingTools } from './SceneUpcomingTools'
import { SceneWorkshopBar } from './SceneWorkshopBar'
import { SCENE_PAINT_ADVANCED_FAMILIES } from './sceneCommandAccess'
import { runScenePaintShortcut } from './scenePaintShortcuts'
import { useSceneWorkshop } from './useSceneWorkshop'

const loadPaint = () => import('./ScenePaintEditor').then((module) => module.ScenePaintEditor)
const loadImport = () => import('./SceneImportPanel').then((module) => module.SceneImportPanel)
const loadClips = () => import('./SceneAnimationClips').then((module) => module.SceneAnimationClips)
const loadTimeline = () =>
  import('./SceneAnimationTimeline').then((module) => module.SceneAnimationTimeline)
const loadAnimationInspector = () =>
  import('./SceneAnimationInspector').then((module) => module.SceneAnimationInspector)

/**
 * Internal workshop shared with the development host; no cloud writer activation here.
 *
 * O desenho é o das telas-modelo (11/09/2026): a barra do projeto (`SceneWorkshopBar`), a barra
 * da aba (as abas e, no Modelar e no Pintar, olhar o modelo; no Animar, os movimentos), a coluna
 * da esquerda (os ladrilhos do Modelar, as ferramentas de pintura, o trilho do Animar), o palco,
 * o painel "Peças e propriedades" e a faixa de baixo de borda a borda (cor e acabamento, as cores
 * da pintura, a linha do tempo). O palco continua DONO do estado das ferramentas e da vista: a
 * casca só marca os LUGARES (`slots`) e ele desenha lá por portal.
 */
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
  const { can } = useMoldaToolAccess()
  const [exportViewport, setExportViewport] = useState<SceneViewportPort | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const importTrigger = useRef<HTMLButtonElement>(null)
  const exportTrigger = useRef<HTMLButtonElement>(null)
  const exportPoseHintId = useId()
  const importPoseHintId = useId()
  // Os LUGARES que a casca prepara para o palco (useState + callback ref: um `useRef` não
  // avisaria o palco quando o lugar monta, e o portal nunca sairia).
  const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null)
  const [areaToolsSlot, setAreaToolsSlot] = useState<HTMLDivElement | null>(null)
  const [togglesSlot, setTogglesSlot] = useState<HTMLDivElement | null>(null)
  const [viewSlot, setViewSlot] = useState<HTMLDivElement | null>(null)
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
  // A face de perto redesenha quando a paleta ou a cor base mudam de verdade, não a cada render.
  const paintPalette = useMemo(() => scenePalette(document), [document])
  const paintData = workshop.paint.data
  const paintBase = useMemo(
    () =>
      paintData
        ? sceneMaterialImageBase(paintData.material, paintPalette, paintData.imageKind)
        : null,
    [paintData, paintPalette],
  )
  const copy = COPY.scene
  const docked = useMediaQuery('(min-width: 1024px)')
  const canConvert = document.nodes.some(
    (node) =>
      node.kind === 'mesh' &&
      workshop.covered.has(node.id) &&
      workshop.index.geometries.get(node.geometryId)?.kind !== 'mesh',
  )
  const geometries = workshop.index.geometries
  const shapeOf = (node: ModelSceneNode): SceneHierarchyShape => {
    if (node.kind !== 'mesh') return node.kind
    const kind = geometries.get(node.geometryId)?.kind
    return kind === 'box' ||
      kind === 'wedge' ||
      kind === 'cylinder' ||
      kind === 'sphere' ||
      kind === 'path'
      ? kind
      : 'mesh'
  }
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
  function openFromBar(open: (value: boolean) => void) {
    if (hasPendingPose()) return
    workshop.cancelGesture()
    workshop.paint.close()
    workshop.components.close()
    if (hasPendingPose()) return
    open(true)
  }
  // O Animar leva os movimentos na barra da aba: a vista e a grade flutuam no alto do palco.
  const slots: SceneCanvasSlots =
    mode === 'model'
      ? { tools: toolsSlot, areaTools: areaToolsSlot, toggles: togglesSlot, view: viewSlot }
      : mode === 'paint'
        ? { toggles: togglesSlot, view: viewSlot }
        : { tools: toolsSlot }
  // "Isolar seleção" é um jeito de OLHAR: mora na lista das vistas, nas três abas.
  const isolate = (
    <Button
      variant="ghost"
      className="justify-start px-3 text-sm"
      disabled={!selected.length && workshop.isolation === null}
      aria-pressed={workshop.isolation !== null}
      onClick={() => workshop.setIsolation(workshop.isolation ? null : selected)}
    >
      <Focus aria-hidden="true" className="size-4" />
      {COPY.editor.model.isolation.toggle}
    </Button>
  )
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
          // Atalho de família trancada é da oficina: não age, e o navegador não o recebe.
          event.preventDefault()
          if (workshop.components.selection) {
            if (can('model.mesh')) workshop.components.remove()
          } else if (can('model.pieces'))
            run((source) => deleteSceneNodes(source, selected), 'clear')
        } else if (
          mode === 'model' &&
          !workshop.components.selection &&
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'd'
        ) {
          // Ctrl+D duplica, como no editor antigo (o registro já o prometia); sem isso, o
          // navegador guardava a página nos favoritos.
          event.preventDefault()
          if (can('model.pieces') && selected.length)
            run((source) => duplicateSceneNodes(source, selected), 'created')
        } else if ((mode === 'paint' || workshop.paint.session) && event.key === 'Escape') {
          // O mesmo Esc do palco, venha de onde vier o foco: com a pergunta da face torta aberta
          // e sem pintura, ele solta a peça (antes só o palco fazia isso).
          event.preventDefault()
          workshop.endPaint()
        } else if (mode === 'paint' && runScenePaintShortcut(workshop.paint, event, can)) {
          event.preventDefault()
        } else if (workshop.components.selection && event.key === 'Escape') {
          event.preventDefault()
          escapeFaces()
        } else if (
          workshop.components.selection &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'a'
        ) {
          event.preventDefault()
          if (can('model.mesh')) workshop.components.choose('all')
        }
      }}
      // Rola na VERTICAL só quando a tela é baixa demais (o celular deitado): o palco tem um
      // piso, e sem a rolagem ele sumia (0px a 844×390, medido). Na altura normal nada rola.
      className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-mld-bg text-mld-text"
    >
      <SceneWorkshopBar
        editor={editor}
        name={document.name}
        onExit={onExit}
        beforeExit={() => studioSync.prepareExit(editor.getState().savedAsset)}
        backup={backup}
        cancelPreview={() => {
          workshop.cancelGesture()
          workshop.releasePaintPreparation()
          workshop.paint.close()
          workshop.components.close()
          workshop.flipbook.setImage(null)
        }}
        onUndo={() => {
          workshop.cancelGesture()
          editor.getState().undo()
        }}
        onRedo={() => {
          workshop.cancelGesture()
          editor.getState().redo()
        }}
        pendingPose={pendingPose}
        exportTrigger={exportTrigger}
        importTrigger={importTrigger}
        exportHintId={exportPoseHintId}
        importHintId={importPoseHintId}
        onExport={() => openFromBar(setExportOpen)}
        onImport={() => openFromBar(setImportOpen)}
      />
      {/* A barra da ABA: as abas e, à direita, o jeito de olhar (ou os movimentos, no Animar). */}
      <div className="mld-bar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2">
        <SceneModeTabs mode={mode} onChange={changeMode} />
        {mode === 'animation' ? (
          <div className="min-w-0 flex-1">
            <DeferredModule
              load={loadClips}
              props={{ workshop }}
              onBack={() => changeMode('model')}
              backLabel={copy.glbExport.close}
            />
          </div>
        ) : (
          <>
            <span aria-hidden="true" className="hidden h-7 w-px bg-mld-border sm:block" />
            <div ref={setTogglesSlot} className="flex flex-wrap items-center gap-2" />
            <div ref={setViewSlot} className="flex flex-wrap items-center gap-2 sm:ml-auto" />
          </>
        )}
      </div>
      {storage && <SceneStorageNotice observer={storage} />}
      {/* O erro da pintura mora na coluna da aba Pintar, junto das ferramentas. */}
      {workshop.message && (
        <p
          role="alert"
          className="border-b border-mld-border bg-mld-surface px-4 py-2 text-sm text-mld-danger"
        >
          {workshop.message}
        </p>
      )}
      {/* O piso do palco: em tela baixa quem cede é a rolagem da oficina, nunca o palco. */}
      <div className="relative flex min-h-72 flex-1 flex-col overflow-hidden lg:flex-row">
        {mode === 'model' && (
          <SceneModelColumn
            workshop={workshop}
            toolsSlot={setToolsSlot}
            areaToolsSlot={setAreaToolsSlot}
            faceToggle={faceToggle}
            onToggleFaces={() =>
              workshop.components.selection ? closeFaces() : workshop.components.open()
            }
            canConvert={canConvert}
          />
        )}
        {mode === 'paint' && (
          <div className="mld-bar flex shrink-0 flex-wrap gap-1 border-b p-2 lg:w-60 lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-3">
            <ScenePaintColumn workshop={workshop} />
          </div>
        )}
        {mode === 'animation' && (
          <section
            aria-label={SCENE_SHELL_COPY.animationTools}
            className="mld-bar mld-scroll-x flex shrink-0 overflow-x-auto border-b p-2 lg:w-24 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0"
          >
            <div ref={setToolsSlot} className="flex gap-1.5 max-lg:[&>*]:w-19 lg:flex-col" />
          </section>
        )}
        {/*
         * Palco e inspetor num contêiner só: abaixo de lg a gaveta "Peças e cores" (e o gatilho
         * dela, em cima à direita) se posiciona por ele.
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
              onThumb={(thumb) => {
                if (!workshop.paintPreparationPending()) workshop.editor.getState().setThumb(thumb)
              }}
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
              overlay={
                mode === 'paint' && workshop.paint.data && workshop.paint.closeUp ? (
                  <ScenePaintCloseUp
                    image={workshop.paint.data.image}
                    palette={paintPalette}
                    base={paintBase ?? [0, 0, 0, 0]}
                    view={workshop.paint.closeUp}
                    drawing={workshop.paint.drawing}
                    actions={workshop.paint.actions}
                    onClose={workshop.paint.closeCloseUp}
                  />
                ) : null
              }
              paint={workshop.paint.actions}
              flipbook={workshop.flipbook}
              animation={workshop.animation}
              animationPose={workshop.animationPose}
              onEndPaint={workshop.endPaint}
              slots={slots}
              viewExtras={isolate}
            />
          </div>
          <WorkspaceInspector docked={docked} onBeforeClose={workshop.cancelGesture}>
            <h3 className="mld-kicker px-1 pt-1">{copy.hierarchy}</h3>
            {/* No Modelar ele mora em "Mais ferramentas"; em Pintar a escolha é de uma peça. */}
            {mode === 'animation' && (
              <Button
                className="w-full text-sm"
                aria-pressed={workshop.additive}
                onClick={() => workshop.setAdditive(!workshop.additive)}
              >
                <ListChecks aria-hidden="true" className="size-4" />
                {copy.addSelection}
              </Button>
            )}
            {!document.nodes.length && <p className="px-1 text-sm text-mld-muted">{copy.empty}</p>}
            <SceneHierarchy
              index={workshop.index.scene}
              selected={selected}
              onSelect={workshop.select}
              shapeOf={shapeOf}
            />
            {mode === 'animation' ? (
              <>
                <DeferredModule
                  load={loadAnimationInspector}
                  props={{ workshop }}
                  onBack={() => changeMode('model')}
                  backLabel={copy.glbExport.close}
                />
                {/* No painel, que rola: na barra de cima ela roubaria altura do palco. */}
                <SceneUpcomingTools tabs={['animate']} />
              </>
            ) : mode === 'paint' ? (
              <>
                {/* No nível de entrada o painel ficaria vazio: nem baixa o módulo. */}
                {SCENE_PAINT_ADVANCED_FAMILIES.some((family) => can(family)) && (
                  <DeferredModule
                    load={loadPaint}
                    props={{ workshop }}
                    onBack={() => changeMode('model')}
                    backLabel={copy.glbExport.close}
                  />
                )}
                {/* No celular a linha mora aqui, na gaveta; no computador, no fim da coluna. */}
                <SceneUpcomingTools tabs={['paint']} className="md:hidden" />
              </>
            ) : workshop.components.selection ? (
              <SceneComponentTools {...workshop.components} />
            ) : (
              <SceneNodeProperties workshop={workshop} />
            )}
          </WorkspaceInspector>
        </div>
      </div>
      {/* A faixa de BAIXO, de borda a borda (a das telas-modelo). */}
      {mode === 'model' && <SceneSurfaceStrip workshop={workshop} />}
      {mode === 'paint' && <ScenePaintPalette paint={workshop.paint} palette={document} />}
      {mode === 'animation' && (
        <DeferredModule
          load={loadTimeline}
          props={{ workshop }}
          onBack={() => changeMode('model')}
          backLabel={copy.glbExport.close}
        />
      )}
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
