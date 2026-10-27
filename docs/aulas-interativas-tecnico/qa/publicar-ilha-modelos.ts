/**
 * Publica os modelos do Blender da Ilha do Farol na biblioteca de modelos dos cursos.
 *
 *   ILHA_OUT=<pasta dos .glb> bun docs/aulas-interativas-tecnico/qa/publicar-ilha-modelos.ts [--remover-antigos]
 *
 * Para cada peça de `docs/design/ilha-do-farol-blender` (gerada com `build_all.py`): otimiza o GLB
 * (solda, deduplica e quantiza, como a arte do Molda), grava o módulo da biblioteca
 * (`packages/studio/src/core/course-models/`) e anota em `modelos.json` o sha, os clipes e a caixa
 * (centro e lado maior, no y para cima do jogo). O gerador do curso lê só o `modelos.json` e o
 * módulo: o Blender não precisa estar instalado para gerar as aulas.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getBounds, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions'
import {
  COURSE_MODELS_DIR,
  publishCourseModel,
  writeCourseModelRegistry,
} from '../../../packages/studio/scripts/course-models'

const BLENDER_DIR = resolve(import.meta.dirname, '../../design/ilha-do-farol-blender')
export const MODELOS_JSON = resolve(BLENDER_DIR, 'modelos.json')

/** As peças do curso, na ordem do `build_all.py`. */
export const ILHA_PECAS = [
  'cenario-praia-tropical',
  'cenario-costa-rochosa',
  'cenario-ilha-nevada',
  'cenario-noite-na-ilha',
  'pedras',
  'farol-listrado',
  'farol-de-pedra',
  'farol-de-madeira',
  'farol-colorido',
  'veleiro',
  'barco-de-pesca',
  'lancha',
  'barco-pirata',
  'chave-dourada',
  'chave-prateada',
  'chave-de-estrela',
  'aventureiro',
  'menina-de-laco',
  'marinheira',
  'menino-de-bone',
  'exploradora-de-chapeu',
  'pirata',
  'mergulhador',
  'robo',
] as const
export type IlhaPeca = (typeof ILHA_PECAS)[number]

export interface IlhaModelo {
  sha: string
  bytes: number
  clips: string[]
  /** Centro da caixa de repouso, no y para cima do jogo. */
  center: [number, number, number]
  /** O lado maior da caixa (o `size` do `createModelFile` que mantém o tamanho do Blender). */
  size: number
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))

async function otimizar(bytes: Uint8Array) {
  const doc = await io.readBinary(bytes)
  await doc.transform(
    // As animações saem do Blender com uma chave por quadro: tira as que a interpolação refaz.
    resample(),
    weld({ overwrite: true }),
    dedup(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    // A quantização junta vértices que eram diferentes: solda e quantiza de novo para o
    // arquivo final ficar com atributos inteiros (o mesmo passo da arte do Molda).
    weld({ overwrite: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    prune(),
  )
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const { min, max } = getBounds(scene!)
  const clips = doc
    .getRoot()
    .listAnimations()
    .map((a) => a.getName())
  return {
    bytes: await io.writeBinary(doc),
    clips,
    center: min.map((v, i) => +((v + max[i]!) / 2).toFixed(4)) as [number, number, number],
    size: +Math.max(...max.map((v, i) => v - min[i]!)).toFixed(4),
  }
}

if (import.meta.main) {
  const pasta = process.env.ILHA_OUT ?? resolve(BLENDER_DIR, 'out')
  const anteriores: Record<string, IlhaModelo> = existsSync(MODELOS_JSON)
    ? JSON.parse(readFileSync(MODELOS_JSON, 'utf8'))
    : {}
  const modelos: Record<string, IlhaModelo> = {}
  let total = 0
  for (const id of ILHA_PECAS) {
    const r = await otimizar(readFileSync(resolve(pasta, `${id}.glb`)))
    const sha = publishCourseModel(r.bytes)
    modelos[id] = { sha, bytes: r.bytes.length, clips: r.clips, center: r.center, size: r.size }
    total += r.bytes.length
    console.log(id.padEnd(24), `${(r.bytes.length / 1024) | 0} KB`, r.clips.join(', '))
  }
  // ⚠️ Uma versão antiga continua na biblioteca: o projeto que uma criança já salvou aponta para
  // ela, e sem o arquivo o jogo abriria sem a peça. Só antes de o curso sair (nenhum projeto
  // salvo ainda) `--remover-antigos` tira as versões substituídas.
  if (process.argv.includes('--remover-antigos')) {
    const vivos = new Set(Object.values(modelos).map((m) => m.sha))
    for (const m of Object.values(anteriores))
      if (!vivos.has(m.sha))
        rmSync(resolve(COURSE_MODELS_DIR, `m-${m.sha}.generated.ts`), { force: true })
  }
  writeFileSync(MODELOS_JSON, `${JSON.stringify(modelos, null, 2)}\n`)
  writeCourseModelRegistry()
  console.log(`TOTAL ${(total / 1024) | 0} KB em ${ILHA_PECAS.length} modelos`)
}
