/**
 * As partes PURAS do editor de mapa: o pincel e o balde, a guarda dos commits, os níveis, o
 * minimapa, os atalhos e a seleção de um pedaço.
 */
import { describe, expect, it } from 'bun:test'
import type { PointerEvent } from 'react'
import {
  type AnyTilesetAsset,
  createTilemapAsset,
  createTilesetAsset,
  type TilemapAsset,
} from '../../../core/project'
import { createEditorStore } from '../../../state/editorStore'
import { tileLayerAt } from '../../../testing/fixtures'
import { CELL_FLIP_H, cellTile, makeCell } from '../../../tiles/cell'
import type { CellPos, CellRect } from '../../../tiles/cellGeometry'
import { addMapGroup, updateMapLayer } from '../../../tiles/layerTree'
import { addMapObject, createMapObject } from '../../../tiles/mapObjects'
import { addObjectLayer, setCell } from '../../../tiles/tilemapOps'
import { DEFAULT_MAP_BRUSH } from '../MapTerrainPanel'
import { commitIfChanged, sameAssetContent } from './commitGuard'
import { applyMapBrush, fillWithBrush, type MapBrushContext } from './mapBrush'
import {
  isMapToolAvailable,
  isToolInLevel,
  mapFeaturesFor,
  mapFeaturesInUse,
  readMapLevel,
  writeMapLevel,
} from './mapLevels'
import { cachedMinimapColors, minimapViewRect, tilesetMinimapColors } from './minimapView'
import { createMapSelectionController, type MapSelection } from './selectionController'
import { animationFrameKey } from './useMapAnimation'
import { shortcutTool } from './useMapKeyboard'

const mapa = (cols = 4, rows = 4): TilemapAsset =>
  createTilemapAsset({ name: 'fase', tilesetId: 'ts', cols, rows })
function pecas(count = 4): AnyTilesetAsset {
  const ts = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  return {
    ...ts,
    id: 'ts',
    tiles: Array.from({ length: count }, () => ts.tiles[0]!),
    solid: Array(count).fill(false),
    platform: Array(count).fill(false),
  }
}
const contexto = (m: TilemapAsset, extra: Partial<MapBrushContext> = {}): MapBrushContext => ({
  layerId: tileLayerAt(m).id,
  erasing: false,
  selectedTile: 1,
  stamp: null,
  anchor: null,
  tileset: pecas(),
  brush: DEFAULT_MAP_BRUSH,
  ...extra,
})
const loja = (asset: TilemapAsset) =>
  createEditorStore({ asset, persist: async () => {}, autosaveDelayMs: 100000 })

describe('balde', () => {
  it('enche com a peça do carimbo, com os bits de virar', () => {
    const m = mapa()
    const virada = makeCell(2, CELL_FLIP_H)
    const out = fillWithBrush(
      m,
      { col: 0, row: 0 },
      contexto(m, { stamp: { cols: 1, rows: 1, tiles: Int16Array.of(virada) } }),
    ).map
    const cells = tileLayerAt(out).cells
    expect(cells.every((cell) => cell === virada)).toBe(true)
    expect(cellTile(cells[0] ?? -1)).toBe(2)
    expect(virada).not.toBe(2)
  })
  it('sem carimbo, enche com a peça escolhida', () => {
    const m = mapa()
    const out = fillWithBrush(m, { col: 1, row: 1 }, contexto(m)).map
    expect(tileLayerAt(out).cells.every((cell) => cell === 1)).toBe(true)
  })
  it('área que já está igual e camada trancada devolvem o MESMO mapa (nada a gravar)', () => {
    const m = mapa()
    const cheio = fillWithBrush(m, { col: 0, row: 0 }, contexto(m)).map
    expect(fillWithBrush(cheio, { col: 2, row: 2 }, contexto(cheio)).map).toBe(cheio)
    const trancado = updateMapLayer(m, tileLayerAt(m).id, { locked: true })
    expect(fillWithBrush(trancado, { col: 0, row: 0 }, contexto(trancado)).map).toBe(trancado)
    const store = loja(cheio)
    expect(
      commitIfChanged(
        store.getState(),
        fillWithBrush(cheio, { col: 0, row: 0 }, contexto(cheio)).map,
      ),
    ).toBe(false)
    expect(store.getState().canUndo).toBe(false)
  })
  it('com "espalhar" ligado, o balde espalha na região inteira', () => {
    const m = mapa()
    const out = fillWithBrush(
      m,
      { col: 0, row: 0 },
      contexto(m, { brush: { ...DEFAULT_MAP_BRUSH, scatter: true, density: 1, tiles: [3] } }),
    ).map
    expect(tileLayerAt(out).cells.every((cell) => cell === 3)).toBe(true)
  })
})

