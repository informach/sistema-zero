/**
 * A fonte editorial do Poder "O baú dos símbolos": as falas gravadas (com as marcas do ElevenLabs),
 * as notas de tela, as falas do Zappy na página e o Passo a passo completo das duas dimensões. O
 * gerador (`gerar-simbolos.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * Revisão de 23/11/2026, no padrão do Faísca (Cadê, Chave do Farol e Ilha do Farol): uma ideia por
 * parágrafo, a retomada "Tá vendo?" com a causa, cada bloco com o lugar à vista, o caminho completo
 * na paleta, o encaixe, "É este bloco que…" e um clique por frase, e o Na tela pronto para a
 * gravação automática (ESPEC-ROTEIRO, seção 9). A aula 1 (2D) ensina a ideia nova: abertura,
 * material, experiência e as montagens do sol, da lua e da estrela; a da estrela monta o último
 * bloco e envia, e o quiz fecha a aula. A aula 2 (3D) monta tudo de novo na ilha, no vídeo, nas
 * mesmas três partes (o sol, a lua e a estrela), lembrando a aula 1 no começo. A Debinha (aula 1)
 * e o Dedé (aula 2) dizem as frases do campo `kids`.
 *
 * As montagens das duas dimensões têm a mesma forma: cada parte sai de uma função
 * (`parteSol`, `parteLua`, `parteEstrela`) que junta, parágrafo por parágrafo, a fala e as frases
 * do Na tela que esperam por ela, para a citação nunca se separar da fala.
 *
 * Os caminhos das setas no Na tela contam a velocidade de cada jogo e as posições de
 * `simbolos-projeto.ts`. No 2D (3 pixels por quadro, 180 por segundo), o personagem começa logo
 * acima do sol: 0,5 s para baixo encosta nele, e cada 0,4 s para a direita leva à pedra seguinte;
 * para ir à lua sem o sol, ou do sol à estrela sem a lua, ele passa por cima das pedras. No 3D
 * (velocidade 4), o sol fica 1,7 à frente do começo e a estrela na mesma linha dele, com a lua um
 * passo à frente: do sol à estrela, o caminho reto passa atrás da lua sem encostar. São
 * estimativas: acertar no Verificar plano.
 */
import {
  entregar,
  MOLDE_DA_EXPERIENCIA as MOLDE,
  telaDaConferencia,
  telaDaExperiencia,
  telaDaSaida,
  telaDoEnvio,
  verificar,
} from './faisca-comum'
import type { Simbolo, SimbolosDimensao, SimbolosEtapa } from './simbolos-projeto'

export type SimbolosTrecho = {
  key: string
  title: string
  kind: 'intro' | 'material' | 'experience' | 'build' | 'quiz' | 'delivery'
  etapa?: SimbolosEtapa
  /** Fala do Zappy na página, logo depois do vídeo (ou antes do quiz). Não é gravada. */
  ponte: string
  /** Fala gravada, com as marcas de interpretação. Vazia na seção sem vídeo. */
  text: string
  screen: string
  /** As frases da Debinha (aula 1) ou do Dedé (aula 2): parágrafos inteiros do `text`. */
  kids?: string[]
}

/**
 * O que a experiência investiga (Faísca, 02/11/2026), no formato da Ponte: a lista de descobertas
 * da tela, o recado, o Passo a passo e o caderno dizem o que comparar, sem contar o resultado.
 * ⚠️ `goals` segue a ordem dos cartões da tela livre (member-shell, `scene-poder-simbolos.tsx`), na língua
 * dela (08/11/2026): o personagem anda até as coisas, e as regras são peças que se trocam.
 */
