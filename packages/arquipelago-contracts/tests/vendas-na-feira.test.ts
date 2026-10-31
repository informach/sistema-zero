import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '../src/salvamento'
import {
  ItensDaVendaSchema,
  PRATOS_DA_FEIRA,
  PRATOS_POR_DIA_NA_FEIRA,
  precoNaFeira,
  prepararVendaNaFeira,
  ResultadoDaVendaSchema,
  VenderNaFeiraSchema,
} from '../src/vendas-na-feira'

const s = () => criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z'))

test('a banca compra só pratos prontos; o pão de queijo vende bem', () => {
  expect(PRATOS_DA_FEIRA).toContain('bolo-de-fuba')
  expect(PRATOS_DA_FEIRA).toContain('peixe-com-coco')
  expect(PRATOS_DA_FEIRA).not.toContain('milho')
  expect(PRATOS_DA_FEIRA).not.toContain('leite')
  expect(precoNaFeira('pao-de-queijo')).toBe(2)
  expect(precoNaFeira('bolo-de-fuba')).toBe(1)
  expect(precoNaFeira('milho')).toBeNull()
})

test('de um a cinco pratos por venda, só os da banca', () => {
  expect(ItensDaVendaSchema.safeParse({ 'bolo-de-fuba': 2 }).success).toBe(true)
  expect(ItensDaVendaSchema.safeParse({}).success).toBe(false)
  expect(ItensDaVendaSchema.safeParse({ 'bolo-de-fuba': 3, pipoca: 3 }).success).toBe(false)
  expect(ItensDaVendaSchema.safeParse({ milho: 1 }).success).toBe(false)
  const venda = {
    versao: 1,
    chave: '00000000-0000-4000-8000-000000000001',
    revisaoBase: 3,
    dia: '2026-10-31',
    itens: { 'pao-de-queijo': PRATOS_POR_DIA_NA_FEIRA },
  }
  expect(VenderNaFeiraSchema.safeParse(venda).success).toBe(true)
  expect(VenderNaFeiraSchema.safeParse({ ...venda, revisaoBase: 0 }).success).toBe(false)
  expect(
    ResultadoDaVendaSchema.safeParse({
      versao: 1,
      venda,
      pagamento: 'creditado',
      moedas: 10,
      guardado: { revisao: 4, salvamento: s(), atualizadoEm: '2026-10-31T12:00:00.000Z' },
    }).success,
  ).toBe(true)
})

test('vender tira os pratos e conta as moedas; sem os pratos nada muda', () => {
  const base = { ...s(), inventario: { 'pao-de-queijo': 3, 'bolo-de-fuba': 1, milho: 2 } }
  const r = prepararVendaNaFeira(base, { 'pao-de-queijo': 2, 'bolo-de-fuba': 1 })
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Venda recusada')
  expect(r.moedas).toBe(5)
  expect(r.salvamento.inventario).toEqual({ 'pao-de-queijo': 1, milho: 2 })
  expect(base.inventario['pao-de-queijo']).toBe(3)
  expect(prepararVendaNaFeira(base, { 'pao-de-queijo': 4 })).toEqual({
    ok: false,
    motivo: 'faltam-pratos',
  })
  expect(prepararVendaNaFeira(base, { milho: 1 })).toEqual({ ok: false, motivo: 'prato-invalido' })
  expect(prepararVendaNaFeira(base, { 'pao-de-queijo': 6 })).toEqual({
    ok: false,
    motivo: 'demais',
  })
})
