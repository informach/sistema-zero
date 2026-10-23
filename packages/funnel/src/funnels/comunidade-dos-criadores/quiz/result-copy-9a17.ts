// Copy do resultado em conversa do ramo 9 a 17 (quiz v6, 20/10/2026). O formato e a carta do perfil B
// vêm do Canvas aprovado em 19/10 (docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/
// resultado-exemplos.py.txt, EX_917); os outros perfis reaproveitam a copy aprovada da v5
// (docs/marketing/kids/comunidade-dos-criadores/copy/historico/2026-10-20-quiz-v5/) nos mesmos cinco
// movimentos: o que você contou, por que acontece, o que muda, onde acontece e o que você disse que
// precisa.
//
// Texto no masculino; `paraFeminino` troca para "ela" quando a entrada é "Na minha filha". Por isso
// "ele" é SEMPRE a criança: para o personagem, o enunciado ou a plataforma, use o substantivo.
// Trechos entre [[ ]] são as respostas da família devolvidas na carta.
import type { RelatoId } from '../oferta/types'
import type { CommunityProfile, Condition } from './engine'

/** Rótulos curtos dos perfis (aba Perfis do /admin). */
export const PROFILE_LABELS_9A17: Record<CommunityProfile, string> = {
  A: '9 a 17 · Tempo de tela',
  B: '9 a 17 · Criação de jogos',
  C: '9 a 17 · Desenho e personagens',
  D: '9 a 17 · Programação',
  F: '9 a 17 · Escola',
}

export const ASSINATURA_KIDS = 'Helena e Júlio, Sistema Zero Kids'

// ---------------------------------------------------------------------------------------------
// As respostas devolvidas no texto, nas palavras da família.
// ---------------------------------------------------------------------------------------------

export const IDADE: Record<string, string> = {
  '9_12': 'entre 9 e 12 anos',
  '13_17': 'entre 13 e 17 anos',
}
export const CENA: Record<string, string> = {
  A: 'vive no jogo e no vídeo, e não faz nada com isso',
  B: 'inventa jogo o tempo todo, mas fica só na conversa',
  C: 'desenha personagem o tempo todo, e fica no caderno',
  D: 'quer saber como os jogos são feitos, e você não sabe ensinar',
  F: 'na lição, copia o exemplo e trava quando a pergunta muda',
}
export const QUANDO_TRAVA: Record<string, string> = {
  larga: 'ele larga e vai fazer outra coisa',
  chama: 'ele chama alguém para resolver',
  tenta: 'ele tenta de outro jeito até dar certo',
  procura: 'ele procura um vídeo ou um exemplo',
}
export const PREOCUPACAO: Record<string, string> = {
  A: 'a tela continuar só para assistir e jogar',
  B: 'essa vontade passar antes de ele fazer um jogo',
  C: 'os desenhos ficarem na gaveta',
  D: 'a curiosidade dele passar em branco',
  F: 'a dificuldade na escola virar desânimo',
}
export const CENA_DESEJADA: Record<string, string> = {
  A: 'ele chamando você: olha o que eu fiz',
  B: 'um amigo jogando um jogo que ele inventou',
  C: 'o personagem que ele desenhou se mexendo na tela',
  D: 'ele explicando como um jogo funciona por dentro',
  F: 'ele explicando uma conta com as palavras dele',
}
export const SINTESE: Record<string, string> = {
  A: 'que o tempo de tela sirva para alguma coisa',
  B: 'que as ideias de jogo dele saiam do papel',
  C: 'que os desenhos dele ganhem vida',
  D: 'que ele aprenda a programar de verdade',
  F: 'que ele entenda o que estuda e use na prática',
}
/** A calculadora (I6): o tempo por dia da S2, em faixa por ano. */
export const CALCULADORA: Record<string, string> = {
  menos_1h: 'Menos de 1 hora por dia dá até 365 horas por ano',
  '1_2h': 'De 1 a 2 horas por dia dão entre 365 e 730 horas por ano',
  '2_4h': 'De 2 a 4 horas por dia dão entre 730 e 1.460 horas por ano',
  mais_4h: 'Mais de 4 horas por dia dão mais de 1.460 horas por ano',
}
export const CRIACAO: Record<string, string> = {
  quase_nada: 'você disse que [[quase nada disso vira alguma coisa que ele mesmo fez]]',
  um_pouco: 'você disse que [[só um pouco disso vira alguma coisa que ele mesmo fez]]',
  boa_parte: 'você disse que [[boa parte disso já vira alguma coisa que ele mesmo fez]]',
  nao_sei: 'você [[não sabe dizer quanto disso vira alguma coisa que ele mesmo fez]]',
}