describe('pincel', () => {
  it('lápis, borracha e carimbo', () => {
    const m = mapa()
    const um = applyMapBrush(m, [{ col: 0, row: 0 }], contexto(m)).map
    expect(tileLayerAt(um).cells[0]).toBe(1)
    expect(applyMapBrush(um, [{ col: 0, row: 0 }], contexto(um)).map).toBe(um)
    const apagado = applyMapBrush(um, [{ col: 0, row: 0 }], contexto(um, { erasing: true })).map
    expect(tileLayerAt(apagado).cells[0]).toBe(-1)
    const carimbo = applyMapBrush(
      m,
      [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      contexto(m, {
        stamp: { cols: 2, rows: 1, tiles: Int16Array.of(2, 3) },
        anchor: { col: 0, row: 0 },
      }),
    ).map
    expect([...tileLayerAt(carimbo).cells.slice(0, 2)]).toEqual([2, 3])
  })
  it('terreno sem as peças de borda avisa e não muda o mapa', () => {
    const m = mapa()
    const tileset: AnyTilesetAsset = {
      ...pecas(),
      terrains: [{ id: 't', name: 'Grama', mode: 'corner', colors: ['#0f0'], tiles: {} }],
    }
    const out = applyMapBrush(
      m,
      [{ col: 1, row: 1 }],
      contexto(m, { tileset, brush: { ...DEFAULT_MAP_BRUSH, terrainId: 't' } }),
    )
    expect(out.unmatched).toBe(true)
    expect(out.map).toBe(m)
  })
})

describe('guarda dos commits', () => {
  it('mesmo conteúdo em outro objeto não é gravado; conteúdo diferente é', () => {
    const m = setCell(mapa(), tileLayerAt(mapa()).id, 0, 0, 1)
    const base = mapa()
    const id = tileLayerAt(base).id
    const a = setCell(base, id, 0, 0, 1)
    const copia: TilemapAsset = {
      ...a,
      layers: a.layers.map((l) =>
        'cells' in l && l.cells ? { ...l, cells: new Int16Array(l.cells) } : l,
      ),
    } as TilemapAsset
    expect(copia).not.toBe(a)
    expect(sameAssetContent(a, copia)).toBe(true)
    expect(sameAssetContent(a, setCell(a, id, 1, 0, 1))).toBe(false)
    expect(sameAssetContent(a, { ...a, name: 'outro' })).toBe(false)
    expect(sameAssetContent(m, a)).toBe(false)
    const store = loja(a)
    expect(commitIfChanged(store.getState(), copia)).toBe(false)
    expect(commitIfChanged(store.getState(), a)).toBe(false)
    expect(store.getState().canUndo).toBe(false)
    expect(commitIfChanged(store.getState(), setCell(a, id, 1, 0, 1))).toBe(true)
    expect(store.getState().canUndo).toBe(true)
  })
})

describe('seleção de um pedaço do mapa', () => {
  function montar(inicial: TilemapAsset, locked = false) {
    const store = loja(inicial)
    const selRef = { current: null as MapSelection | null },
      movingRef = { current: null as { offset: CellPos } | null },
      selPointerRef = { current: null as number | null },
      selfCommitRef = { current: false }
    let rect: CellRect | null = null
    let cell: CellPos = { col: 0, row: 0 }
    const controller = () => {
      const tilemap = store.getState().asset as TilemapAsset
      return createMapSelectionController({
        tilemap,
        layerId: tileLayerAt(tilemap).id,
        editor: store,
        selRef,
        movingRef,
        selPointerRef,
        selfCommitRef,
        setSelRect: (r) => {
          rect = r
        },
        cellFromEvent: () => cell,
        clampCell: (p) => p,
        renderSelection: () => {},
        isLocked: () => locked,
      })
    }
    const evento = (pointerId = 1) =>
      ({
        isPrimary: true,
        pointerId,
        currentTarget: {},
      }) as unknown as PointerEvent<HTMLCanvasElement>
    const arrastar = (from: CellPos, to: CellPos): void => {
      cell = from
      controller().selectDown(evento())
      cell = to
      controller().selectMove(evento())
      controller().selectUp(evento())
    }
    return { store, selRef, selfCommitRef, controller, arrastar, rect: () => rect }
  }
  const comPeca = (): TilemapAsset => {
    const m = mapa()
    return setCell(m, tileLayerAt(m).id, 1, 1, 2)
  }
  it('pedaço só de grade vazia não vira seleção', () => {
    const t = montar(comPeca())
    t.arrastar({ col: 2, row: 2 }, { col: 3, row: 3 })
    expect(t.selRef.current).toBeNull()
    expect(t.rect()).toBeNull()
  })
  it('marca, levanta, leva para outro lugar e carimba com UM desfazer', () => {
    const t = montar(comPeca())
    t.arrastar({ col: 1, row: 1 }, { col: 1, row: 1 })
    expect(t.selRef.current?.kind).toBe('rect')
    expect(t.rect()).toEqual({ col: 1, row: 1, cols: 1, rows: 1 })
    t.arrastar({ col: 1, row: 1 }, { col: 3, row: 0 })
    expect(t.selRef.current?.kind).toBe('floating')
    expect(t.store.getState().canUndo).toBe(false)
    t.controller().stampPending()
    const cells = tileLayerAt(t.store.getState().asset as TilemapAsset).cells
    expect(cells[1 * 4 + 1]).toBe(-1)
    expect(cells[0 * 4 + 3]).toBe(2)
    expect(t.selfCommitRef.current).toBe(true)
    t.store.getState().undo()
    expect(t.store.getState().canUndo).toBe(false)
  })
  it('levantar e soltar no MESMO lugar não cria desfazer', () => {
    const t = montar(comPeca())
    t.arrastar({ col: 1, row: 1 }, { col: 1, row: 1 })
    t.arrastar({ col: 1, row: 1 }, { col: 1, row: 1 })
    expect(t.selRef.current?.kind).toBe('floating')
    t.controller().stampPending()
    expect(t.store.getState().canUndo).toBe(false)
    expect(t.selfCommitRef.current).toBe(false)
  })
  it('camada trancada: o pedaço não é levantado e apagar não grava nada', () => {
    const base = comPeca()
    const trancado = updateMapLayer(base, tileLayerAt(base).id, { locked: true })
    const t = montar(trancado, true)
    t.arrastar({ col: 1, row: 1 }, { col: 1, row: 1 })
    expect(t.selRef.current?.kind).toBe('rect')
    t.arrastar({ col: 1, row: 1 }, { col: 2, row: 2 })
    expect(t.selRef.current?.kind).toBe('rect')
    t.controller().deleteMapSelection()
    expect(t.store.getState().canUndo).toBe(false)
    expect(t.store.getState().asset).toBe(trancado)
  })
  it('apagar o pedaço marcado limpa as casas com um desfazer; de novo, nada', () => {
    const t = montar(comPeca())
    t.arrastar({ col: 1, row: 1 }, { col: 1, row: 1 })
    t.controller().deleteMapSelection()
    expect(tileLayerAt(t.store.getState().asset as TilemapAsset).cells[5]).toBe(-1)
    expect(t.store.getState().canUndo).toBe(true)
  })
})

describe('níveis das ferramentas', () => {
  it('cada nível mostra mais ferramentas que o anterior', () => {
    for (const id of ['pencil', 'eraser', 'fill', 'select', 'object-point', 'object-rect'])
      expect(isToolInLevel('start', id)).toBe(true)
    for (const id of ['line', 'rect', 'picker', 'object-polygon', 'autoExpand']) {
      expect(isToolInLevel('start', id)).toBe(false)
      expect(isToolInLevel('create', id)).toBe(true)
    }
    expect(isToolInLevel('advanced', 'qualquer-uma')).toBe(true)
  })
  it('soma com a curadoria da aula e nunca a alarga', () => {
    const aula = ['pencil', 'line']
    expect(isMapToolAvailable('start', aula, 'pencil')).toBe(true)
    // A aula deixa, o nível não.
    expect(isMapToolAvailable('start', aula, 'line')).toBe(false)
    // O nível deixa, a aula não.
    expect(isMapToolAvailable('advanced', aula, 'fill')).toBe(false)
    expect(isMapToolAvailable('create', aula, 'line')).toBe(true)
    expect(isMapToolAvailable('advanced', undefined, 'fill')).toBe(true)
  })
  it('a letra do atalho só liga o que está na caixa', () => {
    expect(shortcutTool('line', 'tiles', 'start', undefined)).toBeNull()
    expect(shortcutTool('line', 'tiles', 'create', undefined)).toBe('line')
    expect(shortcutTool('line', 'tiles', 'advanced', ['pencil'])).toBeNull()
    // Ferramenta de objeto numa camada de peças não liga.
    expect(shortcutTool('object-point', 'tiles', 'advanced', undefined)).toBeNull()
    expect(shortcutTool('object-point', 'objects', 'start', undefined)).toBe('object-point')
  })
  it('os painéis de cada nível', () => {
    const start = mapFeaturesFor('start')
    expect(start.playtest).toBe(true)
    expect(
      Object.entries(start)
        .filter(([, on]) => on)
        .map(([key]) => key),
    ).toEqual(['playtest'])
    const create = mapFeaturesFor('create')
    expect(create.terrain && create.scatter && create.library && create.minimap).toBe(true)
    expect(create.transform && create.objectDetails && create.layerOrder).toBe(true)
    expect(create.animation || create.sets || create.layerAdvanced).toBe(false)
    expect(Object.values(mapFeaturesFor('advanced')).every(Boolean)).toBe(true)
  })
  it('o que o mapa já usa aparece em qualquer nível', () => {
    let m = mapa()
    expect(mapFeaturesInUse(m, [pecas()])).toEqual({})
    m = addMapGroup(m, 'Vila')
    m = addObjectLayer(m, 'Objetos')
    const objetos = m.layers.at(-1)!.id
    m = addMapObject(
      m,
      objetos,
      createMapObject({
        name: 'arvore',
        shape: 'art',
        art: { assetId: 'a' },
        width: 16,
        height: 16,
      }),
    )
    m = setCell(m, tileLayerAt(m).id, 0, 0, makeCell(1, CELL_FLIP_H))
    const ts: AnyTilesetAsset = {
      ...pecas(),
      animations: { '0': [{ tile: 0, duration: 100 }] },
      terrains: [{ id: 't', name: 'Grama', mode: 'edge', colors: ['#0f0'], tiles: {} }],
    }
    const used = mapFeaturesInUse(m, [ts])
    expect(used).toEqual({
      layerAdvanced: true,
      library: true,
      transform: true,
      animation: true,
      terrain: true,
    })
    // Um objeto com tipo ou propriedades liga os detalhes do objeto.
    const comTipo = addMapObject(m, objetos, createMapObject({ name: 'porta', type: 'porta' }))
    expect(mapFeaturesInUse(comTipo, [ts]).objectDetails).toBe(true)
    const features = mapFeaturesFor('start', used)
    expect(features.layerAdvanced && features.library && features.animation).toBe(true)
    expect(features.sets).toBe(false)
    expect(features.minimap).toBe(false)
  })
  it('o nível fica guardado por perfil; sem nada guardado é "Começar"', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    }
    expect(readMapLevel('ana', storage)).toBe('start')
    writeMapLevel('ana', 'create', storage)
    expect(readMapLevel('ana', storage)).toBe('create')
    // Outro perfil no mesmo aparelho não herda a escolha.
    expect(readMapLevel('bia', storage)).toBe('start')
    expect(readMapLevel('', storage)).toBe('start')
    data.set('pinta:map-level', 'lixo')
    expect(readMapLevel('', storage)).toBe('start')
    // Guardar sem espaço ou sem permissão não quebra nada.
    const quebrado = {
      getItem: () => {
        throw new Error('sem acesso')
      },
      setItem: () => {
        throw new Error('cheio')
      },
    }
    expect(readMapLevel('ana', quebrado)).toBe('start')
    expect(() => writeMapLevel('ana', 'advanced', quebrado)).not.toThrow()
    expect(readMapLevel('ana', null)).toBe('start')
  })
})

