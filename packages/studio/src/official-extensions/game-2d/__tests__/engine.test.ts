import { describe, expect, it, spyOn } from 'bun:test'
import { compileStatements } from '#generators'
import { G2D_STATEMENT_TYPES, type JSStatement, SZIRSchema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDRuntime } from '../runtime'

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  facing?: number
  hp?: number
  hpMax?: number
  blinkFrames?: number
  opacity?: number
}
interface Engine {
  createSprite: (opts: Partial<Sprite>) => Sprite
  setGravity: (g: number) => void
  applyVelocity: (s: Sprite) => void
  applyGravity: (s: Sprite) => void
  createGroup: () => { items: Sprite[] }
  updateGroup: (group: { items: Sprite[] }) => void
  bounceOnEdges: (s: Sprite, ctx: { canvas: { width: number; height: number } }) => void
  circleCollides: (a: Sprite, b: Sprite) => boolean
  onPointer: (fn: (x: number, y: number) => void) => void
  pointer: { x: number; y: number; down: boolean }
  playFx: (name: string) => void
  playNote: (note: string, ms: number) => void
  playMusic: (name: string) => void
  stopMusic: () => void
  distance: (a: Sprite, b: Sprite) => number
  angleTo: (a: Sprite, b: Sprite) => number
  setHealth: (s: Sprite, n: number) => void
  changeHealth: (s: Sprite, d: number) => void
  getHealth: (s: Sprite) => number
  getMaxHealth: (s: Sprite) => number
  hasHealth: (s: Sprite) => boolean
  healthDepleted: (s: Sprite) => boolean
  isInvincible: (s: Sprite) => boolean
  damageSprite: (s: Sprite, amount: number, invincibilityFrames: number) => void
  blink: (s: Sprite, frames: number) => void
  cooldownReady: (s: Sprite, frames: number, key?: string) => boolean
  randomBetween: (min: number, max: number) => number
  isPaused: () => boolean
  pauseGame: () => void
  resumeGame: () => void
  flipSprite: (s: Sprite, dir: string) => void
  scaleSprite: (s: Sprite, f: number) => void
  setCamera: (x: number, y: number) => void
  cameraX: () => number
  cameraY: () => number
  spriteX: (s: Sprite) => number
  spriteY: (s: Sprite) => number
  spriteW: (s: Sprite) => number
  spriteH: (s: Sprite) => number
  centerX: (s: Sprite) => number
  centerY: (s: Sprite) => number
  randomX: () => number
  randomY: () => number
  wrapEdges: (s: Sprite) => void
  touches: (a: Sprite, b: Sprite) => boolean
  randomChance: (percent: number) => boolean
  playJump: () => void
}
function loadRuntime(): Engine {
  const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return (win as { SZGame2D: Engine }).SZGame2D
}

