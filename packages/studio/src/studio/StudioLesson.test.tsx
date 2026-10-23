import { test } from 'bun:test'
import { ISOLATED_STUDIO_CASE_TIMEOUT_MS, runIsolatedStudioCases } from '../__tests__/isolatedCases'

test(
  'StudioLesson.test.tsx mock cases own an isolated module realm',
  () => runIsolatedStudioCases('./src/studio/__tests__/StudioLesson.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)
