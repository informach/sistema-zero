// Copy do resultado v5 (16/10/2026): a ponte entre o diagnóstico da família e a oferta.
// Proposta aprovada em docs/marketing/kids/comunidade-dos-criadores/quiz/revisao-copy-2026-10-16.md;
// espelho gerado em docs/marketing/kids/comunidade-dos-criadores/copy/resultados-quiz.md.
//
// A ordem segue os níveis de consciência: o título nomeia o problema, o quadro devolve as
// respostas da família, "Por que isso acontece" dá a tese, "O que muda isso" apresenta a criação
// de jogos (ainda sem o produto), "Onde isso acontece" mostra a Comunidade, e o botão leva à
// página de oferta do perfil. Sem preço aqui. Recados aparece uma vez, só para quem disse que
// precisa de alguém a quem recorrer (decisão de 05/10).
//
// Texto no masculino; `paraFeminino` troca para "ela". Por isso "ele" é SEMPRE a criança: para
// o personagem, o enunciado ou a Comunidade, use o substantivo (o teste reprova a troca errada).
import type { RelatoId } from '../oferta/types'
import type { CommunityProfile, Condition } from './engine'

/** Rótulos curtos dos perfis (aba Perfis do /admin). */
export const PROFILE_LABELS: Record<CommunityProfile, string> = {
  A: 'Tempo de tela',
  B: 'Criação de jogos',
  C: 'Desenho e personagens',
  D: 'Programação',
  F: 'Habilidades escolares',
}

// ---------------------------------------------------------------------------------------------
// O quadro "O que você contou": cada resposta volta com as palavras da família.
// ---------------------------------------------------------------------------------------------

