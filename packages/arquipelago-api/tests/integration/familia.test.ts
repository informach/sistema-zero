import { beforeEach, describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  PERMISSOES_PADRAO,
  SemanaDaFamiliaSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDaFamilia } from '../../src/application/servico-da-familia'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { ModoDosDesafios } from '../../src/application/servico-dos-desafios'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import type { ConclusaoGuardada } from '../../src/domain/desafios.port'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../../src/domain/membros.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { FamiliaEmMemoria } from '../fakes/familia'
import { membrosDeMentira } from '../fakes/membros'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '33333333-3333-4333-8333-333333333333'
const DE_OUTRA = '55555555-5555-4555-8555-555555555555'
const CONTA = '22222222-2222-4222-8222-222222222222'
const OUTRA_CONTA = '66666666-6666-4666-8666-666666666666'
const AGORA = new Date('2026-10-28T15:00:00Z')

let repo: RepositorioEmMemoria
let familia: FamiliaEmMemoria
let politica: PoliticaDeAcesso
let modoDosDesafios: ModoDosDesafios
let membros: PortaDosMembros | null
let conclusoes: Map<string, Pick<ConclusaoGuardada, 'concluidoEm' | 'ilha'>[]>
let app: ReturnType<typeof createServer>

function montar() {
  const logger = createLogger({ level: 'error' })
  app = createServer({
    logger,
    servico: new ServicoDoJogo(repo, politica, () => AGORA),
    cartas: new ServicoDasCartas(politica, new LeiturasDosMembros(membros)),
    equipe: new ServicoDaEquipe(
      new DesafiosEmMemoria(),
      membros,
      new LeiturasDosMembros(membros),
      new ConferenciaDoMapa(membros, logger),
      () => AGORA,
    ),
    desafios: desafiosDesligados(politica),
    familia: new ServicoDaFamilia({
      familia,
      jogo: repo,
      desafios: {
        conclusoes: async (id) => (conclusoes.get(id) ?? []) as ConclusaoGuardada[],
      },
      politica,
      modoDosDesafios,
      leituras: new LeiturasDosMembros(membros),
      logger,
      agora: () => AGORA,
    }),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new RepositorioEmMemoria()
  familia = new FamiliaEmMemoria(repo)
  politica = { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() }
  modoDosDesafios = 'aberto'
  membros = membrosDeMentira({ lerJogador: async () => ({ posicao: 3, total: 8, blocos: [] }) })
  conclusoes = new Map()
  montar()
})

const crianca = (id: string, conta = CONTA) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': id,
  'x-auth-account-id': conta,
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
  return { status: r.status, json }
}

/** A criança abre o jogo e guarda (é o que liga ela à conta). */
async function jogar(id: string, conta = CONTA) {
  const salvamento = criarSalvamentoInicial(AGORA)
  const r = await chamar('PUT', '/arquipelago/salvamento', crianca(id, conta), {
    revisaoBase: 0,
    salvamento,
  })
  expect(r.status).toBe(200)
}

const semana = async (perfis: string) => {
  const r = await chamar('GET', `/arquipelago/familia/semana?perfis=${perfis}`, responsavel)
  expect(r.status).toBe(200)
  return SemanaDaFamiliaSchema.parse(r.json)
}

