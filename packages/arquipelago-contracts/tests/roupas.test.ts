import { expect, test } from 'bun:test'
import { festaDoDia } from '../src/festas'
import {
  CORACOES_DA_ROUPA,
  origemDaRoupa,
  PedidoDeRoupasSchema,
  ROUPAS_DA_AMIZADE,
  RoupasConcedidasSchema,
  roupasConquistadas,
} from '../src/roupas'
import { criarSalvamentoInicial } from '../src/salvamento'
import { VESTUARIO_DAS_FESTAS } from '../src/vestuario-festas'

const AGORA = new Date('2026-10-31T12:00:00Z')

test('a amizade de três corações dá a roupa daquele morador; a festa em vigor dá as de época', () => {
  const s = criarSalvamentoInicial(AGORA)
  expect(roupasConquistadas(s, null)).toEqual([])
  s.moradores.jade.amizade = CORACOES_DA_ROUPA * 100 - 1
  expect(roupasConquistadas(s, null)).toEqual([])
  s.moradores.jade.amizade = CORACOES_DA_ROUPA * 100
  s.moradores.nico.amizade = 500
  expect(roupasConquistadas(s, null)).toEqual(
    [ROUPAS_DA_AMIZADE.jade, ROUPAS_DA_AMIZADE.nico].sort(),
  )
  expect(roupasConquistadas(s, 'junina')).toEqual(
    [
      ROUPAS_DA_AMIZADE.jade,
      ROUPAS_DA_AMIZADE.nico,
      ...VESTUARIO_DAS_FESTAS.junina.conquista,
    ].sort(),
  )
  expect(origemDaRoupa(ROUPAS_DA_AMIZADE.jade)).toEqual({ tipo: 'amizade', quem: 'jade' })
  expect(origemDaRoupa(VESTUARIO_DAS_FESTAS.junina.conquista[0])).toEqual({ tipo: 'festa' })
})

test('as peças da amizade são distintas entre si e das de festa', () => {
  const daAmizade = Object.values(ROUPAS_DA_AMIZADE)
  expect(new Set(daAmizade).size).toBe(daAmizade.length)
  const deFesta = Object.values(VESTUARIO_DAS_FESTAS).flatMap((f) => [...f.conquista, ...f.pecas])
  for (const p of daAmizade) expect(deFesta).not.toContain(p)
})

test('o calendário é o mesmo do jogo: junho é Festa Junina, outubro não tem festa', () => {
  expect(festaDoDia(new Date('2026-06-15T12:00:00Z'))).toBe('junina')
  expect(festaDoDia(AGORA)).toBeNull()
  expect(festaDoDia(new Date('2027-01-03T12:00:00Z'))).toBe('fim-de-ano')
})

test('os esquemas das portas aceitam só ids de peça', () => {
  expect(RoupasConcedidasSchema.safeParse({ versao: 1, novas: ['hat-04'] }).success).toBe(true)
  expect(RoupasConcedidasSchema.safeParse({ versao: 1, novas: ['../x'] }).success).toBe(false)
  const pedido = {
    userId: '00000000-0000-4000-8000-000000000001',
    accountId: '00000000-0000-4000-8000-000000000002',
    audience: 'kids',
    pecas: ['hat-04'],
  }
  expect(PedidoDeRoupasSchema.safeParse(pedido).success).toBe(true)
  expect(PedidoDeRoupasSchema.safeParse({ ...pedido, pecas: [] }).success).toBe(false)
})
