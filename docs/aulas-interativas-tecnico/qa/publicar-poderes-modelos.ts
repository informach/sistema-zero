/**
 * Publica as peças dos Poderes do Construtor na biblioteca de modelos dos cursos: os itens que caem
 * (escudo, tiro triplo e plasma), as naves inimigas e os tiros delas, os chefões e os tiros de
 * plasma. Quatro variações por categoria, com a mesma caixa.
 *
 *   PODERES_OUT=<pasta dos .glb> bun docs/aulas-interativas-tecnico/qa/publicar-poderes-modelos.ts [--remover-antigos]
 *   PODERES_OUT=<pasta> bun …/publicar-poderes-modelos.ts --so chefao-fortaleza
 *
 * O mesmo caminho da Estação (`publicar-estacao-modelos.ts`): otimiza cada GLB de
 * `docs/design/construtor-poderes-blender` (gerado com `build_all.py`), grava o módulo da
 * biblioteca e anota em `modelos.json` o sha, a categoria, a caixa e o tamanho. Os geradores dos
 * Poderes leem só o `modelos.json` e o módulo: o Blender não precisa estar instalado.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getBounds, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, weld } from '@gltf-transform/functions'
import {
  COURSE_MODELS_DIR,
  publishCourseModel,
  writeCourseModelRegistry,
} from '../../../packages/studio/scripts/course-models'
import { formatarJson } from './formatar-json'

const BLENDER_DIR = resolve(import.meta.dirname, '../../design/construtor-poderes-blender')
export const MODELOS_PODERES_JSON = resolve(BLENDER_DIR, 'modelos.json')
export const ARTE2D_PODERES_DIR = resolve(BLENDER_DIR, 'arte2d')

const FORMAS = ['redondo', 'hexagono', 'losango', 'octogono'] as const
const itens = <P extends string>(poder: P) =>
  FORMAS.map((forma) => `item-${poder}-${forma}` as const)

/** As peças por categoria, na ordem do `build_all.py` (a primeira de cada é a de partida). */
export const PODERES_CATEGORIAS = {
  'item-escudo': itens('escudo'),
  'item-triplo': itens('triplo'),
  'item-plasma': itens('plasma'),
  inimiga: [
    'inimiga-garra-vermelha',
    'inimiga-disco-roxo',
    'inimiga-vespa-amarela',
    'inimiga-tridente-cinza',
  ],
  'laser-inimigo': [
    'laser-inimigo-vermelho',
    'laser-inimigo-laranja',
    'laser-inimigo-rosa',
    'laser-inimigo-amarelo',
  ],
  chefao: ['chefao-cruzador', 'chefao-disco-mae', 'chefao-escorpiao', 'chefao-fortaleza'],
  plasma: ['plasma-roxo', 'plasma-verde', 'plasma-laranja', 'plasma-azul'],
} as const
export type PoderesCategoria = keyof typeof PODERES_CATEGORIAS
export type PoderesPeca = (typeof PODERES_CATEGORIAS)[PoderesCategoria][number]
export const PODERES_PECAS = Object.values(PODERES_CATEGORIAS).flat() as PoderesPeca[]

/** O lado maior da caixa de cada categoria no GLB (`lib_poderes.CAIXAS`). */
export const PODERES_CAIXA: Record<PoderesCategoria, number> = {
  'item-escudo': 1.2,
  'item-triplo': 1.2,
  'item-plasma': 1.2,
  inimiga: 3,
  'laser-inimigo': 0.9,
  chefao: 6,
  plasma: 0.8,
}

/**
 * O `tamanho` do bloco "Criar o objeto … com o modelo …" na Patrulha dos Poderes. Os itens entram
 * maiores que a caixa (1,6, perto dos asteroides de 1,8): de longe a criança precisa ver o símbolo.
 */
export const PODERES_TAMANHO: Record<PoderesCategoria, number> = {
  'item-escudo': 1.6,
  'item-triplo': 1.6,
  'item-plasma': 1.6,
  inimiga: 3,
  'laser-inimigo': 0.9,
  chefao: 6,
  plasma: 0.8,
}

