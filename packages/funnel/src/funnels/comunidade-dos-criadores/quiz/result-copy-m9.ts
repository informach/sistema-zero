// Copy do resultado em conversa do ramo menor de 9 (quiz v6, 20/10/2026): criar junto. A carta do
// perfil B vem do Canvas aprovado em 19/10 (resultado-exemplos.py.txt, EX_M9); os perfis A e D
// seguem os mesmos cinco movimentos, com os fatos da página "criar junto" (pagina-menor9.ts).
//
// Texto no masculino; `paraFeminino` troca para "ela". Trechos entre [[ ]] são as respostas da
// família devolvidas na carta. Nessa idade o adulto senta ao lado: nenhuma frase promete que a
// criança faz sozinha.
import type { M9Profile } from './engine'

export const PROFILE_LABELS_M9: Record<M9Profile, string> = {
  A: 'Menor de 9 · Tempo a dois',
  B: 'Menor de 9 · Ideias dele',
  D: 'Menor de 9 · Curiosidade',
}

export const LEITURA: Record<string, string> = {
  nao_le: 'ainda não lê',
  comecando: 'está começando a ler',
  prefere: 'lê, mas prefere que você leia',
  le_sozinho: 'já lê sozinho',
}
export const CENA_M9: Record<string, string> = {
  A: 'só fica no joguinho pronto do tablet',
  B: 'inventa brincadeira e personagem o tempo todo',
  D: 'quer saber como tudo funciona e apertar tudo',
  irmao: 'quer fazer o que o irmão mais velho faz',
}
export const PREOCUPACAO_M9: Record<string, string> = {
  A: 'a tela continuar só para assistir e jogar',
  B: 'as ideias dele ficarem só na brincadeira',
  D: 'a curiosidade dele passar em branco',
}
export const CENA_DESEJADA_M9: Record<string, string> = {
  A: 'ele chamando você para ver o que vocês fizeram',
  B: 'o personagem dele aparecendo na tela',
  D: 'ele explicando o que cada botão faz',
  A2: 'os avós jogando um jogo de vocês',
}
export const SINTESE_M9: Record<string, string> = {
  A: 'um tempo de tela de vocês, com alguma coisa feita no fim',
  B: 'as ideias dele virando um jogo',
  D: 'ele entender, brincando, como as coisas funcionam',
}

/** O tempo a dois (S4), devolvido no primeiro parágrafo, com a frase que fecha a abertura. */
export const TEMPO_JUNTOS: Record<string, { texto: string; fecho: string }> = {
  uma_vez: {
    texto:
      'Contou também que vocês conseguem sentar juntos [[uns 20 minutos, uma vez por semana]].',
    fecho: 'Dá para começar com isso.',
  },
  duas_tres: {
    texto:
      'Contou também que vocês conseguem sentar juntos [[duas ou três vezes por semana, de 20 a 30 minutos]].',
    fecho: 'Isso é mais do que parece.',
  },
  mais: {
    texto:
      'Contou também que vocês conseguem sentar juntos [[mais do que duas ou três vezes por semana]].',
    fecho: 'Isso é mais do que parece.',
  },
  nao_sei: {
    texto:
      'Contou também que [[ainda não sabe]] quanto tempo vocês conseguem sentar juntos por semana.',
    fecho: 'Uma sessão curta já é um começo.',
  },
}

export interface PerfilM9Copy {
  title: string
  whyTitle: string
  /** O porquê, antes da frase da preocupação. `{falta}` vem da leitura. */
  why: string
  changeTitle: string
  /** Abre "O que muda": a regra da brincadeira em blocos. */
  change: string
  cta: string
}

