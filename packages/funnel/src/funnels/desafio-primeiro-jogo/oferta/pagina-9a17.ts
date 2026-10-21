import { RELATOS } from '../../comunidade-dos-criadores/oferta/relatos'
import type { RelatoId } from '../../comunidade-dos-criadores/oferta/types'

// Página do Desafio do Primeiro Jogo para 9 a 17 anos (proposta aprovada de 21/10/2026, Canvas
// "Desafio do Primeiro Jogo · três páginas", quadro Desafio917 com o review aplicado). A copy é a
// do desenho, palavra por palavra. Preço só por marcador ({{preco}}, {{preco_dia}}), preenchido
// pelo corpo a partir do catálogo; nada de valor escrito à mão.

/** Uma imagem da página. `src` é relativo a `/img/` (a página usa fotos de duas pastas). */
export interface ImagemDesafio {
  src: string
  width: number
  height: number
  alt: string
}

/** Uma fala de `RELATOS`, com um complemento opcional na legenda (o parentesco do André). */
export interface RelatoDesafio {
  id: RelatoId
  complemento?: string
}

/** Nome, papel e o contexto do relato, como no Instagram: "Rafael, aluno, relato sobre o Desafio…". */
export function legendaRelatoDesafio(r: RelatoDesafio): string {
  const { nome, papel, contexto } = RELATOS[r.id]
  const base = `${nome}, ${papel.charAt(0).toLowerCase()}${papel.slice(1)}`
  const meio = r.complemento ? `, ${r.complemento}` : ''
  return `${base}${meio}, ${contexto.charAt(0).toLowerCase()}${contexto.slice(1)}`
}

const CTA = 'Começar o Desafio por {{preco}}'
const CONDICOES = 'Pagamento único · 30 dias de acesso · 7 dias de garantia'

