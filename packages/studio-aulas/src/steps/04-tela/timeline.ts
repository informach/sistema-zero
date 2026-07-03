// Contrato ENTRE a gravação da tela (driver Playwright, escreve) e a montagem
// (Remotion, lê). Tempos em milissegundos RELATIVOS ao início do vídeo da tela.

/** Um balão capturado: texto + retângulo do bloco/campo âncora (px de tela) + janela de exibição. */
export interface TelaBalao {
  cenaId: string
  texto: string
  x: number
  y: number
  w: number
  h: number
  /** Escala do workspace no momento (o balão sai proporcional ao zoom do bloco). */
  escala: number
  apareceMs: number
  escondeMs: number
}

/** Faixa de uma cena de prática dentro do vídeo contínuo da tela. */
export interface TelaCenaRange {
  id: string
  inicioMs: number
  fimMs: number
}

export interface TelaTimeline {
  slug: string
  geradoEm: string
  /** Nome do arquivo de vídeo (dentro de out/tela/). */
  video: string
  largura: number
  altura: number
  cenas: TelaCenaRange[]
  baloes: TelaBalao[]
}
