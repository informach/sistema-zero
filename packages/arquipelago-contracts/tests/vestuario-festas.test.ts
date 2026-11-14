import { expect, test } from 'bun:test'
import { AVATAR_CATALOG as C } from '../../core/src/avatar'
import { ROUPAS_DA_AMIZADE } from '../src/roupas'
import { MoldeDoVestuarioSchema, VESTUARIO_DAS_FESTAS } from '../src/vestuario-festas'

/**
 * As roupas das festas e da amizade são peças do catálogo do avatar (o pack, `@sistemazero/core`
 * lido pelo caminho: o contrato não depende dele).
 */
const CABECA = new Set(['chapeu', 'chapeu_sobre_cabelo', 'capuz'])
const CORPO = new Set(['roupa_cima', 'roupa_inteira', 'costas'])

test('sugestões usam somente peças reais do catálogo, que a loja mostra', () => {
  for (const [festa, colecao] of Object.entries(VESTUARIO_DAS_FESTAS)) {
    expect(MoldeDoVestuarioSchema.safeParse({ versao: 1, festa }).success).toBe(true)
    const todas = [...colecao.conquista, ...colecao.pecas]
    expect(new Set(todas).size).toBe(todas.length)
    for (const id of todas) {
      const p = C.parts[id]
      expect(p?.label, id).toBeTruthy()
      expect(p?.hidden, id).toBeUndefined()
      expect(p?.retired, id).toBeUndefined()
    }
    for (const id of colecao.pecas) expect(C.parts[id]?.tier, id).toBe('coins')
    expect(colecao.titulo).not.toMatch(/[—!]/)
  }
})

test('cada festa conquista uma peça de cabeça e uma de corpo, só da festa (B16)', () => {
  const vistas = new Set<string>()
  for (const colecao of Object.values(VESTUARIO_DAS_FESTAS)) {
    const [a, b] = colecao.conquista.map((id) => C.parts[id]?.group ?? '')
    expect(CABECA.has(a as string)).toBe(true)
    expect(CORPO.has(b as string)).toBe(true)
    for (const id of colecao.conquista) {
      expect(C.parts[id]?.tier, id).toBe('festa')
      expect(vistas.has(id)).toBe(false)
      vistas.add(id)
    }
  }
  expect(vistas.size).toBe(8)
})

test('as roupas da amizade são peças pagas do catálogo', () => {
  for (const id of Object.values(ROUPAS_DA_AMIZADE)) {
    expect(C.parts[id]?.tier, id).toBe('coins')
    expect(C.parts[id]?.hidden, id).toBeUndefined()
  }
})

test('molde recusa preço, dono, peças arbitrárias e versão desconhecida', () => {
  const molde = { versao: 1, festa: 'junina' }
  for (const campo of ['preco', 'userId', 'pecas', 'saldo'])
    expect(MoldeDoVestuarioSchema.safeParse({ ...molde, [campo]: 1 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, versao: 2 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, festa: 'outra' }).success).toBe(false)
})
