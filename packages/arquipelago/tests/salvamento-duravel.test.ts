import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  criarSalvamentoInicial,
  type SalvamentoGuardado,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  type ArmazemDeSalvamento,
  criarArmazemDeSalvamento,
} from '../src/sistemas/armazem-salvamento'
import { comecarConversa } from '../src/sistemas/conversa-da-capi'
import { criarFilaDeSalvamento, type SituacaoDoSalvamento } from '../src/sistemas/salvar'

const vazio: SalvamentoGuardado = { revisao: 0, salvamento: null, atualizadoEm: null }
const inicial = () => criarSalvamentoInicial(new Date('2026-10-28T15:00:00Z'))
const semTravaDeBrowser = async () => () => {}
const abrir = (perfil: string) => criarArmazemDeSalvamento(perfil, semTravaDeBrowser)

test('recusa permanente pausa sem repetir automaticamente nem descartar a cópia local', async () => {
  const armazem = await abrir(`kids:${crypto.randomUUID()}`)
  const situacoes: SituacaoDoSalvamento[] = []
  let agendamentos = 0
  const falsa = criarPlataformaFalsa({ persistir: false })
  let recusado = true
  const f = criarFilaDeSalvamento({
    armazem,
    guardadoInicial: vazio,
    rascunhoInicial: null,
    servico: {
      buscar: (path, opts) =>
        recusado ? Promise.resolve({ status: 403, corpo: {} }) : falsa.servico.buscar(path, opts),
    },
    aoAdotar: () => {},
    aoSituacao: (s) => situacoes.push(s),
    aoErro: () => {},
    agendar: () => ++agendamentos,
    cancelar: () => {},
  })
  try {
    f.guardar(inicial())
    await f.salvarAgora()
    expect(situacoes.at(-1)).toBe('recusado')
    expect(agendamentos).toBe(1)
    expect((await armazem.ler())?.local).toEqual(inicial())
    recusado = false
    await f.salvarAgora()
    expect(f.temPendente()).toBe(false)
    expect(situacoes.at(-1)).toBe('ok')
  } finally {
    await f.parar()
  }
})
async function fila(armazem: ArmazemDeSalvamento, servico: ServicoDoJogo, guardado = vazio) {
  const adotados: SalvamentoGuardado[] = []
  const situacoes: SituacaoDoSalvamento[] = []
  const erros: unknown[] = []
  const f = criarFilaDeSalvamento({
    armazem,
    servico,
    guardadoInicial: guardado,
    rascunhoInicial: await armazem.ler(),
    aoAdotar: (s) => adotados.push(s),
    aoSituacao: (s) => situacoes.push(s),
    aoErro: (e) => erros.push(e),
    agendar: () => 1,
    cancelar: () => {},
  })
  return { f, adotados, situacoes, erros }
}
function sinal() {
  let liberar!: () => void
  const promessa = new Promise<void>((resolve) => {
    liberar = resolve
  })
  return { promessa, liberar }
}

test('presente pendente sobrevive ao fechamento e chega inteiro ao serviço sem nova entrega', async () => {
  const perfil = `kids:${crypto.randomUUID()}`
  const p = criarPlataformaFalsa({ persistir: false })
  const s = inicial()
  s.bichos.achados = [...BICHOS_DO_BOSQUE]
  const entregue = comecarConversa(s, '2026-10-28', perfil).salvamento
  const primeira = await fila(await abrir(perfil), p.servico)
  primeira.f.guardar(entregue)
  await primeira.f.parar()
  const segunda = await fila(await abrir(perfil), p.servico)
  expect(segunda.adotados.at(-1)?.salvamento).toEqual(entregue)
  await segunda.f.salvarAgora()
  const lido = p.guardado().salvamento
  expect(lido).toEqual(entregue)
  if (!lido) throw new Error('Salvamento não chegou ao serviço')
  expect(comecarConversa(lido, '2026-10-29', perfil).salvamento.inventario.salada).toBe(1)
  await segunda.f.parar()
})

