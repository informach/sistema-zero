import type { Capability, Run } from './contracts'

export type PolicyDecision = 'allow' | 'approve' | 'deny'
export function authorize(
  run: Pick<Run, 'mode' | 'allowedTools'>,
  capability: Capability,
): PolicyDecision {
  if (run.allowedTools && !run.allowedTools.includes(capability.name)) return 'deny'
  if (capability.effect === 'read') return 'allow'
  if (run.mode === 'plan') return 'deny'
  if (capability.effect === 'workspace') return 'allow'
  return 'approve'
}
