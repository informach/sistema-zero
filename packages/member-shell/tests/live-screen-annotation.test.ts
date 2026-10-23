import { afterEach, describe, expect, test } from 'bun:test'
import {
  ANNOTATION_FPS,
  type AnnotationStyle,
  compositorSize,
  createScreenAnnotation,
  type ScreenAnnotationEnvironment,
  startAnnotationClock,
} from '../src/lib/live/screen-annotation'

/**
 * O compositor do desenho sobre a tela. O canvas do navegador não existe aqui: o contexto 2D,
 * o vídeo, as trilhas e o relógio são falsos e anotam o que o compositor pediu, na ordem.
 */

type Listener = (this: unknown) => void
class FakeTrack {
  stopped = false
  private listeners = new Map<string, Set<Listener>>()
  constructor(
    readonly kind: 'video' | 'audio',
    readonly label: string,
    private settings: { width?: number; height?: number } = {},
  ) {}
  stop() {
    this.stopped = true
  }
  getSettings() {
    return this.settings
  }
  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(listener)
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }
  /** O navegador encerrando a trilha ("Parar de compartilhar"). */
  end() {
    this.stopped = true
    for (const listener of [...(this.listeners.get('ended') ?? [])]) listener.call(this)
  }
}
const fakeStream = (...tracks: FakeTrack[]) =>
  ({
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  }) as unknown as MediaStream

function fakeContext() {
  const calls: string[] = []
  const context = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textBaseline: 'alphabetic',
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: (x: number, y: number) => calls.push(`lineTo ${x},${y}`),
    fillRect: (_x: number, _y: number, w: number, h: number) =>
      calls.push(`fillRect ${context.fillStyle} ${w}x${h}`),
    drawImage: (source: { name: string }, x: number, y: number, w: number, h: number) =>
      calls.push(`drawImage ${source.name} ${x},${y} ${w}x${h}`),
    stroke: () =>
      calls.push(`stroke ${context.strokeStyle} w=${context.lineWidth} a=${context.globalAlpha}`),
    fill: () => calls.push(`fill ${context.fillStyle} a=${context.globalAlpha}`),
    arc: (x: number, y: number, r: number) => calls.push(`arc ${x},${y} r=${r}`),
    ellipse: (x: number, y: number, rx: number, ry: number) =>
      calls.push(`ellipse ${x},${y} ${rx}x${ry}`),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      calls.push(`strokeRect ${context.strokeStyle} ${x},${y} ${w}x${h}`),
    strokeText: () => undefined,
    fillText: (text: string, x: number, y: number) =>
      calls.push(`fillText ${text} ${x},${y} ${context.font}`),
    measureText: (text: string) => ({ width: text.length * 10 }),
  }
  return context
}

function harness(options: { screen?: FakeTrack | null; captureStream?: boolean } = {}) {
  const context = fakeContext()
  const composite = new FakeTrack('video', 'composite')
  const canvas: { width: number; height: number; fps?: number; [key: string]: unknown } = {
    width: 0,
    height: 0,
    getContext: () => context,
  }
  if (options.captureStream !== false)
    canvas.captureStream = (fps: number) => {
      canvas.fps = fps
      return fakeStream(composite)
    }
  const video = {
    name: 'video',
    muted: false,
    playsInline: false,
    autoplay: false,
    srcObject: null as MediaStream | null,
    readyState: 4,
    videoWidth: 1600,
    videoHeight: 1000,
    paused: true,
    play() {
      video.paused = false
      return Promise.resolve()
    },
    pause() {
      video.paused = true
    },
  }
  const clock: { fps: number; tick: () => void; stopped: boolean; now: number } = {
    fps: 0,
    tick: () => undefined,
    stopped: false,
    now: 0,
  }
  const environment: ScreenAnnotationEnvironment = {
    createCanvas: () => canvas as unknown as HTMLCanvasElement,
    createVideo: () => video as unknown as HTMLVideoElement,
    startClock(fps, tick) {
      clock.fps = fps
      clock.tick = tick
      return () => {
        clock.stopped = true
      }
    },
    now: () => clock.now,
  }
  const screenTrack =
    options.screen === undefined
      ? new FakeTrack('video', 'tela', { width: 1600, height: 1000 })
      : options.screen
  const ended: string[] = []
  const annotation = createScreenAnnotation(
    {
      screen: screenTrack ? fakeStream(screenTrack) : null,
      onScreenEnded: () => ended.push('ended'),
    },
    environment,
  )
  /** Um quadro do relógio: devolve só o que ele pintou. */
  const frame = () => {
    context.calls.length = 0
    clock.tick()
    return [...context.calls]
  }
  return { annotation, context, canvas, video, clock, composite, screenTrack, ended, frame }
}

