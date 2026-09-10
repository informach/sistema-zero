import { describe, expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_FIRST_STEPS_COPY as firstSteps } from '../../../core/sceneFirstStepsCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import {
  captureSceneAnimationPoseSet,
  pasteSceneAnimationPoseSet,
} from '../../../scene/animationPoseSet'
import { addScenePrimitive, convertSceneNodesToMesh } from '../../../scene/commands'
import { sceneFlipbookRegion } from '../../../scene/imageFlipbook'
import { setSceneImageFlipbook } from '../../../scene/imageFlipbookCommands'
import { paintSceneImageGradient } from '../../../scene/imageGradient'
import { captureSceneLayerRaster } from '../../../scene/imageImport'
import { editSceneImageLayers } from '../../../scene/imageLayerCommands'
import { fillSceneImage } from '../../../scene/imageOperations'
import { paintSceneImageShape } from '../../../scene/imageShapes'
import { paintSceneImageStamp } from '../../../scene/imageStamp'
import { SCENE_MATERIAL_IMAGE_FIELDS } from '../../../scene/materialImages'
import { identityMatrix } from '../../../scene/matrix'
import type { SceneComponentSelection } from '../../../scene/meshComponents'
import { meshComponentEdges } from '../../../scene/meshComponents'
import { meshEdgeKey } from '../../../scene/meshTopology'
import { autoMeshUv } from '../../../scene/meshUvAuto'
import { editMeshUv } from '../../../scene/meshUvOperations'
import { unfoldMeshUv } from '../../../scene/meshUvUnfold'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { prepareSceneAnimation, type SceneAnimationPose } from '../../../scene/sampleAnimation'
import {
  createSceneSkin,
  removeSceneSkinJoint,
  setSceneSkinWeights,
} from '../../../scene/skinCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { setMoldaGenerationStoreFactory } from '../../../state/persistence'
import { createSceneEditorStore, type SceneEditorStore } from '../../../state/sceneEditorStore'
import { createScenePersistence } from '../../../state/scenePersistence'
import { makeModel } from '../../../testing/fixtures'
import { nativeDatabase } from '../../../testing/nativeDatabase'
import { animatedScene } from '../../../testing/sceneAnimation'
import { makeSceneAtlasDocument } from '../../../testing/sceneAtlasFixture'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import { makeSceneTwoBoneFixture } from '../../../testing/sceneTwoBone'
import type {
  SceneViewportCallbacks,
  SceneViewportFactory,
  SceneViewportPort,
} from '../../../viewport/sceneViewportTypes'
import { SceneWorkshop } from './SceneWorkshop'

function setup(
  asset = migrateLegacyModel(makeModel()).document,
  persistedEditor?: SceneEditorStore,
  options: {
    renderThumb?: () => string | null
    resyncToStudio?: (asset: {
      id: string
      name: string
    }) => Promise<
      { updated: true } | { updated: false; reason: 'not-linked' | 'failed'; error?: string }
    >
  } = {},
) {
  const editor =
    persistedEditor ??
    createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
  const ports: Array<{
    callbacks: SceneViewportCallbacks
    disposed: number
    selected: readonly string[]
    isolated: readonly string[] | null
    faces: SceneComponentSelection | null
    documentUpdates: number
    supports: boolean
    weightTarget: { nodeId: string; jointId: string } | null
    frames: Array<{ id: string; frame: number | null }>
    poses: Array<SceneAnimationPose | null>
  }> = []
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    const state = {
      callbacks,
      disposed: 0,
      selected: [] as readonly string[],
      isolated: null as readonly string[] | null,
      faces: null as SceneComponentSelection | null,
      documentUpdates: 0,
      supports: false,
      weightTarget: null as { nodeId: string; jointId: string } | null,
      frames: [] as Array<{ id: string; frame: number | null }>,
      poses: [] as Array<SceneAnimationPose | null>,
    }
    ports.push(state)
    const port: SceneViewportPort = {
      setDocument: () => {
        state.documentUpdates++
        return []
      },
      setSelection: (ids) => {
        state.selected = ids
      },
      setIsolation: (ids) => {
        state.isolated = ids
      },
      setView: () => {},
      setTransformTool: () => {},
      setAreaTool: () => {},
      setComponentSelection: (selection) => {
        state.faces = selection
      },
      setPaintTarget: () => {},
      setAnimationEditing: () => {},
      setSupportGuides: (enabled) => {
        state.supports = enabled
      },
      setSkinWeightTarget: (target) => {
        state.weightTarget = target
      },
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      setPose: (pose) => {
        state.poses.push(pose)
      },
      setImageFrame: (id, frame) => {
        state.frames.push({ id, frame })
      },
      cancelGesture: () => {},
      renderThumb: options.renderThumb ?? (() => null),
      frame: () => {},
      dispose: () => {
        state.disposed++
      },
    }
    return port
  }
  const view = render(
    <StrictMode>
      <SceneWorkshop
        editor={editor}
        storage={persistedEditor?.storage}
        viewportFactory={factory}
        {...(options.resyncToStudio ? { resyncToStudio: options.resyncToStudio as never } : {})}
      />
    </StrictMode>,
  )
  function openInspector() {
    const trigger = screen.queryByRole('button', { name: COPY.editor.model.inspector.open })
    if (trigger) fireEvent.click(trigger)
  }
  return { editor, ports, view, openInspector }
}