export const simbolosExperiencia = {
  title: 'A experiência: a ordem dos símbolos',
  idea: 'O jogo anota num caderninho até onde a sequência chegou (na montagem, esse caderninho vira a variável passo), e cada símbolo, quando é tocado, pergunta: é a minha vez? Na experiência, você descobre o que acontece na ordem da placa, fora da vez e num baú que só conta.',
  goals: [
    'Ande até o sol e depois até a lua e olhe o caderninho do jogo.',
    'Toque os três símbolos na ordem da placa e observe o baú.',
    'Com o sol aceso, pule a lua e olhe o caderninho.',
    'Comece pela lua, sem nada aceso, e olhe o caderninho.',
    'Depois de errar, siga a placa de novo sem jogar de novo.',
    'Troque a peça para "só quantos foram tocados", toque fora da ordem e compare.',
  ],
  observe:
    'Antes e depois de cada toque, observe o caderninho do jogo, os símbolos acesos e o baú. Para comparar com o baú que só conta, veja antes o baú que confere a ordem responder. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

// ── As vozes (direcoes-voz.json) ────────────────────────────────────────────────
const BOAS_VINDAS = '[upbeat, welcoming voice]'
const CONVERSA = '[engaging, energetic, conversational voice]'
const CALMA = '[confident, clear, unhurried voice]'
const OLHA = '[interested, animated voice]'
const ANIMA = '[upbeat, encouraging voice]'
const PERGUNTA = '[curious]'

/** Um parágrafo da fala e as frases do Na tela que esperam por ele. */
type Passo = readonly [fala: string, tela?: string]
const juntar = (passos: readonly Passo[]) => ({
  text: passos.map(([fala]) => fala).join(' '),
  tela: passos.flatMap(([, tela]) => (tela ? [tela] : [])).join(' '),
})

/** Os caminhos da paleta: a fala diz cada nível, e o Na tela abre cada um na sua palavra. */
type Caminho = { fala: string; niveis: readonly (readonly [citacao: string, categoria: string])[] }
const CAMINHOS = {
  variaveis: {
    fala: 'Abra Programação e depois Variáveis',
    niveis: [
      ['Abra Programação', 'Programação'],
      ['e depois Variáveis', 'Variáveis'],
    ],
  },
  logica: {
    fala: 'Abra Programação e depois Lógica e Se',
    niveis: [
      ['Abra Programação', 'Programação'],
      ['e depois Lógica', 'Lógica & Se'],
    ],
  },
  valores: {
    fala: 'Abra Programação e depois Valores',
    niveis: [
      ['Abra Programação', 'Programação'],
      ['e depois Valores', 'Valores'],
    ],
  },
  colisoes: {
    fala: 'Abra Jogo 2D, depois Colisões e depois Encostar e bloquear',
    niveis: [
      ['Abra Jogo 2D', 'Jogo 2D'],
      ['depois Colisões', 'Colisões'],
      ['e depois Encostar e bloquear', 'Encostar e bloquear'],
    ],
  },
  aparencia: {
    fala: 'Abra Jogo 2D, depois Sprites e depois Criar e trocar aparência',
    niveis: [
      ['Abra Jogo 2D', 'Jogo 2D'],
      ['depois Sprites', 'Sprites'],
      ['e depois Criar e trocar aparência', 'Criar e trocar aparência'],
    ],
  },
  encostar: {
    fala: 'Abra Jogo 3D, depois Encostar e depois Encostar de novo',
    niveis: [
      ['Abra Jogo 3D', 'Jogo 3D'],
      ['depois Encostar', 'Encostar'],
      ['e depois Encostar de novo', 'Encostar'],
    ],
  },
  animacao: {
    fala: 'Abra Jogo 3D, depois Objetos e depois Animação do modelo',
    niveis: [
      ['Abra Jogo 3D', 'Jogo 3D'],
      ['depois Objetos', 'Objetos'],
      ['e depois Animação do modelo', 'Animação do modelo'],
    ],
  },
} as const satisfies Record<string, Caminho>

const telaDoCaminho = (c: Caminho) =>
  c.niveis
    .map(
      ([citacao, nome], i) =>
        `No "${citacao}", abrir **${nome}**, sem recolher o que já estiver aberto [abrir categoria ${c.niveis
          .slice(0, i + 1)
          .map(([, n]) => n)
          .join(' > ')}].`,
    )
    .join(' ')
const pegar = (c: Caminho, bloco: string): Passo => [
  `${CALMA} ${c.fala}, e pegue ${bloco}.`,
  telaDoCaminho(c),
]

/** Para onde o bloco vai: a frase do "Arraste e solte", a citação e o destino do encaixe. */
type Solte = { fala: string; citacao: string; tag: string }
const abaixoDe = (fala: string, alvo: string): Solte => ({
  fala: `Arraste e solte logo abaixo ${fala}.`,
  citacao: `Arraste e solte logo abaixo ${fala}`,
  tag: `abaixo de "${alvo}"`,
})
const noFazer = (enc: string): Solte => ({
  fala: 'Arraste e solte no espaço ao lado de fazer.',
  citacao: 'Arraste e solte no espaço ao lado de fazer',
  tag: `em "${enc}"`,
})
const SE = (enc: string) => `Se dentro de ${enc}`
const noEntao = (enc: string): Solte => ({
  fala: 'Arraste e solte dentro do então.',
  citacao: 'Arraste e solte dentro do então',
  tag: `em "${SE(enc)}" no "então"`,
})
// "senão" sai "sinão" na transcrição: a citação para antes dele.
const noSenao = (enc: string): Solte => ({
  fala: 'Arraste e solte dentro do senão.',
  citacao: 'Arraste e solte dentro do',
  tag: `em "${SE(enc)}" no "senão"`,
})
const soltar = (bloco: string, s: Solte): Passo => [
  `${CALMA} ${s.fala}`,
  `No "${s.citacao}", encaixar o bloco [encaixar "${bloco}" ${s.tag}].`,
]
/** "É este bloco que…", com a mão no bloco que acabou de chegar. */
const papel = (alvo: string, texto: string): Passo => [
  `${CONVERSA} É este bloco que ${texto}.`,
  `No "É este bloco que ${texto
    .split(' ')
    .slice(0, 3)
    .join(' ')
    .replace(/[,:;.]+$/, '')}", apontar o bloco novo [apontar bloco "${alvo}"].`,
]
/**
 * O lugar do próximo bloco, à vista antes de abrir a paleta: o bloco de cima vem para perto do
 * meio (a pilha cresce para baixo a cada encaixe) e a mão aponta o lugar logo abaixo dele.
 */
const lugar = (fala: string, citacao: string, alvo: string): Passo => [
  `${CALMA} ${fala} Deixe esse lugar à vista.`,
  `No "${citacao}", trazer o bloco de cima para perto do meio e apontar o lugar logo abaixo dele [arrastar até "${alvo}"] [apontar abaixo de "${alvo}"].`,
]

const NO: Record<Simbolo, string> = { sol: 'no sol', lua: 'na lua', estrela: 'na estrela' }
const DA: Record<Simbolo, string> = { sol: 'do sol', lua: 'da lua', estrela: 'da estrela' }
const COM: Record<Simbolo, string> = {
  sol: 'com o sol',
  lua: 'com a lua',
  estrela: 'com a estrela',
}

/** Os avisos do jogo (iguais a `SIMBOLOS_AVISO`, em `simbolos-projeto.ts`). */
const AVISO = {
  sol: 'O sol acendeu! Agora a lua.',
  lua: 'A lua acendeu! Agora a estrela.',
  abriu: 'Na ordem certa! O baú abriu.',
  errou: 'Fora da ordem. Comece de novo pelo sol.',
} as const

// ── O que muda de uma dimensão para a outra ─────────────────────────────────────
const NOTA_2D =
  'Os tempos das setas são estimativas para a velocidade 3 do jogo 2D (180 pixels por segundo): acertar no Verificar plano.'
const ESTIMATIVA =
  'Os tempos das setas são estimativas para a velocidade 4: acertar no Verificar plano.'

type Dim = {
  /** O nome de um encontro, como o palco acha o bloco (ESPEC 9.5). */
  enc: (s: Simbolo) => string
  /** O bloco de Ao iniciar logo acima de Criar variável passo, como no projeto de cada etapa. */
  inicio: { bloco: string; fala: string; citacao: string }
  /** O último evento de Quando acontecer no projeto do começo da aula. */
  ultimoEvento: { bloco: string; fala: string; citacao: string; abaixo: string }
  pedra: Record<Simbolo, string>
  bau: string
  aviso: string
  setas: {
    ateOSol: string
    doSolALua: string
    daLuaAEstrela: string
    ateALuaSemOSol: string
    doSolAEstrelaSemALua: string
    daEstrelaAoSol: string
  }
  nota: string
}
const DIM: Record<SimbolosDimensao, Dim> = {
  '2d': {
    enc: (s) => `Quando o sprite personagem começar a encostar no sprite ${s}`,
    inicio: {
      bloco: 'Criar sprite bau',
      fala: 'Lá no fim dela está o bloco que cria o sprite bau.',
      citacao: 'está o bloco que cria o sprite bau',
    },
    ultimoEvento: {
      bloco: 'Quando apertar a tecla',
      fala: 'Lá dentro, o último bloco é o evento da tecla R, que começa outra partida.',
      citacao: 'o último bloco é o evento da tecla R',
      abaixo: 'do evento da tecla R',
    },
    // O centro de cada pedra, do baú e do aviso, em pixels do jogo (480 × 360).
    pedra: {
      sol: '[apontar prévia 44 274]',
      lua: '[apontar prévia 124 274]',
      estrela: '[apontar prévia 204 274]',
    },
    bau: '[apontar prévia 286 278]',
    aviso: '[apontar prévia 120 22]',
    setas: {
      ateOSol: '[segurar tecla ArrowDown por 0,5 s]',
      doSolALua: '[segurar tecla ArrowRight por 0,4 s]',
      daLuaAEstrela: '[segurar tecla ArrowRight por 0,4 s]',
      ateALuaSemOSol: '[segurar tecla ArrowRight por 0,4 s] [segurar tecla ArrowDown por 0,5 s]',
      doSolAEstrelaSemALua:
        '[segurar tecla ArrowUp por 0,5 s] [segurar tecla ArrowRight por 0,8 s] [segurar tecla ArrowDown por 0,5 s]',
      daEstrelaAoSol:
        '[segurar tecla ArrowUp por 0,5 s] [segurar tecla ArrowLeft por 0,8 s] [segurar tecla ArrowDown por 0,5 s]',
    },
    nota: NOTA_2D,
  },
  '3d': {
    enc: (s) => `Quando personagem encostar em ${s}`,
    inicio: {
      bloco: 'Colocar o objeto bau',
      fala: 'Lá dentro está o bloco Colocar o objeto bau, que põe o baú no lugar.',
      citacao: 'está o bloco Colocar o objeto bau',
    },
    ultimoEvento: {
      bloco: 'Quando personagem encostar em farol',
      fala: 'Lá dentro, o último bloco é o encontro com o farol.',
      citacao: 'o último bloco é o encontro com o farol',
      abaixo: 'do encontro com o farol',
    },
    // As pedras da ilha não têm um ponto fixo na prévia: a mão vai ao meio do jogo.
    pedra: { sol: '[apontar prévia]', lua: '[apontar prévia]', estrela: '[apontar prévia]' },
    bau: '[apontar prévia]',
    aviso: '[apontar prévia 320 16]',
    setas: {
      ateOSol: '[segurar tecla ArrowDown por 0,4 s]',
      doSolALua: '[segurar tecla ArrowDown por 0,3 s] [segurar tecla ArrowRight por 0,6 s]',
      daLuaAEstrela: '[segurar tecla ArrowUp por 0,3 s] [segurar tecla ArrowRight por 0,5 s]',
      ateALuaSemOSol: '[segurar tecla ArrowRight por 0,6 s] [segurar tecla ArrowDown por 0,7 s]',
      doSolAEstrelaSemALua: '[segurar tecla ArrowRight por 1,1 s]',
      daEstrelaAoSol: '[segurar tecla ArrowLeft por 1,1 s]',
    },
    nota: ESTIMATIVA,
  },
}

// ── As peças das montagens ──────────────────────────────────────────────────────
/** O encontro novo com um símbolo, logo abaixo de `acima`. */
function encontro(d: SimbolosDimensao, s: Simbolo, acima: string, acimaFala: string): Passo[] {
  const enc = DIM[d].enc(s)
  if (d === '2d') {
    const novo = 'Quando o sprite personagem começar a encostar no sprite inimigo'
    return [
      pegar(CAMINHOS.colisoes, 'o bloco Quando o sprite começar a encostar no sprite'),
      [
        `${CALMA} Arraste e solte logo abaixo ${acimaFala}. Não coloque um encontro dentro do outro.`,
        `No "Arraste e solte logo abaixo ${acimaFala}", levar o encontro novo para logo abaixo, fora do fazer [encaixar "Quando o sprite jogador começar a encostar" abaixo de "${acima}"].`,
      ],
      [
        `${CALMA} Repare: o bloco chega com os nomes jogador e inimigo. Clique em jogador e escolha personagem.`,
        `No "o bloco chega com os nomes jogador e inimigo", trazer o encontro novo para perto do meio [arrastar até "Quando o sprite jogador"]. No "Clique em jogador", clicar no primeiro nome [abrir campo "jogador" em "Quando o sprite jogador"]. No "e escolha personagem", escolher **personagem** [escolher "personagem" em "${novo}"].`,
      ],
      [
        `${CALMA} Depois clique em inimigo e escolha ${s}.`,
        `No "Depois clique em inimigo", clicar no segundo nome [abrir campo "inimigo" em "${novo}"]. No "e escolha ${s}", escolher **${s}** [escolher "${s}" em "${enc}"].`,
      ],
      [
        `${CONVERSA} É este bloco que percebe quando o personagem encosta ${NO[s]}.`,
        `No "É este bloco que percebe quando", apontar o encontro novo [apontar bloco "${enc}"].`,
      ],
    ]
  }
  const novo = `Quando personagem encostar em chave abaixo de ${acima}`
  return [
    pegar(CAMINHOS.encostar, 'o bloco Quando personagem encostar em chave'),
    [
      `${CALMA} Arraste e solte logo abaixo ${acimaFala}. Não coloque um encontro dentro do outro.`,
      `No "Arraste e solte logo abaixo ${acimaFala}", levar o encontro novo para logo abaixo, fora do fazer [encaixar "Quando personagem encostar em chave" abaixo de "${acima}"].`,
    ],
    [
      `${CALMA} Repare: o bloco chega com chave no segundo nome. Clique em chave e escolha ${s}.`,
      `No "o bloco chega com chave no segundo nome", trazer o encontro novo para perto do meio [arrastar até "${novo}"]. No "Clique em chave", clicar no segundo nome [abrir campo "chave" em "${novo}"]. No "e escolha ${s}", escolher **${s}** [escolher "${s}" em "${enc}"].`,
    ],
    [
      `${CONVERSA} É este bloco que percebe quando o personagem encosta ${NO[s]}.`,
      `No "É este bloco que percebe quando", apontar o encontro novo [apontar bloco "${enc}"].`,
    ],
  ]
}

/** Alterar variável: o caminho, o encaixe, o papel e a variável (e o número, quando muda). */
function alterarVariavel(o: {
  solte: Solte
  papel: string
  variavel: 'passo' | 'aviso'
  /** Como o palco acha o bloco depois de escolhida a variável. */
  nome: string
  outro?: boolean
  repare?: boolean
  valor?: readonly [de: string, para: string, porque: string]
}): Passo[] {
  const passos: Passo[] = [
    pegar(CAMINHOS.variaveis, `${o.outro ? 'outro' : 'o'} bloco Alterar variável para`),
    soltar('Alterar variável', o.solte),
    papel('Alterar variável contador', o.papel),
    [
      `${CALMA} ${o.repare ? 'Repare: ele chega com contador. ' : ''}Clique em contador e escolha ${o.variavel}.`,
      `No "Clique em contador", clicar no campo [abrir campo "contador" em "Alterar variável contador"]. No "e escolha ${o.variavel}", escolher **${o.variavel}** na lista [escolher "${o.variavel}" em "${o.nome}"].`,
    ],
  ]
  if (o.valor) {
    const [de, para, porque] = o.valor
    passos.push([
      `${CALMA} Depois clique no ${de}, apague e escreva ${para}, ${porque}.`,
      `No "Depois clique no ${de}", clicar no número [abrir campo "${de}" em "${o.nome}"]. No "apague e escreva ${para}", escrever ${para} e clicar fora do bloco [escolher "${para}" em "${o.nome}"].`,
    ])
  }
  return passos
}

/** O texto do aviso: o bloco texto no lugar do número e a mensagem escrita. */
function textoDoAviso(enc: string, mensagem: string, primeira: boolean): Passo[] {
  const antes = `Alterar variável aviso para 1 dentro de ${enc}`,
    depois = `Alterar variável aviso dentro de ${enc}`
  return [
    ...(primeira
      ? [
          [
            `${CONVERSA} O valor vem com um número, mas o aviso é uma mensagem. Por isso, troque o número por um texto.`,
          ] as const,
        ]
      : []),
    [
      `${CALMA} Abra Programação e depois Valores, e pegue o bloco texto. Solte em cima do número.`,
      `${telaDoCaminho(CAMINHOS.valores)} No "Solte em cima do número", soltar o bloco **texto** sobre o 1 [soltar "texto" em cima do "1" em "${antes}"].`,
    ],
    [
      `${CALMA} ${primeira ? 'Repare: o texto chega com Olá. ' : ''}Clique em Olá, apague e escreva: ${mensagem}`,
      `No "Clique em Olá", clicar no texto [abrir campo "Olá" em "${depois}"]. No "apague e escreva", escrever a mensagem que a fala dita e clicar fora do bloco [escolher "${mensagem}" em "${depois}"].`,
    ],
  ]
}

/** Jogo 2D: Trocar imagem do sprite, que acende, apaga ou abre trocando a imagem. */
function trocarImagem(o: {
  solte: Solte
  papel: string
  sprite: string
  imagem: string
  imagemFala: string
  outro?: boolean
  repare?: boolean
}): Passo[] {
  const meio = `Trocar imagem do sprite ${o.sprite} para heroi`
  const citacao = `e escolha a imagem ${o.imagemFala.split(',')[0]}`
  return [
    pegar(CAMINHOS.aparencia, `${o.outro ? 'outro' : 'o'} bloco Trocar imagem do sprite`),
    soltar('Trocar imagem do sprite', o.solte),
    papel('Trocar imagem do sprite heroi', o.papel),
    [
      `${CALMA} ${o.repare ? 'Repare: ele chega com heroi em dois lugares. ' : ''}Clique no primeiro heroi e escolha ${o.sprite}.`,
      `No "Clique no primeiro heroi", clicar no primeiro nome [abrir campo "heroi" em "Trocar imagem do sprite heroi"]. No "e escolha ${o.sprite}", escolher **${o.sprite}** [escolher "${o.sprite}" em "${meio}"].`,
    ],
    [
      `${CALMA} Depois clique no segundo heroi e escolha a imagem ${o.imagemFala}.`,
      `No "Depois clique no segundo heroi", clicar no segundo nome [abrir campo "heroi" em "${meio}"]. No "${citacao}", escolher **${o.imagem}** na lista, rolando se precisar [escolher "${o.imagem}" em "${meio}"].`,
    ],
  ]
}

/** Jogo 3D: Tocar a animação, com as animações prontas dos modelos (acender, apagar, abrir). */
function tocarAnimacao(o: {
  solte: Solte
  papel: string
  objeto: string
  animacao: string
  outro?: boolean
  repare?: boolean
  porque?: string
}): Passo[] {
  const novo = 'Tocar a animação Andar em heroi',
    comObjeto = `Tocar a animação Andar em ${o.objeto}`,
    pronto = `Tocar a animação ${o.animacao} em ${o.objeto}`
  return [
    pegar(CAMINHOS.animacao, `${o.outro ? 'outro' : 'o'} bloco Tocar a animação`),
    soltar('Tocar a animação', o.solte),
    papel(novo, o.papel),
    [
      `${CALMA} ${o.repare ? 'Repare: ele chega com Andar, heroi e repetindo. ' : ''}Clique em heroi e escolha ${o.objeto}.`,
      `No "Clique em heroi", clicar no nome do objeto [abrir campo "heroi" em "${novo}"]. No "e escolha ${o.objeto}", escolher **${o.objeto}** [escolher "${o.objeto}" em "${comObjeto}"].`,
    ],
    [
      `${CALMA} Depois clique em Andar e escolha ${o.animacao}.`,
      `No "Depois clique em Andar", clicar no nome da animação [abrir campo "Andar" em "${comObjeto}"]. No "e escolha ${o.animacao}", escolher **${o.animacao}** [escolher "${o.animacao}" em "${pronto}"].`,
    ],
    [
      `${CALMA} Agora clique em repetindo e escolha uma vez${o.porque ? `, ${o.porque}` : ''}.`,
      `No "clique em repetindo", clicar no modo [abrir campo "repetindo" em "${pronto}"]. No "e escolha uma vez", escolher **uma vez** [escolher "uma vez" em "${pronto}"].`,
    ],
  ]
}

/** Acender, apagar ou abrir, no bloco de cada dimensão. O nome serve de âncora ao bloco seguinte. */
function mudarAparencia(
  d: SimbolosDimensao,
  o: {
    enc: string
    alvo: 'sol' | 'lua' | 'estrela' | 'bau'
    jeito: 'acender' | 'apagar' | 'abrir'
    solte: Solte
    papel: string
    outro?: boolean
    repare?: boolean
    porque?: string
  },
): { passos: Passo[]; nome: string } {
  if (d === '3d')
    return {
      passos: tocarAnimacao({
        solte: o.solte,
        papel: o.papel,
        objeto: o.alvo,
        animacao: o.jeito,
        outro: o.outro,
        repare: o.repare,
        porque: o.porque,
      }),
      nome: `Tocar a animação ${o.jeito} em ${o.alvo} dentro de ${o.enc}`,
    }
  const [imagem, imagemFala] =
    o.alvo === 'bau'
      ? ['bau-aberto', 'baú aberto']
      : o.jeito === 'acender'
        ? [`pedra-${o.alvo}-acesa`, `pedra ${o.alvo} acesa`]
        : [`pedra-${o.alvo}`, `pedra ${o.alvo}, a da pedra apagada`]
  return {
    passos: trocarImagem({
      solte: o.solte,
      papel: o.papel,
      sprite: o.alvo,
      imagem,
      imagemFala,
      outro: o.outro,
      repare: o.repare,
    }),
    nome: `Trocar imagem do sprite ${o.alvo} para ${imagem} dentro de ${o.enc}`,
  }
}

/** O bloco Se com a pergunta "passo igual a n?" e o espaço do senão aberto. */
function pergunta(
  d: SimbolosDimensao,
  s: Simbolo,
  n: number,
  ideia: string,
  jeito: 'primeira-2d' | 'primeira-3d' | 'de-novo',
  kids?: string,
): Passo[] {
  const enc = DIM[d].enc(s),
    se = SE(enc)
  const comparacao: Passo[] =
    jeito === 'de-novo'
      ? [
          [
            `${CALMA} Repare: o Se chega de novo com a pergunta x maior que 0. Troque as partes dela, como na lua.`,
            `No "o Se chega de novo com a pergunta", apontar a pergunta [apontar bloco "${se}"].`,
          ],
        ]
      : [
          [
            `${CONVERSA} Repare: o Se chega com uma pergunta pronta, x maior que 0. Ela compara dois valores, e a resposta é sim ou não. Desta vez, você vai aproveitar essa pergunta e trocar as partes dela.`,
            `No "o Se chega com uma pergunta pronta", apontar a pergunta [apontar bloco "${se}"].`,
          ],
        ]
  const senao: Passo[] =
    jeito === 'de-novo'
      ? [
          [
            `${CALMA} Agora abra o espaço do senão, como na lua: na linha de baixo do Se, clique no segundo sinal de mais, o de antes da palavra senão.`,
            `No "clique no segundo sinal de mais", clicar no segundo, o de antes da palavra **senão** [abrir "senão" em "${se}"].`,
          ],
        ]
      : [
          ...(kids ? [[`${PERGUNTA} ${kids}`] as const] : []),
          [
            `${CONVERSA} ${
              jeito === 'primeira-2d' ? 'Num espaço do próprio Se.' : 'Lembra do Se no jogo 2D?'
            } A resposta do sim fica no espaço do então, e a resposta do não fica no espaço do senão. Só que o Se chega sem o senão, e você vai abrir esse espaço agora.`,
            `No "A resposta do sim fica no espaço do então", apontar o espaço do **então**, ainda vazio [apontar encaixe em "${se}" no "então"].`,
          ],
          [
            `${OLHA} Olha aqui, na linha de baixo do bloco Se: tem dois sinais de mais. O primeiro fica antes de senão se, e o segundo fica antes da palavra senão, no fim da linha.`,
            `No "Olha aqui, na linha de baixo", apontar a linha de baixo do **Se** [apontar bloco "${se}"]. No "O primeiro fica antes de", apontar o primeiro sinal de mais [apontar mais de "senão se" em "${se}"]. No "e o segundo fica antes da palavra", apontar o segundo [apontar mais de "senão" em "${se}"].`,
          ],
          [
            `${CALMA} Clique no segundo sinal de mais. Não clique no primeiro.`,
            `No "Clique no segundo sinal de mais", clicar no segundo, o de antes da palavra **senão** [abrir "senão" em "${se}"].`,
          ],
        ]
  return [
    [
      `${CONVERSA} Agora a pergunta ${DA[s]}: é a minha vez? Para fazer uma pergunta, o seu jogo usa o bloco Se. Ele vai no espaço ao lado da palavra fazer, dentro do encontro ${COM[s]}. Deixe esse espaço à vista.`,
      `No "Ele vai no espaço ao lado da palavra fazer", apontar o espaço ao lado de **fazer** [apontar encaixe em "${enc}"].`,
    ],
    pegar(CAMINHOS.logica, 'o bloco Se'),
    [
      `${CALMA} Arraste e solte no espaço ao lado de fazer.`,
      `No "Arraste e solte no espaço ao lado de fazer", encaixar o **Se** no encontro [encaixar "Se" em "${enc}"].`,
    ],
    [
      `${CONVERSA} É este bloco que faz a pergunta ${DA[s]}.`,
      `No "É este bloco que faz a pergunta", trazer o **Se** para perto do meio [arrastar até "${se}"].`,
    ],
    ...comparacao,
    [
      `${CALMA} Clique no x e escolha passo.`,
      `No "Clique no x", clicar no x [abrir campo "x" em "${se}"]. No "e escolha passo", escolher **passo** na lista [escolher "passo" em "${se}"].`,
    ],
    [
      `${CALMA} Depois clique no sinal de maior e escolha o sinal de igual.`,
      `No "Depois clique no sinal de maior", clicar no sinal [abrir campo ">" em "${se}"]. No "e escolha o sinal de igual", escolher **=** [escolher "=" em "${se}"].`,
    ],
    [
      `${CALMA} Agora clique no 0, apague e escreva ${n}.`,
      `No "Agora clique no 0", clicar no número [abrir campo "0" em "${se}"]. No "apague e escreva ${n}", escrever ${n} e clicar fora do bloco [escolher "${n}" em "${se}"].`,
    ],
    [
      `${CONVERSA} Pronto: agora o Se pergunta se passo é igual a ${n}. Ou seja: ${ideia}`,
      `No "Pronto: agora o Se pergunta", apontar o **Se** pronto [apontar bloco "${se}"].`,
    ],
    ...senao,
    [
      `${CALMA} Repare: apareceu o espaço do senão.`,
      `No "Repare: apareceu o espaço do", trazer o **Se** para perto do meio: o espaço novo nasce na borda de baixo [arrastar até "${se}"].`,
    ],
  ]
}

/** A resposta do não, igual na lua e na estrela: passo volta a 0, o sol e a lua apagam e o aviso. */
function recomeco(d: SimbolosDimensao, enc: string, igualALua: boolean): Passo[] {
  const se = SE(enc)
  const passo0 = `Alterar variável passo para 0 dentro de ${enc}`
  const sol = mudarAparencia(d, {
    enc,
    alvo: 'sol',
    jeito: 'apagar',
    solte: abaixoDe('do bloco de passo', passo0),
    papel: 'apaga o sol',
    outro: true,
  })
  // No 2D, "lua para pedra-lua" também é o começo da troca do então (pedra-lua-acesa): o bloco
  // do senão é o que fica logo abaixo da troca do sol.
  const lua = mudarAparencia(d, {
    enc,
    alvo: 'lua',
    jeito: 'apagar',
    solte: abaixoDe(d === '2d' ? 'da troca do sol' : 'do bloco que apaga o sol', sol.nome),
    papel: 'apaga a lua',
    outro: true,
  })
  const luaApagada =
    d === '2d'
      ? `Trocar imagem do sprite lua para pedra-lua abaixo de Trocar imagem do sprite sol para pedra-sol dentro de ${enc}`
      : lua.nome
  return [
    [
      `${CONVERSA} Agora a resposta do não. ${
        igualALua ? 'Ela é igual à da lua' : 'Ela faz a tentativa recomeçar'
      }: passo volta a 0, o sol e a lua apagam, e o aviso pede para começar pelo sol.`,
    ],
    [
      `${CALMA} Ela vai no espaço do senão. Deixe esse espaço à vista.`,
      // O então cresceu com três blocos: o fim dele, logo acima do senão, vem para perto do meio.
      `No "Ela vai no espaço do", trazer para perto do meio o fim do então, logo acima do espaço do **senão** [arrastar até "Alterar variável aviso dentro de ${enc}"], e apontar o espaço do **senão** [apontar encaixe em "${se}" no "senão"].`,
    ],
    ...alterarVariavel({
      solte: noSenao(enc),
      papel: 'faz a senha recomeçar do zero',
      variavel: 'passo',
      nome: `Alterar variável passo para 1 dentro de ${enc}`,
      outro: true,
      valor: ['1', '0', 'porque a senha volta para o começo'],
    }),
    lugar(
      `Logo abaixo, ainda no senão, vai ${d === '2d' ? 'uma troca de imagem' : 'Tocar a animação'} para apagar o sol.`,
      'para apagar o sol',
      passo0,
    ),
    ...sol.passos,
    lugar(
      `Embaixo ${d === '2d' ? 'dela vai mais uma troca de imagem' : 'dele vai mais um Tocar a animação'}, para apagar a lua.`,
      'para apagar a lua',
      sol.nome,
    ),
    ...lua.passos,
    lugar(
      'Por último, o aviso de recomeçar. Ele vai logo abaixo, ainda no senão.',
      'Por último, o aviso de recomeçar',
      luaApagada,
    ),
    ...alterarVariavel({
      solte: abaixoDe(d === '2d' ? 'da troca da lua' : 'do bloco que apaga a lua', luaApagada),
      papel: 'pede para começar pelo sol',
      variavel: 'aviso',
      nome: `Alterar variável aviso para 1 dentro de ${enc}`,
      outro: true,
    }),
    ...textoDoAviso(enc, AVISO.errou, false),
  ]
}

/** A abertura da montagem, a conferência e a saída (ou o envio) no Na tela. */
const telaDaMontagem = (comeco: string, meio: string, fim: string, nota: string) =>
  `A parte começa com o Estúdio expandido e o projeto ${comeco} [expandir estúdio]. ${meio} ${fim} ${nota}`

// ── As três montagens, iguais nas duas dimensões ────────────────────────────────
function parteSol(d: SimbolosDimensao): SimbolosTrecho {
  const x = DIM[d],
    enc = x.enc('sol'),
    tres = d === '3d'
  const passoNoSol = `Alterar variável passo dentro de ${enc}`
  const acende = mudarAparencia(d, {
    enc,
    alvo: 'sol',
    jeito: 'acender',
    solte: abaixoDe('do bloco de passo', passoNoSol),
    papel: tres ? 'acende o sol' : 'acende o sol: ele troca a imagem da pedra pela pedra acesa',
    repare: true,
    porque: 'porque a pedra acende uma vez só',
  })
  const r = juntar([
    [
      `${CONVERSA} Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e leve o personagem até o sol. Tá vendo? Ele encosta na pedra, e nada acontece, porque o jogo ainda não tem nenhuma reação para esse encontro.`,
      `No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol", levar o personagem pelas setas do teclado até ele encostar no sol ${x.setas.ateOSol}. No "Tá vendo?", apontar o sol, ainda apagado ${x.pedra.sol}.`,
    ],
    [
      tres
        ? `${CONVERSA} Lembra da senha do baú que você programou no jogo 2D? Na ilha, ela funciona do mesmo jeito: passo começa em 0, e o sol muda passo para 1. Agora a gente vai montar isso no seu jogo da ilha!`
        : `${CONVERSA} Lembra da experiência da parte anterior? O jogo guardava em passo até onde a senha tinha chegado. No começo, passo valia 0. Depois do sol, passo virava 1. Agora a gente vai ensinar isso ao seu jogo!`,
    ],
    [
      `${CONVERSA} Primeiro, a variável passo. Ela precisa existir desde o começo da partida, valendo 0. Por isso, ela nasce na área Ao iniciar, que roda quando o jogo começa.`,
    ],
    [
      `${CALMA} Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. ${x.inicio.fala} O bloco novo vai logo abaixo dele. Deixe esse lugar à vista.`,
      `No "Encontre a área Ao iniciar", trazer o bloco do baú para perto do meio [arrastar até "${x.inicio.bloco}"]. No "${x.inicio.citacao}", apontar o bloco [apontar bloco "${x.inicio.bloco}"]. No "O bloco novo vai logo abaixo dele", apontar o lugar logo abaixo [apontar abaixo de "${x.inicio.bloco}"].`,
    ],
    pegar(CAMINHOS.variaveis, 'o bloco Criar variável'),
    soltar('Criar variável', abaixoDe('do bloco do baú', x.inicio.bloco)),
    papel('Criar variável contador', 'cria a variável passo, no começo de toda partida'),
    [
      `${CALMA} Repare: ele chega com o nome contador. Clique em contador, apague e escreva passo.`,
      `No "Clique em contador", clicar no nome [abrir campo "contador" em "Criar variável contador"]. No "apague e escreva passo", escrever passo e clicar fora do bloco [escolher "passo" em "Criar variável passo"].`,
    ],
    [
      `${CONVERSA} O valor já vem com o número 0, e é isso mesmo: no começo da partida, nenhum símbolo foi tocado.`,
      `No "O valor já vem com o número 0", apontar o bloco pronto [apontar bloco "Criar variável passo"].`,
    ],
    [`${CONVERSA} Agora, o encontro com o sol. Os encontros ficam na área Quando acontecer.`],
    [
      `${CALMA} Encontre essa área. ${x.ultimoEvento.fala} O encontro novo vai logo abaixo dele, fora do fazer dele. Deixe esse espaço à vista.`,
      `No "Encontre essa área", trazer o fim da área para perto do meio [arrastar até "${x.ultimoEvento.bloco}"]. No "${x.ultimoEvento.citacao}", apontar o bloco [apontar bloco "${x.ultimoEvento.bloco}"]. No "O encontro novo vai logo abaixo dele", apontar o lugar logo abaixo [apontar abaixo de "${x.ultimoEvento.bloco}"].`,
    ],
    ...encontro(d, 'sol', x.ultimoEvento.bloco, x.ultimoEvento.abaixo),
    [
      `${CONVERSA} Agora as reações do encontro. A primeira é passo virar 1, porque o sol é o primeiro símbolo da senha. Ela vai no espaço ao lado da palavra fazer. Deixe esse espaço à vista.`,
      `No "Ela vai no espaço ao lado da palavra fazer", apontar o espaço ao lado de **fazer** [apontar encaixe em "${enc}"].`,
    ],
    ...alterarVariavel({
      solte: noFazer(enc),
      papel: 'muda o valor de passo',
      variavel: 'passo',
      nome: passoNoSol,
      repare: true,
    }),
    [
      `${CONVERSA} O valor já vem com o número 1, e é isso mesmo: depois do sol, passo vale 1.`,
      `No "O valor já vem com o número 1", apontar o bloco [apontar bloco "${passoNoSol}"].`,
    ],
    ...(tres
      ? [
          [`${PERGUNTA} No 3D, a pedra também troca de imagem?`] as const,
          [
            `${CONVERSA} Não. Na ilha, cada pedra é um modelo 3D, e ele já vem com duas animações prontas: acender e apagar. Para acender o sol, você vai tocar a animação acender.`,
          ] as const,
          lugar(
            'Esse bloco vai logo abaixo do bloco de passo.',
            'Esse bloco vai logo abaixo do bloco de passo',
            passoNoSol,
          ),
        ]
      : [
          lugar(
            'A segunda reação acende o sol. Ela vai logo abaixo do bloco de passo.',
            'Ela vai logo abaixo do bloco de passo',
            passoNoSol,
          ),
        ]),
    ...acende.passos,
    lugar(
      `A última reação muda o aviso, para quem está jogando saber o que fazer depois. Ela vai logo abaixo ${tres ? 'do bloco que acende o sol' : 'da troca de imagem'}.`,
      'para quem está jogando saber',
      acende.nome,
    ),
    ...alterarVariavel({
      solte: abaixoDe(tres ? 'do bloco que acende o sol' : 'da troca de imagem', acende.nome),
      papel: 'muda o aviso lá em cima do jogo',
      variavel: 'aviso',
      nome: `Alterar variável aviso para 1 dentro de ${enc}`,
      outro: true,
    }),
    ...textoDoAviso(enc, AVISO.sol, true),
    [
      `${ANIMA} Agora vamos testar! Clique em Rodar de novo mais uma vez e leve o personagem até o sol.`,
      `No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol", levar o personagem até o sol pelo mesmo caminho ${x.setas.ateOSol}.`,
    ],
    [
      `${OLHA} Olha só: o sol acende, e o aviso lá em cima pede a lua.`,
      `No "Olha só: o sol acende", apontar o sol aceso ${x.pedra.sol}. No "e o aviso lá em cima pede a lua", apontar o aviso ${x.aviso}.`,
    ],
    [`${CONVERSA} A lua e a estrela ainda não respondem. Elas vêm nas próximas partes.`],
  ])
  const acendeNaLista = tres ? 'Tocar a animação acender no sol' : 'a troca de imagem do sol'
  return {
    key: 'sol',
    title: tres ? 'O sol da ilha começa' : 'O sol começa',
    kind: 'build',
    etapa: 'sol',
    ponte: `Agora faça o sol começar a senha! Crie passo com 0 em Ao iniciar e, no encontro com o sol, mude passo para 1, ${
      tres ? 'toque a animação acender' : 'acenda o sol'
    } e mude o aviso. Teste no jogo. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.`,
    text: `${r.text} ${verificar(
      `${tres ? 'logo abaixo de Colocar o objeto bau' : 'no fim de Ao iniciar'} está Criar variável passo com valor 0, e no encontro entre personagem e sol estão Alterar variável passo para 1, ${acendeNaLista} e o aviso novo`,
    )}`,
    screen: telaDaMontagem(
      'do começo da aula',
      r.tela,
      `${telaDaConferencia(`"Criar variável passo", "${enc}"`, [
        ['está Criar variável passo com valor 0', 'Criar variável passo'],
        ['e no encontro entre personagem e sol', enc],
        ['estão Alterar variável passo para 1', passoNoSol],
        [acendeNaLista, acende.nome],
        ['e o aviso novo', `Alterar variável aviso dentro de ${enc}`],
      ])} ${telaDaSaida}`,
      x.nota,
    ),
    ...(tres ? { kids: ['No 3D, a pedra também troca de imagem?'] } : {}),
  }
}

const KIDS_DA_LUA = 'E onde fica o que acontece quando não é a vez da lua?'

function parteLua(d: SimbolosDimensao): SimbolosTrecho {
  const x = DIM[d],
    enc = x.enc('lua'),
    sol = x.enc('sol'),
    tres = d === '3d'
  const passo2 = `Alterar variável passo para 2 dentro de ${enc}`
  const acende = mudarAparencia(d, {
    enc,
    alvo: 'lua',
    jeito: 'acender',
    solte: abaixoDe('do bloco de passo', passo2),
    papel: 'acende a lua',
    repare: !tres,
    porque: tres ? 'como no sol' : undefined,
  })
  const r = juntar([
    [
      `${CONVERSA} Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e leve o personagem até o sol e depois até a lua. Tá vendo? O sol acende, mas a lua não, porque o jogo ainda não tem nenhuma reação para o encontro com a lua.`,
      `No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol e depois até a lua", levar o personagem pelas setas do teclado até o sol e depois até a lua ${x.setas.ateOSol} ${x.setas.doSolALua}. No "Tá vendo?", apontar a lua, ainda apagada ${x.pedra.lua}.`,
    ],
    [
      tres
        ? `${CONVERSA} Como no jogo 2D, a lua pergunta se é a vez dela: passo igual a 1? Com a resposta sim, ela acende. Com a resposta não, a tentativa recomeça. Agora a lua da ilha vai fazer essa pergunta!`
        : `${CONVERSA} Lembra da experiência? Quando a lua perguntava se era a vez dela, a resposta era sim só com passo valendo 1, ou seja, logo depois do sol. Com a resposta não, a tentativa recomeçava: passo voltava a 0, e os símbolos acesos apagavam. Agora a lua do seu jogo vai fazer essa pergunta!`,
    ],
    [
      `${CONVERSA} Primeiro, o encontro com a lua. Os encontros ficam na área Quando acontecer, e o novo vai logo abaixo do encontro com o sol, fora do fazer dele.`,
    ],
    [
      `${CALMA} Na área Quando acontecer, deixe à vista o encontro com o sol e o espaço logo abaixo dele.`,
      `No "deixe à vista o encontro com o sol", trazer o encontro com o sol para perto do meio [arrastar até "${sol}"]. No "e o espaço logo abaixo dele", apontar o lugar logo abaixo [apontar abaixo de "${sol}"].`,
    ],
    ...encontro(d, 'lua', sol, 'do encontro com o sol'),
    ...pergunta(
      d,
      'lua',
      1,
      'o sol já foi tocado?',
      tres ? 'primeira-3d' : 'primeira-2d',
      tres ? undefined : KIDS_DA_LUA,
    ),
    [
      `${CONVERSA} Agora a resposta do sim, no espaço do então. Ela tem três blocos, como o encontro com o sol: passo vira 2, a lua acende e o aviso muda. Deixe o espaço do então à vista.`,
      `No "Deixe o espaço do então à vista", apontar o espaço do **então** [apontar encaixe em "${SE(enc)}" no "então"].`,
    ],
    ...alterarVariavel({
      solte: noEntao(enc),
      papel: 'guarda que a lua já foi tocada',
      variavel: 'passo',
      nome: `Alterar variável passo dentro de ${enc}`,
      repare: true,
      valor: ['1', '2', 'porque depois da lua passo vale 2'],
    }),
    lugar(
      `${tres ? 'O bloco que acende a lua' : 'A troca de imagem'} vai logo abaixo, ainda no então.`,
      tres ? 'O bloco que acende a lua' : 'A troca de imagem vai logo abaixo',
      passo2,
    ),
    ...acende.passos,
    lugar(
      'O aviso vai logo abaixo, ainda no então.',
      'O aviso vai logo abaixo, ainda no então',
      acende.nome,
    ),
    ...alterarVariavel({
      solte: abaixoDe(tres ? 'do bloco que acende a lua' : 'da troca de imagem', acende.nome),
      papel: 'muda o aviso',
      variavel: 'aviso',
      nome: `Alterar variável aviso para 1 dentro de ${enc}`,
      outro: true,
    }),
    ...textoDoAviso(enc, AVISO.lua, true),
    ...recomeco(d, enc, false),
    [
      `${ANIMA} Agora vamos testar! Clique em Rodar de novo mais uma vez e leve o personagem até o sol e depois até a lua.`,
      `No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol e depois até a lua", levar o personagem pelo mesmo caminho ${x.setas.ateOSol} ${x.setas.doSolALua}.`,
    ],
    [
      `${OLHA} Olha só: o sol e a lua acendem, e o aviso pede a estrela.`,
      `No "Olha só: o sol e a lua acendem", apontar a lua acesa ${x.pedra.lua}. No "e o aviso pede a estrela", apontar o aviso ${x.aviso}.`,
    ],
    [
      `${CONVERSA} Agora teste fora da vez. Toque na tecla R e leve o personagem direto até a lua, sem passar pelo sol.`,
      `No "Toque na tecla R", tocar a tecla R [tecla r]. No "e leve o personagem direto até a lua", levar o personagem até a lua sem encostar no sol ${x.setas.ateALuaSemOSol}.`,
    ],
    [
      `${OLHA} Olha só: a lua não acende, e o aviso pede para começar pelo sol. É a resposta do senão funcionando!`,
      `No "Olha só: a lua não acende", apontar a lua apagada ${x.pedra.lua}. No "e o aviso pede para começar pelo sol", apontar o aviso ${x.aviso}.`,
    ],
  ])
  const acesa = tres ? 'Tocar a animação acender na lua' : 'a troca da lua'
  const apagadas = tres ? 'as animações apagar no sol e na lua' : 'as trocas do sol e da lua'
  return {
    key: 'lua',
    title: tres ? 'A lua da ilha pergunta a vez' : 'A lua pergunta a vez',
    kind: 'build',
    etapa: 'lua',
    ponte: `Agora a lua vai perguntar se é a vez dela! No encontro com a lua, monte o Se com passo = 1: no então, passo vira 2, a lua acende e o aviso muda; no senão, passo volta a 0, o sol e a lua apagam e o aviso pede o sol. Teste a ordem certa e a lua primeiro. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.`,
    text: `${r.text} ${verificar(
      `dentro do encontro entre personagem e lua está o Se com passo igual a 1, no então estão Alterar variável passo para 2, ${acesa} e o aviso, e no senão estão Alterar variável passo para 0, ${apagadas} e o aviso de recomeçar`,
    )}`,
    screen: telaDaMontagem(
      'da parte anterior',
      r.tela,
      `${telaDaConferencia(`"${enc}"`, [
        ['dentro do encontro entre personagem e lua', enc],
        ['está o Se com passo igual a 1', SE(enc)],
        ['no então estão Alterar variável passo para 2', passo2],
        [
          'e no senão estão Alterar variável passo para 0',
          `Alterar variável passo para 0 dentro de ${enc}`,
        ],
      ])} ${telaDaSaida}`,
      x.nota,
    ),
    ...(tres ? {} : { kids: [KIDS_DA_LUA] }),
  }
}

const KIDS_DA_ESTRELA_2D = 'E se eu errar a ordem, preciso começar outra partida?'
const KIDS_DO_BAU_3D = 'E o baú, como ele abre?'

function parteEstrela(d: SimbolosDimensao): SimbolosTrecho {
  const x = DIM[d],
    enc = x.enc('estrela'),
    lua = x.enc('lua'),
    tres = d === '3d'
  const acende = mudarAparencia(d, {
    enc,
    alvo: 'estrela',
    jeito: 'acender',
    solte: noEntao(enc),
    papel: 'acende a estrela',
    repare: !tres,
    porque: tres ? 'como nas outras pedras' : undefined,
  })
  const abre = mudarAparencia(d, {
    enc,
    alvo: 'bau',
    jeito: 'abrir',
    solte: abaixoDe(tres ? 'do bloco que acende a estrela' : 'da troca da estrela', acende.nome),
    papel: 'abre o baú',
    outro: true,
    porque: tres ? 'porque o baú abre uma vez só' : undefined,
  })
  const pronto = tres
    ? 'Pronto, você levou a senha do baú para a ilha em três dimensões: lá também, só a ordem certa abre o baú!'
    : 'Pronto, você programou a senha do baú: o jogo lembra até onde a senha chegou, e só a ordem certa abre o baú!'
  const r = juntar([
    [
      `${CONVERSA} Aqui no seu jogo, clique em Rodar de novo, no alto do Estúdio, e leve o personagem até o sol, a lua e a estrela. Tá vendo? O sol e a lua acendem, mas a estrela não, e o baú continua fechado, porque o jogo ainda não tem nenhuma reação para o encontro com a estrela.`,
      `No "clique em Rodar de novo, no alto do Estúdio", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol, a lua e a estrela", levar o personagem pelas setas do teclado de pedra em pedra ${x.setas.ateOSol} ${x.setas.doSolALua} ${x.setas.daLuaAEstrela}. No "Tá vendo?", apontar o baú fechado ${x.bau}.`,
    ],
    [
      tres
        ? `${CONVERSA} Como no jogo 2D, a estrela pergunta se é a vez dela: passo igual a 2? Com a resposta sim, ela acende e o baú abre. Com a resposta não, a tentativa recomeça, como na lua. Agora a estrela da ilha vai fazer essa pergunta!`
        : `${CONVERSA} Lembra da experiência? A estrela abria o baú só na vez dela, com passo valendo 2, ou seja, depois do sol e da lua. Fora da vez, a tentativa recomeçava, como na lua. Agora a estrela do seu jogo vai fazer essa pergunta!`,
    ],
    [
      `${CALMA} Primeiro, o encontro com a estrela. Na área Quando acontecer, deixe à vista o encontro com a lua e o espaço logo abaixo dele, fora do fazer dele.`,
      `No "deixe à vista o encontro com a lua", trazer o fim do encontro com a lua para perto do meio [arrastar até "${lua}"]. No "e o espaço logo abaixo dele", apontar o lugar logo abaixo [apontar abaixo de "${lua}"].`,
    ],
    ...encontro(d, 'estrela', lua, 'do encontro com a lua'),
    ...pergunta(d, 'estrela', 2, 'o sol e a lua já foram tocados, nessa ordem?', 'de-novo'),
    [
      `${CONVERSA} Agora a resposta do sim, no espaço do então. Ela tem três blocos: a estrela acende, o baú abre e o aviso conta que deu certo. Deixe o espaço do então à vista.`,
      `No "Deixe o espaço do então à vista", apontar o espaço do **então** [apontar encaixe em "${SE(enc)}" no "então"].`,
    ],
    ...acende.passos,
    ...(tres
      ? [
          [`${PERGUNTA} ${KIDS_DO_BAU_3D}`] as const,
          [
            `${CONVERSA} Com uma animação também. O modelo do baú já vem com a animação abrir.`,
          ] as const,
          lugar(
            'O bloco que abre o baú vai logo abaixo, ainda no então.',
            'O bloco que abre o baú vai logo abaixo',
            acende.nome,
          ),
        ]
      : [
          lugar(
            'A troca de imagem que abre o baú vai logo abaixo, ainda no então.',
            'A troca de imagem que abre o baú',
            acende.nome,
          ),
        ]),
    ...abre.passos,
    lugar(
      'O aviso vai logo abaixo, ainda no então.',
      'O aviso vai logo abaixo, ainda no então',
      abre.nome,
    ),
    ...alterarVariavel({
      solte: abaixoDe(tres ? 'do bloco que abre o baú' : 'da troca do baú', abre.nome),
      papel: 'conta que deu certo',
      variavel: 'aviso',
      nome: `Alterar variável aviso para 1 dentro de ${enc}`,
      repare: true,
    }),
    ...textoDoAviso(enc, AVISO.abriu, true),
    ...recomeco(d, enc, true),
    [
      `${ANIMA} Agora vamos testar! Clique em Rodar de novo mais uma vez e leve o personagem até o sol, a lua e a estrela.`,
      `No "Clique em Rodar de novo mais uma vez", clicar em **Rodar de novo** [rodar de novo]. No "e leve o personagem até o sol, a lua e a estrela", levar o personagem pelo mesmo caminho ${x.setas.ateOSol} ${x.setas.doSolALua} ${x.setas.daLuaAEstrela}.`,
    ],
    [
      `${OLHA} Olha só: a estrela acende, e o baú abre!`,
      `No "Olha só: a estrela acende", apontar a estrela acesa ${x.pedra.estrela}. No "e o baú abre", apontar o baú aberto ${x.bau}.`,
    ],
    [
      `${CONVERSA} Agora teste uma ordem errada. Toque na tecla R e leve o personagem até o sol e depois direto até a estrela, sem passar pela lua.`,
      `No "Toque na tecla R", tocar a tecla R [tecla r]. No "e depois direto até a estrela", levar o personagem até o sol e dali até a estrela, sem encostar na lua ${x.setas.ateOSol} ${x.setas.doSolAEstrelaSemALua}.`,
    ],
    [
      `${OLHA} Olha só: o sol apaga, o baú continua fechado, e o aviso pede para começar pelo sol.`,
      `No "Olha só: o sol apaga", apontar o baú fechado ${x.bau}. No "e o aviso pede para começar pelo sol", apontar o aviso ${x.aviso}.`,
    ],
    ...(tres
      ? []
      : [
          [`${PERGUNTA} ${KIDS_DA_ESTRELA_2D}`] as const,
          [
            `${CONVERSA} Não. É só voltar ao sol e seguir a placa de novo, na mesma partida.`,
          ] as const,
        ]),
    [
      `${CALMA} ${tres ? 'E, depois de errar, dá para recomeçar na mesma partida. ' : ''}Sem tocar na tecla R, leve o personagem de volta até o sol, depois até a lua e até a estrela.`,
      `No "leve o personagem de volta até o sol", levar o personagem de volta ao sol e seguir a placa de novo ${x.setas.daEstrelaAoSol} ${x.setas.doSolALua} ${x.setas.daLuaAEstrela}.`,
    ],
    [
      `${OLHA} Olha só: recomeçando pelo sol, o baú abre de novo.`,
      `No "recomeçando pelo sol, o baú abre", apontar o baú aberto ${x.bau}.`,
    ],
  ])
  const entao = tres
    ? 'as animações acender na estrela e abrir no baú'
    : 'a troca da estrela, a troca do baú'
  return {
    key: 'estrela',
    title: tres ? 'A estrela abre o baú da ilha' : 'A estrela abre o baú',
    kind: 'delivery',
    etapa: 'estrela',
    ponte: `${
      tres ? 'Hora de abrir o baú da ilha!' : 'Agora a estrela vai abrir o baú!'
    } No encontro com a estrela, monte o Se com passo = 2: no então, a estrela acende, o baú ${
      tres ? 'toca abrir' : 'abre'
    } e o aviso muda; no senão, recomece como na lua. Teste a ordem certa, uma ordem errada e recomeçar pelo sol. Depois clique em Verificar projeto, em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.`,
    text: `${r.text} ${entregar(
      `dentro do encontro entre personagem e estrela está o Se com passo igual a 2, no então estão ${entao} e o aviso, e no senão está o mesmo recomeço da lua`,
      pronto,
      'Depois do envio, ainda tem algumas perguntas para você pensar na ordem dos símbolos. Quando aparecer Projeto enviado!, clique em Próxima parte.',
    )}`,
    screen: telaDaMontagem(
      'da parte anterior',
      r.tela,
      `${telaDaConferencia(`"${enc}"`, [
        ['dentro do encontro entre personagem e estrela', enc],
        ['está o Se com passo igual a 2', SE(enc)],
        [tres ? 'abrir no baú' : 'a troca do baú', abre.nome],
        ['e no senão está o mesmo recomeço', `Alterar variável passo para 0 dentro de ${enc}`],
      ])} ${telaDoEnvio(pronto.split(':')[0] ?? pronto, 'Próxima parte')}`,
      x.nota,
    ),
    kids: [tres ? KIDS_DO_BAU_3D : KIDS_DA_ESTRELA_2D],
  }
}

/** O quiz fecha cada aula, depois do envio: as perguntas com cena e as sem cena. */
const revisao = (title: string, screen: string): SimbolosTrecho => ({
  key: 'revisao',
  title,
  kind: 'quiz',
  screen,
  ponte:
    'Escolha uma resposta e clique em Ver o que acontece ou, nas perguntas sem cena, em Responder. Observe a cena e a explicação. Você pode tentar de novo. Quando terminar, clique em Concluir aula.',
  text: '',
})

export const simbolosAulas: {
  slug: string
  title: string
  dimension: SimbolosDimensao
  trechos: SimbolosTrecho[]
}[] = [
  {
    slug: 'aula-1',
    title: 'Na ordem certa',
    dimension: '2d',
    trechos: [
      {
        key: 'abertura',
        title: 'Os símbolos do Farol',
        kind: 'intro',
        kids: ['E se eu tocar um símbolo fora da ordem?'],
        screen: `Do "Oi" até o "Este é O baú dos símbolos", a tela mostra o título O baú dos símbolos sobre a cena inicial do jogo pronto [na edição: título O baú dos símbolos]. No "No gramado de baixo ficam três pedras", ampliar o jogo pronto [ampliar jogo]. No "o sol, a lua e a estrela", apontar as três pedras [apontar jogo 124 274]. No "E a placa embaixo delas", apontar a placa da ordem [apontar jogo 124 328]. No "Para andar, segure as setas", apontar as quatro setas no canto de baixo do jogo [apontar setas]. No "Olha aqui: quando eu levo o personagem até o sol", segurar a seta de baixo da tela até o personagem encostar no sol [segurar seta de baixo por 0,5 s]. No "Repare também no aviso aqui em cima", apontar o aviso [apontar jogo 120 22]. No "E se eu tocar um símbolo", manter a cena parada, sem tocar outra pedra. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não tocar a lua nem a estrela e não abrir o baú: a partida é da criança. ${NOTA_2D}`,
        ponte:
          'Sua vez! Jogue a versão pronta: segure as setas para andar, abra o baú e descubra o que acontece fora da ordem. A tecla R recomeça. Quando terminar, clique em Próxima parte.',
        text: `${BOAS_VINDAS} Oi! Você já criou A Chave do Farol. Agora o farol ganhou um baú que só abre com uma senha de símbolos. Este é O baú dos símbolos! ${CONVERSA} No gramado de baixo ficam três pedras com símbolos: o sol, a lua e a estrela. E a placa embaixo delas mostra a ordem certa. ${CONVERSA} Para andar, segure as setas no canto de baixo do jogo. No computador, você também pode clicar dentro do jogo e usar as setas do teclado. ${OLHA} Olha aqui: quando eu levo o personagem até o sol, o sol acende. Repare também no aviso aqui em cima: agora ele pede a lua. ${PERGUNTA} E se eu tocar um símbolo fora da ordem? ${CONVERSA} Isso eu deixo para você descobrir. O farol continua como antes: com a chave, ele acende. ${CONVERSA} Para começar outra partida, toque na tecla R. ${ANIMA} Agora é a sua vez: abra o baú e descubra o que acontece fora da ordem. Quando terminar, clique em Próxima parte.`,
      },
      {
        key: 'material',
        title: 'O seu Passo a passo do projeto',
        kind: 'material',
        screen:
          'O material é o Passo a passo do projeto, o caderno do bloco de materiais. No "Olha, aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele estão os passos", colocar o livro em tela cheia [livro tela cheia]. Enquanto a fala segue, as páginas passam uma por trecho, para mostrar mais do caderno. No "para montar o seu jogo", passar da capa para a página seguinte [livro próxima]. No "nas duas aulas", passar mais uma página [livro próxima]. No "com os blocos que você vai usar", passar mais uma página [livro próxima]. No "e o lugar de cada um", passar mais uma página [livro próxima]. No "Por isso, se você esquecer algum passo", passar mais uma página [livro próxima]. No "é só voltar aqui", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não demonstrar a impressão nem os controles do leitor.',
        ponte:
          'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
        text: `${CONVERSA} Olha, aqui está o Passo a passo do projeto. Nele estão os passos para montar o seu jogo nas duas aulas, com os blocos que você vai usar e o lugar de cada um. Por isso, se você esquecer algum passo, é só voltar aqui e abrir o material. ${ANIMA} Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. ${CALMA} Agora clique em Próxima parte.`,
      },
      {
        key: 'experiencia',
        title: 'A ordem dos símbolos',
        kind: 'experience',
        kids: ['E o que acontece com passo quando um símbolo vem fora da vez?'],
        screen: `A experiência aparece no tamanho da aula, com a cena parada: as três pedras apagadas, a placa, o baú fechado e o caderninho do jogo. Do "Sabe quando você aperta" até o "vierem na ordem certa", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy apertando os números de um cadeado de senha, um de cada vez, pensativo, sem mostrar o cadeado abrindo [na edição: o cadeado de senha]. No "No seu jogo, os símbolos", a tela volta para a experiência. ${telaDaExperiencia('com as três pedras apagadas, a placa, o baú fechado e o caderninho do jogo, sem apontar controles nem tocar nenhum símbolo')} O que passo faz a cada toque, o que acontece fora da vez e o que muda em cada jeito de o baú conferir é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência. Não falar de blocos, regra, Se, então nem senão: eles ficam para a montagem (decisão de 02/11/2026). ${MOLDE}`,
        ponte:
          'Sua vez! Investigue o que acontece quando os símbolos vêm na ordem da placa e quando vêm fora da vez, em cada jeito de o baú conferir. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        text: `${CONVERSA} No seu jogo, o baú só abre com uma senha de símbolos. Para conferir a senha, o jogo precisa lembrar até onde você já chegou. ${CALMA} Para lembrar, ele usa uma variável, como temChave na Chave do Farol: um lugar onde o jogo guarda uma informação para usar depois. Desta vez, a variável se chama passo. ${CONVERSA} Sabe quando você aperta os números da senha de um cadeado? Cada número tem a sua vez, e o cadeado só abre se todos vierem na ordem certa. ${CONVERSA} No seu jogo, os símbolos são os números da senha, e a placa mostra a ordem. E cada símbolo, quando é tocado, faz uma pergunta: é a minha vez? ${CONVERSA} O baú pode conferir a senha de dois jeitos: só contando os símbolos tocados, ou conferindo a vez de cada um. ${PERGUNTA} E o que acontece com passo quando um símbolo vem fora da vez? ${CONVERSA} O que você acha? Isso você vai testar na experiência. ${ANIMA} Agora você vai investigar o que acontece com passo quando os símbolos vêm na ordem da placa e quando vêm fora da vez, em cada jeito de o baú conferir. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.`,
      },
      parteSol('2d'),
      parteLua('2d'),
      parteEstrela('2d'),
      revisao(
        'Pense na ordem',
        'Quiz sem vídeo, depois do envio: quatro perguntas, duas previsões com cena e dois diagnósticos.',
      ),
    ],
  },
  {
    slug: 'aula-2',
    title: 'Os símbolos da ilha',
    dimension: '3d',
    trechos: [
      {
        key: 'abertura',
        title: 'Os símbolos chegaram à ilha',
        kind: 'intro',
        kids: ['Será que na ilha o baú também só abre na ordem certa?'],
        screen: `Do "Oi" até o "em três dimensões", a tela mostra o título O baú dos símbolos sobre a cena inicial do jogo pronto [na edição: título O baú dos símbolos]. No "No gramado da frente ficam as três pedras", ampliar o jogo pronto [ampliar jogo]. No "Para andar, clique dentro do jogo", clicar no meio do jogo, para o teclado ir para ele [tocar jogo]. No "Olha aqui: quando eu levo o personagem até o sol", segurar a seta de baixo do teclado até o personagem encostar no sol ${DIM['3d'].setas.ateOSol}. No "Repare também no aviso aqui em cima", apontar o aviso [apontar jogo 480 24]. No "Será que na ilha o baú", manter a cena parada, sem tocar outra pedra. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não tocar a lua nem a estrela e não abrir o baú: a partida é da criança. ${ESTIMATIVA}`,
        ponte:
          'Sua vez! Jogue a versão pronta: segure as setas para andar e abra o baú da ilha na ordem da placa. A tecla R recomeça. Quando terminar, clique em Próxima parte.',
        text: `${BOAS_VINDAS} Oi! Na Aula 1, você programou a senha do baú no jogo 2D. Agora o baú dos símbolos chegou à Ilha do Farol, em três dimensões! ${CONVERSA} No gramado da frente ficam as três pedras: o sol, a lua e a estrela. E a placa ao lado delas mostra a ordem certa. ${CONVERSA} Para andar, clique dentro do jogo e segure uma seta do teclado. As letras W, A, S e D também funcionam. ${OLHA} Olha aqui: quando eu levo o personagem até o sol, a pedra acende com uma animação. Repare também no aviso aqui em cima: agora ele pede a lua. ${PERGUNTA} Será que na ilha o baú também só abre na ordem certa? ${CONVERSA} Isso eu deixo para você descobrir. Para começar outra partida, toque na tecla R. ${ANIMA} Agora é a sua vez: abra o baú da ilha. Quando terminar, clique em Próxima parte.`,
      },
      parteSol('3d'),
      parteLua('3d'),
      parteEstrela('3d'),
      revisao(
        'Pense nos símbolos da ilha',
        'Quiz sem vídeo, depois do envio: duas perguntas, uma previsão com cena 3D e uma sem cena.',
      ),
    ],
  },
]

/** A montagem completa, opcional, das duas dimensões (o Passo a passo do projeto). */
export function simbolosAjuda(d: SimbolosDimensao): {
  key: string
  title: string
  idea: string
  steps: string[]
  test: string
  correction: string
}[] {
  const three = d === '3d'
  const encontro = (nome: string, onde: string) =>
    three
      ? `Em Quando acontecer, deixe à vista um espaço vazio ${onde}, fora do fazer dos outros. Abra Jogo 3D → Encostar → Encostar e pegue Quando personagem encostar em. O primeiro nome já vem personagem; deixe assim. No segundo, escolha ${nome}.`
      : `Em Quando acontecer, deixe à vista um espaço vazio ${onde}, fora do fazer dos outros. Abra Jogo 2D → Colisões → Encostar e bloquear e pegue Quando o sprite começar a encostar no sprite. Clique em jogador e escolha personagem; clique em inimigo e escolha ${nome}.`
  const animacao = (clipe: string, objeto: string) =>
    `encaixe Tocar a animação, de Jogo 3D → Objetos → Animação do modelo. Clique em heroi e escolha ${objeto}. Clique em Andar e escolha ${clipe}. Clique em repetindo e escolha uma vez.`
  const imagem = (sprite: string, arte: string) =>
    `encaixe Trocar imagem do sprite, de Jogo 2D → Sprites → Criar e trocar aparência. Clique no primeiro heroi e escolha ${sprite}; no segundo, escolha ${arte}.`
  const acender = (simbolo: string) =>
    three ? animacao('acender', simbolo) : imagem(simbolo, `pedra-${simbolo}-acesa`)
  const apagar = (simbolo: string) =>
    three ? animacao('apagar', simbolo) : imagem(simbolo, `pedra-${simbolo}`)
  const se = (n: number) =>
    `Dentro do fazer, encaixe Se, de Programação → Lógica e Se. Na comparação x > 0, clique no x e escolha passo, troque o sinal de maior pelo sinal de igual e troque o 0 por ${n}. Na linha de baixo do Se, clique no segundo sinal de mais, antes da palavra senão, para abrir o senão.`
  const recomeco = [
    'Dentro do senão, encaixe Alterar variável, escolha passo e troque o 1 por 0.',
    `Logo abaixo, ainda no senão, ${apagar('sol')}`,
    `Embaixo, ${apagar('lua')}`,
    'Por último, ainda no senão, encaixe Alterar variável, escolha aviso, solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva Fora da ordem. Comece de novo pelo sol.',
  ]
  return [
    {
      key: 'sol',
      title: 'O sol começa',
      idea: 'A variável passo guarda até onde a sequência chegou. Toda partida começa com 0; o encontro com o sol muda para 1 e acende o sol.',
      steps: [
        three
          ? 'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o bloco Colocar o objeto bau.'
          : 'Encontre a área Ao iniciar. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer. Deixe à vista o fim dela, depois do último bloco.',
        three
          ? 'Abra Programação → Variáveis. Pegue Criar variável e encaixe logo abaixo de Colocar o objeto bau. Clique em contador, apague e escreva passo. Deixe o valor 0.'
          : 'Abra Programação → Variáveis. Pegue Criar variável e encaixe no fim de Ao iniciar. Clique em contador, apague e escreva passo. Deixe o valor 0.',
        encontro('sol', 'depois do último evento'),
        'Dentro do fazer, encaixe Alterar variável, de Programação → Variáveis. Escolha passo e deixe o valor 1.',
        `Logo abaixo, ${acender('sol')}`,
        'Ainda no fazer, encaixe outro Alterar variável e escolha aviso. Solte um texto, de Programação → Valores, em cima do 1, apague Olá e escreva O sol acendeu! Agora a lua.',
      ],
      test: 'Leve o personagem até o sol. O sol acende e o aviso muda. Toque na tecla R: o sol volta apagado.',
      correction:
        'Se nada acontecer, confira se o encontro usa personagem e sol. Não crie passo dentro do encontro: ela nasce em Ao iniciar, com 0, e o encontro só muda para 1.',
    },
    {
      key: 'lua',
      title: 'A lua pergunta a vez',
      idea: 'A lua só acende se o sol veio antes, ou seja, se passo é 1. Por isso, ela pergunta com um Se: passo = 1? Se for, passo vira 2; senão, a tentativa recomeça.',
      steps: [
        encontro('lua', 'depois do encontro com o sol'),
        se(1),
        'Dentro do então, encaixe Alterar variável, escolha passo e troque o 1 por 2.',
        `Logo abaixo, ainda no então, ${acender('lua')}`,
        'Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva A lua acendeu! Agora a estrela.',
        ...recomeco,
      ],
      test: 'Toque o sol e depois a lua: as duas acendem. Toque na tecla R e toque a lua primeiro: nada acende e o aviso pede para começar pelo sol.',
      correction:
        'Se a lua acender sem o sol, confira a comparação: passo, o sinal de igual e o 1.',
    },
    {
      key: 'estrela',
      title: 'A estrela abre o baú',
      idea: 'A estrela pergunta passo = 2. Se for a vez dela, ela acende e o baú abre; senão, a tentativa recomeça, como na lua.',
      steps: [
        encontro('estrela', 'depois do encontro com a lua'),
        se(2),
        `Dentro do então, ${acender('estrela')}`,
        three
          ? `Logo abaixo, ainda no então, ${animacao('abrir', 'bau')}`
          : `Logo abaixo, ainda no então, ${imagem('bau', 'bau-aberto')}`,
        'Embaixo, ainda no então, encaixe Alterar variável, escolha aviso, solte um texto em cima do 1 e escreva Na ordem certa! O baú abriu.',
        `Dentro do senão, monte o mesmo recomeço da lua: Alterar passo para 0, ${three ? 'Tocar a animação apagar no sol e na lua' : 'as trocas de volta do sol (pedra-sol) e da lua (pedra-lua)'} e o aviso Fora da ordem. Comece de novo pelo sol.`,
        'Teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte, responda às perguntas e, no fim, clique em Concluir aula.',
      ],
      test: 'Toque o sol, a lua e a estrela: o baú abre. Toque na tecla R, toque o sol e a estrela: tudo apaga e o baú fica fechado. Sem começar outra partida, toque o sol, a lua e a estrela: o baú abre.',
      correction:
        'Se o baú abrir só com a estrela, confira se a pergunta do Se é passo igual a 2. Se ele nunca abrir, confira se a abertura do baú está dentro do então e não no senão.',
    },
  ]
}
