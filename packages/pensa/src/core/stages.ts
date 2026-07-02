/**
 * Máquina PURA das etapas da metodologia ZERO: ordem, avanço, conclusão e
 * rótulos. Nada de rede/estado aqui — só funções determinísticas (testáveis).
 */
import { getCopy, type PensaCopyMode, type PensaPlanStage } from './copy'
import type { PensaCycleView, PensaStage } from './types'

/** Ordem canônica das etapas de trabalho (o 'done' é estado terminal). */
export const STAGE_ORDER: readonly PensaPlanStage[] = ['z', 'e', 'r', 'o'] as const

/** Etapa seguinte no fluxo z → e → r → o → done. */
export function nextStage(stage: PensaPlanStage): PensaStage {
  switch (stage) {
    case 'z':
      return 'e'
    case 'e':
      return 'r'
    case 'r':
      return 'o'
    case 'o':
      return 'done'
  }
}

/** Posição da etapa no fluxo (z=0, e=1, r=2, o=3, done=4). */
export function stageIndex(stage: PensaStage): number {
  if (stage === 'done') return STAGE_ORDER.length
  return STAGE_ORDER.indexOf(stage)
}

const COMPLETED_AT_KEY = {
  z: 'zCompletedAt',
  e: 'eCompletedAt',
  r: 'rCompletedAt',
  o: 'oCompletedAt',
} as const satisfies Record<PensaPlanStage, keyof PensaCycleView>

/** Etapa concluída = o carimbo `<stage>CompletedAt` do ciclo está preenchido. */
export function isStageDone(cycle: PensaCycleView, stage: PensaPlanStage): boolean {
  return cycle[COMPLETED_AT_KEY[stage]] != null
}

/** Nome da etapa conforme o mode (kids: "Zerar a Bagunça"...). */
export function stageLabel(mode: PensaCopyMode, stage: PensaPlanStage): string {
  return getCopy(mode).stages[stage].name
}

export type { PensaPlanStage }
