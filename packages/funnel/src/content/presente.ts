import type { ComunidadeSection } from '../funnels/comunidade-dos-criadores/oferta/types'

/**
 * Copy da página de recebimento do presente Kids (`/bolsa/<codigo>` com o público `kids`), com a
 * proposta de copy aprovada em 05/11/2026, preservando a identidade visual existente.
 * `PresenteOferta.astro` renderiza todo texto visível a partir daqui. `{{nome}}` é quem deu o
 * presente (o embaixador ou o nome da campanha) e `{{data}}` uma data de Brasília.
 */
export interface ImagemPresente {
  src: string
  alt: string
  width: number
  height: number
}

/** Os estados da página sem formulário, com a etiqueta, o título e o texto de cada um. */
export interface EstadoPresente {
  etiqueta: string
  titulo: string
  texto: string
}

export interface EstadosPresente {
  preparing: EstadoPresente
  scheduled: EstadoPresente
  paused: EstadoPresente
  ended: EstadoPresente
  /** O título do encerramento sem a data (convite pessoal, que não tem fim de campanha). */
  endedSemData: string
  retomar: { botao: string; texto: string }
  naoEncontrado: EstadoPresente
  foraDoAr: EstadoPresente
  contato: string
}

export const PRESENTE_KIDS = {
  seoTitle: 'Presente Cadê Todo Mundo | Sistema Zero',
  description:
    'Conheça o Cadê Todo Mundo: sete dias gratuitos para seu filho praticar planejamento, raciocínio e comunicação criando um jogo, com orientação.',
  previaTitle: 'Prévia da campanha | Sistema Zero',
  pular: 'Ir para o conteúdo',
  topo: {
    logo: {
      src: '/img/comunidade-dos-criadores/logo-kids-claro.svg',
      alt: 'Sistema Zero Kids',
      width: 287,
      height: 22,
    },
    marcaAria: 'Sistema Zero Kids, voltar ao topo',
    navAria: 'Atalhos da página',
    links: [
      {
        href: '#jogo',
        label: 'O que ele faz',
      },
      {
        href: '#duvidas',
        label: 'Antes de começar',
      },
    ],
    cta: 'Quero o presente',
  },
  origem: {
    pessoal: 'Um presente de {{nome}} para a sua família',
    evento: '{{nome}}',
    campanha: '{{nome}}',
  },
  previa:
    'Prévia da campanha. Esta página demonstra a apresentação e não aceita cadastros. O link público da campanha respeita o estado e as datas configurados no Admin.',
  hero: {
    titulo: {
      antes: 'Ajude seu filho a resolver problemas e explicar suas ideias ',
      destaque: 'com mais autonomia.',
    },
    texto:
      'O interesse por criar dá ao seu filho um motivo para planejar, testar e pedir ajuda. No Cadê Todo Mundo, ele pratica essas habilidades de forma lúdica, fazendo um jogo de procurar personagens funcionar, com orientação.',
    beneficios: [
      'Pensado para 9 a 17 anos; crianças menores também podem fazer, com um responsável',
      '7 dias de acesso ao curso e ao Mural, contados do cadastro',
      'Presente gratuito, sem cartão e sem assinatura automática',
    ],
    cta: 'Quero o presente para meu filho',
    link: 'Ver como funciona',
    requisitos:
      'Computador com internet, mouse e teclado para fazer o curso · O cadastro pode ser feito pelo celular',
    prazoCampanha:
      'Novos cadastros até {{data}} (Brasília). Esse prazo é da campanha; cada família aceita tem os próprios 7 dias de curso.',
    figura: {
      rotulo: 'Cadê Todo Mundo • 7 dias de presente',
      imagem: {
        src: '/img/cade-todo-mundo/cade-jogo-0.webp',
        width: 1440,
        height: 810,
        alt: 'Jogo real Cadê Todo Mundo: jardim com três esconderijos e contador Achados em zero.',
      },
      zappy: {
        src: '/img/comunidade-dos-criadores/zappy-fala.webp',
        alt: '',
        width: 360,
        height: 458,
      },
      destaque: 'Um primeiro projeto para conhecer esse jeito de aprender.',
      legenda:
        ' Seu filho revela os personagens, faz o jogo contar os achados e dá seu toque à criação.',
    },
  },
  jogo: {
    etiqueta: 'Assim começa a experiência',
    titulo: 'Uma brincadeira simples dá um motivo para pensar e testar',
    paragrafos: [
      'No Cadê Todo Mundo, seu filho faz um jogo de procurar personagens. O jardim e as imagens já estão preparados. Em duas aulas guiadas, ele constrói as regras de revelar e contar os achados, testa o resultado e personaliza partes da criação.',
      'Primeiro, ele experimenta: toca num esconderijo com a reação desligada e depois ligada. Compara o que muda. Quando a regra está ligada, o arbusto some e o coelho aparece. Ele vê a relação entre uma ação e sua consequência.',
      'Depois, leva essa ideia para o próprio jogo. É aqui que entra a programação: organizar instruções que dizem ao computador o que fazer. As instruções aparecem em blocos visuais que ele monta seguindo a aula.',
    ],
    nota: 'A criação dá um objetivo à prática: entender uma regra, tomar uma decisão e conferir se ela produziu o efeito esperado.',
    imagem: {
      src: '/img/cade-todo-mundo/cade-experiencia-real.webp',
      width: 2061,
      height: 1290,
      alt: 'Experiência real da aula 1: o toque no arbusto revela o coelho, com a regra ligada e a orientação do Zappy ao lado.',
    },
    tituloLegenda: '',
    legenda:
      'Na experiência da aula 1, seu filho pode ligar e desligar a reação, tocar nos esconderijos e comparar os resultados.',
  },
  aula: {
    etiqueta: 'Aprender fazendo, com orientação',
    titulo: 'Uma explicação, uma tentativa e um resultado para conferir',
    imagem: {
      src: '/img/cade-todo-mundo/cade-blocos-reais.webp',
      width: 906,
      height: 372,
      alt: 'Blocos reais do Cadê Todo Mundo: ao tocar num esconderijo, deixá-lo invisível e somar um à variável achados.',
    },
    passos: [
      {
        titulo: 'Entender uma parte',
        paragrafos: [
          'O vídeo orienta o que fazer, e as experiências permitem explorar o efeito de uma regra. Ele pode pausar, voltar à explicação e comparar.',
        ],
      },
      {
        titulo: 'Construir e conferir',
        paragrafos: [
          'No Estúdio, monta os blocos no projeto e testa. Se o resultado sair diferente do esperado, tem uma parte concreta para rever e ajustar.',
        ],
      },
      {
        titulo: 'Continuar com apoio',
        paragrafos: [
          'O Zappy orienta as atividades. Quando precisar da equipe, o botão Preciso de ajuda leva a dúvida aos Recados, onde o atendimento acontece por mensagens.',
        ],
      },
    ],
    nota: 'A experiência também abre espaço para escolhas: trocar a imagem de um personagem, mudar um esconderijo ou escrever uma mensagem final. Ele testa para ver como sua ideia ficou e se precisa de algum ajuste.',
    tituloLegenda: 'A regra que ele constrói ao longo das aulas.',
    legenda:
      'Ao tocar num esconderijo, o jogo o deixa invisível e soma um aos achados. Na tela, isso vira um personagem revelado e um ponto no placar.',
    texto:
      'Esse é o caminho que se repete nas aulas. Seu filho participa da construção e pode perceber o efeito do que fez.',
  },
  mural: {
    etiqueta: 'Uma criação para mostrar',
    titulo: 'Ele tem algo seu para mostrar e um caminho para contar',
    paragrafos: [
      'Ao encontrar os três personagens, o jogo mostra a mensagem final. Seu filho pode chamar alguém para jogar e mostrar uma escolha que fez: o personagem que trocou, uma regra que montou ou o texto que escreveu.',
      'Na aula 2, ele aprende a publicar no Mural. Se vocês escolherem publicar, recebe um link que a família pode abrir e jogar sem criar conta. A publicação é opcional.',
      'Durante os sete dias, ele também pode jogar outras criações, comentar e reagir. Ao cumprir as atividades de conclusão, recebe o certificado do curso. Para você, fica uma oportunidade de conhecer melhor como ele participa, escolhe e pede apoio.',
    ],
    imagem: {
      src: '/img/cade-todo-mundo/cade-jogo-3.webp',
      width: 1440,
      height: 810,
      alt: 'Projeto real Cadê Todo Mundo com os três personagens encontrados, placar em três e mensagem final.',
    },
    tituloLegenda: '',
    legenda:
      'O projeto do curso em funcionamento, depois dos três achados. A criança pode personalizar imagens e a mensagem final.',
  },
  plataforma: {
    etiqueta: 'Por que criamos o Sistema Zero',
    titulo: 'Esse jeito de aprender começou na nossa família',
    paragrafos: [
      'Somos Helena e Júlio, pais de André e Débora, com formação em Sistemas de Informação. O interesse do André por jogos nos aproximou da criação de jogos como uma oportunidade de aprender fazendo.',
      'Dessa experiência nasceu o Sistema Zero: projetos guiados em que a criança pode usar a curiosidade para colocar ideias em prática, fazer escolhas e lidar com o resultado das próprias tentativas. A programação é a ferramenta que permite construir e testar essas ideias.',
      'O Cadê Todo Mundo é uma porta de entrada para conhecer essa proposta. Nos sete dias, você pode observar o que desperta o interesse do seu filho, de que apoio ele precisa e como essa forma de aprender cabe na rotina de vocês.',
    ],
    imagem: {
      src: '/img/comunidade-dos-criadores/familia-helena-julio-kids.webp',
      alt: 'Helena e Júlio, criadores do Sistema Zero, na foto e como personagens da plataforma',
      width: 880,
      height: 1019,
    },
  },
  condicoes: {
    etiqueta: 'Um primeiro contato, de presente',
    titulo: 'Sete dias para conhecer o curso e observar seu filho criando',
    cartoes: [
      {
        titulo: 'O curso completo por 7 dias',
        paragrafos: [
          'Cadê Todo Mundo, com duas aulas guiadas, experiências, projeto e atividades de conclusão. O acesso começa no cadastro aceito para resgatar o presente.',
        ],
      },
      {
        titulo: 'Mural para compartilhar',
        paragrafos: [
          'Durante os sete dias, pode publicar, comentar e reagir. Depois, a conta continua vendo e jogando, e o link de um jogo publicado permanece acessível.',
        ],
      },
      {
        titulo: 'Gratuito, sem cartão',
        paragrafos: [
          'Ao fim do prazo, o acesso gratuito ao curso termina. Nenhuma assinatura ou cobrança começa automaticamente. Continuar em outros cursos é uma decisão à parte da família.',
        ],
      },
    ],
    cta: 'Quero o presente para meu filho',
    nota: 'Use esse primeiro contato para conhecer a proposta com seu filho. Perceber como ele começa, o que decide testar e quando procura apoio já ajuda vocês a entenderem se faz sentido continuar.',
  },
  duvidas: {
    titulo: 'Antes de começar com seu filho',
    itens: [
      {
        pergunta: 'Para qual idade é o presente?',
        resposta:
          'O Cadê Todo Mundo foi pensado para que crianças e adolescentes de 9 a 17 anos consigam fazer as atividades com mais autonomia, seguindo a orientação das aulas. Crianças menores de 9 anos também podem participar, desde que acompanhadas por um responsável durante as atividades. A idade orienta a proposta; o apoio considera o jeito e o momento de cada criança.',
      },
      {
        pergunta: 'Ele precisa saber programar ou gostar de videogame?',
        resposta:
          'O curso começa com orientação e blocos visuais. A criança não precisa conhecer programação, e gostar de videogame também não é requisito. A curiosidade pelos personagens, por inventar uma brincadeira ou por descobrir como algo funciona pode ser o ponto de partida.',
      },
      {
        pergunta: 'Meu filho vai conseguir fazer sozinho?',
        resposta:
          'Acompanhe o começo para perceber de que ajuda ele precisa. A familiaridade com o computador, a leitura e o ritmo de cada criança fazem diferença. Dos 9 aos 17 anos, a proposta favorece mais autonomia com apoio disponível. Para menores de 9 anos, um responsável acompanha as atividades. Você pode ajudá-lo a entender uma orientação e deixar que ele escolha ou execute o próximo passo.',
      },
      {
        pergunta: 'Meu filho é autista. Como avaliar se a experiência faz sentido para ele?',
        resposta:
          'Observe se a proposta desperta interesse, como ele acompanha as orientações e de que apoio precisa. Vocês podem pausar os vídeos, repetir uma explicação e combinar momentos curtos. Ele pode mostrar o que entendeu falando, apontando ou fazendo. Os sete dias permitem conhecer essa forma de aprender em família. A proposta é educacional, e a participação considera as necessidades de cada criança.',
      },
      {
        pergunta: 'E se uma parte ficar difícil ou ele se frustrar?',
        resposta:
          'Acolha a dificuldade e olhem para uma parte de cada vez: o que ele esperava ver e o que aconteceu na tela. Vocês podem rever a orientação, fazer uma pausa ou pedir ajuda pelo botão Preciso de ajuda. A equipe responde nos Recados, por mensagens. Insistir até ficar exausto não é o objetivo; vocês podem combinar quando retomar.',
      },
      {
        pergunta: 'Funciona no celular ou no tablet?',
        resposta:
          'O cadastro pode ser feito pelo celular. Para acompanhar as atividades e montar o jogo, é necessário um computador com internet, mouse e teclado. O curso e o Estúdio abrem pelo navegador. Reserve esse computador nos dias em que seu filho for participar.',
      },
      {
        pergunta: 'Como encaixar na rotina da família?',
        resposta:
          'São duas aulas guiadas, com atividades para fazer e testar. Os vídeos são gravados e não há horário de turma. Uma aula pode ser feita em mais de um momento: combinem pausas e retomem dentro dos sete dias de acesso. O tempo necessário varia conforme o ritmo e o apoio de cada criança.',
      },
      {
        pergunta: 'Quando começam os sete dias?',
        resposta:
          'No cadastro aceito para resgatar o presente. O prazo corre a partir desse momento, inclusive nos dias em que vocês não entrarem. Escolha uma ocasião em que seu filho possa usar o computador nos dias seguintes.',
        comPrazoCampanha: true,
      },
      {
        pergunta: 'O que acontece quando o prazo termina?',
        resposta:
          'O acesso gratuito ao curso termina. A conta continua vendo e jogando no Mural, e o jogo que foi publicado continua acessível pelo link. Publicar, comentar e reagir fazem parte do período de presente. Nenhuma assinatura ou cobrança começa automaticamente.',
      },
      {
        pergunta: 'O presente inclui os outros cursos da plataforma?',
        resposta:
          'Ele inclui o curso Cadê Todo Mundo e o Mural nas condições descritas aqui. Os demais cursos e espaços da Comunidade dos Criadores fazem parte de uma assinatura à parte, que a família pode escolher depois.',
      },
      {
        pergunta: 'Posso resgatar mais de um presente?',
        resposta:
          'Cada e-mail pode resgatar um presente Kids. Se você também receber um presente adulto, para criar o seu próprio jogo, pode usar o mesmo e-mail nele.',
      },
    ],
    prazoCampanha:
      'Na campanha, o cadastro também precisa ocorrer dentro do período de resgate informado nesta página.',
  },
  resgatar: {
    etiqueta: 'O primeiro passo é do responsável',
    titulo: 'Resgate o presente e combine o primeiro momento juntos',
    texto:
      'Antes de se cadastrar, escolha uma ocasião em que seu filho possa aproveitar os próximos sete dias. O prazo começa quando o cadastro é aceito. Cadastre a conta com os seus dados; depois, na plataforma, crie o perfil do seu filho e abra o Cadê Todo Mundo no computador.',
    previa:
      'O formulário aparece no link público quando a campanha estiver aberta e o curso disponível. Nesta prévia, nenhum acesso é criado.',
  },
  barra: {
    titulo: 'Presente de 7 dias',
    texto: 'Sem cartão',
    cta: 'Quero o presente',
  },
  estados: {
    preparing: {
      etiqueta: 'Cadastro ainda fechado',
      titulo: 'O cadastro por este link ainda não abriu',
      texto:
        'Guarde esta página e volte em alguns dias. O presente vale 7 dias contados do cadastro, então nada se perde enquanto isso.',
    },
    scheduled: {
      etiqueta: 'Cadastro ainda fechado',
      titulo: 'O cadastro por este link abre em {{data}}',
      texto:
        'Guarde esta página e volte a partir dessa data. O presente vale 7 dias contados do cadastro.',
    },
    paused: {
      etiqueta: 'Campanha pausada',
      titulo: 'Os cadastros por este link estão pausados',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem já recebeu o presente mantém o prazo informado no cadastro.',
    },
    ended: {
      etiqueta: 'Campanha encerrada',
      titulo: 'Os cadastros por este link terminaram em {{data}}',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem recebeu o presente dentro do período mantém os 7 dias contados do cadastro.',
    },
    endedSemData: 'Os cadastros por este link terminaram',
    retomar: {
      botao: 'Já comecei o cadastro',
      texto:
        'Reenvie com o mesmo e-mail para retomar um cadastro aceito antes. Isso não abre um novo acesso nem reinicia o prazo.',
    },
    naoEncontrado: {
      etiqueta: 'Link inválido',
      titulo: 'Este convite não está disponível',
      texto:
        'Confira se o link foi copiado por inteiro. Se alguém mandou o convite para você, peça o link de novo.',
    },
    foraDoAr: {
      etiqueta: 'Tente de novo',
      titulo: 'Não conseguimos abrir o seu convite agora',
      texto:
        'Recarregue a página em alguns instantes. Isso não cria um cadastro nem começa o prazo do curso.',
    },
    contato: 'Falar com a equipe',
  },
  habilidades: {
    etiqueta: 'O que essa prática exercita',
    titulo: 'Enquanto faz o jogo funcionar, ele pratica habilidades para a vida',
    texto:
      'Cada habilidade tem uma ação para ser praticada. Veja exemplos do curso e maneiras de fazer a conexão com situações que seu filho já conhece.',
    cartoes: [
      {
        titulo: 'Planejar uma ação',
        paragrafos: [
          'No jogo: ele acompanha a sequência: tocar no esconderijo, revelar o personagem e registrar o achado.',
          'Na rotina: vocês podem retomar essa ideia ao preparar a mochila: separar o material, guardar e conferir o que falta. Um objetivo fica mais claro quando é dividido em ações.',
        ],
      },
      {
        titulo: 'Conferir o resultado',
        paragrafos: [
          'No jogo: cada novo personagem soma um ao placar. Tocar de novo onde já houve um achado não deve contar duas vezes.',
          'Na escola: a contagem ganha um motivo concreto. Vocês podem relacioná-la a contar cada objeto uma vez e conferir se a resposta corresponde ao que está sendo contado.',
        ],
      },
      {
        titulo: 'Mostrar uma ideia ou uma dúvida',
        paragrafos: [
          'No jogo: ele pode mudar a mensagem final, testar se ela cabe na tela e mostrar uma parte que ainda não funciona como queria.',
          'Na escola: isso pode virar uma referência para indicar onde parou num exercício: “Entendi esta parte; preciso de ajuda na próxima”. Ele pode falar, apontar ou demonstrar.',
        ],
      },
    ],
    comparacao: [
      {
        imagem: {
          src: '/img/cade-todo-mundo/cade-jogo-0.webp',
          width: 1440,
          height: 810,
          alt: 'Cadê Todo Mundo antes da descoberta: três esconderijos e placar Achados: 0.',
        },
        tituloLegenda: 'Antes: nenhum personagem encontrado.',
        legenda: 'O placar começa em zero.',
      },
      {
        imagem: {
          src: '/img/cade-todo-mundo/cade-jogo-1.webp',
          width: 1440,
          height: 810,
          alt: 'Cadê Todo Mundo depois de encontrar o coelho: arbusto removido e placar Achados: 1.',
        },
        tituloLegenda: 'Depois: um personagem, um ponto.',
        legenda: 'O coelho aparece e o placar passa a marcar um.',
      },
    ],
    nota: 'A conexão fica mais concreta quando você retoma algo que ele viveu: “Como conferiu a contagem no seu jogo? Vamos conferir esta também?”. A atividade oferece um exemplo compartilhado para essa conversa.',
  },
  porQue: {
    etiqueta: 'O que você quer ver crescer',
    titulo: 'A autonomia se constrói em oportunidades de tentar',
    paragrafos: [
      'Você quer ver seu filho entender o que precisa fazer, escolher por onde começar e mostrar quando precisa de ajuda. Isso aparece ao separar o material da escola, seguir um enunciado ou conferir uma resposta.',
      'Essas atitudes precisam de situações em que ele possa praticar. A curiosidade por um personagem, por uma brincadeira ou por descobrir como algo funciona pode dar um motivo para se envolver.',
      'Na proposta do Sistema Zero, criar jogos é uma forma de treinar habilidades para a vida. A criança escolhe o que fazer e vê o efeito. Esse retorno permite comparar a intenção com o resultado, rever uma tentativa e pedir ajuda sobre uma dificuldade concreta.',
    ],
    imagem: {
      src: '/img/kids-aprender-criando/organizar-mochila.webp',
      width: 1536,
      height: 1024,
      alt: 'Debinha separa o material para a mochila enquanto Dedé aponta a garrafa, com o Zappy ao lado.',
    },
    tituloLegenda: '',
    legenda:
      'Separar o material, conferir o que falta e pedir ajuda são pequenas oportunidades de autonomia na rotina. O jogo oferece outras situações para praticar essas atitudes.',
  },
  familia: {
    etiqueta: 'O seu papel nessa experiência',
    titulo: 'Seu apoio ajuda a criança a encontrar o próximo passo',
    texto:
      'Autonomia também envolve reconhecer quando é hora de pedir ajuda. Acompanhe o primeiro acesso e ajuste a presença conforme a necessidade do seu filho. Para menores de 9 anos, um responsável participa durante as atividades.',
    cartoes: [
      {
        titulo: 'Antes: prepare o começo',
        paragrafos: [
          'Separe um computador com internet, mouse e teclado. Acesse pelo navegador, abra a aula e combine um momento tranquilo. Você não precisa saber programar para acompanhar.',
        ],
      },
      {
        titulo: 'Durante: ajude a olhar',
        paragrafos: [
          'Observe de que apoio ele precisa. Peça que mostre o que queria fazer e o que apareceu. Vocês podem rever um trecho, dividir o próximo passo ou fazer uma pausa.',
        ],
      },
      {
        titulo: 'Depois: reconheça o percurso',
        paragrafos: [
          'Convide-o a mostrar uma descoberta, uma escolha ou uma dificuldade. Ele pode contar, apontar ou fazer novamente. Valorize também o que tentou e a ajuda que conseguiu pedir.',
        ],
      },
    ],
    imagem: {
      src: '/img/kids-aprender-criando/area-dos-pais-conversa.webp',
      width: 1092,
      height: 288,
      alt: 'Orientações reais da área dos pais: perguntas para conversar sobre a ideia, as tentativas e a próxima versão de uma criação.',
    },
    tituloLegenda: '',
    legenda:
      'A área dos pais traz perguntas para ajudar nessa conversa. Use a forma de comunicação em que seu filho se sente mais à vontade.',
    nota: 'As duas aulas são gravadas e podem ser divididas em momentos menores, dentro dos sete dias de acesso. Combinem esse tempo na rotina da família. Uma pausa pode fazer parte do caminho para retomar com mais disposição.',
  },
}

