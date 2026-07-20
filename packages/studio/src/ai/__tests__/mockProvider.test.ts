import { describe, expect, it } from 'bun:test'
import { MockAIProvider } from '../mockProvider'

describe('MockAIProvider', () => {
  it('converte ideias somente para a IR canônica com três áreas', async () => {
    const ir = await new MockAIProvider().convertIdeaToBlocks('um jogo simples')

    expect(ir).toEqual({
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [] },
      extensions: [],
    })
  })
})
