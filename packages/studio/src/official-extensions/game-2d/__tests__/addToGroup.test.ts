import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * addToGroup: põe um sprite que JÁ existe dentro de um grupo (o espelho do
 * removeFromGroup) — nasceu porque o Zappy sugeria esse bloco sem ele existir.
 * Regras: dedup (repetido não entra), teto MAX_GROUP silencioso (régua do
 * spawn) e, uma vez dentro, os helpers de grupo alcançam o sprite.
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx?: number
  vy?: number
}
interface Group {
  items: Sprite[]
}
interface Api {
  createSprite: (o: Partial<Sprite>) => Sprite
  createGroup: () => Group
  addToGroup: (g: Group, s: Sprite) => void
  removeFromGroup: (g: Group, s: Sprite) => void
  countGroup: (g: Group) => number
  updateGroup: (g: Group) => void
  spawn: (g: Group, o: Partial<Sprite>) => Sprite | null
}

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

describe('addToGroup — pôr um sprite existente no grupo', () => {
  it('adiciona, deduplica e o removeFromGroup desfaz', () => {
    const api = load()
    const g = api.createGroup()
    const heroi = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    api.addToGroup(g, heroi)
    expect(api.countGroup(g)).toBe(1)
    api.addToGroup(g, heroi)
    expect(api.countGroup(g)).toBe(1)
    api.removeFromGroup(g, heroi)
    expect(api.countGroup(g)).toBe(0)
  })

  it('uma vez no grupo, o updateGroup move o sprite junto com os demais', () => {
    const api = load()
    const g = api.createGroup()
    api.spawn(g, { x: 0, y: 0, w: 10, h: 10, vx: 2 })
    const convidado = api.createSprite({ x: 100, y: 0, w: 10, h: 10, vx: 3 })
    api.addToGroup(g, convidado)
    api.updateGroup(g)
    expect(convidado.x).toBeGreaterThan(100)
  })

  it('entrada inválida e teto do grupo não lançam nem estouram', () => {
    const api = load()
    const g = api.createGroup()
    expect(() => {
      api.addToGroup(g, null as unknown as Sprite)
      api.addToGroup(null as unknown as Group, api.createSprite({ x: 0, y: 0, w: 1, h: 1 }))
    }).not.toThrow()
    expect(api.countGroup(g)).toBe(0)
    for (let i = 0; i < 450; i++) api.addToGroup(g, api.createSprite({ x: i, y: 0, w: 1, h: 1 }))
    expect(api.countGroup(g)).toBe(400)
  })
})
