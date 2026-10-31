import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  INSUMOS,
  type SalvamentoGuardado,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarInsumosFalsos } from '../src/plataforma/insumos-falsos'
import { criarArmazemDeSalvamento } from '../src/sistemas/armazem-salvamento'
import { ITENS } from '../src/sistemas/itens'
import { criarFilaDeSalvamento, type SituacaoDoSalvamento } from '../src/sistemas/salvar'

const inicial = () => criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))

test('fechar antes do microtask da retomada não abre requisição após encerrar a sessão', async () => {
  let chamadas = 0
  const p = criarPlataformaFalsa({ persistir: false })
  const f = await abrir(
    `kids:${crypto.randomUUID()}`,
    {
      buscar: async (path, o) => {
        chamadas++
        return p.servico.buscar(path, o)
      },
    },
    p.guardado(),
  )
  const retomada = capturar(f.fila.retomarOperacoes())
  await f.fila.parar()
  expect(await retomada).toBeInstanceOf(Error)
  expect(chamadas).toBe(0)
})

test('aparelho sem recibo retoma reserva do serviço e grava a chave antes de confirmar', async () => {
  let guardado: SalvamentoGuardado = {
    revisao: 1,
    salvamento: inicial(),
    atualizadoEm: new Date().toISOString(),
  }
  const pedido = {
    versao: 1 as const,
    chave: crypto.randomUUID(),
    revisaoBase: 1,
    item: 'ovo' as const,
    quantidade: 2,
  }
  let chamadas = 0
  let observar: (() => Promise<void>) | undefined
  const falso = criarInsumosFalsos({
    somenteLeitura: false,
    ler: () => guardado,
    gravar: (s) => {
      guardado = s
    },
    registros: [{ pedido, situacao: 'pendente', moedas: 4, saldo: null }],
    debitar: (chave, moedas) => {
      expect(chave).toBe(pedido.chave)
      expect(moedas).toBe(4)
      chamadas++
      return { situacao: 'debitado', saldo: 76 }
    },
    agora: () => new Date(),
  })
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/insumos/comprar') await observar?.()
      const r = falso.buscar(path, o?.metodo ?? 'GET', o?.corpo)
      if (r) return r
      if (path === '/salvamento' && (!o?.metodo || o.metodo === 'GET'))
        return { status: 200, corpo: guardado }
      if (path === '/pedidos/pendentes') return { status: 200, corpo: { versao: 1, pedidos: [] } }
      throw Error('A retomada não pode fazer PUT')
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, guardado)
  try {
    expect(await f.armazem.ler()).toBeNull()
    observar = async () => {
      expect((await f.armazem.ler())?.compra).toEqual(pedido)
    }
    await f.fila.retomarOperacoes()
    expect(chamadas).toBe(1)
    expect(guardado.revisao).toBe(2)
    expect(f.adotados.at(-1)?.salvamento?.inventario.ovo).toBe(2)
    expect(await f.armazem.ler()).toBeNull()
    expect(f.situacoes.at(-1)).toBe('ok')
  } finally {
    await f.fila.parar()
  }
})
async function abrir(perfil: string, servico: ServicoDoJogo, guardado: SalvamentoGuardado) {
  const armazem = await criarArmazemDeSalvamento(perfil, async () => () => {})
  const adotados: SalvamentoGuardado[] = []
  const situacoes: SituacaoDoSalvamento[] = []
  const fila = criarFilaDeSalvamento({
    armazem,
    servico,
    guardadoInicial: guardado,
    rascunhoInicial: await armazem.ler(),
    aoAdotar: (s) => adotados.push(s),
    aoSituacao: (s) => situacoes.push(s),
    aoErro: () => {},
    agendar: () => 1,
    cancelar: () => {},
    conferirOperacoes: true,
  })
  return { fila, armazem, adotados, situacoes }
}
async function capturar(p: Promise<unknown>) {
  try {
    await p
    return null
  } catch (e) {
    return e
  }
}

test('catálogo usa apenas itens existentes da horta e da despensa, sem desbloquear receitas', () => {
  for (const id of Object.keys(INSUMOS)) expect(ITENS[id]).toBeDefined()
})