export const MIRROR_AGE: Record<string, string> = {
  filho_9_11: 'Seu filho tem entre 9 e 11 anos',
  filha_9_11: 'Seu filho tem entre 9 e 11 anos',
  filho_12_14: 'Seu filho tem entre 12 e 14 anos',
  filha_12_14: 'Seu filho tem entre 12 e 14 anos',
}
export const MIRROR_COMPUTER: Record<string, string> = {
  sim: ' e pode usar o computador da casa.',
  organizar: '. Vocês têm computador em casa, e você precisa organizar os horários.',
  celular_tablet: '. Por enquanto, ele só tem celular ou tablet.',
  verificar: '. Você ainda vai ver se ele pode usar um computador em casa.',
}
export const MIRROR_SCREEN_TIME: Record<string, string> = {
  menos_1h: 'menos de 1 hora',
  '1_2h': 'de 1 a 2 horas',
  '2_4h': 'de 2 a 4 horas',
  mais_4h: 'mais de 4 horas',
}
export const MIRROR_CREATION: Record<string, string> = {
  quase_nada: 'quase nada desse tempo vira alguma coisa que ele mesmo fez',
  um_pouco: 'um pouco desse tempo vira alguma coisa que ele mesmo fez',
  boa_parte: 'uma boa parte desse tempo já vira alguma coisa que ele mesmo fez',
  nao_sei: 'você não sabe dizer quanto desse tempo vira alguma coisa que ele mesmo fez',
}
export const MIRROR_SCENE: Record<string, string> = {
  A: 'ele passa horas em jogos e vídeos, e no fim do dia não sobra nada que ele tenha feito',
  B: 'ele inventa jogos e regras o tempo todo, mas as ideias ficam na conversa ou no papel',
  C: 'ele desenha personagens o tempo todo, e os desenhos ficam guardados no caderno',
  D: 'ele quer saber como os jogos e os programas funcionam, e você não sabe por onde começar a ensinar',
  F: 'na lição, ele repete o exemplo, mas trava quando a pergunta muda',
}
export const MIRROR_STUCK: Record<string, string> = {
  larga: 'Quando algo não dá certo num jogo ou num aplicativo, ele larga e vai fazer outra coisa.',
  chama: 'Quando algo não dá certo num jogo ou num aplicativo, ele chama alguém para resolver.',
  tenta:
    'Quando algo não dá certo num jogo ou num aplicativo, ele tenta de outro jeito até dar certo.',
  procura:
    'Quando algo não dá certo num jogo ou num aplicativo, ele procura um vídeo ou um exemplo.',
  nao_reparou:
    'Você ainda não reparou o que ele faz quando algo não dá certo num jogo ou num aplicativo.',
}
export const MIRROR_WORRY: Record<string, string> = {
  A: 'que a tela continue sendo só para assistir e jogar',
  B: 'que a vontade de criar jogos passe antes de ele fazer o primeiro',
  C: 'que os desenhos continuem guardados na gaveta',
  D: 'que a curiosidade dele sobre os programas passe antes de ele entender como funcionam',
  F: 'que a dificuldade na escola vire desânimo com os estudos',
}
export const MIRROR_WISH_SCENE: Record<string, string> = {
  A: 'ele chamando você para ver uma coisa que ele mesmo fez no computador',
  B: 'um amigo jogando um jogo que ele inventou',
  C: 'o personagem que ele desenhou se mexendo na tela',
  D: 'ele explicando para você como um programa funciona por dentro',
  F: 'ele explicando uma conta com as próprias palavras',
}
export const MIRROR_NEED: Record<string, string> = {
  sozinho:
    'Para dar certo, ele precisa conseguir aprender sozinho, porque você não entende do assunto.',
  recorrer: 'Para dar certo, ele precisa ter a quem recorrer quando travar.',
  acompanhar: 'Para dar certo, você quer acompanhar o que ele aprende.',
  tempo_tela: 'Para dar certo, precisa caber no tempo de tela que vocês já combinaram.',
  orcamento: 'Para dar certo, o valor precisa caber no orçamento da família.',
  ao_vivo: 'Para dar certo, você precisa de um professor ao vivo acompanhando.',
}
export const MIRROR_SYNTHESIS: Record<string, string> = {
  A: 'que o tempo de tela deixe alguma coisa feita por ele',
  B: 'que as ideias de jogo dele saiam do papel',
  C: 'que os personagens que ele desenha ganhem movimento e história',
  D: 'que ele entenda como os programas funcionam e aprenda a programar',
  F: 'que ele entenda o que estuda e use isso na prática',
}
export const MIRROR_CONDITIONAL: Record<string, Record<string, string>> = {
  ferramenta: {
    roblox: 'Para criar jogos, ele precisa do Roblox.',
    minecraft: 'Para criar jogos, ele precisa do Minecraft.',
    outra: 'Para criar jogos, ele precisa de uma ferramenta específica.',
    pode_outra: 'Para criar jogos, qualquer ferramenta serve, se ele gostar.',
    conversar: 'Você ainda vai conversar com ele sobre a ferramenta para criar jogos.',
  },
  desenho: {
    movimento: 'Para os desenhos, você quer que os personagens façam coisas: andem, pulem, reajam.',
    so_desenho: 'Para os desenhos, você quer que ele desenhe melhor, com traço e técnica.',
    nao_sei: 'Você ainda não sabe o que quer para os desenhos dele.',
  },
  escola: {
    leitura: 'Na escola, ele trava mais em entender o que o enunciado pede.',
    matematica: 'Na escola, ele trava mais nas contas.',
    problemas: 'Na escola, ele trava mais em começar e organizar uma tarefa de várias etapas.',
    ciencias: 'Na escola, ele trava mais em entender por que as coisas acontecem, em ciências.',
    vai_bem: 'Na escola, ele vai bem.',
    reforco: 'Ele precisa recuperar matéria atrasada da série.',
  },
}

// ---------------------------------------------------------------------------------------------
// Por perfil: título (o problema), tese, solução, onde acontece e próximo passo.
// ---------------------------------------------------------------------------------------------

export interface ProfileCopy {
  /** Nomeia o problema; ainda não fala da solução. */
  title: string
  /** Abre "Por que isso acontece" quando a cena de casa (P4) é a deste perfil. */
  scene: string
  /** A tese do perfil: vale com qualquer abertura. */
  thesis: string
  /** Quando a preocupação (I7) é a deste perfil e não abriu o bloco. */
  worry?: string
  /** "O que muda isso": a criação de jogos como solução, ainda sem o produto. */
  change: string
  /** "Onde isso acontece", depois da abertura comum da Comunidade. */
  where: string
  /** Uma tela real por perfil (decisão da dona). */
  visual: string
  relato: RelatoId
  next: string
  cta: string
}