// ---------------------------------------------------------------------------------------------
// Por perfil: o título, o fecho da abertura, o porquê, o que muda, onde acontece e o botão.
// ---------------------------------------------------------------------------------------------

export interface Perfil917Copy {
  /** Nomeia o problema; ainda não fala da solução. */
  title: string
  /** A última frase do primeiro parágrafo. */
  openingEnd: string
  whyTitle: string
  /** A tese do perfil, depois da calculadora. */
  thesis: string
  changeTitle: string
  /** "O que muda": termina num teste, para a frase de quando ele trava continuar dali. */
  change: string
  /** "Onde isso acontece", depois da abertura comum da Comunidade. */
  where: string
  /** Uma tela real: id de `COMUNIDADE_VISUALS`. */
  visual: string
  relato: RelatoId
  cta: string
}

export const COMMUNITY_OPENING =
  'A Comunidade dos Criadores é a plataforma do Sistema Zero Kids em que crianças e adolescentes de 9 a 17 anos aprendem criando jogos. Aulas, Estúdio, ferramentas de criação, Mural, Clube com moderação e a ajuda da equipe ficam no mesmo lugar.'

/** O que a próxima página mostra (a mesma página de 9 a 17 para todos os perfis). */
export const NEXT_917 =
  'Na próxima página, você vê os cinco jogos do início, como é uma aula, o caminho até o jogo dele e até o código, como você acompanha e os dois planos.'

