import { describe, expect, test } from 'bun:test'
import type {
  AparenciaDoObjeto,
  Obra,
  ProjetoAzul,
  QuartoDoJogo,
  Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { ROOM_ITEM_INFO } from '@sistemazero/avatar-quarto/quarto/catalog'
import { obraDeExemplo, PROJETOS_DE_EXEMPLO } from '../src/plataforma/obra-de-exemplo'
import {
  ACONCHEGO_DA_FESTA,
  ACONCHEGO_QUE_CHAMA_VISITA,
  aconchegoDosComodos,
  aconchegoNaCelula,
  LUZES_DO_QUARTO,
  NIVEIS_DE_ACONCHEGO,
  PLANTAS_DO_QUARTO,
  PONTOS_DE_ACONCHEGO,
} from '../src/sistemas/construcao/aconchego'
import { LOTE_DA_CASA, type Lote, OBRA_VAZIA } from '../src/sistemas/construcao/lote'

const lote: Lote = {
  ...LOTE_DA_CASA,
  id: 'bosque',
  area: { x0: -1, z0: -1, x1: 22, z1: 22 },
  fixo: null,
  paredesFixas: [],
  paredesTravadas: [],
  ocupadas: [],
}
function sala(w = 4, h = 4): Obra {
  return {
    ...structuredClone(OBRA_VAZIA),
    paredes: [
      { x: 0, z: 0, eixo: 'x', n: w },
      { x: 0, z: h, eixo: 'x', n: w },
      { x: 0, z: 0, eixo: 'z', n: h },
      { x: w, z: 0, eixo: 'z', n: h },
    ],
  }
}
const ganho: ProjetoAzul = { ganhoEm: '2026-10-28T12:00:00Z', aparencia: null, aparencias: [] }
/** O projeto usando esta aparência (V6: a em uso fica entre as guardadas, com as outras). */
const usando = (aparencia: AparenciaDoObjeto, ...outras: AparenciaDoObjeto[]): ProjetoAzul => ({
  ...ganho,
  aparencia,
  aparencias: [...outras, aparencia],
})
const quarto = (ids: string[]): QuartoDoJogo => ({
  theme: 'padrao',
  pet: null,
  placedItems: ids.map((itemId, x) => ({ itemId, x, y: 0 })),
})
const medir = (o: Obra, projetos: Salvamento['projetos'] = {}) =>
  aconchegoDosComodos(o, lote, projetos)[0]!

describe('aconchego por cômodo', () => {
  test('obra aberta não inventa cômodo nem modifica as entradas', () => {
    const o = sala()
    o.paredes.pop()
    const antes = JSON.stringify(o)
    expect(aconchegoDosComodos(o, lote, {})).toEqual([])
    expect(JSON.stringify(o)).toBe(antes)
  })
  test('objetos e quarto ficam no seu cômodo; quintal e projetos não postos não somam', () => {
    const o = obraDeExemplo()
    const antes = JSON.stringify(o)
    const cs = aconchegoDosComodos(
      o,
      LOTE_DA_CASA,
      { ...PROJETOS_DE_EXEMPLO, lareira: ganho },
      quarto(['planta', 'luminaria']),
    )
    expect(cs).toHaveLength(3)
    expect(cs.find((c) => c.comodo.quarto)?.plantas).toBe(2)
    const frente = aconchegoNaCelula(cs, { x: -4, z: 1 })!
    expect(frente.variedade).toBe(2)
    expect(frente.plantas).toBe(0)
    expect(frente.luz).toBe(4) // Arco de fora e janela grande compartilhada com o quarto.
    // O cômodo da direita tem a planta de interior: variedade e plantas.
    expect(aconchegoNaCelula(cs, { x: 7, z: -4 })?.variedade).toBe(2)
    expect(aconchegoNaCelula(cs, { x: 7, z: -4 })?.plantas).toBe(2)
    expect(aconchegoNaCelula(cs, { x: -12, z: 6 })).toBeUndefined()
    expect(JSON.stringify(o)).toBe(antes)
  })
  test('galeria e holograma têm a mesma base, criação própria só acrescenta', () => {
    const o = sala()
    const vazio = medir(o)
    o.objetos = [{ id: 'lareira', x: 1, z: 1, giro: 0 }]
    const azul = medir(o, { lareira: ganho })
    expect(azul.total).toBeGreaterThan(vazio.total)
    expect(azul.luz).toBe(2)
    const comprado = medir(o, {
      lareira: usando({ origem: 'galeria', id: 'lareira-classica' }),
    })
    expect(comprado).toEqual(azul)
    for (const origem of ['pinta', 'molda', 'criacao'] as const) {
      const proprio = medir(o, { lareira: usando({ origem, id: 'minha' }) })
      expect(proprio.total).toBe(azul.total + 1)
      expect(proprio.variedade).toBe(azul.variedade)
      expect(proprio.luz).toBe(azul.luz)
      expect(proprio.capricho).toBe(azul.capricho)
    }
  })
  test('comprar (ou usar) a da galeria nunca tira o ponto de quem fez a dela', () => {
    const o = sala()
    o.objetos = [{ id: 'lareira', x: 1, z: 1, giro: 0 }]
    const minha = { origem: 'pinta' as const, id: 'minha' }
    const pintada = medir(o, { lareira: usando(minha) })
    const comprada = medir(o, {
      lareira: usando({ origem: 'galeria', id: 'lareira-classica' }, minha),
    })
    expect(comprada).toEqual(pintada)
    expect(comprada.feitoPorVoce).toBe(1)
  })
  test('repetir tipo não aumenta variedade, luz nem bônus próprio', () => {
    const o = sala()
    o.objetos = [{ id: 'lareira', x: 1, z: 1, giro: 0 }]
    const projetos = { lareira: usando({ origem: 'pinta', id: 'minha' }) }
    const antes = medir(o, projetos)
    o.objetos.push({ id: 'lareira', x: 2, z: 1, giro: 0 })
    expect(medir(o, projetos)).toEqual(antes)
  })
  test('janelas contam por tipo e largura não multiplica os pontos', () => {
    const o = sala(8, 8)
    o.aberturas = [{ tipo: 'janela-grande', eixo: 'x', x: 0, z: 0 }]
    expect(medir(o).luz).toBe(2)
    o.aberturas.push({ tipo: 'janela-grande', eixo: 'x', x: 4, z: 0 })
    expect(medir(o).luz).toBe(2)
    o.aberturas.push(
      { tipo: 'janela-arco', eixo: 'z', x: 0, z: 2 },
      { tipo: 'janela-redonda', eixo: 'z', x: 8, z: 2 },
    )
    expect(medir(o).luz).toBe(6)
    o.aberturas.push({ tipo: 'janela-redonda', eixo: 'z', x: 3, z: 2 })
    expect(medir(o).luz).toBe(6)
  })
  test('uma abertura compartilhada soma uma vez para cada cômodo vizinho', () => {
    const o = sala(8, 4)
    o.paredes.push({ eixo: 'z', x: 4, z: 0, n: 4 })
    o.aberturas.push({ eixo: 'z', x: 4, z: 1, tipo: 'janela-arco' })
    const cs = aconchegoDosComodos(o, lote, {})
    expect(cs).toHaveLength(2)
    expect(cs.map((c) => c.luz)).toEqual([2, 2])
  })
  test('os três pisos valem igual; porta e janela acrescentam capricho', () => {
    const o = sala()
    const base = medir(o).capricho
    for (const tipo of ['tabua', 'ladrilho', 'azulejo'] as const) {
      o.pisos = [{ x: 1, z: 1, tipo }]
      expect(medir(o).capricho).toBe(base)
    }
    o.aberturas = [
      { tipo: 'porta', eixo: 'x', x: 0, z: 0 },
      { tipo: 'janela-redonda', eixo: 'z', x: 4, z: 0 },
    ]
    expect(medir(o).capricho).toBe(base + 4)
  })
  test('espaço útil soma, cubículo e salão vazio não recebem bônus de tamanho', () => {
    expect(medir(sala(2, 2)).capricho).toBe(2)
    expect(medir(sala(3, 3)).capricho).toBe(4)
    expect(medir(sala(6, 6)).capricho).toBe(4)
    const grande = sala(8, 6)
    expect(medir(grande).capricho).toBe(2)
    grande.objetos = ['geladeira', 'forno', 'aquario', 'lareira'].map((id, x) => ({
      id: id as 'geladeira',
      x,
      z: 1,
      giro: 0,
    }))
    expect(medir(grande).capricho).toBe(4)
  })
  test('plantas, luzes e móveis do catálogo têm tetos e ignoram itens desconhecidos', () => {
    for (const id of [...PLANTAS_DO_QUARTO, ...LUZES_DO_QUARTO])
      expect(ROOM_ITEM_INFO[id]).toBeDefined()
    const ids = [...PLANTAS_DO_QUARTO, ...LUZES_DO_QUARTO, 'nao-existe', 'planta']
    const cs = aconchegoDosComodos(LOTE_DA_CASA.obraInicial, LOTE_DA_CASA, {}, quarto(ids))
    const c = cs.find((v) => v.comodo.quarto)!
    expect(c.plantas).toBe(6)
    expect(c.variedade).toBe(12)
    expect(c.luz).toBe(6) // Uma janela grande do kit e duas fontes de luz.
    const desconhecido = aconchegoDosComodos(
      LOTE_DA_CASA.obraInicial,
      LOTE_DA_CASA,
      {},
      quarto(['nao-existe']),
    )[0]!
    expect(desconhecido.variedade).toBe(0)
    expect(aconchegoDosComodos(sala(), lote, {}, quarto(ids))[0]?.plantas).toBe(0)
  })
  test('uma janela e planta de parede do quarto também contam', () => {
    const c = aconchegoDosComodos(
      LOTE_DA_CASA.obraInicial,
      LOTE_DA_CASA,
      {},
      quarto(['janela', 'planta-pendurada']),
    )[0]!
    expect(c.plantas).toBe(2)
    expect(c.luz).toBe(4)
  })
  test('compra alcança a faixa da festa sem bônus próprio nem plantas', () => {
    const o = sala(8, 6)
    o.objetos = ['geladeira', 'forno', 'aquario', 'lareira', 'banda', 'fliperama'].map((id, x) => ({
      id: id as 'geladeira',
      x,
      z: 1,
      giro: 0,
    }))
    o.aberturas = [
      { tipo: 'porta', eixo: 'x', x: 0, z: 0 },
      { tipo: 'janela-grande', eixo: 'x', x: 4, z: 0 },
      { tipo: 'janela-arco', eixo: 'z', x: 0, z: 2 },
    ]
    const projetos = Object.fromEntries(
      o.objetos.map((v) => [v.id, usando({ origem: 'galeria', id: `${v.id}-classica` })]),
    ) as Salvamento['projetos']
    const c = medir(o, projetos)
    expect(c.feitoPorVoce).toBe(0)
    expect(c.total).toBeGreaterThanOrEqual(ACONCHEGO_DA_FESTA)
    expect(c.nivel).toBe('Muito aconchegante')
    expect(ACONCHEGO_DA_FESTA).toBeGreaterThan(ACONCHEGO_QUE_CHAMA_VISITA)
  })
  test('o nível acompanha o total e as dicas não cobram nem sugerem plantas que ela não tem', () => {
    const { 'planta-interior': _, ...semPlanta } = PROJETOS_DE_EXEMPLO
    for (const c of [
      medir(sala()),
      ...aconchegoDosComodos(obraDeExemplo(), LOTE_DA_CASA, semPlanta),
    ]) {
      expect(c.total).toBe(c.variedade + c.luz + c.plantas + c.capricho + c.feitoPorVoce)
      expect(c.nivel).toBe(NIVEIS_DE_ACONCHEGO.filter((n) => c.total >= n.minimo).at(-1)!.nome)
      expect(c.dica).not.toMatch(/[!?—]|perde|castigo|compre/i)
      if (!c.comodo.quarto) expect(c.dica).not.toContain('planta')
    }
    expect(PONTOS_DE_ACONCHEGO.proprio.porTipo).toBeLessThan(PONTOS_DE_ACONCHEGO.variedade.porTipo)
  })
  test('a planta de interior pontua plantas num cômodo novo e some da dica', () => {
    const o = sala()
    const projetos = { 'planta-interior': ganho }
    const sem = medir(o, projetos)
    expect(sem.plantas).toBe(0)
    expect(sem.dica).not.toContain('planta de interior')
    o.aberturas = [
      { tipo: 'porta', eixo: 'x', x: 0, z: 0 },
      { tipo: 'janela-redonda', eixo: 'z', x: 4, z: 0 },
    ]
    expect(medir(o, projetos).dica).toBe('A planta de interior traz mais aconchego a este cômodo.')
    o.objetos = [{ id: 'planta-interior', x: 1, z: 1, giro: 0 }]
    const com = medir(o, projetos)
    expect(com.plantas).toBe(PONTOS_DE_ACONCHEGO.plantas.porTipo)
    expect(com.dica).not.toContain('planta de interior')
  })
})
