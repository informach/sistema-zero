import type { Imagem917, Relato917 } from './pagina-9a17'
import type { RelatoId } from './types'

// Página de continuidade da Comunidade Kids (`/oferta/continuar`): para a família que já começou na
// plataforma (Desafio, presente, oficina ao vivo ou assinatura que acabou). Proposta de 20/10/2026,
// desenho em docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/canvas/PaginaContinuarKids.html.
// Toda a copy visível mora aqui; o body (`ComunidadeContinuarBody.astro`) só monta. Preços são os
// marcadores da página de 9 a 17 ({{preco_mensal}}, {{preco_anual}}, {{equivalente_mensal_anual}},
// {{economia_anual}} e {{preco_dia}}), preenchidos com os planos ao vivo. Falas só de `relatos.ts`.

const CTA_PLANOS = 'Ver os planos para continuar'
const GARANTIA_CURTA = '7 dias de garantia. Cancele quando quiser, sem multa.'
const GARANTIA_PLANO = '7 dias de garantia'

/** Um passo do painel "O caminho dele", no herói. */
export interface PassoCaminho {
  title: string
  text: string
  imagem: Imagem917
}

/** Uma situação de quem chega à página, com o próximo passo e, quando há, a tela dela. */
export interface SituacaoContinuar {
  title: string
  text: string
  imagem?: Imagem917
}

/** Um posto da Jornada do Criador e o que ele libera (`initialKidsJourneyPolicy`, no core). */
export interface PostoJornada {
  nome: string
  libera: string
}

