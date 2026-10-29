import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { bancosDosColisores } from '../src/mundo/bancos-da-vila'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import type { Ponto } from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import {
  BANCO,
  CAMA,
  descansar,
  ENERGIA_POR_SEGUNDO,
  FALA_DA_SONECA_CHEIA,
  FALA_DE_DEITAR,
  FALA_DE_SENTAR,
  lugarNaCama,
  lugarNoBanco,
  sonecaAcabou,
} from '../src/sistemas/descanso'
import { DURACAO_DO_DESCANSO } from '../src/sistemas/locomocao'
import {
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { DESCANSO } from '../src/sistemas/modos/descanso'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  TAMPO,
} from './ajuda-colisores'

const dt = 1 / 60
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

/** Um passo do modo, com o controlador fazendo exatamente o deslocamento pedido. */
function passo(c: EstadoDoCorpo, p: Ponto, extra: Partial<EntradaDoPasso> = {}) {
  const e = entrada(p, extra)
  const modo = MODOS[c.modo]
  c.noModo += dt
  modo.passo(c, e, MUNDO)
  const mov = { ...c.desloc, y: 0 }
  modo.depois(c, e, MUNDO, mov, true, () => {})
  return c.prox
}

const N = { fome: 50, energia: 0, diversao: 50 }

describe('a energia volta aos poucos', () => {
  test('na cama em 1 minuto, no banco em uns 3, sem passar de 100 nem mexer no resto', () => {
    expect(100 / ENERGIA_POR_SEGUNDO.deitar).toBeGreaterThan(55)
    expect(100 / ENERGIA_POR_SEGUNDO.deitar).toBeLessThan(65)
    expect(100 / ENERGIA_POR_SEGUNDO.sentar).toBeGreaterThan(170)
    expect(100 / ENERGIA_POR_SEGUNDO.sentar).toBeLessThan(200)
    expect(ENERGIA_POR_SEGUNDO.deitar).toBeGreaterThan(ENERGIA_POR_SEGUNDO.sentar)
    expect(descansar(N, 'deitar', 10).energia).toBeCloseTo(17, 6)
    expect(descansar(N, 'sentar', 10).energia).toBeCloseTo(5.5, 6)
    const cheio = descansar(N, 'deitar', 1000)
    expect(cheio).toEqual({ fome: 50, energia: 100, diversao: 50 })
  })

  test('a soneca acaba com a energia cheia na cama; no banco ela fica até querer levantar', () => {
    expect(sonecaAcabou({ ...N, energia: 100 }, 'deitar')).toBe(true)
    expect(sonecaAcabou({ ...N, energia: 99 }, 'deitar')).toBe(false)
    expect(sonecaAcabou({ ...N, energia: 100 }, 'sentar')).toBe(false)
  })

  test('os laços duram o mesmo que no script do Blender (SENTADO e DEITADO: 4 s)', () => {
    expect(DURACAO_DO_DESCANSO).toBe(4)
  })
})

describe('os lugares de descansar', () => {
  test('no banco o desenho fica no assento e o corpo de pé na frente, fora do banco', () => {
    const l = lugarNoBanco('banco-1', { x: 2, y: 1, z: 3 }, 0)
    expect(l.jeito).toBe('sentar')
    expect(l.giro).toBe(0)
    expect(l.desenho).toEqual({ x: 2, y: 1, z: 3 + BANCO.assentoAFrente + BANCO.baciaAtras })
    expect(l.corpo.z - 3).toBeGreaterThan(BANCO.meioFundo + CORPO.raio)
    expect(l.corpo.x).toBeCloseTo(2, 9)
  })

  test('na cama o desenho deita com os pés para o rumo dela e a cabeça no travesseiro', () => {
    const l = lugarNaCama({ x: 0, y: 1, z: 0 }, Math.PI / 2)
    expect(l.jeito).toBe('deitar')
    expect(l.desenho.x).toBeCloseTo(CAMA.pesAFrente, 9)
    expect(l.desenho.y).toBeCloseTo(1 + CAMA.colchao + CAMA.costas, 9)
    // A cabeça fica a uns 1,7 m dos pés, para o lado do travesseiro (dentro da cama de 2,9 m).
    const cabeca = l.desenho.x - CORPO.desenho.cabeca
    expect(cabeca).toBeGreaterThan(-1.42)
    expect(cabeca).toBeLessThan(-0.6)
    // O corpo de pé fica ao lado da cama, fora dela.
    expect(Math.abs(l.corpo.z)).toBeGreaterThan(CAMA.meiaLargura + CORPO.raio)
  })
})

