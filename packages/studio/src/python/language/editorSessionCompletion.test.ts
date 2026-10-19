import { test } from 'bun:test'
import {
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
  runIsolatedStudioCases,
} from '../../__tests__/isolatedCases'

test(
  'Python completion recovery preserves ownership through edits and cancellation',
  () => runIsolatedStudioCases('./src/python/language/__tests__/editorSessionCompletion.cases.js'),
  ISOLATED_STUDIO_CASE_TIMEOUT_MS,
)
