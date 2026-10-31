import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial, migrarSalvamento } from '@sistemazero/arquipelago-contracts'
import {
  conversarComAtividade,
  conversarNoAnel,
  entregarNoAnel,
  pedidoDoAnel,
  presentearNoAnel,
} from '../src/sistemas/amizade-do-anel'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { paginasDoDiario, TEXTO_DA_PAGINA } from '../src/sistemas/diario'
import { comecarConversaComOFloco } from '../src/sistemas/floco'
import { ITENS } from '../src/sistemas/itens'
import { comecarConversaComAJade } from '../src/sistemas/jade'
import { MORADORES_COM_NOVA_AMIZADE, VIDA_NO_ANEL } from '../src/sistemas/moradores-do-anel'

const dia = '2026-10-29'
const inicial = () => criarSalvamentoInicial(new Date(`${dia}T12:00:00Z`))

for (const quem of MORADORES_COM_NOVA_AMIZADE)
  describe(`amizade de ${quem}`, () => {
    test('conversa só conta uma vez no dia e o pedido é estável por perfil', () => {
      const s = inicial()
      const a = conversarNoAnel(s, quem, dia, 'perfil', ['Olá.'])
      expect(a.salvamento.moradores[quem].amizade).toBe(10)
      expect(a.falas[0]).toBe('Olá.')
      expect(conversarNoAnel(a.salvamento, quem, dia, 'perfil', []).salvamento).toBe(a.salvamento)
      expect(conversarNoAnel(s, quem, dia, 'perfil', []).salvamento.moradores[quem].pedido).toEqual(
        a.salvamento.moradores[quem].pedido,
      )
      const outroDia = conversarNoAnel(a.salvamento, quem, '2026-10-30', 'perfil', [])
      expect(outroDia.salvamento.moradores[quem].amizade).toBe(20)
      expect(s.moradores[quem].amizade).toBe(0)
      expect(migrarSalvamento(JSON.parse(JSON.stringify(outroDia.salvamento)))).toEqual(
        outroDia.salvamento,
      )
    })

    test('pedido tira exatamente os itens uma vez, nunca aceita pedido de ontem', () => {
      const s = conversarNoAnel(inicial(), quem, dia, 'p', []).salvamento
      const pedido = pedidoDoAnel(s, quem, dia)
      if (!pedido?.itens) throw new Error('Pedido ausente')
      expect(entregarNoAnel(s, quem, dia).salvamento).toBe(s)
      const pronto = { ...s, inventario: { ...pedido.itens, 'semente-alface': 5 } }
      const r = entregarNoAnel(pronto, quem, dia)
      expect(r.entregou).toBe(true)
      expect(r.salvamento.inventario).toEqual({ 'semente-alface': 5 })
      expect(r.salvamento.moradores[quem].amizade).toBe(40)
      expect(entregarNoAnel(r.salvamento, quem, dia).salvamento).toBe(r.salvamento)
      expect(entregarNoAnel(pronto, quem, '2026-10-30').entregou).toBe(false)
      expect(pedidoDoAnel(r.salvamento, quem, dia)).toBeNull()
    })

    test('presente respeita preferência, aniversário, estoque e teto', () => {
      const dados = VIDA_NO_ANEL[quem]
      const item = Object.keys(dados.gostos)[0]!
      const s = { ...inicial(), inventario: { [item]: 3, patins: 1 } }
      const r = presentearNoAnel(s, quem, item, dia)
      expect(r.salvamento.moradores[quem].amizade).toBe(20)
      expect(r.salvamento.inventario[item]).toBe(2)
      expect(presentearNoAnel(r.salvamento, quem, item, dia).salvamento).toBe(r.salvamento)
      expect(presentearNoAnel(s, quem, 'patins', dia).salvamento).toBe(s)
      expect(presentearNoAnel(s, quem, 'inexistente', dia).salvamento).toBe(s)
      const aniversario = `2026-${String(dados.aniversario.mes).padStart(2, '0')}-${String(dados.aniversario.dia).padStart(2, '0')}`
      expect(presentearNoAnel(s, quem, item, aniversario).salvamento.moradores[quem].amizade).toBe(
        40,
      )
      const pertoDoTeto = {
        ...s,
        moradores: { ...s.moradores, [quem]: { ...s.moradores[quem], amizade: 495 } },
      }
      expect(
        presentearNoAnel(pertoDoTeto, quem, item, dia).salvamento.moradores[quem].amizade,
      ).toBe(500)
    })

    test('não concilia presente com outro gasto concorrente da mesma mochila', () => {
      const base = { ...inicial(), inventario: { milho: 3 } }
      const local = presentearNoAnel(base, quem, 'milho', dia).salvamento
      const remoto = { ...base, inventario: { milho: 1 } }
      expect(conciliarSalvamento(base, local, remoto)).toBeNull()
      expect(conciliarSalvamento(base, local, base)).toBe(local)
    })

    test('todos os pedidos usam comida real e os textos seguem o padrão', () => {
      const dados = VIDA_NO_ANEL[quem]
      for (const p of dados.pedidos)
        for (const [item, quantidade] of Object.entries(p.itens)) {
          expect(ITENS[item]?.comida).toBeDefined()
          expect(quantidade).toBeGreaterThan(0)
        }
      for (const texto of [
        dados.convite,
        ...dados.amizade,
        ...dados.pedidos.map((p) => p.texto),
        ...(dados.pagina ? [dados.pagina.texto, dados.pagina.entrega] : []),
      ]) {
        expect(texto).not.toMatch(/[—!]/)
        expect(texto.split('.')[0]).not.toContain('?')
      }
    })
  })