export const PERFIS_917: Record<CommunityProfile, Perfil917Copy> = {
  A: {
    title: 'No tempo de tela do seu filho, quem decide quase tudo é quem fez o jogo ou o vídeo',
    openingEnd: 'Isso tem uma explicação simples.',
    whyTitle: 'Por que o tempo de tela não deixa nada feito',
    // A última frase vem de `THESIS_A_END`, pela resposta da calculadora.
    thesis:
      'Nos jogos e nos vídeos prontos, alguém já tomou todas as decisões. As regras, os personagens e o que acontece em cada toque vieram prontos, e ele só escolhe o que vem em seguida. O interesse está lá.',
    changeTitle: 'O que muda quando ele cria o próprio jogo',
    change:
      'Quando ele cria o próprio jogo, as decisões passam a ser dele. Decide quanto o personagem pula, o que acontece quando o personagem encosta numa moeda e quanto vale cada ponto. Aperta para testar e vê na hora se ficou como queria.',
    where:
      'Os cursos são projetos de jogo, e a aula mostra cada passo ao lado do Estúdio, onde ele monta o jogo. Depois de cada jogo vem o próximo, cada vez maior. Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor, e o Estúdio livre e o Pinta abrem para os jogos que ele inventar. O jogo publicado vai para o Mural dos Criadores, com um link para a família jogar.',
    visual: 'aula-estudio',
    relato: 'AV12',
    cta: 'Ver como o tempo de tela vira criação',
  },
  B: {
    title: 'As ideias de jogo do seu filho já existem. O que falta é vê-las funcionando',
    openingEnd: 'A gente conhece bem esse menino, porque é assim que começa quem gosta de criar.',
    whyTitle: 'Por que as ideias ficam na conversa',
    thesis:
      'A vontade já está aí. O que falta é transformar a ideia em regras que o computador entende: quando tocar aqui, acontece isso. Enquanto esse passo não chega, cada ideia nova volta para a conversa, como a anterior.',
    changeTitle: 'O que muda quando ele monta a regra',
    change:
      'Criar um jogo é montar as regras da ideia: quando o jogador tocar no esconderijo, o personagem aparece e o contador soma um. Ele monta essas regras, aperta para testar e descobre na hora se o jogo faz o que imaginou.',
    where:
      'Cada curso é um jogo completo, e ele começa jogando a versão pronta para saber aonde vai chegar: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino. Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor, e o Estúdio livre e o Pinta abrem para as ideias dele, com as peças dos cursos que ele terminou. A cada curso, ele ganha peças novas e consegue fazer jogos maiores, até os que ele inventa.',
    visual: 'estudio-jardim',
    relato: 'AV11',
    cta: 'Ver como ele tira os jogos do papel',
  },
  C: {
    title:
      'Os personagens que seu filho desenha já têm aparência e jeito. O que falta é o que eles fazem',
    openingEnd: 'Quem desenha personagem o tempo todo já começou a pensar num jogo.',
    whyTitle: 'Por que os desenhos ficam no caderno',
    thesis:
      'O desenho já tem muito do que um personagem precisa: aparência e jeito. O que ainda falta é ação: o que o personagem faz quando alguém aperta uma tecla, o que acontece quando encontra um obstáculo e aonde precisa chegar. É dessas respostas que nasce a história.',
    changeTitle: 'O que muda quando o desenho entra no jogo',
    change:
      'Num jogo, o personagem desenhado anda, pula e reage, e quem decide como é seu filho. A aparência vem do desenho, e a ação vem das regras que ele monta. Ele aperta para testar e vê na hora se o personagem fez o que ele queria.',
    where:
      'Os cursos começam com personagens preparados, para ele aprender primeiro as regras. Quando conclui A Chave do Farol e publica o jogo, chega ao posto Construtor, e o Pinta, o editor de desenhos da plataforma, abre junto com o Estúdio livre: ele desenha o personagem e traz o desenho para o jogo.',
    visual: 'integracao',
    relato: 'N18',
    cta: 'Ver o desenho dele entrando no jogo',
  },
  D: {
    title:
      'A curiosidade do seu filho sobre como os jogos são feitos pede alguma coisa que ele possa testar',
    openingEnd: 'A curiosidade dele é o melhor começo.',
    whyTitle: 'Por que a curiosidade precisa de alguma coisa para testar',
    thesis:
      'A curiosidade já está aí. Só que uma explicação que começa pela lista de comandos faz ele esperar um bom tempo até ver alguma coisa acontecer na tela, e a curiosidade não espera.',
    changeTitle: 'O que muda quando cada comando tem um efeito',
    change:
      'Programar faz sentido quando cada comando tem um efeito que ele vê e testa. Num jogo, isso acontece o tempo todo: ele monta o comando, aperta para testar e vê na hora se o personagem andou, pulou ou parou como ele esperava.',
    where:
      'Ele aprende a programar montando jogos, um depois do outro. A aula mostra o passo ao lado do Estúdio, onde ele monta o jogo, e as falas do Zappy, o mascote das aulas, explicam o que fazer; o botão Ouvir lê em voz alta. Os cursos seguem esta ordem: Cadê Todo Mundo, A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino. A Jornada do Criador mostra em que ponto ele está e o que vem depois, dos blocos até o código.',
    visual: 'estudio',
    relato: 'N17',
    cta: 'Ver o caminho para ele aprender a programar',
  },
  F: {
    title: 'Seu filho aprendeu a repetir os passos. O que falta é ver o que os números fazem',
    openingEnd: 'Isso tem uma explicação simples.',
    whyTitle: 'Por que ele trava quando a pergunta muda',
    // A tese padrão é a das contas; as outras partes da escola têm a sua (`SCHOOL_THESIS`).
    thesis:
      'Muitas vezes, a dificuldade na escola vem de aprender os passos antes de saber o que aqueles números representam. No caderno, o número não aparece fazendo nada: entra na conta, sai um resultado, e só a correção diz se deu certo. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade.',
    changeTitle: 'O que muda quando o número faz alguma coisa',
    change:
      'No jogo, o número faz alguma coisa. Um comando manda o personagem andar cinco passos. Ele troca para dez, aperta para testar e vê se o personagem foi duas vezes mais longe.',
    where:
      'Ali, a aula liga o que ele viu no jogo ao que o comando significa. No jogo do jardim, do curso Cadê Todo Mundo, cada personagem encontrado soma um no contador, e é ele quem monta essa regra.',
    visual: 'contador',
    relato: 'AV08',
    cta: 'Ver a escola dentro do jogo',
  },
}

// --- A: a calculadora muda o título e a última frase da tese --------------------------------