test('compra guarda a base e o comando antes do POST; entrega não vira outro PUT nem cobra duas vezes', async () => {
  const p = criarPlataformaFalsa({ persistir: false })
  const perfil = `kids:${crypto.randomUUID()}`
  let comandos = 0
  let observar: (() => Promise<void>) | null = null
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/insumos/comprar') {
        comandos++
        await observar?.()
      }
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(perfil, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    observar = async () => {
      const r = await f.armazem.ler()
      expect(r?.compra?.item).toBe('leite')
      expect(r?.compra?.revisaoBase).toBe(1)
      expect(p.guardado().revisao).toBe(1)
      expect(f.situacoes.at(-1)).toBe('confirmando')
    }
    const r = await f.fila.comprarInsumos('leite', 3)
    expect(r.situacao).toBe('entregue')
    expect(r.moedas).toBe(6)
    expect(r.saldo).toBe(74)
    expect(p.guardado().revisao).toBe(2)
    expect(f.adotados.at(-1)?.salvamento?.inventario.leite).toBe(3)
    expect(await f.armazem.ler()).toBeNull()
    await f.fila.salvarAgora()
    expect(p.guardado().revisao).toBe(2)
    expect(comandos).toBe(1)
    expect(f.situacoes.at(-1)).toBe('ok')
  } finally {
    await f.fila.parar()
  }
})

test('resposta perdida depois da entrega sobrevive a fechar/reabrir com a mesma chave e saldo', async () => {
  const p = criarPlataformaFalsa({ persistir: false })
  const perfil = `kids:${crypto.randomUUID()}`
  let perder = true
  const chaves: string[] = []
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      const r = await p.servico.buscar(path, o)
      if (path === '/insumos/comprar') {
        chaves.push((o?.corpo as { chave: string }).chave)
        if (perder) throw Error('Resposta perdida depois da entrega')
      }
      return r
    },
  }
  const a = await abrir(perfil, servico, p.guardado())
  await a.fila.retomarOperacoes()
  a.fila.guardar(inicial())
  expect(await capturar(a.fila.comprarInsumos('leite', 3))).toBeInstanceOf(Error)
  expect(a.situacoes.at(-1)).toBe('confirmando')
  expect((await a.armazem.ler())?.compra?.chave).toBe(chaves[0])
  expect(p.guardado().salvamento?.inventario.leite).toBe(3)
  await a.fila.parar()
  perder = false
  const b = await abrir(perfil, servico, p.guardado())
  try {
    await b.fila.retomarOperacoes()
    expect(chaves).toEqual([chaves[0]!, chaves[0]!])
    expect(p.guardado().revisao).toBe(2)
    expect(b.adotados.at(-1)?.salvamento?.inventario.leite).toBe(3)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: 74 })
    expect(await b.armazem.ler()).toBeNull()
  } finally {
    await b.fila.parar()
  }
})

test('sem confirmação do save ou espaço não envia compra; saldo insuficiente não cria item', async () => {
  const p = criarPlataformaFalsa({ persistir: false, galeria: { moedas: 1 } })
  const f = await abrir(`kids:${crypto.randomUUID()}`, p.servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    const s = inicial()
    s.inventario.leite = 999
    f.fila.guardar(s)
    expect(await capturar(f.fila.comprarInsumos('leite', 1))).toBeInstanceOf(Error)
    expect((await p.servico.buscar('/insumos/pendente')).corpo).toEqual({ versao: 1, pedido: null })
    const r = await f.fila.comprarInsumos('ovo', 1)
    expect(r.situacao).toBe('saldo-insuficiente')
    expect(p.guardado().salvamento?.inventario.ovo).toBeUndefined()
    expect(f.situacoes.at(-1)).toBe('ok')
  } finally {
    await f.fila.parar()
  }
})

