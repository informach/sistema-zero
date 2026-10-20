import type { RelatoId } from './types'

// Página para responsáveis de crianças menores de 9 anos, que criam o jogo JUNTO com o adulto.
// Desenho aprovado: docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/canvas/
// PaginaMenor9.html. A copy é a do desenho, palavra por palavra; a criança é "ela" do começo ao fim.
// Preços nunca entram escritos: os marcadores abaixo são preenchidos pelo body com os planos ao vivo.
//   {{preco_mensal}}              mensalidade
//   {{preco_anual}}               valor do anual
//   {{equivalente_mensal_anual}}  anual dividido por 12
//   {{economia_anual}}            12 mensalidades menos o anual (o selo sai quando não há economia)
//   {{preco_dia}}                 mensalidade / 30, arredondada para os 10 centavos seguintes

/** Imagem em public/img/comunidade-dos-criadores, com as medidas reais do arquivo. */
export interface ImagemMenor9 {
  arquivo: string
  /** Versão 2x, quando existe. */
  retina?: string
  alt: string
  largura: number
  altura: number
}

/** Frase com o começo em negrito (`destaque`), seguido do resto do texto. */
export interface TrechoMenor9 {
  destaque: string
  texto: string
}

export interface CartaMenor9 {
  titulo: string
  texto: string
}

export interface FiguraMenor9 {
  imagem: ImagemMenor9
  legenda: string
}

export interface PlanoMenor9 {
  nome: string
  preco: string
  periodo: string
  texto: string
  cta: string
  nota: string
}

export interface LinkMenor9 {
  label: string
  href: string
}

export interface PaginaMenor9Copy {
  seoTitle: string
  description: string
  /** Capa usada no JSON-LD do produto. */
  capa: string
  topo: {
    /** Link de pular para o conteúdo (só aparece no foco do teclado). */
    pular: string
    logo: ImagemMenor9
    logoLabel: string
    navLabel: string
    linkSessao: string
    cta: string
  }
  heroi: {
    selo: string
    titulo: string
    /** Trecho final do título, em cor e com o sublinhado em onda. */
    enfase: string
    texto: string
    beneficios: [string, string, string]
    cta: string
    garantia: string
    requisitos: string
    ilustracao: ImagemMenor9
    balao: string
    zappy: ImagemMenor9
  }
  problema: {
    titulo: string
    texto: string
    destaque: string
  }
  juntos: {
    titulo: string
    texto: string
    cartas: CartaMenor9[]
  }
  papeis: {
    titulo: string
    texto: string
    cartas: [CartaMenor9, CartaMenor9, CartaMenor9]
    zappy: ImagemMenor9
  }
  sessao: {
    titulo: string
    texto: string
    passos: TrechoMenor9[]
    telas: [FiguraMenor9, FiguraMenor9]
    relato: {
      id: RelatoId
      intro: string
      legenda: string
      retrato: ImagemMenor9
    }
    cta: string
    garantia: string
  }
  seuPapel: {
    titulo: string
    texto: string
    cuidados: CartaMenor9[]
  }
  pecas: {
    titulo: string
    texto: string
    cartas: [CartaMenor9, CartaMenor9, CartaMenor9]
    jornada: { imagem: ImagemMenor9; legenda: TrechoMenor9 }
    proximos: TrechoMenor9
    jogos: FiguraMenor9[]
    continuidade: TrechoMenor9
    fundadores: { imagem: ImagemMenor9; texto: string }
  }
  seguranca: {
    titulo: string
    texto: string
    regras: CartaMenor9[]
  }
  planos: {
    titulo: string
    texto: string
    destaque: string
    mensal: PlanoMenor9
    anual: PlanoMenor9 & { selo: string }
    depois: { titulo: string; passos: string[] }
    garantia: TrechoMenor9
  }
  duvidas: {
    titulo: string
    itens: { pergunta: string; resposta: string }[]
  }
  fechamento: {
    titulo: string
    cta: string
    garantia: string
    zappy: ImagemMenor9
  }
  rodape: {
    logo: ImagemMenor9
    aviso: string
    termos: LinkMenor9
    privacidade: LinkMenor9
  }
  barra: {
    preco: string
    alternativa: string
    cta: string
  }
}

const CTA_PLANOS = 'Ver os planos para criarmos juntos'
const GARANTIA_CURTA = '7 dias de garantia. Cancele quando quiser, sem multa.'

