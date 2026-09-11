import { expect, test } from 'bun:test'
import { OrthographicCamera } from 'three'
import { createSceneMaterialImage } from '../scene/appearanceCommands'
import { addScenePrimitive } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { setSceneImageFlipbook } from '../scene/imageFlipbookCommands'
import type { ScenePaintSample } from '../scene/imagePaint'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { ensureScenePaintSurface } from '../scene/paintSurface'
import { scenePaintFaceBounds } from '../scene/paintSurfaceBounds'
import { makeModel } from '../testing/fixtures'
import { ScenePaintInput } from './ScenePaintInput'
import { SceneRenderResource } from './sceneRenderResource'

function fixture() {
  let document = migrateLegacyModel(makeModel()).document
  let index = indexSceneDocument(document)
  const image = document.images[0]!
  const material = document.materials.find((m) => m.colorImageId === image.id)!
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: image.id,
    layerId: image.layers[0]!.id,
  }
  const resource = new SceneRenderResource()
  resource.update(document)
  const canvas = window.document.createElement('canvas')
  const captured = new Set<number>()
  canvas.setPointerCapture = (id) => {
    captured.add(id)
  }
  canvas.hasPointerCapture = (id) => captured.has(id)
  canvas.releasePointerCapture = (id) => {
    captured.delete(id)
  }
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 400, 400)
  window.document.body.append(canvas)
  const camera = new OrthographicCamera(-4, 4, 4, -4, 0.1, 100)
  camera.position.set(0, 20, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  const begins: ScenePaintSample[] = [],
    moves: Array<ScenePaintSample | null> = [],
    ends: boolean[] = []
  const input = new ScenePaintInput(
    canvas,
    () => camera,
    () => index,
    resource,
    {
      begin: (sample) => {
        begins.push(sample)
        return true
      },
      move: (sample) => {
        moves.push(sample)
      },
      end: (commit) => {
        ends.push(commit)
      },
    },
  )
  input.setTarget(target)
  const event = (
    type: string,
    pointerId = 1,
    clientX = 200,
    clientY = 200,
    extra: PointerEventInit = {},
  ) =>
    canvas.dispatchEvent(
      new PointerEvent(type, { pointerId, clientX, clientY, button: 0, bubbles: true, ...extra }),
    )
  return {
    input,
    target,
    image,
    resource,
    canvas,
    event,
    begins,
    moves,
    ends,
    captured,
    update(next: typeof document) {
      document = next
      index = indexSceneDocument(next)
      resource.update(next)
    },
    document: () => document,
    close() {
      input.dispose()
      resource.dispose()
      canvas.remove()
    },
  }
}

test.each([
  'normal',
  'roughness',
  'metalness',
] as const)('3D %s painting resolves that role on the actual hit and refuses a mismatched color binding', (imageKind) => {
  const f = fixture()
  try {
    const source = createSceneMaterialImage(f.document(), f.target.materialId, {
      kind: imageKind,
      name: 'Mapa',
      width: 4,
      height: 2,
      encoding: 'rgba',
    })
    const image = source.images.at(-1)!
    f.update(source)
    const target = { ...f.target, imageId: image.id, layerId: image.layers[0]!.id }
    f.input.setTarget(target)
    f.event('pointerdown', 1, 206.25, 206.25)
    expect(f.begins).toHaveLength(0)
    f.input.setTarget({ ...target, imageKind })
    f.event('pointerdown', 2, 206.25, 206.25)
    expect(f.begins).toHaveLength(1)
    expect(f.begins[0]!.point[0]).toBeLessThan(4)
    expect(f.begins[0]!.point[1]).toBeLessThan(2)
    f.event('pointerup', 2, 206.25, 206.25)
    expect(f.ends.at(-1)).toBe(true)
  } finally {
    f.close()
  }
})

