import type { ComunidadeSection } from '../funnels/comunidade-dos-criadores/oferta/types'

/**
 * Copy da página de recebimento do presente Kids (`/bolsa/<codigo>` com o público `kids`), revista
 * no Canvas "Presente Kids e adulto · proposta" (quadro RecebimentoKids, aprovado em 20/10/2026).
 * `PresenteOferta.astro` renderiza todo texto visível a partir daqui. `{{nome}}` é quem deu o
 * presente (o embaixador ou o nome da campanha) e `{{data}}` uma data de Brasília.
 */
export interface ImagemPresente {
  src: string
  alt: string
  width: number
  height: number
}

/** Os estados da página sem formulário, com a etiqueta, o título e o texto de cada um. */
export interface EstadoPresente {
  etiqueta: string
  titulo: string
  texto: string
}

export interface EstadosPresente {
  preparing: EstadoPresente
  scheduled: EstadoPresente
  paused: EstadoPresente
  ended: EstadoPresente
  /** O título do encerramento sem a data (convite pessoal, que não tem fim de campanha). */
  endedSemData: string
  retomar: { botao: string; texto: string }
  naoEncontrado: EstadoPresente
  foraDoAr: EstadoPresente
  contato: string
}

const IMG_KIDS = '/img/comunidade-dos-criadores'

