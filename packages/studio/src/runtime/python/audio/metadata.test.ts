import { test } from 'bun:test'
import { checkPythonAudioMetadata } from '../../../../scripts/python/audio-metadata'

test('the Python package policy matches the canonical provided-module descriptor', async () => {
  await checkPythonAudioMetadata()
})
