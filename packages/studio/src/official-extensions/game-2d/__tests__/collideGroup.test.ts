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
  collidePlatform: (s: Sprite, platform: Sprite) => void
  collidePlatformGroup: (s: Sprite, g: { items: Sprite[] }) => void
  spawn: (g: { items: Sprite[] }, o: Partial<Sprite>) => Sprite | null
  updateGroup: (g: { items: Sprite[] }) => void
  applyGravityToGroup: (g: { items: Sprite[] }) => void
  setGravity: (v: number) => void
  applyVelocity: (s: Sprite) => void
  platformer: (s: Sprite, ctx: unknown, speed: number, jump: number) => void
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
}

const ctx = { canvas: { width: 320, height: 200 } }

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

describe('figuras como plataformas unidirecionais', () => {
  it('pousa por cima, mas atravessa por baixo e pelas laterais', () => {
    const api = load()
    const plataforma = api.createSprite({ x: 0, y: 32, w: 40, h: 16 })

    const caindo = api.createSprite({ x: 4, y: 20, w: 16, h: 16, vy: 5 })
    api.collidePlatform(caindo, plataforma)
    expect(caindo.y).toBe(16)
    expect(caindo.vy).toBe(0)
    expect(caindo.onGround).toBe(true)

    const subindo = api.createSprite({ x: 4, y: 36, w: 16, h: 16, vy: -5 })
    api.collidePlatform(subindo, plataforma)
    expect(subindo.y).toBe(36)
    expect(subindo.vy).toBe(-5)

    const lateral = api.createSprite({ x: 35, y: 36, w: 16, h: 16, vx: -4, vy: 0 })
    api.collidePlatform(lateral, plataforma)
    expect(lateral.x).toBe(35)
    expect(lateral.vx).toBe(-4)
  })

  it('com gravidade invertida, apoia na face inferior e atravessa pela superior', () => {
    const api = load()
    api.setGravity(-0.6)
    const plataforma = api.createSprite({ x: 0, y: 32, w: 40, h: 16 })

    const subindo = api.createSprite({ x: 4, y: 44, w: 16, h: 16, vy: -5 })
    api.collidePlatform(subindo, plataforma)
    expect(subindo.y).toBe(48)
    expect(subindo.vy).toBe(0)
    expect(subindo.onGround).toBe(true)

    const descendo = api.createSprite({ x: 4, y: 20, w: 16, h: 16, vy: 5 })
    api.collidePlatform(descendo, plataforma)
    expect(descendo.y).toBe(20)
    expect(descendo.vy).toBe(5)
  })

  it('a versão de grupo usa todas as figuras como plataformas', () => {
    const api = load()
    const grupo = api.createGroup()
    grupo.items.push(api.createSprite({ x: 0, y: 32, w: 40, h: 16 }))
    const heroi = api.createSprite({ x: 4, y: 20, w: 16, h: 16, vy: 5 })

    api.collidePlatformGroup(heroi, grupo)

    expect(heroi.y).toBe(16)
    expect(heroi.onGround).toBe(true)
  })

  it('o movimento estilo plataforma pula no primeiro quadro apoiado', () => {
    const api = load()
    const plataforma = api.createSprite({ x: 0, y: 32, w: 64, h: 16 })
    const heroi = api.createSprite({ x: 4, y: 20, w: 16, h: 16, vy: 5 })
    api.collidePlatform(heroi, plataforma)

    api.keys.up = true
    api.platformer(heroi, ctx, 4, 11)
    api.collidePlatform(heroi, plataforma)

    expect(heroi.vy).toBe(-11)
    expect(heroi.y).toBe(5)
    expect(heroi.onGround).toBe(false)
  })
})

