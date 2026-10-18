import { describe, expect, it } from 'bun:test'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { validateLiveSnapshot } from '../../src/domain/live/workspace-snapshot'

const id = 'workspace-one'
function fixture(language: 'javascript' | 'python', kind: 'classic' | 'pro') {
  return { ...documentFixture(language, kind), id, assets: [] }
}

describe('live workspace document boundary', () => {
  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const)
      it(`preserves the complete ${language}/${kind} v3 snapshot without granting runtime access`, () => {
        const input = fixture(language, kind)
        const before = JSON.stringify(input)
        const result = validateLiveSnapshot(input, id)
        expect(JSON.stringify(result)).toBe(before)
        expect(result).not.toBe(input)
      })

  it('keeps legacy JavaScript Pro as v2 and rejects forged languages, paths and modes', () => {
    const { runtime: _runtime, ...project } = fixture('javascript', 'pro')
    const legacy = { ...project, formatVersion: 2 }
    expect(validateLiveSnapshot(legacy, id)).toEqual(legacy)
    for (const invalid of [
      { ...legacy, programmingLanguage: 'python' },
      { ...legacy, runtime: {} },
      { ...legacy, kind: 'unknown' },
      { ...legacy, mode: 'blocks' },
      { ...legacy, tree: { '../main.js': { kind: 'file', content: 'alert(1)' } } },
      { ...legacy, tree: { 'src/main.js': { kind: 'file', content: '' } } },
      { ...legacy, tree: { 'a.js': { kind: 'file', content: '' }, 'A.js': { kind: 'dir' } } },
    ])
      expect(() => validateLiveSnapshot(invalid, id)).toThrow()
  })

  it('rejects incomplete Python, future versions, identities, executable properties and the existing room byte quota', () => {
    const project = fixture('python', 'pro')
    for (const invalid of [
      { ...project, formatVersion: 4 },
      { ...project, id: 'other' },
      { ...project, python: { entrypoint: 'missing.py' } },
      { ...project, mode: 'bridge' },
      { ...project, assets: [{ name: 'web-image', dataUrl: 'https://remote.test/image.png' }] },
      { ...project, name: 'x'.repeat(2_000_001) },
    ])
      expect(() => validateLiveSnapshot(invalid, id)).toThrow()
    let accessed = false
    const input = { ...project }
    Object.defineProperty(input, 'name', {
      enumerable: true,
      get() {
        accessed = true
        return 'unsafe'
      },
    })
    expect(() => validateLiveSnapshot(input, id)).toThrow()
    expect(accessed).toBe(false)
  })
})
