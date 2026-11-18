/**
 * O ciclo de "A Vila e a Floresta" que dá para percorrer SEM navegador: criar a referência,
 * passar pelo portão do documento, guardar e restaurar o arquivo, virar cena, ir ao Tiled e
 * voltar, e chegar ao Estúdio. O que precisa de tela (pintar com o ponteiro, andar com as setas,
 * rodar o jogo no Estúdio, abrir o Phaser) NÃO está aqui: ver `docs/pinta-cenarios/homologacao.md`.
 */
import { describe, expect, it } from 'bun:test'
import { resolve } from 'node:path'
import {
  PINTA_SCENE_MAX_CHARS,
  type PintaScene,
  PintaSceneSchema,
} from '@sistemazero/core/studio/pinta-scene'
import {
  sceneLayerState,
  sceneObjects,
  sceneSolidAt,
  sceneSpawn,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { sanitizePintaAsset, tilemapNeedsV3 } from '../core/project'
import { cellFlags, cellTile } from '../tiles/cell'
import { galleryToPintaJson, importPintaJson } from './projectJson'
import { exportPintaScene } from './scene'
import { buildScenePackage } from './scenePackage'
import { tiledMap, tiledMapXml, tiledTilesetXml } from './tiled/export'
import { importTiledScene, tiledXmlToJson } from './tiled/import'

const { map, cabana, assets } = vilaEFloresta()
const find = (id: string) => assets.find((a) => a.id === id) ?? null
const cena = await exportPintaScene(map, find, nativeImageOf)
const cenaDaCabana = await exportPintaScene(cabana, find, nativeImageOf)
const objetos = sceneObjects(cena)

describe('ciclo da Vila e a Floresta, sem navegador', () => {
  it('passo 1, criar: a referência é a descrita e todo desenho passa no portão do documento', () => {
    expect([map.cols, map.rows, map.layers.length]).toEqual([32, 24, 18])
    expect(map.layers.filter((l) => l.kind === 'group').length).toBe(1)
    expect(assets.map((a): string => a.kind).sort()).toEqual([
      'map-set',
      'pixel-sprite',
      'tilemap',
      'tilemap',
      'tileset',
      'tileset',
    ])
    for (const asset of assets) {
      const aceito = sanitizePintaAsset(structuredClone(asset))
      expect(aceito).toMatchObject({ id: asset.id, kind: asset.kind, name: asset.name })
      // O que o portão devolve já está na forma final: passar de novo não muda nada.
      expect(sanitizePintaAsset(structuredClone(aceito))).toEqual(aceito)
    }
    // A referência é fixa: gerar duas vezes dá os mesmos dados.
    expect(galleryToPintaJson(vilaEFloresta().assets)).toBe(galleryToPintaJson(assets))
  })
  it('passo 2, camadas: o grupo passa visibilidade, opacidade, deslocamento e parallax aos filhos', () => {
    const grupo = cena.layers.find((l) => l.kind === 'group')
    const filhos = cena.layers.filter((l) => l.parentId === grupo?.id)
    expect(filhos.length).toBeGreaterThan(0)
    for (const filho of filhos) {
      const efetiva = sceneLayerState(cena.layers, filho)
      expect(efetiva.opacity).toBeCloseTo((filho.opacity ?? 1) * (grupo?.opacity ?? 1), 9)
      expect(efetiva.offsetX).toBe((filho.offsetX ?? 0) + (grupo?.offsetX ?? 0))
      expect(efetiva.visible).toBe(filho.visible && grupo?.visible === true)
    }
    const usados = new Set(
      cena.layers.flatMap((l) => Object.keys(l).filter((k) => !['id', 'name', 'kind'].includes(k))),
    )
    for (const campo of ['opacity', 'offsetX', 'parallaxX', 'front', 'parentId'])
      expect([...usados]).toContain(campo)
  })
  it('passo 3, peças viradas: a cena guarda espelho e giro dentro da célula', () => {
    const celulas = cena.layers.flatMap((l) => (l.kind === 'tiles' ? l.cells : []))
    expect(celulas.some((c) => c >= 0 && cellFlags(c) !== 0)).toBe(true)
    for (const camada of cena.layers)
      if (camada.kind === 'tiles') {
        const folha = cena.tilesets.find((t) => t.id === camada.tilesetId)
        expect(camada.cells.length).toBe(cena.cols * cena.rows)
        expect(camada.cells.every((c) => c < 0 || cellTile(c) < (folha?.count ?? 0))).toBe(true)
      }
  })
  it('passo 4, terreno e animação: o terreno e a peça animada chegam inteiros à cena', () => {
    const terrenos = cena.tilesets.flatMap((t) => t.terrains ?? [])
    expect(terrenos.map((t) => t.id)).toEqual(['grama'])
    expect(Object.keys(terrenos[0]?.tiles ?? {}).length).toBeGreaterThan(0)
    const animadas = cena.tilesets.flatMap((t) =>
      Object.entries(t.animations ?? {}).map(([peca, quadros]) => ({ folha: t, peca, quadros })),
    )
    expect(animadas.length).toBeGreaterThan(0)
    for (const { folha, peca, quadros } of animadas) {
      expect(quadros.length).toBeGreaterThan(1)
      expect(quadros.every((q) => q.tile < folha.count && q.duration >= 16)).toBe(true)
      // A peça animada está de fato pintada no mapa.
      expect(
        cena.layers.some(
          (l) =>
            l.kind === 'tiles' &&
            l.tilesetId === folha.id &&
            l.cells.some((c) => c >= 0 && cellTile(c) === Number(peca)),
        ),
      ).toBe(true)
    }
  })
  it('passo 5, objetos e conjunto: formas, papéis, propriedades tipadas e a instância do conjunto', () => {
    const diretos = cena.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))
    expect(diretos.map((o): string => o.shape ?? '').sort()).toEqual([
      'art',
      'ellipse',
      'point',
      'polyline',
      'rect',
      'set',
    ])
    const instancia = diretos.find((o) => o.setId)
    const conjunto = cena.sets?.find((s) => s.id === instancia?.setId)
    expect(conjunto).toBeDefined()
    expect(conjunto?.layers.some((l) => l.kind === 'tiles')).toBe(true)
    // Cada folha usada dentro do conjunto veio na cena.
    for (const camada of conjunto?.layers ?? [])
      if (camada.kind === 'tiles')
        expect(cena.tilesets.some((t) => t.id === camada.tilesetId)).toBe(true)
    const arte = diretos.find((o) => o.shape === 'art')
    expect([...cena.tilesets, ...(cena.art ?? [])].some((a) => a.id === arte?.art?.assetId)).toBe(
      true,
    )
    expect(arte?.properties).toEqual({
      vida: { type: 'int', value: 5 },
      porta: { type: 'object', value: 'door' },
    })
    expect(diretos.some((o) => o.id === 'door')).toBe(true)
  })
  it('passo 6, guardar e restaurar em arquivo: o .pinta.json devolve os mesmos desenhos e a mesma cena', async () => {
    const restaurado = importPintaJson(galleryToPintaJson(assets))
    expect(restaurado.warnings).toEqual([])
    const mapaRestaurado = restaurado.assets.find(
      (a) => a.kind === 'tilemap' && a.name === map.name,
    )
    if (mapaRestaurado?.kind !== 'tilemap') throw new Error('o mapa não voltou do arquivo')
    const outraVez = await exportPintaScene(
      mapaRestaurado,
      (id) => restaurado.assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    // O restauro dá identificações novas aos desenhos; todo o resto da cena tem que ser igual.
    const semIds = (scene: PintaScene) => {
      const ids = new Map<string, string>()
      const nome = (id: string) => {
        if (!ids.has(id)) ids.set(id, `#${ids.size}`)
        return ids.get(id)!
      }
      for (const t of scene.tilesets) nome(t.id)
      for (const a of scene.art ?? []) nome(a.id)
      for (const s of scene.sets ?? []) nome(s.id)
      nome(scene.id)
      return JSON.parse(JSON.stringify(scene), (key, value) =>
        ['id', 'tilesetId', 'assetId', 'setId'].includes(key) && ids.has(value)
          ? ids.get(value)
          : value,
      )
    }
    expect(semIds(outraVez)).toEqual(semIds(cena))
  })
  it('passo 7, testar: o início é livre, existe parede, e as portas ligam a Vila e a Cabana nos dois sentidos', () => {
    const inicio = sceneSpawn(cena)
    expect(inicio).toEqual({ x: 32, y: 32 })
    expect(sceneSolidAt(cena, inicio.x, inicio.y)).toBe(false)
    expect(sceneSolidAt(cena, -1, 0)).toBe(true)
    let paredes = 0
    for (let y = 8; y < cena.rows * cena.tileSize; y += 16)
      for (let x = 8; x < cena.cols * cena.tileSize; x += 16)
        if (sceneSolidAt(cena, x, y)) paredes++
    expect(paredes).toBeGreaterThan(0)
    const destino = (scene: PintaScene) => {
      const porta = sceneObjects(scene).find((o) => o.role === 'door')
      const bruto = porta?.properties.destino
      const ref = typeof bruto === 'object' ? bruto.value : bruto
      return assets.find((a) => a.kind === 'tilemap' && (a.id === ref || a.name === ref))
    }
    expect(destino(cena)?.id).toBe(cabana.id)
    expect(destino(cenaDaCabana)?.id).toBe(map.id)
    expect(sceneSolidAt(cenaDaCabana, sceneSpawn(cenaDaCabana).x, sceneSpawn(cenaDaCabana).y)).toBe(
      false,
    )
  })
  it('passo 8, Estúdio: a cena do envio passa no esquema, cabe no orçamento e é a do exemplo publicado', async () => {
    // O mapa usa o formato novo, então o envio leva a cena completa (e não a grade antiga).
    expect(tilemapNeedsV3(map)).toBe(true)
    for (const scene of [cena, cenaDaCabana]) {
      expect(PintaSceneSchema.safeParse(scene).success).toBe(true)
      expect(JSON.stringify(scene).length).toBeLessThanOrEqual(PINTA_SCENE_MAX_CHARS)
    }
    expect(objetos.filter((o) => o.role === 'start').length).toBe(1)
    // O exemplo "A Vila e a Floresta" do Estúdio carrega exatamente estas duas cenas.
    const exemplo = (await import(
      resolve(import.meta.dirname, '../../../studio/src/examples/pintaScenes.generated.ts')
    )) as { VILA_SCENE_ASSETS: { id: string; name: string; scene: PintaScene }[] }
    expect(exemplo.VILA_SCENE_ASSETS.map((a) => a.name)).toEqual([map.name, cabana.name])
    expect(exemplo.VILA_SCENE_ASSETS[0]?.scene).toEqual(cena)
    expect(exemplo.VILA_SCENE_ASSETS[1]?.scene).toEqual(cenaDaCabana)
  })
  it('passo 10, levar para fora: Tiled em JSON e em TMX volta igual, e o pacote leva os dois mapas', async () => {
    for (const scene of [cena, cenaDaCabana]) {
      const json = tiledMap(scene),
        folhas = json.tilesets as Record<string, unknown>[]
      const resolver = {
        image: async (path: string) => {
          const [, tipo, n] = path.match(/(tiles|art)-(\d+)\.png$/) ?? []
          const item = tipo === 'tiles' ? scene.tilesets[Number(n)] : scene.art?.[Number(n)]
          if (!item) throw new Error(path)
          return item.image
        },
        text: async (path: string) =>
          tiledTilesetXml(folhas[Number(path.match(/tiles-(\d+)/)?.[1])]!),
      }
      for (const entrada of [
        JSON.parse(JSON.stringify(json)),
        tiledXmlToJson(tiledMapXml(json, true)),
      ]) {
        const volta = await importTiledScene(entrada, resolver)
        expect(volta.warnings).toEqual([])
        expect(volta.scene).toEqual(scene)
      }
    }
    const pacote = await buildScenePackage(map, assets, 'tiled', { imageOf: nativeImageOf })
    expect(Object.keys(JSON.parse(String(pacote['maps.json'])))).toEqual([map.name, cabana.name])
  })
})