const section = (
  id: string,
  eyebrow: string,
  title: string,
  paragraphs: string[],
  visuals: string[],
): ComunidadeSection => ({
  id,
  eyebrow,
  title,
  layout: 'story',
  groups: [{ title: null, paragraphs }],
  visuals,
  actions: [],
})

/** Mesma experiência para convite pessoal e campanha; a origem muda, os direitos não. */
export const GIFT_SECTIONS = [
  section(
    'experiencia',
    'Criar um jogo, praticar como enfrentar desafios',
    'Uma regra para montar. Uma tentativa para observar. Uma ideia para rever.',
    [
      'No Cadê Todo Mundo, seu filho começa explorando uma brincadeira de procurar personagens escondidos em um jardim. Depois, conhece uma das regras por trás dela: quando alguém toca no esconderijo, ele precisa desaparecer para revelar quem estava ali.',
      'A criança monta o comando, testa e observa. Se o esconderijo continua no lugar, há algo para conferir. Quando a regra funciona, o personagem aparece. Mais adiante, ela trabalha a contagem para o jogo registrar cada achado.',
      'Organizar os passos, conferir uma tentativa e explicar uma dúvida são habilidades para a vida. Aqui, elas aparecem em uma tarefa que a criança consegue observar: mudar uma regra e ver o que acontece no jogo.',
      'Em casa, você pode pedir: “Me mostra o que mudou? O que você tentou quando não funcionou?”. Essa conversa ajuda a reconhecer o processo, além do resultado, e oferece exemplos para retomar quando aparecer outro desafio.',
    ],
    ['regra', 'contador'],
  ),
  section(
    'comeco',
    'Um primeiro projeto com direção',
    'O jardim está preparado. Seu filho monta as regras.',
    [
      'Seu filho não precisa começar diante de uma tela vazia. O cenário e os personagens já estão preparados para a atividade. Há uma tarefa concreta: fazer os esconderijos responderem aos toques e contar os personagens encontrados.',
      'Isso deixa espaço para aprender uma parte da criação de cada vez. Ele acompanha a montagem com blocos, experimenta os comandos apresentados e confere o resultado. Saber programar antes não é requisito, e ele não precisa desenhar os personagens para fazer este curso.',
    ],
    ['aula'],
  ),
  section(
    'aula',
    'Ver, fazer e conferir',
    'A explicação fica ao lado do que seu filho está construindo.',
    [
      'Na tela da aula, seu filho encontra o vídeo com a orientação e a atividade para colocar a ideia em prática. Ele pode assistir a um passo, pausar e fazer a ação no projeto. Se não entendeu um detalhe, volta à explicação antes de continuar.',
      'A orientação e o trabalho ficam juntos. Você consegue olhar a tela com ele e entender o que está tentando fazer; ele consegue comparar o que ouviu com o que aconteceu na própria atividade. O curso usa o Estúdio dentro desse projeto guiado, e o presente não libera o Estúdio livre, onde se criam jogos do zero.',
    ],
    ['aula-estudio'],
  ),
  section(
    'rotina',
    'Cabe na vida da sua família',
    'Reserve um momento do tempo de computador que vocês já permitem.',
    [
      'Não é preciso aumentar o tempo de tela para experimentar. Vocês podem combinar que uma parte do período já permitido será usada para construir o jogo e conversar sobre o que aconteceu.',
      'As aulas são gravadas: não há horário de turma para encaixar na agenda. Durante os sete dias de acesso, vocês escolhem quando entrar e podem pausar e rever as explicações. Vale acompanhar o primeiro acesso, ajudar a encontrar os controles e observar de que companhia seu filho precisa.',
      'O curso foi pensado para que crianças e adolescentes de 9 a 17 anos consigam fazer as atividades com mais autonomia. Crianças menores também podem participar, acompanhadas por um responsável durante as atividades. A companhia necessária varia: observe quando seu filho precisa de ajuda para ler, usar os controles ou retomar uma etapa.',
    ],
    ['pausa'],
  ),
  section(
    'conquista',
    'Do experimento à conclusão',
    'Ao terminar, ele tem um jogo para mostrar e explicar.',
    [
      'O percurso passa por experimentar o jogo, montar as reações e trabalhar a contagem dos achados. Em cada etapa, seu filho pode testar e perceber como uma regra interfere na brincadeira.',
      'Ao cumprir as atividades de conclusão, ele recebe o certificado do curso. Mais que olhar esse registro, peça para ele mostrar uma parte do projeto e contar o que aprendeu a fazer. Não há promessa de concluir em uma tarde: aproveitem os sete dias para seguir as etapas com atenção.',
    ],
    ['certificado'],
  ),
  section(
    'mural',
    'Um jogo para compartilhar',
    'Ele cria o jogo. Depois, pode convidar a família para jogar.',
    [
      'Durante os sete dias, seu filho pode publicar no Mural dos Criadores o jogo que fez no Cadê Todo Mundo, seguindo as orientações e atividades do curso. A aula 2 ensina esse caminho. Depois de publicar, ele recebe um link para convidar você, os avós ou os amigos para jogar, sem que eles precisem de uma conta.',
      'Nesse período, ele também pode conhecer os jogos de outras crianças, jogar, comentar e reagir. Você pode acompanhar esse momento: pedir que ele mostre uma regra que criou, experimentar o jogo e conversar sobre o que achou interessante em outra criação.',
      'Quando os sete dias terminam, o curso e as ações de publicar, comentar e reagir deixam de estar liberados por este convite. Sua conta continua podendo ver e jogar no Mural enquanto existir. O link do jogo que ele já publicou continua funcionando enquanto a publicação estiver disponível.',
      'Este é o Mural da plataforma. Fazer a própria versão de um jogo do Mural e usar ferramentas de criação livre depende dos acessos e das etapas da Comunidade; esses recursos não fazem parte do presente.',
    ],
    ['mural'],
  ),
  section(
    'gratuito',
    'Conheça nosso jeito de ensinar',
    'É gratuito para sua família experimentar de verdade.',
    [
      'O Sistema Zero é uma plataforma de aprendizagem criativa. Crianças acompanham orientações, fazem atividades e testam suas ideias. Este convite oferece um começo concreto: o curso Cadê Todo Mundo e a participação no Mural por sete dias, com visita ao Mural depois desse prazo.',
      'Queremos que você veja como seu filho participa dessa experiência antes de decidir se deseja continuar. O cadastro não pede cartão e não cria uma assinatura. Ao fim dos sete dias, o curso deixa de estar disponível por este presente; não começa uma cobrança.',
      'Se depois vocês quiserem seguir, existe a Comunidade dos Criadores, que reúne os outros cursos, as ferramentas de criação, o Clube, o Mural e as dúvidas respondidas pela equipe nos Recados. Essa assinatura é uma escolha separada do responsável. Você pode conhecer o presente agora sem assumir esse compromisso.',
    ],
    [],
  ),
] satisfies ComunidadeSection[]

