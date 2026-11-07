import { flex, simpleEffect } from './language'
import { PAYOFFS } from './payoffs'
import { RESULT_COPY as COPY } from './result-data'
import type { CompleteAnswers, KidsMode } from './types'
export type Reading = Record<
  | 'lead'
  | 'payoff'
  | 'context'
  | 'attempt'
  | 'purpose'
  | 'interest'
  | 'offer'
  | 'practice'
  | 'school'
  | 'home'
  | 'transfer'
  | 'continuity'
  | 'format'
  | 'equipment'
  | 'support'
  | 'expectation'
  | 'terms'
  | 'invitation',
  string
>
function flexReading(reading: Reading, answers: Record<string, string>): Reading {
  return Object.fromEntries(
    Object.entries(reading).map(([key, text]) => [key, flex(text, answers)]),
  ) as Reading
}
// Copy integral da proposta V5 aprovada. A validação do percurso acontece antes deste construtor.
const SCENE_OPEN: Record<string, Record<string, string>> = {
  m9: {
    comecar:
      'Na hora de guardar os brinquedos, o começo ainda depende de você indicar a primeira parte.',
    erro: 'A queda de uma torre pode interromper uma brincadeira que ele estava fazendo.',
    modelo:
      'Quando falta uma peça do modelo, continuar a montagem pede uma alternativa que ele ainda não encontra sozinho.',
    explicar:
      'O pedido de ajuda na montagem chega antes de ele conseguir mostrar onde ficou difícil.',
    rotina: 'Na preparação para sair, cada etapa ainda costuma depender de um lembrete seu.',
  },
  '9a12': {
    comecar: 'Na hora do dever, começar ainda depende de você indicar uma questão.',
    erro: 'Quando a montagem não fica de pé, ele costuma largar as peças e querer parar.',
    modelo:
      'Na escola, acompanhar um exemplo e usar a mesma ideia num exercício diferente ainda são passos que pedem ajudas diferentes.',
    explicar:
      'Ao ensinar uma brincadeira, organizar a explicação das regras ainda pede sua participação.',
    rotina: 'Conferir os materiais da mochila ainda depende de você lembrar o que vai ser usado.',
  },
  '13a17': {
    comecar:
      'O trabalho da escola chega com um objetivo, mas escolher por onde começar ainda pede sua ajuda.',
    erro: 'Quando o vídeo fica diferente do que imaginava, ele tende a deixar a edição de lado.',
    modelo:
      'A resolução vista na aula ajuda, mas usar o raciocínio num problema com outros dados ainda pede apoio.',
    explicar:
      'Nas combinações em família, dizer que não gostou vem antes de conseguir explicar o que prefere.',
    rotina:
      'Preparar-se para uma atividade que ele escolheu ainda costuma depender de lembretes sobre horário e material.',
  },
}
const DESIRES: Record<string, string> = {
  planejar:
    'Você quer ver seu filho participando das próprias decisões: escolhendo por onde começar e procurando ajuda quando precisa.',
  persistir:
    'Você quer que uma tentativa difícil deixe espaço para seu filho continuar aprendendo, com uma pausa, outra estratégia ou ajuda quando precisa.',
  raciocinar:
    'Você quer que seu filho participe da busca por soluções: observe o que aconteceu, pense numa alternativa e confira se ela funciona.',
  expressar:
    'Você quer dar mais espaço para seu filho mostrar o que pensa, explicar uma escolha e pedir a ajuda de que precisa, do jeito que consegue se comunicar.',
  rotina:
    'Você quer que seu filho participe mais dos preparativos e combinados, entendendo o que vem primeiro e conferindo o que ainda falta.',
  explorar:
    'O próximo passo pode ser conhecer melhor como seu filho participa: o que desperta curiosidade, quais escolhas já faz e que ajuda lhe permite tentar.',
}
const ATTEMPT_TEXT: Record<KidsMode, Record<string, Record<string, string>>> = {
  desafio: {
    difficulty: {
      parte:
        'A ajuda por partes já abre espaço para ele participar. Um treinamento deve preservar isso: oferecer uma orientação e deixar uma decisão real nas mãos dele.',
      repetir:
        'Quando a orientação precisa ser repetida a cada vez, vale criar oportunidades de ele usar uma parte dela, observar o resultado e voltar a tentar com apoio. O treino precisa incluir essa participação.',
      assumir:
        'Assumir uma parte pode fazer a rotina andar naquele momento. Para treinar a habilidade, também precisamos reservar uma decisão ou tentativa que ele possa realizar, com a ajuda necessária.',
      variar:
        'Vocês já experimentaram ajudas diferentes. O próximo passo é observar qual delas permite que ele participe e quanto apoio precisa, usando tentativas pequenas que possam ser comparadas.',
      observar:
        'Ainda há espaço para observar que ajuda faz diferença. Começar por uma situação pequena, em que ele possa escolher e mostrar o que fez, oferece algo concreto para essa conversa.',
    },
    positive: {
      escolha:
        'O espaço para decidir e pedir ajuda já faz parte do que funciona. O próximo passo pode ser ampliar as situações em que ele exerce essa participação.',
      combinado:
        'Combinar responsabilidades e conferir juntos já ajuda. Essa base permite experimentar decisões um pouco mais elaboradas, mantendo o apoio de que precisa.',
      exemplo:
        'Observar um exemplo e tentar do próprio jeito já favorece a participação dele. Uma nova criação pode oferecer outras ocasiões de experimentar e explicar escolhas.',
      interesse:
        'Ter um motivo que importa para ele já favorece a participação. Usar esse interesse para criar algo dá novas decisões para explorar.',
      observar:
        'Ele já participa bem dessas situações. Observar o que favorece essa participação ajuda a escolher outras oportunidades, sem partir da ideia de que há uma dificuldade a corrigir.',
    },
    unknown: {
      parte:
        'Fazer uma parte juntos e deixar uma escolha com ele já oferece uma pista de apoio possível. Vale observar essa participação em outras tentativas.',
      repetir:
        'Ainda falta observar o que ele usa depois de uma orientação. Um momento em que possa mostrar a própria tentativa ajuda a tornar essa participação visível.',
      assumir:
        'Quando você assume uma parte, fica difícil saber o que ele tentaria. Reservar uma escolha pequena para ele pode ajudar a observar o apoio de que precisa.',
      variar:
        'A ajuda muda de uma situação para outra. Vale partir de um exemplo concreto e observar o que ele consegue fazer com aquele apoio, antes de concluir algo sobre suas habilidades.',
      observar:
        'Um caminho guiado pode tornar as tentativas visíveis: o que ele quis fazer, o que experimentou e onde pediu ajuda. Assim, vocês têm algo concreto para acompanhar.',
    },
  },
  comunidade: {
    difficulty: {
      retoma:
        'Ele já retoma uma parte do que foi combinado. Isso oferece uma base para continuar: repetir a oportunidade em outros momentos e acrescentar decisões conforme conseguir participar.',
      repetir:
        'Se a orientação precisa recomeçar a cada vez, o caminho precisa oferecer novas ocasiões de usar o que foi combinado e observar o que ele já consegue retomar.',
      novidade:
        'O interesse que aparece no começo nem sempre se mantém nos dias seguintes. Variar os projetos pode oferecer novos motivos para participar, mas é preciso olhar o formato com ele e observar se quer voltar.',
      rotina:
        'Já existe uma ajuda possível, mas ainda falta um momento para retomá-la. Para um caminho contínuo fazer sentido, esse espaço na rotina precisa ser combinado primeiro.',
      observar:
        'Ainda falta acompanhar o que se mantém de um dia para outro. Vale olhar o formato juntos e observar a vontade de retomar antes de assumir uma assinatura.',
    },
    positive: {
      retoma:
        'Ele já volta por conta própria e procura fazer mais uma parte. Um caminho contínuo pode oferecer novos projetos nos quais use e amplie essa participação.',
      repetir:
        'O convite para retomar ainda passa por você. Uma sequência de projetos precisa caber nessa parceria, deixando escolhas com ele e combinando quando voltar.',
      novidade:
        'Conhecer outros assuntos faz parte do interesse dele. Projetos diferentes podem dar novos motivos para praticar as mesmas habilidades.',
      rotina:
        'A vontade de continuar já existe; falta combinar momentos na semana. A continuidade começa por esse acordo possível entre vocês.',
      observar:
        'Ele já participa bem, mas a continuidade ainda precisa ser observada. Conhecer os projetos e conversar sobre a vontade de voltar ajuda a decidir o próximo passo.',
    },
    unknown: {
      retoma:
        'Retomar uma parte de um combinado de casa já oferece algo para observar. Vale perceber que ajuda favorece essa participação e como ela aparece com o tempo.',
      repetir:
        'Os combinados ainda precisam ser retomados a cada vez. Observar uma escolha dele e voltar a ela depois ajuda a entender o que já consegue usar.',
      novidade:
        'A participação aparece nos primeiros dias e depois diminui. Antes de pensar em continuidade, vale observar o que ele quer retomar e que apoio facilita isso.',
      rotina:
        'Ainda falta um momento para acompanhar um combinado juntos. Organizar esse espaço é parte da decisão sobre um caminho contínuo.',
      observar:
        'Ainda é cedo para concluir o que funciona ao longo dos dias. Conhecer uma proposta e observar a vontade de participar ajuda a decidir com mais clareza.',
    },
  },
}
const INTEREST_BRIDGE: Record<string, string> = {
  jogos:
    'O interesse dele por jogos oferece um ponto de partida: investigar como uma regra funciona e decidir o que um personagem consegue fazer.',
  historias:
    'As histórias e personagens que interessam a ele oferecem um ponto de partida: imaginar o que deve acontecer e organizar as ações para dar forma à ideia.',
  desenhos:
    'A vontade de desenhar, construir ou criar imagens oferece um ponto de partida: dar forma a uma ideia e decidir como ela vai funcionar.',
  descobertas:
    'A curiosidade sobre como as coisas funcionam oferece um ponto de partida: mudar uma instrução, observar o efeito e investigar por que aconteceu.',
  junto:
    'A vontade de fazer algo com você oferece um ponto de partida: compartilhar a criação e deixar escolhas com ele enquanto vocês acompanham o resultado.',
  descobrir:
    'Como os interesses dele ainda estão sendo descobertos, vale olhar possibilidades juntos e ouvir o que teria vontade de experimentar. Essa escolha faz parte da decisão.',
}

