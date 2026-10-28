// Host-only planning. Reads bounded numeric properties and sends actual keyboard events.
// Walkable rectangles describe the authored floor, never a learner's key position.
import { createExecutionObservationCodec } from './execution-observation.generated.mjs'
export class NavigationBlocked extends Error {}
// A leg longer than this is walked holding the arrow; the last stretch goes in pulses.
const CRUISE_MIN = 1.2
// Pause between position reads while the arrow is held (the read itself waits for a frame).
const CRUISE_POLL_MS = 20
export function planApproach3d(actor, target, walkable, avoid = []) {
  const unit = 0.25,
    margin = 0.12
  const onFloor = (x, z) =>
    walkable.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)
  // Leave room for real frame/input latency at edges, including rectangle junctions.
  const inside = (x, z) =>
    [-0.25, 0, 0.25].every((dx) => [-0.25, 0, 0.25].every((dz) => onFloor(x + dx, z + dz)))
  const hit = (x, z, b, pad = 0) =>
    Math.abs(x - b.x) <= actor.hw + b.hw + pad && Math.abs(z - b.z) <= actor.hd + b.hd + pad
  if (Math.abs(actor.y - target.y) > actor.hh + target.hh)
    throw Error('O alvo está fora da altura alcançada pelo personagem.')
  const xs = walkable.flatMap((r) => [r.minX, r.maxX]),
    zs = walkable.flatMap((r) => [r.minZ, r.maxZ])
  const minX = Math.min(...xs),
    minZ = Math.min(...zs),
    cols = Math.ceil((Math.max(...xs) - minX) / unit) + 1,
    rows = Math.ceil((Math.max(...zs) - minZ) / unit) + 1
  if (cols * rows > 40000) throw Error('A área de navegação 3D excedeu o limite.')
  const point = (c, r) => ({ x: minX + c * unit, z: minZ + r * unit })
  const origin = { c: Math.round((actor.x - minX) / unit), r: Math.round((actor.z - minZ) / unit) }
  const key = (c, r) => r * cols + c,
    queue = [origin],
    parents = new Map([[key(origin.c, origin.r), null]])
  let end
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i],
      p = point(q.c, q.r)
    if (hit(p.x, p.z, target, -0.25)) {
      end = q
      break
    }
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = q.c + dc,
        r = q.r + dr,
        k = key(c, r),
        v = point(c, r)
      if (
        c < 0 ||
        r < 0 ||
        c >= cols ||
        r >= rows ||
        parents.has(k) ||
        !inside(v.x, v.z) ||
        avoid.some((b) => hit(v.x, v.z, b, margin))
      )
        continue
      parents.set(k, q)
      queue.push({ c, r })
    }
  }
  if (!end) throw Error('Não há um caminho no chão até o alvo sem recolher os objetos a evitar.')
  const path = []
  for (let q = end; q; q = parents.get(key(q.c, q.r))) path.push(point(q.c, q.r))
  path.reverse()
  path[0] = { x: actor.x, z: actor.z }
  const turns = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1],
      b = path[i],
      c = path[i + 1]
    if ((b.x - a.x) * (c.z - b.z) !== (b.z - a.z) * (c.x - b.x)) turns.push(b)
  }
  if (path.length > 1) turns.push(path.at(-1))
  return turns
}

