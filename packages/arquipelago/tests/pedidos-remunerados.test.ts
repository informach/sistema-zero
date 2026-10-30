import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type SalvamentoGuardado,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarArmazemDeSalvamento } from '../src/sistemas/armazem-salvamento'
import { criarFilaDeSalvamento, type SituacaoDoSalvamento } from '../src/sistemas/salvar'

const agora = () => new Date('2026-10-30T12:00:00Z')
function inicial() {
  const s = criarSalvamentoInicial(agora())
  s.moradores.bento.amizade = 80
  s.moradores.bento.pedido = { dia: '2026-10-30', id: 'milho-2', entregue: false }
  s.inventario = { milho: 3 }
  return s
}
async function abrir(perfil: string, servico: ServicoDoJogo, guardadoInicial: SalvamentoGuardado) {
  const armazem = await criarArmazemDeSalvamento(perfil, async () => () => {})
  const adotados: SalvamentoGuardado[] = []
  const estados: SituacaoDoSalvamento[] = []
  const fila = criarFilaDeSalvamento({
    servico,
    armazem,
    guardadoInicial,
    rascunhoInicial: await armazem.ler(),
    conferirOperacoes: true,
    agora,
    aoAdotar: (s) => adotados.push(s),
    aoSituacao: (s) => estados.push(s),
    aoErro: () => {},
    agendar: () => 1,
    cancelar: () => {},
  })
  return { fila, armazem, adotados, estados }
}
async function erroDa(p: Promise<unknown>) {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}

test('entrega e cesta usam a fila; diário precede serviço e não existe segundo PUT da recompensa', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  let observar: (() => Promise<void>) | undefined
  let n = 0
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/pedidos/entregar') {
        n++
        await observar?.()
      }
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    observar = async () => {
      const diario = await f.armazem.ler()
      expect(diario?.entrega?.morador).toBe('bento')
      expect(diario?.compra).toBeUndefined()
      expect(p.guardado().salvamento?.inventario).toEqual({ milho: 3 })
      expect(p.guardado().salvamento?.moradores.bento.pedido?.entregue).toBe(false)
      expect(f.estados.at(-1)).toBe('confirmando')
    }
    const r = await f.fila.entregarPedido('bento')
    expect(r.pagamento).toBe('creditado')
    expect(r.moedas).toBe(4)
    expect(f.adotados.at(-1)?.salvamento?.inventario).toEqual({
      milho: 1,
      fuba: 1,
      leite: 1,
      ovo: 1,
    })
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: 84 })
    await f.fila.salvarAgora()
    expect(p.guardado().revisao).toBe(2)
    expect(n).toBe(1)
    expect(await f.armazem.ler()).toBeNull()
  } finally {
    await f.fila.parar()
  }
})

test('resposta perdida após consumo e crédito reabre sem nova cesta nem prêmio', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  const perfil = `adulto:${crypto.randomUUID()}`
  let perder = true
  const chaves: string[] = []
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      const r = await p.servico.buscar(path, o)
      if (path === '/pedidos/entregar') {
        chaves.push((o?.corpo as { chave: string }).chave)
        if (perder) throw Error('Resposta perdida')
      }
      return r
    },
  }
  const a = await abrir(perfil, servico, p.guardado())
  await a.fila.retomarOperacoes()
  a.fila.guardar(inicial())
  expect(await erroDa(a.fila.entregarPedido('bento'))).toBeInstanceOf(Error)
  expect((await a.armazem.ler())?.entrega?.chave).toBe(chaves[0])
  await a.fila.parar()
  perder = false
  const b = await abrir(perfil, servico, p.guardado())
  try {
    await b.fila.retomarOperacoes()
    expect(chaves).toEqual([chaves[0]!, chaves[0]!])
    expect(b.adotados.at(-1)?.salvamento?.inventario).toEqual({
      milho: 1,
      fuba: 1,
      leite: 1,
      ovo: 1,
    })
    expect(p.guardado().revisao).toBe(2)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: 84 })
    expect(await b.armazem.ler()).toBeNull()
    expect(b.estados.at(-1)).toBe('ok')
    expect(await erroDa(b.fila.entregarPedido('bento'))).toBeInstanceOf(Error)
  } finally {
    await b.fila.parar()
  }
})

test('comando de compra em voo impede entregar ao morador; nenhuma cesta é dada em recusa de capacidade', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  let soltar!: () => void
  let entrou!: () => void
  const espera = new Promise<void>((r) => {
    soltar = r
  })
  const inicio = new Promise<void>((r) => {
    entrou = r
  })
  const f = await abrir(
    `kids:${crypto.randomUUID()}`,
    {
      buscar: async (path, o) => {
        if (path === '/insumos/comprar') {
          entrou()
          await espera
        }
        return p.servico.buscar(path, o)
      },
    },
    p.guardado(),
  )
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    const compra = f.fila.comprarInsumos('leite', 1)
    await inicio
    expect(await erroDa(f.fila.entregarPedido('bento'))).toBeInstanceOf(Error)
    soltar()
    await compra
    const cheio = inicial()
    cheio.inventario.leite = 999
    f.fila.guardar(cheio)
    expect(await erroDa(f.fila.entregarPedido('bento'))).toBeInstanceOf(Error)
    expect(p.guardado().salvamento?.inventario.milho).toBe(3)
    expect(p.guardado().salvamento?.moradores.bento.amizade).toBe(80)
  } finally {
    soltar()
    await f.fila.parar()
  }
})
