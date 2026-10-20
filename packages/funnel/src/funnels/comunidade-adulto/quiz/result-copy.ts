// Copy do resultado em conversa do quiz adulto v1 (20/10/2026): a carta assinada por Helena e
// Júlio que liga as respostas à página de oferta adulta. Formato e exemplo aprovados no Canvas
// (`QuizAdultoResultado.html`; `EX_ADULTO` em
// docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/resultado-exemplos.py.txt).
//
// Cinco movimentos, em todos os perfis: (1) o que a pessoa contou; (2) por que acontece, com a
// calculadora e o que aconteceu quando ela tentou; (3) o que muda, ainda sem o produto, fechando
// com a cena desejada; (4) onde isso acontece, com uma prévia e os fundadores; (5) o que ela disse
// que precisa, com as condições ditas com honestidade. Fecha com o botão para a oferta.
//
// `[[...]]` marca a resposta da pessoa devolvida no texto (vira `<mark>`). Fatos do produto só da
// página aprovada (`oferta/pagina.ts`), da auditoria de afirmações e do `EX_ADULTO`. Não há relato
// adulto autorizado: a prova é o parágrafo dos fundadores.
import type { AdultCondition, AdultProfile } from './engine'

/** Marca um trecho como resposta da pessoa. */
export const m = (texto: string): string => `[[${texto}]]`

/** Nomes curtos dos perfis (spec: `perfis.X.nome`; aba Perfis do /admin). */
export const PROFILE_NAMES: Record<AdultProfile, string> = {
  A: 'Horas livres',
  B: 'Ideia',
  D: 'Por dentro',
}

// ---------------------------------------------------------------------------------------------
// Cada opção como volta marcada na carta: a fala da pessoa, reescrita na segunda pessoa.
// ---------------------------------------------------------------------------------------------

export const MARCAS = {
  tempo_jogo: {
    menos_3: 'menos de 3 horas por semana',
    '3_7': 'de 3 a 7 horas por semana',
    '7_14': 'de 7 a 14 horas por semana',
    mais_14: 'mais de 14 horas por semana',
  },
  computador: {
    meu: 'tem o seu computador',
    compartilhado: 'usa um computador compartilhado',
    celular_tablet: 'só tem celular ou tablet',
    verificar: 'ainda vai ver se tem um computador',
  },
  programacao: {
    nunca: 'nunca programou',
    um_pouco: 'já programou um pouco, sozinho',
    estudei: 'estudou ou trabalha com programação',
  },
  cena: {
    A: 'joga há anos e nunca fez nada além de jogar',
    B: 'tem uma ideia de jogo há anos e nunca começou',
    D: 'joga e fica pensando em como fizeram aquilo',
    nenhum: 'nenhuma parecia com você',
  },
  tentativa: {
    vontade: 'nunca tentou: ficou só na vontade',
    perdi: 'abriu um programa e fechou no mesmo dia',
    tutorial: 'seguiu um tutorial, mas não passou dali',
    sonhos: 'começou um projeto grande e parou no meio',
    terminei: 'já terminou um jogo pequeno',
    nao_apareceu: 'nunca pensou em fazer um jogo',
  },
  tempo_criacao: {
    quase_nada: 'quase nada disso virou alguma coisa criada por você',
    um_pouco: 'um pouco disso virou alguma coisa criada por você',
    boa_parte: 'boa parte disso já virou alguma coisa criada por você',
    nao_sei: 'não sabe quanto disso virou alguma coisa criada por você',
  },
  preocupacao: {
    A: 'continuar só jogando',
    B: 'a ideia continuar na gaveta',
    D: 'continuar sem entender como se faz',
    nenhum: 'está bom assim',
  },
  cena_desejada: {
    A: 'uma noite livre que termina com uma fase pronta, feita por você',
    B: 'um amigo jogando uma fase que você inventou',
    D: 'você explicando para alguém como um jogo funciona por dentro',
  },
  garantia: {
    sozinho: 'aprender sozinho, no seu horário',
    recorrer: 'ter a quem recorrer quando travar',
    tempo: 'caiba em poucas horas por semana',
    orcamento: 'caiba no seu orçamento',
    ao_vivo: 'ter professor ao vivo',
    trabalho: 'sirva para trabalhar com jogos',
  },
  sintese: {
    A: 'quer que o seu tempo de jogo vire alguma coisa feita por você',
    B: 'quer tirar a ideia da gaveta e fazer o jogo',
    D: 'quer entender como um jogo é feito e aprender a programar',
    conhecer: 'ainda está conhecendo',
  },
  ferramenta: {
    unity: 'na Unity',
    unreal: 'na Unreal',
    roblox: 'no Roblox',
    outra: 'numa outra ferramenta específica',
    qualquer: 'qualquer ferramenta serve, se conseguir terminar',
    nao_pensei: 'ainda não pensou na ferramenta',
  },
  codigo: {
    codigo_ja: 'escrever código desde o primeiro dia',
    logica: 'entender a lógica primeiro',
    tanto_faz: 'tanto faz, você quer ver funcionando',
  },
} satisfies Record<string, Record<string, string>>

