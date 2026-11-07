import type { AdultMode, AdultNarrative, CompleteAnswers, Goal } from './types'

const DESIRE: Record<CompleteAnswers['interesse'], string> = {
  ideia: 'Você quer ver uma ideia sua funcionando e participar das escolhas que dão forma a ela.',
  entender: 'Entender o que acontece por trás da tela é parte do que desperta sua curiosidade.',
  prazer:
    'Você procura um projeto pelo prazer de aprender, experimentar e ter algo seu em construção.',
  descobrir:
    'Você ainda está descobrindo o que gostaria de criar. A curiosidade pode ser um ponto de partida para experimentar.',
}
const EXPERIENCE: Record<CompleteAnswers['experiencia'], string> = {
  nunca:
    'Como ainda não começou uma criação assim, vale conhecer um projeto pequeno e o que você faria em cada parte.',
  acompanhei:
    'O exemplo que você já acompanhou dá uma referência para escolher o que quer aprender a fazer por conta própria.',
  parei:
    'Você já construiu uma parte. Um caminho para retomar precisa mostrar o que falta e como conferir o conjunto.',
  terminei:
    'Você já concluiu uma pequena criação e experimentou mudanças suas. Essa experiência pode servir de referência para a próxima.',
  proprio:
    'Você já constrói e modifica projetos por conta própria. Vale comparar o que uma nova proposta ensina com o que você já consegue fazer.',
}
const TITLES: Record<AdultMode, Record<Goal, string>> = {
  desafio: {
    comecar: 'Um começo claro para transformar sua ideia em uma primeira criação.',
    compreender: 'Entender uma regra é o primeiro passo para fazer escolhas suas.',
    concluir: 'Sua próxima conquista pode ser uma pequena criação completa.',
    autoria: 'O que você entende hoje pode dar forma a uma ideia diferente.',
    explorar: 'Um primeiro projeto pode ajudar você a descobrir o que gosta de criar.',
  },
  comunidade: {
    comecar: 'Comece com uma criação e encontre um caminho para continuar.',
    compreender: 'Compreenda uma criação para ter mais escolhas na próxima.',
    concluir: 'Dê continuidade às suas ideias, até ter criações para mostrar.',
    autoria: 'Amplie o que sabe fazer para experimentar ideias suas.',
    explorar: 'Conheça um percurso de criação antes de decidir como quer seguir.',
  },
}
const PRIORITY: Record<Goal, string> = {
  comecar:
    'Seu primeiro avanço: saber o que fazer, experimentar uma parte e ver o resultado na tela.',
  compreender:
    'Seu próximo avanço: mudar uma instrução e explicar por que o resultado ficou diferente.',
  concluir:
    'Seu próximo avanço: juntar as partes, conferir o conjunto e chegar a uma versão para mostrar.',
  autoria: 'Seu próximo avanço: entender uma regra e experimentar como usá-la em outra ideia.',
  explorar:
    'Seu próximo passo: conhecer uma construção concreta e perceber se esse jeito de criar desperta seu interesse.',
}
const OBSTACLE: Record<CompleteAnswers['trava'], string> = {
  comecar:
    'O começo fica mais claro quando a ideia vira um objetivo pequeno, como fazer uma imagem responder a um clique. Você consegue observar essa primeira parte antes de montar o restante.',
  entender:
    'Para fazer uma mudança sua, ajuda ligar cada instrução ao efeito que ela produz. Trocar uma posição e observar onde a imagem aparece torna essa relação concreta.',
  testar:
    'Quando uma tentativa falha, separar o que deveria acontecer do que apareceu na tela dá um ponto de investigação. Você pode conferir o clique, a resposta e a ordem das ações.',
  organizar:
    'Para juntar as partes, ajuda definir o papel de cada uma e a ordem em que precisam funcionar. Um objetivo por etapa permite acompanhar o que está pronto e o que falta.',
  nenhuma:
    'Você pode escolher o próximo aprendizado pelo que deseja acrescentar às suas criações. Vale olhar uma demonstração e comparar as escolhas possíveis com o que já sabe fazer.',
}
const HELP: Record<CompleteAnswers['ajuda'], string> = {
  paro: 'Ter um objetivo visível e saber onde pedir uma orientação pode ajudar quando você fica sem saber o que procurar.',
  repito:
    'Ao repetir uma explicação, confira o resultado de cada etapa. Assim, a repetição também ajuda a descobrir em que ponto apareceu a diferença.',
  investigo:
    'Conferir uma parte de cada vez oferece uma maneira de investigar a dificuldade e escolher a próxima tentativa.',
  pergunto:
    'Uma dúvida específica, mostrando o que tentou e o que aconteceu, ajuda a aproveitar a orientação recebida.',
  nao_sei:
    'Na prática, você também pode descobrir como prefere investigar uma dúvida e que apoio ajuda a continuar.',
}
const CONSEQUENCE: Record<CompleteAnswers['peso'], string> = {
  dependencia:
    'Compreender uma regra dá uma referência para tentar uma mudança sua, inclusive quando não há um passo a passo daquela ideia.',
  incerteza:
    'Explicar o efeito que espera de uma mudança e conferir o resultado permite perceber o que entendeu e o que ainda precisa revisar.',
  inacabado:
    'Chegar a uma versão pequena que funciona transforma as partes da construção em algo que você pode mostrar.',
  possibilidades:
    'Reencontrar uma regra em outro projeto ajuda a levar o aprendizado para as ideias que hoje ficam guardadas.',
  tranquilo:
    'A curiosidade e o prazer de criar podem ser motivos suficientes para conhecer esse caminho, sem obrigação de acelerar seu ritmo.',
}
const BENEFIT: Record<CompleteAnswers['beneficio'], string> = {
  capacidade:
    'A conquista que você procura ganha uma forma concreta: olhar para uma criação, entender uma parte e perceber que consegue escolher o que fazer com ela.',
  prazer:
    'Esse caminho pode dar espaço ao interesse que você quer cultivar nas horas livres, com pequenas realizações para aproveitar durante a construção.',
  compartilhar:
    'A criação pronta dá um assunto concreto para a troca que você deseja: mostrar o que fez e explicar uma escolha sua.',
  possibilidades:
    'Cada regra compreendida acrescenta uma referência para as próximas ideias que você quer experimentar.',
  conhecer:
    'Você pode primeiro conhecer a experiência, observar se ela desperta seu interesse e decidir com mais clareza.',
}
function effect(a: CompleteAnswers, community: boolean) {
  if (a.efeito === 'guardado')
    return a.experiencia === 'nunca'
      ? 'Para transformar vontade em tentativa, a primeira parte precisa ser pequena o bastante para você conseguir começar.'
      : community
        ? 'Ao retomar, saber o que já funciona e o que vem depois ajuda a reencontrar o projeto.'
        : 'Saber onde parou e o que falta permite voltar ao projeto com uma próxima ação definida.'
  if (a.efeito === 'referencias')
    return a.experiencia === 'nunca'
      ? 'Escolher uma construção pequena dá uma finalidade às referências que você vem guardando.'
      : 'A próxima explicação ganha mais utilidade quando você consegue ligá-la ao que já construiu.'
  if (a.efeito === 'avanco')
    return a.experiencia === 'nunca'
      ? 'A intenção de escolher uma parte para experimentar dá um começo possível à sua curiosidade.'
      : 'Você já consegue aproveitar uma tentativa para seguir adiante. Novas situações podem ampliar as escolhas que faz com esse aprendizado.'
  return a.peso === 'tranquilo'
    ? ''
    : 'Você está bem com seu ritmo e também reconhece possibilidades que gostaria de explorar.'
}
const PRACTICE: Record<Goal, [string, string][]> = {
  comecar: [
    [
      'Um objetivo para começar.',
      'Montar o movimento do personagem e conferir se ele responde ao comando.',
    ],
    ['Uma mudança por vez.', 'Trocar a posição da chave e observar onde ela aparece.'],
    [
      'Um resultado para conferir.',
      'Jogar a versão que você construiu e verificar se a aventura funciona.',
    ],
  ],
  compreender: [
    ['Compreender a informação.', 'Guardar se a chave foi encontrada durante a aventura.'],
    ['Entender a condição.', 'Conferir por que o farol depende dessa informação para acender.'],
    ['Testar os dois caminhos.', 'Chegar ao farol com e sem a chave e comparar as respostas.'],
  ],
  concluir: [
    ['Separar a construção.', 'Montar movimento, coleta da chave e condição em etapas.'],
    ['Conferir as partes.', 'Usar os objetivos da atividade para revisar o que ainda falta.'],
    ['Reunir e mostrar.', 'Testar a aventura completa e publicar a versão concluída no Mural.'],
  ],
  autoria: [
    ['Conhecer uma regra.', 'Entender o que faz uma ação depender da chave encontrada.'],
    ['Fazer uma escolha sua.', 'Mudar um aviso e testar se ele orienta melhor quem joga.'],
    [
      'Ampliar as combinações.',
      'Usar o que entendeu como referência para outras construções, com mais prática.',
    ],
  ],
  explorar: [
    ['Conhecer o objetivo.', 'Ver como personagem, chave e farol participam da aventura.'],
    ['Experimentar uma decisão.', 'Mudar a posição de um elemento e observar o efeito.'],
    [
      'Perceber seu interesse.',
      'Descobrir se montar, testar e personalizar desperta sua vontade de continuar.',
    ],
  ],
}
const COMMUNITY_PRACTICE: Record<Goal, [string, string][]> = {
  comecar: [
    [
      'Começar com uma ação.',
      'Em Cadê Todo Mundo, relacionar um clique ao que acontece com um personagem.',
    ],
    ['Acrescentar uma condição.', 'No Farol, fazer uma ação depender de ter encontrado a chave.'],
    [
      'Reconhecer o que aprendeu.',
      'Comparar as duas construções e explicar o que mudou entre elas.',
    ],
  ],
  compreender: [
    [
      'Ligar uma ação ao efeito.',
      'Em Cadê Todo Mundo, entender o que acontece quando alguém clica.',
    ],
    [
      'Descobrir uma regra nova.',
      'No Farol, entender por que chegar ao destino ainda depende da chave.',
    ],
    [
      'Usar a diferença.',
      'Conferir quando basta uma ação e quando é preciso verificar uma condição.',
    ],
  ],
  concluir: [
    [
      'Ter um objetivo por projeto.',
      'Conferir o que significa terminar Cadê Todo Mundo e a aventura do Farol.',
    ],
    ['Retomar uma parte.', 'Voltar à aula, reconhecer onde parou e testar o que já construiu.'],
    [
      'Mostrar e seguir.',
      'Compartilhar uma versão no Mural e escolher o próximo passo da Jornada.',
    ],
  ],
  autoria: [
    [
      'Reconhecer uma regra.',
      'Comparar o clique de Cadê Todo Mundo com a condição da chave no Farol.',
    ],
    [
      'Experimentar uma escolha.',
      'Modificar uma mensagem e conferir o que ela comunica a quem joga.',
    ],
    [
      'Ampliar o que sabe fazer.',
      'Encontrar novas combinações nos projetos e recursos liberados pelo percurso.',
    ],
  ],
  explorar: [
    [
      'Conhecer duas construções.',
      'Ver a descoberta de personagens e a aventura da chave e do farol.',
    ],
    [
      'Observar o que desperta interesse.',
      'Perceber se gosta de montar ações, investigar regras ou personalizar mensagens.',
    ],
    [
      'Avaliar como continuar.',
      'Conhecer os cursos e as condições da assinatura antes de decidir.',
    ],
  ],
}
export function buildNarrative(mode: AdultMode, a: CompleteAnswers): AdultNarrative {
  const community = mode === 'comunidade',
    goal = a.conquista
  const advanced = a.experiencia === 'proprio'
  const has = (c: CompleteAnswers['condicao'][number]) => a.condicao.includes(c)
  const flags = []
  if (a.computador === 'celular') flags.push('computador')
  if (a.computador === 'verificar') flags.push('confirmar')
  if (has('ao_vivo')) flags.push('ao_vivo')
  if (has('livre')) flags.push('livre')
  if (advanced && !community) flags.push('avancado')
  const limited = flags.length > 0
  let title = TITLES[mode][goal]
  if (a.experiencia === 'nunca' && goal === 'autoria')
    title = 'Entender uma primeira regra pode abrir espaço para escolhas suas.'
  if (flags.includes('computador'))
    title = 'Seu primeiro passo é encontrar um computador para criar.'
  else if (flags.includes('confirmar'))
    title = 'Confirme onde você vai praticar antes de escolher o caminho.'
  else if (flags.includes('ao_vivo'))
    title = 'Acompanhamento ao vivo é uma condição importante para você.'
  else if (flags.includes('livre'))
    title = 'Vale conferir o espaço para uma ideia sua desde o começo.'
  else if (flags.includes('avancado'))
    title = 'Você já cria por conta própria. Confira o que este começo acrescentaria.'
  const fit = []
  if (a.computador === 'celular')
    fit.push(
      'Para construir, você precisa de um computador com internet, mouse e teclado. Celular ou tablet permitem conhecer a proposta e jogar criações publicadas, mas não substituem esse requisito. Hoje, essa condição ainda precisa ser resolvida.',
    )
  else if (a.computador === 'verificar')
    fit.push(
      'Você ainda precisa confirmar um computador com internet, mouse e teclado. Verifique esse acesso antes de contratar; a construção é feita pelo navegador do computador.',
    )
  else if (a.computador === 'compartilhado')
    fit.push(
      'Como o computador é compartilhado, combine os momentos em que poderá usá-lo. Para construir, ele precisa ter internet, mouse e teclado; o projeto fica associado à sua conta pessoal.',
    )
  else
    fit.push(
      'Você já tem o computador necessário. A construção acontece no navegador, com internet, mouse e teclado, em uma conta adulta própria.',
    )
  if (has('ao_vivo'))
    fit.push(
      'Para você, uma pessoa acompanhando ao vivo é indispensável. Aqui, as aulas são gravadas e a ajuda é por mensagens. Esse formato não atende a essa necessidade.',
    )
  if (has('livre'))
    fit.push(
      community
        ? 'Você quer trabalhar diretamente em uma ideia sua. Na Comunidade, o espaço de criação livre é liberado conforme os requisitos do percurso de aprendizagem. Confira esses requisitos antes de decidir.'
        : 'Você quer começar diretamente em uma ideia sua. O Desafio usa um projeto preparado, com escolhas dentro dessa construção. A ferramenta fica disponível nas atividades do curso; não há um espaço livre para qualquer projeto.',
    )
  if (advanced)
    fit.push(
      community
        ? 'Como você já cria por conta própria, compare os cursos disponíveis e os requisitos das ferramentas com o que deseja aprender. As liberações seguem o percurso da plataforma, inclusive para quem traz experiência anterior.'
        : 'Seu relato já vai além do começo que o Desafio apresenta. Ele é introdutório; confira as etapas antes de decidir se acrescenta algo ao que você já sabe.',
    )
  if (has('tempo'))
    fit.push(
      community
        ? 'Sua rotina pede atenção ao tempo de prática. As aulas gravadas e os projetos salvos permitem retomar, mas é preciso reservar momentos para construir durante o período contratado.'
        : 'Sua rotina está apertada. Confira se consegue reservar momentos para construir e testar dentro dos 30 dias de acesso. As aulas gravadas permitem organizar os horários.',
    )
  if (has('apoio') && !has('ao_vivo'))
    fit.push(
      'Há materiais de consulta e ajuda por mensagens na plataforma. Você pode enviar uma dúvida à equipe; a resposta pode levar um tempo.',
    )
  const productLead = community
    ? 'A Comunidade dos Criadores do Sistema Zero propõe aprender criando jogos, com aulas guiadas e novos projetos para continuar praticando. Você começa por construções pequenas e amplia as regras que entende e consegue usar.'
    : 'No Desafio do Primeiro Jogo do Sistema Zero, você constrói A Chave do Farol em três etapas guiadas. O cenário e os personagens vêm preparados; você programa o movimento, a coleta da chave e a condição para acender o farol.'
  const mechanism =
    'O jogo torna uma escolha visível: a instrução que você monta muda o que acontece na tela. A programação é feita com blocos, peças que representam essas instruções. Ao montar, explicar e testar uma regra, você pratica decidir como a criação deve funcionar.'
  const continuity = community
    ? [
        'Ao encontrar uma regra em outra situação, você precisa reconhecer o que ela faz e decidir como usá-la. Essa prática dá mais referências para construir, além da experiência de terminar um único projeto.',
        'A assinatura reúne cursos, ferramentas, materiais e um Mural para compartilhar criações. A Jornada, o percurso de aprendizagem da plataforma, orienta os próximos passos e as liberações. O acesso depende do período contratado; as aulas são gravadas e a ajuda é por mensagens.',
      ]
    : [
        'Vídeo e prática ficam na mesma aula. Você acompanha uma explicação, constrói uma parte e confere o objetivo antes de continuar. Há materiais de consulta e ajuda por mensagens para dúvidas, sem acompanhamento ao vivo. Ao concluir, pode compartilhar a criação no Mural.',
        'É uma compra única, com 30 dias de acesso desde a aprovação do pagamento e sete dias de garantia da compra. Continuar na Comunidade é uma contratação opcional e separada.',
      ]
  const lead = [DESIRE[a.interesse], EXPERIENCE[a.experiencia]].join(' ')
  const obstacle =
    a.experiencia === 'nunca' && a.trava === 'nenhuma'
      ? 'Você ainda está conhecendo esse tipo de criação. Uma demonstração concreta pode ajudar a perceber o que desperta seu interesse e quais dúvidas aparecem.'
      : OBSTACLE[a.trava]
  const reasoning = [
    `${obstacle} ${HELP[a.ajuda]}`,
    [effect(a, community), CONSEQUENCE[a.peso]].filter(Boolean).join(' '),
  ]
  const note = limited
    ? 'Use a página seguinte para conferir esses limites. O caminho precisa caber nas condições que você considera indispensáveis.'
    : community
      ? 'Na próxima página, veja o percurso, os recursos, os planos e as condições de acesso antes de decidir.'
      : 'Na próxima página, veja as etapas, a experiência por dentro, o preço e as condições de acesso antes de decidir.'
  return {
    mode,
    goal,
    flags,
    title,
    lead,
    priority: PRIORITY[goal],
    reasoning,
    productLead,
    mechanism,
    practice: community ? COMMUNITY_PRACTICE[goal] : PRACTICE[goal],
    continuity,
    fit,
    benefit: BENEFIT[a.beneficio],
    note,
    product: community ? 'Comunidade dos Criadores' : 'Desafio do Primeiro Jogo',
    cta: limited
      ? 'Conferir o formato e os requisitos'
      : community
        ? 'Conhecer a Comunidade dos Criadores'
        : 'Conhecer o Desafio do Primeiro Jogo',
    href: community ? '/pro/comunidade-dos-criadores/oferta' : '/pro/desafio-primeiro-jogo/oferta',
    productionHref: community
      ? '/pro/comunidade-dos-criadores/oferta'
      : '/pro/desafio-primeiro-jogo/oferta',
    warningFirst: limited,
    disclaimer: 'Uma orientação do Sistema Zero a partir das suas respostas.',
  }
}
