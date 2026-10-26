// Host-side navigation sends real keyboard input; it never changes learner variables or sprites.
import { createClickTargetReaderInPage } from './check-click-target.mjs'

const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
/** Bounded breadth-first route for an actor's contact centre, respecting current raw sprite edges. */
export function planApproach(actor, target, avoid = []) {
  const cell = 8,
    width = actor.width,
    height = actor.height
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > 4000 ||
    height > 4000
  )
    throw Error('Palco fora dos limites da navegação.')
  const from = center(actor),
    to = center(target)
  const ox = from.x - actor.rawX,
    oy = from.y - actor.rawY
  to.x = Math.max(ox, Math.min(width - (actor.rawW - ox), to.x))
  to.y = Math.max(oy, Math.min(height - (actor.rawH - oy), to.y))
  if (!overlaps({ x: to.x - actor.w / 2, y: to.y - actor.h / 2, w: actor.w, h: actor.h }, target))
    throw Error('O alvo não pode ser alcançado dentro da tela.')
  const cols = Math.ceil(width / cell) + 1,
    rows = Math.ceil(height / cell) + 1
  if (cols * rows > 260000) throw Error('A navegação excedeu os limites do palco.')
  const start = { x: Math.round(from.x / cell), y: Math.round(from.y / cell) }
  const key = (x, y) => y * cols + x
  const queue = [start],
    parent = new Map([[key(start.x, start.y), null]])
  const offsetX = from.x - actor.rawX,
    offsetY = from.y - actor.rawY
  const fits = (x, y) =>
    x - offsetX >= 0 &&
    y - offsetY >= 0 &&
    x - offsetX + actor.rawW <= width &&
    y - offsetY + actor.rawH <= height &&
    !avoid.some((b) =>
      overlaps(
        { x: x - actor.w / 2 - 3, y: y - actor.h / 2 - 3, w: actor.w + 6, h: actor.h + 6 },
        b,
      ),
    )
  let end = null
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      x = p.x * cell,
      y = p.y * cell
    if (Math.abs(x - to.x) <= cell && Math.abs(y - to.y) <= cell) {
      end = p
      break
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = p.x + dx,
        ny = p.y + dy,
        k = key(nx, ny)
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= cols ||
        ny >= rows ||
        parent.has(k) ||
        !fits(nx * cell, ny * cell)
      )
        continue
      parent.set(k, p)
      queue.push({ x: nx, y: ny })
    }
  }
  if (!end) throw Error('Não há um caminho observável entre o personagem e o alvo.')
  const points = [to]
  for (let p = end; p; p = parent.get(key(p.x, p.y))) points.push({ x: p.x * cell, y: p.y * cell })
  points.reverse()
  points[0] = from
  // Keep turns; a straight corridor does not need a keyboard round trip for every grid cell.
  const turns = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1]
    if ((b.x - a.x) * (c.y - b.y) !== (b.y - a.y) * (c.x - b.x)) turns.push(b)
  }
  turns.push(to)
  return turns
}
export async function approachSprite(
  probe,
  page,
  { scope, actorPath, targetPath, avoidPaths = [], timeoutMs },
) {
  const handles = []
  const reader = async (path) => {
    const handle = await probe.handle(createClickTargetReaderInPage, { scope, maxGroupItems: 64 })
    handles.push(handle)
    return { handle, initial: await handle.bounds(path) }
  }
  try {
    const actor = await reader(actorPath),
      target = await reader(targetPath)
    if (actor.initial.destroyed) throw Error('O personagem não está mais disponível neste teste.')
    // A key already collected at the spawn is still a real encounter, not a missing-input failure.
    if (target.initial.destroyed) return
    const obstacles = []
    for (const path of avoidPaths) {
      const item = await reader(path)
      if (!item.initial.destroyed) obstacles.push(item.initial)
    }
    const route = planApproach(actor.initial, target.initial, obstacles)
    const deadline = Date.now() + timeoutMs
    let current = actor.initial,
      lastKey = null
    const release = async () => {
      if (lastKey) {
        const key = lastKey
        lastKey = null
        await page.keyboard.up(key)
      }
    }
    try {
      for (const point of route.slice(1)) {
        while (Date.now() < deadline) {
          const c = center(current),
            dx = point.x - c.x,
            dy = point.y - c.y
          if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) break
          const key =
            Math.abs(dx) > 3
              ? dx > 0
                ? 'ArrowRight'
                : 'ArrowLeft'
              : dy > 0
                ? 'ArrowDown'
                : 'ArrowUp'
          if (lastKey !== key) {
            await release()
            await page.keyboard.down(key)
            lastKey = key
          }
          await page.waitForTimeout(16)
          const next = await actor.handle.bounds(actorPath)
          if (
            next.destroyed ||
            next.paused ||
            next.errors !== actor.initial.errors ||
            next.generation !== actor.initial.generation ||
            next.width !== actor.initial.width ||
            next.height !== actor.initial.height
          )
            throw Error('O jogo mudou ou parou durante o deslocamento.')
          current = next
        }
        if (Date.now() >= deadline)
          throw Error('O personagem não chegou ao alvo dentro do tempo do teste.')
        await release()
      }
      await page.waitForTimeout(80)
    } finally {
      await release()
    }
  } finally {
    await Promise.all(handles.map((h) => h.dispose()))
  }
}
