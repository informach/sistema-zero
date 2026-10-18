import { expect, spyOn, test } from 'bun:test'
import { awaitWithSignal } from '@sistemazero/core/http'
import { StudioPythonActivitySchema } from '@sistemazero/core/studio/python-activity'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { runPythonActivity } from './python'

// Real runner and analysis-session bootstrap; no interpreter is served by this DOM fixture.
test.each([
  'request',
  'environment',
] as const)('withdrawal through %s removes the owned analysis frame synchronously, before the owner rejects', async (lifetime) => {
  const { project, environment } = await pythonEnvironmentFixture('pro')
  const controller = new AbortController()
  const deadline = AbortSignal.timeout(1500)
  let beforeWithdrawal: number | undefined, afterWithdrawal: number | undefined
  const withdraw = () => {
    const frames = document.querySelectorAll('iframe')
    if (!frames.length || controller.signal.aborted) return
    beforeWithdrawal = frames.length
    controller.abort(new DOMException('Atividade retirada.', 'AbortError'))
    afterWithdrawal = document.querySelectorAll('iframe').length
  }
  const append = document.body.append.bind(document.body)
  // Happy DOM keeps its mutation-listener callback only through WeakRef. Trigger the
  // withdrawal from the actual frame mount, in the post-append microtask where the
  // runner has registered ownership, instead of depending on that GC-sensitive observer.
  const mounting = spyOn(document.body, 'append').mockImplementation((...nodes) => {
    append(...nodes)
    if (nodes.some((node) => typeof node !== 'string' && node.nodeName === 'IFRAME'))
      queueMicrotask(withdraw)
  })
  const signal = AbortSignal.any([controller.signal, deadline])
  try {
    const pending = awaitWithSignal(
      () =>
        runPythonActivity(
          project,
          StudioPythonActivitySchema.parse({
            version: 1,
            programmingLanguage: 'python',
            profileId: project.runtime.profileId,
            instructions: 'Repita',
            passingScore: 100,
            checks: [
              { id: 'loop', label: 'Repita', kind: 'structure', rule: { type: 'usesLoop' } },
            ],
          }),
          {
            environment: {
              ...environment,
              signal: lifetime === 'environment' ? signal : undefined,
              resolvePythonAnalysis: async () => {
                // Reproduce the collection that previously lost the observer's callback.
                Bun.gc(true)
                return {
                  url: 'https://analysis.test/analysis.html',
                  allowedOrigins: ['https://analysis.test'],
                }
              },
            },
            signal: lifetime === 'request' ? signal : deadline,
            assertCurrent() {},
          },
        ),
      signal,
    )
    await expect(pending).rejects.toThrow('Atividade retirada.')
    expect(beforeWithdrawal).toBe(1)
    expect(afterWithdrawal).toBe(0)
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  } finally {
    controller.abort()
    mounting.mockRestore()
  }
})