export const COMMUNITY_OPENING =
  'A Comunidade dos Criadores é a plataforma do Sistema Zero Kids em que crianças de 9 a 14 anos aprendem criando jogos.'

export const PROFILE_COPY: Record<CommunityProfile, ProfileCopy> = {
  A: {
    title: 'No tempo de tela do seu filho, quem decide quase tudo é quem fez o jogo ou o vídeo',
    scene:
      'Você contou que ele passa horas em jogos e vídeos e que, no fim do dia, não sobra nada que ele tenha feito.',
    // A última frase vem de `THESIS_A_END`, pela resposta da calculadora.
    thesis:
      'Nos jogos e nos vídeos prontos, alguém já tomou todas as decisões. As regras, os personagens e o que acontece em cada toque vieram prontos, e ele só escolhe o que vem em seguida. O interesse está lá.',
    change:
      'Quando ele cria o próprio jogo, passa para o outro lado da tela. Decide quanto o personagem pula, o que acontece quando o personagem encosta numa moeda e quanto vale cada ponto. Aperta para testar e vê na hora se ficou como queria. O tempo na tela continua, mas agora tem decisão, teste e, no fim, um jogo que é dele.',
    where:
      'Os cursos são projetos de jogo, e a aula mostra cada passo ao lado do editor. O jogo publicado vai para o Mural dos Criadores com um link para a família jogar.',
    visual: 'aula-estudio',
    relato: 'AV12',
    next: 'Na próxima página, você vê um projeto por dentro, do jogo pronto até a regra que ele monta, como você acompanha e os dois planos, mensal e anual.',
    cta: 'Ver como o tempo de tela vira criação',
  },
  B: {
    title: 'As ideias de jogo do seu filho já existem. Falta ver essas ideias funcionando',
    scene:
      'Você contou que ele inventa jogos e regras o tempo todo, mas as ideias ficam na conversa ou no papel. A vontade já está aí.',
    thesis:
      'O que falta é transformar a ideia em regras que o computador entende: quando tocar aqui, acontece isso. Enquanto esse passo não chega, cada ideia nova volta para o papel, como a anterior.',
    worry: 'E é por isso que preocupa ver essa vontade passar antes do primeiro jogo.',
    change:
      'Criar um jogo é escrever as regras da ideia: quando o jogador tocar no esconderijo, o personagem aparece e o contador soma um. Seu filho monta essas regras, aperta para testar e descobre na hora se o jogo faz o que imaginou. Se não fez, ajusta. É assim que uma ideia vira um jogo que outra pessoa consegue jogar.',
    where:
      'Cada curso é um jogo completo, e ele começa jogando a versão pronta para saber aonde vai chegar. Quando conclui o curso A Chave do Farol e publica o jogo, chega ao posto Construtor da Jornada do Criador, e o Estúdio, o editor onde ele monta os jogos, fica livre para as ideias dele. O jogo publicado ganha um link e um cartão com código QR para mandar a quem a família combinar.',
    visual: 'regra',
    relato: 'AV04',
    next: 'Na próxima página, você vê os cursos como projetos de jogo, do primeiro até o Estúdio livre, como ele testa cada regra e os dois planos, mensal e anual.',
    cta: 'Ver como ele tira os jogos do papel',
  },
  C: {
    title: 'Os personagens que seu filho desenha já têm aparência e jeito. Falta o que eles fazem',
    scene:
      'Você contou que ele desenha personagens o tempo todo, e que os desenhos ficam guardados no caderno.',
    thesis:
      'O desenho já tem muito do que um personagem precisa: aparência e jeito. O que ainda falta é ação: o que o personagem faz quando alguém aperta uma tecla, o que acontece quando encontra um obstáculo e aonde precisa chegar. É dessas respostas que nasce a história.',
    change:
      'Num jogo, o personagem desenhado anda, pula e reage, e quem decide como é seu filho. A aparência vem do desenho, e a ação vem das regras que ele monta. O desenho deixa de ser só para olhar.',
    where:
      'Os cursos começam com personagens preparados, para ele aprender primeiro as regras. Quando conclui o curso A Chave do Farol e publica o jogo, chega ao posto Construtor da Jornada do Criador, e o Pinta, o editor de desenhos da plataforma, fica livre junto com o Estúdio: ele desenha o personagem e traz o desenho para o jogo.',
    visual: 'integracao',
    relato: 'N18',
    next: 'Na próxima página, você vê as primeiras aulas com personagens prontos, o Pinta por dentro, o caminho até ele usar os próprios personagens e os dois planos, mensal e anual.',
    cta: 'Ver o desenho dele entrando no jogo',
  },
  D: {
    title:
      'A curiosidade do seu filho sobre como os programas funcionam pede alguma coisa que ele possa testar',
    scene:
      'Você contou que ele quer saber como os jogos e os programas funcionam, e que você não sabe por onde começar a ensinar. A curiosidade dele é o melhor começo.',
    thesis:
      'Só que uma explicação que começa pela lista de comandos faz a criança esperar um bom tempo até ver alguma coisa acontecer na tela, e a curiosidade não espera.',
    change:
      'Programar faz sentido quando cada comando tem um efeito que ele vê e testa. Num jogo, isso acontece o tempo todo: ele monta o comando, aperta para testar e vê o personagem andar, pular ou parar. Se não aconteceu o que esperava, a pergunta é dele: o que está trocado?',
    where:
      'Ele aprende a programar montando jogos. A aula mostra o passo ao lado do editor, e as falas do Zappy, o mascote das aulas, explicam o que fazer (o botão Ouvir lê em voz alta). Os cursos seguem esta ordem: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino. A Jornada do Criador mostra em que ponto ele está e o que vem depois.',
    // Não usar a tela da Jornada: ela mostra os postos "em construção" (decisão de 16/10).
    visual: 'estudio',
    relato: 'N5',
    next: 'Na próxima página, você vê a sequência dos cursos, uma aula por dentro, a Jornada do Criador e os dois planos, mensal e anual.',
    cta: 'Ver o caminho para ele aprender a programar',
  },
  F: {
    title: 'Seu filho aprendeu a repetir os passos. Falta ver o que os números fazem',
    scene: 'Você contou que, na lição, ele repete o exemplo e trava quando a pergunta muda',
    // A tese padrão é a das contas; as outras partes da escola têm a sua (`SCHOOL_THESIS`).
    thesis:
      'Muitas vezes, a dificuldade na escola vem de aprender os passos antes de saber o que aqueles números representam. No caderno, o número não aparece fazendo nada: entra na conta, sai um resultado, e só a correção diz se deu certo. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.',
    change:
      'No jogo, o número faz alguma coisa. Um comando manda o personagem andar cinco passos. Seu filho troca para dez, aperta para testar e vê o personagem ir duas vezes mais longe. No caderno, cinco é só um número. No jogo que ele cria, cinco é a distância que o personagem anda.',
    where:
      'Ali, a aula liga o que ele viu no jogo ao que o comando significa. No jogo do jardim, do curso Cadê Todo Mundo, cada personagem encontrado soma um no contador, e é ele quem monta essa regra.',
    visual: 'contador',
    relato: 'AV08',
    next: 'Na próxima página, você vê o jogo do jardim por dentro, onde aparecem leitura, matemática, ciências e resolver problemas, e os dois planos, mensal e anual.',
    cta: 'Ver a escola dentro do jogo',
  },
}

