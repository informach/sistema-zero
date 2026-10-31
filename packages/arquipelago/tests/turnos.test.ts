import { describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  POSTOS_DA_VILA,
  type PostoDaVila,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { FALA_DA_RECEITA, FALA_DO_TURNO_NA_PADARIA } from '../src/sistemas/conversa-do-bento'
import { ITENS } from '../src/sistemas/itens'
import { AMIZADE } from '../src/sistemas/moradores'
import {
  BALCOES,
  comecarTurno,
  entregarBandeja,
  estrelasDoTurno,
  FREGUESES,
  falaDoPedido,
  fecharTurno,
  itensPorExtenso,
  jaPagouHoje,
  MAXIMO_NA_BANDEJA,
  pedidosDoTurno,
  porNaBandeja,
  TAMANHO_DOS_PEDIDOS,
  type TurnoEmAndamento,
  terminou,
  tirarDaBandeja,
} from '../src/sistemas/turnos'

const HOJE = '2026-10-29'
const inicial = (): Salvamento => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))

function conferirTexto(fala: string) {
  expect(fala).not.toMatch(/[—!]/)
  expect((fala.split(/(?<=[.?])\s/)[0] ?? '').endsWith('?')).toBe(false)
}

/** Monta a bandeja certa do freguês da vez e entrega. */
function atenderCerto(t: TurnoEmAndamento): TurnoEmAndamento {
  let agora = t
  for (const [id, q] of Object.entries(t.pedidos[t.atual]?.itens ?? {}))
    for (let i = 0; i < q; i++) agora = porNaBandeja(agora, id)
  const r = entregarBandeja(agora)
  expect(r.certo).toBe(true)
  return r.turno
}

function turnoInteiro(posto: PostoDaVila, erros = 0): TurnoEmAndamento {
  let t = comecarTurno(posto, HOJE, 0)
  for (let e = 0; e < erros; e++) {
    const errado = BALCOES[posto].produtos.find((p) => !(t.pedidos[0]?.itens[p.id] === 1))
    t = entregarBandeja(porNaBandeja(porNaBandeja(t, errado?.id ?? ''), errado?.id ?? '')).turno
  }
  while (!terminou(t)) t = atenderCerto(t)
  return t
}

describe('os pedidos', () => {
  test('seis fregueses diferentes, do menor pedido ao maior, só com o que o balcão tem', () => {
    for (const posto of POSTOS_DA_VILA) {
      const pedidos = pedidosDoTurno(posto, HOJE, 0)
      expect(pedidos).toHaveLength(TAMANHO_DOS_PEDIDOS.length)
      expect(new Set(pedidos.map((p) => p.quem)).size).toBe(pedidos.length)
      for (const [i, p] of pedidos.entries()) {
        expect(FREGUESES).toContain(p.quem as (typeof FREGUESES)[number])
        const total = Object.values(p.itens).reduce((a, b) => a + b, 0)
        expect(total).toBe(TAMANHO_DOS_PEDIDOS[i] ?? 0)
        const ids = BALCOES[posto].produtos.map((x) => x.id)
        for (const id of Object.keys(p.itens)) expect(ids).toContain(id)
      }
    }
  })

  test('o mesmo turno repete os pedidos, o turno seguinte traz outros', () => {
    expect(pedidosDoTurno('padaria', HOJE, 3)).toEqual(pedidosDoTurno('padaria', HOJE, 3))
    expect(pedidosDoTurno('padaria', HOJE, 3)).not.toEqual(pedidosDoTurno('padaria', HOJE, 4))
  })

  test('o pedido por extenso concorda em número e gênero', () => {
    expect(itensPorExtenso('padaria', { 'pao-de-queijo': 2, sonho: 1 })).toBe(
      'dois pães de queijo e um sonho',
    )
    expect(itensPorExtenso('padaria', { bolo: 1 })).toBe('uma fatia de bolo de fubá')
    expect(itensPorExtenso('sorveteria', { morango: 2, coco: 1, milho: 1 })).toBe(
      'duas bolas de morango, uma bola de coco e uma bola de milho',
    )
    expect(itensPorExtenso('sucos', { laranja: 3 })).toBe('três sucos de laranja')
  })

  test('as falas seguem a voz da casa', () => {
    for (const posto of POSTOS_DA_VILA) {
      conferirTexto(BALCOES[posto].convite)
      let t = comecarTurno(posto, HOJE, 1)
      while (!terminou(t)) {
        conferirTexto(falaDoPedido(t))
        const errado = entregarBandeja(porNaBandeja(t, 'nada'))
        conferirTexto(errado.fala)
        t = atenderCerto(t)
      }
    }
  })
})

