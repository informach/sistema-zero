/**
 * A arte 3D dos exemplos Raylib sai do PRÓPRIO Molda, pelos mesmos caminhos que a criança usa:
 *
 * - "Modelos prontos" do Criar novo (nave, carro, árvore, casa, personagem, cristais), com cada
 *   peça PINTADA da própria cor (balde no Pintar). Pintada, a cor sai igual no raylib: a cor lisa
 *   vai no GLB como fator linear, e o raylib do computador não converte, então ela escurece.
 * - Bonecos de uma peça com ossos: uma forma, "Montar os ossos" de baixo para cima, os pesos
 *   sugeridos e os movimentos prontos ("balançar" para correr, "quicar" para pular).
 * - Texturas (a folha de pixels do Molda) e um céu, que entra no Raylib como PNG panorâmico.
 *
 * Tudo sai pelo exportador do "Trazer do Molda" (`encodeSceneGlb` com `animatedPaint`,
 * `exportTexturePng`, `exportSkyHdr`). Um exemplo só usa o que a criança refaz no Molda.
 *
 *     bun --no-env-file scripts/raylib/molda-models.ts          # grava
 *     bun --no-env-file scripts/raylib/molda-models.ts --check  # confere sem gravar
 *
 * Fica fora do typecheck do Estúdio de propósito: lê o código-fonte do Molda (só aqui, na
 * geração). O jogo e o runtime nunca importam o Molda; eles recebem os arquivos gravados.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createSkyAsset, createTextureAsset } from '../../../molda/src/core/model'
import { encodeSceneGlb } from '../../../molda/src/export/sceneGlb'
import { exportSkyHdr } from '../../../molda/src/export/skyHdr'
import { exportTexturePng } from '../../../molda/src/export/texturePng'
import { createSceneAnimationPreset } from '../../../molda/src/scene/animationPresets'
import { addScenePrimitive } from '../../../molda/src/scene/commands'
import { createSceneProject } from '../../../molda/src/scene/createProject'
import type { MoldaSceneDocument } from '../../../molda/src/scene/document'
import { ensureScenePaintSurface } from '../../../molda/src/scene/paintSurface'
import { prepareSceneRig } from '../../../molda/src/scene/rigBuilder'
import { createSceneSkin } from '../../../molda/src/scene/skinCommands'
import {
  prepareSceneSkinSuggestion,
  suggestSceneSkinWeights,
} from '../../../molda/src/scene/skinSuggestion'
import type { MoldaTemplateId } from '../../../molda/src/templates/catalog'
import { skyPanoramaPng } from '../../src/components/assets/skyPanorama'

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))

// Ids sorteados viram uma sequência fixa: o mesmo modelo dá os mesmos bytes em toda geração.
let next = 0
const ids = () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`
crypto.randomUUID = ids as typeof crypto.randomUUID
const fresh = () => {
  next = 0
}

// A paleta Arcade do Molda (a padrão), pelos índices: 0 é "sem tinta".
const ARCADE = {
  branco: 1,
  vermelho: 2,
  rosa: 3,
  laranja: 4,
  amarelo: 5,
  turquesa: 6,
  verde: 7,
  azul: 8,
  ciano: 9,
  roxo: 10,
  lilas: 11,
  ameixa: 12,
  bege: 13,
  marrom: 14,
  preto: 15,
} as const
type Cor = keyof typeof ARCADE

/** Balde do Pintar na peça inteira: os texels sem tinta ficam com a cor da peça. */
function paintWhole(document: MoldaSceneDocument, nodeId: string, color?: number) {
  const node = document.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('peça sem malha')
  const material = document.materials.find((entry) => entry.id === node.materialId)!
  const base =
    color ?? (material.baseColor.kind === 'palette' ? material.baseColor.index : ARCADE.branco)
  const surface = ensureScenePaintSurface(document, { nodeId }, ids)
  if (surface.status !== 'ready') throw new Error(`a peça ${node.name} não pinta inteira`)
  const { imageId, layerId } = surface.target
  return {
    ...surface.document,
    images: surface.document.images.map((image) =>
      image.id !== imageId
        ? image
        : {
            ...image,
            layers: image.layers.map((layer) => {
              if (layer.id !== layerId) return layer
              const pixels = layer.pixels.slice()
              for (let i = 0; i < pixels.length; i++) if (pixels[i] === 0) pixels[i] = base
              return { ...layer, pixels }
            }),
          },
    ),
  }
}

