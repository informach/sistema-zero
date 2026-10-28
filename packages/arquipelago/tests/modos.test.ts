import { describe, expect, test } from 'bun:test'
import type { CipoVivo, ModoDoCorpo, TroncoVivo } from '../src/estado/contexto'
import type { Ponto } from '../src/sistemas/cipo'
import { criarBalanco } from '../src/sistemas/cipo'
import { criarPontos } from '../src/sistemas/cordas'
import { CORPO } from '../src/sistemas/corpo'
import { ESCALADA } from '../src/sistemas/escalada'
import {
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import {
  decidirNado,
  ENTRAR_NO_NADO,
  SAIR_DO_NADO,
  superficieDaAgua,
} from '../src/sistemas/modos/chao'
import { PASSO_PARA_FORA_DO_TRONCO } from '../src/sistemas/modos/escalada'

const dt = 1 / 60

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
    conversa: null,
    gravidade: 24,
    nivelDoMar: 0,
    ...extra,
  }
}

function cipoEm(pivo: Ponto, id = 'cipo-1'): CipoVivo {
  const corda = 4
  const { pontos, antes } = criarPontos(pivo, corda)
  return {
    id,
    pivo,
    corda,
    pegada: 3,
    balanco: criarBalanco(),
    seguro: false,
    pontos,
    antes,
    chao: 0,
    esperandoOCorpoSair: false,
    soltoEm: Number.NEGATIVE_INFINITY,
  }
}

const troncoEm = (x: number, z: number): TroncoVivo => ({
  id: 'tronco',
  tronco: {
    base: { x, y: 0, z },
    topo: { x, y: 6, z },
    raioBase: 0.6,
    raioTopo: 0.4,
  },
})

function mundo(extra: Partial<MundoDoMovimento> = {}): MundoDoMovimento {
  return { cipos: [], troncos: [], aguas: [], foco: { x: 0, y: 0, z: 0 }, ...extra }
}

/** Um passo inteiro, como o personagem faz, com o controlador movendo livre (sem paredes). */
function passo(
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  m: MundoDoMovimento,
  pisou: boolean,
  avisos: ModoDoCorpo[] = [],
) {
  const modo = MODOS[c.modo]
  const controlador = modo.passo(c, e, m)
  const mov = controlador === 'direto' ? null : { ...c.desloc }
  return modo.depois(c, e, m, mov, pisou, (novo) => avisos.push(novo))
}

