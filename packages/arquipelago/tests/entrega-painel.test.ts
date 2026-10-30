import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import { lojaDaConversa } from '../src/estado/moradores'
import { entregarPedidoPeloPainel } from '../src/interface/entrega-do-pedido'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarArmazemDeSalvamento } from '../src/sistemas/armazem-salvamento'
import { entregarAoBento } from '../src/sistemas/conversa-do-bento'
import { criarFilaDeSalvamento } from '../src/sistemas/salvar'

const agora = () => new Date('2026-10-30T12:00:00Z')
async function montar() {
  const plataforma = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  const salvamento = criarSalvamentoInicial(agora())
  salvamento.moradores.bento.amizade = 80
  salvamento.moradores.bento.pedido = { dia: '2026-10-30', id: 'milho-2', entregue: false }
  salvamento.inventario = { milho: 3 }
  const loja = criarLoja({
    salvamento,
    jornada: 8,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: {} },
    acesso: { liberado: true, motivo: null, limiteDiarioMinutos: 30, usadoHojeSegundos: 0 },
    aoMudar: () => {},
  })
  const armazem = await criarArmazemDeSalvamento(
    `kids:${crypto.randomUUID()}`,
    async () => () => {},
  )
  const fila = criarFilaDeSalvamento({
    servico: plataforma.servico,
    armazem,
    guardadoInicial: plataforma.guardado(),
    rascunhoInicial: null,
    conferirOperacoes: true,
    agora,
    aoAdotar: (g) => loja.getState().adotar(g),
    aoSituacao: (s) => loja.getState().definirSituacaoSalvamento(s),
    aoErro: () => {},
    agendar: () => 1,
    cancelar: () => {},
  })
  await fila.retomarOperacoes()
  fila.guardar(salvamento)
  loja.getState().abrirPainel('bento')
  lojaDaConversa(loja, 'bento').getState().abrir(['Pedido de hoje.'])
  return { loja, fila, plataforma }
}

test('confirmação mantém a conversa e mostra o recibo durante a retomada do tempo', async () => {
  const c = await montar()
  const paineis: (string | null)[] = []
  const soltar = c.loja.subscribe((s, anterior) => {
    paineis.push(s.painelAberto)
    // O gerente do Kids retoma a sessão assim que a confirmação termina.
    if (anterior.salvamentoSituacao === 'confirmando' && s.salvamentoSituacao === 'ok')
      s.definirTempoSincronizando(true)
  })
  try {
    await entregarPedidoPeloPainel(c, 'bento', 'bento', (s) => entregarAoBento(s, '2026-10-30'))
    expect(c.loja.getState().salvamento.moradores.bento.pedido?.entregue).toBe(true)
    expect(c.loja.getState().tempoSincronizando).toBe(true)
    expect(c.loja.getState().painelAberto).toBe('bento')
    expect(paineis).not.toContain(null)
    expect(lojaDaConversa(c.loja, 'bento').getState().falas).toContain(
      'Você ganhou 4 moedas por ajudar.',
    )
  } finally {
    soltar()
    await c.fila.parar()
  }
})

test('confirmação pausa mutações; conflito e fim do tempo ainda fecham a conversa', async () => {
  const c = await montar()
  try {
    c.loja.getState().definirSituacaoSalvamento('confirmando')
    const antes = c.loja.getState().salvamento
    c.loja.getState().mudar((s) => ({ ...s, inventario: {} }))
    expect(c.loja.getState().salvamento).toBe(antes)
    expect(c.loja.getState().painelAberto).toBe('bento')
    c.loja.getState().definirSituacaoSalvamento('conflito')
    expect(c.loja.getState().painelAberto).toBeNull()
    c.loja.getState().definirSituacaoSalvamento('ok')
    c.loja.getState().abrirPainel('bento')
    c.loja.getState().registrarTempo(1800, true)
    expect(c.loja.getState().painelAberto).toBeNull()
  } finally {
    await c.fila.parar()
  }
})

test('resposta tardia não reabre uma conversa fechada nem cobre fim de tempo ou conflito', async () => {
  for (const motivo of ['fechar', 'tempo', 'conflito']) {
    const c = await montar()
    const soltar = c.loja.subscribe((s, antes) => {
      if (antes.salvamentoSituacao !== 'confirmando' || s.salvamentoSituacao !== 'ok') return
      if (motivo === 'fechar') s.abrirPainel('diario')
      else if (motivo === 'tempo') s.registrarTempo(1800, true)
      else s.definirSituacaoSalvamento('conflito')
    })
    try {
      await entregarPedidoPeloPainel(c, 'bento', 'bento', (s) => entregarAoBento(s, '2026-10-30'))
      expect(c.loja.getState().salvamento.moradores.bento.pedido?.entregue).toBe(true)
      expect(c.loja.getState().painelAberto).toBe(motivo === 'fechar' ? 'diario' : null)
      expect(lojaDaConversa(c.loja, 'bento').getState().falas).toEqual(['Pedido de hoje.'])
    } finally {
      soltar()
      await c.fila.parar()
    }
  }
})