describe('game-2d — gerador dos novos statements', () => {
  const gen = (stmt: JSStatement) => compileStatements([stmt], 0)

  it('física', () => {
    expect(gen({ type: 'g2d:setGravity', value: 0.5 })).toBe('SZGame2D.setGravity(0.5);')
    expect(gen({ type: 'g2d:applyVelocity', spriteVar: 'jogador' })).toBe(
      'SZGame2D.applyVelocity(jogador);',
    )
    expect(gen({ type: 'g2d:bounceOnEdges', spriteVar: 'bola', ctxVar: 'ctx' })).toBe(
      'SZGame2D.bounceOnEdges(bola, ctx);',
    )
    expect(gen({ type: 'g2d:circleCollides', aVar: 'a', bVar: 'b', varName: 'bateu' })).toBe(
      'const bateu = SZGame2D.circleCollides(a, b);',
    )
  })

  it('áudio e ponteiro', () => {
    expect(gen({ type: 'g2d:playSound', freq: 440, durationMs: 200 })).toBe(
      'SZGame2D.playSound(440, 200);',
    )
    const pointer = gen({
      type: 'g2d:onPointer',
      xName: 'px',
      yName: 'py',
      body: [{ type: 'consoleLog', value: { type: 'var', name: 'px' } }],
    })
    expect(pointer).toContain('SZGame2D.onPointer((px, py) => {')
    expect(pointer).toContain('console.log(px);')
  })

  it('áudio: efeitos, notas e música', () => {
    expect(gen({ type: 'g2d:playFx', fx: 'coin' })).toBe('SZGame2D.playFx("coin");')
    expect(gen({ type: 'g2d:playMusic', tune: 'adventure' })).toBe(
      'SZGame2D.playMusic("adventure");',
    )
    expect(gen({ type: 'g2d:stopMusic' })).toBe('SZGame2D.stopMusic();')
    expect(gen({ type: 'g2d:playNote', note: 'C', ms: 300 })).toBe('SZGame2D.playNote("C", 300);')
  })

  it('áudio sintetizado: funções exportadas e seguras sem AudioContext', () => {
    const api = loadRuntime()
    expect(typeof api.playFx).toBe('function')
    expect(typeof api.playNote).toBe('function')
    expect(typeof api.playMusic).toBe('function')
    expect(typeof api.stopMusic).toBe('function')
    expect(typeof api.playJump).toBe('function')
    // Sem AudioContext no ambiente de teste, são no-op silencioso (não lançam).
    expect(() => {
      api.playFx('coin')
      api.playNote('C', 100)
      api.playMusic('happy')
      api.stopMusic()
      api.playJump()
    }).not.toThrow()
  })

  it('áudio espera o primeiro gesto antes de criar AudioContext', () => {
    const listeners: Record<string, Array<(event: unknown) => void>> = {}
    let contextsCreated = 0
    class FakeAudioContext {
      state = 'suspended'
      constructor() {
        contextsCreated += 1
      }
      resume() {
        this.state = 'running'
      }
    }
    const win = {
      addEventListener(name: string, listener: (event: unknown) => void) {
        listeners[name] ??= []
        listeners[name].push(listener)
      },
      AudioContext: FakeAudioContext,
      SZGame2D: undefined,
    } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
    const api = (win as { SZGame2D: Engine }).SZGame2D

    api.playFx('coin')
    expect(contextsCreated).toBe(0)
    for (const listener of listeners.keydown ?? []) {
      listener({ key: 'ArrowRight', repeat: false })
    }
    expect(contextsCreated).toBe(1)
  })

  it('Tier 1: gerador de comandos (mira, vida, aparência, mundo, pausa)', () => {
    expect(gen({ type: 'g2d:aimAt', spriteVar: 'nave', targetVar: 'inimigo' })).toBe(
      'SZGame2D.aimAt(nave, inimigo);',
    )
    expect(
      gen({ type: 'g2d:moveToward', spriteVar: 'inimigo', targetVar: 'jogador', speed: 2 }),
    ).toBe('SZGame2D.moveToward(inimigo, jogador, 2);')
    expect(gen({ type: 'g2d:setHealth', spriteVar: 'jogador', amount: 3 })).toBe(
      'SZGame2D.setHealth(jogador, 3);',
    )
    expect(gen({ type: 'g2d:changeHealth', spriteVar: 'jogador', delta: -1 })).toBe(
      'SZGame2D.changeHealth(jogador, -1);',
    )
    expect(
      gen({
        type: 'g2d:damageSprite',
        spriteVar: 'jogador',
        amount: 1,
        invincibilityFrames: 45,
      } as unknown as JSStatement),
    ).toBe('SZGame2D.damageSprite(jogador, 1, 45);')
    expect(
      gen({
        type: 'g2d:setStageDescription',
        description: 'Pegue as moedas. Use as setas.',
      } as unknown as JSStatement),
    ).toBe('SZGame2D.setStageDescription("Pegue as moedas. Use as setas.");')
    expect(
      gen({
        type: 'g2d:setGravity',
        value: { type: 'g2d:getMaxHealth', spriteVar: 'jogador' },
      } as unknown as JSStatement),
    ).toBe('SZGame2D.setGravity(SZGame2D.getMaxHealth(jogador));')
    expect(
      gen({
        type: 'g2d:setGravity',
        value: { type: 'g2d:healthDepleted', spriteVar: 'jogador' },
      } as unknown as JSStatement),
    ).toBe('SZGame2D.setGravity(SZGame2D.healthDepleted(jogador));')
    expect(
      gen({
        type: 'g2d:setGravity',
        value: { type: 'g2d:isInvincible', spriteVar: 'jogador' },
      } as unknown as JSStatement),
    ).toBe('SZGame2D.setGravity(SZGame2D.isInvincible(jogador));')
    expect(gen({ type: 'g2d:flipSprite', spriteVar: 'jogador', dir: 'left' })).toBe(
      'SZGame2D.flipSprite(jogador, "left");',
    )
    expect(gen({ type: 'g2d:setOpacity', spriteVar: 'jogador', percent: 50 })).toBe(
      'SZGame2D.setOpacity(jogador, 50);',
    )
    expect(gen({ type: 'g2d:setSize', spriteVar: 'jogador', w: 40, h: 40 })).toBe(
      'SZGame2D.setSize(jogador, 40, 40);',
    )
    expect(gen({ type: 'g2d:scaleSprite', spriteVar: 'jogador', factor: 1.5 })).toBe(
      'SZGame2D.scaleSprite(jogador, 1.5);',
    )
    expect(gen({ type: 'g2d:wrapEdges', spriteVar: 'nave' })).toBe('SZGame2D.wrapEdges(nave);')
    expect(gen({ type: 'g2d:pruneOld', groupVar: 'tiros', seconds: 2 })).toBe(
      'SZGame2D.pruneOld(tiros, 2);',
    )
    expect(gen({ type: 'g2d:pauseGame' })).toBe('SZGame2D.pauseGame();')
    expect(gen({ type: 'g2d:resumeGame' })).toBe('SZGame2D.resumeGame();')
  })

  it('Tier 1: runtime de contas/vida/recarga/pausa (lógica pura)', () => {
    const api = loadRuntime()
    const a = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    const b = api.createSprite({ x: 30, y: 0, w: 10, h: 10 })
    expect(api.distance(a, b)).toBe(30)
    expect(api.angleTo(a, b)).toBeCloseTo(90) // b está à direita de a → 90°
    api.setHealth(a, 3)
    expect(api.getHealth(a)).toBe(3)
    api.changeHealth(a, -1)
    expect(api.getHealth(a)).toBe(2)
    expect(api.hasHealth(a)).toBe(true)
    api.changeHealth(a, -5)
    expect(api.getHealth(a)).toBe(0) // não passa de 0
    expect(api.hasHealth(a)).toBe(false)
    expect(api.randomBetween(3, 3)).toBe(3)
    expect(api.isPaused()).toBe(false)
    api.pauseGame()
    expect(api.isPaused()).toBe(true)
    api.resumeGame()
    expect(api.isPaused()).toBe(false)
    expect(api.cooldownReady(a, 3)).toBe(true) // 1ª vez: pronto
    expect(api.cooldownReady(a, 3)).toBe(false) // recarregando
    expect(api.cooldownReady(a, 3)).toBe(false) // recarregando
    expect(api.cooldownReady(a, 3)).toBe(true) // exatamente 3 chamadas depois
    api.flipSprite(a, 'left')
    expect(a.facing).toBe(-1)
    api.scaleSprite(b, 2)
    expect(b.w).toBe(20)
  })

  it('vida mantém valores inteiros no intervalo e não inventa vida antes da inicialização', () => {
    const api = loadRuntime()
    const sprite = api.createSprite({})
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(api.healthDepleted(sprite)).toBe(false)
      expect(api.healthDepleted(sprite)).toBe(false)
      api.changeHealth(sprite, -1)
      expect(sprite.hp).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('Dar ao sprite')

      api.setHealth(sprite, 3.9)
      expect(api.getHealth(sprite)).toBe(3)
      expect(api.getMaxHealth(sprite)).toBe(3)
      api.changeHealth(sprite, Number.NaN)
      expect(api.getHealth(sprite)).toBe(3)
      api.changeHealth(sprite, -99)
      expect(api.getHealth(sprite)).toBe(0)
      expect(api.healthDepleted(sprite)).toBe(true)

      api.setHealth(sprite, -4)
      expect(api.getHealth(sprite)).toBe(0)
      expect(api.getMaxHealth(sprite)).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('dano genérico aplica quadros de invencibilidade e evita drenar vida a cada quadro', () => {
    const api = loadRuntime()
    const sprite = api.createSprite({})
    api.setHealth(sprite, 4)

    api.damageSprite(sprite, 1, 30)
    expect(api.getHealth(sprite)).toBe(3)
    expect(sprite.blinkFrames).toBe(30)

    api.damageSprite(sprite, 1, 30)
    expect(api.getHealth(sprite)).toBe(3)

    sprite.blinkFrames = 0
    api.damageSprite(sprite, 2, 12)
    expect(api.getHealth(sprite)).toBe(1)
    expect(sprite.blinkFrames).toBe(12)
  })

  it('isInvincible espelha exatamente quando damageSprite ignora o próximo dano', () => {
    const api = loadRuntime()
    const sprite = api.createSprite({})
    api.setHealth(sprite, 3)
    expect(api.isInvincible(sprite)).toBe(false)

    api.damageSprite(sprite, 1, 45)
    expect(api.getHealth(sprite)).toBe(2)
    expect(api.isInvincible(sprite)).toBe(true)

    api.damageSprite(sprite, 1, 45)
    expect(api.getHealth(sprite)).toBe(2)

    sprite.blinkFrames = 0
    expect(api.isInvincible(sprite)).toBe(false)

    api.blink(sprite, 12)
    expect(api.isInvincible(sprite)).toBe(true)
  })

  it('cada bloco de recarga mantém seu próprio contador no mesmo sprite', () => {
    const api = loadRuntime()
    const sprite = api.createSprite({})

    expect(api.cooldownReady(sprite, 3, 'tiro')).toBe(true)
    expect(api.cooldownReady(sprite, 5, 'pulo')).toBe(true)
    expect(api.cooldownReady(sprite, 3, 'tiro')).toBe(false)
    expect(api.cooldownReady(sprite, 5, 'pulo')).toBe(false)
  })

  it('o gerador passa uma chave estável do bloco para a recarga', () => {
    const code = gen({
      type: 'g2d:setGravity',
      value: {
        type: 'g2d:cooldownReady',
        spriteVar: 'jogador',
        frames: 20,
        __id: 'recarga-tiro',
      },
    } as unknown as JSStatement)
    expect(code).toBe('SZGame2D.setGravity(SZGame2D.cooldownReady(jogador, 20, "recarga-tiro"));')
    expect(parseJS(code)).toMatchObject([
      {
        type: 'g2d:setGravity',
        value: {
          type: 'g2d:cooldownReady',
          spriteVar: 'jogador',
          __id: 'recarga-tiro',
        },
      },
    ])
  })

  it('Tier 2: gerador de comandos (câmera, mapa, ordem, depuração)', () => {
    expect(gen({ type: 'g2d:cameraFollow', spriteVar: 'jogador', worldW: 800, worldH: 600 })).toBe(
      'SZGame2D.cameraFollow(jogador, 800, 600);',
    )
    expect(gen({ type: 'g2d:setCamera', x: 10, y: 20 })).toBe('SZGame2D.setCamera(10, 20);')
    expect(gen({ type: 'g2d:breakTile', mapVar: 'mapa', spriteVar: 'jogador' })).toBe(
      'SZGame2D.breakTileAtSprite(mapa, jogador);',
    )
    expect(gen({ type: 'g2d:setTile', mapVar: 'mapa', index: 1, spriteVar: 'jogador' })).toBe(
      'SZGame2D.setTileAtSprite(mapa, 1, jogador);',
    )
    expect(gen({ type: 'g2d:bringToFront', spriteVar: 'jogador', groupVar: 'inimigos' })).toBe(
      'SZGame2D.bringToFront(inimigos, jogador);',
    )
    expect(gen({ type: 'g2d:sendToBack', spriteVar: 'jogador', groupVar: 'inimigos' })).toBe(
      'SZGame2D.sendToBack(inimigos, jogador);',
    )
    expect(gen({ type: 'g2d:drawHitbox', spriteVar: 'jogador' })).toBe(
      'SZGame2D.drawHitbox(jogador);',
    )
    expect(gen({ type: 'g2d:showFps', x: 8, y: 20 })).toBe('SZGame2D.showFps(8, 20);')
  })

  it('Tier 2: runtime de câmera (set/leitura)', () => {
    const api = loadRuntime()
    expect(api.cameraX()).toBe(0)
    api.setCamera(120, 40)
    expect(api.cameraX()).toBe(120)
    expect(api.cameraY()).toBe(40)
  })

  it('os novos tipos estão em G2D_STATEMENT_TYPES e validam no schema', () => {
    for (const t of [
      'g2d:setGravity',
      'g2d:applyVelocity',
      'g2d:bounceOnEdges',
      'g2d:circleCollides',
      'g2d:playSound',
      'g2d:playFx',
      'g2d:playMusic',
      'g2d:stopMusic',
      'g2d:playNote',
      'g2d:aimAt',
      'g2d:moveToward',
      'g2d:setHealth',
      'g2d:changeHealth',
      'g2d:flipSprite',
      'g2d:setOpacity',
      'g2d:setSize',
      'g2d:scaleSprite',
      'g2d:wrapEdges',
      'g2d:pruneOld',
      'g2d:pauseGame',
      'g2d:resumeGame',
      'g2d:cameraFollow',
      'g2d:setCamera',
      'g2d:breakTile',
      'g2d:setTile',
      'g2d:bringToFront',
      'g2d:sendToBack',
      'g2d:drawHitbox',
      'g2d:showFps',
      'g2d:onPointer',
    ]) {
      expect(G2D_STATEMENT_TYPES.has(t)).toBe(true)
    }
    const parsed = SZIRSchema.safeParse({
      html: [],
      css: [],
      js: [
        { type: 'g2d:setGravity', value: 0.5 },
        { type: 'g2d:onPointer', xName: 'px', yName: 'py', body: [] },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    })
    expect(parsed.success).toBe(true)
  })
})

describe('game-2d — runtime de física', () => {
  // Os dois blocos eram UM só ("Aplicar velocidade e gravidade") até 08/2026.
  // Separados, cada um faz uma coisa e o par reproduz a física de antes — desde
  // que a gravidade venha DEPOIS (o applyVelocity move com o vy do quadro
  // anterior; é Euler explícito).
  it('applyVelocity SÓ move — não soma mais gravidade nenhuma', () => {
    const api = loadRuntime()
    api.setGravity(1)
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    s.vx = 2
    api.applyVelocity(s)
    expect(s.x).toBe(2)
    expect(s.vy).toBe(0)
    api.applyVelocity(s)
    expect(s.y).toBe(0)
    expect(s.vy).toBe(0)
  })

  it('applyGravity puxa pelo valor do MUNDO, e o par reproduz a física antiga', () => {
    const api = loadRuntime()
    api.setGravity(1)
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    s.vx = 2
    api.applyVelocity(s)
    api.applyGravity(s)
    expect(s.x).toBe(2)
    expect(s.vy).toBe(1)
    api.applyVelocity(s)
    api.applyGravity(s)
    expect(s.y).toBe(1)
    expect(s.vy).toBe(2)
  })

  it('sem ninguém declarar a gravidade do mundo, o bloco vale 0.6', () => {
    const api = loadRuntime()
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    api.applyGravity(s)
    expect(s.vy).toBeCloseTo(0.6, 10)
  })

  // ⭐ O grupo NÃO herda o 0.6: ele soma a gravidade CRUA do mundo. Senão todo
  // grupo de todo jogo que nunca declarou gravidade começaria a cair sozinho
  // (no "Corre, Dino!" os cactos sumiriam pelo rodapé, sem erro na tela).
  it('updateGroup só faz cair quando a gravidade do mundo foi declarada', () => {
    const api = loadRuntime()
    const grupo = api.createGroup()
    const s = api.createSprite({ x: 0, y: 0, w: 10, h: 10 })
    grupo.items.push(s)

    api.updateGroup(grupo)
    expect(s.vy).toBe(0)

    api.setGravity(0.5)
    api.updateGroup(grupo)
    expect(s.vy).toBe(0.5)
  })

  it('bounceOnEdges quica e inverte a velocidade na borda', () => {
    const api = loadRuntime()
    const ctx = { canvas: { width: 100, height: 100 } }
    const s = api.createSprite({ x: -5, y: 50, w: 10, h: 10 })
    s.vx = -3
    api.bounceOnEdges(s, ctx)
    expect(s.x).toBe(0)
    expect(s.vx).toBe(3)
  })

  it('bounceOnEdges e wrapEdges usam as bordas visíveis da câmera', () => {
    for (const canvas of Array.from(document.querySelectorAll('canvas'))) canvas.remove()
    const stage = document.createElement('canvas')
    stage.width = 100
    stage.height = 80
    document.body.appendChild(stage)
    const api = loadRuntime()
    const ctx = { canvas: { width: 100, height: 80 } }
    api.setCamera(1000, 500)

    const bouncing = api.createSprite({ x: 990, y: 510, w: 10, h: 10 })
    bouncing.vx = -3
    api.bounceOnEdges(bouncing, ctx)
    expect(bouncing.x).toBe(1000)
    expect(bouncing.vx).toBe(3)

    const wrapping = api.createSprite({ x: 980, y: 510, w: 10, h: 10 })
    api.wrapEdges(wrapping)
    expect(wrapping.x).toBe(1100)
    stage.remove()
  })

  it('circleCollides detecta proximidade por círculo', () => {
    const api = loadRuntime()
    const a = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const b = api.createSprite({ x: 5, y: 5, w: 20, h: 20 })
    const c = api.createSprite({ x: 100, y: 100, w: 20, h: 20 })
    expect(api.circleCollides(a, b)).toBe(true)
    expect(api.circleCollides(a, c)).toBe(false)
  })

  it('touches: verdadeiro só quando os retângulos se sobrepõem (reporter de colisão)', () => {
    const api = loadRuntime()
    const a = api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const over = api.createSprite({ x: 10, y: 10, w: 20, h: 20 }) // sobrepõe a
    const apart = api.createSprite({ x: 100, y: 0, w: 20, h: 20 }) // longe
    expect(api.touches(a, over)).toBe(true)
    expect(api.touches(a, apart)).toBe(false)
    expect(api.touches(over, a)).toBe(true) // simétrico: a ordem não muda a resposta
  })

  it('randomChance: 0% nunca, 100% sempre e respeita o limiar', () => {
    const random = spyOn(Math, 'random')
    try {
      const api = loadRuntime()
      random.mockReturnValue(0.99)
      expect(api.randomChance(0)).toBe(false) // 0%: nunca
      random.mockReturnValue(0)
      expect(api.randomChance(100)).toBe(true) // 100%: sempre
      // 30%: verdadeiro quando o sorteio (× 100) fica ABAIXO de 30.
      random.mockReturnValue(0.2)
      expect(api.randomChance(30)).toBe(true) // 20 < 30
      random.mockReturnValue(0.3)
      expect(api.randomChance(30)).toBe(false) // 30 < 30 = falso
    } finally {
      random.mockRestore()
    }
  })

  it('randomChance limita entradas fora de 0..100 sem sortear à toa', () => {
    const random = spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('não deveria sortear nos limites determinísticos')
    })
    try {
      const api = loadRuntime()
      expect(api.randomChance(-20)).toBe(false)
      expect(api.randomChance(150)).toBe(true)
      expect(random).not.toHaveBeenCalled()
    } finally {
      random.mockRestore()
    }
  })

  it('onPointer registra sem erro e expõe o estado pointer', () => {
    const api = loadRuntime()
    expect(typeof api.onPointer).toBe('function')
    expect(() => api.onPointer(() => {})).not.toThrow()
    expect(api.pointer).toMatchObject({ x: 0, y: 0, down: false })
  })

  it('geometria do sprite: posição/tamanho/centro (com a metade embutida)', () => {
    const api = loadRuntime()
    const s = api.createSprite({ x: 10, y: 20, w: 40, h: 60 })
    expect(api.spriteX(s)).toBe(10)
    expect(api.spriteY(s)).toBe(20)
    expect(api.spriteW(s)).toBe(40)
    expect(api.spriteH(s)).toBe(60)
    expect(api.centerX(s)).toBe(30) // 10 + 40/2
    expect(api.centerY(s)).toBe(50) // 20 + 60/2
  })

  it('randomX/randomY estão expostos e devolvem um número de posição (>= 0)', () => {
    const api = loadRuntime()
    expect(typeof api.randomX).toBe('function')
    expect(typeof api.randomY).toBe('function')
    for (let i = 0; i < 10; i++) {
      const x = api.randomX()
      const y = api.randomY()
      expect(Number.isFinite(x)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(y)).toBe(true)
      expect(y).toBeGreaterThanOrEqual(0)
    }
  })

  it('randomX/randomY usam o tamanho REAL do canvas (dinâmico, não um valor fixo)', () => {
    // Um canvas BEM grande: se a largura fosse fixa (ex.: 350), os sorteios nunca
    // passariam dela. Como usa o tamanho real, eles chegam perto de 800/600.
    for (const c of Array.from(document.querySelectorAll('canvas'))) c.remove()
    const big = document.createElement('canvas')
    big.width = 800
    big.height = 600
    document.body.appendChild(big)
    try {
      const api = loadRuntime()
      let maxX = 0
      let maxY = 0
      for (let i = 0; i < 300; i++) {
        maxX = Math.max(maxX, api.randomX())
        maxY = Math.max(maxY, api.randomY())
      }
      // Nunca sai do canvas…
      expect(maxX).toBeLessThanOrEqual(800)
      expect(maxY).toBeLessThanOrEqual(600)
      // …e CLARAMENTE acompanha a largura/altura real (passa de 350) — é dinâmico.
      expect(maxX).toBeGreaterThan(350)
      expect(maxY).toBeGreaterThan(350)
    } finally {
      big.remove()
    }
  })

  it('randomX/randomY sorteiam dentro do viewport deslocado da câmera', () => {
    const random = spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      const api = loadRuntime()
      api.setCamera(1000, 500)
      expect(api.randomX()).toBeGreaterThanOrEqual(1000)
      expect(api.randomY()).toBeGreaterThanOrEqual(500)
    } finally {
      random.mockRestore()
    }
  })

  it('a explosão se desenha SOZINHA no gameLoop (sem precisar do bloco de partículas)', () => {
    // ctx falso que conta os desenhos de partícula (fillRect).
    let fillRects = 0
    const fakeCtx = {
      canvas: { width: 400, height: 300 },
      save() {},
      restore() {},
      translate() {},
      fillRect() {
        fillRects++
      },
    }
    Object.defineProperty(fakeCtx, 'globalAlpha', { set() {} })
    Object.defineProperty(fakeCtx, 'fillStyle', { set() {} })

    for (const c of Array.from(document.querySelectorAll('canvas'))) c.remove()
    const canvas = document.createElement('canvas')
    ;(canvas as unknown as { getContext: () => unknown }).getContext = () => fakeCtx
    document.body.appendChild(canvas)

    // RAF controlado: guarda o tick para rodarmos UM quadro na mão.
    const captured: { fn: (() => void) | null } = { fn: null }
    const raf = (cb: () => void): number => {
      captured.fn = cb
      return 1
    }
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, raf)
    const api = (
      win as {
        SZGame2D: {
          gameLoop: (fn: () => void) => void
          explodeSprite: (s: unknown, c: string) => void
          createSprite: (o: object) => unknown
        }
      }
    ).SZGame2D

    // O aluno SÓ solta a explosão no quadro — NÃO usa "atualizar e desenhar as partículas".
    api.gameLoop(() => {
      api.explodeSprite(api.createSprite({ x: 100, y: 100, w: 20, h: 20 }), '#ffffff')
    })
    expect(captured.fn).not.toBeNull()
    captured.fn?.() // roda um quadro

    // As partículas da explosão foram desenhadas AUTOMATICAMENTE.
    expect(fillRects).toBeGreaterThan(0)
    canvas.remove()
  })

  it('"Pausar o jogo" CONGELA o gameLoop; "Continuar o jogo" descongela', () => {
    const captured: { fn: (() => void) | null } = { fn: null }
    const raf = (cb: () => void): number => {
      captured.fn = cb
      return 1
    }
    const win = { addEventListener() {}, SZGame2D: undefined } as unknown as Record<string, unknown>
    new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, raf)
    const api = (
      win as {
        SZGame2D: {
          gameLoop: (fn: () => void) => void
          pauseGame: () => void
          resumeGame: () => void
        }
      }
    ).SZGame2D

    let frames = 0
    api.gameLoop(() => {
      frames++
    })
    captured.fn?.() // quadro 1 roda
    expect(frames).toBe(1)

    api.pauseGame()
    captured.fn?.() // pausado → o quadro do aluno NÃO roda
    captured.fn?.()
    expect(frames).toBe(1)

    api.resumeGame()
    captured.fn?.() // descongelou → roda de novo
    expect(frames).toBe(2)
  })
})