/** A, com "Boa parte" na calculadora: o título não pode dizer que ele só escolhe. */
export const TITLE_A_GOOD_PART =
  'Seu filho já faz alguma coisa no tempo de tela. O que falta é uma sequência para isso crescer'
export const THESIS_A_END = {
  padrao: 'O que falta é um tempo de tela que peça alguma coisa dele além de escolher.',
  boa_parte: 'O que falta é uma sequência que peça um pouco mais dele a cada vez.',
}

// --- F: a parte da escola muda o título, o porquê, a solução e onde acontece -----------------

export const SCHOOL_TITLE: Record<string, string> = {
  leitura: 'Seu filho lê o enunciado. O que falta é enxergar o que a pergunta pede',
  ciencias: 'Seu filho lê por que as coisas acontecem. O que falta é ver acontecer',
  problemas: 'A tarefa chega inteira. O que falta é seu filho saber por onde começar',
  vai_bem: 'Seu filho vai bem na escola. O que falta é ver o que os números fazem fora do caderno',
}
/** F, contas ou reforço sem a cena da lição: o título não afirma que ele só repete passos. */
export const TITLE_F_NUMBERS = 'Nas contas, o que falta é seu filho ver o que os números fazem'
export const SCHOOL_WHY_TITLE: Record<string, string> = {
  leitura: 'Por que o enunciado trava',
  ciencias: 'Por que a explicação pronta não basta',
  problemas: 'Por que a tarefa longa trava',
  vai_bem: 'Por que vale usar o que ele aprende',
}
/** F: a resposta da escola, devolvida no porquê. */
export const ESCOLA: Record<string, string> = {
  leitura: 'ele trava mais em [[entender o que o enunciado pede]]',
  matematica: 'ele trava mais em [[entender as contas, e não só repetir o exemplo]]',
  problemas: 'ele trava mais em [[começar e organizar uma tarefa de várias etapas]]',
  ciencias: 'ele trava mais em [[entender por que as coisas acontecem, em ciências]]',
  vai_bem: '[[ele vai bem, e você quer que use na prática o que aprende]]',
  reforco: 'ele [[precisa recuperar matéria atrasada da série]]',
}
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
export const SCHOOL_CHANGE_TITLE: Record<string, string> = {
  leitura: 'O que muda quando a instrução vira ação',
  ciencias: 'O que muda quando ele testa as duas versões',
  problemas: 'O que muda quando o jogo é montado por partes',
}
/** "O que muda" na F: leitura, ciências e tarefas longas trocam o parágrafo do número pelo seu. */
export const SCHOOL_CHANGE_REPLACE: Record<string, string> = {
  leitura:
    'No jogo, cada instrução funciona como um enunciado: quando o pedido é fazer um personagem aparecer depois de um toque, ele precisa descobrir o que fazer e quando. Ele monta, aperta para testar e vê na hora se entendeu, porque o personagem aparece ou não aparece.',
  ciencias:
    'No jogo, ele liga e desliga uma reação e compara as duas versões: ligada, o arbusto some e o personagem aparece; desligada, nada acontece. Mudar uma coisa por vez e observar o efeito é o jeito de investigar que as aulas de ciências pedem, e ele vê na hora qual versão fez o que esperava.',
  problemas:
    'Um jogo tem personagem, obstáculos e pontos, e ninguém monta tudo de uma vez. Primeiro ele faz o personagem andar e testa; só então acrescenta o obstáculo e, depois, os pontos. É a organização que um trabalho escolar de várias etapas pede, com uma diferença: cada etapa mostra na hora se funcionou.',
}
/** Contas, "vai bem" e reforço acrescentam uma frase ao parágrafo do número. */
export const SCHOOL_CHANGE_ADD: Record<string, string> = {
  matematica:
    'E dá para treinar a previsão: antes de mudar quanto vale um ponto ou quantas vidas o personagem tem, ele diz o que vai acontecer no placar, depois joga e confere se acertou.',
  vai_bem:
    'E a conta da escola ganha um uso: quanto vale cada estrela, quantos passos o personagem anda, quantas vidas sobram.',
  reforco:
    'E a conta da escola ganha um uso: quanto vale cada estrela, quantos passos o personagem anda, quantas vidas sobram.',
}
export const SCHOOL_WHERE: Record<string, string> = {
  ciencias:
    'Ali, a aula liga o que ele viu no jogo ao que a regra faz. No experimento do jardim, do curso Cadê Todo Mundo, ele liga e desliga a reação ao toque e compara o que acontece em cada versão.',
}
export const SCHOOL_VISUAL: Record<string, string> = { ciencias: 'regra' }