const red: AnnotationStyle = { color: '#ef4444', width: 'medium' }

function drawLine(annotation: ReturnType<typeof harness>['annotation'], y = 100) {
  annotation.begin('pen', { x: 100, y }, red)
  annotation.move({ x: 300, y })
  annotation.end()
}

describe('a tela passa pelo compositor', () => {
  test('sem desenho ele só repassa a tela, no tamanho dela e no ritmo de 15 quadros', () => {
    const { annotation, canvas, clock, frame } = harness()
    expect([annotation.width, annotation.height]).toEqual([1600, 1000])
    expect(canvas.fps).toBe(ANNOTATION_FPS)
    expect(clock.fps).toBe(ANNOTATION_FPS)
    expect(frame()).toEqual(['fillRect #000000 1600x1000', 'drawImage video 0,0 1600x1000'])
  })

  test('o desenho vai POR CIMA da tela, no mesmo quadro', () => {
    const { annotation, frame } = harness()
    drawLine(annotation)
    const calls = frame()
    const screen = calls.indexOf('drawImage video 0,0 1600x1000')
    const ink = calls.findIndex((call) => call.startsWith('stroke #ef4444 w=8 a=1'))
    expect(screen).toBeGreaterThanOrEqual(0)
    expect(ink).toBeGreaterThan(screen)
  })

  test('o marca-texto sai largo e translúcido', () => {
    const { annotation, frame } = harness()
    annotation.begin('highlighter', { x: 0, y: 0 }, { color: '#facc15', width: 'medium' })
    annotation.move({ x: 50, y: 0 })
    annotation.end()
    expect(frame()).toContain('stroke #facc15 w=28 a=0.35')
  })

  test('o traço aparece enquanto a professora desenha, antes de soltar', () => {
    const { annotation, frame } = harness()
    annotation.begin('rect', { x: 10, y: 10 }, red)
    annotation.move({ x: 110, y: 60 })
    expect(frame()).toContain('strokeRect #ef4444 10,10 100x50')
    expect(annotation.getState().shapeCount).toBe(0)
    annotation.end()
    expect(annotation.getState().shapeCount).toBe(1)
  })

  test('a tela de outro tamanho cabe inteira, com faixas', () => {
    const { video, frame } = harness()
    video.videoWidth = 800
    video.videoHeight = 800
    expect(frame()).toContain('drawImage video 300,0 1000x1000')
  })
})

describe('quadro branco', () => {
  test('troca o fundo sem trocar a trilha publicada', () => {
    const { annotation, frame } = harness()
    const published = annotation.stream
    annotation.setSurface('board')
    expect(annotation.stream).toBe(published)
    expect(frame()).toEqual(['fillRect #ffffff 1600x1000'])
    annotation.setBoardTheme('dark')
    expect(frame()).toEqual(['fillRect #1e293b 1600x1000'])
    expect(annotation.getState()).toMatchObject({ surface: 'board', boardTheme: 'dark' })
  })

  test('a tela e o quadro guardam desenhos separados, e voltar traz os da tela', () => {
    const { annotation, frame } = harness()
    drawLine(annotation)
    annotation.setSurface('board')
    expect(frame().some((call) => call.startsWith('stroke'))).toBe(false)
    expect(annotation.getState()).toMatchObject({ shapeCount: 0, canUndo: false })
    annotation.setSurface('screen')
    expect(frame().some((call) => call.startsWith('stroke #ef4444'))).toBe(true)
    expect(annotation.getState()).toMatchObject({ shapeCount: 1, canUndo: true })
  })

  test('começar direto no quadro, sem tela, e ligar a tela depois', () => {
    const { annotation, frame } = harness({ screen: null })
    expect([annotation.width, annotation.height]).toEqual([1600, 900])
    expect(annotation.getState()).toMatchObject({ surface: 'board', hasScreen: false })
    expect(frame()).toEqual(['fillRect #ffffff 1600x900'])
    annotation.attachScreen(fakeStream(new FakeTrack('video', 'tela')))
    annotation.setSurface('screen')
    expect(annotation.getState().hasScreen).toBe(true)
    expect(frame()).toContain('drawImage video 80,0 1440x900')
  })

  test('trocar de superfície no meio do gesto descarta o rascunho', () => {
    const { annotation } = harness()
    annotation.begin('pen', { x: 0, y: 0 }, red)
    annotation.setSurface('board')
    annotation.end()
    expect(annotation.getState().shapeCount).toBe(0)
    annotation.setSurface('screen')
    expect(annotation.getState().shapeCount).toBe(0)
  })
})