export const PAGINA_MENOR9: PaginaMenor9Copy = {
  seoTitle:
    'Criar junto, para crianças menores de 9 anos | Comunidade dos Criadores | Sistema Zero',
  description:
    'O primeiro jogo dela e os próximos, feitos com você do lado. Ela decide, você lê e ajuda com o mouse, e o tempo de tela vira um tempo de vocês dois.',
  capa: 'checkout-capa.webp',
  topo: {
    pular: 'Ir para o conteúdo',
    logo: { arquivo: 'logo-kids-claro.svg', alt: 'Sistema Zero Kids', largura: 286, altura: 22 },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    linkSessao: 'Como é uma sessão',
    cta: 'Ver os planos',
  },
  heroi: {
    selo: 'Para crianças menores de 9 anos, com um adulto ao lado',
    titulo: 'O primeiro jogo dela e os próximos, feitos com você do lado.',
    enfase: 'com você do lado.',
    texto:
      'Imagine a cara dela quando o personagem que ela escolheu aparece na tela e faz exatamente o que ela mandou. Ela decide, e você lê e ajuda com o mouse. Cada jogo pronto vai para os avós jogarem. Cada aula ensina peças novas, e os próximos jogos ficam maiores, até o jogo que ela inventar.',
    beneficios: [
      'Tela junto com você, e não sozinha no tablet',
      'A ideia dela na tela, do jeito que ela inventou',
      'Um jogo depois do outro, e quando aprender a ler ela segue sozinha no mesmo perfil',
    ],
    cta: CTA_PLANOS,
    garantia: GARANTIA_CURTA,
    requisitos: 'No computador, com mouse e teclado · Até 2 perfis na mesma assinatura',
    ilustracao: {
      arquivo: 'ilustra-criar-junto.webp',
      alt: 'Ilustração de uma mãe e um pai atrás do filho no computador, criando um jogo juntos, com o Zappy',
      largura: 1000,
      altura: 1263,
    },
    balao: 'No botão Ouvir, o Zappy lê as falas em voz alta',
    zappy: { arquivo: 'zappy-fala.webp', alt: '', largura: 360, altura: 458 },
  },
  problema: {
    titulo: 'Ela inventa cada brincadeira. E no tablet, só joga joguinho pronto',
    texto:
      'Ela inventa regra para o pega-pega, cria personagem, conta fase inteira que só existe na cabeça dela. Aí pega o tablet e fica no joguinho que outra pessoa fez. Você procura alguma coisa melhor e só acha curso para criança maior, que pede leitura, ou aplicativo de passar o tempo. E fica a dúvida de sentar junto para fazer o quê.',
    destaque:
      'Muitos cursos e aplicativos foram pensados para a criança usar sozinha, e nessa idade ela ainda precisa de alguém do lado. Aqui, esse alguém é você.',
  },
  juntos: {
    titulo: 'Quando vocês sentam juntos para criar, a tela vira um tempo de vocês dois',
    texto: 'Veja o que cada sessão traz para ela e para você.',
    cartas: [
      {
        titulo: 'Um tempo de tela que vocês dividem',
        texto:
          'Lado a lado, conversando, rindo do teste que deu errado e comemorando quando funciona.',
      },
      {
        titulo: 'Ela diz: fui eu que fiz',
        texto:
          'Quando o personagem que ela escolheu aparece na tela, a ideia vira coisa feita por ela.',
      },
      {
        titulo: 'Um jogo para mostrar à família',
        texto:
          'Ela esconde os bichinhos no jardim e chama você para achar. Depois, vocês mandam o link para os avós, os tios e os amigos.',
      },
      {
        titulo: 'Ela aprende sem perceber',
        texto: 'Se tocar, some. Se achar, conta mais um. Ela vê na tela o que cada escolha faz.',
      },
      {
        titulo: 'Quando dá errado, ela tenta de novo',
        texto:
          'Errar vira parte da brincadeira: testa, vê o que aconteceu e tenta outra vez, em vez de desistir.',
      },
      {
        titulo: 'Você entende como ela pensa',
        texto:
          'Ao explicar o que quer que o jogo faça, ela mostra o raciocínio dela, e você acompanha de perto.',
      },
    ],
  },
  papeis: {
    titulo: 'E ela consegue, porque já entende regra de jogo melhor do que parece',
    texto:
      'Pique-esconde, pega-pega, quem pisar na lava perde: as brincadeiras que ela inventa já têm regra, ponto e fim. Num jogo de computador é igual. O que ainda falta para ela fazer sozinha é a leitura e o mouse, e isso você empresta enquanto ela decide. É como aprender a falar antes de escrever: nessa fase, ela monta a lógica com blocos, quase sem digitar. Cada um fica com uma parte.',
    cartas: [
      {
        titulo: 'Ela decide',
        texto: 'Quem se esconde, onde se esconde, o que acontece no toque e a mensagem do final.',
      },
      {
        titulo: 'Você lê e conduz',
        texto: 'Lê o passo, segura o mouse quando precisar e pergunta "e agora, o que acontece?".',
      },
      {
        titulo: 'O Zappy ajuda',
        texto:
          'O Zappy, o mascote da plataforma, lê em voz alta as falas, as perguntas e as instruções quando vocês apertam Ouvir.',
      },
    ],
    zappy: { arquivo: 'zappy-feliz.webp', alt: '', largura: 640, altura: 640 },
  },
  sessao: {
    titulo: 'Na prática, uma sessão de vocês fica assim',
    texto:
      'Um dos primeiros projetos é o Cadê Todo Mundo, um jogo de procurar bichinhos escondidos no jardim.',
    passos: [
      {
        destaque: 'Vocês assistem ao vídeo juntos.',
        texto: 'Se ela quiser ouvir a explicação do Zappy de novo, é só apertar Ouvir.',
      },
      { destaque: 'Depois jogam a versão pronta', texto: 'e acham todo mundo.' },
      {
        destaque: 'Então montam juntos:',
        texto:
          'o esconderijo some com um toque e o jogo conta quem foi achado. Você lê o bloco, ela escolhe.',
      },
      {
        destaque: 'Apertam para testar.',
        texto: 'Se não saiu como ela queria, descobrem juntos o porquê e testam de novo.',
      },
      {
        destaque: 'E guardam para amanhã.',
        texto: 'O projeto fica salvo e vocês continuam de onde pararam.',
      },
    ],
    telas: [
      {
        imagem: {
          arquivo: 'tela-jogo-pronto.webp',
          retina: 'tela-jogo-pronto@2x.webp',
          alt: 'A versão pronta do Cadê Todo Mundo aberta na aula, com o contador de achados',
          largura: 1280,
          altura: 800,
        },
        legenda: 'A versão pronta, que vocês jogam primeiro',
      },
      {
        imagem: {
          arquivo: 'tela-estudio.webp',
          retina: 'tela-estudio@2x.webp',
          alt: 'Os blocos do jogo no Estúdio, com o jardim rodando ao lado',
          largura: 1280,
          altura: 800,
        },
        legenda: 'Os blocos que vocês montam, com o jogo ao lado',
      },
    ],
    relato: {
      id: 'AV03',
      intro:
        'A Débora começou pelo Desafio do Primeiro Jogo, que vem incluído na assinatura, e contou assim:',
      legenda: 'Débora, aluna, 7 anos, sobre o Desafio do Primeiro Jogo',
      retrato: {
        arquivo: 'depo-debora-rosto.webp',
        alt: 'Débora, aluna, sorrindo, de óculos',
        largura: 480,
        altura: 480,
      },
    },
    cta: CTA_PLANOS,
    garantia: GARANTIA_CURTA,
  },
  seuPapel: {
    titulo: 'O seu papel é mais simples do que parece: ler, perguntar e deixar a escolha com ela',
    texto:
      'Jogar o que ela criou já é um jeito de participar, para qualquer adulto. E quatro cuidados ajudam a sessão a render.',
    cuidados: [
      {
        titulo: 'Pergunte antes de clicar',
        texto: 'Um "e agora, o que acontece?" deixa a próxima decisão com ela.',
      },
      { titulo: 'Siga a ideia dela', texto: 'Até a ideia mais estranha vira um teste divertido.' },
      {
        titulo: 'Pare no melhor momento',
        texto: 'Encerrem enquanto ainda está gostoso, porque o projeto espera por vocês.',
      },
      {
        titulo: 'Comemore o teste',
        texto: 'Cada vez que ela aperta para testar, descobre alguma coisa nova.',
      },
    ],
  },
  pecas: {
    titulo: 'Cada aula que vocês terminam deixa peças para o jogo que ela inventar',
    texto:
      'Ela não recebe todas as peças de uma vez. Recebe as que já sabe usar, uma aula de cada vez, e isso é de propósito: é assim que ela aprende de verdade, em vez de só apertar o que aparece.',
    cartas: [
      {
        titulo: 'Nas aulas, ela aprende com um jogo pronto',
        texto:
          'O jardim, o farol, a nave. Em cada um, ela escolhe personagem, cor e regra, e ganha as peças daquela aula: o toque que faz aparecer, a contagem, a chave que acende o farol.',
      },
      {
        titulo: 'Ao publicar A Chave do Farol, o Estúdio dela abre',
        texto:
          'Depois de A Chave do Farol, vocês ganham um lugar para começar um jogo do zero, com as peças que ela já conhece. É aqui que a brincadeira que ela inventou vira jogo.',
      },
      {
        titulo: 'Cada aula nova, uma peça nova',
        texto:
          'Quanto mais aulas, mais peças e jogos maiores. Ela nunca fica diante de um bloco que não entende, e o desenho dela vira personagem no Pinta.',
      },
    ],
    jornada: {
      imagem: {
        arquivo: 'tela-jornada-meus-postos.webp',
        retina: 'tela-jornada-meus-postos@2x.webp',
        alt: 'A Jornada do Criador na plataforma: Faísca libera o Estúdio nas aulas; Construtor libera o Estúdio livre e o Pinta',
        largura: 950,
        altura: 387,
      },
      legenda: {
        destaque: 'Está escrito na tela dela.',
        texto:
          'No posto Construtor, ela cria os seus jogos com as ferramentas dos cursos que terminou. Tela do perfil de teste da equipe.',
      },
    },
    proximos: {
      destaque: 'Depois do jardim, vêm o farol, a nave, o jogo do jeito dela e o dino,',
      texto: 'e cada um ensina peças novas para os próximos jogos dela:',
    },
    jogos: [
      {
        imagem: {
          arquivo: 'jogo-farol.webp',
          alt: 'A Chave do Farol: a ilha, a chave e o farol',
          largura: 1280,
          altura: 800,
        },
        legenda: 'A Chave do Farol',
      },
      {
        imagem: {
          arquivo: 'jogo-nave.webp',
          alt: 'Nave Contra Asteroides: a nave e os asteroides',
          largura: 1180,
          altura: 690,
        },
        legenda: 'Nave Contra Asteroides',
      },
      {
        imagem: {
          arquivo: 'jogo-dino.webp',
          alt: 'Corre, Dino: o dino e o cacto',
          largura: 1264,
          altura: 723,
        },
        legenda: 'Corre, Dino',
      },
    ],
    continuidade: {
      destaque: 'E esse começo continua com ela quando crescer.',
      texto:
        'Quando começar a ler sozinha, passa a criar por conta própria no mesmo perfil, com os jogos e o progresso guardados. Mais adiante chegam o Pensa, o Molda para criar em 3D, a Ponte e o código. Se tiver um irmão mais velho, ele usa o segundo perfil.',
    },
    fundadores: {
      imagem: {
        arquivo: 'fundadores-casa.webp',
        alt: 'Helena e Júlio, fundadores, em casa',
        largura: 1280,
        altura: 832,
      },
      texto:
        'Quem prepara as aulas são Helena e Júlio, pais do André e da Débora e formados em Sistemas de Informação. A Comunidade nasceu dos jogos que eles criaram com os filhos.',
    },
  },
  seguranca: {
    titulo: 'Você também vai querer saber onde ela está criando',
    texto: 'Por isso, as regras são simples.',
    regras: [
      { titulo: 'O perfil público começa desligado', texto: 'Só você pode ligar.' },
      {
        titulo: 'O jogo público não mostra o nome dela',
        texto: 'A página do jogo mostra só o jogo e o título.',
      },
      {
        titulo: 'O microfone vem desligado',
        texto: 'Falar em vez de escrever só funciona se você liberar.',
      },
      {
        titulo: 'O Clube tem moderação',
        texto: 'Só alunos participam. Com criança pequena, o melhor é postarem juntos.',
      },
    ],
  },
  planos: {
    titulo: 'Para começarem juntos, escolha o plano que cabe na rotina de vocês',
    texto:
      'Os dois planos dão acesso a tudo. Vocês têm as aulas dos cursos publicados e dos que forem lançados, o Estúdio e as ferramentas que a Jornada vai abrindo. Têm também o Mural e o Clube com moderação, as dúvidas respondidas pela equipe nos Recados e a área do responsável. A diferença está só na forma de pagar.',
    destaque:
      'Uma assinatura, dois perfis: ela cria junto com você hoje e sozinha quando crescer, e o irmão mais velho usa o outro perfil.',
    mensal: {
      nome: 'Mensal',
      preco: '{{preco_mensal}}',
      periodo: '/mês',
      texto:
        'Menos de {{preco_dia}} por dia. Renova todo mês no cartão, e você cancela quando quiser na sua área, sem multa.',
      cta: 'Assinar o mensal',
      nota: '7 dias de garantia',
    },
    anual: {
      nome: 'Anual',
      selo: 'Economia de {{economia_anual}}',
      preco: '{{preco_anual}}',
      periodo: '/ano',
      texto:
        'Sai por {{equivalente_mensal_anual}} por mês. No Pix à vista, não renova sozinho; no cartão, renova uma vez por ano.',
      cta: 'Assinar o anual',
      nota: '7 dias de garantia',
    },
    depois: {
      titulo: 'O que acontece depois de assinar',
      passos: [
        'Você cria o perfil dela na sua área, com nome e data de nascimento.',
        'Autoriza o computador que vocês vão usar.',
        'Entram com um código que você gera, válido por 10 minutos.',
        'A primeira aula abre com o jogo pronto, e vocês já começam a brincar.',
      ],
    },
    garantia: {
      destaque: 'Vocês têm 7 dias para testar juntos a primeira aula.',
      texto: 'Se não for para vocês, devolvemos o valor inteiro.',
    },
  },
  duvidas: {
    titulo: 'Algumas dúvidas de quem quer criar junto',
    itens: [
      {
        pergunta: 'Ela ainda não lê. Dá certo?',
        resposta:
          'Dá, com você lendo. O botão Ouvir lê as falas do Zappy, as perguntas e as instruções. Os blocos e os botões do Estúdio continuam em texto, e é aí que você entra.',
      },
      {
        pergunta: 'Ela pode inventar o jogo dela, ou só faz o do curso?',
        resposta:
          'Os dois, nessa ordem. Nas aulas, ela cria dentro do jogo do curso: escolhe personagem, cor e regra. Depois de A Chave do Farol publicada, o Estúdio livre abre, e vocês montam o jogo que ela inventou com as peças que ela já conhece. Cada curso novo ensina peças novas, e os jogos dela ficam maiores.',
      },
      {
        pergunta: 'E se ela perder o interesse?',
        resposta:
          'As sessões têm o tamanho que vocês quiserem, e dá para parar por semanas e voltar do mesmo ponto. Se não fizer mais sentido, você cancela na sua área, sem multa, e o acesso segue até o fim do período pago.',
      },
      {
        pergunta: 'Quanto tempo dura uma sessão?',
        resposta:
          'Vocês decidem. Dá para parar no meio de uma aula e continuar outro dia, do ponto em que pararam.',
      },
      {
        pergunta: 'Funciona no tablet?',
        resposta:
          'Não. Precisa de computador com mouse e teclado, e pode ser o da família. Você conduz o mouse, e ela aponta na tela o que quer.',
      },
      {
        pergunta: 'Vale assinar para uma criança tão pequena?',
        resposta:
          'A assinatura tem 2 perfis, então serve também para um irmão mais velho e continua com ela quando crescer. E vocês têm 7 dias para testar juntos.',
      },
      {
        pergunta: 'Ela tem 5 anos. É cedo?',
        resposta:
          'Depende mais de ela gostar de inventar brincadeira do que da idade. Com você lendo e conduzindo, as sessões ficam curtas e cada uma termina com alguma coisa na tela. Os 7 dias servem para vocês testarem.',
      },
      {
        pergunta: 'Tem app grátis para isso. Qual é a diferença?',
        resposta:
          'O ScratchJr é gratuito, roda no tablet e é uma boa porta de entrada para montar historinhas com blocos. Aqui, cada projeto é guiado, com aula em português e você no papel de ler e conduzir. Junto vêm o Estúdio e as ferramentas que vão abrindo, o Mural para mostrar o jogo à família e as dúvidas respondidas pela equipe nos Recados. E a conta continua com ela quando crescer, no mesmo perfil.',
      },
      {
        pergunta: 'Como cancelo?',
        resposta:
          'Na sua área, em Conta e depois em Minhas compras, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e os jogos publicados continuam no Mural.',
      },
    ],
  },
  fechamento: {
    titulo: 'A próxima brincadeira que ela inventar pode virar o primeiro jogo de vocês',
    cta: CTA_PLANOS,
    garantia: GARANTIA_CURTA,
    zappy: { arquivo: 'zappy-festa.webp', alt: '', largura: 640, altura: 640 },
  },
  rodape: {
    logo: { arquivo: 'logo-kids-escuro.svg', alt: 'Sistema Zero Kids', largura: 193, altura: 18 },
    aviso: 'Comunicação dirigida aos responsáveis',
    termos: { label: 'Termos de uso', href: '/kids/comunidade-dos-criadores/termos' },
    privacidade: { label: 'Privacidade', href: '/privacidade' },
  },
  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Ver os planos',
  },
}
