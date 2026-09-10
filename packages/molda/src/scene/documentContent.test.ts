import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { sameSceneContent } from './documentContent'

test('content identity ignores only thumbnail and save timestamp, including an absent thumbnail', () => {
  const { document } = makeSceneSkinFixture()
  expect(sameSceneContent(document, document)).toBe(true)
  const saved = { ...document, updatedAt: document.updatedAt + 1, thumb: 'new thumbnail' }
  expect(sameSceneContent(document, saved)).toBe(true)
  expect(sameSceneContent(saved, document)).toBe(true)
  for (const [key, value] of Object.entries(document)) {
    if (key === 'thumb' || key === 'updatedAt') continue
    const changed = {
      ...document,
      [key]: Array.isArray(value)
        ? [...value]
        : typeof value === 'object'
          ? { ...value }
          : `${value}-changed`,
    }
    expect(sameSceneContent(document, changed)).toBe(false)
  }
  expect(sameSceneContent(document, { ...document, skins: [] })).toBe(false)
  expect(sameSceneContent({ ...document, skins: [] }, document)).toBe(false)
})
