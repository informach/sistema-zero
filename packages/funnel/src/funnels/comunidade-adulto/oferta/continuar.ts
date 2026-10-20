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
const CTA_CONTINUAR = 'Continuar de onde parei'

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
  seoTitle: 'Continue de onde parou na Comunidade dos Criadores | Sistema Zero',
  description:
    'Para quem já conhece o Sistema Zero: com o mesmo e-mail, os projetos, o progresso e os jogos publicados continuam na conta, e a próxima fase começa de onde você parou. 7 dias de garantia. Cancele quando quiser.',
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
      antes: 'Seu save continua na conta. A próxima fase começa ',
      destaque: 'de onde você parou.',
    },
    texto:
      'Entre com o mesmo e-mail e está tudo lá: os projetos em Meus Jogos, os jogos publicados no Mural e o progresso nos cursos. Com a assinatura, os cursos voltam a abrir, e cada etapa concluída põe mais uma ferramenta no seu Estúdio.',
    beneficios: [
      'A mesma conta e o mesmo e-mail, com tudo o que você já fez.',
      'Todos os cursos, inclusive os que entraram enquanto você esteve fora.',
      '7 dias de garantia para ver se esta é a hora de voltar.',
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
          { chave: 'ETAPA', valor: 'SALVA' },
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
          'Os projetos, o progresso e os jogos publicados continuam na conta. Entre com o mesmo e-mail, e a assinatura nova começa no dia em que o pagamento é aprovado.',
        proximo: 'ABRIR O CURSO EM QUE VOCÊ PAROU',
      },
      {
        cor: 'azul',
        rotulo: 'SAVE 2 · JÁ TEM CONTA',
        titulo: 'Você já tem conta no Sistema Zero',
        texto:
          'Por No Comando da IA, por uma oficina ao vivo ou por outro curso. A Comunidade entra nessa mesma conta: use o mesmo e-mail no checkout, e o que você já tem continua lá.',
        proximo: 'O PRIMEIRO JOGO, NA MESMA CONTA',
      },
      {
        cor: 'verde',
        rotulo: 'SAVE 3 · FEZ 18 ANOS NO KIDS',
        titulo: 'Você criava na Comunidade Kids',
        texto:
          'A conta Kids fica no nome do responsável. A partir dos 18, a conta é sua, com o mesmo Estúdio que você já conhece, outra aparência e o caminho até o código. Os projetos do perfil Kids não passam para a conta nova.',
        proximo: 'UMA CONTA NO SEU NOME',
      },
      {
        cor: 'rosa',
        rotulo: 'SAVE 4 · SEU FILHO OU FILHA NO KIDS',
        titulo: 'Você acompanha alguém da família na Comunidade Kids',
        texto:
          'Você já viu de perto como funciona. Na área adulta, a conta é sua, com outra aparência, os mesmos clássicos no começo e o caminho até o código. São assinaturas separadas, e a do Kids continua como está.',
        proximo: 'O SEU PRIMEIRO JOGO',
      },
    ],
  },
  save: {
    rotulo: 'O QUE FICOU SALVO',
    titulo: 'Quando a assinatura para, o save fica. Quando ela volta, o jogo continua.',
    fica: {
      rotulo: 'FICA NA CONTA',
      selo: 'SEM CUSTO',
      itens: [
        'A conta, o e-mail e o seu perfil',
        'Os projetos em Meus Jogos',
        'Os jogos publicados no Mural',
        'Os certificados já emitidos',
        'O progresso nos cursos e a etapa que você alcançou',
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
        'O Pensa e o Zappy nas etapas avançadas, com limite mensal',
      ],
    },
    escada: { ...PAGINA_ADULTO.etapas.escada, titulo: 'As 7 etapas: a sua fica salva' },
  },
  prova: {
    rotulo: 'A PROVA É SUA',
    titulo: 'Antes de decidir, jogue de novo o que você publicou',
    texto:
      'O link do seu jogo continua abrindo no celular. Abra, jogue uma partida e repare no que você mudaria hoje. É por aí que a próxima fase começa.',
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
          'Estão. Os projetos em Meus Jogos, os jogos publicados no Mural, os certificados e o progresso nos cursos ficam na conta. Entre com o mesmo e-mail e continue de onde parou.',
      },
      {
        pergunta: 'Preciso criar outra conta?',
        resposta:
          'Se você já tem conta adulta no Sistema Zero, não. Use o mesmo e-mail no checkout, e a Comunidade entra nessa conta.',
      },
      {
        pergunta: 'Já tenho No Comando da IA. Pago de novo?',
        resposta:
          'A Comunidade dos Criadores é uma assinatura à parte, com os cursos e as ferramentas de criação de jogos. O curso que você já comprou continua na sua conta, do jeito que está.',
      },
      {
        pergunta: 'Usava a Comunidade Kids e fiz 18 anos. Levo meus jogos?',
        resposta:
          'A conta Kids é do seu responsável, e os projetos do perfil Kids não passam para a área adulta. Aqui você abre uma conta no seu nome, com o mesmo Estúdio que já conhece e o caminho até o código.',
      },
      {
        pergunta: 'Meu filho tem a assinatura Kids. Ela inclui a minha?',
        resposta:
          'Não. São assinaturas separadas, cada uma com a sua conta. A do Kids continua como está.',
      },
      {
        pergunta: 'Os cursos que entraram enquanto eu estava fora estão incluídos?',
        resposta:
          'Estão. A assinatura dá acesso a todos os cursos adultos publicados, e os lançados durante a assinatura entram sem custo extra.',
      },
      {
        pergunta: 'E se eu precisar parar de novo?',
        resposta:
          'O cancelamento fica na sua conta, em Compras e assinatura, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e o save continua guardado para a próxima vez.',
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
    titulo: 'O save está aqui. Falta apertar start.',
    texto:
      'A fase em que você parou, e a ideia que ficou para depois, continuam esperando por você.',
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