// --- A: a calculadora entra no argumento ----------------------------------------------------

/** A, com "Boa parte" na calculadora: o título não pode dizer que ele só escolhe. */
export const TITLE_A_GOOD_PART =
  'Seu filho já faz alguma coisa no tempo de tela. Falta uma sequência para isso crescer'
/** A: a frase da calculadora, logo após a abertura (`{horas}` vem da S2). */
export const CREATION_SENTENCE: Record<string, string> = {
  quase_nada:
    'Você também contou que quase nada desse tempo, {horas} por ano, vira alguma coisa feita por ele.',
  um_pouco:
    'Você também contou que só um pouco desse tempo, {horas} por ano, vira alguma coisa feita por ele.',
  boa_parte:
    'Você também contou que uma boa parte desse tempo já vira alguma coisa feita por ele, então a vontade de fazer já existe.',
  nao_sei:
    'Você não sabe dizer quanto desse tempo vira alguma coisa feita por ele, e uma pergunta simples responde: “O que você fez hoje que dá para me mostrar?”',
}
/** A: "Isso tem explicação." só depois da cena de casa (após um desejo, não faria sentido). */
export const A_SCENE_BRIDGE = 'Isso tem explicação.'
export const THESIS_A_END = {
  padrao: 'O que falta é um tempo de tela que peça alguma coisa dele além de escolher.',
  boa_parte: 'O que falta é uma sequência que peça um pouco mais dele a cada vez.',
}

