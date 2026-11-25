// Copy aprovada do guia para pais "Transformando o vilão em aliado" (`/kids/vilao-em-aliado`;
// proposta do Canvas aprovada em 21/11/2026). A página é curta e desperta curiosidade: não resume
// aula nem conta o que o guia ensina (as respostas, as cenas da casa e a história do André ficam
// nas aulas), e as dúvidas falam só de como fazer o guia. O presente do fim é surpresa: nada aqui
// diz o que ele é. Desde 25/11/2026 o guia é pago (funil `kids/vilao-em-aliado`): este texto, o do
// guia gratuito, é o do modo presente; a venda troca o que falava de "gratuito"
// (`funnels/vilao-em-aliado/oferta.ts`).
import type { EstadoPresente, ImagemPresente } from './presente'

/** O curso do guia no Members. */
export const CURSO_PAIS_VILAO_SLUG = 'transformando-o-vilao-em-aliado'
export const CURSO_PAIS_VILAO_PATH = '/kids/vilao-em-aliado'

const IMAGENS = '/img/transformando-o-vilao-em-aliado'

export interface DepoimentoDePais {
  texto: string
  /** Nome e vínculo de quem fala, com autorização da família para a página pública. */
  autor: string
}

/**
 * Depoimentos com nome. A seção só aparece quando houver ao menos um: a dona informa os nomes e
 * confirma a autorização de cada família antes de qualquer fala entrar aqui.
 */
export const DEPOIMENTOS_DE_PAIS: DepoimentoDePais[] = []

const ilustracao: ImagemPresente = {
  src: `${IMAGENS}/vilao-em-aliado.webp`,
  width: 1049,
  height: 711,
  alt: 'Uma menina emburrada mexe num tablet. A sombra dela, na parede, comemora e aponta para blocos de programar e um jogo de plataforma.',
}

