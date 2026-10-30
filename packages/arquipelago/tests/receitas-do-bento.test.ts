import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, type Salvamento } from '@sistemazero/arquipelago-contracts'
import { pedidoDoBentoPeloId } from '../src/sistemas/bento'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import {
  cestaDoBento,
  comecarConversaComOBento,
  entregarAoBento,
  FALA_DA_RECEITA,
  presentearOBento,
  receitasDoBento,
  receitasNovasDoBento,
} from '../src/sistemas/conversa-do-bento'
import { ITENS } from '../src/sistemas/itens'
import { AMIZADE } from '../src/sistemas/moradores'
import {
  cozinhar,
  fazerReceita,
  ingredientesPorExtenso,
  podeCozinhar,
  RECEITAS,
  receitaPeloId,
  receitasConhecidas,
  receitasPossiveis,
} from '../src/sistemas/receitas'

const HOJE = '2026-10-29'
const PERFIL = 'perfil-1'

const inicial = (): Salvamento => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
const comAmizade = (amizade: number, s = inicial()): Salvamento => ({
  ...s,
  moradores: { ...s.moradores, bento: { ...s.moradores.bento, amizade } },
})
const receita = (id: string) => {
  const r = receitaPeloId(id)
  if (!r) throw new Error(`sem a receita ${id}`)
  return r
}

function conferirTexto(fala: string) {
  expect(fala).not.toMatch(/[—!]/)
  expect((fala.split(/(?<=[.?])\s/)[0] ?? '').endsWith('?')).toBe(false)
}

describe('as receitas', () => {
  test('amizade e presente só avançam quando a primeira cesta cabe inteira', () => {
    const s = comAmizade(100 - AMIZADE.conversa)
    s.inventario.fuba = 999
    const antes = structuredClone(s)
    const recusado = comecarConversaComOBento(s, HOJE, PERFIL)
    expect(recusado.salvamento).toBe(s)
    expect(recusado.falas.join(' ')).toContain('não cabe inteira')
    expect(s).toEqual(antes)
    s.inventario.fuba = 998
    const recebido = comecarConversaComOBento(s, HOJE, PERFIL)
    expect(recebido.salvamento.inventario.fuba).toBe(999)
    expect(recebido.salvamento.moradores.bento.amizade).toBe(100)
    const presente = comAmizade(99)
    presente.inventario = { tomate: 1, fuba: 999 }
    const volta = presentearOBento(presente, 'tomate', HOJE)
    expect(volta.salvamento).toBe(presente)
    expect(volta.reacao).toBe('devolveu')
  })
  test('não perde ingredientes nem pratos quando a receita inteira não cabe', () => {
    for (const r of RECEITAS) {
      const inv = { ...r.precisa, [r.faz.id]: 1000 - r.faz.qtd }
      const antes = structuredClone(inv)
      expect(podeCozinhar(inv, r)).toBe(false)
      expect(cozinhar(inv, r)).toBeNull()
      expect(inv).toEqual(antes)
      expect(receitasPossiveis(inv, r.onde, [r])).toEqual([])
      const cabe = { ...r.precisa, [r.faz.id]: 999 - r.faz.qtd }
      expect(podeCozinhar(cabe, r)).toBe(true)
      expect(cozinhar(cabe, r)).toEqual({ [r.faz.id]: 999 })
    }
  })

  test('cada ingrediente existe, só o prato se come, e cada prato tem uma receita', () => {
    for (const r of RECEITAS) {
      expect(ITENS[r.faz.id]?.comida).toBeDefined()
      for (const [id, q] of Object.entries(r.precisa)) {
        expect(ITENS[id]).toBeDefined()
        expect(q).toBeGreaterThan(0)
      }
    }
    for (const id of ['fuba', 'leite', 'ovo', 'polvilho', 'queijo', 'cacau'])
      expect(ITENS[id]?.comida).toBeUndefined()
    expect(new Set(RECEITAS.map((r) => r.id)).size).toBe(RECEITAS.length)
  })

  test('o Bento lembra uma receita por coração, do bolo de fubá ao chocolate quente', () => {
    const ids = (c: number) =>
      receitasConhecidas(comAmizade(c * 100))
        .filter((r) => r.origem.tipo !== 'festa')
        .map((r) => r.id)
    expect(ids(0)).toEqual(['salada', 'pipoca'])
    expect(ids(1)).toEqual(['salada', 'pipoca', 'bolo-de-fuba'])
    expect(ids(2)).toContain('pao-de-queijo')
    expect(ids(3)).toContain('brigadeiro')
    expect(ids(4)).toHaveLength(6)
    expect(receita('bolo-de-fuba').onde).toBe('forno')
    expect(receita('pao-de-queijo').onde).toBe('forno')
    expect(receita('brigadeiro').onde).toBe('bancada')
    expect(receita('chocolate-quente').onde).toBe('bancada')
  })

  test('só oferece as que ela sabe, no lugar certo, com os ingredientes', () => {
    const inv = { fuba: 1, leite: 2, ovo: 1, cacau: 1 }
    expect(receitasPossiveis(inv, 'forno', receitasConhecidas(comAmizade(0)))).toEqual([])
    expect(
      receitasPossiveis(inv, 'forno', receitasConhecidas(comAmizade(100))).map((r) => r.id),
    ).toEqual(['bolo-de-fuba'])
    expect(
      receitasPossiveis(inv, 'bancada', receitasConhecidas(comAmizade(400))).map((r) => r.id),
    ).toEqual(['brigadeiro', 'chocolate-quente'])
  })

  test('fazer gasta os ingredientes e põe o prato, com a fala do forno', () => {
    const s = { ...inicial(), inventario: { fuba: 2, leite: 1, ovo: 1 } }
    const feito = fazerReceita(s, receita('bolo-de-fuba'))
    expect(feito?.salvamento.inventario).toEqual({ fuba: 1, 'bolo-de-fuba': 1 })
    expect(feito?.fala.startsWith('Saiu do forno')).toBe(true)
    expect(fazerReceita(inicial(), receita('bolo-de-fuba'))).toBeNull()
    expect(ingredientesPorExtenso(receita('bolo-de-fuba'), (id) => id)).toBe(
      '1 fuba, 1 leite e 1 ovo',
    )
  })
})