export const PRESENTE_KIDS = {
  seoTitle: 'Presente Cadê Todo Mundo | Sistema Zero',
  description:
    'Em 7 dias, seu filho faz um jogo de procurar personagens funcionar, com a explicação ao lado. Presente gratuito para crianças de 9 a 14 anos, sem cartão.',
  previaTitle: 'Prévia da campanha | Sistema Zero',
  pular: 'Ir para o conteúdo',
  topo: {
    logo: {
      src: `${IMG_KIDS}/logo-kids-claro.svg`,
      alt: 'Sistema Zero Kids',
      width: 287,
      height: 22,
    } satisfies ImagemPresente,
    marcaAria: 'Sistema Zero Kids, voltar ao topo',
    navAria: 'Atalhos da página',
    links: [
      { href: '#jogo', label: 'O que ele faz' },
      { href: '#duvidas', label: 'Antes de começar' },
    ],
    cta: 'Quero o presente',
  },
  origem: {
    pessoal: 'Um presente de {{nome}} para a sua família',
    evento: 'Um presente de {{nome}} para continuar em casa',
    campanha: '{{nome}}',
  },
  previa:
    'Prévia da campanha. Esta página demonstra a apresentação e não aceita cadastros. O link público da campanha respeita o estado e as datas configurados no Admin.',
  hero: {
    titulo: {
      antes: 'Em 7 dias, seu filho faz um jogo de procurar personagens ',
      destaque: 'funcionar.',
    },
    texto:
      'No Cadê Todo Mundo, o jardim e os personagens já estão prontos. Seu filho acompanha a orientação, monta as regras que fazem os esconderijos sumirem e cada achado entrar na contagem. Depois, testa e vê o resultado no próprio jogo.',
    beneficios: [
      'Um primeiro jogo, com o vídeo da aula ao lado de onde ele monta',
      '7 dias de curso e de Mural, contados do cadastro',
      'Gratuito, sem cartão e sem assinatura automática',
    ],
    cta: 'Quero o presente para meu filho',
    link: 'Ver o que ele vai fazer',
    requisitos:
      'Para crianças de 9 a 14 anos · Computador com mouse e teclado · O cadastro pode ser feito pelo celular',
    prazoCampanha:
      'Novos cadastros até {{data}} (Brasília). Esse prazo é da campanha; cada família aceita tem os próprios 7 dias de curso.',
    figura: {
      rotulo: 'O jogo do presente',
      imagem: {
        src: `${IMG_KIDS}/jogo-cade.webp`,
        alt: 'Cadê Todo Mundo: o jardim com o arbusto, a pedra, as flores e o contador de achados',
        width: 1264,
        height: 723,
      } satisfies ImagemPresente,
      zappy: {
        src: `${IMG_KIDS}/zappy-fala.webp`,
        alt: '',
        width: 360,
        height: 458,
      } satisfies ImagemPresente,
      destaque: 'O Zappy acompanha as fases.',
      legenda: ' Ele fala o que fazer em cada passo, e seu filho confere se a regra funcionou.',
    },
  },
  jogo: {
    etiqueta: 'O que ele faz',
    titulo: 'O personagem aparece quando a regra que ele montou funciona',
    paragrafos: [
      'Primeiro, ele explora a brincadeira de procurar quem está escondido no jardim. Depois, conhece a regra por trás dela: quando alguém toca no esconderijo, ele precisa sumir para revelar quem estava ali.',
      'Ele monta o comando, testa e observa. Se o esconderijo continua no lugar, há algo para conferir. Quando a regra funciona, o personagem aparece. Mais adiante, ele faz o jogo contar cada achado.',
    ],
    nota: 'Em casa, peça para ele mostrar o que mudou e qual comando fez isso acontecer. Os dois conseguem ver a resposta no jogo.',
    imagem: {
      src: `${IMG_KIDS}/tela-regra-ligada.webp`,
      alt: 'Fase do Cadê Todo Mundo: o toque no arbusto revela o coelho, com o Zappy explicando ao lado',
      width: 1280,
      height: 800,
    } satisfies ImagemPresente,
  },
  aula: {
    etiqueta: 'Como é uma aula',
    titulo: 'A explicação fica ao lado do que ele está construindo',
    imagem: {
      src: `${IMG_KIDS}/tela-aula-estudio.webp`,
      alt: 'Aula com o vídeo da orientação ao lado do Estúdio',
      width: 1280,
      height: 800,
    } satisfies ImagemPresente,
    passos: [
      { titulo: 'Ver', texto: 'Ele assiste a um passo da orientação e pausa quando quiser.' },
      { titulo: 'Fazer', texto: 'Faz a mesma ação no projeto, com os blocos ao lado do vídeo.' },
      {
        titulo: 'Conferir',
        texto: 'Testa no jogo. Se algo não saiu, volta à explicação antes de seguir.',
      },
    ],
    nota: 'As aulas são gravadas, sem horário de turma. Use um momento do tempo de computador que vocês já permitem e acompanhe o primeiro acesso para ver de que ajuda ele precisa.',
  },
  mural: {
    etiqueta: 'O Mural dos Criadores',
    titulo: 'Ele publica o jogo e manda o link para a família jogar',
    paragrafos: [
      'Nos 7 dias, ele publica no Mural o jogo que fez no curso. A aula 2 ensina o caminho. O link abre o jogo sem conta, para você, os avós e os amigos.',
      'Ele também joga os jogos de outras crianças, comenta e reage. Ao cumprir as atividades de conclusão, recebe o certificado do curso.',
    ],
    imagem: {
      src: `${IMG_KIDS}/tela-jogo-publicado.webp`,
      alt: 'Página de um jogo publicado no Mural, aberta sem conta',
      width: 1280,
      height: 800,
    } satisfies ImagemPresente,
  },
  plataforma: {
    etiqueta: 'A plataforma por trás do presente',
    titulo:
      'O Cadê Todo Mundo é o primeiro jogo. Na Comunidade, ele segue criando outros, cada vez maiores',
    paragrafos: [
      'No Sistema Zero Kids, os cursos seguem em sequência, cada um com um jogo. O Estúdio é onde as crianças montam os próprios jogos, o Mural mostra o que elas publicam, o Clube junta quem está criando e a equipe responde as dúvidas nos Recados. Cada curso concluído e publicado leva a um posto novo da Jornada do Criador.',
      'O presente inclui o curso e o Mural por 7 dias. O resto faz parte da Comunidade dos Criadores, uma assinatura à parte, que vocês decidem depois, se quiserem.',
    ],
    imagem: {
      src: `${IMG_KIDS}/familia-helena-julio-kids.webp`,
      alt: 'Helena e Júlio, criadores do Sistema Zero, na foto e como personagens da plataforma',
      width: 880,
      height: 1019,
    } satisfies ImagemPresente,
  },
  condicoes: {
    etiqueta: 'O presente da sua família',
    titulo: 'O que o presente inclui',
    cartoes: [
      {
        titulo: 'O curso por 7 dias',
        texto: 'O Cadê Todo Mundo inteiro, contado a partir do cadastro.',
      },
      {
        titulo: 'O Mural por 7 dias',
        texto:
          'Publicar, comentar e reagir. Depois, a conta continua vendo e jogando, e o link do jogo publicado segue no ar.',
      },
      {
        titulo: 'Nenhum pagamento',
        texto: 'Sem cartão. Quando os 7 dias terminam, nenhuma cobrança começa.',
      },
    ],
    cta: 'Liberar o presente para minha família',
  },
  duvidas: {
    titulo: 'Antes de começar com seu filho',
    itens: [
      {
        pergunta: 'Ele precisa saber programar?',
        resposta: 'Não. O curso começa com blocos, e cada parte é conferida antes da próxima.',
      },
      {
        pergunta: 'Para qual idade é o presente?',
        resposta: 'Para crianças e adolescentes de 9 a 14 anos que estão começando.',
      },
      {
        pergunta: 'Funciona no celular ou no tablet?',
        resposta:
          'As atividades pedem um computador com internet, mouse e teclado. O cadastro pode ser feito pelo celular.',
      },
      {
        pergunta: 'Quando os 7 dias começam?',
        resposta:
          'No cadastro. Escolha um momento em que ele possa usar o computador nos dias seguintes.',
      },
      {
        pergunta: 'E se ele travar numa parte?',
        resposta:
          'Cada fase tem a explicação ao lado e o botão Preciso de ajuda, que leva a dúvida para a equipe nos Recados.',
      },
      {
        pergunta: 'Posso resgatar mais de um presente?',
        resposta:
          'Cada e-mail resgata um presente Kids. Se você também receber um presente adulto, para criar o seu próprio jogo, pode usar o mesmo e-mail nele.',
      },
    ],
  },
  resgatar: {
    etiqueta: 'O primeiro passo é do responsável',
    titulo: 'Libere o presente e combine o primeiro momento com ele',
    texto:
      'Você cadastra a sua conta com os seus dados. Depois, já na plataforma, cria o perfil do seu filho e abre o curso no computador.',
    previa:
      'O formulário aparece no link público quando a campanha estiver aberta e o curso disponível. Nesta prévia, nenhum acesso é criado.',
  },
  barra: { titulo: 'Presente de 7 dias', texto: 'Sem cartão', cta: 'Quero o presente' },
  estados: {
    preparing: {
      etiqueta: 'Cadastro ainda fechado',
      titulo: 'O cadastro por este link ainda não abriu',
      texto:
        'Guarde esta página e volte em alguns dias. O presente vale 7 dias contados do cadastro, então nada se perde enquanto isso.',
    },
    scheduled: {
      etiqueta: 'Cadastro ainda fechado',
      titulo: 'O cadastro por este link abre em {{data}}',
      texto:
        'Guarde esta página e volte a partir dessa data. O presente vale 7 dias contados do cadastro.',
    },
    paused: {
      etiqueta: 'Campanha pausada',
      titulo: 'Os cadastros por este link estão pausados',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem já recebeu o presente mantém o prazo informado no cadastro.',
    },
    ended: {
      etiqueta: 'Campanha encerrada',
      titulo: 'Os cadastros por este link terminaram em {{data}}',
      texto:
        'Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem recebeu o presente dentro do período mantém os 7 dias contados do cadastro.',
    },
    endedSemData: 'Os cadastros por este link terminaram',
    retomar: {
      botao: 'Já comecei o cadastro',
      texto:
        'Reenvie com o mesmo e-mail para retomar um cadastro aceito antes. Isso não abre um novo acesso nem reinicia o prazo.',
    },
    naoEncontrado: {
      etiqueta: 'Link inválido',
      titulo: 'Este convite não está disponível',
      texto:
        'Confira se o link foi copiado por inteiro. Se alguém mandou o convite para você, peça o link de novo.',
    },
    foraDoAr: {
      etiqueta: 'Tente de novo',
      titulo: 'Não conseguimos abrir o seu convite agora',
      texto:
        'Recarregue a página em alguns instantes. Isso não cria um cadastro nem começa o prazo do curso.',
    },
    contato: 'Falar com a equipe',
  } satisfies EstadosPresente,
}

