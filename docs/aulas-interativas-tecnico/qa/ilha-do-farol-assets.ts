import { readFileSync } from 'node:fs'
import {
  COURSE_MODEL_LIB_PREFIX,
  courseModelStub,
} from '../../../packages/studio/src/core/courseModels'
import type { ProjectAsset } from '../../../packages/studio/src/core/project'
import { type IlhaModelo, type IlhaPeca, MODELOS_JSON } from './publicar-ilha-modelos'

/**
 * Os modelos da Ilha do Farol vêm do Blender (`docs/design/ilha-do-farol-blender`), publicados
 * na biblioteca de modelos dos cursos por `publicar-ilha-modelos.ts`. O projeto leva só a
 * REFERÊNCIA de cada um (o GLB mínimo com os nomes das animações); o Estúdio carrega o arquivo.
 *
 * Os nomes são os mesmos das imagens da Chave do Farol em 2D: na personalização a criança
 * escolhe "pirata" ou "barco-pirata" nos dois cursos. Cada categoria tem UMA caixa (o build do
 * Blender confere), então trocar o modelo não muda tamanho, centro nem área de toque.
 */
const modelos = JSON.parse(readFileSync(MODELOS_JSON, 'utf8')) as Record<IlhaPeca, IlhaModelo>

/** O nome do asset (o que aparece na lista do bloco) de cada peça do Blender. */
const nomeDoAsset = (peca: IlhaPeca) => peca.replace(/^cenario-/, '')

function referencia(peca: IlhaPeca): ProjectAsset {
  const m = modelos[peca]
  if (!m) throw new Error(`Modelo ausente em modelos.json: ${peca}`)
  const name = nomeDoAsset(peca)
  return {
    id: `ilha-modelo-${peca}`,
    name,
    kind: 'model3d',
    source: 'library',
    libId: `${COURSE_MODEL_LIB_PREFIX}${m.sha}`,
    originalFileName: `${name}.glb`,
    dataUrl: courseModelStub(m.sha, m.clips),
  }
}

export const ILHA_PERSONAGENS = [
  'aventureiro',
  'menina-de-laco',
  'marinheira',
  'menino-de-bone',
  'exploradora-de-chapeu',
  'pirata',
  'mergulhador',
  'robo',
] as const satisfies readonly IlhaPeca[]
export const ILHA_CENARIOS = [
  'cenario-praia-tropical',
  'cenario-costa-rochosa',
  'cenario-ilha-nevada',
  'cenario-noite-na-ilha',
] as const satisfies readonly IlhaPeca[]
export const ILHA_BARCOS = [
  'veleiro',
  'barco-de-pesca',
  'lancha',
  'barco-pirata',
] as const satisfies readonly IlhaPeca[]
export const ILHA_CHAVES = [
  'chave-dourada',
  'chave-prateada',
  'chave-de-estrela',
] as const satisfies readonly IlhaPeca[]
export const ILHA_FAROIS = [
  'farol-listrado',
  'farol-de-pedra',
  'farol-de-madeira',
  'farol-colorido',
] as const satisfies readonly IlhaPeca[]

/** O que cada objeto do jogo usa no começo do curso (a versão do vídeo e do caderno). */
export const ILHA_PADRAO = {
  cenario: 'cenario-praia-tropical',
  pedra: 'pedras',
  farol: 'farol-listrado',
  barco: 'veleiro',
  personagem: 'aventureiro',
  chave: 'chave-dourada',
} as const satisfies Record<string, IlhaPeca>
export type IlhaObjeto = keyof typeof ILHA_PADRAO

export interface IlhaModel {
  asset: ProjectAsset
  /** Centro da caixa no y para cima do jogo (para pôr o modelo no lugar do Blender). */
  center: [number, number, number]
  /** Lado maior: o `size` que mantém o tamanho do Blender. */
  size: number
  clips: string[]
}
export function ilhaModelo(peca: IlhaPeca): IlhaModel {
  const m = modelos[peca]
  return { asset: referencia(peca), center: m.center, size: m.size, clips: m.clips }
}
/** O nome do asset da peça (o valor do bloco "Criar o objeto … com o modelo"). */
export const ilhaNome = nomeDoAsset

export const ILHA_MODELS = Object.fromEntries(
  Object.entries(ILHA_PADRAO).map(([objeto, peca]) => [objeto, ilhaModelo(peca)]),
) as Record<IlhaObjeto, IlhaModel>

/** Todas as peças no projeto desde a primeira aula: a personalização só troca o nome. */
export const ILHA_ASSETS: ProjectAsset[] = [
  ...ILHA_CENARIOS,
  'pedras' as const,
  ...ILHA_FAROIS,
  ...ILHA_BARCOS,
  ...ILHA_CHAVES,
  ...ILHA_PERSONAGENS,
].map(referencia)
