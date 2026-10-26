import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createModelAsset, type Vec3 } from '../../../packages/molda/src/core/model'
import {
  readMoldaBackupFile,
  readMoldaBackupProjects,
} from '../../../packages/molda/src/export/backupFile'
import { galleryToJsonText } from '../../../packages/molda/src/export/projectJson'
import type {
  MoldaSceneDocument,
  SceneGeometry,
  SceneMeshGeometry,
} from '../../../packages/molda/src/scene/document'
import { sceneToJson } from '../../../packages/molda/src/scene/documentJson'
import { buildSceneGeometry } from '../../../packages/molda/src/scene/geometry'
import type { Quaternion } from '../../../packages/molda/src/scene/matrix'
import { migrateLegacyModel } from '../../../packages/molda/src/scene/migrateLegacy'
import { readSceneDocument } from '../../../packages/molda/src/scene/readDocument'
import { gameThreeDRuntimeWithoutPlatform } from '../../../packages/studio/src/official-extensions/game-3d/runtime'

const root = resolve(import.meta.dirname, '../../..')
const requireMolda = createRequire(resolve(root, 'packages/molda/package.json'))
const T: typeof import('three') = requireMolda('three')
const { zipSync, strToU8 } = requireMolda('fflate') as typeof import('fflate')
const cache = resolve(root, '.cache/ilha-do-farol')
const output = resolve(import.meta.dirname, '../ilha-do-farol-molda')
await mkdir(cache, { recursive: true })
await mkdir(resolve(output, 'projetos'), { recursive: true })
await writeFile(resolve(cache, 'runtime.js'), gameThreeDRuntimeWithoutPlatform)
const build = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'capture-molda.ts')],
  target: 'browser',
  plugins: [
    {
      name: 'three',
      setup(b) {
        b.onResolve({ filter: /^three(?:\/.*)?$/ }, (a) => ({
          path: Bun.resolveSync(a.path, resolve(root, 'packages/studio')),
        }))
      },
    },
  ],
})
if (!build.success) throw new Error(build.logs.join('\n'))
await writeFile(
  resolve(cache, 'capture-molda.html'),
  `<!doctype html><meta charset="utf-8"><script>${(await build.outputs[0].text()).replaceAll('</script', '<\\/script')}</script>`,
)
interface Capture {
  name: string
  position: Vec3
  rotation: Quaternion
  scale: Vec3
  visible: boolean
  shape?: string
  parameters?: Record<string, number>
  color?: string
  opacity?: number
  roughness?: number
  metalness?: number
  children: Capture[]
}
// Node owns Playwright's process transport; Bun builds and validates the documents.
execFileSync('node', [resolve(import.meta.dirname, 'capture-molda.mjs')], {
  cwd: root,
  stdio: 'inherit',
})
const captured = JSON.parse(await readFile(resolve(cache, 'molda-capture.json'), 'utf8')) as {
  roots: Capture[]
  bench: Capture
}
const flatten = (nodes: Capture[]): Capture[] => nodes.flatMap((n) => [n, ...flatten(n.children)])
console.log('Captured', flatten(captured.roots).filter((n) => n.shape).length, 'visual parts')