const section = (
  id: string,
  eyebrow: string,
  title: string,
  paragraphs: string[],
  visuals: string[],
): ComunidadeSection => ({
  id,
  eyebrow,
  title,
  layout: 'story',
  groups: [{ title: null, paragraphs }],
  visuals,
  actions: [],
})

/** Mesma experiência para convite pessoal e campanha; a origem muda, os direitos não. */
export const GIFT_SECTIONS = [
  section(
    'experiencia',
    'Um jogo que ele ajuda a fazer funcionar',
    'O personagem aparece quando a regra que seu filho montou funciona.',
    [
      'No Cadê Todo Mundo, seu filho começa explorando uma brincadeira de procurar personagens escondidos em um jardim. Depois, conhece uma das regras por trás dela: quando alguém toca no esconderijo, ele precisa desaparecer para revelar quem estava ali.',
      'A criança monta o comando, testa e observa. Se o esconderijo continua no lugar, há algo para conferir. Quando a regra funciona, o personagem aparece. Mais adiante, ela trabalha a contagem para o jogo registrar cada achado.',
      'Em casa, você pode pedir: “Me mostra o que mudou? Qual comando fez isso acontecer?”. A aprendizagem ganha um exemplo que os dois conseguem ver no jogo.',
    ],
    ['regra', 'contador'],
  ),
  section(
    'comeco',
    'Um primeiro projeto com direção',
    'O jardim está preparado. Seu filho monta as regras.',
    [
      'Seu filho não precisa começar diante de uma tela vazia. O cenário e os personagens já estão preparados para a atividade. Há uma tarefa concreta: fazer os esconderijos responderem aos toques e contar os personagens encontrados.',
      'Isso deixa espaço para aprender uma parte da criação de cada vez. Ele acompanha a montagem com blocos, experimenta os comandos apresentados e confere o resultado. Saber programar antes não é requisito, e ele não precisa desenhar os personagens para fazer este curso.',
    ],
    ['aula'],
  ),
  section(
    'aula',
    'Ver, fazer e conferir',
    'A explicação fica ao lado do que seu filho está construindo.',
    [
      'Na tela da aula, seu filho encontra o vídeo com a orientação e a atividade para colocar a ideia em prática. Ele pode assistir a um passo, pausar e fazer a ação no projeto. Se não entendeu um detalhe, volta à explicação antes de continuar.',
      'A orientação e o trabalho ficam juntos. Você consegue olhar a tela com ele e entender o que está tentando fazer; ele consegue comparar o que ouviu com o que aconteceu na própria atividade. O curso usa o Estúdio dentro desse projeto guiado, e o presente não libera o Estúdio livre, onde se criam jogos do zero.',
    ],
    ['aula-estudio'],
  ),
  section(
    'rotina',
    'Cabe na vida da sua família',
    'Reserve um momento do tempo de computador que vocês já permitem.',
    [
      'Não é preciso aumentar o tempo de tela para experimentar. Vocês podem combinar que uma parte do período já permitido será usada para construir o jogo e conversar sobre o que aconteceu.',
      'As aulas são gravadas: não há horário de turma para encaixar na agenda. Durante os sete dias de acesso, vocês escolhem quando entrar e podem pausar e rever as explicações. Vale acompanhar o primeiro acesso, ajudar a encontrar os controles e observar de que companhia seu filho precisa.',
      'Algumas crianças seguem com a orientação da tela; outras pedem ajuda para ler uma instrução ou retomar uma etapa. O curso oferece um caminho para começar. A autonomia é construída nesse uso, respeitando o momento de cada criança.',
    ],
    ['pausa'],
  ),
  section(
    'conquista',
    'Do experimento à conclusão',
    'Ao terminar, ele tem um jogo para mostrar e explicar.',
    [
      'O percurso passa por experimentar o jogo, montar as reações e trabalhar a contagem dos achados. Em cada etapa, seu filho pode testar e perceber como uma regra interfere na brincadeira.',
      'Ao cumprir as atividades de conclusão, ele recebe o certificado do curso. Mais que olhar esse registro, peça para ele mostrar uma parte do projeto e contar o que aprendeu a fazer. Não há promessa de concluir em uma tarde: aproveitem os sete dias para seguir as etapas com atenção.',
    ],
    ['certificado'],
  ),
  section(
    'mural',
    'Um jogo para compartilhar',
    'Ele cria o jogo. Depois, pode convidar a família para jogar.',
    [
      'Durante os sete dias, seu filho pode publicar no Mural dos Criadores o jogo que fez no Cadê Todo Mundo, seguindo as orientações e atividades do curso. A aula 2 ensina esse caminho. Depois de publicar, ele recebe um link para convidar você, os avós ou os amigos para jogar, sem que eles precisem de uma conta.',
      'Nesse período, ele também pode conhecer os jogos de outras crianças, jogar, comentar e reagir. Você pode acompanhar esse momento: pedir que ele mostre uma regra que criou, experimentar o jogo e conversar sobre o que achou interessante em outra criação.',
      'Quando os sete dias terminam, o curso e as ações de publicar, comentar e reagir deixam de estar liberados por este convite. Sua conta continua podendo ver e jogar no Mural enquanto existir. O link do jogo que ele já publicou continua funcionando enquanto a publicação estiver disponível.',
      'Este é o Mural da plataforma. Fazer a própria versão de jogos do Mural e usar ferramentas de criação livre depende dos acessos e das etapas da Comunidade; esses recursos não fazem parte do presente.',
    ],
    ['mural'],
  ),
  section(
    'gratuito',
    'Conheça nosso jeito de ensinar',
    'É gratuito para sua família experimentar de verdade.',
    [
      'O Sistema Zero é uma plataforma de aprendizagem criativa. Crianças acompanham orientações, fazem atividades e testam suas ideias. Este convite oferece um começo concreto: o curso Cadê Todo Mundo e a participação no Mural por sete dias, com visita ao Mural depois desse prazo.',
      'Queremos que você veja como seu filho participa dessa experiência antes de decidir se deseja continuar. O cadastro não pede cartão e não cria uma assinatura. Ao fim dos sete dias, o curso deixa de estar disponível por este presente; não começa uma cobrança.',
      'Se depois vocês quiserem seguir, existe a Comunidade dos Criadores, que reúne os outros cursos, as ferramentas de criação, o Clube, o Mural e as dúvidas respondidas pela equipe nos Recados. Essa assinatura é uma escolha separada do responsável. Você pode conhecer o presente agora sem assumir esse compromisso.',
    ],
    [],
  ),
] satisfies ComunidadeSection[]