/** Lê a marca de uma resposta (string vazia quando a resposta não tem marca). */
export const marca = (key: string, value: unknown): string =>
  (MARCAS as Record<string, Record<string, string>>)[key]?.[String(value)] ?? ''

// ---------------------------------------------------------------------------------------------
// Título e aviso.
// ---------------------------------------------------------------------------------------------

/** O título nomeia o que falta (spec: `perfis.X.titulo`). */
export const TITLES: Record<AdultProfile, string> = {
  A: 'Você joga há anos. O que falta é uma noite livre que termine com uma fase feita por você',
  B: 'A sua ideia de jogo já existe. O que falta é um começo pequeno',
  D: 'Você quer ver como um jogo é feito por dentro. O que falta é montar as regras e testar você mesmo',
}
/** Perfil A com "Boa parte" na calculadora: o título não pode dizer que nada virou coisa sua. */
export const TITLE_A_GOOD_PART =
  'Boa parte do seu tempo de jogo já virou alguma coisa criada por você. O que falta é um caminho para fazer jogos maiores'
export const APPROXIMATE_NOTE =
  'Suas respostas apontaram para mais de um lado. Este foi o que mais apareceu.'
export const SIGNATURE = 'Helena e Júlio, Sistema Zero'

// ---------------------------------------------------------------------------------------------
// 1. O que você contou.
// ---------------------------------------------------------------------------------------------

/** A resposta que abre a carta: a frase da P5 quando é a do perfil; senão, a que deu o perfil. */
export type Opener = 'cena' | 'sintese' | 'preocupacao' | 'cena_desejada'

/** "Você contou que …": a resposta que abre a carta, já marcada. */
export const OPENING_LEAD: Record<Opener, (p: AdultProfile) => string> = {
  cena: (p) => m(MARCAS.cena[p]),
  sintese: (p) => m(MARCAS.sintese[p]),
  preocupacao: (p) => `o que mais incomoda é ${m(MARCAS.preocupacao[p])}`,
  cena_desejada: (p) => `a cena que quer ver é ${m(MARCAS.cena_desejada[p])}`,
}

/** O que aconteceu quando tentou, na mesma frase da abertura. */
/**
 * As horas de jogo da S2, na mesma frase. Quando a resposta que abre já fala em jogar ("joga há
 * anos…", "continuar só jogando"), "que joga" ecoaria: a frase diz quanto o jogo ocupa.
 */
export const openingTime = (lead: string, tempo: string): string =>
  /\[\[joga |jogando\]\]/.test(lead) ? `que o jogo ocupa ${m(tempo)}` : `que joga ${m(tempo)}`

export const OPENING_ATTEMPT: Record<string, string> = {
  vontade: `e que ${m(MARCAS.tentativa.vontade)}`,
  perdi: `e que, quando tentou, ${m(MARCAS.tentativa.perdi)}`,
  tutorial: `e que, quando tentou, ${m(MARCAS.tentativa.tutorial)}`,
  sonhos: `e que, quando tentou, ${m(MARCAS.tentativa.sonhos)}`,
  terminei: `e que ${m(MARCAS.tentativa.terminei)}`,
  nao_apareceu: `e que ${m(MARCAS.tentativa.nao_apareceu)}`,
}