export const CURSO_PAIS_VILAO = {
  seoTitle: 'Transformando o vilão em aliado: guia gratuito para pais | Sistema Zero',
  description:
    'Guia gratuito para pais, em 7 aulas curtas em vídeo. A Helena, mãe e profissional de tecnologia, mostra como a tela que hoje vira briga em casa pode ser sua aliada no desenvolvimento do seu filho.',
  ogImage: `${IMAGENS}/compartilhar.jpg`,
  topo: {
    links: [
      { href: '#o-que-muda', label: 'O que muda' },
      { href: '#quem-conduz', label: 'Quem conduz' },
      { href: '#duvidas', label: 'Dúvidas' },
    ],
    cta: 'Quero assistir de graça',
  },
  barra: { titulo: 'Guia gratuito', texto: 'Sem cartão', cta: 'Quero assistir de graça' },
  hero: {
    selo: 'Guia gratuito para pais',
    titulo: {
      antes: 'A tela que hoje vira briga em casa pode ser ',
      destaque: 'sua aliada',
      depois: ' no desenvolvimento do seu filho.',
    },
    texto: {
      antes: 'No guia ',
      nome: 'Transformando o vilão em aliado',
      depois:
        ', a Helena, mãe e profissional de tecnologia, mostra como usar o tempo de tela que o seu filho já tem para ele aprender a planejar, seguir um passo a passo e lidar com o erro.',
    },
    beneficios: [
      '7 aulas curtas em vídeo, para assistir quando der',
      'Gratuito, sem cartão e sem assinatura',
      'Apostila para consultar e certificado no final',
    ],
    requisitos:
      'Para pais e responsáveis de filhos de 5 a 17 anos. Quem assiste às aulas é o adulto.',
    surpresa: 'Uma surpresa na última aula',
  },
  oQueMuda: {
    titulo: 'O que muda na sua casa quando você coloca o guia em prática.',
    texto:
      'A mudança vem aos poucos, conforme a família leva para o dia a dia o que viu nas aulas.',
    figura: { rotulo: 'Transformando o vilão em aliado', imagem: ilustracao },
    itens: [
      {
        icone: 'conversa',
        titulo: 'Desligar deixa de ser o único assunto',
        texto:
          'Com o tempo, o que ele faz na tela vira conversa em casa, e essa conversa abre espaço para outras.',
      },
      {
        icone: 'recomecar',
        titulo: 'O erro pesa menos',
        texto: 'Quando algo dá errado, ele vai aprendendo a mudar o plano e tentar de novo.',
      },
      {
        icone: 'estrela',
        titulo: 'Ele percebe que é capaz',
        texto:
          'Ele começa a ver que as escolhas dele fazem diferença e sente orgulho do que construiu.',
      },
    ],
  },
  quemConduz: {
    etiqueta: 'Quem conduz',
    titulo: 'Eu sou a Helena, e essa briga também acontecia aqui em casa.',
    texto:
      'Eu e o meu marido, o Júlio, somos da área de tecnologia, e mesmo assim era difícil tirar a tela do nosso filho mais velho, o André, na hora que eu queria. Até que a gente resolveu fazer outra coisa com essa tela. O que aconteceu depois com ele, eu conto no guia.',
    foto: {
      src: '/img/comunidade-dos-criadores/helena-julio-perfil.webp',
      width: 360,
      height: 360,
      alt: 'Helena e Júlio',
    } satisfies ImagemPresente,
  },
  depoimentos: {
    etiqueta: 'Quem já viveu isso',
    titulo: 'O que os pais contam',
  },
  duvidas: {
    titulo: 'Dúvidas frequentes',
    itens: [
      {
        pergunta: 'Para quem é o guia?',
        resposta:
          'Para mães, pais e responsáveis de crianças e adolescentes de 5 a 17 anos. Quem assiste às aulas é o adulto, e nenhuma delas pede conhecimento de tecnologia.',
      },
      {
        pergunta: 'Tem que pagar alguma coisa?',
        resposta: 'O guia é gratuito. O cadastro não pede cartão e nenhuma assinatura começa.',
      },
      {
        pergunta: 'Onde eu assisto?',
        resposta:
          'Na área dos pais da sua conta do Sistema Zero Kids, no menu Cursos para pais. Se a conta é nova, você recebe um e-mail para criar a senha. Dá para assistir no computador ou no celular.',
      },
      {
        pergunta: 'Quanto tempo leva?',
        resposta:
          'As 7 aulas somam pouco mais de uma hora de vídeo, em 23 partes de até 6 minutos. Você assiste no seu ritmo e pode voltar a qualquer parte.',
      },
      {
        pergunta: 'Já tenho conta no Sistema Zero Kids. Preciso de outra?',
        resposta:
          'Use no cadastro o mesmo e-mail da sua conta, e o guia aparece na área dos pais que você já usa.',
      },
      {
        pergunta: 'Por quanto tempo fico com o guia?',
        resposta:
          'O guia fica na sua conta sem prazo. Você pode rever as aulas e consultar a apostila sempre que quiser.',
      },
    ],
  },
  fim: {
    titulo: 'Comece pela primeira aula ainda hoje.',
    cta: 'Quero assistir de graça',
    nota: 'Gratuito, sem cartão e sem assinatura.',
  },
  estados: {
    emBreve: {
      etiqueta: 'Em breve',
      titulo: 'As inscrições abrem em breve',
      texto: 'Estamos finalizando o guia. Guarde esta página e volte em alguns dias.',
    },
    fechado: {
      etiqueta: 'Inscrições fechadas',
      titulo: 'As inscrições estão fechadas no momento',
      texto: 'Quem começou o cadastro antes pode continuar com o mesmo e-mail.',
    },
    retomar: {
      botao: 'Já comecei o meu cadastro',
      texto: 'Use o mesmo e-mail para continuar de onde parou.',
    },
    contato: 'Falar com a nossa equipe',
  } satisfies {
    emBreve: EstadoPresente
    fechado: EstadoPresente
    retomar: { botao: string; texto: string }
    contato: string
  },
} as const
