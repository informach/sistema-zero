import { awaitWithSignal } from '@sistemazero/core/http'
import {
  isStudioPortablePath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/project-environment'
import {
  assertStudioPythonActivityScope,
  type StudioPythonActivity,
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
  verifyStudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import activitySource from './activity-grader.py'
import { createPythonActivityConsoleMatcher } from './activityConsole'
import bridgeSource from './interpreter.py'
import type { PythonConsoleStream, PythonExecutionSnapshot } from './protocol'
import { hasTurtleExtension } from './turtle/contract'
import { loadTurtleModuleSources } from './turtle/moduleSources'

import { PYODIDE_VERSION, PYTHON_VERSION } from './versions'

export { PYODIDE_VERSION, PYTHON_VERSION } from './versions'

const PROJECT_ROOT = '/studio/project'

interface PythonCallable {
  (...args: unknown[]): unknown
  callPromising(...args: unknown[]): Promise<unknown>
  destroy(): void
}
interface ExecutionBridge {
  prepare: PythonCallable
  execute: PythonCallable
  evaluate: PythonCallable
  install_turtle: PythonCallable
  install_activity: PythonCallable
  grade_activity: PythonCallable
  destroy(): void
}
/** The pinned API subset used here; no private Pyodide fields or monkeypatches. */
interface PythonAPI {
  version: string
  FS: {
    mkdirTree(path: string): void
    writeFile(path: string, bytes: Uint8Array): void
    readFile(path: string): Uint8Array
  }
  runPython(source: string): unknown
  setStdout(writer: { write(bytes: Uint8Array): number; isatty: boolean }): void
  setStderr(writer: { write(bytes: Uint8Array): number; isatty: boolean }): void
}
interface PyodideModule {
  loadPyodide(options: {
    indexURL: string
    stdout(text: string): void
    stderr(text: string): void
  }): Promise<PythonAPI>
}

async function loadTurtleResources(base: URL, scope: AbortController) {
  const [protocol, sources]: [
    typeof import('./turtle/graphicsProtocol'),
    ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  ] = await awaitWithSignal(
    () =>
      Promise.all([
        import(/* @vite-ignore */ new URL('turtle-protocol.mjs', base).href),
        loadTurtleModuleSources(base, scope.signal),
      ]).catch((error: unknown) => {
        scope.abort(error)
        throw error
      }),
    scope.signal,
  )
  scope.signal.throwIfAborted()
  return { protocol, sources }
}

export interface PythonEvaluationResult {
  ok: boolean
  text: string
  traceback?: string
}

function readResult(raw: unknown): PythonEvaluationResult {
  if (typeof raw !== 'string' || raw.length > 160_000)
    throw new Error('O interpretador devolveu uma resposta inválida.')
  const result: unknown = JSON.parse(raw)
  if (
    !result ||
    typeof result !== 'object' ||
    !('ok' in result) ||
    typeof result.ok !== 'boolean' ||
    !('text' in result) ||
    typeof result.text !== 'string' ||
    result.text.length > 8000 ||
    ('traceback' in result &&
      (typeof result.traceback !== 'string' || result.traceback.length > 16000))
  )
    throw new Error('O interpretador devolveu uma resposta inválida.')
  return result as PythonEvaluationResult
}

/** Runs only inside a disposable, protected worker. CSP remains the security boundary. */
export async function createPythonInterpreter(options: {
  /** Captured by the trusted frame; absence preserves the explicit lazy internal path. */
  startupTurtle?: boolean
  onBootLine(stream: PythonConsoleStream, text: string): void
  write(stream: PythonConsoleStream, bytes: Uint8Array): number
  requestLine(): Promise<string>
  activityRequested?(): boolean
  onActivityResult?(feedback: StudioPythonActivityFeedback): void
  graphics?(
    request: string,
    images: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ): Promise<string>
}) {
  const base = new URL('./', import.meta.url)
  const resourceScope = new AbortController()
  let activityConsole: ReturnType<typeof createPythonActivityConsoleMatcher> | undefined
  // The distribution builder places this pinned module beside the worker.
  // Neither a project nor a message can supply this executable URL.
  const initialize = async () => {
    // The pinned asm module only exports its factory; importing it cannot start CPython.
    // loadPyodide remains the sole initializer and reuses this exact ESM URL.
    const [module]: [PyodideModule, unknown] = await Promise.all([
      import(/* @vite-ignore */ new URL('pyodide.mjs', base).href),
      import(/* @vite-ignore */ new URL('pyodide.asm.mjs', base).href),
    ])
    return module.loadPyodide({
      indexURL: base.href,
      stdout: (text) => options.onBootLine('stdout', text),
      stderr: (text) => options.onBootLine('stderr', text),
    })
  }
  const [runtime, prefetchedTurtle] = await Promise.all([
    initialize(),
    options.startupTurtle === true ? loadTurtleResources(base, resourceScope) : undefined,
  ]).catch((error: unknown) => {
    resourceScope.abort(error)
    throw error
  })
  // Install byte writers before any learner code. Batched handlers accumulate
  // an unbounded line inside Pyodide before our ring would see it.
  runtime.setStdout({
    write: (bytes) => {
      const consumed = options.write('stdout', bytes)
      activityConsole?.write(bytes.subarray(0, consumed))
      return consumed
    },
    isatty: false,
  })
  runtime.setStderr({ write: (bytes) => options.write('stderr', bytes), isatty: false })
  if (
    runtime.version !== PYODIDE_VERSION ||
    runtime.runPython('import platform; platform.python_version()') !== PYTHON_VERSION
  )
    throw new Error('A versão do interpretador difere da distribuição aprovada.')
  const bridge = runtime.runPython(bridgeSource) as ExecutionBridge
  const prepare = bridge.prepare
  const execute = bridge.execute
  const evaluate = bridge.evaluate
  const installTurtle = bridge.install_turtle
  const installActivity = bridge.install_activity
  const gradeActivity = bridge.grade_activity
  let prepared = false
  let running = false
  let started = false
  let disposed = false
  return {
    async prepare(
      snapshot: PythonExecutionSnapshot,
      rawActivity?: StudioPythonActivity,
    ): Promise<void> {
      if (disposed || prepared) throw new Error('O interpretador não pode receber outro snapshot.')
      const turtle = hasTurtleExtension(snapshot.configuration.extensions)
      if (options.startupTurtle !== undefined && options.startupTurtle !== turtle)
        throw new Error('A extensão Turtle difere da configuração inicial desta execução.')
      const activity =
        rawActivity === undefined ? undefined : StudioPythonActivitySchema.parse(rawActivity)
      if (activity) assertStudioPythonActivityScope(activity, snapshot.configuration)
      if (snapshot.configuration.python.dependencyLock.pythonVersion !== PYTHON_VERSION)
        throw new Error('O projeto pede outra versão de Python.')
      if (
        snapshot.configuration.python.dependencyLock.packages.length ||
        (snapshot.configuration.extensions.length &&
          (snapshot.configuration.extensions.length !== 1 ||
            !hasTurtleExtension(snapshot.configuration.extensions)))
      )
        throw new Error(
          'Os pacotes ou extensões deste projeto ainda não estão disponíveis neste executor.',
        )
      const paths = snapshot.files.map((file) => file.path)
      if (
        !isStudioPortablePath(snapshot.configuration.python.entrypoint) ||
        !paths.includes(snapshot.configuration.python.entrypoint) ||
        [...paths, ...snapshot.directories].some((path) => !isStudioPortablePath(path)) ||
        studioPortableFileConflict(paths, snapshot.directories)
      )
        throw new Error('A estrutura de arquivos do snapshot é inválida.')
      runtime.FS.mkdirTree(PROJECT_ROOT)
      for (const directory of snapshot.directories)
        runtime.FS.mkdirTree(`${PROJECT_ROOT}/${directory}`)
      for (const file of snapshot.files) {
        const path = `${PROJECT_ROOT}/${file.path}`
        runtime.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')))
        runtime.FS.writeFile(path, file.bytes)
      }
      prepare(PROJECT_ROOT, snapshot.configuration.python.entrypoint, options.requestLine)
      if (activity) {
        if (!options.activityRequested || !options.onActivityResult)
          throw new Error('O canal de correção da tarefa não está disponível.')
        activityConsole = createPythonActivityConsoleMatcher(activity)
        const requested = options.activityRequested
        const publish = options.onActivityResult
        installActivity(
          activitySource,
          JSON.stringify(activity),
          requested,
          (raw: unknown) => {
            if (typeof raw !== 'string' || raw.length > 150_000)
              throw new Error('O resultado da tarefa excede o limite.')
            publish(verifyStudioPythonActivityFeedback(JSON.parse(raw), activity))
          },
          (id: string) => activityConsole!.matches(id),
        )
      }
      if (turtle) {
        if (!options.graphics) throw new Error('O renderer Turtle não está disponível.')
        const { protocol, sources } =
          prefetchedTurtle ?? (await loadTurtleResources(base, resourceScope))
        resourceScope.signal.throwIfAborted()
        const { readTurtleGraphicsRequest, TURTLE_GRAPHICS_LIMITS } = protocol
        const directory = '/studio/extensions/python-turtle-1.0.0'
        runtime.FS.mkdirTree(directory)
        for (const [filename, bytes] of sources)
          runtime.FS.writeFile(`${directory}/${filename}`, bytes)
        installTurtle(directory, (raw: unknown) => {
          const request = readTurtleGraphicsRequest(raw)
          const images: { id: number; bytes: Uint8Array<ArrayBuffer> }[] = []
          let bytes = 0
          for (const operation of request.operations) {
            if (operation.op !== 'image') continue
            if (!operation.path.startsWith(`${PROJECT_ROOT}/`) || operation.path.includes('/../'))
              throw new Error('A imagem Turtle precisa estar dentro do projeto.')
            const source = runtime.FS.readFile(operation.path)
            bytes += source.byteLength
            if (source.byteLength > TURTLE_GRAPHICS_LIMITS.imageBytes || bytes > 32 * 1024 * 1024)
              throw new Error('As imagens Turtle excedem o limite de bytes.')
            images.push({ id: operation.id, bytes: new Uint8Array(source) })
          }
          return options.graphics!(JSON.stringify(request), images)
        })
      }
      prepared = true
    },
    async run(): Promise<PythonEvaluationResult> {
      if (disposed || !prepared || started || running)
        throw new Error('Esta execução já começou ou não está pronta.')
      started = running = true
      try {
        return readResult(await execute.callPromising())
      } finally {
        running = false
      }
    },
    async evaluate(source: string): Promise<PythonEvaluationResult> {
      if (disposed || !prepared || !started || running)
        throw new Error('O interpretador está ocupado ou não está pronto.')
      running = true
      try {
        return readResult(await evaluate.callPromising(source))
      } finally {
        running = false
      }
    },
    async checkActivity(): Promise<void> {
      if (disposed || !prepared || !started || running)
        throw new Error('Execute o projeto novamente antes de verificar a tarefa.')
      running = true
      try {
        await gradeActivity.callPromising()
      } finally {
        running = false
      }
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      resourceScope.abort(new Error('Esta execução Python foi encerrada.'))
      // The supervisor terminates a busy worker; never reenter suspended Python
      // merely to run cleanup. This path is for cooperative, idle shutdown.
      if (running) return
      prepare.destroy()
      execute.destroy()
      evaluate.destroy()
      installTurtle.destroy()
      installActivity.destroy()
      gradeActivity.destroy()
      bridge.destroy()
    },
  }
}
