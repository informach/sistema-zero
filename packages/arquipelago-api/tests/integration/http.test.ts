import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  BICHOS_DO_BOSQUE,
  CartasDoJogadorSchema,
  ConflitoDeSalvamentoSchema,
  type CurriculoDeBlocos,
  criarSalvamentoInicial,
  MORADOR_NOVO,
  NINHOS_DO_VALE,
  SalvamentoGuardadoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../../src/domain/membros.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'
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
let membros: PortaDosMembros | null
let desafios: DesafiosEmMemoria

const CURSO = '55555555-5555-4555-8555-555555555555'
const curriculo: CurriculoDeBlocos = {
  versao: 1,
  cursos: [
    {
      courseId: CURSO,
      titulo: 'Repetições',
      slug: 'repeticoes',
      posto: 'coder',
      papel: 'base2d',
      blocos: ['sz_js_repeat'],
    },
  ],
  catalogo: [],
}
const membrosComBlocos = (blocos: string[]): PortaDosMembros =>
  membrosDeMentira({
    lerJogador: async () => ({ posicao: 2, total: 8, blocos }),
    lerCurriculo: async () => curriculo,
  })

function montar(servirMapas = true) {
  app = createServer({
    logger: createLogger({ level: 'error' }),
    servico: new ServicoDoJogo(repo, politica, () => AGORA),
    cartas: new ServicoDasCartas(politica, new LeiturasDosMembros(membros)),
    equipe: new ServicoDaEquipe(
      desafios,
      membros,
      new LeiturasDosMembros(membros),
      new ConferenciaDoMapa(membros, createLogger({ level: 'error' })),
      () => AGORA,
    ),
    desafios: desafiosDesligados(politica),
    cliente: { dir, servirMapas },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new RepositorioEmMemoria()
  politica = { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() }
  membros = membrosComBlocos(['sz_js_if_else'])
  desafios = new DesafiosEmMemoria()
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
    await repo.somarTempo(PERFIL, '2026-10-27', 90, AGORA)
    const r = await chamar('GET', '/arquipelago/acesso', crianca())
    expect(r.json).toEqual({
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: 30,
      usadoHojeSegundos: 90,
      contabilizaTempo: true,
      somenteLeitura: false,
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
      contabilizaTempo: false,
      somenteLeitura: false,
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
        await chamar('POST', '/arquipelago/tempo/recuperar', headers, {
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
  // O vale como era até a V14, antes do filhote.
  const { filhote: _filhote, ...valeSemFilhote } = salvamento.vale
  const {
    nuvens: _nuvens,
    farol: _farol,
    clima: _clima,
    ilhasVisitadas: _visitas,
    chaves: _chaves,
    segredos: _segredos,
    mapa: _mapa,
    companhia: _companhia,
    ...semProgressoV16
  } = salvamento
  const ateV15 = {
    ...semProgressoV16,
    moradores: { capi: salvamento.moradores.capi, bento: salvamento.moradores.bento },
  }
  const valeAteV14 = { ...ateV15, percursos: {}, vale: valeSemFilhote }

  test('V10 migra na rota e a versão atual preserva as descobertas do Recife por revisão', async () => {
    const { recife: _, vale: _vale, pico: _pico, ...base } = ateV15
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: { ...base, versao: 10 },
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.recife).toEqual({
      bau: false,
      pagina: false,
      tesouro: false,
      corais: 0,
    })
    if (!lido.salvamento) throw new Error('A gravação V10 não devolveu o salvamento')
    const atual = {
      ...lido.salvamento!,
      recife: { bau: true, pagina: true, tesouro: true, corais: 0 },
    }
    const segunda = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: atual,
    })
    expect(segunda.status).toBe(200)
    const recebido = await chamar('GET', '/arquipelago/salvamento', crianca())
    expect(SalvamentoGuardadoSchema.parse(recebido.json).salvamento).toEqual(atual)
    const velha = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: { ...base, versao: 10 },
    })
    expect(velha.status).toBe(409)
  })

  test('V11 migra sem perder o Recife e a V12 guarda todas as descobertas do Vale', async () => {
    const { vale: _, pico: _pico, ...base } = ateV15
    const v11 = { ...base, versao: 11, recife: { bau: true, pagina: true, tesouro: true } }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v11,
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.vale).toEqual({
      pegadas: false,
      escavacao: 0,
      ninhos: [],
      filhote: null,
    })
    const atual = {
      ...lido.salvamento!,
      vale: { pegadas: true, escavacao: 3, ninhos: [...NINHOS_DO_VALE], filhote: null },
    }
    const segunda = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: atual,
    })
    expect(segunda.status).toBe(200)
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.salvamento).toEqual(atual)
    expect(relido.salvamento?.recife).toEqual({ ...v11.recife, corais: 0 })
  })

  test('V12 migra na rota e a V13 guarda os corais replantados do Recife', async () => {
    const { pico: _pico, ...semPico } = valeAteV14
    const v12 = {
      ...semPico,
      versao: 12,
      recife: { bau: true, pagina: false, tesouro: true },
    }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v12,
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.versao).toBe(21)
    expect(lido.salvamento?.recife).toEqual({ ...v12.recife, corais: 0 })
    const atual = { ...lido.salvamento!, recife: { ...v12.recife, corais: 15 } }
    const segunda = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: atual,
    })
    expect(segunda.status).toBe(200)
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.salvamento).toEqual(atual)
    const fora = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: relido.revisao,
      salvamento: { ...atual, recife: { ...atual.recife, corais: 16 } },
    })
    expect(fora.status).toBe(400)
  })

  test('V13 migra na rota e a V14 guarda a banda do Pico', async () => {
    const { pico: _pico, ...semPico } = valeAteV14
    const v13 = { ...semPico, versao: 13 }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v13,
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.versao).toBe(21)
    expect(lido.salvamento?.pico).toEqual({ banda: 0 })
    const atual = { ...lido.salvamento!, pico: { banda: 7 } }
    const segunda = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: atual,
    })
    expect(segunda.status).toBe(200)
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.salvamento).toEqual(atual)
    const fora = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: relido.revisao,
      salvamento: { ...atual, pico: { banda: 8 } },
    })
    expect(fora.status).toBe(400)
  })

  test('V14 migra na rota e a V15 guarda o filhote do Vale', async () => {
    const v14 = { ...valeAteV14, versao: 14 }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v14,
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.versao).toBe(21)
    expect(lido.salvamento?.vale.filhote).toBeNull()
    const filhote = {
      ovo: 3,
      aquecidoEm: '2026-10-29',
      nome: 'Tricê',
      comeuEm: '2026-10-29',
      carinhoEm: '2026-10-29',
      dias: 1,
    }
    const atual = { ...lido.salvamento!, vale: { ...lido.salvamento!.vale, filhote } }
    const segunda = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: lido.revisao,
      salvamento: atual,
    })
    expect(segunda.status).toBe(200)
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.salvamento).toEqual(atual)
    const fora = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: relido.revisao,
      salvamento: { ...atual, vale: { ...atual.vale, filhote: { ...filhote, ovo: 4 } } },
    })
    expect(fora.status).toBe(400)
  })

  test('recebe V4 como a atual, guarda o presente e recusa a revisão anterior sem apagar a entrega', async () => {
    const {
      presenteDosBichosEntregue: _,
      turnos: _t,
      lumis: _l,
      rotinas: _r,
      recife: _recife,
      vale: _vale,
      pico: _pico,
      ...anterior
    } = ateV15
    const v4 = { ...anterior, versao: 4, moradores: { capi: anterior.moradores.capi } }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v4,
    })
    expect(primeira.status).toBe(200)
    const migrado = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(migrado.salvamento).toMatchObject({ versao: 21, presenteDosBichosEntregue: false })
    if (!migrado.salvamento) throw new Error('A gravação V4 não devolveu o salvamento')
    const entregue = {
      ...migrado.salvamento,
      bichos: { achados: [...BICHOS_DO_BOSQUE], adotado: null },
      inventario: { salada: 1 },
      presenteDosBichosEntregue: true,
    }
    const gravado = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento: entregue,
    })
    expect(gravado.status).toBe(200)
    expect(SalvamentoGuardadoSchema.parse(gravado.json).salvamento).toEqual(entregue)
    const atrasado = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento: v4,
    })
    expect(atrasado.status).toBe(409)
    expect(ConflitoDeSalvamentoSchema.parse(atrasado.json).atual.salvamento).toEqual(entregue)
    const relido = await chamar('GET', '/arquipelago/salvamento', crianca())
    expect(SalvamentoGuardadoSchema.parse(relido.json).salvamento).toEqual(entregue)
  })

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
      salvamento: { ...salvamento, versao: 10, segredo: 'x' },
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

  test('salvamento acima de 64 KB é 413 e não apaga a versão guardada', async () => {
    expect(
      (await chamar('PUT', '/arquipelago/salvamento', crianca(), { revisaoBase: 0, salvamento }))
        .status,
    ).toBe(200)
    const antes = await chamar('GET', '/arquipelago/salvamento', crianca())
    const inventario = Object.fromEntries(
      Array.from({ length: 3000 }, (_, i) => [`item-com-nome-comprido-${i}`, 1]),
    )
    const r = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento: { ...salvamento, inventario },
    })
    expect(r.status).toBe(413)
    expect((await chamar('GET', '/arquipelago/salvamento', crianca())).json).toEqual(antes.json)
  })

  test('V14 preserva referências longas e V18 reabre conquistas, amizades e visitas', async () => {
    const aparencia = { origem: 'criacao' as const, id: 'á'.repeat(80) }
    const antiga = {
      ...valeAteV14,
      versao: 14,
      projetos: { geladeira: { ganhoEm: AGORA.toISOString(), aparencia, aparencias: [aparencia] } },
    }
    const primeira = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: antiga,
    })
    expect(primeira.status).toBe(200)
    const lido = SalvamentoGuardadoSchema.parse(primeira.json)
    expect(lido.salvamento?.projetos.geladeira).toEqual(antiga.projetos.geladeira)
    if (!lido.salvamento) throw new Error('A migração não devolveu o salvamento')
    const atual = {
      ...lido.salvamento,
      ilhasVisitadas: 255,
      moradores: {
        ...lido.salvamento.moradores,
        irie: {
          amizade: 200,
          conversaEm: '2026-10-29',
          presenteEm: null,
          pedido: { dia: '2026-10-29', id: 'milho-1', entregue: true },
        },
      },
      nuvens: { constelacoes: 63 },
      farol: { pagina: true, concluido: true, galeria: [] },
      clima: 'chuva' as const,
      percursos: {
        'nuvens-saltos': {
          estrelas: { chegada: true, tempo: true, vagalumes: true },
          melhorTempoMs: 45000,
        },
      },
    }
    expect(
      (
        await chamar('PUT', '/arquipelago/salvamento', crianca(), {
          revisaoBase: 1,
          salvamento: atual,
        })
      ).status,
    ).toBe(200)
    montar()
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.salvamento).toEqual(atual)
    expect(relido.revisao).toBe(2)
    const atrasado = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 1,
      salvamento: antiga,
    })
    expect(atrasado.status).toBe(409)
    expect(ConflitoDeSalvamentoSchema.parse(atrasado.json).atual.salvamento).toEqual(atual)
  })

  test('V17 migra na rota, preserva o histórico e não inventa visitas; V18 inválida não substitui', async () => {
    const {
      ilhasVisitadas: _visitas,
      chaves: _chaves,
      segredos: _segredos,
      mapa: _mapa,
      companhia: _companhia,
      ...anterior
    } = salvamento
    const { galeria: _galeria, ...farolDaV19 } = anterior.farol
    // A V17 não conhece o Nico (morador desde a V21).
    const { nico: _nico, ...moradoresDaV17 } = anterior.moradores
    const v17 = { ...anterior, farol: farolDaV19, moradores: moradoresDaV17, versao: 17 }
    const resposta = await chamar('PUT', '/arquipelago/salvamento', crianca(), {
      revisaoBase: 0,
      salvamento: v17,
    })
    expect(resposta.status).toBe(200)
    expect(SalvamentoGuardadoSchema.parse(resposta.json).salvamento).toEqual({
      ...v17,
      versao: 21,
      moradores: { ...v17.moradores, nico: { ...MORADOR_NOVO } },
      farol: { ...v17.farol, galeria: [] },
      ilhasVisitadas: 0,
      chaves: 0,
      segredos: 0,
      mapa: {},
      companhia: 'quarto',
    })
    for (const ilhasVisitadas of [-1, 256, 1.5, '3']) {
      expect(
        (
          await chamar('PUT', '/arquipelago/salvamento', crianca(), {
            revisaoBase: 1,
            salvamento: { ...salvamento, ilhasVisitadas },
          })
        ).status,
      ).toBe(400)
    }
    const relido = SalvamentoGuardadoSchema.parse(
      (await chamar('GET', '/arquipelago/salvamento', crianca())).json,
    )
    expect(relido.revisao).toBe(1)
    expect(relido.salvamento?.ilhasVisitadas).toBe(0)
  })

  test('guardado ilegível nunca vira "vazio"', async () => {
    repo.salvamentos.set(PERFIL, { revisao: 4, dados: { versao: 99 }, atualizadoEm: AGORA })
    const r = await chamar('GET', '/arquipelago/salvamento', crianca())
    expect(r.status).toBe(409)
    expect(r.json).toMatchObject({ error: { code: 'SALVAMENTO_ILEGIVEL' } })
  })

  test('suporte olhando não grava nem gasta tempo', async () => {
    const suporte = { ...crianca(), 'x-auth-impersonator-id': ADULTO }
    expect((await chamar('GET', '/arquipelago/acesso', suporte)).json).toMatchObject({
      contabilizaTempo: false,
      somenteLeitura: true,
    })
    const r = await chamar('PUT', '/arquipelago/salvamento', suporte, {
      revisaoBase: 0,
      salvamento,
    })
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ error: { code: 'SOMENTE_LEITURA' } })
    const t = await chamar('POST', '/arquipelago/tempo/recuperar', suporte, {
      segundos: 60,
      eventoId: randomUUID(),
      dia: '2026-10-27',
    })
    expect(t.json).toMatchObject({ usadoHojeSegundos: 0 })
  })
})

