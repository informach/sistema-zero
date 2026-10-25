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
import {
  PYTHON_MISSION_OBSERVATION_LIMITS,
  readStudioPythonMissionProbe,
  type StudioPythonMissionObservation,
  type StudioPythonMissionProbe,
  verifyStudioPythonMissionObservation,
} from '@sistemazero/core/studio/python-mission-observation'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from '@sistemazero/core/studio/python-provided-modules-sz-audio'
import activitySource from './activity-grader.py'
import { createPythonActivityConsoleMatcher } from './activityConsole'
import audioSource from './audio/sz_audio/__init__.py'
import { type PythonCanvasExtension, pythonCanvasExtension } from './canvasExtension'
import bridgeSource from './interpreter.py'
import missionSource from './mission-observer.py'
import { PGZERO_EXTENSION } from './pgzero/contract'
import { loadPgzeroModuleSources } from './pgzero/moduleSources'
import type { PythonConsoleStream, PythonExecutionSnapshot, PythonGraphicsReply } from './protocol'
import { PYGAME_EXTENSION } from './pygame/contract'
import { loadPygameModuleSources } from './pygame/moduleSources'
import { createPygameScreen, installSdlWorkerGlobals, takeScreenPixels } from './pygame/sdlScreen'
import { RAYLIB_2D_EXTENSION } from './raylib/contract'
import { loadRaylibModuleSources } from './raylib/moduleSources'
import { isPythonSavedFile, isPythonSavedFilePath } from './savedFiles'
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
  install_pgzero: PythonCallable
  install_pygame: PythonCallable
  install_raylib: PythonCallable
  install_audio: PythonCallable
  install_saved_files: PythonCallable
  install_activity: PythonCallable
  grade_activity: PythonCallable
  install_mission: PythonCallable
  observe_mission: PythonCallable
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
  /** Pygame-ce only: the pinned wheel, extracted into the extension directory. */
  unpackArchive(buffer: ArrayBuffer, format: 'wheel', options: { extractDir: string }): void
  /** Pygame-ce only: the canvas SDL's video driver draws into (see pygame/sdlScreen.ts). */
  canvas: { setCanvas2D(canvas: object): void }
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

async function loadPgzeroResources(base: URL, scope: AbortController) {
  const [protocol, sources]: [
    typeof import('./pgzero/protocol'),
    ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  ] = await awaitWithSignal(
    () =>
      Promise.all([
        import(/* @vite-ignore */ new URL('pgzero-protocol.mjs', base).href),
        loadPgzeroModuleSources(base, scope.signal),
      ]).catch((error: unknown) => {
        scope.abort(error)
        throw error
      }),
    scope.signal,
  )
  scope.signal.throwIfAborted()
  return { protocol, sources }
}
/** pygame-ce draws; the Pygame Zero frame transport (_sz) carries its screen and sounds. */
async function loadPygameResources(base: URL, scope: AbortController) {
  const [canvas, pygame] = await awaitWithSignal(
    () =>
      Promise.all([
        loadPgzeroResources(base, scope),
        loadPygameModuleSources(base, scope.signal),
      ]).catch((error: unknown) => {
        scope.abort(error)
        throw error
      }),
    scope.signal,
  )
  scope.signal.throwIfAborted()
  return {
    ...canvas,
    // Pygame Zero's own small pygame package stays out: the wheel brings the real pygame-ce.
    sources: new Map([
      ...[...canvas.sources].filter(([filename]) => !filename.startsWith('pygame/')),
      ...pygame.sources,
    ]),
    wheel: pygame.wheel,
  }
}
async function loadRaylibResources(base: URL, scope: AbortController) {
  const [protocol, sources]: [
    typeof import('./raylib/protocol'),
    ReadonlyMap<string, Uint8Array<ArrayBuffer>>,
  ] = await awaitWithSignal(
    () =>
      Promise.all([
        import(/* @vite-ignore */ new URL('raylib-protocol.mjs', base).href),
        loadRaylibModuleSources(base, scope.signal),
      ]).catch((error: unknown) => {
        scope.abort(error)
        throw error
      }),
    scope.signal,
  )
  scope.signal.throwIfAborted()
  return { protocol, sources }
}
type ExtensionResources =
  | { kind: 'python-turtle'; value: Awaited<ReturnType<typeof loadTurtleResources>> }
  | { kind: 'python-pgzero'; value: Awaited<ReturnType<typeof loadPgzeroResources>> }
  | { kind: 'python-pygame'; value: Awaited<ReturnType<typeof loadPygameResources>> }
  | {
      kind: 'python-raylib-2d' | 'python-raylib-3d'
      value: Awaited<ReturnType<typeof loadRaylibResources>>
    }