describe('o balcão', () => {
  test('a bandeja põe e tira um de cada vez, com teto', () => {
    let t = comecarTurno('sorveteria', HOJE, 0)
    t = porNaBandeja(t, 'morango')
    t = porNaBandeja(t, 'morango')
    expect(t.bandeja).toEqual({ morango: 2 })
    t = tirarDaBandeja(t, 'morango')
    expect(t.bandeja).toEqual({ morango: 1 })
    t = tirarDaBandeja(tirarDaBandeja(t, 'morango'), 'morango')
    expect(t.bandeja).toEqual({})
    expect(porNaBandeja(t, 'pao-de-queijo')).toBe(t)
    for (let i = 0; i < MAXIMO_NA_BANDEJA + 3; i++) t = porNaBandeja(t, 'coco')
    expect(t.bandeja).toEqual({ coco: MAXIMO_NA_BANDEJA })
  })

  test('bandeja vazia não conta; errado conta um engano e o freguês repete; certo chama o próximo', () => {
    const t = comecarTurno('padaria', HOJE, 0)
    const vazia = entregarBandeja(t)
    expect(vazia.certo).toBe(false)
    expect(vazia.turno).toBe(t)
    const pedido = t.pedidos[0]?.itens ?? {}
    const outro = BALCOES.padaria.produtos.find((p) => !pedido[p.id])?.id ?? ''
    const errado = entregarBandeja(porNaBandeja(t, outro))
    expect(errado.certo).toBe(false)
    expect(errado.turno.erros).toBe(1)
    expect(errado.turno.atual).toBe(0)
    expect(errado.turno.bandeja).toEqual({})
    expect(errado.fala).toContain(itensPorExtenso('padaria', pedido))
    const certo = atenderCerto(errado.turno)
    expect(certo.atual).toBe(1)
    expect(certo.erros).toBe(1)
  })

  test('as estrelas vêm dos enganos', () => {
    expect(estrelasDoTurno(0)).toBe(3)
    expect(estrelasDoTurno(1)).toBe(2)
    expect(estrelasDoTurno(2)).toBe(2)
    expect(estrelasDoTurno(3)).toBe(1)
    expect(estrelasDoTurno(9)).toBe(1)
  })
})

describe('fechar o turno', () => {
  test('um turno antigo concluído depois não reabre o pagamento de ingredientes do dia atual', () => {
    const t = turnoInteiro('sucos')
    const hoje = fecharTurno(inicial(), t, HOJE)
    if (!hoje) throw Error('Sem pagamento')
    const atrasado = fecharTurno(hoje.salvamento, t, '2026-10-28')
    expect(atrasado?.pagou).toBe(false)
    expect(atrasado?.salvamento.turnos.sucos?.pagoEm).toBe(HOJE)
    expect(atrasado?.salvamento.inventario).toEqual(hoje.salvamento.inventario)
  })
  test('pagamento inteiro e receita nova não se perdem quando a mochila está cheia', () => {
    for (const posto of POSTOS_DA_VILA) {
      const s = inicial()
      const id = Object.keys(BALCOES[posto].pagamento)[0]
      if (!id) throw new Error('Sem pagamento')
      s.inventario[id] = 999
      const antes = structuredClone(s)
      expect(fecharTurno(s, turnoInteiro(posto), HOJE)).toBeNull()
      expect(s).toEqual(antes)
    }
    const s = inicial()
    s.moradores.bento.amizade = 100 - AMIZADE.turno
    // Um fubá cabe; pagamento + ingredientes da receita recém-aprendida não cabem.
    s.inventario.fuba = 998
    expect(fecharTurno(s, turnoInteiro('padaria'), HOJE)).toBeNull()
    expect(s.turnos.padaria).toBeUndefined()
    s.inventario.fuba = 997
    expect(fecharTurno(s, turnoInteiro('padaria'), HOJE)?.salvamento.inventario.fuba).toBe(999)
  })
  test('só fecha o turno terminado', () => {
    expect(fecharTurno(inicial(), comecarTurno('sucos', HOJE, 0), HOJE)).toBeNull()
  })

  test('o primeiro turno do dia paga; o segundo guarda as estrelas sem pagar', () => {
    for (const posto of ['sorveteria', 'sucos'] as const) {
      const r = fecharTurno(inicial(), turnoInteiro(posto, 1), HOJE)
      if (!r) throw new Error('turno não fechou')
      expect(r.estrelas).toBe(2)
      expect(r.pagou).toBe(true)
      expect(r.salvamento.turnos[posto]).toEqual({ pagoEm: HOJE, melhor: 2, vezes: 1 })
      for (const [id, q] of Object.entries(BALCOES[posto].pagamento)) {
        expect(ITENS[id]).toBeDefined()
        expect((r.salvamento.inventario[id] ?? 0) - (inicial().inventario[id] ?? 0)).toBe(q)
      }
      expect(jaPagouHoje(r.salvamento, posto, HOJE)).toBe(true)
      for (const f of r.falas) conferirTexto(f)

      const de = fecharTurno(r.salvamento, turnoInteiro(posto), HOJE)
      if (!de) throw new Error('turno não fechou')
      expect(de.pagou).toBe(false)
      expect(de.salvamento.inventario).toEqual(r.salvamento.inventario)
      expect(de.salvamento.turnos[posto]).toEqual({ pagoEm: HOJE, melhor: 3, vezes: 2 })

      const amanha = fecharTurno(de.salvamento, turnoInteiro(posto, 5), '2026-10-30')
      expect(amanha?.pagou).toBe(true)
      expect(amanha?.salvamento.turnos[posto]).toEqual({
        pagoEm: '2026-10-30',
        melhor: 3,
        vezes: 3,
      })
    }
  })

  test('o turno pago na padaria é amizade com o Bento, e pode trazer a receita do coração', () => {
    const s = inicial()
    const quase = {
      ...s,
      moradores: { ...s.moradores, bento: { ...s.moradores.bento, amizade: 100 - AMIZADE.turno } },
    }
    const r = fecharTurno(quase, turnoInteiro('padaria'), HOJE)
    if (!r) throw new Error('turno não fechou')
    expect(r.salvamento.moradores.bento.amizade).toBe(100)
    expect(r.falas).toContain(FALA_DO_TURNO_NA_PADARIA)
    expect(r.falas).toContain(FALA_DA_RECEITA['bolo-de-fuba'] ?? '-')
    // O pagamento (fubá, leite e ovo) e os ingredientes da primeira vez do bolo.
    expect(r.salvamento.inventario).toMatchObject({ fuba: 2, leite: 2, ovo: 2 })

    const outro = fecharTurno(r.salvamento, turnoInteiro('padaria'), HOJE)
    expect(outro?.salvamento.moradores.bento.amizade).toBe(100)
  })
})
