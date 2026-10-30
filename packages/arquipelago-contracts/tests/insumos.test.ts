import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type CompraDeInsumos,
  CompraDeInsumosSchema,
  INSUMOS,
  prepararEntregaDeInsumos,
} from '../src/insumos'
import { criarSalvamentoInicial, SALVAMENTO_MAX_BYTES, SalvamentoSchema } from '../src/salvamento'

const pedido = (): CompraDeInsumos => ({
  versao: 1,
  chave: randomUUID(),
  revisaoBase: 1,
  item: 'leite',
  quantidade: 3,
})

test('comando recusa preço, conta, item novo, quantidade e versão inventados', () => {
  expect(CompraDeInsumosSchema.safeParse(pedido()).success).toBe(true)
  for (const erro of [
    { moedas: 0 },
    { accountId: randomUUID() },
    { item: 'isca' },
    { quantidade: 0 },
    { quantidade: 11 },
    { quantidade: 1.5 },
    { revisaoBase: 0 },
    { chave: 'nova' },
    { versao: 2 },
  ])
    expect(CompraDeInsumosSchema.safeParse({ ...pedido(), ...erro }).success).toBe(false)
})

test('entrega inteira é uma preparação pura, não troca saldo, projeto ou receita', () => {
  const s = criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))
  const antes = structuredClone(s)
  for (const item of Object.keys(INSUMOS) as (keyof typeof INSUMOS)[]) {
    const r = prepararEntregaDeInsumos(s, { ...pedido(), item })
    expect(r.ok).toBe(true)
    if (!r.ok) throw Error('Cabe na mochila inicial')
    expect(r.salvamento.inventario[item]).toBe((s.inventario[item] ?? 0) + 3)
    expect(r.moedas).toBe(INSUMOS[item].preco * 3)
    expect(r.salvamento.projetos).toBe(s.projetos)
    expect(r.salvamento.moradores).toBe(s.moradores)
    expect(s).toEqual(antes)
  }
})

test('capacidade exata cabe e excesso não trunca nem consome nada', () => {
  const s = criarSalvamentoInicial(new Date())
  s.inventario.leite = 996
  const r = prepararEntregaDeInsumos(s, pedido())
  expect(r.ok && r.salvamento.inventario.leite).toBe(999)
  expect(prepararEntregaDeInsumos(s, { ...pedido(), quantidade: 4 })).toEqual({
    ok: false,
    motivo: 'mochila-cheia',
  })
  expect(s.inventario.leite).toBe(996)
})

test('confere bytes UTF-8 antes da cobrança, sem apagar um item para caber outro', () => {
  const s = criarSalvamentoInicial(new Date())
  const bytes = () => new TextEncoder().encode(JSON.stringify(s)).byteLength
  // O inventário histórico aceita identificadores arbitrários. Conservá-los custa bytes reais.
  let n = 0
  while (bytes() < SALVAMENTO_MAX_BYTES - 150) s.inventario[`界${n++}`] = 1
  while (bytes() < SALVAMENTO_MAX_BYTES - 12) s.inventario[`x${n++}`] = 1
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
  expect(bytes()).toBeLessThanOrEqual(SALVAMENTO_MAX_BYTES)
  const antes = JSON.stringify(s)
  expect(prepararEntregaDeInsumos(s, { ...pedido(), item: 'polpa-de-acai' })).toEqual({
    ok: false,
    motivo: 'salvamento-cheio',
  })
  expect(JSON.stringify(s)).toBe(antes)
})
