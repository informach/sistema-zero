import { MATERIALS_GUIDE, SOUND_SOURCE } from './sound.source.generated'

export const SHARED_SOURCES: Record<string, string> = {
  'src/sound.ts': SOUND_SOURCE,
  'MATERIALS.md': MATERIALS_GUIDE,
  'src/contracts.ts': `
import type { Phase, Readiness } from './ui'
export interface GamePoint { x: number; y: number; z?: number }
export interface GameSnapshot {
  engine: 'canvas' | 'phaser' | 'three'
  phase: Phase
  readiness?: Readiness
  score: number
  goal: number
  tick?: number
  seed?: number
  health?: number
  maxHealth?: number
  kills?: number
  elapsedSeconds?: number
  timeGoalSeconds?: number
  resultReason?: 'time' | 'kills' | 'health'
  timing?: { discardedSeconds: number }
  player?: GamePoint & { grounded?: boolean }
  targets?: GamePoint[]
  wave?: number
  missed?: number
  board?: number[][]
  rules?: { range: number; fuseTicks: number; movementTicks: number }
  charges?: Array<GamePoint & { id: number; remaining: number }>
  pulses?: Array<{ cells: GamePoint[]; remaining: number }>
  round?: number
  turn?: 'player' | 'rival'
  cursor?: GamePoint
  selectedId?: string | null
  coins?: number
  terrain?: number[][]
  moves?: GamePoint[]
  units?: Array<GamePoint & { id: string; side: 'friend' | 'rival'; role: 'guardian' | 'scout'; health: number; maxHealth: number; moved: boolean; acted: boolean }>
  piece?: { x: number; y: number; cells: [number,number][] }
  render?: { drawCalls: number; triangles: number; geometries: number; textures: number }
}
/** Inspection copies plain data on demand; it cannot mutate the engine or complete an objective. */
export interface GameController { inspect(): GameSnapshot; dispose(): void }
`,
  'src/progress.ts': `
import type { GameUI } from './ui'
interface GameStorage { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<unknown> }
declare global { interface Window { szGameStorage?: GameStorage } }
/** Record belongs to this project/profile in Studio, and this URL in a standalone export. */
export function createProgress(ui: GameUI, kit: string) {
  const storage: GameStorage = window.szGameStorage ?? {
    async get(key) { return localStorage.getItem(location.pathname + ':' + key) },
    async set(key,value) { localStorage.setItem(location.pathname + ':' + key,value) },
  }
  const key = 'kit:' + kit + ':v1'
  let disposed = false, best = 0, wins = 0, available = true, loaded = false, pending = 0
  const show = () => {
    if (disposed) return
    if (!available) { ui.record('Não foi possível guardar o recorde neste aparelho.'); return }
    const confirmed = loaded ? 'Neste aparelho · Recorde: ' + best + ' · Vitórias: ' + wins : 'Carregando recorde deste aparelho…'
    ui.record(confirmed + (pending ? ' · Guardando resultado…' : ''))
  }
  show()
  // A malformed or incompatible save is unavailable, not a confirmed zero record.
  let queue = Promise.resolve().then(() => storage.get(key)).then(raw => {
    if (disposed) return
    if (raw !== null) {
      const saved = JSON.parse(raw)
      if (!saved || saved.version !== 1 || !Number.isSafeInteger(saved.best) || saved.best < 0 || saved.best > 10000000 || !Number.isSafeInteger(saved.wins) || saved.wins < 0 || saved.wins > 10000000) throw new Error('Recorde inválido.')
      best = saved.best; wins = saved.wins
    }
    loaded = true
  }).catch(() => { available = false }).then(show)
  const off = ui.onResult((won,score) => {
    if (disposed || !available) return
    pending++; show()
    queue = queue.then(async () => {
      if (disposed || !available) return
      if (!Number.isFinite(score)) throw new Error('Pontuação inválida.')
      const nextBest = Math.max(best,Math.min(10000000,Math.max(0,Math.floor(score))))
      const nextWins = Math.min(10000000,wins + Number(won))
      await storage.set(key,JSON.stringify({ version: 1, best: nextBest, wins: nextWins }))
      if (!disposed) { best = nextBest; wins = nextWins }
    }).catch(() => { available = false }).then(() => { pending--; show() })
  })
  return () => { disposed = true; off() }
}
`,
  'src/style.css': `
:root { font-family: system-ui, sans-serif; color: #effaf6; background: #12212b; color-scheme: dark; }
* { box-sizing: border-box; } body { margin: 0; } button { font: inherit; min-height: 44px; min-width: 44px; border: 1px solid #73969a; border-radius: 12px; padding: .6rem 1rem; background: #243e4a; color: #fff; cursor: pointer; touch-action: none; }
button:focus-visible, canvas:focus-visible { outline: 3px solid #ffdf72; outline-offset: 3px; } button:hover { background: #34545e; } button:disabled { opacity: .5; cursor: default; }
#app { max-width: 1100px; margin: auto; padding: 12px; } header, nav, #controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; } h1 { font-size: clamp(1.1rem, 3vw, 1.7rem); margin: 0 auto 0 0; } #status { min-height: 1.5em; } #stage { position: relative; width: 100%; aspect-ratio: 16/9; max-height: 65vh; background: #162c3a; overflow: hidden; border: 2px solid #73969a; border-radius: 16px; } #stage canvas { display: block; width: 100%; height: 100%; object-fit: contain; }
#controls { justify-content: center; margin-top: 10px; } #instructions { line-height: 1.5; font-size: .9rem; } #hud { font-variant-numeric: tabular-nums; } [hidden] { display: none !important; } .note { color: #c5dddd; }
@media (max-width: 540px) { #app { padding: 8px; } button { padding: .5rem .7rem; } #stage { min-height: 240px; aspect-ratio: 4/3; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
`,
  'src/ui.ts': `
import './style.css'
export type Phase = 'menu' | 'playing' | 'paused' | 'won' | 'lost'
export type Readiness = 'loading' | 'ready' | 'error'
export function createUI(title: string, instructions: string, options: { readiness?: Readiness } = {}) {
  const root = document.querySelector<HTMLElement>('#app')!
  root.innerHTML = '<header><h1></h1><nav aria-label="Partida"><button id="start" disabled>Começar</button><button id="pause" disabled>Pausar</button><button id="restart" disabled>Reiniciar</button><button id="menu" disabled>Voltar ao menu</button><button id="retry" hidden>Tentar novamente</button><button id="sound" aria-pressed="false">Som: desligado</button></nav></header><p id="status" role="status" aria-live="polite"></p><p id="hud" aria-live="off"></p><p id="record" class="note"></p><div id="stage"></div><div id="controls" role="group" aria-label="Controles do jogo"></div><p id="instructions"></p>'
  root.querySelector('h1')!.textContent = title
  root.querySelector('#instructions')!.textContent = instructions
  document.title = title
  const stage = root.querySelector<HTMLElement>('#stage')!
  const start = root.querySelector<HTMLButtonElement>('#start')!
  const pause = root.querySelector<HTMLButtonElement>('#pause')!
  const restart = root.querySelector<HTMLButtonElement>('#restart')!
  const menuButton = root.querySelector<HTMLButtonElement>('#menu')!
  const retryButton = root.querySelector<HTMLButtonElement>('#retry')!
  const status = root.querySelector<HTMLElement>('#status')!
  const sound = root.querySelector<HTMLButtonElement>('#sound')!
  const hud = root.querySelector<HTMLElement>('#hud')!
  const record = root.querySelector<HTMLElement>('#record')!
  const qualityButton = document.createElement('button'); qualityButton.type = 'button'; qualityButton.textContent = 'Efeitos: completos'; qualityButton.setAttribute('aria-pressed','false'); root.querySelector('nav')!.append(qualityButton)
  let reducedQuality = false
  const qualityListeners = new Set<() => void>()
  const motionListeners = new Set<() => void>()
  const soundListeners = new Set<(enabled: boolean) => void>()
  const listeners = new Set<(phase: Phase) => void>()
  const results = new Set<(won: boolean, score: number) => void>()
  const controller = new AbortController()
  qualityButton.addEventListener('click', () => { reducedQuality = !reducedQuality; qualityButton.textContent = reducedQuality ? 'Efeitos: econômicos' : 'Efeitos: completos'; qualityButton.setAttribute('aria-pressed',String(reducedQuality)); for (const callback of qualityListeners) callback() }, { signal: controller.signal })
  let phase: Phase = 'menu'
  let readiness: Readiness = options.readiness ?? 'ready'
  let disposed = false, hasReset = false
  let reset: (reason: 'start' | 'restart') => void = () => {}
  let retry: (() => void) | undefined
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  let reducedMotion = motion?.matches ?? false
  const motionChanged = () => { if (disposed) return; reducedMotion = motion?.matches ?? false; for (const callback of motionListeners) callback() }
  motion?.addEventListener('change', motionChanged)
  let audio: AudioContext | undefined
  let muted = true, soundUnavailable = false, soundRevision = 0, lastTone = -Infinity
  let hostMuted = (window as Window & { szStudioHost?: { muted: boolean } }).szStudioHost?.muted ?? false
  const voices = new Map<OscillatorNode, GainNode>()
  const releaseVoice = (oscillator: OscillatorNode) => {
    const gain = voices.get(oscillator)
    if (!gain) return
    voices.delete(oscillator); oscillator.onended = null; oscillator.disconnect(); gain.disconnect()
  }
  const stopSound = () => { for (const oscillator of voices.keys()) { try { oscillator.stop() } catch { /* Already ended. */ } releaseVoice(oscillator) } }
  const showSound = () => {
    sound.setAttribute('aria-pressed', String(!muted && !hostMuted))
    sound.textContent = hostMuted ? 'Som: silenciado pelo player' : soundUnavailable ? 'Som: indisponível' : muted ? 'Som: desligado' : 'Som: ligado'
    sound.disabled = hostMuted
    for (const callback of soundListeners) callback(!muted && !hostMuted)
  }
  window.addEventListener('studio:host-audio', () => {
    if (disposed) return
    hostMuted = (window as Window & { szStudioHost?: { muted: boolean } }).szStudioHost?.muted ?? false
    if (hostMuted) stopSound()
    showSound()
  }, { signal: controller.signal })
  showSound()
  const sync = () => {
    start.textContent = phase === 'paused' ? 'Continuar' : 'Começar'
    start.hidden = phase === 'playing'
    start.disabled = !hasReset || readiness !== 'ready'
    pause.disabled = phase !== 'playing'
    restart.disabled = phase === 'menu' || !hasReset || readiness !== 'ready'
    menuButton.disabled = phase === 'menu'
    retryButton.hidden = readiness !== 'error' || !retry
  }
  const change = (next: Phase, message: string) => {
    if (disposed) return
    phase = next; status.textContent = message; sync()
    if (next !== 'playing') stopSound()
    for (const listener of listeners) listener(next)
    if (next === 'paused' || next === 'menu') start.focus()
    if (next === 'won' || next === 'lost') restart.focus()
  }
  const begin = () => { if (disposed || !hasReset || readiness !== 'ready' || phase === 'playing') return; if (phase !== 'paused') reset('start'); change('playing', 'Partida em andamento.'); stage.querySelector('canvas')?.focus() }
  const suspend = () => { if (phase === 'playing') change('paused', 'Partida pausada. Continue quando quiser.') }
  const menu = () => { change('menu', readiness === 'ready' ? 'Pronto para começar.' : readiness === 'loading' ? 'Carregando jogo…' : 'Não foi possível preparar o jogo.') }
  const setReadiness = (state: Readiness, message?: string, again?: () => void) => {
    if (disposed) return
    if (state !== 'ready') suspend()
    readiness = state; retry = state === 'error' ? again : undefined; sync()
    status.textContent = message ?? (state === 'loading' ? 'Carregando jogo…' : state === 'error' ? 'Não foi possível preparar o jogo.' : phase === 'paused' ? 'Partida pausada. Continue quando quiser.' : 'Pronto para começar.')
    if (state === 'error' && retry) retryButton.focus()
    if (state === 'ready' && phase === 'menu' && hasReset) start.focus()
  }
  start.addEventListener('click', begin, { signal: controller.signal })
  pause.addEventListener('click', suspend, { signal: controller.signal })
  restart.addEventListener('click', () => { if (disposed || !hasReset || readiness !== 'ready' || phase === 'menu') return; stopSound(); reset('restart'); change('playing', 'Nova partida.'); stage.querySelector('canvas')?.focus() }, { signal: controller.signal })
  menuButton.addEventListener('click', menu, { signal: controller.signal })
  retryButton.addEventListener('click', () => { if (disposed || readiness !== 'error' || !retry) return; const again = retry; setReadiness('loading'); again() }, { signal: controller.signal })
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend() }, { signal: controller.signal })
  window.addEventListener('blur', suspend, { signal: controller.signal })
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape') suspend()
    if (event.code === 'Enter' && !(event.target instanceof HTMLElement && event.target.closest('button,input,textarea,select,[contenteditable]'))) begin()
  }, { signal: controller.signal })
  sound.addEventListener('click', () => {
    if (hostMuted) return
    const revision = ++soundRevision
    muted = !muted; soundUnavailable = false
    if (muted) stopSound()
    else {
      const fail = () => { if (disposed || revision !== soundRevision) return; muted = true; soundUnavailable = true; stopSound(); showSound() }
      try { audio ??= new AudioContext(); void audio.resume().catch(fail) } catch { fail() }
    }
    showSound()
  }, { signal: controller.signal })
  setReadiness(readiness)
  return {
    stage, controls: root.querySelector<HTMLElement>('#controls')!, get phase() { return phase },
    get readiness() { return readiness }, setReadiness,
    get reducedQuality() { return reducedQuality },
    get reducedMotion() { return reducedMotion },
    get soundEnabled() { return !muted && !hostMuted },
    onSound(callback: (enabled: boolean) => void) { soundListeners.add(callback); return () => { soundListeners.delete(callback) } },
    onQuality(callback: () => void) { qualityListeners.add(callback); return () => { qualityListeners.delete(callback) } },
    onMotion(callback: () => void) { motionListeners.add(callback); return () => { motionListeners.delete(callback) } },
    pause: suspend, menu, stopSound,
    onReset(callback: (reason: 'start' | 'restart') => void) { if (disposed) return; reset = callback; hasReset = true; sync() },
    note(text: string) { if (!disposed) status.textContent = text },
    onPhase(callback: (phase: Phase) => void) { listeners.add(callback); return () => { listeners.delete(callback) } },
    hud(text: string) { if (!disposed && hud.textContent !== text) hud.textContent = text },
    onResult(callback: (won: boolean, score: number) => void) { results.add(callback); return () => { results.delete(callback) } },
    record(text: string) { if (!disposed) record.textContent = text },
    finish(won: boolean, text: string, score = 0) { if (!disposed && phase === 'playing') { change(won ? 'won' : 'lost', text); for (const callback of results) callback(won,score) } },
    tone(frequency = 660) {
      if (disposed || muted || hostMuted || !audio || readiness !== 'ready' || phase === 'paused' || phase === 'menu' || audio.state !== 'running' || audio.currentTime - lastTone < .07 || voices.size >= 8 || !Number.isFinite(frequency) || frequency <= 0) return
      lastTone = audio.currentTime
      const oscillator = audio.createOscillator(), gain = audio.createGain()
      voices.set(oscillator,gain)
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.06, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12)
      oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .13)
      oscillator.onended = () => { releaseVoice(oscillator) }
    },
    destroy() { if (disposed) return; disposed = true; soundRevision++; controller.abort(); motion?.removeEventListener('change', motionChanged); listeners.clear(); results.clear(); qualityListeners.clear(); motionListeners.clear(); soundListeners.clear(); stopSound(); if (audio) void audio.close().catch(() => {}); root.replaceChildren() },
  }
}
export type GameUI = ReturnType<typeof createUI>
`,
  'src/input.ts': `
export type Action = 'left' | 'right' | 'up' | 'down' | 'action'
const bindings: Record<string, Action> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'action' }
export function createInput(controls: HTMLElement, enabled: () => boolean, labels: Partial<Record<Action, string>> = { left: '← Esquerda', right: 'Direita →', up: '↑ Cima', down: '↓ Baixo', action: 'Ação' }) {
  const held = new Map<string, Action>(), physical = new Map<string, Action>(), blocked = new Set<string>(), edges = new Set<Action>(), allowed = new Set(Object.keys(labels))
  let disposed = false
  const abort = new AbortController()
  const options = { signal: abort.signal }
  const active = (action: Action) => { for (const value of held.values()) if (value === action) return true; return false }
  const release = (source: string) => { held.delete(source); physical.delete(source); blocked.delete(source) }
  const press = (source: string, action: Action, newGesture = false) => {
    if (disposed || !allowed.has(action)) return
    physical.set(source, action)
    if (newGesture) blocked.delete(source)
    if (!enabled()) { blocked.add(source); return }
    if (blocked.has(source) || held.has(source)) return
    const alreadyDown = active(action)
    held.set(source, action)
    if (!alreadyDown) edges.add(action)
  }
  const readPad = () => {
    const next = new Map<string, Action>()
    let pads: readonly (Gamepad | null)[] = []
    try { pads = navigator.getGamepads?.() ?? [] } catch { /* Embedded browsers can disable gamepads. */ }
    const pad = pads.find(value => value?.connected)
    if (!pad) return next
    const add = (action: Action) => { if (allowed.has(action)) next.set('gamepad:' + (pad.index ?? 0) + ':' + action, action) }
    const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0
    if (x < -.25 || pad.buttons[14]?.pressed) add('left')
    if (x > .25 || pad.buttons[15]?.pressed) add('right')
    if (y < -.25 || pad.buttons[12]?.pressed) add('up')
    if (y > .25 || pad.buttons[13]?.pressed) add('down')
    if (pad.buttons[0]?.pressed) add('action')
    return next
  }
  const clear = () => {
    // Sample even with no active RAF so a gamepad held during pause needs neutral first.
    for (const [source, action] of readPad()) physical.set(source, action)
    for (const source of physical.keys()) blocked.add(source)
    held.clear(); edges.clear()
  }
  const editable = (target: EventTarget | null) => target instanceof HTMLElement && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable || !!target.closest('[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]'))
  window.addEventListener('keydown', e => {
    const action = bindings[e.code]
    if (!action || !allowed.has(action) || editable(e.target) || e.altKey || e.ctrlKey || e.metaKey) return
    if (e.code === 'Space' && e.target instanceof HTMLButtonElement) return
    if (enabled()) e.preventDefault()
    // A fresh keydown rearms after a keyup lost while this tab lacked focus; repeats never do.
    if (!e.repeat) press('key:' + e.code, action, true)
  }, options)
  window.addEventListener('keyup', e => { release('key:' + e.code) }, options)
  window.addEventListener('blur', clear, options)
  document.addEventListener('visibilitychange', clear, options)
  for (const action of Object.keys(labels) as Action[]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = labels[action] ?? action; button.dataset.action = action
    button.addEventListener('pointerdown', event => { if (!enabled()) return; event.preventDefault(); button.setPointerCapture(event.pointerId); press('pointer:' + event.pointerId, action, true) }, options)
    const releasePointer = (event: PointerEvent) => { release('pointer:' + event.pointerId) }
    button.addEventListener('pointerup', releasePointer, options); button.addEventListener('pointercancel', releasePointer, options); button.addEventListener('lostpointercapture', releasePointer, options)
    button.addEventListener('keydown', event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); if (!event.repeat) press('button:' + action + ':' + event.code, action, true) } }, options)
    button.addEventListener('keyup', event => { release('button:' + action + ':' + event.code) }, options)
    button.addEventListener('blur', () => { release('button:' + action + ':Enter'); release('button:' + action + ':Space') }, options)
    controls.append(button)
  }
  return {
    clear,
    down(action: Action) { return !disposed && enabled() && active(action) },
    take(action: Action) { const pressed = edges.delete(action); return !disposed && enabled() && pressed },
    poll() {
      if (disposed) return
      const next = readPad()
      for (const source of physical.keys()) { if (source.startsWith('gamepad:') && !next.has(source)) release(source) }
      for (const [source, action] of next) press(source, action)
    },
    destroy() { if (disposed) return; disposed = true; abort.abort(); held.clear(); physical.clear(); blocked.clear(); edges.clear(); controls.replaceChildren() },
  }
}
export type GameInput = ReturnType<typeof createInput>
`,
  'src/lifecycle.ts': `
/** One RAF owner. Hidden tabs cancel the loop; elapsed background time is discarded. */
export function frameLoop(frame: (seconds: number) => void, active: () => boolean = () => true, options: { onDiscard?: (seconds: number) => void } = {}) {
  let id = 0, previous: number | undefined, disposed = false
  function request() { if (!id && !disposed && !document.hidden) id = requestAnimationFrame(tick) }
  function tick(now: number) {
    id = 0
    if (disposed || document.hidden) return
    const elapsed = previous === undefined ? 0 : Math.max(0, (now - previous) / 1000)
    const dt = Math.min(.05, elapsed)
    if (elapsed > dt) options.onDiscard?.(elapsed - dt)
    previous = now; frame(dt)
    if (active()) request(); else previous = undefined
  }
  function visibility() { cancelAnimationFrame(id); id = 0; previous = undefined; request() }
  document.addEventListener('visibilitychange', visibility)
  request()
  return { request, dispose() { disposed = true; cancelAnimationFrame(id); document.removeEventListener('visibilitychange', visibility) } }
}
/** Read-only observer shared by playtests and performance tools; never exposes game mutations. */
export function exposeGameInspection(game: import('./contracts').GameController) {
  const target = window as unknown as { __studioGame?: { version: 1; inspect: typeof game.inspect } }
  const observer = Object.freeze({ version: 1 as const, inspect: () => game.inspect() })
  target.__studioGame = observer
  return () => { if (target.__studioGame === observer) delete target.__studioGame }
}
export function manageLifetime(dispose: () => void) {
  let disposed = false
  const once = () => { if (disposed) return; disposed = true; window.removeEventListener('pagehide', onHide); dispose() }
  const onHide = (event: PageTransitionEvent) => { if (!event.persisted) once() }
  window.addEventListener('pagehide', onHide)
  if (import.meta.hot) import.meta.hot.dispose(once)
  return once
}
`,
}
