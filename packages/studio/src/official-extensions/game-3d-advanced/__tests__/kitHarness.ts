import * as RealTHREE from 'three'
import { gameKit3DRuntime } from '../runtime'

/**
 * Bancada compartilhada do motor SZGameKit3D: roda a IIFE com THREE de VERDADE
 * (receita do game-3d: strip da linha `import` + new Function). O DOM é o
 * happy-dom do preload; o `window` injetado é o global (tem addEventListener,
 * innerWidth e KeyboardEvent de verdade).
 *
 * Vive num módulo próprio para que `runtime.test.ts` (motor/física) e
 * `direction.test.ts` (orientação/câmera) exercitem EXATAMENTE a mesma bancada —
 * duas cópias divergiriam, e foi um fake divergente que escondeu a briga de
 * convenções de "frente" por dois reviews.
 */

export const runtimeBody = gameKit3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')

export interface FakeRenderer {
  disposeCalls: number
  forceContextLossCalls: number
  loop: ((t: number) => void) | null
  /**
   * A câmera VIVA, capturada do próprio `render(scene, camera)` — é assim que os
   * testes de direção leem para onde a câmera olha sem que o motor precise de uma
   * API só-de-teste. Filtra pelo `isPerspectiveCamera` porque o mini-composer
   * também renderiza um quad com câmera ortográfica própria.
   */
  camera: RealTHREE.PerspectiveCamera | null
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

  /**
   * ⭐ THREE de VERDADE. O fake anterior tinha a matemática de rotação zerada
   * (`applyQuaternion() { return this }`, `setFromUnitVectors()` no-op) e
   * `rotation`/`quaternion` DESLIGADOS entre si — sob ele `moveForward` devolvia
   * (0,0,1) sempre, qualquer que fosse a rotação. Foi esse ponto cego que deixou
   * passar a briga de convenções de "frente" (180°) por dois full reviews e 2523
   * testes verdes. Só o WebGLRenderer precisa de contexto GL; todo o resto do
   * three (Object3D, Quaternion, geometrias, DataTexture...) é JS puro e roda no
   * happy-dom. A versão casa com o THREE_CDN do index.ts (0.180.0) — o teste
   * exercita a MESMA matemática que o preview.
   */
  function FakeWebGLRenderer(this: unknown) {
    const r: FakeRenderer = {
      disposeCalls: 0,
      forceContextLossCalls: 0,
      loop: null,
      camera: null,
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0,
      setPixelRatio: () => {},
      setSize: () => {},
      setAnimationLoop: (fn) => {
        r.loop = fn
      },
      setRenderTarget: () => {},
      render: (_scene?: unknown, camera?: unknown) => {
        const c = camera as RealTHREE.PerspectiveCamera | undefined
        if (c?.isPerspectiveCamera) r.camera = c
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
export interface KitApi {
  setup(opts: Record<string, unknown>): void
  start(): void
  setState(name: string): void
  defineMold(name: string, opts: Record<string, unknown>, fn: () => void): void
  part(opts: Record<string, unknown>): void
  spawn(mold: string, x: number, y: number, z: number): unknown
  recycle(e: unknown): void
  exists(e: unknown): boolean
  countAlive(mold: string): number
  nearest(mold: string, e: unknown): unknown
  forEachNear(e: unknown, mold: string, radius: number, fn: (o: unknown) => void): void
  onEnterEntityState(mold: string, state: string, fn: (e: unknown) => void): void
  onExitEntityState(mold: string, state: string, fn: (e: unknown) => void): void
  setEntityState(e: unknown, state: string): void
  entityStateIs(e: unknown, state: string): boolean
  stateTimer(mold: string, state: string, sec: number, next: string): void
  hurt(e: unknown, amount: number): void
  healthOf(e: unknown): number
  onEntityDeath(mold: string, fn: (e: unknown) => void): void
  keyDown(key: string): boolean
  posOf(e: unknown, axis: string): number
  fall(e: unknown, g: number): void
  jump(e: unknown, force: number): void
  onGround(e: unknown): boolean
  makeSolid(mold: string): void
  setVelocity(e: unknown, x: number, y: number, z: number): void
  setDrag(e: unknown, amount: number): void
  place(e: unknown, x: number, y: number, z: number): void
  setCollider(mold: string, shape: string): void
  setPhysics(mold: string, type: string): void
  playAnim(e: unknown, name: string, loop?: boolean): void
  stopAnim(e: unknown): void
  setStateAnim(mold: string, state: string, clip: string): void
  passThrough(e: unknown, on: boolean): void
  makeTrigger(mold: string): void
  onOverlap(mold: string, fn: (zone: unknown, who: unknown) => void): void
  setBounce(mold: string, amount: number): void
  setFriction(mold: string, amount: number): void
  setSeed(n: number): void
  randomBetween(a: number, b: number): number
  randomChance(percent: number): boolean
  startTimer(seconds: number): void
  timeLeft(): number
  stopTimer(): void
  onTimerEnd(fn: () => void): void
  playMusic(name: string): void
  stopMusic(): void
  say(e: unknown, text: string, seconds: number): void
  hideSay(e: unknown): void
  forEachAlive(mold: string, fn: (e: unknown) => void): void
  startSpawner(mold: string, seconds: number, where: string): void
  // Orientação & câmera — o que a suíte de direção exercita.
  velocityOf(e: unknown, axis: string): number
  setYaw(e: unknown, degrees: number): void
  moveForward(e: unknown, speed: number): void
  faceVelocity(e: unknown): void
  lookAt(who: unknown, target: unknown): void
  aimAt(who: unknown, target: unknown, smooth: number): void
  isAimingAt(who: unknown, target: unknown): boolean
  spawnFrom(mold: string, src: unknown): unknown
  moveWithKeys(e: unknown, speed: number): void
  platformerKeys(e: unknown, speed: number, jump: number): void
  moveFps(e: unknown, speed: number): void
  cameraFollow(e: unknown, dist: number, height: number): void
  cameraOrbit(dist: number): void
  cameraTop(height: number): void
  cameraFps(e: unknown, height: number): void
}

/**
 * @param beforeStart roda entre o `setup()` e o `start()` — o MESMO lugar em que
 * a criança define os moldes. Importa para o que é assíncrono (modelos): o
 * `start()` espera o carregamento, então um molde definido aqui já nasce pronto,
 * enquanto um definido depois do `start` não teria o que esperar.
 */
export async function loadStartedKit(beforeStart?: (api: KitApi) => void): Promise<{
  api: KitApi
  renderers: FakeRenderer[]
  step: (frames: number) => void
}> {
  const { THREE, renderers } = makeFakeThree()
  const win = globalThis.window as unknown as Record<string, unknown>
  new Function('THREE', 'window', runtimeBody)(THREE, win)
  const api = win.SZGameKit3D as KitApi
  api.setup({ width: 640, height: 360, world: 100 })
  if (beforeStart) beforeStart(api)
  api.start()
  // O start espera Promise.all(pending) — sons E modelos — antes de ligar o loop.
  // Um modelo passa por import() do addon + parse, então precisa de mais de um
  // tick: o laço só existe quando o carregamento acaba (é a tela "carregando").
  for (let i = 0; i < 60 && !renderers[0]?.loop; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
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
