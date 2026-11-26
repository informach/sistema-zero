// Copy do curso para pais "Como ajudar seu filho autista a lidar com frustrações e evitar crises"
// (`/kids/como-ajudar-seu-filho-autista-nas-frustracoes`, 25/11/2026), com a psicóloga Vivianne
// Lima, da Laopa. Escrita a partir do material do curso
// (`docs/aulas-interativas/pais/como-ajudar-seu-filho-autista-nas-frustracoes/`): a ideia central
// (a crise como comunicação), a situação que abre e fecha o curso (a hora de parar de brincar) e o
// caminho antes, durante e depois. Proposta de 26/11/2026: a mesma estrutura das outras páginas de
// venda (`CursoPaisOferta`: topo sem cartão de compra, a cena da casa, o que muda, como funciona,
// quem conduz com a foto da Vivianne, dúvidas, a oferta e o fechamento). Este é o texto do MODO PRESENTE; a venda troca o que fala de presente
// (`funnels/autismo-frustracoes/oferta.ts`). O curso não tem presente no fim nem oferta nas aulas,
// e não substitui o acompanhamento da criança: a copy nunca promete acabar com as crises.
import type { GuiaPaisCopy } from '../funnels/vilao-em-aliado/oferta'
import type { DepoimentoDePais } from './curso-pais-vilao'
import type { ImagemPresente } from './presente'

/** O curso no Members. */
export const CURSO_PAIS_AUTISMO_SLUG = 'como-ajudar-seu-filho-autista-nas-frustracoes'
export const CURSO_PAIS_AUTISMO_TITULO =
  'Como ajudar seu filho autista a lidar com frustrações e evitar crises'

const IMAGENS = '/img/como-ajudar-seu-filho-autista'

/**
 * Depoimentos com nome. A seção só aparece quando houver ao menos um, com o nome e a autorização
 * da família para a página pública.
 */
export const DEPOIMENTOS_CURSO_AUTISMO: DepoimentoDePais[] = []

const ilustracao: ImagemPresente = {
  src: `${IMAGENS}/oferta-antecipar.webp`,
  width: 1536,
  height: 1024,
  alt: 'Mãe mostra ao filho uma rotina visual com cartões de brincadeira, refeição e hora de dormir.',
}

const capa: ImagemPresente = {
  src: `${IMAGENS}/capa-do-curso.webp`,
  width: 1200,
  height: 675,
  alt: 'A psicóloga Vivianne conversa com uma mãe sentada no tapete, ao lado do filho, que está de braços cruzados num pufe, triste.',
}

const apostila: ImagemPresente = {
  src: `${IMAGENS}/apostila.webp`,
  width: 720,
  height: 1019,
  alt: 'Capa da apostila do curso Como ajudar seu filho autista a lidar com frustrações e evitar crises.',
}

