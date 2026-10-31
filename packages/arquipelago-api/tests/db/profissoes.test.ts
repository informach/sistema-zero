import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { SessaoDaProfissaoSchema } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { SomenteLeituraError } from '../../src/application/erros'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import {
  BandejasDoTurnoInvalidasError,
  ServicoDasProfissoes,
  TurnoNaoEncontradoError,
} from '../../src/application/servico-das-profissoes'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { Jogador } from '../../src/domain/jogador'
import type { PortaDasMoedas } from '../../src/domain/moedas.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDasProfissoes } from '../../src/infrastructure/persistence/drizzle/repositorio-profissoes'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { RepositorioEmMemoria } from '../fakes/memoria'

const url = process.env.ARQUIPELAGO_PROFISSOES_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw new Error('Use Postgres local descartável arquipelago_test para profissões')
}
let db: DbConnection
let repo: DrizzleRepositorioDasProfissoes
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 6 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDasProfissoes(db.db)
})
afterAll(async () => {
  await db?.close()
})

function preparar(publico: 'kids' | 'adulto' = 'kids') {
  let agora = new Date('2026-10-29T12:00:00Z')
  const jogador: Jogador = {
    id: crypto.randomUUID(),
    contaId: publico === 'kids' ? crypto.randomUUID() : null,
    publico,
    equipe: false,
    somenteLeitura: false,
  }
  const chamadas: Parameters<PortaDasMoedas['creditar']>[0][] = []
  const creditos = new Map<string, number>()
  let resposta: 'paga' | 'teto' | 'perder-resposta' = 'paga'
  const moedas: PortaDasMoedas = {
    async creditar(p) {
      chamadas.push(p)
      if (resposta === 'teto') return { situacao: 'teto' }
      creditos.set(p.key, p.amount)
      if (resposta === 'perder-resposta') throw new Error('Resposta perdida depois do crédito')
      return { situacao: 'creditado' }
    },
  }
  const deps = {
    repo,
    moedas,
    politica: {
      modo: 'aberto' as const,
      publicos: new Set(['kids' as const, 'adulto' as const]),
      lista: new Set<string>(),
    },
    leituras: { jogador: async () => ({ posicao: 8, total: 8, blocos: [] }) },
    logger: createLogger({ level: 'error' }),
    agora: () => agora,
  }
  const servico = new ServicoDasProfissoes(deps)
  return {
    jogador,
    servico,
    deps,
    chamadas,
    creditos,
    resposta: (r: typeof resposta) => {
      resposta = r
    },
    dia: (d: string) => {
      agora = new Date(d)
    },
  }
}

