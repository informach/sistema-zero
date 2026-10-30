export const PESCA = { esperar: 3, janela: 5, alcance: 1.4 } as const
export interface EstadoDaPesca {
  fase: 'parada' | 'esperando' | 'pronta' | 'passou'
  tempo: number
}

export function criarPesca(): EstadoDaPesca {
  return { fase: 'parada', tempo: 0 }
}

export function cancelarPesca(p: EstadoDaPesca): void {
  p.fase = 'parada'
  p.tempo = 0
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
    p.tempo < PESCA.esperar
      ? 'esperando'
      : p.tempo < PESCA.esperar + PESCA.janela
        ? 'pronta'
        : 'passou'
}

/** Interagir antes da hora só orienta. Recolher encerra a tentativa uma vez. */
export function agirNaPesca(p: EstadoDaPesca): 'lancou' | 'aguardar' | 'recolheu' {
  if (p.fase === 'esperando') return 'aguardar'
  if (p.fase === 'pronta') {
    cancelarPesca(p)
    return 'recolheu'
  }
  p.fase = 'esperando'
  p.tempo = 0
  return 'lancou'
}

export function rotuloDaPesca(p: EstadoDaPesca): string {
  switch (p.fase) {
    case 'parada':
      return 'Lançar a linha'
    case 'esperando':
      return 'Esperar o peixe'
    case 'pronta':
      return 'Recolher a linha'
    case 'passou':
      return 'Tentar a pesca de novo'
  }
}