export const OPENING_CLOSE = 'Essa história tem uma explicação simples.'
/** "Nenhuma dessas" na P5: a carta diz que se guiou pelas outras respostas. */
export const OPENING_CLOSE_NO_SCENE = `Das frases sobre jogar, ${m(MARCAS.cena.nenhum)}, então a gente se guiou pelas outras respostas, e elas contam uma história com uma explicação simples.`

// ---------------------------------------------------------------------------------------------
// 2. Por que acontece: a calculadora, o que aconteceu quando tentou e o que incomoda.
// ---------------------------------------------------------------------------------------------

export const WHY_HEADING: Record<AdultProfile, string> = {
  A: 'Por que a noite livre acaba em mais uma partida',
  B: 'Por que a ideia continua na gaveta',
  D: 'Por que jogar não mostra como um jogo é feito',
}
export const WHY_HEADING_A_GOOD_PART = 'Por que essas horas podem render mais'

/** Depois da calculadora: "… por ano jogando, e você disse que [[…]]." */
export const calculatorSentence = (porSemana: string, criacao: string): string =>
  `${porSemana} por ano jogando, e você disse que ${m(criacao)}.`

const RUSH = 'Com o trabalho, a família e o cansaço da noite,'
const TRIED = 'Vontade você tem, porque já tentou. O que trava é o ponto de partida.'
const BIG_IDEA = 'A ideia costuma ser grande, com mundo, história e dezenas de fases,'

export interface WhyCopy {
  /** Logo depois da calculadora (pode depender da resposta da I6). */
  lead: (tempoCriacao: string) => string
  /** O que aconteceu quando tentou: cada opção da P6 tem a sua explicação. */
  attempt: Record<string, string>
  /** O fecho do porquê (pode depender da resposta da I6). */
  tail: (tempoCriacao: string) => string
}

export const WHY: Record<AdultProfile, WhyCopy> = {
  A: {
    lead: (tc) =>
      tc === 'boa_parte'
        ? 'Então você já sabe o que é terminar uma noite com alguma coisa criada por você.'
        : 'É bastante tempo, e quase tudo nele foi decidido por quem fez o jogo: as regras, as fases, o que acontece a cada botão.',
    attempt: {
      vontade:
        'Fazer um jogo ficou só na vontade, e faz sentido: o primeiro passo parece grande, num programa feito para empresas de jogos.',
      perdi:
        'Quando você tentou fazer um jogo, o programa que abriu foi feito para empresas de jogos: dezenas de janelas e nenhum próximo passo claro.',
      tutorial:
        'Quando você tentou fazer um jogo, o tutorial acabou antes de virar alguma coisa sua: ensinou o jogo de outra pessoa e parou ali.',
      sonhos:
        'Quando você tentou fazer um jogo, o projeto começou grande demais, e projeto grande demais costuma parar no meio.',
      terminei:
        'Você já terminou um jogo pequeno, e isso conta. O que costuma faltar depois dele é um próximo passo claro.',
      nao_apareceu:
        'Fazer um jogo nunca tinha passado pela sua cabeça, e é comum: quem cresce jogando aprende a jogar cada vez melhor, e quase ninguém mostra como se cria um jogo.',
    },
    tail: (tc) =>
      tc === 'boa_parte'
        ? `${RUSH} o que você já faz tende a ficar do mesmo tamanho.`
        : `${RUSH} a noite livre volta a ser mais uma partida.`,
  },
  B: {
    lead: () => '',
    attempt: {
      vontade:
        'O que trava é o ponto de partida. A ideia é grande, com mundo, história e dezenas de fases, e a primeira ferramenta que aparece costuma ser um programa feito para empresas de jogos: só de olhar, começar parece um projeto inteiro.',
      perdi: `${TRIED} ${BIG_IDEA} e o programa que você abriu foi feito para empresas de jogos: dezenas de janelas e nenhum próximo passo claro.`,
      tutorial: `${TRIED} ${BIG_IDEA} e o tutorial acaba antes de chegar nela: ensina o jogo de outra pessoa e para ali.`,
      sonhos: `${TRIED} ${BIG_IDEA} e começar por ela é começar pelo projeto mais difícil: cada parte puxa outra, e o fim nunca chega perto.`,
      terminei:
        'Você já terminou um jogo pequeno, e isso conta: sabe o que é chegar ao fim. A ideia grande trava em outro ponto, no tamanho: com mundo, história e dezenas de fases, ela não cabe num primeiro passo.',
      nao_apareceu:
        'Fazer o jogo nunca chegou a entrar nos seus planos, e faz sentido: a ideia parece grande demais, com mundo, história e dezenas de fases, para caber num começo.',
    },
    tail: () => `${RUSH} o projeto fica para depois, e a ideia continua só na cabeça.`,
  },
  D: {
    lead: () =>
      'Jogando, dá para perceber que existe uma regra por trás de cada pulo e de cada fase, mas o jogo pronto não mostra nenhuma delas.',
    attempt: {
      vontade:
        'Ficou só na vontade, e faz sentido: parece que é preciso aprender um programa profissional inteiro antes de ver a primeira regra funcionar.',
      perdi:
        'Quando você tentou olhar por dentro, o programa que abriu foi feito para empresas de jogos: dezenas de janelas e nenhum próximo passo claro.',
      tutorial:
        'Quando você tentou olhar por dentro, o tutorial mostrou o que copiar, e quando acabou, ficou faltando entender por que cada parte funciona.',
      sonhos:
        'Quando você tentou, começou por um projeto grande, e num projeto grande as regras se misturam tanto que fica difícil ver o que cada uma faz, até ele parar no meio.',
      terminei:
        'Você já terminou um jogo pequeno, então já viu algumas dessas regras funcionando. O que costuma faltar é um caminho que mostre as outras, uma de cada vez.',
      nao_apareceu:
        'Fazer um jogo nunca tinha passado pela sua cabeça, e é comum: a curiosidade sobre como fizeram aquilo costuma ficar na pergunta, porque o caminho até a resposta não aparece.',
    },
    tail: () =>
      `${RUSH} a pergunta fica para depois, e você continua sem ver como o jogo funciona por dentro.`,
  },
}