export function buildNarrative(mode: KidsMode, a: CompleteAnswers) {
  const age = a.idade,
    goal = a.prioridade,
    young = age === 'm9',
    branch = a.cena === 'vai_bem' ? 'positive' : a.cena === 'nao_sei' ? 'unknown' : 'difficulty'
  const skill = COPY.skills[goal]!,
    g = COPY.goalsByAge[age]![goal]!,
    paragraphs: string[] = []
  let opening = DESIRES[goal]!
  if (a.beneficio === 'observar' && goal !== 'explorar')
    opening += ' O que fará mais diferença ainda precisa ser observado e conversado com ele.'
  else if (goal === 'explorar' && a.beneficio !== 'observar')
    opening +=
      ' A conversa pode começar por ' +
      (
        {
          filho: 'aquilo que desperta a vontade de participar e mostrar o que fez.',
          relacao: 'qual ajuda permite que tente e faça uma escolha.',
          vida: 'onde ele já participa na rotina e em que situações ainda pede apoio.',
        } as Record<string, string>
      )[a.beneficio]!
  else if (goal !== 'explorar') opening += ' ' + PAYOFFS[age]![goal]![a.beneficio]!
  paragraphs.push(opening)

  if (branch === 'difficulty') {
    const effect = COPY.implications[age]![a.cena]!.returns[a.impacto]!
    let context = SCENE_OPEN[age]![a.cena]! + ' '
    if (a.impacto === 'nenhum')
      context +=
        'Essa situação não costuma atrapalhar a rotina; a ideia é ampliar a participação que vocês desejam, sem transformá-la num problema. '
    else if (a.impacto === 'nao_sei')
      context += 'O efeito disso na rotina ainda precisa ser observado. '
    else context += simpleEffect(effect) + ' '
    const reach = COPY.reach[age]![a.cena]!
    if (a.alcance === 'outros') context += reach.narrative
    if (a.alcance === 'local') context += reach.options.find(([k]) => k === 'local')![1]!
    if (a.alcance === 'apoio')
      context +=
        'Em outros momentos, ele participa quando a ajuda é combinada e sobra uma parte para tentar.'
    if (a.alcance === 'observar')
      context += 'Ainda falta acompanhar como isso aparece em outras situações.'
    if (skill && COPY.sceneSkills[a.cena]! !== goal)
      context +=
        ' Para o próximo passo, podemos dar foco à ' +
        skill.name.toLowerCase() +
        ' em decisões que façam sentido para ele.'
    paragraphs.push(context)
  } else {
    const situation = (
      {
        decisoes: 'escolhas e preparativos de casa',
        projetos: 'criações que interessem a ele',
        convivencia: 'combinações com outras pessoas',
        escola: 'produções e conversas sobre a escola',
        aberto: 'momentos que vocês ainda vão escolher juntos',
      } as Record<string, string>
    )[a.impacto]!
    let context =
      branch === 'positive'
        ? 'Ele já participa bem das situações que vocês têm acompanhado. Há espaço para ampliar essa participação em ' +
          situation +
          '.'
        : 'Há mais para conhecer na rotina de vocês antes de concentrar a atenção em uma dificuldade. Acompanhar ' +
          situation +
          ' permite perceber como ele escolhe, tenta e pede ajuda.'
    const n: Record<string, string> =
      branch === 'positive'
        ? {
            ideias:
              'Encontrar novas ideias que despertem a vontade dele é um próximo passo possível.',
            momento: 'O momento para retomar ainda precisa ser combinado.',
            apoio: 'Vale observar quando a sua ajuda abre espaço para uma decisão dele.',
            livre: 'Vocês já encontram oportunidades e podem conhecer outras com calma.',
            observar:
              'Uma conversa sobre o que ele gostaria de experimentar ajuda a orientar essa escolha.',
          }
        : {
            momento:
              'Como a rotina costuma mostrar mais a tarefa pronta do que o processo, vale reservar um momento para acompanhar uma tentativa.',
            apoio:
              'Deixar uma pequena parte nas mãos dele pode ajudar a perceber o que já faz com apoio.',
            contexto:
              'A participação muda com as pessoas e os lugares; por isso, vale observar cada situação antes de tirar conclusões.',
            livre:
              'O caminho pode começar pela curiosidade de acompanhar mais de perto, sem pressupor uma dificuldade.',
            observar:
              'Uma escolha dele, uma tentativa e um pedido de ajuda já dão assunto para essa conversa.',
          }
    context += ' ' + n[a.alcance]!
    paragraphs.push(context)
  }
  paragraphs.push(
    ATTEMPT_TEXT[mode][branch]![a.tentativas]! +
      ' Habilidades como autonomia, resolução de problemas e comunicação precisam de oportunidades para serem praticadas. Treiná-las envolve fazer escolhas, observar o resultado, ajustar uma tentativa e voltar a experimentar, com orientação.',
  )

  let offer =
    INTEREST_BRIDGE[a.interesse]! +
    ' É nessa ligação entre interesse e prática que o Sistema Zero organiza seu treinamento de habilidades para a vida. '
  offer +=
    mode === 'desafio'
      ? 'No Desafio do Primeiro Jogo, a programação de uma aventura é a ferramenta para exercitar escolhas, raciocínio, tentativas e comunicação. Seu filho cria A Chave do Farol em etapas guiadas, usando instruções em blocos.'
      : 'Na Comunidade dos Criadores, projetos guiados de criação e programação oferecem novas oportunidades de praticar essas habilidades ao longo do tempo. A assinatura mantém o acesso aos cursos e ferramentas incluídos para seguir esse caminho; um dos projetos é A Chave do Farol.'
  paragraphs.push(offer)
  paragraphs.push(
    g.practice +
      (young
        ? ' Você fica ao lado, ajuda a compreender as orientações e a usar o computador, deixando escolhas e tentativas com ele.'
        : ''),
  )

  const bridge =
    g.school +
    ' ' +
    g.home +
    ' A mesma habilidade pode ser praticada nessas situações, retomando o raciocínio com ele fora da tela. Essa ligação precisa de apoio e de oportunidades no cotidiano; criar o jogo não produz essa mudança automaticamente.'
  paragraphs.push(bridge)
  if (mode === 'comunidade')
    paragraphs.push(
      g.continued +
        ' O valor da continuidade está nessas novas ocasiões de praticar e perceber a participação dele. Manter a assinatura, por si só, não garante interesse nem mudança de hábito.',
    )

  const needsSupport = young && a.apoio !== 'junto'
  const needsOrganize = !young && ['organizar', 'sozinho'].includes(a.apoio)
  const differentNeed = ['ao_vivo', 'escola'].includes(a.condicao)
  const format =
    'Esse treinamento acontece no navegador, com aulas gravadas e orientação por mensagens na plataforma.'
  const equipment =
    'Para criar, é preciso computador com internet, mouse e teclado; o celular não substitui esse equipamento.'
  let support: string
  if (young)
    support = needsSupport
      ? 'Para os menores de 9 anos, um responsável precisa permanecer ao lado, ler e acompanhar as orientações conforme necessário. Esse acompanhamento ainda precisa ser organizado na rotina de vocês antes da compra.'
      : 'Para os menores de 9 anos, vocês fazem juntos. Você lê as instruções conforme necessário e ajusta a ajuda para que ele participe das decisões.'
  else
    support = (
      {
        junto:
          'Sua presença ao lado pode ajudar a localizar uma dúvida, deixando que ele mostre a tentativa antes de assumir os controles.',
        perto:
          'Estar por perto quando ele chama permite ajudar a localizar uma dúvida e uma orientação para rever.',
        organizar:
          'Ainda é preciso combinar quem poderá ajudar quando ele precisar. Organizar esse apoio faz parte da decisão.',
        sozinho:
          'As aulas favorecem a prática com mais autonomia, mas não garantem que ele faça tudo sozinho. É preciso conferir quem poderá ajudar quando necessário antes de comprar.',
      } as Record<string, string>
    )[a.apoio]!
  let practical = format + ' ' + equipment + ' ' + support
  const expectations: Record<string, string> = {
    conduzir:
      ' Quando ele disser que não conseguiu, vocês podem olhar o que tentou, rever a orientação e escolher uma parte menor para investigar.',
    ritmo:
      ' Ele pode pausar e rever as aulas, retomando em outro momento dentro do período de acesso.',
    interesse:
      ' Vale mostrar a aventura e os exemplos da próxima página a ele e ouvir o que teria vontade de experimentar antes de decidir.',
    preco:
      ' O preço e as condições aparecem na próxima página para vocês conferirem se cabem no orçamento.',
    ao_vivo:
      ' A necessidade de professor individual ao vivo que você procura não é atendida por esse formato. A orientação por mensagens não substitui esse acompanhamento.',
    escola:
      ' O foco aqui é a prática de habilidades em projetos. A necessidade de correção de lições ou reforço do conteúdo da série que você procura não é atendida diretamente por esse formato.',
    geral:
      ' A próxima página mostra as etapas e os recursos para você avaliar como funcionaria na rotina de vocês.',
  }
  practical += expectations[a.condicao]!
  paragraphs.push(practical)
  const terms =
    mode === 'desafio'
      ? 'O Desafio tem pagamento único, 30 dias de acesso desde a aprovação do pagamento e 7 dias de garantia.'
      : 'A Comunidade tem planos mensal e anual, até dois perfis Kids e 7 dias para pedir reembolso integral. O acesso acompanha o período contratado.'
  const ready = !(needsSupport || needsOrganize || differentNeed)
  const close = ready
    ? goal === 'explorar' || a.interesse === 'descobrir'
      ? 'Conheça o treinamento e olhe os exemplos com seu filho. Essa conversa pode ajudar a decidir se esse é um caminho que vocês querem experimentar.'
      : mode === 'desafio'
        ? 'Conheça o treinamento para ver como essa prática ganha forma na Chave do Farol e avaliar se esse é o próximo passo para vocês.'
        : 'Conheça o treinamento e os projetos para avaliar se esse caminho de prática pode fazer parte da rotina de vocês.'
    : 'Você pode conhecer o treinamento para entender os exemplos e o formato. Antes de comprar, é necessário resolver as condições de acompanhamento ou buscar uma proposta que atenda à necessidade específica de vocês.'
  paragraphs.push(terms + ' ' + close)
  const title =
    goal === 'explorar'
      ? 'Um caminho para observar, praticar e descobrir o próximo passo.'
      : COPY.skills[goal]!.headline
  const reading: Reading = {
    lead: DESIRES[goal]!,
    payoff: opening.slice(DESIRES[goal]!.length).trim(),
    context: paragraphs[1]!,
    attempt: ATTEMPT_TEXT[mode][branch]![a.tentativas]!,
    purpose: paragraphs[2]!.slice(ATTEMPT_TEXT[mode][branch]![a.tentativas]!.length).trim(),
    interest: INTEREST_BRIDGE[a.interesse]!,
    offer: offer.slice(INTEREST_BRIDGE[a.interesse]!.length).trim(),
    practice: paragraphs[4]!,
    school: g.school,
    home: g.home,
    transfer: bridge.slice((g.school + ' ' + g.home).length).trim(),
    continuity: mode === 'comunidade' ? paragraphs[6]! : '',
    format,
    equipment,
    support,
    expectation: expectations[a.condicao]!.trim(),
    terms,
    invitation: close,
  }
  return {
    title: flex(title, a),
    paragraphs: paragraphs.map((t) => flex(t, a)),
    reading: flexReading(reading, a),
    attention: differentNeed,
    figureAfter: 4,
    cta: ready ? 'Conhecer o treinamento' : 'Conhecer o formato e os requisitos',
    href: `/kids/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}/oferta${young ? '/criar-junto' : ''}`,
    fit: ready ? 'explorar-treinamento' : 'conferir-condicoes',
    skill: goal,
    branch,
  }
}
