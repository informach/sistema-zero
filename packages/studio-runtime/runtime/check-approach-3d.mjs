// Host-only planning. Reads bounded numeric properties and sends actual keyboard events.
// Walkable rectangles describe the authored floor, never a learner's key position.
import { createExecutionObservationCodec } from './execution-observation.generated.mjs'
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
  const route = planApproach3d(actor, target, step.walkable, avoid),
    deadline = Date.now() + step.timeoutMs
  let held = null
  const release = async () => {
    if (held) {
      const k = held
      held = null
      await page.keyboard.up(k)
    }
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
        const dx = goal.x - x,
          dz = goal.z - z,
          distance = Math.abs(dx) + Math.abs(dz)
        if (Math.abs(dx) < 0.22 && Math.abs(dz) < 0.22) {
          reached = true
          break
        }
        stalled = distance >= lastDistance - 0.002 ? stalled + 1 : 0
        lastDistance = distance
        if (stalled > 25) throw Error('O personagem não avança até o alvo com as setas.')
        const next =
          Math.abs(dx) > 0.22
            ? dx > 0
              ? 'ArrowRight'
              : 'ArrowLeft'
            : dz > 0
              ? 'ArrowDown'
              : 'ArrowUp'
        if (held !== next) {
          await release()
          held = next
          await page.keyboard.down(next)
        }
        // Move in bounded pulses, then read a stationary position. A slow CDP
        // observation must not keep a key held and overshoot the next corner.
        const remaining = Math.abs(dx) > 0.22 ? Math.abs(dx) : Math.abs(dz)
        await page.waitForTimeout(remaining > 0.6 ? 80 : 16)
        await release()
      }
      await release()
      if (!reached) throw Error('O personagem não chegou ao alvo no tempo do teste.')
    }
    await page.waitForTimeout(80)
  } finally {
    await release()
  }
}
