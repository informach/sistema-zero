import { describe, expect, it } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * ⭐ A REDE QUE FALTAVA — testes que JOGAM (teclado + laço de quadros), não só
 * montam o SETUP. Os testes de runtime stubavam `addEventListener` como no-op, então
 * o caminho de INPUT do jogador (setas, "quando apertar a tecla", perder o foco)
 * nunca rodava ponta a ponta. Este harness captura os listeners de VERDADE e
 * dispara eventos, drivando os DOIS trilhos de rAF do motor (o "a cada quadro" e o
 * "quando encostar") por quadro — provando os fixes da R1 pela ótica da criança.
 */

type Listener = (ev: unknown) => void

interface Sprite {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
}
type Fn = (...args: unknown[]) => unknown
interface Api {
  keys: { left: boolean; right: boolean; up: boolean; down: boolean }
  createSprite: (o: Partial<Sprite> & { color?: string }) => Sprite
  gameLoop: (fn: () => void) => void
  topDown: (s: Sprite, speed: number) => void
  onKey: (key: string, fn: () => void) => void
  onOverlap: (getA: () => unknown, getB: () => unknown, fn: () => void) => void
  createGroup: () => { items: Sprite[] }
  spawn: (g: { items: Sprite[] }, o: Partial<Sprite> & { color?: string }) => Sprite | null
  removeFromGroup: (g: { items: Sprite[] }, s: Sprite) => void
  overlapGroups: (
    a: { items: Sprite[] },
    b: { items: Sprite[] },
    fn: (a: Sprite, b: Sprite) => void,
  ) => void
  countGroup: (g: { items: Sprite[] }) => number
  pauseGame: Fn
  resumeGame: Fn
  isPaused: () => boolean
}

interface Harness {
  api: Api
  fire: (name: string, ev?: unknown) => void
  nextFrame: (ts: number) => void
}

function loadRuntime(): Harness {
  const listeners: Record<string, Listener[]> = {}
  const rafQueue: Array<{ id: number; cb: (ts: number) => void }> = []
  const canceledFrames = new Set<number>()
  let nextFrameId = 1
  const clock = { value: 0 }
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => clock.value },
    devicePixelRatio: 1,
    SZGame2D: undefined,
  } as unknown as Record<string, unknown>
  const raf = (cb: (ts: number) => void) => {
    const id = nextFrameId++
    rafQueue.push({ id, cb })
    return id
  }
  const cancelRaf = (id: number) => canceledFrames.add(id)
  new Function('window', 'requestAnimationFrame', 'cancelAnimationFrame', gameTwoDRuntime)(
    win,
    raf,
    cancelRaf,
  )
  const api = win.SZGame2D as unknown as Api
  if (!api) throw new Error('runtime não montou window.SZGame2D')
  return {
    api,
    fire: (name, ev = {}) => {
      for (const fn of [...(listeners[name] ?? [])]) fn(ev)
    },
    // ⚠️ O motor tem DOIS trilhos de rAF (gameLoop + overlapTick). Um `shift()`
    // faria um deles roubar o quadro do outro; drenamos um SNAPSHOT da fila para
    // rodar os dois por quadro (cada um re-agenda o próprio).
    nextFrame: (ts) => {
      clock.value = ts
      const batch = rafQueue.splice(0)
      const active = batch.filter((frame) => !canceledFrames.has(frame.id))
      if (!active.length) {
        if (api.isPaused()) return
        throw new Error('nenhum quadro agendado')
      }
      for (const frame of active) frame.cb(ts)
    },
  }
}

