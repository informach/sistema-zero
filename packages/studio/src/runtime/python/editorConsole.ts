import type { PythonExecutionController, PythonExecutionView } from './controller'

/** An editor instance can address only its own mounted execution controller. */
export function createPythonEditorConsole() {
  let owner: PythonExecutionController | undefined
  let view: PythonExecutionView | null = null
  const listeners = new Set<() => void>()
  const publish = (next: PythonExecutionView | null) => {
    view = next
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        reportError(error)
      }
    }
  }
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    register(next: PythonExecutionController) {
      if (owner) throw new Error('Já existe um console Python nesta instância do estúdio.')
      owner = next
      const unsubscribe = next.subscribe(() => {
        if (owner === next) publish(next.getSnapshot())
      })
      publish(next.getSnapshot())
      return () => {
        unsubscribe()
        if (owner === next) {
          owner = undefined
          publish(null)
        }
      }
    },
    async evaluate(projectId: string, runId: string, source: string) {
      const current = owner,
        snapshot = current?.getSnapshot()
      if (
        !current ||
        snapshot?.status !== 'completed' ||
        snapshot.identity?.projectId !== projectId ||
        snapshot.identity.runId !== runId
      )
        throw new Error(
          'Execute o projeto e espere o programa terminar antes de usar o console Python.',
        )
      if (!source.trim() || source.length > 20_000)
        throw new Error('Digite até 20.000 caracteres de Python por comando.')
      const assertCurrent = () => {
        if (owner !== current || current.getSnapshot().identity?.runId !== runId)
          throw new DOMException('A execução foi substituída.', 'AbortError')
      }
      try {
        await current.evaluate(crypto.randomUUID(), source)
      } catch (error) {
        assertCurrent()
        throw error
      }
      assertCurrent()
    },
  }
}
export type PythonEditorConsole = ReturnType<typeof createPythonEditorConsole>