test('diário V3 pendente migra para a atual sem perder alteração nem identidade do envio', async () => {
  const perfil = `kids:${crypto.randomUUID()}`
  const armazem = await abrir(perfil)
  const {
    construcao: _construcao,
    projetos: _projetos,
    presenteDosBichosEntregue: _presente,
    turnos: _turnos,
    lumis: _lumis,
    rotinas: _rotinas,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    nuvens: _nuvens,
    farol: _farol,
    clima: _clima,
    ilhasVisitadas: _visitas,
    chaves: _chaves,
    segredos: _segredos,
    mapa: _mapa,
    companhia: _companhia,
    florada: _florada,
    ceu: _ceu,
    ...v3
  } = inicial()
  const antigo = {
    ...v3,
    versao: 3,
    moradores: { capi: v3.moradores.capi },
    // Os outros bichos adotados são da V23.
    bichos: { achados: v3.bichos.achados, adotado: v3.bichos.adotado },
    inventario: { milho: 4 },
  }
  const enviado = { ...antigo, inventario: { milho: 3 } }
  const local = { ...antigo, inventario: { milho: 2 } }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('sistema-zero-arquipelago-salvamento', 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('rascunhos', 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
      tx.objectStore('rascunhos').put({
        versao: 1,
        perfil,
        base: { revisao: 1, salvamento: antigo, atualizadoEm: antigo.criadoEm },
        local,
        enviado,
      })
    })
    const lido = await armazem.ler()
    expect(lido?.base.salvamento).toMatchObject({
      versao: 23,
      inventario: { milho: 4 },
      projetos: {},
    })
    expect(lido?.enviado).toMatchObject({ versao: 23, inventario: { milho: 3 } })
    expect(lido?.local).toMatchObject({
      versao: 23,
      inventario: { milho: 2 },
      construcao: { casa: null, cabanas: {} },
    })
  } finally {
    db.close()
    armazem.fechar()
  }
})

test('fechar sem PUT e reabrir recupera o diário, isolado por perfil', async () => {
  const perfil = crypto.randomUUID()
  const p = criarPlataformaFalsa()
  const primeira = await fila(await abrir(perfil), p.servico)
  const local = {
    ...inicial(),
    inventario: { milho: 7 },
    nuvens: { constelacoes: 33 },
    farol: { pagina: true, concluido: true, galeria: [] },
    clima: 'chuva' as const,
    percursos: {
      'nuvens-balao': [5, 41000] as [number, number],
    },
  }
  primeira.f.guardar(local)
  await primeira.f.parar()
  expect(p.guardado().revisao).toBe(0)
  const outro = await abrir(crypto.randomUUID())
  expect(await outro.ler()).toBeNull()
  outro.fechar()
  const segunda = await fila(await abrir(perfil), p.servico)
  expect(segunda.adotados.at(-1)?.salvamento).toEqual(local)
  await segunda.f.salvarAgora()
  expect(p.guardado().salvamento).toEqual(local)
  await segunda.f.parar()
  const terceira = await abrir(perfil)
  expect(await terceira.ler()).toBeNull()
  terceira.fechar()
})

test('resposta perdida, reabertura e consumo posterior não duplicam inventário', async () => {
  const perfil = crypto.randomUUID()
  const p = criarPlataformaFalsa()
  const primeira = await fila(await abrir(perfil), {
    async buscar(c, o) {
      await p.servico.buscar(c, o)
      throw new Error('resposta perdida')
    },
  })
  primeira.f.guardar({ ...inicial(), inventario: { milho: 2 } })
  await primeira.f.salvarAgora()
  primeira.f.guardar({ ...inicial(), inventario: { milho: 1 } })
  await primeira.f.parar()
  const segunda = await fila(await abrir(perfil), p.servico, p.guardado())
  expect(segunda.situacoes).not.toContain('conflito')
  expect(segunda.adotados.at(-1)?.salvamento?.inventario).toEqual({ milho: 1 })
  await segunda.f.salvarAgora()
  expect(p.guardado().salvamento?.inventario).toEqual({ milho: 1 })
  await segunda.f.parar()
})

