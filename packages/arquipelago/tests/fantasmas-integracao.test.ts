import { expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  type Fantasma,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { criarLojaDosFantasmas } from '../src/estado/fantasmas'
import { criarLoja } from '../src/estado/loja'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { ANA } from '../src/plataforma/familia-falsa'
import { criarArmazemDosFantasmas } from '../src/sistemas/armazem-fantasmas'
import { criarFilaDeSalvamento } from '../src/sistemas/salvar'

const f = (tempoMs = 100): Fantasma => ({
  versao: 1,
  percurso: 'bosque-copas',
  tempoMs,
  passoMs: 100,
  amostras: Array.from({ length: Math.ceil(tempoMs / 100) + 1 }, (_, i) => [i * 100, 200, 0, 0]),
})
const pose = { x: 0, y: 2, z: 0, direcao: 0 }
async function montar(opcoes: Parameters<typeof criarPlataformaFalsa>[0] = {}) {
  const original = criarPlataformaFalsa({ posicao: 8, ...opcoes })
  const erros: unknown[] = []
  const plataforma: Plataforma = { ...original, relatarErro: (e) => erros.push(e) }
  const save = criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z'))
  const loja = criarLoja({
    salvamento: save,
    jornada: 8,
    quarto: await plataforma.lerQuarto(),
    avatar: await plataforma.lerAvatar(),
    acesso: AcessoSchema.parse((await plataforma.servico.buscar('/acesso')).corpo),
    aoMudar: (s) => fila.guardar(s),
  })
  const fila = criarFilaDeSalvamento({
    servico: plataforma.servico,
    guardadoInicial: { revisao: 0, salvamento: null, atualizadoEm: null },
    rascunhoInicial: null,
    armazem: { ler: async () => null, gravar: async () => {}, fechar() {} },
    aoAdotar: (g) => loja.getState().adotar(g),
    aoSituacao: (s) => loja.getState().definirSituacaoSalvamento(s),
    aoErro: (e) => erros.push(e),
    intervaloMs: 60000,
  })
  const perfil = `${opcoes.publico ?? 'kids'}:${crypto.randomUUID()}`
  const criar = () =>
    criarLojaDosFantasmas(loja, plataforma, fila, () => criarArmazemDosFantasmas(perfil))
  return { plataforma, original, loja, fila, criar, perfil, erros }
}

test('diário separa perfil e público, limita um melhor por percurso e resiste à confirmação antiga', async () => {
  const id = crypto.randomUUID()
  const a = await criarArmazemDosFantasmas(`kids:${id}`),
    b = await criarArmazemDosFantasmas(`adulto:${id}`)
  await a.guardar(f(200))
  await a.guardar(f(100))
  await a.guardar(f(300))
  expect((await a.listar()).map((f) => f.tempoMs)).toEqual([100])
  expect(await b.listar()).toEqual([])
  await a.remover('bosque-copas', 200)
  expect(await a.listar()).toHaveLength(1)
  a.fechar()
  b.fechar()
  const reaberto = await criarArmazemDosFantasmas(`kids:${id}`)
  expect((await reaberto.listar())[0]).toEqual(f())
  await reaberto.remover('bosque-copas', 100)
  expect(await reaberto.listar()).toEqual([])
  reaberto.fechar()
})

test('captura só envia depois do save confirmado, sem modificar prêmio ou inventário', async () => {
  const p = await montar(),
    c = p.criar()
  try {
    c.iniciar()
    await c.tentarEnviar()
    c.comecar('bosque-copas', pose)
    p.loja.getState().mudar((s) => ({
      ...s,
      percursos: {
        ...s.percursos,
        'bosque-copas': {
          melhorTempoMs: 100,
          estrelas: { chegada: true, tempo: false, vagalumes: false },
        },
      },
    }))
    const inventario = p.loja.getState().salvamento.inventario
    await c.terminar('bosque-copas', 100, { ...pose, x: 1 })
    expect(c.estado.getState().envio).toBe('guardado')
    expect((await p.plataforma.servico.buscar('/fantasmas/bosque-copas')).corpo).toMatchObject({
      situacao: 'disponivel',
      fantasma: { tempoMs: 100 },
    })
    expect(p.loja.getState().salvamento.inventario).toEqual(inventario)
    expect(p.erros).toEqual([])
  } finally {
    c.parar()
    await p.fila.parar()
  }
})

test('resposta de upload perdida mantém diário e reabertura confirma o mesmo artefato', async () => {
  const p = await montar(),
    buscar = p.plataforma.servico.buscar
  let perder = true,
    uploads = 0
  p.plataforma.servico = {
    async buscar(c, o) {
      const r = await buscar(c, o)
      if (c === '/fantasmas') {
        uploads++
        if (perder) throw new Error('Resposta perdida depois da gravação')
      }
      return r
    },
  }
  const c = p.criar()
  try {
    c.iniciar()
    await c.tentarEnviar()
    c.comecar('bosque-copas', pose)
    p.loja.getState().mudar((s) => ({
      ...s,
      percursos: {
        ...s.percursos,
        'bosque-copas': {
          melhorTempoMs: 100,
          estrelas: { chegada: true, tempo: false, vagalumes: false },
        },
      },
    }))
    await c.terminar('bosque-copas', 100, { ...pose, x: 1 })
    expect(c.estado.getState().envio).toBe('indisponivel')
    c.parar()
    perder = false
    const outro = p.criar()
    try {
      outro.iniciar()
      await outro.tentarEnviar()
      expect(outro.estado.getState().envio).toBe('guardado')
      expect(uploads).toBe(2)
      const armazem = await criarArmazemDosFantasmas(p.perfil)
      expect(await armazem.listar()).toEqual([])
      armazem.fechar()
    } finally {
      outro.parar()
    }
  } finally {
    c.parar()
    await p.fila.parar()
  }
})

test('permissão revogada, trajeto ausente e resposta tardia não preservam referência familiar', async () => {
  const p = await montar({ familia: 'irmaos', fantasma: f() }),
    c = p.criar(),
    buscar = p.plataforma.servico.buscar
  try {
    c.iniciar()
    await c.tentarEnviar()
    await c.escolher({ perfilId: ANA, nome: 'Ana' }, 'bosque-copas')
    expect(c.estado.getState().referencia?.nome).toBe('Ana')
    p.plataforma.servico = { buscar: async () => ({ status: 403, corpo: null }) }
    await c.revalidar()
    expect(c.estado.getState().referencia).toBeNull()
    p.plataforma.servico = { buscar }
    await c.escolher({ perfilId: ANA, nome: 'Ana' }, 'pico-cume')
    expect(c.estado.getState().referencia).toBeNull()
    let liberar: (() => void) | undefined
    const espera = new Promise<void>((r) => {
      liberar = r
    })
    p.plataforma.servico = {
      async buscar(c, o) {
        await espera
        return buscar(c, o)
      },
    }
    const pedido = c.escolher({ perfilId: ANA, nome: 'Ana' }, 'bosque-copas')
    c.parar()
    liberar?.()
    await pedido
    expect(c.estado.getState().referencia).toBeNull()
  } finally {
    c.parar()
    await p.fila.parar()
  }
})

test('suporte não grava, corrida cancelada ou pior não cria artefato', async () => {
  for (const suporte of [true, false]) {
    const p = await montar({ somenteLeitura: suporte }),
      c = p.criar()
    try {
      c.iniciar()
      await c.tentarEnviar()
      c.comecar('bosque-copas', pose)
      c.cancelar('bosque-copas')
      await c.terminar('bosque-copas', 100, pose)
      c.comecar('bosque-copas', pose)
      await c.terminar('bosque-copas', 200, pose)
      expect((await p.plataforma.servico.buscar('/fantasmas/bosque-copas')).corpo).toEqual({
        versao: 1,
        situacao: 'ausente',
      })
    } finally {
      c.parar()
      await p.fila.parar()
    }
  }
})

test('revalidar usa só os recordes pequenos da família e não baixa novamente as amostras', async () => {
  const p = await montar({ familia: 'irmaos', fantasma: f(48200) }),
    c = p.criar(),
    buscar = p.plataforma.servico.buscar
  const caminhos: string[] = []
  let mudou = false
  p.plataforma.servico = {
    async buscar(caminho, opcoes) {
      caminhos.push(caminho)
      const r = await buscar(caminho, opcoes)
      if (mudou && caminho === '/irmaos')
        return { status: 200, corpo: { versao: 1, situacao: 'ok', irmaos: [] } }
      return r
    },
  }
  try {
    c.iniciar()
    await c.tentarEnviar()
    await c.escolher({ perfilId: ANA, nome: 'Ana' }, 'bosque-copas')
    const referencia = c.estado.getState().referencia
    expect(referencia).not.toBeNull()
    await c.revalidar()
    expect(caminhos.at(-1)).toBe('/irmaos')
    expect(c.estado.getState().referencia).toBe(referencia)
    mudou = true
    await c.revalidar()
    expect(c.estado.getState().referencia).toBeNull()
  } finally {
    c.parar()
    await p.fila.parar()
  }
})

test('prazo retira referência mesmo se o adaptador devolver o trajeto depois de abortar', async () => {
  const p = await montar({ familia: 'irmaos', fantasma: f() }),
    c = p.criar(),
    buscar = p.plataforma.servico.buscar
  let liberar: (() => void) | undefined, expirou: (() => void) | undefined
  const espera = new Promise<void>((r) => {
      liberar = r
    }),
    prazo = new Promise<void>((r) => {
      expirou = r
    })
  try {
    c.iniciar()
    await c.tentarEnviar()
    await c.escolher({ perfilId: ANA, nome: 'Ana' }, 'bosque-copas')
    expect(c.estado.getState().referencia).not.toBeNull()
    p.plataforma.servico = {
      async buscar(caminho, opcoes) {
        if (!opcoes?.sinal) throw new Error('Leitura sem AbortSignal')
        opcoes.sinal.addEventListener('abort', () => expirou?.(), { once: true })
        const r = await buscar(caminho, opcoes)
        await espera
        return r
      },
    }
    const pedido = c.revalidar()
    await prazo
    expect(c.estado.getState().referencia).toBeNull()
    expect(c.estado.getState().carregando).toBe(false)
    liberar?.()
    await pedido
    expect(c.estado.getState().referencia).toBeNull()
  } finally {
    liberar?.()
    c.parar()
    await p.fila.parar()
  }
}, 10000)

test('fechar durante a leitura do recorde não inicia um upload tardio e conserva o diário', async () => {
  const p = await montar(),
    buscar = p.plataforma.servico.buscar
  p.loja.getState().mudar((s) => ({
    ...s,
    percursos: {
      ...s.percursos,
      'bosque-copas': {
        melhorTempoMs: 100,
        estrelas: { chegada: true, tempo: false, vagalumes: false },
      },
    },
  }))
  const armazem = await criarArmazemDosFantasmas(p.perfil)
  await armazem.guardar(f())
  armazem.fechar()
  let liberar: (() => void) | undefined,
    comecou: (() => void) | undefined,
    uploads = 0
  const espera = new Promise<void>((r) => {
      liberar = r
    }),
    leitura = new Promise<void>((r) => {
      comecou = r
    })
  p.plataforma.servico = {
    async buscar(caminho, opcoes) {
      if (caminho === '/fantasmas') uploads++
      const r = await buscar(caminho, opcoes)
      if (caminho === '/salvamento' && opcoes?.metodo !== 'PUT') {
        comecou?.()
        await espera
      }
      return r
    },
  }
  const c = p.criar()
  try {
    c.iniciar()
    await leitura
    c.parar()
    liberar?.()
    await c.tentarEnviar()
    expect(uploads).toBe(0)
    const reaberto = await criarArmazemDosFantasmas(p.perfil)
    expect(await reaberto.listar()).toEqual([f()])
    reaberto.fechar()
  } finally {
    liberar?.()
    c.parar()
    await p.fila.parar()
  }
})