export const GIFT_FAQ = [
  {
    id: 'programar',
    question: 'Meu filho precisa saber programar?',
    visual: 'aula-estudio',
    paragraphs: [
      'Não precisa chegar sabendo. O curso apresenta os comandos usados neste projeto e mostra como montá-los com blocos. Seu filho recebe uma tarefa definida e pode comparar o resultado com a orientação da aula.',
      'Para começar bem, sente com ele no primeiro acesso e confira se consegue acompanhar as instruções e usar os controles. Essa companhia inicial ajuda a descobrir o que já faz sozinho e em que ainda precisa de você.',
    ],
  },
  {
    id: 'desenhar',
    question: 'Ele precisa saber desenhar?',
    visual: 'aula',
    paragraphs: [
      'Não. Neste projeto, o jardim e os personagens já estão preparados. O trabalho da criança é montar e testar as regras que fazem a brincadeira funcionar.',
      'Assim, ela pode se concentrar na programação, sem desenhar antes. O presente não é um curso de desenho e não libera o Pinta para uso livre.',
    ],
  },
  {
    id: 'idade',
    question: 'Como saber se meu filho está pronto para experimentar?',
    visual: 'aula',
    paragraphs: [
      'O Cadê Todo Mundo é apresentado para crianças e adolescentes de 9 a 14 anos que estão começando. Além da idade, observe se seu filho consegue acompanhar uma instrução curta e usar mouse e teclado, sozinho ou com sua ajuda.',
      'Se ele ainda precisa de companhia para ler ou encontrar os controles, reserve esse primeiro momento para fazerem juntos. Não é preciso chegar com experiência em criação de jogos.',
    ],
  },
  {
    id: 'computador',
    question: 'Dá para fazer o curso pelo celular?',
    visual: 'aula-estudio',
    paragraphs: [
      'Você pode abrir este convite e cadastrar sua conta pelo celular. Para seu filho realizar as atividades de criação, separe um computador ou notebook com internet, mouse e teclado.',
      'A atividade envolve acompanhar a orientação e manipular elementos do projeto. Ter esse equipamento pronto evita que vocês descubram essa necessidade só depois de iniciar o prazo de acesso.',
    ],
  },
  {
    id: 'horario',
    question: 'As aulas têm horário marcado?',
    visual: 'pausa',
    paragraphs: [
      'As aulas são gravadas. Durante o prazo de acesso, vocês escolhem o momento de entrar, podem pausar a explicação para fazer a atividade e voltar a um trecho quando precisarem.',
      'Isso ajuda quando seu filho precisa de mais tempo em um passo ou quando a rotina pede uma pausa. Combine um momento possível dentro dos sete dias; assistir mais rápido não é o objetivo, entender e testar faz parte do percurso.',
    ],
  },
  {
    id: 'ajuda',
    question: 'E se meu filho travar em uma atividade?',
    visual: 'recados',
    paragraphs: [
      'Durante os sete dias de acesso ao curso, seu filho pode pedir orientação pelo botão “Preciso de ajuda”, no rodapé de cada aula. Ao clicar, abre um campo para contar em que parte ficou com dúvida. Se ele precisar de companhia para escrever, vocês podem fazer isso juntos.',
      'Ajude-o a contar o que tentou e o que aconteceu na tela. Por exemplo: “Cliquei no arbusto, mas o personagem não apareceu. O que preciso conferir?”. Depois, é só clicar em “Enviar ao professor”. A plataforma envia junto a identificação da aula e da etapa em que ele está, para o professor saber de onde veio a dúvida.',
      'A resposta chega nos Recados, dentro da própria plataforma. É ali que vocês acompanham a orientação e continuam a conversa se ainda tiverem dúvidas. Esse atendimento acontece por mensagens e pode haver espera pela resposta.',
      'Você não precisa saber programar para participar desse momento. Pode ajudá-lo a mostrar onde parou, rever um trecho da explicação e organizar a pergunta. A dúvida sobre a atividade vai para o professor; você pode acompanhar seu filho sem ter que descobrir a resposta por conta própria.',
    ],
  },
  {
    id: 'prazo',
    question: 'Quando começam e terminam os sete dias?',
    visual: 'pausa',
    paragraphs: [
      'O prazo começa no cadastro aceito por este link, não no primeiro vídeo assistido. Depois da liberação, a confirmação mostra a data e a hora de vencimento. Criar ou recuperar a senha mais tarde não reinicia esse prazo.',
      'Se o convite faz parte de uma campanha, a data de encerramento dela é o limite para novos cadastros. Quem se cadastra dentro do prazo mantém os sete dias, ainda que a campanha termine no dia seguinte.',
    ],
  },
  {
    id: 'cartao',
    question: 'Vou precisar pagar ou cadastrar um cartão?',
    visual: null,
    paragraphs: [
      'Não. O presente é gratuito e este cadastro não pede cartão. Ao final dos sete dias, o acesso ao curso termina sem gerar cobrança ou assinatura automática.',
      'Se quiser continuar com a Comunidade dos Criadores, você conhecerá uma oferta separada e decidirá se deseja contratar. Não é preciso assinar para receber este presente.',
    ],
  },
  {
    id: 'publicar',
    question: 'Meu filho pode publicar o jogo dele e compartilhar com a família?',
    visual: 'mural',
    paragraphs: [
      'Sim. Durante os sete dias do presente, ele pode publicar o jogo que está criando no Cadê Todo Mundo, cumprindo as atividades e seguindo a orientação da aula 2. A publicação faz parte dessa experiência de criar algo que outras pessoas podem jogar.',
      'Depois de publicar, vocês podem compartilhar o link com familiares e amigos. Quem recebe abre o jogo no navegador, sem cadastro. Nesse período, seu filho também pode comentar e reagir às criações no Mural.',
      'O fim dos sete dias encerra a participação liberada pelo convite, mas não faz o link do jogo publicado vencer. Vocês continuam podendo jogar e compartilhar esse link enquanto a publicação estiver disponível.',
    ],
  },
  {
    id: 'inclui',
    question: 'O que fica disponível depois do curso?',
    visual: 'mural',
    paragraphs: [
      'Depois dos sete dias, sua conta continua podendo ver e jogar os jogos disponíveis no Mural dos Criadores enquanto ela existir. Publicar, comentar e reagir ficam liberados pelo convite somente durante os sete dias. Se seu filho publicou o jogo nesse período, o link continua funcionando enquanto a publicação estiver disponível, para vocês e para quem receber o link.',
      'Para continuar publicando, comentando e reagindo depois desse prazo, existe a assinatura da Comunidade dos Criadores, contratada separadamente. Nela, seu filho segue com outros cursos, as ferramentas de criação liberadas pela Jornada, o Clube e as dúvidas respondidas pela equipe nos Recados.',
    ],
  },
  {
    id: 'conta',
    question: 'Já tenho conta ou já recebi esse presente. Posso usar o link?',
    visual: null,
    paragraphs: [
      'Se você tem conta e ainda não resgatou o presente, use o mesmo e-mail no cadastro. O acesso será associado à conta existente, e você entra com sua senha de sempre.',
      'Cada e-mail resgata um presente Kids, considerando todos os links de convite e campanhas. Usar outro link Kids não concede um novo período nem muda a origem do primeiro cadastro. O presente adulto é separado: o mesmo e-mail pode recebê-lo para a própria pessoa criar o jogo dela. Se o processo ficou incompleto, repetir o envio com o mesmo e-mail permite retomá-lo sem reiniciar os sete dias.',
    ],
  },
]

