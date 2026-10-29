import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { CORPO } from '../src/sistemas/corpo'
import { ITENS, itensParaDar, itensVisiveis, remover } from '../src/sistemas/itens'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { PERFIS } from '../src/sistemas/movimento'
import {
  comPatins,
  FALA_DE_CALCAR,
  FALA_DE_DESCALCAR,
  FALA_DOS_PATINS,
  ID_DOS_PATINS,
  RAPIDEZ_DOS_PATINS,
  receberPatins,
} from '../src/sistemas/patins'
import { PERCURSO_DAS_COPAS, PERCURSO_DOS_TELHADOS } from '../src/sistemas/percurso'

const dt = 1 / 60
const inicial = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))

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

function entrada(c: EstadoDoCorpo, extra: Partial<EntradaDoPasso>): EntradaDoPasso {
  return {
    dt,
    agora: 10_000,
    parado: false,
    p: { ...c.prox },
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
    nivelDoMar: -10,
    ...extra,
  }
}

/** Um passo no chão plano e seco, com o controlador andando livre. */
function passo(c: EstadoDoCorpo, extra: Partial<EntradaDoPasso>) {
  const e = entrada(c, extra)
  c.noModo += dt
  const modo = MODOS[c.modo]
  modo.passo(c, e, MUNDO)
  modo.depois(c, e, MUNDO, { x: c.desloc.x, y: 0, z: c.desloc.z }, true, () => {})
}

/** Pede para a frente (−z) por `segundos`; devolve o tempo até chegar a 99% da velocidade. */
function acelerar(c: EstadoDoCorpo, segundos: number, extra: Partial<EntradaDoPasso>) {
  let chegou = Number.POSITIVE_INFINITY
  const alvo = (extra.correr ? CORPO.correr : CORPO.andar) * (extra.patins ? RAPIDEZ_DOS_PATINS : 1)
  for (let t = 0; t < segundos; t += dt) {
    passo(c, { pedidoZ: -1, iz: 1, ...extra })
    if (chegou === Number.POSITIVE_INFINITY && Math.hypot(c.vel.x, c.vel.z) >= alvo * 0.99)
      chegou = t
  }
  return chegou
}

/** Solta o controle e mede quanto o corpo ainda anda até parar. */
function deslizar(c: EstadoDoCorpo, extra: Partial<EntradaDoPasso>) {
  const z0 = c.prox.z
  for (let t = 0; t < 4; t += dt) passo(c, extra)
  return Math.abs(c.prox.z - z0)
}

function noChao(): EstadoDoCorpo {
  const c = criarEstadoDoCorpo()
  c.noChao = true
  c.prox.y = CORPO.doCentroAoPe
  return c
}

function conferirTexto(fala: string) {
  expect(fala).not.toMatch(/[—!]/)
  expect((fala.split(/(?<=[.?])\s/)[0] ?? '').endsWith('?')).toBe(false)
}

describe('o item', () => {
  test('os patins ficam na mochila, não se comem e não se dão de presente', () => {
    const patins = ITENS[ID_DOS_PATINS]
    expect(patins?.equipamento).toBe(true)
    expect(patins?.comida).toBeUndefined()
    const inv = { [ID_DOS_PATINS]: 1, tomate: 2 }
    expect(itensVisiveis(inv).map((x) => x.item.id)).toContain(ID_DOS_PATINS)
    expect(itensParaDar(inv).map((x) => x.item.id)).toEqual(['tomate'])
  })

  test('só valem calçados e na mochila', () => {
    expect(comPatins(true, { [ID_DOS_PATINS]: 1 })).toBe(true)
    expect(comPatins(false, { [ID_DOS_PATINS]: 1 })).toBe(false)
    expect(comPatins(true, {})).toBe(false)
  })

  test('as falas seguem a voz da casa', () => {
    for (const f of [FALA_DOS_PATINS, FALA_DE_CALCAR, FALA_DE_DESCALCAR]) conferirTexto(f)
  })
})

describe('o prêmio da entrega pelos telhados', () => {
  test('a chegada dá um par a quem ainda não tem, uma vez', () => {
    expect(PERCURSO_DOS_TELHADOS.premio).toBe(receberPatins)
    expect('premio' in PERCURSO_DAS_COPAS).toBe(false)
    const r = receberPatins(inicial())
    if (!r) throw new Error('sem patins')
    expect(r.salvamento.inventario[ID_DOS_PATINS]).toBe(1)
    expect(r.fala).toBe(FALA_DOS_PATINS)
    expect(receberPatins(r.salvamento)).toBeNull()
    // Sem o par na mochila, a próxima chegada dá outro.
    const semPar = remover(r.salvamento.inventario, ID_DOS_PATINS)
    if (!semPar) throw new Error('não tirou')
    expect(receberPatins({ ...r.salvamento, inventario: semPar })).not.toBeNull()
  })
})

describe('o deslize no chão', () => {
  test('de patins anda e corre mais rápido', () => {
    for (const correr of [false, true]) {
      const descalco = noChao()
      const calcado = noChao()
      acelerar(descalco, 2, { correr })
      acelerar(calcado, 2, { correr, patins: true })
      const base = correr ? CORPO.correr : CORPO.andar
      expect(Math.hypot(descalco.vel.x, descalco.vel.z)).toBeCloseTo(base, 3)
      expect(Math.hypot(calcado.vel.x, calcado.vel.z)).toBeCloseTo(base * RAPIDEZ_DOS_PATINS, 3)
    }
  })

  test('acelera mais devagar e desliza mais para parar', () => {
    const descalco = noChao()
    const calcado = noChao()
    const tDescalco = acelerar(descalco, 2, { correr: true })
    const tCalcado = acelerar(calcado, 2, { correr: true, patins: true })
    expect(tCalcado).toBeGreaterThan(tDescalco * 2)
    // Da corrida de patins (6 m/s) ao parado com o freio do perfil: uns 3,6 m.
    const v = CORPO.correr * RAPIDEZ_DOS_PATINS
    const esperado = (v * v) / (2 * PERFIS.patins.freio)
    expect(deslizar(calcado, { patins: true })).toBeCloseTo(esperado, 0)
    expect(deslizar(descalco, {})).toBeLessThan(esperado / 3)
  })

  test('na água os patins não mudam nada', () => {
    const c = noChao()
    c.nadando = true
    c.prox.y = -10 - 1.5 + CORPO.doCentroAoPe
    const n = noChao()
    n.nadando = true
    n.prox.y = c.prox.y
    for (let t = 0; t < 2; t += dt) {
      passo(c, { pedidoZ: -1, iz: 1, patins: true, nivelDoMar: -10 })
      passo(n, { pedidoZ: -1, iz: 1, nivelDoMar: -10 })
    }
    expect(c.nadando).toBe(true)
    expect(Math.hypot(c.vel.x, c.vel.z)).toBeCloseTo(CORPO.nadar, 3)
    expect(c.vel).toEqual(n.vel)
  })
})
