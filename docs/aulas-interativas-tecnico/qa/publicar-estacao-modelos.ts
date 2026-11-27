/**
 * Publica as peças da Estação de Reciclagem (a missão do Construtor) na biblioteca de modelos dos
 * cursos: coletores, recicláveis, proibidos e galpões.
 *
 *   ESTACAO_OUT=<pasta dos .glb> bun docs/aulas-interativas-tecnico/qa/publicar-estacao-modelos.ts [--remover-antigos]
 *   ESTACAO_OUT=<pasta> bun …/publicar-estacao-modelos.ts --so galpao-noite
 *
 * O mesmo caminho das peças espaciais (`publicar-construtor-modelos.ts`): otimiza cada GLB de
 * `docs/design/construtor-estacao-blender` (gerado com `build_all.py`), grava o módulo da
 * biblioteca e anota em `modelos.json` o sha, a categoria, a caixa e o tamanho que o bloco usa.
 * O gerador da missão lê só o `modelos.json` e o módulo: o Blender não precisa estar instalado.
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

const BLENDER_DIR = resolve(import.meta.dirname, '../../design/construtor-estacao-blender')
export const MODELOS_ESTACAO_JSON = resolve(BLENDER_DIR, 'modelos.json')

/** As peças por categoria, na ordem do `build_all.py` (a primeira de cada é a de partida). */
export const ESTACAO_CATEGORIAS = {
  coletor: [
    'coletor-carrinho-azul',
    'coletor-robo-laranja',
    'coletor-empilhadeira-amarela',
    'coletor-aspirador-lilas',
  ],
  reciclavel: [
    'reciclavel-garrafa-pet',
    'reciclavel-lata',
    'reciclavel-caixa-papelao',
    'reciclavel-pote-vidro',
  ],
  proibido: ['proibido-pilha', 'proibido-bateria', 'proibido-lampada', 'proibido-celular'],
  galpao: ['galpao-menta', 'galpao-tijolo', 'galpao-azul', 'galpao-noite'],
} as const
export type EstacaoCategoria = keyof typeof ESTACAO_CATEGORIAS
export type EstacaoPeca = (typeof ESTACAO_CATEGORIAS)[EstacaoCategoria][number]
export const ESTACAO_PECAS = Object.values(ESTACAO_CATEGORIAS).flat() as EstacaoPeca[]

/** O lado maior da caixa de cada categoria no GLB (`lib_estacao.CAIXAS`). */
export const ESTACAO_CAIXA: Record<EstacaoCategoria, number> = {
  coletor: 3,
  reciclavel: 1.5,
  proibido: 1.5,
  galpao: 100,
}

/**
 * O `tamanho` do bloco "Criar o objeto … com o modelo …" no jogo da missão. As peças entram um
 * pouco maiores que a caixa (1,8, o mesmo dos asteroides da Patrulha): na esteira de 2,7 elas
 * ficam fáceis de ver de longe.
 */
export const ESTACAO_TAMANHO: Record<EstacaoCategoria, number> = {
  coletor: 3,
  reciclavel: 1.8,
  proibido: 1.8,
  galpao: 100,
}

export interface EstacaoModelo {
  sha: string
  bytes: number
  categoria: EstacaoCategoria
  /** Centro da caixa, no y para cima do jogo (o motor centraliza a caixa no objeto). */
  center: [number, number, number]
  /** O lado maior da caixa do GLB. */
  size: number
}

export function categoriaDaEstacao(peca: string): EstacaoCategoria {
  for (const [categoria, pecas] of Object.entries(ESTACAO_CATEGORIAS))
    if ((pecas as readonly string[]).includes(peca)) return categoria as EstacaoCategoria
  throw new Error(`Peça da Estação desconhecida: ${peca}`)
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
  const pasta = process.env.ESTACAO_OUT ?? resolve(BLENDER_DIR, 'out')
  const anteriores: Record<string, EstacaoModelo> = existsSync(MODELOS_ESTACAO_JSON)
    ? JSON.parse(readFileSync(MODELOS_ESTACAO_JSON, 'utf8'))
    : {}
  const modelos: Record<string, EstacaoModelo> = {}
  const so = process.argv.includes('--so')
    ? new Set(process.argv[process.argv.indexOf('--so') + 1]?.split(',') ?? [])
    : null
  for (const id of so ?? []) categoriaDaEstacao(id)
  let total = 0
  for (const id of ESTACAO_PECAS) {
    if (so && !so.has(id)) {
      if (!anteriores[id]) throw Error(`${id} não está no modelos.json`)
      modelos[id] = anteriores[id]
      continue
    }
    const categoria = categoriaDaEstacao(id)
    const r = await otimizar(readFileSync(resolve(pasta, `${id}.glb`)))
    // a quantização arredonda a caixa em ~0,01% do lado
    if (Math.abs(r.size - ESTACAO_CAIXA[categoria]) > ESTACAO_CAIXA[categoria] * 0.002)
      throw Error(`${id}: caixa de ${r.size}, esperado ${ESTACAO_CAIXA[categoria]}`)
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
  writeFileSync(MODELOS_ESTACAO_JSON, formatarJson(modelos))
  writeCourseModelRegistry()
  console.log(`TOTAL ${(total / 1024) | 0} KB em ${ESTACAO_PECAS.length} modelos`)
}
