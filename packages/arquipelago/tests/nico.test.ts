import { describe, expect, test } from 'bun:test'
import {
  BIT_DA_ILHA,
  criarSalvamentoInicial,
  prepararEntregaDoPedido,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { conversarComAtividade, temAmizadeDoAnel } from '../src/sistemas/amizade-do-anel'
import { VIDA_NO_ANEL } from '../src/sistemas/moradores-do-anel'
import { APRESENTACAO_DO_NICO, comecarConversaComONico, correioDoDia } from '../src/sistemas/nico'

/** O Nico, carteiro da praia da sua ilha (§6.28, A19). */

const HOJE = '2026-10-31'
const AMANHA = '2026-11-01'
const PERFIL = 'perfil-local'

function comIlhas(...ilhas: (keyof typeof BIT_DA_ILHA)[]): Salvamento {
  const s = criarSalvamentoInicial(new Date(`${HOJE}T12:00:00Z`))
  return { ...s, ilhasVisitadas: ilhas.reduce((m, i) => m | BIT_DA_ILHA[i], 0) }
}
const conversar = (s: Salvamento, dia = HOJE) =>
  conversarComAtividade(s, 'nico', dia, PERFIL, (x, d) => comecarConversaComONico(x, d))

describe('o correio do dia', () => {
  test('sem ilha visitada, não há correio', () => {
    expect(correioDoDia(comIlhas('sua-ilha'), HOJE)).toBeNull()
  })

  test('conta de quem há pedido nas ilhas visitadas, e tira os entregues hoje', () => {
    const s = comIlhas('sua-ilha', 'bosque', 'vila-doce')
    expect(correioDoDia(s, HOJE)).toBe(
      'No correio de hoje, pedidos da Capi e do Bento esperam por você.',
    )
    const capiEntregue = {
      ...s,
      moradores: {
        ...s.moradores,
        capi: { ...s.moradores.capi, pedido: { dia: HOJE, id: 'alface-2', entregue: true } },
      },
    }
    expect(correioDoDia(capiEntregue, HOJE)).toBe(
      'No correio de hoje, um pedido do Bento espera por você.',
    )
    // O pedido entregue ontem não tira ninguém do correio de hoje.
    expect(correioDoDia(capiEntregue, AMANHA)).toContain('da Capi e do Bento')
    const tudo = {
      ...capiEntregue,
      moradores: {
        ...capiEntregue.moradores,
        bento: { ...s.moradores.bento, pedido: { dia: HOJE, id: 'milho-1', entregue: true } },
      },
    }
    expect(correioDoDia(tudo, HOJE)).toBe(
      'O correio de hoje está em dia. Todos os pedidos foram entregues.',
    )
  })
})

describe('a conversa com o Nico', () => {
  test('o Nico é morador do anel: amizade, presentes e pedidos', () => {
    expect(temAmizadeDoAnel('nico')).toBe(true)
    expect(VIDA_NO_ANEL.nico.pedidos.length).toBeGreaterThan(0)
  })

  test('primeira vez: a apresentação, o correio, a amizade e o pedido dele', () => {
    const r = conversar(comIlhas('sua-ilha', 'bosque'))
    expect(r.falas.slice(0, APRESENTACAO_DO_NICO.length)).toEqual([...APRESENTACAO_DO_NICO])
    expect(r.falas).toContain('No correio de hoje, um pedido da Capi espera por você.')
    expect(r.falas.some((f) => f.startsWith('Hoje eu preciso de uma coisa:'))).toBe(true)
    expect(r.salvamento.moradores.nico.conversaEm).toBe(HOJE)
    expect(r.salvamento.moradores.nico.amizade).toBeGreaterThan(0)
    // De novo no mesmo dia: sem apresentação nem correio.
    const de = conversar(r.salvamento)
    expect(de.falas.some((f) => f.includes('carteiro da praia'))).toBe(false)
    expect(de.falas.some((f) => f.includes('correio'))).toBe(false)
    // No dia seguinte, o correio volta, sem a apresentação.
    const amanha = conversar(r.salvamento, AMANHA)
    expect(amanha.falas.some((f) => f.includes('carteiro da praia'))).toBe(false)
    expect(amanha.falas.some((f) => f.includes('correio'))).toBe(true)
  })

  test('o pedido do Nico é entregue pela mesma conta do serviço, sem cesta de receita', () => {
    const r = conversar(comIlhas('sua-ilha'))
    const pedido = VIDA_NO_ANEL.nico.pedidos.find(
      (p) => p.id === r.salvamento.moradores.nico.pedido?.id,
    )
    expect(pedido).toBeDefined()
    const s = { ...r.salvamento, inventario: { ...pedido!.itens } }
    const entrega = prepararEntregaDoPedido(s, 'nico', HOJE)
    expect(entrega.ok).toBe(true)
    if (!entrega.ok) throw Error('Entrega recusada')
    expect(entrega.salvamento.inventario).toEqual({})
    expect(entrega.salvamento.moradores.nico.pedido?.entregue).toBe(true)
  })

  test('as falas seguem as regras da criança', () => {
    const textos = [
      ...APRESENTACAO_DO_NICO,
      ...VIDA_NO_ANEL.nico.amizade,
      VIDA_NO_ANEL.nico.convite,
      ...VIDA_NO_ANEL.nico.pedidos.map((p) => p.texto),
      correioDoDia(comIlhas('bosque', 'vila-doce', 'recife'), HOJE)!,
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/[—!]/)
      expect(t.trim().endsWith('?')).toBe(false)
    }
  })
})
