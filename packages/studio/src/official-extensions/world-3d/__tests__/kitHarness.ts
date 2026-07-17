import * as RealTHREE from 'three'
import { world3DRuntime } from '../runtime'

/**
 * Bancada do motor SZWorld3D (clone do kitHarness da g3k): roda a IIFE com o
 * THREE de VERDADE (strip da linha `import` + new Function) sobre o happy-dom
 * do preload. Só o WebGLRenderer é fake (não há GL aqui); toda a matemática
 * (heightAt, molejo, marcas, luzes) é a MESMA do preview.
 *
 * Vive num módulo próprio para runtime/playthrough exercitarem a MESMA bancada
 * — duas cópias divergiriam (lição da g3k: um fake divergente escondeu a briga
 * de convenções de "frente" por dois reviews).
 */

export const runtimeBody = world3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')

export interface FakeRenderer {
  disposeCalls: number
  forceContextLossCalls: number
  loop: ((t: number) => void) | null
  camera: RealTHREE.PerspectiveCamera | null
  scene: RealTHREE.Scene | null
  shadowMap: { enabled: boolean; type: number }
  toneMapping: number
  setPixelRatio: (n: number) => void
  setSize: (w: number, h: number, updateStyle: boolean) => void
  setAnimationLoop: (fn: ((t: number) => void) | null) => void
  setRenderTarget: (t: unknown) => void
  render: (scene?: unknown, camera?: unknown) => void
  dispose: () => void
  forceContextLoss: () => void
}

export function makeFakeThree() {
  const renderers: FakeRenderer[] = []

  function FakeWebGLRenderer(this: unknown) {
    const r: FakeRenderer = {
      disposeCalls: 0,
      forceContextLossCalls: 0,
      loop: null,
      camera: null,
      scene: null,
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0,
      setPixelRatio: () => {},
      setSize: () => {},
      setAnimationLoop: (fn) => {
        r.loop = fn
      },
      setRenderTarget: () => {},
      render: (scene?: unknown, camera?: unknown) => {
        const s = scene as { updateMatrixWorld?: () => void } | undefined
        if (s?.updateMatrixWorld) s.updateMatrixWorld()
        const c = camera as RealTHREE.PerspectiveCamera | undefined
        if (c?.isPerspectiveCamera) {
          r.camera = c
          r.scene = (scene as RealTHREE.Scene) ?? null
        }
      },
      dispose: () => {
        r.disposeCalls += 1
      },
      forceContextLoss: () => {
        r.forceContextLossCalls += 1
      },
    }
    renderers.push(r)
    return r
  }

  const THREE = {
    ...RealTHREE,
    WebGLRenderer: FakeWebGLRenderer as unknown as new () => FakeRenderer,
  }
  return { THREE, renderers }
}

/** Só o que os testes chamam — o inventário completo é auditado no blockAudit. */
export interface WorldApi {
  setup(style: string, size: number): void
  terrain(h: number, s: number): void
  flatten(x: number, z: number, r: number): void
  water(y: number): void
  start(): void
  groundHeight(x: number, z: number): number
  car(style: string, color: string): void
  carStats(speed: number, turn: number, jump: number): void
  carBoost(force: number): void
  carPlace(x: number, z: number, deg: number): void
  carPos(axis: string): number
  carSpeed(): number
  horn(): void
  onHorn(fn: () => void): void
  carLights(): void
  tireMarks(on: string): void
  carPaint(paint: string): void
  onCrash(fn: () => void): void
  onUpdate(fn: (dt: number) => void): void
  keyDown(k: string): boolean
  setTime(name: string): void
  dayNight(minutes: number): void
  onDayNight(when: string, fn: () => void): void
  weather(kind: string): void
  point(name: string, x: number, z: number): void
  onPoint(name: string, fn: () => void): void
  zone(name: string, x: number, z: number, r: number): void
  onZone(name: string, fn: () => void): void
  raceCreate(x: number, z: number, deg: number, laps: number): void
  raceCheckpoint(x: number, z: number): void
  raceOnFinish(fn: () => void): void
  raceTime(): number
  raceBest(): number
  bowlingCreate(x: number, z: number): void
  bowlingOnStrike(fn: () => void): void
  pinsDown(): number
  hud(pos: string, text: string): void
  say(text: string, secs: number): void
}

/** Dispara uma tecla como o navegador faria (o motor lê e.key/e.code do window). */
export function pressKey(key: string, code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code }))
}
export function releaseKey(key: string, code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key, code }))
}

/**
 * @param beforeStart roda entre o `setup()` e o `start()` — onde a criança monta
 * o mundo (o start constrói tudo e espera os assets pendentes).
 */
export async function loadStartedWorld(beforeStart?: (api: WorldApi) => void): Promise<{
  api: WorldApi
  renderers: FakeRenderer[]
  step: (frames: number) => void
}> {
  const { THREE, renderers } = makeFakeThree()
  const win = globalThis.window as unknown as Record<string, unknown>
  new Function('THREE', 'window', runtimeBody)(THREE, win)
  const api = win.SZWorld3D as WorldApi
  api.setup('floresta', 120)
  if (beforeStart) beforeStart(api)
  api.start()
  for (let i = 0; i < 60 && !renderers[0]?.loop; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  if (!renderers[0]?.loop) throw new Error('o loop nunca ligou — preso em "carregando"?')
  let now = 0
  const step = (frames: number) => {
    const loop = renderers[0]?.loop
    if (!loop) throw new Error('loop não ligado')
    for (let i = 0; i < frames; i++) {
      now += 33.4
      loop(now)
    }
  }
  // Primeiro tick fixa o _lastT (dt = 0).
  step(1)
  return { api, renderers, step }
}

/**
 * Roda o runtime + o JS GERADO de um exemplo (que já traz setup no começo e
 * start() no fim). Bancada do playthrough: o exemplo roda como no preview.
 */
export async function loadExampleWorld(exampleJs: string): Promise<{
  api: WorldApi
  renderers: FakeRenderer[]
  step: (frames: number) => void
  stage: Element
}> {
  const { THREE, renderers } = makeFakeThree()
  const win = globalThis.window as unknown as Record<string, unknown>
  new Function('THREE', 'window', runtimeBody)(THREE, win)
  const api = win.SZWorld3D as WorldApi
  new Function('SZWorld3D', 'window', exampleJs)(api, win)
  for (let i = 0; i < 60 && !renderers[0]?.loop; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  if (!renderers[0]?.loop) throw new Error('o loop nunca ligou — preso em "carregando"?')
  let now = 0
  const step = (frames: number) => {
    const loop = renderers[0]?.loop
    if (!loop) throw new Error('loop não ligado')
    for (let i = 0; i < frames; i++) {
      now += 33.4
      loop(now)
    }
  }
  step(1)
  const stages = document.querySelectorAll('#szw3d-stage')
  const stage = stages[stages.length - 1]
  if (!stage) throw new Error('o palco #szw3d-stage não montou')
  return { api, renderers, step, stage }
}
