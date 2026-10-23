import { expect, test } from 'bun:test'
import { isStudioProPublication } from './pro-publication'
import {
  isStudioPublication,
  isStudioPythonPublication,
  type StudioPythonPublication,
  StudioPythonPublicationSchema,
} from './python-publication'

function fixture(): StudioPythonPublication {
  const runtime = {
    profileId: 'python-browser',
    releaseId: '2026-10-17',
    manifestSha256: 'a'.repeat(64),
  }
  return {
    publicationVersion: 2,
    programmingLanguage: 'python',
    kind: 'pro',
    runtime,
    playId: crypto.randomUUID(),
    version: 1,
    activeRevision: 'b'.repeat(64),
    disabled: false,
    revisions: [
      {
        id: 'b'.repeat(64),
        sourceHash: 'c'.repeat(64),
        artifactHash: 'd'.repeat(64),
        createdAt: 100,
        approval: { kind: 'python-browser', runtime, snapshotSha256: 'e'.repeat(64) },
      },
    ],
  }
}

test('Python publication identifies its bundle/runtime without claiming JS compilation validation', () => {
  const value = fixture()
  expect(isStudioPythonPublication(value)).toBe(true)
  expect(isStudioPublication(value)).toBe(true)
  expect(isStudioProPublication(value)).toBe(false)
  expect(StudioPythonPublicationSchema.parse(value)).toEqual(value)
  expect(isStudioPythonPublication({ ...value, kind: 'classic' })).toBe(true)
  const js = {
    playId: value.playId,
    version: 1,
    activeRevision: 'b'.repeat(64),
    disabled: false,
    revisions: [
      {
        id: 'b'.repeat(64),
        sourceHash: 'c'.repeat(64),
        artifactHash: 'd'.repeat(64),
        createdAt: 100,
        validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
      },
    ],
  }
  expect(isStudioPublication(js)).toBe(true)
  expect(isStudioProPublication(js)).toBe(true)
  expect(isStudioProPublication({ ...js, programmingLanguage: 'python' })).toBe(false)
  expect(
    isStudioProPublication({
      ...js,
      revisions: js.revisions.map((revision) => ({
        ...revision,
        approval: value.revisions[0]!.approval,
      })),
    }),
  ).toBe(false)
})

test('publication approval cannot substitute an active revision, runtime, kind or JS proof', () => {
  const value = fixture()
  expect(isStudioPythonPublication({ ...value, activeRevision: 'f'.repeat(64) })).toBe(false)
  expect(isStudioPythonPublication({ ...value, kind: 'unknown' })).toBe(false)
  expect(
    isStudioPythonPublication({ ...value, revisions: [...value.revisions, ...value.revisions] }),
  ).toBe(false)
  expect(isStudioPythonPublication({ ...value, revisions: [] })).toBe(false)
  expect(
    isStudioPythonPublication({
      ...value,
      revisions: value.revisions.map((revision) => ({
        ...revision,
        validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
      })),
    }),
  ).toBe(false)
  const foreign = structuredClone(value)
  foreign.revisions[0]!.approval.runtime = { ...foreign.runtime, manifestSha256: 'f'.repeat(64) }
  expect(isStudioPythonPublication(foreign)).toBe(false)
  expect(
    isStudioPythonPublication({
      ...value,
      revisions: value.revisions.map(({ approval: _approval, ...revision }) => ({
        ...revision,
        validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
      })),
    }),
  ).toBe(false)
})
