/**
 * A capa do Passo a passo da Estação de Reciclagem (e do curso): a cena do galpão 3D desenhada com
 * WebGL pela prévia das peças (`docs/design/construtor-estacao-blender/previa`), com as peças de
 * partida, gravada em JPEG em `caderno-visual/arte/capa-estacao-reciclagem.jpg`.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/gerar-capa.ts
 *
 * Precisa dos GLB do Blender em `docs/design/construtor-estacao-blender/out` (`build_all.py`).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { ESTACAO_PADRAO } from '../../qa/estacao-projeto'

const root = resolve(import.meta.dir, '../../../..')
const blender = resolve(root, 'docs/design/construtor-estacao-blender')
const tmp = resolve(root, 'tmp/estacao-capa')
mkdirSync(tmp, { recursive: true })
const p = ESTACAO_PADRAO
execFileSync(
  'node',
  [
    resolve(blender, 'previa/previa.mjs'),
    resolve(blender, 'out'),
    tmp,
    'capa',
    p.galpao,
    p.coletor,
    p.reciclavel,
    p.proibido,
  ],
  { stdio: 'inherit' },
)
const sharp = createRequire(resolve(import.meta.dir, '../construtor-base/gerar-artes.ts'))('sharp')
await sharp(resolve(tmp, 'capa.png'))
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(resolve(import.meta.dir, '../caderno-visual/arte/capa-estacao-reciclagem.jpg'))
console.log('capa-estacao-reciclagem.jpg')
