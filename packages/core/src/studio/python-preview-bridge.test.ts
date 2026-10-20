import { expect, test } from 'bun:test'
import {
  StudioPythonPreviewAudioReadySchema,
  StudioPythonPreviewAudioSchema,
} from './python-preview-bridge'

const binding = {
  version: 1,
  previewId: 'a'.repeat(64),
  session: 'a8e84f34-66f6-4c22-8295-6cc786597d41',
  requestId: '71a0bc55-02b7-42f0-a66f-56216be7a593',
}
test('preview audio uses closed host/launcher binding and strict boolean/sequence', () => {
  const ready = { ...binding, type: 'studio-python-preview-audio-ready' }
  const state = { ...binding, type: 'studio-python-preview-audio', sequence: 0, muted: true }
  expect(StudioPythonPreviewAudioReadySchema.safeParse(ready).success).toBe(true)
  expect(StudioPythonPreviewAudioSchema.safeParse(state).success).toBe(true)
  for (const delta of [
    { muted: 'false' },
    { muted: undefined },
    { sequence: -1 },
    { sequence: 1.5 },
    { sequence: Infinity },
    { requestId: '' },
    { session: '' },
    { previewId: 'x' },
    { source: 'print(1)' },
  ]) {
    expect(StudioPythonPreviewAudioSchema.safeParse({ ...state, ...delta }).success).toBe(false)
  }
  expect(StudioPythonPreviewAudioReadySchema.safeParse({ ...ready, muted: false }).success).toBe(
    false,
  )
})
