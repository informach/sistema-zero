export function minutosRestantes(
  limiteMinutos: number | null,
  usadoSegundos: number,
): number | null {
  if (limiteMinutos === null) return null
  return Math.max(0, Math.ceil((limiteMinutos * 60 - usadoSegundos) / 60))
}
