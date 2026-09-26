/**
 * Os traços e rótulos da régua do palco, em UNIDADES DO DOCUMENTO (px do sprite ou do
 * cenário). Quem converte para px de tela é o componente (`pos × zoom`).
 *
 * Os passos são potências de 2, e não 1/2/5/10: os documentos medem 16/32/64/256/2048 e a
 * grade encaixa em 4/8/16, então um sprite de 32 rotulado 0-8-16-24-32 lê melhor (e casa com a
 * grade) do que 0-5-10-15-20.
 */
export const RULER_STEPS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024] as const

export interface RulerTick {
  /** Posição em unidades do documento. */
  pos: number
  /** Traço grande, com rótulo. */
  major: boolean
  label?: string
}

/** Espaço mínimo, em px de tela, entre dois rótulos (senão eles se atropelam). */
export const RULER_MIN_LABEL_PX = 40
/** Espaço mínimo, em px de tela, entre dois traços pequenos. */
export const RULER_MIN_MINOR_PX = 6

/** O menor passo (em unidades) cujos rótulos ficam a pelo menos `minLabelPx` de tela. */
export function rulerStep(zoom: number, minLabelPx = RULER_MIN_LABEL_PX): number {
  for (const step of RULER_STEPS) {
    if (step * zoom >= minLabelPx) return step
  }
  return RULER_STEPS[RULER_STEPS.length - 1] ?? 1024
}

/** Um quarto ou a metade do passo, se ainda couberem na tela; senão nenhum traço pequeno. */
export function rulerMinorStep(
  step: number,
  zoom: number,
  minMinorPx = RULER_MIN_MINOR_PX,
): number | null {
  if ((step / 4) * zoom >= minMinorPx) return step / 4
  if ((step / 2) * zoom >= minMinorPx) return step / 2
  return null
}

/**
 * Todos os traços de 0 a `length` (inclusive quando `length` cai num traço), do maior passo
 * que cabe. Zoom fracionário (o "Ajustar") funciona igual: só muda qual passo cabe.
 */
export function rulerTicks(
  length: number,
  zoom: number,
  options?: { minLabelPx?: number; minMinorPx?: number },
): RulerTick[] {
  if (!(length > 0) || !(zoom > 0) || !Number.isFinite(length) || !Number.isFinite(zoom)) {
    return []
  }
  const step = rulerStep(zoom, options?.minLabelPx)
  const minor = rulerMinorStep(step, zoom, options?.minMinorPx)
  const unit = minor ?? step
  const ticks: RulerTick[] = []
  for (let index = 0; index * unit <= length; index += 1) {
    const pos = index * unit
    const major = pos % step === 0
    ticks.push(major ? { pos, major, label: String(pos) } : { pos, major })
  }
  return ticks
}
