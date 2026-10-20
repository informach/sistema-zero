// Copy da página de oferta adulta da Comunidade dos Criadores (`pro/comunidade-dos-criadores`).
// Fonte: docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/canvas/PaginaAdulto.html
// (aprovada pela dona em 19/10/2026). O `ComunidadeAdultoOfertaBody.astro` renderiza TODO texto
// visível a partir daqui.
//
// Preços nunca são escritos à mão: os marcadores abaixo são preenchidos pelo body com os planos
// ao vivo do catálogo (ou o fallback `COMUNIDADE_ADULTO_PRECO_FALLBACK`).
//   {{preco_mensal}}              mensalidade
//   {{preco_anual}}               plano anual
//   {{equivalente_mensal_anual}}  plano anual dividido por 12
//   {{economia_anual}}            12 mensalidades menos o anual (some quando não há economia)
//   {{preco_dia}}                 mensalidade / 30 arredondada para os próximos 10 centavos

/** Cor de destaque de um item: vira `.cor-<nome>` e a variável `--cor` no CSS. */
export type CorAdulto = 'amarelo' | 'rosa' | 'azul' | 'verde' | 'menta' | 'dourado'

export interface ImagemAdulto {
  src: string
  alt: string
  width: number
  height: number
}

export interface CabecalhoAdulto {
  rotulo: string
  titulo: string
  texto?: string
}

export interface ItemColoridoAdulto {
  cor: CorAdulto
  titulo: string
  texto: string
}

export interface PaginaAdulto {
  seoTitle: string
  description: string
  pularParaConteudo: string
  topo: {
    marcaAria: string
    logoAlt: string
    selo: string
    navAria: string
    links: { href: string; label: string }[]
    cta: string
  }
  hero: {
    rotulo: string
    titulo: { antes: string; destaque: string; depois: string }
    texto: string
    beneficios: string[]
    cta: string
    garantia: string
    requisitos: { cor: CorAdulto; texto: string }[]
    tela: {
      rotulo: string
      imagem: ImagemAdulto
      jogo: string
      autoria: { antes: string; nome: string }
      start: string
      recorde: string
      direitos: string
      legenda: string
    }
  }
  problema: CabecalhoAdulto & { trava: { rotulo: string; texto: string } }
  levelUp: CabecalhoAdulto & { cartas: ItemColoridoAdulto[]; cta: string; garantia: string }
  base: CabecalhoAdulto & {
    regras: { cor: CorAdulto; nome: string; texto: string; codigo: string }[]
  }
  comoFunciona: CabecalhoAdulto & {
    passos: ItemColoridoAdulto[]
    tela: { imagem: ImagemAdulto; legenda: string }
    exemplo: { rotulo: string; texto: string }
    classicos: CabecalhoAdulto & {
      jogos: { nome: string; texto: string; imagem?: ImagemAdulto; marcador?: string }[]
      nota: string
    }
  }
  etapas: CabecalhoAdulto & {
    passos: (ItemColoridoAdulto & { rotulo: string })[]
    escada: {
      titulo: string
      legenda: { cor: CorAdulto; texto: string }[]
      libera: string
      etapas: { cor: CorAdulto; rotulo: string; nome: string; nivel: string; libera: string }[]
      fim: { rotulo: string; nome: string; nivel: string; texto: string }
    }
    fases: (ItemColoridoAdulto & { rotulo: string; imagem: ImagemAdulto })[]
    ordem: { rotulo: string; texto: string }
    nota: string
    cta: string
    garantia: string
  }
  comunidade: CabecalhoAdulto & {
    tela: { imagem: ImagemAdulto; legenda: string }
    lugares: { cor: CorAdulto; nome: string; texto: string }[]
    ajuda: { titulo: string; texto: string }
  }
  paraQuem: {
    titulo: string
    sim: { rotulo: string; itens: string[] }
    nao: { rotulo: string; itens: string[] }
  }
  fundadores: CabecalhoAdulto & { imagem: ImagemAdulto }
  oferta: CabecalhoAdulto & {
    depois: { rotulo: string; passos: string[] }
    garantia: { destaque: string; texto: string }
    cartao: {
      marca: string
      empresa: string
      inclui: string[]
      mensal: {
        rotulo: string
        preco: string
        sufixo: string
        texto: string
        cta: string
        garantia: string
      }
      anual: {
        selo: string
        rotulo: string
        preco: string
        sufixo: string
        texto: string
        cta: string
        garantia: string
      }
      nota: string
    }
  }
  duvidas: CabecalhoAdulto & { itens: { pergunta: string; resposta: string }[] }
  fechamento: CabecalhoAdulto & {
    cta: string
    garantia: string
    legal: {
      aria: string
      termos: { href: string; label: string }
      privacidade: { href: string; label: string }
    }
  }
  barra: { preco: string; alternativa: string; cta: string }
}

