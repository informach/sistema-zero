/**
 * A abertura "O Cinza" (regras puras, sem React): o livro ilustrado que conta a história antes do
 * primeiro passo. O texto segue a história da proposta (a Íris, o Cinza, o barquinho, a carta, a
 * casa e o Zappy) e para antes do segredo do Farol, que fica para a última página do diário.
 *
 * Quem conta é o Zappy, que só se apresenta na última cena. Não há voz gravada: a legenda é a
 * narração e fica sempre ligada.
 */

/** O valor de `painelAberto` da abertura (o mundo para por baixo, como em todo painel). */
export const PAINEL_DA_ABERTURA = 'abertura'

/** Segurar Espaço (ou o botão) por este tempo pula a abertura inteira. */
export const SEGURAR_PARA_PULAR_MS = 1000

/** A tela clareia para o jogo no fim (a câmera "entra" pela janela acesa). */
export const SAIDA_DA_ABERTURA_MS = 1200

export type IdDaCena =
  | 'arquipelago'
  | 'iris'
  | 'sumiu'
  | 'cinza'
  | 'tempestade'
  | 'carta'
  | 'casa'
  | 'zappy'

export interface Fala {
  texto: string
  /** Quem fala, quando não é a voz que conta (só o Zappy, quando se apresenta). */
  quem?: 'Zappy'
}

export interface Cena {
  id: IdDaCena
  duracaoMs: number
  /** As falas da cena, em ordem; cada uma fica na tela até `ateMs` (a última, até o fim). */
  falas: readonly (Fala & { ateMs?: number })[]
  /** Para o leitor de tela: o que a pintura mostra. */
  descricao: string
}

export const CENAS: readonly Cena[] = [
  {
    id: 'arquipelago',
    duracaoMs: 8000,
    falas: [
      {
        texto: 'No Arquipélago, tudo existia porque alguém tinha criado. O pão, a música, a ponte.',
      },
    ],
    descricao: 'O arquipélago visto do alto, colorido, com o Farol aceso na ilha do meio.',
  },
  {
    id: 'iris',
    duracaoMs: 9000,
    falas: [
      {
        texto:
          'A Íris, a faroleira, era quem mais criava. O Farol juntava a luz de tudo e espalhava cor pelas ilhas.',
      },
    ],
    descricao: 'A Íris desenha na sala do Farol, cercada de desenhos coloridos presos na parede.',
  },
  {
    id: 'sumiu',
    duracaoMs: 10000,
    falas: [
      { texto: 'Um dia, a Íris sumiu. E os moradores foram parando, com medo de fazer feio.' },
    ],
    descricao: 'A sala do Farol vazia, com os desenhos desbotados caindo da parede.',
  },
  {
    id: 'cinza',
    duracaoMs: 9000,
    falas: [
      {
        texto: 'Onde ninguém cria, chega o Cinza. Uma névoa que desbota tudo o que fica esquecido.',
      },
    ],
    descricao: 'A névoa cinza avança sobre o arquipélago e desbota as ilhas por onde passa.',
  },
  {
    id: 'tempestade',
    duracaoMs: 8000,
    falas: [{ texto: 'Depois de uma tempestade, um barquinho chegou à ilha do meio.' }],
    descricao: 'Noite de tempestade: um raio clareia um barquinho no mar agitado.',
  },
  {
    id: 'carta',
    duracaoMs: 9000,
    falas: [{ texto: 'Na mão, uma chave e uma carta.' }],
    descricao: 'Uma chave dourada e uma carta escrita à mão: A casa é sua. Acenda as cores.',
  },
  {
    id: 'casa',
    duracaoMs: 8000,
    falas: [
      { texto: 'A casinha ao pé do Farol apagado era da Íris. Só um quarto ainda tinha cor.' },
    ],
    descricao: 'A casinha cinza ao pé do Farol apagado, com uma única janela acesa e colorida.',
  },
  {
    id: 'zappy',
    duracaoMs: 12000,
    falas: [
      { texto: 'E nele, uma luz piscava.', ateMs: 3500 },
      {
        quem: 'Zappy',
        texto:
          'Sou eu, o Zappy, a última luz do arquipélago. Vamos acender as cores juntos, ilha por ilha.',
      },
    ],
    descricao: 'O único quarto colorido da casa, com um vagalume brilhando no meio: é o Zappy.',
  },
]

