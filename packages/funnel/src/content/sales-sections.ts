// Conteúdo da página de vendas (Seções 2 a 16; a Seção 1 — hero — é dinâmica por
// perfil em `hero-perfil.ts`). Ordem e copy VERBATIM do briefing, pt-BR. Os labels
// dos botões NÃO trazem o preço — a /oferta anexa "(R$ 37)" com o preço do catálogo.

export interface MetodoItem {
  letra: string
  titulo: string
  texto: string
}
export interface BonusItem {
  titulo: string
  texto: string
  img: string
  imgAlt: string
}
export interface ExemploItem {
  titulo: string
  texto: string
}
export interface FaqItem {
  pergunta: string
  resposta: string
}

export const SALES = {
  // Seção 2 — A verdadeira armadilha é usar IA sem critério
  armadilha: {
    titulo: 'A verdadeira armadilha é usar IA sem critério',
    paragrafos: [
      'Usar IA é ótimo, e mudou o jogo de verdade. O perigo não é usar, é usar sem entender o que ela está fazendo. Quando você não tem o básico, a IA vira uma caixa-preta: ela responde, você copia, funciona uma vez e depois quebra. Você pede pra corrigir, ela conserta um pedaço e estraga outro. Você abre outra conversa, recebe outro código. E, sem perceber, você deixou de criar com a IA e passou a depender dela pra cada passo. Foi aí que você virou refém, sem ninguém te avisar.',
      'Aí vem a pergunta natural: "se a IA já faz tudo, pra que eu preciso entender alguma coisa?". Só que é o contrário: quanto mais ela gera, mais vale você entender o suficiente pra conferir o que saiu. Quem tem a base usa a IA como acelerador. Quem não tem usa no escuro, achando que está tudo certo, até o dia em que quebra.',
    ],
  },

  // Seção 3 — Antes e depois
  antesDepois: {
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
    botao: 'Quero começar no comando',
  },

  // Seção 4 — O método Z.E.R.O.
  metodo: {
    titulo: 'O método Z.E.R.O.',
    intro:
      'O Z.E.R.O. é o caminho que a gente usa no Sistema Zero pra sair da ideia solta e chegar numa primeira versão com clareza. São quatro movimentos. Neste primeiro material, você mergulha nos dois primeiros, Zerar a confusão e Esboçar o sistema, que é tudo que vem antes de pedir qualquer linha de código. O Rodar e o Operar você prova aqui e aprofunda nos próximos passos.',
    itens: [
      {
        letra: 'Z',
        titulo: 'Zerar a confusão.',
        texto:
          'Tirar o barulho do "a IA faz tudo" e entender por que o fundamento ainda importa. É o mínimo que te coloca no comando e te faz perceber quando uma resposta da IA parece certa, mas está incompleta, insegura ou difícil de manter.',
      },
      {
        letra: 'E',
        titulo: 'Esboçar o sistema.',
        texto:
          'Pegar a ideia que está solta na sua cabeça e transformar num mapa simples: problema, usuário, fluxo, telas, dados, regras e a primeira versão. A partir daí, a IA para de responder a um chute e passa a seguir um plano.',
      },
      {
        letra: 'R',
        titulo: 'Rodar por partes.',
        texto:
          'Um gostinho de como pedir pra IA construir em pedaços menores, em vez de um sistema inteiro de uma vez. Coisa boa nasce de decisão pequena, clara e testada.',
      },
      {
        letra: 'O',
        titulo: 'Operar de verdade.',
        texto:
          'Por que não dá pra acreditar em tudo só porque funcionou na sua frente. A IA entrega, você testa. Como olhar a entrega com mais critério antes de confiar.',
      },
    ] as MetodoItem[],
  },

  // Seção 5 — O que dá para criar já nos primeiros passos
  primeirosPassos: {
    titulo: 'O que dá para criar já nos primeiros passos',
    paragrafos: [
      'Você não precisa começar criando um aplicativo gigante, cheio de login, pagamento, banco de dados e mil integrações. O primeiro passo é aprender a tirar uma ideia da imaginação e transformar em algo simples, claro e que funciona.',
      'No Nível 1, você começa com pequenos aplicativos e ferramentas feitos com a ajuda da IA, do zero. São projetos simples, pensados pra você entender a lógica por trás: o que a pessoa vê, o que ela informa, o que o sistema calcula, qual regra ele segue e o que ele entrega no final.',
    ],
    introExemplos: 'Alguns exemplos do que cabe nesse começo:',
    exemplos: [
      {
        titulo: 'Quiz ou diagnóstico interativo',
        texto: 'ferramenta para seu público responder perguntas e receber um resultado.',
      },
      {
        titulo: 'Página simples de apresentação ou captura',
        texto:
          'mostrar uma ideia, um serviço, uma oferta, uma lista de espera ou um material gratuito.',
      },
      {
        titulo: 'Calculadora personalizada',
        texto: 'resolve uma conta chata do seu dia a dia, do seu trabalho ou do seu nicho.',
      },
      {
        titulo: 'Checklist ou planner interativo',
        texto:
          'um passo a passo para organizar um processo, acompanhar tarefas ou guiar uma decisão.',
      },
      {
        titulo: 'Catálogo simples',
        texto: 'vitrine digital para produtos, serviços, aulas, pacotes, cardápios ou soluções.',
      },
      {
        titulo: 'Automação básica de tarefa repetitiva',
        texto:
          'organizar informações, gerar textos, classificar respostas ou acelerar algo manual.',
      },
      {
        titulo: 'Joguinho simples para aprender criando',
        texto:
          'projeto pequeno e visual, usado como laboratório para entender lógica, telas, regras e funcionamento.',
      },
    ] as ExemploItem[],
    fechamento:
      'São projetos do tamanho certo pra começar, os seus primeiros que ficam de pé. Pequenos o bastante pra você entender do começo ao fim. Concretos o bastante pra deixarem de ser só uma ideia solta. E importantes o bastante pra você perceber uma coisa: "eu consigo criar com a IA quando entendo o que estou pedindo."',
  },

  // Seção 6 — O que você recebe
  oQueRecebe: {
    titulo: 'O que você recebe',
    ebook:
      'Ebook No Comando da IA: um guia direto, leve e sem enrolação. Dentro dele você vê o que significa virar refém da IA, por que prompt solto gera sistema quebrado, o que entender antes de pedir código, como pensar a sua ideia como um sistema, como separar problema, usuário, fluxo, telas, dados e regras, como pedir por partes, como testar antes de acreditar e como aplicar o Z.E.R.O. numa ideia simples.',
    kitTitulo: 'Kit prático de aplicação:',
    kit: [
      'Checklist de Clareza Antes do Prompt (saber se sua ideia está pronta para a IA)',
      'Template "Minha ideia em 1 página" (transformar a ideia num mapa simples e organizado)',
      'Roteiro de Prompt Estruturado (pedir com contexto, direção e limites claros)',
      'Checklist "Teste antes de acreditar" (avaliar a entrega antes de confiar)',
    ],
  },

  // Seção 7 — O resultado final
  resultadoFinal: {
    titulo: 'O resultado final',
    paragrafos: [
      'Você sai daqui com a sua ideia organizada num mapa de 1 página: o que você quer criar, pra quem é, qual problema resolve, quais telas precisa ter, quais dados entram, quais regras importam e qual é a primeira versão possível. É o primeiro passo pra transformar uma ideia solta em algo que a IA consiga te ajudar a construir.',
    ],
    botao: 'Quero transformar minha ideia num plano',
  },

  // Seção 8 — Bônus
  bonus: {
    titulo: 'Bônus',
    itens: [
      {
        titulo: 'Bônus 1. Mini-glossário "O básico que a IA espera que você saiba"',
        texto:
          'tela, fluxo, dado, regra, deploy, prompt, sistema, interface. Palavras simples que fazem diferença pra você parar de concordar com termo que não entende.',
        img: '/img/no-comando-da-ia/bonus-1.webp',
        imgAlt: 'Mini-glossário "O básico que a IA espera que você saiba" em vários dispositivos',
      },
      {
        titulo: 'Bônus 2. 10 sinais de que você está virando refém da IA',
        texto:
          'um raio-x rápido pra saber se você usa a IA como ferramenta ou já depende dela pra pensar por você. Alguns sinais incomodam, e é justamente por isso que funcionam.',
        img: '/img/no-comando-da-ia/bonus-2.webp',
        imgAlt: 'Guia "10 sinais de que você está virando refém da IA" em vários dispositivos',
      },
    ] as BonusItem[],
  },

  // Seção 9 — Para quem é / não é
  paraQuem: {
    titulo: 'Para quem é / não é',
    paragrafos: [
      'Este guia é pra você que tem uma ideia de sistema, app, site, automação ou jogo e pensa: "será que eu consigo criar isso com IA?". A resposta é sim, você pode começar. Só que não abrindo o ChatGPT e pedindo "cria um sistema completo pra mim", que é o caminho mais rápido pra uma bagunça que você não entende. O caminho certo começa antes do código, com clareza.',
    ],
    introLista: 'É para você se:',
    bullets: [
      'tem uma ideia mas não sabe transformar em sistema',
      'ainda nem tentou porque acha que isso é coisa de programador',
      'já pediu algo à IA e recebeu uma resposta bonita mas confusa',
      'sente que fica dependente dela quando algo quebra',
      'quer criar com mais autonomia vindo de fora da área técnica',
      'quer entender o suficiente para não ser enganado por uma tela funcionando pela metade',
    ],
    naoTitulo: 'O que este produto não é',
    naoParagrafo:
      'Não é um curso completo de programação, não é promessa de criar um sistema robusto numa tarde, não é atalho mágico pra pular os fundamentos e não é pra quem quer apertar um botão e esperar a IA resolver tudo. É o primeiro passo, feito pra sistemas simples (nível 1), aqueles que você começa a montar no próprio ChatGPT quando aprende a pensar antes de pedir. Aqui você vai fundo nos dois primeiros movimentos do Z.E.R.O., Zerar a confusão e Esboçar o sistema. Rodar e operar sistemas maiores são os próximos degraus do Sistema Zero.',
  },

  // Seção 10 — Para onde essa habilidade pode te levar
  paraOndeLeva: {
    titulo: 'Para onde essa habilidade pode te levar',
    paragrafos: [
      'Aprender a criar com a IA não para no primeiro projeto. O No Comando da IA é o primeiro passo. Ele não promete que você vai sair criando sistemas complexos da noite pro dia. Ele abre a sua cabeça, organiza o seu raciocínio e te mostra como uma ideia começa a virar sistema: tela, fluxo, dados, regras, ações, validações e resultado.',
      'Quanto mais você entende os fundamentos de como um sistema funciona, melhor você conduz a IA. Você para de pedir no escuro, para de aceitar qualquer resposta bonita e começa a enxergar o que faz sentido, o que está incompleto e o que precisa de ajuste.',
    ],
    introLista: 'Com essa habilidade, você pode começar a:',
    bullets: [
      'Tirar do papel uma ideia que vive há meses na sua cabeça, saindo do "como seria" para ver funcionando.',
      'Criar protótipos antes de investir alto, montando uma primeira versão para validar o caminho.',
      'Montar a base de um negócio digital com mais autonomia, entendendo telas, fluxos e regras em vez de depender de respostas soltas da IA.',
      'Criar ferramentas para resolver problemas do seu próprio trabalho e economizar tempo.',
      'Perceber que uma solução para um problema seu também resolve o problema de outras pessoas.',
      'Criar para outras pessoas no futuro: com mais estudo e prática, essa habilidade pode virar uma frente de trabalho.',
      'Conversar melhor com a IA e avaliar o que ela entrega, identificando quando ela inventou, exagerou ou deixou algo de fora.',
    ],
    fechamento:
      'Esse produto é o começo da escada. Primeiro você aprende a sair do pedido solto e entrar no comando. Depois, se quiser, aprofunda nos fundamentos e avança pra projetos mais completos. O quanto você vai longe é decisão sua. Mas tudo começa aqui: aprendendo a pensar com clareza antes de pedir pra IA criar.',
  },

  // Seção 11 — Stack de valor
  stackValor: {
    titulo: 'Tudo o que você leva',
    // {preco} é substituído pelo preço do catálogo na /oferta.
    texto:
      'Tudo o que entra por {preco}: o ebook No Comando da IA (com o método Z.E.R.O.), o kit prático com 4 ferramentas (Checklist de Clareza, Template "Minha ideia em 1 página", Roteiro de Prompt Estruturado e Checklist "Teste antes de acreditar"), os 2 bônus (Mini-glossário e os 10 sinais) e a garantia de 7 dias. O primeiro passo do Sistema Zero, de forma acessível e direta.',
    itens: [
      'Ebook No Comando da IA (com o método Z.E.R.O.)',
      'Kit prático com 4 ferramentas de aplicação',
      'Bônus 1: Mini-glossário do básico que a IA espera',
      'Bônus 2: 10 sinais de que você está virando refém da IA',
      'Garantia incondicional de 7 dias',
    ],
    botao: 'Quero meu mapa de 1 página',
  },

  // Seção 13 — Garantia
  garantia: {
    titulo: 'Garantia',
    paragrafos: [
      'Garantia de 7 dias, sem pegadinha. Leia o guia, use o template, esboce a sua ideia. Se sentir que o material não te ajudou a enxergar a sua ideia com mais clareza, é só pedir o reembolso dentro de 7 dias e pronto. O risco é todo nosso. O comando começa com você.',
    ],
    botao: 'Quero começar no comando',
  },

  // Seção 12 (na ordem da página) — Quem criou + nossas criações (funde a antiga Prova Social)
  quemCriou: {
    titulo: 'Quem criou',
    paragrafos: [
      'Somos Helena e Júlio, criadores do Sistema Zero. Lá em casa, a gente também é o Casal Sistema Zero: cria sistema há mais de dez anos, em empresa grande e nos nossos próprios produtos, como o Cozya e o Agenda da Turma, além de jogos com os nossos filhos. Quando a IA virou febre, vimos muita gente boa, de todas as áreas, travando na hora de criar. Não por falta de capacidade, mas por tentar conversar com a IA sem entender o mínimo de como um sistema funciona. A gente passou por essa onda de outro jeito porque tinha o fundamento: sabia pensar fluxo, dado, regra, tela, usuário, segurança, teste e manutenção. Foi esse jeito de pensar que a gente organizou no método Z.E.R.O., pra devolver o comando pra quem está criando.',
      '(Helena e Júlio são desenvolvedores formados em Sistemas de Informação, com mais de dez anos criando sistemas em empresas como Banco do Brasil, Tractebel e InCeres.)',
    ],
    foto: {
      src: '/img/no-comando-da-ia/quem-criou.webp',
      alt: 'Helena e Júlio, o Casal Sistema Zero',
    },
    criacoesTitulo: 'Coisas que a gente já criou com esse mesmo jeito de pensar:',
    prints: [
      {
        src: '/img/no-comando-da-ia/print-cozya.webp',
        alt: 'Print do Cozya',
        legenda: 'Cozya: um organizador de receitas.',
      },
      {
        src: '/img/no-comando-da-ia/print-agenda-da-turma.webp',
        alt: 'Print do Agenda da Turma',
        legenda: 'Agenda da Turma: um organizador de tarefas escolares.',
      },
    ],
    criacoesFecho:
      'E esses não são todos. Mas o ponto é o mesmo: nenhum nasceu de mágica. Nasceram de clareza, método, teste, fundamento e uso esperto da tecnologia. É isso que a gente quer te passar já no primeiro passo.',
  },

  // Seção 15 — Perguntas rápidas (FAQ)
  faq: {
    titulo: 'Perguntas rápidas (FAQ)',
    itens: [
      {
        pergunta: 'Preciso saber programar?',
        resposta:
          'Não. Esse guia foi feito pra quem está começando ou veio de fora da área técnica. Você não precisa dominar programação, só estar disposto a entender o básico pra usar a IA com mais consciência.',
      },
      {
        pergunta: 'Vou sair com um sistema pronto?',
        resposta:
          'Não. Você sai com o primeiro passo certo: a sua ideia organizada num mapa de 1 página, o que evita começar errado e pedir código sem direção.',
      },
      {
        pergunta: 'Serve para app, site, sistema, automação ou jogo?',
        resposta:
          'Sim, desde que a ideia esteja num nível simples e inicial. O foco é organizar a lógica por trás do projeto.',
      },
      {
        pergunta: 'É sobre ChatGPT?',
        resposta:
          'Pode aplicar com ChatGPT, Claude, Gemini ou outra ferramenta. O que importa é aprender a pensar antes de pedir, seja qual for a ferramenta.',
      },
      {
        pergunta: 'Por que custa R$ 37?',
        resposta:
          'Porque é um produto de entrada, o primeiro passo do Sistema Zero de um jeito acessível, prático e direto.',
      },
    ] as FaqItem[],
    botao: 'Quero meu mapa de 1 página',
  },

  // Seção 16 — Oferta final
  ofertaFinal: {
    titulo: 'A IA fica mais poderosa. O comando precisa ser seu.',
    paragrafos: [
      'A IA está ficando cada vez mais poderosa. E quanto mais poderosa ela fica, mais perigoso é obedecer sem entender. Mais do que competir com a IA, o que vale é aprender a conduzir. Quem tem fundamento usa a IA como acelerador. Quem não tem vai de passageiro e deixa a ferramenta no volante. O No Comando da IA existe pra te tirar do banco do passageiro e botar a sua mão no volante.',
    ],
    botao: 'Quero pegar o volante',
  },
}

/**
 * Shape das seções da página de vendas. Todo funil que usa o template da `/oferta`
 * fornece um objeto deste formato em `FunnelContent.sales` (ver `src/funnels`).
 */
export type SalesSections = typeof SALES
