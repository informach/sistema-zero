import type { ComunidadePage } from './types'

// Página padrão (tráfego misto e frio). Proposta aprovada em 16/10/2026:
// docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/a-tempo-de-tela.md.
export const PAGE_A = {
  id: 'tempo-de-tela',
  label: 'Aprender criando',
  seoTitle: 'Aprender criando jogos no tempo de tela | Comunidade dos Criadores | Sistema Zero',
  description:
    'Uma parte do tempo de tela vira um jogo que seu filho programa, com aulas guiadas, teste na hora e um projeto para mostrar à família. De 9 a 14 anos.',
  emphasis: 'o jogo que ele mesmo programou',
  heroVisual: 'aula',
  heroChip: 'Aprender criando',
  hero: {
    title: 'Uma parte do tempo de tela do seu filho vira o jogo que ele mesmo programou',
    description:
      'Nos vídeos e nos jogos prontos, alguém já tomou todas as decisões, e ele só escolhe o que vem em seguida. Criando um jogo, as decisões passam para ele: quanto o personagem pula, quantos pontos vale cada estrela, quando a fase termina. A aula mostra o passo, ele monta, aperta para testar e vê o jogo responder.',
    benefits: [
      'Ele começa jogando o jogo pronto e, em A Chave do Farol, termina com a versão dele publicada e um link para mostrar.',
      'Depois de A Chave do Farol, o Estúdio e o Pinta ficam livres para ele desenhar personagens e inventar fases.',
      'Você não precisa saber programar: basta pedir “me mostra o que você mudou” e jogar junto.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos que leem com autonomia. No navegador do computador, com internet, mouse e teclado.',
    primary: {
      label: 'Ver os planos para minha família',
      href: '#planos',
    },
    secondary: {
      label: 'Ver uma aula por dentro',
      href: '#experiencia',
    },
  },
  // A tese vem antes das telas da plataforma.
  tourAfterSection: 'a02',
  sections: [
    {
      id: 'a02',
      title: 'No jogo pronto, cada decisão já foi tomada por outra pessoa',
      eyebrow: 'O que muda na tela',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Pense na última hora que seu filho passou no computador. Ele escolheu um vídeo, depois outro, entrou numa partida e jogou do jeito que o jogo deixa. Foi divertido, e é justo que seja. Só que, em todo esse tempo, quem decidiu a velocidade do personagem, o que vale ponto e quando a fase acaba foi quem fez o jogo. Por isso, depois de uma tarde de tela, quase nunca existe alguma coisa dele para mostrar.',
            'Quando ele cria um jogo, essas decisões passam para ele. Ele entra no bastidor do jogo, nas regras que dizem quanto o personagem pula e o que acontece quando ele encosta numa moeda. E cada decisão é testada na hora, porque ele aperta para jogar e o jogo obedece, ou não. É comparando o que mandou fazer com o que aconteceu que ele aprende.',
            'Os combinados de tela continuam sendo de vocês. O que muda é o papel dele numa parte desse tempo.',
          ],
        },
      ],
      falas: ['AV12', 'N2'],
      actions: [],
    },
    {
      // Segunda seção: o template põe aqui a âncora `#experiencia` do botão do herói.
      id: 'a03',
      title: 'Na primeira aula, ele joga o jogo pronto antes de montar o dele',
      eyebrow: 'Uma aula por dentro',
      layout: 'story',
      visuals: ['jogo-pronto', 'aula-estudio', 'estudio', 'salvamento'],
      groups: [
        {
          title: 'Primeiro ele joga',
          paragraphs: [
            'A primeira aula do curso abre com o jogo terminado, para seu filho saber aonde vai chegar e ter vontade de chegar lá.',
          ],
        },
        {
          title: 'Depois monta, um passo de cada vez',
          paragraphs: [
            'O vídeo mostra o passo ao lado do editor. Ele pausa, encaixa os blocos e segue. As falas do Zappy explicam o que fazer, e o botão Ouvir lê em voz alta.',
          ],
        },
        {
          title: 'Então testa',
          paragraphs: [
            'Aperta para jogar e confere: o personagem alcançou a estrela e o placar subiu um ponto. Se não subiu, volta ao trecho do vídeo. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta; nos experimentos, Uma pista indica onde olhar.',
          ],
        },
        {
          title: 'E guarda para amanhã',
          paragraphs: [
            'O aviso Guardado na sua conta confirma que o projeto ficou salvo, e a faixa O que falta para seguir mostra o próximo passo. No outro dia, ele abre e continua de onde parou.',
          ],
        },
        {
          title: null,
          paragraphs: [
            'A aula foi feita para a criança seguir com o que está na tela, e nas primeiras vezes sentar junto ajuda a conhecer os botões. No fim da sessão, ele tem uma regra que funciona para mostrar a alguém.',
          ],
        },
      ],
      falas: ['N9'],
      actions: [],
    },
    {
      id: 'a10',
      title: 'Depois da aula, é ele quem chama para mostrar o jogo',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: ['publicacao'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Quando o jogo fica pronto, ele publica no Mural e ganha um link e um cartão com código QR para mandar à avó, ao primo ou ao amigo da escola.',
            'É nessa hora que aparece o pedido mais gostoso de ouvir: “vem ver o que eu fiz”. Alunos e pais contam, com as palavras deles, como foi.',
          ],
        },
      ],
      falas: ['AV03', 'N1', 'N15', 'N12'],
      actions: [],
    },
    {
      id: 'a06',
      title: 'Cada criança entra por um lado: a regra, o personagem ou a curiosidade',
      eyebrow: 'Do jeito dele',
      layout: 'cards',
      visuals: ['preparados', 'pinta', 'contador'],
      groups: [
        {
          title: 'Para quem gosta de inventar jogos',
          paragraphs: [
            'Começa com personagens prontos e põe a atenção no que faz o jogo funcionar: andar, pular, somar ponto. Com o Estúdio livre, volta ao projeto e mistura as regras do jeito dele.',
          ],
        },
        {
          title: 'Para quem vive desenhando',
          paragraphs: [
            'No Pinta, desenha o personagem, escolhe as cores e monta o cenário, e depois leva tudo para o jogo. Se o personagem some no fundo azul, ele volta ao desenho, troca a cor e confere de novo.',
          ],
        },
        {
          title: 'Para quem quer saber como as coisas funcionam',
          paragraphs: [
            'Descobre que atrás de cada tecla existe uma instrução: quando apertar a seta, ande; quando encostar na moeda, some um ponto. Prever, testar e conferir é o primeiro passo da programação.',
          ],
        },
      ],
      actions: [
        {
          label: 'Ver os planos da Comunidade',
          href: '#planos',
        },
      ],
    },
    {
      id: 'a07',
      title: 'Os projetos que ele termina vão abrindo ferramentas novas',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['pensa', 'jornada'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Na Comunidade, a criança avança como num jogo: os projetos concluídos fazem ela subir de posto na Jornada do Criador, e os postos abrem ferramentas. Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para as ideias dela, fora das aulas.',
            'No posto Inventor chegam o Pensa, que conversa sobre a ideia de um jogo e organiza as escolhas em tarefas, e a ajuda do Zappy no Estúdio, que olha os blocos e explica o que conferir sem mexer no projeto. Os dois usam os créditos de inteligência artificial da família. No Explorador de Mundos, o Molda abre a criação em três dimensões.',
            'Para ele, a próxima ferramenta é um bom motivo para terminar o projeto. Para você, a Jornada mostra em que ponto ele está e o que vem depois, numa tela só.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a05',
      title: 'Você não precisa saber programar para entender o que ele fez',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A programação está nas aulas. O seu papel é outro: combinar o horário, abrir a primeira aula junto e, depois, pedir para ver o jogo.',
            'Na sua área, cada filho tem um painel com os cursos, as atividades, as entregas, os temas que estudou e o ponto da Jornada. Dali você escolhe um projeto e faz a pergunta que abre a conversa: “Me mostra o que você mudou.” Ele aponta o bloco, joga e explica. Você entende o que ele aprendeu pelo que ele mostra, e passa a fazer parte de um assunto que antes era só dele.',
            'Uma etapa concluída diz que ele cumpriu o pedido da aula; a explicação dele diz o que entendeu. Os dois juntos contam muito mais do que o tempo que ele passou conectado.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'a09',
      title: 'O tutorial ensina o passo; o difícil é saber o que fazer quando o jogo não obedece',
      eyebrow: 'Antes de escolher',
      layout: 'cards',
      visuals: [],
      groups: [
        {
          title: 'Construir dentro de um jogo',
          paragraphs: [
            'Montar mundos no Minecraft ou no Roblox já é criação, e muita criança começa por aí. Só que a gravidade, os pontos e o fim da partida continuam sendo do jogo. Aqui é ele quem escreve essas regras.',
          ],
        },
        {
          title: 'Vídeo gratuito na internet',
          paragraphs: [
            'Há bons tutoriais, muitos em inglês e cada um num ponto diferente. Funcionam para quem já sabe o que procurar. O problema aparece no primeiro erro: o vídeo segue e a criança fica sem saber onde olhar. Aqui a explicação está na mesma tela do editor e, nas partes que têm verificação, o botão Verificar esta parte mostra o que falta.',
          ],
        },
        {
          title: 'Aula ao vivo',
          paragraphs: [
            'O professor explica na hora, no horário marcado e no ritmo da turma, e para quem precisa de alguém ao lado isso pesa a favor. Aqui a explicação é gravada: espera por ele, repete o trecho quantas vezes ele precisar e cabe no horário que vocês escolherem.',
          ],
        },
      ],
      falas: ['N14'],
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Rotina e tela',
      questions: ['telas', 'frequencia', 'salvamento', 'interesse'],
    },
    {
      title: 'Para começar',
      questions: [
        'programacao',
        'desenho',
        'pais',
        'aulas-gravadas',
        'ao-vivo',
        'equipamento',
        'nivel',
      ],
    },
    {
      title: 'Ferramentas e inteligência artificial',
      questions: ['liberacao', 'catalogo', 'ia', 'creditos', 'avancado', 'certificado'],
    },
    {
      title: 'Família e segurança',
      questions: ['irmaos', 'perfil', 'convivencia', 'apoio-especifico'],
    },
    {
      title: 'Assinatura',
      questions: ['ajuda', 'custos', 'cancelamento', 'reembolso', 'atendimento'],
    },
  ],
  closing: {
    id: 'convite',
    title: 'A próxima hora no computador pode ser o começo de um jogo dele',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Escolham um dia da semana, sentem juntos na primeira aula e deixem que ele jogue o jogo pronto antes de montar o dele.',
          'No fim da sessão, o aviso Guardado na sua conta confirma que o projeto ficou salvo, e no dia seguinte ele continua de onde parou. Quando o jogo estiver pronto, quem vai chamar para jogar é ele. E se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para minha família',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
