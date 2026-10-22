import {
  isPythonCourseBlock,
  pythonCourseExtensionsForBlocks,
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
  const blockIds = approvedBlockIds.filter(
    (id) => isPythonCourseBlock(id) && (earnedIds === null || earnedIds.has(id)),
  )
  const owners = new Set(pythonCourseExtensionsForBlocks(earned ?? []))
  return {
    blockIds,
    grantedExtensionIds: releaseExtensionIds.filter((id) => earnedIds === null || owners.has(id)),
  }
}
