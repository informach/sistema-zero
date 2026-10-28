/** Fontes editáveis do Jardim: vetores 2D e modelos glTF, sem dependência de aplicativo gráfico. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Document, getBounds, NodeIO } from '@gltf-transform/core'
import { dedup, flatten, join, prune, weld } from '@gltf-transform/functions'
import {
  type BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import {
  publishCourseModel,
  writeCourseModelRegistry,
} from '../../../packages/studio/scripts/course-models'

const dir = import.meta.dirname
mkdirSync(resolve(dir, 'assets'), { recursive: true })
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const _leaf = (x: number, y: number, s: number, c: string) =>
  `<path d="M${x} ${y}q${-s} ${-s * 1.8} ${-s * 1.5} 0q${s * 0.6} ${s * 0.65} ${s * 1.5} 0" fill="${c}"/>`
const flowers = Array.from({ length: 36 }, (_, i) => {
  const x = 12 + ((i * 83) % 936),
    y = i % 2 ? 560 + ((i * 7) % 28) : 12 + ((i * 11) % 32)
  return `<g transform="translate(${x} ${y})"><path d="M0 8v-12" stroke="#3b7453" stroke-width="3"/><g fill="${['#ef9b9f', '#ffd272', '#d7b7e7'][i % 3]}"><circle cx="-4" cy="-5" r="5"/><circle cx="4" cy="-5" r="5"/><circle cy="-11" r="5"/></g><circle cy="-6" r="3" fill="#fff0a5"/></g>`
}).join('')
const foliage = Array.from({ length: 18 }, (_, i) => {
  const x = 22 + ((i * 127) % 915),
    y = i % 2 ? 565 : 26
  return `<g transform="translate(${x} ${y})"><ellipse cy="12" rx="32" ry="10" fill="#3f7950" opacity=".18"/><path d="M-30 8C-42-7-20-22-12-12C-8-40 21-34 23-12C48-21 48 12 25 16H-15Z" fill="${i % 3 ? '#609968' : '#80ae70'}"/><path d="M-21-5Q-10-16 0-6Q9-25 22-8" fill="none" stroke="#a6ca81" stroke-width="5" stroke-linecap="round"/></g>`
}).join('')
const images: Record<string, { width: number; height: number; svg: string }> = {
  'jardim-acolhedor': {
    width: 960,
    height: 600,
    svg: svg(
      960,
      600,
      `<defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#b8d99a"/><stop offset="1" stop-color="#83b775"/></linearGradient><radialGradient id="p"><stop stop-color="#f4e5bc"/><stop offset="1" stop-color="#dfcfa7"/></radialGradient></defs><path fill="url(#g)" d="M0 0h960v600H0z"/><path d="M-30 350Q190 270 405 320T990 260" fill="none" stroke="#aecb8c" stroke-width="190"/><path d="M-30 350Q190 270 405 320T990 260" fill="none" stroke="url(#p)" stroke-width="155"/><path d="M-30 350Q190 270 405 320T990 260" fill="none" stroke="#f3e5bf" stroke-width="120"/>${foliage}${flowers}<g fill="#91ac86" opacity=".25"><ellipse cx="200" cy="450" rx="28" ry="8"/><ellipse cx="640" cy="180" rx="34" ry="9"/></g>`,
    ),
  },
  'regador-azul': {
    width: 100,
    height: 88,
    svg: svg(
      100,
      88,
      `<defs><linearGradient id="b" x2=".7" y2="1"><stop stop-color="#74c7d9"/><stop offset="1" stop-color="#348da8"/></linearGradient></defs><ellipse cx="47" cy="77" rx="36" ry="7" fill="#244d50" opacity=".15"/><path d="M26 29C-5 9-5 64 25 59" fill="none" stroke="#3c95ae" stroke-width="10"/><path d="M26 30C4 16 4 56 24 54" fill="none" stroke="#a2dce1" stroke-width="3"/><path d="M64 40L87 24 93 34 70 63" fill="#4bacc2"/><ellipse cx="90" cy="27" rx="12" ry="7" transform="rotate(-30 90 27)" fill="#2d7e98"/><g fill="#a4d7de"><circle cx="85" cy="27" r="1.4"/><circle cx="90" cy="24" r="1.4"/><circle cx="93" cy="29" r="1.4"/></g><path d="M22 27Q45 14 69 27L68 65Q47 82 24 66Z" fill="url(#b)"/><ellipse cx="45" cy="27" rx="23" ry="7" fill="#9ad9e2"/><ellipse cx="45" cy="27" rx="16" ry="4" fill="#3d8ca2"/><path d="M31 40v19" stroke="#a2dde3" stroke-width="5" stroke-linecap="round"/><path d="M35 23C34 3 60 3 59 23" fill="none" stroke="#3b8ba4" stroke-width="6"/>`,
    ),
  },
}
for (const open of [false, true]) {
  const petals = Array.from(
    { length: 8 },
    (_, i) =>
      `<ellipse cx="60" cy="${open ? 29 : 43}" rx="${open ? 12 : 8}" ry="${open ? 24 : 21}" transform="rotate(${i * 45} 60 52)" fill="${i % 2 ? '#ef99a7' : '#e77591'}"/>`,
  ).join('')
  images[open ? 'flor-aberta' : 'flor-fechada'] = {
    width: 120,
    height: 150,
    svg: svg(
      120,
      150,
      `<ellipse cx="60" cy="137" rx="39" ry="8" fill="#385f45" opacity=".17"/><path d="M60 133V57" stroke="#4a8658" stroke-width="9" stroke-linecap="round"/><path d="M60 111Q18 112 22 82Q54 81 60 111" fill="#6baf70"/><path d="M61 99Q98 101 99 72Q71 75 61 99" fill="#89bf78"/><path d="M28 88l28 20M93 80 65 96" stroke="#b5d78e" stroke-width="3" stroke-linecap="round"/>${open ? petals : `<path d="M60 77C31 64 32 29 60 22C88 29 89 65 60 77" fill="#ee91a3"/><path d="M60 25Q43 49 60 74Q77 49 60 25" fill="#f6b0bb"/>`}<path d="M43 68l17 14 18-15-7 22H51Z" fill="#5c9d60"/>${open ? '<circle cx="60" cy="52" r="15" fill="#f5ca68"/><circle cx="56" cy="48" r="7" fill="#ffe19a"/>' : ''}`,
    ),
  }
}
for (const [name, im] of Object.entries(images))
  writeFileSync(resolve(dir, 'assets', `${name}.svg`), im.svg)
writeFileSync(resolve(dir, 'imagens.json'), `${JSON.stringify(images, null, 2)}\n`)

function model() {
  const doc = new Document(),
    buffer = doc.createBuffer(),
    scene = doc.createScene(),
    mats = new Map<string, ReturnType<Document['createMaterial']>>()
  const material = (hex: string) => {
    if (!mats.has(hex)) {
      const c = new Color(hex)
      mats.set(
        hex,
        doc
          .createMaterial(hex)
          .setBaseColorFactor([c.r, c.g, c.b, 1])
          .setMetallicFactor(0)
          .setRoughnessFactor(0.82),
      )
    }
    return mats.get(hex)!
  }
  function shape(
    name: string,
    geo: BufferGeometry,
    color: string,
    pos: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ) {
    const primitive = doc.createPrimitive().setMaterial(material(color))
    for (const [attr, key] of [
      ['position', 'POSITION'],
      ['normal', 'NORMAL'],
    ] as const) {
      const a = geo.getAttribute(attr)
      primitive.setAttribute(
        key,
        doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(a.array)),
      )
    }
    if (geo.index)
      primitive.setIndices(
        doc
          .createAccessor()
          .setBuffer(buffer)
          .setType('SCALAR')
          .setArray(new Uint32Array(geo.index.array)),
      )
    const node = doc
      .createNode(name)
      .setMesh(doc.createMesh(name).addPrimitive(primitive))
      .setTranslation(pos)
      .setScale(scale)
    scene.addChild(node)
    geo.dispose()
    return node
  }
  return { doc, buffer, scene, shape }
}
const ball = () => new IcosahedronGeometry(1, 2)
const tube = (r: number, h: number) => new CylinderGeometry(r, r, h, 20)
const catalogue: Record<string, unknown> = {}
async function save(name: string, m: ReturnType<typeof model>) {
  if (name === 'jardim-acolhedor') await m.doc.transform(flatten(), join())
  await m.doc.transform(weld(), dedup(), prune())
  const bounds = getBounds(m.scene),
    bytes = await new NodeIO().writeBinary(m.doc),
    sha = publishCourseModel(bytes)
  catalogue[name] = {
    sha,
    bytes: bytes.length,
    center: bounds.min.map((v, i) => (v + bounds.max[i]!) / 2),
    size: Math.max(...bounds.max.map((v, i) => v - bounds.min[i]!)),
    clips: m.doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  }
  writeFileSync(resolve(dir, 'assets', `${name}.glb`), bytes)
}
const can = model()
can.shape('recipiente', new CylinderGeometry(0.44, 0.38, 0.65, 24), '#52a9bd', [0, 0.45, 0])
can
  .shape('borda', new TorusGeometry(0.44, 0.035, 8, 32), '#9ad9e2', [0, 0.78, 0])
  .setRotation([Math.SQRT1_2, 0, 0, Math.SQRT1_2])
can.shape('tampa', new CylinderGeometry(0.4, 0.4, 0.025, 24), '#7ecbd4', [0, 0.77, 0])
can.shape(
  'alca',
  new TorusGeometry(0.34, 0.065, 10, 30),
  '#3c8fa5',
  [-0.52, 0.51, 0],
  [0.9, 1.15, 1],
)
can
  .shape('bico', new CylinderGeometry(0.08, 0.13, 0.7, 16), '#54aebf', [0.6, 0.65, 0])
  .setRotation([0, 0, -0.5, Math.sqrt(0.75)])
can
  .shape('chuveiro', new CylinderGeometry(0.19, 0.13, 0.12, 20), '#3b8ca3', [0.91, 0.83, 0])
  .setRotation([0, 0, -0.5, Math.sqrt(0.75)])
can
  .shape('faixa', new TorusGeometry(0.39, 0.025, 8, 32), '#a8e0df', [0, 0.19, 0])
  .setRotation([Math.SQRT1_2, 0, 0, Math.SQRT1_2])
await save('regador-azul', can)
const flower = model()
flower.shape('caule', tube(0.07, 1.05), '#468453', [0, 0.56, 0])
flower
  .shape('folha-esquerda', ball(), '#72ad6c', [-0.26, 0.45, 0], [0.42, 0.1, 0.19])
  .setRotation([0, 0, -0.25, Math.sqrt(0.9375)])
flower
  .shape('folha-direita', ball(), '#87bc71', [0.25, 0.65, 0], [0.38, 0.1, 0.17])
  .setRotation([0, 0, 0.25, Math.sqrt(0.9375)])
flower.shape('miolo', new SphereGeometry(0.23, 20, 12), '#f6cc6a', [0, 1.17, 0], [1, 0.5, 1])
const animation = flower.doc.createAnimation('florescer')
const times = flower.doc
  .createAccessor()
  .setBuffer(flower.buffer)
  .setType('SCALAR')
  .setArray(new Float32Array([0, 0.65, 1.3]))
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4,
    petal = flower.shape(
      `petala-${i}`,
      new SphereGeometry(1, 18, 12),
      i % 2 ? '#e889a0' : '#f1a4b3',
      [Math.cos(a) * 0.12, 1.34, Math.sin(a) * 0.12],
      [0.16, 0.35, 0.16],
    )
  const output = flower.doc
    .createAccessor()
    .setBuffer(flower.buffer)
    .setType('VEC3')
    .setArray(
      new Float32Array([
        Math.cos(a) * 0.12,
        1.34,
        Math.sin(a) * 0.12,
        Math.cos(a) * 0.3,
        1.36,
        Math.sin(a) * 0.3,
        Math.cos(a) * 0.48,
        1.2,
        Math.sin(a) * 0.48,
      ]),
    )
  const sampler = flower.doc
    .createAnimationSampler()
    .setInput(times)
    .setOutput(output)
    .setInterpolation('LINEAR')
  animation
    .addSampler(sampler)
    .addChannel(
      flower.doc
        .createAnimationChannel()
        .setTargetNode(petal)
        .setTargetPath('translation')
        .setSampler(sampler),
    )
  const sizes = flower.doc
    .createAccessor()
    .setBuffer(flower.buffer)
    .setType('VEC3')
    .setArray(new Float32Array([0.16, 0.35, 0.16, 0.25, 0.24, 0.25, 0.32, 0.1, 0.32]))
  const scale = flower.doc
    .createAnimationSampler()
    .setInput(times)
    .setOutput(sizes)
    .setInterpolation('LINEAR')
  animation
    .addSampler(scale)
    .addChannel(
      flower.doc
        .createAnimationChannel()
        .setTargetNode(petal)
        .setTargetPath('scale')
        .setSampler(scale),
    )
  petal.setExtras({ szSemCaixa: true })
}
await save('flor-do-jardim', flower)
const garden = model()
garden.shape(
  'gramado',
  new CylinderGeometry(12, 12.3, 0.45, 64),
  '#8fb879',
  [0, -0.24, 0],
  [1, 1, 0.64],
)
garden.shape(
  'terra',
  new CylinderGeometry(12.15, 11.8, 0.6, 64),
  '#bd9d74',
  [0, -0.65, 0],
  [1, 1, 0.64],
)
garden.shape(
  'clareira',
  new CylinderGeometry(8.7, 8.7, 0.035, 64),
  '#e8d9b4',
  [0, 0.005, 0],
  [1, 1, 0.42],
)
for (let i = 0; i < 32; i++) {
  const a = (i * Math.PI * 2) / 32,
    x = Math.cos(a) * 10.3,
    z = Math.sin(a) * 6.1
  garden.shape(
    `moita-${i}`,
    ball(),
    ['#579363', '#6caa70', '#80b675'][i % 3]!,
    [x, 0.3, z],
    [0.7 + (i % 3) * 0.15, 0.45 + (i % 2) * 0.25, 0.65],
  )
  for (let j = 0; j < 3; j++)
    garden.shape(
      `folha-${i}-${j}`,
      ball(),
      '#94c582',
      [x + (j - 1) * 0.38, 0.65, z + 0.12],
      [0.29, 0.18, 0.34],
    )
  if (i % 3 === 0) {
    garden.shape(
      `pedra-${i}`,
      new IcosahedronGeometry(1, 1),
      '#8b9ca0',
      [x * 0.92, 0.2, z * 0.95],
      [0.65, 0.45, 0.46],
    )
    garden.shape(
      `pedrinha-${i}`,
      ball(),
      '#a2b0af',
      [x * 0.92 + 0.5, 0.1, z * 0.95 + 0.1],
      [0.32, 0.24, 0.3],
    )
  }
  if (i % 2 === 0)
    for (let j = 0; j < 3; j++)
      garden.shape(
        `flor-pequena-${i}-${j}`,
        ball(),
        j % 2 ? '#f1b3b6' : '#f5d17a',
        [x - 0.3 + j * 0.3, 0.75, z - 0.35],
        [0.15, 0.12, 0.15],
      )
}
await save('jardim-acolhedor', garden)
writeCourseModelRegistry()
writeFileSync(resolve(dir, 'modelos.json'), `${JSON.stringify(catalogue, null, 2)}\n`)
console.log('Jardim: 4 SVGs e 3 modelos com fontes reproduzíveis; biblioteca preservada.')
