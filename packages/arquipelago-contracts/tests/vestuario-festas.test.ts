import { expect, test } from 'bun:test'
import { AVATAR_PART_INFO } from '../../avatar-quarto/src/avatar/catalog'
import { MoldeDoVestuarioSchema, VESTUARIO_DAS_FESTAS } from '../src/vestuario-festas'

test('sugestões usam somente peças reais, com rótulo e categoria do avatar existente', () => {
  for (const [festa, colecao] of Object.entries(VESTUARIO_DAS_FESTAS)) {
    expect(MoldeDoVestuarioSchema.safeParse({ versao: 1, festa }).success).toBe(true)
    const todas = [...colecao.conquista, ...colecao.pecas]
    expect(new Set(todas).size).toBe(todas.length)
    for (const id of todas) {
      expect(AVATAR_PART_INFO[id]?.labelPt).toBeTruthy()
      expect(AVATAR_PART_INFO[id]?.category).toBeTruthy()
    }
    expect(colecao.titulo).not.toMatch(/[—!]/)
  }
})

test('cada festa conquista uma peça de cabeça e uma de corpo, feitas para ela (B16)', () => {
  const cabeca = new Set(['hat', 'hairAccessory'])
  const corpo = new Set(['top', 'outfit'])
  const vistas = new Set<string>()
  for (const colecao of Object.values(VESTUARIO_DAS_FESTAS)) {
    const [a, b] = colecao.conquista.map((id) => AVATAR_PART_INFO[id]?.category ?? '')
    expect(cabeca.has(a as string)).toBe(true)
    expect(corpo.has(b as string)).toBe(true)
    for (const id of colecao.conquista) {
      expect(vistas.has(id)).toBe(false)
      vistas.add(id)
    }
  }
  expect(vistas.size).toBe(8)
})

test('molde recusa preço, dono, peças arbitrárias e versão desconhecida', () => {
  const molde = { versao: 1, festa: 'junina' }
  for (const campo of ['preco', 'userId', 'pecas', 'saldo'])
    expect(MoldeDoVestuarioSchema.safeParse({ ...molde, [campo]: 1 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, versao: 2 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, festa: 'outra' }).success).toBe(false)
})
