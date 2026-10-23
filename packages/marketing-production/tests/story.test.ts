import { describe, expect, test } from 'bun:test'
import { applyStoryPatch, defaultStory, storySchema } from '../src/story'

describe('edição de uma composição', () => {
  test('altera só o pedido e conserva original e gravação', () => {
    const base = {
      ...defaultStory,
      clip: { src: 'http://127.0.0.1/media', trimBefore: 30, muted: false },
    }
    const next = applyStoryPatch(base, { title: 'Outra ideia' })
    expect(next.clip).toEqual(base.clip)
    expect(next.subtitle).toBe(base.subtitle)
    expect(base.title).toBe(defaultStory.title)
    expect(next.title).toBe('Outra ideia')
  })
  test('rejeita operação fora do escopo, duração inválida e corte sem gravação', () => {
    expect(() => applyStoryPatch(defaultStory, { width: 400 })).toThrow()
    expect(() => applyStoryPatch(defaultStory, { durationInFrames: -1 })).toThrow()
    expect(() => applyStoryPatch(defaultStory, { trimBefore: 3 })).toThrow()
    expect(() => applyStoryPatch(defaultStory, {})).toThrow()
    expect(storySchema.safeParse({ ...defaultStory, fps: 0 }).success).toBe(false)
  })
})