function glb(document: MoldaSceneDocument, accepted: readonly string[] = []) {
  const { bytes, issues } = encodeSceneGlb(document, {
    animatedPaint: true,
    allowLosses: accepted.length > 0,
  })
  const surprise = issues.filter((issue) => !accepted.includes(issue.code))
  if (surprise.length)
    throw new Error(`${document.name}: o Molda avisou ${surprise.map((i) => i.code)}`)
  return bytes
}

/** Um modelo pronto do Criar novo, com cada peça pintada da própria cor. */
function template(templateId: MoldaTemplateId, name: string) {
  fresh()
  let document = createSceneProject({ kind: 'template', templateId, name })
  for (const node of document.nodes)
    if (node.kind === 'mesh') document = paintWhole(document, node.id)
  return glb(document)
}

interface Movimento {
  kind: 'bounce' | 'sway' | 'spin'
  name: string
  duration: number
  axis: 'x' | 'y' | 'z'
  amount: number
  /** O osso da cadeia (0 é o de baixo). */
  bone: number
}

/**
 * Um boneco de uma peça com ossos, como na oficina: a forma, "Montar os ossos" com os pontos de
 * baixo para cima, os pesos sugeridos por segmentos e os movimentos prontos nos ossos.
 */
function creature(input: {
  name: string
  shape: 'cylinder' | 'box' | 'sphere'
  size: [number, number, number]
  color: Cor
  bones: number
  moves: readonly Movimento[]
}) {
  fresh()
  let document = createSceneProject({ kind: 'empty', name: input.name })
  document = addScenePrimitive(document, input.shape, 'corpo', ids)
  const body = document.nodes.at(-1)!
  const [sx, sy, sz] = input.size
  document = {
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === body.id
        ? {
            ...node,
            transform: {
              kind: 'trs' as const,
              translation: [0, sy, 0] as [number, number, number],
              rotation: [0, 0, 0, 1] as [number, number, number, number],
              scale: [sx, sy, sz] as [number, number, number],
            },
          }
        : node,
    ),
  }
  const height = sy * 2
  const points = Array.from(
    { length: input.bones },
    (_, i) => [0, (height * i) / (input.bones - 1), 0] as [number, number, number],
  )
  const rig = prepareSceneRig(document, body.id, points, 'front', ids)
  const { weights } = suggestSceneSkinWeights(
    prepareSceneSkinSuggestion(rig.document, {
      nodeId: body.id,
      jointIds: rig.jointIds,
      method: 'segments',
    }),
  )
  document = createSceneSkin(
    rig.document,
    { name: 'Ossos', nodeId: body.id, jointIds: rig.jointIds, weights },
    ids,
  )
  document = paintWhole(document, body.id, ARCADE[input.color])
  for (const move of input.moves) {
    const { bone, ...options } = move
    document = createSceneAnimationPreset(document, [rig.jointIds[bone]!], options, ids)
  }
  // Os avisos que o "Trazer do Molda" mostra para a criança aceitar num boneco com ossos.
  return glb(document, ['skin-render-space', 'animation-resampled', 'skin-precision'])
}

