import { expect, it } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { COPY } from '../../../core/copy'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
} from '../../../core/project'
import { PINTA_RESOURCE_LIMITS } from '../../../core/projectConfig'
import { createEditorStore } from '../../../state/editorStore'
import { addMapObject, createMapObject } from '../../../tiles/mapObjects'
import { DEFAULT_OBJECT_SCATTER } from '../../../tiles/objectScatter'
import { addObjectLayer } from '../../../tiles/tilemapOps'
import { useLibraryPlacement } from './useLibraryPlacement'
import { useObjectScatter } from './useObjectScatter'

const settings = { ...DEFAULT_OBJECT_SCATTER, width: 1, density: 1, spacing: 0 }
function scene() {
  const base = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 6 }),
    'Objetos',
  )
  return addMapObject(
    base,
    base.layers.at(-1)!.id,
    createMapObject({
      name: 'arvore',
      shape: 'art',
      art: { assetId: 'arte' },
      x: 0,
      y: 0,
      width: 8,
      height: 8,
    }),
  )
}
function geometry(container: HTMLElement): void {
  for (const element of container.querySelectorAll('div'))
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 256, height: 192, right: 256, bottom: 192 }),
    })
}
const at = { button: 0, isPrimary: true, pointerId: 1, clientX: 80, clientY: 80 }

it('recusa de versões privadas avisa o motivo e não grava objetos ou histórico parciais', () => {
  const base = scene(),
    source = base.layers.find(isObjectLayer)!.objects[0]!,
    art = createTilesetAsset({ name: 'arte', tileSize: 16 }),
    map = {
      ...base,
      resources: Array.from({ length: PINTA_RESOURCE_LIMITS.maxVersions }, (_, index) => ({
        sourceId: `source-${index}`,
        capturedAt: 1,
        asset: {
          ...art,
          id: index === 0 ? 'arte' : `resource-${index}`,
          ...(index === 0
            ? { tileProperties: { '0': { target: { type: 'object' as const, value: source.id } } } }
            : {}),
        },
      })),
    },
    toasts: string[] = [],
    editor = createEditorStore({ asset: map, persist: async () => {} })
  function Host() {
    const paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null),
      c = useObjectScatter({
        editor,
        map,
        layerId: map.layers.at(-1)!.id,
        source,
        active: true,
        settings,
        tileSize: 16,
        cellPx: 32,
        pad: 0,
        paperRef,
        stageRef,
        showToast: (message) => toasts.push(message),
      })
    return (
      <div ref={stageRef}>
        <div ref={paperRef}>
          <canvas role="img" aria-label="Pintar" onPointerDown={c.down} />
        </div>
        <output>{c.message}</output>
      </div>
    )
  }
  const view = render(<Host />)
  geometry(view.container)
  fireEvent.pointerDown(screen.getByRole('img', { name: 'Pintar' }), at)
  expect(screen.getByRole('status').textContent).toBe(COPY.scene.resourcePasteFailed)
  fireEvent.pointerUp(document, at)
  expect(editor.getState().asset).toBe(map)
  expect(editor.getState().canUndo).toBe(false)
  expect(toasts).toEqual([COPY.scene.resourcePasteFailed])
})