test('real 3D painting picks corner UV on the visible face, captures one pointer and prevents orbit/selection leakage', () => {
  const f = fixture()
  try {
    let navigation = 0
    f.canvas.addEventListener('pointerdown', () => {
      navigation++
    })
    // Stay inside a texel: the exact model center lies on two pixel boundaries.
    f.event('pointerdown', 1, 206.25, 206.25)
    expect(f.begins).toHaveLength(1)
    expect(f.begins[0]!.point).toEqual([f.image.width / 2, f.image.height / 2])
    expect(JSON.parse(f.begins[0]!.region)).toEqual(['body', 'py'])
    expect(f.captured.has(1)).toBe(true)
    expect(navigation).toBe(0)
    f.event('pointermove', 1, 450, 200)
    expect(f.moves.at(-1)).toBeNull()
    f.event('pointermove', 1, 220, 200)
    expect(f.moves.at(-1)?.region).toBe(f.begins[0]!.region)
    f.event('pointerup', 1, 220, 200)
    expect(f.ends).toEqual([true])
    expect(f.captured.size).toBe(0)
    f.input.setTarget(null)
    f.event('pointerdown')
    expect(navigation).toBe(1)
  } finally {
    f.close()
  }
})

test('image painting consumes the same UV trajectory and gaps from grouped or separate pointer samples', () => {
  function run(grouped: boolean) {
    const f = fixture(),
      source = structuredClone(f.document()),
      points = [
        [206.25, 206.25],
        [450, 200],
        [218.75, 206.25],
      ] as const
    try {
      f.event('pointerdown', 1, 206.25, 206.25)
      if (grouped) {
        const event = new PointerEvent('pointermove', {
          pointerId: 1,
          clientX: 200,
          clientY: 200,
          bubbles: true,
        })
        Object.defineProperty(event, 'getCoalescedEvents', {
          value: () =>
            points.map(
              ([clientX, clientY]) =>
                new PointerEvent('pointermove', { pointerId: 1, clientX, clientY }),
            ),
        })
        f.canvas.dispatchEvent(event)
      } else for (const [x, y] of points) f.event('pointermove', 1, x, y)
      f.event('pointerup', 1, 218.75, 206.25)
      expect(f.moves).toHaveLength(4)
      expect(f.moves[0]).not.toBeNull()
      expect(f.moves[1]).toBeNull()
      expect(f.moves[2]).not.toBeNull()
      expect(f.ends).toEqual([true])
      expect(f.document()).toEqual(source)
      return f.moves
    } finally {
      f.close()
    }
  }
  expect(run(true)).toEqual(run(false))
})

test('3D paint samples the displayed flipbook cell in canonical sheet coordinates', () => {
  const f = fixture()
  try {
    const width = f.image.width / 2,
      height = f.image.height / 2
    f.update(
      setSceneImageFlipbook(f.document(), f.image.id, {
        frameWidth: width,
        frameHeight: height,
        frames: [0, 3],
        fps: 8,
        loop: true,
      }),
    )
    f.event('pointerdown', 1, 206.25, 206.25)
    expect(f.begins[0]!.point).toEqual([width / 2, height + height / 2])
    f.event('pointerup', 1, 206.25, 206.25)
    f.resource.setImageFrame(f.image.id, 3)
    f.event('pointerdown', 2, 206.25, 206.25)
    expect(f.begins[1]!.point).toEqual([width + width / 2, height / 2])
    expect(f.begins[1]!.region).not.toBe(f.begins[0]!.region)
  } finally {
    f.close()
  }
})

