// Conteúdo da página de vendas (13 seções, ordem exata) — verbatim, pt-BR.

export interface MetodoItem {
  letra: string
  titulo: string
  texto: string
}
export interface BonusItem {
  titulo: string
  texto: string
}
export interface FaqItem {
  pergunta: string
  resposta: string
}

export const SALES = {
  s1: {
    titulo: 'Pare de pedir código no escuro. Comece a construir com clareza.',
    paragrafos: [
      'A IA consegue escrever rápido. Mas quando você não entende o que ela está fazendo, cada resposta bonita pode virar um problema escondido. Um erro que você não sabe corrigir. Uma mudança que quebra outra parte. Um dado exposto sem você perceber. Um sistema que parecia pronto, mas desanda quando sai do exemplo do tutorial.',
      'No Comando da IA é um guia direto para quem quer tirar uma ideia do papel usando inteligência artificial, mas não quer virar refém dela. Você não precisa virar programador profissional. Mas precisa entender o mínimo para saber pedir, avaliar e conduzir. Porque quem entende a base, comanda. Quem não entende, copia, cola e torce.',
    ],
  },
  s2: {
    titulo: 'Para quem é este guia',
    paragrafos: [
      'Este guia foi feito para você que tem uma ideia de sistema, app, site, automação ou jogo e pensa: "Será que eu consigo criar isso com IA?". A resposta é: sim, você pode começar. Mas não do jeito que a maioria está fazendo, abrindo o ChatGPT e pedindo "crie um sistema completo para mim". Esse é o caminho mais rápido para gerar uma bagunça que você não entende. O caminho certo começa antes do código. Começa com clareza.',
    ],
    introLista: 'Este guia é para você se:',
    bullets: [
      'tem uma ideia mas não sabe transformar em sistema',
      'já pediu algo para a IA e recebeu uma resposta bonita, mas confusa',
      'sente que a IA ajuda, mas percebe que fica dependente dela quando algo quebra',
      'quer criar com mais autonomia, vindo de fora da área técnica',
      'quer entender o suficiente para não ser enganado por uma tela funcionando pela metade',
    ],
  },
  s3: {
    titulo: 'A verdadeira armadilha é usar IA sem critério',
    paragrafos: [
      'Usar IA é ótimo, e mudou o jogo. O perigo aparece quando você usa sem entender o que ela faz. A IA diminuiu a barreira de entrada: hoje uma pessoa comum cria páginas, sistemas simples, automações, jogos, ferramentas e protótipos. Isso é incrível. Mas existe uma armadilha: quando você não entende o básico, a IA vira uma caixa preta. Ela responde, você copia, funciona uma vez, depois quebra. Você pede para corrigir, ela corrige uma parte e estraga outra. Você abre outra conversa, recebe outro código. E, sem perceber, deixa de criar com IA e passa a depender dela para cada passo. É aí que você vira refém.',
    ],
  },
  s4: {
    titulo: 'Antes e depois',
    cabecalho: { antes: 'Antes', depois: 'Depois' },
    linhas: [
      [
        'Você pede um sistema inteiro e espera a IA adivinhar',
        'Você esboça a ideia antes e entrega contexto claro',
      ],
      [
        'Você copia código sem entender o que está mudando',
        'Você sabe o que a IA está tentando construir',
      ],
      [
        'Quando quebra, você abre outra conversa desesperada',
        'Você identifica onde pode estar o problema',
      ],
      [
        'Cada ajuste vira dependência de IA ou de outra pessoa',
        'Ajustes simples passam a ficar sob seu controle',
      ],
      ['Sua ideia fica solta, confusa e difícil de explicar', 'Sua ideia vira um mapa de 1 página'],
      ['A IA conduz o processo', 'Você conduz a IA'],
    ] as [string, string][],
  },
  s5: {
    titulo: 'O que você vai aprender (método Z.E.R.O.)',
    metodo: [
      {
        letra: 'Z',
        titulo: 'Zerar a confusão.',
        texto:
          'Limpar o barulho do "a IA faz tudo" e entender por que o fundamento ainda importa, para enxergar quando uma resposta da IA parece certa mas está incompleta, insegura ou difícil de manter.',
      },
      {
        letra: 'E',
        titulo: 'Esboçar o sistema.',
        texto:
          'Pegar a ideia solta e transformar em um mapa simples (problema, usuário, fluxo, telas, dados, regras, primeira versão). A IA deixa de responder a um chute e passa a seguir um plano.',
      },
      {
        letra: 'R',
        titulo: 'Rodar por partes.',
        texto:
          'O gostinho de como pedir para a IA construir em partes menores, em vez de um sistema inteiro de uma vez.',
      },
      {
        letra: 'O',
        titulo: 'Operar de verdade.',
        texto:
          'Por que não dá para acreditar em tudo só porque "funcionou aqui". A IA entrega, você precisa testar com critério.',
      },
    ] as MetodoItem[],
  },
  s6: {
    titulo: 'O que você recebe',
    ebook:
      'Ebook No Comando da IA: um guia direto, leve e sem enrolação, com o método Z.E.R.O. aplicado a uma ideia simples.',
    kitTitulo: 'Kit prático de aplicação:',
    kit: [
      'Checklist de Clareza Antes do Prompt',
      'Template "Minha ideia em 1 página"',
      'Roteiro de Prompt Estruturado',
      'Checklist "Teste antes de acreditar"',
    ],
  },
  s7: {
    titulo: 'O resultado final',
    paragrafos: [
      'Ao terminar, você sai com a sua ideia mais clara: um mapa de 1 página mostrando o que você quer criar, para quem é, qual problema resolve, quais telas precisa ter, quais dados entram, quais regras importam e qual é a primeira versão possível.',
    ],
  },
  s8: {
    titulo: 'Bônus',
    bonus: [
      {
        titulo: 'Bônus 1. Mini-glossário "O básico que a IA espera que você saiba"',
        texto: 'tela, fluxo, dado, regra, deploy, prompt, sistema, interface, em palavras simples.',
      },
      {
        titulo: 'Bônus 2. 10 sinais de que você está virando refém da IA',
        texto:
          'um raio-x rápido para identificar se você usa a IA como ferramenta ou já depende dela para pensar por você.',
      },
    ] as BonusItem[],
  },
  s9: {
    titulo: 'O que este produto não é',
    paragrafos: [
      'Não é um curso completo de programação. Não é uma promessa de criar um sistema robusto em uma tarde. Não é um atalho mágico para ignorar fundamentos. É o primeiro passo, feito para sistemas simples (nível 1). Aqui você aprende os dois primeiros movimentos do Z.E.R.O.: Zerar a confusão e Esboçar o sistema. Rodar e operar sistemas maiores são os próximos degraus do Sistema Zero.',
    ],
  },
  s10: {
    titulo: 'Por que isso importa agora',
    paragrafos: [
      'Quanto mais poderosa a IA fica, mais perigoso é obedecer sem entender. Mais do que competir com a IA, o que importa é aprender a conduzir. Quem tem fundamento usa a IA como acelerador. Quem não tem, vai de passageiro e deixa a ferramenta no volante.',
    ],
  },
  s11: {
    titulo: 'Quem criou',
    paragrafos: [
      'Somos Helena e Júlio, o Casal Sistema Zero. Dois desenvolvedores formados em Sistemas de Informação, com mais de 10 anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres. Também criamos nossos próprios produtos digitais, como o Cozya e o Agenda da Turma, além de jogos e projetos com nossos filhos. Quando a IA virou febre, vimos muita gente boa cair na mesma armadilha: o tutorial que funciona, o projeto próprio que quebra, o código que ninguém entende. Atravessamos essa onda de outro jeito porque tínhamos fundamento, e organizamos esse jeito de pensar no método Z.E.R.O.',
    ],
    legendaPrints: 'Sistemas criados com esse pensamento:',
    prints: [
      { src: '/img/print-cozya.webp', alt: 'Print do Cozya' },
      { src: '/img/print-agenda-da-turma.webp', alt: 'Print do Agenda da Turma' },
    ],
    legendaDepoimentos: 'O que os primeiros leitores estão dizendo:',
    depoimentos: [{ src: '/img/depoimento-1.webp', alt: 'Depoimento de leitor' }],
  },
  s12: {
    titulo: 'Garantia',
    paragrafos: [
      'Garantia de 7 dias. Leia o guia, aplique o template, esboce sua ideia. Se sentir que o material não te ajudou a enxergar sua ideia com mais clareza, é só pedir o reembolso em até 7 dias. O risco é nosso.',
    ],
  },
  s13: {
    titulo: 'Perguntas rápidas (FAQ)',
    faq: [
      {
        pergunta: 'Preciso saber programar?',
        resposta: 'Não. Foi feito para quem está começando ou veio de fora da área técnica.',
      },
      {
        pergunta: 'Vou sair com um sistema pronto?',
        resposta:
          'Não. Você sai com o primeiro passo certo: sua ideia organizada em um mapa claro.',
      },
      {
        pergunta: 'Serve para app, site, sistema, automação ou jogo?',
        resposta: 'Sim, desde que a ideia esteja em um nível simples e inicial.',
      },
      {
        pergunta: 'É sobre ChatGPT?',
        resposta:
          'Você aplica com ChatGPT, Claude, Gemini ou outras ferramentas. O ponto é aprender a pensar antes de pedir.',
      },
      {
        pergunta: 'Por que custa R$ 37?',
        resposta:
          'Porque é um produto de entrada, o primeiro passo do Sistema Zero de forma acessível.',
      },
    ] as FaqItem[],
  },
}
