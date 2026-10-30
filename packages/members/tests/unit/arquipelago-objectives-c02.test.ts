import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { SectionPythonProjectCheck } from '@sistemazero/core/learning'
import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  AnaliseDosMembrosSchema,
  VerificacaoDosMembrosSchema,
} from '../../../arquipelago-contracts/src/membros'
import {
  ArquipelagoObjectivesService,
  CURADORIA_DO_DESAFIO_PYTHON,
  type ObjetivoRecebido,
  REQUISITANTE_DA_ANALISE,
} from '../../src/application/arquipelago/arquipelago-objectives.service'
import { PlatformActionService } from '../../src/application/learning/platform-action.service'
import { SectionProgressionService } from '../../src/application/learning/section-progression.service'
import type { PythonProjectCheckerService } from '../../src/application/studio/python-project-checker.service'
import { InvalidContentCommandError } from '../../src/domain/course/course.errors'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckInput,
} from '../../src/domain/ports/project-execution-checker.port'
import { ValidationError } from '../../src/domain/shared/errors'
import { StudioPythonProjectCheckUnavailableError } from '../../src/domain/studio/python-project-check.errors'
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
 * C02 (30/10/2026): os desafios do jogo aceitam Python clássico (o `PythonProjectCheckerService`
 * das aulas, aqui falso, atrás do `evaluatePythonObjectives` de verdade) e JavaScript Pro (o
 * executor recebe o modelo do projeto inicial). Python Pro continua recusado.
 */

const sha = (texto: string) => createHash('sha256').update(texto).digest('hex')
const RELEASE = 'a'.repeat(64)
function projetoPython(
  fonte: string,
  over: { release?: string; kind?: 'classic' | 'pro'; id?: string } = {},
) {
  const manifest = over.release ?? RELEASE
  const base = {
    formatVersion: 3,
    id: over.id ?? 'desafio-recife-python',
    name: 'Mira de bolhas',
    createdAt: 1,
    updatedAt: 1,
    programmingLanguage: 'python',
    runtime: { profileId: 'python-browser', releaseId: 'qa-1', manifestSha256: manifest },
    projectTools: [],
    installedExtensions: [{ id: 'python-pgzero', version: '1.0.0', installedAt: 1 }],
    assets: [],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1,
        target: 'browser',
        pythonVersion: '3.14.2',
        runtimeManifestSha256: manifest,
        requirementsSha256: sha(''),
        packages: [],
      },
    },
  }
  const projeto =
    over.kind === 'pro'
      ? {
          ...base,
          kind: 'pro',
          mode: 'code',
          ir: null,
          blocksState: null,
          proMeta: { templateId: 'python-blank' },
          tree: {
            'main.py': { kind: 'file', content: fonte },
            'requirements.txt': { kind: 'file', content: '' },
          },
        }
      : {
          ...base,
          kind: 'classic',
          mode: 'blocks',
          ir: null,
          blocksState: null,
          files: { 'main.py': fonte, 'requirements.txt': '' },
        }
  // A fixture é um documento que o próprio Estúdio aceitaria.
  expect(StudioProjectDocumentSchema.safeParse(projeto).success).toBe(true)
  return projeto
}
const inicialPy = projetoPython('pontos = 0\n')
const gabaritoPy = projetoPython('pontos = 0\ndef on_mouse_down(pos):\n    pass\n')

const acertar: ObjetivoRecebido = {
  id: 'acertar',
  label: 'Acertar a bolha soma um ponto',
  programmingLanguage: 'python',
  profileId: 'python-browser',
  rule: {
    type: 'behavior',
    steps: [{ action: 'click', x: 320, y: 400 }],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 1 },
  },
}
const reiniciar: ObjetivoRecebido = {
  id: 'reiniciar',
  label: 'R recomeça a rodada',
  optional: true,
  programmingLanguage: 'python',
  profileId: 'python-browser',
  stdin: [],
  rule: {
    type: 'behavior',
    steps: [{ action: 'press', key: 'r' }],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 0 },
  },
}