describe('encerrar solta tudo', () => {
  test('o "Parar de compartilhar" do navegador avisa quem publicou', () => {
    const { screenTrack, ended } = harness()
    screenTrack!.end()
    expect(ended).toEqual(['ended'])
  })

  test('close para o relógio, a tela, o vídeo e a trilha composta, uma vez só', () => {
    const { annotation, clock, screenTrack, composite, video, frame } = harness()
    annotation.close()
    expect(clock.stopped).toBe(true)
    expect(screenTrack!.stopped).toBe(true)
    expect(composite.stopped).toBe(true)
    expect(video.srcObject).toBeNull()
    expect(frame()).toEqual([])
    annotation.close()
    drawLine(annotation)
    expect(annotation.getState().shapeCount).toBe(0)
  })

  test('trocar a tela solta a anterior, e o fim da antiga não derruba a nova', () => {
    const { annotation, screenTrack, ended } = harness()
    const next = new FakeTrack('video', 'outra')
    annotation.attachScreen(fakeStream(next))
    expect(screenTrack!.stopped).toBe(true)
    screenTrack!.end()
    expect(ended).toEqual([])
    next.end()
    expect(ended).toEqual(['ended'])
  })

  test('sem captureStream o navegador não serve, e o erro diz o que fazer', () => {
    expect(() => harness({ captureStream: false })).toThrow('Use o Chrome atualizado')
  })
})

describe('desfazer, limpar e borracha', () => {
  test('desfazer e limpar valem para a superfície da vez', () => {
    const { annotation } = harness()
    drawLine(annotation, 100)
    drawLine(annotation, 200)
    annotation.undo()
    expect(annotation.getState().shapeCount).toBe(1)
    annotation.clear()
    expect(annotation.getState()).toMatchObject({ shapeCount: 0, canUndo: true })
    annotation.undo()
    expect(annotation.getState().shapeCount).toBe(1)
  })

  test('uma passada de borracha apaga o que tocou e se desfaz de uma vez', () => {
    const { annotation } = harness()
    drawLine(annotation, 100)
    drawLine(annotation, 200)
    // Começa e termina LONGE das duas linhas: só o caminho entre os dois eventos do mouse as
    // toca (um arrasto rápido manda poucos eventos).
    annotation.begin('eraser', { x: 200, y: 30 }, red)
    annotation.move({ x: 200, y: 290 })
    annotation.end()
    expect(annotation.getState().shapeCount).toBe(0)
    annotation.undo()
    expect(annotation.getState().shapeCount).toBe(2)
  })

  test('borracha cancelada devolve o que tinha apagado', () => {
    const { annotation } = harness()
    drawLine(annotation)
    annotation.begin('eraser', { x: 200, y: 100 }, red)
    expect(annotation.getState().shapeCount).toBe(0)
    annotation.cancel()
    expect(annotation.getState()).toMatchObject({ shapeCount: 1, canUndo: true })
  })

  test('clique sem arrasto com a forma não deixa resto', () => {
    const { annotation } = harness()
    annotation.begin('ellipse', { x: 10, y: 10 }, red)
    annotation.end()
    expect(annotation.getState().shapeCount).toBe(0)
  })

  test('o texto é medido e desenhado no tamanho da espessura', () => {
    const { annotation, frame } = harness()
    annotation.addText({ x: 40, y: 50 }, '  Olha aqui  ', { color: '#ffffff', width: 'thick' })
    annotation.addText({ x: 40, y: 50 }, '   ', red)
    expect(annotation.getState().shapeCount).toBe(1)
    expect(frame().find((call) => call.startsWith('fillText'))).toStartWith(
      'fillText Olha aqui 40,50 700 56px',
    )
  })
})

