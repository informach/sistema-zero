import { describe, expect, test } from 'bun:test'
import { ManifestoDeDesafiosSchema } from '../../../arquipelago-contracts/src/desafios'
import { AnaliseDosMembrosSchema } from '../../../arquipelago-contracts/src/membros'
import {
  ArquipelagoObjectivesService,
  type ObjetivoRecebido,
} from '../../src/application/arquipelago/arquipelago-objectives.service'
import { PlatformActionService } from '../../src/application/learning/platform-action.service'
import { SectionProgressionService } from '../../src/application/learning/section-progression.service'
import type { PythonProjectCheckerService } from '../../src/application/studio/python-project-checker.service'
import type { ProjectExecutionChecker } from '../../src/domain/ports/project-execution-checker.port'
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
 * C02 (30/10/2026): os quatro pacotes novos passam pela análise de verdade do Members (formato,
 * ambiente, régua de autoria, orçamento, blocos derivados). Só quem RODA é falso aqui: ele aprova
 * o gabarito e reprova o inicial, porque a prova da execução é a do executor real
 * (`packages/studio-runtime/tests/vale-texto-browser.test.ts`, `desafios-python-smoke.ts` e
 * `desafios-pro-smoke.ts`). Lidos PELO CAMINHO, como os outros testes de manifesto.
 */
const raiz = new URL('../../../../docs/desafios-do-jogo/', import.meta.url)
const PACOTES = [
  { arquivo: 'vale/vale-texto', linguagem: 'javascript', tipo: 'classic' },
  { arquivo: 'recife/recife-python', linguagem: 'python', tipo: 'classic' },
  { arquivo: 'pico/pico-python', linguagem: 'python', tipo: 'classic' },
  { arquivo: 'nuvens/nuvens-pro', linguagem: 'javascript', tipo: 'pro' },
] as const

function criar(gabarito: unknown) {
  const igual = (projeto: unknown) => JSON.stringify(projeto) === JSON.stringify(gabarito)
  const executados: string[] = []
  const executor: ProjectExecutionChecker = {
    async check(input) {
      executados.push(`${input.kind}:${input.templateId ?? ''}`)
      return { results: input.objectives.map((o) => ({ id: o.id, passed: igual(input.project) })) }
    },
  }
  const python: Pick<PythonProjectCheckerService, 'grade'> = {
    async grade(input) {
      await input.authorize(new AbortController().signal)
      executados.push('python')
      return {
        passed: igual(input.project),
        results: input.checks.map((check) => ({
          checkId: check.id,
          passed: igual(input.project),
          kind: 'execution' as const,
          verifiedBy: 'server' as const,
        })),
      }
    },
  }
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
    executor,
    undefined,
    { checker: python, bindings: { find: async () => null } },
  )
  return { servico: new ArquipelagoObjectivesService({ verificador }), executados }
}

describe('C02: análise do Members sobre os pacotes novos', () => {
  for (const pacote of PACOTES)
    for (const publico of ['', '-adulto'])
      test(`${pacote.arquivo}${publico}: sem problema, gabarito passa e inicial não`, async () => {
        const manifesto = ManifestoDeDesafiosSchema.parse(
          await Bun.file(new URL(`${pacote.arquivo}${publico}.manifesto.json`, raiz)).json(),
        )
        for (const d of manifesto.desafios) {
          const { servico, executados } = criar(d.conteudo.gabarito)
          const analise = await servico.analisar({
            audience: publico ? 'adult' : 'kids',
            projetoInicial: d.conteudo.projetoInicial,
            gabarito: d.conteudo.gabarito,
            objetivos: d.conteudo.objetivos as ObjetivoRecebido[],
          })
          expect(AnaliseDosMembrosSchema.parse(analise)).toEqual(analise)
          expect(analise.problemas).toEqual([])
          expect(analise.gabarito.every((r) => r.passou)).toBe(true)
          expect(analise.inicial.some((r) => r.passou)).toBe(false)
          expect(analise.blocosDesconhecidos).toEqual([])
          expect(analise.vista).toHaveLength(d.conteudo.objetivos.length)
          if (pacote.linguagem === 'python') {
            expect(analise.blocosDoGabarito).toEqual([])
            expect(executados).toEqual(['python', 'python'])
          } else if (pacote.tipo === 'pro') {
            expect(analise.blocosDoGabarito).toEqual([])
            expect(new Set(executados)).toEqual(new Set(['pro:vanilla-vite']))
          } else {
            // O texto da Ponte vira blocos: a análise deriva o que mudou do inicial ao gabarito.
            expect(analise.blocosDoGabarito.length).toBeGreaterThan(0)
            expect(new Set(executados)).toEqual(new Set(['classic:']))
          }
        }
      })
})
