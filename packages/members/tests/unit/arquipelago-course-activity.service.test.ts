import { describe, expect, test } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import {
  ArquipelagoCourseActivityService,
  AULAS_CONCLUIDAS_MAXIMO,
} from '../../src/application/arquipelago/arquipelago-course-activity.service'

const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '22222222-2222-4222-8222-222222222222'
const DE = new Date('2026-10-22T03:00:00Z')
const ATE = new Date('2026-10-29T03:00:00Z')

function servico(linhas: { userId: string; completedAt: Date }[]) {
  const pedidos: unknown[] = []
  const s = new ArquipelagoCourseActivityService({
    async completedBetween(userIds, from, to, limit) {
      pedidos.push({ userIds, from, to, limit })
      return linhas
    },
  })
  return { s, pedidos }
}

describe('a hora das aulas concluídas para o jogo', () => {
  test('uma linha por pessoa pedida, mesmo sem aula; ids iguais contam uma vez', async () => {
    const { s, pedidos } = servico([{ userId: LIA, completedAt: new Date('2026-10-26T15:00:00Z') }])
    const r = await s.concluidas({ usuarios: [LIA, TOM, LIA.toUpperCase()], de: DE, ate: ATE })
    expect(r).toEqual({
      usuarios: [
        { userId: LIA, concluidasEm: ['2026-10-26T15:00:00.000Z'] },
        { userId: TOM, concluidasEm: [] },
      ],
    })
    expect(pedidos).toEqual([
      { userIds: [LIA, TOM], from: DE, to: ATE, limit: 2 * AULAS_CONCLUIDAS_MAXIMO },
    ])
  })

  test('recusa janela invertida ou maior que 9 dias e lista vazia ou grande demais', async () => {
    const { s, pedidos } = servico([])
    const longe = new Date(DE.getTime() + 9 * 86_400_000 + 1)
    for (const pedido of [
      { usuarios: [LIA], de: ATE, ate: DE },
      { usuarios: [LIA], de: DE, ate: longe },
      { usuarios: [], de: DE, ate: ATE },
      { usuarios: Array.from({ length: 21 }, (_, i) => `${i}`), de: DE, ate: ATE },
    ]) {
      let erro: unknown
      try {
        await s.concluidas(pedido)
      } catch (e) {
        erro = e
      }
      expect(erro).toBeInstanceOf(ValidationError)
    }
    expect(pedidos).toEqual([])
  })

  test('o teto por pessoa vale mesmo se a consulta trouxer mais', async () => {
    const muitas = Array.from({ length: AULAS_CONCLUIDAS_MAXIMO + 3 }, (_, i) => ({
      userId: LIA,
      completedAt: new Date(DE.getTime() + i * 1000),
    }))
    const r = await servico(muitas).s.concluidas({ usuarios: [LIA], de: DE, ate: ATE })
    expect(r.usuarios[0]?.concluidasEm).toHaveLength(AULAS_CONCLUIDAS_MAXIMO)
  })
})
