import { describe, expect, it } from 'bun:test'
import { createSessionStore } from './sessionStore'

describe('sessão: guias do palco', () => {
  it('clampGuides traz para a borda as guias que o documento encolhido deixou de fora', () => {
    const session = createSessionStore()
    expect(session.getState().addGuide('x', 60, 64)).toBe(true)
    expect(session.getState().addGuide('y', 10, 64)).toBe(true)
    const antes = session.getState().guides
    // Sem órfã, nada muda (nem a referência).
    session.getState().clampGuides(64, 64)
    expect(session.getState().guides).toBe(antes)
    session.getState().clampGuides(32, 32)
    expect(session.getState().guides.map((guide) => guide.pos)).toEqual([32, 10])
  })
})