describe('o Bento ensina as receitas', () => {
  test('as falas seguem a voz da casa', () => {
    for (const r of RECEITAS.filter(
      (x) => x.origem.tipo === 'amizade' && x.origem.morador === 'bento',
    )) {
      const f = FALA_DA_RECEITA[r.id]
      expect(f).toBeDefined()
      conferirTexto(f ?? '')
    }
  })

  test('passar um coração na conversa ensina o bolo e dá os ingredientes da primeira vez', () => {
    // Já com a lanterna, que o Bento dá na segunda conversa (fase2-06).
    const s = comAmizade(100 - AMIZADE.conversa, { ...inicial(), inventario: { lanterna: 1 } })
    const r = comecarConversaComOBento(s, HOJE, PERFIL)
    expect(r.falas.at(-1)).toBe(FALA_DA_RECEITA['bolo-de-fuba'])
    expect(r.salvamento.inventario).toMatchObject({ fuba: 1, leite: 1, ovo: 1 })
    // De novo no mesmo dia: nada a ensinar, nada a dar.
    const outra = comecarConversaComOBento(r.salvamento, HOJE, PERFIL)
    expect(outra.salvamento.inventario).toEqual(r.salvamento.inventario)
  })

  test('presente que passa o coração também ensina', () => {
    const s = { ...comAmizade(200 - AMIZADE.presenteQueGosta), inventario: { milho: 1 } }
    const r = presentearOBento(s, 'milho', HOJE)
    // Com dois corações ele também entrega a página do diário (fase2-12), depois da receita.
    expect(r.falas[1]).toBe(FALA_DA_RECEITA['pao-de-queijo'] ?? '-')
    expect(r.salvamento.inventario).toMatchObject({ polvilho: 1, queijo: 1 })
  })

  test('cada pedido entregue traz a cesta de uma receita já ensinada', () => {
    const s = comecarConversaComOBento(comAmizade(150), HOJE, PERFIL).salvamento
    const itens = pedidoDoBentoPeloId(s.moradores.bento.pedido?.id ?? '')?.itens ?? {}
    const pronto = { ...s, inventario: { ...itens } }
    const r = entregarAoBento(pronto, HOJE)
    expect(r.entregou).toBe(true)
    const cesta = cestaDoBento(r.salvamento.moradores.bento.amizade, HOJE)
    expect(cesta?.id).toBe('bolo-de-fuba')
    expect(r.salvamento.inventario).toMatchObject({ fuba: 1, leite: 1, ovo: 1 })
    expect(r.falas.at(-1)).toContain('despensa')
    for (const f of r.falas) conferirTexto(f)
  })

  test('sem receita ensinada, nada de cesta; quando ensina agora, os ingredientes vêm uma vez', () => {
    expect(cestaDoBento(0, HOJE)).toBeNull()
    const s = comecarConversaComOBento(
      comAmizade(100 - AMIZADE.conversa - AMIZADE.pedido),
      HOJE,
      PERFIL,
    )
    // A conversa (+10) não passa o coração; a entrega (+30) passa.
    const itens = pedidoDoBentoPeloId(s.salvamento.moradores.bento.pedido?.id ?? '')?.itens ?? {}
    const r = entregarAoBento({ ...s.salvamento, inventario: { ...itens } }, HOJE)
    expect(r.falas).toContain(FALA_DA_RECEITA['bolo-de-fuba'] ?? '-')
    expect(r.salvamento.inventario).toEqual({ fuba: 1, leite: 1, ovo: 1 })
  })

  test('as receitas novas são as que passam o coração, e só elas', () => {
    expect(receitasNovasDoBento(90, 110).map((r) => r.id)).toEqual(['bolo-de-fuba'])
    expect(receitasNovasDoBento(110, 190)).toEqual([])
    expect(receitasNovasDoBento(0, 500)).toHaveLength(4)
    expect(receitasDoBento(250).map((r) => r.id)).toEqual(['bolo-de-fuba', 'pao-de-queijo'])
  })

  test('o forno chega com a primeira receita do Bento', () => {
    const agora = new Date('2026-10-29T12:00:00Z')
    expect(ganharProjetos(comAmizade(99), agora).ganhos).not.toContain('forno')
    const r = ganharProjetos(comAmizade(100), agora)
    expect(r.ganhos).toContain('forno')
    expect(r.salvamento.projetos.forno?.aparencia).toBeNull()
    expect(ganharProjetos(r.salvamento, agora).ganhos).not.toContain('forno')
  })
})
