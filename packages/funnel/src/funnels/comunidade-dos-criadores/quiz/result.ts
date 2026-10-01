import type { QuizAnswers } from '../../../lib/quiz-types'
import { comunidadeOfferPath } from '../oferta'
import { type CommunityProfile, type Condition, communityDecision, PROFILE_IDS } from './engine'
import { OBJECTIVE_LABELS } from './questions'
import { PRIMARY_COPY, RESULT_COPY, type ResultSection } from './result-copy'

const moduleCopy = (key: string): ResultSection => {
  const section = RESULT_COPY[key]?.[0]
  if (!section) throw new Error(`Módulo de resultado ausente: ${key}`)
  return section
}
const paragraphs = (key: string) => moduleCopy(key).paragraphs
const SUPPORT: Record<string, string> = {
  rever: 'costuma rever uma explicação',
  pessoa: 'costuma procurar uma pessoa',
  experimentar: 'costuma experimentar alternativas',
  varia: 'varia conforme a atividade',
  nao_observou: 'ainda falta observar',
}
const DOUBT: Record<string, [string, string]> = {
  interesse: ['interesse', 'Como conhecer o interesse dele'],
  comeco: ['começo', 'Como ele pode começar'],
  ajuda: ['ajuda', 'Quando surgir uma dúvida'],
  aprendizagem: ['acompanhar a aprendizagem', 'Como acompanhar o que ele aprende'],
  rotina: ['rotina', 'Como encaixar na rotina'],
  investimento: ['investimento', 'O que conferir no investimento'],
}
const PAIRS: Record<string, [number, CommunityProfile]> = {
  AB: [1, 'B'],
  AC: [2, 'C'],
  AD: [3, 'D'],
  BC: [4, 'C'],
  BD: [5, 'B'],
  CD: [6, 'C'],
}
const VISUALS: Record<CommunityProfile, string[]> = {
  A: ['aula-estudio'],
  B: ['regra'],
  C: ['integracao'],
  D: ['jornada', 'aprendizagem'],
}

