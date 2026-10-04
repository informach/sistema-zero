import type { QuizAnswers } from '../../../lib/quiz-types'
import { answerList, DESAFIO_BASE, type DesafioProfile, desafioDecision } from './engine'

const MOTIVE: Record<DesafioProfile, string> = {
  A: 'encontrar uma construção para uma parte do tempo de tela que vocês já combinaram',
  B: 'ver um primeiro jogo funcionando, construído pelo seu filho com orientação',
  C: 'dar espaço ao interesse por desenhos, personagens e histórias',
  D: 'conhecer uma iniciação em programação e entender o que seu filho aprende',
}
const TITLES: Record<DesafioProfile, string> = {
  A: 'Uma parte do tempo combinado pode virar um jogo para vocês conhecerem juntos',
  B: 'Um primeiro jogo, com ajuda para construir uma parte de cada vez',
  C: 'O interesse por personagens pode abrir uma conversa sobre como um jogo funciona',
  D: 'Um primeiro contato com programação que vocês conseguem ver no jogo',
}
const DOUBTS: Record<string, { title: string; paragraphs: string[]; visual: string }> = {
  interesse: {
    title: 'Comece ouvindo o que chama a atenção dele',
    visual: 'farol',
    paragraphs: [
      'Antes de escolher por ele, mostre a aventura e a regra que faz a porta responder. Se ele já pediu para criar um jogo, você pode retomar essa vontade. Se ainda não pediu, a conversa serve para apresentar uma possibilidade. Observe se quer experimentar e o que gostaria de entender ou mudar. Uma primeira reação não define capacidade nem obriga vocês a comprar.',
    ],
  },
  companhia: {
    title: 'Sua companhia ajuda a descobrir de que apoio ele precisa',
    visual: 'aula',
    paragraphs: [
      'Sua dúvida é quanto dessa atividade vai depender de você. Vale estar junto no primeiro acesso, ajudar a abrir a aula e observar uma pequena tentativa. Depois da explicação, veja se seu filho consegue pausar, localizar o bloco e testar. Se ainda precisar de apoio, vocês podem combinar outra tentativa com companhia.',
      'A aula explica a montagem. Você pode ajudar a se organizar e a comunicar uma dúvida, sem assumir a programação no lugar dele. A autonomia vai sendo observada durante a atividade; não há a promessa de que toda criança fará tudo sozinha.',
    ],
  },
  ajuda: {
    title: 'Quando uma parte não funciona, ele tem por onde retomar',
    visual: 'ajuda',
    paragraphs: [
      'Seu filho pode comparar o que montou com a explicação e usar “Verificar esta etapa”, que confere os critérios da montagem. Jogar continua sendo necessário para observar o resultado. Se a dúvida persistir, o “Preciso de ajuda” no rodapé permite explicar o que aconteceu a partir da aula.',
      'Por exemplo: ele pegou a chave, mas a porta não respondeu. A conversa segue nos Recados, e a resposta pode exigir espera. Assim, ele tem um caminho para consultar a orientação e retomar a tentativa. Não há um professor ao vivo observando cada movimento.',
    ],
  },
  rotina: {
    title: 'Combinem um primeiro momento com o computador disponível',
    visual: 'caderno',
    paragraphs: [
      'A família pode reservar uma parte do tempo de tela que já permite para conhecer a aventura e experimentar a primeira construção. Como a explicação é gravada, seu filho pode pausar e voltar ao trecho durante o acesso. As três etapas organizam a montagem; não obrigam a fazer tudo em três dias seguidos.',
      'O prazo de uso é de 30 dias a partir da aprovação do pagamento e continua correndo entre as tentativas. Vale escolher um período em que vocês conseguirão abrir espaço para essa experiência. O caderno acompanha os passos das aulas e fica disponível para consulta.',
    ],
  },
  valor: {
    title: 'O valor está no percurso que acompanha a construção',
    visual: 'aula',
    paragraphs: [
      'A compra reúne a introdução ao jogo, três etapas de programação, explicações que podem ser revistas, prática dentro da aula, material de consulta e ajuda por mensagens. Seu filho continua o projeto que enviou e aprende a publicar a criação no Mural.',
      'Curso e participação completa no Mural ficam disponíveis por 30 dias. Depois permanece a visita para ver e jogar. Essa compra não vira assinatura. Para decidir se vale a experiência, compare o que seu filho procura com esse projeto e esse formato, além de conferir o preço na oferta.',
    ],
  },
  sem_duvida: {
    title: 'Uma pequena tentativa pode mostrar como ele acompanha',
    visual: 'aula',
    paragraphs: [
      'Mostre a aventura ao seu filho e conversem sobre o que ele gostaria de experimentar. Os desenhos já vêm preparados: a atividade será montar as regras do jogo no computador. Vocês podem conhecer como a explicação acompanha a montagem, o que acontece quando ele testa e como envia uma dúvida. Assim, o convite parte de algo que ambos conseguiram conhecer.',
    ],
  },
}