test('paint ray never crosses a nearer locked piece, and image/material mismatch is not paintable', () => {
  const f = fixture()
  try {
    const source = f.document()
    const body = source.nodes.find((n) => n.id === 'body')!
    f.update({
      ...source,
      nodes: [
        ...source.nodes,
        {
          ...body,
          id: 'occluder',
          locked: true,
          transform: {
            kind: 'trs',
            translation: [0, 3, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          },
        },
      ],
    })
    f.event('pointerdown')
    f.event('pointerup')
    expect(f.begins).toEqual([])
    f.update(source)
    f.input.setTarget({ ...f.target, imageId: 'missing' })
    f.event('pointerdown')
    f.event('pointerup')
    expect(f.begins).toEqual([])
  } finally {
    f.close()
  }
})

test('second pointers, target changes, cancellation, context suspension and disposal terminate painting', () => {
  const f = fixture()
  try {
    f.event('pointerdown')
    f.event('pointerdown', 2)
    f.event('pointerup', 2)
    f.event('pointerup')
    expect(f.ends).toEqual([false])
    f.event('pointerdown')
    f.input.setEnabled(false)
    f.event('pointerup')
    f.event('pointerdown')
    expect(f.ends).toEqual([false, false])
    expect(f.begins).toHaveLength(2)
    f.input.setEnabled(true)
    f.event('pointerdown')
    f.input.setTarget({ ...f.target })
    f.event('pointerup')
    expect(f.ends).toEqual([false, false, false])
    f.event('pointerdown')
    f.input.dispose()
    f.event('pointerup')
    f.event('pointerdown')
    expect(f.ends).toEqual([false, false, false, false])
    expect(f.captured.size).toBe(0)
  } finally {
    f.close()
  }
})

test('capture failure cancels the stroke and allows the next pointer to start cleanly', () => {
  const f = fixture()
  try {
    const capture = f.canvas.setPointerCapture
    f.canvas.setPointerCapture = () => {
      throw new Error('Detached canvas')
    }
    f.event('pointerdown')
    f.event('pointerup')
    expect(f.ends).toEqual([false])
    f.canvas.setPointerCapture = capture
    f.event('pointerdown')
    f.event('pointerup')
    expect(f.ends).toEqual([false, true])
  } finally {
    f.close()
  }
})

test('na folha que a aba Pintar prepara, cada amostra leva o limite da face tocada', () => {
  let n = 0
  const base = migrateLegacyModel(makeModel({ parts: [] })).document
  const withBox = addScenePrimitive(base, 'box', 'caixa', () => `p${++n}`)
  const nodeId = withBox.nodes.at(-1)!.id
  const prepared = ensureScenePaintSurface(withBox, { nodeId }, () => `p${++n}`)
  if (prepared.status !== 'ready') throw new Error('Superfície ausente.')
  const document = prepared.document
  const index = indexSceneDocument(document)
  const resource = new SceneRenderResource()
  resource.update(document)
  const canvas = window.document.createElement('canvas')
  canvas.setPointerCapture = () => {}
  canvas.hasPointerCapture = () => false
  canvas.releasePointerCapture = () => {}
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 400, 400)
  window.document.body.append(canvas)
  const camera = new OrthographicCamera(-4, 4, 4, -4, 0.1, 100)
  camera.position.set(0, 20, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  const begins: ScenePaintSample[] = []
  const input = new ScenePaintInput(
    canvas,
    () => camera,
    () => index,
    resource,
    {
      begin: (sample) => {
        begins.push(sample)
        return true
      },
      move: () => {},
      end: () => {},
    },
  )
  const others: number[] = []
  canvas.addEventListener('pointerdown', (event) => others.push(event.pointerId))
  try {
    input.setTarget(prepared.target)
    input.setClaimMisses(false)
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 206.25,
        clientY: 206.25,
        button: 0,
      }),
    )
    const image = document.images.find((entry) => entry.id === prepared.target.imageId)!
    const node = index.scene.nodes.get(nodeId)
    if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
    const geometry = document.geometries.find((entry) => entry.id === node.geometryId)!
    expect(begins).toHaveLength(1)
    expect(begins[0]!.bounds).toEqual(scenePaintFaceBounds(geometry, 'py', image)!)
    expect(begins[0]!.bounds).not.toEqual({
      x0: 0,
      y0: 0,
      x1: image.width - 1,
      y1: image.height - 1,
    })
    const [x, y] = begins[0]!.point
    const bounds = begins[0]!.bounds!
    expect(x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1).toBe(true)
    expect(others).toEqual([])
    canvas.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, clientX: 206.25, clientY: 206.25 }),
    )
    // Fora da peça: não é engolido, a câmera recebe.
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 2, clientX: 20, clientY: 20, button: 0 }),
    )
    expect(begins).toHaveLength(1)
    expect(others).toEqual([2])
  } finally {
    input.dispose()
    resource.dispose()
    canvas.remove()
  }
})