/** Uma textura do Molda (a folha de pixels sem emenda) a partir de um desenho em letras. */
function texture(name: string, rows: readonly string[], cores: Record<string, Cor>) {
  const size = rows.length as 16
  const asset = createTextureAsset({ name, size, paletteId: 'arcade', now: 0 })
  rows.forEach((row, y) => {
    if (row.length !== size) throw new Error(`${name}: a linha ${y} não tem ${size} pixels`)
    for (let x = 0; x < size; x++) {
      const letter = row[x]!
      const index = letter === '.' ? 0 : ARCADE[cores[letter]!]
      if (index === undefined) throw new Error(`${name}: a letra ${letter} não tem cor`)
      asset.bitmap.data[y * size + x] = index
    }
  })
  const png = exportTexturePng(asset)
  if (!png.ok) throw new Error(`${name}: a textura não coube`)
  return png.bytes
}

/** O céu do Molda, como entra num projeto Raylib 3D: PNG panorâmico (o raylib não abre .hdr). */
function sky(name: string, preset: 'dia' | 'entardecer' | 'noite' | 'nublado' | 'alienigena') {
  const hdr = exportSkyHdr(createSkyAsset({ name, preset, now: 0 }), { width: 512, height: 256 })
  if (!hdr.ok) throw new Error(`${name}: o céu não coube`)
  return new Uint8Array(Buffer.from(skyPanoramaPng(hdr.dataUrl).dataUrl.split(',')[1]!, 'base64'))
}

/** Um ruído de pixels determinístico, para as texturas: 0 a 1 por texel. */
function noise(x: number, y: number, seed: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2246822519, 3266489917)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function speckled(base: string, dots: readonly [string, number][], seed: number) {
  return Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => {
      const roll = noise(x, y, seed)
      let total = 0
      for (const [letter, share] of dots) {
        total += share
        if (roll < total) return letter
      }
      return base
    }).join(''),
  )
}

const TIJOLO = [
  'nnnnnnnsnnnnnnns',
  'nnnnnnnsnnnnnnns',
  'nnnnnnnsnnnnnnns',
  'ssssssssssssssss',
  'nnnsnnnnnnnsnnnn',
  'nnnsnnnnnnnsnnnn',
  'nnnsnnnnnnnsnnnn',
  'ssssssssssssssss',
  'nnnnnnnsnnnnnnns',
  'nnnnnnnsnnnnnnns',
  'nnnnnnnsnnnnnnns',
  'ssssssssssssssss',
  'nnnsnnnnnnnsnnnn',
  'nnnsnnnnnnnsnnnn',
  'nnnsnnnnnnnsnnnn',
  'ssssssssssssssss',
]
const MADEIRA = [
  'nnnnnnnknnnnnnnk',
  'nnnnonnknnnnnnnk',
  'nnnnonnknnonnnnk',
  'nnnnnnnknnonnnnk',
  'nonnnnnknnnnnnnk',
  'nonnnnnknnnnnonk',
  'nnnnnnnknnnnnonk',
  'nnnnnonknnnnnnnk',
  'nnnnnonknonnnnnk',
  'nnnnnnnknonnnnnk',
  'nnonnnnknnnnnnnk',
  'nnonnnnknnnnonnk',
  'nnnnnnnknnnnonnk',
  'nnnnnnoknnnnnnnk',
  'nnnnnnoknnnonnnk',
  'nnnnnnnknnnonnnk',
]
const PAREDE = [
  'ldddddddddddddld',
  'dlllllllllllllld',
  'dlddddddddddddld',
  'dldlllllllllldld',
  'dldldddddddddld',
  'dldlddddddddldld',
  'dldldlllllldldld',
  'dldldlddddldldld',
  'dldldlddddldldld',
  'dldldlllllldldld',
  'dldldddddddddld',
  'dldlllllllllldld',
  'dldldddddddddld',
  'dlddddddddddddld',
  'dlllllllllllllld',
  'ldddddddddddddld',
].map((row) => row.padEnd(16, 'd'))
const CAIXA = [
  'kkkkkkkkkkkkkkkk',
  'knnnnnnnnnnnnnnk',
  'knknnnnnnnnnnknk',
  'knnknnnnnnnnknnk',
  'knnnknnnnnnknnnk',
  'knnnnknnnnknnnnk',
  'knnnnnknnknnnnnk',
  'knnnnnnkknnnnnnk',
  'knnnnnnkknnnnnnk',
  'knnnnnknnknnnnnk',
  'knnnnknnnnknnnnk',
  'knnnknnnnnnknnnk',
  'knnknnnnnnnnknnk',
  'knknnnnnnnnnnknk',
  'knnnnnnnnnnnnnnk',
  'kkkkkkkkkkkkkkkk',
]