/** O que incomoda, quando é do perfil e não abriu a carta. */
export const WORRY: Record<AdultProfile, string> = {
  A: `É isso que incomoda você: ${m(MARCAS.preocupacao.A)}.`,
  B: `É isso que incomoda você: ${m('ela continuar na gaveta')}.`,
  D: `É isso que incomoda você: ${m(MARCAS.preocupacao.D)}.`,
}
/** "Nada, está bom assim": a carta segue, sem pressa e sem inventar um incômodo. */
export const NO_WORRY = `E você disse que, se nada mudar no próximo ano, ${m(MARCAS.preocupacao.nenhum)}. Então leia o que vem a seguir como uma ideia para as horas livres, sem pressa.`

// ---------------------------------------------------------------------------------------------
// 3. O que muda (ainda sem o produto), a cena desejada e o segundo perfil.
// ---------------------------------------------------------------------------------------------

export const CHANGE_HEADING: Record<AdultProfile, string> = {
  A: 'O que muda quando você passa a criar o jogo',
  B: 'O que muda quando o primeiro jogo é pequeno',
  D: 'O que muda quando você monta as regras e testa',
}

export const CHANGE: Record<AdultProfile, string> = {
  A: 'Quem passou horas jogando já conhece as regras de um jogo por dentro: pular na hora certa, pegar a chave antes da porta, perder uma vida ao encostar no inimigo. Fazer um jogo é montar essas regras com blocos, peças de encaixar com o comando já escrito, e ver o jogo obedecer. Com um primeiro jogo pequeno de propósito, a noite livre termina com alguma coisa feita por você: uma regra nova, uma fase, um jogo pronto para mostrar. Depois vêm os próximos, cada vez maiores.',
  B: 'Fazer um jogo é montar as regras da ideia com blocos: quando o jogador tocar aqui, acontece isso. Quando o primeiro jogo é pequeno de propósito, você termina, publica e mostra. Depois vêm jogos maiores, e cada um ensina uma parte nova. É assim que a ideia grande vira jogo, uma fase de cada vez.',
  D: 'Por dentro, um jogo é um conjunto de regras: quando apertar a tecla, o personagem pula; se encostar no asteroide, a nave perde uma vida; cada acerto soma um ponto no placar. Quando você monta essas regras em blocos, muda um número e roda o jogo, vê na hora o que cada uma faz. Com um primeiro jogo pequeno de propósito, você vê cada regra montada na tela. Nos jogos seguintes, entram regras novas, e a pergunta sobre como fizeram aquilo ganha resposta, uma regra de cada vez.',
}

