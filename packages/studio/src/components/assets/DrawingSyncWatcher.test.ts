import { test } from 'bun:test'
import {
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
  runIsolatedStudioCases,
} from '../../__tests__/isolatedCases'

test(
  'DrawingSyncWatcher keeps its IndexedDB fixture in an isolated module realm',
  () => runIsolatedStudioCases('./src/components/assets/__tests__/DrawingSyncWatcher.cases.tsx'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)
