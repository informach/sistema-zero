import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'StudioEditor.test.tsx mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/studio/__tests__/StudioEditor.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)
