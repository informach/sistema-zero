import {
  type ConteudoDoDesafio,
  type CriarDesafio,
  corPermitida,
  type DesafioDaEquipe,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
  type TipoDeDesafio,
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
/**
 * Troca o tipo do desafio: o número de quadro só no Quadro das Cores, o prêmio padrão do novo tipo
 * e a cor desligada no desafio do dia (ele nunca pinta a ilha).
 */
export function challengeType(draft: ChallengeDraft, tipo: TipoDeDesafio): ChallengeDraft {
  const padrao = MOEDAS_PADRAO_POR_TIPO[tipo]
  const { recompensa } = draft.conteudo
  return {
    metadados: { ...draft.metadados, tipo, quadro: tipo === 'quadro-das-cores' ? 1 : null },
    conteudo: {
      ...draft.conteudo,
      recompensa: {
        ...recompensa,
        cor: corPermitida(tipo, recompensa.cor) && recompensa.cor,
        moedas: padrao.principal,
        moedasExtra: padrao.extra,
      },
    },
  }
}
export function challengePayload(draft: ChallengeDraft): CriarDesafio {
  const { recompensa } = draft.conteudo
  return {
    metadados: draft.metadados,
    conteudo: {
      ...draft.conteudo,
      // Desafio do dia salvo antes da regra (28/10/2026) com a cor ligada: sai desligada.
      recompensa: {
        ...recompensa,
        cor: corPermitida(draft.metadados.tipo, recompensa.cor) && recompensa.cor,
      },
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
