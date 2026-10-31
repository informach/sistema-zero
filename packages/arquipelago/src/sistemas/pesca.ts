import type { Isca } from './iscas'

export const PESCA = { esperar: 3, janela: 5, alcance: 1.4 } as const

/** Quanto esperar o peixe e quanto tempo dá para recolher (a isca muda os dois; `iscas.ts`). */
export interface RegraDaPesca {
  esperar: number
  janela: number
}

export interface EstadoDaPesca {
  fase: 'parada' | 'esperando' | 'pronta' | 'passou'
  tempo: number
  /** A regra do lançamento em curso: trocar a isca no meio não muda a linha que já está na água. */
  regra: RegraDaPesca
  /** A isca que foi no anzol neste lançamento (gasta só se o peixe vier). */
  isca: Isca | null
}

export function criarPesca(): EstadoDaPesca {
  return {
    fase: 'parada',
    tempo: 0,
    regra: { esperar: PESCA.esperar, janela: PESCA.janela },
    isca: null,
  }
}

export function cancelarPesca(p: EstadoDaPesca): void {
  p.fase = 'parada'
  p.tempo = 0
  p.isca = null
}

/** Estado recebido é a única mutação; o passo não aloca nem altera o salvamento. */
export function passoDaPesca(p: EstadoDaPesca, dt: number, pausado: boolean, perto: boolean): void {
  if (pausado) return
  if (!perto) {
    cancelarPesca(p)
    return
  }
  if (p.fase === 'parada' || p.fase === 'passou' || !Number.isFinite(dt) || dt <= 0) return
  // Retomar uma aba não deve consumir a janela pelo intervalo em segundo plano.
  p.tempo += Math.min(dt, 0.1)
  p.fase =
    p.tempo < p.regra.esperar
      ? 'esperando'
      : p.tempo < p.regra.esperar + p.regra.janela
        ? 'pronta'
        : 'passou'
}

/**
 * Interagir antes da hora só orienta. Recolher encerra a tentativa uma vez e devolve a isca que
 * estava no anzol (para quem chama gastar). Lançar guarda a regra e a isca deste lançamento.
 */
export function agirNaPesca(
  p: EstadoDaPesca,
  lancamento: { regra: RegraDaPesca; isca: Isca | null } = {
    regra: { esperar: PESCA.esperar, janela: PESCA.janela },
    isca: null,
  },
): { acao: 'lancou' | 'aguardar' } | { acao: 'recolheu'; isca: Isca | null } {
  if (p.fase === 'esperando') return { acao: 'aguardar' }
  if (p.fase === 'pronta') {
    const isca = p.isca
    cancelarPesca(p)
    return { acao: 'recolheu', isca }
  }
  p.fase = 'esperando'
  p.tempo = 0
  p.regra.esperar = lancamento.regra.esperar
  p.regra.janela = lancamento.regra.janela
  p.isca = lancamento.isca
  return { acao: 'lancou' }
}

export function rotuloDaPesca(p: EstadoDaPesca, nomeDaIsca: string | null = null): string {
  switch (p.fase) {
    case 'parada':
      return nomeDaIsca ? `Lançar a linha com ${nomeDaIsca}` : 'Lançar a linha'
    case 'esperando':
      return 'Esperar o peixe'
    case 'pronta':
      return 'Recolher a linha'
    case 'passou':
      return nomeDaIsca ? `Tentar de novo com ${nomeDaIsca}` : 'Tentar a pesca de novo'
  }
}
