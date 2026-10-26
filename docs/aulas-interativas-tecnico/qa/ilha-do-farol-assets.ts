import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, weld } from '@gltf-transform/functions'
import { encodeSceneGlb } from '../../../packages/molda/src/export/sceneGlb'
import { buildSceneGeometry } from '../../../packages/molda/src/scene/geometry'
import { indexSceneNodes } from '../../../packages/molda/src/scene/graph'
import { readSceneDocument } from '../../../packages/molda/src/scene/readDocument'
import type { ProjectAsset } from '../../../packages/studio/src/core/project'

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))

/** Replace only the source project here after the author returns the edited Molda files. */
export const ILHA_ART_SOURCES = {
  mar: 'mar',
  terreno: 'terreno',
  ponte: 'ponte',
  coqueiroTras: 'coqueiro-tras',
  coqueiroFrente: 'coqueiro-frente',
  vegetacao: 'vegetacao',
  farol: 'farol-apagado',
  farolAceso: 'farol-aceso',
  barco: 'veleiro',
  pedra: 'pedras',
  personagem: 'aventureiro',
  chave: 'chave',
} as const
const sourceDir = resolve(import.meta.dirname, '../../design/ilha-do-farol-molda/projetos')
async function load(name: string, file: string) {
  const read = readSceneDocument(
    JSON.parse(readFileSync(resolve(sourceDir, `${file}.molda.json`), 'utf8')),
  )
  if (read.status !== 'valid') throw Error(`Arte inválida: ${file}`)
  const doc = structuredClone(read.document)
  // Same display detail as the approved whole-scene export; editable sources stay intact.
  for (const g of doc.geometries) if (g.kind === 'sphere') g.tessellation = { around: 16, down: 8 }
  const index = indexSceneNodes(doc.nodes),
    byGeometry = new Map(doc.geometries.map((g) => [g.id, g]))
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity]
  const visible = (id: string): boolean => {
    const n = index.nodes.get(id)!
    return !n.hidden && (!n.parentId || visible(n.parentId))
  }
  for (const node of doc.nodes) {
    if (node.kind !== 'mesh' || !visible(node.id)) continue
    const p = buildSceneGeometry(byGeometry.get(node.geometryId)!).positions,
      m = index.worldMatrices.get(node.id)!
    for (let i = 0; i < p.length; i += 3)
      for (let a = 0; a < 3; a++) {
        const v = m[a] * p[i] + m[4 + a] * p[i + 1] + m[8 + a] * p[i + 2] + m[12 + a]
        min[a] = Math.min(min[a], v)
        max[a] = Math.max(max[a], v)
      }
  }
  const glb = encodeSceneGlb(doc, { allowLosses: true })
  if (glb.issues.some((i) => i.code !== 'hidden-node'))
    throw Error(`Perda na arte ${file}: ${JSON.stringify(glb.issues)}`)
  const center = min.map((v, i) => (v + max[i]) / 2) as [number, number, number]
  const size = Math.max(...max.map((v, i) => v - min[i]))
  const optimized = await io.readBinary(glb.bytes)
  await optimized.transform(
    weld(),
    dedup(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    prune(),
  )
  const bytes = await io.writeBinary(optimized)
  const asset: ProjectAsset = {
    id: `ilha-modelo-${name}`,
    name: `ilha-${file}`,
    kind: 'model3d',
    source: 'library',
    originalFileName: `ilha-${file}.glb`,
    dataUrl: `data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}`,
  }
  return { asset, center, size }
}
export const ILHA_MODELS = Object.fromEntries(
  await Promise.all(
    Object.entries(ILHA_ART_SOURCES).map(async ([name, file]) => [name, await load(name, file)]),
  ),
) as Record<keyof typeof ILHA_ART_SOURCES, Awaited<ReturnType<typeof load>>>
export const ILHA_ASSETS = Object.values(ILHA_MODELS).map((m) => m.asset)
