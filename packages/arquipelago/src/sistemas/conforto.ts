/**
 * As preferências de conforto da câmera (controlador universal, parte 3). Requisito, não melhoria:
 * nem toda criança (nem todo adulto) fica bem com a mesma rapidez ou o mesmo movimento de câmera.
 * As mesmas para o Kids e o Adultos; guardadas no aparelho. A assistência nunca disputa o controle
 * com a pessoa: a câmera voltar sozinha para as costas nasce desligada.
 */

export const RAPIDEZES = ['devagar', 'normal', 'rapida'] as const
export const DISTANCIAS = ['perto', 'normal', 'longe'] as const

export interface Conforto {
  /** Quão rápido a câmera gira ao arrastar ou com o analógico. */
  rapidez: (typeof RAPIDEZES)[number]
  /** A distância de partida da câmera (a roda e a pinça continuam valendo). */
  distancia: (typeof DISTANCIAS)[number]
  /** Para cima e para baixo invertidos (arrastar para cima abaixa o ângulo). */
  inverterVertical: boolean
  /** A câmera volta sozinha para as costas quando a pessoa anda sem mexer nela. */
  voltaSozinha: boolean
  /** Menos movimento de câmera (além do pedido do aparelho). */
  menosMovimento: boolean
}

export const CONFORTO_PADRAO: Conforto = {
  rapidez: 'normal',
  distancia: 'normal',
  inverterVertical: false,
  voltaSozinha: false,
  menosMovimento: false,
}

/** Multiplica o giro por pixel e pelo analógico. */
export const MULTIPLICADOR_DA_RAPIDEZ: Readonly<Record<Conforto['rapidez'], number>> = {
  devagar: 0.6,
  normal: 1,
  rapida: 1.5,
}

/** Metros da câmera até o avatar em cada escolha (dentro de 4 a 18, os limites do zoom). */
export const METROS_DA_DISTANCIA: Readonly<Record<Conforto['distancia'], number>> = {
  perto: 6,
  normal: 9,
  longe: 13,
}

export const VOLTA_SOZINHA = {
  /** Segundos andando sem mexer na câmera até ela começar a voltar. */
  espera: 2.5,
  /** Quão rápido ela volta (por segundo, suave). */
  rapidez: 1.2,
  /** Só anda quem passa disto (m/s): parada, a câmera fica onde a pessoa deixou. */
  andando: 0.5,
} as const

/** Lê o que estava guardado; o que faltar ou estiver estranho volta ao padrão. */
export function lerConforto(texto: string | null): Conforto {
  let lido: Partial<Record<keyof Conforto, unknown>> = {}
  try {
    const dado = texto ? (JSON.parse(texto) as unknown) : null
    if (dado && typeof dado === 'object') lido = dado as typeof lido
  } catch {
    // Guardado quebrado: vale o padrão.
  }
  const umDe = <T extends string>(lista: readonly T[], v: unknown, padrao: T): T =>
    lista.includes(v as T) ? (v as T) : padrao
  const sim = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao)
  return {
    rapidez: umDe(RAPIDEZES, lido.rapidez, CONFORTO_PADRAO.rapidez),
    distancia: umDe(DISTANCIAS, lido.distancia, CONFORTO_PADRAO.distancia),
    inverterVertical: sim(lido.inverterVertical, CONFORTO_PADRAO.inverterVertical),
    voltaSozinha: sim(lido.voltaSozinha, CONFORTO_PADRAO.voltaSozinha),
    menosMovimento: sim(lido.menosMovimento, CONFORTO_PADRAO.menosMovimento),
  }
}

/**
 * Um quadro da volta sozinha: o giro novo da câmera. Só volta com a preferência ligada, com a
 * pessoa andando e sem mexer na câmera há `espera` segundos; vai suave para as costas (`direcao`
 * mais meia volta), pelo lado mais curto.
 */
export function giroComVoltaSozinha(
  giro: number,
  direcao: number,
  conforto: Conforto,
  velocidade: number,
  semMexer: number,
  dt: number,
): number {
  if (!conforto.voltaSozinha || velocidade < VOLTA_SOZINHA.andando) return giro
  if (semMexer < VOLTA_SOZINHA.espera) return giro
  const alvo = direcao + Math.PI
  const falta = Math.atan2(Math.sin(alvo - giro), Math.cos(alvo - giro))
  return giro + falta * (1 - Math.exp(-dt * VOLTA_SOZINHA.rapidez))
}
