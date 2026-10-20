import { RELATOS } from './relatos'
import type { RelatoId } from './types'

// Página da Comunidade dos Criadores para 9 a 17 anos (proposta aprovada de 19/10/2026, desenho em
// docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/canvas/Pagina917.html). Toda a copy
// visível mora aqui, palavra por palavra do desenho; o body (`Comunidade917Body.astro`) só monta.
// Preços são marcadores preenchidos com os planos ao vivo: {{preco_mensal}}, {{preco_anual}},
// {{equivalente_mensal_anual}}, {{economia_anual}} e {{preco_dia}}. Falas só de `relatos.ts`.

/** Uma imagem da página: arquivo em `imagesBase`, dimensões reais e o texto alternativo do desenho. */
export interface Imagem917 {
  file: string
  width: number
  height: number
  alt: string
}

/** Uma fala de `RELATOS`; `complemento` estende a legenda (nome e papel) depois de uma vírgula. */
export interface Relato917 {
  id: RelatoId
  complemento?: string
}

export interface Cartao917 {
  title: string
  text: string
}

/** Trecho com o início em negrito, como nas listas e notas do desenho. */
export interface Destaque917 {
  strong: string
  text: string
}

const CTA_PLANOS = 'Ver os planos para meu filho'
const GARANTIA_CURTA = '7 dias de garantia. Cancele quando quiser, sem multa.'
const GARANTIA_PLANO = '7 dias de garantia'

/** "Daniel, pai do Rafael": o nome e o papel de `RELATOS`, com o papel em minúscula inicial. */
export function legendaDoRelato(id: RelatoId): string {
  const { nome, papel } = RELATOS[id]
  return `${nome}, ${papel.charAt(0).toLowerCase()}${papel.slice(1)}`
}

const FLAVIA = RELATOS.AV10