// --- Frases montadas pelas respostas ----------------------------------------------------------

/** Quando ele trava: continua o teste do "O que muda". `{se}` abre a frase ("Se não fez"). */
export const TRAVA_SENTENCE: Record<string, string> = {
  tenta: '{se}, ajusta, que é exatamente o que ele já faz quando algo trava.',
  larga:
    '{se}, o erro aparece na hora, na regra que ele acabou de montar, e ele fica sabendo onde mexer em vez de largar.',
  chama:
    '{se}, a primeira ajuda está na própria tela, e aos poucos ele passa a chamar você para ver o jogo funcionando.',
  procura:
    '{se}, o vídeo da aula está ao lado: ele volta ao trecho, compara com a própria montagem e segue.',
  nao_reparou: '{se}, ajusta. Na primeira aula, vale sentar perto e ver o que ele faz nessa hora.',
}

/** A cena desejada volta em "O que muda", salvo quando ela já abriu a carta. */
export const WISH_SCENE_SENTENCE: Record<string, string> = {
  A: 'A cena que você quer ver, [[ele chamando você: olha o que eu fiz]], é como termina um jogo criado: com alguém da família jogando.',
  B: 'A cena que você quer ver, [[um amigo jogando um jogo que ele inventou]], é onde isso termina: um jogo que funciona na mão de outra pessoa.',
  C: 'A cena que você quer ver, [[o personagem que ele desenhou se mexendo na tela]], é o encontro do desenho com as regras do jogo.',
  D: 'A cena que você quer ver, [[ele explicando como um jogo funciona por dentro]], nasce de cada teste: quando o jogo não faz o que ele esperava, ele vai atrás do porquê.',
  F: 'A cena que você quer ver, [[ele explicando uma conta com as palavras dele]], cabe numa pergunta que você pode fazer sempre que ele mostrar um jogo: me mostra o que faz o placar mudar.',
}

/** O segundo perfil, quando soma 2 pontos ou mais e não é a própria cena desejada. */
export const SECONDARY_SENTENCE: Record<CommunityProfile, string> = {
  A: 'O tempo de tela também apareceu nas suas respostas: criando, esse tempo passa a ter decisão e, no fim, alguma coisa que é dele.',
  B: 'Criar jogos também apareceu nas suas respostas: criando, a ideia vira um jogo que outra pessoa consegue jogar.',
  C: 'Os desenhos também apareceram nas suas respostas: num jogo, o personagem desenhado ganha movimento.',
  D: 'A curiosidade sobre como os jogos são feitos também apareceu nas suas respostas: num jogo, cada comando tem um efeito que ele testa.',
  F: 'A escola também apareceu nas suas respostas: num jogo, a conta ganha um uso que ele vê na tela.',
}

/** A preocupação, quando é a do perfil e não abriu a carta. */
export const WORRY_SENTENCE = 'E é por isso que preocupa ver [[{preocupacao}]].'

/** Diagnóstico pouco nítido (3 pontos ou menos): vai antes do título. */
export const APPROXIMATE_NOTE =
  'Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu.'