describe('a semana da família', () => {
  test('quem jogou nesta conta tem a semana; quem vê e não jogou fica em "ainda sem jogo"', async () => {
    await jogar(LIA)
    await repo.somarTempo(LIA, '2026-10-27', 1200, AGORA)
    await repo.somarTempo(LIA, '2026-10-28', 600, AGORA)
    await repo.somarTempo(LIA, '2026-10-20', 900, AGORA) // fora da janela
    conclusoes.set(LIA, [
      { concluidoEm: new Date('2026-10-26T15:00:00Z'), ilha: 'bosque' },
      { concluidoEm: new Date('2026-10-27T15:00:00Z'), ilha: 'vila-doce' },
    ])
    const s = await semana(`${LIA},${TOM}`)
    expect(s).toEqual({
      algumaCriancaVe: true,
      inicio: '2026-10-22',
      fim: '2026-10-28',
      limiteDiarioMinutos: 30,
      criancas: [
        {
          perfilId: LIA,
          desafios: { aprovados: 2, deIlhasAnteriores: 1 },
          objetos: { pinta: 0, molda: 0 },
          tempoLivre: { segundos: 1800, dias: 2 },
          // Members ligado e nenhuma sessão: zero, não `null`.
          voltaAoCurso: { dias: 0 },
        },
      ],
      aindaSemJogo: [TOM],
    })
  })

  test('criança de outra conta nunca entra, mesmo pedida pelo id', async () => {
    await jogar(DE_OUTRA, OUTRA_CONTA)
    await repo.somarTempo(DE_OUTRA, '2026-10-27', 1200, AGORA)
    const s = await semana(DE_OUTRA)
    expect(s.criancas).toEqual([])
    expect(s.aindaSemJogo).toEqual([DE_OUTRA])
  })

  test('jogo fechado para a família: nenhuma criança vê e nada é lido', async () => {
    await jogar(LIA)
    politica = { modo: 'lista', publicos: new Set(['kids']), lista: new Set([TOM]) }
    montar()
    const s = await semana(LIA)
    expect(s).toMatchObject({ algumaCriancaVe: false, criancas: [], aindaSemJogo: [] })
  })

  test('desafios desligados: sem número de desafios; Members fora: sem "ilhas anteriores"', async () => {
    await jogar(LIA)
    conclusoes.set(LIA, [{ concluidoEm: new Date('2026-10-26T15:00:00Z'), ilha: 'bosque' }])
    modoDosDesafios = 'desligado'
    montar()
    expect((await semana(LIA)).criancas[0]?.desafios).toBeNull()
    modoDosDesafios = 'aberto'
    membros = membrosDeMentira({
      lerJogador: async () => {
        throw new MembrosIndisponiveisError('rede')
      },
    })
    montar()
    expect((await semana(LIA)).criancas[0]?.desafios).toEqual({
      aprovados: 1,
      deIlhasAnteriores: null,
    })
    membros = null
    montar()
    expect((await semana(LIA)).criancas[0]?.desafios?.deIlhasAnteriores).toBeNull()
  })

  test('os objetos com aparência do Pinta e do Molda', async () => {
    await jogar(LIA)
    const linha = repo.salvamentos.get(LIA)
    if (!linha) throw new Error('sem salvamento')
    const dados = linha.dados as ReturnType<typeof criarSalvamentoInicial>
    repo.salvamentos.set(LIA, {
      ...linha,
      dados: {
        ...dados,
        projetos: {
          geladeira: {
            ganhoEm: AGORA.toISOString(),
            aparencia: { origem: 'pinta', id: 'p1' },
            aparencias: [{ origem: 'pinta', id: 'p1' }],
          },
          casinha: {
            ganhoEm: AGORA.toISOString(),
            aparencia: { origem: 'molda', id: 'm1' },
            aparencias: [{ origem: 'molda', id: 'm1' }],
          },
        },
      },
    })
    expect((await semana(LIA)).criancas[0]?.objetos).toEqual({ pinta: 1, molda: 1 })
  })

  test('só o responsável lê: a criança e perfis fora do formato recebem recusa', async () => {
    expect(
      (await chamar('GET', `/arquipelago/familia/semana?perfis=${LIA}`, crianca(LIA))).status,
    ).toBe(403)
    expect(
      (await chamar('GET', '/arquipelago/familia/semana?perfis=lixo', responsavel)).status,
    ).toBe(400)
  })
})

