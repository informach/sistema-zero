// Copy aprovada em 06/11/2026: habilidades para a vida, prática orientada e continuidade.
// Preços são marcadores preenchidos pelo catálogo. Falas vêm de relatos.ts.

import type { ComunidadePraticaSection } from './pratica-types'
import { RELATOS } from './relatos'
import type { RelatoId } from './types'

export function legendaDoRelato(id: RelatoId): string {
  const { nome, papel } = RELATOS[id]
  return `${nome}, ${papel.charAt(0).toLowerCase()}${papel.slice(1)}`
}
export const RELATOS_9A17: readonly RelatoId[] = ['AV02', 'AV03', 'AV04']

export const PAGINA_9A17 = {
  seoTitle: 'Comunidade dos Criadores para 9 a 17 anos | Sistema Zero',
  description:
    'Na Comunidade dos Criadores, seu filho exercita planejamento, raciocínio e persistência criando jogos com orientação. O interesse pela criação dá um motivo para começar; novos projetos trazem outras oportunidades de escolher, testar e explicar suas ideias.',
  capa: 'checkout-capa.webp',
  topo: {
    pular: 'Ir para o conteúdo',
    logo: {
      file: 'logo-kids-claro.svg',
      width: 287,
      height: 22,
      alt: 'Sistema Zero Kids',
    },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      {
        href: '#metodo',
        label: 'Como funciona',
      },
      {
        href: '#responsavel',
        label: 'Para o responsável',
      },
    ],
    cta: {
      href: '#planos',
      label: 'Ver planos e acesso',
    },
  },
  hero: {
    eyebrow: 'Comunidade dos Criadores · 9 a 17 anos',
    title: 'Ajude seu filho a resolver problemas e fazer escolhas com mais autonomia, ',
    destaque: 'na escola e na vida.',
    description:
      'Na Comunidade dos Criadores, seu filho exercita planejamento, raciocínio e persistência criando jogos com orientação. O interesse pela criação dá um motivo para começar; novos projetos trazem outras oportunidades de escolher, testar e explicar suas ideias.',
    benefits: [
      'Dividir uma tarefa em passos que consegue experimentar',
      'Mostrar uma dúvida e investigar o que precisa mudar',
      'Voltar a usar essas habilidades em novos projetos',
    ],
    requirements:
      '9 a 17 anos, com apoio conforme a necessidade · Computador, internet, mouse e teclado · Até 2 perfis Kids',
    tela: {
      src: '/img/desafio-primeiro-jogo/farol-estudio-real.webp',
      alt: 'A Chave do Farol no Estúdio real: blocos e resultado lado a lado.',
      width: 2400,
      height: 1500,
    },
    foto: {
      file: 'jeffrey-computador.webp',
      width: 1280,
      height: 720,
      alt: 'Jeffrey, aluno, de fone de ouvido diante do computador',
    },
    fotoLegenda: 'Jeffrey, aluno',
    chips: ['Planejar, testar e ajustar', 'Uma ideia que dá para mostrar'],
    secondary: {
      href: '#metodo',
      label: 'Ver como a prática acontece',
    },
  },
  cta: 'Ver planos e acesso',
  garantiaCurta: 'Assinatura mensal ou anual · 7 dias para pedir reembolso integral',
  sections: [
    {
      tag: 'O que você deseja para ele',
      title: 'Começar uma tarefa, fazer uma escolha e saber o que tentar quando algo não funciona.',
      intro:
        'Essas situações aparecem na tarefa da escola, numa brincadeira e nas pequenas responsabilidades de casa. Você quer ajudar seu filho a participar delas com mais recursos, respeitando o jeito e o ritmo dele.',
      cards: [],
      paras: [
        'Uma atividade com objetivo, escolhas e resultado visível oferece uma oportunidade de prática. Na Comunidade, a programação de jogos reúne essas partes em projetos orientados. O interesse pode começar pela história, pelos personagens ou pela vontade de criar algo próprio.',
      ],
      kind: 'cards',
      id: 'pratica-0',
      visual: {
        image: {
          src: '/img/kids-aprender-criando/planejar-caminho.webp',
          alt: 'Zappy e os mascotes exploram um caminho com passos e escolhas.',
          width: 1536,
          height: 1024,
        },
        caption:
          'Um objetivo que faz sentido para a criança abre espaço para planejar o primeiro passo.',
      },
    },
    {
      tag: 'O interesse vira uma oportunidade de prática',
      title: 'Uma ideia para realizar. Uma escolha para testar. Um resultado para observar.',
      intro:
        'Numa aventura, seu filho tem um motivo para pensar: levar uma chave ao farol, por exemplo. Programar é organizar as instruções para isso acontecer. No Estúdio, o espaço de criação da plataforma, ele encaixa blocos e executa o jogo para conferir o resultado.',
      cards: [
        [
          'Planejar uma parte',
          'Antes de acender o farol, o personagem precisa alcançar a chave. Ele identifica o que deve acontecer primeiro e constrói uma parte de cada vez.',
        ],
        [
          'Testar uma ideia',
          'O personagem pegou a chave, mas o farol não acendeu. O jogo guardou essa informação? Ele confere a regra e observa o que muda ao testá-la.',
        ],
        [
          'Revisar e explicar',
          'A orientação ajuda a localizar a dificuldade. Depois do ajuste, ele pode mostrar o que mudou e contar como chegou à solução.',
        ],
      ],
      paras: [
        'O ciclo de criação é imaginar, planejar, construir, testar, melhorar e compartilhar. O jogo dá uma tarefa concreta para exercitar essas ações. As aulas oferecem orientação; a criança participa das escolhas e das tentativas.',
      ],
      kind: 'cards',
      id: 'metodo',
      visual: {
        image: {
          src: '/img/desafio-primeiro-jogo/farol-blocos-reais.webp',
          alt: 'Blocos reais da Chave do Farol no Estúdio.',
          width: 1100,
          height: 1029,
        },
        caption:
          'Os blocos organizam as instruções. O teste mostra se elas produzem o resultado esperado.',
      },
    },
    {
      tag: 'Uma atividade em casa',
      title: 'Ele assiste a uma orientação, experimenta e confere o que fez.',
      intro:
        'As aulas são gravadas e ficam junto das atividades, no navegador. Seu filho pode pausar o vídeo, montar os blocos e testar o projeto. Para criar, precisa de computador com internet, mouse e teclado.',
      cards: [
        [
          'Começar por uma parte',
          'No primeiro acesso, acompanhe para entenderem a proposta. Combinem uma etapa possível e onde vão parar; não é preciso concluir um curso inteiro numa sessão.',
        ],
        [
          'Usar a orientação',
          'O vídeo e as atividades mostram o próximo passo. As falas do Zappy têm o botão Ouvir. Botões e blocos continuam com textos que podem pedir ajuda na leitura.',
        ],
        [
          'Conseguir ajuda',
          'Vocês podem rever a instrução e enviar a dúvida nos Recados, o canal de mensagens com a equipe. Mostrar o que tentaram e onde pararam ajuda a explicar a dificuldade.',
        ],
      ],
      paras: [
        'Vocês escolhem quando pausar e retomar durante o acesso. Celular e tablet podem abrir os jogos publicados; a criação acontece no computador.',
      ],
      kind: 'cards',
      id: 'experiencia',
      visual: {
        image: {
          src: '/img/desafio-primeiro-jogo/farol-estudio-real.webp',
          alt: 'Projeto A Chave do Farol aberto no Estúdio real, com blocos e jogo lado a lado.',
          width: 2400,
          height: 1500,
        },
        caption:
          'No Estúdio, as instruções e o resultado ficam na mesma área de trabalho. Esta é uma captura do projeto usado nas aulas.',
      },
      layout: 'visual-first',
    },
    {
      tag: 'Da criação para a escola',
      title: 'O número move a chave. A frase orienta quem joga.',
      intro:
        'A atividade dá um uso concreto a ideias que também aparecem na escola. Você pode retomar a experiência e ajudar seu filho a reconhecer essa relação.',
      cards: [
        [
          'Matemática: calcular e conferir na tela',
          'Neste exemplo, mudar a posição horizontal de 160 para 280 desloca a chave 120 unidades para a direita. A diferença entre os números corresponde a uma distância visível.',
        ],
        [
          'Português: escrever para um leitor',
          'Um aviso como “Falta a chave” precisa ajudar quem está jogando. Escolher a mensagem, reler e conferir se ela ficou clara aproxima a escrita de um bilhete ou de uma instrução escolar.',
        ],
        [
          'Investigação: procurar uma pista',
          'Quando uma regra falha, ele compara o que esperava com o que aconteceu. Fazer uma mudança de cada vez ajuda a conferir uma hipótese, como numa atividade de investigação.',
        ],
      ],
      paras: [],
      kind: 'cards',
      id: 'escola',
      visuals: [
        {
          image: {
            src: '/img/desafio-primeiro-jogo/farol-posicao-x160.webp',
            alt: 'A chave na posição horizontal 160, na experiência real da Chave do Farol.',
            width: 800,
            height: 606,
          },
          caption: 'Antes: posição horizontal 160.',
        },
        {
          image: {
            src: '/img/desafio-primeiro-jogo/farol-posicao-x280.webp',
            alt: 'A chave deslocada para a posição horizontal 280 na mesma experiência.',
            width: 800,
            height: 606,
          },
          caption: 'Depois: posição horizontal 280. A chave andou 120 unidades para a direita.',
        },
      ],
    },
    {
      tag: 'Da atividade para o dia a dia',
      title: 'Uma experiência que vocês podem retomar numa situação de verdade.',
      intro:
        'O que acontece no jogo vira uma referência para a conversa. Fora da tela, a criança encontra outros detalhes e pode precisar de novo apoio. É nessa aproximação que a família participa.',
      cards: [
        [
          'Na mochila ou no trabalho da escola',
          'Para terminar o projeto, foi preciso separar etapas. Ao preparar a mochila, pergunte o que vai ser usado primeiro. Com o adolescente, vocês podem pensar nas partes de um trabalho e em qual precisa ficar pronta antes.',
        ],
        [
          'Quando um plano muda',
          'Uma tentativa precisou de ajuste. Se uma brincadeira ou um plano com os amigos mudar, você pode retomar o que fizeram: entender o problema, considerar outra possibilidade e escolher um próximo passo.',
        ],
        [
          'Na hora de pedir ajuda',
          'Mostrar “a chave apareceu, mas o farol não acende” localiza a dificuldade. Na tarefa da escola, convide-o a apontar a parte que entendeu e aquela em que parou.',
        ],
      ],
      paras: [],
      kind: 'cards',
      id: 'pratica-4',
      visual: {
        image: {
          src: '/img/kids-aprender-criando/organizar-mochila.webp',
          alt: 'Cena ilustrada dos mascotes organizando materiais da mochila.',
          width: 1536,
          height: 1024,
        },
        caption:
          'A ordem dos passos pode virar uma conversa sobre a mochila, uma receita ou as etapas de um trabalho.',
      },
    },
    {
      tag: 'Por que manter essa prática',
      title: 'Depois de entender uma regra, vem aprender a usá-la em outra situação.',
      intro:
        'Entender uma regra com orientação é um começo. Ao encontrar outra situação, seu filho precisa decidir o que pode aproveitar, o que precisa mudar e quando pedir ajuda. A Comunidade organiza novas ocasiões para praticar esse raciocínio.',
      cards: [
        [
          'Compreender uma relação',
          'No Cadê Todo Mundo, tocar no esconderijo revela um personagem. A criança observa causa e efeito e monta as instruções para isso acontecer.',
        ],
        [
          'Combinar o que aprendeu',
          'Na Chave do Farol, pegar a chave precisa mudar uma informação do jogo para permitir a próxima ação. Agora ela relaciona uma sequência de ações e condições.',
        ],
        [
          'Usar numa ideia própria',
          'Depois de cumprir os requisitos da Jornada, pode criar no Estúdio livre com os recursos conquistados. Decidir uma regra própria exige voltar a planejar, testar e ajustar.',
        ],
      ],
      paras: [
        'A continuidade pode incluir rever uma aula, terminar uma parte ou experimentar uma mudança. Vocês escolhem um passo que caiba na rotina, usando uma parte do tempo de tela já combinado.',
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
      tag: 'O que você pode acompanhar',
      title: 'Além de ver o jogo pronto, repare em como ele participa.',
      intro:
        'Você não precisa saber programar para acompanhar. Uma escolha, uma tentativa revista ou uma dúvida bem mostrada dão um ponto de partida para conversar e ajustar a ajuda.',
      cards: [
        [
          'Na hora de começar',
          'Observe se ele consegue mostrar o que quer fazer primeiro. Se a tarefa ficou grande, ajude a escolher uma parte.',
        ],
        [
          'Diante de uma dificuldade',
          'Repare se ele localiza onde parou, aceita conferir uma instrução ou pede uma pausa. Apoie a investigação sem exigir que resolva tudo sozinho.',
        ],
        [
          'Ao mostrar o que fez',
          'Veja se ele consegue apontar uma mudança ou explicar uma escolha. Pode participar falando, mostrando na tela ou convidando você para jogar.',
        ],
      ],
      paras: [
        'Compare seu filho com o próprio percurso. O apoio pode variar entre atividades; reconhecer que precisa de ajuda também faz parte da autonomia. Para crianças menores de 9 anos, o responsável acompanha durante as atividades.',
      ],
      kind: 'cards',
      id: 'responsavel',
      visual: {
        image: {
          src: '/img/kids-aprender-criando/area-dos-pais-conversa.webp',
          alt: 'Área dos pais com sugestões de perguntas para conversar sobre uma criação.',
          width: 1092,
          height: 288,
        },
        caption:
          'A área do responsável reúne atividades e progresso e oferece perguntas para conversar sobre a criação.',
      },
    },
    {
      tag: 'Uma criação para compartilhar',
      title: 'Mostrar uma ideia dá um motivo para organizar o que se quer dizer.',
      intro:
        'Quando outra pessoa joga, ela precisa entender as regras. Você pode pedir que seu filho mostre uma escolha e acompanhar o que ele percebe quando alguém experimenta sua criação.',
      cards: [
        [
          'Um assunto entre vocês',
          '“Me mostra o que você mudou” parte de algo que ele viveu. A resposta pode vir numa explicação, num gesto ou na própria demonstração do jogo.',
        ],
        [
          'Trocas com acompanhamento',
          'No Mural e no Clube, ele encontra projetos e interações com moderação. O perfil público começa desativado, e você administra as permissões pela sua área.',
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
        'O Desafio avulso dá acesso a um primeiro projeto guiado por 30 dias. A Comunidade é a assinatura para continuar pelos cursos e recursos incluídos. Como o Desafio faz parte dela, você pode começar diretamente pela Comunidade.',
      ],
      kind: 'cards',
      id: 'incluido',
    },
  ],
  planos: {
    title: 'Escolha o plano que cabe no momento da sua família.',
    paragraph:
      'Mensal e anual incluem os mesmos cursos, recursos e até dois perfis Kids. As ferramentas seguem os requisitos da Jornada. A diferença entre os planos está no período contratado e na forma de pagamento.',
    inclui: [
      'Todos os cursos publicados e os lançados durante a assinatura',
      'O Desafio do Primeiro Jogo incluído',
      'Estúdio livre, Pinta, Pensa, a ajuda do Zappy e Molda, liberados posto a posto pela Jornada',
      'Mural e Clube dos Criadores, com moderação',
      'Dúvidas respondidas pela equipe nos Recados',
      'Até 2 perfis e a área do responsável',
    ],
    incluiLabel: 'O que os dois planos incluem',
    mensal: {
      title: 'Mensal',
      preco: '{{preco_mensal}}',
      sufixo: '/mês',
      text: '{{preco_mensal}} por mês, com renovação mensal no cartão. Você pode cancelar pela sua conta, sem multa, e mantém o acesso até o fim do período pago.',
      cta: 'Assinar o mensal',
      nota: '7 dias de garantia',
    },
    anual: {
      selo: 'Economia de {{economia_anual}}',
      title: 'Anual',
      preco: '{{preco_anual}}',
      sufixo: '/ano',
      text: '{{preco_anual}} pelo ano. Equivale a {{equivalente_mensal_anual}} por mês, sem ser um parcelamento. No Pix, pagamento à vista sem renovação automática; no cartão, renovação anual.',
      cta: 'Assinar o anual',
      nota: '7 dias de garantia',
    },
    depoisTitle: 'O que acontece depois de assinar',
    depois: [
      'Na sua área, escolha o perfil que já existe ou crie o primeiro, com nome e data de nascimento.',
      'Autoriza o computador que ele vai usar e escolhe o prazo.',
      'Ele entra com um código que você gera, válido por 10 minutos.',
      'Acessem o perfil Kids, abram o primeiro curso disponível e comecem por uma atividade com acompanhamento.',
    ],
    garantia: {
      strong: '',
      text: 'Vocês têm sete dias para conhecer as atividades e observar como a proposta funciona na rotina. Se decidirem não continuar, podem pedir a devolução integral do valor.',
    },
  },
  faqTitle: 'Para decidir com clareza',
  faq: [
    {
      question: 'Já começamos pelo presente ou pelo Desafio. Como continuar?',
      answer:
        'Use o mesmo e-mail do responsável que já tem a conta, para continuar com os perfis e o progresso existentes. Não é preciso concluir o Desafio para assinar: ele está incluído na Comunidade. A assinatura começa quando o pagamento é aprovado; dias restantes do Desafio avulso não são somados ao período contratado. Vocês podem aproveitar o acesso atual e escolher quando faz sentido continuar.',
    },
    {
      question: 'Para qual idade a Comunidade foi pensada?',
      answer:
        'Para que crianças e adolescentes de 9 a 17 anos possam participar com mais autonomia, conforme sua leitura e sua familiaridade com o computador. Crianças menores também podem fazer, acompanhadas por um responsável durante as atividades. A idade orienta o ponto de partida; a ajuda depende de cada criança.',
    },
    {
      question: 'Meu filho é autista. Como saber se a proposta combina com ele?',
      answer:
        'Observe seu interesse pela atividade, como compreende as orientações e de que apoio precisa. É possível pausar, rever e participar falando, apontando ou mostrando na tela. Comecem juntos e ajustem a duração e a ajuda. A Comunidade é uma proposta educacional; não oferece avaliação ou tratamento clínico nem promete um resultado igual para todas as crianças.',
    },
    {
      question: 'Ele precisa gostar de videogame ou saber programar?',
      answer:
        'Não precisa gostar de videogame nem saber programar. O interesse pode estar nos personagens, nas histórias, no desenho ou em criar algo com você. As primeiras atividades apresentam os comandos aos poucos. Os sete dias de garantia permitem conhecer a experiência e observar como ele participa.',
    },
    {
      question: 'E para um adolescente de 15, 16 ou 17 anos?',
      answer:
        'A plataforma usa personagens e linguagem de aventura, e as atividades envolvem regras, decisões e projetos próprios conforme a progressão. Observe com seu filho se esse formato desperta interesse. A garantia de sete dias permite conhecer a experiência antes de decidir mantê-la.',
    },
    {
      question: 'Precisa de qual equipamento?',
      answer:
        'Para criar: computador com internet, navegador, mouse e teclado. Celular e tablet servem para jogar os projetos publicados, mas não substituem o computador nas atividades de criação. As aulas são gravadas e podem ser pausadas e revistas durante o acesso.',
    },
    {
      question: 'Como funciona a ajuda quando ele trava?',
      answer:
        'Vocês podem enviar uma dúvida por escrito nos Recados, mostrando o que tentaram e onde pararam. A equipe responde por mensagens, sem aula individual ao vivo. O responsável continua ajudando conforme a necessidade da criança; para os menores de 9 anos, acompanha durante as atividades.',
    },
    {
      question: 'Todas as ferramentas ficam liberadas no primeiro dia?',
      answer:
        'Os recursos acompanham a Jornada do Criador. Nas primeiras aulas, ele usa o Estúdio dentro do curso. Ao cumprir os requisitos e publicar os projetos do posto inicial, abrem o Estúdio livre e o Pinta. Outros recursos chegam nos postos seguintes. A assinatura mantém acesso aos recursos incluídos e aos cursos publicados durante seu período ativo.',
    },
    {
      question: 'O Pensa e a ajuda do Zappy têm limites de uso?',
      answer:
        'A ajuda do Zappy no Estúdio e o Pensa usam inteligência artificial e consomem créditos, com limites por dia e por mês compartilhados pelos perfis da família. Você acompanha o saldo na sua área. As falas do Zappy nas aulas são preparadas pela equipe e não consomem esses créditos.',
    },
    {
      question: 'São dois perfis com a mesma assinatura?',
      answer:
        'Sim. A assinatura Kids permite até dois perfis de crianças ou adolescentes, cada um com seu progresso. O responsável administra o acesso pela própria conta.',
    },
    {
      question: 'Como funcionam pagamento, renovação e cancelamento?',
      answer:
        'O mensal custa {{preco_mensal}} e renova todo mês no cartão. O anual custa {{preco_anual}}: no Pix, é um pagamento à vista sem renovação automática; no cartão, renova uma vez por ano. Você cancela em Conta → Minhas compras, sem multa, e mantém o acesso até o fim do período pago. Nos primeiros sete dias, pode pedir a devolução integral do valor.',
    },
    {
      question: 'Se eu cancelar, o trabalho dele desaparece?',
      answer:
        'Perfil, progresso, projetos salvos, certificados e posto da Jornada ficam na conta. Os jogos publicados continuam disponíveis para jogar. O acesso aos cursos e às ferramentas da assinatura termina ao acabar o período pago; os registros preservados permitem retomar o percurso se vocês voltarem a assinar.',
    },
  ],
  closing: {
    title: 'Comecem por uma criação. Acompanhem as escolhas que ele faz pelo caminho.',
    zappy: {
      file: 'zappy-festa.webp',
      width: 640,
      height: 640,
      alt: '',
    },
  },
  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Ver os planos',
  },
} satisfies { sections: ComunidadePraticaSection[] } & Record<string, unknown>