/** O que precisa estar garantido (N9), no fim da carta. */
export const NEED_SENTENCE: Record<string, string> = {
  sozinho:
    'Você precisa que ele [[consiga sozinho, porque você não entende disso]]. A explicação está nas aulas, com o passo ao lado do Estúdio, onde ele monta o jogo. O seu papel é combinar o horário e pedir para ver o jogo.',
  recorrer:
    'Você quer que ele [[tenha a quem recorrer quando travar]]. Primeiro vem o que está na tela: ele volta ao trecho do vídeo, aperta Verificar esta parte nas partes que têm verificação e abre o Como fazer, que tem tutoriais por assunto. Se a dúvida continuar, o botão Preciso de ajuda manda a pergunta para a nossa equipe, e a resposta chega por escrito nos Recados.',
  acompanhar:
    'Você quer [[conseguir acompanhar]]. Na sua área, cada filho tem um painel com os cursos, as atividades, as entregas e o posto da Jornada. E a conversa que mais mostra o que ele aprendeu é a mais simples: me mostra o que você mudou.',
  tempo_tela:
    'Você precisa que [[caiba no tempo de tela combinado]]. As aulas são gravadas: ele pausa hoje e continua amanhã do mesmo ponto, e o aviso Guardado na sua conta confirma que o projeto ficou salvo. Vocês continuam decidindo os dias e a duração.',
  orcamento:
    'Você precisa que [[caiba no orçamento]]. Os dois planos têm até dois perfis de criança, cada um com o próprio progresso, e dão acesso aos cursos publicados e aos que forem lançados, às ferramentas que a Jornada vai abrindo, ao Mural, ao Clube e às dúvidas respondidas pela equipe nos Recados. E, se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.',
  ao_vivo:
    'Você disse que precisa de [[professor ao vivo]]. Aqui as aulas são gravadas e a plataforma orienta cada passo. As dúvidas vão por escrito para a equipe, e não há professor numa chamada. Se o ao vivo é indispensável, a Comunidade não atende esse ponto.',
}

/** As outras respostas que pedem uma frase honesta (computador e as perguntas extras). */
export const CONDITION_SENTENCE: Record<Condition, Record<string, string>> = {
  computador: {
    celular_tablet:
      'Você contou que, por enquanto, ele tem [[só celular ou tablet]]. Para criar, ele precisa de um computador com internet, mouse e teclado, que pode ser o da família. Vale organizar isso antes de assinar.',
    organizar:
      'E, como vocês têm computador e [[você precisa organizar os horários]], basta combinar um horário em que o computador esteja livre: as aulas são gravadas.',
    verificar:
      'E você [[ainda precisa ver o computador]]: ele vai precisar de um com internet, mouse e teclado, que pode ser o da família.',
  },
  formato: {},
  ferramenta: {
    roblox:
      'Você disse também que [[precisa ser no Roblox]]. Aqui a ferramenta é o Estúdio, da própria plataforma, e não há curso de Roblox nem de Minecraft. Se a vontade dele é essa ferramenta, converse com ele antes de assinar.',
    minecraft:
      'Você disse também que [[precisa ser no Minecraft]]. Aqui a ferramenta é o Estúdio, da própria plataforma, e não há curso de Roblox nem de Minecraft. Se a vontade dele é essa ferramenta, converse com ele antes de assinar.',
    outra:
      'Você disse também que [[precisa ser em outra ferramenta específica]]. Aqui a ferramenta é o Estúdio, da própria plataforma: confira se é essa a vontade dele antes de assinar.',
    pode_outra:
      'Você disse também que [[qualquer ferramenta serve, se ele gostar]]; aqui a ferramenta é o Estúdio, da própria plataforma.',
    conversar:
      'Você disse também que [[ainda vai conversar com ele]] sobre a ferramenta: mostre as telas da próxima página e pergunte se a vontade é criar jogos ou usar uma ferramenta específica.',
  },
  desenho: {
    movimento:
      'Você disse também que quer [[que os personagens façam coisas: andem, pulem, reajam]], e é exatamente isso que as regras do jogo fazem.',
    so_desenho:
      'Você disse também que quer [[que ele desenhe melhor, com traço e técnica]]. Aqui o desenho entra nos jogos: ele prepara os personagens no Pinta e usa no Estúdio, e as aulas ensinam a criar o jogo. Para aprender técnica de desenho, essa não é a escolha certa.',
    nao_sei:
      'Você disse também que [[ainda não sabe]] o que quer para os desenhos dele, e a próxima página mostra o desenho entrando no jogo.',
  },
  reforco: {
    reforco:
      'Para recuperar matéria atrasada, um professor de reforço, que retoma o conteúdo da série, é a escolha certa. A Comunidade não segue a série, mas pode entrar ao lado do reforço, como a atividade em que as contas têm um efeito que ele vê.',
  },
  sozinho: {},
}

export const CTA_WITH_UNMET_CONDITION = 'Ver como funciona e conferir os requisitos'
export const NEXT_WITH_UNMET_CONDITION =
  'Na próxima página, você confere como funciona, o que é preciso para começar e os dois planos.'