function geometry(source: Capture, id: string, compact: boolean): SceneGeometry {
  const p = source.parameters!
  const primitive = (
    kind: 'box' | 'sphere' | 'cylinder',
    from: Vec3,
    to: Vec3,
    detail?: { around: number; down?: number },
  ) =>
    ({
      id,
      kind,
      from,
      to,
      surfaces: {},
      ...(detail ? { tessellation: detail } : {}),
    }) as SceneGeometry
  if (source.shape === 'BoxGeometry')
    return primitive(
      'box',
      [-p.width / 2, -p.height / 2, -p.depth / 2],
      [p.width / 2, p.height / 2, p.depth / 2],
    )
  if (source.shape === 'SphereGeometry')
    return primitive('sphere', [-p.radius, -p.radius, -p.radius], [p.radius, p.radius, p.radius], {
      around: compact ? 16 : 32,
      down: compact ? 8 : 16,
    })
  if (source.shape === 'CylinderGeometry')
    return primitive(
      'cylinder',
      [-p.radiusTop, -p.height / 2, -p.radiusTop],
      [p.radiusTop, p.height / 2, p.radiusTop],
      { around: p.radialSegments },
    )
  const buffer =
    source.shape === 'ConeGeometry'
      ? new T.ConeGeometry(p.radius, p.height, p.radialSegments)
      : source.shape === 'TorusGeometry'
        ? new T.TorusGeometry(
            p.radius,
            p.tube,
            compact ? 8 : p.radialSegments,
            compact ? 16 : p.tubularSegments,
          )
        : null
  if (!buffer) throw new Error(`Unsupported geometry ${source.shape}`)
  const result: SceneMeshGeometry = { id, kind: 'mesh', vertices: {}, faces: {}, looseEdges: [] }
  const positions = buffer.getAttribute('position'),
    uv = buffer.getAttribute('uv'),
    index = buffer.getIndex()!
  const welded = new Map<string, string>(),
    vertexIds: string[] = []
  for (let i = 0; i < positions.count; i++) {
    const point: Vec3 = [positions.getX(i), positions.getY(i), positions.getZ(i)]
    const key = point.map((v) => Math.round(v * 1e7)).join(',')
    let vertex = welded.get(key)
    if (!vertex) {
      vertex = `v${welded.size}`
      welded.set(key, vertex)
      result.vertices[vertex] = point
    }
    vertexIds.push(vertex)
  }
  for (let i = 0; i < index.count; i += 3) {
    const corners = [0, 1, 2].map((j) => {
      const k = index.getX(i + j)
      return { vertexId: vertexIds[k], uv: [uv.getX(k), uv.getY(k)] as [number, number] }
    })
    if (new Set(corners.map((c) => c.vertexId)).size === 3) result.faces[`f${i / 3}`] = { corners }
  }
  buffer.dispose()
  return result
}
function document(name: string, slug: string, roots: Capture[], compact = false) {
  const doc = migrateLegacyModel(createModelAsset({ name, starter: false })).document
  doc.id = `ilha-${slug}`
  let count = 0
  const visit = (o: Capture, parentId: string | null) => {
    const id = `${slug}-n${count++}`
    const node = {
      id,
      name: o.name,
      parentId,
      hidden: !o.visible,
      locked: false,
      transform: {
        kind: 'trs' as const,
        translation: o.position,
        rotation: o.rotation,
        scale: o.scale,
      },
    }
    if (o.shape) {
      const geometryId = `${id}-geometry`,
        materialId = `${id}-material`
      const color = o.color!
      doc.materials.push({
        id: materialId,
        name: `${o.name} #${color}`,
        baseColor: {
          kind: 'rgba',
          value: [
            Number.parseInt(color.slice(0, 2), 16) / 255,
            Number.parseInt(color.slice(2, 4), 16) / 255,
            Number.parseInt(color.slice(4, 6), 16) / 255,
            o.opacity!,
          ],
        },
        roughness: o.roughness!,
        metalness: o.metalness!,
        doubleSided: false,
      })
      doc.geometries.push(geometry(o, geometryId, compact))
      doc.nodes.push({ ...node, kind: 'mesh', geometryId, materialId })
    } else doc.nodes.push({ ...node, kind: 'group' })
    for (const child of o.children) visit(child, id)
  }
  for (const r of roots) visit(r, null)
  const read = readSceneDocument(doc)
  if (read.status !== 'valid')
    throw new Error(
      `${name}: ${JSON.stringify(read.status === 'invalid' ? { path: read.path, message: read.message } : read)}`,
    )
  return read.document
}

