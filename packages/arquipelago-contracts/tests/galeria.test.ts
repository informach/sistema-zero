import { describe, expect, test } from 'bun:test'
import {
  aparenciaDaGaleria,
  CompraNaGaleriaSchema,
  criarSalvamentoInicial,
  GALERIA,
  GaleriaDoJogadorSchema,
  galeriaDoObjeto,
  IDS_DA_GALERIA,
  migrarDaV5,
  migrarDaV6,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarSalvamento,
  OBJETOS_DA_CASA,
  PRECO_MAXIMO_DA_GALERIA,
  PRECO_MINIMO_DA_GALERIA,
  ProjetoAzulSchema,
  SaldoDosMembrosSchema,
  type SalvamentoV5,
} from '../src'
import { migrarDaV10 } from '../src/salvamento'

describe('o catálogo da galeria', () => {
  test('uma aparência por objeto, com o id estável que começa pelo objeto', () => {
    for (const objeto of OBJETOS_DA_CASA) expect(galeriaDoObjeto(objeto)).toHaveLength(1)
    for (const id of IDS_DA_GALERIA) {
      const a = GALERIA[id]
      expect(a.id).toBe(id)
      expect(id.startsWith(`${a.objeto}-`)).toBe(true)
      expect(a.modelo).toBe('objeto')
    }
    expect(Object.keys(GALERIA).sort()).toEqual([...IDS_DA_GALERIA].sort())
  })

  test('o preço pede algumas tarefas, nunca uma semana inteira', () => {
    for (const a of Object.values(GALERIA)) {
      expect(Number.isInteger(a.preco)).toBe(true)
      expect(a.preco).toBeGreaterThanOrEqual(PRECO_MINIMO_DA_GALERIA)
      expect(a.preco).toBeLessThanOrEqual(PRECO_MAXIMO_DA_GALERIA)
    }
    // Metade do teto semanal de moedas do jogo (150), no máximo.
    expect(PRECO_MAXIMO_DA_GALERIA).toBeLessThanOrEqual(150 / 2)
  })

  test('o nome cabe no cartão e segue a voz da casa', () => {
    for (const a of Object.values(GALERIA)) {
      expect(a.nome.length).toBeGreaterThan(0)
      expect(a.nome.length).toBeLessThanOrEqual(40)
      expect(a.nome).not.toMatch(/[—!]/)
    }
  })

  test('aparenciaDaGaleria só conhece os ids do catálogo', () => {
    expect(aparenciaDaGaleria('geladeira-classica')?.objeto).toBe('geladeira')
    for (const id of ['', 'toString', '__proto__', 'geladeira-azul'])
      expect(aparenciaDaGaleria(id)).toBeUndefined()
  })
})

describe('as rotas da galeria', () => {
  test('a compra leva o id do catálogo e uma chave uuid', () => {
    const chave = '11111111-1111-4111-8111-111111111111'
    expect(CompraNaGaleriaSchema.parse({ aparencia: 'forno-classico', chave })).toEqual({
      aparencia: 'forno-classico',
      chave,
    })
    for (const corpo of [
      { aparencia: 'forno-azul', chave },
      { aparencia: 'forno-classico', chave: 'repetir' },
      { aparencia: 'forno-classico', chave, preco: 1 },
    ])
      expect(CompraNaGaleriaSchema.safeParse(corpo).success).toBe(false)
  })

  test('a galeria do jogador: possuídas do catálogo, saldo inteiro ou desconhecido', () => {
    const ok = { possuidas: ['forno-classico' as const], saldo: 35, ilimitado: false }
    expect(GaleriaDoJogadorSchema.parse(ok)).toEqual(ok)
    expect(GaleriaDoJogadorSchema.safeParse({ ...ok, saldo: null }).success).toBe(true)
    expect(GaleriaDoJogadorSchema.safeParse({ ...ok, saldo: -1 }).success).toBe(false)
    expect(GaleriaDoJogadorSchema.safeParse({ ...ok, possuidas: ['x'] }).success).toBe(false)
    expect(SaldoDosMembrosSchema.safeParse({ saldo: 12 }).success).toBe(true)
    expect(SaldoDosMembrosSchema.safeParse({ saldo: 1.5 }).success).toBe(false)
  })
})

describe('salvamento V6: as aparências guardadas', () => {
  const AGORA = new Date('2026-10-29T12:00:00Z')
  const ganho = AGORA.toISOString()

  test('a V5 migra com a aparência em uso como a única guardada', () => {
    const {
      versao: _,
      projetos: __,
      turnos: _t,
      lumis: _l,
      rotinas: _r,
      recife: _recife,
      ...resto
    } = criarSalvamentoInicial(AGORA)
    const v5: SalvamentoV5 = {
      ...resto,
      versao: 5,
      moradores: { capi: resto.moradores.capi },
      projetos: {
        geladeira: { ganhoEm: ganho, aparencia: { origem: 'pinta', id: 'c1' } },
        forno: { ganhoEm: ganho, aparencia: null },
      },
    }
    const v6 = migrarDaV5(v5)
    expect(v6.versao).toBe(6)
    expect(v6.projetos.geladeira?.aparencias).toEqual([{ origem: 'pinta', id: 'c1' }])
    expect(v6.projetos.forno?.aparencias).toEqual([])
    expect(migrarSalvamento(v5)).toEqual(
      migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(migrarDaV6(v6))))),
    )
  })

  test('a aparência em uso fica entre as guardadas, sem repetir', () => {
    const pinta = { origem: 'pinta' as const, id: 'c1' }
    const galeria = { origem: 'galeria' as const, id: 'forno-classico' }
    const ok = { ganhoEm: ganho, aparencia: galeria, aparencias: [pinta, galeria] }
    expect(ProjetoAzulSchema.safeParse(ok).success).toBe(true)
    expect(ProjetoAzulSchema.safeParse({ ...ok, aparencias: [pinta] }).success).toBe(false)
    expect(ProjetoAzulSchema.safeParse({ ...ok, aparencias: [galeria, galeria] }).success).toBe(
      false,
    )
    expect(ProjetoAzulSchema.safeParse({ ganhoEm: ganho, aparencia: null }).success).toBe(false)
  })
})
