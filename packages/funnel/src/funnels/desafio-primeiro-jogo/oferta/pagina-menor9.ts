import type { RelatoId } from '../../comunidade-dos-criadores/oferta/types'
import type { ImagemDesafio } from './pagina-9a17'

// Página do Desafio do Primeiro Jogo para crianças menores de 9 anos, criando junto com um adulto
// (proposta aprovada de 21/10/2026, quadro DesafioMenor9 com o review aplicado). A criança é "seu
// filho" e "ele", como na página de 9 a 17 (a página serve a meninos e meninas). Preço só por
// marcador ({{preco}}, {{preco_dia}}), preenchido pelo corpo a partir do catálogo.

const CTA = 'Começar o Desafio juntos'
const CONDICOES = '{{preco}}, pagamento único · 30 dias de acesso · 7 dias de garantia'

export const PAGINA_DESAFIO_MENOR9 = {
  seoTitle: 'Desafio do Primeiro Jogo para criar junto, menores de 9 anos | Sistema Zero',
  description:
    'O primeiro jogo do seu filho, feito com você do lado. Ele escolhe o personagem e o cenário, você lê e ajuda com o mouse. Pagamento único, 30 dias de acesso.',
  capa: 'desafio-primeiro-jogo/farol-capa.webp',
  cta: CTA,
  condicoes: CONDICOES,

  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      src: 'comunidade-dos-criadores/logo-kids-claro.svg',
      width: 286,
      height: 22,
      alt: 'Sistema Zero Kids',
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      { href: '#sessao', label: 'Como é uma sessão' },
      { href: '#papel', label: 'O seu papel' },
    ],
    cta: 'Começar juntos',
  },

  heroi: {
    selo: 'Desafio do Primeiro Jogo · menores de 9, com um adulto do lado',
    titulo: 'O primeiro jogo do seu filho, feito com você do lado.',
    enfase: 'com você do lado.',
    texto:
      'Ele escolhe o personagem e o cenário. Você lê e ajuda com o mouse. No fim, vocês mostram o jogo para a família.',
    beneficios: [
      'Ele decide, você ajuda',
      'O Zappy lê as falas em voz alta',
      'Um jogo de verdade no fim',
    ],
    ilustracao: {
      src: 'comunidade-dos-criadores/ilustra-criar-junto.webp',
      width: 1000,
      height: 1263,
      alt: 'Ilustração de uma mãe e um pai atrás do filho no computador, criando um jogo juntos, com o Zappy',
    } satisfies ImagemDesafio,
    balao: 'Aperte Ouvir e eu leio para vocês.',
    zappy: {
      src: 'comunidade-dos-criadores/zappy-fala.webp',
      width: 360,
      height: 458,
      alt: '',
    } satisfies ImagemDesafio,
  },

  problema: {
    titulo: 'Ele inventa cada brincadeira. Na tela, só joga o que está pronto.',
    texto:
      'Ele cria regra para o pega-pega e conta fases inteiras que só existem na cabeça dele. No jogo pronto, alguém já decidiu tudo. Aqui, as ideias dele viram jogo.',
    so: {
      titulo: 'Só jogar',
      texto: 'Ele aperta e o jogo decide.',
      alt: 'Um menino sozinho diante de um tablet cinza com um botão de play',
    },
    junto: {
      titulo: 'Fazer junto',
      texto: 'Ele decide e vocês montam.',
      alt: 'Um menino sorrindo com uma lâmpada acesa, ao lado de um adulto, diante de uma tela colorida',
    },
    destaque: 'A tela vira um tempo de vocês dois.',
  },

  jogo: {
    titulo: 'O primeiro jogo de vocês: A Chave do Farol',
    etapas: [
      { destaque: 'O personagem anda.', texto: 'Ele escolhe quem é e faz andar.' },
      { destaque: 'A chave abre a porta.', texto: 'Sem a chave, fica fechada.' },
      { destaque: 'O farol acende.', texto: 'E o barco chega.' },
      { destaque: 'Certificado', texto: 'com o nome dele.' },
    ],
    imagem: {
      src: 'desafio-primeiro-jogo/farol-jogo.png',
      width: 1280,
      height: 960,
      alt: 'A Chave do Farol: o personagem na trilha, a chave dourada e o farol listrado na ilha',
    } satisfies ImagemDesafio,
    legenda: 'Ele escolhe o personagem, o cenário e onde a chave fica escondida.',
  },

  sessao: {
    titulo: 'Uma sessão de vocês, em 4 passos',
    passos: [
      {
        texto: 'Vocês jogam a versão pronta.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-joga.webp',
          width: 1260,
          height: 760,
          alt: 'A versão pronta do jogo aberta na aula',
        },
      },
      {
        texto: 'Assistem ao vídeo juntos.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-video.webp',
          width: 1600,
          height: 625,
          alt: 'O vídeo da aula à esquerda e o Estúdio de blocos à direita',
        },
      },
      {
        texto: 'Ele diz o que quer. Você ajuda a encaixar.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-verificar.webp',
          width: 740,
          height: 340,
          alt: 'O botão Verificar esta parte, com o que já está cumprido e o que falta',
        },
      },
      {
        texto: 'Vocês testam e chamam a família para jogar.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-mural.webp',
          width: 1600,
          height: 786,
          alt: 'O Mural dos Criadores com os jogos publicados',
        },
      },
    ] satisfies { texto: string; imagem: ImagemDesafio }[],
    nota: 'As telas são de outro curso da plataforma, o Cadê Todo Mundo. O jeito da aula é o mesmo.',
  },

  papel: {
    titulo: 'O seu papel: ler, perguntar e deixar ele escolher',
    texto: 'Você não precisa saber programar.',
    cartas: [
      { titulo: 'Ler', texto: 'Você lê as instruções em voz alta. Ou aperta Ouvir.' },
      {
        titulo: 'Perguntar',
        texto: '"E se o personagem chegar sem a chave?" Ele testa e descobre.',
      },
      {
        titulo: 'Deixar ele escolher',
        texto: 'O personagem, o cenário e o lugar da chave são escolhas dele.',
      },
    ],
  },

  treina: {
    titulo: 'Brincando de fazer o jogo, ele treina',
    habilidades: [
      { titulo: 'Planejar', texto: 'Primeiro a chave. Depois a porta.' },
      { titulo: 'Pensar com lógica', texto: 'Com a chave, abre. Sem a chave, não abre.' },
      { titulo: 'Tentar de novo', texto: 'Não deu certo. Ele muda e testa outra vez.' },
      { titulo: 'Foco', texto: 'Ele fica até o farol acender.' },
    ],
    faixa: {
      titulo: 'Ninguém precisa virar programador.',
      texto:
        'É como a natação e a música: ninguém espera um atleta ou um músico. O que fica é o que ele treinou.',
    },
  },

  prova: {
    relato: {
      id: 'AV03' as RelatoId,
      legenda: 'Aluna, 7 anos · relato sobre o Desafio do Primeiro Jogo',
    },
    retrato: {
      src: 'comunidade-dos-criadores/depo-debora-rosto.webp',
      width: 480,
      height: 480,
      alt: 'Débora, aluna, sorrindo, de óculos',
    } satisfies ImagemDesafio,
    fundadores: {
      imagem: {
        src: 'comunidade-dos-criadores/familia-helena-julio-kids.webp',
        width: 880,
        height: 1019,
        alt: 'Helena e Júlio, fundadores, com a família',
      } satisfies ImagemDesafio,
      texto:
        'Quem prepara as aulas são Helena e Júlio, pais do André e da Débora. Tudo começou com os jogos que fizeram com os filhos, em casa.',
    },
  },

  oferta: {
    titulo: 'Comecem o primeiro jogo de vocês',
    selo: 'Desafio do Primeiro Jogo',
    sufixo: 'pagamento único',
    porDia: 'Menos de {{preco_dia}} por dia de acesso.',
    inclui: [
      'As 3 etapas da Chave do Farol e o certificado',
      'Aulas em vídeo, com o Zappy lendo em voz alta',
      'Caderno do Aluno e ajuda por mensagens',
      'Publicar o jogo e mandar o link para a família',
      '30 dias de acesso, sem renovação',
    ],
    incluiLabel: 'O que está incluído no Desafio',
    garantia: '7 dias de garantia. Se não gostar, você pede o dinheiro de volta nesse prazo.',
    depoisTitulo: 'Depois da compra',
    depois: [
      'Você recebe o acesso por e-mail e WhatsApp.',
      'Na Área dos pais, você clica em Adicionar criança.',
      'Vocês sentam juntos e começam a primeira aula.',
    ],
  },

  continuidade: {
    titulo: 'O primeiro jogo é o começo',
    passos: [
      { titulo: 'O primeiro jogo', texto: 'A Chave do Farol, aqui no Desafio.' },
      { titulo: 'Jogos maiores', texto: 'Na Comunidade, um curso depois do outro.' },
      {
        titulo: 'Um jogo com a ideia dele',
        texto: 'Feito com as peças que ele juntou nos cursos.',
      },
    ],
    texto:
      'Se vocês gostarem, dá para continuar na Comunidade dos Criadores, com jogos cada vez maiores. A escolha fica para depois.',
    link: 'Conhecer a Comunidade para criar junto',
  },

  duvidas: {
    titulo: 'Dúvidas de quem vai criar junto',
    itens: [
      {
        pergunta: 'Ele ainda não lê sozinho. Dá certo?',
        resposta: 'Dá. Você lê com ele, ou aperta Ouvir e o Zappy lê as falas em voz alta.',
      },
      {
        pergunta: 'Eu não entendo de programação. Consigo ajudar?',
        resposta:
          'Consegue. O vídeo mostra cada passo, e os blocos têm as palavras escritas. Vocês aprendem juntos.',
      },
      {
        pergunta: 'Quanto tempo dura cada sessão?',
        resposta:
          'Vocês decidem. Cada aula é dividida em partes curtas, e tudo fica salvo para continuar outro dia.',
      },
      {
        pergunta: 'Funciona no tablet?',
        resposta:
          'Para montar, precisa de computador com mouse e teclado. Depois de publicado, o jogo abre no celular e no tablet.',
      },
      {
        pergunta: 'Ele tem 5 anos. É cedo?',
        resposta:
          'Depende mais de ele gostar de inventar brincadeira do que da idade. Com você lendo e conduzindo, as sessões ficam curtas. Os 7 dias de garantia servem para vocês testarem.',
      },
      {
        pergunta: 'Qual é a diferença para a Comunidade?',
        resposta:
          'O Desafio é um jogo só, com 30 dias e pagamento único. A Comunidade é a assinatura com os cursos da plataforma, para quem quer continuar.',
      },
      {
        pergunta: 'É assinatura?',
        resposta: 'Não. É um pagamento único de {{preco}}, sem renovação.',
      },
      {
        pergunta: 'O que acontece depois dos 30 dias?',
        resposta:
          'As aulas fecham. O jogo publicado continua com o link funcionando, e o que vocês fizeram fica guardado na conta.',
      },
    ],
  },

  fechamento: {
    titulo: 'A próxima brincadeira que ele inventar pode virar o primeiro jogo de vocês.',
    texto: '{{preco}}, pagamento único. 30 dias de acesso. 7 dias de garantia.',
    cta: 'Começar juntos',
    zappy: {
      src: 'comunidade-dos-criadores/zappy-festa.webp',
      width: 640,
      height: 640,
      alt: '',
    } satisfies ImagemDesafio,
  },

  rodape: {
    logo: {
      src: 'comunidade-dos-criadores/logo-kids-escuro.svg',
      width: 193,
      height: 18,
      alt: 'Sistema Zero Kids',
    },
    aviso: 'Comunicação dirigida aos responsáveis',
    links: [
      { href: '/kids/desafio-primeiro-jogo/termos', label: 'Termos do Desafio' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },

  barra: { sufixo: 'pagamento único', cta: 'Começar juntos' },
} as const

/** Os relatos citados nesta página (o teste confere que todos existem em `RELATOS`). */
export const RELATOS_DESAFIO_MENOR9: readonly RelatoId[] = ['AV03']