const files: Record<string, Uint8Array> = {}
const projects: Array<{
  file: string
  name: string
  nodes: number
  parts: number
  position: Vec3
}> = []
async function save(slug: string, doc: MoldaSceneDocument, position: Vec3 = [0, 0, 0]) {
  let triangles = 0
  for (const geometry of doc.geometries) {
    const buffers = buildSceneGeometry(geometry)
    if (buffers.issues.length) throw new Error(`${slug}: invalid surfaces in ${geometry.id}`)
    triangles += buffers.faceIds.length
  }
  const file = `projetos/${slug}.molda.json`,
    json = JSON.stringify(sceneToJson(doc))
  const read = readSceneDocument(JSON.parse(json))
  if (read.status !== 'valid') throw new Error(`Invalid saved document ${slug}`)
  files[file] = strToU8(json)
  await writeFile(resolve(output, file), json)
  projects.push({
    file,
    name: doc.name,
    nodes: doc.nodes.length,
    parts: doc.nodes.filter((n) => n.kind === 'mesh').length,
    position,
  })
  console.log('PASS', file, doc.nodes.length, 'nodes', triangles, 'triangles')
}
const slugs = [
  'mar',
  'terreno',
  'ponte',
  'coqueiro-tras',
  'coqueiro-frente',
  'vegetacao',
  'farol-apagado',
  'veleiro',
  'pedras',
  'aventureiro',
  'chave',
]
for (const [i, r] of captured.roots.entries()) {
  const local = structuredClone(r)
  local.position = [0, 0, 0]
  await save(slugs[i], document(`Ilha — ${r.name}`, slugs[i], [local]), r.position)
}
const lit = structuredClone(captured.roots[6])
lit.position = [0, 0, 0]
lit.children.find((n) => n.name === 'Vidro da lanterna')!.color = 'ffe78b'
lit.children.find((n) => n.name === 'Feixe de luz')!.visible = true
await save(
  'farol-aceso',
  document('Ilha — Farol aceso', 'farol-aceso', [lit]),
  captured.roots[6].position,
)
await save('bancada', document('Ilha — Bancada das experiências', 'bancada', [captured.bench]))
await save('cena-completa', document('Ilha — Cena completa', 'cena-completa', captured.roots, true))
const guide = await readFile(resolve(import.meta.dirname, 'molda-LEIA-ME.txt'), 'utf8')
files['LEIA-ME.txt'] = strToU8(guide)
files['galeria.molda.json'] = strToU8(galleryToJsonText([]))
files['mapa-de-reintegracao.json'] = strToU8(
  JSON.stringify(
    {
      version: 1,
      units: 'Mesmas unidades do Jogo 3D; y é a altura.',
      projects,
      camera: { position: [0, 12, 21], target: [-1, 0, 0], fov: 48 },
      heroContact: { width: 0.85, height: 1.6, depth: 0.75, centerY: 0.8 },
      boatVictoryPosition: [6.6, -0.1, 4.5],
    },
    null,
    2,
  ),
)
await writeFile(resolve(output, 'LEIA-ME.txt'), guide)
await writeFile(resolve(output, 'mapa-de-reintegracao.json'), files['mapa-de-reintegracao.json'])
const zip = zipSync(files, { level: 6 }),
  zipPath = resolve(output, 'ilha-do-farol-molda.zip')
await writeFile(zipPath, zip)
const zipFile = new File([zip], 'ilha-do-farol-molda.zip')
const backup = await readMoldaBackupFile(zipFile),
  restored = await readMoldaBackupProjects(zipFile)
if (!backup.ok || !restored.ok || restored.projects.length !== projects.length)
  throw new Error('Molda ZIP import failed')
for (const text of restored.projects)
  if (readSceneDocument(JSON.parse(text)).status !== 'valid')
    throw new Error('ZIP document invalid')
console.log(`PASS native ZIP importer: ${projects.length} editable projects, ${zip.length} bytes`)
