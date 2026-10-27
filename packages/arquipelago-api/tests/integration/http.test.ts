import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ConflitoDeSalvamentoSchema,
  criarSalvamentoInicial,
  SalvamentoGuardadoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { createServer } from '../../src/interfaces/http/server'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const PERFIL = '11111111-1111-4111-8111-111111111111'
const IRMAO = '33333333-3333-4333-8333-333333333333'
const CONTA = '22222222-2222-4222-8222-222222222222'
const ADULTO = '44444444-4444-4444-8444-444444444444'
const AGORA = new Date('2026-10-27T15:00:00Z')

const dir = mkdtempSync(join(tmpdir(), 'arq-cliente-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

let repo: RepositorioEmMemoria
let politica: PoliticaDeAcesso
let app: ReturnType<typeof createServer>

function montar(servirMapas = true) {
  app = createServer({
    logger: createLogger({ level: 'error' }),
    servico: new ServicoDoJogo(repo, politica, () => AGORA),
    cliente: { dir, servirMapas },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new RepositorioEmMemoria()
  politica = { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() }
  montar()
})

const crianca = (id = PERFIL) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': id,
  'x-auth-account-id': CONTA,
  'x-auth-kids-context': 'student',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
})
const responsavel = {
  'x-internal-token': TOKEN,
  'x-auth-user-id': CONTA,
  'x-auth-kids-context': 'parent',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
}

async function chamar(
  metodo: string,
  caminho: string,
  headers: Record<string, string>,
  corpo?: unknown,
) {
  const r = await app.handle(
    new Request(`http://local${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  const texto = await r.text()
  let json: unknown = null
  try {
    json = JSON.parse(texto)
  } catch {}
  return { status: r.status, json, texto, headers: r.headers }
}

describe('borda', () => {
  test('sem o token interno do gateway é 401', async () => {
    const { 'x-internal-token': _, ...sem } = crianca()
    expect((await chamar('GET', '/arquipelago/acesso', sem)).status).toBe(401)
    expect((await chamar('GET', '/arquipelago/cliente/manifesto.json', {})).status).toBe(401)
  })

  test('healthz e readyz', async () => {
    expect((await chamar('GET', '/healthz', {})).status).toBe(200)
    expect((await chamar('GET', '/readyz', {})).json).toEqual({
      status: 'ready',
      mapaDasIlhas: 'desligada',
    })
  })
})

describe('acesso', () => {
  test('criança do Kids: 30 minutos por padrão e o que já usou hoje', async () => {
    await repo.somarTempo(PERFIL, '2026-10-27', 90)
    const r = await chamar('GET', '/arquipelago/acesso', crianca())
    expect(r.json).toEqual({
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: 30,
      usadoHojeSegundos: 90,
    })
  })

  test('adulto com o público desligado vê o motivo, sem limite', async () => {
    const r = await chamar('GET', '/arquipelago/acesso', {
      'x-internal-token': TOKEN,
      'x-auth-user-id': ADULTO,
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    })
    expect(r.json).toEqual({
      liberado: false,
      motivo: 'publico-desligado',
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
    })
  })

  test('adulto pode jogar no modo aberto sem limite de tempo', async () => {
    politica = { ...politica, publicos: new Set(['kids', 'adulto']) }
    montar()
    const headers = {
      'x-internal-token': TOKEN,
      'x-auth-user-id': ADULTO,
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    expect((await chamar('GET', '/arquipelago/acesso', headers)).json).toMatchObject({
      liberado: true,
      limiteDiarioMinutos: null,
    })
    expect(
      (
        await chamar('POST', '/arquipelago/tempo', headers, {
          segundos: 60,
          eventoId: randomUUID(),
          dia: '2026-10-27',
        })
      ).json,
    ).toMatchObject({
      limiteDiarioMinutos: null,
      acabou: false,
    })
  })

  test('bloqueado não lê nem grava salvamento', async () => {
    politica = { ...politica, modo: 'lista' }
    montar()
    const r = await chamar('GET', '/arquipelago/salvamento', crianca())
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ error: { code: 'ACESSO_BLOQUEADO' }, motivo: 'fora-da-lista' })
  })

  test('responsável não abre o jogo', async () => {
    expect((await chamar('GET', '/arquipelago/acesso', responsavel)).status).toBe(403)
  })
})

describe('salvamento', () => {
  const salvamento = criarSalvamentoInicial(AGORA)

  test('nada guardado, primeira gravação, revisão velha recebe o guardado', async () => {
    expect((await chamar('GET', '/arquipelago/salvamento', crianca())).json).toEqual({
      revisao: 0,
      salvamento: null,
      atualizadoEm: null,
    })
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento,
    })
    expect(primeira.status).toBe(200)
    expect(SalvamentoGuardadoSchema.parse(primeira.json).revisao).toBe(1)

    const outroAparelho = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento: { ...salvamento, casa: { portaNova: true } },
    })
    expect(SalvamentoGuardadoSchema.parse(outroAparelho.json).revisao).toBe(2)

    const atrasado = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento,
    })
    expect(atrasado.status).toBe(409)
    const conflito = ConflitoDeSalvamentoSchema.parse(atrasado.json)
    expect(conflito.atual.revisao).toBe(2)
    expect(conflito.atual.salvamento?.casa.portaNova).toBe(true)
  })

  test('cada perfil tem o próprio salvamento', async () => {
    await chamar('PUT', '/arquipelago/salvamento', crianca(), { revisaoBase: 0, salvamento })
    expect((await chamar('GET', '/arquipelago/salvamento', crianca(IRMAO))).json).toMatchObject({
      revisao: 0,
    })
  })

  test('corpo fora do formato é 400 sem ecoar o que chegou', async () => {
    const r = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: { ...salvamento, versao: 9, segredo: 'x' },
    })
    expect(r.status).toBe(400)
    expect(r.texto).not.toContain('segredo')
    const quebrado = await app.handle(
      new Request('http://local/arquipelago/salvamento', {
        method: 'PUT',
        headers: { ...crianca(), 'content-type': 'application/json' },
        body: '{nao e json',
      }),
    )
    expect(quebrado.status).toBe(400)
  })

  test('revisão acima do que a coluna aceita é 400, nunca 500', async () => {
    const r = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 3_000_000_000,
      salvamento,
    })
    expect(r.status).toBe(400)
  })

  test('salvamento acima de 64 KB é 413', async () => {
    const inventario = Object.fromEntries(
      Array.from({ length: 3000 }, (_, i) => [`item-com-nome-comprido-${i}`, 1]),
    )
    const r = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: { ...salvamento, inventario },
    })
    expect(r.status).toBe(413)
  })

  test('guardado ilegível nunca vira "vazio"', async () => {
    repo.salvamentos.set(PERFIL, { revisao: 4, dados: { versao: 99 }, atualizadoEm: AGORA })
    const r = await chamar('GET', '/arquipelago/salvamento', crianca())
    expect(r.status).toBe(409)
    expect(r.json).toMatchObject({ error: { code: 'SALVAMENTO_ILEGIVEL' } })
  })

  test('suporte olhando não grava nem gasta tempo', async () => {
    const suporte = { ...crianca(), 'x-auth-impersonator-id': ADULTO }
    const r = await chamar('PUT', '/arquipelago/salvamento', suporte, {
      revisaoBase: 0,
      salvamento,
    })
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ error: { code: 'SOMENTE_LEITURA' } })
    const t = await chamar('POST', '/arquipelago/tempo', suporte, {
      segundos: 60,
      eventoId: randomUUID(),
      dia: '2026-10-27',
    })
    expect(t.json).toMatchObject({ usadoHojeSegundos: 0 })
  })
})

describe('tempo livre e limite da família', () => {
  test('repetir um evento é seguro, mas mudar seus segundos é recusado', async () => {
    const eventoId = randomUUID()
    const pedido = { eventoId, segundos: 60, dia: '2026-10-27' }
    expect((await chamar('POST', '/arquipelago/tempo', crianca(), pedido)).json).toMatchObject({
      usadoHojeSegundos: 60,
    })
    expect((await chamar('POST', '/arquipelago/tempo', crianca(), pedido)).json).toMatchObject({
      usadoHojeSegundos: 60,
    })
    expect(
      (await chamar('POST', '/arquipelago/tempo', crianca(), { ...pedido, segundos: 61 })).status,
    ).toBe(409)
  })

  test('evento recuperado no dia seguinte conta no dia em que foi jogado', async () => {
    const pedido = { eventoId: randomUUID(), segundos: 60, dia: '2026-10-26' }
    const resposta = await chamar('POST', '/arquipelago/tempo', crianca(), pedido)
    expect(resposta.json).toMatchObject({ usadoHojeSegundos: 0, acabou: false })
    expect(await repo.lerTempo(PERFIL, '2026-10-26')).toBe(60)
    expect(
      (await chamar('POST', '/arquipelago/tempo', crianca(), { ...pedido, dia: '2026-10-27' }))
        .status,
    ).toBe(409)
    expect(
      (
        await chamar('POST', '/arquipelago/tempo', crianca(), {
          ...pedido,
          eventoId: randomUUID(),
          dia: '2026-10-28',
        })
      ).status,
    ).toBe(400)
  })

  test('soma no dia e avisa quando acabou', async () => {
    repo.limites.set(CONTA, 10)
    for (let i = 0; i < 9; i++)
      await chamar('POST', '/arquipelago/tempo', crianca(), {
        segundos: 60,
        eventoId: randomUUID(),
        dia: '2026-10-27',
      })
    const r = await chamar('POST', '/arquipelago/tempo', crianca(), {
      segundos: 60,
      eventoId: randomUUID(),
      dia: '2026-10-27',
    })
    expect(r.json).toEqual({ usadoHojeSegundos: 600, limiteDiarioMinutos: 10, acabou: true })
    expect(
      (
        await chamar('POST', '/arquipelago/tempo', crianca(), {
          segundos: 500,
          eventoId: randomUUID(),
          dia: '2026-10-27',
        })
      ).status,
    ).toBe(400)
  })

  test('responsável lê o padrão e muda (normalizado em passos de 5)', async () => {
    expect((await chamar('GET', '/arquipelago/familia/limite', responsavel)).json).toEqual({
      limiteDiarioMinutos: 30,
    })
    const r = await chamar('PUT', '/arquipelago/familia/limite', responsavel, {
      limiteDiarioMinutos: 47,
    })
    expect(r.json).toEqual({ limiteDiarioMinutos: 45 })
    expect((await chamar('GET', '/arquipelago/acesso', crianca())).json).toMatchObject({
      limiteDiarioMinutos: 45,
    })
    const alto = await chamar('PUT', '/arquipelago/familia/limite', responsavel, {
      limiteDiarioMinutos: 999,
    })
    expect(alto.json).toEqual({ limiteDiarioMinutos: 240 })
  })

  test('a criança não muda o próprio limite', async () => {
    const r = await chamar('PUT', '/arquipelago/familia/limite', crianca(), {
      limiteDiarioMinutos: 240,
    })
    expect(r.status).toBe(403)
  })
})

describe('cliente do jogo', () => {
  test('sem build: 503; com build: manifesto sem cache e arquivos imutáveis', async () => {
    expect(
      (await chamar('GET', '/arquipelago/cliente/manifesto.json', { 'x-internal-token': TOKEN }))
        .status,
    ).toBe(503)
    writeFileSync(
      join(dir, 'manifesto.json'),
      JSON.stringify({
        versao: '1',
        entrada: 'entrada-abc.js',
        versaoContrato: 1,
        geradoEm: AGORA.toISOString(),
      }),
    )
    writeFileSync(join(dir, 'entrada-abc.js'), 'export const ok = 1')
    writeFileSync(join(dir, 'entrada-abc.js.map'), '{}')
    writeFileSync(join(dir, 'zappy-abc.glb'), 'glb')
    const h = { 'x-internal-token': TOKEN }
    const m = await chamar('GET', '/arquipelago/cliente/manifesto.json', h)
    expect(m.status).toBe(200)
    expect(m.headers.get('cache-control')).toBe('no-cache')
    const js = await chamar('GET', '/arquipelago/cliente/entrada-abc.js', h)
    expect(js.texto).toBe('export const ok = 1')
    expect(js.headers.get('content-type')).toContain('text/javascript')
    expect(js.headers.get('cache-control')).toContain('immutable')
    const glb = await chamar('GET', '/arquipelago/cliente/zappy-abc.glb', h)
    expect(glb.headers.get('content-type')).toBe('model/gltf-binary')
    expect((await chamar('GET', '/arquipelago/cliente/entrada-abc.js.map', h)).status).toBe(200)
    expect((await chamar('GET', '/arquipelago/cliente/..%2Fmanifesto.json', h)).status).toBe(404)
    expect((await chamar('GET', '/arquipelago/cliente/nao-existe.js', h)).status).toBe(404)
    montar(false)
    expect((await chamar('GET', '/arquipelago/cliente/entrada-abc.js.map', h)).status).toBe(404)
  })
})