// --- F: a parte da escola muda o título, o porquê e a solução --------------------------------

/** F: título pela parte da escola. Sem entrada (contas e reforço): o padrão, ou o das contas. */
export const SCHOOL_TITLE: Record<string, string> = {
  leitura: 'Seu filho lê o enunciado, mas ainda não enxerga o que a pergunta pede',
  ciencias: 'Seu filho lê por que as coisas acontecem, mas ainda não viu acontecer',
  problemas: 'A tarefa chega inteira. Falta seu filho saber por onde começar',
  vai_bem: 'Seu filho vai bem na escola. Falta ver o que os números fazem fora do caderno',
}
/** F, contas ou reforço sem a cena da lição: o título não afirma que ele só repete passos. */
export const TITLE_F_NUMBERS = 'Nas contas, falta seu filho ver o que os números fazem'
/** F, depois da cena da lição: a parte da escola completa a frase. */
export const SCHOOL_SCENE_TAIL: Record<string, string> = {
  matematica: ', principalmente nas contas',
  leitura: ', principalmente quando precisa entender o que o enunciado pede',
  problemas: ', principalmente quando precisa começar e organizar uma tarefa de várias etapas',
  ciencias: ', principalmente em ciências, quando precisa entender por que as coisas acontecem',
  vai_bem: ', mas que, no geral, vai bem na escola',
}
/** F, depois de outra abertura (preocupação, frase-síntese ou cena desejada). */
export const SCHOOL_WEIGHT: Record<string, string> = {
  matematica: 'Na escola, o que mais pesa é a parte das contas.',
  leitura: 'Na escola, o que mais pesa é entender o que o enunciado pede.',
  problemas: 'Na escola, o que mais pesa é começar e organizar uma tarefa de várias etapas.',
  ciencias: 'Na escola, o que mais pesa é entender por que as coisas acontecem, em ciências.',
  vai_bem: 'Hoje ele vai bem na escola.',
}
/** F, "vai bem" com a preocupação da escola: a abertura inteira muda. */
export const F_GOING_WELL_WORRY =
  'Hoje ele vai bem na escola, e o que preocupa você é que uma dificuldade, quando aparecer, vire desânimo com os estudos.'
/** F: a tese da parte da escola (sem entrada, vale a das contas). */
export const SCHOOL_THESIS: Record<string, string> = {
  leitura:
    'Muitas vezes, a dificuldade vem de ler o enunciado sem ver acontecendo o que a pergunta pede. No caderno, a pergunta é só texto: ele responde, e só a correção diz se entendeu. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.',
  problemas:
    'Muitas vezes, a dificuldade vem de a tarefa chegar inteira, e ninguém mostrar por onde começar. No caderno, as etapas ficam escondidas dentro do enunciado, e só a correção diz onde a resposta se perdeu. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.',
  ciencias:
    'Muitas vezes, a dificuldade vem de a explicação chegar pronta: no caderno, ele lê por que a coisa acontece, mas não vê acontecendo nem pode testar outra versão. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.',
  vai_bem:
    'Quem vai bem na escola também aprende muita coisa como um passo a seguir. No caderno, o número não aparece fazendo nada: entra na conta, sai um resultado, e a correção diz se deu certo. Usar o que aprendeu numa coisa que ele quer ver funcionando mostra se ele entendeu de verdade.',
}
/**
 * "O que muda isso" na F. Leitura, ciências e tarefas longas trocam o parágrafo do número pelo
 * seu; contas, "vai bem" e reforço acrescentam uma frase a ele.
 */
