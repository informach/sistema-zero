/**
 * Artes do Jardim: os vetores 2D (escritos aqui) e os modelos 3D, feitos no Blender por
 * `../jardim-secreto-blender/build_all.py`. Este script otimiza os GLBs do Blender (solda,
 * deduplica e quantiza, como os da Ilha), publica-os na biblioteca de modelos dos cursos e anota
 * em `modelos.json` o sha, os clipes e a caixa (centro e lado maior, no y para cima do jogo).
 *
 *   JARDIM_OUT=<pasta dos .glb> bun docs/design/jardim-secreto/gerar-artes.ts [--remover-antigos]
 *
 * Sem o Blender instalado, as aulas continuam gerando: o gerador do curso lê só `modelos.json` e a
 * biblioteca.
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

/** Os modelos do Blender: os três do jogo e a pedra da pergunta do ponto de vista. */
const MODELOS = ['jardim-acolhedor', 'regador-azul', 'flor-do-jardim', 'pedra-do-jardim'] as const
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))
const pasta = process.env.JARDIM_OUT ?? resolve(dir, '../jardim-secreto-blender/out')
const anteriores: Record<string, { sha: string }> = existsSync(resolve(dir, 'modelos.json'))
  ? JSON.parse(readFileSync(resolve(dir, 'modelos.json'), 'utf8'))
  : {}
const catalogue: Record<string, unknown> = {}
for (const name of MODELOS) {
  // O cenário é grande e de cores chapadas: normais de 8 bits não aparecem e o arquivo cai ~20%.
  const normalBits = name === 'jardim-acolhedor' ? 8 : 10
  const doc = await io.readBinary(readFileSync(resolve(pasta, `${name}.glb`)))
  // O Blender grava a cor dos vértices em toda peça de uma malha juntada; só o material que
  // lê a cor dos vértices (o chão e a folhagem) precisa dela. Nas outras ela só pesa (e o
  // three.js a multiplicaria pela cor do material).
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const usa = prim.getMaterial()?.getExtras()?.szCorDosVertices === true
      const cor = prim.getAttribute('COLOR_0')
      if (cor && !usa) prim.setAttribute('COLOR_0', null)
    }
  await doc.transform(
    // As animações saem do Blender com uma chave por quadro: tira as que a interpolação refaz.
    resample(),
    weld({ overwrite: true }),
    dedup(),
    quantize({ quantizePosition: 14, quantizeNormal: normalBits }),
    weld({ overwrite: true }),
    quantize({ quantizePosition: 14, quantizeNormal: normalBits }),
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
  console.log(name.padEnd(18), `${(bytes.length / 1024) | 0} KB`)
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
console.log('Jardim: 4 SVGs e 4 modelos do Blender publicados.')