export const GIFT_FAQ = [
  {
    id: 'programar',
    question: 'Meu filho precisa saber programar?',
    visual: 'aula-estudio',
    paragraphs: [
      'Não precisa chegar sabendo. O curso apresenta os comandos usados neste projeto e mostra como montá-los com blocos. Seu filho recebe uma tarefa definida e pode comparar o resultado com a orientação da aula.',
      'Para começar bem, sente com ele no primeiro acesso e confira se consegue acompanhar as instruções e usar os controles. Essa companhia inicial ajuda a descobrir o que já faz sozinho e em que ainda precisa de você.',
    ],
  },
  {
    id: 'desenhar',
    question: 'Ele precisa saber desenhar?',
    visual: 'aula',
    paragraphs: [
      'Não. Neste projeto, o jardim e os personagens já estão preparados. O trabalho da criança é montar e testar as regras que fazem a brincadeira funcionar.',
      'Assim, ela pode se concentrar na programação, sem desenhar antes. O presente não é um curso de desenho e não libera o Pinta para uso livre.',
    ],
  },
  {
    id: 'idade',
    question: 'Para qual idade é o presente?',
    visual: 'aula',
    paragraphs: [
      'O Cadê Todo Mundo foi pensado para que crianças e adolescentes de 9 a 17 anos consigam realizar as atividades com mais autonomia. Crianças menores também podem fazer o curso, desde que acompanhadas por um responsável durante as atividades.',
      'Além da idade, observe de que companhia seu filho precisa para acompanhar as instruções, usar mouse e teclado e lidar com uma dúvida. Vale estar junto no primeiro acesso e ajustar essa ajuda ao longo do curso. Não é preciso chegar sabendo programar.',
    ],
  },
  {
    id: 'computador',
    question: 'Dá para fazer o curso pelo celular?',
    visual: 'aula-estudio',
    paragraphs: [
      'Você pode abrir este convite e cadastrar sua conta pelo celular. Para seu filho realizar as atividades de criação, separe um computador ou notebook com internet, mouse e teclado.',
      'A atividade envolve acompanhar a orientação e manipular elementos do projeto. Ter esse equipamento pronto evita que vocês descubram essa necessidade só depois de iniciar o prazo de acesso.',
    ],
  },
  {
    id: 'horario',
    question: 'As aulas têm horário marcado?',
    visual: 'pausa',
    paragraphs: [
      'As aulas são gravadas. Durante o prazo de acesso, vocês escolhem o momento de entrar, podem pausar a explicação para fazer a atividade e voltar a um trecho quando precisarem.',
      'Isso ajuda quando seu filho precisa de mais tempo em um passo ou quando a rotina pede uma pausa. Combine um momento possível dentro dos sete dias; assistir mais rápido não é o objetivo, entender e testar faz parte do percurso.',
    ],
  },
  {
    id: 'ajuda',
    question: 'E se meu filho travar em uma atividade?',
    visual: 'recados',
    paragraphs: [
      'Durante os sete dias de acesso ao curso, seu filho pode pedir orientação pelo botão “Preciso de ajuda”, no rodapé de cada aula. Ao clicar, abre um campo para contar em que parte ficou com dúvida. Se ele precisar de companhia para escrever, vocês podem fazer isso juntos.',
      'Ajude-o a contar o que tentou e o que aconteceu na tela. Por exemplo: “Cliquei no arbusto, mas o personagem não apareceu. O que preciso conferir?”. Depois, é só clicar em “Enviar ao professor”. A plataforma envia junto a identificação da aula e da etapa em que ele está, para o professor saber de onde veio a dúvida.',
      'A resposta chega nos Recados, dentro da própria plataforma. É ali que vocês acompanham a orientação e continuam a conversa se ainda tiverem dúvidas. Esse atendimento acontece por mensagens e pode haver espera pela resposta.',
      'Você não precisa saber programar para participar desse momento. Pode ajudá-lo a mostrar onde parou, rever um trecho da explicação e organizar a pergunta. A dúvida sobre a atividade vai para o professor; você pode acompanhar seu filho sem ter que descobrir a resposta por conta própria.',
    ],
  },
  {
    id: 'prazo',
    question: 'Quando começam e terminam os sete dias?',
    visual: 'pausa',
    paragraphs: [
      'O prazo começa no cadastro aceito por este link, não no primeiro vídeo assistido. Depois da liberação, a confirmação mostra a data e a hora de vencimento. Criar ou recuperar a senha mais tarde não reinicia esse prazo.',
      'Se o convite faz parte de uma campanha, a data de encerramento dela é o limite para novos cadastros. Quem se cadastra dentro do prazo mantém os sete dias, ainda que a campanha termine no dia seguinte.',
    ],
  },
  {
    id: 'cartao',
    question: 'Vou precisar pagar ou cadastrar um cartão?',
    visual: null,
    paragraphs: [
      'Não. O presente é gratuito e este cadastro não pede cartão. Ao final dos sete dias, o acesso ao curso termina sem gerar cobrança ou assinatura automática.',
      'Se quiser continuar com a Comunidade dos Criadores, você conhecerá uma oferta separada e decidirá se deseja contratar. Não é preciso assinar para receber este presente.',
    ],
  },
  {
    id: 'publicar',
    question: 'Meu filho pode publicar o jogo dele e compartilhar com a família?',
    visual: 'mural',
    paragraphs: [
      'Sim. Durante os sete dias do presente, ele pode publicar o jogo que está criando no Cadê Todo Mundo, cumprindo as atividades e seguindo a orientação da aula 2. A publicação faz parte dessa experiência de criar algo que outras pessoas podem jogar.',
      'Depois de publicar, vocês podem compartilhar o link com familiares e amigos. Quem recebe abre o jogo no navegador, sem cadastro. Nesse período, seu filho também pode comentar e reagir às criações no Mural.',
      'O fim dos sete dias encerra a participação liberada pelo convite, mas não faz o link do jogo publicado vencer. Vocês continuam podendo jogar e compartilhar esse link enquanto a publicação estiver disponível.',
    ],
  },
  {
    id: 'inclui',
    question: 'O que fica disponível depois do curso?',
    visual: 'mural',
    paragraphs: [
      'Depois dos sete dias, sua conta continua podendo ver e jogar os jogos disponíveis no Mural dos Criadores enquanto ela existir. Publicar, comentar e reagir ficam liberados pelo convite somente durante os sete dias. Se seu filho publicou o jogo nesse período, o link continua funcionando enquanto a publicação estiver disponível, para vocês e para quem receber o link.',
      'Para continuar publicando, comentando e reagindo depois desse prazo, existe a assinatura da Comunidade dos Criadores, contratada separadamente. Nela, seu filho segue com outros cursos, as ferramentas de criação liberadas pela Jornada, o Clube e as dúvidas respondidas pela equipe nos Recados.',
    ],
  },
  {
    id: 'conta',
    question: 'Já tenho conta ou já recebi esse presente. Posso usar o link?',
    visual: null,
    paragraphs: [
      'Se você tem conta e ainda não resgatou o presente, use o mesmo e-mail no cadastro. O acesso será associado à conta existente, e você entra com sua senha de sempre.',
      'Cada e-mail resgata um presente Kids, considerando todos os links de convite e campanhas. Usar outro link Kids não concede um novo período nem muda a origem do primeiro cadastro. O presente adulto é separado: o mesmo e-mail pode recebê-lo para a própria pessoa criar o jogo dela. Se o processo ficou incompleto, repetir o envio com o mesmo e-mail permite retomá-lo sem reiniciar os sete dias.',
    ],
  },
]