export async function approachObject3d(page, step, readMany) {
  const codec = createExecutionObservationCodec()
  const numbers = async (paths) => {
    // Uma leitura atômica: coordenadas do mesmo quadro, sem acumular viagens CDP por eixo.
    const results = await readMany(paths)
    if (!Array.isArray(results) || results.length !== paths.length)
      throw Error('Observação 3D incompleta.')
    return results.map((r) => {
      const value = r.found ? codec.decode(r.value) : undefined
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw Error('Posição ou área de contato 3D indisponível.')
      return value
    })
  }
  const geometry = async (path) => {
    const values = await numbers(
      [
        'position.x',
        'position.y',
        'position.z',
        'userData.sz.hw',
        'userData.sz.hh',
        'userData.sz.hd',
      ].map((p) => `${path}.${p}`),
    )
    const [x, y, z, hw, hh, hd] = values
    if ([x, y, z].some((v) => Math.abs(v) > 1000) || [hw, hh, hd].some((v) => v <= 0 || v > 100))
      throw Error('Geometria fora dos limites da navegação 3D.')
    return { x, y, z, hw, hh, hd }
  }
  const actor = await geometry(step.actorPath),
    target = await geometry(step.targetPath),
    avoid = await Promise.all((step.avoidPaths ?? []).map(geometry))
  // A confirmed running world distinguishes an unresponsive character from a stalled renderer.
  const framePath = `${step.actorPath}._szWorld._frameNo`
  const initialFrame = await numbers([framePath])
    .then(([frame]) => frame)
    .catch(() => null)
  const route = planApproach3d(actor, target, step.walkable, avoid),
    deadline = Date.now() + step.timeoutMs
  let held = null
  let previousPulse = null
  let observedMovement = false
  const navigationBlocked = async () => {
    const frame = await numbers([framePath])
      .then(([value]) => value)
      .catch(() => null)
    return initialFrame !== null && frame !== null && frame - initialFrame >= 4
  }
  const release = async () => {
    if (held) {
      const k = held
      held = null
      await page.keyboard.up(k)
    }
  }
  const cruise = async (key, alongX, target, start) => {
    const sign = Math.sign(target - start)
    await release()
    held = key
    await page.keyboard.down(key)
    let prev = start,
      prevAt = Date.now(),
      speed = 0,
      latency = 0,
      still = 0
    while (Date.now() < deadline) {
      await page.waitForTimeout(CRUISE_POLL_MS)
      const asked = Date.now()
      const [x, z] = await numbers([`${step.actorPath}.position.x`, `${step.actorPath}.position.z`])
      const at = Date.now()
      latency = Math.max(latency * 0.6, at - asked)
      const c = alongX ? x : z
      if (x !== actor.x || z !== actor.z) observedMovement = true
      if (at > prevAt) speed = Math.max(speed * 0.5, Math.abs(c - prev) / (at - prevAt))
      still = Math.abs(c - prev) < 0.002 ? still + 1 : 0
      prev = c
      prevAt = at
      const left = (target - c) * sign
      // Stop distance: what the character still walks while this read ages and the key-up
      // travels (two latencies and a poll), plus a margin that stays inside the planner's
      // clearance from the objects to avoid.
      if (left <= 0.25 + speed * (2 * latency + CRUISE_POLL_MS) || still >= 4) break
    }
    await release()
    previousPulse = null
  }
  try {
    for (const goal of route.slice(1)) {
      let reached = false,
        lastDistance = Infinity,
        stalled = 0
      while (Date.now() < deadline) {
        const [x, z] = await numbers([
          `${step.actorPath}.position.x`,
          `${step.actorPath}.position.z`,
        ])
        if (x !== actor.x || z !== actor.z) observedMovement = true
        const dx = goal.x - x,
          dz = goal.z - z,
          distance = Math.abs(dx) + Math.abs(dz)
        if (Math.abs(dx) < 0.22 && Math.abs(dz) < 0.22) {
          reached = true
          break
        }
        stalled = distance >= lastDistance - 0.002 ? stalled + 1 : 0
        lastDistance = distance
        if (stalled > 25) {
          if (await navigationBlocked())
            throw new NavigationBlocked('O personagem não avança até o alvo com as setas.')
          throw Error('Não foi possível observar quadros suficientes para testar o movimento.')
        }
        const next =
          Math.abs(dx) > 0.22
            ? dx > 0
              ? 'ArrowRight'
              : 'ArrowLeft'
            : dz > 0
              ? 'ArrowDown'
              : 'ArrowUp'
        const alongX = Math.abs(dx) > 0.22
        const coordinate = alongX ? x : z
        const remaining = alongX ? Math.abs(dx) : Math.abs(dz)
        if (remaining > CRUISE_MIN) {
          // Long leg: hold the arrow and follow the position (a test driver, not a series of
          // taps). Each read waits for a frame (~170 ms without a GPU), so the release comes
          // early by the measured speed and the read latency; pulses below finish the leg.
          await cruise(next, alongX, alongX ? goal.x : goal.z, coordinate)
          continue
        }
        // Estimate speed from the last actual pulse. Larger safe pulses reduce the
        // number of expensive browser round trips on software-rendered 3D, while
        // limiting each pulse to half the remaining distance at the measured speed.
        // Each pulse costs ~300 ms of reads there, so a 200 ms ceiling spent more
        // time observing than walking: a long straight leg (the Ilha's 11 units to the
        // lighthouse) ran out of time on a correct game. Half the remaining distance
        // still bounds the overshoot.
        const speed =
          previousPulse?.key === next
            ? Math.abs(coordinate - previousPulse.coordinate) / previousPulse.duration
            : 0
        const duration =
          speed > 0.0001
            ? Math.max(16, Math.min(600, Math.floor((remaining * 0.5) / speed)))
            : remaining > 0.6
              ? 80
              : 16
        if (held !== next) {
          await release()
          held = next
          await page.keyboard.down(next)
        }
        // Move in bounded pulses, then read a stationary position. A slow CDP
        // observation must not keep a key held and overshoot the next corner.
        await page.waitForTimeout(duration)
        await release()
        previousPulse = { key: next, coordinate, duration }
      }
      await release()
      if (!reached) {
        if (!observedMovement && (await navigationBlocked()))
          throw new NavigationBlocked('O personagem não avança até o alvo com as setas.')
        throw Error('O personagem não chegou ao alvo no tempo do teste.')
      }
    }
    await page.waitForTimeout(80)
  } finally {
    await release()
  }
}
