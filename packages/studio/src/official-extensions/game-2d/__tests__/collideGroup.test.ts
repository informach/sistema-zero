import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * collideGroup: impede o sprite de atravessar os sprites de um grupo (obstáculos
 * desenhados à mão). Espelha o collideTileMap — empurra para fora pelo eixo de
 * menor sobreposição e zera a velocidade nesse eixo (parede + chão + deslizar).
 */

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx?: number
  vy?: number
  onGround?: boolean
}
interface Api {
  createSprite: (o: Partial<Sprite>) => Sprite
  createGroup: () => { items: Sprite[] }
  collideGroup: (s: Sprite, g: { items: Sprite[] }) => void
  collideSprite: (s: Sprite, other: Sprite) => void
  spawn: (g: { items: Sprite[] }, o: Partial<Sprite>) => Sprite | null
  updateGroup: (g: { items: Sprite[] }) => void
  updateGroupNoGravity: (g: { items: Sprite[] }) => void
  setGravity: (v: number) => void
  applyVelocity: (s: Sprite) => void
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

describe('collideGroup — obstáculos sólidos sem tilemap', () => {
  it('empurra para a ESQUERDA quando encosta pela direita (parede) e zera vx', () => {
    const api = load()
    const heroi = api.createSprite({ x: 18, y: 0, w: 20, h: 20, vx: 5 })
    const g = api.createGroup()
    g.items.push(api.createSprite({ x: 30, y: 0, w: 20, h: 20 })) // pedra à direita
    api.collideGroup(heroi, g)
    // sobreposição X = (18+20) - 30 = 8; empurra o herói para trás (x: 10)
    expect(heroi.x).toBe(10)
    expect(heroi.x + heroi.w).toBeLessThanOrEqual(30)
    expect(heroi.vx).toBe(0)
  })

  it('pousar EM CIMA de um obstáculo zera vy e marca onGround', () => {
    const api = load()
    const heroi = api.createSprite({ x: 0, y: 24, w: 20, h: 20, vy: 6 })
    const g = api.createGroup()
    g.items.push(api.createSprite({ x: 0, y: 40, w: 20, h: 20 })) // chão logo abaixo
    api.collideGroup(heroi, g)
    expect(heroi.y + heroi.h).toBeLessThanOrEqual(40)
    expect(heroi.vy).toBe(0)
    expect(heroi.onGround).toBe(true)
  })

  it('deslizar: bater na lateral zera só o vx, o vy segue (não gruda)', () => {
    const api = load()
    const heroi = api.createSprite({ x: 18, y: 0, w: 20, h: 20, vx: 5, vy: 3 })
    const g = api.createGroup()
    g.items.push(api.createSprite({ x: 34, y: 0, w: 20, h: 20 }))
    api.collideGroup(heroi, g)
    expect(heroi.vx).toBe(0)
    expect(heroi.vy).toBe(3) // continua descendo pela beirada
  })

  it('sem sobreposição = não mexe no sprite', () => {
    const api = load()
    const heroi = api.createSprite({ x: 0, y: 0, w: 20, h: 20, vx: 5 })
    const g = api.createGroup()
    g.items.push(api.createSprite({ x: 200, y: 200, w: 20, h: 20 }))
    api.collideGroup(heroi, g)
    expect(heroi.x).toBe(0)
    expect(heroi.vx).toBe(5)
  })

  it('não colide consigo mesmo se estiver no próprio grupo; grupo vazio é no-op', () => {
    const api = load()
    const heroi = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const g = api.createGroup()
    g.items.push(heroi)
    api.collideGroup(heroi, g)
    expect(heroi.x).toBe(0)
    api.collideGroup(heroi, api.createGroup()) // vazio
    expect(heroi.x).toBe(0)
  })

  it('mantém o chão ao tocar exatamente a plataforma (grupo e sprite único)', () => {
    const api = load()
    api.setGravity(0.6)
    const piso = api.createSprite({ x: 0, y: 32, w: 32, h: 16 })
    const grupo = api.createGroup()
    grupo.items.push(piso)
    const noGrupo = api.createSprite({ x: 0, y: 10, w: 16, h: 16, vy: 8 })

    api.applyVelocity(noGrupo)
    api.collideGroup(noGrupo, grupo)
    api.applyVelocity(noGrupo)
    api.collideGroup(noGrupo, grupo)
    expect(noGrupo.onGround).toBe(true)
    expect(noGrupo.y).toBe(16)
    expect(noGrupo.vy).toBe(0)

    const unico = api.createSprite({ x: 0, y: 10, w: 16, h: 16, vy: 8 })
    api.applyVelocity(unico)
    api.collideSprite(unico, piso)
    api.applyVelocity(unico)
    api.collideSprite(unico, piso)
    expect(unico.onGround).toBe(true)
    expect(unico.y).toBe(16)
    expect(unico.vy).toBe(0)
  })
})

describe('collideSprite — colisão sólida contra UM sprite (R5/D1)', () => {
  it('empurra para fora e zera a velocidade no eixo (parede única)', () => {
    const api = load()
    const heroi = api.createSprite({ x: 18, y: 0, w: 20, h: 20, vx: 5 })
    const parede = api.createSprite({ x: 30, y: 0, w: 20, h: 20 })
    api.collideSprite(heroi, parede)
    expect(heroi.x).toBe(10) // mesma física do collideGroup, por item
    expect(heroi.vx).toBe(0)
  })

  it('não colide consigo mesmo e sem sobreposição é no-op', () => {
    const api = load()
    const heroi = api.createSprite({ x: 0, y: 0, w: 20, h: 20, vx: 5 })
    api.collideSprite(heroi, heroi)
    expect(heroi.x).toBe(0)
    api.collideSprite(heroi, api.createSprite({ x: 200, y: 200, w: 20, h: 20 }))
    expect(heroi.x).toBe(0)
    expect(heroi.vx).toBe(5)
  })
})

describe('updateGroupNoGravity — mover o grupo sem gravidade (R5/D2)', () => {
  it('move pela velocidade SEM somar gravidade (tiros vão retos)', () => {
    const api = load()
    api.setGravity(1)
    const tiros = api.createGroup()
    const semG = api.createGroup()
    const comG = api.createGroup()
    const t = api.spawn(semG, { x: 0, y: 100, w: 6, h: 6, vx: 0, vy: -5 })
    const t2 = api.spawn(comG, { x: 0, y: 100, w: 6, h: 6, vx: 0, vy: -5 })
    expect(tiros.items.length).toBe(0)
    api.updateGroupNoGravity(semG) // sem gravidade
    api.updateGroup(comG) // com gravidade (comparação)
    // o "sem gravidade" mantém o vy constante; o normal já somou +1 de gravidade
    expect(t?.vy).toBe(-5)
    expect(t?.y).toBe(95)
    expect(t2?.vy).toBe(-4) // -5 + gravidade 1
  })
})