it('cópia recuperada durante a prévia não é substituída por eventos atrasados do pincel', async () => {
  const original = scene(),
    recovered = { ...original, id: 'vila-recuperada', name: 'copia-recuperada' }
  const editor = createEditorStore({
    asset: original,
    autosaveDelayMs: 100_000,
    persist: async () => {
      throw new Error('Conflito de revisão')
    },
    recoverPersisted: () => ({ asset: recovered, linked: [] }),
  })
  editor.getState().commit({ ...original, name: 'vila-em-edicao' })
  function Host() {
    const paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null)
    const map = editor.getState().asset
    if (map.kind !== 'tilemap') throw new Error('Mapa esperado')
    const source = map.layers.filter(isObjectLayer)[0]!.objects[0]!
    const c = useObjectScatter({
      editor,
      map,
      layerId: map.layers.at(-1)!.id,
      source,
      active: true,
      settings,
      tileSize: 16,
      cellPx: 32,
      pad: 0,
      paperRef,
      stageRef,
      showToast: () => {},
    })
    return (
      <div ref={stageRef}>
        <div ref={paperRef}>
          <canvas role="img" aria-label="Pintar" onPointerDown={c.down} />
        </div>
        <output>{c.preview?.addedIds.length ?? 0}</output>
      </div>
    )
  }
  const view = render(<Host />)
  geometry(view.container)
  fireEvent.pointerDown(screen.getByRole('img', { name: 'Pintar' }), at)
  expect(screen.getByRole('status').textContent).toBe('1')
  await act(async () => {
    expect(await editor.getState().flush()).toEqual({ ok: true })
  })
  expect(editor.getState().asset).toBe(recovered)
  fireEvent.pointerUp(document, at)
  fireEvent.pointerCancel(document, at)
  expect(editor.getState().asset).toBe(recovered)
  expect(editor.getState().canUndo).toBe(false)
  expect(screen.getByRole('status').textContent).toBe('0')
})

it('recusa do orçamento do host não cria histórico nem anuncia espalhamento confirmado', () => {
  const map = scene(),
    toasts: string[] = []
  const editor = createEditorStore({ asset: map, acceptEdit: () => false, persist: async () => {} })
  function Host() {
    const paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null)
    const c = useObjectScatter({
      editor,
      map,
      layerId: map.layers.at(-1)!.id,
      source: map.layers.filter(isObjectLayer)[0]!.objects[0]!,
      active: true,
      settings,
      tileSize: 16,
      cellPx: 32,
      pad: 0,
      paperRef,
      stageRef,
      showToast: (m) => toasts.push(m),
    })
    return (
      <div ref={stageRef}>
        <div ref={paperRef}>
          <canvas role="img" aria-label="Pintar" onPointerDown={c.down} />
        </div>
        <output>{c.message}</output>
      </div>
    )
  }
  const view = render(<Host />)
  geometry(view.container)
  fireEvent.pointerDown(screen.getByRole('img', { name: 'Pintar' }), at)
  fireEvent.pointerUp(document, at)
  expect(editor.getState().asset).toBe(map)
  expect(editor.getState().canUndo).toBe(false)
  expect(toasts).toEqual([COPY.scene.scatterRefused])
  expect(screen.getByRole('status').textContent).toBe(COPY.scene.scatterRefused)
})

it('biblioteca também respeita a recusa do host sem selecionar um objeto inexistente', () => {
  const map = scene(),
    source = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 }),
    toasts: string[] = []
  const editor = createEditorStore({ asset: map, acceptEdit: () => false, persist: async () => {} })
  let selected = 0
  function Host() {
    const paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null)
    const c = useLibraryPlacement({
      editor,
      map,
      layerId: map.layers.at(-1)!.id,
      assets: [source],
      tileSize: 16,
      cellPx: 32,
      pad: 0,
      snap: true,
      paperRef,
      stageRef,
      position: () => ({ x: 40, y: 40 }),
      showToast: (m) => toasts.push(m),
      onSelect: () => {
        selected++
      },
    })
    return (
      <div ref={stageRef}>
        <div ref={paperRef} />
        <button
          type="button"
          onPointerDown={(e) => c.down(source, e)}
          onClick={(e) => c.click(source, e)}
        >
          Árvore
        </button>
        <output>{c.message}</output>
      </div>
    )
  }
  const view = render(<Host />)
  geometry(view.container)
  const card = screen.getByRole('button', { name: 'Árvore' })
  fireEvent.pointerDown(card, { ...at, clientX: 300 })
  fireEvent.pointerMove(document, at)
  fireEvent.pointerUp(document, at)
  expect(editor.getState().asset).toBe(map)
  expect(editor.getState().canUndo).toBe(false)
  expect(selected).toBe(0)
  expect(toasts).toEqual([COPY.scene.libraryUnavailable])
  expect(screen.getByRole('status').textContent).not.toContain(COPY.scene.libraryPlaced('arvore'))
})