test('sem escrita local durável a carteira não recebe o pedido', async () => {
  const p = criarPlataformaFalsa({ persistir: false })
  await p.servico.buscar('/salvamento', {
    metodo: 'PUT',
    corpo: { revisaoBase: 0, salvamento: inicial() },
  })
  let compras = 0
  let falhar = false
  const fila = criarFilaDeSalvamento({
    guardadoInicial: p.guardado(),
    rascunhoInicial: null,
    servico: {
      buscar: (path, o) => {
        if (path === '/insumos/comprar') compras++
        return p.servico.buscar(path, o)
      },
    },
    armazem: {
      ler: async () => null,
      gravar: async () => {
        if (falhar) throw Error('Disco sem espaço')
      },
      fechar: () => {},
    },
    aoAdotar: () => {},
    aoSituacao: () => {},
    aoErro: () => {},
    agendar: () => 1,
    cancelar: () => {},
  })
  try {
    falhar = true
    expect(await capturar(fila.comprarInsumos('ovo', 2))).toBeInstanceOf(Error)
    expect(compras).toBe(0)
    expect(p.guardado().revisao).toBe(1)
  } finally {
    await fila.parar()
  }
})

test('revisão mudada antes da reserva não cobra e recupera a base sem prender a compra para sempre', async () => {
  const p = criarPlataformaFalsa({ persistir: false })
  let interferir = true
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/insumos/comprar' && interferir) {
        interferir = false
        const salvo = p.guardado()
        const s = structuredClone(salvo.salvamento!)
        s.inventario.tomate = 5
        await p.servico.buscar('/salvamento', {
          metodo: 'PUT',
          corpo: { revisaoBase: salvo.revisao, salvamento: s },
        })
      }
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    expect(await capturar(f.fila.comprarInsumos('leite', 3))).toBeInstanceOf(Error)
    expect((await p.servico.buscar('/galeria')).corpo).toMatchObject({ saldo: 80 })
    expect((await f.armazem.ler())?.compra).toBeUndefined()
    await f.fila.retomarOperacoes()
    expect(f.adotados.at(-1)?.salvamento?.inventario.tomate).toBe(5)
    expect((await f.fila.comprarInsumos('leite', 3)).saldo).toBe(74)
    expect(p.guardado().salvamento?.inventario.tomate).toBe(5)
    expect(p.guardado().salvamento?.inventario.leite).toBe(3)
  } finally {
    await f.fila.parar()
  }
})

test('clique repetido não abre outra cobrança; comando conhecido preserva mudança local em voo', async () => {
  const p = criarPlataformaFalsa({ persistir: false })
  let soltar!: () => void
  let iniciou!: () => void
  const espera = new Promise<void>((r) => {
    soltar = r
  })
  const inicio = new Promise<void>((r) => {
    iniciou = r
  })
  let n = 0
  const servico: ServicoDoJogo = {
    buscar: async (path, o) => {
      if (path === '/insumos/comprar') {
        n++
        iniciou()
        await espera
      }
      return p.servico.buscar(path, o)
    },
  }
  const f = await abrir(`kids:${crypto.randomUUID()}`, servico, p.guardado())
  try {
    await f.fila.retomarOperacoes()
    f.fila.guardar(inicial())
    const primeira = f.fila.comprarInsumos('leite', 3)
    await inicio
    expect(await capturar(f.fila.comprarInsumos('ovo', 1))).toBeInstanceOf(Error)
    // Escritor assíncrono já iniciado antes da pausa: a fila não pode apagar seu rascunho.
    const local = inicial()
    local.inventario.tomate = 9
    f.fila.guardar(local)
    soltar()
    await primeira
    expect(n).toBe(1)
    expect(f.situacoes.at(-1)).toBe('ok')
    expect((await f.armazem.ler())?.local.inventario.tomate).toBe(9)
    expect((await f.armazem.ler())?.local.inventario.leite).toBe(3)
    expect(p.guardado().salvamento?.inventario.leite).toBe(3)
    expect(p.guardado().salvamento?.inventario.tomate).toBeUndefined()
    await f.fila.salvarAgora()
    expect(p.guardado().salvamento?.inventario.tomate).toBe(9)
    expect(p.guardado().salvamento?.inventario.leite).toBe(3)
    expect(n).toBe(1)
  } finally {
    soltar()
    await f.fila.parar()
  }
})