/**
 * As seções da página pública do programa (`/kids/embaixadores`). Desde 20/10/2026 o embaixador dá
 * o presente a uma família (Kids) ou a um adulto, cada um com o próprio link.
 */
export const AMBASSADOR_SECTIONS = [
  section(
    'indicar',
    'Uma indicação que você consegue explicar',
    'Um presente para uma família ou para um adulto que quer criar o próprio jogo.',
    [
      'Talvez seja uma família que queira oferecer à criança uma experiência de criar, testar ideias e conversar sobre as tentativas. O Kids foi pensado para 9 a 17 anos com mais autonomia; crianças menores podem participar com um responsável durante as atividades. Para um adulto que quer criar o próprio jogo, há um convite separado, com a versão adulta do curso.',
      'Pelo seu link, a pessoa recebe 7 dias do Cadê Todo Mundo e do Mural, sem custo e sem cartão: a família recebe a versão Kids, e o adulto, a versão adulta. Cada link leva a uma página feita para quem recebe, que explica o presente e orienta o cadastro. Você não cadastra ninguém nem precisa explicar sozinho todos os detalhes.',
    ],
    ['aula-estudio'],
  ),
  section(
    'compartilhar',
    'Do seu convite ao primeiro acesso',
    'Você escolhe o público e envia o link. Quem recebe escolhe quando começar.',
    [
      'No seu painel, escolha para quem é o presente e mande o link com uma mensagem sua, contando por que lembrou daquela pessoa. Avise que o curso pede um computador com mouse e teclado e que os 7 dias começam no cadastro.',
      'No Kids, o responsável abre a página e faz o cadastro com os próprios dados; depois entra na plataforma com o filho. No presente adulto, a própria pessoa se cadastra. O seu painel conta os resgates concluídos, sem mostrar nomes nem dados de quem recebeu.',
    ],
    ['pausa'],
  ),
  section(
    'condicoes',
    'Um convite claro desde o começo',
    'Quem recebe ganha um presente. Continuar é uma escolha dela.',
    [
      'Durante os 7 dias contados do cadastro, quem recebe faz o curso, publica o jogo que criou nele, comenta e reage no Mural do seu público. Depois, o link do jogo publicado continua funcionando enquanto a publicação estiver disponível. Outros cursos, ferramentas de criação livre e a opção de fazer a própria versão de um jogo do Mural não fazem parte do presente.',
      'Não há cartão nem assinatura automática. Se a família ou o adulto quiser conhecer a Comunidade dos Criadores depois, decide por conta própria. Essa clareza ajuda você a indicar com confiança e quem recebe a saber exatamente o que está ganhando.',
    ],
    ['mural'],
  ),
] satisfies ComunidadeSection[]
