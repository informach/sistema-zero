import { expect, test } from 'bun:test'
import { AVATAR_PART_INFO } from '../../avatar-quarto/src/avatar/catalog'
import { MoldeDoVestuarioSchema, VESTUARIO_DAS_FESTAS } from '../src/vestuario-festas'

test('sugestões usam somente peças reais, com rótulo e categoria do avatar existente', () => {
  for (const [festa, colecao] of Object.entries(VESTUARIO_DAS_FESTAS)) {
    expect(MoldeDoVestuarioSchema.safeParse({ versao: 1, festa }).success).toBe(true)
    expect(new Set(colecao.pecas).size).toBe(colecao.pecas.length)
    for (const id of colecao.pecas) {
      expect(AVATAR_PART_INFO[id]?.labelPt).toBeTruthy()
      expect(AVATAR_PART_INFO[id]?.category).toBeTruthy()
    }
    expect(colecao.titulo).not.toMatch(/[—!]/)
  }
})

test('molde recusa preço, dono, peças arbitrárias e versão desconhecida', () => {
  const molde = { versao: 1, festa: 'junina' }
  for (const campo of ['preco', 'userId', 'pecas', 'saldo'])
    expect(MoldeDoVestuarioSchema.safeParse({ ...molde, [campo]: 1 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, versao: 2 }).success).toBe(false)
  expect(MoldeDoVestuarioSchema.safeParse({ ...molde, festa: 'outra' }).success).toBe(false)
})