export const PERFIS_M9: Record<M9Profile, PerfilM9Copy> = {
  A: {
    title:
      'No joguinho do tablet, ele só aperta o que aparece. O que falta é um tempo de tela que seja de vocês dois',
    whyTitle: 'Por que o joguinho pronto não deixa nada feito',
    why: 'No joguinho pronto do tablet, alguém já decidiu tudo: o que aparece, o que acontece em cada toque e quando acaba. Ele aperta o que surge na tela, e o tempo passa sem nada que seja dele. O que ainda falta para ele fazer diferente é {falta}, e nessa idade ninguém espera que ele faça sozinho. Muitos cursos e aplicativos foram pensados para a criança usar sem adulto.',
    changeTitle: 'O que muda quando vocês criam juntos',
    change:
      'Criar um jogo é montar a regra da brincadeira com blocos: se tocar, some; se achar, conta mais um. Em vez de apertar o que aparece, ele decide o que vai aparecer.',
    cta: 'Ver como vocês criam os primeiros jogos juntos',
  },
  B: {
    title:
      'As brincadeiras dele já têm personagem, regra e fim. O que falta é um lugar para elas aparecerem',
    whyTitle: 'Por que as ideias ficam na brincadeira',
    why: 'Pique-esconde, pega-pega, quem pisar na lava perde: as brincadeiras que ele inventa já têm regra, ponto e fim. Num jogo de computador é igual. O que ainda falta para ele fazer isso sozinho é {falta}, e nessa idade ninguém espera que ele faça sozinho. Muitos cursos e aplicativos foram pensados para a criança usar sem adulto.',
    changeTitle: 'O que muda quando vocês criam juntos',
    change:
      'Criar um jogo é montar a regra da brincadeira com blocos: se tocar, some; se achar, conta mais um.',
    cta: 'Ver as ideias dele virando jogo',
  },
  D: {
    title:
      'Ele quer apertar tudo e saber como funciona. O que falta é um lugar em que apertar faz alguma coisa acontecer',
    whyTitle: 'Por que apertar tudo ainda não mostra como funciona',
    why: 'Quando ele aperta tudo, está tentando descobrir o que acontece em cada toque. No joguinho pronto, a resposta já vem decidida, e ele não vê o porquê. O que ainda falta para ele descobrir sozinho é {falta}, e nessa idade ninguém espera que ele faça sozinho. Muitos cursos e aplicativos foram pensados para a criança usar sem adulto.',
    changeTitle: 'O que muda quando vocês criam juntos',
    change:
      'Criar um jogo é montar a regra com blocos: se tocar, some; se achar, conta mais um. Cada bloco que ele escolhe faz alguma coisa acontecer, e ele vê o porquê.',
    cta: 'Ver como a curiosidade dele vira jogo',
  },
}

/** O que ainda falta para fazer sozinho, pela leitura. */
export const FALTA: Record<string, string> = {
  nao_le: 'a leitura e o mouse',
  comecando: 'a leitura e o mouse',
  prefere: 'a leitura e o mouse',
  le_sozinho: 'o jeito de usar o mouse e o computador',
}

/** A preocupação no fim do porquê: a do perfil, a de outro perfil ou nenhuma. */
export const WORRY_SAME =
  'É por isso que acontece o que você disse que preocupa: [[{preocupacao}]].'
export const WORRY_OTHER = 'E você disse que o que mais preocupa é [[{preocupacao}]].'
export const WORRY_NONE = 'Você disse que quer [[aproveitar a fase]], e esta é uma boa hora.'

/** O papel de cada um na sessão, pela leitura. */
export const LEITURA_SESSAO: Record<string, string> = {
  nao_le: 'Como ele ainda não lê, você lê o passo e os blocos, e ele decide.',
  comecando: 'Como ele está começando a ler, você lê o passo e os blocos, e ele decide.',
  prefere: 'Como ele prefere que você leia, você lê o passo e os blocos, e ele decide.',
  le_sozinho:
    'Como ele já lê sozinho, pode ler o passo e os blocos com você ao lado, e passar a criar sozinho mais cedo.',
}
export const OUVIR_E_TESTAR =
  'O botão Ouvir lê as falas do Zappy em voz alta. Vocês apertam para testar e, se não saiu como ele queria, descobrem juntos o porquê.'

/** A cena desejada (N7), em "O que muda", salvo quando ela já abriu a carta. */
export const WISH_SCENE_M9: Record<string, string> = {
  A: 'A cena que você quer ver, [[ele chamando você para ver o que vocês fizeram]], é como termina cada sessão: com o jogo rodando e ele chamando alguém para testar.',
  B: 'A cena que você quer ver, [[o personagem dele aparecendo na tela]], começa na primeira sessão, com o bichinho que aparece quando ele toca no esconderijo.',
  D: 'A cena que você quer ver, [[ele explicando o que cada botão faz]], nasce de cada teste: ele aperta, vê o que acontece e conta para você.',
  A2: 'A cena que você quer ver, [[os avós jogando um jogo de vocês]], é onde isso termina: o jogo publicado ganha um link que abre no celular, para mandar a quem a família combinar.',
}

/** O segundo perfil, quando soma 2 pontos ou mais e não é a própria cena desejada. */
export const SECONDARY_M9: Record<M9Profile, string> = {
  A: 'O tempo de tela a dois também apareceu nas suas respostas: criando juntos, esse tempo termina com alguma coisa feita por vocês.',
  B: 'As ideias dele também apareceram nas suas respostas: num jogo, a brincadeira que ele inventa ganha regra e tela.',
  D: 'A curiosidade dele também apareceu nas suas respostas: num jogo, cada bloco faz alguma coisa acontecer.',
}

