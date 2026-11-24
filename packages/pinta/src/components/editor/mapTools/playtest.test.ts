import { describe, expect, it } from 'bun:test'
import {
  type PlaytestArea,
  type PlaytestState,
  type PlaytestWorld,
  playtestBody,
  playtestCamera,
  playtestInput,
  playtestKey,
  playtestStart,
  stepPlaytest,
} from './playtest'

const T = 16
/** Mundo de arte: `#` parede, `.` livre. Fora do mapa é parede. */
function mundo(art: string[], extra: Partial<PlaytestWorld> = {}): PlaytestWorld {
  return {
    tileSize: T,
    solidAt: (x, y) => {
      const col = Math.floor(x / T),
        row = Math.floor(y / T)
      return (art[row]?.[col] ?? '#') === '#'
    },
    spawn: { x: 1.5 * T, y: 1.5 * T },
    doors: [],
    hazards: [],
    ...extra,
  }
}
const area = (id: string, col: number, row: number, target?: string): PlaytestArea => ({
  id,
  name: id,
  target,
  contains: (x, y) => Math.floor(x / T) === col && Math.floor(y / T) === row,
})
const parado = { x: 0, y: 0, jump: false }
/** Segura as teclas por `ms`, em quadros de 16 ms. */
function segurar(
  state: PlaytestState,
  input: typeof parado,
  ms: number,
  world: PlaytestWorld,
  view: 'top' | 'side',
) {
  let s = state,
    event = null as ReturnType<typeof stepPlaytest>['event']
  for (let t = 0; t < ms && !event; t += 16) {
    const out = stepPlaytest(s, input, 16, world, view)
    s = out.state
    event = out.event
  }
  return { state: s, event }
}
const SALA = ['#######', '#.....#', '#.....#', '#.....#', '#######']

