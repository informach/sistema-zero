import type { ArenaAssets, LoadedCharacter } from '../assets'
import type { AnimationState, CharacterRole } from '../characters'
import type { ArenaActor, ArenaEvent, ArenaState } from '../model'
import { advanceAnimation, frameRect } from './animation'
import { createEffects, type VisualPreferences } from './particles'

export interface RenderOptions extends VisualPreferences {
  phase?: 'menu' | 'playing' | 'paused' | 'won' | 'lost'
  debugHitboxes?: boolean
}

/** Owns a canvas/observer, never RAF. The shared lifecycle decides when to draw. */
export function createCanvasRenderer(
  stage: HTMLElement,
  assets: ArenaAssets,
  options: { onInvalidate?: () => void } = {},
) {
  const canvas = document.createElement('canvas')
  canvas.tabIndex = 0
  canvas.setAttribute(
    'aria-label',
    'Arena dos Guardiões. Controles e objetivos estão descritos abaixo do jogo.',
  )
  canvas.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;touch-action:none'
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Este navegador não conseguiu abrir o Canvas 2D.')
  const ctx = context
  stage.append(canvas)
  const oldRatio = stage.style.aspectRatio
  stage.style.aspectRatio = '4 / 3'
  const effects = createEffects()
  let disposed = false,
    width = 720,
    height = 540,
    scale = 1,
    left = 0,
    top = 0
  let pixelWidth = 0,
    pixelHeight = 0,
    lastDpr = 0,
    drawCalls = 0
  let lastPhase: RenderOptions['phase'] = 'menu'
  let previousTick = -1
  let visualSeconds = 0
  let finalAnimationUntil = 0
  const animationStates = new Map<
    number,
    { state: AnimationState; start: number; visualStart: number }
  >()

  function resize() {
    if (disposed) return
    const rect = stage.getBoundingClientRect()
    const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))
    const cssWidth = Math.max(1, Math.min(2200, rect.width || 720))
    const cssHeight = Math.max(1, Math.min(1800, rect.height || (cssWidth * 3) / 4))
    const nextWidth = Math.max(1, Math.round(cssWidth * dpr)),
      nextHeight = Math.max(1, Math.round(cssHeight * dpr))
    if (pixelWidth === nextWidth && pixelHeight === nextHeight && lastDpr === dpr) return
    pixelWidth = nextWidth
    pixelHeight = nextHeight
    lastDpr = dpr
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    ctx.imageSmoothingEnabled = false
    options.onInvalidate?.()
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined
  observer?.observe(stage)
  window.addEventListener('resize', resize)
  resize()

  function sprite(
    role: CharacterRole,
    x: number,
    y: number,
    state: AnimationState,
    elapsed: number,
    flip: boolean,
    alpha = 1,
  ) {
    const character: LoadedCharacter = assets.roles[role]
    const animation = character.sprite?.animations.find(
      (item) => item.name === character.binding.animations[state],
    )
    const frame = animation
      ? advanceAnimation(state === 'death' ? { ...animation, loop: false } : animation, elapsed)
          .frame
      : 0
    const crop = frameRect(character.sprite, character.width, character.height, frame)
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
    ctx.translate(x, y)
    if (flip) ctx.scale(-1, 1)
    const w = character.binding.displayWidth,
      h = character.binding.displayHeight
    ctx.drawImage(character.image, crop.x, crop.y, crop.width, crop.height, -w / 2, -h / 2, w, h)
    drawCalls++
    ctx.restore()
  }
  function actor(actor: ArenaActor, state: ArenaState, preferences: RenderOptions) {
    const next: AnimationState =
      actor.health <= 0
        ? 'death'
        : actor.hitUntilTick > state.tick
          ? 'hurt'
          : actor.moving
            ? 'walk'
            : 'idle'
    let timing = animationStates.get(actor.id)
    if (!timing || timing.state !== next) {
      timing = { state: next, start: state.tick, visualStart: visualSeconds }
      animationStates.set(actor.id, timing)
      if (next === 'death') finalAnimationUntil = visualSeconds + 1
    }
    // Invulnerability uses a steady outline, not flashing, including reduced-motion mode.
    if (actor.kind === 'player') {
      ctx.strokeStyle = actor.invulnerableUntilTick > state.tick ? '#ffffff' : '#75d9a8'
      ctx.lineWidth = actor.invulnerableUntilTick > state.tick ? 3 : 1.5
      ctx.beginPath()
      ctx.ellipse(actor.x, actor.y + 15, 21, 10, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    const death = assets.roles[actor.kind].sprite?.animations.find(
      (item) => item.name === assets.roles[actor.kind].binding.animations.death,
    )
    const deathDuration = death ? (death.to - death.from + 1) / death.fps : 0
    const elapsed =
      next === 'death'
        ? (visualSeconds - timing.visualStart) * Math.max(1, deathDuration)
        : (state.tick - timing.start) / 60
    sprite(actor.kind, actor.x, actor.y, next, elapsed, actor.facingX < 0)
    if (actor.kind !== 'player' && actor.health < actor.maxHealth) {
      ctx.fillStyle = '#182936'
      ctx.fillRect(actor.x - 13, actor.y - 28, 26, 4)
      ctx.fillStyle = '#ffe1a2'
      ctx.fillRect(actor.x - 13, actor.y - 28, (26 * actor.health) / actor.maxHealth, 4)
    }
    if (preferences.debugHitboxes) {
      const box = actor.body
      const x = actor.x + (actor.facingX < 0 ? -box.offsetX - box.width : box.offsetX)
      ctx.strokeStyle = '#ffdf72'
      ctx.lineWidth = 1
      ctx.strokeRect(x, actor.y + box.offsetY, box.width, box.height)
    }
  }
  function background() {
    ctx.fillStyle = '#102b2d'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#21473f'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    // Quiet floor motifs make movement legible without another texture or animation.
    ctx.fillStyle = '#2e5649'
    for (let y = 24; y < height; y += 96)
      for (let x = 24; x < width; x += 96) {
        ctx.fillRect(x - 2, y, 4, 9)
        ctx.fillRect(x - 7, y - 3, 5, 4)
        ctx.fillRect(x + 2, y - 5, 5, 4)
      }
    ctx.strokeStyle = '#669d7c'
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, width - 6, height - 6)
    ctx.strokeStyle = '#abc29a'
    ctx.lineWidth = 2
    ctx.strokeRect(11, 11, width - 22, height - 22)
  }
  return {
    canvas,
    draw(state: ArenaState, preferences: RenderOptions, events: readonly ArenaEvent[] = []) {
      if (disposed) return
      if (state.tick < previousTick || (preferences.phase === 'menu' && lastPhase !== 'menu')) {
        effects.reset()
        animationStates.clear()
        finalAnimationUntil = 0
      }
      previousTick = state.tick
      lastPhase = preferences.phase
      width = state.config.width
      height = state.config.height
      resize()
      scale = Math.min(pixelWidth / width, pixelHeight / height)
      left = (pixelWidth - width * scale) / 2
      top = (pixelHeight - height * scale) / 2
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, pixelWidth, pixelHeight)
      ctx.fillStyle = '#0c1c23'
      ctx.fillRect(0, 0, pixelWidth, pixelHeight)
      ctx.setTransform(scale, 0, 0, scale, left, top)
      ctx.imageSmoothingEnabled = false
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width, height)
      ctx.clip()
      drawCalls = 0
      background()
      effects.add(events, preferences)
      // Stable floor order is only presentation; never reorder the model's entities.
      const liveIds = new Set([state.player.id, ...state.enemies.map((enemy) => enemy.id)])
      for (const id of animationStates.keys()) if (!liveIds.has(id)) animationStates.delete(id)
      const actors = [state.player, ...state.enemies].sort((a, b) => a.y - b.y || a.id - b.id)
      for (const value of actors) actor(value, state, preferences)
      for (const effect of effects.list) {
        const remaining = Math.max(0, 1 - effect.age / effect.duration)
        if (effect.kind === 'death' && effect.role)
          sprite(effect.role, effect.x, effect.y, 'death', effect.age, false, remaining)
        else if (effect.kind === 'ring') {
          const radius = preferences.reducedMotion
            ? effect.radius
            : effect.radius * (0.35 + 0.65 * (1 - remaining))
          ctx.globalAlpha = preferences.reducedMotion ? 0.65 : remaining
          ctx.strokeStyle = effect.color
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        } else if (!preferences.reducedMotion) {
          ctx.globalAlpha = remaining
          ctx.fillStyle = effect.color
          ctx.fillRect(
            effect.x - effect.radius / 2,
            effect.y - effect.radius / 2,
            effect.radius,
            effect.radius,
          )
          ctx.globalAlpha = 1
        }
      }
      if (preferences.phase === 'menu' || preferences.phase === 'paused') {
        ctx.fillStyle = '#0b1c2766'
        ctx.fillRect(0, 0, width, height)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#f1f5d9'
        ctx.font = 'bold 26px system-ui, sans-serif'
        ctx.fillText(
          preferences.phase === 'menu' ? 'Proteja o jardim' : 'Partida pausada',
          width / 2,
          height / 2 - 45,
        )
        ctx.font = '16px system-ui, sans-serif'
        ctx.fillStyle = '#d4e6ce'
        ctx.fillText(
          preferences.phase === 'menu'
            ? 'Mova-se e use o pulso para abrir caminho.'
            : 'Seu jardim espera por você.',
          width / 2,
          height / 2 - 15,
        )
      }
      ctx.restore()
    },
    advanceVisual(seconds: number) {
      if (!disposed) {
        visualSeconds += Number.isFinite(seconds) ? Math.max(0, Math.min(0.05, seconds)) : 0
        effects.advance(seconds)
      }
    },
    hasEffects() {
      return !disposed && (effects.list.length > 0 || visualSeconds < finalAnimationUntil)
    },
    resetEffects() {
      effects.reset()
      animationStates.clear()
      previousTick = -1
      visualSeconds = 0
      finalAnimationUntil = 0
    },
    inspect() {
      return {
        drawCalls,
        effects: effects.list.length,
        textures: disposed
          ? 0
          : new Set(Object.values(assets.roles).map((role) => role.image)).size,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      effects.reset()
      animationStates.clear()
      canvas.remove()
      canvas.width = 1
      canvas.height = 1
      stage.style.aspectRatio = oldRatio
      // ArenaAssets owns decoded images; controller disposes it after the renderer.
    },
  }
}
