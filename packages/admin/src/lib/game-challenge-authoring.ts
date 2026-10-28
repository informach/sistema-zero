import type {
  ConteudoDoDesafio,
  CriarDesafio,
  DesafioDaEquipe,
  PublicoDoDesafio,
} from '@sistemazero/arquipelago-contracts'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
  type SectionObjectiveRule,
} from '@sistemazero/core/learning'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { newExecutionRule } from './execution-rule'

export type ChallengeDraft = Omit<CriarDesafio, 'conteudo'> & {
  conteudo: Omit<ConteudoDoDesafio, 'objetivos'> & { objetivos: SectionJavaScriptProjectCheck[] }
}

export function newChallenge(publico: PublicoDoDesafio): ChallengeDraft {
  return {
    metadados: {
      publico,
      slug: '',
      ilha: 'sua-ilha',
      tipo: 'quadro-das-cores',
      quadro: 1,
      ordem: 0,
    },
    conteudo: {
      versao: 1,
      titulo: '',
      enunciado: '',
      dicas: [],
      projetoInicial: createBlankProjectSnapshot(crypto.randomUUID(), 'Projeto inicial'),
      gabarito: createBlankProjectSnapshot(crypto.randomUUID(), 'Gabarito'),
      objetivos: [],
      recompensa: { cor: true, moedas: 20, moedasExtra: 0 },
      blocosManuais: { acrescentar: [], retirar: [] },
    },
  }
}
export function challengeDraft(value: DesafioDaEquipe): ChallengeDraft {
  const completion: unknown = { version: 1, blockIds: [], projectChecks: value.conteudo.objetivos }
  if (
    !isSectionCompletion(completion) ||
    !completion.projectChecks ||
    completion.projectChecks.some((c) => c.programmingLanguage === 'python')
  )
    throw new Error(
      'Este desafio contém regras incompatíveis. O conteúdo foi preservado no servidor.',
    )
  const objetivos = completion.projectChecks.filter(
    (c): c is SectionJavaScriptProjectCheck => c.programmingLanguage !== 'python',
  )
  return structuredClone({ metadados: value.metadados, conteudo: { ...value.conteudo, objetivos } })
}
export function challengePayload(draft: ChallengeDraft): CriarDesafio {
  return {
    metadados: draft.metadados,
    conteudo: {
      ...draft.conteudo,
      objetivos: draft.conteudo.objetivos.map((c) => ({ ...c, rule: { ...c.rule } })),
      blocosManuais: {
        acrescentar: draft.conteudo.blocosManuais.acrescentar.map((v) => v.trim()).filter(Boolean),
        retirar: draft.conteudo.blocosManuais.retirar.map((v) => v.trim()).filter(Boolean),
      },
    },
  }
}
export function challengeRule(type: string): SectionObjectiveRule {
  switch (type) {
    case 'behavior':
    case 'functionReturns':
    case 'script':
      return newExecutionRule(type, false, false)
    case 'usesLoop':
      return { type }
    case 'declaresVariable':
    case 'definesFunction':
    case 'callsFunction':
      return { type, name: '' }
    default:
      return { type: 'usesBlock', blockType: '' }
  }
}