type Grade = PythonProjectCheckerService['grade']
function verificadorPythonFalso(resposta: (input: Parameters<Grade>[0]) => boolean | Error) {
  const chamadas: { input: Parameters<Grade>[0]; curadoria: StudioProjectCuration }[] = []
  const checker: Pick<PythonProjectCheckerService, 'grade'> = {
    async grade(input) {
      const curadoria = await input.authorize(new AbortController().signal)
      chamadas.push({ input, curadoria })
      const passou = resposta(input)
      if (passou instanceof Error) throw passou
      return {
        passed: passou,
        results: input.checks.map((check) => ({
          checkId: check.id,
          passed: passou,
          kind: 'execution' as const,
          verifiedBy: 'server' as const,
        })),
      }
    },
  }
  return { checker, chamadas }
}

function executorFalso() {
  const chamadas: ProjectExecutionCheckInput[] = []
  const executor: ProjectExecutionChecker = {
    async check(input) {
      chamadas.push(input)
      const fonte = JSON.stringify(input.project)
      return {
        results: input.objectives.map((o) => ({ id: o.id, passed: fonte.includes('PRONTO') })),
      }
    },
  }
  return { executor, chamadas }
}

function criar(
  opcoes: {
    python?: Pick<PythonProjectCheckerService, 'grade'>
    executor?: ProjectExecutionChecker
  } = {},
) {
  const verificador = new SectionProgressionService(
    new InMemoryLearningRepository(),
    new InMemoryProgressRepository(),
    new InMemoryQuizAttemptRepository(),
    new InMemoryStudioSubmissionRepository(),
    () => new Date('2026-10-30T00:00:00Z'),
    new PlatformActionService(
      new InMemoryAvatarRepository(),
      new InMemoryRoomRepository(),
      new InMemoryProfilePreferencesRepository(),
    ),
    new InMemoryCertificateRepository(),
    undefined,
    undefined,
    undefined,
    opcoes.executor,
    undefined,
    opcoes.python
      ? { checker: opcoes.python, bindings: { find: async () => null } }
      : undefined,
  )
  return new ArquipelagoObjectivesService({ verificador })
}

const codigos = (analise: { problemas: { codigo: string }[] }) =>
  analise.problemas.map((p) => p.codigo)
const passaNoGabarito = (input: Parameters<Grade>[0]) =>
  JSON.stringify(input.project).includes('on_mouse_down')