/** A cena desejada (N8), quando não abriu a carta. Vale depois do texto de qualquer perfil. */
export const WISH: Record<string, string> = {
  A: `A cena que você quer ver, ${m(MARCAS.cena_desejada.A)}, é o tamanho certo para começar: uma fase pequena, com regras que você monta, testa e ajusta até ficar do seu jeito.`,
  B: `A cena que você quer ver, ${m(MARCAS.cena_desejada.B)}, é exatamente onde isso termina: um jogo que funciona na mão de outra pessoa, com um link que abre no celular.`,
  D: `A cena que você quer ver, ${m(MARCAS.cena_desejada.D)}, vem daí: quem monta as regras de um jogo consegue explicar cada uma delas.`,
}

/** O segundo perfil: a resposta que o somou, marcada, e como ele também cabe no caminho. */
export const SECONDARY_LEAD: Record<
  'cena' | 'sintese' | 'preocupacao',
  (q: AdultProfile) => string
> = {
  cena: (q) => `Você também contou que ${m(MARCAS.cena[q])}.`,
  sintese: (q) => `Você também disse que ${m(MARCAS.sintese[q])}.`,
  preocupacao: (q) => `Você também disse que incomoda ${m(MARCAS.preocupacao[q])}.`,
}
export const SECONDARY_TAIL: Record<AdultProfile, string> = {
  A: 'Um jogo pequeno terminado é justamente o que faz uma noite livre deixar alguma coisa criada por você.',
  B: 'A ideia grande entra depois, uma fase de cada vez, quando o primeiro jogo pequeno estiver pronto.',
  D: 'Montar as regras de um jogo é justamente o que mostra como ele funciona por dentro.',
}

// ---------------------------------------------------------------------------------------------
// 4. Onde isso acontece (fatos de `oferta/pagina.ts` e do `EX_ADULTO`).
// ---------------------------------------------------------------------------------------------

export const WHERE_HEADING = 'Onde isso acontece'
export const WHERE_OPENING =
  'A Comunidade dos Criadores é a área adulta do Sistema Zero, em que você aprende criando jogos, com as aulas, o Estúdio, o Mural, o Clube e a ajuda da equipe no mesmo lugar. Cada curso é um jogo completo: você joga a versão pronta, muda uma regra, testa e publica no Mural.'
export const WHERE_TOOLBOX =
  'Os blocos que cada curso ensina continuam no seu Estúdio, e o Estúdio livre, onde você cria o que quiser, abre logo na primeira etapa:'
export const WHERE_STUDIO: Record<AdultProfile, string> = {
  A: 'é lá, com o que você já sabe usar, que as próximas noites livres viram jogos seus.',
  B: 'é lá, com o que você já sabe usar, que a sua ideia vira projeto, uma fase de cada vez. Mais adiante, o Pensa ajuda a dividir a ideia em partes.',
  D: 'é lá, com o que você já sabe usar, que dá para inventar as suas regras e ver como cada uma muda o jogo. Mais adiante, o Pensa ajuda a dividir a sua ideia em partes.',
}
export const WHERE_CLASSICS =
  'Os primeiros cursos são clássicos: uma nave contra asteroides, um dino que corre dos cactos, um farol que só acende com a chave.'

/** A S4 muda uma frase: blocos primeiro para quem nunca programou; Ponte e código para quem já. */
const PROGRAMMING_PATH =
  'vale ver o caminho inteiro: na Ponte, cada bloco aparece ao lado do código que ele gera, e na última fase você escreve o jogo inteiro em código, no Estúdio Pro. A primeira fase é com blocos, para você ver cada regra montada na tela.'
export const PROGRAMMING: Record<string, string> = {
  nunca: `Como você ${m(MARCAS.programacao.nunca)}, na primeira fase você não digita código: monta cada regra com blocos e vê funcionar. A Ponte e o código chegam depois, quando você já souber montar.`,
  um_pouco: `Como você ${m(MARCAS.programacao.um_pouco)}, ${PROGRAMMING_PATH}`,
  estudei: `Como você ${m(MARCAS.programacao.estudei)}, ${PROGRAMMING_PATH}`,
}

