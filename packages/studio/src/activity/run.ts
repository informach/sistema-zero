import type { Project } from '#core'
import type { ActivityRunResult, LessonActivity, StructureCheck } from '../studio/activity'
import { gradeActivity } from './grade'
import type { SandboxCheck } from './harness'
import { runSandboxChecks, type SandboxSecurity } from './sandbox'
import { evaluateStructureChecks } from './structure'

export type { SandboxSecurity } from './sandbox'

/**
 * Roda a atividade inteira no CLIENTE: `structure` é avaliado SÍNCRONO sobre o IR
 * (parent), os demais rodam no sandbox oculto. Junta tudo e gradua (média
 * ponderada). É a fonte do feedback instantâneo e do resultado reportado no envio.
 */
export async function runActivity(
  project: Project,
  activity: LessonActivity,
  security: SandboxSecurity = {},
): Promise<ActivityRunResult> {
  const structureChecks = activity.checks.filter((c): c is StructureCheck => c.kind === 'structure')
  const sandboxChecks = activity.checks.filter((c): c is SandboxCheck => c.kind !== 'structure')

  const structureResults = evaluateStructureChecks(project.ir, project.blocksState, structureChecks)
  const sandboxResults = await runSandboxChecks(project, sandboxChecks, security)

  return gradeActivity(activity, [...structureResults, ...sandboxResults])
}