/** O que a carta diz (escrita à mão na cena da carta). */
export const LINHAS_DA_CARTA = ['A casa é sua.', 'Acenda as cores.'] as const

export const DURACAO_DA_ABERTURA_MS = CENAS.reduce((t, c) => t + c.duracaoMs, 0)

/** Onde a abertura está num instante: a cena, o tempo dentro dela e a fala da vez. */
export function momentoDaAbertura(ms: number): {
  indice: number
  dentroMs: number
  fala: Fala
  acabou: boolean
} {
  let resto = Math.max(0, ms)
  for (let i = 0; i < CENAS.length; i++) {
    const cena = CENAS[i]!
    if (resto < cena.duracaoMs)
      return { indice: i, dentroMs: resto, fala: falaNoTempo(cena, resto), acabou: false }
    resto -= cena.duracaoMs
  }
  const ultima = CENAS[CENAS.length - 1]!
  return {
    indice: CENAS.length - 1,
    dentroMs: ultima.duracaoMs,
    fala: falaNoTempo(ultima, ultima.duracaoMs),
    acabou: true,
  }
}

function falaNoTempo(cena: Cena, dentroMs: number): Fala {
  for (const f of cena.falas) if (f.ateMs === undefined || dentroMs < f.ateMs) return f
  return cena.falas[cena.falas.length - 1]!
}

/** Onde começa a cena `indice` (para pular para a próxima com um toque). */
export function inicioDaCena(indice: number): number {
  let t = 0
  for (let i = 0; i < Math.min(indice, CENAS.length); i++) t += CENAS[i]!.duracaoMs
  return t
}

/** Cada fala é uma leitura, mesmo quando divide a pintura com outra fala. */
export const LEITURAS_DA_ABERTURA = CENAS.flatMap((cena, indice) =>
  cena.falas.map((_, fala) => ({
    indice,
    fala,
    inicioMs: inicioDaCena(indice) + (fala > 0 ? (cena.falas[fala - 1]?.ateMs ?? 0) : 0),
  })),
)

/** Voltar nunca sai do livro. Só avançar depois da última fala devolve `null` (começar o jogo). */
export function navegarLeitura(ms: number, direcao: -1 | 1): number | null {
  let atual = 0
  for (let i = 0; i < LEITURAS_DA_ABERTURA.length; i++) {
    if (LEITURAS_DA_ABERTURA[i]!.inicioMs <= Math.max(0, ms)) atual = i
  }
  const destino = Math.max(0, atual + direcao)
  return LEITURAS_DA_ABERTURA[destino]?.inicioMs ?? null
}

/**
 * A abertura aparece sozinha uma vez por perfil em cada aparelho (a marca fica no aparelho, como
 * as preferências de conforto: o salvamento não muda). Sem armazenamento (aba anônima,
 * bloqueado), só aparece num jogo novo. Na visita e no acesso de suporte, nunca.
 */
export function chaveDaAbertura(publico: string, perfil: string): string {
  return `arquipelago:abertura:${publico}:${perfil}`
}

export function deveMostrarAbertura(s: {
  /** O que o aparelho guarda: `true` já viu, `false` não viu, `null` sem armazenamento. */
  vista: boolean | null
  jogoNovo: boolean
  somenteLeitura: boolean
}): boolean {
  if (s.somenteLeitura) return false
  return s.vista === null ? s.jogoNovo : !s.vista
}

/** A primeira fala do Zappy, quando a porta nova ainda está fechada (depois da abertura). */
export function boasVindas(primeiroNome: string): string {
  return `Oi, ${primeiroNome}. Só o seu quarto ainda tem cor. Vamos abrir a porta nova e acender o resto?`
}