describe('figuras móveis transportam quem está apoiado', () => {
  function land(api: Api, heroi: Sprite, plataforma: Sprite, oneWay: boolean): void {
    heroi.vy = 8
    api.applyVelocity(heroi)
    if (oneWay) api.collidePlatform(heroi, plataforma)
    else api.collideSprite(heroi, plataforma)
    expect(heroi.onGround).toBe(true)
  }

  it('soma o deslocamento horizontal da base ao movimento próprio do jogador', () => {
    for (const oneWay of [false, true]) {
      const api = load()
      const plataforma = api.createSprite({ x: 0, y: 32, w: 64, h: 16, vx: 5 })
      const heroi = api.createSprite({ x: 4, y: 10, w: 16, h: 16 })
      land(api, heroi, plataforma, oneWay)

      api.applyVelocity(plataforma)
      api.keys.right = true
      api.platformer(heroi, ctx, 3, 11)
      if (oneWay) api.collidePlatform(heroi, plataforma)
      else api.collideSprite(heroi, plataforma)

      expect(heroi.x).toBe(12) // x 4 + jogador 3 + plataforma 5
      expect(heroi.onGround).toBe(true)
    }
  })

  it('acompanha a base subindo e descendo', () => {
    for (const platformVY of [-4, 4]) {
      const api = load()
      const plataforma = api.createSprite({ x: 0, y: 32, w: 64, h: 16, vy: platformVY })
      const heroi = api.createSprite({ x: 4, y: 10, w: 16, h: 16 })
      land(api, heroi, plataforma, true)

      api.applyVelocity(plataforma)
      api.platformer(heroi, ctx, 3, 11)
      api.collidePlatform(heroi, plataforma)

      expect(heroi.y).toBe(16 + platformVY)
      expect(heroi.onGround).toBe(true)
    }
  })

  it('solta imediatamente ao pular', () => {
    const api = load()
    const plataforma = api.createSprite({ x: 0, y: 32, w: 64, h: 16, vx: 5 })
    const heroi = api.createSprite({ x: 4, y: 10, w: 16, h: 16 })
    land(api, heroi, plataforma, true)

    api.applyVelocity(plataforma)
    api.keys.up = true
    api.platformer(heroi, ctx, 3, 11)
    api.collidePlatform(heroi, plataforma)

    expect(heroi.x).toBe(4)
    expect(heroi.vy).toBe(-11)
    expect(heroi.onGround).toBe(false)
  })

  it('não transporta depois de sair andando nem depois de remover a base do grupo', () => {
    const walkingApi = load()
    const walkingPlatform = walkingApi.createSprite({ x: 0, y: 32, w: 32, h: 16 })
    const walkingHero = walkingApi.createSprite({ x: 4, y: 10, w: 16, h: 16 })
    land(walkingApi, walkingHero, walkingPlatform, true)
    walkingApi.keys.right = true
    walkingApi.platformer(walkingHero, ctx, 40, 11)
    walkingApi.collidePlatform(walkingHero, walkingPlatform)
    walkingApi.keys.right = false
    walkingPlatform.vx = 5
    walkingApi.applyVelocity(walkingPlatform)
    walkingApi.platformer(walkingHero, ctx, 3, 11)
    walkingApi.collidePlatform(walkingHero, walkingPlatform)
    expect(walkingHero.x).toBe(44)
    expect(walkingHero.onGround).toBe(false)

    const groupApi = load()
    const grupo = groupApi.createGroup()
    const groupPlatform = groupApi.createSprite({ x: 0, y: 32, w: 64, h: 16, vx: 5 })
    grupo.items.push(groupPlatform)
    const groupHero = groupApi.createSprite({ x: 4, y: 10, w: 16, h: 16 })
    groupHero.vy = 8
    groupApi.applyVelocity(groupHero)
    groupApi.collidePlatformGroup(groupHero, grupo)
    grupo.items.pop()
    groupApi.applyVelocity(groupPlatform)
    groupApi.platformer(groupHero, ctx, 3, 11)
    groupApi.collidePlatformGroup(groupHero, grupo)
    expect(groupHero.x).toBe(4)
    expect(groupHero.onGround).toBe(false)
  })
})

describe('updateGroup + applyGravityToGroup', () => {
  it('tiros vão retos até a gravidade ser aplicada explicitamente', () => {
    const api = load()
    api.setGravity(1)
    const tiros = api.createGroup()
    const t = api.spawn(tiros, { x: 0, y: 100, w: 6, h: 6, vx: 0, vy: -5 })
    api.updateGroup(tiros)
    expect(t?.vy).toBe(-5)
    expect(t?.y).toBe(95)

    api.applyGravityToGroup(tiros)
    api.updateGroup(tiros)
    expect(t?.vy).toBe(-4)
    expect(t?.y).toBe(91)
  })
})
