import { describe, expect, it } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import type { FreeStudioActor } from '../../src/application/studio/free-studio-access.service'
import { StudioStudentTestsService } from '../../src/application/studio/studio-student-tests.service'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import {
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
} from '../../src/domain/learning/learning.errors'
import type {
  ProjectExecutionChecker,
  ProjectExecutionCheckInput,
} from '../../src/domain/ports/project-execution-checker.port'

/** "Meus testes" no Pro (proposta aprovada em 20/11/2026): o serviço que leva os testes ao executor. */

const actor: FreeStudioActor = {
  audience: 'kids',
  userId: '00000000-0000-4000-8000-000000000002',
  accountId: '00000000-0000-4000-8000-000000000001',
  privileged: false,
  readOnly: false,
}

const project = {
  id: 'p1',
  name: 'Meu projeto',
  kind: 'pro',
  mode: 'code',
  files: { 'index.html': '', 'style.css': '', 'script.js': '' },
  tree: { 'src/main.js': { kind: 'file', content: 'document.body.textContent = "Oi"' } },
  proMeta: { templateId: 'vanilla-vite', devScript: 'dev' },
}

const recado = (id: string, waitMs = 0) => ({
  id,
  name: `Recado ${id}`,
  rule: {
    type: 'behavior',
    steps: waitMs ? [{ action: 'wait', ms: waitMs }] : [],
    expect: { target: { kind: 'text' }, compare: 'contains', value: 'Oi' },
  },
})

function setup(options: { denied?: boolean; checker?: ProjectExecutionChecker | null } = {}) {
  const purposes: string[] = []
  const calls: ProjectExecutionCheckInput[] = []
  const access = {
    async execute(_actor: FreeStudioActor, purpose?: string) {
      purposes.push(purpose ?? '')
      if (options.denied) throw new AccessDeniedError('Seu nível ainda não libera projetos Pro.')
      return { pro: true, modes: ['blocks' as const], blocks: null }
    },
  }
  const checker: ProjectExecutionChecker = options.checker ?? {
    async check(input) {
      calls.push(input)
      return {
        results: input.objectives.map((objective) => ({
          id: objective.id,
          passed: objective.id !== 'falha',
          ...(objective.id === 'falha' ? { detail: 'O texto não tem "Oi".' } : {}),
        })),
      }
    },
  }
  const service = new StudioStudentTestsService(access, options.checker === null ? null : checker)
  return { service, purposes, calls }
}

describe('StudioStudentTestsService', () => {
  it('confere o acesso ao Pro e roda os testes no executor, com quem pediu e o modelo do projeto', async () => {
    const { service, purposes, calls } = setup()
    const out = await service.run(actor, { project, tests: [recado('ok'), recado('falha')] })
    expect(purposes).toEqual(['existing-pro'])
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      requester: actor.userId,
      kind: 'pro',
      templateId: 'vanilla-vite',
    })
    expect(calls[0]?.objectives.map((objective) => objective.id)).toEqual(['ok', 'falha'])
    expect(out.results).toEqual([
      { id: 'ok', passed: true },
      { id: 'falha', passed: false, detail: 'O texto não tem "Oi".' },
    ])
  })

  it('roda um lote por pedido: mais de 8 testes ou de 40 segundos de espera é recusado', async () => {
    const { service, calls } = setup()
    await service.run(actor, {
      project,
      tests: Array.from({ length: 8 }, (_, i) => recado(`t${i}`)),
    })
    expect(calls).toHaveLength(1)
    await expect(
      service.run(actor, { project, tests: Array.from({ length: 9 }, (_, i) => recado(`n${i}`)) }),
    ).rejects.toThrow(ValidationError)
    await expect(
      service.run(actor, {
        project,
        tests: Array.from({ length: 5 }, (_, i) => recado(`l${i}`, 10_000)),
      }),
    ).rejects.toThrow(ValidationError)
    expect(calls).toHaveLength(1)
  })

  it('recusa sem acesso, projeto que não é Pro, teste fora dos limites do Pro e lista vazia', async () => {
    const negado = setup({ denied: true })
    await expect(negado.service.run(actor, { project, tests: [recado('a')] })).rejects.toThrow(
      AccessDeniedError,
    )
    const { service, calls } = setup()
    await expect(
      service.run(actor, { project: { ...project, kind: 'classic' }, tests: [recado('a')] }),
    ).rejects.toThrow(ValidationError)
    const variavel = {
      ...recado('v'),
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 1 },
      },
    }
    await expect(service.run(actor, { project, tests: [variavel] })).rejects.toThrow(
      ValidationError,
    )
    await expect(service.run(actor, { project, tests: [] })).rejects.toThrow(ValidationError)
    expect(calls).toHaveLength(0)
  })

  it('sem executor configurado, ou executor fora do ar, a criança lê que não deu para testar', async () => {
    await expect(
      setup({ checker: null }).service.run(actor, { project, tests: [recado('a')] }),
    ).rejects.toThrow(ProjectCheckUnavailableError)
  })

  it('a recusa do executor (o projeto não compila) volta como o motivo', async () => {
    const { service } = setup({
      checker: {
        async check() {
          throw new ProjectCheckRejectedError(
            'O projeto não compilou: falta uma chave em src/main.js.',
          )
        },
      },
    })
    await expect(service.run(actor, { project, tests: [recado('a')] })).rejects.toThrow(
      'O projeto não compilou: falta uma chave em src/main.js.',
    )
  })
})
