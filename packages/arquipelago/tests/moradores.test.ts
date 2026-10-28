import { describe, expect, test } from 'bun:test'
import {
  AMIZADE_MAXIMA,
  type Capi,
  criarSalvamentoInicial,
} from '@sistemazero/arquipelago-contracts'
import {
  comecarConversa,
  entregar,
  FALA_DA_ENTREGA,
  FALA_DO_PRESENTE,
  oQueFaltaNoPedido,
  pedidoDeHoje,
  presentear,
} from '../src/sistemas/conversa-da-capi'
import { type ContextoDaFala, falasDaCapi } from '../src/sistemas/falas-da-capi'
import {
  AMIZADE,
  CAPI_NO_BOSQUE,
  conversar,
  coracoes,
  darPresente,
  diaDe,
  ehAniversario,
  entregarPedido,
  olharDaCapi,
  PEDIDOS_DA_CAPI,
  pedidoDoDia,
  pedidoPeloId,
  podeEntregar,
} from '../src/sistemas/moradores'

const capiNova = (): Capi => ({ amizade: 0, conversaEm: null, presenteEm: null, pedido: null })
const HOJE = '2026-10-28'
const AMANHA = '2026-10-29'

describe('a Capi: amizade', () => {
  test('o dia é o do calendário do aparelho', () => {
    expect(diaDe(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05')
    expect(diaDe(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })

  test('cada coração são 100 pontos, até 5', () => {
    expect(coracoes(0)).toBe(0)
    expect(coracoes(99)).toBe(0)
    expect(coracoes(100)).toBe(1)
    expect(coracoes(499)).toBe(4)
    expect(coracoes(AMIZADE_MAXIMA)).toBe(5)
  })

  test('só a primeira conversa do dia conta', () => {
    const a = conversar(capiNova(), HOJE)
    expect(a.primeiraDoDia).toBe(true)
    expect(a.capi.amizade).toBe(AMIZADE.conversa)
    const b = conversar(a.capi, HOJE)
    expect(b.primeiraDoDia).toBe(false)
    expect(b.capi).toBe(a.capi)
    const c = conversar(b.capi, AMANHA)
    expect(c.primeiraDoDia).toBe(true)
    expect(c.capi.amizade).toBe(AMIZADE.conversa * 2)
  })

  test('a amizade nunca passa de 500', () => {
    const quase = { ...capiNova(), amizade: AMIZADE_MAXIMA - 3 }
    expect(conversar(quase, HOJE).capi.amizade).toBe(AMIZADE_MAXIMA)
  })
})

describe('a Capi: presentes', () => {
  test('comida de que ela gosta vale mais e sai do inventário', () => {
    const r = darPresente(capiNova(), { milho: 2 }, 'milho', HOJE)
    expect(r.reacao).toBe('adorou')
    expect(r.capi.amizade).toBe(AMIZADE.presenteQueGosta)
    expect(r.capi.presenteEm).toBe(HOJE)
    expect(r.inv).toEqual({ milho: 1 })
  })

  test('comida comum vale menos', () => {
    const r = darPresente(capiNova(), { pipoca: 1 }, 'pipoca', HOJE)
    expect(r.reacao).toBe('agradeceu')
    expect(r.capi.amizade).toBe(AMIZADE.presenteComum)
    expect(r.inv).toEqual({})
  })

  test('o que não é comida volta para a criança', () => {
    const inv = { 'semente-milho': 3 }
    const r = darPresente(capiNova(), inv, 'semente-milho', HOJE)
    expect(r.reacao).toBe('devolveu')
    expect(r.inv).toBe(inv)
    expect(r.capi.amizade).toBe(0)
  })

  test('sem o item, nada muda', () => {
    expect(darPresente(capiNova(), {}, 'milho', HOJE).reacao).toBe('sem-item')
  })

  test('só o primeiro presente do dia conta, e o segundo fica com a criança', () => {
    const a = darPresente(capiNova(), { milho: 2 }, 'milho', HOJE)
    const b = darPresente(a.capi, a.inv, 'milho', HOJE)
    expect(b.reacao).toBe('ja-ganhou-hoje')
    expect(b.inv).toEqual({ milho: 1 })
    expect(b.capi.amizade).toBe(AMIZADE.presenteQueGosta)
    expect(darPresente(b.capi, b.inv, 'milho', AMANHA).capi.amizade).toBe(
      AMIZADE.presenteQueGosta * 2,
    )
  })

  test('no aniversário (12 de março) o presente vale o dobro', () => {
    expect(ehAniversario('2027-03-12')).toBe(true)
    expect(ehAniversario('2027-03-13')).toBe(false)
    expect(ehAniversario('2027-12-03')).toBe(false)
    expect(darPresente(capiNova(), { milho: 1 }, 'milho', '2027-03-12').capi.amizade).toBe(
      AMIZADE.presenteQueGosta * 2,
    )
  })
})

describe('a Capi: pedido do dia', () => {
  test('é o mesmo o dia inteiro e fica guardado', () => {
    const a = pedidoDoDia(capiNova(), HOJE, 'perfil-1', 0, 4)
    expect(a.pedido?.dia).toBe(HOJE)
    expect(a.pedido?.entregue).toBe(false)
    expect(pedidoDoDia(a, HOJE, 'perfil-1', 0, 4)).toBe(a)
    expect(pedidoDoDia(capiNova(), HOJE, 'perfil-1', 0, 4).pedido?.id).toBe(a.pedido?.id)
  })

  test('muda entre dias e entre perfis, e todos os pedidos aparecem', () => {
    const vistos = new Set<string>()
    for (let d = 1; d <= 28; d++) {
      for (const perfil of ['a', 'b', 'c']) {
        const dia = `2026-11-${String(d).padStart(2, '0')}`
        const id = pedidoDoDia(capiNova(), dia, perfil, 1, 3).pedido?.id
        expect(id && pedidoPeloId(id)).toBeTruthy()
        if (id) vistos.add(id)
      }
    }
    for (const p of PEDIDOS_DA_CAPI) expect(vistos.has(p.id)).toBe(true)
    expect(vistos.has('achar-bicho-1')).toBe(true)
  })

  test('sem bicho escondido, não pede para achar', () => {
    for (let d = 1; d <= 28; d++) {
      const dia = `2026-11-${String(d).padStart(2, '0')}`
      expect(pedidoDoDia(capiNova(), dia, 'a', 4, 0).pedido?.id.startsWith('achar-')).toBe(false)
    }
  })

  test('entregar tira os itens e dá a amizade, uma vez', () => {
    const capi: Capi = { ...capiNova(), pedido: { dia: HOJE, id: 'alface-2', entregue: false } }
    expect(podeEntregar(capi, { alface: 1 }, 0)).toBe(false)
    expect(entregarPedido(capi, { alface: 1 }, 0).entregou).toBe(false)
    const r = entregarPedido(capi, { alface: 3, milho: 1 }, 0)
    expect(r.entregou).toBe(true)
    expect(r.inv).toEqual({ alface: 1, milho: 1 })
    expect(r.capi.amizade).toBe(AMIZADE.pedido)
    expect(r.capi.pedido?.entregue).toBe(true)
    expect(entregarPedido(r.capi, r.inv, 0).entregou).toBe(false)
  })

  test('o pedido de achar um bicho só se cumpre com um bicho achado depois dele', () => {
    const capi: Capi = {
      ...capiNova(),
      pedido: { dia: HOJE, id: 'achar-bicho-1', entregue: false },
    }
    expect(podeEntregar(capi, {}, 1)).toBe(false)
    const r = entregarPedido(capi, { milho: 1 }, 2)
    expect(r.entregou).toBe(true)
    expect(r.inv).toEqual({ milho: 1 })
    expect(pedidoPeloId('achar-bicho-1')?.itens).toBeUndefined()
  })

  test('um id guardado desconhecido não se entrega', () => {
    const capi: Capi = { ...capiNova(), pedido: { dia: HOJE, id: 'sumiu', entregue: false } }
    expect(podeEntregar(capi, { milho: 9 }, 4)).toBe(false)
  })
})

describe('as falas da Capi', () => {
  const base: ContextoDaFala = {
    coracoes: 0,
    primeiroEncontro: false,
    primeiraDoDia: true,
    aniversario: false,
    achados: 0,
    total: 4,
    adotado: null,
    pedido: null,
  }

  test('o primeiro encontro conta a história', () => {
    const f = falasDaCapi({ ...base, primeiroEncontro: true }, 0)
    expect(f[0]).toContain('Capi')
    expect(f.join(' ')).toContain('cercadinho')
  })

  test('quantos faltam, no singular e no plural', () => {
    expect(falasDaCapi({ ...base, achados: 3 }, 0).join(' ')).toContain('Falta só um')
    expect(falasDaCapi({ ...base, achados: 1 }, 0).join(' ')).toContain('Faltam 3')
  })

  test('as outras conversas do dia só se despedem', () => {
    expect(falasDaCapi({ ...base, primeiraDoDia: false }, 3)).toHaveLength(1)
  })

  test('comenta os bichos achados, o adotado, o pedido e o aniversário', () => {
    const f = falasDaCapi(
      {
        ...base,
        coracoes: 3,
        achados: 2,
        adotado: 'Pipoca',
        pedido: 'Duas alfaces da horta',
        aniversario: true,
      },
      1,
    )
    expect(f[0]).toContain('aniversário')
    expect(f.join(' ')).toContain('2 de 4')
    expect(f.join(' ')).toContain('Pipoca')
    expect(f.at(-1)).toContain('duas alfaces da horta')
    expect(falasDaCapi({ ...base, achados: 4 }, 0).join(' ')).toContain('Todos os bichos')
  })

  test('nível de amizade fora da faixa usa o mais perto', () => {
    expect(falasDaCapi({ ...base, coracoes: 9 }, 0)[0]).toBe(
      falasDaCapi({ ...base, coracoes: 5 }, 0)[0],
    )
  })

  test('nenhuma fala tem travessão, exclamação, nem começa com pergunta', () => {
    const todas = new Set<string>()
    for (let coracoes = 0; coracoes <= 5; coracoes++) {
      for (let escolha = 0; escolha < 4; escolha++) {
        for (const extra of [
          {},
          { primeiroEncontro: true },
          { primeiraDoDia: false },
          { aniversario: true, achados: 1, adotado: 'Bolinha', pedido: 'Um milho da horta' },
          { achados: 4 },
        ]) {
          for (const f of falasDaCapi({ ...base, coracoes, ...extra }, escolha)) todas.add(f)
        }
      }
    }
    for (const f of todas) {
      expect(f).not.toMatch(/[—!]/)
      expect(f.split(/(?<=[.?])\s/)[0]?.endsWith('?')).toBe(false)
    }
  })
})

describe('a conversa com a Capi no salvamento', () => {
  const inicial = () => criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z'))

  test('o primeiro encontro conta a história, guarda o pedido e a conversa do dia', () => {
    const { salvamento, falas } = comecarConversa(inicial(), HOJE, 'perfil-1')
    expect(falas.join(' ')).toContain('Eu sou a Capi')
    expect(salvamento.moradores.capi.conversaEm).toBe(HOJE)
    expect(salvamento.moradores.capi.amizade).toBe(AMIZADE.conversa)
    expect(salvamento.moradores.capi.pedido?.dia).toBe(HOJE)
    expect(pedidoDeHoje(salvamento, HOJE)).toBeTruthy()
    expect(pedidoDeHoje(salvamento, AMANHA)).toBeNull()
  })

  test('a segunda conversa do dia só se despede e não soma', () => {
    const a = comecarConversa(inicial(), HOJE, 'perfil-1').salvamento
    const b = comecarConversa(a, HOJE, 'perfil-1')
    expect(b.falas).toHaveLength(1)
    expect(b.salvamento.moradores.capi.amizade).toBe(AMIZADE.conversa)
    const c = comecarConversa(b.salvamento, AMANHA, 'perfil-1')
    expect(c.falas.length).toBeGreaterThan(1)
    expect(c.salvamento.moradores.capi.amizade).toBe(AMIZADE.conversa * 2)
  })

  test('o presente sai do inventário e a fala segue a reação', () => {
    const s = { ...inicial(), inventario: { milho: 1, 'semente-milho': 2 } }
    const a = presentear(s, 'milho', HOJE)
    expect(a.reacao).toBe('adorou')
    expect(a.fala).toBe(FALA_DO_PRESENTE.adorou)
    expect(a.salvamento.inventario).toEqual({ 'semente-milho': 2 })
    const b = presentear(a.salvamento, 'semente-milho', HOJE)
    expect(b.reacao).toBe('devolveu')
    expect(b.salvamento).toBe(a.salvamento)
    expect(presentear(s, 'milho', '2027-03-12').fala).toContain('aniversário')
  })

  test('entregar o pedido e o que falta para ele', () => {
    const base = inicial()
    const s = {
      ...base,
      inventario: { alface: 1 },
      moradores: {
        capi: { ...base.moradores.capi, pedido: { dia: HOJE, id: 'alface-2', entregue: false } },
      },
    }
    expect(oQueFaltaNoPedido(s)).toBe('Alface: você tem 1 de 2')
    expect(entregar(s).entregou).toBe(false)
    const pronto = { ...s, inventario: { alface: 2 } }
    expect(oQueFaltaNoPedido(pronto)).toBeNull()
    const r = entregar(pronto)
    expect(r.entregou).toBe(true)
    expect(r.salvamento.inventario).toEqual({})
    expect(r.salvamento.moradores.capi.amizade).toBe(AMIZADE.pedido)
    expect(oQueFaltaNoPedido(r.salvamento)).toBeNull()
    expect(FALA_DA_ENTREGA).not.toMatch(/[—!]/)
  })

  test('o pedido de achar diz o que fazer até um bicho novo aparecer', () => {
    const base = inicial()
    const s = {
      ...base,
      moradores: {
        capi: {
          ...base.moradores.capi,
          pedido: { dia: HOJE, id: 'achar-bicho-0', entregue: false },
        },
      },
    }
    expect(oQueFaltaNoPedido(s)).toContain('Ache mais um bicho')
    expect(oQueFaltaNoPedido({ ...s, bichos: { achados: ['gato'], adotado: null } })).toBeNull()
  })

  test('as falas das reações seguem as regras de texto', () => {
    for (const f of Object.values(FALA_DO_PRESENTE)) {
      expect(f).not.toMatch(/[—!]/)
      expect(f.split(/(?<=[.?])\s/)[0]?.endsWith('?')).toBe(false)
    }
  })
})

describe('a Capi no Bosque', () => {
  const capi = { x: 0, z: 0 }

  test('longe, ela olha para o descanso; perto, para a criança', () => {
    expect(olharDaCapi(capi, { x: 0, z: 20 }, 1, false)).toBe(1)
    expect(olharDaCapi(capi, { x: 0, z: 3 }, 1, false)).toBeCloseTo(0)
    expect(olharDaCapi(capi, { x: 3, z: 0 }, 1, false)).toBeCloseTo(Math.PI / 2)
  })

  test('conversando, olha para a criança mesmo de longe', () => {
    expect(olharDaCapi(capi, { x: -20, z: 0 }, 1, true)).toBeCloseTo(-Math.PI / 2)
  })

  test('a conversa abre de perto, dentro do raio em que ela olha', () => {
    expect(CAPI_NO_BOSQUE.alcance).toBeLessThan(CAPI_NO_BOSQUE.olharDe)
    expect(CAPI_NO_BOSQUE.alcance).toBeGreaterThan(CAPI_NO_BOSQUE.raio)
  })
})
