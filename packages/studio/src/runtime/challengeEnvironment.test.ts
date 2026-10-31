import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  StudioArquipelagoRuntimeDecisionSchema,
  type StudioArquipelagoRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { createArquipelagoChallengeRuntimeEnvironment } from './challengeEnvironment'

/** C02b (30/10/2026): o ambiente Python do Estúdio de desafio do Arquipélago. */
async function setup() {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const subject = studioRuntimeSubject(project)
  const userId = crypto.randomUUID()
  const context = {
    audience: 'kids' as const,
    desafioId: crypto.randomUUID(),
    revisao: 2,
    projectId: project.id,
  }
  const controller = new AbortController()
  const calls: StudioArquipelagoRuntimeRequest[] = []
  const decision = StudioArquipelagoRuntimeDecisionSchema.parse({
    version: 1,
    actor: { userId, accountId: crypto.randomUUID() },
    context: { kind: 'arquipelago', ...context },
    projectId: project.id,
    revision: await sha256Hex(canonicalJson(subject)),
    subjectSha256: await sha256Hex(canonicalJson(subject)),
    runtime: project.runtime,
    releaseStatus: 'active',
    operation: 'analyze',
    capabilities: ['edit'],
    grantedExtensionIds: [],
    catalog: environment.catalog,
    blockIds: [],
    curation: {},
    frame: {
      url: `https://runtime.test/v1/runtimes/${project.runtime.manifestSha256}/frame.html`,
      allowedOrigins: ['https://runtime.test'],
    },
    issuedAt: 100_000,
    expiresAt: 130_000,
  })
  let respond = async (input: StudioArquipelagoRuntimeRequest): Promise<unknown> => ({
    ...decision,
    operation: input.operation,
    capabilities: input.operation === 'analyze' ? ['edit'] : ['edit', 'execute', 'pause'],
  })
  const options = {
    project,
    userId,
    context,
    signal: controller.signal,
    clock: () => 0,
    request: async (input: StudioArquipelagoRuntimeRequest) => {
      calls.push(input)
      return respond(input)
    },
  }
  return {
    project,
    decision,
    options,
    calls,
    controller,
    respond: (next: typeof respond) => {
      respond = next
    },
  }
}

test('pede a decisão com o contexto do desafio; sem análise remota, exportação nem REPL', async () => {
  const f = await setup()
  const environment = await createArquipelagoChallengeRuntimeEnvironment(f.options)
  expect(f.calls).toHaveLength(1)
  expect(f.calls[0]).toMatchObject({
    operation: 'analyze',
    context: { kind: 'arquipelago', ...f.options.context },
    subject: studioRuntimeSubject(f.project),
  })
  expect(environment.createPythonLanguage).toBeUndefined()
  expect(environment.requestPythonAssistance).toBeUndefined()
  expect((await environment.resolvePythonAnalysis(f.project, f.controller.signal)).url).toContain(
    '/analysis.html',
  )
  await expect(
    environment.authorize?.({
      project: f.project,
      operation: 'python-repl',
      revision: f.decision.revision,
      signal: f.controller.signal,
    }),
  ).rejects.toThrow('terminal')
  await environment.authorize?.({
    project: f.project,
    operation: 'execute',
    revision: f.decision.revision,
    signal: f.controller.signal,
  })
  expect(f.calls.at(-1)?.operation).toBe('execute')
  expect(environment.access(f.project).grantedCapabilities).toEqual(['edit', 'execute', 'pause'])
})

test('recusa decisão de outro desafio, outra revisão, outro jogador ou capacidade a mais', async () => {
  for (const change of [
    (d: Decision) => ({ context: { ...d.context, desafioId: crypto.randomUUID() } }),
    (d: Decision) => ({ context: { ...d.context, revisao: 3 } }),
    () => ({ actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() } }),
    () => ({ capabilities: ['edit', 'export-source'] }),
  ]) {
    const f = await setup()
    f.respond(async () => ({ ...f.decision, ...change(f.decision) }))
    await expect(createArquipelagoChallengeRuntimeEnvironment(f.options)).rejects.toThrow()
  }
})

type Decision = Awaited<ReturnType<typeof setup>>['decision']