export const SCHOOL_CHANGE_REPLACE: Record<string, string> = {
  leitura:
    'No jogo, cada instrução funciona como um enunciado: quando o pedido é fazer um personagem aparecer depois de um toque, seu filho precisa descobrir o que fazer e quando. Se entendeu errado, o jogo mostra na hora, porque o personagem não aparece, e ele volta e lê de novo.',
  ciencias:
    'No jogo, ele liga e desliga uma reação e compara as duas versões: ligada, o arbusto some e o personagem aparece; desligada, nada acontece. Mudar uma coisa por vez e observar o efeito é o jeito de investigar que as aulas de ciências pedem.',
  problemas:
    'Um jogo tem personagem, obstáculos e pontos, e ninguém monta tudo de uma vez. Primeiro seu filho faz o personagem andar e testa; só então acrescenta o obstáculo e, depois, os pontos. É a organização que um trabalho escolar de várias etapas pede, com uma diferença: cada etapa mostra na hora se funcionou.',
}
export const SCHOOL_CHANGE_ADD: Record<string, string> = {
  matematica:
    'E dá para treinar a previsão: antes de mudar quanto vale um ponto ou quantas vidas o personagem tem, ele diz o que vai acontecer no placar, depois joga e confere se acertou.',
  vai_bem:
    'E a conta da escola ganha um uso: quanto vale cada estrela, quantos passos o personagem anda, quantas vidas sobram.',
  reforco:
    'E a conta da escola ganha um uso: quanto vale cada estrela, quantos passos o personagem anda, quantas vidas sobram.',
}
/** F, ciências: a tela e o texto do experimento do jardim (a reação ligada e desligada). */
export const SCHOOL_VISUAL: Record<string, string> = { ciencias: 'regra' }
export const SCHOOL_WHERE: Record<string, string> = {
  ciencias:
    'Ali, a aula liga o que ele viu no jogo ao que a regra faz. No experimento do jardim, do curso Cadê Todo Mundo, ele liga e desliga a reação ao toque e compara o que acontece em cada versão.',
}

// --- Frases montadas pelas respostas ----------------------------------------------------------

/** A cena desejada (N8) volta em "O que muda isso", salvo quando ela já abriu o "porquê". */
export const WISH_SCENE_SENTENCE: Record<string, string> = {
  A: 'E a cena que você quer ver primeiro, ele chamando você para ver uma coisa que ele mesmo fez, é como termina um jogo criado: com alguém da família jogando.',
  B: 'E a cena que você quer ver primeiro, um amigo jogando um jogo que ele inventou, é onde isso termina: um jogo que funciona na mão de outra pessoa.',
  C: 'E a cena que você quer ver primeiro, o personagem que ele desenhou se mexendo na tela, é o encontro do desenho com as regras do jogo.',
  D: 'E a cena que você quer ver primeiro, ele explicando como um programa funciona por dentro, nasce de cada teste: quando o jogo não faz o que ele esperava, ele vai atrás do porquê.',
  F: 'E a cena que você quer ver primeiro, ele explicando uma conta com as próprias palavras, cabe numa pergunta que você pode fazer sempre que ele mostrar um jogo: “Me mostra o que faz o placar mudar.”',
}

/**
 * O segundo perfil, quando soma 2 pontos ou mais: um parágrafo próprio, sem mudar a oferta.
 * "Apareceu nas suas respostas" (e não "você falou de"): o ponto pode ter vindo só da preocupação
 * ou da cena. Quando o segundo perfil é a própria cena desejada, a frase da cena já fala dele.
 */
export const SECONDARY_SENTENCE: Record<CommunityProfile, string> = {
  A: 'O tempo de tela também apareceu nas suas respostas: criando, esse tempo passa a ter decisão e, no fim, alguma coisa que é dele.',
  B: 'Criar jogos também apareceu nas suas respostas: criando, a ideia vira um jogo que outra pessoa consegue jogar.',
  C: 'Os desenhos também apareceram nas suas respostas: num jogo, o personagem desenhado ganha movimento.',
  D: 'A curiosidade sobre como os programas funcionam também apareceu nas suas respostas: num jogo, cada comando tem um efeito que ele testa.',
  F: 'A escola também apareceu nas suas respostas: num jogo, a conta ganha um uso que ele vê na tela.',
}

