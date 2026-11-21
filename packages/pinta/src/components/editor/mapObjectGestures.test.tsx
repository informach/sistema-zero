import { expect, test } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import { createTilemapAsset, isObjectLayer, type PintaAsset } from '../../core/project'
import { createEditorStore } from '../../state/editorStore'
import { createMapSetEditorStore } from '../../state/mapSetEditorStore'
import { createSessionStore } from '../../state/sessionStore'
import { addMapObject, createMapObject } from '../../tiles/mapObjects'
import { createMapSet } from '../../tiles/sets'
import { addObjectLayer } from '../../tiles/tilemapOps'
import { ToastProvider } from '../ui/Toast'
import { PintaEditorProvider, useEditor } from './editorContext'
import { MapObjectsOverlay } from './MapObjectsOverlay'

type Operation = 'move' | 'resize' | 'vertex' | 'insert' | 'create' | 'point' | 'draft'
function setup(set = false, refuse = false, operation: Operation = 'move') {
  const map = addObjectLayer(
      createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 6 }),
      'Objetos',
    ),
    layerId = map.layers.at(-1)!.id,
    base = addMapObject(
      map,
      layerId,
      createMapObject({
        name: 'casa',
        x: 16,
        y: 16,
        width: 32,
        height: 32,
        ...(['vertex', 'insert'].includes(operation)
          ? {
              shape: 'polygon' as const,
              points: [
                { x: 0, y: 0 },
                { x: 32, y: 0 },
                { x: 32, y: 32 },
              ],
            }
          : {}),
      }),
    ),
    root = set ? createMapSet(base, { col: 0, row: 0, cols: 8, rows: 6 }, 16, 'Conjunto') : base,
    outer = createEditorStore({
      asset: root,
      autosaveDelayMs: 100000,
      persist: async () => {},
      acceptEdit: (asset) => {
        const map = asset.kind === 'map-set' ? asset.map : asset
        return (
          !refuse ||
          map.kind !== 'tilemap' ||
          (map.layers.find(isObjectLayer)?.objects[0]?.x ?? 0) < 48
        )
      },
    }),
    facade = set ? createMapSetEditorStore(outer) : null,
    editor = facade?.store ?? outer,
    stop = facade ? outer.subscribe(() => facade.store.setState(facade.read(), true)) : () => {},
    session = createSessionStore(),
    viewLayer = (root.kind === 'map-set' ? root.map : base).layers.find(isObjectLayer)!
  function Host() {
    const asset = useEditor((state) => state.asset)
    if (asset.kind !== 'tilemap') throw Error('Mapa esperado')
    return (
      <MapObjectsOverlay
        tilemap={asset}
        activeLayerId={viewLayer.id}
        interactive
        tool={
          operation === 'draft'
            ? 'object-polygon'
            : operation === 'create'
              ? 'object-rect'
              : operation === 'point'
                ? 'object-point'
                : 'object-select'
        }
        tileSize={16}
        pad={0}
        scale={1}
        snap={false}
        selectedObjectId={
          ['resize', 'vertex', 'insert'].includes(operation) ? viewLayer.objects[0]!.id : null
        }
        onSelectObject={() => {}}
      />
    )
  }
  const view = render(
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <Host />
        </PintaEditorProvider>
      </ToastProvider>,
    ),
    svg = view.container.querySelector('svg')!
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 128, height: 96 }),
  })
  const at = (x: number, pointerId = 1, y = 32) => ({
    isPrimary: true,
    pointerId,
    clientX: x,
    clientY: y,
  })
  return { outer, editor, svg, at, stop, view }
}

function content(asset: PintaAsset): PintaAsset {
  return {
    ...asset,
    updatedAt: 0,
    ...(asset.kind === 'map-set' ? { map: { ...asset.map, updatedAt: 0 } } : {}),
  }
}

function objectX(asset: PintaAsset): number | undefined {
  const map = asset.kind === 'map-set' ? asset.map : asset
  return map.kind === 'tilemap' ? map.layers.find(isObjectLayer)?.objects[0]?.x : undefined
}

for (const set of [false, true])
  for (const ending of ['move', 'release', 'cancel'] as const)
    test(`objeto: revisão do mesmo ID sobrevive a ${ending}, conjunto=${set}`, async () => {
      const { outer, editor, svg, at, stop } = setup(set)
      try {
        fireEvent.pointerDown(svg, at(32))
        fireEvent.pointerMove(svg, at(48))
        expect(objectX(editor.getState().asset)).toBe(32)
        act(() => outer.getState().replace({ ...outer.getState().asset, name: 'revisao-externa' }))
        const adopted = outer.getState().asset
        if (ending === 'move') fireEvent.pointerMove(svg, at(64))
        if (ending === 'cancel') fireEvent.pointerCancel(svg, at(64))
        fireEvent.pointerUp(svg, at(64))
        expect(outer.getState().asset).toBe(adopted)
        expect(outer.getState().canUndo).toBe(false)
        await outer.getState().flush()
      } finally {
        stop()
      }
    })