/** O tempo a dois, no fim de "O que muda". */
export const TEMPO_SESSAO: Record<string, string> = {
  uma_vez: 'E uma sessão curta por semana já anda: o projeto fica guardado e espera por vocês.',
  duas_tres:
    'E duas ou três sessões curtas por semana cabem: o projeto fica guardado e espera por vocês.',
  mais: 'E, com mais tempo na semana, vocês seguem no ritmo dele: o projeto fica guardado entre uma sessão e outra.',
  nao_sei: 'As sessões podem ser curtas: o projeto fica guardado e espera por vocês.',
}

export const ONDE_M9 =
  'A Comunidade dos Criadores é a plataforma do Sistema Zero Kids em que crianças aprendem criando jogos. Com menos de 9 anos, ele cria com você. Um dos primeiros projetos é o Cadê Todo Mundo, um jogo de procurar bichinhos no jardim. Depois de A Chave do Farol publicada, o Estúdio livre abre para o jogo que ele inventar, com as peças que vocês já usaram nas aulas.'
export const ONDE_LEITURA: Record<string, string> = {
  nao_le: 'Quando ele começar a ler sozinho, passa a criar por conta própria, no mesmo perfil.',
  comecando: 'Quando ele começar a ler sozinho, passa a criar por conta própria, no mesmo perfil.',
  prefere: 'Quando ele quiser ler sozinho, passa a criar por conta própria, no mesmo perfil.',
  le_sozinho:
    'Como ele já lê sozinho, pode passar a criar por conta própria mais cedo, no mesmo perfil.',
}

export const IMAGEM_M9 = {
  src: '/img/comunidade-dos-criadores/passo-video.webp',
  legenda: 'A aula do Cadê Todo Mundo: o vídeo ao lado do Estúdio e o botão Ouvir',
  largura: 1600,
  altura: 625,
}
/** A Débora, filha dos fundadores: "aluna, 7 anos" (decisão da dona, 19/10/2026). */
export const RELATO_M9 = {
  intro: 'A Débora passou pelo Desafio do Primeiro Jogo com 7 anos e contou assim:',
  autor: 'Débora, aluna, 7 anos',
  foto: '/img/comunidade-dos-criadores/depo-debora-rosto.webp',
} as const

/** O que precisa estar garantido (N8). */
export const NEED_M9: Record<string, string> = {
  conduzir:
    'Você precisa [[conseguir conduzir sem saber programar]]. O vídeo mostra cada passo, o Zappy lê as falas e os blocos dizem o que fazem, em português. O seu papel é ler, perguntar e deixar a escolha com ele.',
  curto:
    'Você precisa que [[caiba em sessões curtas]]. Vocês param quando quiserem: o projeto fica salvo na conta, e na próxima sessão continuam do mesmo ponto.',
  seguro:
    'Você precisa que [[seja um lugar seguro]]. O perfil público começa desligado, e só você pode ligar. O jogo público não mostra o nome dele, o microfone vem desligado e o Clube tem moderação, só com alunos.',
  orcamento:
    'Você precisa que [[caiba no orçamento]]. Os dois planos têm até dois perfis de criança, cada um com o próprio progresso, e trazem os cursos publicados e os que forem lançados, o Estúdio e as ferramentas que a Jornada vai abrindo, o Mural, o Clube com moderação e a área do responsável. E, se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.',
  sozinho:
    'Você disse que precisa que ele [[consiga sozinho, porque você não tem tempo]]. Nessa idade, a plataforma pede um adulto ao lado: é você quem lê os passos e ajuda com o mouse, em sessões curtas. Se esse tempo não existe agora, vale começar quando ele ler sozinho.',
  ao_vivo:
    'Você disse que precisa de [[professor ao vivo]]. Aqui as aulas são gravadas, e quem senta ao lado dele é você. Não há professor numa chamada. Se o ao vivo é indispensável, a Comunidade não atende esse ponto.',
}

export const COMPUTADOR_M9: Record<string, string> = {
  celular_tablet:
    'Você contou que vocês têm [[só celular ou tablet]]. Para criar, é preciso um computador com internet, mouse e teclado: no tablet dá para jogar, mas não para montar o jogo. Vale organizar isso antes de assinar.',
  organizar:
    'E, como vocês têm computador e [[precisam organizar o horário]], basta combinar um momento da semana em que o computador esteja livre.',
  verificar:
    'E você [[ainda vai ver o computador]]: vocês vão precisar de um com internet, mouse e teclado, que pode ser o da família.',
}

/** A cena do irmão mais velho não pontua: ganha esta frase. */
export const IRMAO_M9 =
  'E, se o irmão mais velho também quiser criar, a assinatura tem até dois perfis, cada um com o próprio progresso.'

export const NEXT_M9 =
  'Na próxima página, você vê como é uma sessão de vocês, do vídeo ao teste, o seu papel, as regras de segurança e os dois planos.'
