import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import {
  AxesHelper,
  Box3Helper,
  type Camera,
  Mesh,
  OrthographicCamera,
  Points,
  type Scene,
  SkinnedMesh,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createModelAsset } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { addScenePrimitive, convertSceneNodesToMesh, transformSceneNodes } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { setSceneImageFlipbook } from '../scene/imageFlipbookCommands'
import { type AffineMatrix, identityMatrix, transformPoint } from '../scene/matrix'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { ensureScenePaintSurface } from '../scene/paintSurface'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { createSceneSkin, setSceneSkinWeights } from '../scene/skinCommands'
import { prepareSceneTwoBonePose } from '../scene/twoBonePose'
import { createDocumentEditorStore } from '../state/editorStore'
import { SceneAnimationPlayer } from '../state/SceneAnimationPlayer'
import { SceneAnimationPoseGesture } from '../state/SceneAnimationPoseGesture'
import { createSceneComponentTransformGesture } from '../state/sceneComponentTransformGesture'
import { createScenePaintGesture } from '../state/scenePaintGesture'
import { createSceneSkinPaintGesture } from '../state/sceneSkinPaintGesture'
import { createSceneTransformGesture } from '../state/sceneTransformGesture'
import { makeModel } from '../testing/fixtures'
import { animatedScene, sceneAnimationClip } from '../testing/sceneAnimation'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { makeSceneTwoBoneFixture } from '../testing/sceneTwoBone'
import { SceneViewport } from './SceneViewport'
import type {
  ScenePaintActions,
  SceneSelectDetail,
  SceneSkinPaintActions,
  SceneTransformActions,
} from './sceneViewportTypes'
import { ViewportThumbnail } from './viewportThumbnail'

let request: typeof requestAnimationFrame
let cancel: typeof cancelAnimationFrame
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  request = globalThis.requestAnimationFrame
  cancel = globalThis.cancelAnimationFrame
  frames = new Map()
  let next = 0
  globalThis.requestAnimationFrame = (fn) => {
    frames.set(++next, fn)
    return next
  }
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id)
  }
})
afterEach(() => {
  globalThis.requestAnimationFrame = request
  globalThis.cancelAnimationFrame = cancel
})

function setup(
  transform?: SceneTransformActions,
  paint?: ScenePaintActions,
  skinPaint?: SceneSkinPaintActions,
  gpuCapture = false,
  reducedMotion = true,
) {
  const host = document.createElement('div')
  Object.defineProperties(host, { clientWidth: { value: 320 }, clientHeight: { value: 180 } })
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, { clientWidth: { value: 320 }, clientHeight: { value: 180 } })
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 320, 180)
  canvas.setPointerCapture = () => {}
  canvas.releasePointerCapture = () => {}
  canvas.hasPointerCapture = () => false
  host.append(canvas)
  document.body.append(host)
  let renders = 0
  let disposals = 0
  let camera: Camera | undefined
  let scene: Scene | undefined
  const picks: Array<string | null> = []
  const details: Array<SceneSelectDetail | null> = []
  const faces: Array<string | null> = []
  const contexts: boolean[] = []
  const groups: Array<readonly string[]> = []
  const components: Array<readonly string[]> = []
  const viewport = new SceneViewport(
    canvas,
    {
      select: (id, _additive, detail) => {
        picks.push(id)
        details.push(detail ?? null)
      },
      selectComponent: (id) => faces.push(id),
      selectComponents: (ids) => components.push(ids),
      selectMany: (ids) => groups.push(ids),
      contextLost: (lost) => contexts.push(lost),
      transform,
      paint,
      skinPaint,
    },
    reducedMotion,
    () =>
      Object.assign(Object.create(gpuCapture ? WebGLRenderer.prototype : Object.prototype), {
        setPixelRatio: () => {},
        setClearColor: () => {},
        setSize: () => {},
        dispose: () => {
          disposals++
        },
        render: (world: Scene, activeCamera: Camera) => {
          world.updateMatrixWorld(true)
          activeCamera.updateMatrixWorld(true)
          camera = activeCamera
          scene = world as Scene
          renders++
        },
      }),
  )
  const source = migrateLegacyModel(createModelAsset({ name: 'Caixa' })).document
  viewport.setDocument(source)
  viewport.setView('front')
  function tick() {
    const next = [...frames.values()]
    frames.clear()
    for (const fn of next) fn(0)
  }
  tick()
  if (!camera) throw new Error('Missing rendered camera')
  const point = new Vector3(0, 1, 0).project(camera)
  const x = (point.x + 1) * 160
  const y = (1 - point.y) * 90
  const pointer = (type: string, id = 1, extra: PointerEventInit = {}) =>
    canvas.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType: 'mouse',
        button: 0,
        clientX: x,
        clientY: y,
        bubbles: true,
        ...extra,
      }),
    )
  return {
    viewport,
    source,
    picks,
    details,
    faces,
    contexts,
    groups,
    components,
    canvas,
    tick,
    pointer,
    x,
    count: () => ({ renders, disposals, scene, camera }),
    close: () => {
      viewport.dispose()
      host.remove()
    },
  }
}

