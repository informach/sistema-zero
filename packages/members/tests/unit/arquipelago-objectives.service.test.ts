import { describe, expect, test } from 'bun:test'
import {
  AnaliseDosMembrosSchema,
  VerificacaoDosMembrosSchema,
} from '../../../arquipelago-contracts/src/membros'
import {
  ArquipelagoObjectivesService,
  type ObjetivoRecebido,
  REQUISITANTE_DA_ANALISE,
} from '../../src/application/arquipelago/arquipelago-objectives.service'
import { PlatformActionService } from '../../src/application/learning/platform-action.service'
import { SectionProgressionService } from '../../src/application/learning/section-progression.service'
import {
  ProjectCheckBusyError,
  ProjectCheckUnavailableError,
  StudioProjectSyncingError,
} from '../../src/domain/learning/learning.errors'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckInput,
} from '../../src/domain/ports/project-execution-checker.port'
import {
  InMemoryAvatarRepository,
  InMemoryCertificateRepository,
  InMemoryProgressRepository,
  InMemoryQuizAttemptRepository,
  InMemoryRoomRepository,
  InMemoryStudioSubmissionRepository,
} from '../fakes/in-memory'
import { InMemoryLearningRepository } from '../fakes/learning-in-memory'
import { InMemoryProfilePreferencesRepository } from '../fakes/profile-preferences-in-memory'

/**
 * Os objetivos dos desafios do Arquipélago passam pelo MESMO verificador das aulas
 * (`SectionProgressionService.evaluateObjectives`, de verdade aqui); só o executor é falso.
 */

const bloco = (type: string, id: string, filho?: unknown) => ({
  type,
  id,
  ...(filho ? { next: { block: filho } } : {}),
})
/** Projeto clássico com os blocos na área Começo (`sz_frame_start`, moldura). */
const projeto = (blocos: { type: string }[], extra: Record<string, unknown> = {}) => {
  const encadeados = blocos.reduceRight<unknown>(
    (proximo, atual, i) => bloco(atual.type, `b${i}`, proximo),
    undefined,
  )
  return {
    formatVersion: 2,
    name: 'Desafio',
    files: {},
    ir: {
      version: 2,
      html: [],
      css: [],
      extensions: [],
      behavior: { molds: [], start: [], events: [], loops: [] },
    },
    blocksState: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            id: 'area',
            ...(encadeados ? { inputs: { CHILDREN: { block: encadeados } } } : {}),
          },
        ],
      },
    },
    ...extra,
  }
}
const REPETIR = { type: 'sz_js_repeat' }
const ESCREVER = { type: 'sz_js_console_log_value' }
const DESCONHECIDO = { type: 'sz_bloco_que_nao_existe' }

const inicial = projeto([ESCREVER])
const gabarito = projeto([ESCREVER, REPETIR, DESCONHECIDO])

const usaRepetir: ObjetivoRecebido = {
  id: 'repetir',
  label: 'Use o bloco repetir',
  hint: 'Procure na categoria Controle',
  rule: { type: 'usesBlock', blockType: 'sz_js_repeat' },
}
const anda: ObjetivoRecebido = {
  id: 'anda',
  label: 'Faça o herói andar',
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'ArrowRight' }],
    expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
  },
}
const extra: ObjetivoRecebido = {
  id: 'extra',
  label: 'Escreva no console duas vezes',
  optional: true,
  rule: { type: 'usesBlock', blockType: 'sz_js_console_log_value', count: 2 },
}

function executorFalso(resposta: (input: ProjectExecutionCheckInput) => boolean | Error) {
  const chamadas: ProjectExecutionCheckInput[] = []
  const executor: ProjectExecutionChecker = {
    async check(input) {
      chamadas.push(input)
      const passou = resposta(input)
      if (passou instanceof Error) throw passou
      return { results: input.objectives.map((o) => ({ id: o.id, passed: passou })) }
    },
  }
  return { executor, chamadas }
}

