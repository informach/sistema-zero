import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '../../packages/core/src/studio/runtime-catalog'
import type { StudioStudentTest } from '../../packages/core/src/studio/student-tests'
import { runPythonInvestigation } from '../../packages/studio/src/components/devtools/pythonInvestigation'
import type { PythonProjectDocument } from '../../packages/studio/src/core/editableProject'
import type { StudioRuntimeEnvironment } from '../../packages/studio/src/runtime/environment'
import {
  createPythonExecutionController,
  type PythonExecutionController,
} from '../../packages/studio/src/runtime/python/controller'
import { createStudioRuntimeRegistry } from '../../packages/studio/src/runtime/registry'
import type {
  StudioRuntimeEvent,
  StudioRuntimeInput,
  StudioRuntimePerformanceSlice,
  StudioRuntimeProvider,
} from '../../packages/studio/src/runtime/types'
import { refinePythonProjectDocument } from '../../packages/studio/src/state/pythonProjectValidation'
import { runPythonStudentTest } from '../../packages/studio/src/studentTests/pythonRunner'

export async function createControllerProbe(provider: StudioRuntimeProvider) {
  const distribution = await (await fetch('/distribution')).json()
  const release = StudioRuntimeReleaseSchema.parse(distribution.release)
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const registry = createStudioRuntimeRegistry([
    {
      id: provider.id,
      profileId: release.profileId,
      programmingLanguage: 'python',
      kinds: ['classic', 'pro'],
      load: async () => provider,
    },
  ])
  interface Entry {
    project: PythonProjectDocument
    allowed: boolean
    writerEpoch: number | null
    events: StudioRuntimeEvent[]
    controller: PythonExecutionController
    container: HTMLDivElement
    /** As fatias da aba Desempenho, quando a medida está ligada. */
    perf: StudioRuntimePerformanceSlice[]
    /** Quem encerra o laço da aba Investigar, quando ele está ligado. */
    investigation: (() => void) | null
    /** Quantas leituras o laço da aba Investigar entregou. */
    readings: number
  }
  const entries = new Map<string, Entry>()
  const get = (slot: string) => {
    const entry = entries.get(slot)
    if (!entry) throw new Error('slot')
    return entry
  }
  async function readFixture(fixture: string) {
    return refinePythonProjectDocument(
      await (await fetch(`/project/${encodeURIComponent(fixture)}`)).json(),
    )
  }
  /**
   * O ambiente da prova: concede a Turtle (as provas de sempre) e as extensões do projeto aberto
   * (o jogo de Pygame Zero das provas de Investigar e de Meus testes).
   */
  function environmentFor(
    allowed: () => boolean,
    project: () => PythonProjectDocument,
  ): StudioRuntimeEnvironment {
    return {
      catalog,
      registry,
      access: () => ({
        releaseStatus: 'active',
        grantedCapabilities: ['execute', 'python-repl'],
        grantedExtensionIds: allowed()
          ? [
              ...new Set([
                'python-turtle',
                ...project().installedExtensions.map((extension) => extension.id),
              ]),
            ]
          : [],
        hostOperations: [
          {
            capability: 'execute',
            state: allowed() ? 'available' : 'unavailable',
            ...(allowed() ? {} : { reasonCode: 'observer' }),
          },
        ],
        curation: null,
      }),
      resolvePythonAnalysis: async () => {
        throw new Error('Not part of this probe')
      },
    }
  }
  return {
    async create(slot: string, fixture: string, options: { observation?: boolean } = {}) {
      const previous = entries.get(slot)
      if (previous) {
        await previous.controller.dispose()
        previous.container.remove()
      }
      const project = await readFixture(fixture)
      const container = document.createElement('div')
      document.body.append(container)
      const environment = environmentFor(
        () => get(slot).allowed,
        () => get(slot).project,
      )
      const controller = createPythonExecutionController({
        instanceId: slot,
        project: () => get(slot).project,
        environment: () => environment,
        canExecute: () => get(slot).allowed,
        writerEpoch: () => get(slot).writerEpoch,
        // A aba Investigar do editor: cada Rodar no modo de observação.
        observation: () => options.observation === true,
        onEvent: (event) => {
          if (get(slot).events.length < 2048) get(slot).events.push(event)
        },
        mountFrame: () => {
          const frame = document.createElement('iframe')
          container.append(frame)
          return { frame, release: () => frame.remove() }
        },
      })
      entries.set(slot, {
        project,
        controller,
        container,
        allowed: true,
        writerEpoch: null,
        events: [],
        perf: [],
        investigation: null,
        readings: 0,
      })
    },
    run: (slot: string) => get(slot).controller.run(),
    stop: (slot: string) => get(slot).controller.stop(),
    capture: (slot: string) => get(slot).controller.capture(),
    observe: (slot: string, path: string) => get(slot).controller.observe({ type: 'value', path }),
    /** A aba Desempenho: liga (`true`) ou desliga a medida, sem recomeçar o programa. */
    measure: (slot: string, on: boolean) =>
      get(slot).controller.measurePerformance(on ? (slice) => get(slot).perf.push(slice) : null),
    /**
     * A aba Investigar: o MESMO laço do editor (`runPythonInvestigation`), lendo `names` a cada
     * meio segundo, com o programa rodando no modo de observação (`create(…, {observation})`).
     */
    investigate(slot: string, names: string[] | null) {
      const entry = get(slot)
      entry.investigation?.()
      entry.investigation = null
      if (!names) return
      entry.investigation = runPythonInvestigation({
        controller: entry.controller,
        names,
        draws: true,
        completed: false,
        receive: () => {
          entry.readings++
        },
        setSender: () => {},
      })
    },
    /** A aba Investigar: pausa (`true`) ou continua o programa na troca de quadro. */
    pause: (slot: string, on: boolean) => get(slot).controller.pause(on),
    /** A aba Investigar: avança 1 quadro com o programa pausado. */
    step: (slot: string) => get(slot).controller.step(),
    /** A aba Meus testes: a tecla do teste no programa, pelo quadro do Python. */
    pressKey: (slot: string, key: string, down: boolean) =>
      get(slot).controller.pressKey(key, down),
    /** A aba Meus testes: a função do programa chamada com os casos. */
    call: (slot: string, name: string, args: unknown[][]) =>
      get(slot).controller.observe({
        id: 'chamada',
        type: 'functionReturns',
        name,
        args: args as never,
      }),
    /** O executor inteiro da aba Meus testes, numa execução escondida só dele. */
    async studentTest(fixture: string, test: StudioStudentTest) {
      const project = await readFixture(fixture)
      if (project.kind !== 'classic') throw new Error('O teste da aba é do Python clássico.')
      const environment = environmentFor(
        () => true,
        () => project,
      )
      return runPythonStudentTest({
        test,
        host: {
          environment: () => environment,
          project: () => project,
          writerEpoch: () => null,
          canExecute: () => true,
        },
      })
    },
    input: (slot: string, requestId: string, response: StudioRuntimeInput) =>
      get(slot).controller.input(requestId, response),
    evaluate: (slot: string, requestId: string, source: string) =>
      get(slot).controller.evaluate(requestId, source),
    allow(slot: string, allowed: boolean) {
      get(slot).allowed = allowed
    },
    writer(slot: string, epoch: number | null) {
      get(slot).writerEpoch = epoch
    },
    async fixture(slot: string, fixture: string) {
      get(slot).project = await readFixture(fixture)
    },
    source(slot: string, source: string) {
      const entry = get(slot)
      const project = entry.project
      entry.project =
        project.kind === 'classic'
          ? { ...project, files: { ...project.files, [project.python.entrypoint]: source } }
          : {
              ...project,
              tree: {
                ...project.tree,
                [project.python.entrypoint]: { kind: 'file', content: source },
              },
            }
    },
    read(slot: string) {
      const entry = get(slot)
      const { project, ...view } = entry.controller.getSnapshot()
      return {
        ...view,
        current: project === entry.project,
        events: entry.events,
        perf: entry.perf,
        readings: entry.readings,
        frames: entry.container.querySelectorAll('iframe').length,
      }
    },
    async dispose(slot: string) {
      const entry = get(slot)
      entry.investigation?.()
      await entry.controller.dispose()
      entry.container.remove()
    },
  }
}
declare global {
  var pythonControllerProbe: Awaited<ReturnType<typeof createControllerProbe>>
}
