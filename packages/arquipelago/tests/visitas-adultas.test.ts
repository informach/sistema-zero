import { expect, test } from 'bun:test'
import {
  AcessoSchema,
  criarSalvamentoInicial,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import { criarLojaDasVisitasAdultas } from '../src/estado/visitas-adultas'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { CODIGO_DA_VISITA_ADULTA_DE_EXEMPLO as codigo } from '../src/plataforma/visitas-adultas-falsas'

async function montar(opcoes: Parameters<typeof criarPlataformaFalsa>[0] = {}) {
  const plataforma = criarPlataformaFalsa({
    publico: 'adulto',
    posicao: 8,
    obra: 'exemplo',
    visitaAdulta: 'ligado',
    ...opcoes,
  })
  const loja = criarLoja({
    salvamento: criarSalvamentoInicial(new Date('2026-10-30T12:00:00Z')),
    jornada: 8,
    acesso: AcessoSchema.parse((await plataforma.servico.buscar('/acesso')).corpo),
    quarto: await plataforma.lerQuarto(),
    avatar: await plataforma.lerAvatar(),
    aoMudar() {},
  })
  let posicoes = 0
  const criar = (p: Plataforma = plataforma) =>
    criarLojaDasVisitasAdultas(loja, p, () => posicoes++)
  return { plataforma, loja, criar, posicoes: () => posicoes }
}
test('consentimento começa desligado, gera, oculta, gira e revoga sem mudar o save', async () => {
  const p = await montar(),
    visitas = p.criar(),
    antes = structuredClone(p.loja.getState().salvamento)
  visitas.iniciar()
  await visitas.carregar()
  expect(visitas.estado.getState().ativo).toBe(false)
  await visitas.gerar()
  const primeiro = visitas.estado.getState().codigoGerado
  expect(primeiro).toHaveLength(32)
  visitas.ocultarCodigo()
  expect(visitas.estado.getState().codigoGerado).toBeNull()
  await visitas.carregar()
  expect(visitas.estado.getState().ativo).toBe(true)
  await visitas.gerar()
  expect(visitas.estado.getState().codigoGerado).not.toBe(primeiro)
  await visitas.desligar()
  expect(visitas.estado.getState().ativo).toBe(false)
  expect(p.loja.getState().salvamento).toEqual(antes)
  visitas.parar()
})
test('visitar só mostra a projeção; mudar é recusado e revogação restaura a própria casa', async () => {
  const p = await montar({ visitaAdulta: 'revogar-ao-conferir' }),
    visitas = p.criar()
  const antes = structuredClone(p.loja.getState().salvamento)
  visitas.iniciar()
  await visitas.abrir(codigo)
  expect(p.loja.getState().visita?.origem).toBe('adulto')
  expect(p.loja.getState().dica?.texto).toContain('não abriu agora')
  expect(p.posicoes()).toBe(1)
  p.loja.getState().mudar((s) => ({ ...s, energia: 0 }))
  expect(p.loja.getState().salvamento).toEqual(antes)
  await visitas.conferir()
  expect(p.loja.getState().visita).toBeNull()
  expect(p.posicoes()).toBe(2)
  expect(p.loja.getState().salvamento).toEqual(antes)
  visitas.parar()
})
test('fechar o painel antes da resposta não exibe o código na próxima abertura', async () => {
  const p = await montar()
  let liberar!: (r: { status: number; corpo: unknown }) => void
  const pendente = new Promise<{ status: number; corpo: unknown }>((r) => {
    liberar = r
  })
  const visitas = p.criar({ ...p.plataforma, servico: { buscar: async () => pendente } })
  visitas.iniciar()
  const tarefa = visitas.gerar()
  await Promise.resolve()
  visitas.ocultarCodigo()
  await tarefa
  liberar({ status: 200, corpo: { versao: 1, codigo } })
  await Promise.resolve()
  expect(visitas.estado.getState().codigoGerado).toBeNull()
  expect(visitas.estado.getState().ocupado).toBe(false)
  visitas.parar()
})
test('encerrar durante a leitura impede abrir visita por uma resposta atrasada', async () => {
  const p = await montar()
  let liberar!: () => void
  const pendente = new Promise<void>((r) => {
    liberar = r
  })
  const visitas = p.criar({
    ...p.plataforma,
    servico: {
      buscar: async (...args) => {
        await pendente
        return p.plataforma.servico.buscar(...args)
      },
    },
  })
  visitas.iniciar()
  const tarefa = visitas.abrir(codigo)
  visitas.parar()
  liberar()
  await tarefa
  expect(p.loja.getState().visita).toBeNull()
  expect(p.posicoes()).toBe(0)
})
test('resposta perdida deixa consentimento desconhecido até reler, sem inventar que está desligado', async () => {
  const p = await montar(),
    original = p.plataforma.servico.buscar
  const visitas = p.criar({
    ...p.plataforma,
    servico: {
      buscar: async (c, o) => {
        const r = await original(c, o)
        if (c.endsWith('/convite') && o?.metodo === 'POST') throw new Error('Resposta perdida')
        return r
      },
    },
  })
  visitas.iniciar()
  await visitas.carregar()
  await visitas.gerar()
  expect(visitas.estado.getState().ativo).toBeNull()
  expect(visitas.estado.getState().codigoGerado).toBeNull()
  await visitas.carregar()
  expect(visitas.estado.getState().ativo).toBe(true)
  visitas.parar()
})
test('a desmontagem retira a casa adulta, para não conservar visita sem sua revalidação', async () => {
  const p = await montar(),
    visitas = p.criar()
  visitas.iniciar()
  await visitas.abrir(codigo)
  expect(p.loja.getState().visita).not.toBeNull()
  visitas.parar()
  visitas.iniciar()
  expect(p.loja.getState().visita).toBeNull()
  visitas.parar()
})
test('a confirmação tem prazo mesmo se o adaptador ignorar abort e nunca responder', async () => {
  const p = await montar(),
    original = p.plataforma.servico.buscar
  const visitas = p.criar({
    ...p.plataforma,
    servico: {
      buscar: (c, o) => (c.endsWith('/conferir') ? new Promise(() => {}) : original(c, o)),
    },
  })
  visitas.iniciar()
  await visitas.abrir(codigo)
  await visitas.conferir()
  expect(p.loja.getState().visita).toBeNull()
  expect(p.posicoes()).toBe(2)
  visitas.parar()
}, 10000)
test('Kids não inicia pedidos adultos e suporte não cria nem desliga convites', async () => {
  const p = await montar({ publico: 'kids' })
  let chamadas = 0
  const visitas = p.criar({
    ...p.plataforma,
    servico: {
      buscar: async () => {
        chamadas++
        return { status: 200, corpo: {} }
      },
    },
  })
  visitas.iniciar()
  await visitas.carregar()
  await visitas.gerar()
  await visitas.abrir(codigo)
  expect(chamadas).toBe(0)
  expect((await p.plataforma.servico.buscar('/visitas-adultas/convite')).status).toBe(403)
  visitas.parar()
  const suporte = await montar({ somenteLeitura: true }),
    leitura = suporte.criar()
  leitura.iniciar()
  await leitura.gerar()
  await leitura.desligar()
  expect(leitura.estado.getState().ativo).not.toBe(true)
  expect(leitura.estado.getState().codigoGerado).toBeNull()
  leitura.parar()
})