describe('os modos de movimento', () => {
  test('no chão parado, a gravidade puxa e pisar zera a queda', () => {
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 3, z: 0 }
    passo(c, entrada(p), mundo(), false)
    expect(c.velY).toBeCloseTo(-24 * dt, 9)
    expect(c.prox.y).toBeLessThan(p.y)
    passo(c, entrada(c.prox), mundo(), true)
    expect(c.velY).toBe(0)
    expect(c.noChao).toBe(true)
  })

  test('o nado tem folga entre entrar e sair', () => {
    expect(decidirNado(false, true, ENTRAR_NO_NADO - 0.01)).toBe(false)
    expect(decidirNado(false, true, ENTRAR_NO_NADO + 0.01)).toBe(true)
    // Nadando, só sai pisando com a cintura fora da água por `SAIR_DO_NADO`.
    expect(decidirNado(true, true, 0)).toBe(true)
    expect(decidirNado(true, false, -1)).toBe(true)
    expect(decidirNado(true, true, -SAIR_DO_NADO - 0.01)).toBe(false)
    const lago = { x: 0, z: 0, raioX: 3, raioZ: 2, giro: 0, y: 1.2 }
    expect(superficieDaAgua([lago], 0, 1, 0)).toBe(1.2)
    expect(superficieDaAgua([lago], 0, 5, 0)).toBe(0)
  })

  test('na água funda o corpo nada e boia, sem pular', () => {
    const c = criarEstadoDoCorpo()
    c.noChao = true
    // O pé 1,5 m abaixo da água: a cintura bem dentro.
    const p = { x: 0, y: -1.5 + CORPO.doCentroAoPe, z: 0 }
    passo(c, entrada(p, { pulou: true }), mundo(), true)
    expect(c.nadando).toBe(true)
    expect(c.velY).toBeGreaterThan(0)
  })

  test('pedir o cipó entra nele, segura a corda e a câmera olha para o meio dela', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    const avisos: ModoDoCorpo[] = []
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0.5, y: 1, z: 0 }, 0, (n) =>
      avisos.push(n),
    )
    expect(c.modo).toBe('cipo')
    expect(c.cipo).toBe(cipo)
    expect(cipo.seguro).toBe(true)
    expect(avisos).toEqual(['cipo'])
    expect(m.foco.y).toBeLessThan(cipo.pivo.y)
  })

  test('pular do cipó solta com a velocidade do balanço e não pega de novo na hora', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0, y: 2, z: 0 }, 0, () => {})
    for (let i = 0; i < 30; i++) passo(c, entrada(c.prox, { pedidoZ: 1, agora: i * 16 }), m, false)
    const avisos: ModoDoCorpo[] = []
    const gastou = passo(c, entrada(c.prox, { pulou: true, agora: 1000 }), m, false, avisos)
    expect(gastou).toBe(true)
    expect(c.modo).toBe('chao')
    expect(avisos).toEqual(['chao'])
    expect(cipo.seguro).toBe(false)
    expect(cipo.soltoEm).toBe(1000)
    expect(c.velY).toBe(c.embalo.y)
    expect(c.velY).toBeGreaterThan(0)
  })

  test('o cipó que some com a ilha deixa de valer', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0, y: 2, z: 0 }, 0, () => {})
    expect(MODOS.cipo.valendo(c, m)).toBe(true)
    m.cipos = []
    expect(MODOS.cipo.valendo(c, m)).toBe(false)
  })

  test('caindo perto da corda, as mãos pegam o cipó', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    // As mãos (0,3 acima do centro) bem ao lado da corda, no ar.
    passo(c, entrada({ x: 0.2, y: 2.5, z: 0 }, { agora: 5000 }), m, false)
    expect(c.modo).toBe('cipo')
  })

  test('empurrando o tronco no chão por um tempo, o corpo gruda; usar solta para fora', () => {
    const c = criarEstadoDoCorpo()
    const t = troncoEm(0, 0)
    const m = mundo({ troncos: [t] })
    // Encostado na casca (raio 0,6 mais o do corpo), pedindo para o tronco (−x).
    const p = { x: 0.6 + CORPO.raio + 0.02, y: CORPO.doCentroAoPe, z: 0 }
    let agora = 0
    for (let k = 0; k * dt < ESCALADA.esperaParaGrudar + 3 * dt && c.modo === 'chao'; k++) {
      agora += 16
      passo(c, entrada(p, { pedidoX: -1, ix: -1, agora }), m, true)
      c.prox.x = p.x
      c.prox.z = p.z
    }
    expect(c.modo).toBe('escalada')
    expect(c.tronco).toBe(t)
    const gastou = passo(c, entrada(c.prox, { usou: true, agora: agora + 500 }), m, false)
    expect(gastou).toBe(true)
    expect(c.modo).toBe('chao')
    expect(Math.hypot(c.embalo.x, c.embalo.z)).toBeCloseTo(PASSO_PARA_FORA_DO_TRONCO, 6)
  })

  test('pular do tronco solta sem gastar o usar', () => {
    const c = criarEstadoDoCorpo()
    const t = troncoEm(0, 0)
    const m = mundo({ troncos: [t] })
    atenderPedido(c, { tipo: 'tronco', id: 'tronco' }, m, { x: 1, y: 2, z: 0 }, 0, () => {})
    expect(c.modo).toBe('escalada')
    const gastou = passo(c, entrada(c.prox, { pulou: true, agora: 500 }), m, false)
    expect(gastou).toBe(false)
    expect(c.modo).toBe('chao')
    expect(c.velY).toBeGreaterThan(0)
  })
})
