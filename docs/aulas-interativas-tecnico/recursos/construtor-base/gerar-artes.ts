/**
 * Capas e miniaturas a partir das artes dos projetos aprovados.
 * Não cria modelos novos. SVGRenderer projeta as malhas GLB originais;
 * esta ilustração editorial não é uma captura da prévia WebGL do Estúdio.
 * Dependências de produção: three, happy-dom e sharp (além de Bun).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dir, '../../../..')
const requireStudio = createRequire(resolve(root, 'packages/studio/package.json'))
const requireHere = createRequire(import.meta.url)
// Addons importam a distribuição ESM; a mesma instância evita instanceof falso.
const THREE = await import(
  pathToFileURL(resolve(dirname(requireStudio.resolve('three')), 'three.module.js')).href
)
const { SVGRenderer } = await import(
  pathToFileURL(requireStudio.resolve('three/addons/renderers/SVGRenderer.js')).href
)
const { GLTFLoader } = await import(
  pathToFileURL(requireStudio.resolve('three/addons/loaders/GLTFLoader.js')).href
)
const { Window } = await import(pathToFileURL(requireStudio.resolve('happy-dom')).href)
let sharp: typeof import('sharp').default
try {
  sharp = requireHere('sharp')
} catch {
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  if (!modules) throw new Error('Instale sharp para gerar as capas.')
  sharp = requireHere(resolve(modules, 'sharp'))
}
globalThis.document = new Window().document as unknown as Document
const output = resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte')
mkdirSync(output, { recursive: true })
const proto = resolve(root, 'docs/aulas-interativas/construtor/prototipos-base')
const two = JSON.parse(readFileSync(resolve(proto, '2d/nave-2d-completo.szproject.json'), 'utf8'))
const three = JSON.parse(
  readFileSync(resolve(proto, '3d/patrulha-espacial-3d-completo.szproject.json'), 'utf8'),
)
const assets = new Map(
  two.assets.map((a: { name: string; dataUrl: string }) => [a.name, a.dataUrl]),
)
// Miniaturas rasterizadas pela mesma geometria SVG, com recorte do próprio arquivo.
for (const asset of two.assets)
  if (asset.kind === 'image') {
    await sharp(Buffer.from(asset.dataUrl.split(',')[1], 'base64'))
      .png()
      .toFile(resolve(output, `${asset.name}.png`))
  }
const use = (name: string, x: number, y: number, w: number, h: number, rotation = 0) =>
  `<image href="${assets.get(name)}" x="${x}" y="${y}" width="${w}" height="${h}" transform="rotate(${rotation} ${x + w / 2} ${y + h / 2})"/>`
const twoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1400" viewBox="0 0 1600 1400">
  <rect width="1600" height="1400" fill="#07152b"/>
  ${use('cenario-aurora', 0, 0, 1600, 1400)}
  ${use('asteroide-rocha-lunar', 260, 250, 170, 170, -18)}
  ${use('asteroide-rocha-lunar', 1130, 150, 130, 130, 14)}
  ${use('asteroide-rocha-lunar', 1030, 490, 220, 220, -12)}
  ${use('asteroide-rocha-lunar', 610, 70, 110, 110, 31)}
  ${use('laser-ciano', 790, 370, 35, 126)}
  ${use('laser-ciano', 790, 560, 35, 126)}
  ${use('nave-falcao-azul', 670, 750, 280, 320)}
</svg>`
await sharp(Buffer.from(twoSvg))
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'capa-construtor-nave.jpg'))
writeFileSync(resolve(output, 'capa-construtor-nave.svg'), twoSvg)

const models = new Map<string, InstanceType<typeof THREE.Group>>()
for (const asset of three.assets) {
  if (asset.kind !== 'model3d') continue
  const bytes = Buffer.from(asset.dataUrl.split(',')[1], 'base64')
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
  const model = gltf.scene
  const bounds = new THREE.Box3().setFromObject(model)
  const center = bounds.getCenter(new THREE.Vector3())
  model.position.sub(center)
  const holder = new THREE.Group()
  holder.add(model)
  models.set(asset.name, holder)
}
function lighting(scene: InstanceType<typeof THREE.Scene>) {
  scene.add(new THREE.AmbientLight('#ffffff', 1.1))
  const light = new THREE.DirectionalLight('#ffffff', 1.6)
  light.position.set(4, 8, 8)
  scene.add(light)
}
function projected(
  scene: InstanceType<typeof THREE.Scene>,
  camera: InstanceType<typeof THREE.Camera>,
  width: number,
  height: number,
  sky = false,
) {
  const renderer = new SVGRenderer()
  renderer.setSize(width, height)
  renderer.setPrecision(3)
  renderer.setClearColor('#07152b', sky ? 1 : 0)
  scene.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)
  renderer.render(scene, camera)
  let svg = renderer.domElement.outerHTML
  if (sky) {
    let stars = `<rect x="-${width / 2}" y="-${height / 2}" width="${width}" height="${height}" fill="#07152b"/>`
    for (let i = 0; i < 120; i++) {
      const x = ((i * 293 + 59) % width) - width / 2
      const y = ((i * 137 + 23) % height) - height / 2
      stars += `<circle cx="${x}" cy="${y}" r="${i % 5 === 0 ? 2.2 : 1.2}" fill="${i % 3 === 0 ? '#99c6ed' : '#ffffff'}" opacity="${i % 4 === 0 ? 0.8 : 0.35}"/>`
    }
    svg = svg.replace(/(<svg[^>]*>)/, `$1${stars}`)
  }
  return svg
}
const scene = new THREE.Scene()
lighting(scene)
const ship = models.get('patrulha-nave-provisoria')!.clone(true)
ship.position.set(0, 0, 0.5)
scene.add(ship)
for (const [x, y, z] of [
  [-3.4, 0, -6],
  [2.9, 0, -10],
  [1, 0, -19],
  [-1.9, 0, -15],
]) {
  const meteor = models.get('patrulha-asteroide-provisorio')!.clone(true)
  meteor.position.set(x, y, z)
  scene.add(meteor)
}
for (const z of [-2, -5]) {
  const laser = models.get('patrulha-laser-provisorio')!.clone(true)
  laser.position.set(0, 0, z)
  scene.add(laser)
}
const camera = new THREE.PerspectiveCamera(49, 1600 / 1400, 0.1, 200)
camera.position.set(0, 8.8, 10)
camera.lookAt(0, 0, -5)
const threeSvg = projected(scene, camera, 1600, 1400, true)
await sharp(Buffer.from(threeSvg))
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'capa-construtor-patrulha.jpg'))
writeFileSync(resolve(output, 'capa-construtor-patrulha.svg'), threeSvg)
for (const [name, model] of models) {
  const thumbScene = new THREE.Scene()
  lighting(thumbScene)
  thumbScene.add(model.clone(true))
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
  const max = Math.max(size.x, size.y, size.z)
  const thumbCam = new THREE.PerspectiveCamera(42, 4 / 3, 0.01, 100)
  thumbCam.position.set(max * 0.65, max * 1.25, max * 1.75)
  thumbCam.lookAt(0, 0, 0)
  const svg = projected(thumbScene, thumbCam, 800, 600)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(resolve(output, `${name}.png`))
}
console.log(
  JSON.stringify({
    capas: 2,
    modelos: models.size,
    source:
      'Projetos aprovados do Construtor; somente composição e projeção das artes incorporadas.',
  }),
)
