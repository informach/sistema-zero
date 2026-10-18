import { expect, test } from 'bun:test'
import { studioProjectContinuityIssue } from '../src/studio/project-continuity'

const python = {
  formatVersion: 3,
  programmingLanguage: 'python',
  kind: 'classic',
  runtime: { profileId: 'python-browser', releaseId: 'python-1', manifestSha256: 'a'.repeat(64) },
}

test('legacy JS stays compatible without rewriting; work and display mode are not environment', () => {
  expect(
    studioProjectContinuityIssue(
      { formatVersion: 2, mode: 'bridge', files: { code: 'edited' } },
      { kind: 'classic', mode: 'blocks' },
    ),
  ).toBeNull()
  expect(
    studioProjectContinuityIssue(
      {
        ...python,
        id: 'local',
        mode: 'bridge',
        installedExtensions: [{ id: 'turtle', version: '1' }],
      },
      { ...python, id: 'initial', mode: 'blocks' },
    ),
  ).toBeNull()
})

test('chain reuse cannot reinterpret a language, kind, template or pinned runtime', () => {
  expect(studioProjectContinuityIssue(python, { formatVersion: 2 })).toBe('language')
  const pro = { ...python, kind: 'pro', proMeta: { templateId: 'python-blank' } }
  expect(studioProjectContinuityIssue(python, pro)).toBe('kind')
  expect(
    studioProjectContinuityIssue(pro, { ...pro, proMeta: { templateId: 'python-other' } }),
  ).toBe('template')
  for (const [key, value] of [
    ['profileId', 'other-profile'],
    ['releaseId', 'other-release'],
    ['manifestSha256', 'b'.repeat(64)],
  ]) {
    expect(
      studioProjectContinuityIssue(python, {
        ...python,
        runtime: { ...python.runtime, [key!]: value },
      }),
    ).toBe('runtime')
  }
  expect(
    studioProjectContinuityIssue(
      { formatVersion: 2 },
      { ...python, programmingLanguage: 'javascript' },
    ),
  ).toBe('runtime')
})

test('future and incomplete environment metadata never inherit JavaScript defaults', () => {
  for (const invalid of [
    null,
    [],
    { formatVersion: 4 },
    { formatVersion: 3 },
    { ...python, runtime: null },
    { ...python, formatVersion: 2 },
    { formatVersion: 2, kind: 'other' },
  ]) {
    expect(studioProjectContinuityIssue(invalid, invalid)).toBe('invalid-environment')
  }
})
