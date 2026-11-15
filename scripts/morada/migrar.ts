/** Importação local reprodutível. Nenhuma malha ou imagem privada entra no git. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { type Node as GLTFNode, getBounds, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { z } from 'zod'
import type {
  MoradaCatalog,
  MoradaCollider,
  MoradaPiece,
  MoradaVector,
} from '../../packages/core/src/morada/types'
import { comBalde } from '../avatar/balde'
import { meshNavigationColliders, wallColliders } from './collision'
import { pontosDaPeca } from './pontos'

const root = resolve(import.meta.dirname, '../..')
const source = resolve(process.env.ARTES_3D_DIR ?? join(root, '../artes-3d'))
const output = resolve(process.env.MORADA_OUTPUT_DIR ?? join(root, 'output/morada-assets'))
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const record = z.record(z.string(), z.unknown())
const vec = z.tuple([z.number(), z.number(), z.number()])
type Raw = z.infer<typeof record>
const string = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const number = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const rows = (v: unknown) => array(v).map((x) => record.parse(x))
const vector = (v: unknown, fallback: MoradaVector = [0, 0, 0]): MoradaVector =>
  vec.safeParse(v).success ? vec.parse(v) : fallback
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex').slice(0, 24)
const files = new Set<string>()
const json = async (p: string) => record.parse(JSON.parse(await readFile(p, 'utf8')))
async function resource(bytes: Uint8Array, ext: string, kind: string) {
  const file = `${kind}/${hash(bytes)}.${ext}`
  if (!files.has(file)) {
    const path = join(output, 'morada', file)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
    files.add(file)
  }
  return file
}
const catalog: MoradaCatalog = {
  version: 1,
  source: {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  pieces: {},
  textures: {},
  palette: {},
  files: [],
}
const palette = await readFile(join(source, 'codigo/arte/moveis_base.py'), 'utf8')
const paletteBlock = palette.slice(palette.indexOf('CORES = {') + 9, palette.indexOf('\nNOMES ='))
for (const m of paletteBlock.matchAll(/"([a-z0-9_]+)":\s*"(#[0-9a-fA-F]{6})"/g)) {
  if (m[1] && m[2])
    catalog.palette[m[1]] = { index: Object.keys(catalog.palette).length, hex: m[2].toLowerCase() }
}
interface Input {
  raw: Raw
  id: string
  category: string
  kind: MoradaPiece['kind']
  base: string
  model?: string
  thumb?: string
  species?: 'cat' | 'dog'
}
const inputs: Input[] = []
for (const category of (await readdir(join(source, 'biblioteca/moveis'), { withFileTypes: true }))
  .filter((x) => x.isDirectory())
  .map((x) => x.name)
  .sort()) {
  const base = join(source, 'biblioteca/moveis', category),
    path = join(base, 'catalogo.json')
  if (!(await Bun.file(path).exists())) continue
  for (const raw of rows((await json(path)).itens))
    inputs.push({
      raw,
      id: `moveis/${category}/${string(raw.id)}`,
      category,
      kind: 'furniture',
      base,
    })
}
const constructionBase = join(source, 'biblioteca/construcao')
const construction = await json(join(constructionBase, 'construcao.json'))
for (const [category, value] of Object.entries(construction)) {
  if (!Array.isArray(value)) continue
  for (const raw of rows(value).filter((x) => typeof x.id === 'string'))
    inputs.push({
      raw,
      id: `construcao/${string(raw.id)}`,
      category,
      kind: 'construction',
      base: constructionBase,
    })
}
const fittings = await json(join(constructionBase, 'portas_janelas.json'))
for (const [category, value] of Object.entries(fittings)) {
  if (!Array.isArray(value)) continue
  for (const raw of rows(value).filter((x) => typeof x.id === 'string'))
    inputs.push({
      raw,
      id: `construcao/${string(raw.id)}`,
      category,
      kind: 'construction',
      base: constructionBase,
    })
}
const animals = await json(join(source, 'biblioteca/bichos/bichos.json'))
for (const raw of Object.values(animals)
  .map((x) => record.parse(x))
  .filter((x) => x.grupo === 'estimacao')) {
  if (raw.especie !== 'gato' && raw.especie !== 'cachorro') continue
  const id = string(raw.id)
  inputs.push({
    raw,
    id: `pets/${id}`,
    category: 'pets',
    kind: 'pet',
    base: join(source, 'biblioteca/bichos'),
    model: `${id}.glb`,
    thumb: `${id}.webp`,
    species: raw.especie === 'gato' ? 'cat' : 'dog',
  })
}
const farmBase = join(source, 'biblioteca/cidade/fazenda')
for (const raw of rows((await json(join(farmBase, 'catalogo.json'))).itens))
  inputs.push({
    raw,
    id: `cidade/fazenda/${string(raw.id)}`,
    category: 'fazenda',
    kind: 'furniture',
    base: farmBase,
  })
const trophies = [
  'primeiro-jogo',
  'diploma',
  'chama',
  'medalha-mil',
  'foguete',
  'console',
  'estrela-do-mural',
  'oficina-completa',
]
for (const name of trophies) {
  const id = `trofeu-${name}`
  inputs.push({
    raw: {
      id,
      rotulo: `Troféu ${name}`,
      tags: ['trophy'],
      fixacao: ['diploma', 'medalha-mil'].includes(name) ? 'parede' : 'apoio',
    },
    id: `trophy/${id}`,
    category: 'trofeus',
    kind: 'furniture',
    base: join(root, 'art/trofeus'),
    model: `items/${id}.glb`,
    thumb: `thumbs/${id}.png`,
  })
}
const mimeExt: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
let completed = 0
for (const input of inputs) {
  const { raw, base, id, category, kind } = input
  if (catalog.pieces[id]) throw new Error(`Id repetido: ${id}`)
  const model = resolve(base, input.model ?? string(raw.arquivo))
  const doc = await io.readBinary(new Uint8Array(await readFile(model)))
  const gltfRoot = doc.getRoot(),
    scene = gltfRoot.listScenes()[0]
  if (!scene) throw new Error(`${id}: sem cena`)
  if (id.startsWith('trophy/')) {
    // Única arte anterior: acompanha a conversão do herói antigo (ponte1,85) para a escala nativa.
    for (const node of scene.listChildren()) {
      const s = node.getScale()
      const t = node.getTranslation()
      node.setScale([s[0] / 1.85, s[1] / 1.85, s[2] / 1.85])
      node.setTranslation([t[0] / 1.85, t[1] / 1.85, t[2] / 1.85])
    }
  }
  const bounds = getBounds(scene)
  const min = vector(bounds.min),
    max = vector(bounds.max)
  const size: MoradaVector = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  if (size.some((x) => !Number.isFinite(x) || x < 0)) throw new Error(`${id}: dimensões inválidas`)
  const legacyLeaf =
    (category === 'portas' || (category === 'encaixes' && string(raw.id).startsWith('porta_'))) &&
    !gltfRoot.listNodes().some((n) => n.getExtras().interativo)
  if (legacyLeaf) {
    // As folhas antigas são malhas sem pivô. A origem autoral continua no centro do vão;
    // acrescenta-se uma dobradiça à esquerda, preservando a pose de repouso.
    const hinge: MoradaVector = [min[0], 0, (min[2] + max[2]) / 2]
    const pivot = doc
      .createNode('morada_folha')
      .setTranslation(hinge)
      .setExtras({ interativo: 'porta', eixo: [0, 1, 0], angulo: -Math.PI / 2 })
    for (const node of [...scene.listChildren()]) {
      scene.removeChild(node)
      const t = node.getTranslation()
      node.setTranslation([t[0] - hinge[0], t[1] - hinge[1], t[2] - hinge[2]])
      pivot.addChild(node)
    }
    scene.addChild(pivot)
  }
  const materials: MoradaPiece['materials'] = []
  for (const mat of gltfRoot.listMaterials()) {
    const entry: { name: string; map?: string; emissiveMap?: string } = { name: mat.getName() }
    for (const [channel, texture] of [
      ['map', mat.getBaseColorTexture()],
      ['emissiveMap', mat.getEmissiveTexture()],
    ] as const) {
      if (!texture) continue
      const bytes = texture.getImage(),
        ext = mimeExt[texture.getMimeType()]
      if (!bytes || !ext) throw new Error(`${id}: textura sem imagem/tipo suportado`)
      entry[channel] = await resource(bytes, ext, 'textures')
    }
    if (mat.getNormalTexture() || mat.getMetallicRoughnessTexture() || mat.getOcclusionTexture())
      throw new Error(`${id}: canal de textura não previsto`)
    mat.setBaseColorTexture(null)
    mat.setEmissiveTexture(null)
    mat.setExtras({ ...mat.getExtras(), morada: entry })
    materials.push(entry)
  }
  for (const t of gltfRoot.listTextures()) t.dispose()
  for (const e of gltfRoot.listExtensionsUsed())
    if (['EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu'].includes(e.extensionName))
      e.dispose()
  let colliders: MoradaCollider[] = rows(raw.colisao).map((c) => ({
    center: vector(c.centro),
    size: vector(c.tamanho),
  }))
  const collisionMeshes = array(raw.colisao_malha).filter((x): x is string => typeof x === 'string')
  if (typeof raw.colisao_malha === 'string') collisionMeshes.push(raw.colisao_malha)
  const triangles: MoradaVector[][] = []
  // As caixas autorais já representam a passagem das escadas. Só complementa as
  // peças que não têm caixas, preservando os vãos das suas malhas reais.
  if (collisionMeshes.length && !colliders.length) {
    const visit = (node: GLTFNode) => {
      const matrix = node.getWorldMatrix()
      for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
        const positions = primitive.getAttribute('POSITION')
        if (!positions) continue
        const indices = primitive.getIndices(),
          count = indices?.getCount() ?? positions.getCount()
        const point = (index: number): MoradaVector => {
          const p = positions.getElement(indices ? indices.getScalar(index) : index, [])
          return [
            matrix[0]! * p[0]! + matrix[4]! * p[1]! + matrix[8]! * p[2]! + matrix[12]!,
            matrix[1]! * p[0]! + matrix[5]! * p[1]! + matrix[9]! * p[2]! + matrix[13]!,
            matrix[2]! * p[0]! + matrix[6]! * p[1]! + matrix[10]! * p[2]! + matrix[14]!,
          ]
        }
        for (let i = 0; i + 2 < count; i += 3)
          triangles.push([point(i), point(i + 1), point(i + 2)])
      }
      for (const child of node.listChildren()) visit(child)
    }
    for (const node of gltfRoot.listNodes().filter((n) => collisionMeshes.includes(n.getName())))
      visit(node)
  }
  if (kind === 'construction' && !colliders.length && !collisionMeshes.length) {
    if (category === 'paredes') {
      colliders = wallColliders(
        number(raw.comp),
        number(raw.alt, 3),
        number(construction.espessura, 0.15),
        rows(raw.vaos).map((o) => ({
          cx: number(o.cx),
          larg: number(o.larg),
          peitoril: number(o.peitoril),
          alt: number(o.alt),
          tipo: string(o.tipo),
        })),
      )
    } else if (category === 'chaos') {
      const tam = array(raw.tam),
        w = number(tam[0]),
        d = number(tam[1])
      colliders = [{ center: [w / 2, -0.02, -d / 2], size: [w, 0.04, d] }]
    } else if (category === 'batentes') {
      const width = number(raw.larg),
        height = number(raw.alt),
        side = (size[0] - width) / 2
      colliders = [
        {
          center: [min[0] + side / 2, height / 2, (min[2] + max[2]) / 2],
          size: [side, height, size[2]],
        },
        {
          center: [max[0] - side / 2, height / 2, (min[2] + max[2]) / 2],
          size: [side, height, size[2]],
        },
        {
          center: [(min[0] + max[0]) / 2, (height + max[1]) / 2, (min[2] + max[2]) / 2],
          size: [size[0], max[1] - height, size[2]],
        },
      ]
        .filter((b) => b.size.every((v) => v > 0))
        .map((b) => ({ center: vector(b.center), size: vector(b.size) }))
    } else if (legacyLeaf) {
      colliders = [
        {
          center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
          size,
          part: 'morada_folha',
        },
      ]
    } else {
      // Acabamentos antigos: cada parte autoral gera sua própria caixa. O vão entre as partes é preservado.
      for (const node of gltfRoot.listNodes().filter((n) => n.getMesh())) {
        const b = getBounds(node),
          s: MoradaVector = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]]
        const extras = node.getExtras(),
          part = typeof extras.interativo === 'string' ? node.getName() : undefined
        if (s.every((n) => n > 0.00001))
          colliders.push({
            center: [
              (b.min[0] + b.max[0]) / 2,
              (b.min[1] + b.max[1]) / 2,
              (b.min[2] + b.max[2]) / 2,
            ],
            size: s,
            ...(part ? { part } : {}),
          })
      }
    }
  }
  const interactions: MoradaPiece['interactions'] = []
  for (const node of gltfRoot.listNodes()) {
    const e = node.getExtras()
    if (e.interativo === 'porta')
      interactions.push({
        id: node.getName(),
        type: 'door',
        axis: vector(e.eixo, [0, 1, 0]),
        amount: number(e.angulo, Math.PI / 2),
      })
    if (e.interativo === 'gaveta' || e.interativo === 'correr')
      interactions.push({
        id: node.getName(),
        type: 'slide',
        axis: vector(e.direcao, [0, 0, 1]),
        amount: number(e.curso),
      })
  }
  // Os `pontos` antigos e os `pontos_de_jogo` da arte (onde o avatar senta, deita, planta…).
  const points: MoradaPiece['points'] = pontosDaPeca(raw)
  const thumbPath = resolve(
    base,
    input.thumb ??
      string(raw.miniatura, kind === 'construction' ? `miniaturas/${string(raw.id)}.webp` : ''),
  )
  const thumbExt = thumbPath.split('.').pop() ?? 'webp'
  const piece: MoradaPiece = {
    id,
    label: string(raw.rotulo, string(raw.nome, string(raw.id))),
    category,
    kind,
    group: string(raw.grupo, string(raw.id)),
    file: await resource(await io.writeBinary(doc), 'glb', 'models'),
    thumb: await resource(new Uint8Array(await readFile(thumbPath)), thumbExt, 'thumbs'),
    size,
    min,
    max,
    mount:
      raw.fixacao === 'parede'
        ? 'wall'
        : raw.fixacao === 'teto'
          ? 'ceiling'
          : raw.fixacao === 'apoio'
            ? 'support'
            : 'floor',
    colliders,
    collisionMeshes,
    ...(triangles.length ? { navigationColliders: meshNavigationColliders(triangles) } : {}),
    slots: rows(raw.slots).map((s) => ({
      id: string(s.nome),
      center: vector(s.centro),
      size: vector(s.tamanho),
      ...(typeof s.em === 'string' ? { part: s.em } : {}),
    })),
    interactions,
    materials,
    colors: array(raw.cores).filter((x): x is string => typeof x === 'string'),
    tags: array(raw.tags).filter((x): x is string => typeof x === 'string'),
    triangles:
      number(raw.tris) ||
      gltfRoot
        .listMeshes()
        .reduce(
          (sum, mesh) =>
            sum +
            mesh
              .listPrimitives()
              .reduce(
                (count, primitive) =>
                  count +
                  Math.floor(
                    (primitive.getIndices()?.getCount() ??
                      primitive.getAttribute('POSITION')?.getCount() ??
                      0) / 3,
                  ),
                0,
              ),
          0,
        ),
    animations: gltfRoot.listAnimations().map((a) => {
      const def = rows(raw.animacoes).find((x) => x.id === a.getName())
      const times = a.listSamplers().flatMap((s) => Array.from(s.getInput()?.getArray() ?? []))
      return {
        id: a.getName(),
        duration: times.length ? Math.max(...times) : 0,
        loop: def?.laco === true,
      }
    }),
    points,
    ...(input.species ? { species: input.species } : {}),
  }
  catalog.pieces[id] = piece
  if (++completed % 100 === 0) console.log(`${completed}/${inputs.length} peças`)
}
const textureCatalog = await json(join(constructionBase, 'texturas/texturas.json'))
for (const [kind, value] of Object.entries(textureCatalog))
  if (Array.isArray(value))
    for (const t of rows(value)) {
      const id = string(t.id)
      catalog.textures[id] = {
        id,
        label: string(t.rotulo, id),
        kind,
        file: await resource(
          new Uint8Array(await readFile(join(constructionBase, 'texturas', string(t.arquivo)))),
          'png',
          'textures',
        ),
      }
    }
catalog.files = [...files].sort()
const generated = `// Gerado por scripts/morada/migrar.ts. Só metadados; arquivos privados fora do git.\nimport type { MoradaCatalog } from './types'\nexport const MORADA_CATALOG: MoradaCatalog = ${JSON.stringify(catalog)}\n`
await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog))
await writeFile(join(root, 'packages/core/src/morada/catalog.generated.ts'), generated)
if (process.argv.includes('--r2'))
  await comBalde('r2', async (bucket) => {
    for (const file of catalog.files)
      await bucket.gravar(
        `morada/${file}`,
        new Uint8Array(await readFile(join(output, 'morada', file))),
      )
  })
console.log(
  `Morada: ${Object.keys(catalog.pieces).length} peças, ${catalog.files.length} arquivos; saída ${output}`,
)