/**
 * As seções da página pública do programa (`/kids/embaixadores`). Desde 20/10/2026 o embaixador dá
 * o presente a uma família (Kids) ou a um adulto, cada um com o próprio link.
 */
export const AMBASSADOR_SECTIONS = [
  section(
    'indicar',
    'Uma indicação que você consegue explicar',
    'Um presente para uma família ou para um adulto que quer criar o próprio jogo.',
    [
      'Talvez seja o responsável por uma criança de 9 a 14 anos que adora jogos e pergunta como eles são feitos. Ou um adulto que cresceu jogando e sempre quis saber como um jogo funciona por dentro. Seu convite oferece um primeiro passo com uma tarefa concreta.',
      'Pelo seu link, a pessoa recebe 7 dias do Cadê Todo Mundo e do Mural, sem custo e sem cartão: a família recebe a versão Kids, e o adulto, a versão adulta. Cada link leva a uma página feita para quem recebe, que explica o presente e orienta o cadastro. Você não cadastra ninguém nem precisa explicar sozinho todos os detalhes.',
    ],
    ['aula-estudio'],
  ),
  section(
    'compartilhar',
    'Do seu convite ao primeiro acesso',
    'Você escolhe o público e envia o link. Quem recebe escolhe quando começar.',
    [
      'No seu painel, escolha para quem é o presente e mande o link com uma mensagem sua, contando por que lembrou daquela pessoa. Avise que o curso pede um computador com mouse e teclado e que os 7 dias começam no cadastro.',
      'No Kids, o responsável abre a página e faz o cadastro com os próprios dados; depois entra na plataforma com o filho. No presente adulto, a própria pessoa se cadastra. O seu painel conta os resgates concluídos, sem mostrar nomes nem dados de quem recebeu.',
    ],
    ['pausa'],
  ),
  section(
    'condicoes',
    'Um convite claro desde o começo',
    'Quem recebe ganha um presente. Continuar é uma escolha dela.',
    [
      'Durante os 7 dias contados do cadastro, quem recebe faz o curso, publica o jogo que criou nele, comenta e reage no Mural do seu público. Depois, o link do jogo publicado continua funcionando enquanto a publicação estiver disponível. Outros cursos, ferramentas de criação livre e fazer a própria versão de jogos do Mural não fazem parte do presente.',
      'Não há cartão nem assinatura automática. Se a família ou o adulto quiser conhecer a Comunidade dos Criadores depois, decide por conta própria. Essa clareza ajuda você a indicar com confiança e quem recebe a saber exatamente o que está ganhando.',
    ],
    ['mural'],
  ),
] satisfies ComunidadeSection[]