describe('teste com personagem: a conta', () => {
  it('anda enquanto a tecla está segurada e para encostado na parede', () => {
    const w = mundo(SALA)
    const { hw } = playtestBody(T, 'top')
    const meio = segurar(playtestStart(w), { ...parado, x: 1 }, 160, w, 'top').state
    expect(meio.x).toBeGreaterThan(1.5 * T + 10)
    expect(meio.y).toBe(1.5 * T)
    const fim = segurar(playtestStart(w), { ...parado, x: 1 }, 3000, w, 'top').state
    // A parede da direita começa em 6 peças: o corpo fica encostado, sem entrar (a folga é
    // de um centésimo de pixel).
    expect(fim.x).toBeLessThanOrEqual(6 * T - hw + 0.01)
    expect(fim.x).toBeGreaterThan(6 * T - hw - 0.2)
    expect(fim.vx).toBe(0)
  })
  it('na diagonal contra a parede, escorrega ao longo dela', () => {
    const w = mundo(SALA)
    // Para cima e para a direita, já encostado no teto: sobe nada, mas anda para a direita.
    const topo = segurar(playtestStart(w), { ...parado, y: -1 }, 1000, w, 'top').state
    const depois = segurar(topo, { x: 1, y: -1, jump: false }, 320, w, 'top').state
    expect(depois.y).toBeCloseTo(topo.y, 1)
    expect(depois.x).toBeGreaterThan(topo.x + 10)
  })
  it('na diagonal livre não anda mais rápido que em linha reta', () => {
    const w = mundo(['#########', '#.......#', '#.......#', '#.......#', '#.......#', '#########'])
    const reta = segurar(playtestStart(w), { ...parado, x: 1 }, 160, w, 'top').state
    const diagonal = segurar(playtestStart(w), { x: 1, y: 1, jump: false }, 160, w, 'top').state
    const andou = Math.hypot(diagonal.x - 1.5 * T, diagonal.y - 1.5 * T)
    expect(andou).toBeCloseTo(reta.x - 1.5 * T, 1)
  })
  it('vista de lado: cai, pousa no chão e só então pode pular', () => {
    const w = mundo(SALA)
    const { hh } = playtestBody(T, 'side')
    const noAr = stepPlaytest(playtestStart(w), { ...parado, jump: true }, 16, w, 'side').state
    // No ar, o pulo não vale: continua caindo.
    expect(noAr.vy).toBeGreaterThan(0)
    const chao = segurar(playtestStart(w), parado, 2000, w, 'side').state
    expect(chao.onGround).toBe(true)
    expect(chao.vy).toBe(0)
    expect(chao.y).toBeLessThanOrEqual(4 * T - hh + 0.01)
    expect(chao.y).toBeGreaterThan(4 * T - hh - 0.2)
    const pulo = stepPlaytest(chao, { ...parado, jump: true }, 16, w, 'side').state
    expect(pulo.vy).toBeLessThan(0)
    expect(pulo.onGround).toBe(false)
    // Sobe, bate ou para, e volta para o mesmo chão.
    const volta = segurar(pulo, parado, 3000, w, 'side').state
    expect(volta.onGround).toBe(true)
    expect(volta.y).toBeCloseTo(chao.y, 1)
  })
  it('vista de lado: bater a cabeça no teto para a subida', () => {
    const w = mundo(['#####', '#...#', '#####'], { spawn: { x: 2.5 * T, y: 1.5 * T } })
    const chao = segurar(playtestStart(w), parado, 500, w, 'side').state
    const sobe = segurar(chao, { ...parado, jump: true }, 64, w, 'side').state
    expect(sobe.y).toBeGreaterThanOrEqual(T + playtestBody(T, 'side').hh - 0.01)
  })
  it('entrar na porta avisa qual é o destino', () => {
    const w = mundo(SALA, { doors: [area('porta', 4, 1, 'fase-2')] })
    const out = segurar(playtestStart(w), { ...parado, x: 1 }, 3000, w, 'top')
    expect(out.event?.kind).toBe('door')
    expect(out.event?.area.target).toBe('fase-2')
  })
  it('lugar perigoso devolve o personagem ao começo', () => {
    const w = mundo(SALA, { hazards: [area('lava', 3, 1)] })
    const out = segurar(playtestStart(w), { ...parado, x: 1 }, 3000, w, 'top')
    expect(out.event?.kind).toBe('hazard')
    expect(out.state).toEqual(playtestStart(w))
  })
  it('um quadro muito longo não atravessa a parede', () => {
    const w = mundo(SALA)
    const s = stepPlaytest(playtestStart(w), { ...parado, x: 1 }, 5000, w, 'top').state
    expect(s.x).toBeLessThan(1.5 * T + 6 * T * 0.06)
  })
})

describe('câmera e teclas', () => {
  it('a câmera segue o personagem e para na borda do mapa', () => {
    const view = { width: 100, height: 80 },
      map = { width: 400, height: 300 }
    expect(playtestCamera({ x: 10, y: 10 }, view, map)).toEqual({ x: 0, y: 0 })
    expect(playtestCamera({ x: 200, y: 150 }, view, map)).toEqual({ x: 150, y: 110 })
    expect(playtestCamera({ x: 399, y: 299 }, view, map)).toEqual({ x: 300, y: 220 })
    // Mapa menor que a tela: fica no canto, sem número negativo.
    expect(playtestCamera({ x: 20, y: 20 }, view, { width: 50, height: 40 })).toEqual({
      x: 0,
      y: 0,
    })
  })
  it('setas e W, A, S, D andam; espaço pula só na vista de lado', () => {
    expect(playtestInput(new Set(['a']), 'top')).toEqual({ x: -1, y: 0, jump: false })
    expect(playtestInput(new Set(['arrowright', 'w']), 'top')).toEqual({ x: 1, y: -1, jump: false })
    expect(playtestInput(new Set(['arrowleft', 'arrowright']), 'top').x).toBe(0)
    expect(playtestInput(new Set([' ']), 'top').jump).toBe(false)
    expect(playtestInput(new Set([' ']), 'side')).toEqual({ x: 0, y: 0, jump: true })
    expect(playtestInput(new Set(['arrowup', 's']), 'side')).toEqual({ x: 0, y: 0, jump: true })
    expect(playtestKey('ArrowLeft')).toBe('arrowleft')
    expect(playtestKey('D')).toBe('d')
    expect(playtestKey('Enter')).toBeNull()
  })
})
