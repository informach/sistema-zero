// Página pública do minicurso gratuito para pais "Transformando o vilão em aliado"
// (`/kids/vilao-em-aliado`, 18/11/2026). O texto sai dos roteiros do curso
// (docs/aulas-interativas/pais/transformando-o-vilao-em-aliado). O presente do fim do curso é
// surpresa: nada aqui diz o que ele é. O cadastro reaproveita o fluxo do presente: a página lê a
// campanha `CODIGO_DA_CAMPANHA` no referrals e mostra o formulário `BolsaResgate` na variante `pais`.
import type { EstadoPresente, ImagemPresente } from './presente'

/** O curso que a campanha precisa entregar para a página abrir o cadastro. */
export const CURSO_PAIS_VILAO_SLUG = 'transformando-o-vilao-em-aliado'
/** Código da campanha Kids (criada no Admin) com a oferta sem prazo do curso. */
export const CODIGO_DA_CAMPANHA = 'vilao-em-aliado'
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
  seoTitle: 'Transformando o vilão em aliado: minicurso gratuito para pais | Sistema Zero',
  description:
    'Minicurso gratuito para pais, em 7 aulas gravadas. Veja como usar o tempo de tela que o seu filho já tem para desenvolver foco, planejamento e autonomia.',
  ogImage: `${IMAGENS}/compartilhar.jpg`,
  topo: {
    links: [
      { href: '#para-quem', label: 'Para quem é' },
      { href: '#aulas', label: 'As aulas' },
      { href: '#quem-conduz', label: 'Quem conduz' },
      { href: '#duvidas', label: 'Dúvidas' },
    ],
    cta: 'Quero o meu curso',
  },
  barra: { titulo: 'Minicurso gratuito', texto: 'Sem cartão', cta: 'Quero o meu curso' },
  hero: {
    selo: 'Minicurso gratuito para pais',
    titulo: { antes: 'Transforme o maior vilão da sua casa ', destaque: 'em aliado.' },
    texto:
      'Tirar a tela da vida do seu filho, ninguém consegue. Em 7 aulas, a Helena mostra como usar o tempo de tela que ele já tem para desenvolver foco, planejamento e autonomia.',
    beneficios: [
      '7 aulas gravadas, para assistir quando puder',
      'Gratuito, sem cartão e sem assinatura',
      'Apostila, certificado e um presente no final',
    ],
    cta: 'Quero o meu curso',
    link: 'Ver o que você vai aprender',
    requisitos: 'Para pais e responsáveis de crianças e adolescentes de 5 a 17 anos.',
    figura: {
      rotulo: 'Transformando o vilão em aliado',
      imagem: ilustracao,
      destaque: 'A mesma tela, outro uso. ',
      legenda: 'O tempo é o mesmo. O papel da tela é que muda.',
    },
  },
  porQue: {
    etiqueta: 'O ponto de partida',
    titulo: 'A pergunta deixa de ser como tirar a tela.',
    paragrafos: [
      'As crianças já nasceram no mundo digital, e até a escola usa tela. Brigar para desligar todos os dias cansa a família e muda pouco.',
      'O curso parte de outra pergunta: o que eu posso oferecer dentro dessa tela para desenvolver o meu filho?',
      'A proposta usa o tempo de tela que ele já tem. Se são trinta minutos por dia, a ideia é tornar esses trinta minutos produtivos.',
    ],
    comparacao: [
      {
        titulo: 'A tela que só entretém',
        itens: [
          'Tudo chega pronto',
          'A criança fica no automático',
          'Briga na hora de desligar',
          'Cada vez menos paciência para tentar de novo',
        ],
      },
      {
        titulo: 'A tela que faz pensar',
        itens: [
          'Raciocínio lógico',
          'Resolução de problemas',
          'Foco e planejamento',
          'Aprender a lidar com o erro',
        ],
      },
    ],
  },
  paraQuem: {
    etiqueta: 'Para quem é',
    titulo: 'Você reconhece o seu filho em alguma destas situações?',
    texto:
      'Cada jeito de ser pode virar uma porta de entrada. No curso, você vê como usar cada uma a favor do seu filho.',
    cartoes: [
      {
        titulo: 'Ele sabe tudo sobre um assunto',
        texto: 'Dinossauros, espaço: o tema preferido vira o ponto de partida.',
      },
      {
        titulo: 'Ele precisa saber o que vai acontecer',
        texto: 'Existe um jeito de usar a tela em que a mesma regra dá sempre o mesmo resultado.',
      },
      {
        titulo: 'Ele se frustra quando perde',
        texto: 'Quando a ideia é dele, a criança fica mais disposta a errar e a tentar de novo.',
      },
      {
        titulo: 'Ele gosta de organizar tudo em sequência',
        texto: 'Seguir uma ordem para chegar a um objetivo é uma habilidade que dá para treinar.',
      },
      {
        titulo: 'Ele não larga a tela',
        texto: 'É o caso da maioria. O tempo continua o mesmo, e o uso passa a ser outro.',
      },
      {
        titulo: 'Ele mostra mais do que fala',
        texto: 'Há formas de a criança colocar as ideias e o que sente de um jeito concreto.',
      },
    ],
  },
  aulas: {
    etiqueta: 'O que você vai ver',
    titulo: 'Sete aulas, do problema à prática.',
    texto:
      'As aulas são gravadas e divididas em partes curtas. Você assiste quando puder e volta a qualquer uma delas.',
    itens: [
      {
        titulo: 'O vilão que não dá para tirar',
        texto: 'Por que proibir resolve pouco e qual pergunta muda a conversa em casa.',
      },
      {
        titulo: 'Assistir, jogar ou criar',
        texto: 'Os três usos da tela, o que é função executiva e qual uso desenvolve mais.',
      },
      {
        titulo: 'De onde veio essa ideia e por onde começar',
        texto: 'A história da nossa família e seis portas de entrada para o seu filho.',
      },
      {
        titulo: 'Programar deixou de ser um bicho de sete cabeças',
        texto: 'Com blocos coloridos, programar é seguir um passo a passo até um objetivo.',
      },
      {
        titulo: 'Será que meu filho consegue?',
        texto: 'Foco, dificuldade, o apoio que diminui aos poucos e o que isso leva para a escola.',
      },
      {
        titulo: 'Como nasce um jogo',
        texto: 'O ciclo de criação, uma regra sendo construída e a conversa que isso abre em casa.',
      },
      {
        titulo: 'Um presente para vocês experimentarem',
        texto: 'O ambiente seguro em que a criança cria e uma surpresa para a família.',
      },
    ],
  },
  quemConduz: {
    etiqueta: 'Quem conduz',
    titulo: 'A Helena, mãe e profissional de tecnologia.',
    paragrafos: [
      'Eu sou da área de tecnologia, assim como o meu marido, o Júlio. O nosso filho mais velho, o André, sempre gostou muito de jogar.',
      'A tela era, muitas vezes, o jeito de ele ficar calmo, e desligar era motivo de briga. Em vez de continuar brigando, decidimos unir as duas coisas: o gosto dele pelas telas e o nosso trabalho.',
      'O André deixou de só consumir e passou a criar os próprios jogos. Tempos depois, ensinou uma turma de faculdade a fazer o mesmo. O que vimos mudar dentro de casa virou este curso.',
    ],
    foto: {
      src: '/img/comunidade-dos-criadores/helena-julio-perfil.webp',
      width: 360,
      height: 360,
      alt: 'Helena e Júlio',
    } satisfies ImagemPresente,
    citacao: {
      texto: 'Eu já jogava um monte. Agora eu faço os meus jogos, e esse foi o primeiro.',
      autor: 'André',
    },
  },
  depoimentos: {
    etiqueta: 'Quem já viveu isso',
    titulo: 'O que os pais contam',
  },
  comoFunciona: {
    etiqueta: 'Como funciona',
    titulo: 'Você se cadastra hoje e assiste no seu ritmo.',
    passos: [
      {
        titulo: 'Faça o cadastro',
        texto: 'Preencha os seus dados no fim desta página. É gratuito e não pede cartão.',
      },
      {
        titulo: 'Entre na área dos pais',
        texto: 'Você recebe um e-mail para criar a senha. O curso fica em Cursos para pais.',
      },
      {
        titulo: 'Assista quando puder',
        texto: 'Uma apostila acompanha as aulas, para você consultar sempre que quiser.',
      },
      {
        titulo: 'Certificado e presente',
        texto:
          'Ao concluir, você emite o certificado. Na última aula, um presente espera por você e pelo seu filho.',
      },
    ],
  },
  duvidas: {
    titulo: 'Dúvidas frequentes',
    itens: [
      {
        pergunta: 'O curso é pago?',
        resposta: 'O curso é gratuito. O cadastro não pede cartão e nenhuma assinatura começa.',
      },
      {
        pergunta: 'Para quem é o curso?',
        resposta:
          'Para pais e responsáveis de crianças e adolescentes de 5 a 17 anos. Quem assiste às aulas é o adulto.',
      },
      {
        pergunta: 'Meu filho precisa participar das aulas?',
        resposta:
          'As aulas são para você. No final do curso, há uma experiência para vocês fazerem juntos.',
      },
      {
        pergunta: 'Quanto tempo leva?',
        resposta:
          'São 7 aulas gravadas, divididas em partes curtas. Você assiste quando puder, no computador ou no celular.',
      },
      {
        pergunta: 'Preciso entender de tecnologia?',
        resposta:
          'O curso explica tudo com exemplos do dia a dia, como a rotina da manhã e um brinquedo de montar.',
      },
      {
        pergunta: 'O que é o presente do final?',
        resposta:
          'É uma surpresa para você e o seu filho colocarem em prática o que o curso mostra. Você descobre na última aula.',
      },
    ],
  },
  resgatar: {
    etiqueta: 'Seu cadastro',
    titulo: 'Comece o curso agora',
    texto:
      'Cadastre a conta com os seus dados. Depois, entre na área dos pais e abra o curso em Cursos para pais.',
  },
  estados: {
    emBreve: {
      etiqueta: 'Em breve',
      titulo: 'As inscrições abrem em breve',
      texto: 'Estamos finalizando o curso. Guarde esta página e volte em alguns dias.',
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
