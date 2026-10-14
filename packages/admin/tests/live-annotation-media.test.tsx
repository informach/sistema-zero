import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveRoomView } from '@sistemazero/core/live'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/**
 * A demonstração da professora passa pelo compositor do desenho (member-shell, `useLiveMedia`):
 * o que vai para a sala é a trilha COMPOSTA, e parar (pelo botão ou pelo navegador) solta o
 * compositor junto. O transporte, a captura da aba e o compositor são falsos e anotam o que o
 * hook fez com eles.
 */

class FakeTrack {
  stopped = false
  private listeners = new Map<string, Set<() => void>>()
  constructor(
    readonly kind: 'video' | 'audio',
    readonly label: string,
  ) {}
  stop() {
    this.stopped = true
  }
  getSettings() {
    return { width: 1600, height: 1000 }
  }
  addEventListener(type: string, listener: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(listener)
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }
}
/** Herda de `MediaStream` porque o `<video>` do happy-dom recusa outro `srcObject`. */
const streamOf = (...tracks: FakeTrack[]) =>
  Object.assign(Object.create(MediaStream.prototype), {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
    getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
  }) as MediaStream

const log: unknown[][] = []
let publishFails = false
let compositorFails = false
let lastCompositor: {
  options: { screen: MediaStream | null; onScreenEnded?: () => void }
  composite: FakeTrack
  closed: boolean
  attached: MediaStream[]
} | null = null
const devices = await import('@sistemazero/member-shell/lib/live/media-devices')
mock.module('@sistemazero/member-shell/lib/live/media-devices', () => ({
  ...devices,
  captureLiveTab: async (options: { handle: string }) => {
    log.push(['captureLiveTab', options.handle])
    return streamOf(new FakeTrack('video', 'tela'))
  },
}))
const transportModule = await import('@sistemazero/member-shell/lib/live/media-transport')
mock.module('@sistemazero/member-shell/lib/live/media-transport', () => ({
  ...transportModule,
  createLiveMediaTransport: () => ({
    join: async () => undefined,
    publish: async (kind: string, track: FakeTrack) => {
      log.push(['publish', kind, track.label])
      if (publishFails) throw new Error('A sala recusou agora.')
    },
    stopPublishing: async (kind: string) => {
      log.push(['stopPublishing', kind])
    },
    refreshPublications: async () => undefined,
    focusPublication: async () => undefined,
    close: async () => undefined,
    observeControlHeartbeat: () => undefined,
  }),
}))
const annotationModule = await import('@sistemazero/member-shell/lib/live/screen-annotation')
mock.module('@sistemazero/member-shell/lib/live/screen-annotation', () => ({
  ...annotationModule,
  createScreenAnnotation: (options: { screen: MediaStream | null; onScreenEnded?: () => void }) => {
    log.push(['createScreenAnnotation', options.screen ? 'com tela' : 'sem tela'])
    if (compositorFails) throw new Error('Este navegador não consegue desenhar sobre a tela.')
    const composite = new FakeTrack('video', 'composta')
    const listeners = new Set<() => void>()
    let state = {
      surface: options.screen ? 'screen' : 'board',
      boardTheme: 'light',
      hasScreen: !!options.screen,
      canUndo: false,
      shapeCount: 0,
    }
    const entry = { options, composite, closed: false, attached: [] as MediaStream[] }
    lastCompositor = entry
    const canvas = document.createElement('canvas')
    return {
      canvas,
      stream: streamOf(composite),
      width: 1600,
      height: 1000,
      getState: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      setSurface: (surface: 'screen' | 'board') => {
        state = { ...state, surface }
        for (const listener of listeners) listener()
      },
      setBoardTheme: () => undefined,
      attachScreen: (screen: MediaStream) => {
        entry.attached.push(screen)
        state = { ...state, hasScreen: true }
        for (const listener of listeners) listener()
      },
      begin: () => undefined,
      move: () => undefined,
      end: () => undefined,
      cancel: () => undefined,
      addText: () => undefined,
      pointLaser: () => undefined,
      undo: () => undefined,
      clear: () => undefined,
      render: () => undefined,
      close: () => {
        entry.closed = true
        log.push(['close'])
      },
    }
  },
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LiveMediaPanel } = await import(
  '@sistemazero/member-shell/components/live/live-media-panel'
)

function teacherRoom(): LiveRoomView {
  return {
    session: { id: 's1' },
    cohort: { id: 'c1', title: 'Turma', timeZone: 'America/Sao_Paulo' },
    occurrence: {
      id: 'o1',
      state: 'live',
      version: 3,
      speakingMode: 'turns',
      participants: [],
      messages: [],
    },
    role: 'teacher',
    actorId: 't1',
    supervision: 'present',
    serverTime: '2026-10-14T18:00:05.000Z',
    mediaReady: true,
  } as unknown as LiveRoomView
}

let cleanup: (() => void) | null = null
const errors: string[] = []
beforeEach(() => {
  log.length = 0
  errors.length = 0
  publishFails = false
  compositorFails = false
  lastCompositor = null
})
afterEach(() => {
  cleanup?.()
  cleanup = null
})

async function mountPanel() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <LiveMediaPanel
        room={teacherRoom()}
        deviceId="d-t1"
        stale={false}
        onError={(message) => errors.push(message)}
      />,
    ),
  )
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  const click = async (text: string) => {
    const found = [...container.querySelectorAll('button')].find(
      (node) => node.textContent?.trim() === text,
    )
    if (!found) throw new Error(`Botão ausente: ${text}`)
    await act(async () => found.click())
  }
  const has = (text: string) =>
    [...container.querySelectorAll('button')].some((node) => node.textContent?.trim() === text)
  await click('Conectar áudio e vídeo')
  return { container, click, has }
}

