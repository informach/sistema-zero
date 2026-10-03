import type { QuizAnswers } from '../../../lib/quiz-types'
import { comunidadeOfferPath } from '../oferta'
import { type CommunityProfile, type Condition, communityDecision, PROFILE_IDS } from './engine'
import {
  ACTIVITY_VARIANTS,
  CHOOSING_ACTIVITY,
  COMMUNITY_INTRO,
  PRIMARY_COPY,
  RESULT_COPY,
  type ResultSection,
  SECONDARY_CONTEXT,
} from './result-copy'

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
const DOUBT: Record<string, string> = {
  interesse: 'interesse',
  comeco: 'começo',
  ajuda: 'ajuda',
  aprendizagem: 'acompanhar a aprendizagem',
  rotina: 'rotina',
  investimento: 'investimento',
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
  const drawingOnly = decision.unmet.includes('desenho')
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
    bridge = {
      title: 'Conheça um exemplo do que seu filho pode fazer aqui',
      paragraphs: [
        'Nas atividades integradas da Comunidade, seu filho encontra a explicação de um lado e a área de criação do outro. Ele acompanha o passo, faz uma tentativa e observa o resultado. A tela abaixo mostra essa organização numa aula de criação de jogos.',
        decision.state === 'exploratorio'
          ? 'Mostre esse exemplo a ele e ouça o que teria vontade de experimentar. Como vocês ainda estão conhecendo os caminhos, vale comparar essa proposta com o que surgir na conversa, antes de escolher uma atividade.'
          : 'Mostre esse exemplo a ele e ouça o que teria vontade de experimentar. Como o que você procura não aparece entre as opções, vale comparar essa proposta com o que surgir na conversa, antes de escolher uma atividade.',
      ],
    }
    cta = section.cta!
  }
  if (activityProfile) {
    activity = PRIMARY_COPY[activityProfile]!.sections[1]!
    bridge = PRIMARY_COPY[activityProfile]!.sections[2]!
  }
  let activityVariant = 'padrao'
  if (activityProfile === 'C' && drawingOnly) {
    activity = ACTIVITY_VARIANTS.desenhoSemJogos
    activityVariant = 'desenho_sem_jogos'
    if (decision.profile === 'C') {
      title = 'Um espaço para ele desenvolver os próprios desenhos'
      reason = [
        'Você quer dar mais espaço ao desenho e indicou que procura uma atividade que não envolva jogos. Podemos começar por uma criação dele: olhar o que fez, ouvir a ideia e convidá-lo a experimentar outra versão. Assim, a sugestão respeita o que vocês querem explorar agora.',
      ]
    } else {
      reason = [
        reason[0]!,
        'Para o desenho, você indicou que procura uma atividade que não envolva jogos. A experiência abaixo parte de um desenho dele e convida a explorar uma mudança na aparência. Os dois objetivos que você escolheu continuam importantes para pensar nos próximos passos.',
      ]
    }
  } else if (activityProfile && answers.q2 === 'criar_jogo') {
    activity = ACTIVITY_VARIANTS.projetoExistente
    activityVariant = 'projeto_existente'
  } else if (activityProfile && answers.q1 === '12_a_14') {
    activity = ACTIVITY_VARIANTS.adolescente[activityProfile]
    activityVariant = 'adolescente'
  }
  const orientationFor = (profile: CommunityProfile): ResultSection =>
    profile === 'C' && drawingOnly
      ? {
          title: 'O próprio desenho dele pode guiar a próxima tentativa',
          paragraphs: [
            'Convide seu filho a mostrar uma criação e contar o que gostaria de fazer diferente. Pode ser mudar a expressão do personagem, experimentar outras cores ou desenhar a mesma cena de outro jeito. Essas escolhas ajudam a conhecer o que ele quer desenvolver no desenho.',
          ],
        }
      : CHOOSING_ACTIVITY[profile]!
  const orientation: ResultSection | null = decision.profile
    ? orientationFor(decision.profile)
    : decision.state === 'misto_sem_prioridade'
      ? {
          title: 'O que procurar para reunir esses objetivos',
          paragraphs: decision.objectives.map((p) => orientationFor(p).paragraphs[0]!),
        }
      : null

  const observed: Record<string, string> = {
    jogar:
      'O jogo que ele costuma procurar pode ser o ponto de partida da conversa. Peça que mostre uma parte de que gosta e conte o que chama a atenção ali. Você passa a conhecer o interesse por trás daquele tempo no computador ou no celular.',
    desenhar:
      'Um desenho que ele fez recentemente já dá algo para vocês olharem juntos. Peça que mostre o detalhe de que mais gosta e conte como teve aquela ideia. O que ele valoriza na própria criação pode orientar o próximo convite.',
    investigar_programas:
      'Uma curiosidade que ele teve sobre um programa pode render essa primeira conversa. Peça que mostre o que tentou descobrir e conte o que gostaria de fazer funcionar. A pergunta dele pode virar o ponto de partida de uma atividade.',
    videos:
      'Como ele tem procurado assistir a vídeos, pergunte quais assuntos acompanha com mais vontade. Pode haver ali um personagem, uma história ou uma curiosidade para vocês explorarem juntos. Primeiro ouça o tema; depois, conversem sobre o que ele gostaria de fazer a partir dele.',
    outra:
      'Comece pela atividade de que você se lembrou ao responder. Peça que ele mostre uma coisa de que gosta nela e conte o que teria vontade de experimentar a seguir. Esse interesse merece participar da escolha, mesmo estando fora dos exemplos que apresentamos.',
    variado:
      'Os interesses dele variaram no último mês. Você pode convidá-lo a escolher uma ideia para experimentar agora e ouvir o motivo da escolha. A próxima atividade pode partir dessa curiosidade, e vocês continuam observando o que dá vontade de desenvolver.',
    nao_sei:
      'Você pode começar pedindo que seu filho mostre uma coisa de que gostou de fazer recentemente. Ouça o que chamou a atenção dele e pergunte o que teria vontade de tentar a seguir. Essa conversa dá uma referência para escolherem uma atividade juntos.',
  }
  const context: string[] = observed[String(answers.q2)] ? [observed[String(answers.q2)]!] : []
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
  const sharedInterests: Record<string, string> = {
    'jogar:jogo':
      'Ele já gosta de jogar e falou em fazer um jogo próprio. Você pode pedir que mostre uma parte de um jogo que conhece e conte o que faria diferente. A conversa parte de uma referência dele e chega a uma escolha que teria vontade de construir.',
    'desenhar:visual':
      'O desenho já aparece na rotina dele, e ele falou em criar desenhos ou personagens. Peça que escolha uma criação dele e mostre o que mais gosta nela. A partir dessa ideia, vocês podem conversar sobre o que teria vontade de acrescentar ou fazer de outro jeito.',
    'investigar_programas:programacao':
      'Ele tem procurado entender como programas funcionam e já falou em aprender a programar. Peça que conte uma coisa que gostaria de fazer acontecer no computador. Essa curiosidade dá um exemplo para vocês procurarem uma explicação e uma primeira tarefa.',
  }
  const sharedInterest =
    named.length === 1 ? sharedInterests[`${answers.q2}:${named[0]}`] : undefined
  if (sharedInterest) context.splice(0, context.length, sharedInterest)
  if (interests.includes('outro'))
    context.push(paragraphs('Contexto: o que a criança já expressou')[3]!)
  if (interests.includes('nao_expressou'))
    context.push(...paragraphs('Contexto: ainda não expressou vontade de criar'))
  if (interests.includes('nao_sei') && answers.q2 !== 'nao_sei')
    context.push(...paragraphs('Contexto: ainda não sabe'))
  if (answers.q2 === 'criar_jogo') context.push(...paragraphs('Contexto: já tentou criar um jogo'))
  const secondary = decision.secondary
  if (secondary)
    context.push(SECONDARY_CONTEXT[secondary === 'C' && drawingOnly ? 'C_SEM_JOGOS' : secondary]!)

  const conditions: Array<ResultSection & { kind: Condition; unmet: boolean }> = []
  const addCondition = (kind: Condition, key: string | undefined) => {
    if (key && (decision.unmet.includes(kind) || decision.pending.includes(kind)))
      conditions.push({ ...moduleCopy(key), kind, unmet: decision.unmet.includes(kind) })
  }
  addCondition(
    'ferramenta',
    {
      roblox: 'Jogos: Roblox ou Minecraft indispensável',
      minecraft: 'Jogos: Roblox ou Minecraft indispensável',
      outra_especifica: 'Jogos: outra ferramenta específica',
      conversar: 'Jogos: precisa conversar com o filho',
    }[String(answers.qb)],
  )
  addCondition(
    'desenho',
    {
      sem_jogos: 'Desenho: precisa de uma atividade sem jogos',
      ver_exemplo: 'Desenho: quer conhecer a integração',
    }[String(answers.qc)],
  )
  addCondition(
    'formato',
    {
      exige_ao_vivo: 'Formato: professor ao vivo indispensável',
      prefere_ao_vivo: 'Formato: prefere ao vivo, mas considera outra possibilidade',
      conhecer: 'Formato: quer conhecer melhor',
    }[String(answers.q7)],
  )
  addCondition(
    'computador',
    {
      celular_tablet: 'Equipamento: só celular ou tablet',
      organizar: 'Equipamento: precisa organizar horários',
      verificar: 'Equipamento: ainda precisa verificar',
    }[String(answers.q8)],
  )
  conditions.sort((a, b) => Number(b.unmet) - Number(a.unmet))
  for (const condition of conditions) {
    condition.paragraphs = condition.paragraphs.map((p) =>
      p.replace('{{ferramenta}}', answers.qb === 'minecraft' ? 'Minecraft' : 'Roblox'),
    )
  }

  const supportCopy = moduleCopy(`Apoio: ${SUPPORT[String(answers.q6)]}`)
  const support: ResultSection = {
    title:
      answers.q5 === 'ajuda'
        ? 'Seu filho tem onde pedir ajuda quando encontrar uma dúvida'
        : supportCopy.title,
    paragraphs: [...supportCopy.paragraphs, ...paragraphs('Dúvida principal: ajuda')],
  }
  const formatKey = {
    pode_funcionar: 'Formato: pode funcionar',
    prefere_ao_vivo: 'Formato: prefere ao vivo, mas considera outra possibilidade',
    conhecer: 'Formato: quer conhecer melhor',
  }[String(answers.q7)]
  const format = formatKey ? moduleCopy(formatKey) : null
  const doubtDef = DOUBT[String(answers.q5)]
  // Quem procura desenho SEM jogos não recebe a regra do jogo como prova do interesse.
  const doubtKey =
    doubtDef === 'interesse' && drawingOnly ? 'interesse (desenho sem jogos)' : doubtDef
  const doubt: ResultSection | null =
    doubtKey && answers.q5 !== 'ajuda' ? moduleCopy(`Dúvida principal: ${doubtKey}`) : null
  const doubtVisual =
    {
      interesse: drawingOnly ? 'pinta' : 'regra',
      comeco: 'aula-estudio',
      aprendizagem: 'responsavel',
      rotina: 'salvamento',
    }[String(answers.q5)] ?? null
  const unmet = decision.unmet.length > 0
  if (unmet) {
    bridge = {
      title: 'O que a Comunidade oferece',
      paragraphs: [
        'No Estúdio, a ferramenta de criação de jogos da plataforma, seu filho pode montar comandos em blocos e testar o resultado. O Pinta é o editor em que ele prepara desenhos que podem participar desses projetos. As aulas orientam as primeiras atividades; os recursos para criar livremente são liberados conforme o avanço na Jornada.',
        'As telas abaixo permitem conhecer essa experiência e comparar com o que vocês procuram. As diferenças que explicamos acima continuam valendo para sua escolha: conhecer os recursos não muda o formato das aulas, os requisitos de equipamento ou as ferramentas usadas.',
      ],
    }
    cta = moduleCopy('Botão quando há uma condição não atendida').cta!
  }
  const visuals = activityProfile ? [...VISUALS[activityProfile]] : ['aula-estudio']
  const practicalConditions = conditions.filter((c) => !c.unmet && c.kind !== 'formato')
  // Quando a integração já é o argumento principal, desenvolve a dúvida ali,
  // sem repetir o mesmo texto e a mesma tira de capturas em outro cartão.
  const drawingCondition = practicalConditions.find((c) => c.kind === 'desenho')
  if (drawingCondition && activityProfile === 'C' && !unmet) {
    bridge = { ...bridge!, title: drawingCondition.title, paragraphs: drawingCondition.paragraphs }
  }
  return {
    decision,
    title,
    reason,
    context,
    orientation,
    introduction: COMMUNITY_INTRO,
    activity: activity!,
    activityVariant,
    bridge,
    cta,
    conditions,
    unmetConditions: conditions.filter((c) => c.unmet),
    practicalConditions: practicalConditions.filter(
      (c) => !(c.kind === 'desenho' && activityProfile === 'C' && !unmet),
    ),
    format,
    support,
    doubt,
    doubtVisual: doubtVisual && !visuals.includes(doubtVisual) ? doubtVisual : null,
    visuals,
    requirements: paragraphs('Para participar da Comunidade'),
    offerPath: comunidadeOfferPath(
      decision.profile ? PROFILE_IDS[decision.profile] : 'tempo-de-tela',
    ),
  }
}
export type CommunityResult = NonNullable<ReturnType<typeof buildCommunityResult>>