describe.skipIf(!url)('profissões com repositório Postgres real', () => {
  test('HTTP autentica, isola Kids/adulto e valida entrada antes de alterar o banco', async () => {
    const p = preparar()
    const logger = createLogger({ level: 'error' })
    const leituras = new LeiturasDosMembros(null)
    const app = createServer({
      profissoes: p.servico,
      logger,
      tokenInterno: 'token-profissoes-local',
      servico: new ServicoDoJogo(new RepositorioEmMemoria(), p.deps.politica),
      cartas: new ServicoDasCartas(p.deps.politica, leituras),
      equipe: new ServicoDaEquipe(
        new DesafiosEmMemoria(),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(p.deps.politica),
      cliente: { dir: '.', servirMapas: false },
      readiness: async () => {},
    })
    const headers = {
      'content-type': 'application/json',
      'x-internal-token': 'token-profissoes-local',
      'x-auth-user-id': p.jogador.id,
      'x-auth-account-id': p.jogador.contaId ?? '',
      'x-auth-kids-context': 'student',
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    const chamar = (acao: string, corpo: unknown, h: Record<string, string> = headers) =>
      app.handle(
        new Request(`http://local/arquipelago/profissoes/${acao}`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify(corpo),
        }),
      )
    expect(
      (await chamar('iniciar', { posto: 'padaria' }, { ...headers, 'x-internal-token': 'errado' }))
        .status,
    ).toBe(401)
    expect((await chamar('iniciar', { posto: 'padaria', moedas: 100 })).status).toBe(400)
    expect(
      (
        await chamar(
          'iniciar',
          { posto: 'padaria' },
          { ...headers, 'x-auth-impersonator-id': crypto.randomUUID() },
        )
      ).status,
    ).toBe(403)
    const inicio = await chamar('iniciar', { posto: 'padaria' })
    expect(inicio.status).toBe(200)
    const sessao = SessaoDaProfissaoSchema.parse(await inicio.json())
    const pedido = { sessao: sessao.id, respostas: sessao.pedidos.map((p) => ({ ...p.itens })) }
    expect((await chamar('concluir', { ...pedido, premio: 100 })).status).toBe(400)
    expect(
      (await chamar('concluir', { ...pedido, respostas: [{}, ...pedido.respostas.slice(1)] }))
        .status,
    ).toBe(422)
    expect(
      (await chamar('concluir', pedido, { ...headers, 'x-auth-user-id': crypto.randomUUID() }))
        .status,
    ).toBe(404)
    const adulto: Record<string, string> = { ...headers }
    delete adulto['x-auth-account-id']
    delete adulto['x-auth-kids-context']
    expect((await chamar('concluir', pedido, adulto)).status).toBe(404)
    expect(p.chamadas).toHaveLength(0)
    expect((await repo.ler(sessao.id, p.jogador.id, 'kids'))?.concluidoEm).toBeNull()
    const fim = await chamar('concluir', pedido)
    expect(fim.status).toBe(200)
    expect(SessaoDaProfissaoSchema.parse(await fim.json()).pagamento).toBe('creditado')
    const retornoAdulto = await chamar('iniciar', { posto: 'sucos' }, adulto)
    expect(retornoAdulto.status).toBe(200)
    expect(SessaoDaProfissaoSchema.parse(await retornoAdulto.json()).id).not.toBe(sessao.id)
    expect([...p.creditos.values()]).toEqual([5])
  })
  test('concorrência reserva uma sessão por pessoa/balcão/dia; seis respostas e crédito uma vez', async () => {
    const p = preparar()
    const [a, b] = await Promise.all([
      p.servico.iniciar(p.jogador, 'padaria'),
      p.servico.iniciar(p.jogador, 'padaria'),
    ])
    expect(a).toEqual(b)
    expect(SessaoDaProfissaoSchema.safeParse(a).success).toBe(true)
    const pedido = { sessao: a.id, respostas: a.pedidos.map((x) => ({ ...x.itens })) }
    const errado = structuredClone(pedido)
    errado.respostas[0] = { outro: 1 }
    await expect(p.servico.concluir(p.jogador, errado)).rejects.toBeInstanceOf(
      BandejasDoTurnoInvalidasError,
    )
    expect(p.chamadas).toHaveLength(0)
    const resultados = await Promise.all([
      p.servico.concluir(p.jogador, pedido),
      p.servico.concluir(p.jogador, pedido),
    ])
    expect(resultados.every((r) => r.pagamento === 'creditado' && r.concluido)).toBe(true)
    expect([...p.creditos.values()]).toEqual([5])
    const salvo = await repo.ler(a.id, p.jogador.id, p.jogador.publico)
    await repo.marcarPagamento(a.id, 'teto', '2026-10-26')
    expect(await repo.ler(a.id, p.jogador.id, p.jogador.publico)).toEqual(salvo)
    expect((await p.servico.iniciar(p.jogador, 'padaria')).id).toBe(a.id)
    expect(
      p.chamadas.every(
        (c) =>
          c.key === a.id &&
          c.userId === p.jogador.id &&
          c.accountId === p.jogador.contaId &&
          c.amount === 5,
      ),
    ).toBe(true)
  })

  test('resposta de pagamento perdida é retomada com a mesma chave, sem repetir prêmio', async () => {
    const p = preparar('adulto')
    const a = await p.servico.iniciar(p.jogador, 'sucos')
    p.resposta('perder-resposta')
    const r = await p.servico.concluir(p.jogador, {
      sessao: a.id,
      respostas: a.pedidos.map((x) => ({ ...x.itens })),
    })
    expect(r.pagamento).toBe('pendente')
    p.resposta('paga')
    const reaberto = await p.servico.iniciar(p.jogador, 'sucos')
    expect(reaberto.pagamento).toBe('creditado')
    expect(p.chamadas.map((c) => c.key)).toEqual([a.id, a.id])
    expect([...p.creditos.values()]).toEqual([5])
    expect(p.chamadas[0]?.accountId).toBe(p.jogador.id)
    expect(p.chamadas[0]?.audience).toBe('adult')
  })

  test('teto conserva o prêmio para outra semana e não insiste na mesma', async () => {
    const p = preparar()
    const a = await p.servico.iniciar(p.jogador, 'sorveteria')
    p.resposta('teto')
    await p.servico.concluir(p.jogador, {
      sessao: a.id,
      respostas: a.pedidos.map((x) => ({ ...x.itens })),
    })
    await p.servico.iniciar(p.jogador, 'sorveteria')
    expect(p.chamadas).toHaveLength(1)
    p.dia('2026-11-02T03:00:00Z')
    p.resposta('paga')
    const novo = await p.servico.iniciar(p.jogador, 'sorveteria')
    expect(novo.id).not.toBe(a.id)
    expect((await repo.ler(a.id, p.jogador.id, p.jogador.publico))?.pagamento).toBe('creditado')
    expect(p.chamadas.map((c) => c.key)).toEqual([a.id, a.id])
  })

  test('não aceita outra pessoa, público, conta, suporte nem ilha ainda fechada', async () => {
    const p = preparar()
    const a = await p.servico.iniciar(p.jogador, 'padaria')
    const pedido = { sessao: a.id, respostas: a.pedidos.map((x) => ({ ...x.itens })) }
    for (const outro of [
      { ...p.jogador, id: crypto.randomUUID() },
      { ...p.jogador, publico: 'adulto' as const },
      { ...p.jogador, contaId: crypto.randomUUID() },
    ]) {
      let erro: unknown
      try {
        await p.servico.concluir(outro, pedido)
      } catch (e) {
        erro = e
      }
      expect(erro).toBeInstanceOf(TurnoNaoEncontradoError)
    }
    let suporte: unknown
    try {
      await p.servico.iniciar({ ...p.jogador, somenteLeitura: true }, 'padaria')
    } catch (e) {
      suporte = e
    }
    expect(suporte).toBeInstanceOf(SomenteLeituraError)
    const fechado = new ServicoDasProfissoes({
      ...p.deps,
      leituras: { jogador: async () => ({ posicao: 1, total: 8, blocos: [] }) },
    })
    await expect(fechado.iniciar(p.jogador, 'padaria')).rejects.toThrow()
    expect(p.chamadas).toHaveLength(0)
  })
})
