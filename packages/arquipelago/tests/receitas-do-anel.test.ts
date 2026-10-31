import { expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  criarSalvamentoInicial,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
} from '@sistemazero/arquipelago-contracts'
import { cenariosDeSalvamentoCheio } from '../../arquipelago-contracts/tests/cenario-salvamento-cheio'
import { conversarNoAnel, entregarNoAnel } from '../src/sistemas/amizade-do-anel'
import { colecaoDeReceitas } from '../src/sistemas/diario'
import { ITENS, trocarItensAntigos } from '../src/sistemas/itens'
import { type MoradorDoAnel, VIDA_NO_ANEL } from '../src/sistemas/moradores-do-anel'
import { fazerReceita, receitaPeloId, receitasConhecidas } from '../src/sistemas/receitas'

const hoje = '2026-10-29'
const agora = new Date(`${hoje}T12:00:00Z`)
const pares: readonly [MoradorDoAnel, string, Record<string, number>][] = [
  ['mare', 'peixe-com-coco', { peixe: 1, coco: 1, limao: 1 }],
  ['jade', 'acai-na-tigela', { 'polpa-de-acai': 1 }],
  ['floco', 'mingau-de-milho', { fuba: 1, leite: 1 }],
  ['irie', 'canjica', { leite: 1 }],
]

test('catálogo inteiro a 999 cabe junto da obra, amizades e rotinas no teto', () => {
  // Lembranças e equipamentos chegam uma vez só (registrar e entregar não somam): ficam em 1.
  const inventario = Object.fromEntries(
    Object.values(ITENS).map((i) => [i.id, i.lembranca || i.equipamento ? 1 : 999]),
  )
  const tamanhos = cenariosDeSalvamentoCheio(inventario).map((s) => {
    const completo = { ...s, ilhasVisitadas: 255 }
    expect(migrarSalvamento(completo)?.inventario).toEqual(inventario)
    return new TextEncoder().encode(JSON.stringify(completo)).byteLength
  })
  expect(Math.max(...tamanhos)).toBeLessThan(SALVAMENTO_MAX_BYTES)
  // V20 no teto com o catálogo a 999, com as coleções do Pico e das Nuvens, as duas iscas, os 24
  // móveis da casa, as seis vagas da galeria do Farol (30/10/2026) e o peixe com coco no lugar da
  // moqueca, com peixe, coco e limão (31/10/2026, A6): 64.975 bytes. V21 com o Nico morador
  // (A19): uns 311 bytes de folga. Um campo novo pede compactar antes.
  expect(SALVAMENTO_MAX_BYTES - Math.max(...tamanhos)).toBeGreaterThan(250)
})

for (const [quem, receitaId, cesta] of pares) {
  test(`${quem}: ensina com um coração, diário e bancada concordam e a cesta cozinha`, () => {
    const s = criarSalvamentoInicial(agora)
    s.moradores[quem].amizade = 90
    expect(receitasConhecidas(s).some((r) => r.id === receitaId)).toBe(false)
    expect(colecaoDeReceitas(s).find((r) => r.id === receitaId)).toMatchObject({ sabe: false })
    const r = conversarNoAnel(s, quem, hoje, 'perfil-local', [])
    const receita = receitaPeloId(receitaId)
    expect(receita).not.toBeNull()
    if (!receita) throw Error('Receita ausente')
    expect(r.falas.some((f) => f.includes(receita.nome.toLowerCase()))).toBe(true)
    expect(receitasConhecidas(r.salvamento).some((x) => x.id === receitaId)).toBe(true)
    expect(colecaoDeReceitas(r.salvamento).find((x) => x.id === receitaId)).toMatchObject({
      sabe: true,
    })
    expect(
      conversarNoAnel(r.salvamento, quem, hoje, 'perfil-local', []).falas.some((f) =>
        f.includes(receita.nome.toLowerCase()),
      ),
    ).toBe(false)
    const pedido = VIDA_NO_ANEL[quem].pedidos[0]
    r.salvamento.moradores[quem].pedido = { dia: hoje, id: pedido.id, entregue: false }
    r.salvamento.inventario = { ...pedido.itens }
    const entregue = entregarNoAnel(r.salvamento, quem, hoje)
    expect(entregue.entregou).toBe(true)
    expect(entregue.salvamento.inventario).toEqual(cesta)
    expect(entregarNoAnel(entregue.salvamento, quem, hoje).salvamento).toBe(entregue.salvamento)
    const pronto = { ...entregue.salvamento, inventario: { ...cesta } }
    for (const [item, qtd] of Object.entries(receita.precisa)) {
      expect(ITENS[item]).toBeDefined()
      if (!(item in cesta)) {
        expect(['tomate', 'alface', 'milho']).toContain(item)
        pronto.inventario[item] = qtd
      }
    }
    expect(fazerReceita(pronto, receita)?.salvamento.inventario).toEqual({
      [receita.faz.id]: receita.faz.qtd,
    })
  })
  test(`${quem}: cesta cheia recusa antes de consumir o pedido ou contar amizade`, () => {
    const s = criarSalvamentoInicial(agora)
    const pedido = VIDA_NO_ANEL[quem].pedidos[0]
    s.moradores[quem] = {
      ...s.moradores[quem],
      amizade: 100,
      pedido: { dia: hoje, id: pedido.id, entregue: false },
    }
    s.inventario = { ...pedido.itens }
    for (const item of Object.keys(cesta)) s.inventario[item] = 999
    const antes = structuredClone(s)
    const r = entregarNoAnel(s, quem, hoje)
    expect(r.entregou).toBe(false)
    expect(r.salvamento).toBe(s)
    expect(s).toEqual(antes)
    expect(r.falas.join(' ')).toContain('mochila')
  })
}

test('quatro bichos liberam a receita de coleção sem exigir adoção nem repetir contagem', () => {
  const s = criarSalvamentoInicial(agora)
  s.bichos.achados = BICHOS_DO_BOSQUE.slice(0, 3)
  expect(receitasConhecidas(s).some((r) => r.id === 'salada-colorida')).toBe(false)
  s.bichos.achados = [...BICHOS_DO_BOSQUE]
  expect(receitasConhecidas(s).some((r) => r.id === 'salada-colorida')).toBe(true)
  expect(colecaoDeReceitas(s).find((r) => r.id === 'salada-colorida')).toMatchObject({ sabe: true })
  expect(s.bichos.adotado).toBeNull()
})

test('a moqueca antiga vira peixe com coco na mochila e na geladeira (nada se perde, A6)', () => {
  const s = criarSalvamentoInicial(agora)
  const antes = {
    ...s,
    inventario: { ...s.inventario, 'moqueca-de-legumes': 2, 'peixe-com-coco': 1 },
    projetos: {
      geladeira: {
        ganhoEm: agora.toISOString(),
        aparencia: null,
        aparencias: [],
        guardado: { 'moqueca-de-legumes': 1, alface: 1 },
      },
    },
  }
  const depois = trocarItensAntigos(antes)
  expect(depois.inventario['moqueca-de-legumes']).toBeUndefined()
  expect(depois.inventario['peixe-com-coco']).toBe(3)
  expect(depois.projetos.geladeira?.guardado).toEqual({ 'peixe-com-coco': 1, alface: 1 })
  expect(ITENS['peixe-com-coco']?.comida).toEqual({ fome: 70, energia: 10 })
  expect(trocarItensAntigos(depois)).toBe(depois)
  expect(trocarItensAntigos(s)).toBe(s)
})
