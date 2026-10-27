/**
 * Conta o tempo livre jogado (só com a aba à vista e o jogo sem pausa) e avisa o serviço a cada
 * minuto. Quem decide se acabou é o serviço (ele soma o dia inteiro, em qualquer aparelho).
 */
export interface ContadorDeTempo {
  acumulado: number
}

export const AVISAR_A_CADA_SEGUNDOS = 60

export function contar(
  c: ContadorDeTempo,
  segundos: number,
): { contador: ContadorDeTempo; enviar: number } {
  const total = c.acumulado + Math.max(0, Math.min(segundos, 5))
  if (total >= AVISAR_A_CADA_SEGUNDOS) {
    const enviar = Math.floor(total)
    return { contador: { acumulado: total - enviar }, enviar: Math.min(enviar, 120) }
  }
  return { contador: { acumulado: total }, enviar: 0 }
}

export function minutosRestantes(
  limiteMinutos: number | null,
  usadoSegundos: number,
): number | null {
  if (limiteMinutos === null) return null
  return Math.max(0, Math.ceil((limiteMinutos * 60 - usadoSegundos) / 60))
}