describe('a demonstração passa pelo compositor do desenho', () => {
  test('o que vai para a sala é a trilha composta, não a aba crua', async () => {
    const panel = await mountPanel()
    await panel.click('Transmitir aba de demonstração')
    expect(log).toEqual([
      ['captureLiveTab', 'sz-live-demo:s1'],
      ['createScreenAnnotation', 'com tela'],
      ['publish', 'demo', 'composta'],
    ])
    expect(panel.has('Desenhar na tela')).toBe(true)
    expect(panel.has('Abrir quadro branco')).toBe(false)
  })

  test('parar a demonstração solta o compositor e para de publicar', async () => {
    const panel = await mountPanel()
    await panel.click('Transmitir aba de demonstração')
    log.length = 0
    await panel.click('Parar demonstração')
    expect(lastCompositor!.closed).toBe(true)
    expect(lastCompositor!.composite.stopped).toBe(true)
    expect(log).toContainEqual(['stopPublishing', 'demo'])
    expect(panel.has('Desenhar na tela')).toBe(false)
  })

  test('o "Parar de compartilhar" do navegador encerra tudo', async () => {
    const panel = await mountPanel()
    await panel.click('Transmitir aba de demonstração')
    log.length = 0
    await act(async () => lastCompositor!.options.onScreenEnded?.())
    expect(lastCompositor!.closed).toBe(true)
    expect(log).toContainEqual(['stopPublishing', 'demo'])
    expect(panel.has('Desenhar na tela')).toBe(false)
    expect(panel.has('Transmitir aba de demonstração')).toBe(true)
  })

  test('quadro branco sem aba: publica a trilha composta sem pedir a tela', async () => {
    const panel = await mountPanel()
    await panel.click('Abrir quadro branco')
    expect(log).toEqual([
      ['createScreenAnnotation', 'sem tela'],
      ['publish', 'demo', 'composta'],
    ])
    expect(panel.has('Escolher a tela')).toBe(true)
  })

  test('do quadro para a tela, a aba entra no MESMO compositor, sem publicar de novo', async () => {
    const panel = await mountPanel()
    await panel.click('Abrir quadro branco')
    const compositor = lastCompositor!
    log.length = 0
    await panel.click('Escolher a tela')
    expect(log).toEqual([['captureLiveTab', 'sz-live-demo:s1']])
    expect(compositor.attached).toHaveLength(1)
    expect(lastCompositor).toBe(compositor)
    expect(panel.has('Tela')).toBe(true)
  })

  test('a sala recusou: o compositor não fica vivo sem ninguém', async () => {
    publishFails = true
    const panel = await mountPanel()
    await panel.click('Transmitir aba de demonstração')
    expect(lastCompositor!.closed).toBe(true)
    expect(errors).toEqual(['A sala recusou agora.'])
    expect(panel.has('Desenhar na tela')).toBe(false)
  })

  test('sem compositor (navegador sem canvas capturável), a aba vai crua, como antes', async () => {
    compositorFails = true
    const panel = await mountPanel()
    await panel.click('Transmitir aba de demonstração')
    expect(log).toEqual([
      ['captureLiveTab', 'sz-live-demo:s1'],
      ['createScreenAnnotation', 'com tela'],
      ['publish', 'demo', 'tela'],
    ])
    expect(errors).toEqual([])
    expect(panel.has('Desenhar na tela')).toBe(false)
    expect(panel.has('Parar demonstração')).toBe(true)
  })
})
