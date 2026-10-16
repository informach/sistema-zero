import { FOUNDER_SEM_RELATO } from './shared'
import type { ComunidadePage } from './types'

// Proposta aprovada em 16/10/2026: docs/marketing/kids/comunidade-dos-criadores/copy/
// proposta-melhoria-2026-10-16/b-criacao-de-jogos.md (blocos comuns em blocos-comuns.md).
export const PAGE_B = {
  id: 'criacao-de-jogos',
  label: 'Criar os próprios jogos',
  seoTitle: 'Criar jogos para crianças | Comunidade dos Criadores | Sistema Zero',
  description:
    'Seu filho aprende a fazer os próprios jogos: joga o projeto pronto, monta cada regra em blocos, testa e publica com um link para os amigos. De 9 a 14 anos.',
  emphasis: 'aprende a fazer os dele',
  heroVisual: 'estudio',
  heroChip: 'Fazer os próprios jogos',
  hero: {
    title: 'Seu filho conhece de cor os jogos que joga, e aqui ele aprende a fazer os dele',
    description:
      'Entre a ideia que ele conta empolgado e um jogo que funciona, existem decisões que ninguém ensinou: qual comando faz o personagem pular, onde esse comando entra, como saber se deu certo. O primeiro projeto ensina essas decisões uma de cada vez, começando por uma partida no jogo pronto, para ele saber aonde vai chegar.',
    benefits: [
      'O jogo de A Chave do Farol termina publicado, com um link que ele manda para quem quiser jogar.',
      'Publicado esse jogo, o Estúdio e o Pinta ficam livres para ele inventar personagens, fases e regras.',
      'Você joga o que ele fez e entende cada escolha, porque ele mostra o bloco que mudou.',
    ],
    requirements:
      'Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado.',
    primary: {
      label: 'Ver os planos para meu filho',
      href: '#planos',
    },
    secondary: {
      label: 'Ver como ele monta o primeiro jogo',
      href: '#experiencia',
    },
  },
  sections: [
    {
      id: 'b-ideia',
      title: 'A ideia ele já tem; o que trava são as decisões que jogar nunca exigiu',
      eyebrow: 'Da ideia ao jogo',
      layout: 'story',
      visuals: ['preparados'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Seu filho já contou como seria a fase, qual poder o personagem teria e que obstáculo colocaria no caminho. A ideia tem graça para ele. Só que, na hora de construir, aparecem perguntas que nenhuma partida fez: que comando faz o personagem pular, onde esse comando entra, o que acontece quando ele encosta na moeda.',
            'Essas respostas são o bastidor do jogo, as regras que dizem quanto o personagem pula e quando a fase termina. Quem só joga recebe tudo isso pronto. Por isso, se ele já tentou construir sozinho, talvez tenha parado justamente aí: o personagem não obedece e não fica claro onde olhar.',
            'O caminho é aprender uma decisão de cada vez, com um resultado para ver em cada uma. Primeiro o movimento, depois o salto, depois o ponto. A cada passo, ele aperta para jogar e confere se o personagem fez o que ele mandou. Aos poucos, as ideias que ele conta começam a aparecer na tela.',
            'E ninguém precisa largar o videogame por isso. O pai do Jeffrey conta como é na casa deles.',
          ],
        },
      ],
      falas: ['N13'],
      actions: [],
    },
    {
      id: 'b-aula',
      title: 'Antes de montar qualquer bloco, ele joga a partida que vai construir',
      eyebrow: 'Um começo guiado',
      layout: 'story',
      visuals: ['jogo-pronto', 'aula-estudio', 'pausa', 'salvamento'],
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
            'O vídeo mostra o passo ao lado do editor. Ele pausa, encaixa os blocos e segue. As falas do Zappy explicam o que fazer, e o botão Ouvir lê em voz alta. Os personagens e os sons já vêm prontos, então a atenção dele fica no que importa nesse começo: fazer o jogo funcionar.',
          ],
        },
        {
          title: 'Então testa',
          paragraphs: [
            'Aperta para jogar e vê se o personagem alcançou a plataforma. Se ficou curto, ele volta ao trecho do vídeo e confere o bloco do salto. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta; nos experimentos, Uma pista indica onde olhar.',
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
            'A aula foi feita para a criança seguir com o que está na tela. Nas primeiras vezes, sentar junto ajuda a conhecer os botões; com o tempo, você acompanha menos.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b-mudanca',
      title: 'A primeira regra que ele muda é o primeiro pedaço do jogo que é só dele',
      eyebrow: 'A primeira mudança',
      layout: 'story',
      visuals: ['regra'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Imagine a fase em que cada estrela vale um ponto. Seu filho troca o valor para cinco, joga de novo e vê o placar disparar. Então decide se gostou ou se o jogo ficou fácil demais, e muda outra vez.',
            'Para fazer essa mudança de propósito, ele precisa entender o que aquele bloco faz, e é nesse momento que ele passa a decidir o que o jogo faz. As atividades que deixam um valor aberto para ele mexer existem para isso: a montagem guiada mostra como funciona, e a mudança mostra se ele entendeu.',
            'Você percebe a diferença quando ele chama para jogar as duas versões e explica por que prefere uma delas. E a conversa sobre jogos ganha um assunto novo: uma escolha que ele fez.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b-mostrar',
      title: 'O jogo publicado vira um convite, e do outro lado alguém joga o que ele fez',
      eyebrow: 'Uma criação para mostrar',
      layout: 'story',
      visuals: ['publicacao', 'clube'],
      groups: [
        {
          title: null,
          paragraphs: [
            'Publicar dá ao seu filho uma coisa que jogar nunca deu: outra pessoa jogando o que ele construiu.',
            'Quando publica, o jogo ganha um lugar no Mural dos Criadores, um link e um cartão com código QR. Ele manda para o primo, para a avó, para o amigo da escola, e quem joga às vezes comenta: a fase ficou difícil, o pulo está curto, o inimigo é rápido demais. Ele volta ao Estúdio com um motivo para a próxima versão, que agora tem plateia.',
            'No Clube, as conversas são sobre projetos e ideias, e o desafio do mês da etapa dele propõe um tema para o jogo seguinte.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b-relatos',
      title: 'O primeiro jogo vira link, ideia nova e vontade de fazer outro',
      eyebrow: 'O que contam sobre as aulas',
      layout: 'relatos',
      visuals: [],
      groups: [
        {
          title: null,
          paragraphs: ['Alunos e pais contam, com as palavras deles, como foram as aulas.'],
        },
      ],
      falas: ['AV02', 'AV11', 'N18', 'AV04'],
      actions: [
        {
          label: 'Ver os planos para meu filho começar',
          href: '#planos',
        },
      ],
    },
    {
      id: 'b-jornada',
      title: 'Depois de A Chave do Farol, cada etapa entrega uma ferramenta nova',
      eyebrow: 'Jornada do Criador',
      layout: 'journey',
      visuals: ['integracao', 'pensa+zappy', 'molda'],
      groups: [
        {
          title: 'Construtor: o Estúdio e o Pinta ficam livres',
          paragraphs: [
            'Quando conclui A Chave do Farol e publica o jogo, seu filho chega ao posto Construtor. O Estúdio e o Pinta ficam abertos para as ideias dele: abre um projeto em branco, desenha no Pinta a criatura que inventou, leva para o jogo e escreve as regras que ela segue. Se ela some no cenário, volta à arte, troca a cor e testa de novo.',
          ],
        },
        {
          title: 'Inventor: planejar com o Pensa e investigar com a ajuda do Zappy',
          paragraphs: [
            'Jogo maior pede plano. No posto Inventor, o Pensa conversa com ele sobre o jogo que quer fazer, como o do gato que recolhe estrelas: como o gato anda, o que conta como vitória, quando a fase acaba. Depois organiza as respostas em tarefas. No Estúdio, a ajuda do Zappy examina os blocos e o erro e explica o que conferir, mas quem ajusta e testa é ele. Os dois usam os créditos de inteligência artificial da família.',
          ],
        },
        {
          title: 'Explorador de Mundos: o Molda',
          paragraphs: ['Mais adiante, o Molda abre a criação em três dimensões.'],
        },
      ],
      falas: ['N16'],
      actions: [],
    },
    {
      id: 'b-acompanha',
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
            'Nas aulas, ele encontra conceitos de programação dentro do jogo: a tecla que dispara um movimento, a condição que soma o ponto, a instrução que se repete. Quando ele explica a regra que montou, você está ouvindo esses conceitos com as palavras dele.',
            'Uma etapa concluída diz que ele cumpriu o pedido da aula; a explicação dele diz o que entendeu. Os dois juntos contam muito mais do que o tempo que ele passou conectado.',
          ],
        },
      ],
      actions: [],
    },
    {
      id: 'b-alternativas',
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
  founder: FOUNDER_SEM_RELATO,
  faqTitle: 'Mais sobre a experiência do seu filho',
  faqGroups: [
    {
      title: 'Para começar a criar jogos',
      questions: [
        'roblox',
        'programacao',
        'nivel',
        'desafio',
        'aulas-gravadas',
        'ao-vivo',
        'pais',
        'desenho',
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
    title: 'A próxima partida em casa pode ser num jogo feito por ele',
    eyebrow: 'Para começar juntos',
    layout: 'band',
    visuals: [],
    groups: [
      {
        title: null,
        paragraphs: [
          'Esta noite, ele abre a primeira aula, joga a partida pronta e começa a montar a primeira parte. Quando o projeto estiver publicado, é ele quem manda o link e pede para você jogar.',
          'Escolham o plano. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.',
        ],
      },
    ],
    actions: [
      {
        label: 'Escolher um plano para meu filho criar',
        href: '#planos',
      },
    ],
  },
} satisfies ComunidadePage
