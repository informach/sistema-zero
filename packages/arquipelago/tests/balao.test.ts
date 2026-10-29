import { describe, expect, test } from 'bun:test'
import {
  BALAO,
  criarVoo,
  DESCER_DO_BALAO,
  descerDoBalao,
  type EntradaDoVoo,
  passoDoBalao,
  podeDescerDoBalao,
  podeSubirNoBalao,
  subirNoBalao,
  type Voo,
} from '../src/sistemas/balao'
import type { Ponto } from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import {
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'

const dt = 1 / 60
/** O tampo das Nuvens no jogo (a ilha a 7 m, o tampo a 1 m no arquivo). */
const TAMPO = 8
const CASA = { x: 5.6, y: TAMPO, z: -8.4 }
const CENTRO = { x: 0, z: 0 }

function novoVoo(): Voo {
  return criarVoo(CASA, CENTRO, TAMPO)
}

/** A física de mentira: o chão segura os pés (em cima da ilha, no tampo; fora dela, nada). */
function chaoPadrao(x: number, z: number): number {
  return Math.hypot(x - CENTRO.x, z - CENTRO.z) <= BALAO.raioDoChao ? TAMPO : -100
}

/** Voa `segundos` com a mesma entrada; o corpo vai aonde o cesto pede, menos para dentro do chão. */
function voar(
  v: Voo,
  segundos: number,
  extra: Partial<EntradaDoVoo> = {},
  chao: (x: number, z: number) => number = chaoPadrao,
  aCada?: (v: Voo) => void,
) {
  const pes: Ponto = { ...v.pe }
  for (let t = 0; t < segundos; t += dt) {
    passoDoBalao(v, { dt, parado: false, subir: false, pedidoX: 0, pedidoZ: 0, pes, ...extra })
    pes.x = v.pe.x
    pes.z = v.pe.z
    pes.y = Math.max(v.pe.y, chao(v.pe.x, v.pe.z))
    aCada?.(v)
  }
  // O último passo da física ainda precisa chegar ao balão (o pouso é visto no passo seguinte).
  passoDoBalao(v, { dt, parado: true, subir: false, pedidoX: 0, pedidoZ: 0, pes })
}

function noVoo(): Voo {
  const v = novoVoo()
  subirNoBalao(v, { x: CASA.x + 1, y: TAMPO, z: CASA.z })
  voar(v, BALAO.embarque + 0.1)
  return v
}

describe('subir no balão', () => {
  test('só a pé, no chão, perto do cesto parado', () => {
    const v = novoVoo()
    expect(podeSubirNoBalao(v, { x: CASA.x + 1.5, y: TAMPO, z: CASA.z }, true)).toBe(true)
    expect(podeSubirNoBalao(v, { x: CASA.x + 1.7, y: TAMPO, z: CASA.z }, true)).toBe(false)
    expect(podeSubirNoBalao(v, { x: CASA.x + 1, y: TAMPO, z: CASA.z }, false)).toBe(false)
    expect(podeSubirNoBalao(v, { x: CASA.x + 1, y: TAMPO + 1, z: CASA.z }, true)).toBe(false)
    subirNoBalao(v, { x: CASA.x + 1, y: TAMPO, z: CASA.z })
    expect(podeSubirNoBalao(v, { x: CASA.x + 1, y: TAMPO, z: CASA.z }, true)).toBe(false)
  })

  test('o passo de entrar pula a borda do cesto e termina pousado no meio dele', () => {
    const v = novoVoo()
    subirNoBalao(v, { x: CASA.x + 1.2, y: TAMPO, z: CASA.z })
    let maisAlto = 0
    voar(v, BALAO.embarque + 0.05, {}, chaoPadrao, (b) => {
      if (b.fase === 'embarque') maisAlto = Math.max(maisAlto, b.pe.y - TAMPO)
    })
    expect(maisAlto).toBeGreaterThan(0.82)
    expect(v.fase).toBe('voo')
    expect(v.pousado).toBe(true)
    expect(v.pe.x).toBeCloseTo(CASA.x, 3)
    expect(v.pe.z).toBeCloseTo(CASA.z, 3)
    expect(podeDescerDoBalao(v)).toBe(true)
  })
})

describe('voar', () => {
  test('segurando o fogo sobe até 1,8 m/s; soltando, desce devagar até 0,7 m/s', () => {
    const v = noVoo()
    voar(v, 2, { subir: true })
    expect(v.pousado).toBe(false)
    expect(v.vel.y).toBeCloseTo(BALAO.subida.maxima, 5)
    const alto = v.pe.y
    // Soltando, o embalo acaba em pouco mais de 1 s e ele desce (ainda longe do chão).
    voar(v, 4)
    expect(v.vel.y).toBeCloseTo(-BALAO.descida.maxima, 5)
    expect(v.pe.y).toBeLessThan(alto)
  })

  test('o direcional empurra até 3 m/s, e sem ele o ar segura', () => {
    const v = noVoo()
    voar(v, 3, { subir: true })
    voar(v, 4, { subir: true, pedidoX: 1 })
    expect(Math.hypot(v.vel.x, v.vel.z)).toBeCloseTo(BALAO.lado.maxima, 3)
    const antes = v.vel.x
    voar(v, 0.8, { subir: true })
    expect(v.vel.x / antes).toBeGreaterThan(0.45)
    expect(v.vel.x / antes).toBeLessThan(0.55)
  })

  test('não passa do teto', () => {
    const v = noVoo()
    let maisAlto = 0
    voar(v, 40, { subir: true }, chaoPadrao, (b) => {
      maisAlto = Math.max(maisAlto, b.pe.y)
    })
    expect(maisAlto).toBeLessThanOrEqual(TAMPO + BALAO.teto + 1e-9)
    expect(v.pe.y).toBeCloseTo(TAMPO + BALAO.teto, 5)
  })

  test('passando do raio, a brisa mansa traz de volta sem castigo', () => {
    const v = noVoo()
    voar(v, 4, { subir: true })
    let longe = 0
    voar(v, 40, { subir: true, pedidoZ: -1 }, chaoPadrao, (b) => {
      longe = Math.max(longe, Math.hypot(b.pe.x, b.pe.z))
    })
    // Empurrando para fora o tempo todo, para um pouco além do raio, onde a brisa vence o direcional.
    expect(longe).toBeGreaterThan(BALAO.raio)
    expect(longe).toBeLessThan(BALAO.raio + BALAO.faixaDaBrisa)
    const fora = Math.hypot(v.pe.x, v.pe.z)
    voar(v, 30, { subir: true })
    expect(Math.hypot(v.pe.x, v.pe.z)).toBeLessThan(fora)
    expect(Math.hypot(v.pe.x, v.pe.z)).toBeLessThan(BALAO.raio + 0.5)
  })

  test('fora do chão da ilha o ar segura o cesto acima do tampo', () => {
    const v = noVoo()
    voar(v, 3, { subir: true })
    voar(v, 15, { subir: true, pedidoZ: -1 })
    expect(Math.hypot(v.pe.x, v.pe.z)).toBeGreaterThan(BALAO.raioDoChao)
    let maisBaixo = Number.POSITIVE_INFINITY
    voar(v, 30, {}, chaoPadrao, (b) => {
      if (Math.hypot(b.pe.x, b.pe.z) > BALAO.raioDoChao) maisBaixo = Math.min(maisBaixo, b.pe.y)
    })
    expect(maisBaixo).toBeGreaterThanOrEqual(TAMPO + BALAO.alturaNoAr - 1e-9)
    expect(v.pousado).toBe(false)
  })

  test('pausa: nada anda', () => {
    const v = noVoo()
    voar(v, 2, { subir: true })
    const antes = { ...v.pe }
    voar(v, 5, { parado: true, subir: true, pedidoX: 1 })
    expect(v.pe).toEqual(antes)
  })
})

describe('pousar e descer', () => {
  test('encosta no chão, para de deslizar e pode descer onde pousou', () => {
    const v = noVoo()
    voar(v, 3, { subir: true })
    voar(v, 3, { subir: true, pedidoX: -1 })
    voar(v, 30)
    expect(v.pousado).toBe(true)
    expect(v.pe.y).toBeCloseTo(TAMPO, 6)
    expect(Math.hypot(v.vel.x, v.vel.z)).toBeLessThan(0.01)
    const onde = { ...v.pe }
    expect(descerDoBalao(v)).toBeNull()
    expect(v.fase).toBe('parado')
    expect(v.pe).toEqual(CASA)
    expect(onde.x).toBeLessThan(CASA.x - 3)
  })

  test('pousado no ninho: um lugar alto vira chão (um jeito de chegar)', () => {
    const ninho = { x: 2, z: -6, y: TAMPO + 4 }
    const chao = (x: number, z: number) =>
      Math.hypot(x - ninho.x, z - ninho.z) < 1.2 ? ninho.y : chaoPadrao(x, z)
    const v = noVoo()
    voar(v, 4, { subir: true }, chao)
    // Pilota como uma criança: vai para o ninho e freia chegando (pede a velocidade que quer).
    for (let i = 0; i < 1800; i++) {
      const dx = ninho.x - v.pe.x
      const dz = ninho.z - v.pe.z
      const d = Math.hypot(dx, dz)
      if (d < 0.2 && Math.hypot(v.vel.x, v.vel.z) < 0.1) break
      const querX = (dx / (d || 1)) * Math.min(2, d) - v.vel.x
      const querZ = (dz / (d || 1)) * Math.min(2, d) - v.vel.z
      const q = Math.max(1, Math.hypot(querX, querZ))
      voar(v, dt, { subir: v.pe.y < ninho.y + 3, pedidoX: querX / q, pedidoZ: querZ / q }, chao)
    }
    voar(v, 40, {}, chao)
    expect(v.pousado).toBe(true)
    expect(v.pe.y).toBeCloseTo(ninho.y, 6)
  })

  test('o apoio sai de baixo do cesto pousado: ele volta a descer', () => {
    let alto = true
    const chao = (x: number, z: number) => (alto ? TAMPO + 2 : chaoPadrao(x, z))
    const v = noVoo()
    voar(v, 3, { subir: true }, chao)
    voar(v, 25, {}, chao)
    expect(v.pousado).toBe(true)
    alto = false
    voar(v, 0.2, {}, chao)
    expect(v.pousado).toBe(false)
    voar(v, 15, {}, chao)
    expect(v.pousado).toBe(true)
    expect(v.pe.y).toBeCloseTo(TAMPO, 6)
  })

  test('perto do lugar do balão, a criança sai para o meio da ilha, fora do cesto parado', () => {
    const v = noVoo()
    voar(v, 1, { subir: true })
    voar(v, 15)
    expect(v.pousado).toBe(true)
    const saida = descerDoBalao(v)
    expect(saida).not.toBeNull()
    if (!saida) return
    expect(Math.hypot(saida.x - CASA.x, saida.z - CASA.z)).toBeCloseTo(BALAO.saida, 6)
    // Mais longe do cesto parado (meia largura 0,55) que o raio do corpo.
    expect(BALAO.saida).toBeGreaterThan(0.55 + CORPO.raio)
    expect(Math.hypot(saida.x, saida.z)).toBeLessThan(Math.hypot(CASA.x, CASA.z))
    expect(v.saida).toEqual(saida)
  })
})

// ------------------------------------------------------------------ o modo `balao`

const MUNDO: MundoDoMovimento = {
  cipos: [],
  troncos: [],
  aguas: [],
  equilibrios: [],
  escadas: [],
  escorregadores: [],
  bordas: [],
  rodasDeNado: [],
  foco: { x: 0, y: 0, z: 0 },
}

function entrada(p: Ponto, extra: Partial<EntradaDoPasso> = {}): EntradaDoPasso {
  return {
    dt,
    agora: 10_000,
    parado: false,
    p: { ...p },
    ix: 0,
    iz: 0,
    pedidoX: 0,
    pedidoZ: 0,
    ladoX: 1,
    ladoZ: 0,
    pulou: false,
    usou: false,
    correr: false,
    ritmo: 1,
    patins: false,
    conversa: null,
    gravidade: 24,
    nivelDoMar: 0,
    ...extra,
  }
}

const doPeAoCentro = CORPO.doCentroAoPe + CORPO.folga

/** Um passo do modo com a física de mentira (o chão no tampo); devolve o centro do corpo. */
function passo(c: EstadoDoCorpo, p: Ponto, extra: Partial<EntradaDoPasso> = {}): Ponto {
  const e = entrada(p, extra)
  const modo = MODOS[c.modo]
  if (!modo.valendo(c, MUNDO)) return p
  modo.passo(c, e, MUNDO)
  const prox = { ...c.prox, y: Math.max(c.prox.y, TAMPO + doPeAoCentro) }
  modo.depois(c, e, MUNDO, null, false, () => {})
  return prox
}

describe('o modo balao', () => {
  test('sobe no cesto pelo pedido, voa com o fogo e desce com o usar depois de pousar', () => {
    const c = criarEstadoDoCorpo()
    c.noChao = true
    const v = novoVoo()
    let p: Ponto = { x: CASA.x + 1, y: TAMPO + doPeAoCentro, z: CASA.z }
    atenderPedido(c, { tipo: 'balao', voo: v }, MUNDO, p, 0, () => {})
    expect(c.modo).toBe('balao')
    expect(c.balao).toBe(v)
    for (let t = 0; t < BALAO.embarque + 0.1; t += dt) p = passo(c, p)
    expect(v.fase).toBe('voo')
    for (let t = 0; t < 2; t += dt) p = passo(c, p, { subir: true, pulou: true })
    expect(c.modo).toBe('balao')
    expect(p.y - doPeAoCentro).toBeGreaterThan(TAMPO + 1)
    // No ar, o usar não desce (nem abre nada do mundo lá embaixo).
    passo(c, p, { usou: true })
    expect(c.modo).toBe('balao')
    for (let t = 0; t < 15; t += dt) p = passo(c, p)
    expect(v.pousado).toBe(true)
    passo(c, p, { usou: true })
    expect(c.modo).toBe('chao')
    expect(c.balao).toBeNull()
    expect(v.fase).toBe('parado')
  })

  test('longe do cesto ou nadando, o pedido não sobe', () => {
    const v = novoVoo()
    const longe = criarEstadoDoCorpo()
    longe.noChao = true
    atenderPedido(
      longe,
      { tipo: 'balao', voo: v },
      MUNDO,
      { x: CASA.x + 3, y: TAMPO + doPeAoCentro, z: CASA.z },
      0,
      () => {},
    )
    expect(longe.modo).toBe('chao')
    const nadando = criarEstadoDoCorpo()
    nadando.noChao = true
    nadando.nadando = true
    atenderPedido(
      nadando,
      { tipo: 'balao', voo: v },
      MUNDO,
      { x: CASA.x + 1, y: TAMPO + doPeAoCentro, z: CASA.z },
      0,
      () => {},
    )
    expect(nadando.modo).toBe('chao')
    expect(v.fase).toBe('parado')
  })

  test('entrando, algo no caminho: desiste e fica a pé', () => {
    const c = criarEstadoDoCorpo()
    c.noChao = true
    const v = novoVoo()
    const p = { x: CASA.x + 1, y: TAMPO + doPeAoCentro, z: CASA.z }
    atenderPedido(c, { tipo: 'balao', voo: v }, MUNDO, p, 0, () => {})
    MODOS.balao.passo(c, entrada(p), MUNDO)
    MODOS.balao.obstruido?.(c, entrada(p))
    expect(v.fase).toBe('parado')
    expect(MODOS.balao.valendo(c, MUNDO)).toBe(false)
  })

  test('o rótulo de descer é o do alvo do HUD', () => {
    expect(DESCER_DO_BALAO.rotulo).toBe('Descer do balão')
  })
})