export const PAGINA_DESAFIO_9A17 = {
  seoTitle: 'Desafio do Primeiro Jogo para 9 a 17 anos | Sistema Zero',
  description:
    'Seu filho faz o primeiro jogo dele e chama você para jogar. Ele monta A Chave do Farol com blocos de encaixar, em 3 etapas, com 30 dias para fazer no ritmo dele. Pagamento único.',
  capa: 'desafio-primeiro-jogo/farol-capa.webp',
  cta: CTA,
  condicoes: CONDICOES,

  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      src: 'comunidade-dos-criadores/logo-kids-claro.svg',
      width: 287,
      height: 22,
      alt: 'Sistema Zero Kids',
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      { href: '#farol', label: 'O que ele faz' },
      { href: '#responsavel', label: 'Para o responsável' },
    ],
    cta: 'Começar o Desafio',
  },

  hero: {
    selo: 'Desafio do Primeiro Jogo · 9 a 17 anos',
    titulo: 'Seu filho faz o primeiro jogo dele e ',
    destaque: 'chama você para jogar.',
    texto:
      'Ele monta A Chave do Farol com blocos de encaixar: o personagem anda, pega a chave e acende o farol. São 3 etapas, com 30 dias para fazer no ritmo dele.',
    beneficios: [
      'Aula em vídeo com o Estúdio do lado',
      'Ele escolhe o personagem e o cenário',
      'Certificado com o nome dele no fim',
    ],
    linkSecundario: 'Ver o que ele vai fazer',
    imagem: {
      src: 'desafio-primeiro-jogo/farol-jogo.png',
      width: 1280,
      height: 960,
      alt: 'A Chave do Farol: o personagem na trilha, a chave dourada e o farol listrado na ilha',
    } satisfies ImagemDesafio,
    legenda: 'A Chave do Farol, o primeiro jogo dele',
    faixa: '30 dias',
  },

  jeitos: {
    titulo: 'Ele sabe todas as fases do jogo que outra pessoa fez.',
    texto:
      'No jogo pronto, alguém já decidiu tudo. Ele só segue. E você pensa: queria que ele fizesse alguma coisa com isso.',
    so: {
      titulo: 'Só jogar',
      texto: 'Alguém já decidiu tudo por ele.',
      alt: 'Uma tela cinza e emburrada mostrando um botão de play, e um menino largado olhando',
    },
    fazer: {
      titulo: 'Fazer o jogo',
      texto: 'Ele decide e o jogo responde.',
      alt: 'Uma tela azul sorridente e um menino animado com uma lâmpada acesa sobre a cabeça',
    },
    frase: 'A tela é a mesma. Muda o que ele faz com ela.',
  },

  farol: {
    tag: 'O que ele vai fazer',
    titulo: 'O primeiro jogo dele, em 3 etapas',
    etapas: [
      {
        rotulo: 'Etapa 1',
        titulo: 'O personagem anda',
        texto: 'Ele faz o personagem andar com as setas do teclado.',
      },
      {
        rotulo: 'Etapa 2',
        titulo: 'A chave muda a aventura',
        texto: 'Sem a chave, a porta fica fechada. Com a chave, ela abre.',
      },
      {
        rotulo: 'Etapa 3',
        titulo: 'O farol acende',
        texto: 'Com a chave, ele acende o farol e o barco chega.',
      },
      {
        rotulo: 'No fim',
        titulo: 'Certificado',
        texto: 'Com o nome dele, quando o jogo fica pronto.',
      },
    ],
    blocos: {
      imagem: {
        src: 'desafio-primeiro-jogo/farol-blocos.png',
        width: 1364,
        height: 1360,
        alt: 'Os blocos da regra do farol: quando o personagem encosta no farol, se tem a chave, o farol acende; se não tem, aparece o aviso de que falta a chave',
      } satisfies ImagemDesafio,
      titulo: 'São blocos de encaixar, com as palavras escritas',
      paragrafos: [
        'Ele não digita código. Encaixa blocos como "Se tem a chave, acender o farol".',
        'E o jogo fica com a cara dele: ele escolhe o personagem, o cenário e onde a chave fica escondida.',
      ],
    },
  },

  aula: {
    tag: 'Como é uma aula',
    titulo: 'Ele joga, monta, confere e mostra',
    passos: [
      {
        titulo: '1. Joga a versão pronta',
        texto: 'Assim ele sabe aonde vai chegar.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-joga.webp',
          width: 1260,
          height: 760,
          alt: 'A versão pronta do jogo aberta na aula',
        },
      },
      {
        titulo: '2. Vê o vídeo e monta',
        texto: 'O vídeo fica do lado dos blocos. Ele pausa e monta.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-video.webp',
          width: 1600,
          height: 625,
          alt: 'O vídeo da aula à esquerda e o Estúdio de blocos à direita',
        },
      },
      {
        titulo: '3. Confere com um botão',
        texto: 'O botão mostra o que já está certo e o que falta.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-verificar.webp',
          width: 740,
          height: 340,
          alt: 'O botão Verificar esta parte, com o que já está cumprido e o que falta',
        },
      },
      {
        titulo: '4. Publica e manda o link',
        texto: 'O jogo vai para o Mural. Os amigos jogam no celular.',
        imagem: {
          src: 'comunidade-dos-criadores/passo-mural.webp',
          width: 1600,
          height: 786,
          alt: 'O Mural dos Criadores com os jogos publicados',
        },
      },
    ] satisfies { titulo: string; texto: string; imagem: ImagemDesafio }[],
    nota: 'As telas são de outro curso da plataforma, o Cadê Todo Mundo. O jeito da aula é o mesmo.',
  },

  treina: {
    tag: 'O que ele treina',
    titulo: 'Fazendo o jogo, ele treina o que vai usar a vida toda',
    habilidades: [
      { titulo: 'Planejar', texto: 'Primeiro pegar a chave. Depois abrir a porta.' },
      {
        titulo: 'Pensar com lógica',
        texto: 'Se tem a chave, a porta abre. Se não tem, fica fechada.',
      },
      {
        titulo: 'Tentar de novo',
        texto: 'Quando a porta não abre, ele procura o erro e testa outra vez.',
      },
      { titulo: 'Foco', texto: 'Ele fica até o farol acender, porque o jogo é dele.' },
    ],
    faixa: {
      titulo: 'Ninguém precisa virar programador',
      itens: [
        { titulo: 'Natação', texto: 'Para nadar com segurança. Ninguém espera um atleta.' },
        { titulo: 'Música', texto: 'Para ritmo e memória. Ninguém espera um músico.' },
        {
          titulo: 'Fazer jogos',
          texto: 'Para pensar e não desistir. Ninguém espera um programador.',
        },
      ],
    },
  },

  responsavel: {
    tag: 'Para o responsável',
    titulo: 'Ele faz sozinho. Você acompanha de longe.',
    itens: [
      'Na Área dos pais, você vê o que ele fez na semana.',
      'Se ele travar, tem ajuda por mensagens e o Caderno do Aluno.',
      'Sem horário marcado. Ele faz no ritmo dele, dentro dos 30 dias.',
      'Precisa de computador com mouse e teclado. No celular não dá para montar.',
    ],
    painel: {
      src: 'comunidade-dos-criadores/tela-pais-painel.webp',
      width: 1152,
      height: 640,
      alt: 'Área dos pais com as atividades da semana de um filho',
    } satisfies ImagemDesafio,
    caderno: {
      src: 'desafio-primeiro-jogo/farol-caderno.png',
      width: 1588,
      height: 2246,
      alt: 'Uma página do Caderno do Aluno da Chave do Farol, com os testes do jogo inteiro',
    } satisfies ImagemDesafio,
  },

  fundadores: {
    titulo: 'Tudo começou aqui em casa',
    imagem: {
      src: 'comunidade-dos-criadores/fundadores-casa.webp',
      width: 1280,
      height: 832,
      alt: 'Helena e Júlio, fundadores, em casa diante do notebook',
    } satisfies ImagemDesafio,
    paragrafo:
      'Somos Helena e Júlio, pais do André. Ele passava horas jogando. Em vez de proibir, a gente ensinou ele a fazer os próprios jogos.',
    andre: { id: 'AV04', complemento: 'nosso filho' } satisfies RelatoDesafio,
    rafael: { id: 'AV02' } satisfies RelatoDesafio,
  },

  oferta: {
    titulo: 'Comece o primeiro jogo dele hoje',
    selo: 'Desafio do Primeiro Jogo',
    sufixo: 'pagamento único',
    porDia: 'Menos de {{preco_dia}} por dia de acesso.',
    inclui: [
      'As 3 etapas da Chave do Farol e o certificado',
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
      'Na Área dos pais, você clica em Adicionar criança.',
      'Ele começa a primeira aula. Os 30 dias contam da aprovação do pagamento.',
    ],
    jaTem: 'Para quem já tem acesso ao Desafio ou à Comunidade:',
    jaTemLink: 'entrar na conta e continuar.',
  },

  continuidade: {
    tag: 'Depois do Desafio',
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
      'Quem quiser continuar, segue na Comunidade dos Criadores, com jogos cada vez maiores. A escolha fica para depois do primeiro jogo.',
    link: 'Conhecer a Comunidade dos Criadores',
  },

  faqTitulo: 'Dúvidas',
  faq: [
    {
      pergunta: 'Ele precisa saber programar?',
      resposta: 'Não. Ele encaixa blocos com as palavras escritas. A aula mostra cada passo.',
    },
    {
      pergunta: 'Ele consegue fazer sozinho?',
      resposta:
        'Quem já lê sozinho consegue. O vídeo fica do lado dos blocos, e o botão Verificar esta parte mostra o que falta.',
    },
    {
      pergunta: 'Meu filho tem 15 anos. Vai achar infantil?',
      resposta:
        'A aula tem o Zappy e um jeito de aventura. Mas o que ele faz é um jogo de verdade, com regras e publicação. Os 7 dias de garantia servem para ele testar.',
    },
    {
      pergunta: 'E se ele travar?',
      resposta:
        'Ele manda uma mensagem pela ajuda da plataforma. Também tem o Caderno do Aluno, com o passo a passo de cada parte.',
    },
    {
      pergunta: 'Funciona no celular ou no tablet?',
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
        'As aulas fecham. O jogo publicado continua com o link funcionando, e ele segue podendo ver e jogar o Mural. O que ele fez fica guardado na conta.',
    },
  ],

  fim: {
    titulo: 'A próxima partida em casa pode ser no jogo que ele fez.',
    texto: '{{preco}}, pagamento único. 30 dias de acesso. 7 dias de garantia.',
    cta: 'Começar o Desafio',
  },

  rodape: {
    aviso: 'Comunicação dirigida aos responsáveis',
    links: [
      { href: '/kids/desafio-primeiro-jogo/termos', label: 'Termos do Desafio' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },

  barra: { sufixo: 'pagamento único', cta: 'Começar o Desafio' },
} as const

/** Os relatos citados nesta página (o teste confere que todos existem em `RELATOS`). */
export const RELATOS_DESAFIO_9A17: readonly RelatoId[] = ['AV02', 'AV04']