describe('minimapa', () => {
  it('as cores de um conjunto de peças são calculadas uma vez e reusadas', () => {
    const ts = pecas(3)
    const cores = tilesetMinimapColors(ts)
    expect(cores).toHaveLength(3)
    expect(tilesetMinimapColors(ts)).toBe(cores)
    // Outro objeto (peça redesenhada) = conta nova.
    expect(tilesetMinimapColors({ ...ts })).not.toBe(cores)
    const m = setCell(mapa(), 'nada', 0, 0, 0)
    expect(cachedMinimapColors(m, [ts])).toHaveLength(16)
  })
  it('o retângulo do que aparece na tela, em frações do mapa', () => {
    const stage = { scrollLeft: 320, scrollTop: 0, clientWidth: 320, clientHeight: 160 }
    // Casa de 32 px, mapa de 40 × 20 casas, sem anel.
    expect(minimapViewRect(stage, 32, 0, 40, 20)).toEqual({
      left: 0.25,
      top: 0,
      width: 0.25,
      height: 0.25,
    })
    // Com o anel de crescer, a conta desconta uma casa.
    expect(minimapViewRect(stage, 32, 1, 40, 20)?.left).toBeCloseTo(0.225, 5)
    // O mapa inteiro cabe na tela, ou o palco ainda não tem tamanho: não há retângulo.
    expect(
      minimapViewRect(
        { ...stage, scrollLeft: 0, clientWidth: 2000, clientHeight: 2000 },
        32,
        0,
        40,
        20,
      ),
    ).toBeNull()
    expect(minimapViewRect({ ...stage, clientWidth: 0 }, 32, 0, 40, 20)).toBeNull()
  })
})

describe('relógio das peças animadas', () => {
  it('a chave só muda quando algum quadro troca', () => {
    const ts: AnyTilesetAsset = {
      ...pecas(),
      animations: {
        '0': [
          { tile: 0, duration: 100 },
          { tile: 1, duration: 100 },
        ],
      },
    }
    expect(animationFrameKey([ts], 0)).toBe(animationFrameKey([ts], 99))
    expect(animationFrameKey([ts], 100)).not.toBe(animationFrameKey([ts], 99))
    expect(animationFrameKey([ts], 200)).toBe(animationFrameKey([ts], 0))
    expect(animationFrameKey([pecas()], 500)).toBe('')
  })
})