export const PAGINA_CONTINUAR = {
  seoTitle: 'Continue criando jogos na Comunidade dos Criadores | Sistema Zero',
  description:
    'Para quem já começou no Sistema Zero Kids: assinando com o mesmo e-mail da sua conta, ele continua no mesmo perfil, com o progresso, os projetos e os jogos publicados, e segue até o jogo que ele inventa.',
  cta: CTA_PLANOS,
  garantiaCurta: GARANTIA_CURTA,

  topo: {
    pular: 'Ir para o conteúdo',
    logo: { file: 'logo-kids-claro.svg', width: 287, height: 22, alt: 'Sistema Zero Kids' },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      { href: '#proximo', label: 'O próximo passo' },
      { href: '#fica', label: 'O que fica' },
    ],
    cta: { href: '#planos', label: 'Ver os planos' },
  },

  /** Para a criança que chega pelas telas de ferramenta fechada do app Kids. */
  aviso:
    'Se você é aluno ou aluna e chegou aqui pelo aviso de uma ferramenta fechada, chame o seu responsável para ver esta página junto com você.',

  hero: {
    eyebrow: 'Para quem já começou no Sistema Zero Kids',
    title:
      'O que seu filho começou está guardado. Agora ele faz os próximos jogos, cada vez maiores, até o ',
    destaque: 'jogo que ele inventar.',
    description:
      'Assinando com o mesmo e-mail da sua conta, ele continua no mesmo perfil, com o progresso, os projetos e os jogos publicados. Com a assinatura, ele volta a ter os outros cursos, as ferramentas que a Jornada vai liberando, o Mural para publicar, o Clube e as dúvidas respondidas pela equipe nos Recados. Cada curso concluído ensina peças novas para os jogos dele. Quando ele conclui e publica os cursos de um posto, sobe para o próximo posto da Jornada do Criador, que libera ferramentas novas. Você segue acompanhando pela sua área.',
    benefits: [
      'Continua no mesmo perfil, com tudo o que já fez',
      'Todos os cursos, o Mural, o Clube e as dúvidas respondidas pela equipe',
      'Estúdio livre e Pinta depois de concluir e publicar A Chave do Farol',
    ],
    requirements: 'Mesmo e-mail da conta · Computador com mouse e teclado · Até 2 perfis',
    caminho: {
      title: 'O caminho dele',
      passos: [
        {
          title: 'O que ele já fez',
          text: 'Perfil, progresso e projetos guardados na conta.',
          imagem: {
            file: 'jogo-farol.webp',
            width: 1280,
            height: 800,
            alt: 'A Chave do Farol: a ilha, a chave e o farol',
          },
        },
        {
          title: 'Os próximos cursos',
          text: 'Nave Contra Asteroides, O Jogo do Meu Jeito e o Corre, Dino. Depois, os lançados durante a assinatura.',
          imagem: {
            file: 'jogo-nave.webp',
            width: 1180,
            height: 690,
            alt: 'Nave Contra Asteroides: a nave, os asteroides e o placar',
          },
        },
        {
          title: 'Os jogos que ele inventa',
          text: 'Em Meus Jogos, com as peças dos cursos que ele terminou.',
          imagem: {
            file: 'tela-estudio-lista.webp',
            width: 1280,
            height: 800,
            alt: 'A tela Meus Jogos do Estúdio, com o botão Novo projeto e os projetos próprios de um perfil de teste',
          },
        },
      ] satisfies readonly PassoCaminho[],
    },
  },

  proximo: {
    eyebrow: 'Onde ele parou',
    title: 'O próximo passo depende de onde ele parou',
    paragraph:
      'Cada família chega aqui num ponto diferente. Encontre o seu e veja o que vem logo depois de assinar.',
    situacoes: [
      {
        title: 'Ainda no primeiro projeto',
        text: 'Ele abre o mesmo projeto no mesmo perfil, com as partes que já fez guardadas, e termina o jogo. Depois, segue para o próximo curso.',
        imagem: {
          file: 'passo-video.webp',
          width: 1600,
          height: 625,
          alt: 'Aula com o vídeo ao lado do Estúdio',
        },
      },
      {
        title: 'Terminou o Cadê Todo Mundo',
        text: 'O próximo é A Chave do Farol, o curso que abre a Jornada. Quando ele conclui e publica o jogo do farol, chega ao posto Construtor.',
        imagem: {
          file: 'jogo-cade.webp',
          width: 1264,
          height: 723,
          alt: 'Cadê Todo Mundo: o jardim com o contador de achados',
        },
      },
      {
        title: 'Concluiu A Chave do Farol e publicou',
        text: 'O posto Construtor abre o Estúdio livre e o Pinta. Com a assinatura, ele começa os jogos dele em Meus Jogos e segue para a Nave Contra Asteroides.',
        imagem: {
          file: 'tela-jornada-meus-postos.webp',
          width: 950,
          height: 387,
          alt: 'Jornada do Criador com os postos Faísca e Construtor',
        },
      },
      {
        title: 'Concluiu A Chave do Farol e ainda não publicou',
        text: 'Falta publicar no Mural: é a publicação, junto com o curso concluído, que leva ao posto Construtor. Com a assinatura, ele publica, e o Estúdio livre e o Pinta abrem.',
        imagem: {
          file: 'tela-mural.webp',
          width: 1280,
          height: 800,
          alt: 'Mural dos Criadores com cartões de jogos e botões para jogar, copiar o link e fazer uma versão.',
        },
      },
      {
        title: 'Fez uma oficina ao vivo',
        text: 'A criação da oficina continua guardada em Criar. Com a assinatura, ele segue pelos cursos gravados, um projeto de cada vez, e leva para os jogos dele o que aprender em cada um.',
      },
    ] satisfies readonly SituacaoContinuar[],
    telasNota: 'As telas são do perfil de teste da equipe.',
  },

  fica: {
    eyebrow: 'O que fica e o que a assinatura acrescenta',
    title: 'Nada do que ele fez fica para trás',
    paragraph:
      'Sem assinatura, o que ele já fez continua na conta. Com a assinatura, ele volta a aprender, a publicar e a abrir ferramentas novas.',
    semCusto: {
      title: 'Continua na conta, sem custo',
      itens: [
        'O perfil e o progresso nos cursos',
        'A lista dos projetos guardados, para baixar quando quiser',
        'Os certificados já emitidos',
        'O posto da Jornada que ele alcançou e os blocos que conquistou',
        'Os jogos publicados, que continuam no Mural para visita',
        'Depois do Desafio ou do presente, o Mural para ver e jogar',
      ],
    },
    comAssinatura: {
      title: 'Com a assinatura',
      itens: [
        'Todos os cursos, inclusive o do Desafio',
        'Publicar, comentar e reagir no Mural',
        'As ferramentas de cada posto: Estúdio livre, Pinta, Pensa, ajuda do Zappy e Molda',
        'O Clube dos Criadores, só de alunos',
        'Dúvidas respondidas pela equipe nos Recados',
        'Até 2 perfis, cada um com seus jogos e sua Jornada',
      ],
    },
    inicio: {
      strong: 'Quando a assinatura começa:',
      text: ' no dia em que o pagamento é aprovado. Se ainda restam dias no Desafio, eles não se somam ao período. Vocês escolhem a hora, e o perfil espera do jeito que está.',
    },
  },

  jornada: {
    eyebrow: 'A Jornada do Criador',
    title:
      'Depois de A Chave do Farol, cada posto libera ferramentas ou peças novas para os jogos dele',
    paragraph:
      'Para subir de posto, ele conclui e publica no Mural os cursos de cada posto. A ordem é de propósito: ele nunca fica diante de uma ferramenta que ainda não sabe usar. O tempo de cada posto depende do ritmo dele.',
    postoLabel: 'Posto',
    /** O posto que a família alcança ao concluir e publicar A Chave do Farol. */
    marco: { posto: 'Construtor', label: 'Depois do Farol' },
    postos: [
      { nome: 'Faísca', libera: 'O Estúdio dentro das aulas' },
      { nome: 'Construtor', libera: 'Estúdio livre e Pinta' },
      { nome: 'Inventor', libera: 'Pensa e ajuda do Zappy no Estúdio' },
      { nome: 'Explorador de Mundos', libera: 'Molda, para criar em 3D' },
      { nome: 'Mestre dos Jogos', libera: 'Mais cursos e peças novas' },
      { nome: 'Arquiteto de Mundos', libera: 'Mais recursos no Molda' },
      { nome: 'Gênio da Criação', libera: 'Ponte: blocos e código lado a lado' },
      { nome: 'Lenda', libera: 'Estúdio Pro, em código' },
    ] satisfies readonly PostoJornada[],
  },

  relatos: {
    eyebrow: 'Quem seguiu criando',
    title: 'Depois de terminar um jogo, eles quiseram inventar, mudar e mostrar',
    paragraph: 'Um aluno e dois pais contam o que veio depois do jogo terminado.',
    falas: [{ id: 'N18' }, { id: 'AV11' }, { id: 'N15' }] satisfies readonly Relato917[],
  },

  planos: {
    title: 'Escolham o plano, e ele continua no mesmo perfil',
    paragraph:
      'Os dois planos dão acesso a tudo, e a diferença está só na forma de pagar. No checkout, use o mesmo e-mail da sua conta: é esse e-mail que liga a assinatura ao perfil que já existe.',
    inclui: [
      'Todos os cursos publicados e os lançados durante a assinatura',
      'O curso do Desafio do Primeiro Jogo incluído',
      'Estúdio livre, Pinta, Pensa, a ajuda do Zappy e Molda, liberados posto a posto pela Jornada',
      'Mural e Clube dos Criadores, com moderação',
      'Dúvidas respondidas pela equipe nos Recados',
      'Até 2 perfis e a área do responsável',
    ],
    incluiLabel: 'O que os dois planos incluem',
    mensal: {
      title: 'Mensal',
      preco: '{{preco_mensal}}',
      sufixo: '/mês',
      text: 'Menos de {{preco_dia}} por dia. Renova todo mês no cartão, e você cancela quando quiser na sua área, sem multa.',
      cta: 'Assinar o mensal',
      nota: GARANTIA_PLANO,
    },
    anual: {
      selo: 'Economia de {{economia_anual}}',
      title: 'Anual',
      preco: '{{preco_anual}}',
      sufixo: '/ano',
      text: 'Sai por {{equivalente_mensal_anual}} por mês. No Pix à vista, não renova sozinho; no cartão, renova uma vez por ano.',
      cta: 'Assinar o anual',
      nota: GARANTIA_PLANO,
    },
    depoisTitle: 'Para continuar no mesmo perfil',
    depois: [
      'No checkout, use o mesmo e-mail da sua conta.',
      'A assinatura entra na mesma conta, no dia em que o pagamento é aprovado.',
      'Ele entra no perfil de sempre e segue do ponto em que parou. Se a autorização do computador venceu, você autoriza de novo na sua área.',
    ],
    garantia: {
      strong: 'Sete dias para ver como ele segue no próximo curso.',
      text: ' Se não for para vocês, devolvemos o valor inteiro.',
    },
  },

  faqTitle: 'Algumas dúvidas de quem já começou',
  faq: [
    {
      question: 'O que ele já fez continua lá?',
      answer:
        'Continua. O perfil, o progresso, o posto da Jornada, os projetos guardados, os certificados e os jogos publicados ficam na conta. Com a assinatura, ele segue no mesmo perfil, desde que você use o mesmo e-mail no checkout.',
    },
    {
      question: 'Ele já fez o Desafio. O que a assinatura acrescenta?',
      answer:
        'Os outros cursos, as ferramentas de cada posto da Jornada, publicar e comentar no Mural, o Clube e os Recados. O curso do Desafio também continua incluído enquanto a assinatura estiver ativa.',
    },
    {
      question: 'Ainda restam dias no Desafio. Assino agora ou espero?',
      answer:
        'Vocês escolhem. A assinatura começa quando o pagamento é aprovado, e os dias que restam não se somam. Se ele quer seguir para o próximo curso agora, vale assinar agora. Se não, o perfil espera do jeito que está.',
    },
    {
      question: 'O acesso dele acabou faz tempo. Ainda dá para continuar?',
      answer:
        'Dá. O que ele fez fica na conta, e a assinatura reabre a plataforma no mesmo perfil: os cursos, as ferramentas do posto dele, o Mural, o Clube e os Recados.',
    },
    {
      question: 'E se ele travar no próximo curso?',
      answer:
        'Cada parte pode ser conferida no botão Verificar esta parte antes de seguir. Se a dúvida continuar, o botão Preciso de ajuda manda a pergunta para a equipe, e a resposta chega por escrito nos Recados.',
    },
    {
      question: 'E se ele perder o interesse?',
      answer:
        'Você cancela na sua área, sem multa, e o acesso segue até o fim do período pago. O que ele fez continua na conta. Os 7 dias de garantia servem para ver como ele se sai no próximo curso.',
    },
    {
      question: 'Até que idade vale a Comunidade Kids?',
      answer:
        'Até os 17. De 9 a 17 anos, ele cria sozinho depois das primeiras aulas, e abaixo de 9 cria junto com um adulto. As instruções têm o Zappy e uma linguagem de aventura, e o que ele faz é jogo de verdade: regras, personagens, publicação e, mais adiante, código. A partir dos 18, existe também a área adulta, com conta própria, e o perfil Kids continua funcionando enquanto a assinatura estiver ativa, com os projetos que já estão nele.',
    },
    {
      question: 'Tenho outro filho.',
      answer:
        'A assinatura tem até 2 perfis, cada um com seus jogos, seu progresso e sua Jornada. Se o mais novo ainda não lê sozinho, ele cria junto com você.',
    },
    {
      question: 'Como cancelo? O que acontece com os jogos?',
      answer:
        'Na sua área, em Conta e depois em Minhas compras, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e os jogos publicados continuam no Mural.',
    },
  ],

  closing: {
    title:
      'Peça para ele contar o que mudaria no jogo que já fez. Essa ideia pode virar o próximo jogo dele.',
    zappy: { file: 'zappy-festa.webp', width: 640, height: 640, alt: '' },
  },

  rodape: {
    logo: { file: 'logo-kids-escuro.svg', width: 193, height: 18, alt: 'Sistema Zero Kids' },
    aviso: 'Comunicação dirigida aos responsáveis',
    links: [
      { href: '/kids/comunidade-dos-criadores/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },

  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Ver os planos',
  },

  /** Capa do JSON-LD de produto (a mesma do checkout). */
  capa: 'checkout-capa.webp',
} as const

/** As falas de `RELATOS` usadas na página, na ordem em que aparecem. */
export const RELATOS_CONTINUAR: readonly RelatoId[] = PAGINA_CONTINUAR.relatos.falas.map(
  (fala) => fala.id,
)
