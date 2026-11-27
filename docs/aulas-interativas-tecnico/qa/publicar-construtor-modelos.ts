/**
 * Publica as peças espaciais do Construtor (naves, asteroides, lasers e cenários) na biblioteca de
 * modelos dos cursos.
 *
 *   ESPACO_OUT=<pasta dos .glb> bun docs/aulas-interativas-tecnico/qa/publicar-construtor-modelos.ts [--remover-antigos]
 *   ESPACO_OUT=<pasta> bun …/publicar-construtor-modelos.ts --so nave-arraia-lilas
 *
 * Para cada peça de `docs/design/construtor-espaco-blender` (gerada com `build_all.py`): otimiza o
 * GLB como a Ilha do Farol (solda, deduplica, quantiza), grava o módulo da biblioteca
 * (`packages/studio/src/core/course-models/`) e anota em `modelos.json` o sha, a categoria, o tamanho
 * no bloco e a caixa. O gerador da Patrulha Espacial lê só o `modelos.json` e o módulo: o Blender não
 * precisa estar instalado para gerar as aulas.
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

const BLENDER_DIR = resolve(import.meta.dirname, '../../design/construtor-espaco-blender')
export const MODELOS_ESPACO_JSON = resolve(BLENDER_DIR, 'modelos.json')

/** As peças por categoria, na ordem do `build_all.py` (a primeira de cada é a de partida). */
export const ESPACO_CATEGORIAS = {
  nave: ['nave-falcao-azul', 'nave-exploradora-coral', 'nave-arraia-lilas', 'nave-cometa-verde'],
  asteroide: [
    'asteroide-rocha-lunar',
    'asteroide-gelo-azul',
    'asteroide-cristal-violeta',
    'asteroide-lava-laranja',
  ],
  laser: ['laser-ciano', 'laser-dourado', 'laser-lilas', 'laser-verde'],
  cenario: ['cenario-orbita', 'cenario-aurora', 'cenario-nebulosa', 'cenario-estacao'],
} as const
export type EspacoCategoria = keyof typeof ESPACO_CATEGORIAS
export type EspacoPeca = (typeof ESPACO_CATEGORIAS)[EspacoCategoria][number]
export const ESPACO_PECAS = Object.values(ESPACO_CATEGORIAS).flat() as EspacoPeca[]

/** O `tamanho` do bloco "Criar o objeto … com o modelo …" (o lado maior da caixa da categoria). */
export const ESPACO_TAMANHO: Record<EspacoCategoria, number> = {
  nave: 3,
  asteroide: 1.8,
  laser: 0.9,
  cenario: 180,
}

export interface EspacoModelo {
  sha: string
  bytes: number
  categoria: EspacoCategoria
  /** Centro da caixa, no y para cima do jogo (o motor centraliza a caixa no objeto). */
  center: [number, number, number]
  /** O lado maior da caixa (= o tamanho do bloco da categoria). */
  size: number
}

export function categoriaDe(peca: string): EspacoCategoria {
  for (const [categoria, pecas] of Object.entries(ESPACO_CATEGORIAS))
    if ((pecas as readonly string[]).includes(peca)) return categoria as EspacoCategoria
  throw new Error(`Peça espacial desconhecida: ${peca}`)
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
  const pasta = process.env.ESPACO_OUT ?? resolve(BLENDER_DIR, 'out')
  const anteriores: Record<string, EspacoModelo> = existsSync(MODELOS_ESPACO_JSON)
    ? JSON.parse(readFileSync(MODELOS_ESPACO_JSON, 'utf8'))
    : {}
  const modelos: Record<string, EspacoModelo> = {}
  const so = process.argv.includes('--so')
    ? new Set(process.argv[process.argv.indexOf('--so') + 1]?.split(',') ?? [])
    : null
  for (const id of so ?? []) categoriaDe(id)
  let total = 0
  for (const id of ESPACO_PECAS) {
    if (so && !so.has(id)) {
      if (!anteriores[id]) throw Error(`${id} não está no modelos.json`)
      modelos[id] = anteriores[id]
      continue
    }
    const categoria = categoriaDe(id)
    const r = await otimizar(readFileSync(resolve(pasta, `${id}.glb`)))
    if (Math.abs(r.size - ESPACO_TAMANHO[categoria]) > 0.01)
      throw Error(`${id}: caixa de ${r.size}, esperado ${ESPACO_TAMANHO[categoria]}`)
    const sha = publishCourseModel(r.bytes)
    modelos[id] = { sha, bytes: r.bytes.length, categoria, center: r.center, size: r.size }
    total += r.bytes.length
    console.log(id.padEnd(28), `${(r.bytes.length / 1024) | 0} KB`)
  }
  // ⚠️ Depois que o curso sair, um modelo substituído CONTINUA na biblioteca (o projeto salvo de
  // uma criança aponta para o sha antigo). `--remover-antigos` só antes do lançamento.
  if (process.argv.includes('--remover-antigos')) {
    const vivos = new Set(Object.values(modelos).map((m) => m.sha))
    for (const m of Object.values(anteriores))
      if (!vivos.has(m.sha))
        rmSync(resolve(COURSE_MODELS_DIR, `m-${m.sha}.generated.ts`), { force: true })
  }
  writeFileSync(MODELOS_ESPACO_JSON, formatarJson(modelos))
  writeCourseModelRegistry()
  console.log(`TOTAL ${(total / 1024) | 0} KB em ${ESPACO_PECAS.length} modelos`)
}