test('409 preserva também alterações feitas enquanto o envio estava em andamento', async () => {
  const p = criarPlataformaFalsa()
  const recebido = sinal()
  const liberar = sinal()
  const f = await fila(await abrir(crypto.randomUUID()), {
    async buscar(c, o) {
      recebido.liberar()
      await liberar.promessa
      return p.servico.buscar(c, o)
    },
  })
  f.f.guardar({ ...inicial(), inventario: { milho: 1 } })
  const enviando = f.f.salvarAgora()
  await recebido.promessa
  f.f.guardar({ ...inicial(), inventario: { milho: 2 } })
  await p.servico.buscar('/salvamento', {
    metodo: 'PUT',
    corpo: { revisaoBase: 0, salvamento: { ...inicial(), inventario: { milho: 9 } } },
  })
  liberar.liberar()
  await enviando
  expect(f.situacoes.at(-1)).toBe('conflito')
  expect(JSON.parse(f.f.copiaLocal()).local.inventario).toEqual({ milho: 2 })
  expect(f.adotados).toHaveLength(0)
  await f.f.resolver('local')
  expect(p.guardado().salvamento?.inventario).toEqual({ milho: 2 })
  await f.f.parar()
})

test('dois pedidos de flush compartilham o mesmo PUT e mantêm o próximo snapshot', async () => {
  const p = criarPlataformaFalsa()
  const recebido = sinal()
  const liberar = sinal()
  let puts = 0
  const f = await fila(await abrir(crypto.randomUUID()), {
    async buscar(c, o) {
      puts++
      recebido.liberar()
      await liberar.promessa
      return p.servico.buscar(c, o)
    },
  })
  f.f.guardar(inicial())
  const primeiro = f.f.salvarAgora()
  await recebido.promessa
  f.f.guardar({ ...inicial(), casa: { portaNova: true } })
  const segundo = f.f.salvarAgora()
  liberar.liberar()
  await Promise.all([primeiro, segundo])
  expect(puts).toBe(1)
  expect(f.f.temPendente()).toBe(true)
  await f.f.salvarAgora()
  expect(puts).toBe(2)
  expect(p.guardado().salvamento?.casa.portaNova).toBe(true)
  await f.f.parar()
})

test('quota local impede PUT e permite tentar guardar novamente', async () => {
  const p = criarPlataformaFalsa()
  const original = await abrir(crypto.randomUUID())
  let falhar = true
  const f = await fila(
    {
      ...original,
      gravar: async (s) => {
        if (falhar) throw new Error('quota')
        await original.gravar(s)
      },
    },
    p.servico,
  )
  f.f.guardar(inicial())
  await f.f.salvarAgora()
  expect(p.guardado().revisao).toBe(0)
  expect(f.situacoes.at(-1)).toBe('erro-local')
  falhar = false
  await f.f.salvarAgora()
  expect(p.guardado().revisao).toBe(1)
  expect(f.situacoes.at(-1)).toBe('ok')
  await f.f.parar()
})

test('resposta perdida e alteração posterior são recuperadas sem exigir reabrir o jogo', async () => {
  const p = criarPlataformaFalsa()
  let perder = true
  const f = await fila(await abrir(crypto.randomUUID()), {
    async buscar(c, o) {
      const resposta = await p.servico.buscar(c, o)
      if (perder) {
        perder = false
        throw new Error('resposta perdida')
      }
      return resposta
    },
  })
  f.f.guardar({ ...inicial(), inventario: { milho: 2 } })
  await f.f.salvarAgora()
  f.f.guardar({ ...inicial(), inventario: { milho: 1 } })
  await f.f.salvarAgora()
  expect(f.situacoes).not.toContain('conflito')
  expect(p.guardado().salvamento?.inventario).toEqual({ milho: 1 })
  await f.f.parar()
})
