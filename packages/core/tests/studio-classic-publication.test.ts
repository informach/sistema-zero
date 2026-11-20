import { expect, test } from 'bun:test'
import {
  isStudioClassicPublication,
  isStudioProPublication,
  isStudioPublication,
  isStudioPythonPublication,
} from '../src/studio'

const revision = {
  id: 'a'.repeat(64),
  sourceHash: 'b'.repeat(64),
  artifactHash: 'c'.repeat(64),
  createdAt: 1,
  classic: true,
}
const publication = {
  publicationVersion: 1,
  programmingLanguage: 'javascript',
  kind: 'classic',
  playId: crypto.randomUUID(),
  version: 1,
  activeRevision: revision.id,
  disabled: false,
  revisions: [revision],
}

test('a classic publication is a studio publication and never passes as Pro or Python', () => {
  expect(isStudioClassicPublication(publication)).toBe(true)
  expect(isStudioPublication(publication)).toBe(true)
  expect(isStudioProPublication(publication)).toBe(false)
  expect(isStudioPythonPublication(publication)).toBe(false)
})

test('the active revision must belong to the history', () => {
  expect(isStudioClassicPublication({ ...publication, activeRevision: 'd'.repeat(64) })).toBe(false)
  expect(
    isStudioClassicPublication({ ...publication, revisions: [revision, { ...revision }] }),
  ).toBe(false)
})
