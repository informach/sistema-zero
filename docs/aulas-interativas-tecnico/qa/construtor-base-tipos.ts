import type { InteractiveBlock, LearningManifest } from '../../../packages/core/src/learning'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { StudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'

/** Fonte autoral das duas bases, no mesmo molde de trechos dos cursos Faísca. */
export interface ConstrutorTrecho {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'delivery' | 'quiz' | 'fecho'
  /** Etapa de solução desta montagem; entrada é a etapa anterior da aula. */
  etapa?: string
  /** Objetivo da parte em linguagem da criança. */
  objective?: string
  /** Recado de Zappy na página, não gravado. */
  ponte: string
  /** Master integral com tags de interpretação; quiz sem vídeo usa texto vazio. */
  text: string
  /** Na tela, incluindo as tags de gesto da ESPEC-ROTEIRO §9. */
  screen: string
  /** Parágrafos literais completos do master, com professora antes e depois. */
  kids?: string[]
  /** Passos, testes observáveis e rótulos de blocos para o caderno/PDF. */
  steps?: string[]
  tests?: string[]
  blockLabels?: string[]
  /** IDs oficiais correspondentes, para desenhar os blocos no material. */
  blockTypes?: string[]
  /** Justificativa de retomada/observação/arte opcional quando a entrada já cumpre os critérios. */
  entryMayPass?: string
  /** Bloco interativo completo, com scene/setup/goals oficiais existentes. */
  experience?: InteractiveBlock
  /** Quiz nativo completo; conteúdo/demonstração usam o contrato oficial. */
  quiz?: Extract<
    Extract<LearningManifest['blocks'][number], { content: unknown }>['content'],
    { kind: 'quiz' }
  >
}

export interface ConstrutorAula {
  /** Preservar os slugs do curso existente; novos slugs precisam constar no mapa editorial. */
  slug: string
  title: string
  entryStage: string
  /** O que já existe e qual conquista fica pronta nesta aula. */
  entry: string
  outcome: string
  trechos: ConstrutorTrecho[]
  /** Chaves antigas explicitamente aposentadas; nunca são removidas na plataforma automaticamente. */
  retireBlockKeys?: string[]
}

export interface ConstrutorBaseConfig {
  curso: string
  pasta: string
  prefixo: string
  nome: string
  dimensao: '2d' | '3d'
  /** Mesma cadeia em todas as aulas para preservar o projeto do aluno. */
  chain?: string
  etapas: readonly string[]
  etapaFinal: string
  montarProjeto: (etapa: string) => StudioAuthoringProject
  checks: (etapa: string) => SectionProjectCheck[]
  aulas: ConstrutorAula[]
  jogoPronto: {
    title: string
    instrucoes: string
    palco?: { width: number; height: number }
  }
  /** Introdução autoral ao guia de montagem; os passos vêm de cada trecho. */
  introducaoPassoAPasso?: string
}