export const CURSO_PAIS_AUTISMO_PRESENTE: GuiaPaisCopy = {
  seoTitle: `${CURSO_PAIS_AUTISMO_TITULO}: curso para pais de presente | Sistema Zero`,
  description:
    'Curso para pais, em 5 aulas curtas em vídeo. A psicóloga Vivianne Lima mostra o que fazer antes, durante e depois de uma crise, com exemplos do dia a dia da sua casa.',
  ogImage: `${IMAGENS}/compartilhar.jpg`,
  topo: {
    links: [
      { href: '#o-que-muda', label: 'O que muda' },
      { href: '#como-funciona', label: 'Como funciona' },
      { href: '#quem-conduz', label: 'Quem conduz' },
      { href: '#duvidas', label: 'Dúvidas' },
    ],
    cta: 'Quero assistir de graça',
  },
  barra: { titulo: 'Curso de presente', texto: 'Sem cartão', cta: 'Quero assistir de graça' },
  hero: {
    selo: 'Curso para pais',
    titulo: {
      antes: 'Na hora da crise, o seu filho está ',
      destaque: 'pedindo ajuda',
      depois: ' do jeito que consegue.',
    },
    texto: {
      antes: 'No curso ',
      nome: CURSO_PAIS_AUTISMO_TITULO,
      depois:
        ', a psicóloga Vivianne Lima, da Laopa, mostra o que você pode fazer antes, durante e depois de uma crise, com exemplos do dia a dia da sua casa.',
    },
    beneficios: [
      '5 aulas curtas em vídeo, para assistir no seu tempo',
      'De presente, sem cartão e sem assinatura',
      'Apostila para consultar e certificado no final',
    ],
    requisitos:
      'Para mães, pais e responsáveis de crianças autistas. Quem assiste às aulas é o adulto.',
    cta: 'Quero assistir de graça',
    link: 'Ver o que muda em casa',
    figura: { rotulo: 'Antes, durante e depois da crise', imagem: capa },
    // O curso não tem presente no fim: sem o selo da surpresa.
    surpresa: '',
  },
  cena: {
    etiqueta: 'Na sua casa',
    titulo: 'A brincadeira precisa acabar, e o dia desanda.',
    paragrafos: [
      'Chega a hora do jantar, você avisa que a brincadeira acabou e, em poucos segundos, vem o choro, o grito ou o corpo no chão. Você tenta conversar, tenta ser firme, e nada parece alcançar o seu filho naquele momento.',
      'Depois que passa, fica a dúvida sobre o que fazer da próxima vez. O curso olha para essa cena de outro jeito, com uma pergunta que ajuda você a entender o que pesou para ele ali.',
    ],
  },
  oQueMuda: {
    titulo: 'O que muda na sua casa quando você coloca o curso em prática.',
    texto:
      'A mudança vem aos poucos, e cada criança tem o seu jeito. A equipe que acompanha o seu filho pode ajudar você a adaptar o que viu nas aulas.',
    figuras: [{ rotulo: 'Preparar a próxima transição', imagem: ilustracao }],
    itens: [
      {
        icone: 'conversa',
        titulo: 'Você entende o que ficou difícil',
        texto:
          'Em vez de chamar de birra, você começa a perceber o que a crise está mostrando e o que pesou para o seu filho naquela hora.',
      },
      {
        icone: 'recomecar',
        titulo: 'A mudança chega com aviso',
        texto:
          'Com a rotina preparada antes, a hora de parar a brincadeira deixa de pegar o seu filho de surpresa.',
      },
      {
        icone: 'estrela',
        titulo: 'Depois da crise, vocês aprendem juntos',
        texto:
          'Passado o momento difícil, você acolhe o que ele sentiu e ajuda o seu filho a pedir ajuda de outro jeito na próxima vez.',
      },
    ],
  },
  formato: {
    etiqueta: 'Como funciona',
    titulo: 'Cinco aulas curtas, para ver no seu ritmo.',
    itens: [
      {
        titulo: '5 aulas em vídeo',
        texto:
          'São 12 partes em vídeo, do que acontece antes da crise ao que fazer depois. Você assiste no seu ritmo e volta a qualquer parte.',
      },
      {
        titulo: 'Apostila para consultar',
        texto:
          'Os pontos principais num material para ler com calma e levar para a conversa com a equipe que acompanha o seu filho.',
      },
      {
        titulo: 'Na área dos pais',
        texto:
          'O curso fica na sua conta do Sistema Zero Kids, no menu Cursos para pais, e termina com o certificado.',
      },
    ],
    imagem: apostila,
  },
  quemConduz: {
    etiqueta: 'Quem conduz',
    titulo: 'Quem conversa com você é a Vivi, a psicóloga Vivianne Lima, da Laopa.',
    texto:
      'No curso, a Vivi apresenta estratégias da ABA, a Análise do Comportamento Aplicada, que ajuda a entender a relação entre o que a criança faz e o que acontece ao redor dela. Ela parte de situações de casa, como a hora de parar uma brincadeira, e mostra como olhar para elas com mais calma.',
    foto: {
      src: `${IMAGENS}/vivianne-foto.webp`,
      width: 480,
      height: 480,
      alt: 'Vivianne Lima, psicóloga da Laopa',
    },
  },
  depoimentos: {
    etiqueta: 'Quem já viveu isso',
    titulo: 'O que os pais contam',
  },
  duvidas: {
    titulo: 'Dúvidas frequentes',
    itens: [
      {
        pergunta: 'Para quem é o curso?',
        resposta:
          'Para mães, pais e responsáveis de crianças autistas que querem entender melhor o filho nos momentos de frustração. Quem assiste às aulas é o adulto.',
      },
      {
        pergunta: 'Tem que pagar alguma coisa?',
        resposta:
          'Não. O curso é um presente: o cadastro não pede cartão e nenhuma assinatura começa.',
      },
      {
        pergunta: 'O curso substitui o acompanhamento do meu filho?',
        resposta:
          'Não. O curso ajuda você a observar e a preparar o dia a dia, e a equipe que acompanha o seu filho continua sendo quem adapta as estratégias para ele.',
      },
      {
        pergunta: 'Onde eu assisto?',
        resposta:
          'Na área dos pais da sua conta do Sistema Zero Kids, no menu Cursos para pais. Se a conta é nova, você recebe um e-mail para criar a senha. Dá para assistir no computador ou no celular.',
      },
      {
        pergunta: 'Já tenho conta no Sistema Zero Kids. Preciso de outra?',
        resposta:
          'Use no cadastro o mesmo e-mail da sua conta, e o curso aparece na área dos pais que você já usa.',
      },
      {
        pergunta: 'Por quanto tempo fico com o curso?',
        resposta:
          'Pelo prazo do seu acesso, que aparece no cadastro. Nesse tempo, você pode rever as aulas e consultar a apostila sempre que quiser.',
      },
    ],
  },
  compra: {
    etiqueta: 'Para começar',
    titulo: 'O curso completo na sua conta',
    texto:
      'Você assiste no seu ritmo, revê qualquer parte quando quiser e leva a apostila para a conversa com a equipe que acompanha o seu filho.',
  },
  fim: {
    titulo: 'Comece pela primeira aula ainda hoje.',
    cta: 'Quero assistir de graça',
    nota: 'De presente, sem cartão e sem assinatura.',
  },
  estados: {
    emBreve: {
      etiqueta: 'Em breve',
      titulo: 'As inscrições abrem em breve',
      texto: 'Estamos preparando o curso. Guarde esta página e volte em alguns dias.',
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
  },
}
