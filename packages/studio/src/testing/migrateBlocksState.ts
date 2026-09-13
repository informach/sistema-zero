import { migrateGameTwoDBlocks } from '../project-migrations/gameTwoD'
import { normalizeLegacyBlocksStateToFrames } from '../project-migrations/legacyFrames'

/** Fixtures de encaixe percorrem o leitor histórico e as substituições atuais. */
export function migrateBlocksState(state: unknown): unknown {
  const converted = normalizeLegacyBlocksStateToFrames(structuredClone(state))
  migrateGameTwoDBlocks(converted, [])
  return converted
}