describe('scene viewport lifecycle and picking', () => {
  test('thumbnail capture works at rest and refuses a transient animation pose until it is cleared', () => {
    const capture = spyOn(ViewportThumbnail.prototype, 'render').mockReturnValue(
      'data:image/jpeg;base64,AAAA',
    )
    const f = setup(undefined, undefined, undefined, true)
    try {
      const source = animatedScene()
      f.viewport.setDocument(source)
      expect(f.viewport.renderThumb()).toBe('data:image/jpeg;base64,AAAA')
      expect(capture).toHaveBeenCalledTimes(1)
      f.viewport.setPose(prepareSceneAnimation(source, source.animations[0]!.id).sample(1))
      expect(f.viewport.renderThumb()).toBeNull()
      expect(capture).toHaveBeenCalledTimes(1)
      f.viewport.setPose(null)
      expect(f.viewport.renderThumb()).toBe('data:image/jpeg;base64,AAAA')
      expect(capture).toHaveBeenCalledTimes(2)
    } finally {
      f.close()
      capture.mockRestore()
    }
  })

  test('movement steps snap the relative world displacement, retain fractional coordinates and undo in one step', () => {
    let gesture: ReturnType<typeof createSceneTransformGesture> | undefined
    const f = setup({
      begin: () => gesture?.begin(f.source.nodes.map((node) => node.id)) ?? false,
      preview: (delta) => {
        const result = gesture?.preview(delta) ?? false
        f.viewport.setDocument(editor.getState().asset)
        return result
      },
      end: (commit) => {
        gesture?.end(commit)
        f.viewport.setDocument(editor.getState().asset)
      },
    })
    const shift = identityMatrix()
    shift[12] = 0.37
    const source = transformSceneNodes(
      f.source,
      f.source.nodes.map((node) => node.id),
      shift,
    )
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: { save: async () => {} },
    })
    gesture = createSceneTransformGesture(editor, (error) => {
      throw error
    })
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(source.nodes.map((node) => node.id))
      f.viewport.setTransformTool('move')
      f.viewport.setMovementStep(0.5)
      f.viewport.setGridVisible(false)
      f.tick()
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      const point = new Vector3(0.37, 1, 0).project(f.count().camera!)
      const x = (point.x + 1) * 160,
        y = (1 - point.y) * 90
      f.pointer('pointermove', 1, { clientX: x + 20, clientY: y, button: -1 })
      f.pointer('pointerdown', 1, { clientX: x + 20, clientY: y, buttons: 1 })
      f.pointer('pointermove', 1, { clientX: x + 45, clientY: y, button: -1, buttons: 1 })
      const moved = indexSceneDocument(editor.getState().asset).scene.worldMatrices.get(
        source.nodes[0]!.id,
      )!
      const original = indexSceneDocument(source).scene.worldMatrices.get(source.nodes[0]!.id)!
      const delta = moved[12] - original[12]
      expect(delta).toBeGreaterThan(0)
      expect(delta / 0.5).toBeCloseTo(Math.round(delta / 0.5), 10)
      expect(editor.getState().canUndo).toBe(false)
      f.pointer('pointerup', 1, { clientX: x + 45, clientY: y })
      expect(editor.getState().canUndo).toBe(true)
      editor.getState().undo()
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      f.close()
      editor.getState().dispose()
    }
  })

  test('real destination arrows move the requested target, retain it after release and cancel only the next drag', () => {
    let actions: SceneTransformActions | undefined
    const f = setup({
        begin: () => actions?.begin() ?? false,
        preview: (delta) => actions?.preview(delta) ?? false,
        end: (commit) => actions?.end(commit),
      }),
      source = makeSceneTwoBoneFixture(),
      editor = createDocumentEditorStore({
        asset: source,
        sizeOf: structuredBytes,
        persistence: { save: async () => {} },
        autosaveMs: 60_000,
      }),
      player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel() {} }),
      gesture = new SceneAnimationPoseGesture(editor, player),
      disconnect = gesture.connect()
    player.setClip(source, 'clip')
    actions = gesture.transformActions(['tip'])
    const off = gesture.subscribe(() =>
      f.viewport.setPose(gesture.getSnapshot().pose ?? player.getSnapshot().pose),
    )
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['tip'])
      f.viewport.setAnimationEditing(true)
      f.viewport.setView('front')
      f.viewport.setTransformTool('move')
      f.tick()
      const camera = f.count().camera!
      if (!(camera instanceof OrthographicCamera)) throw new Error('Expected front view')
      camera.zoom = 0.5
      camera.updateProjectionMatrix()
      gesture.setAutoKey(true)
      gesture.beginTwoBone(['root', 'middle', 'tip'])!.sample([3, 0, 0])
      f.tick()
      const screenTarget = () => {
          const target = gesture.getSnapshot().pose!.twoBoneGuide!.target,
            projected = new Vector3(...target).project(camera)
          return { x: (projected.x + 1) * 160, y: (1 - projected.y) * 90 }
        },
        start = screenTarget()
      expect(start.x).toBeGreaterThan(20)
      expect(start.x + 20).toBeLessThan(320)
      f.pointer('pointermove', 1, { clientX: start.x + 20, clientY: start.y, button: -1 })
      f.pointer('pointerdown', 1, { clientX: start.x + 20, clientY: start.y, buttons: 1 })
      expect(gesture.getSnapshot().dragging).toBe(true)
      f.pointer('pointermove', 1, {
        clientX: start.x - 20,
        clientY: start.y,
        buttons: 1,
        button: -1,
      })
      const pose = gesture.getSnapshot().pose!
      expect(pose.twoBoneGuide!.target[0]).toBeLessThan(3)
      f.pointer('pointerup', 1, { clientX: start.x - 20, clientY: start.y })
      expect(gesture.getSnapshot().dragging).toBe(false)
      expect(gesture.getSnapshot().pose).toBe(pose)
      expect(editor.getState().asset).toBe(source)
      f.tick()
      const next = screenTarget()
      f.pointer('pointermove', 2, { clientX: next.x + 20, clientY: next.y, button: -1 })
      f.pointer('pointerdown', 2, { clientX: next.x + 20, clientY: next.y, buttons: 1 })
      expect(gesture.getSnapshot().dragging).toBe(true)
      f.pointer('pointermove', 2, { clientX: next.x + 30, clientY: next.y, buttons: 1, button: -1 })
      f.pointer('pointercancel', 2)
      expect(gesture.getSnapshot().pose).toBe(pose)
      expect(gesture.getSnapshot().dragging).toBe(false)
      f.tick()
      const touch = screenTarget()
      f.pointer('pointerdown', 3, {
        pointerType: 'touch',
        clientX: touch.x + 20,
        clientY: touch.y,
        buttons: 1,
      })
      expect(gesture.getSnapshot().dragging).toBe(true)
      f.pointer('pointermove', 3, {
        pointerType: 'touch',
        clientX: touch.x + 30,
        clientY: touch.y,
        buttons: 1,
        button: -1,
      })
      f.pointer('pointerdown', 4, {
        pointerType: 'touch',
        clientX: touch.x - 20,
        clientY: touch.y,
        buttons: 1,
      })
      expect(gesture.getSnapshot().dragging).toBe(false)
      expect(gesture.getSnapshot().pose).toBe(pose)
      f.pointer('pointerup', 4, { pointerType: 'touch' })
      f.pointer('pointermove', 3, {
        pointerType: 'touch',
        clientX: touch.x + 40,
        clientY: touch.y,
        buttons: 1,
        button: -1,
      })
      f.pointer('pointerup', 3, { pointerType: 'touch' })
      expect(gesture.getSnapshot().pose).toBe(pose)
      expect(f.picks).toEqual([])
      expect(editor.getState().canUndo).toBe(false)
      expect(gesture.record()).toBe(true)
      expect(
        prepareSceneAnimation(editor.getState().asset, 'clip').sample(0, false).worldMatrices,
      ).toEqual(pose.worldMatrices)
    } finally {
      off()
      disconnect()
      f.close()
      editor.getState().dispose()
    }
  })

  test('two-bone destination-only changes redraw independently of mesh movement and do not revive canceled or foreign guides', () => {
    const f = setup({ begin: () => false, preview: () => false, end() {} }),
      source = makeSceneTwoBoneFixture(),
      prepared = prepareSceneTwoBonePose(source, 'clip', ['root', 'middle', 'tip'], 0)
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['tip'])
      f.viewport.setAnimationEditing(true)
      f.viewport.setSupportGuides(true)
      f.viewport.setTransformTool('move')
      f.viewport.setPose(prepared.sample([3, 0, 0]).pose)
      f.tick()
      const guide = f.count().scene!.getObjectByName('molda-two-bone-guide')!,
        markers = guide.children.filter((object) => object instanceof Points),
        destination = markers[1]!.geometry.getAttribute('position'),
        before = f.count().renders
      const helper = f.count().scene!.getObjectByProperty('isTransformControlsRoot', true)!,
        proxy = helper.parent!.children[0]!
      expect(proxy.position.x).toBe(3)
      expect(guide.visible).toBe(true)
      expect(destination.getX(0)).toBe(3)
      expect(markers.map((marker) => marker.geometry.drawRange.count)).toEqual([4, 1])
      f.viewport.setPose(prepared.sample([4, 0, 0]).pose)
      f.tick()
      expect(destination.getX(0)).toBe(4)
      expect(f.count().renders).toBe(before + 1)
      const version = destination.version
      f.viewport.setPose(prepared.sample([4, 0, 0]).pose)
      f.tick()
      expect(f.count().renders).toBe(before + 1)
      expect(destination.version).toBe(version)
      f.viewport.setPose({
        ...prepared.sample([5, 0, 0]).pose,
        source: { ...source, name: 'Foreign' },
      })
      expect(destination.getX(0)).toBe(4)
      f.viewport.setPose(prepared.original.pose)
      expect(guide.visible).toBe(false)
      expect(proxy.position.x).toBe(2)
      f.viewport.setPose(prepared.sample([4, 0, 0]).pose)
      expect(guide.visible).toBe(true)
      window.dispatchEvent(new Event('blur'))
      expect(guide.visible).toBe(false)
      f.viewport.setPose(prepared.sample([4, 0, 0]).pose)
      expect(guide.visible).toBe(true)
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      expect(guide.visible).toBe(false)
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      expect(guide.visible).toBe(false)
      f.viewport.setPose(prepared.sample([4, 0, 0]).pose)
      expect(guide.visible).toBe(true)
      f.viewport.setAnimationEditing(false)
      expect(guide.visible).toBe(false)
      f.viewport.setAnimationEditing(true)
      f.viewport.setSelection(['middle'])
      expect(guide.visible).toBe(false)
      f.viewport.setDocument({ ...source, thumb: 'latest' })
      f.viewport.setSelection(['tip'])
      f.viewport.setPose(prepared.sample([5, 0, 0]).pose)
      expect(guide.visible).toBe(false)
      expect(source.animations![0]!.tracks).toEqual([])
    } finally {
      f.close()
    }
  })

  test.each([
    false,
    true,
  ])('long weight strokes reach intermediate vertices without painting through occlusion=%s', (occluded) => {
    const fixture = makeSceneSkinFixture(),
      mesh = makeSceneGridGeometry(4)
    fixture.document.geometries = [mesh]
    const { id, ...input } = fixture.input
    const source = createSceneSkin(
      fixture.document,
      {
        ...input,
        weights: Object.fromEntries(
          Object.keys(mesh.vertices).map((vertexId) => [
            vertexId,
            [
              { jointId: 'upper', weight: 0.5 },
              { jointId: 'lower', weight: 0.5 },
            ],
          ]),
        ),
      },
      () => id,
    )
    const world = indexSceneDocument(source).scene.worldMatrices.get('part-0')!
    if (occluded) {
      const node = source.nodes[0]!
      if (node.kind !== 'mesh') throw new Error('Expected mesh')
      const matrix: AffineMatrix = [...world]
      matrix[14] += 1
      source.nodes.push({
        ...node,
        id: 'occluder',
        geometryId: 'cover',
        parentId: null,
        locked: true,
        transform: { kind: 'affine', matrix },
      })
      source.geometries.push({
        id: 'cover',
        kind: 'mesh',
        looseEdges: [],
        vertices: { a: [0.3, 0.3, 0], b: [0.7, 0.3, 0], c: [0.7, 0.7, 0], d: [0.3, 0.7, 0] },
        faces: {
          cover: { corners: ['a', 'b', 'c', 'd'].map((vertexId) => ({ vertexId, uv: [0, 0] })) },
        },
      })
    }
    const before = structuredClone(source)
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: { save: async () => {} },
    })
    const errors: unknown[] = []
    let gesture: ReturnType<typeof createSceneSkinPaintGesture> | undefined
    const f = setup(undefined, undefined, {
      begin: (sample) =>
        !!gesture?.begin(id, 'upper', { mode: 'add', radius: 0.11, strength: 0.5 }) &&
        gesture.sample(sample),
      move: (sample) => {
        if (sample) gesture?.sample(sample)
      },
      end: (commit) => {
        gesture?.end(commit)
      },
    })
    gesture = createSceneSkinPaintGesture(
      editor,
      (preview) => f.viewport.setSkinPaintPreview(preview),
      (error) => errors.push(error),
    )
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['part-0'])
      f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'face', ids: [] })
      f.viewport.setSkinWeightTarget({ nodeId: 'part-0', jointId: 'upper' })
      f.viewport.setSkinPaintEnabled(true, 0.11)
      f.viewport.frame()
      f.tick()
      const clients = [0.025, 0.975].map((x) => {
        const projected = new Vector3(...transformPoint(world, [x, 0.5, 0])).project(
          f.count().camera!,
        )
        return { clientX: (projected.x + 1) * 160, clientY: (1 - projected.y) * 90 }
      })
      f.pointer('pointerdown', 1, clients[0]!)
      f.pointer('pointermove', 1, clients[1]!)
      expect(editor.getState().asset).toBe(source)
      expect(editor.getState().canUndo).toBe(false)
      f.pointer('pointerup', 1, clients[1]!)
      const weights = editor.getState().asset.skins![0]!.weights
      expect(weights.v_0_2![0]!.weight).toBeGreaterThan(0.5)
      expect(weights.v_4_2![0]!.weight).toBeGreaterThan(0.5)
      if (occluded) expect(weights.v_2_2![0]!.weight).toBe(0.5)
      else expect(weights.v_2_2![0]!.weight).toBeGreaterThan(0.5)
      editor.getState().undo()
      expect(editor.getState().asset.skins).toEqual(source.skins)
      expect(editor.getState().canUndo).toBe(false)
      editor.getState().redo()
      expect(editor.getState().asset.skins![0]!.weights).toEqual(weights)
      expect(source).toEqual(before)
      expect(errors).toEqual([])
    } finally {
      gesture.dispose()
      editor.getState().dispose()
      f.close()
    }
  })

  test('coalesced real surface hits match separate movement, retain misses and produce one reversible weight command', () => {
    const fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(
        fixture.document,
        {
          ...input,
          weights: Object.fromEntries(
            Object.keys(input.weights).map((id) => [
              id,
              [
                { jointId: 'upper', weight: 0.5 },
                { jointId: 'lower', weight: 0.5 },
              ],
            ]),
          ),
        },
        () => id,
      ),
      original = structuredClone(source)
    function run(grouped: boolean) {
      const editor = createDocumentEditorStore({
          asset: source,
          sizeOf: structuredBytes,
          autosaveMs: 60_000,
          persistence: { save: async () => {} },
        }),
        errors: unknown[] = []
      let gesture: ReturnType<typeof createSceneSkinPaintGesture> | undefined
      const f = setup(undefined, undefined, {
        begin: (sample) =>
          !!gesture?.begin(id, 'upper', { mode: 'add', radius: 0.13, strength: 0.5 }) &&
          gesture.sample(sample),
        move: (sample) => {
          if (sample) gesture?.sample(sample)
        },
        end: (commit) => {
          gesture?.end(commit)
        },
      })
      gesture = createSceneSkinPaintGesture(
        editor,
        (preview) => f.viewport.setSkinPaintPreview(preview),
        (error) => errors.push(error),
      )
      const unsubscribe = editor.subscribe((state) => f.viewport.setDocument(state.asset))
      try {
        f.viewport.setDocument(source)
        f.viewport.setSelection(['part-0'])
        f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'face', ids: [] })
        f.viewport.setSkinWeightTarget({ nodeId: 'part-0', jointId: 'upper' })
        f.viewport.setSkinPaintEnabled(true, 0.13)
        f.viewport.frame()
        f.tick()
        const world = indexSceneDocument(source).scene.worldMatrices.get('part-0')!,
          coordinates = [
            [0.015, 0.015, 0],
            [0.235, 0.015, 0],
            [0.015, 0.235, 0],
            [0.235, 0.235, 0],
            [0.125, 0.125, 0],
          ] as const,
          clients = coordinates.map((local) => {
            const point = new Vector3(...transformPoint(world, [...local])).project(
              f.count().camera!,
            )
            return { clientX: (point.x + 1) * 160, clientY: (1 - point.y) * 90 }
          }),
          path = [clients[1]!, { clientX: -1, clientY: -1 }, clients[2]!]
        f.pointer('pointerdown', 1, clients[0]!)
        if (grouped) {
          const event = new PointerEvent('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 1,
            bubbles: true,
            ...clients[4]!,
          })
          Object.defineProperty(event, 'getCoalescedEvents', {
            value: () =>
              path.map((point) => new PointerEvent('pointermove', { pointerId: 1, ...point })),
          })
          f.canvas.dispatchEvent(event)
        } else for (const point of path) f.pointer('pointermove', 1, point)
        expect(editor.getState().asset).toBe(source)
        expect(editor.getState().canUndo).toBe(false)
        f.pointer('pointerup', 1, clients[3]!)
        const weights = structuredClone(editor.getState().asset.skins![0]!.weights)
        expect(Object.values(weights).every((rows) => rows[0]!.weight > 0.5)).toBe(true)
        expect(editor.getState().canUndo).toBe(true)
        editor.getState().undo()
        expect(editor.getState().asset.skins).toEqual(source.skins)
        expect(editor.getState().canUndo).toBe(false)
        editor.getState().redo()
        expect(editor.getState().asset.skins![0]!.weights).toEqual(weights)
        expect(errors).toEqual([])
        return weights
      } finally {
        unsubscribe()
        gesture.dispose()
        editor.getState().dispose()
        f.close()
      }
    }
    expect(run(true)).toEqual(run(false))
    expect(source).toEqual(original)
  })

  for (const finish of [
    'commit',
    'cancel',
    'blur',
    'context',
    'camera',
    'wheel',
    'selection',
    'area',
    'tool',
    'dispose',
    'revision',
    'thumb',
  ] as const)
    test(`weight brush ${finish} preserves ownership, detached colors and original data through real picking`, () => {
      const fixture = makeSceneSkinFixture(),
        { id, ...input } = fixture.input,
        source = createSceneSkin(fixture.document, input, () => id),
        editor = createDocumentEditorStore({
          asset: source,
          sizeOf: structuredBytes,
          autosaveMs: 60_000,
          persistence: { save: async () => {} },
        }),
        errors: unknown[] = []
      let gesture: ReturnType<typeof createSceneSkinPaintGesture> | undefined
      const f = setup(undefined, undefined, {
        begin: (sample) =>
          !!gesture?.begin(id, 'upper', { mode: 'add', radius: 2, strength: 0.25 }) &&
          gesture.sample(sample),
        move: (sample) => {
          if (sample) gesture?.sample(sample)
        },
        end: (commit) => {
          gesture?.end(commit)
        },
      })
      gesture = createSceneSkinPaintGesture(
        editor,
        (preview) => f.viewport.setSkinPaintPreview(preview),
        (error) => errors.push(error),
      )
      const unsubscribe = editor.subscribe((state) => {
        f.viewport.setDocument(state.asset)
      })
      try {
        f.viewport.setDocument(source)
        f.viewport.setSelection(['part-0'])
        f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'face', ids: [] })
        f.viewport.setSkinWeightTarget({ nodeId: 'part-0', jointId: 'upper' })
        f.viewport.setSkinPaintEnabled(true, 2)
        f.viewport.setView('front')
        f.tick()
        const world = indexSceneDocument(source).scene.worldMatrices.get('part-0')!,
          point = new Vector3(...transformPoint(world, [0.1, 0.1, 0])).project(f.count().camera!),
          client = { clientX: (point.x + 1) * 160, clientY: (1 - point.y) * 90 },
          overlay = f.count().scene!.getObjectByName('molda-skin-weight-points')!,
          cursor = f.count().scene!.getObjectByName('molda-skin-brush-cursor')!,
          first = overlay.children[0]
        if (!(first instanceof Points)) throw new Error('Expected weight overlay')
        const colors = first.geometry.getAttribute('color'),
          original = [...colors.array]
        f.pointer('pointerdown', 1, client)
        expect(cursor.visible).toBe(true)
        expect(gesture.active()).toBe(true)
        expect([...colors.array]).not.toEqual(original)
        expect(editor.getState().asset).toBe(source)
        expect(editor.getState().canUndo).toBe(false)
        const version = colors.version
        for (let i = 0; i < 30; i++) f.pointer('pointermove', 1, client)
        expect(colors.version).toBe(version)
        expect(f.picks).toEqual([])
        if (finish === 'cancel') f.viewport.cancelGesture()
        if (finish === 'blur') window.dispatchEvent(new Event('blur'))
        if (finish === 'context')
          f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
        if (finish === 'camera') f.viewport.setView('top')
        if (finish === 'wheel') {
          f.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }))
          expect(gesture.active()).toBe(false)
        }
        if (finish === 'selection') f.viewport.setSelection(['upper'])
        if (finish === 'area') f.viewport.setAreaTool('box', true)
        if (finish === 'tool') f.viewport.setTransformTool('move')
        if (finish === 'dispose') f.viewport.dispose()
        if (finish === 'revision') editor.getState().commit({ ...source, name: 'Outra revisão' })
        if (finish === 'thumb') {
          editor.getState().setThumb('data:image/png;base64,preview')
          expect(gesture.active()).toBe(true)
          expect([...colors.array]).not.toEqual(original)
        }
        f.pointer('pointerup', 1, client)
        expect(cursor.visible).toBe(false)
        expect(gesture.active()).toBe(false)
        if (finish === 'commit' || finish === 'thumb') {
          expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBeGreaterThan(0)
          expect(editor.getState().canUndo).toBe(true)
          if (finish === 'thumb')
            expect(editor.getState().asset.thumb).toBe('data:image/png;base64,preview')
          editor.getState().undo()
          expect(editor.getState().asset.skins).toEqual(source.skins)
          expect(editor.getState().canUndo).toBe(false)
        } else {
          expect(editor.getState().asset.skins).toBe(source.skins)
          expect(editor.getState().canUndo).toBe(finish === 'revision')
          if (finish !== 'dispose' && finish !== 'selection')
            expect([...colors.array]).toEqual(original)
        }
        expect(errors).toEqual([])
      } finally {
        unsubscribe()
        gesture.dispose()
        editor.getState().dispose()
        f.close()
      }
    })

  test('brush hover is view-only, demand-driven, world-sized and cleared by navigation, misses and disabled states', () => {
    let begins = 0
    const f = setup(undefined, undefined, {
        begin: () => {
          begins++
          return false
        },
        move: () => {},
        end: () => {},
      }),
      fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      source = createSceneSkin(fixture.document, input, () => id),
      original = structuredClone(source)
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['part-0'])
      f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'face', ids: [] })
      f.viewport.setSkinWeightTarget({ nodeId: 'part-0', jointId: 'upper' })
      f.viewport.setSkinPaintEnabled(true, 0.3)
      f.viewport.frame()
      f.tick()
      const world = indexSceneDocument(source).scene.worldMatrices.get('part-0')!,
        point = new Vector3(...transformPoint(world, [0.1, 0.1, 0])).project(f.count().camera!),
        client = { clientX: (point.x + 1) * 160, clientY: (1 - point.y) * 90 },
        cursor = f.count().scene!.getObjectByName('molda-skin-brush-cursor')!,
        hover = () => f.pointer('pointermove', 1, client)
      expect(cursor.children).toHaveLength(0)
      hover()
      expect(cursor.visible).toBe(true)
      expect(cursor.scale.toArray()).toEqual([0.3, 0.3, 0.3])
      expect(begins).toBe(0)
      f.tick()
      const renders = f.count().renders,
        line = cursor.children[0]!
      for (let i = 0; i < 50; i++) {
        hover()
        f.tick()
      }
      expect(f.count().renders).toBe(renders)
      expect(cursor.children[0]).toBe(line)
      expect(frames.size).toBe(0)
      f.viewport.setDocument({ ...source, thumb: 'preview' })
      expect(cursor.visible).toBe(true)
      for (const [name, interrupt] of [
        ['leave', () => f.canvas.dispatchEvent(new Event('pointerleave'))],
        ['wheel', () => f.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 0 }))],
        ['blur', () => window.dispatchEvent(new Event('blur'))],
        ['cancel', () => f.viewport.cancelGesture()],
        ['preview', () => f.viewport.setSkinPaintPreview(null)],
        ['miss', () => f.pointer('pointermove', 1, { ...client, clientX: -1 })],
        ['buttons', () => f.pointer('pointermove', 1, { ...client, buttons: 2 })],
        ['touch', () => f.pointer('pointermove', 1, { ...client, pointerType: 'touch' })],
      ] as const) {
        hover()
        expect(cursor.visible, `before ${name}`).toBe(true)
        interrupt()
        expect(cursor.visible, `after ${name}`).toBe(false)
      }
      hover()
      expect(() => f.viewport.setSkinPaintEnabled(true, -1)).toThrow('alcance maior que zero')
      expect(cursor.visible).toBe(true)
      f.viewport.setSkinPaintEnabled(true, 0.6)
      expect(cursor.visible).toBe(false)
      hover()
      expect(cursor.scale.x).toBe(0.6)
      f.viewport.setSkinPaintEnabled(false)
      hover()
      expect(cursor.visible).toBe(false)
      f.viewport.setSkinPaintEnabled(true, 0.3)
      hover()
      f.pointer('pointerdown', 1, client)
      expect(begins).toBe(1)
      expect(cursor.visible).toBe(false)
      f.pointer('pointerup', 1, client)
      hover()
      expect(cursor.visible).toBe(true)
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      hover()
      expect(cursor.visible).toBe(false)
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      hover()
      expect(cursor.visible).toBe(true)
      f.viewport.dispose()
      hover()
      expect(cursor.visible).toBe(false)
      expect(cursor.children).toHaveLength(0)
      expect(source).toEqual(original)
      expect(f.picks).toEqual([])
    } finally {
      f.close()
    }
  })

  test('saved weight colors follow document revisions, isolation and context restore without becoming model resources', () => {
    const f = setup(),
      fixture = makeSceneSkinFixture(),
      { id, ...input } = fixture.input,
      linked = createSceneSkin(fixture.document, input, () => id),
      source = { ...linked, nodes: [...linked.nodes, { ...linked.nodes[0]!, id: 'other-part' }] }
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['part-0'])
      f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'face', ids: [] })
      f.viewport.setSkinWeightTarget({ nodeId: 'part-0', jointId: 'upper' })
      f.tick()
      const overlay = f.count().scene!.getObjectByName('molda-skin-weight-points')!,
        first = overlay.children[0]
      if (!(first instanceof Points)) throw new Error('Expected weight map')
      const colors = first.geometry.getAttribute('color'),
        previous = [...colors.array]
      expect(colors.count).toBe(4)
      expect(overlay.children).toHaveLength(1)
      const next = setSceneSkinWeights(source, 'skin', { v_1_0: [{ jointId: 'upper', weight: 1 }] })
      f.viewport.setDocument(next)
      f.tick()
      expect(overlay.children[0]).toBe(first)
      expect(first.geometry.getAttribute('color')).toBe(colors)
      expect([...colors.array]).not.toEqual(previous)
      const geometry = next.geometries[0]!
      if (geometry.kind !== 'mesh') throw new Error('Expected authorial mesh')
      const kept = [...colors.array],
        invalid = {
          ...next,
          geometries: [
            {
              ...geometry,
              vertices: { ...geometry.vertices, v_0_0: [1e100, 0, 0] as [number, number, number] },
            },
          ],
        }
      expect(() => f.viewport.setDocument(invalid)).toThrow('precisão')
      expect(overlay.children[0]).toBe(first)
      expect([...colors.array]).toEqual(kept)
      const stable = f.count().renders
      f.tick()
      expect(f.count().renders).toBe(stable)
      f.viewport.setIsolation(['other-part'])
      expect(overlay.children).toHaveLength(0)
      f.viewport.setIsolation(null)
      expect(overlay.children).toHaveLength(1)
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      f.tick()
      expect(overlay.children).toHaveLength(1)
      f.viewport.setComponentSelection(null)
      expect(overlay.children).toHaveLength(0)
      f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'vertex', ids: [] })
      expect(overlay.children).toHaveLength(0)
    } finally {
      f.close()
    }
  })

  test('support guides select real hierarchy origins, follow poses without model rebuilds, and respect editing/isolation/lifecycle', () => {
    const f = setup(),
      {
        document,
        input: { id, ...input },
      } = makeSceneSkinFixture(),
      linked = createSceneSkin(document, input, () => id),
      source = {
        ...linked,
        nodes: [...linked.nodes, { ...linked.nodes[0]!, id: 'other-part' }],
        animations: [sceneAnimationClip('lower')],
      },
      before = structuredClone(source)
    try {
      f.viewport.setDocument(source)
      f.viewport.frame()
      f.tick()
      const guides = f.count().scene!.getObjectByName('molda-support-guides')!,
        markers = guides.children[1],
        chosen = guides.children[2],
        mesh = f
          .count()
          .scene!.children[0]!.children.find((object) => object instanceof SkinnedMesh)
      if (
        !(markers instanceof Points) ||
        !(chosen instanceof Points) ||
        !(mesh instanceof SkinnedMesh)
      )
        throw new Error('Missing resources')
      expect(guides.visible).toBe(false)
      const geometry = mesh.geometry,
        positions = geometry.getAttribute('position'),
        markerPositions = markers.geometry.getAttribute('position')
      f.viewport.setSupportGuides(true)
      f.viewport.setSelection(['lower'])
      f.tick()
      expect(markers.geometry.drawRange.count).toBe(3)
      expect(chosen.geometry.drawRange.count).toBe(1)
      const pickLower = () => {
        const target = new Vector3()
          .fromBufferAttribute(
            markers.geometry.getAttribute('position'),
            markers.geometry.drawRange.count - 1,
          )
          .project(f.count().camera!)
        const extra = { clientX: (target.x + 1) * 160, clientY: (1 - target.y) * 90 }
        f.pointer('pointerdown', 90, extra)
        f.pointer('pointerup', 90, extra)
      }
      pickLower()
      expect(f.picks.at(-1)).toBe('lower')
      const compiled = prepareSceneAnimation(source, 'clip')
      for (const seconds of [0.2, 0.6, 1, 1.5]) {
        const pose = compiled.sample(seconds, false)
        f.viewport.setPose(pose)
        f.tick()
        const matrix = pose.worldMatrices.get('lower')!
        expect(markerPositions.getX(2)).toBe(Math.fround(matrix[12]))
        expect(markerPositions.getY(2)).toBe(Math.fround(matrix[13]))
        expect(markerPositions.getZ(2)).toBe(Math.fround(matrix[14]))
        expect(mesh.geometry).toBe(geometry)
        expect(geometry.getAttribute('position')).toBe(positions)
        expect(markers.geometry.getAttribute('position')).toBe(markerPositions)
      }
      f.viewport.setPose(null)
      f.viewport.setIsolation(['part-0'])
      expect(markers.geometry.drawRange.count).toBe(2)
      f.viewport.setSelection(['upper'])
      const pivot = f.count().scene!.children.find((object) => object instanceof AxesHelper)
      expect(pivot?.visible).toBe(true)
      f.viewport.frame(true)
      f.tick()
      expect(mesh.visible).toBe(true)
      expect(
        f
          .count()
          .scene!.children[0]!.children.filter((object) => object !== mesh)
          .every((object) => !object.visible),
      ).toBe(true)
      f.viewport.setSelection(['part-0'])
      f.viewport.setComponentSelection({ nodeId: 'part-0', mode: 'vertex', ids: [] })
      expect(guides.visible).toBe(false)
      f.viewport.setComponentSelection(null)
      expect(guides.visible).toBe(true)
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      f.tick()
      expect(guides.visible).toBe(true)
      f.viewport.setSupportGuides(false)
      expect(guides.visible).toBe(false)
      pickLower()
      expect(f.picks.at(-1)).not.toBe('lower')
      expect(source).toEqual(before)
    } finally {
      f.close()
    }
  })

  test('invalid guide documents/poses preserve the displayed frame and hidden or locked ancestors prevent support picking', () => {
    const f = setup(),
      { document } = makeSceneSkinFixture(),
      source = { ...document, animations: [sceneAnimationClip('lower')] }
    try {
      f.viewport.setDocument(source)
      f.viewport.setSupportGuides(true)
      f.viewport.frame()
      f.tick()
      const guides = f.count().scene!.getObjectByName('molda-support-guides')!,
        points = guides.children[1]
      if (!(points instanceof Points)) throw new Error('Missing guides')
      const before = points.geometry.getAttribute('position').array.slice(),
        far = {
          ...source,
          nodes: source.nodes.map((node) =>
            node.id === 'lower'
              ? {
                  ...node,
                  transform: {
                    kind: 'trs' as const,
                    translation: [1e100, 0, 0] as [number, number, number],
                    rotation: [0, 0, 0, 1] as [number, number, number, number],
                    scale: [1, 1, 1] as [number, number, number],
                  },
                }
              : node,
          ),
        }
      expect(() => f.viewport.setDocument(far)).toThrow('longe demais')
      expect(points.geometry.getAttribute('position').array).toEqual(before)
      const pose = prepareSceneAnimation(source, 'clip').sample(1, false),
        worldMatrices = new Map(pose.worldMatrices)
      worldMatrices.delete('upper')
      expect(() => f.viewport.setPose({ ...pose, worldMatrices })).toThrow('incompleta')
      expect(points.geometry.getAttribute('position').array).toEqual(before)
      f.viewport.setDocument({
        ...source,
        nodes: source.nodes.map((node) => (node.id === 'upper' ? { ...node, locked: true } : node)),
      })
      const target = new Vector3()
          .fromBufferAttribute(points.geometry.getAttribute('position'), 2)
          .project(f.count().camera!),
        extra = { clientX: (target.x + 1) * 160, clientY: (1 - target.y) * 90 }
      f.pointer('pointerdown', 91, extra)
      f.pointer('pointerup', 91, extra)
      expect(f.picks.at(-1)).not.toBe('lower')
      f.viewport.setDocument({
        ...source,
        nodes: source.nodes.map((node) => (node.id === 'upper' ? { ...node, hidden: true } : node)),
      })
      expect(points.geometry.drawRange.count).toBe(1)
    } finally {
      f.close()
    }
  })

  test('component editing displays the authorial form-base, restores skin on selection/pose changes and survives context restoration', () => {
    const f = setup(),
      {
        document,
        input: { id, ...input },
      } = makeSceneSkinFixture(),
      delta = identityMatrix()
    delta[12] = 5
    const source = transformSceneNodes(
      createSceneSkin(document, input, () => id),
      ['lower'],
      delta,
    )
    source.animations = [sceneAnimationClip('lower')]
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['part-0'])
      f.tick()
      const root = f.count().scene!.children[0]!,
        skin = root.children.find((object) => object instanceof SkinnedMesh)
      if (!(skin instanceof SkinnedMesh)) throw new Error('Missing skin')
      const skeleton = skin.skeleton
      const component = { nodeId: 'part-0', mode: 'face' as const, ids: ['f_0_0'] }
      f.viewport.setComponentSelection(component)
      f.tick()
      const base = root.children.find((object) => object instanceof Mesh)
      if (!(base instanceof Mesh) || base instanceof SkinnedMesh)
        throw new Error('Missing form-base')
      expect(base.geometry.getAttribute('skinWeight')).toBeUndefined()
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      f.tick()
      expect(root.children.includes(base)).toBe(true)
      f.viewport.setSelection(['lower'])
      f.tick()
      const restored = root.children.find((object) => object instanceof SkinnedMesh)
      expect(restored instanceof SkinnedMesh && restored.skeleton === skeleton).toBe(true)
      f.viewport.setSelection(['part-0'])
      f.viewport.setComponentSelection(component)
      f.viewport.setPose(prepareSceneAnimation(source, 'clip').sample(1, false))
      f.tick()
      expect(root.children.some((object) => object instanceof SkinnedMesh)).toBe(true)
      f.viewport.setComponentSelection(component)
      expect(root.children.some((object) => object instanceof SkinnedMesh)).toBe(true)
      f.viewport.setPose(null)
      f.viewport.setComponentSelection(component)
      f.viewport.setComponentSelection(null)
      expect(root.children.some((object) => object instanceof SkinnedMesh)).toBe(true)
      f.viewport.setComponentSelection(component)
      f.viewport.setDocument({ ...source, id: 'different-creation' })
      expect(root.children.some((object) => object instanceof SkinnedMesh)).toBe(true)
    } finally {
      f.close()
    }
  })

  test('deformed bounds follow joint-only poses for outline, framing, isolation and restoration without scanning source vertices per frame', () => {
    const f = setup(),
      {
        document,
        input: { id, ...input },
      } = makeSceneSkinFixture()
    let reads = 0
    document.geometries = document.geometries.map(
      (geometry) =>
        new Proxy(geometry, {
          get(target, key, receiver) {
            if (key === 'vertices') reads++
            return Reflect.get(target, key, receiver)
          },
        }),
    )
    const source = createSceneSkin(document, input, () => id)
    source.animations = [
      {
        ...sceneAnimationClip('lower'),
        tracks: [
          {
            nodeId: 'lower',
            channel: 'translation',
            keys: [
              { time: 0, value: [0, 0, 0], interpolation: 'linear' },
              { time: 2, value: [20, 0, 0], interpolation: 'linear' },
            ],
          },
        ],
      },
    ]
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['part-0'])
      f.tick()
      const scene = f.count().scene!,
        outline = scene.children.find((object) => object instanceof Box3Helper),
        mesh = scene.children[0]!.children.find((object) => object instanceof SkinnedMesh)
      if (!(outline instanceof Box3Helper) || !(mesh instanceof SkinnedMesh))
        throw new Error('Missing skin drawing')
      const rest = outline.box.clone(),
        compiled = prepareSceneAnimation(source, 'clip')
      reads = 0
      for (const seconds of [0.5, 1, 1.5, 2]) {
        f.viewport.setPose(compiled.sample(seconds, false))
        f.tick()
        for (let i = 0; i < mesh.geometry.getAttribute('position').count; i++)
          expect(
            outline.box.containsPoint(
              mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld),
            ),
          ).toBe(true)
      }
      expect(outline.box.equals(rest)).toBe(false)
      f.viewport.frame(true)
      f.tick()
      const center = outline.box.getCenter(new Vector3()).project(f.count().camera!)
      expect(center.x).toBeCloseTo(0, 10)
      expect(center.y).toBeCloseTo(0, 10)
      f.viewport.setIsolation(['upper'])
      expect(outline.visible).toBe(false)
      f.viewport.setIsolation(null)
      expect(outline.visible).toBe(true)
      expect(reads).toBe(0)
      f.viewport.setPose(null)
      f.tick()
      expect(outline.box).toEqual(rest)
    } finally {
      f.close()
    }
  })

  test('real animation handles keep a session preview across pointer frames and record one pose without touching base geometry', () => {
    let gesture: SceneAnimationPoseGesture | undefined
    const f = setup({
      begin: () => gesture?.begin([id]) ?? false,
      preview: (delta) => gesture?.preview(delta) ?? false,
      end: (commit) => gesture?.end(commit),
    })
    const id = f.source.nodes[0]!.id
    const source = { ...f.source, animations: [sceneAnimationClip(id)] }
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    })
    const player = new SceneAnimationPlayer({ now: () => 0, request: () => 1, cancel: () => {} })
    player.setClip(source, 'clip')
    gesture = new SceneAnimationPoseGesture(editor, player)
    const disconnect = gesture.connect()
    const off = gesture.subscribe(() =>
      f.viewport.setPose(gesture!.getSnapshot().pose ?? player.getSnapshot().pose),
    )
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection([id])
      f.viewport.setPose(player.getSnapshot().pose)
      f.viewport.setTransformTool('move')
      f.viewport.setAnimationEditing(true)
      f.tick()
      f.pointer('pointermove', 1, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 1, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 1, { clientX: f.x + 35, button: -1, buttons: 1 })
      const middle = gesture.getSnapshot().pose?.worldMatrices.get(id)?.[12]
      expect(middle).toBeGreaterThan(0)
      f.viewport.setAnimationEditing(true)
      f.pointer('pointermove', 1, { clientX: f.x + 45, button: -1, buttons: 1 })
      const last = gesture.getSnapshot().pose!
      expect(last.worldMatrices.get(id)![12]).toBeGreaterThan(middle!)
      expect(editor.getState().asset).toBe(source)
      f.pointer('pointerup', 1, { clientX: f.x + 45 })
      expect(gesture.getSnapshot().pending).toBe(true)
      expect(gesture.getSnapshot().dragging).toBe(false)
      expect(editor.getState().canUndo).toBe(false)
      expect(f.picks).toEqual([])
      f.tick()
      expect(frames.size).toBe(0)
      expect(gesture.record()).toBe(true)
      expect(editor.getState().asset.nodes).toBe(source.nodes)
      expect(editor.getState().asset.geometries).toBe(source.geometries)
      expect(
        prepareSceneAnimation(editor.getState().asset, 'clip').sample(0, false).worldMatrices,
      ).toEqual(last.worldMatrices)
      editor.getState().undo()
      expect(editor.getState().asset.animations).toEqual(source.animations)
      expect(editor.getState().canUndo).toBe(false)
      f.viewport.setTransformTool('select')
      f.viewport.setAreaTool('box', true)
      f.pointer('pointerdown', 2, { clientX: 0, clientY: 0 })
      f.pointer('pointermove', 2, { clientX: 320, clientY: 180, buttons: 1 })
      f.pointer('pointerup', 2, { clientX: 320, clientY: 180 })
      expect(f.groups).toEqual([])
    } finally {
      off()
      disconnect()
      f.close()
      player.setClip(null, null)
      editor.getState().dispose()
    }
  })
  test('poses update selection/pivot/camera without rereading vertices; constant poses stay idle and stale revisions are ignored', () => {
    const f = setup()
    try {
      const document = convertSceneNodesToMesh(f.source, [f.source.nodes[0]!.id])
      const nodeId = document.nodes[0]!.id
      let reads = 0
      document.geometries = document.geometries.map(
        (geometry) =>
          new Proxy(geometry, {
            get(target, key, receiver) {
              if (key === 'vertices') reads++
              return Reflect.get(target, key, receiver)
            },
          }),
      )
      document.animations = [
        {
          ...sceneAnimationClip(nodeId),
          tracks: [
            {
              nodeId,
              channel: 'translation',
              keys: [
                { time: 0, value: [0, 0, 0], interpolation: 'step' },
                { time: 1, value: [6, 0, 0], interpolation: 'step' },
              ],
            },
          ],
        },
      ]
      f.viewport.setDocument(document)
      f.viewport.setSelection([nodeId])
      f.tick()
      expect(reads).toBeGreaterThan(0)
      const scene = f.count().scene!
      const outline = scene.children.find((object) => object instanceof Box3Helper)
      const pivot = scene.children.find((object) => object instanceof AxesHelper)
      const mesh = scene.children[0]!.children[0]
      if (
        !(outline instanceof Box3Helper) ||
        !(pivot instanceof AxesHelper) ||
        !(mesh instanceof Mesh)
      )
        throw new Error('Missing drawing')
      const bounds = outline.box.clone(),
        rest = mesh.matrix.clone(),
        pivotRest = pivot.matrix.clone()
      const sampler = prepareSceneAnimation(document, 'clip')
      reads = 0
      f.viewport.setPose(sampler.sample(0))
      f.tick()
      const count = f.count().renders
      f.viewport.setPose(sampler.sample(0.5))
      expect(frames.size).toBe(0)
      expect(f.count().renders).toBe(count)
      f.viewport.setPose(sampler.sample(1.5))
      expect(frames.size).toBe(1)
      f.tick()
      expect(outline.box.min.x).toBeCloseTo(bounds.min.x + 6, 12)
      expect(outline.box.max.x).toBeCloseTo(bounds.max.x + 6, 12)
      expect(pivot.matrix.elements[12]).toBeCloseTo(pivotRest.elements[12]! + 6, 12)
      f.viewport.frame(true)
      f.tick()
      const center = outline.box.getCenter(new Vector3()).project(f.count().camera!)
      expect(center.x).toBeCloseTo(0, 10)
      expect(center.y).toBeCloseTo(0, 10)
      expect(reads).toBe(0)
      f.viewport.setPose(null)
      f.tick()
      expect(mesh.matrix).toEqual(rest)
      expect(outline.box).toEqual(bounds)
      f.viewport.setDocument({ ...document, name: 'Revisão nova' })
      f.tick()
      f.viewport.setPose(sampler.sample(1.5))
      expect(frames.size).toBe(0)
      expect(mesh.matrix).toEqual(rest)
    } finally {
      f.close()
    }
  })

  test('animation preview blocks original-pose gizmos across blur/context restoration and resumes editing after exit', () => {
    let begins = 0
    const f = setup({
      begin: () => {
        begins++
        return true
      },
      preview: () => true,
      end: () => {},
    })
    try {
      const nodeId = f.source.nodes[0]!.id
      const document = { ...f.source, animations: [sceneAnimationClip(nodeId)] }
      f.viewport.setDocument(document)
      f.viewport.setSelection([nodeId])
      f.viewport.setTransformTool('move')
      f.viewport.setPose(prepareSceneAnimation(document, 'clip').sample(0))
      for (const interrupt of [
        () => {},
        () => window.dispatchEvent(new Event('blur')),
        () => {
          f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
          f.canvas.dispatchEvent(new Event('webglcontextrestored'))
        },
      ]) {
        interrupt()
        f.viewport.frame(true)
        f.tick()
        f.pointer('pointermove', 1, { clientX: f.x + 20, button: -1 })
        f.pointer('pointerdown', 1, { clientX: f.x + 20, buttons: 1 })
        f.pointer('pointermove', 1, { clientX: f.x + 45, button: -1, buttons: 1 })
        f.pointer('pointerup', 1, { clientX: f.x + 45 })
        expect(begins).toBe(0)
      }
      f.viewport.setPose(null)
      // Disabled gizmos leave navigation active, so restore framing after the pan probes.
      f.viewport.frame(true)
      f.tick()
      f.pointer('pointermove', 2, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 2, { clientX: f.x + 20, buttons: 1 })
      expect(begins).toBe(1)
      f.pointer('pointercancel', 2)
    } finally {
      f.close()
    }
  })

  test('flipbook frame changes request one render and repeated cells leave the demand loop idle', () => {
    const f = setup()
    const original = migrateLegacyModel(makeModel()).document
    const image = original.images[0]!
    const source = setSceneImageFlipbook(original, image.id, {
      frameWidth: image.width / 2,
      frameHeight: image.height / 2,
      frames: [0, 3, 3],
      fps: 8,
      loop: true,
    })
    try {
      f.viewport.setDocument(source)
      f.tick()
      expect(frames.size).toBe(0)
      const count = f.count().renders
      f.viewport.setImageFrame(image.id, 0)
      expect(frames.size).toBe(0)
      f.viewport.setImageFrame(image.id, 3)
      expect(frames.size).toBe(1)
      f.tick()
      expect(f.count().renders).toBe(count + 1)
      expect(frames.size).toBe(0)
      f.viewport.setImageFrame(image.id, 3)
      expect(frames.size).toBe(0)
      f.viewport.setImageFrame(image.id, null)
      f.tick()
      expect(f.count().renders).toBe(count + 2)
      expect(frames.size).toBe(0)
    } finally {
      f.close()
    }
  })
  test.each([
    false,
    true,
  ])('paint mode survives image previews, suppresses selection and cancels on interruptions (flipbook %s)', (animated) => {
    const original = migrateLegacyModel(makeModel()).document
    const firstImage = original.images[0]!
    const source = animated
      ? setSceneImageFlipbook(original, firstImage.id, {
          frameWidth: firstImage.width / 2,
          frameHeight: firstImage.height / 2,
          frames: [0, 3],
          fps: 8,
          loop: true,
        })
      : original
    const image = source.images[0]!
    const target = {
      nodeId: 'body',
      imageId: image.id,
      layerId: image.layers[0]!.id,
      materialId: source.materials.find((m) => m.colorImageId === image.id)!.id,
    }
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    const errors: unknown[] = []
    const paint = createScenePaintGesture(editor, (error) => errors.push(error))
    const f = setup(undefined, {
      begin(sample) {
        return paint.begin(target, 7, 1) && paint.segment(sample.point, sample.point)
      },
      move(sample) {
        if (sample) paint.segment(sample.point, sample.point)
      },
      end(commit) {
        paint.end(commit)
      },
    })
    const unsubscribe = editor.subscribe((state) => {
      f.viewport.setDocument(state.asset)
      if (animated) f.viewport.setImageFrame(image.id, 0)
    })
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection(['body'])
      f.viewport.setView('top')
      f.viewport.setPaintTarget(target)
      f.tick()
      const projected = new Vector3(0.125, 2, 0.125).project(f.count().camera!)
      const position = { clientX: (projected.x + 1) * 160, clientY: (1 - projected.y) * 90 }
      const down = () => f.pointer('pointerdown', 1, position)
      const up = () => f.pointer('pointerup', 1, position)
      down()
      up()
      expect(editor.getState().asset.images).not.toEqual(source.images)
      expect(f.picks).toEqual([])
      expect(editor.getState().canUndo).toBe(true)
      editor.getState().undo()
      for (const interrupt of [
        () => f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
        () => window.dispatchEvent(new Event('blur')),
        () => f.viewport.setView('top'),
      ]) {
        down()
        expect(editor.getState().asset.images).not.toEqual(source.images)
        interrupt()
        up()
        expect(editor.getState().asset.images).toEqual(source.images)
        expect(editor.getState().canUndo).toBe(false)
        f.canvas.dispatchEvent(new Event('webglcontextrestored'))
        f.tick()
      }
      expect(errors).toEqual([])
    } finally {
      unsubscribe()
      f.close()
      editor.getState().dispose()
    }
  })
  test('aba Pintar: tocar na peça pinta; em outra, escolhe com a face; no vazio, nada; câmera sem amortecimento', () => {
    let n = 0
    const nextId = () => `pinta${++n}`
    const base = migrateLegacyModel(makeModel({ parts: [] })).document
    const one = addScenePrimitive(base, 'box', 'porta', nextId)
    const doorId = one.nodes.at(-1)!.id
    const two = addScenePrimitive(one, 'box', 'parede', nextId)
    const wallId = two.nodes.at(-1)!.id
    const left = identityMatrix()
    left[12] = -2
    const right = identityMatrix()
    right[12] = 2
    const placed = transformSceneNodes(transformSceneNodes(two, [doorId], left), [wallId], right)
    const prepared = ensureScenePaintSurface(placed, { nodeId: doorId }, nextId)
    if (prepared.status !== 'ready') throw new Error('Superfície ausente.')
    const editor = createDocumentEditorStore({
      asset: prepared.document,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    const errors: unknown[] = []
    const paint = createScenePaintGesture(editor, (error) => errors.push(error))
    const ends: boolean[] = []
    const f = setup(
      undefined,
      {
        begin: (sample) =>
          paint.begin(prepared.target, 7, 1) &&
          paint.segment(sample.point, sample.point, sample.bounds),
        move: (sample) => {
          if (sample) paint.segment(sample.point, sample.point, sample.bounds)
        },
        end: (commit) => {
          ends.push(commit)
          paint.end(commit)
        },
      },
      undefined,
      false,
      false,
    )
    const orbit = () =>
      (f.viewport as unknown as { orbit: { enableDamping: boolean } | null }).orbit!
    try {
      f.viewport.setDocument(prepared.document)
      f.viewport.setView('top')
      expect(orbit().enableDamping).toBe(true)
      f.viewport.setPaintMode('paint')
      f.viewport.setPaintTarget(prepared.target)
      f.tick()
      const at = (x: number, z: number) => {
        const p = new Vector3(x, 2, z).project(f.count().camera!)
        return { clientX: (p.x + 1) * 160, clientY: (1 - p.y) * 90 }
      }
      f.pointer('pointerdown', 1, at(-2.1, 0.1))
      f.pointer('pointerup', 1, at(-2.1, 0.1))
      expect(ends).toEqual([true])
      expect(editor.getState().asset.images).not.toEqual(prepared.document.images)
      expect(f.picks).toEqual([])
      const painted = editor.getState().asset.images
      f.pointer('pointerdown', 2, at(2.1, 0.1))
      f.pointer('pointerup', 2, at(2.1, 0.1))
      expect(f.picks).toEqual([wallId])
      expect(f.details).toEqual([{ faceId: 'py' }])
      expect(editor.getState().asset.images).toBe(painted)
      f.pointer('pointerdown', 3, at(0, 0))
      f.pointer('pointerup', 3, at(0, 0))
      expect(f.picks).toEqual([wallId])
      // A câmera que ainda estava parando interromperia o traço começado logo depois de girar.
      expect(orbit().enableDamping).toBe(false)
      f.viewport.setView('free')
      expect(orbit().enableDamping).toBe(false)
      f.viewport.setPaintMode('off')
      expect(orbit().enableDamping).toBe(true)
      expect(errors).toEqual([])
    } finally {
      f.close()
      editor.getState().dispose()
    }
  })
  test('real area gestures select components, respect occlusion/through and cancel on mode changes', () => {
    const f = setup()
    try {
      const id = f.source.nodes[0]!.id
      const source = convertSceneNodesToMesh(f.source, [id])
      f.viewport.setDocument(source)
      f.viewport.setSelection([id])
      f.viewport.setComponentSelection({ nodeId: id, mode: 'face', ids: [] })
      f.viewport.setAreaTool('box', false)
      f.tick()
      const drag = () => {
        f.pointer('pointerdown', 1, { clientX: 0, clientY: 0 })
        f.pointer('pointermove', 1, { clientX: 320, clientY: 180, buttons: 1 })
        f.pointer('pointerup', 1, { clientX: 320, clientY: 180 })
      }
      drag()
      expect(f.components.at(-1)).toEqual(['pz'])
      expect(f.groups).toEqual([])
      expect(f.picks).toEqual([])
      f.viewport.setAreaTool('box', true)
      drag()
      expect(f.components.at(-1)).toHaveLength(6)
      f.viewport.setComponentSelection({ nodeId: id, mode: 'vertex', ids: [] })
      drag()
      expect(f.components.at(-1)).toHaveLength(8)
      f.pointer('pointerdown', 1, { clientX: 0, clientY: 0 })
      f.pointer('pointermove', 1, { clientX: 320, clientY: 180, buttons: 1 })
      f.viewport.setComponentSelection({ nodeId: id, mode: 'edge', ids: [] })
      const before = f.components.length
      f.pointer('pointerup', 1, { clientX: 320, clientY: 180 })
      expect(f.components.length).toBe(before)
      drag()
      expect(f.components.at(-1)).toHaveLength(12)
    } finally {
      f.close()
    }
  })
  test('real face-handle drag survives selection resynchronization and creates one geometry undo', () => {
    let begin = () => false
    let preview: SceneTransformActions['preview'] = () => false
    let end: SceneTransformActions['end'] = () => {}
    const f = setup({
      begin: () => begin(),
      preview: (delta) => preview(delta),
      end: (commit) => end(commit),
    })
    const id = f.source.nodes[0]!.id
    const source = convertSceneNodesToMesh(f.source, [id])
    const mesh = source.geometries[0]!
    if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    })
    const gesture = createSceneComponentTransformGesture(editor, (error) => {
      throw error
    })
    begin = () => gesture.begin({ nodeId: id, mode: 'face', ids: ['pz'] }, mesh)
    preview = (delta) => {
      const accepted = gesture.preview(delta)
      f.viewport.setDocument(editor.getState().asset)
      f.viewport.setComponentSelection({ nodeId: id, mode: 'face' as const, ids: ['pz'] })
      return accepted
    }
    end = (commit) => {
      gesture.end(commit)
    }
    try {
      f.viewport.setDocument(source)
      f.viewport.setSelection([id])
      f.viewport.setComponentSelection({ nodeId: id, mode: 'face' as const, ids: ['pz'] })
      f.viewport.setTransformTool('move')
      f.tick()
      f.pointer('pointermove', 1, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 1, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 1, { clientX: f.x + 45, button: -1, buttons: 1 })
      expect(editor.getState().asset.geometries).not.toEqual(source.geometries)
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      f.pointer('pointerup', 1, { clientX: f.x + 45 })
      expect(editor.getState().canUndo).toBe(true)
      editor.getState().undo()
      expect(editor.getState().asset.geometries).toEqual(source.geometries)
      expect(editor.getState().canUndo).toBe(false)
      expect(f.faces).toHaveLength(0)
    } finally {
      f.close()
      editor.getState().dispose()
    }
  })
  test('face mode routes point picking to authorial faces and shares area tools with object mode', () => {
    const f = setup()
    try {
      const id = f.source.nodes[0]!.id
      const source = convertSceneNodesToMesh(f.source, [id])
      f.viewport.setDocument(source)
      f.viewport.setSelection([id])
      f.viewport.setAreaTool('point', false)
      f.viewport.setComponentSelection({ nodeId: id, mode: 'face' as const, ids: [] })
      f.tick()
      f.pointer('pointerdown')
      f.pointer('pointerup')
      expect(f.faces).toHaveLength(1)
      expect(f.faces[0]).not.toBeNull()
      expect(f.picks).toHaveLength(0)
      expect(f.groups).toHaveLength(0)
      f.viewport.setAreaTool('box', false)
      f.viewport.setComponentSelection(null)
      f.pointer('pointerdown', 2, { clientX: 10, clientY: 10 })
      f.pointer('pointerup', 2, { clientX: 310, clientY: 170 })
      expect(f.groups).toEqual([[id]])
    } finally {
      f.close()
    }
  })
  test('area selection is session-only and resumes after window blur without a pointerup', () => {
    const f = setup()
    try {
      const original = structuredClone(f.source)
      f.viewport.setAreaTool('box', true)
      f.pointer('pointerdown', 1, { clientX: 10, clientY: 10 })
      f.pointer('pointerup', 1, { clientX: 310, clientY: 170 })
      expect(f.groups).toEqual([f.source.nodes.map((node) => node.id)])
      expect(f.picks).toHaveLength(0)
      f.pointer('pointerdown', 2, { clientX: 10, clientY: 10 })
      f.pointer('pointermove', 2, { clientX: 310, clientY: 170 })
      f.canvas.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
      f.pointer('pointerdown', 3, { clientX: 10, clientY: 10 })
      f.pointer('pointerup', 3, { clientX: 310, clientY: 170 })
      expect(f.groups).toHaveLength(2)
      expect(f.source).toEqual(original)
    } finally {
      f.close()
    }
  })
  test('real transform handles preview, commit once, cancel and never select through the handle', () => {
    let gesture: ReturnType<typeof createSceneTransformGesture> | undefined
    const f = setup({
      begin: () => gesture?.begin(f.source.nodes.map((node) => node.id)) ?? false,
      preview: (delta) => {
        const accepted = gesture?.preview(delta) ?? false
        f.viewport.setDocument(editor.getState().asset)
        return accepted
      },
      end: (commit) => {
        gesture?.end(commit)
        f.viewport.setDocument(editor.getState().asset)
      },
    })
    const editor = createDocumentEditorStore({
      asset: f.source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    })
    const errors: unknown[] = []
    gesture = createSceneTransformGesture(editor, (error) => errors.push(error))
    try {
      f.viewport.setSelection(f.source.nodes.map((node) => node.id))
      f.viewport.setTransformTool('move')
      f.tick()
      f.pointer('pointermove', 1, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 1, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 1, { clientX: f.x + 45, button: -1, buttons: 1 })
      expect(editor.getState().asset).not.toBe(f.source)
      expect(editor.getState().canUndo).toBe(false)
      const moved = indexSceneDocument(editor.getState().asset).scene.worldMatrices.get(
        f.source.nodes[0]?.id ?? '',
      )
      expect(moved?.[12]).toBeGreaterThan(0)
      f.pointer('pointerup', 1, { clientX: f.x + 45 })
      expect(editor.getState().canUndo).toBe(true)
      expect(f.picks).toHaveLength(0)
      editor.getState().undo()
      expect(editor.getState().asset.nodes).toEqual(f.source.nodes)
      expect(editor.getState().canUndo).toBe(false)
      f.viewport.setDocument(editor.getState().asset)
      f.tick()
      const before = editor.getState().asset
      f.pointer('pointermove', 1, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 1, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 1, { clientX: f.x + 45, button: -1, buttons: 1 })
      expect(editor.getState().asset).not.toBe(before)
      f.viewport.cancelGesture()
      f.pointer('pointerup', 1, { clientX: f.x + 45 })
      expect(editor.getState().asset).toBe(before)
      expect(editor.getState().canUndo).toBe(false)
      expect(errors).toHaveLength(0)
      // Context loss has no guaranteed pointerup. A new pointer must still be able to drag.
      f.tick()
      f.pointer('pointermove', 3, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 3, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 3, { clientX: f.x + 45, button: -1, buttons: 1 })
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      expect(editor.getState().asset).toBe(before)
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      f.tick()
      f.pointer('pointermove', 4, { clientX: f.x + 20, button: -1 })
      f.pointer('pointerdown', 4, { clientX: f.x + 20, buttons: 1 })
      f.pointer('pointermove', 4, { clientX: f.x + 45, button: -1, buttons: 1 })
      expect(editor.getState().asset).not.toBe(before)
      f.pointer('pointercancel', 4)
      expect(editor.getState().asset).toBe(before)
    } finally {
      f.close()
      editor.getState().dispose()
    }
  })
  test('real raycasting selects the source, ignores navigation/cancel/multitouch, and isolates without editing', () => {
    const f = setup()
    try {
      f.pointer('pointerdown')
      f.pointer('pointerup')
      expect(f.picks).toEqual([f.source.nodes[0]?.id ?? null])
      f.pointer('pointerdown')
      f.pointer('pointermove', 1, { clientX: f.x + 12 })
      f.pointer('pointerup')
      f.pointer('pointerdown')
      f.pointer('pointercancel')
      f.pointer('pointerup')
      f.pointer('pointerdown', 1, { pointerType: 'touch' })
      f.pointer('pointerdown', 2, { pointerType: 'touch' })
      f.pointer('pointerup', 1, { pointerType: 'touch' })
      f.pointer('pointerup', 2, { pointerType: 'touch' })
      expect(f.picks).toHaveLength(1)
      f.viewport.setIsolation([])
      f.tick()
      f.pointer('pointerdown')
      f.pointer('pointerup')
      expect(f.picks.at(-1)).toBeNull()
      expect(f.source.nodes).toHaveLength(1)
    } finally {
      f.close()
    }
  })
  test('idle has no frame; context loss cancels pending selection and dispose ignores late calls', () => {
    const f = setup()
    try {
      expect(frames.size).toBe(0)
      f.pointer('pointerdown')
      f.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
      f.pointer('pointerup')
      expect(f.picks).toHaveLength(0)
      f.pointer('pointerdown')
      f.pointer('pointerup')
      expect(f.picks).toHaveLength(0)
      expect(frames.size).toBe(0)
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      expect(f.contexts).toEqual([true, false])
      f.tick()
      expect(frames.size).toBe(0)
      f.viewport.dispose()
      const count = f.count().renders
      f.viewport.setView('free')
      f.viewport.setDocument(f.source)
      f.viewport.setSelection([f.source.nodes[0]?.id ?? ''])
      f.viewport.frame()
      f.canvas.dispatchEvent(new Event('webglcontextrestored'))
      f.tick()
      expect(f.count().renders).toBe(count)
      expect(f.count().disposals).toBe(1)
      expect(f.count().scene?.children).toHaveLength(0)
    } finally {
      f.close()
    }
  })
})
