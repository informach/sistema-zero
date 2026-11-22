import type { Platform } from './platform'
import type { MemberCourseProgressView } from './types'

export interface MemberLearner {
  id: string
  label: string
  audience: Platform
  kind: 'adult' | 'child' | 'parents'
}

export function memberHistoryQuery(learner: MemberLearner): string {
  return `?${new URLSearchParams({ audience: learner.audience, learner: learner.kind === 'parents' ? 'parents' : 'child' })}`
}

export function memberActivityScope(learner: MemberLearner): string | null {
  return learner.kind === 'child'
    ? null
    : 'Histórico geral da conta: inclui os cursos para pais e os cursos da comunidade adulta. O progresso de cada público aparece separado na Visão geral.'
}

/** A mesma conta é aluno adulto ou responsável, conforme a comunidade escolhida. */
export function memberLearners(
  accountId: string,
  platform: Platform,
  profiles: readonly { id: string; name: string }[],
): MemberLearner[] {
  return [
    {
      id: accountId,
      label: platform === 'kids' ? 'Pais · responsável' : 'Adulto · conta',
      audience: platform,
      kind: platform === 'kids' ? 'parents' : 'adult',
    },
    ...profiles.map((profile) => ({
      id: profile.id,
      label: `Criança · ${profile.name}`,
      audience: 'kids' as const,
      kind: 'child' as const,
    })),
  ]
}

export function coursesForLearner(
  progress: readonly MemberCourseProgressView[],
  learner: MemberLearner,
): MemberCourseProgressView[] {
  return progress.filter(
    (course) =>
      course.audience === null ||
      course.audience === undefined ||
      (learner.kind === 'parents'
        ? course.audience === 'kids' && course.learner === 'parents'
        : learner.kind === 'adult'
          ? course.audience === 'adult'
          : course.audience === 'kids' && course.learner !== 'parents'),
  )
}