describe('scene workshop integration', () => {
  test('salvar na oficina reenvia a criação ao Estúdio; abrir não reenvia nada', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    const sent: Array<{ id: string; kind: string }> = []
    const asset = migrateLegacyModel(makeModel()).document
    await createScenePersistence(db.store).save(asset, null)
    const { editor, view, ports } = setup(asset, undefined, {
      resyncToStudio: async (exported) => {
        sent.push(exported as unknown as { id: string; kind: string })
        return { updated: true }
      },
    })
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      // Abrir não é salvar: a ponte fica quieta.
      expect(sent).toEqual([])
      act(() => {
        editor.getState().commit(addScenePrimitive(editor.getState().asset, 'box', 'Bloco'))
      })
      await act(async () => {
        await editor.getState().flush()
      })
      // Fechar a criação com um reenvio pendente drena a fila na hora.
      view.unmount()
      await waitFor(() => expect(sent.length).toBe(1), { timeout: 20_000 })
      expect(sent[0]?.id).toBe(asset.id)
      expect(sent[0]?.kind).toBe('model3d')
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  // O editor antigo avisa quando a ponte falha (`COPY.editor.studioSyncFailed`); a oficina
  // ficava muda, e o jogo continuava com o modelo velho sem a criança saber.
  test('a falha da ponte com o Estúdio chega à criança', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    const asset = migrateLegacyModel(makeModel()).document
    await createScenePersistence(db.store).save(asset, null)
    const { editor, view, ports } = setup(asset, undefined, {
      resyncToStudio: async () => ({ updated: false, reason: 'failed', error: 'a nuvem recusou' }),
    })
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => {
        editor.getState().commit(addScenePrimitive(editor.getState().asset, 'box', 'Bloco'))
      })
      await act(async () => {
        await editor.getState().flush()
      })
      await waitFor(() => expect(screen.queryByText('a nuvem recusou')).not.toBeNull(), {
        timeout: 20_000,
      })
    } finally {
      view.unmount()
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  // A forma forte de "abrir não é salvar": o desmontar DRENA a fila, então um reenvio
  // enfileirado na abertura apareceria aqui. Conferir logo depois de montar só provaria
  // que o debounce de 1,5 s ainda não venceu.
  test('abrir e sair sem editar não reenvia nada, nem na drenagem da saída', async () => {
    const db = await nativeDatabase()
    setMoldaGenerationStoreFactory(() => db.store)
    const sent: unknown[] = []
    const asset = migrateLegacyModel(makeModel()).document
    await createScenePersistence(db.store).save(asset, null)
    const { view, ports } = setup(asset, undefined, {
      resyncToStudio: async (exported) => {
        sent.push(exported)
        return { updated: true }
      },
    })
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      view.unmount()
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(sent).toEqual([])
    } finally {
      setMoldaGenerationStoreFactory(null)
      db.close()
    }
  })

  test('a foto da criação entra no documento sem virar passo de desfazer', async () => {
    const photo = 'data:image/jpeg;base64,Zm90bw=='
    const { editor, ports, view, openInspector } = setup(undefined, undefined, {
      renderThumb: () => photo,
    })
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      // A foto é derivada: sai depois que o desenho assenta, não a cada mudança.
      expect(editor.getState().asset.thumb).toBeUndefined()
      await waitFor(() => expect(editor.getState().asset.thumb).toBe(photo), { timeout: 3000 })
      expect(editor.getState().canUndo).toBe(false)
      const revision = editor.getState().contentRevision
      openInspector()
      // Uma edição de verdade continua sendo um passo; a foto não some nem duplica.
      act(() => {
        editor.getState().commit(addScenePrimitive(editor.getState().asset, 'box', 'Bloco'))
      })
      expect(editor.getState().canUndo).toBe(true)
      expect(editor.getState().contentRevision).toBe(revision + 1)
      await waitFor(() => expect(editor.getState().asset.thumb).toBe(photo), { timeout: 3000 })
    } finally {
      view.unmount()
    }
  })

  test('o palco que RECUSA fotografar preserva a foto que a criação já tinha', async () => {
    const photo = 'data:image/jpeg;base64,dmVsaGE='
    // Isolamento ligado (ou contexto perdido) devolve `null`: foto velha e inteira vale
    // mais que uma nova pela metade. Apagar era a leitura contrária do mesmo `null`.
    const { editor, ports, view } = setup(
      { ...migrateLegacyModel(makeModel()).document, thumb: photo },
      undefined,
      { renderThumb: () => null },
    )
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      await new Promise((resolve) => setTimeout(resolve, 1200))
      expect(editor.getState().asset.thumb).toBe(photo)
      // E nada foi gravado por causa disso: a foto derivada não carimba a criação.
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
    }
  })

  test('first steps follow painting without closing its session or forwarding model shortcuts', async () => {
    const { editor, view, ports, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const asset = editor.getState().asset,
        trigger = screen.getByRole('button', { name: firstSteps.open })
      fireEvent.click(trigger)
      const panel = screen.getByRole('region', { name: firstSteps.title })
      expect(within(panel).getByText(firstSteps.tracks.model.steps[0].title)).toBeTruthy()
      fireEvent.keyDown(panel, { key: 'Delete' })
      fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
      fireEvent.keyDown(panel, { key: 'Escape' })
      expect(editor.getState().asset).toBe(asset)
      expect(editor.getState().canUndo).toBe(false)
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      const choose = await screen.findByRole('combobox', { name: COPY.scene.materialChoose })
      const image = asset.images[0]!,
        material = asset.materials.find((entry) => entry.colorImageId === image.id)!
      fireEvent.change(choose, { target: { value: material.id } })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      const updates = ports.at(-1)!.documentUpdates,
        selected = ports.at(-1)!.selected
      fireEvent.click(trigger)
      const help = screen.getByRole('region', { name: firstSteps.title })
      expect(within(help).getByText(firstSteps.tracks.paint.steps[0].title)).toBeTruthy()
      fireEvent.keyDown(help, { key: 'Escape' })
      expect(screen.getByRole('button', { name: COPY.scene.paintCanvas })).toBe(canvas)
      expect(document.activeElement).toBe(trigger)
      expect(editor.getState().asset).toBe(asset)
      expect(editor.getState().contentRevision).toBe(0)
      expect(ports.at(-1)!.documentUpdates).toBe(updates)
      expect(ports.at(-1)!.selected).toEqual(selected)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('first steps leave an unrecorded pose, selection, document and history untouched', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.animationRecord })).not.toBeNull(),
      )
      const port = ports.at(-1)!,
        asset = editor.getState().asset
      act(() => {
        expect(port.callbacks.transform!.begin()).toBe(true)
        const delta = identityMatrix()
        delta[12] = 7
        expect(port.callbacks.transform!.preview(delta)).toBe(true)
        port.callbacks.transform!.end(true)
      })
      const pose = port.poses.at(-1),
        updates = port.documentUpdates,
        selection = port.selected
      const trigger = screen.getByRole('button', { name: firstSteps.open })
      fireEvent.click(trigger)
      const panel = screen.getByRole('region', { name: firstSteps.title }),
        ui = within(panel)
      expect(ui.getByText(firstSteps.tracks.animation.steps[0].title)).toBeTruthy()
      fireEvent.click(ui.getByRole('button', { name: firstSteps.next }))
      fireEvent.click(ui.getByRole('button', { name: firstSteps.tracks.paint.label }))
      fireEvent.keyDown(panel, { key: 'Delete' })
      fireEvent.keyDown(panel, { key: 'z', ctrlKey: true })
      fireEvent.keyDown(panel, { key: 'Escape' })
      expect(document.activeElement).toBe(trigger)
      expect(editor.getState().asset).toBe(asset)
      expect(editor.getState().canUndo).toBe(false)
      expect(editor.getState().contentRevision).toBe(0)
      expect(port.documentUpdates).toBe(updates)
      expect(port.selected).toEqual(selection)
      expect(port.poses.at(-1)).toBe(pose)
      expect(screen.getByText(COPY.scene.animationPosePending)).toBeTruthy()
      const record = screen.getByRole('button', {
        name: COPY.scene.animationPoseRecord,
      }) as HTMLButtonElement
      expect(record.disabled).toBe(false)
      fireEvent.click(record)
      expect(editor.getState().contentRevision).toBe(1)
      expect(editor.getState().canUndo).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(asset.animations)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('cross-tab notice preserves an open edit, offers backup and keeps undo available under StrictMode', async () => {
    const logged: unknown[][] = []
    const originalError = console.error.bind(console)
    const errors = spyOn(console, 'error').mockImplementation((...args) => {
      logged.push(args)
      originalError(...args)
    })
    const db = await nativeDatabase({ name: 'workshop-notice' })
    const source = migrateLegacyModel(makeModel()).document
    const p = createScenePersistence(db.store)
    await p.save(source, null)
    const editor = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
    const { view, ports } = setup(source, editor)
    const observations: Array<() => void> = []
    const observeIssue = (issue: 'changed' | 'deleted') =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (editor.storage.getSnapshot().issue === issue) resolve()
        }
        observations.push(editor.storage.subscribe(check))
        check()
      })
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      await waitFor(() => expect(editor.storage.getSnapshot().notifications).toBe('available'))
      await act(async () => {
        await editor.storage.refresh()
      })
      fireEvent.click(screen.getByText(COPY.scene.add))
      fireEvent.click(screen.getByRole('button', { name: COPY.shapes.box }))
      const local = editor.getState().asset
      const revision = editor.getState().contentRevision
      const writes = ports.at(-1)!.documentUpdates
      await act(async () => {
        const changed = observeIssue('changed')
        await createScenePersistence(db.store).save({ ...source, name: 'outra aba' }, 1)
        await changed
      })
      expect(screen.getByRole('alert').textContent).toBe(COPY.scene.conflict)
      expect(screen.getByRole('button', { name: COPY.scene.backup }).hasAttribute('disabled')).toBe(
        false,
      )
      expect(editor.getState().asset).toBe(local)
      expect(editor.getState().contentRevision).toBe(revision)
      expect(ports.at(-1)!.documentUpdates).toBe(writes)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect(editor.getState().asset.nodes).toEqual(local.nodes)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.save }))
        await editor.getState().flush()
      })
      expect(editor.getState().saveError).toBe(COPY.scene.conflict)
      expect(await p.read(source.id)).toMatchObject({
        status: 'active',
        summary: { revision: 2 },
        document: { name: 'outra aba' },
      })
      await act(async () => {
        const deleted = observeIssue('deleted')
        await p.remove(source.id, 2)
        await deleted
      })
      expect(screen.getByRole('alert').textContent).toBe(COPY.scene.storage.deleted)
      expect(editor.getState().asset.nodes).toEqual(local.nodes)
      expect(logged).toEqual([])
    } finally {
      for (const off of observations) off()
      view.unmount()
      editor.getState().dispose()
      db.close()
      errors.mockRestore()
    }
  })
  test('two-bone destination handles hold fields during movement, sync them on release and leave one explicit undoable pose', async () => {
    const source = makeSceneTwoBoneFixture(),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      const details = (await screen.findByText(copy.title)).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      const form = within(details),
        exact = form.getByText(copy.exact).closest('details')!
      act(() => {
        exact.open = true
        fireEvent(exact, new Event('toggle'))
      })
      fireEvent.click(screen.getByLabelText(COPY.scene.animationPoseAutoKey))
      fireEvent.click(form.getByRole('button', { name: copy.nudge(0, -1) }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.move }))
      expect(
        screen.getByRole('button', { name: COPY.scene.move }).getAttribute('aria-pressed'),
      ).toBe('true')
      expect(
        (screen.getByRole('button', { name: COPY.scene.rotate }) as HTMLButtonElement).disabled,
      ).toBe(true)
      expect(
        (screen.getByRole('button', { name: COPY.scene.scale }) as HTMLButtonElement).disabled,
      ).toBe(true)
      const x = form.getByLabelText(copy.axis(copy.target, 0)) as HTMLInputElement,
        record = screen.getByRole('button', {
          name: COPY.scene.animationPoseRecord,
        }) as HTMLButtonElement,
        actions = ports.at(-1)!.callbacks.transform!,
        original = ports.at(-1)!.poses.at(-1)
      expect(x.value).toBe('1.75')
      act(() => expect(actions.begin()).toBe(true))
      expect(x.closest('fieldset')!.disabled).toBe(true)
      expect(record.disabled).toBe(true)
      for (let i = 0; i < 30; i++) {
        const delta = identityMatrix()
        delta[12] = -0.25 - i / 100
        act(() => expect(actions.preview(delta)).toBe(true))
        expect(x.value).toBe('1.75')
      }
      act(() => actions.end(false))
      expect(ports.at(-1)!.poses.at(-1)).toBe(original)
      expect(x.value).toBe('1.75')
      expect(x.closest('fieldset')!.disabled).toBe(false)
      act(() => {
        expect(actions.begin()).toBe(true)
        const delta = identityMatrix()
        delta[12] = -0.25
        expect(actions.preview(delta)).toBe(true)
        actions.end(true)
      })
      expect(x.value).toBe('1.5')
      expect(record.disabled).toBe(false)
      expect(editor.getState().asset).toBe(source)
      const pose = ports.at(-1)!.poses.at(-1)!
      fireEvent.click(record)
      expect(
        prepareSceneAnimation(editor.getState().asset, 'clip').sample(0, false).worldMatrices,
      ).toEqual(pose.worldMatrices)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(source.animations)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('bend-limit controls withdraw previews, validate drafts and save the assistance rule separately from the pose', async () => {
    const source = makeSceneTwoBoneFixture(),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.bendLimit,
      twoBone = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await screen.findByText(twoBone.title)
      function open(title: string) {
        const details = screen.getByText(title, { selector: 'summary' }).closest('details')!
        act(() => {
          details.open = true
          fireEvent(details, new Event('toggle'))
        })
        return within(details)
      }
      let form = open(twoBone.title)
      fireEvent.click(form.getByRole('button', { name: twoBone.nudge(0, -1) }))
      const record = screen.getByRole('button', {
          name: COPY.scene.animationPoseRecord,
        }) as HTMLButtonElement,
        limits = open(copy.title),
        max = limits.getByLabelText(copy.max) as HTMLInputElement,
        min = limits.getByLabelText(copy.min) as HTMLInputElement
      expect(record.disabled).toBe(false)
      fireEvent.change(max, { target: { value: '' } })
      expect(record.disabled).toBe(true)
      expect(
        (
          form
            .getByRole('button', { name: twoBone.nudge(0, -1) })
            .closest('fieldset') as HTMLFieldSetElement
        ).disabled,
      ).toBe(true)
      fireEvent.submit(max.form!)
      expect(limits.getByRole('alert').textContent).toBe(COPY.scene.invalidNumber)
      expect(max.value).toBe('')
      fireEvent.change(max, { target: { value: '90' } })
      fireEvent.change(min, { target: { value: '100' } })
      fireEvent.submit(max.form!)
      expect(limits.getByRole('alert').textContent).toContain('menor dobra')
      expect(editor.getState().asset).toBe(source)
      fireEvent.click(limits.getByRole('button', { name: copy.cancel }))
      expect(min.value).toBe('0')
      expect(max.value).toBe('180')
      expect(record.disabled).toBe(true)
      fireEvent.change(max, { target: { value: '90' } })
      fireEvent.submit(max.form!)
      const configured = editor.getState().asset,
        middle = configured.nodes.find((node) => node.id === 'middle')!
      expect(middle.kind !== 'mesh' && middle.bendLimit).toEqual({ min: 0, max: 90 })
      expect(configured.animations).toBe(source.animations)
      expect(configured.geometries).toBe(source.geometries)
      expect(editor.getState().contentRevision).toBe(1)
      form = open(twoBone.title)
      expect(form.getByText(copy.saved(0, 90))).not.toBeNull()
      open(twoBone.exact)
      const x = form.getByLabelText(twoBone.axis(twoBone.target, 0)) as HTMLInputElement
      fireEvent.change(x, { target: { value: '0' } })
      fireEvent.submit(x.form!)
      expect(form.getByRole('status').textContent).toContain(twoBone.reach['bend-limit'])
      const pose = ports.at(-1)!.poses.at(-1)!
      expect(Math.hypot(...pose.worldMatrices.get('tip')!.slice(12, 15))).toBeCloseTo(
        Math.sqrt(2),
        12,
      )
      expect(editor.getState().asset).toBe(configured)
      fireEvent.click(record)
      expect(editor.getState().contentRevision).toBe(2)
      expect(
        prepareSceneAnimation(editor.getState().asset, 'clip').sample(0, false).worldMatrices,
      ).toEqual(pose.worldMatrices)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes).toEqual(configured.nodes)
      expect(editor.getState().asset.animations).toEqual(source.animations)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('two-bone controls name the chain, preview steps without autokey and record exactly one undo matching playback', async () => {
    const source = makeSceneTwoBoneFixture(),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      const details = (await screen.findByText(copy.title)).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      const form = within(details),
        chain = form.getByRole('list', { name: copy.chain })
      expect(chain.textContent).toBe('ComeçorootDobramiddlePontatip')
      expect(form.getByText(copy.world)).not.toBeNull()
      const port = ports.at(-1)!,
        updates = port.documentUpdates,
        record = screen.getByRole('button', {
          name: COPY.scene.animationPoseRecord,
        }) as HTMLButtonElement
      fireEvent.click(screen.getByLabelText(COPY.scene.animationPoseAutoKey))
      expect(record.disabled).toBe(true)
      fireEvent.click(form.getByRole('button', { name: copy.nudge(0, -1) }))
      for (let i = 0; i < 10; i++) {
        fireEvent.click(form.getByRole('button', { name: copy.nudge(1, 1) }))
        fireEvent.click(form.getByRole('button', { name: copy.nudge(1, -1) }))
      }
      fireEvent.click(form.getByRole('button', { name: copy.nudge(1, 1) }))
      const pose = port.poses.at(-1)!
      expect(pose.twoBoneGuide).toEqual({
        chain: ['root', 'middle', 'tip'],
        target: [1.75, 0.25, 0],
      })
      expect(pose.worldMatrices.get('tip')![12]).toBeCloseTo(1.75, 12)
      expect(pose.worldMatrices.get('tip')![13]).toBeCloseTo(0.25, 12)
      expect(form.getByRole('status').textContent).toContain(copy.reach.reached)
      expect(form.getByRole('status').textContent).toContain(copy.bends.pose)
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      expect(port.documentUpdates).toBe(updates)
      expect(record.disabled).toBe(false)
      fireEvent.click(record)
      const committed = editor.getState().asset
      expect(committed.nodes).toBe(source.nodes)
      expect(committed.animations![0]!.tracks.map((track) => track.channel)).toEqual([
        'rotation',
        'rotation',
      ])
      expect(prepareSceneAnimation(committed, 'clip').sample(0, false).worldMatrices).toEqual(
        pose.worldMatrices,
      )
      expect(editor.getState().contentRevision).toBe(1)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(source.animations)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect(editor.getState().asset.animations).toEqual(committed.animations)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('two-bone exact fields withdraw stale poses, preserve incomplete values, explain reach and optional bend direction', async () => {
    const source = makeSceneTwoBoneFixture(),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      const details = (await screen.findByText(copy.title)).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      const form = within(details),
        record = screen.getByRole('button', {
          name: COPY.scene.animationPoseRecord,
        }) as HTMLButtonElement
      fireEvent.click(form.getByRole('button', { name: copy.nudge(1, 1) }))
      expect(form.getByRole('status').textContent).toContain(copy.reach['too-far'])
      const exact = form.getByText(copy.exact).closest('details')!
      act(() => {
        exact.open = true
        fireEvent(exact, new Event('toggle'))
      })
      expect(details.open).toBe(true)
      expect(record.disabled).toBe(false)
      const x = form.getByLabelText(copy.axis(copy.target, 0)) as HTMLInputElement
      fireEvent.change(x, { target: { value: '' } })
      expect(x.value).toBe('')
      expect(record.disabled).toBe(true)
      expect(form.queryByRole('status')).toBeNull()
      expect(ports.at(-1)!.poses.at(-1)?.twoBoneGuide).toBeUndefined()
      expect(ports.at(-1)!.poses.at(-1)?.worldMatrices.get('tip')?.slice(12, 15)).toEqual([2, 0, 0])
      fireEvent.submit(x.form!)
      expect(form.getByRole('alert').textContent).toBe(COPY.scene.invalidNumber)
      expect(record.disabled).toBe(true)
      fireEvent.change(x, { target: { value: '1.123456789012345' } })
      fireEvent.click(form.getByLabelText(copy.useHint))
      fireEvent.change(form.getByLabelText(copy.axis(copy.bend, 2)), { target: { value: '3' } })
      fireEvent.submit(x.form!)
      expect(x.value).toBe('1.123456789012345')
      expect(form.getByRole('status').textContent).toContain(copy.bends.hint)
      expect(ports.at(-1)!.poses.at(-1)!.worldMatrices.get('tip')![12]).toBeCloseTo(
        1.123456789012345,
        12,
      )
      fireEvent.change(form.getByLabelText(copy.step), { target: { value: '1e-100' } })
      expect(record.disabled).toBe(true)
      fireEvent.click(form.getByRole('button', { name: copy.nudge(0, 1) }))
      expect(form.getByRole('alert').textContent).toBe(copy.precision)
      expect(record.disabled).toBe(true)
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('two-bone controls cancel on close, Escape in a field, selection, time, blur, context loss; thumbnail metadata preserves the pending pose', async () => {
    const source = makeSceneTwoBoneFixture(),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await screen.findByText(copy.title)
      const port = ports.at(-1)!
      for (const kind of [
        'close',
        'escape',
        'selection',
        'time',
        'blur',
        'hidden',
        'context',
        'thumbnail',
      ]) {
        const summary = screen.getByText(copy.title),
          details = summary.closest('details')!
        act(() => {
          details.open = true
          fireEvent(details, new Event('toggle'))
        })
        fireEvent.click(within(details).getByRole('button', { name: copy.nudge(0, -1) }))
        expect(
          (
            screen.getByRole('button', {
              name: COPY.scene.animationPoseRecord,
            }) as HTMLButtonElement
          ).disabled,
        ).toBe(false)
        act(() => {
          if (kind === 'close') {
            details.open = false
            fireEvent(details, new Event('toggle'))
          }
          if (kind === 'escape') {
            const step = within(details).getByLabelText(copy.step)
            step.focus()
            fireEvent.keyDown(step, { key: 'Escape' })
            fireEvent(details, new Event('toggle'))
          }
          if (kind === 'selection') port.callbacks.select('tip', false)
          if (kind === 'time')
            fireEvent.change(screen.getByRole('slider', { name: COPY.scene.animationTime }), {
              target: { value: '0.5' },
            })
          if (kind === 'blur') window.dispatchEvent(new Event('blur'))
          if (kind === 'hidden') {
            const original = Object.getOwnPropertyDescriptor(document, 'hidden')
            Object.defineProperty(document, 'hidden', { configurable: true, value: true })
            try {
              document.dispatchEvent(new Event('visibilitychange'))
            } finally {
              if (original) Object.defineProperty(document, 'hidden', original)
              else Reflect.deleteProperty(document, 'hidden')
            }
          }
          if (kind === 'context') {
            port.callbacks.contextLost(true)
            port.callbacks.contextLost(false)
          }
          if (kind === 'thumbnail') editor.getState().setThumb('latest')
        })
        if (kind === 'escape') expect(document.activeElement).toBe(summary)
        expect({
          kind,
          disabled: (
            screen.getByRole('button', {
              name: COPY.scene.animationPoseRecord,
            }) as HTMLButtonElement
          ).disabled,
        }).toEqual({ kind, disabled: kind !== 'thumbnail' })
        expect(editor.getState().asset.animations).toBe(source.animations)
        expect(editor.getState().contentRevision).toBe(0)
        expect(editor.getState().canUndo).toBe(false)
      }
      expect(editor.getState().asset.thumb).toBe('latest')
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('two-bone controls explain missing ancestors and refuse degenerate or locked dependent chains without editing', async () => {
    const source = makeSceneTwoBoneFixture(),
      locked = {
        ...source,
        nodes: source.nodes.map((node) => (node.id === 'body' ? { ...node, locked: true } : node)),
      },
      { editor, view, ports, openInspector } = setup(locked),
      copy = COPY.scene.twoBone
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      const details = (await screen.findByText(copy.title)).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      expect(within(details).getByText(COPY.scene.animationLocked)).not.toBeNull()
      expect((details.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true)
      act(() => ports.at(-1)!.callbacks.select('root', false))
      expect(screen.getByText(copy.pick)).not.toBeNull()
      expect(screen.queryByText(copy.title)).toBeNull()
      act(() => editor.getState().replace(source))
      act(() => ports.at(-1)!.callbacks.select('middle', false))
      const degenerate = screen.getByText(copy.title).closest('details')!
      act(() => {
        degenerate.open = true
        fireEvent(degenerate, new Event('toggle'))
      })
      fireEvent.click(within(degenerate).getByRole('button', { name: copy.nudge(0, -1) }))
      expect(screen.getByRole('alert').textContent).toContain('comprimento')
      expect(
        (screen.getByRole('button', { name: COPY.scene.animationPoseRecord }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      act(() => ports.at(-1)!.callbacks.select('body', false))
      expect(screen.queryByText(copy.title)).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('weight-map choices are view-only, survive saved weight edits, and clear when the bone or component session disappears', async () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      { editor, view, ports } = setup(source),
      copy = COPY.scene.weightMap
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      expect(screen.queryByLabelText(copy.title)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      const select = screen.getByLabelText(copy.title) as HTMLSelectElement
      expect(select.value).toBe('')
      fireEvent.change(select, { target: { value: 'upper' } })
      expect(ports.at(-1)!.weightTarget).toEqual({ nodeId: 'part-0', jointId: 'upper' })
      expect(screen.getByText(copy.zero)).not.toBeNull()
      expect(screen.getByText(copy.full)).not.toBeNull()
      expect(screen.getByText(copy.hint)).not.toBeNull()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().contentRevision).toBe(0)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      act(() => ports.at(-1)!.callbacks.selectComponent!('v_1_0', false))
      expect(select.value).toBe('upper')
      act(() =>
        editor.getState().commit(
          setSceneSkinWeights(
            source,
            'skin',
            Object.fromEntries(
              Object.keys(source.skins![0]!.weights).map((id) => [
                id,
                [
                  { jointId: 'upper', weight: 0 },
                  { jointId: 'lower', weight: 1 },
                ],
              ]),
            ),
          ),
        ),
      )
      expect(select.value).toBe('upper')
      expect(ports.at(-1)!.weightTarget?.jointId).toBe('upper')
      act(() =>
        editor.getState().commit(removeSceneSkinJoint(editor.getState().asset, 'skin', 'upper')),
      )
      expect(select.value).toBe('')
      expect(ports.at(-1)!.weightTarget).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(select.value).toBe('')
      fireEvent.change(select, { target: { value: 'lower' } })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.finishFaces }))
      expect(screen.queryByLabelText(copy.title)).toBeNull()
      expect(ports.at(-1)!.weightTarget).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      expect((screen.getByLabelText(copy.title) as HTMLSelectElement).value).toBe('')
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('bone membership controls explain use, review additions/removals and leave authorial nodes and weights untouched', async () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinBinding
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      openInspector()
      const trigger = screen.getByRole('button', { name: copy.open }),
        open = async () => {
          trigger.focus()
          fireEvent.click(trigger)
          const modal = within(screen.getByRole('dialog', { name: copy.title }))
          await waitFor(() => expect(modal.queryByText(copy.linked)).not.toBeNull())
          return modal
        }
      let modal = await open()
      expect(
        (modal.getByRole('button', { name: copy.removeJointNamed('Braço') }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(modal.getAllByText(copy.jointInUse(3))).toHaveLength(2)
      fireEvent.change(modal.getByLabelText(copy.chooseNewJoint), { target: { value: 'rig' } })
      fireEvent.click(modal.getByRole('button', { name: copy.addJoint }))
      expect(modal.getByText(copy.addJointHint)).not.toBeNull()
      expect(document.activeElement).toBe(modal.getByRole('heading', { name: copy.addJoint }))
      expect(modal.queryByLabelText(copy.chooseNewJoint)).toBeNull()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(modal.getByRole('button', { name: copy.confirmAddJoint }))
      expect(screen.queryByRole('dialog', { name: copy.title })).toBeNull()
      expect(document.activeElement).toBe(trigger)
      const added = editor.getState().asset
      expect(added.skins![0]!.joints).toHaveLength(3)
      expect(added.skins![0]!.weights).toBe(source.skins![0]!.weights)
      modal = await open()
      expect(modal.getByText(copy.noNewJoints)).not.toBeNull()
      expect(modal.getByText(copy.jointUnused)).not.toBeNull()
      fireEvent.click(modal.getByRole('button', { name: copy.removeJointNamed('Corpo') }))
      expect(modal.getByText(copy.removeJointHint)).not.toBeNull()
      expect(editor.getState().asset).toBe(added)
      fireEvent.click(modal.getByRole('button', { name: copy.cancel }))
      expect(modal.queryByRole('button', { name: copy.confirmRemoveJoint })).toBeNull()
      expect(editor.getState().asset).toBe(added)
      fireEvent.click(modal.getByRole('button', { name: copy.removeJointNamed('Corpo') }))
      fireEvent.click(modal.getByRole('button', { name: copy.confirmRemoveJoint }))
      expect(editor.getState().asset.skins).toEqual(source.skins)
      expect(editor.getState().asset.nodes).toBe(source.nodes)
      expect(editor.getState().contentRevision).toBe(2)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.skins).toEqual(added.skins)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.skins).toEqual(source.skins)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test.each([
    'vertex',
    'edge',
    'face',
  ] as const)('%s weight selection requires an explicit common mixture, changes only its points and creates one undo', async (mode) => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinWeights,
      chosen = mode === 'face' ? ['v_0_0', 'v_1_0', 'v_0_1', 'v_1_1'] : ['v_0_0', 'v_1_0']
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      if (mode !== 'face')
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes[mode] }))
      act(() => {
        const port = ports.at(-1)!
        if (mode === 'vertex') {
          port.callbacks.selectComponent!('v_0_0', false)
          port.callbacks.selectComponent!('v_1_0', true)
        } else
          port.callbacks.selectComponent!(
            mode === 'face' ? 'f_0_0' : meshEdgeKey('v_0_0', 'v_1_0'),
            false,
          )
      })
      openInspector()
      const summary = screen.getByText(copy.title),
        details = summary.closest('details')!,
        panel = within(details)
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() => expect(panel.queryByText(copy.mixed)).not.toBeNull())
      expect(
        panel.getAllByRole('checkbox').every((node) => !(node as HTMLInputElement).checked),
      ).toBe(true)
      expect(panel.queryAllByRole('spinbutton')).toHaveLength(0)
      fireEvent.click(panel.getByRole('checkbox', { name: 'Braço' }))
      fireEvent.click(panel.getByRole('checkbox', { name: 'Antebraço' }))
      fireEvent.click(panel.getByRole('button', { name: copy.equal }))
      fireEvent.click(panel.getByRole('button', { name: copy.review }))
      expect(document.activeElement).toBe(panel.getByRole('heading', { name: copy.reviewing }))
      expect(panel.getByText(copy.impact(chosen.length))).not.toBeNull()
      expect((panel.getByRole('button', { name: copy.apply }) as HTMLButtonElement).disabled).toBe(
        true,
      )
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      const accept = panel.getByRole('checkbox', { name: copy.acceptMixed })
      accept.focus()
      fireEvent.click(accept)
      expect(document.activeElement).toBe(accept)
      fireEvent.click(panel.getByRole('button', { name: copy.apply }))
      const next = editor.getState().asset,
        before = source.skins![0]!,
        after = next.skins![0]!
      expect(document.activeElement).toBe(summary)
      expect(ports.at(-1)!.faces?.mode).toBe(mode)
      expect(next.nodes).toBe(source.nodes)
      expect(next.geometries).toBe(source.geometries)
      expect(after.joints).toBe(before.joints)
      for (const [vertexId, weights] of Object.entries(after.weights)) {
        if (chosen.includes(vertexId))
          expect(weights).toEqual([
            { jointId: 'upper', weight: 0.5 },
            { jointId: 'lower', weight: 0.5 },
          ])
        else expect(weights).toBe(before.weights[vertexId]!)
      }
      expect(editor.getState().contentRevision).toBe(1)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset).toEqual({
        ...source,
        updatedAt: editor.getState().asset.updatedAt,
      })
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect(editor.getState().asset).toEqual({
        ...next,
        updatedAt: editor.getState().asset.updatedAt,
      })
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('opening and confirming untouched displayed weights preserves Double and zero slots without history', async () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinWeights,
      serialized = JSON.stringify(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      openInspector()
      const details = screen.getByText(copy.title).closest('details')!,
        panel = within(details)
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() => expect(panel.queryByText(copy.choosePoints)).not.toBeNull())
      for (const [vertexId, text] of [
        ['v_1_0', '33.3333'],
        ['v_0_0', '0'],
      ]) {
        act(() => ports.at(-1)!.callbacks.selectComponent!(vertexId!, false))
        await waitFor(() => expect(panel.queryByText(copy.same)).not.toBeNull())
        expect((panel.getByLabelText(copy.percent('Braço')) as HTMLInputElement).value).toBe(text!)
        expect(panel.getAllByRole('spinbutton')).toHaveLength(2)
        fireEvent.click(panel.getByRole('button', { name: copy.review }))
        expect(panel.queryByRole('checkbox', { name: copy.acceptMixed })).toBeNull()
        fireEvent.click(panel.getByRole('button', { name: copy.apply }))
        expect(editor.getState().asset).toBe(source)
        expect(JSON.stringify(editor.getState().asset)).toBe(serialized)
        expect(editor.getState().contentRevision).toBe(0)
        expect(editor.getState().canUndo).toBe(false)
      }
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('weight drafts need explicit normalization and are revoked by selection, revision, close, blur and context loss', async () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinWeights
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      act(() => ports.at(-1)!.callbacks.selectComponent!('v_1_0', false))
      openInspector()
      const details = screen.getByText(copy.title).closest('details')!,
        panel = within(details),
        toggle = (open: boolean) =>
          act(() => {
            details.open = open
            fireEvent(details, new Event('toggle'))
          }),
        value = () => (panel.getByLabelText(copy.percent('Braço')) as HTMLInputElement).value,
        prepare = () => {
          fireEvent.change(panel.getByLabelText(copy.percent('Braço')), { target: { value: '20' } })
          fireEvent.change(panel.getByLabelText(copy.percent('Antebraço')), {
            target: { value: '60' },
          })
          fireEvent.click(panel.getByRole('button', { name: copy.normalize }))
          expect(value()).toBe('25')
          fireEvent.click(panel.getByRole('button', { name: copy.review }))
          expect(panel.queryByRole('button', { name: copy.apply })).not.toBeNull()
        }
      toggle(true)
      await waitFor(() => expect(panel.queryByText(copy.same)).not.toBeNull())
      fireEvent.change(panel.getByLabelText(copy.percent('Braço')), { target: { value: '' } })
      fireEvent.click(panel.getByRole('button', { name: copy.review }))
      expect(panel.getByRole('alert').textContent).toContain(copy.invalid)
      fireEvent.change(panel.getByLabelText(copy.percent('Braço')), { target: { value: '20' } })
      fireEvent.click(panel.getByRole('button', { name: copy.review }))
      expect(panel.queryByRole('button', { name: copy.apply })).toBeNull()
      expect(value()).toBe('20')
      prepare()
      fireEvent.keyDown(panel.getByRole('heading', { name: copy.reviewing }), { key: 'Escape' })
      expect(document.activeElement).toBe(panel.getByRole('button', { name: copy.review }))
      expect(ports.at(-1)!.faces?.mode).toBe('vertex')
      expect(value()).toBe('25')
      prepare()
      fireEvent.click(panel.getByRole('button', { name: copy.cancel }))
      expect(document.activeElement).toBe(panel.getByRole('button', { name: copy.review }))
      for (const interrupt of [
        () => fireEvent(window, new Event('blur')),
        () => {
          const hidden = Object.getOwnPropertyDescriptor(document, 'hidden')
          Object.defineProperty(document, 'hidden', { configurable: true, value: true })
          try {
            fireEvent(document, new Event('visibilitychange'))
          } finally {
            if (hidden) Object.defineProperty(document, 'hidden', hidden)
            else Reflect.deleteProperty(document, 'hidden')
          }
        },
        () => fireEvent(document, new Event('webglcontextlost')),
        () => {
          toggle(false)
          toggle(true)
        },
        () => act(() => ports.at(-1)!.callbacks.selectComponent!('v_0_0', false)),
      ]) {
        prepare()
        interrupt()
        await waitFor(() => expect(panel.queryByText(copy.same)).not.toBeNull())
        expect(panel.queryByRole('button', { name: copy.apply })).toBeNull()
        expect(['33.3333', '0']).toContain(value())
        expect(editor.getState().asset).toBe(source)
        expect(editor.getState().canUndo).toBe(false)
      }
      prepare()
      act(() => editor.getState().commit({ ...source, name: 'Outra revisão' }))
      expect(panel.queryByRole('button', { name: copy.apply })).toBeNull()
      expect(value()).toBe('0')
      expect(editor.getState().asset.skins).toBe(source.skins)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset).toEqual({
        ...source,
        updatedAt: editor.getState().asset.updatedAt,
      })
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('support visibility is session-only and temporarily leaves component editing to its own picking tools', async () => {
    const source = makeSceneSkinFixture().document,
      { editor, view, ports } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      const button = screen.getByRole('button', { name: COPY.scene.supportGuides })
      expect(button.getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(button)
      expect(ports.at(-1)!.supports).toBe(true)
      expect(screen.getByText(COPY.scene.supportGuidesHint)).not.toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      expect(screen.queryByText(COPY.scene.skinWeights.title)).toBeNull()
      expect(ports.at(-1)!.supports).toBe(false)
      expect(screen.queryByRole('button', { name: COPY.scene.supportGuides })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.finishFaces }))
      expect(ports.at(-1)!.supports).toBe(true)
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('weights limit the chosen mixture to four existing bones and removal never silently redistributes force', async () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input
    fixture.document.nodes.push(
      ...['extra-a', 'extra-b'].map((id) => ({ ...fixture.document.nodes[3]!, id, name: id })),
    )
    const source = createSceneSkin(
        fixture.document,
        { ...input, jointIds: [...input.jointIds, 'rig', 'extra-a', 'extra-b'] },
        () => id,
      ),
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinWeights
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      act(() => ports.at(-1)!.callbacks.selectComponent!('v_1_0', false))
      openInspector()
      const details = screen.getByText(copy.title).closest('details')!,
        panel = within(details)
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() => expect(panel.queryByText(copy.same)).not.toBeNull())
      fireEvent.click(panel.getByRole('checkbox', { name: 'Corpo' }))
      fireEvent.click(panel.getByRole('checkbox', { name: 'extra-a' }))
      expect((panel.getByRole('checkbox', { name: 'extra-b' }) as HTMLInputElement).disabled).toBe(
        true,
      )
      expect(panel.getAllByRole('spinbutton')).toHaveLength(4)
      fireEvent.click(panel.getByRole('button', { name: copy.equal }))
      fireEvent.click(panel.getByRole('checkbox', { name: 'Corpo' }))
      expect((panel.getByRole('checkbox', { name: 'extra-b' }) as HTMLInputElement).disabled).toBe(
        false,
      )
      expect(
        panel.getAllByRole('spinbutton').map((node) => (node as HTMLInputElement).value),
      ).toEqual(['25', '25', '25'])
      fireEvent.click(panel.getByRole('button', { name: copy.review }))
      expect(panel.queryByRole('button', { name: copy.apply })).toBeNull()
      expect(editor.getState().asset).toBe(source)
      fireEvent.click(panel.getByRole('button', { name: copy.normalize }))
      fireEvent.click(panel.getByRole('button', { name: copy.review }))
      fireEvent.click(panel.getByRole('button', { name: copy.apply }))
      const skin = editor.getState().asset.skins![0]!
      expect(skin.weights.v_1_0).toEqual(
        ['upper', 'lower', 'extra-a'].map((jointId) => ({ jointId, weight: 1 / 3 })),
      )
      expect(skin.weights.v_0_0).toBe(source.skins![0]!.weights.v_0_0)
      expect(skin.joints).toBe(source.skins![0]!.joints)
      expect(editor.getState().contentRevision).toBe(1)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('skin dialog reviews real suggestions before one undoable bind, blocks shortcuts and restores focus', async () => {
    const source = makeSceneSkinFixture().document,
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinBinding
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      openInspector()
      const trigger = screen.getByRole('button', { name: copy.open })
      trigger.focus()
      fireEvent.click(trigger)
      const dialog = screen.getByRole('dialog', { name: copy.title }),
        modal = within(dialog)
      await waitFor(() => expect(modal.queryByText(copy.intro)).not.toBeNull())
      expect(dialog.contains(document.activeElement)).toBe(true)
      expect(
        (modal.getByRole('button', { name: copy.prepare }) as HTMLButtonElement).disabled,
      ).toBe(true)
      fireEvent.click(modal.getByRole('checkbox', { name: `Braço ${copy.group}` }))
      fireEvent.click(modal.getByRole('checkbox', { name: `Antebraço ${copy.locator}` }))
      fireEvent.click(modal.getByRole('button', { name: copy.prepare }))
      await waitFor(() => expect(modal.queryByRole('button', { name: copy.apply })).not.toBeNull())
      expect(document.activeElement).toBe(modal.getByRole('heading', { name: copy.review }))
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.keyDown(dialog, { key: 'Delete' })
      fireEvent.keyDown(dialog, { key: 'z', ctrlKey: true })
      expect(editor.getState().asset).toBe(source)
      fireEvent.click(modal.getByRole('button', { name: copy.apply }))
      expect(screen.queryByRole('dialog', { name: copy.title })).toBeNull()
      expect(document.activeElement).toBe(trigger)
      expect(editor.getState().asset.skins?.[0]?.nodeId).toBe('part-0')
      expect(editor.getState().asset.nodes).toBe(source.nodes)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.skins).toBeUndefined()
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      const linked = editor.getState().asset
      fireEvent.click(trigger)
      const bound = within(screen.getByRole('dialog', { name: copy.title }))
      await waitFor(() => expect(bound.queryByText(copy.linked)).not.toBeNull())
      expect(bound.queryByRole('button', { name: copy.prepare })).toBeNull()
      fireEvent.click(bound.getByRole('button', { name: copy.remove }))
      expect(bound.getByText(copy.removeHint)).not.toBeNull()
      expect(editor.getState().asset).toBe(linked)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: copy.title })).toBeNull()
      expect(document.activeElement).toBe(trigger)
      expect(editor.getState().asset).toBe(linked)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('changing the selected piece closes skin review; inherited locks disable binding and no supports are invented', async () => {
    const fixture = makeSceneSkinFixture().document,
      source = {
        ...fixture,
        nodes: fixture.nodes.map((node) => (node.id === 'rig' ? { ...node, locked: true } : node)),
      },
      { editor, view, ports, openInspector } = setup(source),
      copy = COPY.scene.skinBinding
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.open }))
      const modal = within(screen.getByRole('dialog', { name: copy.title }))
      await waitFor(() => expect(modal.queryByText(copy.locked)).not.toBeNull())
      expect(
        (modal.getByRole('button', { name: copy.prepare }) as HTMLButtonElement).disabled,
      ).toBe(true)
      act(() => ports.at(-1)!.callbacks.select('upper', false))
      expect(screen.queryByRole('dialog', { name: copy.title })).toBeNull()
      expect(editor.getState().asset).toBe(source)
      act(() =>
        editor.getState().commit({ ...fixture, nodes: [{ ...fixture.nodes[0]!, parentId: null }] }),
      )
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: copy.open }))
      const empty = within(screen.getByRole('dialog', { name: copy.title }))
      await waitFor(() => expect(empty.queryByText(copy.noJoints)).not.toBeNull())
      expect(empty.queryAllByRole('checkbox')).toHaveLength(0)
      expect(
        (empty.getByRole('button', { name: copy.prepare }) as HTMLButtonElement).disabled,
      ).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('bound pieces explain form-base editing and closing it changes neither weights nor history', async () => {
    const {
        document,
        input: { id, ...input },
      } = makeSceneSkinFixture(),
      source = createSceneSkin(document, input, () => id),
      before = structuredClone(source),
      { editor, view, ports } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => ports.at(-1)!.callbacks.select('part-0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
      expect(screen.getByText(COPY.scene.skinBaseHint) !== null).toBe(true)
      expect(ports.at(-1)!.faces?.nodeId).toBe('part-0')
      expect(editor.getState().asset).toEqual(before)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.finishFaces }))
      expect(screen.queryByText(COPY.scene.skinBaseHint) === null).toBe(true)
      expect(ports.at(-1)!.faces).toBeNull()
      expect(editor.getState().asset).toEqual(before)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('GLB review requires explicit loss consent, preserves the source, blocks shortcuts and restores focus on close', async () => {
    const asset = animatedScene()
    asset.nodes[1]!.hidden = true
    const { editor, view } = setup(asset),
      copy = COPY.scene.glbExport
    const urls = spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const download = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      const trigger = screen.getByRole('button', { name: copy.open })
      trigger.focus()
      fireEvent.click(trigger)
      const dialog = screen.getByRole('dialog', { name: copy.title }),
        modal = within(dialog)
      expect(dialog.contains(document.activeElement)).toBe(true)
      expect(modal.queryByRole('button', { name: copy.download }) === null).toBe(true)
      expect(urls).toHaveBeenCalledTimes(0)
      fireEvent.click(modal.getByRole('button', { name: copy.prepare }))
      await waitFor(() =>
        expect(modal.queryByRole('button', { name: copy.download }) !== null).toBe(true),
      )
      const checkbox = modal.getByRole('checkbox', { name: copy.accept }) as HTMLInputElement
      expect(checkbox.checked).toBe(false)
      expect(
        (modal.getByRole('button', { name: copy.download }) as HTMLButtonElement).disabled,
      ).toBe(true)
      expect(modal.getAllByRole('listitem').length).toBe(1)
      expect(modal.getByText(copy.issues['hidden-node'](1)) !== null).toBe(true)
      fireEvent.keyDown(dialog, { key: 'Delete' })
      fireEvent.keyDown(dialog, { key: 'z', ctrlKey: true })
      fireEvent.click(checkbox)
      expect(
        (modal.getByRole('button', { name: copy.download }) as HTMLButtonElement).disabled,
      ).toBe(false)
      fireEvent.click(modal.getByRole('button', { name: copy.download }))
      expect(urls).toHaveBeenCalledTimes(1)
      expect(modal.getByText(copy.downloaded) !== null).toBe(true)
      expect(editor.getState().asset).toBe(asset)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.keyDown(dialog, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: copy.title }) === null).toBe(true)
      expect(document.activeElement === trigger).toBe(true)
      fireEvent.click(trigger)
      expect(screen.queryByRole('checkbox', { name: copy.accept }) === null).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
      urls.mockRestore()
      download.mockRestore()
    }
  })
  test('opening GLB review requires resolving an unrecorded pose and pauses playback before capturing canonical content', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene()),
      copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length > 0).toBe(true))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: copy.animationRecord }) !== null).toBe(true),
      )
      const asset = editor.getState().asset,
        port = ports.at(-1)!
      act(() => {
        expect(port.callbacks.transform!.begin()).toBe(true)
        const delta = identityMatrix()
        delta[12] = 7
        expect(port.callbacks.transform!.preview(delta)).toBe(true)
        port.callbacks.transform!.end(true)
      })
      expect(
        (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.open }))
      expect(screen.queryByRole('dialog', { name: copy.glbExport.title })).toBeNull()
      expect(screen.getByText(copy.animationPosePending)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: copy.animationPoseCancel }))
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.open }))
      expect(
        (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      expect(screen.queryByText(copy.animationPosePending) === null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.prepare }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: copy.glbExport.download }) !== null).toBe(true),
      )
      expect(editor.getState().asset).toBe(asset)
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.close }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationPlay }))
      expect(screen.queryByRole('button', { name: copy.animationPause }) !== null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.open }))
      expect(screen.queryByRole('button', { name: copy.animationPause }) === null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.prepare }))
      fireEvent.click(screen.getByRole('button', { name: copy.glbExport.cancel }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: copy.glbExport.prepare }) !== null).toBe(true),
      )
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('visual poses preview through the existing viewport, explicitly record, undo, and support opt-in automatic recording', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length > 0).toBe(true))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: copy.animationRecord }) !== null).toBe(true),
      )
      const before = editor.getState().asset,
        port = ports.at(-1)!,
        updates = port.documentUpdates
      expect((screen.getByRole('button', { name: copy.move }) as HTMLButtonElement).disabled).toBe(
        false,
      )
      expect((screen.getByLabelText(copy.animationPoseAutoKey) as HTMLInputElement).checked).toBe(
        false,
      )
      act(() => {
        expect(port.callbacks.transform!.begin()).toBe(true)
        for (let i = 1; i <= 30; i++) {
          const delta = identityMatrix()
          delta[12] = i / 10
          expect(port.callbacks.transform!.preview(delta)).toBe(true)
        }
        port.callbacks.transform!.end(true)
      })
      expect(editor.getState().asset).toBe(before)
      expect(editor.getState().canUndo).toBe(false)
      expect(port.documentUpdates).toBe(updates)
      expect(port.poses.at(-1)?.worldMatrices.get('body')?.[12]).toBe(3)
      expect(screen.queryByRole('button', { name: copy.animationRecord }) === null).toBe(true)
      const record = screen.getByRole('button', { name: copy.animationPoseRecord })
      record.focus()
      fireEvent.click(record)
      expect(document.activeElement === record).toBe(true)
      expect(editor.getState().asset.nodes).toBe(before.nodes)
      expect(editor.getState().asset.animations![0]!.tracks[0]!.keys[0]!.value).toEqual([3, 0, 0])
      expect(port.documentUpdates).toBe(updates + 1)
      expect(port.poses.at(-1)?.source).toBe(editor.getState().asset)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByLabelText(copy.animationPoseAutoKey))
      const revision = editor.getState().contentRevision
      act(() => {
        expect(port.callbacks.transform!.begin()).toBe(true)
        const delta = identityMatrix()
        delta[13] = 2
        expect(port.callbacks.transform!.preview(delta)).toBe(true)
        expect(editor.getState().contentRevision).toBe(revision)
        port.callbacks.transform!.end(true)
      })
      expect(editor.getState().contentRevision).toBe(revision + 1)
      expect(editor.getState().asset.animations![0]!.tracks[0]!.keys[0]!.value).toEqual([0, 2, 0])
      expect(port.poses.at(-1)?.source).toBe(editor.getState().asset)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('pose drafts cannot survive selection, seek, blur, hidden page, context loss or Escape, and late pointer-up never auto-records', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length > 0).toBe(true))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: copy.animationRecord }) !== null).toBe(true),
      )
      fireEvent.click(screen.getByLabelText(copy.animationPoseAutoKey))
      const before = editor.getState().asset,
        port = ports.at(-1)!
      for (const interrupt of [
        () => fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') })),
        () => fireEvent.click(screen.getByRole('button', { name: copy.animationNext })),
        () => window.dispatchEvent(new Event('blur')),
        () => {
          const original = Object.getOwnPropertyDescriptor(document, 'hidden')
          Object.defineProperty(document, 'hidden', { configurable: true, value: true })
          try {
            document.dispatchEvent(new Event('visibilitychange'))
          } finally {
            if (original) Object.defineProperty(document, 'hidden', original)
            else Reflect.deleteProperty(document, 'hidden')
          }
        },
        () => {
          port.callbacks.contextLost(true)
          port.callbacks.contextLost(false)
        },
        () =>
          fireEvent.keyDown(screen.getByRole('region', { name: copy.title }), { key: 'Escape' }),
      ]) {
        act(() => {
          expect(port.callbacks.transform!.begin()).toBe(true)
          const delta = identityMatrix()
          delta[12] = 3
          expect(port.callbacks.transform!.preview(delta)).toBe(true)
        })
        act(interrupt)
        act(() => port.callbacks.transform!.end(true))
        expect(editor.getState().asset).toBe(before)
        expect(editor.getState().canUndo).toBe(false)
        expect(screen.queryByText(copy.animationPosePending) === null).toBe(true)
        expect(
          (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
            .disabled,
        ).toBe(true)
      }
      act(() => {
        expect(port.callbacks.transform!.begin()).toBe(true)
        const delta = identityMatrix()
        delta[12] = 3
        port.callbacks.transform!.preview(delta)
      })
      view.unmount()
      port.callbacks.transform!.end(true)
      expect(editor.getState().asset).toBe(before)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('animation presets preview in the existing viewport without writes, cancel restores the previous cursor, and confirmation creates one editable undo', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() => expect(screen.queryByText(copy.animationPresetTitle) !== null).toBe(true))
      fireEvent.click(screen.getByRole('button', { name: copy.animationNext }))
      const before = editor.getState().asset,
        port = ports.at(-1)!,
        updates = port.documentUpdates
      const details = screen.getByText(copy.animationPresetTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      const presets = within(details)
      fireEvent.change(presets.getByLabelText(copy.animationPresetKind), {
        target: { value: 'spin' },
      })
      fireEvent.change(presets.getByLabelText(copy.animationPresetTurns), {
        target: { value: '-1' },
      })
      fireEvent.change(presets.getByLabelText(copy.animationDuration), {
        target: { value: '3.123456789123' },
      })
      fireEvent.click(presets.getByRole('button', { name: copy.animationPresetPrepare }))
      expect(presets.getByRole('button', { name: copy.animationPresetConfirm })).toBeTruthy()
      expect(editor.getState().asset).toBe(before)
      expect(editor.getState().contentRevision).toBe(0)
      expect(editor.getState().canUndo).toBe(false)
      await editor.getState().flush()
      expect(editor.getState().asset).toBe(before)
      expect(port.documentUpdates).toBe(updates)
      expect(port.poses.at(-1)?.source).toBe(before)
      expect(screen.queryByRole('button', { name: copy.animationRecord })).toBeNull()
      fireEvent.change(screen.getByRole('slider', { name: copy.animationTime }), {
        target: { value: '1' },
      })
      expect(port.poses.at(-1)?.time).toBe(1)
      expect(port.documentUpdates).toBe(updates)
      fireEvent.click(presets.getByRole('button', { name: copy.animationPresetCancel }))
      expect((screen.getByLabelText(copy.animationSeconds) as HTMLInputElement).value).toBe(
        '1.123456789123',
      )
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(presets.getByRole('button', { name: copy.animationPresetPrepare }))
      fireEvent.change(screen.getByRole('slider', { name: copy.animationTime }), {
        target: { value: '1' },
      })
      fireEvent.click(presets.getByRole('button', { name: copy.animationPresetConfirm }))
      const saved = editor.getState().asset
      expect(saved.animations).toHaveLength(2)
      expect(saved.animations![1]!.tracks[0]!.keys).toHaveLength(5)
      expect(saved.animations![1]!.duration).toBe(3.123456789123)
      expect(saved.nodes).toBe(before.nodes)
      expect(port.documentUpdates).toBe(updates + 1)
      expect(port.poses.at(-1)?.source).toBe(saved)
      expect(port.poses.at(-1)?.time).toBe(1)
      expect(screen.getByRole('button', { name: copy.animationRecord })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect(editor.getState().asset.animations).toEqual(saved.animations)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation preset drafts cannot survive parameter, selection, clip, revision, visibility or graphics-context changes', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() => expect(screen.queryByText(copy.animationPresetTitle) !== null).toBe(true))
      const details = screen.getByText(copy.animationPresetTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      const presets = within(details)
      const before = editor.getState().asset
      for (const cancel of [
        () =>
          fireEvent.change(presets.getByLabelText(copy.animationDuration), {
            target: { value: '3' },
          }),
        () =>
          fireEvent.keyDown(screen.getByRole('region', { name: copy.title }), { key: 'Escape' }),
        () => act(() => window.dispatchEvent(new Event('blur'))),
        () => {
          const hidden = Object.getOwnPropertyDescriptor(document, 'hidden')
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
          try {
            act(() => document.dispatchEvent(new Event('visibilitychange')))
          } finally {
            if (hidden) Object.defineProperty(document, 'hidden', hidden)
            else Reflect.deleteProperty(document, 'hidden')
          }
        },
        () => fireEvent.click(screen.getByRole('button', { name: copy.select('asa') })),
        () =>
          fireEvent.change(screen.getByLabelText(copy.animationChoose), { target: { value: '' } }),
        () => act(() => ports.at(-1)!.callbacks.contextLost(true)),
      ]) {
        fireEvent.click(presets.getByRole('button', { name: copy.animationPresetPrepare }))
        expect(presets.queryByRole('button', { name: copy.animationPresetConfirm }) !== null).toBe(
          true,
        )
        cancel()
        expect(presets.queryByRole('button', { name: copy.animationPresetConfirm })).toBeNull()
        expect(editor.getState().asset).toBe(before)
        expect(editor.getState().canUndo).toBe(false)
      }
      act(() => ports.at(-1)!.callbacks.contextLost(false))
      fireEvent.click(presets.getByRole('button', { name: copy.animationPresetPrepare }))
      act(() => editor.getState().commit({ ...before, name: 'Outra revisão' }))
      expect(presets.queryByRole('button', { name: copy.animationPresetConfirm })).toBeNull()
      expect(editor.getState().asset.animations).toEqual(before.animations)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation clipboard pastes an exact local pose into another piece, mirrors without changing the clipboard, and undoes all channels together', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    const openPoses = () => {
      const details = screen.getByText(copy.animationPoseTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
    }
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() => expect(screen.queryByText(copy.animationPoseTitle) !== null).toBe(true))
      fireEvent.click(screen.getByRole('button', { name: copy.animationNext }))
      openPoses()
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: copy.animationPoseCopy }))
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: copy.select('asa') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationPoseMirror }))
      const tracks = editor
        .getState()
        .asset.animations![0]!.tracks.filter((track) => track.nodeId === 'wing')
      expect(tracks).toHaveLength(3)
      expect(tracks[0]!.keys[0]!.value).toEqual([-1.123456789, Number.MIN_VALUE, -2.234567891])
      expect(tracks.every((track) => track.keys[0]!.time === 1.123456789123)).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      fireEvent.click(screen.getByRole('button', { name: copy.animationPosePaste }))
      expect(
        editor
          .getState()
          .asset.animations![0]!.tracks.find(
            (track) => track.nodeId === 'wing' && track.channel === 'translation',
          )!.keys[0]!.value,
      ).toEqual([1.123456789, Number.MIN_VALUE, -2.234567891])
      expect(editor.getState().asset.nodes).toBe(before.nodes)
      fireEvent.click(screen.getByRole('button', { name: copy.animationPlay }))
      expect(screen.queryByRole('button', { name: copy.animationPosePaste })).toBeNull()
      fireEvent.keyDown(screen.getByRole('region', { name: copy.title }), { key: 'Escape' })
      openPoses()
      expect(screen.getByText(copy.animationPoseCopied('corpo'))).toBeTruthy()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('pose sets map nested supports explicitly, withdraw edited previews, retain the clipboard and record one undo', async () => {
    const asset = makeSceneTwoBoneFixture()
    asset.animations![0]!.tracks = ['root', 'middle'].map((nodeId, i) => ({
      nodeId,
      channel: 'rotation',
      keys: [
        {
          time: 0,
          value: [0, 0, Math.sin((i + 1) * 0.2), Math.cos((i + 1) * 0.2)],
          interpolation: 'smooth',
        },
      ],
    }))
    const { editor, view, ports, openInspector } = setup(asset)
    const copy = COPY.scene,
      setCopy = copy.poseSet
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => {
        ports.at(-1)!.callbacks.select('root', false)
        ports.at(-1)!.callbacks.select('middle', true)
      })
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      const details = (await screen.findByText(setCopy.title, { selector: 'summary' })).closest(
        'details',
      )!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      fireEvent.click(screen.getByRole('button', { name: setCopy.copy }))
      expect(screen.getByText(setCopy.count(2))).toBeTruthy()
      expect(within(details).getAllByRole('combobox')).toHaveLength(2)
      fireEvent.change(screen.getByLabelText(setCopy.target(setCopy.label('root', 'root'))), {
        target: { value: 'tip' },
      })
      fireEvent.click(
        screen.getByRole('button', {
          name: setCopy.pair(setCopy.label('middle', 'middle'), setCopy.label('middle', 'middle')),
        }),
      )
      fireEvent.change(screen.getByLabelText(setCopy.target(setCopy.label('middle', 'middle'))), {
        target: { value: 'tip' },
      })
      expect(screen.getByText(setCopy.duplicate)).toBeTruthy()
      expect(
        (screen.getByRole('button', { name: setCopy.preview }) as HTMLButtonElement).disabled,
      ).toBe(true)
      fireEvent.change(screen.getByLabelText(setCopy.target(setCopy.label('middle', 'middle'))), {
        target: { value: 'root' },
      })
      fireEvent.change(screen.getByLabelText(setCopy.axis), { target: { value: 'x' } })
      fireEvent.click(screen.getByLabelText(copy.animationPoseAutoKey))
      const expected = pasteSceneAnimationPoseSet(
        asset,
        'clip',
        0,
        captureSceneAnimationPoseSet(asset, 'clip', ['root', 'middle'], 0),
        [
          { sourceId: 'root', targetId: 'tip' },
          { sourceId: 'middle', targetId: 'root' },
        ],
        'x',
      )
      fireEvent.click(screen.getByRole('button', { name: setCopy.preview }))
      expect(editor.getState().asset).toBe(asset)
      expect(ports.at(-1)!.poses.at(-1)?.worldMatrices).toEqual(
        prepareSceneAnimation(expected, 'clip').sample(0, false).worldMatrices,
      )
      for (const name of [copy.move, copy.rotate, copy.scale])
        expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true)
      fireEvent.change(screen.getByLabelText(setCopy.axis), { target: { value: 'y' } })
      expect(
        (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
      fireEvent.change(screen.getByLabelText(setCopy.axis), { target: { value: 'x' } })
      fireEvent.click(screen.getByRole('button', { name: setCopy.preview }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationPoseRecord }))
      expect(editor.getState().asset.animations).toEqual(expected.animations)
      expect(screen.getByText(setCopy.count(2))).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(asset.animations)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('pose-set close, Escape, transport and context changes cancel review without losing source data', async () => {
    const { editor, view, ports, openInspector } = setup(makeSceneTwoBoneFixture())
    const copy = COPY.scene,
      setCopy = copy.poseSet
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('root', false))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await screen.findByText(setCopy.title, { selector: 'summary' })
      const source = editor.getState().asset
      for (const reason of [
        'close',
        'escape',
        'seek',
        'blur',
        'thumbnail',
        'selection',
        'context',
      ] as const) {
        const details = screen.getByText(setCopy.title, { selector: 'summary' }).closest('details')!
        act(() => {
          details.open = true
          fireEvent(details, new Event('toggle'))
        })
        fireEvent.click(screen.getByRole('button', { name: setCopy.copy }))
        fireEvent.click(screen.getByRole('button', { name: setCopy.preview }))
        expect(
          (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
            .disabled,
        ).toBe(false)
        act(() => {
          if (reason === 'close') {
            details.open = false
            fireEvent(details, new Event('toggle'))
          }
          if (reason === 'escape')
            fireEvent.keyDown(screen.getByLabelText(setCopy.axis), { key: 'Escape' })
          if (reason === 'seek')
            fireEvent.change(screen.getByRole('slider', { name: copy.animationTime }), {
              target: { value: '0.75' },
            })
          if (reason === 'blur') window.dispatchEvent(new Event('blur'))
          if (reason === 'thumbnail') editor.getState().setThumb('latest')
          if (reason === 'selection') ports.at(-1)!.callbacks.select('middle', false)
          if (reason === 'context') {
            ports.at(-1)!.callbacks.contextLost(true)
            ports.at(-1)!.callbacks.contextLost(false)
          }
        })
        expect(
          (screen.getByRole('button', { name: copy.animationPoseRecord }) as HTMLButtonElement)
            .disabled,
        ).toBe(reason !== 'thumbnail')
        expect(editor.getState().asset.animations).toEqual(source.animations)
        expect(editor.getState().canUndo).toBe(false)
      }
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('pose-set names remain distinguishable, locks and incompatible clips explain refusal, and another creation clears the clipboard', async () => {
    const asset = makeSceneTwoBoneFixture()
    asset.nodes = asset.nodes.map((node) =>
      ['root', 'middle'].includes(node.id) ? { ...node, name: 'Apoio' } : node,
    )
    const { editor, view, ports, openInspector } = setup(asset)
    const copy = COPY.scene,
      setCopy = copy.poseSet
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => {
        ports.at(-1)!.callbacks.select('root', false)
        ports.at(-1)!.callbacks.select('middle', true)
      })
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      const details = (await screen.findByText(setCopy.title, { selector: 'summary' })).closest(
        'details',
      )!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      fireEvent.click(screen.getByRole('button', { name: setCopy.copy }))
      expect(
        screen.getByLabelText(setCopy.target(setCopy.label('Apoio', 'root', true))),
      ).toBeTruthy()
      const destinations = screen.getByRole('combobox', {
        name: setCopy.target(setCopy.label('Apoio', 'root', true)),
      })
      expect(
        within(destinations).getByRole('option', { name: setCopy.label('Apoio', 'root', true) }),
      ).toBeTruthy()
      expect(
        within(destinations).getByRole('option', { name: setCopy.label('Apoio', 'middle', true) }),
      ).toBeTruthy()
      act(() =>
        editor.getState().commit({
          ...asset,
          nodes: asset.nodes.map((node) => (node.id === 'tip' ? { ...node, locked: true } : node)),
        }),
      )
      const locked = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: setCopy.preview }))
      expect(screen.getByRole('alert').textContent).toContain('Destrave')
      expect(editor.getState().asset).toBe(locked)
      act(() =>
        editor
          .getState()
          .commit({ ...asset, animations: [{ ...asset.animations![0]!, space: 'local' }] }),
      )
      expect(within(details).getByText(copy.animationPoseIncompatible)).toBeTruthy()
      expect(
        (screen.getByRole('button', { name: setCopy.preview }) as HTMLButtonElement).disabled,
      ).toBe(true)
      act(() => editor.getState().replace({ ...asset, id: 'another-creation' }))
      expect(within(details).queryByText(setCopy.count(2))).toBeNull()
      expect(within(details).getByText(setCopy.empty)).toBeTruthy()
      expect(within(details).queryByRole('button', { name: setCopy.preview })).toBeNull()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test.each([
    'direct',
    'assisted',
    'set',
  ] as const)('exporting cannot silently discard an unrecorded %s pose', async (kind) => {
    const { editor, view, ports, openInspector } = setup(makeSceneTwoBoneFixture())
    const copy = COPY.scene
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      act(() => ports.at(-1)!.callbacks.select('tip', false))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await screen.findByText(copy.poseSet.title, { selector: 'summary' })
      if (kind === 'direct') {
        const trigger = screen.getByRole('button', { name: copy.glbExport.open })
        act(() => {
          expect(ports.at(-1)!.callbacks.transform!.begin()).toBe(true)
          // A captured click can arrive before React has rendered the disabled state.
          fireEvent.click(trigger)
        })
        expect(screen.queryByRole('dialog', { name: copy.glbExport.title })).toBeNull()
        expect((trigger as HTMLButtonElement).disabled).toBe(true)
        act(() => {
          const transform = ports.at(-1)!.callbacks.transform!,
            delta = identityMatrix()
          delta[12] = 0.25
          expect(transform.preview(delta)).toBe(true)
          transform.end(true)
        })
      } else {
        const details = screen
          .getByText(kind === 'set' ? copy.poseSet.title : copy.twoBone.title, {
            selector: 'summary',
          })
          .closest('details')!
        act(() => {
          details.open = true
          fireEvent(details, new Event('toggle'))
        })
        if (kind === 'set') {
          fireEvent.click(screen.getByRole('button', { name: copy.poseSet.copy }))
          fireEvent.click(screen.getByRole('button', { name: copy.poseSet.preview }))
        } else
          fireEvent.click(within(details).getByRole('button', { name: copy.twoBone.nudge(0, -1) }))
      }
      const before = editor.getState().asset,
        pose = ports.at(-1)!.poses.at(-1)
      const trigger = screen.getByRole('button', { name: copy.glbExport.open }) as HTMLButtonElement
      expect(trigger.disabled).toBe(true)
      expect(screen.getByText(copy.glbExport.pendingPose)).toBeTruthy()
      fireEvent.click(trigger)
      expect(screen.queryByRole('dialog', { name: copy.glbExport.title })).toBeNull()
      expect(ports.at(-1)!.poses.at(-1)).toBe(pose)
      expect(editor.getState().asset).toBe(before)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: copy.animationPoseRecord }))
      expect(trigger.disabled).toBe(false)
      fireEvent.click(trigger)
      expect(screen.getByRole('dialog', { name: copy.glbExport.title })).toBeTruthy()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation range tools copy/move/remove only the chosen keys with collision protection and one undo', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    const copy = COPY.scene
    function openTools() {
      const details = screen.getByText(copy.animationKeyTools).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
    }
    function range(start: string, end: string) {
      openTools()
      fireEvent.change(screen.getByLabelText(copy.animationRangeStart), {
        target: { value: start },
      })
      fireEvent.change(screen.getByLabelText(copy.animationRangeEnd), { target: { value: end } })
    }
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: copy.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: copy.animationMode }))
      await waitFor(() => expect(screen.queryByText(copy.animationKeyTools) !== null).toBe(true))
      expect(screen.queryByLabelText(copy.animationRangeStart)).toBeNull()
      const before = editor.getState().asset
      range('0', '0')
      fireEvent.change(screen.getByLabelText(copy.animationOffset), { target: { value: '2' } })
      fireEvent.click(screen.getByRole('button', { name: copy.animationKeysCopy }))
      expect(editor.getState().asset).toBe(before)
      expect(screen.getByRole('alert').textContent).toContain('mesmo instante')
      fireEvent.change(screen.getByLabelText(copy.animationOffset), { target: { value: '0.5' } })
      fireEvent.click(screen.getByRole('button', { name: copy.animationKeysCopy }))
      expect(
        editor.getState().asset.animations?.[0]?.tracks[0]?.keys.map((key) => key.time),
      ).toEqual([0, 0.5, 1.123456789123, 2])
      expect(screen.queryByLabelText(copy.animationRangeStart)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      range('0', '0')
      fireEvent.click(screen.getByRole('button', { name: copy.animationKeysMove }))
      expect(
        editor.getState().asset.animations?.[0]?.tracks[0]?.keys.map((key) => key.time),
      ).toEqual([0.5, 1.123456789123, 2])
      range('0.5', '0.5')
      fireEvent.click(screen.getByRole('button', { name: copy.animationKeysRemove }))
      expect(
        editor.getState().asset.animations?.[0]?.tracks[0]?.keys.map((key) => key.time),
      ).toEqual([1.123456789123, 2])
      expect(editor.getState().asset.nodes).toBe(before.nodes)
      range('0', '2')
      fireEvent.click(screen.getByRole('button', { name: copy.select('asa') }))
      openTools()
      expect(
        (screen.getByRole('button', { name: copy.animationKeysMove }) as HTMLButtonElement)
          .disabled,
      ).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation mode creates exact keys with one undo, keeps base geometry unchanged, and disables destructive modeling shortcuts', async () => {
    const { editor, view, ports, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const original = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.animationCreate }) !== null).toBe(
          true,
        ),
      )
      expect(screen.queryByRole('button', { name: COPY.scene.remove })).toBeNull()
      expect(
        (screen.getByRole('button', { name: COPY.scene.move }) as HTMLButtonElement).disabled,
      ).toBe(true)
      fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.title }), { key: 'Delete' })
      expect(editor.getState().asset).toBe(original)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationCreate }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.animationRecord }) !== null).toBe(
          true,
        ),
      )
      const created = editor.getState().asset
      fireEvent.change(screen.getByLabelText(COPY.scene.animationSeconds), {
        target: { value: '1.123456789123' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationSeek }))
      fireEvent.change(screen.getByLabelText(COPY.scene.animationAxes.translation[0]!), {
        target: { value: '1.23456789123' },
      })
      fireEvent.change(screen.getByLabelText(COPY.scene.animationAxes.translation[1]!), {
        target: { value: '-2.98765432123' },
      })
      expect(editor.getState().asset).toBe(created)
      const record = screen.getByRole('button', { name: COPY.scene.animationRecord })
      record.focus()
      fireEvent.click(record)
      expect(document.activeElement).toBe(record)
      expect(screen.queryByRole('alert')?.textContent ?? null).toBeNull()
      expect(editor.getState().asset.animations?.[0]?.tracks[0]?.keys).toEqual([
        {
          time: 1.123456789123,
          value: [1.23456789123, -2.98765432123, 0],
          interpolation: 'linear',
        },
      ])
      expect(editor.getState().asset.nodes).toBe(original.nodes)
      expect(editor.getState().asset.geometries).toBe(original.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations?.[0]?.tracks).toEqual([])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect(editor.getState().asset.animations?.[0]?.tracks[0]?.keys[0]?.time).toBe(1.123456789123)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationRemoveKey }))
      expect(editor.getState().asset.animations?.[0]?.tracks).toEqual([])
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.modelMode }))
      expect(screen.queryByRole('region', { name: COPY.scene.animationTimeline })).toBeNull()
      expect(screen.getByRole('button', { name: COPY.scene.remove })).toBeTruthy()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation timeline seeks exact selected keys, pauses on selection/Escape/mode changes, and supports clip CRUD', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.animationPlay }) !== null).toBe(
          true,
        ),
      )
      const before = editor.getState().asset
      fireEvent.keyDown(
        screen.getByRole('button', {
          name: COPY.scene.animationStrip(COPY.scene.animationChannels.translation, 3),
        }),
        { key: 'ArrowRight' },
      )
      expect((screen.getByLabelText(COPY.scene.animationSeconds) as HTMLInputElement).value).toBe(
        '1.123456789123',
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationPrevious }))
      expect((screen.getByLabelText(COPY.scene.animationSeconds) as HTMLInputElement).value).toBe(
        '0',
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationPlay }))
      expect(screen.queryByRole('button', { name: COPY.scene.animationRecord })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('asa') }))
      expect(screen.getByRole('button', { name: COPY.scene.animationPlay })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationPlay }))
      fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.title }), { key: 'Escape' })
      expect(screen.getByRole('button', { name: COPY.scene.animationPlay })).toBeTruthy()
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationDuplicate }))
      expect(editor.getState().asset.animations).toHaveLength(2)
      const select = screen.getByLabelText(COPY.scene.animationChoose) as HTMLSelectElement
      expect(editor.getState().asset.animations?.[1]?.id).toBe(select.value)
      const rename = screen.getByLabelText(COPY.scene.animationRename)
      fireEvent.change(rename, { target: { value: 'Acenar' } })
      fireEvent.submit(rename.closest('form')!)
      expect(editor.getState().asset.animations?.[1]?.name).toBe('Acenar')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationDelete }))
      expect(editor.getState().asset.animations).toHaveLength(1)
      expect((screen.getByLabelText(COPY.scene.animationChoose) as HTMLSelectElement).value).toBe(
        'clip',
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationPlay }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.modelMode }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      expect(screen.getByRole('button', { name: COPY.scene.animationPlay })).toBeTruthy()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('animation settings retime atomically, refresh stale drafts after undo, and enforce inherited locks', async () => {
    const { editor, view, ports, openInspector } = setup(animatedScene())
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
      await waitFor(() =>
        expect(screen.queryByLabelText(COPY.scene.animationDuration) !== null).toBe(true),
      )
      const before = editor.getState().asset
      const duration = screen.getByLabelText(COPY.scene.animationDuration)
      fireEvent.change(duration, { target: { value: '4' } })
      fireEvent.click(screen.getByLabelText(COPY.scene.animationRetime))
      fireEvent.change(screen.getByLabelText(COPY.scene.animationFps), { target: { value: '60' } })
      fireEvent.submit(duration.closest('form')!)
      expect(editor.getState().asset.animations?.[0]).toMatchObject({ duration: 4, fps: 60 })
      expect(editor.getState().asset.animations?.[0]?.tracks[0]?.keys[1]?.time).toBe(2.246913578246)
      fireEvent.change(screen.getByLabelText(COPY.scene.animationAxes.translation[0]!), {
        target: { value: '999' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.animations).toEqual(before.animations)
      expect(
        (screen.getByLabelText(COPY.scene.animationAxes.translation[0]!) as HTMLInputElement).value,
      ).toBe('0')
      act(() =>
        editor.getState().commit({
          ...editor.getState().asset,
          nodes: before.nodes.map((node) =>
            node.id === 'body' ? { ...node, locked: true } : node,
          ),
        }),
      )
      expect(
        screen.getByRole('button', { name: COPY.scene.animationRecord }).closest('fieldset')
          ?.disabled,
      ).toBe(true)
      const locked = editor.getState().asset
      fireEvent.submit(
        screen.getByLabelText(COPY.scene.animationAxes.translation[0]!).closest('form')!,
      )
      expect(editor.getState().asset).toBe(locked)
      expect(screen.getByRole('alert').textContent).toBeTruthy()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test.each([
    'faces',
    'connected',
    'cuts',
  ] as const)('%s auto UV preview is read-only and cancelable across revisions/close; confirmation applies only selected UV with one COW undo', async (method) => {
    const original = migrateLegacyModel(makeModel()).document
    const body = original.nodes.find((node) => node.id === 'body')!
    if (body.kind !== 'mesh') throw new Error('Missing body')
    const grid = makeSceneGridGeometry(3, body.geometryId)
    const source = {
      ...original,
      geometries: original.geometries.map((g) => (g.id === grid.id ? grid : g)),
      nodes: original.nodes.map((n) =>
        n.id === 'wing' && n.kind === 'mesh' ? { ...n, geometryId: grid.id, locked: true } : n,
      ),
    }
    const { editor, ports, view, openInspector } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceAll }))
      const details = screen.getByText(COPY.scene.uvTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('img', { name: COPY.scene.uvCanvas }) !== null).toBe(true),
      )
      const more = screen.getByText(COPY.scene.uvReorganize).closest('details')!
      const toggle = (open: boolean) => {
        act(() => {
          more.open = open
          fireEvent(more, new Event('toggle'))
        })
        if (open)
          fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.uvAutoMethod }), {
            target: { value: method === 'cuts' ? 'connected' : method },
          })
        if (open && method === 'cuts') {
          const cuts = screen.getByText(COPY.scene.uvCutTitle).closest('details')!
          act(() => {
            cuts.open = true
            fireEvent(cuts, new Event('toggle'))
          })
          fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.uvCutEdge }), {
            target: { value: '1' },
          })
          fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvCutToggle }))
        }
      }
      toggle(true)
      const prepare = () =>
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvAutoPrepare }))
      const ready = () =>
        waitFor(
          () =>
            expect(screen.queryByRole('button', { name: COPY.scene.uvAutoConfirm }) !== null).toBe(
              true,
            ),
          { timeout: 5000 },
        )
      prepare()
      await ready()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.getAllByRole('button', { name: COPY.scene.uvCanvasControl })).toHaveLength(1)
      expect(screen.queryByRole('img', { name: COPY.scene.uvAutoPreview }) !== null).toBe(true)
      act(() =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })),
      )
      expect(screen.queryByRole('button', { name: COPY.scene.uvAutoConfirm }) === null).toBe(true)
      prepare()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvAutoCancel }))
      expect(editor.getState().canUndo).toBe(false)
      prepare()
      await ready()
      act(() =>
        editor.getState().commit({ ...editor.getState().asset, name: 'Mesma malha, nova revisão' }),
      )
      expect(screen.queryByRole('button', { name: COPY.scene.uvAutoConfirm }) === null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().canUndo).toBe(false)
      prepare()
      toggle(false)
      expect(screen.queryByRole('button', { name: COPY.scene.uvAutoConfirm }) === null).toBe(true)
      toggle(true)
      prepare()
      await ready()
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvAutoConfirm }))
      const changed = editor.getState().asset
      const node = changed.nodes.find((node) => node.id === 'body')!
      if (node.kind !== 'mesh') throw new Error('Missing body')
      expect(node.geometryId).not.toBe(grid.id)
      expect(changed.geometries.find((g) => g.id === grid.id)).toBe(
        before.geometries.find((g) => g.id === grid.id),
      )
      const result = changed.geometries.find((g) => g.id === node.geometryId)!
      expect(result).toEqual({
        ...(method === 'faces'
          ? autoMeshUv(grid, Object.keys(grid.faces), 0.01)
          : unfoldMeshUv(
              grid,
              Object.keys(grid.faces),
              0.01,
              method === 'cuts' ? ['["v_1_0","v_1_1"]'] : [],
            )),
        id: node.geometryId,
      })
      expect(changed.images).toBe(before.images)
      expect(changed.materials).toBe(before.materials)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  // ⚠️ No runner Linux do CI o Bun (1.3.11 e 1.3.12) morre com "panic: Segmentation fault"
  // DENTRO deste teste: 3 runs seguidos em 10/09, com o molda isolado ou não, sempre depois
  // de "animation settings retime". É crash do Bun, não do código ("This indicates a bug in
  // Bun, not your code"): no Windows e num container Linux com o mesmo Bun (2 CPUs, com carga,
  // com workers atrasados) o arquivo fecha 97/97. O gatilho parece ser encerrar Workers em
  // disco lento (reproduziu num bind mount). Enquanto o Bun não corrige, este teste roda em
  // todo lugar MENOS no runner Linux do CI; `useSceneFlipbookPlayer.test.tsx` segue cobrindo
  // o player lá.
  test.skipIf(process.platform === 'linux' && process.env.CI === 'true')(
    'flipbook form preserves pixels, previews without document redraw/history and pauses on blur/close/context loss',
    async () => {
      let now = 0,
        id = 0
      const frames = new Map<number, FrameRequestCallback>()
      const request = spyOn(globalThis, 'requestAnimationFrame').mockImplementation((fn) => {
        frames.set(++id, fn)
        return id
      })
      const cancel = spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        frames.delete(id)
      })
      const clock = spyOn(performance, 'now').mockImplementation(() => now)
      const { editor, ports, view, openInspector } = setup()
      try {
        await waitFor(() => expect(ports.length).toBeGreaterThan(0))
        openInspector()
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
        const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
        const toggle = (open: boolean) =>
          act(() => {
            appearance.open = open
            fireEvent(appearance, new Event('toggle'))
          })
        toggle(true)
        await waitFor(() =>
          expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
            true,
          ),
        )
        const original = editor.getState().asset,
          image = original.images[0]!
        const material = original.materials.find((m) => m.colorImageId === image.id)!
        fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
          target: { value: material.id },
        })
        const settings = screen
          .getByText(COPY.scene.flipbookSettings, { selector: 'summary' })
          .closest('details')!
        act(() => {
          settings.open = true
          fireEvent(settings, new Event('toggle'))
        })
        const width = screen.getByRole('spinbutton', { name: COPY.scene.flipbookWidth })
        fireEvent.change(width, { target: { value: image.width / 2 } })
        fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.flipbookHeight }), {
          target: { value: image.height / 2 },
        })
        fireEvent.change(screen.getByRole('textbox', { name: COPY.scene.flipbookSequence }), {
          target: { value: '1, 4, 4, 2' },
        })
        fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.flipbookFps }), {
          target: { value: '2.5' },
        })
        fireEvent.submit(width.closest('form')!)
        const animated = editor.getState().asset
        expect(animated.images[0]!.flipbook).toEqual({
          frameWidth: image.width / 2,
          frameHeight: image.height / 2,
          frames: [0, 3, 3, 1],
          fps: 2.5,
          loop: true,
        })
        expect(animated.images[0]!.layers).toBe(image.layers)
        expect(animated.geometries).toBe(original.geometries)
        const revision = editor.getState().contentRevision
        fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.flipbookChoose }), {
          target: { value: '1' },
        })
        expect(ports.at(-1)!.frames.at(-1)).toEqual({ id: image.id, frame: 3 })
        const documents = ports.at(-1)!.documentUpdates
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.flipbookPlay }))
        expect(frames.size).toBe(1)
        act(() => {
          now = 400
          const callbacks = [...frames.values()]
          frames.clear()
          for (const fn of callbacks) fn(now)
        })
        expect(
          (screen.getByRole('combobox', { name: COPY.scene.flipbookChoose }) as HTMLSelectElement)
            .value,
        ).toBe('2')
        expect(editor.getState().asset).toBe(animated)
        expect(editor.getState().contentRevision).toBe(revision)
        expect(ports.at(-1)!.documentUpdates).toBe(documents)
        act(() => window.dispatchEvent(new Event('blur')))
        expect(frames.size).toBe(0)
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.flipbookPlay }))
        act(() => ports.at(-1)!.callbacks.contextLost(true))
        expect(frames.size).toBe(0)
        act(() => ports.at(-1)!.callbacks.contextLost(false))
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.flipbookPlay }))
        toggle(false)
        expect(frames.size).toBe(0)
        fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
        expect(editor.getState().asset.images).toEqual(original.images)
        expect(editor.getState().canUndo).toBe(false)
      } finally {
        view.unmount()
        editor.getState().dispose()
        request.mockRestore()
        cancel.mockRestore()
        clock.mockRestore()
      }
    },
  )
  test('3D frame bounds clip wide brushes and fill while 2D sheet painting remains unrestricted', async () => {
    const original = migrateLegacyModel(makeModel()).document
    const image = original.images[0]!
    image.layers[0]!.pixels.fill(1)
    const source = setSceneImageFlipbook(original, image.id, {
      frameWidth: image.width / 2,
      frameHeight: image.height / 2,
      frames: [0, 3],
      fps: 8,
      loop: true,
    })
    const { editor, ports, view, openInspector } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.flipbookChoose }), {
        target: { value: '1' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      expect(screen.queryByRole('button', { name: COPY.scene.flipbookPlay }) === null).toBe(true)
      expect(
        (screen.getByRole('combobox', { name: COPY.scene.flipbookChoose }) as HTMLSelectElement)
          .value,
      ).toBe('1')
      const bounds = sceneFlipbookRegion(source.images[0]!, 3)
      const sample = {
        point: [bounds.x0, bounds.y0] as [number, number],
        region: '3d-frame-3',
        bounds,
      }
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintBrushSize(3) }))
      act(() => {
        ports.at(-1)!.callbacks.paint!.begin(sample)
      })
      act(() => {
        ports.at(-1)!.callbacks.paint!.end(true)
      })
      const painted = editor.getState().asset.images[0]!.layers[0]!.pixels
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++)
          expect(painted[y * image.width + x]).toBe(
            x >= bounds.x0 && x <= bounds.x0 + 1 && y <= 1 ? 7 : 1,
          )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintFill }))
      act(() => {
        ports.at(-1)!.callbacks.paint!.begin(sample)
      })
      await waitFor(() => expect(editor.getState().canUndo).toBe(true))
      const filled = editor.getState().asset.images[0]!.layers[0]!.pixels
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++)
          expect(filled[y * image.width + x]).toBe(x >= bounds.x0 && y <= bounds.y1 ? 7 : 1)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintPencil }))
      fireEvent.keyDown(canvas, { key: ' ' })
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels[0]).toBe(7)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test.each([
    'normal',
    'roughness',
    'metalness',
  ] as const)('detail %s has contextual creation, exact settings and keyboard painting with separate undo, keeping original color paint intact', async (imageKind) => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const source = editor.getState().asset
      const material = source.materials.find((m) => m.colorImageId === source.images[0]!.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialImageKind }), {
        target: { value: imageKind },
      })
      expect(editor.getState().asset).toBe(source)
      expect(
        (screen.getByRole('combobox', { name: COPY.scene.materialMapImage }) as HTMLSelectElement)
          .options.length,
      ).toBe(1)
      const create = screen.getByText(COPY.scene.imageCreate).closest('details')!
      act(() => {
        create.open = true
        fireEvent(create, new Event('toggle'))
      })
      const width = screen.getByRole('spinbutton', { name: COPY.scene.imageDimensions.width })
      fireEvent.change(width, { target: { value: '2' } })
      fireEvent.change(
        screen.getByRole('spinbutton', { name: COPY.scene.imageDimensions.height }),
        { target: { value: '2' } },
      )
      fireEvent.submit(width.closest('form')!)
      const created = editor.getState().asset,
        image = created.images.at(-1)!
      expect(
        created.materials.find((m) => m.id === material.id)![
          SCENE_MATERIAL_IMAGE_FIELDS[imageKind]
        ],
      ).toBe(image.id)
      expect(image.encoding).toBe('rgba')
      expect(image.width).toBe(2)
      expect(created.images[0]).toBe(source.images[0])
      if (imageKind === 'normal') {
        const strength = screen.getByRole('spinbutton', { name: COPY.scene.materialNormalStrength })
        fireEvent.change(strength, { target: { value: '0.14285714285714285' } })
        fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.materialNormalFlipY }))
        fireEvent.submit(strength.closest('form')!)
        expect(
          editor.getState().asset.materials.find((m) => m.id === material.id)?.normalStrength,
        ).toBe(1 / 7)
        expect(
          editor.getState().asset.materials.find((m) => m.id === material.id)?.normalFlipY,
        ).toBe(true)
        fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
        expect(
          (
            screen.getByRole('spinbutton', {
              name: COPY.scene.materialNormalStrength,
            }) as HTMLInputElement
          ).value,
        ).toBe('1')
      }
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      const color = screen.getByLabelText(COPY.scene.paintColor) as HTMLInputElement
      expect(color.value).toBe(imageKind === 'normal' ? '#8080ff' : '#ffffff')
      fireEvent.change(color, { target: { value: '#5a5a5a' } })
      fireEvent.keyDown(canvas, { key: ' ' })
      expect(editor.getState().asset.images.at(-1)!.layers[0]!.pixels.slice(0, 4)).toEqual(
        new Uint8Array([90, 90, 90, 255]),
      )
      expect(editor.getState().asset.images[0]).toBe(source.images[0])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images.at(-1)!.layers[0]!.pixels).toEqual(new Uint8Array(16))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(editor.getState().asset.materials).toEqual(source.materials)
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByRole('button', { name: COPY.scene.paintCanvas }) === null).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('shared painting previews without edits, cancels on external revisions and closing, then commits geometry/material/image together with one undo', async () => {
    const source = makeSceneAtlasDocument()
    const { editor, ports, view, openInspector } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      const toggle = (open: boolean) =>
        act(() => {
          appearance.open = open
          fireEvent(appearance, new Event('toggle'))
        })
      toggle(true)
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.atlasPrepare }) !== null).toBe(true),
      )
      const prepare = () =>
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.atlasPrepare }))
      const ready = () =>
        waitFor(() =>
          expect(screen.queryByRole('button', { name: COPY.scene.atlasConfirm }) !== null).toBe(
            true,
          ),
        )
      prepare()
      await ready()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByRole('img', { name: COPY.scene.atlasPreview }) !== null).toBe(true)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('button', { name: COPY.scene.atlasConfirm }) === null).toBe(true)
      prepare()
      await ready()
      act(() => editor.getState().commit({ ...source, name: 'Outra revisão' }))
      expect(screen.queryByRole('button', { name: COPY.scene.atlasConfirm }) === null).toBe(true)
      act(() => editor.getState().undo())
      prepare()
      toggle(false)
      await act(async () => {})
      expect(editor.getState().canUndo).toBe(false)
      toggle(true)
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: COPY.scene.atlasPrepare }) !== null).toBe(true),
      )
      prepare()
      await ready()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.atlasConfirm }))
      const next = editor.getState().asset
      expect(next.images.length).toBe(source.images.length + 1)
      expect(next.materials.length).toBe(source.materials.length + 2)
      expect(next.geometries[0]?.kind).toBe('box')
      expect(next.geometries[0]).not.toBe(source.geometries[0])
      expect(next.nodes[1]).toEqual(source.nodes[1])
      expect(next.materials.slice(-2).every((m) => m.colorImageId === next.images.at(-1)!.id)).toBe(
        true,
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(editor.getState().asset.materials).toEqual(source.materials)
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().canUndo).toBe(false)
      prepare()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('asa') }))
      await act(async () => {})
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByRole('button', { name: COPY.scene.atlasConfirm }) === null).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('stamp captures the selected layer, transforms its preview and applies only once after keyboard confirmation', async () => {
    const original = migrateLegacyModel(makeModel()).document
    const source = editSceneImageLayers(original, original.images[0]!.id, { kind: 'rgba' })
    const image = source.images[0]!,
      layer = image.layers[0]!
    layer.pixels.fill(0)
    layer.pixels.set([255, 0, 0, 128, 0, 0, 255, 255])
    const { editor, ports, view, openInspector } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      const key = (key: string) => fireEvent.keyDown(canvas, { key })
      const shapes = screen.getByText(COPY.scene.paintShapes).closest('details')!
      act(() => {
        shapes.open = true
        fireEvent(shapes, new Event('toggle'))
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.select }))
      key(' ')
      key('ArrowRight')
      key(' ')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.stamp }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintStampCapture }))
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByRole('img', { name: COPY.scene.paintStampPreview }) !== null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintClearSelection }))
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.paintStampScale }), {
        target: { value: '2' },
      })
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.paintStampRotation }), {
        target: { value: '1' },
      })
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.paintStampFlips.flipX }))
      const preview = screen.getByRole('img', { name: COPY.scene.paintStampPreview })
      expect((preview.firstElementChild as HTMLElement).style.transform).toContain(
        'scale(-1, 1) rotate(90deg)',
      )
      for (let i = 0; i < 4; i++) key('ArrowRight')
      key('ArrowUp')
      key('ArrowUp')
      key(' ')
      key('ArrowRight')
      key('ArrowUp')
      const contour = canvas.querySelector('svg rect')!
      expect(contour.getAttribute('width')).toBe('2')
      expect(contour.getAttribute('height')).toBe('4')
      expect(editor.getState().asset).toBe(source)
      key('Escape')
      expect(editor.getState().canUndo).toBe(false)
      key(' ')
      key('ArrowRight')
      key('Enter')
      await waitFor(() => expect(screen.queryByText(COPY.scene.imageTaskBusy) === null).toBe(true))
      expect(editor.getState().asset.images[0]).toEqual(
        paintSceneImageStamp(image, {
          kind: 'stamp',
          layerId: layer.id,
          point: [7, 3],
          scale: 2,
          turns: 1,
          flipX: true,
          flipY: false,
          raster: captureSceneLayerRaster(image, layer.id, { x0: 0, y0: 0, x1: 1, y1: 0 }),
        }),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByRole('img', { name: COPY.scene.paintStampPreview }) !== null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintStampClear }))
      expect(screen.queryByRole('img', { name: COPY.scene.paintStampPreview }) === null).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('gradient requires explicit conversion, uses selected bounds and separate undo; picker samples exact layer color without history', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const source = editor.getState().asset,
        image = source.images[0]!
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      const key = (key: string) => fireEvent.keyDown(canvas, { key })
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.paintColor }), {
        target: { value: '5' },
      })
      key(' ')
      const painted = editor.getState().asset
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.paintColor }), {
        target: { value: '7' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintPicker }))
      key(' ')
      expect(editor.getState().asset).toBe(painted)
      expect(
        (screen.getByRole('combobox', { name: COPY.scene.paintColor }) as HTMLSelectElement).value,
      ).toBe('5')
      expect(
        screen.getByRole('button', { name: COPY.scene.paintPencil }).getAttribute('aria-pressed'),
      ).toBe('true')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().canUndo).toBe(false)
      const shapes = screen.getByText(COPY.scene.paintShapes).closest('details')!
      act(() => {
        shapes.open = true
        fireEvent(shapes, new Event('toggle'))
      })
      expect(
        (
          screen.getByRole('button', {
            name: COPY.scene.paintShapeTools.gradient,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageRgba }))
      await waitFor(() => expect(screen.queryByText(COPY.scene.imageTaskBusy) === null).toBe(true))
      const converted = editor.getState().asset
      expect(converted.images[0]!.encoding).toBe('rgba')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.select }))
      key(' ')
      key('ArrowRight')
      key('ArrowRight')
      key('ArrowUp')
      key(' ')
      expect(editor.getState().asset).toBe(converted)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.gradient }))
      const color = view.container.querySelector<HTMLInputElement>('input[name="paintColorRgba"]')!
      fireEvent.change(color, { target: { value: '#ff0000' } })
      fireEvent.change(screen.getByLabelText(COPY.scene.paintGradientEndColor), {
        target: { value: '#0000ff' },
      })
      fireEvent.change(screen.getByRole('slider', { name: COPY.scene.paintGradientEndAlpha }), {
        target: { value: '0' },
      })
      key(' ')
      key('ArrowLeft')
      key('ArrowLeft')
      expect(editor.getState().asset).toBe(converted)
      key('Enter')
      await waitFor(() => expect(screen.queryByText(COPY.scene.imageTaskBusy) === null).toBe(true))
      const result = editor.getState().asset
      expect(result.images[0]).toEqual(
        paintSceneImageGradient(converted.images[0]!, {
          kind: 'gradient',
          layerId: image.layers[0]!.id,
          from: [2, 1],
          to: [0, 1],
          color: [255, 0, 0, 255],
          endColor: [0, 0, 255, 0],
          region: { x0: 0, y0: 0, x1: 2, y1: 1 },
        }),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintPicker }))
      act(() =>
        expect(ports.at(-1)!.callbacks.paint!.begin({ point: [1, 1], region: 'face' })).toBe(false),
      )
      expect(editor.getState().asset).toBe(result)
      expect(color.value).toBe('#ff0000')
      expect(
        (screen.getByRole('slider', { name: COPY.scene.paintAlpha }) as HTMLInputElement).value,
      ).toBe('128')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(converted.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('shape tools support two keyboard anchors, cancellation, one undo and a session-only pixel selection', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const appearance = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        appearance.open = true
        fireEvent(appearance, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const source = editor.getState().asset,
        image = source.images[0]!
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      const shapes = screen.getByText(COPY.scene.paintShapes).closest('details')!
      act(() => {
        shapes.open = true
        fireEvent(shapes, new Event('toggle'))
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.rectangle }))
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.paintShapeFilled }))
      const key = (key: string) => fireEvent.keyDown(canvas, { key })
      key(' ')
      key('ArrowRight')
      key('ArrowRight')
      key('ArrowUp')
      key('ArrowUp')
      expect(editor.getState().asset).toBe(source)
      expect(canvas.querySelector('svg rect') !== null).toBe(true)
      key('Escape')
      expect(canvas.querySelector('svg rect') === null).toBe(true)
      expect(editor.getState().canUndo).toBe(false)
      key(' ')
      key('ArrowRight')
      key('ArrowRight')
      key('ArrowUp')
      key('Enter')
      await waitFor(() => expect(screen.queryByText(COPY.scene.imageTaskBusy) === null).toBe(true))
      expect(editor.getState().asset.images[0]).toEqual(
        paintSceneImageShape(
          image,
          {
            kind: 'shape',
            layerId: image.layers[0]!.id,
            shape: 'rectangle',
            from: [2, 2],
            to: [4, 3],
            color: 7,
            brush: 1,
            filled: true,
          },
          16,
        ),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintShapeTools.select }))
      key(' ')
      key('ArrowLeft')
      key('ArrowLeft')
      key('ArrowDown')
      key(' ')
      expect(editor.getState().canUndo).toBe(false)
      expect(screen.queryByText(COPY.scene.paintSelectedArea) !== null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintPencil }))
      key('ArrowLeft')
      key(' ')
      expect(editor.getState().canUndo).toBe(false)
      key('ArrowRight')
      key(' ')
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels[2 * image.width + 2]).toBe(7)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(screen.queryByText(COPY.scene.paintSelectedArea) !== null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintClearSelection }))
      key('ArrowLeft')
      key(' ')
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels[2 * image.width + 1]).toBe(7)
      expect(editor.getState().canUndo).toBe(true)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('native paint uses the same image for keyboard and 3D strokes, breaks at seams and cancels with Escape', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const details = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const source = editor.getState().asset
      const image = source.images[0]!
      const material = source.materials.find((m) => m.colorImageId === image.id)!
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.materialChoose }), {
        target: { value: material.id },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintLayer }))
      const canvas = await screen.findByRole('button', { name: COPY.scene.paintCanvas })
      fireEvent.keyDown(canvas, { key: 'ArrowRight' })
      fireEvent.keyDown(canvas, { key: ' ' })
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels[1]).toBe(7)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      const actions = ports.at(-1)!.callbacks.paint!
      act(() => {
        expect(actions.begin({ point: [0, 0], region: 'face-a' })).toBe(true)
      })
      act(() => actions.move({ point: [image.width - 1, 0], region: 'face-b' }))
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels[1]).toBe(
        image.layers[0]!.pixels[1],
      )
      fireEvent.keyDown(canvas, { key: 'Escape' })
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(screen.queryByRole('button', { name: COPY.scene.paintCanvas }) !== null).toBe(true)
      const fresh = ports.at(-1)!.callbacks.paint!
      act(() => {
        expect(fresh.begin({ point: [0, 0], region: 'same-face' })).toBe(true)
      })
      act(() => fresh.move({ point: [2, 0], region: 'same-face' }))
      act(() => fresh.end(true))
      expect(editor.getState().asset.images[0]!.layers[0]!.pixels.slice(0, 3)).toEqual(
        new Uint8Array([7, 7, 7]),
      )
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.paintFill }))
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.paintColor }), {
        target: { value: '5' },
      })
      expect(
        screen.getByRole('button', { name: COPY.scene.paintFill }).getAttribute('aria-pressed'),
      ).toBe('true')
      fireEvent.keyDown(canvas, { key: ' ' })
      expect(screen.queryByText(COPY.scene.imageTaskBusy)).not.toBeNull()
      fireEvent.keyDown(canvas, { key: 'Escape' })
      expect(editor.getState().asset.images).toEqual(source.images)
      expect(screen.queryByRole('button', { name: COPY.scene.paintCanvas })).not.toBeNull()
      fireEvent.keyDown(canvas, { key: ' ' })
      await waitFor(() => expect(screen.queryByText(COPY.scene.imageTaskBusy) === null).toBe(true))
      expect(editor.getState().asset.images[0]).toEqual(
        fillSceneImage(
          image,
          {
            kind: 'fill',
            layerId: image.layers[0]!.id,
            point: [1, 0],
            color: 5,
            tolerance: 0,
          },
          16,
        ),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(source.images)
      act(() =>
        editor
          .getState()
          .commit(editSceneImageLayers(editor.getState().asset, image.id, { kind: 'rgba' })),
      )
      expect(
        view.container.querySelector<HTMLInputElement>('input[name="paintColorRgba"]')?.value,
      ).toBe('#78dc52')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(screen.getByRole('combobox', { name: COPY.scene.paintColor })).toBeDefined()
      fireEvent.keyDown(canvas, { key: 'Escape' })
      expect(screen.queryByRole('button', { name: COPY.scene.paintCanvas })).toBeNull()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('appearance panel creates canonical images and applies material and layer changes as separate undoable commands', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const details = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('combobox', { name: COPY.scene.materialChoose }) !== null).toBe(
          true,
        ),
      )
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.materialPresets.shiny }))
      expect(
        editor.getState().asset.materials.find((m) => m.id === 'material:body')!.roughness,
      ).toBe(0.2)
      expect(editor.getState().asset.images).toBe(before.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.materials).toEqual(before.materials)
      const creation = screen.getByText(COPY.scene.imageCreate).closest('details')!
      act(() => {
        creation.open = true
        fireEvent(creation, new Event('toggle'))
      })
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.imageDimensions.width }), {
        target: { value: '7' },
      })
      fireEvent.change(
        screen.getByRole('spinbutton', { name: COPY.scene.imageDimensions.height }),
        { target: { value: '3' } },
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageCreateApply }))
      const created = editor.getState().asset
      const image = created.images.at(-1)!
      expect([image.width, image.height, image.encoding]).toEqual([7, 3, 'indexed'])
      expect(screen.queryByRole('img', { name: COPY.scene.imagePreview }) !== null).toBe(true)
      expect(image.layers[0]!.pixels).toEqual(new Uint8Array(21))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageLayerAdd }))
      const added = editor.getState().asset
      expect(added.images.at(-1)!.layers).toHaveLength(2)
      fireEvent.change(screen.getByRole('textbox', { name: COPY.scene.imageLayerName }), {
        target: { value: 'Luz' },
      })
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.imageOpacity }), {
        target: { value: '0.123456789' },
      })
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.imageLayerVisible }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageLayerApply }))
      const layer = editor.getState().asset.images.at(-1)!.layers.at(-1)!
      expect([layer.name, layer.opacity, layer.visible]).toEqual(['Luz', 0.123456789, false])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(added.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageRgba }))
      expect(screen.queryByText(COPY.scene.imageTaskBusy)).not.toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageTaskCancel }))
      expect(editor.getState().asset.images).toEqual(added.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageRgba }))
      await waitFor(() => expect(editor.getState().asset.images.at(-1)!.encoding).toBe('rgba'))
      expect(editor.getState().asset.images.at(-1)!.layers[0]!.pixels.length).toBe(84)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(added.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.images).toEqual(created.images)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('appearance panel explains locked shared images and isolates a selected material without changing the locked piece', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const image = initial.images[0]!
      act(() =>
        editor.getState().commit({
          ...initial,
          materials: initial.materials.map((m) =>
            m.id === 'material:body' || m.id === 'material:wing'
              ? { ...m, colorImageId: image.id }
              : m,
          ),
          nodes: initial.nodes.map((n) => (n.id === 'wing' ? { ...n, locked: true } : n)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const details = screen.getByText(COPY.scene.appearanceTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() => expect(screen.queryByText(COPY.scene.materialLocked) !== null).toBe(true))
      expect(
        screen.getByRole('button', { name: COPY.scene.imageLayerAdd }).closest('fieldset')!
          .disabled,
      ).toBe(true)
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.materialCopy }))
      const copied = editor.getState().asset
      expect(copied.images.length).toBe(before.images.length + 1)
      expect(copied.images.at(-1)!.layers[0]!.pixels.buffer).not.toBe(
        image.layers[0]!.pixels.buffer,
      )
      expect(copied.nodes.find((n) => n.id === 'wing')).toBe(
        before.nodes.find((n) => n.id === 'wing'),
      )
      expect(
        screen.getByRole('button', { name: COPY.scene.imageLayerAdd }).closest('fieldset')!
          .disabled,
      ).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageLayerAdd }))
      expect(editor.getState().asset.images.find((i) => i.id === image.id)).toBe(image)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
      expect(editor.getState().asset.images).toEqual(before.images)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('UV corner controls share 3D selection, explicitly align a neighbor and keep separate undo for keyboard and numeric positions', async () => {
    const initial = migrateLegacyModel(makeModel()).document
    const body = initial.nodes.find((n) => n.id === 'body')!
    if (body.kind !== 'mesh') throw new Error('Missing body')
    const grid = makeSceneGridGeometry(2, body.geometryId)
    const source = {
      ...initial,
      geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
    }
    const { editor, ports, view, openInspector } = setup(source)
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      const details = screen.getByText(COPY.scene.uvTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('img', { name: COPY.scene.uvCanvas }) !== null).toBe(true),
      )
      const ids = ['f_1_0', 'f_0_0']
      act(() => ports.at(-1)!.callbacks.selectComponents!(ids, false))
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.uvCornerChoose }), {
        target: { value: '1' },
      })
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvStitch }))
      expect(editor.getState().asset.geometries.find((g) => g.id === grid.id)).toEqual(
        editMeshUv(grid, ids, { kind: 'stitch', faceId: 'f_0_0', corner: 1 }),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.uvCornerEnable }))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.uvCornerStep }), {
        target: { value: '0.1' },
      })
      const canvas = screen.getByRole('button', { name: COPY.scene.uvCanvasControl })
      fireEvent.keyDown(canvas, { key: ' ' })
      fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      fireEvent.keyDown(canvas, { key: 'Enter' })
      expect(editor.getState().asset.geometries.find((g) => g.id === grid.id)).toEqual(
        editMeshUv(grid, ids, { kind: 'corner', faceId: 'f_0_0', corner: 1, uv: [0.9, 0] }),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.uvCornerAxis('U') }), {
        target: { value: '0.123456789123456' },
      })
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.uvCornerAxis('V') }), {
        target: { value: '-1.3' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvCornerApply }))
      expect(editor.getState().asset.geometries.find((g) => g.id === grid.id)).toEqual(
        editMeshUv(grid, ids, {
          kind: 'corner',
          faceId: 'f_0_0',
          corner: 1,
          uv: [0.123456789123456, -1.3],
        }),
      )
      expect(editor.getState().asset.images).toBe(source.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('UV panel shares face selection with 3D and edits only chosen UVs with copy-on-write and one undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const body = initial.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(2, body.geometryId)
      act(() =>
        editor.getState().commit({
          ...initial,
          nodes: initial.nodes.map((n) =>
            n.id === 'wing' && n.kind === 'mesh' ? { ...n, geometryId: grid.id } : n,
          ),
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      expect(screen.queryByRole('img', { name: COPY.scene.uvCanvas })).toBeNull()
      const details = screen.getByText(COPY.scene.uvTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('img', { name: COPY.scene.uvCanvas }) !== null).toBe(true),
      )
      const source = editor.getState().asset
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.uvFace }), {
        target: { value: 'f_0_0' },
      })
      await waitFor(() => expect(ports.at(-1)!.faces?.ids).toEqual(['f_0_0']))
      expect(editor.getState().asset).toBe(source)
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.uvFields.u }), {
        target: { value: '0.123456789123456' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvApplyTransform }))
      const changed = editor.getState().asset
      const node = changed.nodes.find((n) => n.id === 'body')!
      if (node.kind !== 'mesh') throw new Error('Missing node')
      expect(node.geometryId).not.toBe(grid.id)
      const result = changed.geometries.find((g) => g.id === node.geometryId)!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(result.faces.f_0_0!.corners[0]!.uv).toEqual([0.123456789123456, 0])
      expect(result.faces.f_1_1).toBe(grid.faces.f_1_1)
      expect(result.vertices).toBe(grid.vertices)
      expect(changed.geometries.find((g) => g.id === grid.id)).toBe(grid)
      expect(changed.images).toBe(source.images)
      expect(changed.materials).toBe(source.materials)
      expect(ports.at(-1)!.faces?.ids).toEqual(['f_0_0'])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('UV projection joins matching corners into an island; partial packing reports a recoverable error', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const node = initial.nodes.find((n) => n.id === 'body')!
      if (node.kind !== 'mesh') throw new Error('Missing node')
      const grid = makeSceneGridGeometry(2, node.geometryId)
      act(() =>
        editor.getState().commit({
          ...initial,
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      const details = screen.getByText(COPY.scene.uvTitle).closest('details')!
      act(() => {
        details.open = true
        fireEvent(details, new Event('toggle'))
      })
      await waitFor(() =>
        expect(screen.queryByRole('img', { name: COPY.scene.uvCanvas }) !== null).toBe(true),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceAll }))
      const more = screen.getByText(COPY.scene.uvReorganize).closest('details')!
      act(() => {
        more.open = true
        fireEvent(more, new Event('toggle'))
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvProject }))
      expect(screen.queryByText(COPY.scene.uvIslands(1, 8)) !== null).toBe(true)
      const projected = editor.getState().asset
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.uvFace }), {
        target: { value: 'f_0_0' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvPack }))
      expect(editor.getState().asset).toBe(projected)
      expect(
        screen.getAllByRole('alert').some((el) => el.textContent?.includes('ilhas inteiras')),
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvSelectIslands }))
      expect(ports.at(-1)!.faces?.ids.length).toBe(4)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.uvPack }))
      expect(editor.getState().asset).not.toBe(projected)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(projected.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test.each([
    1, 33,
  ])('mesh check previews an explicit repair on a %s-wide shared mesh, cancels with Escape and confirms one undo', async (size) => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const body = initial.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(size, body.geometryId)
      grid.vertices.orphan = [100, 100, 100]
      act(() =>
        editor.getState().commit({
          ...initial,
          nodes: initial.nodes.map((n) =>
            n.id === 'wing' && n.kind === 'mesh' ? { ...n, geometryId: grid.id } : n,
          ),
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByText(COPY.scene.meshCheck))
      const before = editor.getState().asset
      const inspect = () => screen.getByRole('button', { name: COPY.scene.meshCheckRun })
      const repair = () =>
        screen.getByRole('button', { name: COPY.scene.meshCheckFixes['unused-points'] })
      fireEvent.click(inspect())
      await waitFor(
        () =>
          expect(
            screen.queryByRole('button', { name: COPY.scene.meshCheckFixes['unused-points'] }) !==
              null,
          ).toBe(true),
        { timeout: 4000 },
      )
      expect(editor.getState().asset).toBe(before)
      expect(document.activeElement === inspect()).toBe(true)
      fireEvent.click(
        screen.getByRole('button', {
          name: COPY.scene.meshCheckSelect(COPY.scene.meshCheckKinds['unused-points']),
        }),
      )
      await waitFor(() => expect(ports.at(-1)!.faces?.ids).toEqual(['orphan']))
      const confirm = () => screen.getByRole('button', { name: COPY.scene.previewConfirm })
      const ready = () =>
        waitFor(() => expect(confirm().hasAttribute('disabled')).toBe(false), { timeout: 4000 })
      fireEvent.click(repair())
      expect(
        screen.getByRole('button', { name: COPY.scene.componentModes.face }).closest('fieldset')
          ?.disabled,
      ).toBe(true)
      await ready()
      expect(document.activeElement === confirm()).toBe(true)
      const previewNode = editor.getState().asset.nodes.find((n) => n.id === 'body')!
      if (previewNode.kind !== 'mesh') throw new Error('Missing node')
      expect(previewNode.geometryId).not.toBe(grid.id)
      expect(editor.getState().asset.geometries.find((g) => g.id === grid.id)).toBe(grid)
      const previewMesh = editor
        .getState()
        .asset.geometries.find((g) => g.id === previewNode.geometryId)!
      if (previewMesh.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.hasOwn(previewMesh.vertices, 'orphan')).toBe(false)
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
      expect(document.activeElement === inspect()).toBe(true)
      fireEvent.click(repair())
      await ready()
      fireEvent.click(confirm())
      expect(editor.getState().asset.images).toBe(before.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('mesh check cancels pending work and discards a ready preview when another revision replaces the source', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const body = initial.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(33, body.geometryId)
      grid.vertices.old = [100, 100, 100]
      act(() =>
        editor.getState().commit({
          ...initial,
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByText(COPY.scene.meshCheck))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.meshCheckRun }))
      const replacement = {
        ...grid,
        vertices: {
          ...Object.fromEntries(Object.entries(grid.vertices).filter(([id]) => id !== 'old')),
          fresh: [200, 200, 200] as [number, number, number],
        },
      }
      act(() =>
        editor.getState().commit({
          ...editor.getState().asset,
          name: 'Outra revisão',
          geometries: editor
            .getState()
            .asset.geometries.map((g) => (g.id === grid.id ? replacement : g)),
        }),
      )
      expect(screen.queryByText(COPY.scene.meshCheckBusy)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.meshCheckRun }))
      await waitFor(
        () =>
          expect(
            screen.queryByRole('button', { name: COPY.scene.meshCheckFixes['unused-points'] }) !==
              null,
          ).toBe(true),
        { timeout: 4000 },
      )
      fireEvent.click(
        screen.getByRole('button', {
          name: COPY.scene.meshCheckSelect(COPY.scene.meshCheckKinds['unused-points']),
        }),
      )
      await waitFor(() => expect(ports.at(-1)!.faces?.ids).toEqual(['fresh']))
      const before = editor.getState().asset
      fireEvent.click(
        screen.getByRole('button', { name: COPY.scene.meshCheckFixes['unused-points'] }),
      )
      await waitFor(
        () =>
          expect(
            screen
              .getByRole('button', { name: COPY.scene.previewConfirm })
              .hasAttribute('disabled'),
          ).toBe(false),
        { timeout: 4000 },
      )
      act(() => editor.getState().commit({ ...before, name: 'Alteração externa preservada' }))
      expect(screen.queryByRole('button', { name: COPY.scene.previewConfirm })).toBeNull()
      expect(editor.getState().asset.name).toBe('Alteração externa preservada')
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('closed tube controls create a loop from selected edges and undo the entire operation', async () => {
    const { editor, view, ports, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() =>
        editor.getState().commit(convertSceneNodesToMesh(editor.getState().asset, ['body'])),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      fireEvent.click(screen.getByText(COPY.scene.pathCreateTitle))
      const points = ['v_000', 'v_010', 'v_110', 'v_100']
      act(() =>
        points.forEach((id, i) => {
          ports
            .at(-1)!
            .callbacks.selectComponent?.(meshEdgeKey(id, points[(i + 1) % points.length]!), i > 0)
        }),
      )
      const before = editor.getState().asset
      fireEvent.click(screen.getByLabelText(COPY.scene.pathClosed))
      expect((screen.getByLabelText(COPY.scene.pathCaps) as HTMLInputElement).disabled).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.pathCreate }))
      expect(editor.getState().asset.geometries.at(-1)).toMatchObject({
        kind: 'path',
        closed: true,
        endCaps: false,
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })

  test('path creation copies a chain and edits radius, caps and stable control points with separate undo steps', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() =>
        editor.getState().commit(convertSceneNodesToMesh(editor.getState().asset, ['body'])),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      fireEvent.click(screen.getByText(COPY.scene.pathCreateTitle))
      expect(
        screen.getByRole('button', { name: COPY.scene.pathCreate }).hasAttribute('disabled'),
      ).toBe(true)
      act(() => ports.at(-1)!.callbacks.selectComponent?.(meshEdgeKey('v_000', 'v_010'), false))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(meshEdgeKey('v_010', 'v_110'), true))
      const before = editor.getState().asset
      const radius = screen.getByRole('spinbutton', { name: COPY.scene.pathRadius })
      fireEvent.change(radius, { target: { value: '0' } })
      expect(radius.getAttribute('aria-invalid')).toBe('true')
      expect(
        screen.getByRole('button', { name: COPY.scene.pathCreate }).hasAttribute('disabled'),
      ).toBe(true)
      fireEvent.change(radius, { target: { value: '0.2' } })
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.pathCreate }))
      const created = editor.getState().asset
      expect(created.nodes).toHaveLength(before.nodes.length + 1)
      expect(created.geometries[0]).toBe(before.geometries[0])
      const path = created.geometries.at(-1)!
      if (path.kind !== 'path') throw new Error('Missing path')
      expect(path.radius).toBe(0.2)
      expect(path.points.map((p) => p.id)).toEqual(['v_000', 'v_010', 'v_110'])
      fireEvent.click(screen.getByText(COPY.scene.pathSettings))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.pathRadius }), {
        target: { value: '0.3' },
      })
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.pathAround }), {
        target: { value: '12' },
      })
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.pathCaps }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.applyPathSettings }))
      const shaped = editor.getState().asset
      const changed = shaped.geometries.at(-1)!
      if (changed.kind !== 'path') throw new Error('Missing path')
      expect(changed.radius).toBe(0.3)
      expect(changed.around).toBe(12)
      expect(changed.endCaps).toBe(false)
      expect(changed.points).toBe(path.points)
      fireEvent.change(screen.getByRole('combobox', { name: COPY.scene.pathPoint }), {
        target: { value: 'v_010' },
      })
      const x = screen.getByRole('spinbutton', { name: `${COPY.scene.pathPointPosition} X` })
      fireEvent.change(x, { target: { value: '0.37' } })
      fireEvent.submit(x.closest('form')!)
      const adjusted = editor.getState().asset.geometries.at(-1)!
      if (adjusted.kind !== 'path') throw new Error('Missing path')
      expect(adjusted.points[1]!.position[0]).toBe(0.37)
      expect(adjusted.points[0]).toBe(path.points[0])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(shaped.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(created.geometries)
      expect(
        (screen.getByRole('spinbutton', { name: COPY.scene.pathRadius }) as HTMLInputElement).value,
      ).toBe('0.2')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('chamfer validates selection and depth, keeps invalid attempts out of history and undoes a local corner', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() =>
        editor.getState().commit(convertSceneNodesToMesh(editor.getState().asset, ['body'])),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      fireEvent.click(screen.getByText(COPY.scene.bevel))
      const apply = () => screen.getByRole('button', { name: COPY.scene.applyBevel })
      expect(apply().hasAttribute('disabled')).toBe(true)
      act(() => ports.at(-1)!.callbacks.selectComponent?.(meshEdgeKey('v_111', 'v_101'), false))
      const depth = screen.getByRole('spinbutton', { name: COPY.scene.bevelDepth })
      fireEvent.change(depth, { target: { value: '0' } })
      expect(depth.getAttribute('aria-invalid')).toBe('true')
      expect(apply().hasAttribute('disabled')).toBe(true)
      const before = editor.getState().asset
      fireEvent.change(depth, { target: { value: '100' } })
      fireEvent.click(apply())
      expect(editor.getState().asset).toBe(before)
      expect(screen.getByText(/alcançaria outra quina/).textContent).toBeTruthy()
      fireEvent.change(depth, { target: { value: '0.1' } })
      fireEvent.click(apply())
      const result = editor.getState().asset.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.faces)).toHaveLength(7)
      expect(Object.keys(result.vertices)).toHaveLength(10)
      expect(editor.getState().asset.images).toBe(before.images)
      await waitFor(() => expect(ports.at(-1)!.faces?.ids.length).toBe(4))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test.each([
    'vertex',
    'edge',
    'face',
  ] as const)('plane cut in %s mode isolates a shared piece, selects the cut and undoes once', async (mode) => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const body = initial.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(2, body.geometryId)
      act(() =>
        editor.getState().commit({
          ...initial,
          nodes: initial.nodes.map((n) =>
            n.id === 'wing' && n.kind === 'mesh' ? { ...n, geometryId: grid.id } : n,
          ),
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes[mode] }))
      fireEvent.click(screen.getByText(COPY.scene.planeCut))
      const field = screen.getByRole('spinbutton', { name: COPY.scene.planeCutPosition })
      const apply = screen.getByRole('button', { name: COPY.scene.applyPlaneCut })
      const before = editor.getState().asset
      fireEvent.change(field, { target: { value: '' } })
      expect(field.getAttribute('aria-invalid')).toBe('true')
      expect(apply.hasAttribute('disabled')).toBe(true)
      fireEvent.submit(apply.closest('form')!)
      expect(editor.getState().asset).toBe(before)
      fireEvent.change(field, { target: { value: '0.1' } })
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(apply)
      const after = editor.getState().asset
      const edited = after.nodes.find((n) => n.id === 'body')!
      if (edited.kind !== 'mesh') throw new Error('Missing body')
      expect(edited.geometryId).not.toBe(grid.id)
      expect(after.geometries.find((g) => g.id === grid.id)).toBe(grid)
      const result = after.geometries.find((g) => g.id === edited.geometryId)!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.vertices)).toHaveLength(12)
      expect(Object.keys(result.faces)).toHaveLength(6)
      expect(result.faces.f_1_1).toBe(grid.faces.f_1_1)
      expect(after.images).toBe(before.images)
      await waitFor(() =>
        expect(ports.at(-1)!.faces?.ids.length).toBe(
          mode === 'vertex' ? 3 : mode === 'edge' ? 2 : 4,
        ),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test.each([
    'cylinder',
    'sphere',
  ] as const)('curve detail for %s has a cost, validates a draft and restores fields on undo', async (kind) => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      act(() => editor.getState().commit(addScenePrimitive(editor.getState().asset, kind, 'Curva')))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('Curva') }))
      fireEvent.click(screen.getByText(COPY.scene.curveDetail))
      const before = editor.getState().asset
      const around = () =>
        screen.getByRole('spinbutton', { name: COPY.scene.curveDetailFields.around })
      const apply = () => screen.getByRole('button', { name: COPY.scene.applyCurveDetail })
      fireEvent.change(around(), { target: { value: '2' } })
      expect(around().getAttribute('aria-invalid')).toBe('true')
      expect(apply().hasAttribute('disabled')).toBe(true)
      fireEvent.submit(apply().closest('form')!)
      expect(editor.getState().asset).toBe(before)
      fireEvent.change(around(), { target: { value: '8' } })
      if (kind === 'sphere')
        fireEvent.change(
          screen.getByRole('spinbutton', { name: COPY.scene.curveDetailFields.down }),
          { target: { value: '4' } },
        )
      else expect(screen.queryByLabelText(COPY.scene.curveDetailFields.down)).toBeNull()
      expect(
        screen.getByText(COPY.scene.curveDetailCost(kind === 'sphere' ? 48 : 32)).textContent,
      ).toBeTruthy()
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(apply())
      const geometry = editor.getState().asset.geometries.at(-1)!
      if (geometry.kind !== 'sphere' && geometry.kind !== 'cylinder')
        throw new Error('Missing curve')
      expect(geometry.tessellation).toEqual(
        kind === 'sphere' ? { around: 8, down: 4 } : { around: 8 },
      )
      expect(editor.getState().asset.images).toBe(before.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect((around() as HTMLInputElement).value).toBe(kind === 'sphere' ? '12' : '16')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.redo }))
      expect((around() as HTMLInputElement).value).toBe('8')
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('soft movement limits tools, validates reach, freezes settings during drag and undoes neighboring changes together', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const node = initial.nodes.find((n) => n.id === 'body')!
      if (node.kind !== 'mesh') throw new Error('Missing node')
      const grid = makeSceneGridGeometry(4, node.geometryId)
      act(() =>
        editor.getState().commit({
          ...initial,
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.('v_2_2', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.rotate }))
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.softMovement }))
      expect(screen.getByRole('button', { name: COPY.scene.rotate }).hasAttribute('disabled')).toBe(
        true,
      )
      expect(screen.getByRole('button', { name: COPY.scene.scale }).hasAttribute('disabled')).toBe(
        true,
      )
      expect(
        screen.getByRole('button', { name: COPY.scene.move }).getAttribute('aria-pressed'),
      ).toBe('true')
      const reach = screen.getByRole('spinbutton', { name: COPY.scene.softMovementReach })
      fireEvent.change(reach, { target: { value: '0' } })
      expect(reach.getAttribute('aria-invalid')).toBe('true')
      expect(screen.getByRole('button', { name: COPY.scene.move }).hasAttribute('disabled')).toBe(
        true,
      )
      act(() => {
        expect(ports.at(-1)!.callbacks.transform!.begin()).toBe(false)
      })
      fireEvent.change(reach, { target: { value: '0.5' } })
      expect(editor.getState().asset).toBe(before)
      const delta = identityMatrix()
      delta[14] = 0.25
      act(() => {
        expect(ports.at(-1)!.callbacks.transform!.begin()).toBe(true)
      })
      expect(reach.closest('fieldset')?.disabled).toBe(true)
      fireEvent.change(reach, { target: { value: '2' } })
      act(() => {
        expect(ports.at(-1)!.callbacks.transform!.preview(delta)).toBe(true)
      })
      act(() => ports.at(-1)!.callbacks.transform!.end(true))
      const result = editor.getState().asset.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(result.vertices.v_2_2![2]).toBe(0.25)
      expect(result.vertices.v_3_2![2]).toBe(0.125)
      expect(result.vertices.v_0_0).toBe(grid.vertices.v_0_0)
      expect(result.faces).toBe(grid.faces)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test.each([
    2, 33,
  ])('thickness previews a %s-wide sheet, restores zero/cancel and commits a single undo', async (size) => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const initial = editor.getState().asset
      const body = initial.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(size, body.geometryId)
      act(() =>
        editor.getState().commit({
          ...initial,
          geometries: initial.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceAll }))
      const before = editor.getState().asset
      const open = () =>
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.thickness }))
      const change = (value: string) =>
        fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.thicknessAmount }), {
          target: { value },
        })
      const confirm = () => screen.getByRole('button', { name: COPY.scene.previewConfirm })
      const ready = () =>
        waitFor(() => expect(confirm().hasAttribute('disabled')).toBe(false), { timeout: 4000 })
      open()
      change('-1')
      expect(confirm().hasAttribute('disabled')).toBe(true)
      expect(editor.getState().asset).toBe(before)
      change('0.125')
      await ready()
      const first = editor.getState().asset.geometries[0]!
      if (first.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(first.faces)).toHaveLength(size * size * 2 + size * 4)
      change('0')
      await ready()
      expect(editor.getState().asset).toBe(before)
      change('0.25')
      await ready()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.previewCancel }))
      expect(editor.getState().asset).toBe(before)
      open()
      change('0.5')
      await ready()
      fireEvent.click(confirm())
      expect(editor.getState().asset.images).toBe(before.images)
      expect(ports.at(-1)!.faces?.ids).toEqual(Object.keys(grid.faces))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  }, 10_000)
  test('welding chosen detached points reports exact impact, preserves paint and restores the split with undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const mesh = editor.getState().asset.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(Object.keys(mesh.faces)[0]!, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceActions.detach }))
      const detached = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      expect(
        screen.getByRole('button', { name: COPY.scene.weldPoints }).hasAttribute('disabled'),
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentAll.vertex }))
      expect(screen.queryByText(COPY.scene.weldImpact(4, 4, 1, 0)) !== null).toBe(true)
      expect(editor.getState().asset).toBe(detached)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.weldPoints }))
      const result = editor.getState().asset.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.vertices)).toHaveLength(8)
      expect(Object.keys(result.faces)).toHaveLength(6)
      expect(editor.getState().asset.images).toBe(detached.images)
      expect(ports.at(-1)!.faces?.ids).toHaveLength(8)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(detached.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('a strip cut selects its new lines, keeps materials and is a single undo from the edge panel', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      const seed = [...meshComponentEdges(mesh).keys()][0]!
      act(() => ports.at(-1)!.callbacks.selectComponent?.(seed, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.cutRing }))
      const after = editor.getState().asset
      const result = after.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.faces)).toHaveLength(10)
      expect(Object.keys(result.vertices)).toHaveLength(12)
      expect(after.images).toBe(before.images)
      expect(after.materials).toBe(before.materials)
      expect(ports.at(-1)!.faces?.ids).toHaveLength(4)
      for (const id of ports.at(-1)!.faces!.ids)
        expect(meshComponentEdges(result).has(id)).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('point tools distinguish construction lines from face cuts, explain refused cuts and share undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      const corners = Object.values(mesh.faces)[0]!.corners
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      expect(
        screen.getByRole('button', { name: COPY.scene.connectPoints.cut }).hasAttribute('disabled'),
      ).toBe(true)
      act(() =>
        ports
          .at(-1)!
          .callbacks.selectComponents?.([corners[0]!.vertexId, corners[1]!.vertexId], false),
      )
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.connectPoints.cut }))
      expect(screen.queryByText(/Já existe uma linha de face/) !== null).toBe(true)
      expect(editor.getState().asset).toBe(before)
      const pair = [corners[0]!.vertexId, corners[2]!.vertexId]
      act(() => ports.at(-1)!.callbacks.selectComponents?.(pair, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.connectPoints.line }))
      const line = editor.getState().asset.geometries[0]!
      if (line.kind !== 'mesh') throw new Error('Missing mesh')
      expect(line.faces).toBe(mesh.faces)
      expect(line.looseEdges).toHaveLength(1)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.connectPoints.cut }))
      const result = editor.getState().asset.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.faces)).toHaveLength(7)
      expect(result.looseEdges).toEqual(line.looseEdges)
      expect(ports.at(-1)!.faces).toEqual({ nodeId: 'body', mode: 'vertex', ids: pair })
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries[0]).toEqual(line)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('advanced selection is progressive, keeps the current mode and creates no undo entries', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(Object.keys(mesh.faces)[0]!, false))
      fireEvent.click(screen.getByText(COPY.scene.componentMoreSelection))
      const choose = (action: keyof typeof COPY.scene.componentSelectionActions) =>
        fireEvent.click(
          screen.getByRole('button', { name: COPY.scene.componentSelectionActions[action] }),
        )
      choose('grow')
      expect(ports.at(-1)!.faces?.ids).toHaveLength(5)
      choose('shrink')
      expect(ports.at(-1)!.faces?.ids).toHaveLength(1)
      choose('invert')
      expect(ports.at(-1)!.faces?.ids).toHaveLength(5)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      act(() =>
        ports.at(-1)!.callbacks.selectComponent?.([...meshComponentEdges(mesh).keys()][0]!, false),
      )
      choose('ring')
      expect(ports.at(-1)!.faces?.ids).toHaveLength(4)
      expect(ports.at(-1)!.faces?.mode).toBe('edge')
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries[0]!.kind).toBe('box')
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('dissolving an internal line keeps the surface, clears removed IDs and can be undone', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const mesh = editor.getState().asset.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      const oldEdges = meshComponentEdges(mesh)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(Object.keys(mesh.faces)[0]!, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceActions.triangulate }))
      const triangles = editor.getState().asset
      const divided = triangles.geometries[0]!
      if (divided.kind !== 'mesh') throw new Error('Missing mesh')
      const diagonal = [...meshComponentEdges(divided).keys()].find((id) => !oldEdges.has(id))!
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(diagonal, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.dissolveEdges }))
      const result = editor.getState().asset.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.faces)).toHaveLength(6)
      expect([...meshComponentEdges(result).keys()].sort()).toEqual([...oldEdges.keys()].sort())
      expect(ports.at(-1)!.faces).toEqual({ nodeId: 'body', mode: 'edge', ids: [] })
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(triangles.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('joining triangles retains the chosen face identity and paint with a separate undo for each operation', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      const faceId = Object.keys(mesh.faces)[0]!
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.(faceId, false))
      expect(
        screen.getByRole('button', { name: COPY.scene.faceActions.merge }).hasAttribute('disabled'),
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceActions.triangulate }))
      const triangles = editor.getState().asset
      expect(ports.at(-1)!.faces?.ids).toHaveLength(2)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceActions.merge }))
      const joined = editor.getState().asset
      const result = joined.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.faces)).toHaveLength(6)
      expect(result.faces[faceId]!.corners).toHaveLength(4)
      expect(result.vertices).toEqual(mesh.vertices)
      expect(joined.images).toBe(before.images)
      expect(joined.materials).toBe(before.materials)
      expect(ports.at(-1)!.faces?.ids).toEqual([faceId])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(triangles.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('point deletion explains connected-face impact before changing topology and supports undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      const vertex = Object.keys(mesh.vertices)[0]!
      act(() => ports.at(-1)!.callbacks.selectComponent?.(vertex, false))
      expect(screen.queryByText(COPY.scene.componentRemovalImpact(3, 0)) !== null).toBe(true)
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentRemove.vertex }))
      const removed = editor.getState().asset.geometries[0]!
      if (removed.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(removed.vertices)).toHaveLength(7)
      expect(Object.keys(removed.faces)).toHaveLength(3)
      expect(editor.getState().asset.images).toBe(before.images)
      expect(ports.at(-1)!.faces?.ids).toEqual([])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('splitting lines selects both children, preserves paint and restores exact topology with undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      const edge = [...meshComponentEdges(mesh).keys()][0]!
      act(() => ports.at(-1)!.callbacks.selectComponent?.(edge, false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.splitEdges }))
      const first = editor.getState().asset
      const result = first.geometries[0]!
      if (result.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(result.vertices)).toHaveLength(Object.keys(mesh.vertices).length + 1)
      expect(first.images).toBe(before.images)
      expect(first.nodes).toEqual(before.nodes)
      expect(ports.at(-1)!.faces?.ids.length).toBe(2)
      expect(ports.at(-1)!.faces?.ids.includes(edge)).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.splitEdges }))
      expect(ports.at(-1)!.faces?.ids.length).toBe(4)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(first.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      expect(ports.at(-1)!.faces?.ids).toEqual([])
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('component area selections merge instead of toggling, clear without history, and cannot reopen a closed mode', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      const [a, b] = Object.keys(mesh.vertices)
      if (!a || !b) throw new Error('Missing vertices')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      const box = screen.getByRole('button', { name: COPY.scene.selectBox }) as HTMLButtonElement
      expect(box.disabled).toBe(false)
      fireEvent.click(box)
      expect(box.getAttribute('aria-pressed')).toBe('true')
      expect(screen.queryByText(COPY.scene.componentAreaHint) !== null).toBe(true)
      const through = screen.getByRole('checkbox', {
        name: COPY.scene.componentThrough,
      }) as HTMLInputElement
      fireEvent.click(through)
      expect(through.checked).toBe(true)
      const callbacks = ports.at(-1)!.callbacks
      act(() => callbacks.selectComponents?.([a!], false))
      act(() => callbacks.selectComponents?.([a!, b!, a!], true))
      expect(ports.at(-1)!.faces?.ids).toEqual([a, b])
      act(() => callbacks.selectComponents?.([], true))
      expect(ports.at(-1)!.faces?.ids).toEqual([a, b])
      act(() => callbacks.selectComponents?.([], false))
      expect(ports.at(-1)!.faces?.ids).toEqual([])
      expect(editor.getState().asset).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.finishFaces }))
      act(() => callbacks.selectComponents?.([a!], false))
      expect(ports.at(-1)!.faces === null).toBe(true)
      expect(editor.getState().asset).toBe(before)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('points and lines share selection, transforms and undo without applying face tools or moving the object', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const before = editor.getState().asset
      const mesh = before.geometries[0]!
      if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      expect(ports.at(-1)!.faces?.mode).toBe('vertex')
      expect(screen.queryByRole('button', { name: COPY.scene.facePreview.extrude }) === null).toBe(
        true,
      )
      const vertex = Object.keys(mesh.vertices)[0]!
      const callbacks = ports.at(-1)!.callbacks
      act(() => callbacks.selectComponent?.(vertex, false))
      expect(ports.at(-1)!.faces?.ids).toEqual([vertex])
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.vertex }))
      expect(ports.at(-1)!.faces?.ids).toEqual([vertex])
      const delta = identityMatrix()
      delta[12] = 0.123456789
      act(() => {
        expect(callbacks.transform!.begin()).toBe(true)
      })
      const edgeMode = screen.getByRole('button', { name: COPY.scene.componentModes.edge })
      expect(edgeMode.closest('fieldset')?.disabled).toBe(true)
      fireEvent.click(edgeMode)
      expect(ports.at(-1)!.faces?.mode).toBe('vertex')
      act(() => {
        expect(callbacks.transform!.preview(delta)).toBe(true)
      })
      act(() => callbacks.transform!.end(true))
      const moved = editor.getState().asset.geometries[0]!
      if (moved.kind !== 'mesh') throw new Error('Missing mesh')
      expect(moved.vertices[vertex]![0]).toBeCloseTo(mesh.vertices[vertex]![0] + delta[12], 12)
      expect(moved.faces).toBe(mesh.faces)
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.edge }))
      expect(ports.at(-1)!.faces?.ids).toEqual([])
      const edge = [...meshComponentEdges(mesh).keys()][0]!
      act(() => callbacks.selectComponent?.(edge, false))
      expect(ports.at(-1)!.faces?.ids).toEqual([edge])
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentConnected }))
      expect(ports.at(-1)!.faces?.ids.length).toBe(12)
      fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.title }), { key: 'Delete' })
      const removed = editor.getState().asset.geometries[0]!
      if (removed.kind !== 'mesh') throw new Error('Missing mesh')
      expect(Object.keys(removed.faces)).toHaveLength(0)
      expect(removed.vertices).toEqual(mesh.vertices)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(before.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.componentModes.face }))
      expect(screen.queryByRole('button', { name: COPY.scene.facePreview.extrude }) !== null).toBe(
        true,
      )
      expect(ports.at(-1)!.faces?.ids).toEqual([])
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('subdivision previews selected children, returns to zero, validates integer levels and commits one undo', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.('px', false))
      const source = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.subdivide }))
      const input = screen.getByRole('spinbutton', { name: COPY.scene.subdivideAmount })
      const confirm = () => screen.getByRole('button', { name: COPY.scene.previewConfirm })
      const ready = () =>
        waitFor(() => expect(confirm().hasAttribute('disabled')).toBe(false), { timeout: 4000 })
      fireEvent.change(input, { target: { value: '1' } })
      expect(confirm().hasAttribute('disabled')).toBe(true)
      await ready()
      expect(ports.at(-1)!.faces?.ids).toHaveLength(4)
      fireEvent.change(input, { target: { value: '2' } })
      await ready()
      expect(ports.at(-1)!.faces?.ids).toHaveLength(16)
      fireEvent.change(input, { target: { value: '0' } })
      await ready()
      expect(editor.getState().asset === source).toBe(true)
      expect(ports.at(-1)!.faces?.ids).toEqual(['px'])
      fireEvent.change(input, { target: { value: '1.5' } })
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(confirm().hasAttribute('disabled')).toBe(true)
      fireEvent.change(input, { target: { value: '1' } })
      await ready()
      fireEvent.click(confirm())
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().asset.images).toBe(source.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  }, 10_000)
  test('large surface previews run in a real worker, wait before confirming, and reject a later external revision', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const source = editor.getState().asset
      const body = source.nodes.find((n) => n.id === 'body')!
      if (body.kind !== 'mesh') throw new Error('Missing body')
      const grid = makeSceneGridGeometry(33, body.geometryId)
      act(() =>
        editor.getState().commit({
          ...source,
          geometries: source.geometries.map((g) => (g.id === grid.id ? grid : g)),
        }),
      )
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      act(() => ports.at(-1)!.callbacks.selectComponent?.('f_0_0', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.inset }))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.insetAmount }), {
        target: { value: '25' },
      })
      expect(
        screen.getByRole('button', { name: COPY.scene.previewConfirm }).hasAttribute('disabled'),
      ).toBe(true)
      await waitFor(
        () =>
          expect(
            screen
              .getByRole('button', { name: COPY.scene.previewConfirm })
              .hasAttribute('disabled'),
          ).toBe(false),
        { timeout: 4000 },
      )
      const preview = editor.getState().asset
      expect(preview.geometries).not.toEqual(source.geometries)
      expect(preview.images).toBe(source.images)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.previewConfirm }))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries.find((g) => g.id === grid.id)).toEqual(grid)
      const beforeCancel = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.inset }))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.insetAmount }), {
        target: { value: '30' },
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.previewCancel }))
      expect(editor.getState().asset === beforeCancel).toBe(true)
      expect(screen.queryByRole('button', { name: COPY.scene.previewConfirm }) === null).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.inset }))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.insetAmount }), {
        target: { value: '40' },
      })
      act(() => editor.getState().commit({ ...editor.getState().asset, name: 'Mudança de fora' }))
      const latest = editor.getState().asset
      await waitFor(
        () =>
          expect(screen.queryByRole('button', { name: COPY.scene.previewConfirm }) === null).toBe(
            true,
          ),
        { timeout: 4000 },
      )
      expect(editor.getState().asset).toBe(latest)
      expect(screen.getByText(COPY.scene.previewChanged)).toBeDefined()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  }, 10_000)
  test('completed local and worker surface previews close immediately when an external revision arrives', async () => {
    for (const size of [1, 33]) {
      const { editor, ports, view, openInspector } = setup()
      try {
        await waitFor(() => expect(ports.length).toBeGreaterThan(0))
        const source = editor.getState().asset,
          body = source.nodes.find((node) => node.id === 'body')!
        if (body.kind !== 'mesh') throw new Error('Missing body')
        const grid = makeSceneGridGeometry(size, body.geometryId)
        act(() =>
          editor.getState().commit({
            ...source,
            geometries: source.geometries.map((geometry) =>
              geometry.id === grid.id ? grid : geometry,
            ),
          }),
        )
        openInspector()
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
        act(() => ports.at(-1)!.callbacks.selectComponent?.('f_0_0', false))
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.inset }))
        fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.insetAmount }), {
          target: { value: '25' },
        })
        await waitFor(
          () =>
            expect(
              screen
                .getByRole('button', { name: COPY.scene.previewConfirm })
                .hasAttribute('disabled'),
            ).toBe(false),
          { timeout: 4000 },
        )
        act(() =>
          editor
            .getState()
            .commit({ ...editor.getState().asset, name: 'Revisão após resultado concluído' }),
        )
        const latest = editor.getState().asset
        expect(screen.queryByRole('button', { name: COPY.scene.previewConfirm }) === null).toBe(
          true,
        )
        expect(screen.getByText(COPY.scene.previewChanged)).toBeDefined()
        expect(editor.getState().asset).toBe(latest)
      } finally {
        view.unmount()
        editor.getState().dispose()
      }
    }
  }, 10_000)
  test('face handles change geometry, never object transforms, and panel commands cancel before running', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      const callbacks = ports.at(-1)!.callbacks
      act(() => callbacks.selectComponent?.('px', false))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.move }))
      const source = editor.getState().asset
      const delta = identityMatrix()
      delta[12] = 0.75
      act(() => {
        expect(callbacks.transform!.begin()).toBe(true)
        expect(callbacks.transform!.preview(delta)).toBe(true)
      })
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().asset.geometries).not.toEqual(source.geometries)
      act(() => callbacks.transform!.end(true))
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      act(() => {
        callbacks.transform!.begin()
        callbacks.transform!.preview(delta)
      })
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.duplicate }))
      expect(editor.getState().asset.geometries.slice(0, source.geometries.length)).toEqual(
        source.geometries,
      )
      const copied = editor.getState().asset
      act(() => callbacks.transform!.end(true))
      expect(editor.getState().asset).toBe(copied)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('surface previews support confirm/undo and cancel on Escape, blur, context loss and inspector close', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      const callbacks = ports.at(-1)!.callbacks
      act(() => callbacks.selectComponent?.('px', false))
      const source = editor.getState().asset
      const start = (value: string) => {
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.extrude }))
        fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.extrudeAmount }), {
          target: { value },
        })
        expect(editor.getState().asset.geometries).not.toEqual(source.geometries)
      }
      start('1')
      const first = editor.getState().asset
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.extrudeAmount }), {
        target: { value: '2' },
      })
      expect(editor.getState().asset.geometries).not.toEqual(first.geometries)
      fireEvent.keyDown(screen.getByRole('spinbutton', { name: COPY.scene.extrudeAmount }), {
        key: 'Escape',
      })
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: COPY.scene.facePreview.extrude }),
      )
      start('1')
      act(() => window.dispatchEvent(new Event('blur')))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      start('1')
      act(() => callbacks.contextLost(true))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      act(() => callbacks.contextLost(false))
      start('1')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.inspector.close }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.facePreview.inset }))
      fireEvent.change(screen.getByRole('spinbutton', { name: COPY.scene.insetAmount }), {
        target: { value: '25' },
      })
      const inset = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.previewConfirm }))
      expect(editor.getState().asset.geometries).toEqual(inset.geometries)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('face controls and keyboard edit only faces, preserve undo, and ignore callbacks after exiting', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      const source = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.editFaces }))
      const callbacks = ports.at(-1)!.callbacks
      expect(ports.at(-1)!.faces).toEqual({ nodeId: 'body', mode: 'face' as const, ids: [] })
      expect(screen.getByRole('button', { name: COPY.scene.remove }).hasAttribute('disabled')).toBe(
        true,
      )
      act(() => callbacks.selectComponent?.('px', false))
      expect(screen.getByText(COPY.scene.faceCount(1))).toBeDefined()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.faceActions.triangulate }))
      expect(ports.at(-1)!.faces!.ids).toHaveLength(2)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(ports.at(-1)!.faces!.ids).toEqual(['px'])
      const section = screen.getByRole('region', { name: COPY.scene.title })
      fireEvent.keyDown(section, { key: 'a', ctrlKey: true })
      expect(ports.at(-1)!.faces!.ids).toHaveLength(6)
      fireEvent.keyDown(section, { key: 'Delete' })
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      const body = editor.getState().asset.nodes.find((n) => n.id === 'body')!
      const geometry =
        body.kind === 'mesh'
          ? editor.getState().asset.geometries.find((g) => g.id === body.geometryId)
          : null
      expect(geometry?.kind === 'mesh' && Object.keys(geometry.faces)).toEqual([])
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      fireEvent.keyDown(section, { key: 'Escape' })
      expect(ports.at(-1)!.faces).toBeNull()
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: COPY.scene.editFaces }),
      )
      act(() => callbacks.selectComponent?.('px', false))
      expect(ports.at(-1)!.faces).toBeNull()
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('converts selected primitives together and undo restores parametric controls', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      const source = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('asa') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.convertMesh }))
      expect(editor.getState().asset.geometries.every((g) => g.kind === 'mesh')).toBe(true)
      expect(ports.at(-1)?.selected).toEqual(['body', 'wing'])
      expect(
        screen.getByRole('button', { name: COPY.scene.convertMesh }).hasAttribute('disabled'),
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().canUndo).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      expect(screen.getByText(COPY.scene.dimensions)).toBeDefined()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('region choices are additive session state and overlays do not create history', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      const callbacks = ports.at(-1)?.callbacks
      if (!callbacks) throw new Error('Missing viewport')
      const source = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.selectBox }))
      expect(screen.getByRole('checkbox', { name: COPY.scene.selectThrough })).toBeDefined()
      act(() => callbacks.selectMany?.(['body'], false))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
      act(() => callbacks.selectMany?.(['wing', 'deleted'], false))
      expect(ports.at(-1)?.selected).toEqual(['body', 'wing'])
      act(() =>
        callbacks.areaChanged?.([
          [0.1, 0.2],
          [0.4, 0.2],
          [0.4, 0.8],
        ]),
      )
      expect(view.container.querySelector('svg path[fill-rule="evenodd"]')).not.toBeNull()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      act(() => callbacks.areaChanged?.([]))
      expect(view.container.querySelector('svg path[fill-rule="evenodd"]')).toBeNull()
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('viewport gesture callbacks preserve the selected revision and cancel before a panel command', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      const callbacks = ports.at(-1)?.callbacks.transform
      if (!callbacks) throw new Error('Missing transform bridge')
      const before = editor.getState().asset
      const delta = identityMatrix()
      delta[12] = 3
      act(() => {
        expect(callbacks.begin()).toBe(true)
        expect(callbacks.preview(delta)).toBe(true)
      })
      expect(editor.getState().asset).not.toBe(before)
      expect(editor.getState().canUndo).toBe(false)
      const input = screen.getByRole('textbox', { name: COPY.scene.nodeName })
      fireEvent.change(input, { target: { value: 'Braço' } })
      fireEvent.submit(input.closest('form')!)
      const named = editor.getState().asset
      expect(named.nodes[0]?.transform).toEqual(before.nodes[0]?.transform)
      expect(named.nodes[0]?.name).toBe('Braço')
      act(() => callbacks.end(true))
      expect(editor.getState().asset).toBe(named)
      act(() => editor.getState().undo())
      expect(editor.getState().asset.nodes).toEqual(before.nodes)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('shape dimensions, locator creation and mirror removal are reachable from native controls', () => {
    const { editor, view, openInspector } = setup()
    try {
      const add = screen.getByText(COPY.scene.add)
      fireEvent.click(add)
      fireEvent.click(screen.getByRole('button', { name: COPY.shapes.cylinder }))
      openInspector()
      const primary = editor.getState().asset.nodes.at(-1)
      if (primary?.kind !== 'mesh') throw new Error('Missing cylinder')
      fireEvent.click(screen.getByText(COPY.scene.dimensions))
      const x = screen.getByRole('spinbutton', { name: `${COPY.scene.dimensions} X` })
      fireEvent.change(x, { target: { value: '4' } })
      fireEvent.submit(x.closest('form')!)
      const geometry = editor.getState().asset.geometries.at(-1)
      if (!geometry || geometry.kind === 'mesh' || geometry.kind === 'path')
        throw new Error('Missing primitive')
      expect(geometry.to[0] - geometry.from[0]).toBe(4)
      fireEvent.click(screen.getByText(COPY.scene.mirrors))
      const offset = screen.getByRole('spinbutton', { name: COPY.scene.mirrorOffset })
      fireEvent.change(offset, { target: { value: '2.5' } })
      fireEvent.submit(offset.closest('form')!)
      expect(editor.getState().asset.mirrors[0]?.offset).toBe(2.5)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.removeMirror('X', 2.5) }))
      expect(editor.getState().asset.mirrors).toHaveLength(0)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addLocator }))
      expect(editor.getState().asset.nodes.at(-1)?.kind).toBe('locator')
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
  test('touch multiselect, group, rename, movement, undo and isolation share one document', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('asa') }))
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.group }))
      expect(editor.getState().asset.nodes).toHaveLength(3)
      expect(editor.getState().contentRevision).toBe(1)
      const input = screen.getByRole('textbox', { name: COPY.scene.nodeName })
      fireEvent.change(input, { target: { value: 'Meu robô' } })
      fireEvent.submit(input.closest('form')!)
      expect(editor.getState().asset.nodes.at(-1)?.name).toBe('Meu robô')
      const x = screen.getByRole('spinbutton', { name: `${COPY.scene.move} X` })
      fireEvent.change(x, { target: { value: '3' } })
      fireEvent.submit(x.closest('form')!)
      expect(editor.getState().contentRevision).toBe(3)
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
      expect(editor.getState().asset.nodes.at(-1)?.name).toBe('Meu robô')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.isolation.toggle }))
      expect(ports.at(-1)?.isolated).toEqual([editor.getState().asset.nodes.at(-1)?.id ?? ''])
      fireEvent.keyDown(screen.getByRole('textbox', { name: COPY.scene.nodeName }), {
        key: 'Delete',
      })
      expect(editor.getState().asset.nodes).toHaveLength(3)
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.save }))
      await waitFor(() => expect(editor.getState().saveState).toBe('saved'))
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
    expect(ports.every((port) => port.disposed === 1)).toBe(true)
  })

  test('3D selection follows current additive mode, locked commands report errors, context loss keeps edits', async () => {
    const { editor, ports, view, openInspector } = setup()
    try {
      await waitFor(() => expect(ports.length).toBeGreaterThan(0))
      openInspector()
      const port = ports.at(-1)
      if (!port) throw new Error('No viewport')
      act(() => port.callbacks.select('body', false))
      fireEvent.click(screen.getByRole('checkbox', { name: COPY.scene.locked }))
      const before = editor.getState().asset
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.remove }))
      expect(editor.getState().asset).toBe(before)
      expect(screen.getByRole('alert').textContent).toContain('Destrave')
      act(() => port.callbacks.contextLost(true))
      expect(screen.getByText(COPY.scene.lost3d)).toBeDefined()
      expect(editor.getState().asset).toBe(before)
      act(() => port.callbacks.contextLost(false))
      expect(screen.queryByText(COPY.scene.lost3d)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: COPY.scene.addSelection }))
      act(() => port.callbacks.select('wing', false))
      expect(port.selected).toEqual(['body', 'wing'])
    } finally {
      view.unmount()
      editor.getState().dispose()
    }
  })
})