/** Quando o perfil veio de outras respostas, "Por que isso acontece" abre pelo que a família disse. */
export const OPENER_FROM_WORRY = (worry: string) =>
  `Você contou que o que mais preocupa é ${worry}.`
export const OPENER_FROM_SYNTHESIS = (wish: string) =>
  `Você disse que o que mais quer para ele é isto: ${wish}.`
export const OPENER_FROM_WISH_SCENE = (scene: string) =>
  `Você contou que a cena que quer ver primeiro é esta: ${scene}.`

/** Diagnóstico pouco nítido (3 pontos ou menos): vai antes do título. */
export const APPROXIMATE_NOTE =
  'Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu.'

/** P5: o que ele faz quando trava, em "Onde isso acontece" (pode citar a plataforma). */
export const STUCK_SENTENCE: Record<string, string> = {
  larga:
    'Você contou que, quando algo não dá certo, ele larga e vai fazer outra coisa. No jogo, o erro aparece na hora, na regra que ele acabou de montar, e a plataforma mostra onde olhar: nas partes que têm verificação, Verificar esta parte diz o que já está certo e o que falta. Em vez de largar, ele fica sabendo onde mexer.',
  // `{zappy}`: no perfil D o Zappy já foi apresentado no parágrafo anterior.
  chama:
    'Você contou que, quando algo não dá certo, ele chama alguém. Aqui, a primeira ajuda está na tela: ele volta ao trecho do vídeo, ouve de novo a fala {zappy} e, nas partes que têm verificação, vê o que falta. Aos poucos ele resolve sozinho e passa a chamar você para ver o jogo funcionando.',
  tenta:
    'Você contou que ele tenta de outro jeito até dar certo. É exatamente o que um jogo pede: mudar uma parte, testar e comparar. A aula ensina a mudar uma coisa por vez, para ele saber o que resolveu.',
  procura:
    'Você contou que ele procura um vídeo ou um exemplo. Aqui, o vídeo da aula fica ao lado do editor: ele volta ao trecho, compara com a própria montagem e segue.',
  nao_reparou:
    'Você ainda não reparou o que ele faz quando algo não dá certo, e a primeira aula é uma boa hora para ver: sente perto e observe. A faixa O que falta para seguir mostra o próximo passo, e você percebe na hora se ele segue sozinho ou se chama você.',
}
export const ZAPPY_FIRST = 'do Zappy, o mascote das aulas,'
export const ZAPPY_AGAIN = 'do Zappy'

/** N9: o que precisa estar garantido, em "O próximo passo" (antes do texto do botão). */
export const NEED_SENTENCE: Record<string, string> = {
  sozinho:
    'Você disse que ele precisa conseguir aprender sozinho, porque você não entende do assunto. A explicação está nas aulas, com o passo ao lado do editor. O seu papel é combinar o horário e pedir para ver o jogo.',
  recorrer:
    'Você disse que ele precisa ter a quem recorrer quando travar. Primeiro vem o que está na tela: ele volta ao trecho do vídeo, aperta Verificar esta parte nas partes que têm verificação, usa Uma pista nos experimentos e abre o Como fazer, que tem tutoriais por assunto. Se a dúvida continuar, o botão Preciso de ajuda manda a pergunta para a nossa equipe, e a resposta chega por escrito nos Recados.',
  acompanhar:
    'Você disse que quer acompanhar o que ele aprende. Na área dos pais, cada filho tem um painel com os cursos, as atividades, as entregas e o ponto da Jornada. E a conversa que mais mostra o que ele aprendeu é a mais simples: “Me mostra o que você mudou.”',
  tempo_tela:
    'Você disse que precisa caber no tempo de tela que vocês já combinaram. As aulas são gravadas: ele pausa hoje e continua amanhã do mesmo ponto, e o aviso Guardado na sua conta confirma que o projeto ficou salvo. Vocês continuam decidindo os dias e a duração.',
  orcamento:
    'Você disse que o valor precisa caber no orçamento. Os dois planos têm até dois perfis de criança, cada um com o próprio progresso, e incluem os cursos publicados, os que forem lançados e as ferramentas que a Jornada vai abrindo. E, se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.',
}