function criar(executor?: ProjectExecutionChecker) {
  const verificador = new SectionProgressionService(
    new InMemoryLearningRepository(),
    new InMemoryProgressRepository(),
    new InMemoryQuizAttemptRepository(),
    new InMemoryStudioSubmissionRepository(),
    () => new Date('2026-10-27T00:00:00Z'),
    new PlatformActionService(
      new InMemoryAvatarRepository(),
      new InMemoryRoomRepository(),
      new InMemoryProfilePreferencesRepository(),
    ),
    new InMemoryCertificateRepository(),
    undefined,
    undefined,
    undefined,
    executor,
  )
  return new ArquipelagoObjectivesService({ verificador })
}

const analisar = (
  servico: ArquipelagoObjectivesService,
  over: Partial<Parameters<ArquipelagoObjectivesService['analisar']>[0]> = {},
) =>
  servico.analisar({
    audience: 'kids',
    projetoInicial: inicial,
    gabarito,
    objetivos: [usaRepetir, anda, extra],
    ...over,
  })

const codigos = (analise: { problemas: { codigo: string }[] }) =>
  analise.problemas.map((p) => p.codigo)

describe('analisar', () => {
  test('blocos do gabarito sem moldura, sem os do inicial; desconhecidos à parte; vista sem regra', async () => {
    const { executor, chamadas } = executorFalso(() => true)
    const analise = await analisar(criar(executor))
    expect(AnaliseDosMembrosSchema.parse(analise)).toEqual(analise)
    // `sz_frame_start` é moldura e `sz_js_console_log_value` já vem no inicial.
    expect(analise.blocosDoGabarito).toEqual(['sz_js_repeat'])
    expect(analise.blocosDesconhecidos).toEqual(['sz_bloco_que_nao_existe'])
    expect(analise.vista).toEqual([
      {
        id: 'repetir',
        label: 'Use o bloco repetir',
        hint: 'Procure na categoria Controle',
        kind: 'block',
      },
      { id: 'anda', label: 'Faça o herói andar', kind: 'game' },
      { id: 'extra', label: 'Escreva no console duas vezes', optional: true, kind: 'block' },
    ])
    expect(JSON.stringify(analise.vista)).not.toContain('rule')
    expect(analise.problemas).toEqual([])
    expect(analise.gabarito).toEqual([
      { id: 'repetir', passou: true },
      { id: 'anda', passou: true },
      { id: 'extra', passou: false },
    ])
    expect(analise.inicial).toEqual([
      { id: 'repetir', passou: false },
      { id: 'anda', passou: true },
      { id: 'extra', passou: false },
    ])
    // Sem captura (o cache do executor vale), só os objetivos que rodam, tipo do inicial.
    expect(chamadas).toHaveLength(2)
    for (const chamada of chamadas) {
      expect(chamada.screenshots).toBeUndefined()
      expect(chamada.kind).toBe('classic')
      expect(chamada.requester).toBe(REQUISITANTE_DA_ANALISE)
      expect(chamada.objectives.map((o) => o.id)).toEqual(['anda'])
    }
  })

  test('objetivo obrigatório em que o gabarito não passa é problema; o extra não', async () => {
    const { executor } = executorFalso(() => false)
    const analise = await analisar(criar(executor))
    expect(analise.problemas).toEqual([
      {
        codigo: 'GABARITO_NAO_PASSA',
        mensagem:
          'O gabarito não cumpre o objetivo obrigatório "Faça o herói andar". Ajuste o gabarito ou o objetivo.',
        objetivoId: 'anda',
      },
    ])
  })

  test('executor fora: problema, os que rodam ficam passou false e a estrutura segue conferida', async () => {
    const { executor, chamadas } = executorFalso(() => new ProjectCheckUnavailableError())
    const analise = await analisar(criar(executor))
    expect(codigos(analise)).toEqual(['EXECUTOR_INDISPONIVEL'])
    expect(analise.gabarito).toEqual([
      { id: 'repetir', passou: true },
      { id: 'anda', passou: false },
      { id: 'extra', passou: false },
    ])
    expect(analise.inicial.find((r) => r.id === 'anda')?.passou).toBe(false)
    // Depois da primeira queda, o inicial não espera o executor de novo.
    expect(chamadas).toHaveLength(1)
    // Sem executor configurado, a mesma coisa (nunca uma aprovação inventada).
    const semExecutor = await analisar(criar())
    expect(codigos(semExecutor)).toEqual(['EXECUTOR_INDISPONIVEL'])
    expect(semExecutor.gabarito.find((r) => r.id === 'anda')?.passou).toBe(false)
  })

  test('executor ocupado vira problema próprio', async () => {
    const { executor } = executorFalso(() => new ProjectCheckBusyError())
    expect(codigos(await analisar(criar(executor)))).toEqual(['EXECUTOR_OCUPADO'])
  })

  test('Python e Pro são recusados como problema, sem rodar nada', async () => {
    const { executor, chamadas } = executorFalso(() => true)
    const servico = criar(executor)
    const python = await analisar(servico, {
      objetivos: [usaRepetir, { ...anda, programmingLanguage: 'python' }],
    })
    expect(python.problemas).toContainEqual(
      expect.objectContaining({ codigo: 'OBJETIVO_PYTHON', objetivoId: 'anda' }),
    )
    expect(python.gabarito).toEqual([])
    const pro = await analisar(servico, {
      projetoInicial: { kind: 'pro', proMeta: { templateId: 'x' }, tree: {} },
    })
    expect(codigos(pro)).toContain('PROJETO_PRO')
    expect(pro.gabarito).toEqual([])
    const sincronizando = await analisar(servico, {
      gabarito: { ...gabarito, bridgeCodeAhead: true },
    })
    expect(codigos(sincronizando)).toContain('PROJETO_SINCRONIZANDO')
    expect(chamadas).toHaveLength(0)
  })

  test('tetos do desafio, regra inválida, repetidos e sem obrigatório', async () => {
    const servico = criar(executorFalso(() => true).executor)
    const muitos = Array.from({ length: 21 }, (_, i) => ({ ...usaRepetir, id: `o${i}` }))
    const demais = await analisar(servico, { objetivos: muitos })
    expect(codigos(demais)).toContain('OBJETIVOS_DEMAIS')
    expect(demais.vista).toHaveLength(20)
    expect(AnaliseDosMembrosSchema.safeParse(demais).success).toBe(true)
    const rodam = Array.from({ length: 9 }, (_, i) => ({ ...anda, id: `r${i}` }))
    expect(codigos(await analisar(servico, { objetivos: rodam }))).toContain(
      'OBJETIVOS_QUE_RODAM_DEMAIS',
    )
    const invalido = await analisar(servico, {
      objetivos: [{ ...usaRepetir, rule: { type: 'naoExiste' } }],
    })
    expect(invalido.problemas).toContainEqual(
      expect.objectContaining({ codigo: 'OBJETIVO_INVALIDO', objetivoId: 'repetir' }),
    )
    // Bloco de extensão que o projeto inicial não instalou: a régua de autoria das aulas recusa.
    const foraDoEstudio = await analisar(servico, {
      objetivos: [
        { ...usaRepetir, rule: { type: 'usesBlock', blockType: 'sz_g2d_repeat_track_sprite' } },
      ],
    })
    expect(foraDoEstudio.problemas).toContainEqual(
      expect.objectContaining({ codigo: 'REGRA_INVALIDA', objetivoId: 'repetir' }),
    )
    expect(foraDoEstudio.gabarito).toEqual([])
    expect(codigos(await analisar(servico, { objetivos: [usaRepetir, usaRepetir] }))).toContain(
      'OBJETIVO_REPETIDO',
    )
    expect(codigos(await analisar(servico, { objetivos: [extra] }))).toEqual(['SEM_OBRIGATORIO'])
  })

  test('espera somada acima do teto do executor é problema', async () => {
    const longo: ObjetivoRecebido = {
      ...anda,
      rule: {
        type: 'behavior',
        steps: [{ action: 'wait', ms: 10_000 }],
        expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
      },
    }
    const objetivos = Array.from({ length: 5 }, (_, i) => ({ ...longo, id: `l${i}` }))
    const analise = await analisar(criar(executorFalso(() => true).executor), { objetivos })
    expect(codigos(analise)).toContain('ESPERA_DEMAIS')
  })
})

