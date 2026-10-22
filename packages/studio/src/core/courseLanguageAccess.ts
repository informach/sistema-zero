import { SERVER_BLOCK_CATALOG } from '../blockly/blockCatalog'
import { isPythonCourseBlock } from '../python/course-unlocks'

const javaScriptBlocks = new Set(SERVER_BLOCK_CATALOG.map(({ type }) => type))

/** Server-side curriculum identity, never inferred from a prefix or the chosen project language. */
export function hasStudioLanguageAchievement(
  language: 'javascript' | 'python',
  blocks: readonly string[],
): boolean {
  return blocks.some((id) =>
    language === 'python' ? isPythonCourseBlock(id) : javaScriptBlocks.has(id),
  )
}