export const PAGINA_9A17 = {
  seoTitle: 'Comunidade dos Criadores para 9 a 17 anos | Sistema Zero',
  description:
    'Comunidade dos Criadores, de 9 a 17 anos. Nas aulas, ele aprende fazendo jogos completos. Cada curso que termina libera ferramentas no Estúdio dele, e é lá que ele faz os jogos que inventa e manda o link para os amigos jogarem no celular.',
  cta: CTA_PLANOS,
  garantiaCurta: GARANTIA_CURTA,

  topo: {
    pular: 'Ir para o conteúdo',
    logo: { file: 'logo-kids-claro.svg', width: 287, height: 22, alt: 'Sistema Zero Kids' },
    logoLabel: 'Sistema Zero Kids, voltar ao topo',
    navLabel: 'Atalhos da página',
    links: [
      { href: '#experiencia', label: 'Como funciona' },
      { href: '#responsavel', label: 'Para o responsável' },
    ],
    cta: { href: '#planos', label: 'Ver os planos' },
  },

  hero: {
    eyebrow: 'Comunidade dos Criadores · 9 a 17 anos',
    title: 'Seu filho conhece os jogos de cor. Imagine ele dizendo: ',
    destaque: 'esse aqui fui eu que fiz.',
    description:
      'Nas aulas, ele aprende fazendo jogos completos. Cada curso que termina libera ferramentas no Estúdio dele, e é lá que ele faz os jogos que inventa e manda o link para os amigos jogarem no celular. Você acompanha pela sua área, e não precisa entender de programação para isso.',
    benefits: [
      'Um jogo inventado por ele, com as regras dele',
      'Um jogo dele para mostrar quando você chega em casa',
      'Depois das primeiras aulas, ele faz sozinho e chama você para ver',
    ],
    requirements:
      'Para quem lê com autonomia · Computador com internet, mouse e teclado · Até 2 perfis',
    tela: {
      file: 'tela-codigo.webp',
      width: 1280,
      height: 800,
      alt: 'Estúdio no modo Ponte: os blocos de um lado, o código gerado do outro e o jogo rodando',
    },
    foto: {
      file: 'jeffrey-computador.webp',
      width: 1280,
      height: 720,
      alt: 'Jeffrey, aluno, de fone de ouvido diante do computador',
    },
    fotoLegenda: 'Jeffrey, aluno',
    chips: ['Blocos e código lado a lado', 'Link que abre no celular'],
  },

  caso: {
    eyebrow: 'Talvez seja o seu caso',
    title:
      'Ele vive no jogo. E você já se pegou pensando: se ele usasse esse tempo para aprender alguma coisa',
    paragraph:
      'Muita família passa por isso. Você procura curso de programação para criança e esbarra sempre nas mesmas coisas: o horário não encaixa, o gratuito é uma aula experimental que para ali, o pago é caro e você nem sabe se é bom. Ele tenta sozinho pelo YouTube, trava e larga. E fica a dúvida que ninguém responde: se ele está só jogando ou aprendendo alguma coisa.',
    callout:
      'Interesse ele tem de sobra. O que falta é um curso que ele comece, se interesse e não queira parar.',
  },

  muda: {
    eyebrow: 'O que muda',
    title: 'Quando ele encontra esse caminho, o jogo muda de lado',
    paragraph:
      'Ele passa a decidir como o jogo funciona, e você começa a ver isso aparecer no dia a dia.',
    cards: [
      {
        title: 'Em vez de só jogar, ele faz',
        text: 'Uma regra, uma fase, um jogo publicado. Coisa feita por ele, para mostrar para quem ele quiser.',
      },
      {
        title: 'O jogo que ele inventa no jantar vira jogo de verdade',
        text: 'Depois de publicar A Chave do Farol, ele monta no Estúdio dele, com as peças que conquistou nos cursos, e manda o link para os amigos jogarem no celular.',
      },
      {
        title: 'Quando dá errado, ele tenta de novo em vez de largar',
        text: 'Testa, vê o que saiu diferente, ajusta e testa de novo. Cada jogo que funciona é um problema que ele resolveu sozinho.',
      },
      {
        title: 'Vira assunto entre vocês',
        text: 'Você pede: me mostra o que você mudou. Ele mostra, você joga, e pela primeira vez entende o que ele faz ali.',
      },
      {
        title: 'Ele faz sozinho, no horário dele',
        text: 'Sem aula marcada e sem você em cima. O projeto fica salvo esperando a próxima ideia.',
      },
      {
        title: 'O adolescente que fala em trabalhar com jogos vê como um jogo é feito de verdade',
        text: 'Lógica, arte, 3D e, mais adiante, código, na mesma plataforma.',
      },
    ] satisfies readonly Cartao917[],
    relatosIntro: 'Quem já viu isso acontecer em casa:',
    relatos: [{ id: 'AV08' }, { id: 'AV09' }] satisfies readonly Relato917[],
  },

  porque: {
    eyebrow: 'Por que criar',
    title: 'Isso acontece porque, no jogo pronto, alguém já decidiu tudo por ele',
    paragraph:
      'Quanto o personagem pula, quanto vale cada estrela, quando a fase termina: nos jogos que ele joga, essas escolhas vieram prontas. Quando ele cria, cada escolha vira um bloco que ele monta, testa e ajusta até o jogo fazer o que ele imaginou. É nesse vai e volta que entram a lógica, o teste e a paciência para melhorar a própria ideia. Uma mãe e um pai contam como isso apareceu em casa:',
    relatos: [{ id: 'AV12' }, { id: 'N2' }] satisfies readonly Relato917[],
  },

  aulas: {
    eyebrow: 'Como funciona · nas aulas',
    title: 'Nas aulas, ele aprende fazendo um jogo completo, com o vídeo do lado do Estúdio',
    paragraph: 'Cada curso segue o mesmo caminho, sempre com o próximo passo à vista.',
    passos: [
      {
        imagem: {
          file: 'passo-joga.webp',
          width: 1260,
          height: 760,
          alt: 'A versão pronta do Cadê Todo Mundo aberta na aula, com o contador de achados',
        },
        title: '1 · Primeiro, joga o pronto',
        text: 'A aula abre com o jogo terminado, então ele já sabe aonde vai chegar.',
      },
      {
        imagem: {
          file: 'passo-video.webp',
          width: 1600,
          height: 625,
          alt: 'O vídeo da aula ao lado do Estúdio de blocos',
        },
        title: '2 · Depois, monta com o vídeo ao lado',
        text: 'Ele pausa e monta no Estúdio, o editor de blocos. O botão Ouvir lê as instruções em voz alta.',
      },
      {
        imagem: {
          file: 'passo-verificar.webp',
          width: 740,
          height: 340,
          alt: 'O botão Verificar esta parte, com o que já está cumprido e o que falta',
        },
        title: '3 · Então confere cada parte',
        text: 'O botão "Verificar esta parte" mostra o que já está certo antes de ele seguir.',
      },
      {
        imagem: {
          file: 'passo-mural.webp',
          width: 1600,
          height: 786,
          alt: 'O Mural dos Criadores com os botões Jogar, Copiar link e Fazer a minha versão',
        },
        title: '4 · Por fim, publica e manda o link',
        text: 'O jogo vai para o Mural, onde ficam os jogos da comunidade, com um link que abre no celular.',
      },
    ],
    nota: {
      strong: 'Nas primeiras aulas do Cadê Todo Mundo,',
      text: ' ele faz o esconderijo sumir ao toque e o jogo contar cada bichinho encontrado. É a primeira regra do jogo que passa a ser dele.',
    } satisfies Destaque917,
    jogosTitle: 'Os jogos que ele vai fazer primeiro',
    jogosParagraph:
      'Um projeto de cada vez, nesta ordem. Cada um deixa na caixa de ferramentas dele as peças que ensinou, e pode ir para o Mural com um link para mostrar.',
    jogos: [
      {
        imagem: {
          file: 'jogo-cade.webp',
          width: 1264,
          height: 723,
          alt: 'Cadê Todo Mundo: o jardim com o contador de achados',
        },
        title: 'Cadê Todo Mundo',
        text: 'Ele faz o jogo contar cada bichinho encontrado no jardim.',
      },
      {
        imagem: {
          file: 'jogo-farol.webp',
          width: 1280,
          height: 800,
          alt: 'A Chave do Farol: a ilha, a chave e o farol',
        },
        title: 'A Chave do Farol',
        text: 'Pega a chave, acende o farol e leva o barco até a costa.',
      },
      {
        imagem: {
          file: 'jogo-nave.webp',
          width: 1180,
          height: 690,
          alt: 'Nave Contra Asteroides: a nave, os asteroides e o placar',
        },
        title: 'Nave Contra Asteroides',
        text: 'Anda, atira, soma pontos e cuida das três vidas.',
      },
      {
        // Sem tela: o desenho põe um quadro com o texto no lugar da imagem.
        quadro: 'Do jeito dele',
        title: 'O Jogo do Meu Jeito',
        text: 'Desenha a própria nave e os asteroides e coloca no jogo.',
      },
      {
        imagem: {
          file: 'jogo-dino.webp',
          width: 1264,
          height: 723,
          alt: 'Corre, Dino: o dino, o cacto e o placar',
        },
        title: 'Corre, Dino',
        text: 'Pula os cactos e decide até onde a corrida acelera.',
      },
    ] satisfies ReadonlyArray<
      ({ imagem: Imagem917; quadro?: never } | { quadro: string; imagem?: never }) & Cartao917
    >,
    jogosNota: 'As telas são demonstrações feitas pela equipe.',
  },

  estudio: {
    eyebrow: 'Como funciona · no Estúdio dele',
    title:
      'Cada curso que ele termina vira ferramenta no Estúdio dele. E é lá que ele faz os jogos que inventa',
    paragraph:
      'As aulas ensinam com um jogo completo. O que fica para ele é a caixa de ferramentas, e ela cresce curso a curso, de propósito.',
    passos: [
      {
        title: 'Termina um curso, ganha as peças',
        text: 'Os blocos que a aula ensinou ficam para sempre na caixa dele: Colisões, Som, Aparência. Concluir e publicar os cursos de um degrau sobe de posto na Jornada do Criador.',
      },
      {
        title: 'Sobe de posto, abre a ferramenta',
        text: 'No Construtor, logo depois de A Chave do Farol, o Estúdio livre e o Pinta abrem para as ideias dele. Depois vêm o Pensa e a ajuda do Zappy, o Molda para 3D, a Ponte e o código.',
      },
      {
        title: 'Faz o jogo dele com o que já sabe',
        text: 'Em Meus Jogos, ele começa um projeto do zero com as peças que conquistou. Cada curso novo põe peças novas na caixa, e o jogo que ele consegue fazer cresce junto.',
      },
    ] satisfies readonly Cartao917[],
    telas: [
      {
        imagem: {
          file: 'tela-jornada-meus-postos.webp',
          width: 950,
          height: 387,
          alt: 'A Jornada do Criador na plataforma: Faísca libera o Estúdio nas aulas; Construtor libera o Estúdio livre e o Pinta, para criar os seus jogos com as ferramentas dos cursos que terminou',
        },
        strong: 'A Jornada dele, na plataforma.',
        text: ' O que cada posto libera, escrito na tela: no Construtor, ele cria os seus jogos com as ferramentas dos cursos que terminou.',
      },
      {
        imagem: {
          file: 'tela-estudio-lista.webp',
          width: 1280,
          height: 800,
          alt: 'A tela Meus Jogos do Estúdio, com o botão Novo projeto e os projetos próprios de um perfil de teste',
        },
        strong: 'Meus Jogos.',
        text: ' Os projetos dele no Estúdio livre, começados do zero. O botão Novo projeto abre com as peças que ele já conquistou.',
      },
    ] satisfies ReadonlyArray<{ imagem: Imagem917 } & Destaque917>,
    nota: {
      strong: 'Por que nessa ordem.',
      text: ' A caixa inteira no primeiro dia é o jeito mais rápido de ele fechar o programa: dezenas de peças e nenhuma que ele saiba usar. Aqui cada peça chega quando ele já sabe o que fazer com ela. Ele aprende de verdade, em vez de só apertar o que aparece, e o jogo dele fica maior a cada curso.',
    } satisfies Destaque917,
    relato: {
      id: 'N18',
      complemento:
        'sobre um jogo que ele mesmo inventou no Estúdio da plataforma, com o que aprendeu nos cursos',
    } satisfies Relato917,
    telasNota: 'As telas são do perfil de teste da equipe.',
  },

  jornada: {
    eyebrow: 'Jornada do Criador',
    title: 'E o caminho até o código segue o mesmo ritmo de quem aprende a ler e escrever',
    paragraph:
      'Antes de escrever, a criança aprende a falar: escuta, entende e se comunica. Depois reconhece as letras, ainda sem escrever. Só então começa a escrever. A Jornada do Criador, o caminho de postos que ele percorre aqui, tem as mesmas três fases, e é ela que decide em que ordem as ferramentas chegam.',
    fases: [
      {
        imagem: {
          file: 'tela-estudio.webp',
          width: 1280,
          height: 800,
          alt: 'Estúdio com blocos montados e o jogo rodando ao lado',
        },
        fase: 'Fase 1 · a fala',
        title: 'Blocos',
        text: 'Ele monta a lógica do jogo com blocos, entende o que cada um faz e já cria jogos inteiros. É onde ele passa a maior parte do tempo. O Construtor abre o Estúdio livre e o Pinta; o Inventor, o Pensa e a ajuda do Zappy; o Explorador de Mundos, o Molda e os jogos em 3D.',
        postos:
          'Postos Faísca, Construtor, Inventor, Explorador de Mundos, Mestre dos Jogos e Arquiteto de Mundos',
      },
      {
        imagem: {
          file: 'tela-codigo.webp',
          width: 1280,
          height: 800,
          alt: 'Modo Ponte com os blocos de um lado e o código gerado do outro',
        },
        fase: 'Fase 2 · as letras',
        title: 'Ponte',
        text: 'Cada bloco aparece ao lado do código que ele gera. Ele aprende o que cada um significa em código, ainda sem escrever.',
        postos: 'Posto Gênio da Criação',
      },
      {
        imagem: {
          file: 'estudio-pro-codigo.webp',
          width: 1440,
          height: 1000,
          alt: 'Editor em modo código, com os arquivos do jogo',
        },
        fase: 'Fase 3 · a escrita',
        title: 'Código',
        text: 'Com a base firme, ele passa a escrever o jogo em código.',
        postos: 'Posto Lenda',
      },
    ],
    idadeIntro: 'E o caminho conversa com a idade dele.',
    idades: [
      {
        imagem: {
          file: 'tela-aula-estudio.webp',
          width: 1280,
          height: 800,
          alt: 'Aula com o vídeo do jardim ao lado do Estúdio de blocos',
        },
        title: 'De 9 a 12 anos',
        text: 'Ele manda o primeiro link para os amigos e, no Construtor, desenha personagens e cenários no Pinta. Nas primeiras aulas, vale sentar junto. Depois, basta pedir: me mostra o que você mudou.',
      },
      {
        imagem: {
          file: 'tela-molda.webp',
          width: 1280,
          height: 800,
          alt: 'Molda com um personagem 3D feito de blocos',
        },
        title: 'De 13 a 17 anos',
        text: 'O projeto é dele do começo ao fim. Ele publica, vê gente jogando e pode fazer a própria versão de jogos do Mural. Mais adiante na trilha, a mesma regra aparece em código.',
      },
    ] satisfies ReadonlyArray<{ imagem: Imagem917 } & Cartao917>,
  },

  responsavel: {
    eyebrow: 'Para o responsável',
    title: 'Enquanto isso, você acompanha de longe, sem ficar em cima dele',
    paragraph: 'Na sua área, você vê o que ele está fazendo e decide como ele entra na plataforma.',
    itens: [
      {
        strong: 'Um painel para cada filho',
        text: ' mostra os cursos, as atividades, as entregas e o posto da Jornada.',
      },
      {
        strong: 'Toda sexta, às 17h,',
        text: ' chega um resumo da semana por e-mail, com os jogos que ele publicou. Dá para desligar.',
      },
      {
        strong: 'Você autoriza cada computador',
        text: ' e escolhe por quanto tempo, de um dia a 90 dias. Ele entra com um código que vale 10 minutos.',
      },
      {
        strong: 'São até 2 perfis,',
        text: ' cada um com seus jogos, seu progresso e sua Jornada.',
      },
    ] satisfies readonly Destaque917[],
    relato: { id: 'N8' } satisfies Relato917,
    painel: {
      file: 'tela-pais-painel.webp',
      width: 1152,
      height: 640,
      alt: 'Painel do responsável com as atividades da semana de um filho',
    },
    relatoPainel: { id: 'N15' } satisfies Relato917,
  },

  seguranca: {
    eyebrow: 'Segurança',
    title: 'Você também vai querer saber onde ele está criando e com quem conversa',
    paragraph: 'Por isso, a Comunidade tem regras claras, que você pode conferir.',
    regras: [
      {
        title: 'O Clube é só de alunos',
        text: 'E as mensagens passam pela equipe antes de aparecer.',
      },
      { title: 'O perfil público começa desligado', text: 'Só você pode ligar.' },
      {
        title: 'O jogo público não mostra o nome dele',
        text: 'A página do jogo mostra só o jogo e o título.',
      },
      {
        title: 'Não existe chat livre',
        text: 'Nas aulas gravadas, os alunos não conversam entre si.',
      },
      {
        title: 'O microfone vem desligado',
        text: 'Falar em vez de escrever só funciona se você liberar.',
      },
      {
        title: 'Você pode pedir a remoção',
        text: 'Qualquer publicação dele sai do Clube a pedido seu.',
      },
    ] satisfies readonly Cartao917[],
    nota: 'A moderação diminui riscos, e a conversa em casa continua importante. Por isso, o resumo da semana mostra o que ele publicou.',
  },

  fundadores: {
    imagem: {
      file: 'fundadores-casa.webp',
      width: 1280,
      height: 832,
      alt: 'Helena e Júlio, fundadores do Sistema Zero, em casa, diante do notebook',
    },
    eyebrow: 'Quem está por trás',
    title: 'Tudo isso começou aqui em casa, com o tempo que nosso filho passava jogando',
    paragraph:
      'Somos Helena e Júlio, pais do André e da Débora, formados em Sistemas de Informação. Em vez de brigar com o interesse do André por jogos, usamos uma parte do tempo que ele já ficava na tela para ensiná-lo a criar os próprios jogos. A Comunidade nasceu desse caminho, e somos nós que preparamos as aulas.',
    relato: { id: 'AV04' } satisfies Relato917,
  },

  planos: {
    title: 'Para começar, escolha o plano que cabe na rotina de vocês',
    paragraph:
      'Os dois planos dão acesso a tudo. Os cursos novos entram assim que são lançados, e os postos da Jornada vão abrindo ferramentas novas. A diferença está só na forma de pagar.',
    inclui: [
      'Todos os cursos publicados e os lançados durante a assinatura',
      'O Desafio do Primeiro Jogo incluído',
      'Estúdio livre, Pinta, Molda e Pensa, liberados posto a posto pela Jornada',
      'Mural e Clube dos Criadores',
      'Dúvidas por escrito com a equipe, nos Recados',
      'Até 2 perfis e a área do responsável',
    ],
    incluiLabel: 'O que os dois planos incluem',
    mensal: {
      title: 'Mensal',
      preco: '{{preco_mensal}}',
      sufixo: '/mês',
      text: 'Menos de {{preco_dia}} por dia. Renova todo mês no cartão, e você cancela quando quiser na sua área, sem multa.',
      cta: 'Assinar o mensal',
      nota: GARANTIA_PLANO,
    },
    anual: {
      selo: 'Economia de {{economia_anual}}',
      title: 'Anual',
      preco: '{{preco_anual}}',
      sufixo: '/ano',
      text: 'Sai por {{equivalente_mensal_anual}} por mês. No Pix à vista, não renova sozinho; no cartão, renova uma vez por ano.',
      cta: 'Assinar o anual',
      nota: GARANTIA_PLANO,
    },
    depoisTitle: 'O que acontece depois de assinar',
    depois: [
      'Você cria o perfil dele na sua área, com nome e data de nascimento.',
      'Autoriza o computador que ele vai usar e escolhe o prazo.',
      'Ele entra com um código que você gera, válido por 10 minutos.',
      'A primeira aula abre com o jogo pronto, e a montagem começa na mesma aula.',
    ],
    garantia: {
      strong: 'Vocês têm 7 dias para ver como ele se sai na primeira aula.',
      text: ' Se não for para vocês, devolvemos o valor inteiro.',
    } satisfies Destaque917,
  },

  faqTitle: 'Algumas dúvidas que costumam aparecer nessa hora',
  faq: [
    {
      question: 'Meu filho tem 15 anos. Não vai achar infantil?',
      answer:
        'As instruções têm o Zappy, o mascote da plataforma, e uma linguagem de aventura. Mas o que ele faz é jogo de verdade: regras, personagens, publicação e, mais adiante, código, como no print do topo desta página. Os 7 dias de garantia servem justamente para ele testar com você.',
    },
    {
      question: 'Ele pode fazer o jogo dele desde o primeiro dia?',
      answer:
        'Nas aulas, desde a primeira: cada uma traz os personagens e as peças daquela atividade, e ele já decide regra e personagem ali. O Estúdio livre, para os projetos dele, abre no posto Construtor, logo depois de concluir e publicar A Chave do Farol, com as peças dos cursos que ele terminou. É de propósito: ele nunca fica diante de uma ferramenta que ainda não sabe usar.',
    },
    {
      question: 'E se ele largar depois de um mês?',
      answer:
        'Você cancela na sua área, sem multa, e o acesso segue até o fim do período pago. O progresso e os jogos dele ficam guardados. Se for só uma pausa, o modo férias protege a sequência de dias dele enquanto a assinatura continua.',
    },
    {
      question: 'Ele consegue fazer sozinho?',
      answer: `Se ele lê com autonomia e usa mouse e teclado, consegue. O vídeo fica ao lado do editor, o botão Ouvir lê as instruções e cada parte pode ser conferida antes de seguir. Nas primeiras aulas, vale sentar junto. A ${legendaDoRelato('AV10')}, conta: "${FLAVIA.fala}"`,
    },
    {
      question: 'Eu não entendo nada de programação. Consigo ajudar?',
      answer:
        'Não precisa ajudar com a programação: a aula faz isso. O que ajuda é perguntar: me mostra o que você mudou. Se ele travar, o botão Preciso de ajuda manda a dúvida para a equipe, e a resposta chega por escrito nos Recados.',
    },
    {
      question: 'Ele precisa saber desenhar?',
      answer:
        'Não. Os cenários e os personagens das aulas vêm prontos. O Pinta, o editor de desenho, e o Molda, o de 3D, chegam pela Jornada para quando ele quiser criar os seus.',
    },
    {
      question: 'Ele já usa Scratch, Roblox Studio ou tutoriais do YouTube. Qual é a diferença?',
      answer:
        'Scratch e Roblox Studio são grátis e ótimos para quem já sabe por onde começar, e o YouTube ensina um passo solto. Aqui ele tem aulas em português, um projeto de cada vez, a sequência que continua de um projeto para o próximo e um espaço só de alunos, com o caminho dos blocos até o código. Para quem precisa de professor ao lado em horário fixo, uma escola ao vivo pesa a favor.',
    },
    {
      question: 'Que computador precisa?',
      answer:
        'Um computador com internet, navegador atualizado, mouse e teclado. Pode ser o da família. Tudo roda no navegador, sem instalar nada. Celular e tablet não servem para criar, só para jogar o que ele publicou.',
    },
    {
      question: 'Vai aumentar o tempo de tela?',
      answer:
        'Os combinados continuam com a família. A ideia é trocar uma parte do tempo de assistir por tempo de criar, e ele pode parar quando quiser e continuar de onde parou.',
    },
    {
      question: 'Tem aula ao vivo?',
      answer:
        'As aulas são gravadas, e as dúvidas vão por escrito para a equipe nos Recados, o canal de mensagens da plataforma.',
    },
    {
      question: 'Tenho dois filhos de idades diferentes.',
      answer:
        'A assinatura tem até 2 perfis, cada um com seus jogos, seu progresso e sua Jornada. Se o mais novo ainda não lê sozinho, ele cria junto com você.',
    },
    {
      question: 'Como cancelo? O que acontece com os jogos?',
      answer:
        'Na sua área, em Conta e depois em Minhas compras, sem multa e sem fidelidade. O acesso segue até o fim do período pago, e os jogos publicados continuam no Mural.',
    },
  ],

  closing: {
    title: 'A próxima partida em casa pode ser num jogo feito por ele',
    zappy: { file: 'zappy-festa.webp', width: 640, height: 640, alt: '' },
  },

  rodape: {
    logo: { file: 'logo-kids-escuro.svg', width: 193, height: 18, alt: 'Sistema Zero Kids' },
    aviso: 'Comunicação dirigida aos responsáveis',
    links: [
      { href: '/kids/comunidade-dos-criadores/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
    ],
  },

  barra: {
    preco: '{{preco_mensal}}/mês',
    alternativa: 'ou {{equivalente_mensal_anual}}/mês no anual',
    cta: 'Ver os planos',
  },

  /** Capa do JSON-LD de produto (a mesma do checkout). */
  capa: 'checkout-capa.webp',
} as const

/** As falas de `RELATOS` usadas na página, na ordem em que aparecem (AV10 vai dentro de uma dúvida). */
export const RELATOS_9A17 = [
  'AV08',
  'AV09',
  'AV12',
  'N2',
  'N18',
  'N8',
  'N15',
  'AV04',
  'AV10',
] as const satisfies readonly RelatoId[]
