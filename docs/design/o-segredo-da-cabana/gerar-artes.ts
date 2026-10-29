/**
 * Modelos 3D do Poder "O segredo da cabana", feitos no Blender por
 * `../o-segredo-da-cabana-blender/cabana.py`. Otimiza os GLBs (solda, deduplica e quantiza, como os
 * da Ilha e do Jardim), publica-os na biblioteca de modelos dos cursos e anota em `modelos.json`
 * o sha, os clipes e a caixa (centro e lado maior, no y para cima do jogo).
 *
 *   CABANA_OUT=<pasta dos .glb> bun docs/design/o-segredo-da-cabana/gerar-artes.ts [--remover-antigos]
 *
 * As artes 2D (emblema e cabana fechada/aberta) moram com as do Farol, em
 * `packages/studio/src/arte/assets/farol/`, e entram pelo `gen-farol-assets.py`.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getBounds, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, resample, weld } from '@gltf-transform/functions'
import {
  COURSE_MODELS_DIR,
  publishCourseModel,
  writeCourseModelRegistry,
} from '../../../packages/studio/scripts/course-models'

const dir = import.meta.dirname
mkdirSync(resolve(dir, 'assets'), { recursive: true })
const MODELOS = ['emblema-do-farol', 'cabana-do-faroleiro'] as const
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))
const pasta = process.env.CABANA_OUT ?? resolve(dir, '../o-segredo-da-cabana-blender/out')
const anteriores: Record<string, { sha: string }> = existsSync(resolve(dir, 'modelos.json'))
  ? JSON.parse(readFileSync(resolve(dir, 'modelos.json'), 'utf8'))
  : {}
const catalogue: Record<string, unknown> = {}
for (const name of MODELOS) {
  const doc = await io.readBinary(readFileSync(resolve(pasta, `${name}.glb`)))
  // Nenhum material daqui lê a cor dos vértices: ela só pesaria (e o three.js a multiplicaria).
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) prim.setAttribute('COLOR_0', null)
  await doc.transform(
    // As animações saem do Blender com uma chave por quadro: tira as que a interpolação refaz.
    resample(),
    weld({ overwrite: true }),
    dedup(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    weld({ overwrite: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    prune(),
  )
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]!
  const { min, max } = getBounds(scene)
  const bytes = await io.writeBinary(doc)
  catalogue[name] = {
    sha: publishCourseModel(bytes),
    bytes: bytes.length,
    center: min.map((v, i) => +((v + max[i]!) / 2).toFixed(4)),
    size: +Math.max(...max.map((v, i) => v - min[i]!)).toFixed(4),
    clips: doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  }
  writeFileSync(resolve(dir, 'assets', `${name}.glb`), bytes)
  console.log(name.padEnd(20), `${(bytes.length / 1024) | 0} KB`)
}
// Uma versão substituída continua na biblioteca depois que o curso sai (o projeto salvo de uma
// criança aponta para ela). Só antes do lançamento `--remover-antigos` a tira.
if (process.argv.includes('--remover-antigos')) {
  const vivos = new Set(Object.values(catalogue).map((m) => (m as { sha: string }).sha))
  for (const m of Object.values(anteriores))
    if (!vivos.has(m.sha))
      rmSync(resolve(COURSE_MODELS_DIR, `m-${m.sha}.generated.ts`), { force: true })
}
writeCourseModelRegistry()
writeFileSync(resolve(dir, 'modelos.json'), `${JSON.stringify(catalogue, null, 2)}\n`)
console.log('Cabana: 2 modelos do Blender publicados.')
