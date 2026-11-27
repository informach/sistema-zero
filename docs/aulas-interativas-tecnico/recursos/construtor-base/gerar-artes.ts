/**
 * Capas e miniaturas dos cursos-base do Construtor, a partir das artes que vão nos projetos.
 *
 * - Nave Contra Asteroides (2D): a capa é composta com o fundo e os sprites embutidos no projeto
 *   completo; as miniaturas da galeria de aparências são esses mesmos arquivos em PNG.
 * - Patrulha Espacial (3D): a capa é a cena do jogo desenhada com WebGL (Chromium) pela prévia da
 *   arte do Blender (`docs/design/construtor-espaco-blender/previa`), com a mesma luz e câmera do
 *   Jogo 3D; as miniaturas dos modelos vêm da `galeria/` do Blender (`modelo-<peça>.png`).
 *
 * Dependências: sharp, Chromium/Playwright e os GLB de `docs/design/construtor-espaco-blender/out`
 * (gerados por `build_all.py`). Rode só quando a arte mudar.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../../../..')
const requireHere = createRequire(import.meta.url)
let sharp: typeof import('sharp').default
try {
  sharp = requireHere('sharp')
} catch {
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  if (!modules) throw new Error('Instale sharp para gerar as capas.')
  sharp = requireHere(resolve(modules, 'sharp'))
}
const output = resolve(root, 'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte')
mkdirSync(output, { recursive: true })
const blender = resolve(root, 'docs/design/construtor-espaco-blender')
const proto = resolve(root, 'docs/aulas-interativas/construtor/prototipos-base')
const two = JSON.parse(readFileSync(resolve(proto, '2d/nave-2d-completo.szproject.json'), 'utf8'))

// ---- 2D: miniaturas da galeria de aparências (SVG em alta densidade, fundos WebP) ----
const bytesOf = (dataUrl: string) => Buffer.from(dataUrl.split(',')[1]!, 'base64')
const raster = (asset: { dataUrl: string }, altura: number) =>
  sharp(
    bytesOf(asset.dataUrl),
    asset.dataUrl.startsWith('data:image/svg') ? { density: 900 } : {},
  ).resize({
    height: altura,
    fit: 'inside',
  })
const assets2D = new Map<string, { name: string; dataUrl: string; width: number; height: number }>(
  two.assets.map((a: { name: string }) => [a.name, a]),
)
for (const asset of assets2D.values())
  await raster(asset, asset.name.startsWith('cenario-') ? 480 : 512)
    .png()
    .toFile(resolve(output, `${asset.name}.png`))

// ---- 2D: capa composta (fundo do cenário, asteroides, lasers e a nave) ----
const W = 1600
const H = 1400
const pedaco = async (name: string, altura: number, giro = 0) =>
  raster(assets2D.get(name)!, altura)
    .rotate(giro, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
// O fundo do jogo é o cenário 3D em 800 × 480; para a capa, o mesmo cenário em alta resolução.
const glb = resolve(blender, 'out')
if (!existsSync(resolve(glb, 'nave-falcao-azul.glb')))
  throw new Error('Gere os GLB antes: build_all.py em docs/design/construtor-espaco-blender')
const tmp = resolve(root, 'tmp/construtor-capa')
mkdirSync(tmp, { recursive: true })
const previa = (...args: string[]) => {
  const r = spawnSync('node', [resolve(blender, 'previa/previa.mjs'), glb, tmp, ...args], {
    stdio: 'inherit',
  })
  if (r.status !== 0) throw new Error(`A prévia não desenhou: ${args.join(' ')}`)
}
previa('mini', `cenario-orbita:180:${W}x${H}`)
const fundo = await sharp(resolve(tmp, `cenario-orbita-${W}x${H}.png`))
  .png()
  .toBuffer()
const camadas = [
  { input: await pedaco('asteroide-rocha-lunar', 190, -18), left: 230, top: 330 },
  { input: await pedaco('asteroide-gelo-azul', 150, 14), left: 1120, top: 610 },
  { input: await pedaco('asteroide-cristal-violeta', 230, -10), left: 980, top: 880 },
  { input: await pedaco('asteroide-lava-laranja', 130, 30), left: 470, top: 640 },
  { input: await pedaco('laser-ciano', 120), left: 783, top: 820 },
  { input: await pedaco('laser-ciano', 120), left: 783, top: 640 },
  { input: await pedaco('nave-falcao-azul', 360), left: 640, top: 1000 },
]
await sharp(fundo)
  .composite(camadas)
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'capa-construtor-nave.jpg'))
rmSync(resolve(output, 'capa-construtor-nave.svg'), { force: true })

// ---- 3D: miniaturas dos modelos (galeria do Blender) e a capa desenhada com WebGL ----
for (const f of readdirSync(resolve(blender, 'galeria')).filter((f) => f.endsWith('.webp'))) {
  if (f === 'catalogo.webp') continue
  await sharp(resolve(blender, 'galeria', f))
    .png()
    .toFile(resolve(output, `modelo-${f.replace(/\.webp$/, '')}.png`))
}
for (const antigo of [
  'patrulha-nave-provisoria',
  'patrulha-asteroide-provisorio',
  'patrulha-laser-provisorio',
])
  rmSync(resolve(output, `${antigo}.png`), { force: true })
rmSync(resolve(output, 'capa-construtor-patrulha.svg'), { force: true })

previa('capa', 'cenario-orbita', 'nave-falcao-azul', 'asteroide-rocha-lunar', 'laser-ciano')
await sharp(resolve(tmp, 'capa.png'))
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(output, 'capa-construtor-patrulha.jpg'))

console.log(
  JSON.stringify({
    capas: 2,
    miniaturas2D: assets2D.size,
    source:
      'Arte embutida nos projetos e modelos do Blender (docs/design/construtor-espaco-blender).',
  }),
)
