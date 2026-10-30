import { expect, test } from 'bun:test'
import {
  CRESCIMENTO_MS,
  criarSalvamentoInicial,
  plantar,
  regar,
} from '@sistemazero/arquipelago-contracts'
import { colherNaIlha, primeiroPedido } from '../src/sistemas/primeiro-pedido'

const agora = new Date('2026-10-30T12:00:00Z')
function plantado() {
  const s = criarSalvamentoInicial(agora)
  s.casa.portaNova = true
  s.horta[0] = regar(plantar(s.horta[0]!, 'alface', agora)!, agora)!
  return s
}

test('pedido acompanha porta, plantar, regar, esperar, colher e conclusão existente', () => {
  const s = criarSalvamentoInicial(agora)
  expect(primeiroPedido(s, agora.getTime())?.etapa).toBe('porta')
  s.casa.portaNova = true
  expect(primeiroPedido(s, agora.getTime())?.etapa).toBe('plantar')
  s.horta[0] = plantar(s.horta[0]!, 'alface', agora)!
  expect(primeiroPedido(s, agora.getTime())?.etapa).toBe('regar')
  s.horta[0] = regar(s.horta[0]!, agora)!
  expect(primeiroPedido(s, agora.getTime())?.etapa).toBe('crescer')
  const depois = new Date(agora.getTime() + CRESCIMENTO_MS.alface)
  expect(primeiroPedido(s, depois.getTime())?.etapa).toBe('colher')
  const r = colherNaIlha(s, 0, depois, 0)
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Colheita madura')
  expect(r.ganhouGeladeira).toBe(true)
  expect(primeiroPedido(r.salvamento, depois.getTime())).toBeNull()
  expect(r.salvamento.projetos.geladeira?.ganhoEm).toBe(depois.toISOString())
  expect(r.salvamento.inventario.alface).toBeGreaterThan(0)
  expect(s.projetos.geladeira).toBeUndefined()
})

test('não concede cedo, sem canteiro nem espaço para alimento ou semente', () => {
  const s = plantado()
  expect(colherNaIlha(s, 0, agora, 0)).toEqual({ ok: false, motivo: 'imatura' })
  expect(colherNaIlha(s, 20, agora, 0)).toEqual({ ok: false, motivo: 'imatura' })
  const depois = new Date(agora.getTime() + CRESCIMENTO_MS.alface)
  for (const item of ['alface', 'semente-alface']) {
    const cheia = { ...s, inventario: { ...s.inventario, [item]: 999 } }
    const antes = structuredClone(cheia)
    expect(colherNaIlha(cheia, 0, depois, 0)).toEqual({ ok: false, motivo: 'mochila' })
    expect(cheia).toEqual(antes)
  }
})

test('colheita e repetição conservam aparência e data de um projeto já ganho', () => {
  const s = plantado()
  s.projetos.geladeira = {
    ganhoEm: agora.toISOString(),
    aparencia: { origem: 'galeria', id: 'geladeira-classica' },
    aparencias: [{ origem: 'galeria', id: 'geladeira-classica' }],
  }
  const depois = new Date(agora.getTime() + CRESCIMENTO_MS.alface)
  const r = colherNaIlha(s, 0, depois, 0)
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Colheita madura')
  expect(r.ganhouGeladeira).toBe(false)
  expect(r.salvamento.projetos.geladeira).toBe(s.projetos.geladeira)
  expect(colherNaIlha(r.salvamento, 0, depois, 0)).toEqual({ ok: false, motivo: 'imatura' })
  expect(r.salvamento.inventario['semente-alface']).toBe(s.inventario['semente-alface']! + 1)
})

test('instruções não dependem da cor ou do curso e seguem a voz da comunidade', () => {
  const s = plantado()
  const estados = [criarSalvamentoInicial(agora), s, { ...s, horta: [] }]
  for (const estado of estados) {
    const pedido = primeiroPedido(estado, agora.getTime())
    expect(pedido?.texto).toBeTruthy()
    expect(pedido?.texto).not.toMatch(/[—!?]/)
  }
})
