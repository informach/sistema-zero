import type { Platform } from './platform'

export interface LearnerSelection {
  platform: Platform
  learnerId: string | null
}

export function resolveLearnerId(input: {
  accountId: string
  profileIds: string[]
  platform: Platform
  selection: LearnerSelection
}): string {
  const { accountId, profileIds, platform, selection } = input
  const selected = selection.platform === platform ? selection.learnerId : null
  if (selected === accountId || (selected !== null && profileIds.includes(selected)))
    return selected
  return platform === 'kids' ? (profileIds[0] ?? accountId) : accountId
}