/** Segundo relato, pela necessidade (N9), quando não repete o do perfil. */
export const NEED_RELATO: Partial<Record<string, RelatoId>> = {
  sozinho: 'N8',
  recorrer: 'AV03',
  acompanhar: 'N15',
  tempo_tela: 'N2',
  orcamento: 'N6',
}
/** Se o relato da necessidade for da mesma pessoa do relato do perfil, entra outra pessoa. */
export const NEED_RELATO_ALT: Partial<Record<string, RelatoId>> = {
  sozinho: 'AV10',
  tempo_tela: 'AV12',
  orcamento: 'N14',
}
/** A cena "um amigo jogando o jogo dele" tem relato próprio: o Rafael mandou o link ao amigo. */
export const WISH_SCENE_RELATO: Partial<Record<string, RelatoId>> = { B: 'AV02' }

// ---------------------------------------------------------------------------------------------
// Antes de seguir: as condições, uma frase cada. Unmet muda o botão; pending só avisa.
// ---------------------------------------------------------------------------------------------

export interface ConditionCopy {
  title: string
  text: string
}
export const CONDITION_COPY: Record<Condition, Record<string, ConditionCopy>> = {
  computador: {
    celular_tablet: {
      title: 'Ele vai precisar de um computador',
      text: 'Você contou que, por enquanto, ele só tem celular ou tablet. Para criar na plataforma, ele precisa de um computador com internet, mouse e teclado, que pode ser o da família. Vale organizar isso antes de assinar.',
    },
    organizar: {
      title: 'Um horário no computador da casa',
      text: 'Como as aulas são gravadas, basta combinar um horário em que o computador esteja livre.',
    },
    verificar: {
      title: 'Confira o computador',
      text: 'Ele vai precisar de um computador com internet, mouse e teclado, que pode ser o da família.',
    },
  },
  formato: {
    ao_vivo: {
      title: 'As aulas são gravadas',
      text: 'Você disse que precisa de um professor ao vivo acompanhando. Na Comunidade, as aulas são gravadas e a plataforma orienta cada passo. As dúvidas vão por escrito para a equipe, e não há professor numa chamada. Se o ao vivo é indispensável, a Comunidade não atende esse ponto.',
    },
  },
  ferramenta: {
    roblox: {
      title: 'A ferramenta é o Estúdio',
      text: 'Você disse que precisa ser no Roblox. A Comunidade ensina no Estúdio, a ferramenta de criação da própria plataforma, e não tem curso de Roblox nem de Minecraft. Se a vontade dele é essa ferramenta, converse com ele antes de assinar.',
    },
    minecraft: {
      title: 'A ferramenta é o Estúdio',
      text: 'Você disse que precisa ser no Minecraft. A Comunidade ensina no Estúdio, a ferramenta de criação da própria plataforma, e não tem curso de Roblox nem de Minecraft. Se a vontade dele é essa ferramenta, converse com ele antes de assinar.',
    },
    outra: {
      title: 'A ferramenta é o Estúdio',
      text: 'A Comunidade ensina no Estúdio, a ferramenta da própria plataforma. Confira se é essa a vontade dele antes de assinar.',
    },
    conversar: {
      title: 'Converse sobre a ferramenta',
      text: 'Mostre a ele as telas da próxima página e pergunte se a vontade é criar jogos ou usar uma ferramenta específica.',
    },
  },
  desenho: {
    so_desenho: {
      title: 'O desenho entra nos jogos',
      text: 'Você disse que quer que ele desenhe melhor, com traço e técnica. Na Comunidade, o desenho entra nos jogos: ele prepara os personagens no Pinta e usa no Estúdio, e as aulas ensinam a criar o jogo. Para aprender técnica de desenho, essa não é a escolha certa.',
    },
  },
  reforco: {
    reforco: {
      title: 'Para matéria atrasada, o reforço',
      text: 'Você contou que ele precisa recuperar matéria atrasada. Para isso, um professor de reforço, que retoma o conteúdo da série, é a escolha certa. A Comunidade não segue a série, mas pode entrar ao lado do reforço, como a atividade em que as contas têm um efeito que ele vê.',
    },
  },
}

export const CTA_WITH_UNMET_CONDITION = 'Ver como funciona e conferir os requisitos'
