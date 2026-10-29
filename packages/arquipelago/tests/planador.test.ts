import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import type { ModoDoCorpo } from '../src/estado/contexto'
import { TODA_A_BANDA } from '../src/sistemas/banda'
import type { Ponto } from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import { comecarConversaComOFloco } from '../src/sistemas/floco'
import { ITENS, itensParaDar } from '../src/sistemas/itens'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { abrirOPlanador } from '../src/sistemas/modos/planar'
import {
  COMO_USAR_O_PLANADOR,
  type CorrenteDeAr,
  FALA_DA_CORRENTE,
  FALA_DO_PLANADOR,
  ID_DO_PLANADOR,
  naColunaDaCorrente,
  PLANADOR,
  pegarPlanador,
  subidaDaCorrente,
  temPlanador,
} from '../src/sistemas/planador'

const dt = 1 / 60
const AGORA = new Date('2026-10-29T12:00:00Z')

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
    planador: true,
    conversa: null,
    gravidade: 24,
    nivelDoMar: -50,
    ...extra,
  }
}

function mundo(extra: Partial<MundoDoMovimento> = {}): MundoDoMovimento {
  return {
    cipos: [],
    troncos: [],
    aguas: [],
    equilibrios: [],
    escadas: [],
    escorregadores: [],
    bordas: [],
    rodasDeNado: [],
    foco: { x: 0, y: 0, z: 0 },
    ...extra,
  }
}

/**
 * Um mundo de mentira: chão plano na altura `chao(x, z)` e ar livre. Um passo inteiro como o
 * personagem faz; o controlador move livre e para no chão (aí "pisou").
 */
function simular(
  c: EstadoDoCorpo,
  p: Ponto,
  m: MundoDoMovimento,
  chao: (x: number, z: number) => number,
  extra: Partial<EntradaDoPasso> = {},
  avisos: ModoDoCorpo[] = [],
) {
  const e = entrada(p, extra)
  if (!e.parado) c.noModo += dt
  const modo = MODOS[c.modo]
  modo.passo(c, e, m)
  const mov = { ...c.desloc }
  const piso = chao(p.x + mov.x, p.z + mov.z) + CORPO.doCentroAoPe
  const pisou = p.y + mov.y <= piso + 1e-6 && mov.y <= 0
  if (pisou) mov.y = piso - p.y
  modo.depois(c, e, m, mov, pisou, (novo) => avisos.push(novo))
  p.x = c.prox.x
  p.y = c.prox.y
  p.z = c.prox.z
  return pisou
}

const plano =
  (h: number) =>
  (_x: number, _z: number): number =>
    h

/**
 * Pula e, no alto do pulo, pula de novo (já no ar, caindo de um lugar alto, o primeiro toque
 * abre).
 */
function pularEAbrir(
  c: EstadoDoCorpo,
  p: Ponto,
  m: MundoDoMovimento,
  chao: (x: number, z: number) => number = plano(0),
) {
  simular(c, p, m, chao)
  simular(c, p, m, chao, { pulou: true })
  if (c.modo === 'planar') return
  for (let i = 0; i < 120 && c.velY > PLANADOR.subindoAte - 0.2; i++) simular(c, p, m, chao)
  simular(c, p, m, chao, { pulou: true })
}

