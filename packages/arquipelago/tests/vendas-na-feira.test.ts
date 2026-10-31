import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type SalvamentoGuardado,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { FALAS_DA_BANCA } from '../src/interface/banca-da-feira'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarArmazemDeSalvamento } from '../src/sistemas/armazem-salvamento'
import {
  criarFilaDeSalvamento,
  type SituacaoDoSalvamento,
  VendaRecusadaNoServicoError,
} from '../src/sistemas/salvar'

/**
 * A banca da feira no aparelho (§6.28, A22): a venda passa pela fila como a entrega de pedidos,
 * com o comando no diário antes do serviço, uma venda por dia e a retomada da resposta perdida.
 */

const agora = () => new Date('2026-10-31T12:00:00Z')
function inicial() {
  const s = criarSalvamentoInicial(agora())
  s.inventario = { 'pao-de-queijo': 3, 'bolo-de-fuba': 1, milho: 2 }
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

test('a venda passa pela fila: diário antes do serviço, pratos saem e as moedas chegam', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  let observar: (() => Promise<void>) | undefined
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/feira/vender') await observar?.()
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    observar = async () => {
      const diario = await f.armazem.ler()
      expect(diario?.venda?.itens).toEqual({ 'pao-de-queijo': 2, 'bolo-de-fuba': 1 })
      expect(diario?.entrega).toBeUndefined()
      expect(f.estados.at(-1)).toBe('confirmando')
    }
    const saldo = ((await p.servico.buscar('/galeria')).corpo as { saldo: number }).saldo
    const r = await f.fila.venderNaFeira({ 'pao-de-queijo': 2, 'bolo-de-fuba': 1 })
    expect(r.pagamento).toBe('creditado')
    expect(r.moedas).toBe(5)
    expect(f.adotados.at(-1)?.salvamento?.inventario).toEqual({ 'pao-de-queijo': 1, milho: 2 })
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: saldo + 5 })
    expect(await f.armazem.ler()).toBeNull()
    observar = undefined
    // Uma venda por dia: a segunda é recusada sem consumir nada.
    const outra = await erroDa(f.fila.venderNaFeira({ 'pao-de-queijo': 1 }))
    expect(outra).toBeInstanceOf(VendaRecusadaNoServicoError)
    expect((outra as VendaRecusadaNoServicoError).codigo).toBe('VENDA_REPETIDA')
    expect(p.guardado().salvamento?.inventario['pao-de-queijo']).toBe(1)
  } finally {
    await f.fila.parar()
  }
})

test('sem os pratos na mochila, nada vai ao serviço', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  let chamadas = 0
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/feira/vender') chamadas++
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    expect(await erroDa(f.fila.venderNaFeira({ 'pao-de-queijo': 4 }))).toBeInstanceOf(Error)
    expect(chamadas).toBe(0)
  } finally {
    await f.fila.parar()
  }
})

test('resposta perdida: reabrir retoma a mesma chave, sem vender duas vezes', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  const perfil = `adulto:${crypto.randomUUID()}`
  let perder = true
  const chaves: string[] = []
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      const r = await p.servico.buscar(path, o)
      if (path === '/feira/vender') {
        chaves.push((o?.corpo as { chave: string }).chave)
        if (perder) throw Error('Resposta perdida')
      }
      return r
    },
  }
  const a = await abrir(perfil, servico, p.guardado())
  await a.fila.retomarOperacoes()
  a.fila.guardar(inicial())
  expect(await erroDa(a.fila.venderNaFeira({ 'pao-de-queijo': 1 }))).toBeInstanceOf(Error)
  expect((await a.armazem.ler())?.venda?.chave).toBe(chaves[0])
  await a.fila.parar()
  perder = false
  const b = await abrir(perfil, servico, p.guardado())
  try {
    await b.fila.retomarOperacoes()
    expect(chaves).toEqual([chaves[0]!, chaves[0]!])
    expect(b.adotados.at(-1)?.salvamento?.inventario['pao-de-queijo']).toBe(2)
    expect(p.guardado().revisao).toBe(2)
    expect(await b.armazem.ler()).toBeNull()
    expect(b.estados.at(-1)).toBe('ok')
  } finally {
    await b.fila.parar()
  }
})

test('um serviço sem a banca (404) não trava a retomada nem o salvamento', async () => {
  const p = criarPlataformaFalsa({ persistir: false, posicao: 8, agora })
  const servico: ServicoDoJogo = {
    buscar: async (path, o) =>
      path.startsWith('/feira/')
        ? { status: 404, corpo: { error: { code: 'NOT_FOUND' } } }
        : p.servico.buscar(path, o),
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    await f.fila.salvarAgora()
    expect(p.guardado().salvamento?.inventario).toEqual(inicial().inventario)
    expect(f.estados.at(-1)).toBe('ok')
  } finally {
    await f.fila.parar()
  }
})

test('os recados da banca seguem as regras da criança', () => {
  for (const t of [
    FALAS_DA_BANCA.vendeu(5),
    FALAS_DA_BANCA.teto,
    FALAS_DA_BANCA.pendente,
    FALAS_DA_BANCA.recusado,
    FALAS_DA_BANCA.jaVendeu,
  ])
    expect(t).not.toMatch(/[—!]/)
})
