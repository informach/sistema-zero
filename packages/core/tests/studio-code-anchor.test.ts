import { expect, test } from 'bun:test'
import {
  codeAnchorMatchesSource,
  studioSourceAtPath,
  studioSourceSha256,
} from '../src/studio/code-anchor'

test('code anchors use the authoritative file namespace in all four environments', () => {
  for (const programmingLanguage of ['javascript', 'python']) {
    expect(
      studioSourceAtPath({ programmingLanguage, files: { 'main.py': 'classic' } }, 'main.py'),
    ).toBe('classic')
    const pro = {
      programmingLanguage,
      kind: 'pro',
      files: { 'stale.js': 'old' },
      tree: { src: { kind: 'dir' }, 'src/main.py': { kind: 'file', content: 'pro' } },
    }
    expect(studioSourceAtPath(pro, 'src/main.py')).toBe('pro')
    expect(studioSourceAtPath(pro, 'stale.js')).toBeNull()
    expect(studioSourceAtPath(pro, 'src')).toBeNull()
  }
  const legacy = { extraFiles: [{ name: 'helper.ts', content: 'extra' }] }
  expect(studioSourceAtPath(legacy, 'helper.ts')).toBe('extra')
  expect(studioSourceAtPath({ ...legacy, programmingLanguage: 'python' }, 'helper.ts')).toBeNull()
  expect(
    studioSourceAtPath({ files: Object.create({ 'main.py': 'inherited' }) }, 'main.py'),
  ).toBeNull()
  expect(studioSourceAtPath({ files: { '../secret.py': 'text' } }, '../secret.py')).toBeNull()
})

test('UTF-16 ranges preserve emoji and CRLF boundaries and require the exact source', async () => {
  const source = 'x = "😀"\r\nprint(x)'
  const anchor = {
    kind: 'code' as const,
    id: 'main.py',
    start: 5,
    end: 7,
    sourceSha256: await studioSourceSha256(source),
    modelVersion: 2,
  }
  expect(await codeAnchorMatchesSource(anchor, source)).toBe(true)
  expect(await codeAnchorMatchesSource(anchor, source.replace('😀', '🚀'))).toBe(false)
  for (const invalid of [
    { start: 6 },
    { end: 6 },
    { start: 9, end: 9 },
    { start: -1 },
    { end: source.length + 1 },
    { start: 1.5 },
    { modelVersion: 0 },
    { id: '../main.py' },
    { sourceSha256: 'a'.repeat(64) },
  ])
    expect(await codeAnchorMatchesSource({ ...anchor, ...invalid }, source)).toBe(false)
  expect(
    await codeAnchorMatchesSource({ ...anchor, start: source.length, end: source.length }, source),
  ).toBe(true)
  expect(await studioSourceSha256('\ud800')).not.toBe(await studioSourceSha256('\ud801'))
  expect(await studioSourceSha256('\ud800')).not.toBe(await studioSourceSha256('\ufffd'))
})