describe('o planador (fase3-09)', () => {
  test('pegar põe o planador na mochila uma vez; ele é de usar (não se come nem se dá)', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(temPlanador(s)).toBe(false)
    const com = pegarPlanador(s)
    expect(temPlanador(com)).toBe(true)
    expect(com.inventario[ID_DO_PLANADOR]).toBe(1)
    expect(pegarPlanador(com)).toBe(com)
    expect(s.inventario[ID_DO_PLANADOR]).toBeUndefined()
    expect(ITENS[ID_DO_PLANADOR]?.equipamento).toBe(true)
    expect(itensParaDar(com.inventario).some(({ item }) => item.id === ID_DO_PLANADOR)).toBe(false)
  })

  test('o Floco dá o planador na primeira conversa do festival; depois, lembra do vento', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(comecarConversaComOFloco({ ...s, pico: { banda: 0b011 } }).falas).not.toContain(
      FALA_DO_PLANADOR,
    )
    const festa = { ...s, pico: { banda: TODA_A_BANDA } }
    const primeira = comecarConversaComOFloco(festa)
    expect(temPlanador(primeira.salvamento)).toBe(true)
    expect(primeira.falas.slice(-2)).toEqual([FALA_DO_PLANADOR, FALA_DA_CORRENTE])
    const depois = comecarConversaComOFloco(primeira.salvamento)
    expect(depois.salvamento).toBe(primeira.salvamento)
    expect(depois.falas).not.toContain(FALA_DO_PLANADOR)
    expect(depois.falas.at(-1)).toBe(FALA_DA_CORRENTE)
    expect(temPlanador(festa)).toBe(false)
  })

  test('as falas seguem a régua do texto', () => {
    for (const t of [FALA_DO_PLANADOR, FALA_DA_CORRENTE, COMO_USAR_O_PLANADOR]) {
      expect(t).not.toContain('—')
      expect(t).not.toContain('!')
      expect(t.split(/[.?]/)[0]?.trim().endsWith('?')).toBe(false)
      expect(t.trimStart().split('.')[0]).not.toContain('?')
    }
  })

  test('no alto do pulo, pular de novo abre; sem o planador, nada muda', () => {
    const m = mundo()
    const avisos: ModoDoCorpo[] = []
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: CORPO.doCentroAoPe, z: 0 }
    simular(c, p, m, plano(0))
    simular(c, p, m, plano(0), { pulou: true }, avisos)
    // O primeiro toque é o pulo de sempre.
    expect(c.modo).toBe('chao')
    expect(c.velY).toBeGreaterThan(CORPO.pulo - 1)
    // Subindo rápido, o segundo toque ainda não abre.
    simular(c, p, m, plano(0), { pulou: true }, avisos)
    expect(c.modo).toBe('chao')
    while (c.velY > 0.5) simular(c, p, m, plano(0))
    const semPlanador = criarEstadoDoCorpo()
    Object.assign(semPlanador, { ...c, pulo: { ...c.pulo }, vel: { ...c.vel } })
    simular(c, p, m, plano(0), { pulou: true }, avisos)
    expect(c.modo).toBe('planar')
    expect(avisos).toEqual(['planar'])
    const q = { ...p }
    simular(semPlanador, q, m, plano(0), { pulou: true, planador: false })
    expect(semPlanador.modo).toBe('chao')
  })

  test('logo depois de sair da beirada, o toque é o pulo de tolerância, não o planador', () => {
    const m = mundo()
    const c = criarEstadoDoCorpo()
    // Anda para fora de um degrau alto: o chão some embaixo.
    const p = { x: 0, y: 5 + CORPO.doCentroAoPe, z: 0 }
    const degrau = (x: number) => (x < 0.05 ? 5 : 0)
    simular(c, p, m, degrau, { pedidoX: 1 })
    for (let i = 0; i < 6 && c.noChao; i++) simular(c, p, m, degrau, { pedidoX: 1 })
    expect(c.noChao).toBe(false)
    simular(c, p, m, degrau, { pedidoX: 1, pulou: true })
    expect(c.modo).toBe('chao')
    expect(c.velY).toBeGreaterThan(CORPO.pulo - 1)
  })

  test('desce devagar e anda para a frente: do alto do cume, uns 4 s no ar', () => {
    const m = mundo()
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 8.5 + CORPO.doCentroAoPe, z: 0 }
    const alto = (x: number, z: number) => (Math.hypot(x, z) < 1 ? 8.5 : 0)
    pularEAbrir(c, p, m, alto)
    expect(c.modo).toBe('planar')
    let t = 0
    while (c.modo === 'planar' && t < 20) {
      simular(c, p, m, alto)
      t += dt
    }
    expect(c.modo).toBe('chao')
    expect(c.noChao).toBe(true)
    // Caindo sem o planador, 8,5 m levam 0,84 s; planando, mais de 4.
    expect(t).toBeGreaterThan(4)
    expect(t).toBeLessThan(7)
    // Sem pedir nada, segue para onde olha (o rumo do corpo, aqui +Z).
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(PLANADOR.solto * (t - 0.6))
    expect(c.velY).toBe(0)
  })

  test('o controle guia como no chão, com o peso do ar', () => {
    const m = mundo()
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 30, z: 0 }
    pularEAbrir(c, p, m, plano(-100))
    for (let i = 0; i < 180; i++) simular(c, p, m, plano(-100), { pedidoX: 1 })
    expect(c.vel.x).toBeCloseTo(PLANADOR.velocidade, 1)
    expect(Math.abs(c.vel.z)).toBeLessThan(0.05)
    expect(c.velY).toBeCloseTo(-PLANADOR.descida, 1)
  })

  test('numa corrente de ar, sobe até o alto dela e fica pairando', () => {
    const corrente: CorrenteDeAr = { id: 'c', x: 0, z: 0, raio: 1.3, base: 0, topo: 6.5 }
    const m = mundo({ correntes: [corrente] })
    expect(subidaDaCorrente([corrente], 0, 1, 0)).toBe(PLANADOR.subida)
    expect(subidaDaCorrente([corrente], 2, 1, 0)).toBeNull()
    expect(subidaDaCorrente([corrente], 0, 7, 0)).toBeNull()
    expect(subidaDaCorrente([corrente], 0, 6.5, 0)).toBe(0)
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: CORPO.doCentroAoPe, z: 0 }
    pularEAbrir(c, p, m)
    // Andando em roda dentro dela (o raio é pequeno), por 8 s.
    for (let i = 0; i < 480; i++) {
      const a = i * dt * 2
      simular(c, p, m, plano(0), { pedidoX: Math.cos(a), pedidoZ: -Math.sin(a) })
      if (Math.hypot(p.x, p.z) > 0.6) {
        p.x *= 0.6 / Math.hypot(p.x, p.z)
        p.z *= 0.6 / Math.hypot(p.x, p.z)
      }
    }
    expect(c.modo).toBe('planar')
    const pes = p.y - CORPO.doCentroAoPe
    expect(pes).toBeGreaterThan(corrente.topo - PLANADOR.paraNoTopo)
    expect(pes).toBeLessThanOrEqual(corrente.topo + 0.01)
  })

  test('no vento, sem tocar, fica no lugar subindo até o alto; pedindo uma direção, sai dele', () => {
    const corrente: CorrenteDeAr = { id: 'c', x: 0, z: 0, raio: 1, base: 0, topo: 4.75 }
    const m = mundo({ correntes: [corrente] })
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: CORPO.doCentroAoPe, z: 0 }
    pularEAbrir(c, p, m)
    for (let i = 0; i < 300; i++) simular(c, p, m, plano(0), { pedidoX: 0, pedidoZ: 0 })
    expect(c.modo).toBe('planar')
    expect(Math.hypot(p.x, p.z)).toBeLessThan(corrente.raio)
    expect(p.y - CORPO.doCentroAoPe).toBeGreaterThan(corrente.topo - PLANADOR.paraNoTopo)
    for (let i = 0; i < 60; i++) simular(c, p, m, plano(0), { pedidoX: 1, pedidoZ: 0 })
    expect(p.x).toBeGreaterThan(corrente.raio)
  })

  test('aberto acima do vento, desce devagar no lugar até o alto dele e fica lá', () => {
    const corrente: CorrenteDeAr = { id: 'c', x: 0, z: 0, raio: 1, base: 0, topo: 4.75 }
    const m = mundo({ correntes: [corrente] })
    expect(naColunaDaCorrente([corrente], 0, 20, 0)).toBe(true)
    expect(naColunaDaCorrente([corrente], 2, 20, 0)).toBe(false)
    expect(naColunaDaCorrente([corrente], 0, -1, 0)).toBe(false)
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 12 + CORPO.doCentroAoPe, z: 0 }
    c.noChao = false
    abrirOPlanador(c, 0, () => {})
    for (let i = 0; i < 60 * 8; i++) simular(c, p, m, plano(0), { pedidoX: 0, pedidoZ: 0 })
    expect(c.modo).toBe('planar')
    expect(Math.hypot(p.x, p.z)).toBeLessThan(corrente.raio)
    const pes = p.y - CORPO.doCentroAoPe
    expect(pes).toBeGreaterThan(corrente.topo - PLANADOR.paraNoTopo)
    expect(pes).toBeLessThan(corrente.topo + 0.3)
  })

  test('pular fecha: cai com o embalo que levava; pausado, fica parado no ar', () => {
    const m = mundo()
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 30, z: 0 }
    pularEAbrir(c, p, m, plano(-100))
    for (let i = 0; i < 60; i++) simular(c, p, m, plano(-100), { pedidoZ: 1 })
    const antes = { ...p }
    const avisos: ModoDoCorpo[] = []
    simular(c, p, m, plano(-100), { parado: true, pedidoZ: 1, pulou: true }, avisos)
    expect(p).toEqual(antes)
    expect(c.modo).toBe('planar')
    const vz = c.vel.z
    simular(c, p, m, plano(-100), { pulou: true }, avisos)
    expect(avisos).toEqual(['chao'])
    expect(c.modo).toBe('chao')
    // O passo de fechar ainda acelera um pouco (o ar), e o que ficou vai no embalo.
    expect(Math.abs(c.embalo.z - vz)).toBeLessThan(0.1)
    // Caindo de verdade outra vez.
    for (let i = 0; i < 30; i++) simular(c, p, m, plano(-100))
    expect(c.velY).toBeLessThan(-PLANADOR.descida * 2)
  })

  test('na água, fecha e nada', () => {
    const m = mundo({ aguas: [{ id: 'mar', x: 0, z: 0, raioX: 50, raioZ: 50, giro: 0, y: 0 }] })
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 3, z: 0 }
    pularEAbrir(c, p, m, plano(-3))
    expect(c.modo).toBe('planar')
    for (let i = 0; i < 300 && c.modo === 'planar'; i++) simular(c, p, m, plano(-3))
    expect(c.modo).toBe('chao')
    simular(c, p, m, plano(-3))
    expect(c.nadando).toBe(true)
  })
})
