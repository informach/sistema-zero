// Copy aprovada em 06/11/2026: criação com o responsável durante as atividades.
import type { ComunidadePraticaSection } from './pratica-types'

export const PAGINA_MENOR9 = {
  seoTitle:
    'Criar junto, para crianças menores de 9 anos | Comunidade dos Criadores | Sistema Zero',
  description:
    'Seu filho escolhe, você ajuda a colocar a ideia em prática, e os dois observam o resultado. Na Comunidade dos Criadores, fazer jogos juntos cria oportunidades para organizar passos, experimentar outra solução e mostrar uma descoberta.',
  capa: 'checkout-capa.webp',
  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      arquivo: 'logo-kids-claro.svg',
      alt: 'Sistema Zero Kids',
      largura: 286,
      altura: 22,
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    linkSessao: 'Como é uma sessão',
    cta: 'Ver planos para criar juntos',
  },
  heroi: {
    selo: 'Comunidade dos Criadores · Menores de 9 anos · com um responsável',
    titulo: 'Ajude seu filho a fazer pequenas escolhas com mais autonomia.',
    enfase: 'pequenas escolhas com mais autonomia.',
    texto:
      'Seu filho escolhe, você ajuda a colocar a ideia em prática, e os dois observam o resultado. Na Comunidade dos Criadores, fazer jogos juntos cria oportunidades para organizar passos, experimentar outra solução e mostrar uma descoberta.',
    beneficios: [
      'Escolhas possíveis para o que ele compreende agora',
      'Você presente para ajudar na leitura e nos controles',
      'Novas atividades para continuar praticando juntos',
    ],
    cta: 'Ver planos para criar juntos',
    garantia: 'Assinatura mensal ou anual · 7 dias para pedir reembolso integral',
    requisitos:
      'Responsável presente durante as atividades · Computador, internet, mouse e teclado · Até 2 perfis Kids',
    ilustracao: {
      src: '/img/kids-aprender-criando/criar-juntos.webp',
      alt: 'Cena ilustrada de criação acompanhada, com os mascotes do Sistema Zero.',
      width: 1402,
      height: 1122,
    },
    balao: 'No botão Ouvir, o Zappy lê as falas em voz alta',
    zappy: {
      arquivo: 'zappy-fala.webp',
      alt: '',
      largura: 360,
      altura: 458,
    },
    secondary: {
      href: '#sessao',
      label: 'Ver como a prática acontece',
    },
  },
  sections: [
    {
      tag: 'As primeiras escolhas',
      title: 'Ele já pode participar antes de conseguir fazer tudo sozinho.',
      intro:
        'Escolher um personagem, apontar o caminho e perceber que algo mudou são formas de participar. Você ajuda a transformar essa escolha numa ação no computador, lê as orientações e observa o que ele compreendeu.',
      cards: [],
      paras: [
        'O ponto de partida é uma decisão que caiba para ele agora. A cada atividade, vocês encontram novas oportunidades de escolher, comparar e pedir ajuda. Autonomia se pratica com o apoio de que a criança precisa.',
      ],
      kind: 'cards',
      id: 'pratica-0',
      visual: {
        image: {
          src: '/img/kids-aprender-criando/mostrar-uma-duvida.webp',
          alt: 'Cena ilustrada de uma dúvida comunicada por meio de apontar.',
          width: 1536,
          height: 1024,
        },
        caption:
          'Apontar uma escolha ou mostrar o que aconteceu já permite participar da conversa.',
      },
    },
    {
      tag: 'Por que brincar de criar',
      title: 'Uma ideia ganha um efeito que vocês conseguem ver.',
      intro:
        'No Cadê Todo Mundo, um personagem está escondido. Vocês montam a instrução que faz o esconderijo desaparecer ao toque. Depois testam: apareceu o personagem? A brincadeira dá um objetivo à sequência de passos.',
      cards: [
        [
          'A criança escolhe e observa',
          'Ela pode indicar um esconderijo, acompanhar o resultado e mostrar se aconteceu o que esperava.',
        ],
        [
          'O adulto torna a tarefa acessível',
          'Você lê, ajuda a usar o mouse e divide uma orientação em partes. Oferece opções compreensíveis e deixa espaço para a escolha dela.',
        ],
        [
          'A programação liga escolha e resultado',
          'Os blocos são instruções que vocês encaixam. Executar o jogo permite conferir o que fizeram e experimentar um ajuste.',
        ],
      ],
      paras: [
        'A sequência é imaginar uma pequena mudança, planejar, montar, testar e conversar sobre o resultado. Você acompanha as orientações junto com ele; não precisa chegar sabendo programar.',
      ],
      kind: 'cards',
      id: 'metodo',
      visual: {
        image: {
          src: '/img/cade-todo-mundo/cade-blocos-reais.webp',
          alt: 'Blocos reais do Cadê Todo Mundo, na plataforma.',
          width: 906,
          height: 372,
        },
        caption:
          'As instruções são montadas com os blocos reais do Estúdio. O responsável ajuda com os textos e os controles.',
      },
    },
    {
      tag: 'Uma sessão de vocês',
      title: 'Comecem por um objetivo pequeno e deixem um próximo passo combinado.',
      intro:
        'As aulas são gravadas e podem ser pausadas e revistas. Reservem um momento possível dentro do tempo de tela já combinado, com um responsável presente durante as atividades.',
      cards: [
        [
          'Olhar e combinar',
          'Vejam a demonstração e escolham o que vão experimentar: fazer um personagem aparecer, por exemplo.',
        ],
        [
          'Montar e testar',
          'Você lê a orientação e ajuda nos controles. Ele escolhe, aponta, acompanha e experimenta conforme consegue.',
        ],
        [
          'Conversar e encerrar',
          'Peça que mostre uma mudança. Guardem o projeto e combinem de onde vão retomar. Uma pausa também faz parte da atividade.',
        ],
      ],
      paras: [
        'Para criar, vocês precisam de computador, internet, navegador, mouse e teclado. O botão Ouvir lê as falas do Zappy; você ajuda a ler os blocos e a usar os controles. Se a tarefa ficar difícil, reduza o passo ou faça uma pausa. As dúvidas podem ser enviadas nos Recados para a equipe responder por mensagem.',
      ],
      kind: 'cards',
      id: 'sessao',
      visual: {
        image: {
          src: '/img/cade-todo-mundo/cade-experiencia-real.webp',
          alt: 'Experiência real do curso Cadê Todo Mundo.',
          width: 2061,
          height: 1290,
        },
        caption:
          'Vocês observam o que acontece na experiência antes de construir a regra no Estúdio.',
      },
    },
    {
      tag: 'Habilidades nas pequenas ações',
      title: 'Escolher, esperar o resultado e mostrar uma descoberta.',
      intro:
        'Essas são oportunidades de prática dentro da brincadeira. Você acompanha como seu filho participa e aproxima a experiência de situações conhecidas por ele.',
      cards: [
        [
          'Uma sequência',
          'Primeiro tocar, depois ver o esconderijo sumir. Na rotina, vocês podem retomar a ideia ao guardar um brinquedo antes de começar outra brincadeira.',
        ],
        [
          'Uma quantidade',
          'Um personagem apareceu; depois, mais um. Contar os achados aproxima número e quantidade. Fora da tela, vocês podem contar as peças de uma brincadeira.',
        ],
        [
          'Uma tentativa diferente',
          'Não apareceu o que esperavam. Vocês conferem uma instrução e testam de novo. Relembre essa experiência quando uma construção de brinquedo precisar de outro encaixe.',
        ],
        [
          'Uma ideia compartilhada',
          'Ele mostra onde tocou ou aponta o personagem que encontrou. Você pode convidá-lo a fazer o mesmo ao mostrar uma atividade da escola.',
        ],
      ],
      paras: [],
      kind: 'cards',
      id: 'pratica-3',
      visual: {
        image: {
          src: '/img/kids-aprender-criando/experimentar-outra-possibilidade.webp',
          alt: 'Cena ilustrada dos mascotes experimentando outra possibilidade de montagem.',
          width: 1536,
          height: 1024,
        },
        caption:
          'Comparar duas tentativas pode começar numa brincadeira simples, com ajuda para perceber a diferença.',
      },
    },
    {
      tag: 'Por que manter essa prática',
      title: 'Voltar a criar dá outras oportunidades para escolher e compreender.',
      intro:
        'Um dia, vocês seguem uma orientação para revelar um personagem. Em outro, podem rever a regra, comparar uma mudança ou iniciar outro projeto quando ele estiver pronto. A proposta é retomar as habilidades em situações diferentes, mantendo a sua presença.',
      cards: [
        [
          'Rever o que fez',
          'Peça que mostre onde tocou e o que apareceu. Ele pode responder apontando, falando ou fazendo de novo.',
        ],
        [
          'Experimentar uma mudança',
          'Escolham outra aparência ou posição numa etapa que permita isso. Ajudá-lo a comparar o resultado dá sentido à nova tentativa.',
        ],
        [
          'Conhecer outro projeto',
          'Os cursos seguintes trazem outras regras e objetivos. Vocês avançam conforme a compreensão da criança e os requisitos da Jornada, com apoio durante a atividade.',
        ],
      ],
      paras: [
        'Não é necessário acelerar para chegar a uma ferramenta ou diminuir a ajuda por causa da idade. Observe se a criança compreende o objetivo, participa das escolhas e consegue mostrar o que aconteceu.',
      ],
      kind: 'cards',
      id: 'continuidade',
      visual: {
        image: {
          src: '/img/comunidade-dos-criadores/tela-jornada-meus-postos@2x.webp',
          alt: 'Jornada do Criador na plataforma, mostrando os postos Faísca e Construtor.',
          width: 1900,
          height: 774,
        },
        caption:
          'A Jornada mostra o que já foi cumprido e o que abre o próximo passo. As ferramentas são liberadas conforme esses requisitos.',
      },
    },
    {
      tag: 'Uma criação para compartilhar',
      title: 'Mostrar uma ideia dá um motivo para organizar o que se quer dizer.',
      intro:
        'Vocês podem mostrar o jogo à família e convidar a criança a apresentar uma escolha. O Mural e o Clube oferecem outras criações e trocas com moderação; o responsável acompanha e administra as permissões.',
      cards: [
        [
          'Uma maneira de se expressar',
          '“Mostra onde está o personagem que você escolheu” convida a participar falando, apontando ou tocando na tela.',
        ],
        [
          'Você acompanha as trocas',
          'O perfil público começa desativado. Escolha as permissões pela sua área e esteja junto para conhecer os projetos e as interações.',
        ],
      ],
      paras: [
        'O relato de Rafael mostra um uso concreto dessa possibilidade: criar algo que outra pessoa possa experimentar.',
      ],
      kind: 'quotes',
      id: 'compartilhar',
    },
    {
      tag: 'O começo da nossa história',
      title: 'Esse caminho começou com uma pergunta dentro da nossa família.',
      intro:
        'Somos Helena e Júlio, pais do André e da Débora, formados em Sistemas de Informação. Queríamos aproveitar o interesse dos nossos filhos para lhes dar oportunidades de pensar, decidir e criar. A criação de jogos entrou na nossa rotina por esse motivo.',
      cards: [],
      paras: [
        'Dessa experiência nasceu o Sistema Zero. Organizamos aulas e ferramentas para que outras famílias encontrem um começo e um caminho de prática. O projeto pronto permite mostrar o que foi construído; as escolhas e tentativas no percurso dão sentido ao trabalho.',
        'André e Débora, nossos filhos, contam ao lado como viveram o Desafio do Primeiro Jogo.',
      ],
      kind: 'family',
      id: 'familia',
      visual: {
        image: {
          src: '/img/comunidade-dos-criadores/familia-helena-julio-kids.webp',
          alt: 'Helena, Júlio, André e Débora, a família que deu origem ao Sistema Zero.',
          width: 880,
          height: 1019,
        },
        caption: 'Helena e Júlio, com André e Débora.',
      },
    },
    {
      tag: 'O que a assinatura oferece',
      title: 'Aulas para orientar. Ferramentas para experimentar. Ajuda para continuar.',
      intro:
        'A Comunidade reúne essas partes para que a família tenha onde retomar depois da primeira descoberta. Mensal e anual incluem o mesmo acesso; as ferramentas acompanham os requisitos da Jornada.',
      cards: [
        [
          'Cursos e próximos projetos',
          'Cursos Kids publicados, incluindo o Desafio do Primeiro Jogo, e novos cursos lançados enquanto a assinatura estiver ativa. Vocês podem rever uma orientação antes de avançar.',
        ],
        [
          'Ferramentas com uma função',
          'No Estúdio, ele constrói o jogo. No Pinta, desenha personagens e cenários; no Pensa, organiza a ideia em etapas; no Molda, cria modelos 3D. Cada ferramenta abre conforme a progressão, no momento previsto pela Jornada.',
        ],
        [
          'Ajuda e compartilhamento',
          'A equipe responde às dúvidas por mensagens nos Recados. Mural e Clube oferecem espaço para mostrar projetos e trocar ideias com moderação.',
        ],
        [
          'Acompanhamento e dois perfis',
          'Até dois perfis Kids, com progresso separado. Pela área do responsável, você acompanha atividades e administra acesso e permissões.',
        ],
      ],
      paras: [
        'A assinatura permite começar pelos cursos disponíveis e continuar com vocês dois criando juntos. O Desafio do Primeiro Jogo está incluído. As ferramentas são liberadas conforme a Jornada, e a criança mantém o apoio de que precisa em cada etapa.',
      ],
      kind: 'cards',
      id: 'incluido',
    },
  ],
  planos: {
    titulo: 'Escolha o plano que cabe no momento da sua família.',
    texto:
      'Mensal e anual incluem os mesmos cursos, recursos e até dois perfis Kids. As ferramentas seguem os requisitos da Jornada. A diferença entre os planos está no período contratado e na forma de pagamento.',
    destaque:
      'Vocês criam juntos, com o apoio que a criança precisa agora. Cada perfil tem seu próprio progresso.',
    mensal: {
      nome: 'Mensal',
      preco: '{{preco_mensal}}',
      periodo: '/mês',
      texto:
        '{{preco_mensal}} por mês, com renovação mensal no cartão. Você pode cancelar pela sua conta, sem multa, e mantém o acesso até o fim do período pago.',
      cta: 'Assinar o mensal',
      nota: '7 dias de garantia',
    },
    anual: {
      nome: 'Anual',
      selo: 'Economia de {{economia_anual}}',
      preco: '{{preco_anual}}',
      periodo: '/ano',
      texto:
        '{{preco_anual}} pelo ano. Equivale a {{equivalente_mensal_anual}} por mês, sem ser um parcelamento. No Pix, pagamento à vista sem renovação automática; no cartão, renovação anual.',
      cta: 'Assinar o anual',
      nota: '7 dias de garantia',
    },
    depois: {
      titulo: 'O que acontece depois de assinar',
      passos: [
        'Na sua área, escolha o perfil que já existe ou crie o primeiro, com nome e data de nascimento.',
        'Autoriza o computador que vocês vão usar.',
        'Entram com um código que você gera, válido por 10 minutos.',
        'Acessem o perfil Kids, abram o primeiro curso disponível e comecem por uma atividade com acompanhamento.',
      ],
    },
    garantia: {
      destaque: '',
      texto:
        'Vocês têm sete dias para conhecer as atividades e observar como a proposta funciona na rotina. Se decidirem não continuar, podem pedir a devolução integral do valor.',
    },
  },
  duvidas: {
    titulo: 'Para decidir com clareza',
    itens: [
      {
        pergunta: 'Já começamos pelo presente ou pelo Desafio. Como continuar?',
        resposta:
          'Use o mesmo e-mail do responsável que já tem a conta, para continuar com os perfis e o progresso existentes. Não é preciso concluir o Desafio para assinar: ele está incluído na Comunidade. A assinatura começa quando o pagamento é aprovado; dias restantes do Desafio avulso não são somados ao período contratado. Vocês podem aproveitar o acesso atual e escolher quando faz sentido continuar.',
      },
      {
        pergunta: 'Ele ainda não lê. Pode participar?',
        resposta:
          'Pode participar com um responsável que leia, ajude nos controles e acompanhe toda a atividade. As falas do Zappy podem ser ouvidas; os blocos e botões ainda têm texto. Observe se ele entende o objetivo e consegue participar das escolhas com o seu apoio.',
      },
      {
        pergunta: 'Para qual idade a Comunidade foi pensada?',
        resposta:
          'Para que crianças e adolescentes de 9 a 17 anos possam participar com mais autonomia, conforme sua leitura e sua familiaridade com o computador. Crianças menores também podem fazer, acompanhadas por um responsável durante as atividades. A idade orienta o ponto de partida; a ajuda depende de cada criança.',
      },
      {
        pergunta: 'Meu filho é autista. Como saber se a proposta combina com ele?',
        resposta:
          'Observe seu interesse pela atividade, como compreende as orientações e de que apoio precisa. É possível pausar, rever e participar falando, apontando ou mostrando na tela. Comecem juntos e ajustem a duração e a ajuda. A Comunidade é uma proposta educacional; não oferece avaliação ou tratamento clínico nem promete um resultado igual para todas as crianças.',
      },
      {
        pergunta: 'Ele precisa gostar de videogame ou saber programar?',
        resposta:
          'Não precisa ter experiência com programação. O interesse pode estar nos personagens, nas histórias, no desenho ou em criar algo com você. As primeiras atividades apresentam os comandos aos poucos. Os sete dias de garantia permitem conhecer a experiência e observar como ele participa.',
      },
      {
        pergunta: 'Precisa de qual equipamento?',
        resposta:
          'Para criar: computador com internet, navegador, mouse e teclado. Celular e tablet servem para jogar os projetos publicados, mas não substituem o computador nas atividades de criação. As aulas são gravadas e podem ser pausadas e revistas durante o acesso.',
      },
      {
        pergunta: 'Como funciona a ajuda quando ele trava?',
        resposta:
          'Vocês podem enviar uma dúvida por escrito nos Recados, mostrando o que tentaram e onde pararam. A equipe responde por mensagens, sem aula individual ao vivo. O responsável continua ajudando conforme a necessidade da criança; para os menores de 9 anos, acompanha durante as atividades.',
      },
      {
        pergunta: 'Todas as ferramentas ficam liberadas no primeiro dia?',
        resposta:
          'Os recursos acompanham a Jornada do Criador. Nas primeiras aulas, ele usa o Estúdio dentro do curso. Ao cumprir os requisitos e publicar os projetos do posto inicial, abrem o Estúdio livre e o Pinta. Outros recursos chegam nos postos seguintes. A assinatura mantém acesso aos recursos incluídos e aos cursos publicados durante seu período ativo.',
      },
      {
        pergunta: 'São dois perfis com a mesma assinatura?',
        resposta:
          'Sim. A assinatura Kids permite até dois perfis de crianças ou adolescentes, cada um com seu progresso. O responsável administra o acesso pela própria conta.',
      },
      {
        pergunta: 'Como funcionam pagamento, renovação e cancelamento?',
        resposta:
          'O mensal custa {{preco_mensal}} e renova todo mês no cartão. O anual custa {{preco_anual}}: no Pix, é um pagamento à vista sem renovação automática; no cartão, renova uma vez por ano. Você cancela em Conta → Minhas compras, sem multa, e mantém o acesso até o fim do período pago. Nos primeiros sete dias, pode pedir a devolução integral do valor.',
      },
      {
        pergunta: 'Se eu cancelar, o trabalho dele desaparece?',
        resposta:
          'Perfil, progresso, projetos salvos, certificados e posto da Jornada ficam na conta. Os jogos publicados continuam disponíveis para jogar. O acesso aos cursos e às ferramentas da assinatura termina ao acabar o período pago; os registros preservados permitem retomar o percurso se vocês voltarem a assinar.',
      },
    ],
  },
  fechamento: {
    titulo:
      'Escolham uma pequena ideia para fazer juntos. Depois, conversem sobre o que aconteceu.',
    cta: 'Ver planos para criar juntos',
    garantia: '7 dias de garantia. Cancele quando quiser, sem multa.',
    zappy: {
      arquivo: 'zappy-festa.webp',
      alt: '',
      largura: 640,
      altura: 640,
    },
  },
  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Ver os planos',
  },
} satisfies { sections: ComunidadePraticaSection[] } & Record<string, unknown>
