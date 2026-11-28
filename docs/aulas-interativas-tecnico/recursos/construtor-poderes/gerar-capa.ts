/**
 * A capa de cada Poder do Construtor (do curso e do Passo a passo): a cena da Patrulha Espacial
 * desenhada com WebGL pela prévia da arte espacial (`docs/design/construtor-espaco-blender/previa`,
 * modo `capa`), com a nave, os asteroides, os lasers e as peças do Poder, gravada em JPEG em
 * `caderno-visual/arte/capa-<poder>.jpg`.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-capa.ts escudo
 *
 * Precisa dos GLB das duas pastas do Blender (`out/` da arte espacial e dos Poderes).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

/** As peças a mais de cada capa: "modelo:tamanho:x:y:z" (no referencial do jogo 3D). */
export const CAPAS: Record<string, string[]> = {
  escudo: ['item-escudo-redondo:2.2:0:2.2:-4.5'],
  triplo: ['item-triplo-redondo:2.2:-2.4:2.2:-4.5'],
  inimigo: ['inimiga-garra-vermelha:3.2:0:2.4:-9', 'laser-inimigo-vermelho:1.1:0:2.1:-5.5'],
  chefao: ['chefao-cruzador:7:0:3.4:-8'],
}

const poder = process.argv[2] ?? ''
const extras = CAPAS[poder]
if (!extras) throw Error(`Poder sem capa: ${poder} (${Object.keys(CAPAS).join(', ')})`)
const root = resolve(import.meta.dir, '../../../..')
const espaco = resolve(root, 'docs/design/construtor-espaco-blender')
const poderes = resolve(root, 'docs/design/construtor-poderes-blender')
const tmp = resolve(root, 'tmp/poderes-capa')
const glb = resolve(tmp, 'glb')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(glb, { recursive: true })
for (const pasta of [espaco, poderes])
  for (const f of readdirSync(resolve(pasta, 'out')))
    if (f.endsWith('.glb')) symlinkSync(resolve(pasta, 'out', f), resolve(glb, f))
execFileSync(
  'node',
  [
    resolve(espaco, 'previa/previa.mjs'),
    glb,
    tmp,
    'capa',
    'cenario-orbita',
    'nave-falcao-azul',
    'asteroide-rocha-lunar',
    'laser-ciano',
    ...extras,
  ],
  { stdio: 'inherit' },
)
const sharp = createRequire(resolve(import.meta.dir, '../construtor-base/gerar-artes.ts'))('sharp')
await sharp(resolve(tmp, 'capa.png'))
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(import.meta.dir, `../caderno-visual/arte/capa-${poder}.jpg`))
console.log(`capa-${poder}.jpg`)