function loadCanvasResources(kind: PythonCanvasExtension, base: URL, scope: AbortController) {
  switch (kind) {
    case 'python-turtle':
      return loadTurtleResources(base, scope).then(
        (value): ExtensionResources => ({ kind: 'python-turtle', value }),
      )
    case 'python-pgzero':
      return loadPgzeroResources(base, scope).then(
        (value): ExtensionResources => ({ kind: 'python-pgzero', value }),
      )
    case 'python-pygame':
      return loadPygameResources(base, scope).then(
        (value): ExtensionResources => ({ kind: 'python-pygame', value }),
      )
    default:
      return loadRaylibResources(base, scope).then((value): ExtensionResources => ({ kind, value }))
  }
}

/** Pixels of a project image for Pygame Zero's get_at, decoded inside the worker. */
async function decodeProjectImage(bytes: Uint8Array<ArrayBuffer>, path: string) {
  if (bytes.byteLength > 16 * 1024 * 1024) throw new Error('A imagem é grande demais para ler.')
  const type = /\.png$/i.test(path)
    ? 'image/png'
    : /\.gif$/i.test(path)
      ? 'image/gif'
      : /\.bmp$/i.test(path)
        ? 'image/bmp'
        : 'image/jpeg'
  const bitmap = await createImageBitmap(new Blob([bytes], { type }), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
    // pygame ignores EXIF rotation, and so does the renderer: the pixels must match its size.
    imageOrientation: 'none',
  })
  try {
    if (bitmap.width * bitmap.height > 16 * 1024 * 1024)
      throw new Error('A imagem é grande demais para ler os pixels.')
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Não foi possível ler os pixels da imagem.')
    context.drawImage(bitmap, 0, 0)
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  } finally {
    bitmap.close()
  }
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
  startupCanvas?: PythonCanvasExtension | null
  onBootLine(stream: PythonConsoleStream, text: string): void
  write(stream: PythonConsoleStream, bytes: Uint8Array): number
  requestLine(): Promise<string>
  activityRequested?(): boolean
  onActivityResult?(feedback: StudioPythonActivityFeedback): void
  onMissionResult?(observation: StudioPythonMissionObservation): void
  graphics?(
    request: string,
    images: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ): Promise<PythonGraphicsReply>
  audio?(request: string): Promise<string>
  /**
   * A file the program closed after writing it, kept with the project (savedFiles.ts), or
   * one it deleted (bytes null).
   */
  onSavedFile?(path: string, bytes: Uint8Array<ArrayBuffer> | null): void
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
  const [runtime, prefetchedCanvas] = await Promise.all([
    initialize(),
    options.startupCanvas
      ? loadCanvasResources(options.startupCanvas, base, resourceScope)
      : undefined,
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
  const installPgzero = bridge.install_pgzero
  const installPygame = bridge.install_pygame
  const installRaylib = bridge.install_raylib
  const installAudio = bridge.install_audio
  const installSavedFiles = bridge.install_saved_files
  const installActivity = bridge.install_activity
  const gradeActivity = bridge.grade_activity
  const installMission = bridge.install_mission
  const observeMission = bridge.observe_mission
  let missionEnabled = false
  let pendingMission: StudioPythonMissionProbe | undefined
  let prepared = false
  let running = false
  let started = false
  let disposed = false
  return {
    async prepare(
      snapshot: PythonExecutionSnapshot,
      rawActivity?: StudioPythonActivity,
      mission = false,
    ): Promise<void> {
      if (disposed || prepared) throw new Error('O interpretador não pode receber outro snapshot.')
      const canvas = pythonCanvasExtension(snapshot.configuration.extensions) ?? null
      if (options.startupCanvas !== undefined && (options.startupCanvas ?? null) !== canvas)
        throw new Error('A extensão de tela difere da configuração inicial desta execução.')
      const activity =
        rawActivity === undefined ? undefined : StudioPythonActivitySchema.parse(rawActivity)
      if (activity) assertStudioPythonActivityScope(activity, snapshot.configuration)
      if (snapshot.configuration.python.dependencyLock.pythonVersion !== PYTHON_VERSION)
        throw new Error('O projeto pede outra versão de Python.')
      if (
        snapshot.configuration.python.dependencyLock.packages.length ||
        snapshot.configuration.extensions.length > (canvas ? 1 : 0)
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
      // Files saved in earlier runs. A project file or folder with the same path wins.
      const savedSizes: Record<string, number> = {}
      for (const file of snapshot.saved ?? []) {
        const saved = Object.keys(savedSizes)
        if (studioPortableFileConflict([...paths, ...saved, file.path], snapshot.directories))
          continue
        const path = `${PROJECT_ROOT}/${file.path}`
        runtime.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')))
        runtime.FS.writeFile(path, file.bytes)
        savedSizes[file.path] = file.bytes.byteLength
      }
      prepare(PROJECT_ROOT, snapshot.configuration.python.entrypoint, options.requestLine)
      if (mission) {
        if (!options.onMissionResult) throw new Error('O canal da missão não está disponível.')
        installMission(
          missionSource,
          () => (pendingMission ? JSON.stringify(pendingMission) : ''),
          (raw: unknown) => {
            if (
              disposed ||
              !pendingMission ||
              typeof raw !== 'string' ||
              raw.length > PYTHON_MISSION_OBSERVATION_LIMITS.jsonChars
            )
              throw new Error('Observação Python fora da execução atual.')
            const result = verifyStudioPythonMissionObservation(JSON.parse(raw), pendingMission)
            pendingMission = undefined
            options.onMissionResult!(result)
          },
        )
        missionEnabled = true
      }
      if (options.onSavedFile) {
        const publish = options.onSavedFile
        installSavedFiles(
          PROJECT_ROOT,
          JSON.stringify(paths),
          JSON.stringify(savedSizes),
          (path: unknown, raw: unknown) => {
            // Python's None (a deleted file) arrives as undefined.
            if (raw === undefined || raw === null) {
              if (!isPythonSavedFilePath(path)) return false
              publish(path, null)
              return true
            }
            if (!(raw instanceof Uint8Array)) return false
            const bytes = new Uint8Array(raw)
            if (!isPythonSavedFile(path, bytes)) return false
            publish(path as string, bytes)
            return true
          },
          // Every folder of the project (empty ones and the ones holding files).
          JSON.stringify([
            ...new Set([
              ...snapshot.directories,
              ...paths.flatMap((path) =>
                path
                  .split('/')
                  .slice(0, -1)
                  .map((_, index, parts) => parts.slice(0, index + 1).join('/')),
              ),
            ]),
          ]),
        )
      }
      if (options.audio) {
        const directory = `/studio/media/python-audio-${SZ_AUDIO_MODULE_DESCRIPTOR.version}`
        runtime.FS.mkdirTree(`${directory}/sz_audio`)
        runtime.FS.writeFile(
          `${directory}/sz_audio/__init__.py`,
          new TextEncoder().encode(audioSource),
        )
        runtime.FS.writeFile(
          `${directory}/sz_audio/_module.json`,
          new TextEncoder().encode(JSON.stringify(SZ_AUDIO_MODULE_DESCRIPTOR)),
        )
        installAudio(directory, options.audio)
      }
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
      if (canvas) {
        if (!options.graphics) throw new Error('A tela gráfica do Python não está disponível.')
        const resources =
          prefetchedCanvas?.kind === canvas
            ? prefetchedCanvas
            : await loadCanvasResources(canvas, base, resourceScope)
        resourceScope.signal.throwIfAborted()
        if (resources.kind === 'python-turtle') {
          const { protocol, sources } = resources.value
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
        } else if (resources.kind === 'python-pgzero' || resources.kind === 'python-pygame') {
          const { protocol, sources } = resources.value
          const {
            readPgzeroFrameHeader,
            PGZERO_LIMITS,
            PGZERO_LIST_ATTACHMENT,
            PGZERO_FONT_ATTACHMENT_BASE,
            PGZERO_DEFAULT_FONT_ATTACHMENT,
            PGZERO_PIXELS_ATTACHMENT,
          } = protocol
          const pygame = resources.kind === 'python-pygame'
          const extension = pygame ? PYGAME_EXTENSION : PGZERO_EXTENSION
          const directory = `/studio/extensions/${extension.id}-${extension.version}`
          // Several packages live here (pgzero, its part of pygame or the pygame-ce bridge):
          // each file gets its folder.
          for (const [filename, bytes] of sources) {
            const target = `${directory}/${filename}`
            runtime.FS.mkdirTree(target.slice(0, target.lastIndexOf('/')))
            runtime.FS.writeFile(target, bytes)
          }
          let screen: ReturnType<typeof createPygameScreen> | undefined
          if (resources.kind === 'python-pygame') {
            const { wheel } = resources.value
            runtime.unpackArchive(
              wheel.buffer.slice(wheel.byteOffset, wheel.byteOffset + wheel.byteLength),
              'wheel',
              { extractDir: directory },
            )
            installSdlWorkerGlobals()
            screen = createPygameScreen()
            runtime.canvas.setCanvas2D(screen.canvas)
          }
          const inProject = (path: string) =>
            path.startsWith(`${PROJECT_ROOT}/`) && !path.split('/').includes('..')
          let sentFont = false
          const installCanvas = resources.kind === 'python-pygame' ? installPygame : installPgzero
          installCanvas(
            directory,
            (raw: unknown, payload: unknown) => {
              const header = readPgzeroFrameHeader(raw)
              const attachments: { id: number; bytes: Uint8Array<ArrayBuffer> }[] = []
              // Python hands over a Uint8Array copy (to_js), never a proxy to free here. That
              // copy owns its buffer, which is transferred as is: no third copy of the list.
              if (!header.keep) {
                if (
                  !(payload instanceof Uint8Array) ||
                  !(payload.buffer instanceof ArrayBuffer) ||
                  payload.byteLength > PGZERO_LIMITS.listBytes
                )
                  throw new Error('Quadro do Pygame Zero acima do limite.')
                attachments.push({
                  id: PGZERO_LIST_ATTACHMENT,
                  bytes:
                    payload.byteOffset === 0 && payload.byteLength === payload.buffer.byteLength
                      ? (payload as Uint8Array<ArrayBuffer>)
                      : new Uint8Array(payload),
                })
              }
              // pygame-ce renders its own text: the screen arrives as pixels.
              if (screen && !header.keep)
                attachments.push({
                  id: PGZERO_PIXELS_ATTACHMENT,
                  bytes: takeScreenPixels(screen, header.w, header.h),
                })
              if (!sentFont && !screen) {
                sentFont = true
                attachments.push({
                  id: PGZERO_DEFAULT_FONT_ATTACHMENT,
                  bytes: new Uint8Array(runtime.FS.readFile(`${directory}/freesansbold.ttf`)),
                })
              }
              // The draw list, images and fonts of one frame share one budget (Python keeps it).
              let total = header.keep ? 0 : (payload as Uint8Array).byteLength
              for (const [id, path] of header.images) {
                if (!inProject(path)) throw new Error('A imagem precisa estar dentro do projeto.')
                const source = runtime.FS.readFile(path)
                total += source.byteLength
                // _sz.present keeps each frame within this budget; more is a broken module.
                if (
                  source.byteLength > PGZERO_LIMITS.imageBytes ||
                  total > PGZERO_LIMITS.frameAttachmentBytes
                )
                  throw new Error('As imagens do jogo passaram do limite de bytes.')
                attachments.push({ id, bytes: new Uint8Array(source) })
              }
              for (const [id, path] of header.fonts) {
                if (!inProject(path)) throw new Error('A fonte precisa estar dentro do projeto.')
                const source = runtime.FS.readFile(path)
                total += source.byteLength
                if (
                  source.byteLength > PGZERO_LIMITS.fontBytes ||
                  total > PGZERO_LIMITS.frameAttachmentBytes
                )
                  throw new Error('A fonte é grande demais.')
                attachments.push({
                  id: PGZERO_FONT_ATTACHMENT_BASE + id,
                  bytes: new Uint8Array(source),
                })
              }
              // A reply with bytes (pixels) reaches Python as [text, bytes].
              return options.graphics!(raw as string, attachments).then((reply) =>
                typeof reply === 'string' ? reply : [reply.text, reply.bytes],
              )
            },
            (path: unknown) => {
              if (typeof path !== 'string' || !inProject(path))
                throw new Error('A imagem precisa estar dentro do projeto.')
              return decodeProjectImage(new Uint8Array(runtime.FS.readFile(path)), path)
            },
          )
        } else {
          const { protocol, sources } = resources.value
          const { readRaylibFrameHeader, RAYLIB_LIMITS, RAYLIB_FONT_ATTACHMENT_BASE } = protocol
          const directory = `/studio/extensions/python-raylib-${RAYLIB_2D_EXTENSION.version}`
          for (const filename of sources.keys())
            runtime.FS.mkdirTree(`${directory}/${filename.slice(0, filename.lastIndexOf('/'))}`)
          for (const [filename, bytes] of sources)
            runtime.FS.writeFile(`${directory}/${filename}`, bytes)
          const inProject = (path: string) =>
            path.startsWith(`${PROJECT_ROOT}/`) && !path.split('/').includes('..')
          const projectFile = (relative: string) => {
            const path = `${PROJECT_ROOT}/${relative}`
            if (!inProject(path)) throw new Error('O arquivo precisa estar dentro do projeto.')
            return runtime.FS.readFile(path)
          }
          installRaylib(
            directory,
            (raw: unknown, payload: unknown) => {
              const header = readRaylibFrameHeader(raw)
              if (
                !(payload instanceof Uint8Array) ||
                !(payload.buffer instanceof ArrayBuffer) ||
                payload.byteLength > RAYLIB_LIMITS.listBytes + RAYLIB_LIMITS.frameAttachmentBytes
              )
                throw new Error('Quadro do Raylib acima do limite.')
              // Python hands over a Uint8Array copy (to_js): its buffer is transferred as is.
              const attachments: { id: number; bytes: Uint8Array<ArrayBuffer> }[] = [
                {
                  id: 0,
                  bytes:
                    payload.byteOffset === 0 && payload.byteLength === payload.buffer.byteLength
                      ? (payload as Uint8Array<ArrayBuffer>)
                      : new Uint8Array(payload),
                },
              ]
              let total = payload.byteLength
              for (const entry of header.textures) {
                if (entry[1] !== 'f') continue
                const source = projectFile(entry[2])
                total += source.byteLength
                if (
                  source.byteLength > RAYLIB_LIMITS.fileBytes ||
                  total > RAYLIB_LIMITS.frameAttachmentBytes * 2
                )
                  throw new Error('As imagens do jogo passaram do limite de bytes.')
                attachments.push({ id: entry[0], bytes: new Uint8Array(source) })
              }
              for (const entry of header.fonts) {
                const source = projectFile(entry[1])
                total += source.byteLength
                if (
                  source.byteLength > 8 * 1024 * 1024 ||
                  total > RAYLIB_LIMITS.frameAttachmentBytes * 2
                )
                  throw new Error('A fonte é grande demais.')
                attachments.push({
                  id: RAYLIB_FONT_ATTACHMENT_BASE + entry[0],
                  bytes: new Uint8Array(source),
                })
              }
              return options.graphics!(raw as string, attachments).then((reply) =>
                typeof reply === 'string' ? reply : [reply.text, reply.bytes],
              )
            },
            (path: unknown) => {
              if (typeof path !== 'string' || !inProject(path))
                throw new Error('A imagem precisa estar dentro do projeto.')
              return decodeProjectImage(new Uint8Array(runtime.FS.readFile(path)), path)
            },
            resources.kind === 'python-raylib-3d' ? '3d' : '2d',
          )
        }
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
    get hasPendingMission() {
      return pendingMission !== undefined
    },
    requestMission(raw: unknown) {
      if (disposed || !prepared || !started || !missionEnabled || pendingMission)
        throw new Error('A missão não pode observar esta execução.')
      pendingMission = readStudioPythonMissionProbe(raw)
    },
    async flushMission() {
      if (disposed || !prepared || !started || !pendingMission || running)
        throw new Error('O interpretador não pode observar a missão agora.')
      running = true
      try {
        await observeMission.callPromising()
        if (pendingMission) throw new Error('A missão não relatou a observação solicitada.')
      } finally {
        running = false
      }
    },
    dispose(): void {
      if (disposed) return
      disposed = true
      pendingMission = undefined
      resourceScope.abort(new Error('Esta execução Python foi encerrada.'))
      // The supervisor terminates a busy worker; never reenter suspended Python
      // merely to run cleanup. This path is for cooperative, idle shutdown.
      if (running) return
      prepare.destroy()
      execute.destroy()
      evaluate.destroy()
      installTurtle.destroy()
      installRaylib.destroy()
      installPgzero.destroy()
      installPygame.destroy()
      installAudio.destroy()
      installSavedFiles.destroy()
      installActivity.destroy()
      gradeActivity.destroy()
      installMission.destroy()
      observeMission.destroy()
      bridge.destroy()
    },
  }
}
