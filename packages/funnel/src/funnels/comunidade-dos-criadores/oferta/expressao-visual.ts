import type { ComunidadePage } from './types'

// Proposta aprovada em 16/10/2026: docs/marketing/kids/comunidade-dos-criadores/copy/
// proposta-melhoria-2026-10-16/c-expressao-visual.md (blocos comuns em blocos-comuns.md).
export const PAGE_C = {
  id: 'expressao-visual',
  label: 'Desenhar e criar personagens',
  seoTitle: 'Personagens e jogos para crianças | Comunidade dos Criadores | Sistema Zero',
  description:
    'Seu filho desenha personagens no Pinta e aprende a programar o que eles fazem num jogo: andar, pular, responder ao jogador. Para crianças de 9 a 14 anos.',
  emphasis: 'num jogo que ele mesmo programa',
  heroVisual: 'pinta',
  heroChip: 'Do desenho ao jogo',
  hero: {
    title:
      'Os personagens que seu filho desenha passam a correr, pular e fugir de inimigos num jogo que ele mesmo programa',
    description:
      'Um desenho guarda as escolhas que ele fez de forma e de cor. Num jogo, o personagem precisa fazer coisas: andar quando alguém aperta uma tecla, alcançar a plataforma, aparecer bem no cenário da fase. Ele aprende a programar essas regras com personagens prontos e, depois de A Chave do Farol, passa a desenhar os dele no Pinta e levá-los para o jogo.',
    benefits: [
      'Nas primeiras aulas, ele programa com personagens prontos e aprende as regras que fazem qualquer personagem se mexer.',
      'Depois de A Chave do Farol, o Pinta fica livre, e os desenhos dele entram nos jogos que ele monta.',
      'O jogo publicado ganha um link, e quem joga encontra o personagem que ele desenhou.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. Além de desenhar, ele aprende a programar as regras do jogo.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Ver o caminho do desenho ao jogo',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'c-interesse',
      title: 'Num desenho, ele decide como o personagem é; num jogo, decide também o que ele faz',
      eyebrow: 'O interesse que ele já tem',
      layout: 'story',
      visuals: ['pinta-vetor'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Você já viu o cuidado que seu filho coloca num personagem: a cor trocada três vezes, o formato dos olhos, o detalhe refeito até ficar como ele imaginou. Cada desenho guarda essas escolhas, mas todas são de aparência. Depois de pronto, o personagem fica do jeito que ele fez, parado na folha ou na tela.',
            'Num jogo, aparecem escolhas que o desenho nunca pediu: como esse personagem anda, o que acontece quando ele encosta numa moeda, se ele aparece bem no cenário da fase. Essas respostas vêm das regras do jogo, e as regras se montam com blocos de programação.',
            'Por isso, para uma criança que já inventa personagens, aprender a programar tem um motivo que ela enxerga: ver a própria criação obedecer ao jogador. E o desenho volta a ser escolha a cada teste, porque o personagem azul que some no fundo azul pede outra cor, e quem percebe isso é ele, jogando.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c-aula',
      title: 'Primeiro o personagem pronto obedece; depois chega a vez do personagem dele',
      eyebrow: 'Do personagem ao jogo',
      layout: 'story',
      visuals: ['preparados', 'aula-estudio', 'animacao', 'integracao'],
      groups: [
        {
          title: 'As regras com um personagem pronto',
          paragraphs: [
            'As primeiras aulas trazem personagens e cenários preparados, para seu filho aprender o que faz qualquer personagem andar, pular e responder a uma tecla. A primeira aula do curso abre com o jogo pronto, para ele saber aonde vai chegar.',
          ],
        },
        {
          title: 'Monta e testa',
          paragraphs: [
            'O vídeo mostra o passo ao lado do editor, e as falas do Zappy explicam o que fazer, com o botão Ouvir para escutar. Ele encaixa os blocos e aperta para jogar. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta.',
          ],
        },
        {
          title: 'Desenha o dele no Pinta',
          paragraphs: [
            'Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor e o Pinta fica livre. Ali ele desenha o personagem com cores, formas e camadas, e o desenho do caderno serve de modelo para a versão digital. Com quadros de animação, faz o braço mudar de posição entre uma imagem e outra, que é o movimento do desenho; fazer o personagem responder ao jogador continua sendo trabalho das regras.',
          ],
        },
        {
          title: 'Leva para o jogo e ajusta',
          paragraphs: [
            'No Estúdio, ele traz a arte do Pinta e testa. O personagem ficou grande demais para a plataforma, a cor sumiu no cenário: ele volta ao desenho, ajusta e joga de novo. O aviso Guardado na sua conta confirma que o projeto ficou salvo para continuar no outro dia.',
          ],
        },
        {
          title: null,
          paragraphs: [
            'Nas primeiras vezes, sentar junto ajuda a conhecer os botões; com o tempo, você acompanha menos.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c-mostrar',
      title: 'Quem joga o jogo dele encontra o personagem que ele desenhou',
      eyebrow: 'Uma criação para mostrar',
      layout: 'story',
      visuals: ['publicacao', 'clube'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Depois de publicado, o personagem que ele desenhou passa a correr pela fase na tela de outras pessoas, do jeito que ele programou.',
            'O jogo vai para o Mural dos Criadores com um link e um cartão com código QR. A avó abre no computador dela, repara num detalhe e pergunta como ele fez. Seu filho explica a cor que escolheu e a regra que faz o personagem pular, e às vezes sai dali com a ideia da próxima versão.',
            'No Clube, as conversas são sobre criações e ideias, e o desafio do mês da etapa dele propõe um tema para o próximo personagem.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c-relatos',
      title: 'Quando o jogo é dele, os personagens também são',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: [],
      groups: [
        {
          title: null,
          paragraphs: ['Alunos e pais contam, com as palavras deles, como foram as aulas.'],
        },
      ],
      falas: ['AV07', 'N18', 'AV06', 'AV03'],
      actions: [
        {
          label: 'Ver os planos da Comunidade',
          href: '#planos',
        },
      ],
    },
    {
      id: 'c-jornada',
      title: 'Cada etapa abre espaço para personagens maiores, até em três dimensões',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['pensa+zappy', 'molda'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Um personagem bem desenhado logo pede uma história: o que ele precisa alcançar, quem atrapalha o caminho, como a fase termina.',
          ],
        },
        {
          title: 'Inventor: o Pensa e a ajuda do Zappy no Estúdio',
          paragraphs: [
            'No posto Inventor, o Pensa conversa com seu filho sobre essas escolhas e organiza as respostas em tarefas para ele construir. No Estúdio, a ajuda do Zappy examina os blocos e o erro e explica o que conferir, mas quem ajusta e testa é ele. Os dois usam os créditos de inteligência artificial da família.',
          ],
        },
        {
          title: 'Explorador de Mundos: o Molda',
          paragraphs: [
            'Mais adiante, o Molda leva os personagens para as três dimensões: em vez de uma figura plana, um boneco de blocos que ele monta por todos os lados.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c-acompanha',
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
            'Quando ele mostra o personagem dentro do jogo, conta por que escolheu aquela cor, o que ajustou no tamanho e como fez o personagem andar. Você conhece decisões que a imagem pronta sozinha nunca mostraria. E se você tem dois filhos, um pode passar a tarde no Pinta enquanto o outro monta as regras de um jogo, cada um no próprio perfil.',
            'Uma etapa concluída diz que ele cumpriu o pedido da aula; a explicação dele diz o que entendeu. Os dois juntos contam muito mais do que o tempo que ele passou conectado.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'c-alternativas',
      title:
        'Uma aula de desenho ensina o traço; aqui o personagem também precisa funcionar num jogo',
      eyebrow: 'Antes de escolher',
      layout: 'cards',
      visuals: [],
      groups: [
        {
          title: 'Aula de desenho',
          paragraphs: [
            'Uma boa aula de desenho ensina traço, proporção e técnica, e para quem quer só desenhar é o caminho certo. Aqui o desenho é digital e serve a um jogo: seu filho cria o personagem, programa o que ele faz e testa se ficou como queria.',
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
      actions: [],
    },
  ],
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Desenho e programação',
      questions: [
        'so-desenho',
        'papel',
        'desenho',
        'programacao',
        'nivel',
        'aulas-gravadas',
        'ao-vivo',
        'pais',
        'equipamento',
      ],
    },
    {
      title: 'Ferramentas e inteligência artificial',
      questions: ['liberacao', 'catalogo', 'ia', 'creditos', 'avancado', 'certificado'],
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
    title: 'O personagem que hoje mora no caderno pode estar num jogo que a família inteira joga',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Imagine seu filho mostrando o desenho, abrindo o jogo e apertando a tecla: o personagem anda do jeito que ele programou. Você reconhece a cor que ele escolheu e entende a regra que ele montou.',
          'Escolham o plano e abram juntos a primeira aula. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para meu filho',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
