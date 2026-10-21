import type { ImagemDesafio } from '../../desafio-primeiro-jogo/oferta/pagina-9a17'

// Página do Desafio do Primeiro Jogo para adultos (`pro/desafio-primeiro-jogo`, proposta aprovada
// de 21/10/2026, quadro DesafioAdulto com o review aplicado). Tema arcade, como a página adulta da
// Comunidade: os rótulos de pixel ficam em português (só PRESS START e INSERT COIN, já usados na
// Comunidade adulta, continuam em inglês). Preço só por marcador ({{preco}}, {{preco_dia}}).

const CTA = 'Quero fazer meu primeiro jogo'
const CONDICOES = '{{preco}}, pagamento único · 30 dias de acesso · 7 dias de garantia'

export const PAGINA_DESAFIO_ADULTO = {
  seoTitle: 'Desafio do Primeiro Jogo para adultos | Sistema Zero',
  description:
    'Você faz o seu primeiro jogo e manda o link para os amigos jogarem. A Chave do Farol, montada com blocos em 3 fases, com 30 dias para fazer no seu ritmo. Pagamento único.',
  capa: 'desafio-primeiro-jogo/farol-capa.webp',
  cta: CTA,
  condicoes: CONDICOES,

  topo: {
    pular: 'Ir para o conteúdo',
    marcaAria: 'Sistema Zero, voltar ao topo',
    logoAlt: 'Sistema Zero',
    selo: 'PRIMEIRO JOGO',
    navAria: 'Atalhos da página',
    links: [
      { href: '#jogo', label: 'O jogo' },
      { href: '#aula', label: 'Como funciona' },
    ],
    cta: CTA,
  },

  hero: {
    rotulo: 'PLAYER 1 · PRESS START',
    titulo: {
      antes: 'Você faz o ',
      destaque: 'seu primeiro jogo',
      depois: ' e manda o link para os amigos jogarem.',
    },
    texto:
      'Você monta A Chave do Farol com blocos: personagem, chave, porta e farol. São 3 fases, com 30 dias para fazer no seu ritmo.',
    beneficios: [
      'Aula em vídeo com o Estúdio do lado',
      'Você não digita código para começar',
      'Certificado com o seu nome no fim',
    ],
    linkSecundario: 'Ver o jogo',
    tela: {
      rotulo: 'A CHAVE DO FAROL',
      jogador: '1P',
      imagem: {
        src: 'desafio-primeiro-jogo/farol-jogo.png',
        width: 1280,
        height: 960,
        alt: 'A Chave do Farol: o personagem na trilha, a chave dourada e o farol listrado na ilha',
      } satisfies ImagemDesafio,
      legenda: 'O jogo que você vai montar.',
    },
    faixa: '30 DIAS',
  },

  jeitos: {
    titulo: 'Você já pensou em fazer um jogo e nunca soube por onde começar.',
    texto:
      'O tutorial pula etapas e a ferramenta assusta na primeira tela. Sem um caminho, a ideia fica guardada.',
    so: {
      titulo: 'Só rolar o feed',
      texto: 'Você só recebe.',
      alt: 'Um celular cinza com uma lista que não acaba e setas de rolar para baixo',
    },
    fazer: {
      titulo: 'Fazer o jogo',
      texto: 'Você decide e o jogo responde.',
      alt: 'Uma tela com blocos coloridos de um lado e um farol aceso do outro, com uma lâmpada acima',
    },
    frase: 'A tela é a mesma. Muda o que você faz com ela.',
  },

  jogo: {
    rotulo: 'AS FASES',
    titulo: 'O seu primeiro jogo, em 3 fases',
    fases: [
      {
        rotulo: 'FASE 1',
        titulo: 'O personagem anda',
        texto: 'Você faz o personagem andar com as setas do teclado.',
      },
      {
        rotulo: 'FASE 2',
        titulo: 'A chave muda o jogo',
        texto: 'Sem a chave, a porta fica fechada. Com a chave, ela abre.',
      },
      {
        rotulo: 'FASE 3',
        titulo: 'O farol acende',
        texto: 'Com a chave, o farol acende e o barco chega.',
      },
      {
        rotulo: 'FASE CONCLUÍDA',
        titulo: 'Certificado',
        texto: 'Com o seu nome, quando o jogo fica pronto.',
      },
    ],
    blocos: {
      imagem: {
        src: 'desafio-primeiro-jogo/farol-blocos.png',
        width: 1364,
        height: 1360,
        alt: 'Os blocos da regra do farol: quando o personagem encosta no farol, se tem a chave, o farol acende; se não tem, aparece o aviso de que falta a chave',
      } satisfies ImagemDesafio,
      titulo: 'Blocos com as palavras escritas',
      paragrafos: [
        'Você encaixa blocos como "Se tem a chave, acender o farol". A lógica é a mesma do código.',
        'O jogo fica do seu jeito: você escolhe o personagem, o cenário e onde a chave fica escondida.',
      ],
    },
  },

  aula: {
    rotulo: 'COMO JOGAR',
    titulo: 'Cada aula tem o ritmo de uma partida',
    passos: [
      {
        titulo: '1. Joga a versão pronta',
        texto: 'Você vê aonde vai chegar.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-joga.webp',
          width: 1260,
          height: 760,
          alt: 'A versão pronta do jogo aberta na aula',
        },
      },
      {
        titulo: '2. Vê o vídeo e monta',
        texto: 'O vídeo fica do lado dos blocos.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-video.webp',
          width: 1600,
          height: 625,
          alt: 'O vídeo da aula à esquerda e o Estúdio de blocos à direita',
        },
      },
      {
        titulo: '3. Confere com um botão',
        texto: 'Ele mostra o que já está certo e o que falta.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-verificar.webp',
          width: 740,
          height: 340,
          alt: 'O botão Verificar esta parte, com o que já está cumprido e o que falta',
        },
      },
      {
        titulo: '4. Publica e manda o link',
        texto: 'Os amigos jogam no celular.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-mural.webp',
          width: 1600,
          height: 786,
          alt: 'O Mural com os jogos publicados',
        },
      },
    ] satisfies { titulo: string; texto: string; imagem: ImagemDesafio }[],
    nota: 'Telas da versão Kids da plataforma, no curso Cadê Todo Mundo. Na área adulta, a aparência é outra.',
  },

  ganha: {
    rotulo: 'O QUE VOCÊ GANHA',
    titulo: 'Fazendo o jogo, você exercita',
    habilidades: [
      {
        titulo: 'Pensar com lógica',
        texto: 'Se tem a chave, a porta abre. Se não tem, fica fechada.',
      },
      { titulo: 'Planejar', texto: 'Dividir o jogo em partes e decidir a ordem.' },
      {
        titulo: 'Resolver problemas',
        texto: 'Quando algo não funciona, você acha o erro e corrige.',
      },
      { titulo: 'Terminar o que começou', texto: 'Um jogo pronto, com link para mostrar.' },
    ],
    faixa: {
      titulo: 'Você faz por gosto, no seu ritmo.',
      texto: 'Sem horário marcado e sem prova. Dez minutos num dia, uma hora no outro.',
    },
  },

  quem: {
    rotulo: 'QUEM JOGA',
    titulo: 'Para quem é',
    perfis: [
      { marca: 'P1', texto: 'Quem nunca programou.' },
      { marca: 'P2', texto: 'Quem já tentou sozinho e parou.' },
      { marca: 'P3', texto: 'Quem cresceu jogando e quer fazer o próprio jogo.' },
    ],
    requisito: 'Para pessoas com 18 anos ou mais. Precisa de computador com mouse e teclado.',
    caderno: {
      imagem: {
        src: 'desafio-adulto/farol-caderno.png',
        width: 1588,
        height: 2246,
        alt: 'Uma página do Caderno do Aluno adulto da Chave do Farol, com os três testes do jogo inteiro',
      } satisfies ImagemDesafio,
      legenda: 'O Caderno do Aluno explica cada teste, passo a passo.',
    },
  },

  fundadores: {
    rotulo: 'QUEM FEZ O JOGO',
    titulo: 'A gente programa há mais de dez anos, e começou a fazer jogos em casa',
    paragrafos: [
      'Somos Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres.',
      'O Sistema Zero começou com os jogos que fizemos com os nossos filhos. As aulas do Desafio são nossas.',
    ],
    imagem: {
      src: 'comunidade-adulto/fundadores-aulas.webp',
      width: 1280,
      height: 851,
      alt: 'Helena e Júlio, fundadores do Sistema Zero, gravando uma aula com o Estúdio na tela',
    } satisfies ImagemDesafio,
  },

  oferta: {
    rotulo: 'INSERT COIN',
    titulo: 'Comece o seu primeiro jogo hoje',
    selo: 'DESAFIO DO PRIMEIRO JOGO',
    sufixo: 'pagamento único',
    porDia: 'Menos de {{preco_dia}} por dia de acesso.',
    inclui: [
      'As 3 fases da Chave do Farol e o certificado',
      'Aulas em vídeo com o Estúdio dentro da aula',
      'Caderno do Aluno e tutoriais do Como fazer',
      'Ajuda por mensagens',
      'Publicar o jogo no Mural e mandar o link',
      '30 dias de acesso, sem renovação',
    ],
    incluiLabel: 'O que está incluído no Desafio',
    garantia: '7 dias de garantia. Se não gostar, você pede o dinheiro de volta nesse prazo.',
    depoisTitulo: 'Depois da compra',
    depois: [
      'Você recebe o acesso por e-mail e WhatsApp.',
      'Cria a sua senha e entra.',
      'Começa a primeira aula. Os 30 dias contam da aprovação do pagamento.',
    ],
    jaTem: 'Para quem já tem conta no Sistema Zero:',
    jaTemLink: 'entrar com o seu acesso.',
  },

  caminho: {
    rotulo: 'PRÓXIMA FASE',
    titulo: 'O primeiro jogo é o começo',
    passos: [
      { titulo: 'O primeiro jogo', texto: 'A Chave do Farol, aqui no Desafio.' },
      { titulo: 'Jogos maiores', texto: 'Na Comunidade, um curso depois do outro.' },
      {
        titulo: 'Um jogo com a sua ideia',
        texto: 'Feito com as peças que você juntou nos cursos.',
      },
    ],
    texto:
      'Quem quiser continuar, segue na Comunidade dos Criadores, com jogos cada vez maiores. A escolha fica para depois do primeiro jogo.',
    link: 'Conhecer a Comunidade dos Criadores',
  },

  duvidas: {
    titulo: 'Dúvidas antes de apertar start',
    itens: [
      {
        pergunta: 'Nunca programei. Consigo?',
        resposta:
          'Consegue. Você encaixa blocos com as palavras escritas, e o vídeo mostra cada passo.',
      },
      {
        pergunta: 'Tenho mais de 30 anos. É para mim?',
        resposta:
          'É para quem tem 18 anos ou mais. A idade não muda nada: o que conta é a vontade de fazer o jogo.',
      },
      {
        pergunta: 'O curso é infantil?',
        resposta:
          'A área adulta tem aparência e linguagem próprias. O jogo do Desafio é A Chave do Farol nas duas versões, porque é um bom primeiro jogo para qualquer idade.',
      },
      {
        pergunta: 'Quanto tempo preciso por dia?',
        resposta:
          'Você decide. As aulas são divididas em partes curtas, e tudo fica salvo para continuar depois.',
      },
      {
        pergunta: 'Funciona no celular?',
        resposta:
          'Para montar, precisa de computador com mouse e teclado. Depois de publicado, o jogo abre no celular.',
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
          'As aulas fecham. O jogo publicado continua com o link funcionando, e o que você fez fica guardado na conta.',
      },
    ],
  },

  fechamento: {
    titulo: 'A próxima partida pode ser no jogo que você fez.',
    texto: '{{preco}}, pagamento único. 30 dias de acesso. 7 dias de garantia.',
    cta: CTA,
    legal: {
      aria: 'Documentos legais',
      termos: { href: '/pro/desafio-primeiro-jogo/termos', label: 'Termos do Desafio' },
      privacidade: { href: '/privacidade', label: 'Privacidade' },
    },
  },

  barra: { sufixo: 'pagamento único', cta: 'Começar' },
} as const
