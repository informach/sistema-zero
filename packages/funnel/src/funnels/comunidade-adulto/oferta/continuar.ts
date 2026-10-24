// Página de continuidade adulta da Comunidade dos Criadores (`/pro/comunidade-dos-criadores/oferta/
// continuar`), para quem já conhece o Sistema Zero: quem cancelou ou deixou vencer, quem já tem
// conta por outro curso ou oficina, quem fez 18 anos na Comunidade Kids e quem acompanha alguém da
// família no Kids. Proposta de 20/10/2026, desenho em docs/marketing/comunidade-dos-criadores/
// proposta-2026-10-19/canvas/PaginaContinuarAdulto.html. O `ComunidadeAdultoContinuarBody.astro`
// renderiza TODO texto visível a partir daqui.
//
// O que a página adulta já diz e vale igual aqui (requisitos, garantia, cartão dos planos, escada
// das etapas, tela do Mural, links legais) vem de `PAGINA_ADULTO` por referência: uma fonte só.
// Preços são os marcadores de `pagina.ts`, preenchidos com os planos ao vivo.

import { type CorAdulto, type ImagemAdulto, PAGINA_ADULTO } from './pagina'

const GARANTIA = '7 dias de garantia. Cancele quando quiser.'
const CTA_CONTINUAR = 'Assinar e continuar criando'

/** Uma situação de quem chega à página, como um slot de save, com o próximo passo. */
export interface CasoAdulto {
  cor: CorAdulto
  rotulo: string
  titulo: string
  texto: string
  proximo: string
}

export interface PaginaAdultoContinuar {
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
    titulo: { antes: string; destaque: string }
    texto: string
    beneficios: string[]
    cta: string
    garantia: string
    requisitos: typeof PAGINA_ADULTO.hero.requisitos
    tela: {
      rotulo: string
      fundo: ImagemAdulto
      titulo: string
      slot: { rotulo: string; nome: string; linhas: { chave: string; valor: string }[] }
      menu: { atual: string; outras: string[] }
      legenda: string
    }
  }
  casos: {
    rotulo: string
    titulo: string
    texto: string
    proximoRotulo: string
    itens: CasoAdulto[]
  }
  save: {
    rotulo: string
    titulo: string
    fica: { rotulo: string; selo: string; itens: string[] }
    volta: { rotulo: string; selo: string; itens: string[] }
    escada: typeof PAGINA_ADULTO.etapas.escada
  }
  prova: {
    rotulo: string
    titulo: string
    texto: string
    nota: string
    tela: typeof PAGINA_ADULTO.comunidade.tela
  }
  oferta: {
    rotulo: string
    titulo: string
    texto: string
    comeco: { rotulo: string; passos: string[] }
    garantia: typeof PAGINA_ADULTO.oferta.garantia
    cartao: typeof PAGINA_ADULTO.oferta.cartao
  }
  duvidas: { rotulo: string; titulo: string; itens: { pergunta: string; resposta: string }[] }
  fechamento: {
    rotulo: string
    titulo: string
    texto: string
    cta: string
    garantia: string
    legal: typeof PAGINA_ADULTO.fechamento.legal
  }
  barra: { preco: string; alternativa: string; cta: string }
}

