import { expect, test } from 'bun:test'
import {
  aparenciaDoItem,
  destinosDaAparencia,
  GALERIA,
  IDS_DA_GALERIA,
  ITEM_DA_APARENCIA,
  PedidoDePosseDaGaleriaSchema,
  PosseDaGaleriaSchema,
  precoDoItemCompartilhado,
} from '../src'

test('nove identidades sem colisões e três destinos compatíveis sem renomear aparências', () => {
  expect(new Set(Object.values(ITEM_DA_APARENCIA)).size).toBe(9)
  expect(IDS_DA_GALERIA.filter((id) => destinosDaAparencia(id).includes('quarto'))).toEqual([
    'aquario-classico',
    'fliperama-classico',
    'planta-interior-classica',
  ])
  for (const id of IDS_DA_GALERIA) {
    expect(aparenciaDoItem(ITEM_DA_APARENCIA[id])).toBe(id)
    expect(precoDoItemCompartilhado(ITEM_DA_APARENCIA[id])).toBe(GALERIA[id].preco)
  }
  expect(aparenciaDoItem('outro')).toBeUndefined()
  expect(precoDoItemCompartilhado('outro')).toBeUndefined()
})

test('contrato interno recusa saldo, preço, destino e identidade inventados no pedido', () => {
  const pedido = {
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    audience: 'kids',
    aparencia: 'aquario-classico',
    equipe: false,
  }
  expect(PedidoDePosseDaGaleriaSchema.safeParse(pedido).success).toBe(true)
  for (const extra of [
    { preco: 0 },
    { saldo: 999 },
    { itemId: 'fliperama' },
    { destino: 'quarto' },
  ])
    expect(PedidoDePosseDaGaleriaSchema.safeParse({ ...pedido, ...extra }).success).toBe(false)
  expect(
    PosseDaGaleriaSchema.safeParse({ versao: 1, possuidas: ['outra'], saldo: 3 }).success,
  ).toBe(false)
})
