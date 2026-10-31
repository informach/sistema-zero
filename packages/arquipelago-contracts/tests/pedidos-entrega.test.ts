import { expect, test } from 'bun:test'
import {
  escolherPedidoDoMorador,
  MORADORES_DOS_PEDIDOS,
  pedidoDoMoradorPeloId,
  prepararEntregaDoPedido,
} from '../src/pedidos-entrega'
import { criarSalvamentoInicial, SALVAMENTO_MAX_BYTES, SalvamentoSchema } from '../src/salvamento'

const dia = '2026-10-30'
const inicial = () => criarSalvamentoInicial(new Date(`${dia}T12:00:00Z`))

test('catálogo diário tem seis moradores, escolha estável e só pedidos conhecidos', () => {
  for (const quem of MORADORES_DOS_PEDIDOS) {
    const vistos = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const id = escolherPedidoDoMorador(quem, `perfil-${i}`, dia, 4)
      expect(id).toBe(escolherPedidoDoMorador(quem, `perfil-${i}`, dia, 4))
      expect(pedidoDoMoradorPeloId(quem, id)).not.toBeNull()
      expect(id.startsWith('achar-bicho')).toBe(false)
      vistos.add(id)
    }
    expect(vistos.size).toBeGreaterThan(1)
  }
  for (const id of ['achar-bicho--1', 'achar-bicho-4', 'achar-bicho-NaN', 'achar-bicho-0extra'])
    expect(pedidoDoMoradorPeloId('capi', id)).toBeNull()
})

test('entrega exige dia, catálogo e itens; não altera fonte nem aceita repetição', () => {
  for (const quem of MORADORES_DOS_PEDIDOS) {
    const s = inicial()
    const id = escolherPedidoDoMorador(quem, 'perfil', dia, 4)
    s.moradores[quem].pedido = { dia, id, entregue: false }
    const copia = structuredClone(s)
    expect(prepararEntregaDoPedido(s, quem, '2026-10-31')).toEqual({
      ok: false,
      motivo: 'pedido-indisponivel',
    })
    expect(prepararEntregaDoPedido(s, quem, dia)).toEqual({ ok: false, motivo: 'faltam-itens' })
    expect(s).toEqual(copia)
    s.inventario = { ...pedidoDoMoradorPeloId(quem, id)!.itens }
    s.necessidades = { fome: 50, energia: 50, diversao: 50 }
    const r = prepararEntregaDoPedido(s, quem, dia)
    expect(r.ok).toBe(true)
    if (!r.ok) throw Error('Entrega recusada')
    expect(r.moedas).toBe(3)
    expect(r.salvamento.moradores[quem].amizade).toBe(30)
    expect(r.salvamento.inventario).toEqual({})
    expect(prepararEntregaDoPedido(r.salvamento, quem, dia)).toEqual({
      ok: false,
      motivo: 'pedido-indisponivel',
    })
    expect(s.moradores[quem].pedido?.entregue).toBe(false)
  }
})

test('Bento ensina e dá cesta inteira ao cruzar coração; repetir não consome nem recebe outra', () => {
  const s = inicial()
  s.moradores.bento.amizade = 80
  s.moradores.bento.pedido = { dia, id: 'milho-2', entregue: false }
  s.inventario = { milho: 3 }
  s.necessidades = { fome: 90, energia: 90, diversao: 90 }
  const r = prepararEntregaDoPedido(s, 'bento', dia)
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Entrega recusada')
  expect(r.salvamento.inventario).toEqual({ milho: 1, fuba: 1, leite: 1, ovo: 1 })
  expect(r.novas.map((p) => p.id)).toEqual(['bolo-de-fuba'])
  expect(r.cesta).toBeNull()
  expect(r.moedas).toBe(4)
  s.inventario.leite = 999
  const antes = structuredClone(s)
  expect(prepararEntregaDoPedido(s, 'bento', dia)).toEqual({ ok: false, motivo: 'mochila-cheia' })
  expect(s).toEqual(antes)
})

test('bicho posterior comprova pedido da Capi, amizade respeita teto e UTF-8 também limita a cesta', () => {
  const s = inicial()
  s.moradores.capi.amizade = 490
  s.moradores.capi.pedido = { dia, id: 'achar-bicho-0', entregue: false }
  expect(prepararEntregaDoPedido(s, 'capi', dia)).toEqual({ ok: false, motivo: 'falta-bicho' })
  s.bichos.achados = ['coelho']
  const r = prepararEntregaDoPedido(s, 'capi', dia)
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Entrega recusada')
  expect(r.salvamento.moradores.capi.amizade).toBe(500)
  s.moradores.bento.amizade = 80
  s.moradores.bento.pedido = { dia, id: 'milho-1', entregue: false }
  s.inventario = { milho: 1 }
  // Chave histórica válida e multibyte: o limite é byte, não length de JavaScript.
  const bytes = () => new TextEncoder().encode(JSON.stringify(s)).length
  let i = 0
  while (bytes() < SALVAMENTO_MAX_BYTES - 70) s.inventario[`legado-${i++}-${'á'.repeat(16)}`] = 1
  while (bytes() < SALVAMENTO_MAX_BYTES - 12) s.inventario[`x${i++}`] = 1
  expect(bytes()).toBeLessThanOrEqual(SALVAMENTO_MAX_BYTES)
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
  const antes = structuredClone(s)
  expect(prepararEntregaDoPedido(s, 'bento', dia)).toEqual({
    ok: false,
    motivo: 'salvamento-cheio',
  })
  expect(s).toEqual(antes)
})

test('pedido de prato do Bento: só com a receita sabida e entregue como qualquer pedido (A22)', () => {
  const pratos = ['bolo-de-fuba-1', 'pao-de-queijo-3']
  // Sem amizade (o serviço e versões antigas), nenhum prato no sorteio.
  for (let i = 0; i < 100; i++)
    expect(pratos).not.toContain(escolherPedidoDoMorador('bento', `perfil-${i}`, dia, 0))
  const s = inicial()
  s.moradores.bento.amizade = 120
  s.moradores.bento.pedido = { dia, id: 'bolo-de-fuba-1', entregue: false }
  expect(prepararEntregaDoPedido(s, 'bento', dia)).toEqual({ ok: false, motivo: 'faltam-itens' })
  s.inventario = { 'bolo-de-fuba': 2 }
  const r = prepararEntregaDoPedido(s, 'bento', dia)
  expect(r.ok).toBe(true)
  if (!r.ok) throw Error('Entrega recusada')
  expect(r.salvamento.inventario['bolo-de-fuba']).toBe(1)
  expect(r.salvamento.moradores.bento.pedido?.entregue).toBe(true)
})