describe('luz mágica', () => {
  test('brilha na hora e some sozinha em 1 segundo, sem virar forma', () => {
    const { annotation, clock, frame } = harness()
    annotation.pointLaser({ x: 10, y: 10 }, '#ef4444', true)
    clock.now = 50
    annotation.pointLaser({ x: 60, y: 10 }, '#ef4444')
    clock.now = 100
    const lit = frame()
    expect(lit).toContain('arc 60,10 r=14')
    expect(lit.some((call) => call.startsWith('stroke #ef4444'))).toBe(true)
    expect(annotation.getState().shapeCount).toBe(0)
    clock.now = 1100
    expect(frame()).toEqual(['fillRect #000000 1600x1000', 'drawImage video 0,0 1600x1000'])
  })

  test('rastros separados não se ligam', () => {
    const { annotation, frame } = harness()
    annotation.pointLaser({ x: 10, y: 10 }, '#22c55e', true)
    annotation.pointLaser({ x: 500, y: 500 }, '#22c55e', true)
    expect(frame().filter((call) => call.startsWith('stroke'))).toEqual([])
  })
})

describe('quem assiste ao estado', () => {
  test('avisa a cada mudança e devolve o MESMO retrato quando nada mudou', () => {
    const { annotation } = harness()
    let calls = 0
    const stop = annotation.subscribe(() => {
      calls += 1
    })
    const before = annotation.getState()
    expect(annotation.getState()).toBe(before)
    drawLine(annotation)
    expect(calls).toBe(1)
    expect(annotation.getState()).not.toBe(before)
    annotation.setSurface('screen')
    expect(calls).toBe(1)
    stop()
    annotation.undo()
    expect(calls).toBe(1)
  })
})

describe('tamanho do quadro', () => {
  test('o da tela, até 1920x1080, sempre par', () => {
    expect(compositorSize({ width: 1600, height: 1000 })).toEqual({ width: 1600, height: 1000 })
    expect(compositorSize({ width: 2560, height: 1440 })).toEqual({ width: 1920, height: 1080 })
    // Tela larga: quem segura é a largura; tela alta: a altura.
    expect(compositorSize({ width: 3840, height: 1080 })).toEqual({ width: 1920, height: 540 })
    expect(compositorSize({ width: 1080, height: 2160 })).toEqual({ width: 540, height: 1080 })
    expect(compositorSize({ width: 1599, height: 999 })).toEqual({ width: 1600, height: 1000 })
    expect(compositorSize({})).toEqual({ width: 1600, height: 900 })
    expect(compositorSize(undefined)).toEqual({ width: 1600, height: 900 })
  })
})

describe('o relógio', () => {
  const realWorker = globalThis.Worker
  afterEach(() => {
    globalThis.Worker = realWorker
  })

  test('bate dentro de um Worker de verdade (a aba escondida não segura)', async () => {
    let ticks = 0
    const stop = startAnnotationClock(20, () => {
      ticks += 1
    })
    await Bun.sleep(400)
    stop()
    const after = ticks
    expect(after).toBeGreaterThanOrEqual(3)
    await Bun.sleep(150)
    expect(ticks).toBe(after)
  })

  test('sem Worker cai no relógio da página', async () => {
    globalThis.Worker = class {
      constructor() {
        throw new Error('sem worker')
      }
    } as unknown as typeof Worker
    let ticks = 0
    const stop = startAnnotationClock(50, () => {
      ticks += 1
    })
    await Bun.sleep(120)
    stop()
    expect(ticks).toBeGreaterThanOrEqual(2)
  })

  test('Worker que falha ao carregar também cai no relógio da página', async () => {
    const created: { posted: unknown[]; terminated: boolean; emit(type: string): void }[] = []
    globalThis.Worker = class {
      posted: unknown[] = []
      terminated = false
      private handlers = new Map<string, () => void>()
      constructor() {
        created.push(this)
      }
      addEventListener(type: string, handler: () => void) {
        this.handlers.set(type, handler)
      }
      postMessage(message: unknown) {
        this.posted.push(message)
      }
      terminate() {
        this.terminated = true
      }
      emit(type: string) {
        this.handlers.get(type)?.()
      }
    } as unknown as typeof Worker
    let ticks = 0
    const stop = startAnnotationClock(50, () => {
      ticks += 1
    })
    expect(created[0]!.posted).toEqual([{ fps: 50 }])
    created[0]!.emit('message')
    expect(ticks).toBe(1)
    created[0]!.emit('error')
    expect(created[0]!.terminated).toBe(true)
    await Bun.sleep(120)
    stop()
    expect(ticks).toBeGreaterThanOrEqual(3)
  })
})
