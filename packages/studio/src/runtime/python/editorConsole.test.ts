import { expect, it } from 'bun:test'
import type { PythonExecutionController, PythonExecutionView } from './controller'
import { createPythonEditorConsole } from './editorConsole'

function execution(projectId: string) {
  let state = {
    status: 'completed',
    identity: { projectId, runId: 'first' },
  } as PythonExecutionView
  let evaluate = async () => {}
  const listeners = new Set<() => void>()
  const calls: string[] = []
  const controller = {
    getSnapshot: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    async evaluate(_id: string, source: string) {
      calls.push(source)
      await evaluate()
    },
  } as unknown as PythonExecutionController
  return {
    controller,
    calls,
    hold(value: () => Promise<void>) {
      evaluate = value
    },
    change(next: PythonExecutionView) {
      state = next
      for (const listener of listeners) listener()
    },
  }
}

it('keeps same-id editors isolated and refuses stale commands after restart or unregister', async () => {
  const first = execution('same'),
    second = execution('same')
  const a = createPythonEditorConsole(),
    b = createPythonEditorConsole()
  const detachA = a.register(first.controller),
    detachB = b.register(second.controller)
  expect(() => a.register(second.controller)).toThrow('Já existe')
  await a.evaluate('same', 'first', '1 + 1')
  expect(first.calls).toEqual(['1 + 1'])
  expect(second.calls).toEqual([])
  await expect(a.evaluate('other', 'first', 'x')).rejects.toThrow()
  first.change({
    status: 'completed',
    identity: { ...first.controller.getSnapshot().identity!, runId: 'second' },
  })
  await expect(a.evaluate('same', 'first', 'x')).rejects.toThrow()
  detachA()
  expect(a.getSnapshot()).toBeNull()
  await expect(a.evaluate('same', 'second', 'x')).rejects.toThrow()
  await b.evaluate('same', 'first', '2 + 2')
  expect(second.calls).toEqual(['2 + 2'])
  detachB()
})

it.each([
  'resolve',
  'reject',
] as const)('revokes a late %s when its execution is replaced', async (finish) => {
  const current = execution('project'),
    channel = createPythonEditorConsole()
  const release = channel.register(current.controller)
  const gate = Promise.withResolvers<void>()
  current.hold(() => gate.promise)
  const command = channel.evaluate('project', 'first', 'x').catch((error) => error)
  release()
  const replacement = execution('project')
  const detach = channel.register(replacement.controller)
  if (finish === 'resolve') gate.resolve()
  else gate.reject(new Error('old failure'))
  expect((await command).name).toBe('AbortError')
  expect(replacement.calls).toEqual([])
  detach()
})
