import type { ComunidadePage } from './types'

// Proposta aprovada em 16/10/2026: docs/marketing/kids/comunidade-dos-criadores/copy/
// proposta-melhoria-2026-10-16/d-formacao-tecnologica.md (com os blocos comuns da mesma pasta).
export const PAGE_D = {
  id: 'formacao-tecnologica',
  label: 'Aprender programação',
  seoTitle: 'Programação para crianças com jogos | Comunidade dos Criadores | Sistema Zero',
  description:
    'Seu filho de 9 a 14 anos aprende programação usando cada comando num jogo que ele constrói, com explicação ao lado do editor e teste na hora.',
  emphasis: 'no jogo que ele constrói',
  heroVisual: 'aprendizagem',
  heroChip: 'Programação na prática',
  hero: {
    title: 'Seu filho aprende programação vendo cada comando funcionar no jogo que ele constrói',
    description:
      'Um comando decorado numa lista é só uma palavra. Quando o mesmo comando faz o personagem pular, seu filho entende para que ele serve, porque montou, testou e viu o resultado. As aulas apresentam os conceitos um de cada vez; ele aplica no projeto, confere na hora e, no fim, consegue explicar a você a regra que montou.',
    benefits: [
      'Evento, condição e repetição aparecem no funcionamento do jogo: a tecla que move, o ponto que soma, a ação que se repete.',
      'Depois de A Chave do Farol, o Estúdio e o Pinta ficam livres para ele aplicar o que aprendeu nas ideias dele.',
      'Você acompanha na sua área o que ele estudou e ouve dele a explicação da regra que montou.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos, no navegador do computador, com internet, mouse e teclado. Uma iniciação em programação por projetos, complementar à escola.',
    primary: {
      label: 'Ver os planos',
      href: '#planos',
    },
    secondary: {
      label: 'Ver uma aula por dentro',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'd-uso',
      title: 'O comando faz sentido no momento em que muda alguma coisa na tela',
      eyebrow: 'Aprender usando',
      layout: 'story',
      visuals: ['contador'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Quando você procura uma atividade de programação, quer saber o que seu filho vai aprender e se aquilo vai ficar. Fica o que teve uso: o comando que faz o personagem andar quando ele aperta a seta vira uma ferramenta que ele sabe para que serve.',
            'Por isso cada aula parte de um jogo. Num jogo de achar personagens escondidos, um contador soma um a cada descoberta; em outro, uma instrução responde a uma tecla; em outro, uma ação se repete a cada volta. Seu filho encontra evento, condição e repetição no comportamento daquilo que está construindo, e o nome técnico chega depois, quando ele já viu o efeito.',
            'E a prova de que entendeu aparece do mesmo jeito. Ele muda o valor, diz o que acha que vai acontecer, joga e confere. Se acertou a previsão, entendeu a regra; se errou, a diferença entre o que previu e o que viu aponta o bloco a revisar. Você vê o aprendizado acontecendo na frente do computador, e não só pela marca de aula concluída.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd-aula',
      title: 'Na primeira aula, ele joga o jogo pronto antes de montar o dele',
      eyebrow: 'Uma aula por dentro',
      layout: 'story',
      visuals: ['jogo-pronto', 'aula-estudio', 'regra', 'salvamento'],
      groups: [
        {
          title: null,
          paragraphs: ['Cada curso começa por esse caminho, com a orientação na própria tela.'],
        },
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
            'Aperta para jogar e vê se a estrela soma o ponto que ele programou. Se não somou, volta ao trecho do vídeo. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta; nos experimentos, Uma pista indica onde olhar.',
          ],
        },
        {
          title: 'E guarda para amanhã',
          paragraphs: [
            'O aviso Guardado na sua conta confirma que o projeto ficou salvo, e a faixa O que falta para seguir mostra o próximo passo. No outro dia, ele abre e continua de onde parou.',
            'A aula foi feita para a criança seguir com o que está na tela, e nas primeiras vezes sentar junto ajuda a conhecer os botões.',
          ],
        },
        {
          title: 'O que ele leva de cada aula',
          paragraphs: [
            'Movimento, posição, eventos, condições, repetição e contadores aparecem ao longo dos cursos. Nem toda aula traz um comando novo: algumas pedem para usar o que ele já conhece num jogo diferente, e é usando de novo que o conceito fica dele.',
          ],
        },
      ],
      falas: ['AV10'],
      actions: [],
    },
    {
      id: 'd-ferramentas',
      title: 'Cada ferramenta cuida de uma parte do trabalho de quem faz um jogo',
      eyebrow: 'Cinco ferramentas',
      layout: 'tools',
      visuals: ['estudio', 'pinta', 'pensa', 'zappy', 'molda'],
      groups: [
        {
          title: 'Estúdio: montar a regra e conferir o efeito',
          paragraphs: [
            'Ele encaixa os blocos, executa e compara o que pediu com o que aconteceu. Quando não bate, revisa uma parte por vez, que é como um programador trabalha todo dia.',
          ],
        },
        {
          title: 'Pinta: desenhar o que entra no jogo',
          paragraphs: [
            'O personagem criado no Pinta vai para o projeto, e lá a aparência também passa por teste: o tamanho, a cor, o contraste com o cenário.',
          ],
        },
        {
          title: 'Pensa: dividir uma ideia grande em partes',
          paragraphs: [
            'Antes de montar, o Pensa conversa sobre o objetivo do jogador, os controles e quando a partida termina, e transforma as escolhas dele em tarefas. Quebrar um problema em partes menores é uma das primeiras coisas que se aprende em programação, e aqui ela tem um jogo de verdade como motivo.',
          ],
        },
        {
          title: 'Zappy: ajuda para investigar um erro',
          paragraphs: [
            'A ajuda do Zappy no Estúdio lê os blocos e o erro e explica o que conferir, mas não mexe no projeto: quem corrige e testa é a criança. Aprender a usar a inteligência artificial conferindo a resposta também faz parte dessa formação. O Pensa e a ajuda do Zappy no Estúdio abrem no posto Inventor e usam os créditos de inteligência artificial da família.',
          ],
        },
        {
          title: 'Molda: criar em três dimensões',
          paragraphs: [
            'No posto Explorador de Mundos chega o Molda, a oficina 3D, que produz os modelos usados nos jogos 3D do Estúdio.',
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
      id: 'd-jornada',
      title: 'Dos primeiros blocos até o código escrito, uma sequência que mostra onde ele está',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['codigo', 'jornada', 'catalogo'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Uma formação precisa de ordem, e a Jornada do Criador é essa ordem. Ela mostra os cursos em sequência, o posto em que seu filho está e o que falta para o próximo. Hoje, os projetos seguem esta ordem: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito, Corre, Dino e os próximos.',
            'O primeiro marco é concluir A Chave do Farol e publicar o jogo. Aí ele chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para aplicar o que aprendeu em ideias dele. No Inventor chegam o Pensa e a ajuda do Zappy no Estúdio; no Explorador de Mundos, o Molda. Lá na frente, no Gênio da Criação, o modo Ponte mostra os blocos lado a lado com o código escrito, e na Lenda ele programa em código puro.',
            'Os cursos novos entram na assinatura assim que saem, sem custo extra. Para a criança, cada posto é uma conquista que ela vê no mapa; para você, é um jeito simples de saber em que ponto da formação ela está.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'd-relatos',
      title: 'O que pais e alunos contam sobre raciocínio e autonomia',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: [],
      groups: [
        {
          title: null,
          paragraphs: ['Alunos e pais contam, com as palavras deles, como foram as aulas.'],
        },
      ],
      falas: ['AV08', 'N5', 'N17', 'N8'],
      actions: [],
    },
    {
      id: 'd-acompanha',
      title: 'Você não precisa saber programar para entender o que ele fez',
      eyebrow: 'Você acompanha',
      layout: 'story',
      visuals: ['responsavel', 'aprendizagem', 'certificado'],
      groups: [
        {
          title: null,
          paragraphs: [
            'A programação está nas aulas. O seu papel é outro: combinar o horário, abrir a primeira aula junto e, depois, pedir para ver o jogo.',
            'Na sua área, cada filho tem um painel com os cursos, as atividades, as entregas, os temas que estudou e o ponto da Jornada. Dali você escolhe um projeto e faz a pergunta que abre a conversa: “Me mostra o que você mudou.” Ele aponta o bloco, joga e explica. Você entende o que ele aprendeu pelo que ele mostra, e passa a fazer parte de um assunto que antes era só dele.',
            'Os cursos que têm certificado entregam o documento de conclusão, que registra a etapa cumprida. A explicação dele mostra o que entendeu, e as duas coisas juntas contam muito mais do que o tempo que ele passou conectado.',
          ],
        },
      ],
      falas: ['AV09'],
      actions: [],
    },
    {
      id: 'd-alternativas',
      title: 'O tutorial ensina o passo; o difícil é saber o que fazer quando o jogo não obedece',
      eyebrow: 'Antes de escolher',
      layout: 'cards',
      visuals: [],
      groups: [
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
            'Se o que pesa para vocês é um professor corrigindo na hora, em horário marcado, a aula ao vivo atende melhor esse critério. Se pesa a criança aprender a usar a explicação, testar e conferir o próprio trabalho, este formato foi desenhado exatamente para isso.',
          ],
        },
        {
          title: 'Construir dentro de um jogo',
          paragraphs: [
            'Montar mundos no Minecraft ou no Roblox já é criação, e muita criança começa por aí. Só que a gravidade, os pontos e o fim da partida continuam sendo do jogo. Aqui é ele quem escreve essas regras.',
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
      title: 'Ferramentas e inteligência artificial',
      questions: ['avancado', 'certificado', 'liberacao', 'catalogo', 'ia', 'creditos'],
    },
    {
      title: 'Para começar',
      questions: [
        'nivel',
        'ao-vivo',
        'programacao',
        'desenho',
        'pais',
        'aulas-gravadas',
        'equipamento',
      ],
    },
    {
      title: 'Rotina e tela',
      questions: ['telas', 'frequencia', 'salvamento', 'interesse'],
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
    title: 'A primeira regra que ele montar já vem com um motivo e um resultado para mostrar',
    eyebrow: 'Para começar',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Abram juntos a primeira aula. Ele joga o jogo pronto, monta o primeiro comando e aperta para testar, e quando o personagem obedecer, peça para ele contar o que mudou e por quê.',
          'É a primeira explicação de muitas que você vai ouvir. E se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para ele começar',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