/** O tamanho de desenho de cada categoria no jogo 2D (o do `svg2d.py`). */
export const PODERES_SPRITE: Record<PoderesCategoria, { w: number; h: number }> = {
  'item-escudo': { w: 44, h: 44 },
  'item-triplo': { w: 44, h: 44 },
  'item-plasma': { w: 44, h: 44 },
  inimiga: { w: 56, h: 52 },
  'laser-inimigo': { w: 10, h: 26 },
  chefao: { w: 200, h: 130 },
  plasma: { w: 24, h: 32 },
}

export interface PoderesModelo {
  sha: string
  bytes: number
  categoria: PoderesCategoria
  /** Centro da caixa, no y para cima do jogo (o motor centraliza a caixa no objeto). */
  center: [number, number, number]
  /** O lado maior da caixa do GLB. */
  size: number
}

export function categoriaDosPoderes(peca: string): PoderesCategoria {
  for (const [categoria, pecas] of Object.entries(PODERES_CATEGORIAS))
    if ((pecas as readonly string[]).includes(peca)) return categoria as PoderesCategoria
  throw new Error(`Peça dos Poderes desconhecida: ${peca}`)
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))

async function otimizar(bytes: Uint8Array) {
  const doc = await io.readBinary(bytes)
  await doc.transform(
    weld({ overwrite: true }),
    dedup(),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8 }),
    weld({ overwrite: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8 }),
    prune(),
  )
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const { min, max } = getBounds(scene!)
  return {
    bytes: await io.writeBinary(doc),
    center: min.map((v, i) => +((v + max[i]!) / 2).toFixed(4)) as [number, number, number],
    size: +Math.max(...max.map((v, i) => v - min[i]!)).toFixed(4),
  }
}

if (import.meta.main) {
  const pasta = process.env.PODERES_OUT ?? resolve(BLENDER_DIR, 'out')
  const anteriores: Record<string, PoderesModelo> = existsSync(MODELOS_PODERES_JSON)
    ? JSON.parse(readFileSync(MODELOS_PODERES_JSON, 'utf8'))
    : {}
  const modelos: Record<string, PoderesModelo> = {}
  const so = process.argv.includes('--so')
    ? new Set(process.argv[process.argv.indexOf('--so') + 1]?.split(',') ?? [])
    : null
  for (const id of so ?? []) categoriaDosPoderes(id)
  let total = 0
  for (const id of PODERES_PECAS) {
    if (so && !so.has(id)) {
      if (!anteriores[id]) throw Error(`${id} não está no modelos.json`)
      modelos[id] = anteriores[id]
      continue
    }
    const categoria = categoriaDosPoderes(id)
    const r = await otimizar(readFileSync(resolve(pasta, `${id}.glb`)))
    // a quantização arredonda a caixa em ~0,01% do lado
    if (Math.abs(r.size - PODERES_CAIXA[categoria]) > PODERES_CAIXA[categoria] * 0.002)
      throw Error(`${id}: caixa de ${r.size}, esperado ${PODERES_CAIXA[categoria]}`)
    const sha = publishCourseModel(r.bytes)
    modelos[id] = { sha, bytes: r.bytes.length, categoria, center: r.center, size: r.size }
    total += r.bytes.length
    console.log(id.padEnd(30), `${(r.bytes.length / 1024) | 0} KB`)
  }
  // ⚠️ Depois que o curso sair, um modelo substituído CONTINUA na biblioteca (o projeto salvo de
  // uma criança aponta para o sha antigo). `--remover-antigos` só antes do lançamento.
  if (process.argv.includes('--remover-antigos')) {
    const vivos = new Set(Object.values(modelos).map((m) => m.sha))
    for (const m of Object.values(anteriores))
      if (!vivos.has(m.sha))
        rmSync(resolve(COURSE_MODELS_DIR, `m-${m.sha}.generated.ts`), { force: true })
  }
  writeFileSync(MODELOS_PODERES_JSON, formatarJson(modelos))
  writeCourseModelRegistry()
  console.log(`TOTAL ${(total / 1024) | 0} KB em ${PODERES_PECAS.length} modelos`)
}
