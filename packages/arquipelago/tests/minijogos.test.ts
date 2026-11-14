import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'

test('primeiro aprovado entrega fliperama uma vez, sem depender da aparência', () => {
  const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  expect(ganharProjetos(s, new Date(), false).ganhos).not.toContain('fliperama')
  const r = ganharProjetos(s, new Date(), true)
  expect(r.ganhos).toContain('fliperama')
  expect(r.salvamento.projetos.fliperama?.aparencia).toBeNull()
  expect(ganharProjetos(r.salvamento, new Date(), true).ganhos).not.toContain('fliperama')
  expect(s.projetos.fliperama).toBeUndefined()
})