describe('tempo livre e limite da família', () => {
  test('uma aba antiga não continua registrando o tempo pelo relógio do aparelho', async () => {
    const resposta = await chamar('POST', '/arquipelago/tempo', crianca(), {
      eventoId: crypto.randomUUID(),
      segundos: 1,
      dia: '2026-10-26',
    })
    expect(resposta.status).toBe(410)
  })
  test('repetir um evento é seguro, mas mudar seus segundos é recusado', async () => {
    const eventoId = randomUUID()
    const pedido = { eventoId, segundos: 60, dia: '2026-10-27' }
    expect(
      (await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), pedido)).json,
    ).toMatchObject({
      usadoHojeSegundos: 60,
    })
    expect(
      (await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), pedido)).json,
    ).toMatchObject({
      usadoHojeSegundos: 60,
    })
    expect(
      (await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), { ...pedido, segundos: 61 }))
        .status,
    ).toBe(409)
  })

  test('evento recuperado no dia seguinte conta no dia em que foi jogado', async () => {
    const pedido = { eventoId: randomUUID(), segundos: 60, dia: '2026-10-26' }
    const resposta = await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), pedido)
    expect(resposta.json).toMatchObject({ usadoHojeSegundos: 0, acabou: false })
    expect(await repo.lerTempo(PERFIL, '2026-10-26')).toBe(60)
    expect(
      (
        await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), {
          ...pedido,
          dia: '2026-10-27',
        })
      ).status,
    ).toBe(409)
    const futuro = await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), {
      ...pedido,
      eventoId: randomUUID(),
      dia: '2026-10-28',
    })
    expect(futuro.status).toBe(200)
    expect(futuro.json).toMatchObject({ usadoHojeSegundos: 60 })
  })

  test('soma no dia e avisa quando acabou', async () => {
    repo.limites.set(CONTA, 10)
    for (let i = 0; i < 9; i++)
      await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), {
        segundos: 60,
        eventoId: randomUUID(),
        dia: '2026-10-27',
      })
    const r = await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), {
      segundos: 60,
      eventoId: randomUUID(),
      dia: '2026-10-27',
    })
    expect(r.json).toEqual({ usadoHojeSegundos: 600, limiteDiarioMinutos: 10, acabou: true })
    expect(
      (
        await chamar('POST', '/arquipelago/tempo/recuperar', crianca(), {
          segundos: 500,
          eventoId: randomUUID(),
          dia: '2026-10-27',
        })
      ).status,
    ).toBe(400)
  })

  test('responsável lê o padrão e muda (normalizado em passos de 5)', async () => {
    expect(
      (await chamar('GET', `/arquipelago/familia/limite?perfis=${PERFIL}`, responsavel)).json,
    ).toEqual({ limiteDiarioMinutos: 30, algumaCriancaVe: true })
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

  test('a leitura dos pais diz se alguma criança da conta vê o jogo', async () => {
    const ler = async (query: string) =>
      (await chamar('GET', `/arquipelago/familia/limite${query}`, responsavel)).json
    politica = { modo: 'lista', publicos: new Set(['kids']), lista: new Set([IRMAO]) }
    montar()
    expect(await ler(`?perfis=${PERFIL}`)).toEqual({
      limiteDiarioMinutos: 30,
      algumaCriancaVe: false,
    })
    expect(await ler(`?perfis=${PERFIL},${IRMAO.toUpperCase()}`)).toMatchObject({
      algumaCriancaVe: true,
    })
    // Sem perfis na conta, nenhuma criança vê.
    expect(await ler('')).toMatchObject({ algumaCriancaVe: false })
    expect(await ler('?perfis=')).toMatchObject({ algumaCriancaVe: false })
    politica = { modo: 'desligado', publicos: new Set(['kids']), lista: new Set([PERFIL]) }
    montar()
    expect(await ler(`?perfis=${PERFIL}`)).toMatchObject({ algumaCriancaVe: false })
    politica = { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() }
    montar()
    expect(await ler(`?perfis=${PERFIL}`)).toMatchObject({ algumaCriancaVe: true })
  })

  test('perfis fora do formato são recusados, e a criança não lê a família', async () => {
    const r = await chamar('GET', '/arquipelago/familia/limite?perfis=lixo', responsavel)
    expect(r.status).toBe(400)
    const crianca1 = await chamar('GET', `/arquipelago/familia/limite?perfis=${PERFIL}`, crianca())
    expect(crianca1.status).toBe(403)
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

describe('cartões dos Lumis', () => {
  test('os do jogo sempre; os de controle pelos blocos; os que faltam dizem onde aprender', async () => {
    const r = await chamar('GET', '/arquipelago/cartas', crianca())
    expect(r.status).toBe(200)
    const { cartas } = CartasDoJogadorSchema.parse(r.json)
    const por = (id: string) => cartas.find((c) => c.id === id)
    expect(por('regar')).toMatchObject({ conquistada: true, aprendaEm: [] })
    expect(por('se')).toMatchObject({ conquistada: true, aprendaEm: [] })
    expect(por('repetir')).toMatchObject({
      conquistada: false,
      aprendaEm: [{ courseId: CURSO, titulo: 'Repetições', slug: 'repeticoes', posto: 'coder' }],
    })
  })

  test('equipe vê todos os cartões', async () => {
    const r = await chamar('GET', '/arquipelago/cartas', {
      ...crianca(),
      'x-auth-user-role': 'staff',
    })
    const { cartas } = CartasDoJogadorSchema.parse(r.json)
    expect(cartas.every((c) => c.conquistada)).toBe(true)
  })

  test('sem Members configurado ou com ele fora: 424, nunca 5xx', async () => {
    membros = null
    montar()
    const r = await chamar('GET', '/arquipelago/cartas', crianca())
    expect(r.status).toBe(424)
    expect(r.json).toMatchObject({ error: { code: 'PLATAFORMA_INDISPONIVEL' } })
    membros = {
      ...membrosComBlocos([]),
      lerJogador: async () => {
        throw new MembrosIndisponiveisError('rede')
      },
    }
    montar()
    expect((await chamar('GET', '/arquipelago/cartas', crianca())).status).toBe(424)
  })

  test('jogo bloqueado para a pessoa: 403 como as outras rotas', async () => {
    politica = { modo: 'desligado', publicos: new Set(['kids']), lista: new Set() }
    montar()
    expect((await chamar('GET', '/arquipelago/cartas', crianca())).status).toBe(403)
  })
})

describe('cartões dos Lumis na comunidade adulta', () => {
  const CURSO_ADULTO = '66666666-6666-4666-8666-666666666666'
  const CURSO_KIDS = '77777777-7777-4777-8777-777777777777'
  const curso = (courseId: string, titulo: string, blocos: string[]) => ({
    courseId,
    titulo,
    slug: titulo.toLowerCase().replaceAll(' ', '-'),
    posto: 'coder',
    papel: 'base2d',
    blocos,
  })
  // Cada público tem o próprio currículo; `sz_js_while` só existe num curso Kids.
  const curriculos = {
    kids: {
      versao: 1,
      cursos: [curso(CURSO_KIDS, 'Laços Kids', ['sz_js_repeat', 'sz_js_while'])],
      catalogo: [],
    },
    adult: {
      versao: 1,
      cursos: [curso(CURSO_ADULTO, 'Laços adultos', ['sz_js_repeat'])],
      catalogo: [],
    },
  } satisfies Record<string, CurriculoDeBlocos>
  const adulto = {
    'x-internal-token': TOKEN,
    'x-auth-user-id': ADULTO,
    'x-auth-user-role': 'member',
    'x-auth-user-status': 'active',
  }
  let perguntas: unknown[]

  function comBlocosDoAdulto(blocos: string[]) {
    perguntas = []
    politica = { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() }
    membros = membrosDeMentira({
      // O Members só devolve blocos do público pedido (a régua mora lá, por `courses.audience`).
      lerJogador: async (pergunta) => {
        perguntas.push(pergunta)
        return {
          posicao: 2,
          total: 8,
          blocos: pergunta.audience === 'adult' ? blocos : ['sz_js_while'],
        }
      },
      lerCurriculo: async (publico) => {
        perguntas.push(publico)
        return curriculos[publico]
      },
    })
    montar()
  }

  async function cartasDoAdulto() {
    const r = await chamar('GET', '/arquipelago/cartas', adulto)
    expect(r.status).toBe(200)
    const { cartas } = CartasDoJogadorSchema.parse(r.json)
    return (id: string) => cartas.find((c) => c.id === id)
  }

  test('o adulto pergunta ao Members como adulto: a própria conta e o currículo adulto', async () => {
    comBlocosDoAdulto([])
    await cartasDoAdulto()
    expect(perguntas).toContainEqual({ userId: ADULTO, accountId: ADULTO, audience: 'adult' })
    expect(perguntas).toContain('adult')
    expect(perguntas).not.toContain('kids')
  })

  test('com o bloco de um curso adulto, o cartão está na mão', async () => {
    comBlocosDoAdulto(['sz_js_repeat'])
    const por = await cartasDoAdulto()
    expect(por('repetir')).toMatchObject({ conquistada: true, aprendaEm: [] })
    expect(por('regar')).toMatchObject({ conquistada: true, aprendaEm: [] })
  })

  test('sem o bloco, trancado com o curso adulto que ensina', async () => {
    comBlocosDoAdulto([])
    const por = await cartasDoAdulto()
    expect(por('repetir')).toMatchObject({
      conquistada: false,
      aprendaEm: [
        { courseId: CURSO_ADULTO, titulo: 'Laços adultos', slug: 'laços-adultos', posto: 'coder' },
      ],
    })
  })

  test('um bloco que só existe em curso Kids não conta nem é sugerido ao adulto', async () => {
    comBlocosDoAdulto([])
    const por = await cartasDoAdulto()
    // A criança da mentira tem `sz_js_while`; o adulto não, e nenhum curso adulto ensina.
    expect(por('enquanto')).toMatchObject({ conquistada: false, aprendaEm: [] })
    const kids = CartasDoJogadorSchema.parse(
      (await chamar('GET', '/arquipelago/cartas', crianca())).json,
    )
    expect(kids.cartas.find((c) => c.id === 'enquanto')).toMatchObject({ conquistada: true })
  })
})