export const PAGINA_ADULTO_CONTINUAR: PaginaAdultoContinuar = {
  seoTitle: 'Continue na Comunidade dos Criadores | Sistema Zero',
  description:
    'Para quem já conhece o Sistema Zero: quem já tem conta continua nela, com o mesmo e-mail, e segue criando jogos, até o jogo com a sua ideia. 7 dias de garantia. Cancele quando quiser.',
  pularParaConteudo: PAGINA_ADULTO.pularParaConteudo,
  topo: {
    marcaAria: PAGINA_ADULTO.topo.marcaAria,
    logoAlt: PAGINA_ADULTO.topo.logoAlt,
    selo: PAGINA_ADULTO.topo.selo,
    navAria: PAGINA_ADULTO.topo.navAria,
    links: [
      { href: '#caso', label: 'Seu caso' },
      { href: '#save', label: 'O que ficou salvo' },
    ],
    cta: 'Continuar',
  },
  hero: {
    rotulo: 'CONTINUE · PARA QUEM JÁ CONHECE O SISTEMA ZERO',
    titulo: {
      antes:
        'Você já conhece o Sistema Zero. Agora você continua criando jogos, cada vez maiores, ',
      destaque: 'até o jogo com a sua ideia.',
    },
    texto:
      'Quem já tem conta continua nela, com o mesmo e-mail. Os projetos em Meus Jogos, os jogos publicados e o progresso nos cursos ficam lá. Com a assinatura, você volta a ter na conta os cursos, o Estúdio livre e as ferramentas da sua etapa, o Mural, o Clube e os Recados. Cada etapa concluída libera blocos novos no Estúdio, e algumas liberam uma ferramenta nova. Assim os seus próximos jogos ficam maiores. Se você criava na Comunidade Kids ou acompanha alguém lá, o seu caso está logo abaixo.',
    beneficios: [
      'Quem já tem conta continua nela, com o mesmo e-mail.',
      'Cursos, ferramentas, Mural, Clube e Recados na mesma conta.',
      '7 dias de garantia para testar a assinatura.',
    ],
    cta: CTA_CONTINUAR,
    garantia: GARANTIA,
    requisitos: PAGINA_ADULTO.hero.requisitos,
    tela: {
      rotulo: 'CARREGAR JOGO',
      // O jogo de arena só faz o fundo da tela de save: decorativo, sem texto alternativo.
      fundo: { ...PAGINA_ADULTO.hero.tela.imagem, alt: '' },
      titulo: 'CONTINUE',
      slot: {
        rotulo: 'SAVE 1',
        nome: 'SEU NOME',
        linhas: [
          { chave: 'PROGRESSO', valor: 'SALVO' },
          { chave: 'MEUS JOGOS', valor: 'GUARDADOS' },
          { chave: 'NO MURAL', valor: 'PUBLICADOS' },
        ],
      },
      menu: { atual: 'CONTINUAR', outras: ['NOVO JOGO', 'OPÇÕES'] },
      legenda: 'Ilustração do que fica guardado na sua conta quando a assinatura para.',
    },
  },
  casos: {
    rotulo: 'VOCÊ ESTÁ AQUI',
    titulo: 'Cada pessoa chega aqui por um caminho. Encontre o seu.',
    texto: 'O próximo passo muda conforme a sua história com o Sistema Zero.',
    proximoRotulo: 'PRÓXIMO PASSO',
    itens: [
      {
        cor: 'amarelo',
        rotulo: 'SAVE 1 · VOLTANDO DE UMA PAUSA',
        titulo: 'Você cancelou ou deixou a assinatura vencer',
        texto:
          'Os projetos, o progresso e os jogos publicados continuam na conta. Assine com o mesmo e-mail, e a assinatura nova começa no dia em que o pagamento é aprovado.',
        proximo: 'ABRIR O CURSO EM QUE VOCÊ PAROU',
      },
      {
        cor: 'azul',
        rotulo: 'SAVE 2 · JÁ TEM CONTA',
        titulo: 'Você já tem conta no Sistema Zero',
        texto:
          'Por uma oficina ao vivo ou por outro curso. A Comunidade entra nessa mesma conta: use o mesmo e-mail no checkout, e o que você já tem continua lá.',
        proximo: 'O PRIMEIRO JOGO, NA MESMA CONTA',
      },
      {
        cor: 'verde',
        rotulo: 'SAVE 3 · FEZ 18 ANOS NO KIDS',
        titulo: 'Você criava na Comunidade Kids',
        texto:
          'A conta Kids fica no nome do responsável, e o perfil Kids continua funcionando depois dos 18, com os projetos, enquanto a assinatura dele estiver ativa. Aqui a conta é sua e começa nova, com o mesmo Estúdio que você já conhece, outra aparência e etapas próprias.',
        proximo: 'UMA CONTA NO SEU NOME',
      },
      {
        cor: 'rosa',
        rotulo: 'SAVE 4 · ALGUÉM DA FAMÍLIA NO KIDS',
        titulo: 'Você acompanha alguém da família na Comunidade Kids',
        texto:
          'Você já viu de perto como funciona. Na área adulta, a conta é sua, com outra aparência, os mesmos clássicos no começo e o caminho até o código. São assinaturas separadas, e a do Kids continua como está.',
        proximo: 'O SEU PRIMEIRO JOGO',
      },
    ],
  },
  save: {
    rotulo: 'O QUE FICOU SALVO',
    titulo:
      'Quando a assinatura para, o que você fez fica guardado. Quando ela volta, você continua de onde parou.',
    fica: {
      rotulo: 'FICA NA CONTA',
      selo: 'SEM CUSTO',
      itens: [
        'A conta, o e-mail e o seu perfil',
        'Os projetos em Meus Jogos',
        'Os jogos publicados, que continuam no Mural para visita',
        'Os certificados já emitidos',
        'O progresso nos cursos',
        'A etapa e os blocos que você já liberou',
      ],
    },
    volta: {
      rotulo: 'VOLTA COM A ASSINATURA',
      selo: 'PLAYER 1',
      itens: [
        'Todos os cursos adultos, os de hoje e os que entrarem',
        'O Estúdio livre e as ferramentas da sua etapa',
        'Publicar e fazer a sua versão dos jogos no Mural',
        'O Clube e o Desafio do mês',
        'Os tutoriais e os Recados, para quando travar',
        'O Pensa e o Zappy nas etapas avançadas, com créditos por dia e por mês',
      ],
    },
    escada: { ...PAGINA_ADULTO.etapas.escada, titulo: 'As 7 etapas da área adulta' },
  },
  prova: {
    rotulo: 'A PROVA É SUA',
    titulo: 'Antes de decidir, jogue de novo o que você publicou',
    texto:
      'O link do seu jogo continua abrindo no celular. Abra, jogue uma partida e repare no que você mudaria hoje. Essa mudança pode ser o começo do seu próximo jogo.',
    nota: 'Se você ainda não publicou um jogo, o primeiro curso começa pela versão pronta, e logo depois você muda a primeira regra.',
    tela: PAGINA_ADULTO.comunidade.tela,
  },
  oferta: {
    rotulo: 'INSERT COIN · CONTINUE',
    titulo: 'Escolha o plano e continue na mesma conta',
    texto:
      'Os dois planos dão acesso a tudo, e a diferença está só na forma de pagar. No checkout, use o mesmo e-mail da sua conta: é ele que junta a assinatura ao que você já fez.',
    comeco: {
      rotulo: 'QUANDO A ASSINATURA COMEÇA',
      passos: [
        'No dia em que o pagamento é aprovado, a assinatura entra na conta do e-mail da compra.',
        'Se você já tem conta, entra com o seu acesso de sempre. Se ainda não tem, o link para criar a senha chega nesse e-mail.',
        'Você abre o curso em que parou, ou o primeiro, e segue dali.',
      ],
    },
    garantia: PAGINA_ADULTO.oferta.garantia,
    cartao: PAGINA_ADULTO.oferta.cartao,
  },
  duvidas: {
    rotulo: 'PERGUNTAS',
    titulo: 'Algumas dúvidas de quem está voltando',
    itens: [
      {
        pergunta: 'Meus projetos ainda estão lá?',
        resposta:
          'Estão. Os projetos em Meus Jogos, os jogos publicados no Mural, os certificados, o progresso nos cursos e a etapa que você alcançou ficam na conta. Entre com o mesmo e-mail e continue de onde parou.',
      },
      {
        pergunta: 'Preciso criar outra conta?',
        resposta:
          'Se você já tem conta adulta no Sistema Zero, não. Use o mesmo e-mail no checkout, e a Comunidade entra nessa conta.',
      },
      {
        pergunta: 'Já comprei um curso avulso. A Comunidade está incluída?',
        resposta:
          'Não. A Comunidade dos Criadores é uma assinatura à parte, com os cursos, as ferramentas de criação de jogos, o Mural e o Clube. O curso que você comprou continua na sua conta, do jeito que está.',
      },
      {
        pergunta: 'Usava a Comunidade Kids e fiz 18 anos. Levo meus jogos?',
        resposta:
          'Os jogos ficam no perfil Kids, que segue funcionando na conta do seu responsável enquanto a assinatura dele estiver ativa. A conta adulta começa nova, no seu nome, com o mesmo Estúdio que você já conhece e etapas próprias.',
      },
      {
        pergunta: 'Meu filho tem a assinatura Kids. Ela inclui a minha?',
        resposta: 'Não. São assinaturas separadas, e a do Kids continua como está.',
      },
      {
        pergunta: 'Os cursos que entraram enquanto eu estava fora estão incluídos?',
        resposta:
          'Estão. A assinatura dá acesso a todos os cursos adultos publicados, e os lançados durante a assinatura entram sem custo extra.',
      },
      {
        pergunta: 'E se eu precisar parar de novo?',
        resposta:
          'O cancelamento fica na sua conta, em Compras e assinatura, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e os seus projetos continuam guardados para a próxima vez.',
      },
      {
        pergunta: 'Que computador eu preciso?',
        resposta:
          'Um computador com internet, navegador atualizado, mouse e teclado. Tudo roda no navegador, sem instalar nada. O celular serve para jogar e mostrar o que você publicou.',
      },
    ],
  },
  fechamento: {
    rotulo: 'CONTINUE',
    titulo: 'Escolha o plano e continue criando os seus jogos.',
    texto: 'Quem parou continua de onde estava, e quem está chegando começa pelo primeiro jogo.',
    cta: CTA_CONTINUAR,
    garantia: GARANTIA,
    legal: PAGINA_ADULTO.fechamento.legal,
  },
  barra: {
    preco: PAGINA_ADULTO.barra.preco,
    alternativa: PAGINA_ADULTO.barra.alternativa,
    cta: 'Continuar',
  },
}