describe('o modo descanso', () => {
  const lugar = lugarNoBanco('banco-1', { x: 0, y: 0, z: 0 }, 0)
  const de: Ponto = { x: 0.3, y: CENTRO_DO_CORPO, z: 2 }

  test('sentar leva o corpo até o lugar de ficar e olha para a frente do banco', () => {
    const c = criarEstadoDoCorpo()
    atenderPedido(c, { tipo: 'descanso', lugar }, MUNDO, de, 0, () => {})
    expect(c.modo).toBe('descanso')
    expect(c.descanso).toBe(lugar)
    let p: Ponto = { ...de }
    for (let i = 0; i < 60; i++) p = { ...passo(c, p) }
    expect(p.x).toBeCloseTo(lugar.corpo.x, 3)
    expect(p.z).toBeCloseTo(lugar.corpo.z, 3)
    expect(c.direcao).toBe(lugar.giro)
  })

  test('andar, pular ou usar levantam, mas não no instante em que sentou', () => {
    for (const quer of [{ iz: 1 }, { pulou: true }, { usou: true }] as const) {
      const c = criarEstadoDoCorpo()
      atenderPedido(c, { tipo: 'descanso', lugar }, MUNDO, de, 0, () => {})
      passo(c, de, quer)
      expect(c.modo).toBe('descanso')
      for (let t = 0; t < DESCANSO.levantaDepois; t += dt) passo(c, de)
      passo(c, de, quer)
      expect(c.modo).toBe('chao')
      expect(c.descanso).toBeNull()
    }
  })

  test('com o jogo pausado não levanta; a soneca cheia levanta pelo pedido', () => {
    const c = criarEstadoDoCorpo()
    atenderPedido(c, { tipo: 'descanso', lugar }, MUNDO, de, 0, () => {})
    for (let t = 0; t < 1; t += dt) passo(c, de)
    passo(c, de, { parado: true, pulou: true })
    expect(c.modo).toBe('descanso')
    atenderPedido(c, { tipo: 'levantar' }, MUNDO, de, 0, () => {})
    expect(c.modo).toBe('chao')
  })

  test('nadando ou pendurada, o pedido de descansar não vale', () => {
    const c = criarEstadoDoCorpo()
    c.nadando = true
    atenderPedido(c, { tipo: 'descanso', lugar }, MUNDO, de, 0, () => {})
    expect(c.modo).toBe('chao')
    const d = criarEstadoDoCorpo()
    d.modo = 'cipo'
    atenderPedido(d, { tipo: 'descanso', lugar }, MUNDO, de, 0, () => {})
    expect(d.modo).toBe('cipo')
  })
})

describe('os bancos da Vila Doce', () => {
  test('três bancos, cada um virado para o meio da praça, com o corpo de pé livre na frente', async () => {
    const raiz = await carregarGlb(arquivoDaIlha('vila-doce.glb'))
    raiz.updateMatrixWorld(true)
    const colisores = lerColisores(raiz)
    const bancos = bancosDosColisores(colisores, { x: 0, y: 0, z: 0 })
    expect(bancos).toHaveLength(3)
    const formas = colisores.filter((c: ColisorDaIlha): c is Forma => c.forma !== 'malha')
    for (const b of bancos) {
      expect(b.centro.y).toBeCloseTo(TAMPO, 2)
      // A frente aponta para o meio da praça (a origem do modelo).
      const fx = Math.sin(b.frente)
      const fz = Math.cos(b.frente)
      expect(-(b.centro.x * fx + b.centro.z * fz)).toBeGreaterThan(0)
      const l = lugarNoBanco(b.id, b.centro, b.frente)
      const corpo = new Vector3(l.corpo.x, TAMPO + CENTRO_DO_CORPO + 0.05, l.corpo.z)
      const quem = formas.find((f) => bate(f, corpo))?.nome
      expect(quem).toBeUndefined()
    }
  })
})

test('os textos seguem as regras: sem travessão, sem exclamação, sem começar com pergunta', () => {
  for (const t of [FALA_DE_SENTAR, FALA_DE_DEITAR, FALA_DA_SONECA_CHEIA]) {
    expect(t).not.toMatch(/[—!?]/)
  }
})
