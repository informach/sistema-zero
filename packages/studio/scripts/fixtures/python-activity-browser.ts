import { StudioRuntimeSelectionSchema } from '@sistemazero/core/studio/project-environment'
import {
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { createStudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { runPythonActivity } from '../../src/activity/python'
import { createStudioProjectDocument } from '../../src/core/projectFactory'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import type { PythonExecutionSnapshot } from '../../src/runtime/python/protocol'
import { createPythonRuntimeProvider } from '../../src/runtime/python/provider'
import { preparePythonFrameSession } from '../../src/runtime/python/session'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import type { StudioRuntimeSession } from '../../src/runtime/types'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'

const settings = await fetch('/configuration.json').then((response) => response.json())
const selection = StudioRuntimeSelectionSchema.parse(settings.selection)
const frameURL = new URL(settings.frameURL)
const hash = async (bytes: Uint8Array<ArrayBuffer>) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const scenarios = {
  console: {
    source: `import sys
assert 'turtle' not in sys.modules
print('Olá 🐢!', end='')
print('x' * 100000)
data = {'__proto__': {'safe': True}, 'constructor': 2, 'toString': 3}
K = 7
def ação(value):
    return value
def boolean():
    return True
def tuple_result():
    return (1, None)
async def add(a, b):
    import asyncio
    await asyncio.sleep(0)
    return a + b
print('activity-ready')
`,
    turtle: false,
    checks: [
      {
        id: 'stdout',
        label: 'Saída',
        kind: 'behavior',
        rule: { type: 'consoleContains', text: 'Olá 🐢!' },
      },
      {
        id: 'dict',
        label: 'Dicionário',
        kind: 'behavior',
        rule: {
          type: 'globalEquals',
          name: 'data',
          value: JSON.parse('{"__proto__":{"safe":true},"constructor":2,"toString":3}'),
        },
      },
      {
        id: 'echo',
        label: 'Argumentos',
        kind: 'testcase',
        functionName: 'ação',
        cases: [
          {
            args: [JSON.parse('{"__proto__":{"safe":true}}')],
            expected: JSON.parse('{"__proto__":{"safe":true}}'),
          },
        ],
      },
      {
        id: 'typed',
        label: 'Bool não é número',
        kind: 'testcase',
        functionName: 'boolean',
        cases: [{ args: [], expected: 1 }],
      },
      {
        id: 'tuple',
        label: 'Tupla',
        kind: 'testcase',
        functionName: 'tuple_result',
        cases: [{ args: [], expected: [1, null] }],
      },
      {
        id: 'async',
        label: 'Função async',
        kind: 'testcase',
        functionName: 'add',
        cases: [{ args: [2, 3], expected: 5 }],
      },
      {
        id: 'code',
        label: 'Asserção',
        kind: 'code',
        source: 'return ctx["globals"]["data"]["__proto__"]["safe"] is True',
      },
      {
        id: 'error',
        label: 'Erro limitado',
        kind: 'code',
        source: 'raise ValueError("🐢" * 4000)',
      },
      {
        id: 'kelvin',
        label: 'Nome normalizado',
        kind: 'behavior',
        rule: { type: 'globalEquals', name: 'K', value: 7 },
      },
      {
        id: 'triple',
        label: 'String multilinha',
        kind: 'code',
        source: 'text = """first\nsecond"""\nreturn text == "first\\nsecond"',
      },
      {
        id: 'continued',
        label: 'String continuada',
        kind: 'code',
        source: 'text = "first\\\nsecond"\nreturn text == "firstsecond"',
      },
    ],
  },
  turtle: {
    source: `import turtle
screen = turtle.Screen()
screen.setup(320, 240)
actor = turtle.Turtle()
actor.speed(0)
actor.forward(40)
actor.left(90)
actor.penup()
def move(distance):
    actor.forward(distance)
    return round(actor.ycor())
print('activity-ready', flush=True)
screen.mainloop()
`,
    turtle: true,
    checks: [
      // The test mutates position before the later behavior check is delivered.
      // Behavior must still reflect the observation point before any testcase.
      {
        id: 'move',
        label: 'Mover',
        kind: 'testcase',
        functionName: 'move',
        cases: [{ args: [10], expected: 10 }],
      },
      {
        id: 'position',
        label: 'Posição inicial',
        kind: 'behavior',
        rule: {
          type: 'turtleState',
          predicate: { property: 'position', expected: [40, 0], tolerance: 0.01 },
        },
      },
      {
        id: 'heading',
        label: 'Direção',
        kind: 'behavior',
        rule: { type: 'turtleState', predicate: { property: 'heading', expected: 90 } },
      },
      {
        id: 'pen',
        label: 'Caneta',
        kind: 'behavior',
        rule: { type: 'turtleState', predicate: { property: 'penDown', expected: false } },
      },
      {
        id: 'visible',
        label: 'Visível',
        kind: 'behavior',
        rule: { type: 'turtleState', predicate: { property: 'visible', expected: true } },
      },
      {
        id: 'code',
        label: 'Posição depois do teste',
        kind: 'code',
        source: 'return round(ctx["globals"]["actor"].ycor()) == 10',
      },
    ],
  },
  busy: {
    source: 'while True:\n    pass\n',
    turtle: false,
    checks: [{ id: 'code', label: 'Nunca responde', kind: 'code', source: 'return True' }],
  },
} as const

async function runCase(name: keyof typeof scenarios, stopPending = false) {
  const scenario = scenarios[name]
  const activity = StudioPythonActivitySchema.parse({
    version: 1,
    programmingLanguage: 'python',
    profileId: selection.profileId,
    instructions: '',
    checks: scenario.checks,
  })
  const bytes = new TextEncoder().encode(scenario.source)
  const configuration = {
    runtime: selection,
    extensions: scenario.turtle ? [{ id: 'python-turtle', version: '1.0.0' }] : [],
    python: {
      entrypoint: 'main.py',
      dependencyLock: {
        lockVersion: 1 as const,
        target: 'browser' as const,
        pythonVersion: '3.14.2',
        runtimeManifestSha256: selection.manifestSha256,
        requirementsSha256: await hash(new Uint8Array()),
        packages: [],
      },
    },
  }
  const metadata = {
    version: 1 as const,
    configuration,
    directories: [],
    files: [
      {
        path: 'main.py',
        kind: 'source' as const,
        sha256: await hash(bytes),
        byteLength: bytes.byteLength,
      },
    ],
  }
  const snapshot: PythonExecutionSnapshot = {
    version: 1,
    projectId: 'activity-proof',
    revision: await studioPythonExecutionRevision(metadata),
    configuration,
    directories: [],
    files: [{ path: 'main.py', kind: 'source', sha256: await hash(bytes), bytes }],
  }
  const identity = {
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: selection.manifestSha256,
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    writerEpoch: null,
  }
  const controller = new AbortController()
  const frame = document.createElement('iframe')
  frame.style.cssText = 'width:400px;height:300px'
  document.body.append(frame)
  let session: StudioRuntimeSession | undefined
  let stdout = '',
    stderr = '',
    state = 'preparing'
  const failures: string[] = []
  let feedback: StudioPythonActivityFeedback | undefined
  let capture: Awaited<ReturnType<NonNullable<StudioRuntimeSession['captureSnapshot']>>> | undefined
  let caught: string | undefined
  try {
    session = await preparePythonFrameSession({
      frame,
      frameURL,
      identity,
      snapshot,
      activity,
      signal: controller.signal,
    })
    session.subscribe((event) => {
      if (event.type === 'state') state = event.state
      if (event.type === 'console') {
        if (event.stream === 'stdout') stdout = (stdout + event.text).slice(-16000)
        else stderr = (stderr + event.text).slice(-16000)
      }
      if (event.type === 'failed' && failures.length < 20) failures.push(event.message)
    })
    await session.run()
    if (name !== 'busy') {
      const deadline = performance.now() + 15000
      while (!stdout.includes('activity-ready') && !failures.length && performance.now() < deadline)
        await delay(20)
      if (!stdout.includes('activity-ready'))
        throw new Error(`O programa não chegou ao ponto de observação: ${failures.join('; ')}`)
    }
    if (!session.checkPythonActivity) throw new Error('Sem capability de atividade.')
    const pending = session.checkPythonActivity()
    if (stopPending) {
      // Attach rejection handling before stop withdraws the generation.
      const outcome = pending.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      )
      await session.stop()
      const result = await outcome
      if (!('error' in result)) throw new Error('Uma atividade retirada devolveu aprovação.')
      caught = result.error instanceof Error ? result.error.message : String(result.error)
    } else feedback = await pending
    if (scenario.turtle) capture = await session.captureSnapshot?.()
  } catch (error) {
    caught = error instanceof Error ? error.message : String(error)
  } finally {
    controller.abort()
    await session?.dispose()
    frame.remove()
  }
  return {
    name,
    source: scenario.source,
    stopPending,
    identity,
    snapshot: metadata,
    activity,
    feedback,
    capture,
    stdout,
    stderr,
    failures,
    caught,
    state,
    framesRemaining: document.querySelectorAll('iframe').length,
  }
}

async function rendererWake() {
  const module = await import(/* @vite-ignore */ new URL('turtle-renderer.mjs', frameURL).href)
  const host = document.createElement('div')
  document.body.append(host)
  const renderer = module.createTurtleRenderer(host)
  const wait = () =>
    renderer.exchange(
      JSON.stringify({ version: 1, operations: [], query: { type: 'wait', timeoutMs: null } }),
      [],
    )
  try {
    renderer.requestCheckpoint()
    const before = JSON.parse(await wait())
    const pending = wait()
    await delay(50)
    renderer.requestCheckpoint()
    const during = JSON.parse(await pending)
    return { before, during }
  } finally {
    renderer.dispose()
    host.remove()
  }
}

const consumerSources = {
  console: "name = input('Nome: ')\nprint('Olá ' + name)\ndef echo(value):\n    return value\n",
  turtle:
    "import turtle\nname = input('Nome: ')\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nactor = turtle.Turtle()\nactor.speed(0)\nactor.penup()\nscore = 0\nclicked = False\ndef finish():\n    global score\n    actor.setx(45)\n    score = 1\n    print('timer-finished')\ndef key():\n    screen.ontimer(finish, 20)\ndef click(x, y):\n    global clicked\n    clicked = True\nscreen.onkey(key, 'space')\nscreen.onclick(click)\nscreen.listen()\nprint('Olá ' + name)\nscreen.mainloop()\n",
  update:
    "import turtle\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nactor = turtle.Turtle()\nactor.speed(0)\nactor.penup()\nscore = 0\ndef key():\n    global score\n    actor.setx(45)\n    score = 1\nscreen.onkey(key, 'space')\nscreen.listen()\nwhile True:\n    screen.update()\n",
  structural:
    "import turtle\nname = input('Nome: ')\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nwhile False:\n    pass\nprint('Olá ' + name)\n",
  invalid: 'return\n',
  cancel: 'while True:\n    pass\n',
} as const

async function runConsumerCase(name: keyof typeof consumerSources) {
  const release = settings.release
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: selection.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: selection.releaseId, manifestSha256: selection.manifestSha256 }],
      },
    ],
  })
  const source = consumerSources[name]
  const projectDocument = await createStudioProjectDocument(
    {
      id: `consumer-${name}`,
      name: 'Atividade Python',
      programmingLanguage: 'python',
      kind: 'pro',
    },
    { catalog, runtime: selection, releaseStatus: 'active' },
  )
  if (projectDocument.programmingLanguage !== 'python' || projectDocument.kind !== 'pro')
    throw new Error('Fixture incorreta.')
  projectDocument.tree = {
    'main.py': { kind: 'file', content: source },
    'requirements.txt': { kind: 'file', content: '' },
  }
  const graphics = ['turtle', 'update', 'structural'].includes(name)
  projectDocument.installedExtensions = graphics
    ? [{ id: 'python-turtle', version: '1.0.0', installedAt: 1 }]
    : []
  const project = await refinePythonProjectDocument(projectDocument)
  const activity = StudioPythonActivitySchema.parse({
    version: 1,
    programmingLanguage: 'python',
    profileId: selection.profileId,
    instructions: '',
    ...(name === 'turtle' || name === 'update'
      ? {
          recipe: {
            version: 1,
            observeMs: 250,
            keys: ['Space'],
            ...(name === 'turtle' ? { stdin: ['Lia'], clicks: [{ x: 0.25, y: 0.25 }] } : {}),
            requireGraphics: true,
          },
          checks: [
            {
              id: 'function',
              label: 'Função',
              kind: 'structure',
              rule: { type: 'definesFunction', name: 'key' },
            },
            {
              id: 'score',
              label: 'Pontuação',
              kind: 'behavior',
              rule: { type: 'globalEquals', name: 'score', value: 1 },
            },
            {
              id: 'position',
              label: 'Posição',
              kind: 'behavior',
              rule: { type: 'turtleState', predicate: { property: 'position', expected: [45, 0] } },
            },
            {
              id: 'callbacks',
              label: 'Callbacks completos',
              kind: 'code',
              source:
                'g = ctx["globals"]\nassert g["score"] == 1, repr({"score": g["score"], "incoming": g["screen"]._incoming, "bindings": list(g["screen"]._bindings), "timers": len(g["screen"]._timers)})\nreturn True',
            },
            ...(name === 'turtle'
              ? [
                  {
                    id: 'click',
                    label: 'Clique',
                    kind: 'behavior',
                    rule: { type: 'globalEquals', name: 'clicked', value: true },
                  },
                  {
                    id: 'stdout',
                    label: 'Temporizador',
                    kind: 'behavior',
                    rule: { type: 'consoleContains', text: 'timer-finished' },
                  },
                ]
              : []),
          ],
        }
      : name === 'structural'
        ? {
            recipe: { version: 1, observeMs: 250, stdin: ['Lia'], requireGraphics: true },
            checks: [{ id: 'loop', label: 'Laço', kind: 'structure', rule: { type: 'usesLoop' } }],
          }
        : name === 'invalid'
          ? {
              checks: [
                {
                  id: 'function',
                  label: 'Função',
                  kind: 'structure',
                  rule: { type: 'definesFunction', name: 'echo' },
                },
              ],
            }
          : name === 'cancel'
            ? {
                recipe: { version: 1, observeMs: 250 },
                checks: [{ id: 'never', label: 'Retirado', kind: 'code', source: 'return True' }],
              }
            : {
                recipe: { version: 1, observeMs: 250, stdin: ['Lia'] },
                checks: [
                  {
                    id: 'function',
                    label: 'Função',
                    kind: 'structure',
                    rule: { type: 'definesFunction', name: 'echo' },
                  },
                  {
                    id: 'stdout',
                    label: 'Saída',
                    kind: 'behavior',
                    rule: { type: 'consoleContains', text: 'Olá Lia' },
                  },
                  {
                    id: 'echo',
                    label: 'Dicionário',
                    kind: 'testcase',
                    functionName: 'echo',
                    cases: [
                      {
                        args: [JSON.parse('{"__proto__":{"safe":true}}')],
                        expected: JSON.parse('{"__proto__":{"safe":true}}'),
                      },
                    ],
                  },
                ],
              }),
  })
  const controller = new AbortController()
  let executionFrames = 0
  const authorizations: string[] = []
  const environment: StudioRuntimeEnvironment = {
    catalog,
    registry: createStudioRuntimeRegistry([
      {
        id: 'activity-browser',
        profileId: selection.profileId,
        programmingLanguage: 'python',
        kinds: ['classic', 'pro'],
        load: async () => {
          executionFrames++
          if (name === 'cancel')
            setTimeout(
              () => controller.abort(new DOMException('Prova retirada.', 'AbortError')),
              100,
            )
          return createPythonRuntimeProvider({
            id: 'activity-browser',
            allowedOrigins: [frameURL.origin],
            resolveFrame: async () => ({
              url: frameURL.href,
              runtimeManifestSha256: selection.manifestSha256,
            }),
          })
        },
      },
    ]),
    access: () => ({
      releaseStatus: 'active',
      hostOperations: [
        { capability: 'edit', state: 'available' },
        { capability: 'execute', state: 'available' },
      ],
      grantedCapabilities: ['edit', 'execute'],
      grantedExtensionIds: ['python-turtle'],
      curation: null,
    }),
    authorize: async ({ operation, signal }) => {
      signal.throwIfAborted()
      authorizations.push(operation)
    },
    resolvePythonAnalysis: async () => ({
      url: new URL('analysis.html', frameURL).href,
      allowedOrigins: [frameURL.origin],
    }),
  }
  let grade: Awaited<ReturnType<typeof runPythonActivity>> | undefined
  let caught: string | undefined
  try {
    grade = await runPythonActivity(project, activity, {
      environment,
      signal: controller.signal,
      assertCurrent() {},
    })
  } catch (error) {
    caught = error instanceof Error ? error.message : String(error)
  } finally {
    controller.abort()
  }
  return {
    name,
    source,
    project,
    activity,
    grade,
    caught,
    executionFrames,
    authorizations,
    framesRemaining: document.querySelectorAll('iframe').length,
  }
}

declare global {
  interface Window {
    studioPythonActivityProof: {
      runCase: typeof runCase
      rendererWake: typeof rendererWake
      runConsumerCase: typeof runConsumerCase
    }
  }
}
window.studioPythonActivityProof = { runCase, rendererWake, runConsumerCase }
