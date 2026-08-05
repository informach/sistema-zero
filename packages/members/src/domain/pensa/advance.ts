import type { PensaArtifactStatus, PensaArtifactType, PensaStage, PensaWorkStage } from './pensa'

export const PENSA_NEXT_STAGE: Record<PensaWorkStage, PensaStage> = {
  z: 'e',
  e: 'r',
  r: 'o',
  o: 'done',
}

export interface AdvanceGateInput {
  latestArtifacts: ReadonlyArray<{
    type: PensaArtifactType
    status: PensaArtifactStatus
    content?: unknown
  }>
  taskCount: number
  taskPlanValid: boolean
}

export interface AdvanceGateResult {
  ok: boolean
  missing: string[]
}

/** Gates server-side da metodologia ZERO orientada exclusivamente a plano. */
export function evaluateAdvanceGate(
  stage: PensaWorkStage,
  input: AdvanceGateInput,
): AdvanceGateResult {
  const artifact = (type: PensaArtifactType) => input.latestArtifacts.find((a) => a.type === type)
  const validated = (type: PensaArtifactType): boolean => artifact(type)?.status === 'validated'
  const missing: string[] = []

  if (stage === 'z' && !validated('idea')) missing.push('idea')
  if (stage === 'e') {
    if (!validated('game_design')) missing.push('game_design')
    if (!validated('visual_direction')) missing.push('visual_direction')
  }
  if (stage === 'r') {
    if (!validated('task_plan')) missing.push('task_plan')
    if (input.taskCount < 1 || !input.taskPlanValid) missing.push('tasks')
  }
  if (stage === 'o') {
    const review = artifact('plan_review')
    const content = review?.content as { approved?: unknown } | undefined
    if (review?.status !== 'validated' || content?.approved !== true) missing.push('plan_review')
  }

  return { ok: missing.length === 0, missing }
}