export function buildCommunityResult(answers: QuizAnswers) {
  const decision = communityDecision(answers)
  if (!decision) return null
  let title: string
  let reason: string[]
  let activity: ResultSection | null = null
  let bridge: ResultSection | null = null
  let cta: string
  let activityProfile = decision.profile
  if (decision.state === 'misto_sem_prioridade') {
    const [index, profile] = PAIRS[decision.objectives.join('')]!
    const combined = RESULT_COPY['Dois objetivos com o mesmo peso']!
    title = combined[index]!.title
    reason = [...combined[0]!.paragraphs, ...combined[index]!.paragraphs]
    activityProfile = profile
    cta = 'Conhecer a proposta completa da Comunidade'
  } else if (decision.profile) {
    const primary = PRIMARY_COPY[decision.profile]!
    title = primary.title
    reason = primary.sections[0]!.paragraphs
    cta = primary.sections[2]!.cta!
  } else {
    const section = moduleCopy(
      decision.state === 'exploratorio' ? 'Procura ainda aberta' : 'Quando a procura é outra',
    )
    title = section.title
    reason = [section.paragraphs[0]!]
    activity = {
      title:
        decision.state === 'exploratorio'
          ? 'Um convite para experimentar em casa'
          : 'Uma conversa para organizar a procura',
      paragraphs: section.paragraphs.slice(1),
    }
    cta = section.cta!
  }
  if (activityProfile) {
    activity = PRIMARY_COPY[activityProfile]!.sections[1]!
    bridge = PRIMARY_COPY[activityProfile]!.sections[2]!
  }

  const context: string[] = []
  const interests = decision.interests
  const named = ['jogo', 'visual', 'programacao'].filter((i) => interests.includes(i))
  const contextKey =
    named.length === 3
      ? 'os três interesses'
      : named.includes('jogo') && named.includes('visual')
        ? 'jogos e desenho'
        : named.includes('jogo') && named.includes('programacao')
          ? 'jogos e programação'
          : named.length === 2
            ? 'desenho e programação'
            : null
  if (contextKey) context.push(...paragraphs(`Contexto: ${contextKey}`))
  else if (named.length === 1)
    context.push(
      paragraphs('Contexto: o que a criança já expressou')[
        ['jogo', 'visual', 'programacao'].indexOf(named[0]!)
      ]!,
    )
  if (interests.includes('outro'))
    context.push(paragraphs('Contexto: o que a criança já expressou')[3]!)
  if (interests.includes('nao_expressou'))
    context.push(...paragraphs('Contexto: ainda não expressou vontade de criar'))
  if (interests.includes('nao_sei')) context.push(...paragraphs('Contexto: ainda não sabe'))
  if (answers.q2 === 'criar_jogo') context.push(...paragraphs('Contexto: já tentou criar um jogo'))
  const secondary = decision.secondary
  if (secondary)
    context.push(
      ...paragraphs('Quando existe um segundo objetivo').map((p) =>
        p.replace(
          '{{objetivo_complementar}}',
          OBJECTIVE_LABELS[secondary]!.toLocaleLowerCase('pt-BR'),
        ),
      ),
    )

  const conditions: Array<ResultSection & { kind: Condition; unmet: boolean }> = []
  const addCondition = (kind: Condition, key: string | undefined, title: string) => {
    if (key && (decision.unmet.includes(kind) || decision.pending.includes(kind)))
      conditions.push({ ...moduleCopy(key), title, kind, unmet: decision.unmet.includes(kind) })
  }
  addCondition(
    'ferramenta',
    {
      roblox: 'Jogos: Roblox ou Minecraft indispensável',
      minecraft: 'Jogos: Roblox ou Minecraft indispensável',
      outra_especifica: 'Jogos: outra ferramenta específica',
      conversar: 'Jogos: precisa conversar com o filho',
    }[String(answers.qb)],
    'A ferramenta para criar jogos',
  )
  addCondition(
    'desenho',
    {
      sem_jogos: 'Desenho: precisa de uma atividade sem jogos',
      ver_exemplo: 'Desenho: quer conhecer a integração',
    }[String(answers.qc)],
    'O lugar do desenho na proposta',
  )
  addCondition(
    'formato',
    {
      exige_ao_vivo: 'Formato: professor ao vivo indispensável',
      prefere_ao_vivo: 'Formato: prefere ao vivo, mas considera outra possibilidade',
      conhecer: 'Formato: quer conhecer melhor',
    }[String(answers.q7)],
    'Como acontece o acompanhamento',
  )
  addCondition(
    'computador',
    {
      celular_tablet: 'Equipamento: só celular ou tablet',
      organizar: 'Equipamento: precisa organizar horários',
      verificar: 'Equipamento: ainda precisa verificar',
    }[String(answers.q8)],
    'O acesso ao computador',
  )
  conditions.sort((a, b) => Number(b.unmet) - Number(a.unmet))

  const support: ResultSection = {
    title: 'O apoio nas primeiras tentativas',
    paragraphs: paragraphs(`Apoio: ${SUPPORT[String(answers.q6)]}`),
  }
  const doubtDef = DOUBT[String(answers.q5)]
  let doubt: ResultSection | null = doubtDef
    ? { title: doubtDef[1], paragraphs: paragraphs(`Dúvida principal: ${doubtDef[0]}`) }
    : null
  if (answers.q5 === 'ajuda' && answers.q6 === 'pessoa') {
    support.paragraphs = [
      ...support.paragraphs,
      'Ao pedir ajuda, contar o que tentou e o que aconteceu ajuda a situar a pergunta. O histórico da conversa fica nos Recados para consultar.',
    ]
    doubt = null
  }
  const unmet = decision.unmet.length > 0
  if (unmet) {
    bridge = {
      title: 'O que a Comunidade oferece',
      paragraphs: [
        'A Comunidade reúne aulas gravadas, criação de jogos no Estúdio e expressão visual integrada aos projetos. As telas abaixo mostram como a plataforma se organiza. Elas não resolvem as diferenças em relação aos requisitos que você informou.',
      ],
    }
    cta = moduleCopy('Botão quando há uma condição não atendida').cta!
  }
  const visuals = activityProfile ? [...VISUALS[activityProfile]] : ['aula-estudio']
  if (answers.qc === 'ver_exemplo' && !visuals.includes('integracao')) visuals.push('integracao')
  const supportVisual =
    answers.q5 === 'ajuda' || answers.q6 === 'pessoa' || answers.q7 !== 'pode_funcionar'
      ? 'recados'
      : answers.q5 === 'aprendizagem'
        ? 'aprendizagem'
        : 'pausa'
  return {
    decision,
    title,
    reason,
    context,
    activity: activity!,
    bridge,
    cta,
    conditions,
    support,
    doubt,
    visuals,
    supportVisual,
    requirements: paragraphs('Para participar da Comunidade'),
    offerPath: comunidadeOfferPath(
      decision.profile ? PROFILE_IDS[decision.profile] : 'tempo-de-tela',
    ),
  }
}
export type CommunityResult = NonNullable<ReturnType<typeof buildCommunityResult>>
