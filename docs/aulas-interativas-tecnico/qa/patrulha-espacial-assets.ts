/**
 * Os modelos da Patrulha Espacial: as 16 peças do Blender (`docs/design/construtor-espaco-blender`),
 * publicadas na biblioteca de modelos dos cursos por `publicar-construtor-modelos.ts`.
 *
 * O projeto da criança leva só a REFERÊNCIA de cada peça (o GLB mínimo da biblioteca), como a Ilha
 * do Farol: o Estúdio carrega o arquivo na hora de rodar, e o manifesto da aula fica pequeno. Os
 * arquivos portáteis de importação (`projeto-inicial`/`projeto-final` do curso) levam as malhas
 * completas (`patrulhaAssetsPortateis`), para abrir em qualquer versão.
 *
 * Os nomes são os mesmos das imagens da Nave Contra Asteroides 2D: a criança escolhe a mesma
 * "nave-falcao-azul" nos dois cursos. Cada categoria tem UMA caixa (o build do Blender confere):
 * trocar o modelo no bloco não muda tamanho, centro nem área de toque.
 *
 *   bun docs/aulas-interativas-tecnico/qa/patrulha-espacial-assets.ts   # grava o assets.json do protótipo
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  COURSE_MODEL_LIB_PREFIX,
  courseModelStub,
} from '../../../packages/studio/src/core/courseModels'
import type { ProjectAsset } from '../../../packages/studio/src/core/project'
import { formatarJson } from './formatar-json'
import {
  ESPACO_CATEGORIAS,
  ESPACO_PECAS,
  ESPACO_TAMANHO,
  type EspacoCategoria,
  type EspacoModelo,
  type EspacoPeca,
  MODELOS_ESPACO_JSON,
} from './publicar-construtor-modelos'

const modelos = JSON.parse(readFileSync(MODELOS_ESPACO_JSON, 'utf8')) as Record<
  EspacoPeca,
  EspacoModelo
>

/** O que cada objeto usa no começo do curso (a versão do vídeo e do caderno). */
export const PATRULHA_PADRAO = {
  nave: 'nave-falcao-azul',
  asteroide: 'asteroide-rocha-lunar',
  laser: 'laser-ciano',
  cenario: 'cenario-orbita',
} as const satisfies Record<EspacoCategoria, EspacoPeca>

export const PATRULHA_OPCOES = ESPACO_CATEGORIAS
export const PATRULHA_TAMANHO = ESPACO_TAMANHO

function modelo(peca: EspacoPeca): EspacoModelo {
  const m = modelos[peca]
  if (!m) throw new Error(`Modelo ausente em modelos.json: ${peca}`)
  return m
}

/** A referência compacta de uma peça (o que vai nas aulas). */
export function referenciaPatrulha(peca: EspacoPeca): ProjectAsset {
  const m = modelo(peca)
  return {
    id: `construtor-espaco-${peca}`,
    name: peca,
    kind: 'model3d',
    source: 'library',
    libId: `${COURSE_MODEL_LIB_PREFIX}${m.sha}`,
    originalFileName: `${peca}.glb`,
    dataUrl: courseModelStub(m.sha, []),
  }
}

/** As 16 referências, na ordem das categorias (nave, asteroide, laser, cenário). */
export const patrulhaAssets = (): ProjectAsset[] => ESPACO_PECAS.map(referenciaPatrulha)

/** As mesmas peças com o GLB inteiro (arquivo portátil de importação). */
export function patrulhaAssetsPortateis(): ProjectAsset[] {
  return ESPACO_PECAS.map((peca) => {
    const m = modelo(peca)
    const modulo = readFileSync(
      resolve(
        import.meta.dirname,
        `../../../packages/studio/src/core/course-models/m-${m.sha}.generated.ts`,
      ),
      'utf8',
    )
    const dataUrl = /export default '([^']+)'/.exec(modulo)?.[1]
    if (!dataUrl) throw new Error(`Módulo da biblioteca ilegível: ${peca}`)
    return { ...referenciaPatrulha(peca), dataUrl }
  })
}

if (import.meta.main) {
  const destino = resolve(
    import.meta.dirname,
    '../../aulas-interativas/construtor/prototipos-base/fontes/3d/assets.json',
  )
  writeFileSync(destino, formatarJson(patrulhaAssets()))
  console.log(`assets.json com ${ESPACO_PECAS.length} referências da biblioteca`)
}
