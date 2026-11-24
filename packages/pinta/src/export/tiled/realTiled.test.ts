/**
 * Mapas escritos à mão no formato que o Tiled 1.10 grava (ver `__fixtures__/tiled-real`): folha
 * embutida e externa, JSON e XML, lista, CSV e base64 com zlib. Os quatro descrevem o mesmo
 * mapa, então a cena esperada é uma só, conferida inteira.
 */
import { expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../../tiles/cell'
import { importTiledScene, tiledXmlToJson } from './import'

const pasta = resolve(import.meta.dirname, '__fixtures__/tiled-real')
const lidos: string[] = []
const resolver = {
  text: async (path: string) => {
    lidos.push(path)
    // No disco a folha XML se chama `.tsx.xml` (ver o LEIA-ME da pasta).
    return readFile(resolve(pasta, path.endsWith('.tsx') ? `${path}.xml` : path), 'utf8')
  },
  image: async (path: string) => {
    lidos.push(path)
    return `data:image/png;base64,${(await readFile(resolve(pasta, path))).toString('base64')}`
  },
}
const png = `data:image/png;base64,${(await readFile(resolve(pasta, 'terreno.png'))).toString('base64')}`

const esperada: PintaScene = {
  version: 1,
  id: 'tiled-map',
  name: 'fazendinha',
  cols: 4,
  rows: 3,
  tileSize: 16,
  tilesets: [
    {
      id: 'tiles-0',
      name: 'terreno',
      image: png,
      columns: 4,
      count: 8,
      solid: [1],
      platform: [],
      animations: {
        '2': [
          { tile: 2, duration: 200 },
          { tile: 3, duration: 200 },
        ],
      },
      tileProperties: { '5': { nome: 'trigo' } },
      terrains: [
        {
          id: 'tiles-0-terrain-0',
          name: 'Terreno',
          mode: 'corner',
          colors: ['#ff0000'],
          tiles: { '0': [0, 1, 0, 1, 0, 1, 0, 1] },
        },
      ],
    },
  ],
  layers: [
    {
      id: 'layer-1',
      name: 'Chão',
      visible: true,
      kind: 'tiles',
      tilesetId: 'tiles-0',
      cells: [0, 0, 1, 0, 4, 2, 2, 5, 0, 0, 0, 0],
    },
    {
      id: 'layer-2',
      name: 'Enfeites',
      visible: true,
      opacity: 0.5,
      offsetX: 4,
      offsetY: -2,
      kind: 'group',
    },
    {
      id: 'layer-3',
      name: 'Flores',
      visible: true,
      parentId: 'layer-2',
      parallaxX: 0.5,
      kind: 'tiles',
      tilesetId: 'tiles-0',
      cells: [
        -1,
        -1,
        -1,
        -1,
        -1,
        6,
        makeCell(6, CELL_FLIP_H),
        -1,
        makeCell(6, CELL_FLIP_V),
        -1,
        -1,
        makeCell(7, CELL_FLIP_D | CELL_FLIP_H),
      ],
    },
    {
      id: 'layer-4',
      name: 'Coisas',
      visible: true,
      kind: 'objects',
      objects: [
        {
          id: 'object-1',
          name: 'porta',
          type: 'passagem',
          x: 16,
          y: 0,
          width: 16,
          height: 16,
          properties: {
            aberta: false,
            chave: { type: 'int', value: 3 },
            cor: { type: 'color', value: '#112233' },
            dono: { type: 'object', value: 'object-2' },
            peso: { type: 'float', value: 1.5 },
            senha: '1234',
          },
        },
        {
          id: 'object-2',
          name: 'início',
          type: '',
          x: 8,
          y: 8,
          width: 0,
          height: 0,
          properties: {},
          shape: 'point',
        },
        {
          id: 'object-3',
          name: 'lago',
          type: '',
          x: 30,
          y: 20,
          width: 20,
          height: 10,
          properties: {},
          shape: 'ellipse',
        },
        {
          id: 'object-4',
          name: 'cerca',
          type: '',
          x: 40,
          y: 30,
          width: 0,
          height: 0,
          properties: {},
          rotation: 15,
          shape: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 16, y: 0 },
            { x: 8, y: 12 },
          ],
        },
        {
          id: 'object-5',
          name: 'placa',
          type: '',
          x: 48,
          y: 32,
          width: 16,
          height: 16,
          properties: {},
          shape: 'art',
          art: { assetId: 'tiles-0', tile: 5 },
          flipX: true,
        },
        {
          id: 'object-6',
          name: 'trilha',
          type: '',
          x: 4,
          y: 40,
          width: 0,
          height: 0,
          properties: {},
          shape: 'polyline',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 4 },
            { x: 20, y: 0 },
          ],
        },
      ],
    },
  ],
}
const avisos = [
  'Os nomes das cores dos terrenos de terreno não foram trazidos.',
  'A camada Coisas desenhava os objetos de cima para baixo; no Pinta eles ficam na ordem da lista.',
]

for (const [arquivo, dependencias] of [
  ['fazendinha.tmj', ['terreno.png']],
  ['fazendinha-externo.tmj', ['terreno.tsj', 'terreno.png']],
  ['fazendinha.tmx', ['terreno.png']],
  ['fazendinha-externo.tmx', ['terreno.tsx', 'terreno.png']],
] as const)
  it(`${arquivo} vira exatamente a cena esperada`, async () => {
    lidos.length = 0
    const texto = await readFile(resolve(pasta, arquivo), 'utf8')
    // Um arquivo no formato do Tiled de verdade carrega estes campos.
    for (const campo of ['tiledversion', 'nextlayerid', 'nextobjectid', 'infinite', 'renderorder'])
      expect(texto).toContain(campo)
    const { scene, warnings } = await importTiledScene(
      arquivo.endsWith('.tmx') ? tiledXmlToJson(texto) : JSON.parse(texto),
      resolver,
      'fazendinha',
    )
    expect(scene).toStrictEqual(esperada)
    expect(warnings).toEqual(avisos)
    expect(lidos).toEqual([...dependencias])
  })
