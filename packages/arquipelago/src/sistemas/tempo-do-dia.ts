/**
 * O relógio do arquipélago. Um dia do jogo dura 16 minutos de verdade: 12 de dia (6h às 18h) e
 * 4 de noite (18h às 6h). Sai do relógio real, então não precisa ser salvo e é o mesmo em
 * qualquer aparelho.
 */
export const DURACAO_DO_DIA_MS = 16 * 60 * 1000
export const PARTE_CLARA = 0.75

export interface MomentoDoDia {
  /** Dia do jogo contado desde que a pessoa começou (1 = primeiro dia). */
  dia: number
  /** 0 a 1 dentro do dia (0 = 6h). */
  fracao: number
  noite: boolean
  hora: number
  minuto: number
  /** Quanto de sol há: 0 (noite) a 1 (meio-dia), com nascer e pôr suaves. */
  luz: number
}

export function momentoDoDia(agoraMs: number, comecoMs: number): MomentoDoDia {
  const decorrido = Math.max(0, agoraMs - comecoMs)
  const dia = Math.floor(decorrido / DURACAO_DO_DIA_MS) + 1
  const fracao = (decorrido % DURACAO_DO_DIA_MS) / DURACAO_DO_DIA_MS
  const noite = fracao >= PARTE_CLARA
  // 6h → 18h na parte clara; 18h → 6h na escura.
  const horasDecimais = noite
    ? 18 + ((fracao - PARTE_CLARA) / (1 - PARTE_CLARA)) * 12
    : 6 + (fracao / PARTE_CLARA) * 12
  const horaCheia = Math.floor(horasDecimais) % 24
  const minuto = Math.floor((horasDecimais % 1) * 60)
  return { dia, fracao, noite, hora: horaCheia, minuto, luz: luzDoSol(fracao) }
}

function luzDoSol(fracao: number): number {
  if (fracao >= PARTE_CLARA) {
    // Noite: escurece no começo e clareia no fim (aurora).
    const n = (fracao - PARTE_CLARA) / (1 - PARTE_CLARA)
    if (n < 0.15) return 0.25 * (1 - n / 0.15)
    if (n > 0.85) return 0.25 * ((n - 0.85) / 0.15)
    return 0
  }
  const d = fracao / PARTE_CLARA
  // Seno: 0.25 no nascer e no pôr, 1 ao meio-dia.
  return 0.25 + 0.75 * Math.sin(d * Math.PI)
}

export function relogio(m: MomentoDoDia): string {
  return `${String(m.hora).padStart(2, '0')}:${String(m.minuto).padStart(2, '0')}`
}