export function buildDesafioResult(answers: QuizAnswers) {
  const decision = desafioDecision(answers)
  if (!decision) return null
  const interests = answerList(answers.interesses)
  const intro: string[] = []
  if (decision.principal) {
    intro.push(
      `Você quer ${MOTIVE[decision.principal]}. ${decision.motivos.length === 2 ? `Também considera importante ${MOTIVE[decision.motivos.find((p) => p !== decision.principal)!]}. O começo pode dar mais espaço à prioridade que você escolheu, sem apagar o outro interesse.` : 'Vale apresentar uma atividade concreta para conhecer como ele participa desse começo.'}`,
    )
  } else if (decision.state === 'compartilhado')
    intro.push(
      `Você deu o mesmo peso a ${decision.motivos.map((p) => MOTIVE[p]).join(' e a ')}. Vamos considerar os dois motivos ao pensar em um primeiro passo, sem escolher uma prioridade por você.`,
    )
  else if (decision.state === 'outra_procura')
    intro.push(
      'Você contou que o que procura não aparece nas opções. Por isso, vale esclarecer que tipo de atividade tem em mente antes de escolher. A sugestão abaixo é uma possibilidade para vocês compararem com essa procura, e não uma confirmação de que ela corresponde ao seu objetivo.',
    )
  else
    intro.push(
      'Você ainda está procurando uma ideia para apresentar ao seu filho. Vale conhecer uma atividade concreta antes de decidir um curso por ele. A reação à proposta ajuda a escolher o próximo passo, sem funcionar como teste de capacidade.',
    )
  if (interests.includes('quer_criar'))
    intro.push(
      'Você contou que ele já falou em criar ou mudar um jogo. Essa vontade relatada pode ser o ponto de partida da conversa. Mostre tanto o jogo pronto quanto os blocos que ele montaria, para comparar a ideia que imaginou com esta primeira experiência guiada.',
    )
  else if (interests.includes('inventa_historias'))
    intro.push(
      'Você observa que ele inventa personagens ou histórias. Vocês podem conversar sobre uma ação do personagem: o que acontece quando ele encontra uma porta fechada? No jogo, essa ideia precisa virar uma regra. Isso oferece uma ponte para conhecer programação, sem presumir que ele já queira programar.',
    )
  else if (interests.includes('desenha'))
    intro.push(
      'Você contou que ele gosta de desenhar. Reconheça esse interesse na conversa: ele quer aprender a desenhar um personagem ou também tem curiosidade de programar o que esse personagem faz? Entender essa diferença ajuda a escolher uma atividade que corresponda ao que ele imaginou.',
    )
  else if (interests.includes('joga'))
    intro.push(
      'Ele gosta de jogar, mas você ainda não contou que tenha pedido para criar um jogo. Vale apresentar essa possibilidade e ouvir o que chama a atenção dele. Querer jogar a aventura pronta e querer montar suas regras são escolhas diferentes.',
    )
  else if (interests.includes('nao_observei'))
    intro.push(
      'Você quer apresentar algo novo, porque ainda não observou essas situações em casa. Pode mostrar um exemplo de criação e ouvir o que ele percebe. Seu filho pode querer experimentar, fazer perguntas ou preferir outra atividade; qualquer uma dessas respostas ajuda na escolha.',
    )
  else
    intro.push(
      'Você ainda não sabe dizer quais desses interesses aparecem no dia a dia. Mostrar uma atividade e ouvir o que ele percebe pode ajudar a conhecer essa preferência. Não saber informar agora não significa que ele não tenha interesses.',
    )

  const refused = answers.abertura_criacao === 'outra_atividade'
  const presentation = refused
    ? 'Você está procurando outro tipo de atividade, e essa escolha precisa orientar o próximo passo. O Desafio do Primeiro Jogo, do Sistema Zero, é uma iniciação guiada em programação de jogos. Abaixo, explico as diferenças para você não escolher uma experiência esperando encontrar outra.'
    : 'Uma possibilidade para conhecer esse jeito de aprender é o Desafio do Primeiro Jogo. É uma primeira experiência dentro da plataforma da Comunidade dos Criadores, do Sistema Zero: seu filho aprende a programar a aventura A Chave do Farol, fazendo o personagem andar, encontrar uma chave e abrir uma porta. Os desenhos já vêm preparados; ele monta e testa as regras que fazem o jogo funcionar.'
  const invitation = refused
    ? 'Quero conhecer melhor o que você tem vontade de criar. Você pode me mostrar uma ideia, um desenho ou um jogo que tenha a ver com isso? Vamos conversar sobre o que você gostaria de aprender a fazer?'
    : interests.includes('quer_criar')
      ? 'Você comentou que queria criar um jogo. Vamos conhecer como se monta a regra dessa porta? Primeiro a gente conhece a aventura, depois vê os blocos que fazem ela responder.'
      : interests.includes('inventa_historias') || interests.includes('desenha')
        ? 'Se esse personagem entrasse em um jogo, o que faria ao encontrar uma porta fechada? Vamos conhecer como uma regra faz essa cena acontecer? No Farol, a arte já vem preparada.'
        : 'Nesse jogo, a porta só responde depois que o personagem encontra a chave. Você gostaria de conhecer como a gente monta essa regra? Vamos ver o jogo e os blocos juntos?'
  const conditions: string[] = []
  if (answers.equipamento === 'sem_computador')
    conditions.push(
      'Hoje vocês têm celular ou tablet para essa atividade. Para montar o Farol, precisam de computador ou notebook com internet, mouse e teclado. O celular pode servir para conhecer a demonstração e conversar sobre ela, mas não substitui o computador no curso.',
    )
  if (answers.equipamento === 'a_conferir')
    conditions.push(
      'Você ainda precisa conferir o equipamento e a conexão. Antes da compra, confirme se haverá um computador ou notebook com internet, mouse e teclado disponível durante os 30 dias. Até essa checagem, a indicação continua sendo uma possibilidade a avaliar.',
    )
  if (answers.equipamento === 'compartilhado')
    conditions.push(
      'Como o computador é compartilhado, combinem um horário em que ele estará disponível. O curso não exige três dias seguidos: a montagem pode ser distribuída dentro do prazo de acesso.',
    )
  if (answers.formato === 'exige_ao_vivo')
    conditions.push(
      'Você precisa de um professor ao vivo acompanhando a atividade. O Desafio oferece explicações gravadas e ajuda por mensagens, com possível espera. Essa diferença importa: ele não atende ao acompanhamento que você descreveu. A Comunidade usa o mesmo formato assíncrono e também não substitui essa exigência.',
    )
  if (answers.formato === 'a_conferir')
    conditions.push(
      'Você ainda quer entender o formato antes de escolher. A explicação gravada pode ser pausada no momento de montar e revista quando faltar um passo. A família escolhe o horário; as dúvidas seguem por mensagem, com possível espera. Conheça esse funcionamento antes de decidir se corresponde ao apoio de que vocês precisam.',
    )
  if (answers.experiencia === 'independente')
    conditions.push(
      'Você contou que seu filho já monta jogos por conta própria. O Farol é introdutório: movimento, coleta e uma decisão com a chave. Ele pode servir para conhecer a plataforma, mas compare esse nível com o que seu filho já faz antes de comprar.',
    )
  if (answers.abertura_criacao === 'outra_atividade') {
    const mismatch: Record<string, string> = {
      desenho:
        'Vocês procuram uma atividade centrada em desenhar. No Farol, os desenhos já vêm preparados, e a tarefa é programar as regras. Por isso, eu não indicaria esse curso como se ele atendesse ao que você quer. A proposta de expressão visual da Comunidade pode ser conhecida separadamente: ela liga desenho a projetos interativos e tem condições próprias.',
      ferramenta_especifica:
        'Vocês procuram um curso feito no Roblox ou Minecraft. O Farol é construído no Estúdio do Sistema Zero, dentro do navegador. Ele não ensina a criar nessas plataformas, então a semelhança de assunto não faz dele uma entrega equivalente.',
      avancado:
        'Vocês querem um projeto mais avançado. O Farol foi organizado como iniciação guiada e pode ser simples para o momento do seu filho. A Comunidade tem um percurso mais amplo, mas é preciso conferir o catálogo e a Jornada antes de esperar dela um curso avançado específico.',
      outro:
        'Você procura outro tipo de atividade. O Farol oferece uma construção guiada de programação com arte preparada. O próximo passo é esclarecer a atividade que vocês querem encontrar e comparar o que ela permite fazer com essa procura.',
    }
    conditions.push(mismatch[String(answers.desencontro)] ?? '')
  } else if (interests.includes('desenha') || decision.motivos.includes('C'))
    conditions.push(
      'No Farol, os desenhos já vêm preparados. Seu filho programa o movimento, a coleta e a porta; não aprende a desenhar personagens neste curso. Vale mostrar essa diferença antes de escolher: ele quer desenhar ou também gostaria de descobrir como fazer um personagem responder? O interesse por desenho continua sendo considerado.',
    )
  const format =
    answers.formato === 'prefere_ao_vivo'
      ? 'Você prefere aulas ao vivo, mas está aberto a conhecer o gravado. Aqui, seu filho assiste a uma explicação e pode interrompê-la no ponto de montar. Se localizar um bloco levar mais tempo, o trecho fica disponível para rever. A família escolhe o horário; dúvidas seguem por mensagens, com possível espera. Essa flexibilidade vem com um formato diferente de ter um professor presente durante a tentativa.'
      : 'No Desafio do Primeiro Jogo, a explicação fica junto da atividade. Seu filho pode pausar, montar os blocos no Estúdio da aula e testar se o personagem respondeu. Quando faltar um passo, pode rever o trecho ou consultar o caderno. A ajuda da aula acontece por mensagens e pode exigir espera.'
  const experience =
    answers.experiencia === 'interrompida'
      ? 'Você contou que ele começou uma tentativa, mas ainda não conseguiu uma versão funcionando. No Farol, ele encontra um projeto guiado desde o começo, com uma parte para montar e testar de cada vez. Se tiver uma criação anterior, vocês podem conversar sobre onde ela parou; não é preciso transferi-la para o Sistema Zero.'
      : answers.experiencia === 'guiada'
        ? 'Ele já fez uma versão funcionar com orientação. No Farol, pode conhecer outra sequência: montar o movimento, fazer o jogo guardar a coleta da chave e usar essa informação na porta. Vale comparar essas três construções com o que já experimentou.'
        : 'O cenário, os desenhos e o movimento do barco vêm preparados. A criança monta as regras do personagem, guarda a coleta da chave e programa as duas respostas da porta. Cada parte pode ser jogada e comparada com o que ela esperava ver.'
  const blocked = decision.unmet.length > 0
  return {
    decision,
    intro,
    presentation,
    invitation,
    refused,
    conditions,
    title: blocked
      ? 'Antes de escolher, há condições importantes para a sua família'
      : decision.next === 'retomar_com_apoio'
        ? 'Um primeiro jogo com um passo para retomar quando algo não funciona'
        : decision.principal
          ? TITLES[decision.principal]
          : 'Vale conhecer uma construção e conversar sobre ela com seu filho',
    doubt: DOUBTS[String(answers.duvida)] ?? DOUBTS.sem_duvida!,
    bridge: [
      format,
      experience,
      'Enquanto ele experimenta, você pode observar o que desperta sua curiosidade, como acompanha a explicação e de que ajuda precisa. Assim, vocês conhecem a plataforma na rotina da família e têm essa experiência para decidir se querem continuar com os cursos e recursos da Comunidade dos Criadores. O Desafio é uma compra única para esse primeiro percurso; a assinatura é uma escolha separada.',
    ],
    showBridge: !blocked,
    copyFirst: decision.next === 'conversar_com_filho',
    primary: refused
      ? { href: '/como-funciona/', label: 'Conhecer a proposta da plataforma' }
      : blocked || decision.next === 'conferir_condicoes'
        ? { href: `${DESAFIO_BASE}/oferta#requisitos`, label: 'Conferir as condições do curso' }
        : {
            href: decision.offerPath,
            label:
              decision.principal === 'A'
                ? 'Ver o Desafio por dentro'
                : decision.principal === 'D'
                  ? 'Ver como funciona essa iniciação'
                  : 'Conhecer o primeiro projeto',
          },
    alternative:
      answers.desencontro === 'desenho' &&
      !decision.unmet.includes('formato') &&
      !decision.unmet.includes('computador')
        ? {
            href: '/kids/comunidade-dos-criadores/oferta/expressao-visual',
            label: 'Conhecer desenho ligado a projetos interativos na Comunidade',
          }
        : null,
  }
}
export type DesafioResult = NonNullable<ReturnType<typeof buildDesafioResult>>