describe('verificar', () => {
  const verificar = (
    servico: ArquipelagoObjectivesService,
    over: Partial<Parameters<ArquipelagoObjectivesService['verificar']>[0]> = {},
  ) =>
    servico.verificar({
      requester: '7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f',
      audience: 'kids',
      objetivos: [usaRepetir, anda, extra],
      projetoInicial: inicial,
      projeto: gabarito,
      ...over,
    })

  test('passa com os obrigatórios; o extra não tranca; o limite do executor é de quem joga', async () => {
    const { executor, chamadas } = executorFalso(() => true)
    const resposta = await verificar(criar(executor))
    expect(VerificacaoDosMembrosSchema.parse(resposta)).toEqual(resposta)
    expect(resposta).toEqual({
      passou: true,
      resultados: [
        { id: 'repetir', passou: true },
        { id: 'anda', passou: true },
        { id: 'extra', passou: false },
      ],
    })
    expect(chamadas[0]?.requester).toBe('7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f')
    expect(chamadas[0]?.screenshots).toBeUndefined()
  })

  test('obrigatório que falha não passa; só extras nunca passa', async () => {
    const servico = criar(executorFalso(() => false).executor)
    expect((await verificar(servico)).passou).toBe(false)
    const soExtra = await verificar(servico, {
      objetivos: [extra],
      projeto: projeto([ESCREVER, ESCREVER]),
    })
    expect(soExtra).toEqual({ passou: false, resultados: [{ id: 'extra', passou: true }] })
  })

  test('executor fora sobe como erro (nunca aprova)', async () => {
    await expect(
      verificar(criar(executorFalso(() => new ProjectCheckUnavailableError()).executor)),
    ).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
    await expect(verificar(criar())).rejects.toBeInstanceOf(ProjectCheckUnavailableError)
    await expect(
      verificar(criar(executorFalso(() => new ProjectCheckBusyError()).executor)),
    ).rejects.toBeInstanceOf(ProjectCheckBusyError)
  })

  test('projeto sincronizando, de outro tipo, inválido ou objetivos Python são recusados', async () => {
    const servico = criar(executorFalso(() => true).executor)
    await expect(
      verificar(servico, { projeto: { ...gabarito, bridgeCodeAhead: true } }),
    ).rejects.toBeInstanceOf(StudioProjectSyncingError)
    await expect(
      verificar(servico, { projeto: { kind: 'pro', proMeta: { templateId: 'x' }, tree: {} } }),
    ).rejects.toThrow('Este projeto não é do tipo deste desafio.')
    await expect(verificar(servico, { projeto: { texto: 'x'.repeat(1_500_001) } })).rejects.toThrow(
      'Projeto inválido ou muito grande.',
    )
    await expect(
      verificar(servico, { objetivos: [{ ...anda, programmingLanguage: 'python' }] }),
    ).rejects.toThrow('Os desafios do jogo só conferem objetivos de blocos (JavaScript).')
    await expect(
      verificar(servico, { objetivos: [{ ...anda, rule: { type: 'naoExiste' } }] }),
    ).rejects.toThrow('Os objetivos do desafio têm valores inválidos.')
  })
})
