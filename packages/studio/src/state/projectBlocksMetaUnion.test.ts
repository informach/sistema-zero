import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'projectBlocksMetaUnion.test.ts mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/state/__tests__/projectBlocksMetaUnion.cases.ts'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)
