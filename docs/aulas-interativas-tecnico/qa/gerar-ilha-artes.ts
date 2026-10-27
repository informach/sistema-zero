/**
 * A cena das experiências da Ilha do Farol (`scene-island-world.tsx` do member-shell), montada
 * com os MESMOS modelos do Blender que o jogo usa (os módulos da biblioteca de modelos dos
 * cursos, ver `publicar-ilha-modelos.ts`).
 *
 *   bun docs/aulas-interativas-tecnico/qa/gerar-ilha-artes.ts
 *
 * Contrato com a cena: nós de topo `Chave` e `Aventureiro` com a origem no CENTRO da caixa (a
 * cena põe a posição da experiência direto neles), `Pedras` e `Bancada` (o chão das
 * experiências, escondido na vista da ilha inteira). O resto é a ilha, visível só na vista
 * inteira. As animações saem: a cena é parada.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Document, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, prune, quantize, weld } from '@gltf-transform/functions'
import { COURSE_MODELS_DIR } from '../../../packages/studio/scripts/course-models'
import { type IlhaModelo, type IlhaPeca, MODELOS_JSON } from './publicar-ilha-modelos'

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .setLogger(new Logger(Logger.Verbosity.SILENT))
const modelos = JSON.parse(readFileSync(MODELOS_JSON, 'utf8')) as Record<IlhaPeca, IlhaModelo>
const BLENDER_OUT =
  process.env.ILHA_OUT ?? resolve(import.meta.dirname, '../../design/ilha-do-farol-blender/out')

function bytesDaBiblioteca(peca: IlhaPeca): Uint8Array {
  const text = readFileSync(
    resolve(COURSE_MODELS_DIR, `m-${modelos[peca].sha}.generated.ts`),
    'utf8',
  )
  return Buffer.from(/base64,([A-Za-z0-9+/=]+)'/.exec(text)![1]!, 'base64')
}

const cena = new Document()
cena.createBuffer()
const raiz = cena.createScene('Ilha')
cena.getRoot().setDefaultScene(raiz)

/**
 * Junta um modelo à cena num nó de topo `nome`. `origem` = onde fica a origem do Blender;
 * `centro` = em vez disso, o centro da caixa vai na origem do nó (para quem a cena move).
 */
async function juntar(
  bytes: Uint8Array,
  nome: string,
  origem: [number, number, number],
  centro?: [number, number, number],
) {
  const doc = await io.readBinary(bytes)
  for (const a of doc.getRoot().listAnimations()) a.dispose()
  const mapa = mergeDocuments(cena, doc)
  const topo = cena.createNode(nome).setTranslation(origem)
  const dentro = centro
    ? cena.createNode(`${nome}_modelo`).setTranslation(centro.map((v) => -v) as typeof origem)
    : topo
  if (centro) topo.addChild(dentro)
  for (const cenaFonte of doc.getRoot().listScenes())
    for (const no of cenaFonte.listChildren()) dentro.addChild(mapa.get(no) as typeof topo)
  for (const s of cena.getRoot().listScenes()) if (s !== raiz) s.dispose()
  raiz.addChild(topo)
}

await juntar(bytesDaBiblioteca('cenario-praia-tropical'), 'Ilha', [0, 0, 0])
await juntar(bytesDaBiblioteca('farol-listrado'), 'Farol', [5.2, 0, 0.1])
await juntar(bytesDaBiblioteca('veleiro'), 'Veleiro', [8.5, -0.1, 4.5])
await juntar(bytesDaBiblioteca('pedras'), 'Pedras', [-2, 0, -1])
await juntar(
  bytesDaBiblioteca('aventureiro'),
  'Aventureiro',
  [-6.5, 0.8, 0.75],
  modelos.aventureiro.center,
)
await juntar(
  bytesDaBiblioteca('chave-dourada'),
  'Chave',
  [-3, 1, -2],
  modelos['chave-dourada'].center,
)
// A bancada só existe para esta cena: sai direto do Blender (`build_all.py -- bancada`).
await juntar(readFileSync(resolve(BLENDER_OUT, 'bancada.glb')), 'Bancada', [0, 0, 0])

// Um buffer só (o merge traz um por documento) e a mesma otimização da biblioteca.
const buffer = cena.getRoot().listBuffers()[0]!
for (const a of cena.getRoot().listAccessors()) a.setBuffer(buffer)
for (const b of cena.getRoot().listBuffers()) if (b !== buffer) b.dispose()
await cena.transform(
  weld({ overwrite: true }),
  dedup(),
  quantize({ quantizePosition: 14, quantizeNormal: 10 }),
  prune(),
)
const bytes = await io.writeBinary(cena)
writeFileSync(
  resolve(import.meta.dirname, '../../../packages/studio/src/arte/ilha-farol-scene.generated.ts'),
  `// Gerado por gerar-ilha-artes.ts com os modelos do Blender. Não edite.\nexport const ILHA_SCENE_GLB = ${JSON.stringify(`data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}`)}\n`,
)
console.log('Cena das experiências:', bytes.length, 'bytes')
