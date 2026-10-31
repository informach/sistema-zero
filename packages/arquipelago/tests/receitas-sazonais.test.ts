import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  SALVAMENTO_MAX_BYTES,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { festaDoDia } from '../src/sistemas/festas'
import { ITENS } from '../src/sistemas/itens'
import {
  fazerReceita,
  receitaEmEpoca,
  receitaPeloId,
  receitasConhecidas,
} from '../src/sistemas/receitas'

test('receitas voltam todo ano e pratos guardados sobrevivem à troca da festa', () => {
  for (const [id, data] of [
    ['salada-do-carnaval', '2027-02-09T12:00:00Z'],
    ['milho-da-fogueira', '2027-06-15T12:00:00Z'],
    ['pipoca-de-festa', '2028-06-15T12:00:00Z'],
  ] as const) {
    const r = receitaPeloId(id)!
    const s = criarSalvamentoInicial(new Date(data))
    s.inventario = { ...r.precisa }
    expect(receitasConhecidas(s).some((r) => r.id === id)).toBe(true)
    expect(receitaEmEpoca(r, null)).toBe(false)
    expect(fazerReceita(s, r)).toBeNull()
    const feito = fazerReceita(s, r, festaDoDia(new Date(data)))
    expect(feito).not.toBeNull()
    expect(s.inventario).toEqual(r.precisa)
    const relido = SalvamentoSchema.parse(JSON.parse(JSON.stringify(feito!.salvamento)))
    expect(relido.inventario[id]).toBe(1)
    expect(fazerReceita(relido, r, festaDoDia(new Date('2029-08-01T12:00:00Z')))).toBeNull()
    expect(relido.inventario[id]).toBe(1)
    expect(ITENS[id]?.comida?.diversao).toBeGreaterThan(0)
  }
})

test('a receita sazonal não troca ingredientes quando a mochila está cheia', () => {
  const r = receitaPeloId('milho-da-fogueira')!
  const s = criarSalvamentoInicial(new Date('2027-06-15T12:00:00Z'))
  s.inventario = { milho: 2, 'milho-da-fogueira': 999 }
  const antes = structuredClone(s)
  expect(fazerReceita(s, r, 'junina')).toBeNull()
  expect(s).toEqual(antes)
  expect(fazerReceita(s, receitaPeloId('pipoca')!)).not.toBeNull()
})

test('cozinhar não estoura o limite UTF-8 nem perde ingredientes para caber o prato', () => {
  const s = criarSalvamentoInicial(new Date('2027-06-15T12:00:00Z'))
  s.inventario = { milho: 2 }
  const bytes = () => new TextEncoder().encode(JSON.stringify(s)).byteLength
  let n = 0
  while (bytes() < SALVAMENTO_MAX_BYTES - 150) s.inventario[`界${n++}`] = 1
  while (bytes() < SALVAMENTO_MAX_BYTES - 12) s.inventario[`x${n++}`] = 1
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
  const antes = JSON.stringify(s)
  expect(fazerReceita(s, receitaPeloId('milho-da-fogueira')!, 'junina')).toBeNull()
  expect(JSON.stringify(s)).toBe(antes)
})