for (const set of [false, true])
  test(`objeto: cancelar descarta o gesto inteiro sem desfazer, conjunto=${set}`, async () => {
    const { outer, editor, svg, at, stop } = setup(set),
      base = outer.getState().asset
    try {
      fireEvent.pointerDown(svg, at(32))
      fireEvent.pointerMove(svg, at(48))
      expect(objectX(editor.getState().asset)).toBe(32)
      fireEvent.pointerCancel(svg, at(48, 2))
      expect(editor.getState().asset.kind).toBe('tilemap')
      fireEvent.pointerCancel(svg, at(48))
      fireEvent.pointerUp(svg, at(48))
      expect(content(outer.getState().asset)).toEqual(content(base))
      expect(outer.getState().canUndo).toBe(false)
      await outer.getState().flush()
    } finally {
      stop()
    }
  })

test('objeto: recusa no meio restaura a base inteira, sem histórico parcial', async () => {
  const { outer, svg, at } = setup(false, true),
    base = outer.getState().asset
  fireEvent.pointerDown(svg, at(32))
  fireEvent.pointerMove(svg, at(48))
  fireEvent.pointerMove(svg, at(64))
  fireEvent.pointerUp(svg, at(64))
  expect(content(outer.getState().asset)).toEqual(content(base))
  expect(outer.getState().canUndo).toBe(false)
  await outer.getState().flush()
})

const positions: Record<Exclude<Operation, 'draft'>, [number, number, number, number]> = {
  move: [32, 32, 48, 32],
  resize: [48, 48, 64, 64],
  vertex: [16, 16, 24, 8],
  insert: [32, 16, 32, 8],
  create: [80, 16, 112, 48],
  point: [80, 16, 96, 32],
}
for (const operation of Object.keys(positions) as Exclude<Operation, 'draft'>[])
  for (const ending of ['finish', 'cancel', 'escape', 'unmount', 'superseded'] as const)
    test(`objeto ${operation}: ${ending} conserva o documento e o histórico`, async () => {
      const { outer, svg, at, view } = setup(false, false, operation),
        base = outer.getState().asset,
        [x, y, endX, endY] = positions[operation]
      fireEvent.pointerDown(svg, at(x, 1, y))
      fireEvent.pointerMove(svg, at(endX, 1, endY))
      expect(content(outer.getState().asset)).not.toEqual(content(base))
      const changed = outer.getState().asset
      if (ending === 'superseded') {
        act(() => outer.getState().replace({ ...changed, name: 'revisao-externa' }))
        const adopted = outer.getState().asset
        fireEvent.pointerMove(svg, at(endX + 8, 1, endY))
        fireEvent.pointerUp(svg, at(endX + 8, 1, endY))
        expect(outer.getState().asset).toBe(adopted)
        expect(outer.getState().canUndo).toBe(false)
      } else if (ending === 'finish') {
        fireEvent.pointerUp(svg, at(endX, 1, endY))
        expect(outer.getState().canUndo).toBe(true)
        act(() => outer.getState().undo())
        expect(content(outer.getState().asset)).toEqual(content(base))
        expect(outer.getState().canUndo).toBe(false)
        act(() => outer.getState().redo())
        expect(content(outer.getState().asset)).toEqual(content(changed))
      } else {
        if (ending === 'unmount') view.unmount()
        else if (ending === 'escape') fireEvent.keyDown(window, { key: 'Escape' })
        else fireEvent.pointerCancel(svg, at(endX, 1, endY))
        fireEvent.pointerUp(svg, at(endX, 1, endY))
        expect(content(outer.getState().asset)).toEqual(content(base))
        expect(outer.getState().canUndo).toBe(false)
      }
      await outer.getState().flush()
    })

for (const set of [false, true])
  for (const ending of ['finish', 'external', 'continue'] as const)
    test(`forma ponto a ponto: ${ending} respeita a revisão inicial, conjunto=${set}`, async () => {
      const { outer, svg, at, stop } = setup(set, false, 'draft'),
        base = outer.getState().asset
      try {
        for (const [x, y] of [
          [80, 16],
          [112, 16],
          [112, 48],
        ]) {
          fireEvent.pointerDown(svg, at(x!, 1, y!))
          fireEvent.pointerUp(svg, at(x!, 1, y!))
        }
        expect(svg.querySelector('[data-shape-draft]')).not.toBeNull()
        if (ending !== 'finish')
          act(() =>
            outer.getState().replace({ ...outer.getState().asset, name: 'revisao-externa' }),
          )
        const adopted = outer.getState().asset
        if (ending === 'continue') fireEvent.pointerDown(svg, at(80, 1, 64))
        fireEvent.keyDown(window, { key: 'Enter' })
        if (ending === 'finish') {
          expect(outer.getState().canUndo).toBe(true)
          act(() => outer.getState().undo())
          expect(content(outer.getState().asset)).toEqual(content(base))
        } else {
          expect(outer.getState().asset).toBe(adopted)
          expect(outer.getState().canUndo).toBe(false)
        }
        expect(svg.querySelector('[data-shape-draft]')).toBeNull()
        await outer.getState().flush()
      } finally {
        stop()
      }
    })
