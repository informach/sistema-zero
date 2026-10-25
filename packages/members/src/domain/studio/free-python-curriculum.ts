import {
  isPythonCourseBlock,
  pythonCourseBlockClosure,
  pythonCourseExtensionsForBlocks,
  removePythonCourseBlocks,
} from '@sistemazero/studio/python-course-unlocks'

export function hasPythonCourseAccess(earned: readonly string[] | null) {
  return earned === null || earned.some(isPythonCourseBlock)
}

/** The host approval is a ceiling; only an explicit staff preview has no earned-ID ceiling. */
export function freePythonCurriculum(
  approvedBlockIds: readonly string[],
  releaseExtensionIds: readonly string[],
  earned: readonly string[] | null,
) {
  const earnedIds = earned === null ? null : new Set(earned)
  const candidates = approvedBlockIds.filter(
    (id) => isPythonCourseBlock(id) && (earnedIds === null || earnedIds.has(id)),
  )
  // An optional, incomplete entry must not invalidate every other approved block.
  // Remove its consumers; never fill missing companions from unearned/unapproved IDs.
  const available = new Set(candidates)
  const missing = pythonCourseBlockClosure(candidates).filter((id) => !available.has(id))
  const complete = missing.length
    ? new Set(removePythonCourseBlocks(candidates, missing))
    : available
  const blockIds = candidates.filter((id) => complete.has(id))
  const owners = new Set(pythonCourseExtensionsForBlocks(earned ?? []))
  return {
    blockIds,
    grantedExtensionIds: releaseExtensionIds.filter((id) => earnedIds === null || owners.has(id)),
  }
}