export interface PreviaAdulta {
  src: string
  legenda: string
  largura: number
  altura: number
}
/** Uma prévia por perfil, sempre com a legenda de prévia (nenhuma captura adulta real ainda). */
export const VISUAL: Record<AdultProfile, PreviaAdulta> = {
  A: {
    src: '/img/comunidade-adulto/previa-mural.webp',
    legenda: 'O Mural, onde ficam os jogos publicados: prévia da área adulta com dados de teste',
    largura: 1440,
    altura: 1187,
  },
  B: {
    src: '/img/comunidade-adulto/previa-aula.webp',
    legenda:
      'A aula da Nave Contra Asteroides: prévia com dados de teste: vídeo de um lado, Estúdio do outro e o botão de rodar o jogo',
    largura: 1600,
    altura: 800,
  },
  D: {
    src: '/img/comunidade-adulto/previa-arena.webp',
    legenda:
      'Um jogo de arena em pixel art, com energia, tempo e adversários contados na tela: prévia ilustrativa, com dados fictícios',
    largura: 1100,
    altura: 909,
  },
}

/** A prova: quem prepara as aulas (não há relato adulto autorizado). */
export const FOUNDERS =
  'Quem prepara as aulas somos nós, Helena e Júlio, formados em Sistemas de Informação, com mais de dez anos programando. O Sistema Zero começou com os jogos que fizemos com os nossos filhos.'

// ---------------------------------------------------------------------------------------------
// 5. O que você disse que precisa: a garantia, o computador e a pergunta extra.
// ---------------------------------------------------------------------------------------------

/** A garantia e o computador sempre entram; a pergunta extra vem com "Você disse também". */
export const NEEDS_HEADING = 'Duas coisas que você disse e que importam'

/** A N9. "Ter professor ao vivo" e "Servir para trabalhar com jogos": o que a página diz que não faz. */
export const NEED: Record<string, string> = {
  sozinho: `Você precisa ${m(MARCAS.garantia.sozinho)}. As aulas são gravadas, o vídeo fica ao lado do Estúdio, onde você monta o jogo, e o projeto fica salvo na sua conta: você para hoje e continua amanhã do mesmo ponto.`,
  recorrer: `Você precisa ${m(MARCAS.garantia.recorrer)}. As dúvidas são respondidas pela equipe nos Recados, o canal de mensagens da plataforma, e o botão Verificar esta etapa diz o que já está certo antes de você seguir.`,
  tempo: `Você precisa que ${m(MARCAS.garantia.tempo)}. Quem decide o ritmo é você: as aulas são gravadas, o projeto fica salvo e você continua de onde parou.`,
  orcamento: `Você precisa que ${m(MARCAS.garantia.orcamento)}. Os dois planos dão acesso a tudo, dos cursos e ferramentas ao Mural, ao Clube e aos Recados, e muda só a forma de pagar. Você tem 7 dias para testar: se não for para você, é só pedir o reembolso integral por e-mail dentro desse prazo.`,
  ao_vivo: `Você precisa ${m(MARCAS.garantia.ao_vivo)}. Aqui as aulas são gravadas, para caber no seu horário, e as dúvidas são respondidas pela equipe nos Recados. Se o professor ao vivo for indispensável, este ainda não é o formato para você.`,
  trabalho: `Você precisa que ${m(MARCAS.garantia.trabalho)}. Aqui a proposta é criar jogos nas horas livres, começando pelo primeiro, sem prometer uma profissão. Se o objetivo é trabalhar com jogos, este ainda não é o caminho para você.`,
}

/** A S3: o requisito do computador, dito também quando já está atendido. */
export const COMPUTER: Record<string, string> = {
  meu: `E você ${m(MARCAS.computador.meu)}: tudo roda no navegador, sem instalar nada.`,
  compartilhado: `E você ${m(MARCAS.computador.compartilhado)}: como as aulas são gravadas, basta combinar um horário em que o computador esteja livre.`,
  celular_tablet: `E você ${m(MARCAS.computador.celular_tablet)}. Para criar, é preciso um computador com mouse e teclado; o celular serve para jogar e mostrar o que você publicou.`,
  verificar: `E você ${m(MARCAS.computador.verificar)}: é nele que tudo roda, no navegador e sem instalar nada, com internet, mouse e teclado.`,
}