const GARANTIA = '7 dias de garantia. Cancele quando quiser.'
const CTA_PRIMEIRO_JOGO = 'Quero criar meu primeiro jogo'
const IMG_ADULTO = '/img/comunidade-adulto'
const IMG_KIDS = '/img/comunidade-dos-criadores'

export const PAGINA_ADULTO: PaginaAdulto = {
  seoTitle: 'Comunidade dos Criadores para adultos | Sistema Zero',
  description:
    'Para quem tem 18 anos ou mais e cresceu jogando: crie o seu primeiro jogo no navegador do computador, publique com o seu nome e siga dos blocos ao código. 7 dias de garantia. Cancele quando quiser.',
  pularParaConteudo: 'Ir para o conteúdo',
  topo: {
    marcaAria: 'Sistema Zero Comunidade dos Criadores, voltar ao topo',
    logoAlt: 'Sistema Zero',
    selo: 'COMUNIDADE DOS CRIADORES',
    navAria: 'Atalhos da página',
    links: [
      { href: '#fase1', label: 'Como funciona' },
      { href: '#fases', label: 'Etapas' },
    ],
    cta: 'Quero criar meu jogo',
  },
  hero: {
    rotulo: 'PLAYER 1 · PRESS START',
    titulo: {
      antes: 'Você cresceu jogando os jogos dos outros. Agora é o ',
      destaque: 'seu nome',
      depois: ' que aparece na tela de título.',
    },
    texto:
      'Imagine mandar o link para os amigos e ouvir que ninguém passou da fase que você inventou. O herói tem a cara que você desenhou, as regras são as que você escreveu e o placar conta do jeito que você decidiu. Aquela vontade de saber como um jogo funciona por dentro, que você tem desde a primeira partida, finalmente vira um jogo seu.',
    beneficios: [
      'Seu primeiro jogo terminado e publicado, com o seu nome na tela de título, escrito por você.',
      'Um link que abre no celular de quem você quiser, sem cadastro.',
      'Um passatempo para as horas livres que termina em algo para mostrar.',
    ],
    cta: CTA_PRIMEIRO_JOGO,
    garantia: GARANTIA,
    requisitos: [
      { cor: 'verde', texto: 'Para quem tem 18 anos ou mais' },
      { cor: 'azul', texto: 'No navegador do computador' },
      { cor: 'rosa', texto: '{{preco_mensal}} por mês, menos de {{preco_dia}} por dia' },
    ],
    tela: {
      rotulo: 'TELA DE TÍTULO',
      imagem: {
        src: `${IMG_ADULTO}/previa-arena.webp`,
        alt: 'Jogo de arena em pixel art ao fundo, com a tela de título por cima',
        width: 1100,
        height: 909,
      },
      jogo: 'GUARDIÕES DA ARENA',
      autoria: { antes: 'UM JOGO DE ', nome: 'SEU NOME' },
      start: 'PRESS START',
      recorde: '1P · RECORDE 00450',
      direitos: '© VOCÊ',
      legenda:
        'Ao fundo, uma tela de título como a que você monta no Estúdio, com um texto de HUD para o seu nome. Prévia ilustrativa, com dados fictícios.',
    },
  },
  problema: {
    rotulo: 'A IDEIA QUE FICOU NA CABEÇA',
    titulo: 'Talvez você já tenha imaginado um jogo inteiro no meio de uma partida',
    texto:
      'Uma fase mais difícil, um chefe diferente, uma regra que deixaria tudo mais divertido. Você sempre quis fazer um jogo. Aí abre uma engine, vê dezenas de janelas e fecha no mesmo dia. Ou segue um tutorial que acaba antes de chegar na sua ideia. Ou começa logo pelo jogo dos sonhos, com mundo aberto e história longa, e para no meio. Com o trabalho, a família e o cansaço da noite, o projeto fica para depois, e a ideia continua na gaveta.',
    trava: {
      rotulo: 'O QUE TRAVA',
      texto:
        'O problema quase sempre está no ponto de partida: um projeto grande demais, numa ferramenta feita para estúdios e sem um próximo passo claro. Por isso, aqui o primeiro jogo é pequeno de propósito, para você terminar, mostrar e ficar com vontade de fazer o próximo.',
    },
  },
  levelUp: {
    rotulo: 'LEVEL UP',
    titulo: 'Quando essa ideia finalmente sai da cabeça, o jogo muda de lado',
    texto: 'Você passa a decidir como o jogo funciona, e isso mexe com mais coisas do que parece.',
    cartas: [
      {
        cor: 'amarelo',
        titulo: 'A ideia vira um jogo terminado',
        texto:
          'Com começo, meio e fim, rodando no navegador e com o seu nome na tela de título. O "um dia eu faço" sai da lista.',
      },
      {
        cor: 'rosa',
        titulo: 'Você ouve "foi você que fez?"',
        texto:
          'Você compartilha no grupo, os amigos jogam pelo celular e alguém trava na fase que você desenhou.',
      },
      {
        cor: 'azul',
        titulo: 'Você passa a jogar com outros olhos',
        texto:
          'Começa a reparar como o pulo foi ajustado, por que aquela fase é difícil e onde o jogo esconde as dicas. E jogar fica ainda melhor.',
      },
      {
        cor: 'verde',
        titulo: 'A noite livre termina com uma fase nova',
        texto:
          'Em vez de mais uma partida, uma fase nova, um personagem, uma regra que ficou melhor. Tudo fica salvo e espera você voltar.',
      },
      {
        cor: 'amarelo',
        titulo: 'O jogo inteiro tem a sua cara',
        texto: 'Você desenha o herói, escreve as regras e decide o que acontece em cada fase.',
      },
      {
        cor: 'rosa',
        titulo: 'Você encontra gente que curte o mesmo',
        texto:
          'No Clube e no Desafio do mês, você mostra o que fez, joga o que os outros criaram e sai com ideia para o próximo.',
      },
    ],
    cta: CTA_PRIMEIRO_JOGO,
    garantia: GARANTIA,
  },
  base: {
    rotulo: 'VOCÊ JÁ TEM A BASE',
    titulo: 'E a boa notícia é que você já sabe mais do que imagina',
    texto:
      'Quem passou horas jogando já conhece as regras de um jogo por dentro: pular na hora certa, pegar a chave antes da porta, perder uma vida ao encostar no inimigo, voltar ao último checkpoint. Criar um jogo é escrever essas mesmas regras em blocos e ver o jogo obedecer. Veja, em esquema, como quatro delas ficam escritas nos primeiros jogos do caminho.',
    regras: [
      {
        cor: 'azul',
        nome: 'PULO',
        texto: 'No Corre, Dino, o dino pula o cacto quando você aperta a tecla.',
        codigo: 'QUANDO APERTAR · PULAR',
      },
      {
        cor: 'rosa',
        nome: 'VIDAS',
        texto:
          'Na Nave Contra Asteroides, a nave tem três vidas. Encostou no asteroide, perde uma.',
        codigo: 'SE TOCAR ASTEROIDE · VIDAS - 1',
      },
      {
        cor: 'amarelo',
        nome: 'CHAVE',
        texto: 'Na Chave do Farol, o farol só acende depois de pegar a chave.',
        codigo: 'SE TEM CHAVE · ACENDER FAROL',
      },
      {
        cor: 'verde',
        nome: 'PONTOS',
        texto: 'Na Nave, cada asteroide acertado soma no placar. Quanto vale, você decide.',
        codigo: 'SE ACERTAR ASTEROIDE · PLACAR + 1',
      },
    ],
  },
  comoFunciona: {
    rotulo: 'COMO FUNCIONA',
    titulo: 'Na prática, cada aula tem o ritmo de uma partida',
    texto:
      'O vídeo fica ao lado do editor, então você pausa, monta e vê o resultado antes de seguir. Tudo fica salvo na sua conta, e você continua de onde parou.',
    passos: [
      {
        cor: 'azul',
        titulo: 'Primeiro, você joga a versão pronta',
        texto: 'Assim você sabe aonde vai chegar antes de montar a primeira peça.',
      },
      {
        cor: 'rosa',
        titulo: 'Depois, muda uma regra',
        texto: 'Você monta os blocos que decidem o pulo, o valor da moeda e o fim da fase.',
      },
      {
        cor: 'amarelo',
        titulo: 'Então testa e confere',
        texto:
          'Roda o jogo e vê se ele obedeceu. O botão Verificar esta etapa diz o que já está certo antes de você seguir.',
      },
      {
        cor: 'verde',
        titulo: 'Por fim, publica',
        texto: 'O jogo ganha uma página que abre no celular de quem você quiser, sem cadastro.',
      },
    ],
    tela: {
      imagem: {
        src: `${IMG_ADULTO}/previa-aula.webp`,
        alt: 'Aula da Nave Contra Asteroides na área adulta: o vídeo à esquerda, o Estúdio com os blocos à direita e o botão de rodar o jogo',
        width: 1600,
        height: 800,
      },
      legenda:
        'Prévia da aula da Nave Contra Asteroides na área adulta, maquete com dados de teste: vídeo de um lado, Estúdio do outro e o botão de rodar o jogo',
    },
    exemplo: {
      rotulo: 'POR EXEMPLO',
      texto:
        'Na Nave Contra Asteroides, cada asteroide acertado vale um ponto. Você troca o valor para cinco, roda o jogo e vê o placar disparar. É a primeira regra do jogo que passa a ser sua.',
    },
    classicos: {
      rotulo: 'OS PRIMEIROS JOGOS',
      titulo: 'Você começa pelos clássicos',
      texto:
        'Uma nave contra asteroides, um dino que corre dos cactos, um farol que só acende com a chave. São jogos pequenos de propósito, que ensinam as regras de todo jogo, e os primeiros que você termina e publica com o seu nome.',
      jogos: [
        {
          nome: 'Cadê Todo Mundo',
          texto: 'Um jardim com bichinhos escondidos. O jogo conta cada um que você encontra.',
          imagem: {
            src: `${IMG_KIDS}/jogo-cade.webp`,
            alt: 'Cadê Todo Mundo: o jardim com o contador de achados',
            width: 1264,
            height: 723,
          },
        },
        {
          nome: 'A Chave do Farol',
          texto: 'Pegue a chave, acenda o farol e traga o barco até a costa.',
          imagem: {
            src: `${IMG_KIDS}/jogo-farol.webp`,
            alt: 'A Chave do Farol: a ilha, a chave e o farol',
            width: 1280,
            height: 800,
          },
        },
        {
          nome: 'Nave Contra Asteroides',
          texto: 'Ande, atire, some pontos e cuide das três vidas.',
          imagem: {
            src: `${IMG_KIDS}/jogo-nave.webp`,
            alt: 'Nave Contra Asteroides: a nave, os asteroides e o placar',
            width: 1180,
            height: 690,
          },
        },
        {
          nome: 'O Jogo do Meu Jeito',
          texto: 'Você desenha a sua nave e os seus asteroides e coloca no jogo.',
          marcador: 'DO SEU JEITO',
        },
        {
          nome: 'Corre, Dino',
          texto: 'Pule os cactos e decida até onde a corrida acelera.',
          imagem: {
            src: `${IMG_KIDS}/jogo-dino.webp`,
            alt: 'Corre, Dino: o dino, o cacto e o placar',
            width: 1264,
            height: 723,
          },
        },
      ],
      nota: 'As telas são dos cursos Kids, que a área adulta recebe com outra aparência.',
    },
  },
  etapas: {
    rotulo: 'SELECIONE A ETAPA',
    titulo:
      'Cada curso que você termina vira ferramenta no seu Estúdio. E é lá que você faz o jogo que está na sua cabeça',
    texto:
      'As aulas ensinam com um jogo completo. O que fica para você é a caixa de ferramentas, e ela cresce curso a curso, de propósito.',
    passos: [
      {
        cor: 'menta',
        rotulo: 'PASSO 1',
        titulo: 'Termina um curso, ganha os blocos',
        texto:
          'Cada curso ensina blocos novos, e eles ficam na sua paleta para sempre: Colisões, Som, Aparência. Concluir os cursos de uma etapa sobe você para a seguinte, e são 7 etapas, cada uma com nome e cor.',
      },
      {
        cor: 'azul',
        rotulo: 'PASSO 2',
        titulo: 'Sobe de etapa, abre a ferramenta',
        texto:
          'O Estúdio livre e o Pinta abrem assim que você conclui a primeira etapa. Depois chegam o Molda, para criar em três dimensões; a Ponte entre blocos e código; o Pensa, que conversa sobre a ideia do seu jogo e a organiza em tarefas; o Zappy no Estúdio, o tutor virtual que olha os seus blocos e diz o que conferir, sem mexer no projeto; e, por fim, o Estúdio Pro, em código.',
      },
      {
        cor: 'rosa',
        rotulo: 'PASSO 3',
        titulo: 'Faz o seu jogo com o que já sabe',
        texto:
          'Em Meus Jogos, você começa um projeto do zero com os blocos que conquistou. Cada curso novo põe peças na caixa, e o jogo que você consegue fazer cresce junto: do clássico de uma tela ao jogo de várias fases.',
      },
    ],
    escada: {
      titulo: 'A escada, etapa por etapa',
      legenda: [
        { cor: 'azul', texto: 'fase 1, blocos' },
        { cor: 'amarelo', texto: 'fase 2, Ponte' },
        { cor: 'rosa', texto: 'fase 3, código' },
      ],
      libera: 'Libera:',
      etapas: [
        {
          cor: 'azul',
          rotulo: 'ETAPA 1',
          nome: 'Aprendiz',
          nivel: 'Primeiros passos 2D',
          libera: 'Estúdio livre e Pinta',
        },
        {
          cor: 'azul',
          rotulo: 'ETAPA 2',
          nome: 'Construtor',
          nivel: 'Jogos 2D · Iniciante',
          libera: 'Blocos novos na paleta',
        },
        {
          cor: 'azul',
          rotulo: 'ETAPA 3',
          nome: 'Inventor',
          nivel: 'Jogos 3D · Iniciante',
          libera: 'Molda, para criar em 3D',
        },
        {
          cor: 'azul',
          rotulo: 'ETAPA 4',
          nome: 'Explorador de Mundos',
          nivel: 'Jogos 2D · Intermediário',
          libera: 'Blocos novos na paleta',
        },
        {
          cor: 'azul',
          rotulo: 'ETAPA 5',
          nome: 'Mestre dos Jogos',
          nivel: 'Jogos 3D · Intermediário',
          libera: 'Blocos novos na paleta',
        },
        {
          cor: 'amarelo',
          rotulo: 'ETAPA 6',
          nome: 'Arquiteto de Mundos',
          nivel: 'Jogos 2D · Avançado',
          libera: 'Ponte, Pensa e Zappy',
        },
        {
          cor: 'rosa',
          rotulo: 'ETAPA 7',
          nome: 'Gênio da Criação',
          nivel: 'Jogos 3D · Avançado',
          libera: 'Estúdio Pro, em código',
        },
      ],
      fim: {
        rotulo: 'FIM DA ESCADA',
        nome: 'Lenda',
        nivel: 'Todas as etapas concluídas',
        texto: 'Nome em dourado no perfil e no Mural.',
      },
    },
    fases: [
      {
        cor: 'azul',
        rotulo: 'FASE 1 · BLOCOS',
        titulo: 'A lógica do jogo, no Estúdio',
        texto:
          'Você monta cada regra com blocos e vê funcionar: quando apertar, pular; se tocar no asteroide, perder uma vida. É o mesmo Estúdio das aulas e de Meus Jogos. O Pinta e o Molda chegam para o herói, o cenário e o 3D.',
        imagem: {
          src: `${IMG_KIDS}/tela-estudio.webp`,
          alt: 'O Estúdio com os blocos montados e o jogo rodando ao lado',
          width: 1280,
          height: 800,
        },
      },
      {
        cor: 'amarelo',
        rotulo: 'FASE 2 · PONTE',
        titulo: 'Blocos e código lado a lado',
        texto:
          'No modo Ponte, cada bloco aparece ao lado do código que ele gera, e você aprende a ler código antes de escrever. O Pensa e o Zappy chegam nesta fase.',
        imagem: {
          src: `${IMG_KIDS}/tela-codigo.webp`,
          alt: 'Modo Ponte: blocos de um lado, código JavaScript do outro e o jogo rodando',
          width: 1280,
          height: 800,
        },
      },
      {
        cor: 'rosa',
        rotulo: 'FASE 3 · CÓDIGO',
        titulo: 'O Estúdio Pro, em código',
        texto:
          'Com a base firme, você escreve o jogo inteiro em código, com arquivos e pastas, para quem quiser ir até o fim da escada.',
        imagem: {
          src: `${IMG_KIDS}/estudio-pro-codigo.webp`,
          alt: 'Estúdio Pro no modo código, com a árvore de arquivos e o editor',
          width: 1440,
          height: 1000,
        },
      },
    ],
    ordem: {
      rotulo: 'POR QUE NESSA ORDEM',
      texto:
        'A engine inteira no primeiro dia é a cena que você conhece: dezenas de janelas e nenhum próximo passo. Aqui a caixa cresce no ritmo do que você já aprendeu, e cada ferramenta chega quando você tem base para usar. Você aprende de verdade, e o jogo que consegue fazer cresce junto.',
    },
    nota: 'No Pinta e no Molda, o desenho é todo seu, sem sugestão automática. As telas são prévias da área adulta com dados de teste.',
    cta: 'Quero começar pela etapa 1',
    garantia: GARANTIA,
  },
  comunidade: {
    rotulo: 'MULTIPLAYER',
    titulo: 'Depois de pronto, o jogo merece ser jogado',
    texto: 'É para isso que existe a comunidade. Ela tem quatro lugares:',
    tela: {
      imagem: {
        src: `${IMG_ADULTO}/previa-mural.webp`,
        alt: 'Mural dos Criadores da área adulta com cartões de jogos publicados',
        width: 1440,
        height: 1187,
      },
      // A tela é uma prévia com dados de teste (decisão da dona de 19/10/2026: prévia com legenda).
      legenda: 'O Mural, onde ficam os jogos publicados. Prévia da área adulta com dados de teste.',
    },
    lugares: [
      {
        cor: 'amarelo',
        nome: 'o Mural dos Criadores,',
        texto:
          ' onde quem recebe o link joga no celular, sem criar conta, e você pode fazer a sua versão dos jogos dos outros;',
      },
      {
        cor: 'rosa',
        nome: 'o Clube,',
        texto: ' a conversa com outras pessoas de 18 anos ou mais que também estão criando;',
      },
      {
        cor: 'verde',
        nome: 'o Desafio do mês,',
        texto: ' com um tema para todo mundo criar e mostrar;',
      },
      {
        cor: 'azul',
        nome: 'o ranking,',
        texto: ' em que o seu nome só aparece se você ligar o perfil público.',
      },
    ],
    ajuda: {
      titulo: 'E quando você travar, tem ajuda',
      texto:
        'As dúvidas vão para a equipe pelos Recados, o canal de mensagens da plataforma. Nas etapas avançadas, o Zappy, o tutor virtual do Estúdio, olha os seus blocos e diz o que conferir; quem decide e monta continua sendo você.',
    },
  },
  paraQuem: {
    titulo: 'Para você decidir com calma, vale saber para quem isso foi feito',
    sim: {
      rotulo: 'É PARA VOCÊ SE',
      itens: [
        'tem 18 anos ou mais e joga desde sempre;',
        'quer entender como um jogo funciona por dentro e fazer o seu;',
        'nunca programou, ou programou pouco;',
        'tem computador com internet, mouse e teclado.',
      ],
    },
    nao: {
      rotulo: 'AINDA NÃO É PARA VOCÊ SE',
      itens: [
        'quer um curso para trabalhar com jogos ou montar portfólio;',
        'precisa de professor ao vivo toda semana;',
        'quer criar pelo celular ou pelo tablet;',
        'procura aprender uma engine específica, como Unity ou Unreal.',
      ],
    },
  },
  fundadores: {
    rotulo: 'QUEM CRIOU',
    titulo: 'A gente programa há mais de dez anos, e começou a fazer jogos em casa',
    texto:
      'Somos Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres. O Sistema Zero começou com os jogos que fizemos com os nossos filhos. A área adulta usa o mesmo Estúdio e um Mural próprio, com a cara de quem gosta de jogo, e somos nós que preparamos as aulas.',
    imagem: {
      src: `${IMG_ADULTO}/fundadores-aulas.webp`,
      alt: 'Helena e Júlio, fundadores do Sistema Zero, gravando uma aula com o Estúdio na tela',
      width: 1280,
      height: 851,
    },
  },
  oferta: {
    rotulo: 'INSERT COIN',
    titulo: 'Tudo o que você precisa para tirar o jogo da cabeça fica num lugar só',
    texto:
      'Os cursos levam você do primeiro jogo ao código, as ferramentas cobrem regras, arte e 3D, e o Mural coloca o seu jogo no celular de quem você quiser. Os cursos lançados durante a assinatura entram sem custo extra, e os dois planos dão acesso a tudo: muda só a forma de pagar.',
    depois: {
      rotulo: 'O QUE ACONTECE DEPOIS DE ASSINAR',
      passos: [
        'Depois do pagamento, você recebe por e-mail o link para criar a senha e entrar.',
        'Abre o primeiro curso e joga a versão pronta.',
        'Muda a primeira regra, testa e salva.',
        'Publica o primeiro jogo e manda o link para alguém.',
      ],
    },
    garantia: {
      destaque: 'Você tem 7 dias para testar.',
      texto:
        ' Se não for para você, é só pedir o reembolso integral por e-mail dentro desse prazo.',
    },
    cartao: {
      marca: 'COMUNIDADE DOS CRIADORES',
      empresa: 'SISTEMA ZERO',
      inclui: [
        'Cursos do primeiro jogo ao código',
        'Estúdio, Pinta e Molda para fazer o jogo inteiro: regras, arte e 3D',
        'Mural para publicar e mostrar',
        'Clube e Desafio do mês para mostrar o que você fez',
        'Etapas, conquistas e certificado para ver a sua evolução',
        'Tutoriais e Recados para quando travar',
      ],
      mensal: {
        rotulo: 'MENSAL',
        preco: '{{preco_mensal}}',
        sufixo: '/mês',
        texto:
          'Menos de {{preco_dia}} por dia. Renova todo mês no cartão, e você cancela quando quiser.',
        cta: 'Assinar o mensal',
        garantia: '7 dias de garantia',
      },
      anual: {
        selo: 'ECONOMIA DE {{economia_anual}}',
        rotulo: 'ANUAL',
        preco: '{{preco_anual}}',
        sufixo: '/ano',
        texto:
          'Sai por {{equivalente_mensal_anual}} por mês. No Pix à vista, não renova sozinho; no cartão, renova uma vez por ano.',
        cta: 'Assinar o anual',
        garantia: '7 dias de garantia',
      },
      nota: 'No navegador do computador, com mouse e teclado.',
    },
  },
  duvidas: {
    rotulo: 'PERGUNTAS',
    titulo: 'Algumas dúvidas que costumam aparecer antes de apertar start',
    itens: [
      {
        pergunta: 'Tenho 18 anos. É para mim?',
        resposta:
          'É. A área adulta é para quem tem 18 anos ou mais, na faculdade, no trabalho ou nos dois. O que junta todo mundo é gostar de jogo.',
      },
      {
        pergunta: 'Tenho mais de 30 anos e nunca programei. É tarde?',
        resposta:
          'Não. Tarde seria para quem quer concorrer com quem começou aos 15 para trabalhar com isso, e aqui o objetivo é outro: terminar um jogo nas horas livres. A primeira fase é com blocos, para a lógica ficar à vista, e o primeiro curso traz os blocos e o projeto preparados.',
      },
      {
        pergunta: 'Nunca programei. Consigo?',
        resposta:
          'Consegue começar. O primeiro curso usa blocos e um projeto preparado, e cada parte é conferida antes da próxima. A proposta é você terminar o seu primeiro jogo nas horas livres, sem prometer uma profissão.',
      },
      {
        pergunta: 'Bloco de montar não é coisa de criança?',
        resposta:
          'Os blocos são a primeira fase: tiram a digitação do caminho e deixam a lógica à vista. Na segunda fase, a Ponte mostra cada bloco ao lado do código que ele gera, e na terceira você escreve o jogo em código.',
      },
      {
        pergunta: 'É a mesma plataforma das crianças?',
        resposta:
          'Em parte. Os primeiros projetos são os mesmos clássicos da trilha infantil, uma nave, um dino, um farol, porque eles ensinam as mesmas regras de jogo. A área, as aulas, a conversa e o caminho até o código são adultos, com outra conta e outra aparência.',
      },
      {
        pergunta: 'Que computador eu preciso?',
        resposta:
          'Um computador com internet, navegador atualizado, mouse e teclado. Tudo roda no navegador, sem instalar nada. O celular serve para jogar e mostrar o que você publicou.',
      },
      {
        pergunta: 'Quanto tempo preciso por semana?',
        resposta:
          'Quem decide é você. As aulas são gravadas, o projeto fica salvo e você continua de onde parou.',
      },
      {
        pergunta: 'Preciso saber desenhar?',
        resposta:
          'Não. Os personagens e os cenários das aulas vêm prontos. O Pinta e o Molda entram pelas etapas, o Pinta na primeira e o Molda na terceira, para você desenhar os seus em 2D ou em 3D. Nos dois, o desenho é todo seu.',
      },
      {
        pergunta: 'Posso fazer um jogo meu, e não só os dos cursos?',
        resposta:
          'Pode, e é para isso que os cursos existem. O Estúdio livre abre ao concluir a primeira etapa, com os blocos que você já aprendeu, e cresce a cada curso. Os seus projetos ficam em Meus Jogos, e qualquer um ganha um link para mostrar.',
      },
      {
        pergunta: 'O Pensa e o Zappy custam à parte?',
        resposta:
          'Não. A assinatura inclui um limite mensal de uso dos dois, que você acompanha no seu perfil. O Pinta e o Molda não entram nesse limite.',
      },
      {
        pergunta: 'Tem aula ao vivo?',
        resposta:
          'As aulas são gravadas para caber no seu horário, e as dúvidas vão para a equipe pelos Recados.',
      },
      {
        pergunta: 'Posso cancelar quando quiser?',
        resposta:
          'Pode. O cancelamento fica na sua conta, em Compras, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e os jogos publicados continuam no Mural.',
      },
    ],
  },
  fechamento: {
    rotulo: 'CONTINUE',
    titulo: 'A próxima partida pode ser num jogo feito por você',
    texto: 'E a ideia que você teve jogando ontem pode virar a primeira fase dele.',
    cta: CTA_PRIMEIRO_JOGO,
    garantia: GARANTIA,
    legal: {
      aria: 'Termos e privacidade',
      termos: { href: '/pro/comunidade-dos-criadores/termos', label: 'Termos de uso' },
      privacidade: { href: '/privacidade', label: 'Privacidade' },
    },
  },
  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Quero criar meu jogo',
  },
}
