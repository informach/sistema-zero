import { expect, test } from 'bun:test'
import { createEmptyProject, type ProjectAsset, sanitizeProjectAssets } from '#core'
import { assertProjectContentPreserved } from '../core/projectDocument'
import { createProjectStore } from './projectStore'

/**
 * O orçamento total conta a cena do Pinta NOS DOIS LADOS. Antes a escrita somava só a imagem e
 * a leitura somava a cena também: um projeto quase cheio aceitava o cenário e, ao reabrir,
 * perdia o desenho inteiro, sem aviso.
 */
const PNG = 'data:image/png;base64,AAAA'
/** No teto de um material (800 mil); a mesma string em todos, para a memória não pagar 33M. */
const ENORME = `data:image/png;base64,${'C'.repeat(800_000 - 22)}`
const cena = (folha: string) => ({
  version: 1 as const,
  id: 'vila',
  name: 'vila',
  tileSize: 16,
  cols: 1,
  rows: 1,
  tilesets: [{ id: 'ts', name: 'ts', image: folha, columns: 1, count: 1, solid: [], platform: [] }],
  layers: [
    { id: 't', kind: 'tiles' as const, name: 'Chão', visible: true, tilesetId: 'ts', cells: [0] },
  ],
})
/** 41 × 800 mil = 32,8 milhões: sobram 200 mil até o teto de 33 milhões. */
const quaseCheio = (): ProjectAsset[] =>
  Array.from({ length: 41 }, (_, i) => ({
    id: `f${i}`,
    name: `fundo-${i}`,
    kind: 'image' as const,
    source: 'upload' as const,
    dataUrl: ENORME,
  }))
const GRANDE = cena(`data:image/png;base64,${'D'.repeat(300_000)}`)

test('cena 2 atualiza arte e animação sem reescrever o programa; um leitor que corte a cena é recusado', () => {
  const makeScene = (id: string) => ({
    ...cena(PNG),
    version: 2 as const,
    art: [
      {
        id,
        image: PNG,
        width: 16,
        height: 16,
        sprite: {
          frameWidth: 16,
          frameHeight: 16,
          columns: 1,
          animations: [
            { id: 'wind', name: 'Vento', loop: true, frames: [{ tile: 0, duration: 100 }] },
          ],
        },
      },
    ],
    resources: [{ id, sourceId: 'original-tree', capturedAt: 100 }],
    layers: [
      ...cena(PNG).layers,
      {
        id: 'objects',
        kind: 'objects' as const,
        name: 'Árvores',
        visible: true,
        objects: [
          {
            id: 'tree',
            name: 'Árvore',
            type: '',
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            properties: {},
            art: { assetId: id, animationId: 'wind' },
          },
        ],
      },
    ],
  })
  const store = createProjectStore(),
    base = createEmptyProject('continuar', 'Meu jogo')
  base.files['script.js'] = 'let pontos = 17;\n'
  store.getState().hydrateProject({ ...base, mode: 'bridge', bridgeCodeAhead: true })
  expect(
    store.getState().addAsset({ name: 'vila', dataUrl: PNG, scene: makeScene('tree-v1') }),
  ).toBeNull()
  const before = store.getState().project!,
    asset = before.assets![0]!,
    next = makeScene('tree-v2')
  expect(store.getState().updateAssetImage(asset.id, { dataUrl: PNG, scene: next })).toBeNull()
  const after = store.getState().project!
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  expect(sanitizeProjectAssets(after.assets)[0]?.scene).toEqual(next)
  const { scene: _dropped, ...legacy } = after.assets![0]!
  expect(() =>
    assertProjectContentPreserved({ assets: after.assets }, { assets: [legacy] }),
  ).toThrow('Nenhuma cópia foi gravada')
})

function aberto(extra: ProjectAsset[] = []) {
  const store = createProjectStore()
  store.getState().hydrateProject({
    ...createEmptyProject('cheio', 'Jogo cheio'),
    assets: [...quaseCheio(), ...extra],
  })
  return store
}

test('entrada: cenário que não cabe é recusado na hora, e o que entra continua lá ao reabrir', () => {
  const store = aberto()
  expect(store.getState().addAsset({ name: 'vila', dataUrl: PNG, scene: GRANDE })).toBe(
    'Os assets do projeto excedem o tamanho total permitido.',
  )
  expect(store.getState().project?.assets).toHaveLength(41)
  // Um cenário pequeno cabe, e a leitura devolve o mesmo que a escrita aceitou.
  expect(store.getState().addAsset({ name: 'vila', dataUrl: PNG, scene: cena(PNG) })).toBeNull()
  const relidos = sanitizeProjectAssets(store.getState().project?.assets)
  expect(relidos).toHaveLength(42)
  expect(relidos[41]?.scene).toEqual(cena(PNG))
})

test('atualização: o cenário que cresceu é recusado e o material de antes fica inteiro', () => {
  const vila: ProjectAsset = {
    id: 'vila',
    name: 'vila',
    kind: 'image',
    source: 'library',
    libId: 'personal:d1',
    dataUrl: PNG,
    scene: cena(PNG),
  }
  const store = aberto([vila])
  expect(store.getState().updateAssetImage('vila', { dataUrl: PNG, scene: GRANDE })).toBe(
    'O cenário do desenho "vila" não cabe neste jogo.',
  )
  expect(store.getState().project?.assets?.[41]).toEqual(vila)
})

test('leitura de projeto gravado antes da correção: sai só a cena, a imagem fica', () => {
  const warnings: string[] = []
  const relidos = sanitizeProjectAssets(
    [
      ...quaseCheio(),
      { id: 'vila', name: 'vila', kind: 'image', source: 'library', dataUrl: PNG, scene: GRANDE },
    ],
    { warnings },
  )
  expect(relidos).toHaveLength(42)
  expect(relidos[41]?.dataUrl).toBe(PNG)
  expect(relidos[41]?.scene).toBeUndefined()
  expect(warnings).toHaveLength(1)
})
