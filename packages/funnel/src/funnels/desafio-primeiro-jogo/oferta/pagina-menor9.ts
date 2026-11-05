import type { RelatoId } from '../../comunidade-dos-criadores/oferta/types'

// Página do Desafio do Primeiro Jogo para crianças menores de 9 anos, criando junto com um adulto
// (proposta revisada aprovada em 05/11/2026, quadro DesafioMenor9 com o review aplicado). A criança é "seu
// filho" e "ele", como na página de 9 a 17 (a página serve a meninos e meninas). Preço só por
// marcador ({{preco}}, {{preco_dia}}), preenchido pelo corpo a partir do catálogo.

export const PAGINA_DESAFIO_MENOR9 = {
  seoTitle: 'Desafio para criar junto: habilidades para a vida | Sistema Zero',
  description:
    'Um treinamento para praticar escolhas, tentativas e comunicação com seu filho. Vocês criam A Chave do Farol com programação em blocos e orientação. Menores de 9 anos, acompanhados.',
  capa: 'desafio-primeiro-jogo/farol-capa.webp',
  cta: 'Quero começar com meu filho',
  condicoes: '{{preco}}, pagamento único · 30 dias de acesso · 7 dias de garantia',
  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      src: 'comunidade-dos-criadores/logo-kids-claro.svg',
      width: 286,
      height: 22,
      alt: 'Sistema Zero Kids',
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      {
        href: '#sessao',
        label: 'Como acontece',
      },
      {
        href: '#papel',
        label: 'Como participar',
      },
    ],
    cta: 'Conhecer o treinamento',
  },
  heroi: {
    selo: 'Habilidades para a vida · menores de 9, com um responsável',
    titulo: 'Comece a construir a autonomia do seu filho nas pequenas escolhas do dia a dia.',
    enfase: 'nas pequenas escolhas do dia a dia.',
    texto:
      'Desenvolver habilidades fica mais significativo quando seu filho pode praticá-las em algo que desperta seu interesse. No Desafio do Primeiro Jogo, vocês criam uma aventura juntos: ele faz escolhas, experimenta e comunica ideias de forma lúdica, com orientação e sua companhia.',
    beneficios: [
      'Uma tarefa de cada vez, com a sua companhia',
      'Escolhas que a criança pode fazer, apontar ou explicar',
      'Um projeto para mostrar e reconhecer o que conseguiu',
    ],
    ilustracao: {
      src: 'kids-aprender-criando/criar-juntos.webp',
      width: 1402,
      height: 1122,
      alt: 'Debinha explica uma ideia no computador, com Dedé e Zappy acompanhando; ilustração da experiência de criar junto.',
    },
    balao: 'Vamos descobrir um passo de cada vez.',
    zappy: {
      src: 'comunidade-dos-criadores/zappy-fala.webp',
      width: 360,
      height: 458,
      alt: '',
    },
  },
  problema: {
    titulo:
      'Você quer que ele participe, faça escolhas e encontre um jeito de contar o que precisa.',
    texto:
      'Isso aparece ao guardar os materiais, começar uma atividade da escola ou tentar uma brincadeira nova. A autonomia vai sendo exercitada nessas pequenas situações, com ajuda conforme a necessidade da criança. No Sistema Zero, usamos uma aventura para criar oportunidades de observar, escolher, testar e conversar com você.',
    so: {
      titulo: 'Uma intenção que faz sentido',
      texto:
        'O barco precisa da luz do farol para chegar à costa. Vocês conhecem a missão, escolhem um primeiro passo e combinam o que vão experimentar.',
      imagem: {
        src: 'kids-aprender-criando/planejar-caminho.webp',
        width: 1536,
        height: 1024,
        alt: 'Debinha, Dedé e Zappy planejam um caminho até o farol; ilustração sobre pensar antes de agir.',
      },
    },
    junto: {
      titulo: 'Uma escolha que tem efeito',
      texto:
        'Seu filho escolhe um lugar para a chave e vê onde ela aparece. Pode apontar outro lugar, testar com sua ajuda e acompanhar o que mudou.',
      imagem: {
        src: 'kids-aprender-criando/testar-com-apoio.webp',
        width: 1536,
        height: 1024,
        alt: 'Debinha testa uma ideia no computador com a companhia de Dedé e Zappy; ilustração sobre experimentar com apoio.',
      },
    },
    destaque:
      'A programação permite transformar essas escolhas em instruções para o jogo. Como o resultado aparece na tela, vocês têm algo concreto para observar e conversar. A história e os personagens também podem despertar interesse em quem não costuma jogar.',
  },
  jogo: {
    titulo: 'Vocês constroem a aventura em três etapas, com tempo para olhar cada descoberta.',
    etapas: [
      {
        destaque: 'Observar o movimento.',
        texto: 'Vocês fazem o personagem andar e testam como mantê-lo dentro da tela.',
      },
      {
        destaque: 'Investigar a chave.',
        texto:
          'Comparam a chave sumir com o jogo guardar que ela foi pega. Cada teste ajuda a perceber uma diferença.',
      },
      {
        destaque: 'Fazer uma regra funcionar.',
        texto:
          'O farol acende quando o personagem chega com a chave. Vocês montam essa decisão, testam e escolhem a aparência da aventura.',
      },
      {
        destaque: 'Mostrar uma conquista.',
        texto:
          'A criança pode mostrar uma escolha e algo que conseguiu fazer. Há certificado ao cumprir as atividades de conclusão.',
      },
    ],
    imagem: {
      src: 'desafio-primeiro-jogo/farol-jogo.png',
      width: 1280,
      height: 960,
      alt: 'A Chave do Farol: o personagem na trilha, a chave dourada e o farol listrado na ilha',
    },
    legenda:
      'A Chave do Farol é o projeto guiado usado neste treinamento. Programar, aqui, é encaixar blocos com instruções para o jogo. Vocês recebem a orientação e podem escolher personagem, cenário, avisos e posição da chave.',
  },
  sessao: {
    titulo: 'A aula mostra uma parte. Vocês pausam, experimentam e olham o resultado juntos.',
    passos: [
      {
        texto: 'Conheçam a aventura e conversem sobre o objetivo.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-experiencia-real.webp',
          width: 2061,
          height: 1290,
          alt: 'Experiência interativa real da Chave do Farol: escolher a posição da chave.',
        },
      },
      {
        texto: 'Vejam uma orientação e pausem para experimentar.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-estudio-real.webp',
          width: 2400,
          height: 1500,
          alt: 'Estúdio real com os blocos de programação e a prévia da Chave do Farol.',
        },
      },
      {
        texto: 'Observem o resultado e escolham o que conferir.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-objetivos-reais.webp',
          width: 1092,
          height: 530,
          alt: 'Objetivos reais da aula da Chave do Farol e o botão Verificar projeto.',
        },
      },
      {
        texto: 'Compartilhem o projeto e contem uma descoberta.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-jogo-real.webp',
          width: 1440,
          height: 1080,
          alt: 'Projeto final da Chave do Farol em execução no Estúdio.',
        },
      },
    ],
    nota: 'Capturas reais da Chave do Farol: experiência interativa, Estúdio, objetivos do projeto e jogo em execução. Toque nas imagens para ampliar.',
  },
  papel: {
    titulo: 'Com a sua ajuda, ele participa do raciocínio e das escolhas.',
    texto:
      'Para os menores, o Desafio acontece com um responsável presente durante as atividades. Você segue as orientações da aula, ajuda na leitura e nos controles e dá espaço para a criança participar. É possível mostrar uma ideia falando, apontando ou experimentando juntos; não é preciso saber programar para acompanhar.',
    cartas: [
      {
        titulo: 'Ajude a entender',
        texto:
          'Leia uma instrução ou use o botão Ouvir nas falas do Zappy. Mostre uma parte e observe como a criança indica o que compreendeu ou quer fazer.',
      },
      {
        titulo: 'Acolha e investigue',
        texto:
          'Se ficar difícil, escute o que incomodou. “Qual parte podemos olhar juntos?” Uma pausa também pode fazer parte do caminho.',
      },
      {
        titulo: 'Reserve uma decisão para ela',
        texto:
          'Ofereça uma escolha possível: qual personagem usar ou onde colocar a chave. Deixe que a criança indique sua preferência e acompanhe o resultado.',
      },
    ],
  },
  treina: {
    titulo: 'Essas pequenas experiências dão exemplos para outras situações da vida.',
    habilidades: [
      {
        titulo: 'Entender o que vem primeiro',
        texto:
          'Para acender o farol, primeiro é preciso pegar a chave. Ao guardar a mochila ou preparar uma brincadeira, vocês podem retomar essa conversa sobre a ordem dos passos.',
        imagem: {
          src: 'kids-aprender-criando/organizar-mochila.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha organiza a mochila, enquanto Dedé aponta os materiais que ainda estão sobre a mesa e Zappy acompanha.',
        },
        legenda: 'Na rotina: separar, organizar e conferir.',
        ampliar: false,
      },
      {
        titulo: 'Dar sentido a posições e números',
        texto:
          'Mudar a posição da chave faz ela aparecer mais para um lado ou para outro. A criança pode apontar onde quer colocá-la, enquanto você ajuda a relacionar o lugar e os números.',
        imagem: {
          src: 'desafio-primeiro-jogo/farol-posicao-x280.webp',
          width: 800,
          height: 606,
          alt: 'Experiência real: a chave foi deslocada para a direita.',
        },
        legenda: 'Na aula: escolher um lugar e observar a mudança. Toque para ampliar.',
        ampliar: true,
      },
      {
        titulo: 'Experimentar outra possibilidade',
        texto:
          'A primeira tentativa pode deixar o personagem fora da tela. Vocês olham o que faltou, ajustam uma parte e testam. Esse episódio pode ser lembrado diante de uma tarefa que pede uma nova tentativa.',
        imagem: {
          src: 'kids-aprender-criando/experimentar-outra-possibilidade.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha gira uma peça de quebra-cabeça para experimentar outro encaixe, com Dedé e Zappy por perto.',
        },
        legenda: 'Na rotina: observar a peça e testar outra possibilidade.',
        ampliar: false,
      },
      {
        titulo: 'Comunicar o que precisa',
        texto:
          'Apontar o personagem parado ou mostrar uma parte dos blocos já pode indicar uma dúvida. Você ajuda a dar sentido ao que a criança comunica, como ao pedir ajuda numa atividade escolar.',
        imagem: {
          src: 'kids-aprender-criando/mostrar-uma-duvida.webp',
          width: 1536,
          height: 1024,
          alt: 'Debinha aponta uma parte do desenho para comunicar sua dúvida a Dedé, com Zappy acompanhando.',
        },
        legenda: 'Na rotina: apontar também pode ajudar a explicar.',
        ampliar: false,
      },
    ],
    faixa: {
      titulo: 'A conversa com você ajuda a levar a descoberta para além do jogo.',
      texto:
        'Ao ler um aviso do jogo, conversem sobre o que a mensagem pede para fazer. Ao escolher um caminho, nomeiem direções: para cima, para baixo, para o lado. Ao organizar uma atividade da escola, retomem: “Como fizemos uma parte de cada vez?”. Leitura, orientação e sequência ganham exemplos que vocês viveram juntos. Essa ponte se constrói respeitando o ritmo e a forma de participação da criança.',
    },
  },
  oferta: {
    titulo: 'Comecem por um projeto guiado, com espaço para ele escolher e com você ao lado.',
    selo: 'Desafio do Primeiro Jogo',
    sufixo: 'pagamento único',
    porDia: '30 dias de acesso a partir da aprovação do pagamento.',
    inclui: [
      'A Chave do Farol, com 3 etapas guiadas de criação',
      'Vídeos, atividades e falas do Zappy com botão Ouvir',
      'Caderno do Aluno e orientação por mensagens',
      'Publicação do projeto para mostrar à família',
      'Certificado ao cumprir as atividades de conclusão',
    ],
    incluiLabel: 'Como o treinamento acontece',
    garantia:
      '7 dias de garantia para solicitar reembolso. Pagamento único, sem renovação automática.',
    depoisTitulo: 'Para começar em casa',
    depois: [
      'Receba as orientações de acesso por e-mail e WhatsApp.',
      'Crie ou abra o perfil da criança na Área dos pais.',
      'Separem um computador com internet, mouse e teclado e comecem a primeira atividade juntos.',
    ],
  },
  continuidade: {
    titulo: 'Ao final de uma atividade, conversem sobre algo que ele conseguiu fazer.',
    passos: [
      {
        titulo: 'Antes',
        texto: 'O que chamou sua atenção? O que ele quer experimentar?',
      },
      {
        titulo: 'Durante',
        texto: 'O que escolheu? Onde precisou de ajuda ou de uma pausa?',
      },
      {
        titulo: 'Depois',
        texto: 'O que quer mostrar? Como conta o que conseguiu fazer?',
      },
    ],
    texto:
      'Um gesto, uma explicação ou uma tentativa diferente podem render uma conversa em família. Se quiserem continuar com outros projetos, existe a Comunidade dos Criadores, contratada por uma assinatura separada.',
    link: 'Conhecer as possibilidades para criar junto',
  },
  duvidas: {
    titulo: 'Para escolher e começar com clareza',
    itens: [
      {
        pergunta: 'Por que usar a criação de um jogo?',
        resposta:
          'A criança tem uma intenção e pode ver o efeito de uma escolha. O personagem muda de lugar, a chave aparece onde vocês escolheram e o farol responde a uma regra. Isso dá um contexto para observar, comparar, decidir e comunicar o que precisa. Vocês seguem as orientações e fazem uma parte de cada vez.',
      },
      {
        pergunta: 'Qual é a idade indicada?',
        resposta:
          'Crianças menores de 9 anos podem participar com um responsável acompanhando as atividades. As atividades foram pensadas para 9 a 17 anos com mais autonomia; para os menores, vocês ajustam o ritmo e fazem juntos. Observe o interesse e o apoio de que seu filho precisa.',
      },
      {
        pergunta: 'Ele ainda não lê sozinho. Como participa?',
        resposta:
          'Você lê as instruções e ajuda a usar mouse e teclado. O botão Ouvir lê as falas do Zappy. A criança pode escolher, apontar, contar o que quer e testar com sua ajuda. A participação do responsável continua necessária durante as atividades.',
      },
      {
        pergunta: 'Eu preciso saber programar?',
        resposta:
          'Não é preciso conhecimento prévio. A orientação mostra a montagem dos blocos e vocês podem pausar e rever uma parte. O seu papel é ajudar a criança a entender o objetivo e participar da tentativa. Também há orientação por mensagens; pode haver espera pela resposta.',
      },
      {
        pergunta: 'E se ele se frustrar ou perder o interesse?',
        resposta:
          'Escute o que ficou difícil e proponha olhar uma parte ou fazer uma pausa. Vocês podem retomar em outro momento dentro do acesso. A companhia deve ajudar a criança a participar no seu ritmo. Se decidirem não continuar, a compra tem 7 dias de garantia para solicitar reembolso.',
      },
      {
        pergunta: 'Como conectar isso à escola e à rotina?',
        resposta:
          'Retome algo que aconteceu de verdade: “Qual foi o primeiro passo?” ou “O que você fez quando precisou de ajuda?”. Essas perguntas podem acompanhar uma tarefa, a organização dos materiais ou uma brincadeira. Direções, sequências e compreensão de instruções também ganham exemplos concretos na criação.',
      },
      {
        pergunta: 'Meu filho é autista. Como considerar as necessidades dele?',
        resposta:
          'Observe o interesse, a compreensão das orientações e o apoio de que ele precisa para participar. Vocês podem pausar e rever as aulas gravadas, ouvir as falas do Zappy e trabalhar uma parte por vez. Uma escolha pode ser comunicada falando, apontando ou mostrando. O responsável acompanha as atividades e ajusta sua ajuda ao ritmo da criança.',
      },
      {
        pergunta: 'Quanto tempo temos e qual equipamento usamos?',
        resposta:
          'São 30 dias de acesso desde a aprovação do pagamento para realizar 3 etapas com aulas gravadas. Vocês escolhem os momentos e podem pausar. Para criar, precisam de computador ou notebook com internet, mouse e teclado. Compra e cadastro podem ser feitos pelo celular.',
      },
      {
        pergunta: 'É assinatura? O que fica depois dos 30 dias?',
        resposta:
          'É um pagamento único de {{preco}}, sem renovação automática. Depois do prazo, as aulas fecham e os projetos ficam guardados na conta. O jogo publicado continua acessível enquanto a publicação estiver disponível. A conta pode ver e jogar no Mural; publicar, comentar e reagir depende de um acesso ativo.',
      },
      {
        pergunta: 'Qual é a diferença para o presente e para a Comunidade?',
        resposta:
          'O presente usa o Cadê Todo Mundo por 7 dias desde o resgate. Este treinamento usa A Chave do Farol por 30 dias desde a aprovação do pagamento. A Comunidade reúne outros projetos por assinatura. São acessos separados, e a compra do Desafio não renova o presente nem contrata a assinatura.',
      },
    ],
  },
  fechamento: {
    titulo: 'Dê espaço às escolhas dele. Esteja por perto nas novas tentativas.',
    texto:
      'Desafio do Primeiro Jogo · {{preco}}, pagamento único · 30 dias de acesso · 7 dias de garantia',
    cta: 'Quero começar com meu filho',
    zappy: {
      src: 'comunidade-dos-criadores/zappy-festa.webp',
      width: 640,
      height: 640,
      alt: '',
    },
  },
  barra: {
    sufixo: 'pagamento único',
    cta: 'Começar juntos',
  },
  pratica: {
    metodologia:
      'Nossa metodologia é aprender fazendo: entender um objetivo, experimentar, observar e escolher o próximo passo. Na Chave do Farol, você ajuda a ler e a usar os controles; seu filho participa das escolhas e dos testes, uma parte de cada vez.',
    familia: [
      'Somos Helena e Júlio, pais do André e da Débora e formados em Sistemas de Informação. Nossa história começou com o interesse do André por jogos e com um convite: criar os próprios projetos juntos.',
      'Criar dava assunto para pensar em uma ideia, enfrentar uma parte difícil e mostrar uma descoberta. Foi acompanhando nossos filhos nesse percurso que nasceu a vontade de compartilhar essa experiência com outras famílias.',
      'Hoje, o Sistema Zero organiza esse caminho em projetos guiados. Nosso propósito é oferecer oportunidades para a criança pensar, escolher, experimentar e comunicar o que criou, usando a programação de jogos como ferramenta e respeitando o apoio de que cada uma precisa.',
    ],
    paraComecar: [
      'Vocês usam um computador ou notebook com internet, mouse e teclado. A aula e o Estúdio de criação ficam juntos no navegador. Na Área dos pais, você cria ou abre o perfil do seu filho e acompanha o primeiro acesso.',
      'As aulas são gravadas. Vocês podem pausar, rever uma parte e continuar em outro momento. São três etapas para realizar dentro dos 30 dias de acesso, contados da aprovação do pagamento; não é preciso concluir em três dias.',
      'Você acompanha as atividades, ajuda na leitura e nos controles e reserva escolhas para a criança. Não é preciso saber programar: a aula orienta cada parte. O Caderno do Aluno ajuda a conferir os testes; há orientação por mensagens, e as respostas podem levar um tempo.',
    ],
    areaDosPais: [
      'Na Área dos pais, você acompanha aulas concluídas, entregas e jogos publicados de cada filho. O painel também sugere perguntas para conversar sobre uma criação.',
      'Isso ajuda a sair de uma pergunta muito ampla, como “Foi tudo bem?”, para olhar uma escolha concreta: “O que você mudou para funcionar?”. Você conhece melhor o que despertou interesse, onde ele precisou de ajuda e o que conseguiu mostrar.',
    ],
    matematica: {
      titulo: 'Um número muda. A chave muda de lugar.',
      texto:
        'Nesta experiência real da aula, x indica a posição para os lados. Ao passar de 160 para 280, a chave anda 120 unidades para a direita; y continua em 160. A criança vê o que a diferença entre os números faz no jogo.',
      imagens: [
        {
          imagem: {
            src: 'desafio-primeiro-jogo/farol-posicao-x160.webp',
            width: 800,
            height: 606,
            alt: 'Chave na posição x 160 e y 160.',
          },
          legenda: 'Antes: x = 160 · y = 160',
        },
        {
          imagem: {
            src: 'desafio-primeiro-jogo/farol-posicao-x280.webp',
            width: 800,
            height: 606,
            alt: 'Chave na posição x 280 e y 160, mais à direita.',
          },
          legenda: 'Depois: x = 280 · y = 160',
        },
      ],
      nota: 'Para os menores, a conversa pode começar com “mais para a direita” ou “mais para a esquerda”. Os números podem ser explorados com sua ajuda, conforme o que a criança já compreende.',
    },
    paisTitulo: 'Você também ganha um ponto de partida para acompanhar e conversar.',
    paisImagem: {
      src: 'kids-aprender-criando/area-dos-pais-conversa.webp',
      width: 1092,
      height: 288,
      alt: 'Área dos pais com três sugestões de perguntas sobre uma criação.',
    },
    paisLegenda: 'Na Área dos pais: sugestões para conversar sobre uma criação.',
    preparoTitulo: 'Para começar em casa, separem um computador e um primeiro momento juntos.',
    caderno: {
      src: 'desafio-primeiro-jogo/farol-caderno.png',
      width: 1334,
      height: 1888,
      alt: 'Página do Caderno do Aluno da Chave do Farol com orientações para testar o jogo com e sem a chave.',
    },
    cadernoLegenda:
      'Página real do Caderno do Aluno: testes para conferir o próprio projeto. Toque para ampliar.',
    familiaTitulo: 'Esse caminho começou na nossa família.',
    compartilhar: {
      titulo: 'Quando ele mostra o projeto, também tem uma história para contar.',
      texto:
        'O link permite que outra pessoa jogue o que ele criou. Seu filho pode mostrar uma escolha, apontar uma parte de que gostou ou contar uma tentativa. A criação dá um assunto concreto para essa troca.',
    },
    familiaImagem: {
      src: 'comunidade-dos-criadores/familia-helena-julio-kids.webp',
      width: 880,
      height: 1019,
      alt: 'Helena e Júlio, fundadores, com a família',
    },
  },
} as const

export const RELATOS_DESAFIO_MENOR9: readonly RelatoId[] = ['AV02', 'AV03', 'AV04']