describe('Python clássico', () => {
  test('analisar roda gabarito e inicial no verificador Python das aulas, com a curadoria do desafio', async () => {
    const { checker, chamadas } = verificadorPythonFalso(passaNoGabarito)
    const analise = await criar({ python: checker }).analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar, reiniciar],
    })
    expect(AnaliseDosMembrosSchema.parse(analise)).toEqual(analise)
    expect(analise.problemas).toEqual([])
    expect(analise.gabarito).toEqual([
      { id: 'acertar', passou: true },
      { id: 'reiniciar', passou: true },
    ])
    expect(analise.inicial).toEqual([
      { id: 'acertar', passou: false },
      { id: 'reiniciar', passou: false },
    ])
    expect(analise.blocosDoGabarito).toEqual([])
    expect(analise.vista.map((v) => v.kind)).toEqual(['game', 'game'])
    expect(chamadas).toHaveLength(2)
    expect(chamadas.map((c) => c.curadoria)).toEqual([
      CURADORIA_DO_DESAFIO_PYTHON,
      CURADORIA_DO_DESAFIO_PYTHON,
    ])
    expect(chamadas[0]?.input.userId).toBe(REQUISITANTE_DA_ANALISE)
    // O perfil e as entradas atravessam inteiros até o verificador.
    const checks = chamadas[0]?.input.checks as SectionPythonProjectCheck[]
    expect(checks.map((c) => [c.programmingLanguage, c.profileId])).toEqual([
      ['python', 'python-browser'],
      ['python', 'python-browser'],
    ])
    expect(checks[1]?.stdin).toEqual([])
  })

  test('inicial que já cumpre, gabarito que falha, ambiente diferente e Python Pro são problemas', async () => {
    const { checker, chamadas } = verificadorPythonFalso(() => true)
    const servico = criar({ python: checker })
    const jaCumpre = await servico.analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(jaCumpre)).toEqual(['INICIAL_JA_CUMPRE_OBJETIVO'])
    const outraRelease = await servico.analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: projetoPython('x = 1\n', { release: 'b'.repeat(64) }),
      objetivos: [acertar],
    })
    expect(codigos(outraRelease)).toContain('GABARITO_DE_OUTRO_AMBIENTE')
    const pro = await servico.analisar({
      audience: 'kids',
      projetoInicial: projetoPython('x = 1\n', { kind: 'pro' }),
      gabarito: projetoPython('x = 1\n', { kind: 'pro' }),
      objetivos: [acertar],
    })
    expect(codigos(pro)).toContain('PROJETO_PYTHON_PRO')
    const quebrado = await servico.analisar({
      audience: 'kids',
      projetoInicial: { ...inicialPy, files: {} },
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(quebrado)).toContain('PROJETO_INICIAL_INVALIDO')
    const javascript = await servico.analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [{ id: 'js', label: 'Objetivo de blocos', rule: acertar.rule }],
    })
    expect(codigos(javascript)).toContain('AMBIENTE')
    const outroPerfil = await servico.analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [{ ...acertar, profileId: 'outro-perfil' }],
    })
    expect(codigos(outroPerfil)).toContain('AMBIENTE')
    // Só o primeiro caso chegou ao verificador (duas idas: gabarito e inicial).
    expect(chamadas).toHaveLength(2)
    const falha = await criar({ python: verificadorPythonFalso(() => false).checker }).analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(falha)).toEqual(['GABARITO_NAO_PASSA'])
  })

  test('verificador fora ou ambiente recusado viram problema, nunca aprovação', async () => {
    const fora = await criar({
      python: verificadorPythonFalso(() => new StudioPythonProjectCheckUnavailableError()).checker,
    }).analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(fora)).toEqual(['EXECUTOR_INDISPONIVEL'])
    expect(fora.gabarito).toEqual([{ id: 'acertar', passou: false }])
    const semConfiguracao = await criar().analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(semConfiguracao)).toEqual(['EXECUTOR_INDISPONIVEL'])
    const recusado = await criar({
      python: verificadorPythonFalso(
        () =>
          new InvalidContentCommandError(
            'O ambiente do projeto não pertence ao catálogo aprovado.',
          ),
      ).checker,
    }).analisar({
      audience: 'kids',
      projetoInicial: inicialPy,
      gabarito: gabaritoPy,
      objetivos: [acertar],
    })
    expect(codigos(recusado)).toEqual(['PYTHON_RECUSOU', 'PYTHON_RECUSOU'])
  })

  test('verificar passa com os obrigatórios e usa quem joga como dono da execução', async () => {
    const { checker, chamadas } = verificadorPythonFalso(passaNoGabarito)
    const servico = criar({ python: checker })
    const requester = '7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f'
    const resposta = await servico.verificar({
      requester,
      audience: 'kids',
      objetivos: [acertar, reiniciar],
      projetoInicial: inicialPy,
      projeto: { ...gabaritoPy, id: 'outro-id-local', mode: 'bridge' },
    })
    expect(VerificacaoDosMembrosSchema.parse(resposta)).toEqual(resposta)
    expect(resposta).toEqual({
      passou: true,
      resultados: [
        { id: 'acertar', passou: true },
        { id: 'reiniciar', passou: true },
      ],
    })
    expect(chamadas[0]?.input.userId).toBe(requester)
    expect(chamadas[0]?.curadoria).toEqual(CURADORIA_DO_DESAFIO_PYTHON)
    const naoPassa = await servico.verificar({
      requester,
      audience: 'kids',
      objetivos: [acertar, reiniciar],
      projetoInicial: inicialPy,
      projeto: inicialPy,
    })
    expect(naoPassa.passou).toBe(false)
  })

  test('verificar recusa outro ambiente, JavaScript, Python Pro e erros de política; o verificador fora sobe', async () => {
    const base = { requester: '7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f', audience: 'kids' as const }
    const servico = criar({ python: verificadorPythonFalso(() => true).checker })
    await expect(
      servico.verificar({
        ...base,
        objetivos: [acertar],
        projetoInicial: inicialPy,
        projeto: projetoPython('x = 1\n', { release: 'b'.repeat(64) }),
      }),
    ).rejects.toThrow('Este projeto não é do tipo deste desafio.')
    await expect(
      servico.verificar({
        ...base,
        objetivos: [acertar],
        projetoInicial: inicialPy,
        projeto: { kind: 'classic', files: {} },
      }),
    ).rejects.toThrow('Este projeto não é do tipo deste desafio.')
    await expect(
      servico.verificar({
        ...base,
        objetivos: [acertar],
        projetoInicial: projetoPython('x = 1\n', { kind: 'pro' }),
        projeto: projetoPython('x = 1\n', { kind: 'pro' }),
      }),
    ).rejects.toThrow('Os desafios do jogo não conferem projetos Python Pro.')
    const politica = criar({
      python: verificadorPythonFalso(
        () =>
          new InvalidContentCommandError(
            'O ambiente do projeto não pertence ao catálogo aprovado.',
          ),
      ).checker,
    })
    const recusa = politica.verificar({
      ...base,
      objetivos: [acertar],
      projetoInicial: inicialPy,
      projeto: gabaritoPy,
    })
    await expect(recusa).rejects.toBeInstanceOf(ValidationError)
    await expect(
      criar({
        python: verificadorPythonFalso(() => new StudioPythonProjectCheckUnavailableError())
          .checker,
      }).verificar({
        ...base,
        objetivos: [acertar],
        projetoInicial: inicialPy,
        projeto: gabaritoPy,
      }),
    ).rejects.toBeInstanceOf(StudioPythonProjectCheckUnavailableError)
    await expect(
      criar().verificar({
        ...base,
        objetivos: [acertar],
        projetoInicial: inicialPy,
        projeto: gabaritoPy,
      }),
    ).rejects.toBeInstanceOf(StudioPythonProjectCheckUnavailableError)
  })
})