const ENGINE_FACT =
  'a ferramenta é o Estúdio, que roda no navegador, e a gente não ensina programas profissionais de jogos, como Unity ou Unreal.'
const toolRequired = (ferramenta: string) =>
  `Você disse também que o jogo precisa ser ${m(ferramenta)}. Aqui ${ENGINE_FACT} Se essa ferramenta for indispensável, este ainda não é o caminho para você.`

/** A condicional do perfil B (C11). */
export const TOOL: Record<string, string> = {
  unity: toolRequired(MARCAS.ferramenta.unity),
  unreal: toolRequired(MARCAS.ferramenta.unreal),
  roblox: toolRequired(MARCAS.ferramenta.roblox),
  outra: toolRequired(MARCAS.ferramenta.outra),
  qualquer: `Você disse também que ${m(MARCAS.ferramenta.qualquer)}. É por aí que a gente começa.`,
  nao_pensei: `Você disse também que ${m(MARCAS.ferramenta.nao_pensei)}. Vale saber antes: aqui ${ENGINE_FACT}`,
}

/** A condicional do perfil D (C12): quem quer código no primeiro dia sabe antes que a fase 1 é com blocos. */
export const CODE: Record<string, string> = {
  codigo_ja: `Você disse também que aprender a programar é ${m(MARCAS.codigo.codigo_ja)}. Melhor saber antes: aqui a primeira fase é com blocos, e o código vem depois, nas fases seguintes.`,
  logica: `Você disse também que aprender a programar é ${m(MARCAS.codigo.logica)}. É assim que o caminho começa: blocos primeiro, para você ver cada regra montada, e código depois.`,
  tanto_faz: `Você disse também que, para aprender a programar, ${m(MARCAS.codigo.tanto_faz)}. É o que acontece a cada regra: você monta, roda o jogo e vê se ele obedeceu.`,
}

/** "Ainda estou conhecendo" na frase-síntese. */
export const STILL_LOOKING = `E, juntando tudo, você disse que ${m(MARCAS.sintese.conhecer)}: o próximo passo é só olhar com calma, antes de decidir qualquer coisa.`

// ---------------------------------------------------------------------------------------------
// O botão para a oferta.
// ---------------------------------------------------------------------------------------------

export const CTA_TEXT: Record<AdultProfile, string> = {
  A: 'Na próxima página, você vê como é uma aula, do jogo pronto à primeira regra que você muda, os primeiros jogos, os que vêm depois, o Mural onde o jogo fica publicado e os dois planos.',
  B: 'Na próxima página, você vê como é a aula da Nave Contra Asteroides, os primeiros jogos, o caminho dos blocos ao código até o jogo com a sua ideia e os dois planos.',
  D: 'Na próxima página, você vê quatro regras dos primeiros jogos montadas com blocos, como é a aula da Nave Contra Asteroides, o caminho dos blocos ao código, os jogos que vêm depois e os dois planos.',
}
/** Spec: `perfis.X.cta`. */
export const CTA_LABEL: Record<AdultProfile, string> = {
  A: 'Ver como uma noite livre vira uma fase pronta',
  B: 'Ver como a ideia vira jogo',
  D: 'Ver o caminho para entender um jogo por dentro',
}
/** Com alguma condição não atendida, o botão convida a conferir antes de decidir. */
export const CTA_UNMET_LABEL = 'Ver como funciona e conferir os requisitos'
export const UNMET_ITEM: Partial<Record<AdultCondition, string>> = {
  computador: 'o computador de que você precisa',
  formato: 'o formato das aulas',
  trabalho: 'para quem a área foi feita',
  ferramenta: 'a ferramenta usada',
}
export const ctaUnmetText = (itens: string[]): string => {
  const lista =
    itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : (itens[0] ?? '')
  return `Na próxima página, você vê como tudo funciona e confere, com calma, ${lista}.`
}
