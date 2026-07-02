import type { PensaArtifactStatus, PensaArtifactType, PensaStage, PensaWorkStage } from './pensa'

/** Próxima etapa de cada etapa de trabalho (máquina linear z→e→r→o→done). */
export const PENSA_NEXT_STAGE: Record<PensaWorkStage, PensaStage> = {
  z: 'e',
  e: 'r',
  r: 'o',
  o: 'done',
}

export interface AdvanceGateInput {
  /** Artefatos LATEST por type do ciclo (só type/status importam ao gate). */
  latestArtifacts: ReadonlyArray<{ type: PensaArtifactType; status: PensaArtifactStatus }>
  /** Total de tasks do ciclo (gate r→o exige ≥1). */
  taskCount: number
  /** Itens do checklist (gate o→done exige todo `required` com `done`). */
  checklist: ReadonlyArray<{ required: boolean; done: boolean }>
}

export interface AdvanceGateResult {
  ok: boolean
  /** O que falta (vai em `details.missing` do 409 PENSA_GATE_NOT_READY). */
  missing: string[]
}

/**
 * GATES do advance (server-side, regra do contrato):
 * - z→e: latest `idea` validated (senão missing ['idea'])
 * - e→r: latest `friendly_spec` E latest `identity` validated
 * - r→o: ≥1 task no ciclo (senão missing ['tasks'])
 * - o→done: todo item `required` do checklist `done` (senão missing ['checklist'])
 * Puro — o use case `advance-stage` resolve os insumos e aplica o resultado.
 */
export function evaluateAdvanceGate(
  stage: PensaWorkStage,
  input: AdvanceGateInput,
): AdvanceGateResult {
  const validated = (type: PensaArtifactType): boolean =>
    input.latestArtifacts.some((a) => a.type === type && a.status === 'validated')

  const missing: string[] = []
  switch (stage) {
    case 'z':
      if (!validated('idea')) missing.push('idea')
      break
    case 'e':
      if (!validated('friendly_spec')) missing.push('friendly_spec')
      if (!validated('identity')) missing.push('identity')
      break
    case 'r':
      if (input.taskCount < 1) missing.push('tasks')
      break
    case 'o':
      if (input.checklist.some((i) => i.required && !i.done)) missing.push('checklist')
      break
  }
  return { ok: missing.length === 0, missing }
}