describe('JavaScript Pro', () => {
  const pro = (fonte: string, templateId = 'vanilla-vite') => ({
    kind: 'pro',
    programmingLanguage: 'javascript',
    mode: 'code',
    proMeta: { templateId },
    tree: { 'src/regras.ts': { kind: 'file', content: fonte } },
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  })
  const construir: ObjetivoRecebido = {
    id: 'construir',
    label: 'Não construir em uma célula ocupada',
    rule: {
      type: 'functionReturns',
      name: 'podeConstruir',
      module: 'src/regras.ts',
      cases: [{ args: [[[1]], 0, 0], expected: false }],
    },
  }

  test('o executor recebe o tipo e o modelo do projeto inicial; sem blocos derivados', async () => {
    const { executor, chamadas } = executorFalso()
    const analise = await criar({ executor }).analisar({
      audience: 'kids',
      projetoInicial: pro('export function podeConstruir() { return true }'),
      gabarito: pro('// PRONTO\nexport function podeConstruir() { return false }'),
      objetivos: [construir],
    })
    expect(analise.problemas).toEqual([])
    expect(analise.blocosDoGabarito).toEqual([])
    expect(analise.gabarito).toEqual([{ id: 'construir', passou: true }])
    expect(analise.inicial).toEqual([{ id: 'construir', passou: false }])
    expect(chamadas.map((c) => [c.kind, c.templateId])).toEqual([
      ['pro', 'vanilla-vite'],
      ['pro', 'vanilla-vite'],
    ])
  })

  test('verificar aceita o Pro do mesmo modelo e recusa outro modelo ou outro tipo', async () => {
    const { executor, chamadas } = executorFalso()
    const servico = criar({ executor })
    const base = {
      requester: '7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f',
      audience: 'kids' as const,
      objetivos: [construir],
      projetoInicial: pro('export function podeConstruir() { return true }'),
    }
    const passou = await servico.verificar({ ...base, projeto: pro('// PRONTO') })
    expect(passou).toEqual({ passou: true, resultados: [{ id: 'construir', passou: true }] })
    expect(chamadas[0]?.templateId).toBe('vanilla-vite')
    await expect(
      servico.verificar({ ...base, projeto: pro('// PRONTO', 'three-ts') }),
    ).rejects.toThrow('Este projeto usa outro modelo Pro que o deste desafio.')
    await expect(
      servico.verificar({ ...base, projeto: { kind: 'classic', files: {} } }),
    ).rejects.toThrow('Este projeto não é do tipo deste desafio.')
    const outroModelo = await servico.analisar({
      audience: 'kids',
      projetoInicial: base.projetoInicial,
      gabarito: pro('// PRONTO', 'three-ts'),
      objetivos: [construir],
    })
    expect(codigos(outroModelo)).toContain('GABARITO_DE_OUTRO_AMBIENTE')
  })
})