test('as três páginas abrem no segundo coração e a entrega não se repete', () => {
  expect(TEXTO_DA_PAGINA['vale-dos-dinos']).toBe('Guardei tantos rascunhos que virou uma montanha.')
  expect(TEXTO_DA_PAGINA.nuvens).toBe('Deixei a faísca para quem vier depois.')
  for (const quem of ['floco', 'jade', 'irie'] as const) {
    const s = inicial()
    s.moradores[quem].amizade = 190
    const pagina = VIDA_NO_ANEL[quem].pagina
    expect(paginasDoDiario(s).find((p) => p.ilha === pagina.ilha)?.aberta).toBe(false)
    const r = conversarNoAnel(s, quem, dia, 'p', [])
    expect(r.falas.at(-1)).toBe(pagina.entrega)
    expect(paginasDoDiario(r.salvamento).find((p) => p.ilha === pagina.ilha)).toMatchObject({
      aberta: true,
      texto: pagina.texto,
    })
    expect(conversarNoAnel(r.salvamento, quem, '2026-10-30', 'p', []).falas).not.toContain(
      pagina.entrega,
    )
    const porPedido = conversarNoAnel(inicial(), quem, dia, 'p', []).salvamento
    porPedido.moradores[quem].amizade = 180
    porPedido.inventario = { ...pedidoDoAnel(porPedido, quem, dia)?.itens }
    expect(entregarNoAnel(porPedido, quem, dia).falas).toContain(pagina.entrega)
  }
  expect(Object.values(TEXTO_DA_PAGINA)).toHaveLength(8)
  expect(Object.values(TEXTO_DA_PAGINA).every((texto) => texto.length > 20)).toBe(true)
})

test('atividade da ilha e amizade acontecem juntas sem repetir ovo nem planador', () => {
  const s = inicial()
  s.pico.banda = 7
  s.vale.ninhos = ['ninho-1', 'ninho-2', 'ninho-3']
  const floco = conversarComAtividade(s, 'floco', dia, 'p', comecarConversaComOFloco)
  expect(floco.salvamento.inventario.planador).toBe(1)
  expect(floco.salvamento.moradores.floco.amizade).toBe(10)
  const jade = conversarComAtividade(floco.salvamento, 'jade', dia, 'p', comecarConversaComAJade)
  expect(jade.salvamento.vale.filhote).not.toBeNull()
  expect(jade.salvamento.moradores.jade.amizade).toBe(10)
  const deNovo = conversarComAtividade(jade.salvamento, 'jade', dia, 'p', comecarConversaComAJade)
  expect(deNovo.salvamento).toBe(jade.salvamento)
})