describe('g2d — JOGAR de verdade (teclado + quadros)', () => {
  it('as setas MOVEM o sprite (topDown lê keys), e soltar PARA', () => {
    const h = loadRuntime()
    const heroi = h.api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    h.api.gameLoop(() => h.api.topDown(heroi, 5))
    h.fire('keydown', { key: 'ArrowRight' })
    for (let t = 1; t <= 3; t++) h.nextFrame(t * 17)
    expect(heroi.x).toBe(15) // 3 quadros × 5
    h.fire('keyup', { key: 'ArrowRight' })
    const parou = heroi.x
    for (let t = 4; t <= 6; t++) h.nextFrame(t * 17)
    expect(heroi.x).toBe(parou) // sem tecla, não anda mais
  })

  it('A2: segurar a tecla NÃO metralha o "quando apertar" (e.repeat ignorado)', () => {
    const h = loadRuntime()
    let pulos = 0
    h.api.onKey('Space', () => {
      pulos += 1
    })
    h.fire('keydown', { key: 'Space', repeat: false })
    expect(pulos).toBe(1)
    h.fire('keydown', { key: 'Space', repeat: true }) // auto-repeat do SO
    h.fire('keydown', { key: 'Space', repeat: true })
    expect(pulos).toBe(1) // ainda 1 — a repetição não conta
    h.fire('keyup', { key: 'Space' })
    h.fire('keydown', { key: 'Space', repeat: false }) // novo toque
    expect(pulos).toBe(2)
  })

  it('A1: "quando apertar" dentro de "a cada quadro" é recusado pelo runtime manual', () => {
    const h = loadRuntime()
    let disparos = 0
    // A IR/Blockly já barra esta montagem. O runtime também protege código manual
    // e não registra silenciosamente um evento no contexto errado.
    h.api.gameLoop(() => {
      h.api.onKey('Space', () => {
        disparos += 1
      })
    })
    for (let t = 1; t <= 60; t++) h.nextFrame(t * 16)
    h.fire('keydown', { key: 'Space', repeat: false })
    expect(disparos).toBe(0)
  })

  it('A5: perder o foco (blur) solta as teclas seguradas', () => {
    const h = loadRuntime()
    const heroi = h.api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    h.api.gameLoop(() => h.api.topDown(heroi, 5))
    h.fire('keydown', { key: 'ArrowRight' })
    h.nextFrame(16)
    expect(h.api.keys.right).toBe(true)
    h.fire('blur') // troca de aba: o keyup nunca chega
    expect(h.api.keys.right).toBe(false)
    const x = heroi.x
    h.nextFrame(32)
    expect(heroi.x).toBe(x) // não anda mais sozinho
  })

  it('A6: "Pausar o jogo" congela o "quando encostar" e o "a cada quadro"', () => {
    const h = loadRuntime()
    const a = h.api.createSprite({ x: 0, y: 0, w: 20, h: 20 })
    const b = h.api.createSprite({ x: 100, y: 0, w: 20, h: 20 }) // longe de A
    let toques = 0
    let quadros = 0
    h.api.onOverlap(
      () => a,
      () => b,
      () => {
        toques += 1
      },
    )
    h.api.gameLoop(() => {
      quadros += 1
    })
    h.nextFrame(16) // rodando: nenhum toque (estão longe)
    expect(toques).toBe(0)
    h.api.pauseGame()
    const quadrosNaPausa = quadros
    b.x = 5 // agora encostam...
    h.nextFrame(32)
    h.nextFrame(48)
    expect(toques).toBe(0) // ...mas pausado NÃO dispara o "quando encostar"
    expect(quadros).toBe(quadrosNaPausa) // nem roda o "a cada quadro"
    h.api.resumeGame()
    h.nextFrame(64)
    expect(toques).toBe(1) // ao despausar, aí sim (borda de início de contato)
  })

  it('A3: um tiro derruba UM inimigo por quadro (não perfura os encostados)', () => {
    const h = loadRuntime()
    const tiros = h.api.createGroup()
    const inimigos = h.api.createGroup()
    h.api.spawn(tiros, { x: 10, y: 10, w: 8, h: 8 })
    h.api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20 })
    h.api.spawn(inimigos, { x: 10, y: 10, w: 20, h: 20 })
    h.api.gameLoop(() => {
      h.api.overlapGroups(tiros, inimigos, (tiro, inimigo) => {
        h.api.removeFromGroup(tiros, tiro)
        h.api.removeFromGroup(inimigos, inimigo)
      })
    })
    h.nextFrame(16)
    expect(h.api.countGroup(inimigos)).toBe(1) // só um caiu
    expect(h.api.countGroup(tiros)).toBe(0)
  })
})