describe('as permissões de visita', () => {
  test('sem escolha guardada, o padrão restrito; o responsável muda e lê de volta', async () => {
    expect((await chamar('GET', '/arquipelago/familia/permissoes', responsavel)).json).toEqual(
      PERMISSOES_PADRAO,
    )
    const escolha = { visitasDeIrmaos: false, visitasDeOutrasCriancas: true, fotosNoClube: true }
    const r = await chamar('PUT', '/arquipelago/familia/permissoes', responsavel, escolha)
    expect(r).toEqual({ status: 200, json: escolha })
    expect((await chamar('GET', '/arquipelago/familia/permissoes', responsavel)).json).toEqual(
      escolha,
    )
  })

  test('corpo incompleto ou com chave a mais é recusado sem gravar', async () => {
    for (const corpo of [{ visitasDeIrmaos: false }, { ...PERMISSOES_PADRAO, chat: true }]) {
      expect(
        (await chamar('PUT', '/arquipelago/familia/permissoes', responsavel, corpo)).status,
      ).toBe(400)
    }
    expect(familia.permissoes.size).toBe(0)
  })

  test('a criança não lê nem muda; sessão de suporte só lê', async () => {
    expect((await chamar('GET', '/arquipelago/familia/permissoes', crianca(LIA))).status).toBe(403)
    expect(
      (await chamar('PUT', '/arquipelago/familia/permissoes', crianca(LIA), PERMISSOES_PADRAO))
        .status,
    ).toBe(403)
    const suporte = {
      ...responsavel,
      'x-auth-impersonator-id': '77777777-7777-4777-8777-777777777777',
    }
    expect((await chamar('GET', '/arquipelago/familia/permissoes', suporte)).status).toBe(200)
    expect(
      (await chamar('PUT', '/arquipelago/familia/permissoes', suporte, PERMISSOES_PADRAO)).status,
    ).toBe(403)
    expect(familia.permissoes.size).toBe(0)
  })
})

describe('a volta ao curso depois de jogar (29/10/2026)', () => {
  const sessoes = [
    new Date('2026-10-24T12:00:00Z'),
    new Date('2026-10-26T20:00:00Z'),
    new Date('2026-10-27T20:00:00Z'),
  ]

  test('conta os dias com aula concluída até 24 h depois de uma sessão, numa ida ao Members', async () => {
    await jogar(LIA)
    familia.sessoes.set(LIA, sessoes)
    const pedidos: unknown[] = []
    membros = membrosDeMentira({
      lerJogador: async () => ({ posicao: 3, total: 8, blocos: [] }),
      lerAulasConcluidas: async (pergunta) => {
        pedidos.push(pergunta)
        return {
          usuarios: [
            {
              userId: LIA,
              concluidasEm: [
                '2026-10-24T11:00:00.000Z', // antes da sessão daquele dia: não conta
                '2026-10-27T10:00:00.000Z', // depois da sessão de 26/10
                '2026-10-28T10:00:00.000Z', // depois da sessão de 27/10
              ],
            },
          ],
        }
      },
    })
    montar()
    const s = await semana(LIA)
    expect(s.criancas[0]?.voltaAoCurso).toEqual({ dias: 2 })
    expect(pedidos).toEqual([{ usuarios: [LIA], de: sessoes[0], ate: AGORA }])
  })

  test('Members fora ou desligado: a linha some (null) e o resto da semana fica', async () => {
    await jogar(LIA)
    familia.sessoes.set(LIA, sessoes)
    membros = membrosDeMentira({
      lerJogador: async () => ({ posicao: 3, total: 8, blocos: [] }),
      lerAulasConcluidas: async () => {
        throw new MembrosIndisponiveisError('rede')
      },
    })
    montar()
    const fora = (await semana(LIA)).criancas[0]
    expect(fora?.voltaAoCurso).toBeNull()
    expect(fora?.tempoLivre).toBeDefined()
    membros = null
    montar()
    expect((await semana(LIA)).criancas[0]?.voltaAoCurso).toBeNull()
  })
})