/** Caminho (a partir de scripts/raylib) → bytes. */
export function moldaModels(): Record<string, Uint8Array> {
  const terra = speckled(
    'n',
    [
      ['k', 0.12],
      ['o', 0.08],
    ],
    2,
  )
  const grama = speckled(
    'g',
    [
      ['t', 0.18],
      ['y', 0.05],
    ],
    1,
  )
  const blocks: Record<string, Uint8Array> = {
    'images/grama.png': texture('grama', grama, { g: 'verde', t: 'turquesa', y: 'amarelo' }),
    'images/terra.png': texture('terra', terra, { n: 'marrom', k: 'preto', o: 'laranja' }),
    'images/grama-com-terra.png': texture(
      'grama-com-terra',
      [...grama.slice(0, 4), ...terra.slice(4)],
      { g: 'verde', t: 'turquesa', y: 'amarelo', n: 'marrom', k: 'preto', o: 'laranja' },
    ),
    'images/tijolo.png': texture('tijolo', TIJOLO, { n: 'vermelho', s: 'bege' }),
    'images/madeira.png': texture('madeira', MADEIRA, { n: 'marrom', o: 'laranja', k: 'preto' }),
    'images/folhas.png': texture(
      'folhas',
      speckled(
        'g',
        [
          ['t', 0.3],
          ['k', 0.06],
        ],
        3,
      ),
      {
        g: 'verde',
        t: 'turquesa',
        k: 'preto',
      },
    ),
    'images/areia.png': texture(
      'areia',
      speckled(
        's',
        [
          ['y', 0.2],
          ['o', 0.05],
        ],
        4,
      ),
      {
        s: 'bege',
        y: 'amarelo',
        o: 'laranja',
      },
    ),
    'images/lava.png': texture(
      'lava',
      speckled(
        'r',
        [
          ['o', 0.35],
          ['y', 0.12],
        ],
        5,
      ),
      {
        r: 'vermelho',
        o: 'laranja',
        y: 'amarelo',
      },
    ),
  }
  const meteoro = (cor: Cor, sombra: Cor, seed: number) =>
    texture(
      `meteoro-${cor}`,
      speckled(
        'a',
        [
          ['b', 0.3],
          ['k', 0.06],
        ],
        seed,
      ),
      {
        a: cor,
        b: sombra,
        k: 'preto',
      },
    )
  return {
    // Cenas-gabarito do e2e.
    'scenes/assets/models/molda-nave.glb': (() => {
      fresh()
      const document = createSceneProject({ kind: 'template', templateId: 'nave', name: 'nave' })
      return glb(document)
    })(),
    // Personagem com esqueleto e dois movimentos, gravado pelo Molda (contrato do lote 117).
    'scenes/assets/models/molda-pesos.glb': fixture('molda-skinned.json'),

    // Modelos do Molda (lição 2): os modelos prontos.
    'models/modelos-do-molda/models/nave.glb': template('nave', 'nave'),
    'models/modelos-do-molda/models/carro.glb': template('carro', 'carro'),
    'models/modelos-do-molda/models/arvore.glb': template('arvore', 'arvore'),
    'models/modelos-do-molda/models/casa.glb': template('casa', 'casa'),

    // Caixas que se Encostam (lição 3).
    'models/caixas-que-se-encostam/images/caixa.png': texture('caixa', CAIXA, {
      k: 'preto',
      n: 'laranja',
    }),

    // Clarão com Shader (lição 4).
    'models/clarao-com-shader/models/personagem.glb': template('personagem', 'personagem'),

    // Corrida Infinita.
    'models/corrida-infinita/models/corredor.glb': creature({
      name: 'corredor',
      shape: 'cylinder',
      size: [0.45, 0.9, 0.45],
      color: 'verde',
      bones: 4,
      moves: [
        { kind: 'sway', name: 'Correr', duration: 0.4, axis: 'z', amount: 20, bone: 1 },
        { kind: 'bounce', name: 'Pular', duration: 0.6, axis: 'y', amount: 0.4, bone: 2 },
      ],
    }),
    'models/corrida-infinita/models/robo.glb': creature({
      name: 'robo',
      shape: 'box',
      size: [0.5, 0.8, 0.5],
      color: 'lilas',
      bones: 3,
      moves: [{ kind: 'sway', name: 'Andar', duration: 0.5, axis: 'x', amount: 15, bone: 1 }],
    }),
    'models/corrida-infinita/models/cristal.glb': template('cristal', 'cristal'),
    'models/corrida-infinita/images/chao.png': blocks['images/grama.png']!,
    'models/corrida-infinita/images/ceu.png': sky('ceu', 'dia'),

    // Patrulha Espacial.
    'models/patrulha-espacial/models/nave.glb': template('nave', 'nave'),
    'models/patrulha-espacial/images/chao.png': texture(
      'chao',
      speckled(
        'd',
        [
          ['v', 0.1],
          ['k', 0.2],
        ],
        6,
      ),
      { d: 'ameixa', v: 'roxo', k: 'preto' },
    ),
    'models/patrulha-espacial/images/meteoro-vermelho.png': meteoro('vermelho', 'laranja', 7),
    'models/patrulha-espacial/images/meteoro-verde.png': meteoro('verde', 'turquesa', 8),
    'models/patrulha-espacial/images/meteoro-laranja.png': meteoro('laranja', 'amarelo', 9),
    'models/patrulha-espacial/images/meteoro-roxo.png': meteoro('roxo', 'lilas', 10),

    // Labirinto dos Robôs.
    'models/labirinto-dos-robos/images/parede.png': texture('parede', PAREDE, {
      d: 'azul',
      l: 'ciano',
    }),
    'models/labirinto-dos-robos/images/chao.png': texture(
      'chao',
      speckled('m', [['l', 0.15]], 11),
      { m: 'ameixa', l: 'lilas' },
    ),
    'models/labirinto-dos-robos/images/ceu.png': sky('ceu', 'noite'),

    // Mundo de Blocos: as oito texturas.
    ...Object.fromEntries(
      Object.entries(blocks).map(([path, bytes]) => [`models/mundo-de-blocos/${path}`, bytes]),
    ),
  }
}

function fixture(file: string) {
  const json = JSON.parse(
    readFileSync(
      join(HERE, '../../src/official-extensions/game-3d-advanced/__tests__/fixtures', file),
      'utf8',
    ),
  ) as { dataUrl: string }
  return new Uint8Array(Buffer.from(json.dataUrl.split(',')[1]!, 'base64'))
}

if (import.meta.main) {
  const check = process.argv.includes('--check')
  let stale = 0
  for (const [path, bytes] of Object.entries(moldaModels())) {
    const target = join(HERE, path)
    let current: Uint8Array | null = null
    try {
      current = readFileSync(target)
    } catch {}
    const same = current !== null && Buffer.compare(Buffer.from(current), Buffer.from(bytes)) === 0
    if (same) continue
    stale++
    if (check) console.error(`desatualizado: ${path}`)
    else {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, bytes)
      console.log(`gravado: ${path} (${bytes.length} bytes)`)
    }
  }
  if (check && stale) process.exit(1)
}
