import { gameKitRuntime } from '../runtime'
import type { GameKitEntity, GameKitRuntimeApi } from '../runtimeContract'

/**
 * Harness enxuto do runtime da gk para os testes de CAIXA DE COLISÃO (borda do
 * palco, overlay, forma). O `runtime.test.ts` tem o seu, muito maior (relógio,
 * localStorage, inspetores); aqui só precisamos de: montar o runtime, bombear
 * quadros na mão e espiar o que foi desenhado.
 *
 * A superfície usada aqui vem do contrato canônico do runtime; assim o harness
 * não mantém uma segunda versão das assinaturas públicas.
 */

type Listener = (ev: unknown) => void

type KitApiKey = keyof Pick<
  GameKitRuntimeApi,
  | 'setup'
  | 'setupFull'
  | 'start'
  | 'setState'
  | 'setStageDescription'
  | 'onGameClick'
  | 'mouseDown'
  | 'createCharacter'
  | 'placeCharacter'
  | 'setHitbox'
  | 'setHitboxShape'
  | 'showStageBorder'
  | 'useFont'
  | 'setBackdrop'
  | 'drawBackdrop'
  | 'runProject'
  | 'drawBackground'
  | 'cameraFollow'
  | 'showHitboxes'
  | 'touching'
  | 'touchCircle'
  | 'pointIn'
  | 'defineMold'
  | 'spawnFromMold'
  | 'recycle'
  | 'forEachActive'
  | 'overlapGroups'
  | 'setProperty'
  | 'enableFixedSimulation'
  | 'onFixedUpdate'
  | 'fixedTick'
  | 'simulationStats'
  | 'loadTilemap'
  | 'drawTilemap'
  | 'bindAction'
  | 'actionDown'
  | 'actionPressed'
  | 'actionReleased'
  | 'activeInputDevice'
  | 'rpgCreateMap'
  | 'rpgGoMap'
  | 'defineCampaign'
  | 'defineCampaignStage'
  | 'startCampaign'
  | 'goToStage'
  | 'nextStage'
  | 'currentStage'
  | 'currentWorld'
  | 'onCampaignEvent'
  | 'campaignEventValue'
  | 'setCampaignCheckpoint'
  | 'saveCampaign'
  | 'loadCampaign'
  | 'campaignSaveInfo'
  | 'startReplayRecording'
  | 'stopReplayRecording'
  | 'playReplay'
  | 'playLastReplay'
  | 'replayActive'
  | 'replayHash'
  | 'campaignHero'
  | 'campaignProgress'
>

export type KitApi = Pick<GameKitRuntimeApi, KitApiKey>

export interface Harness {
  api: KitApi
  /** O `window` de mentira — o codigo GERADO do exemplo precisa dele. */
  window: Record<string, unknown>
  fire: (name: string, ev?: unknown) => void
  nextFrame: (ts: number) => void
}

/** O que o contexto 2D recebeu no quadro — o overlay é conferido por aqui. */
export interface CanvasSpy {
  strokes: number[][]
  arcs: number[][]
  /** Argumentos geométricos de drawImage (x, y, w, h) — a imagem em si sai fora. */
  images: number[][]
  /** Retângulos PREENCHIDOS: é por eles que se lê o desenho da campanha. */
  rects: number[][]
  /** O que o HUD escreveu, com onde. */
  texts: Array<{ text: string; x: number; y: number }>
  clear: () => void
}

const canvasProto = (globalThis as { HTMLCanvasElement?: { prototype: object } }).HTMLCanvasElement
  ?.prototype as { getContext?: unknown } | undefined

/**
 * happy-dom devolve null em getContext('2d') e o render sairia cedo — o laço de
 * desenho ficaria invisível ao teste. Instala um contexto de mentira que ANOTA
 * strokeRect e arc. Devolve o `restore` para o afterAll (o registro de módulos
 * do bun não é isolado por arquivo).
 */
export function installCanvasSpy(): CanvasSpy & { restore: () => void } {
  const strokes: number[][] = []
  const arcs: number[][] = []
  const images: number[][] = []
  const rects: number[][] = []
  const texts: Array<{ text: string; x: number; y: number }> = []
  const original = canvasProto?.getContext
  const fakeCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    imageSmoothingEnabled: true,
    font: '',
    globalAlpha: 1,
    fillRect(...a: number[]) {
      rects.push(a)
    },
    strokeRect(...a: number[]) {
      strokes.push(a)
    },
    drawImage(_img: unknown, ...a: number[]) {
      images.push(a)
    },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc(...a: number[]) {
      arcs.push(a)
    },
    fill() {},
    fillText(text: string, x: number, y: number) {
      texts.push({ text: String(text), x, y })
    },
    save() {},
    restore() {},
    translate() {},
    scale() {},
    clearRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 10 }),
    setTransform() {},
    roundRect() {},
    ellipse() {},
    rect() {},
    clip() {},
    quadraticCurveTo() {},
  }
  if (canvasProto) canvasProto.getContext = () => fakeCtx
  return {
    strokes,
    arcs,
    images,
    rects,
    texts,
    clear: () => {
      strokes.length = 0
      arcs.length = 0
      images.length = 0
      rects.length = 0
      texts.length = 0
    },
    restore: () => {
      if (canvasProto) canvasProto.getContext = original
    },
  }
}

/** Monta o runtime num `window` de mentira, com os quadros na mão. */
export function loadRuntime(windowOverrides: Record<string, unknown> = {}): Harness {
  const listeners: Record<string, Listener[]> = {}
  const rafQueue: Array<(ts: number) => void> = []
  const win = {
    addEventListener(name: string, fn: Listener) {
      listeners[name] ??= []
      listeners[name].push(fn)
    },
    performance: { now: () => 0 },
    innerWidth: 1200,
    innerHeight: 700,
    SZGameKit: undefined,
    ...windowOverrides,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameKitRuntime)(
    win,
    (cb: (ts: number) => void) => {
      rafQueue.push(cb)
      return rafQueue.length
    },
  )
  const api = win.SZGameKit as KitApi | undefined
  if (!api) throw new Error('runtime não montou window.SZGameKit')
  return {
    api,
    window: win,
    fire: (name, ev = {}) => {
      for (const fn of listeners[name] ?? []) fn(ev)
    },
    nextFrame: (ts) => {
      const cb = rafQueue.shift()
      if (!cb) throw new Error('nenhum quadro agendado')
      cb(ts)
    },
  }
}

/** start() + as microtasks do Promise.all das imagens. */
export async function startGame(h: Harness): Promise<void> {
  h.api.start()
  await Promise.resolve()
  await Promise.resolve()
}

/** Sobe o palco e já deixa o jogo rodando (o render só desenha fora do menu). */
export async function startPlaying(h: Harness, w = 400, h2 = 300): Promise<void> {
  h.api.setup({ width: w, height: h2 })
  await startGame(h)
  h.api.setState('jogando')
}

export function canvasEl(): HTMLElement {
  const el = document.getElementById('szgk-canvas')
  if (!el) throw new Error('o palco não montou')
  return el
}

/** Um personagem posto num lugar conhecido (o corpo é opaco por design). */
export function characterAt(
  h: Harness,
  x: number,
  y: number,
  w: number,
  hh: number,
): GameKitEntity {
  const c = h.api.createCharacter({ w, h: hh })
  h.api.placeCharacter(c, x, y)
  return c
}
