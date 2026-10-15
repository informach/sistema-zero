export async function driveGame(options) {
  if (
    ![
      'canvas-puzzle',
      'canvas-survival',
      'canvas-grid-arena',
      'phaser-tactics',
      'three-tactics',
      'phaser-arcade',
      'phaser-platformer',
      'three-exploration',
      'three-action',
    ].includes(options.id)
  )
    throw new Error('Este kit ainda não tem um cenário de objetivos.')
  const controller = window.__studioGame
  const held = new Set()
  const press = (codes) => {
    for (const key of held)
      if (!codes.includes(key)) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: key, bubbles: true }))
        held.delete(key)
      }
    for (const key of codes)
      if (!held.has(key)) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: key, bubbles: true }))
        held.add(key)
      }
  }
  const tick = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
  const deadline = performance.now() + Math.min(options.timeoutMs ?? 70_000, 100_000)
  let previousScore = 0,
    awaitLanding = false,
    lastPulse = -Infinity
  const tap = async (key) => {
    press([key])
    await tick()
    press([])
    await tick()
  }
  const same = (a, b) => a.x === b.x && a.y === b.y
  const key = (cell) => `${cell.x},${cell.y}`
  const directions = [
    { x: 0, y: -1, code: 'ArrowUp' },
    { x: 1, y: 0, code: 'ArrowRight' },
    { x: 0, y: 1, code: 'ArrowDown' },
    { x: -1, y: 0, code: 'ArrowLeft' },
  ]
  const paths = (start, enter, limit = 441) => {
    const queue = [{ ...start, path: [] }],
      seen = new Set([key(start)])
    for (let i = 0; i < queue.length && queue.length < limit; i++)
      for (const direction of directions) {
        const current = queue[i],
          cell = { x: current.x + direction.x, y: current.y + direction.y }
        if (!seen.has(key(cell)) && enter(cell)) {
          seen.add(key(cell))
          queue.push({ ...cell, path: [...current.path, { ...cell, code: direction.code }] })
        }
      }
    return queue
  }
  const moveArena = async (path) => {
    for (const cell of path) {
      press([cell.code])
      while (
        controller.inspect().phase === 'playing' &&
        !same(controller.inspect().player, cell) &&
        performance.now() < deadline
      )
        await tick()
      press([])
    }
  }
  const selectCell = async (cell) => {
    while (controller.inspect().phase === 'playing' && performance.now() < deadline) {
      const cursor = controller.inspect().cursor
      if (same(cursor, cell)) break
      await tap(
        cursor.x !== cell.x
          ? cursor.x < cell.x
            ? 'ArrowRight'
            : 'ArrowLeft'
          : cursor.y < cell.y
            ? 'ArrowDown'
            : 'ArrowUp',
      )
    }
    await tap('Space')
  }
  try {
    while (controller.inspect().phase === 'playing' && performance.now() < deadline) {
      const snapshot = controller.inspect()
      if (options.id === 'canvas-puzzle') {
        if (options.lose) await tap('Space')
        else {
          const board = snapshot.board,
            original = snapshot.piece
          let cells = original.cells,
            best = { rating: -Infinity, x: original.x, turns: 0 }
          for (let turns = 0; turns < 4; turns++) {
            const width = Math.max(...cells.map((cell) => cell[0])) + 1
            for (let x = 0; x <= board[0].length - width; x++) {
              const valid = (y) =>
                cells.every(
                  ([dx, dy]) => y + dy >= 0 && y + dy < board.length && board[y + dy][x + dx] === 0,
                )
              let y = original.y
              if (!valid(y)) continue
              while (valid(y + 1)) y++
              const next = board.map((row) => [...row])
              for (const [dx, dy] of cells) next[y + dy][x + dx] = 1
              const remaining = next.filter((row) => row.some((cell) => cell === 0))
              const cleared = next.length - remaining.length
              const heights = []
              let holes = 0
              for (let col = 0; col < board[0].length; col++) {
                const first = remaining.findIndex((row) => row[col] !== 0)
                heights.push(first < 0 ? 0 : remaining.length - first)
                if (first >= 0)
                  for (let row = first; row < remaining.length; row++)
                    if (!remaining[row][col]) holes++
              }
              const bump = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0)
              const rating =
                -0.51 * heights.reduce((sum, h) => sum + h, 0) -
                0.36 * holes -
                0.18 * bump +
                0.76 * cleared
              if (rating > best.rating) best = { rating, x, turns }
            }
            const turned = cells.map(([x, y]) => [-y, x])
            const minX = Math.min(...turned.map((cell) => cell[0])),
              minY = Math.min(...turned.map((cell) => cell[1]))
            cells = turned.map(([x, y]) => [x - minX, y - minY])
          }
          for (let turn = 0; turn < best.turns; turn++) await tap('ArrowUp')
          while (controller.inspect().piece.x !== best.x && performance.now() < deadline) {
            const position = controller.inspect().piece.x
            press([position < best.x ? 'ArrowRight' : 'ArrowLeft'])
            await tick()
          }
          press([])
          await tap('Space')
        }
      } else if (options.id === 'canvas-survival') {
        const player = snapshot.player,
          codes = []
        const target = [...(snapshot.targets ?? [])].sort(
          (a, b) =>
            Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y),
        )[0]
        if (target) {
          const dx = target.x - player.x,
            dy = target.y - player.y,
            distance = Math.hypot(dx, dy)
          const direction = options.lose || distance > 85 ? 1 : distance < 60 ? -1 : 0
          if (direction && Math.abs(dx) > 5)
            codes.push(dx * direction > 0 ? 'ArrowRight' : 'ArrowLeft')
          if (direction && Math.abs(dy) > 5)
            codes.push(dy * direction > 0 ? 'ArrowDown' : 'ArrowUp')
          // Pulse is edge-triggered. Repeated keydown while held is not another action.
          if (!options.lose && distance < 105 && performance.now() - lastPulse > 720) {
            codes.push('Space')
            lastPulse = performance.now()
          }
        }
        press(codes)
        await tick()
      } else if (options.id === 'canvas-grid-arena') {
        if (options.lose) {
          if (!snapshot.charges.length) await tap('Space')
          else await tick()
          continue
        }
        if (snapshot.charges.length || snapshot.pulses.length) {
          press([])
          await tick()
          continue
        }
        const board = snapshot.board,
          range = snapshot.rules.range
        const enter = (cell) => board[cell.y]?.[cell.x] === 0
        const blast = (cell) => {
          const cells = [cell]
          for (const direction of directions)
            for (let step = 1; step <= range; step++) {
              const next = { x: cell.x + direction.x * step, y: cell.y + direction.y * step },
                tile = board[next.y]?.[next.x]
              if (tile === undefined || tile === 1) break
              cells.push(next)
              if (tile === 2) break
            }
          return cells
        }
        let best
        for (const candidate of paths(snapshot.player, enter)) {
          const cells = blast(candidate),
            hit = new Set(cells.map(key))
          const value =
            snapshot.targets.filter((target) => hit.has(key(target))).length * 1000 +
            cells.filter((cell) => board[cell.y][cell.x] === 2).length * 10
          if (!value) continue
          const escapeCell = paths(candidate, enter).find(
            (cell) =>
              !hit.has(key(cell)) &&
              cell.path.length * snapshot.rules.movementTicks < snapshot.rules.fuseTicks - 3,
          )
          if (!escapeCell) continue
          const rating = value - candidate.path.length
          if (!best || rating > best.rating) best = { candidate, escapeCell, rating }
        }
        if (!best) throw new Error('O cenário da arena não oferece um pulso com saída segura.')
        await moveArena(best.candidate.path)
        await tap('Space')
        await moveArena(best.escapeCell.path)
      } else if (options.id.endsWith('-tactics')) {
        if (snapshot.turn !== 'player') {
          press([])
          await tick()
          continue
        }
        if (options.lose) {
          document.querySelector('[data-command="end-turn"]').click()
          await tick()
          continue
        }
        document.querySelector('[data-command="recruit"]').click()
        const current = controller.inspect()
        const unit = current.units.find(
          (value) => value.side === 'friend' && value.health > 0 && !value.acted,
        )
        if (!unit) {
          document.querySelector('[data-command="end-turn"]').click()
          await tick()
          continue
        }
        await selectCell(unit)
        const state = controller.inspect(),
          rivals = state.units.filter((value) => value.side === 'rival' && value.health > 0)
        const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
        const walkable = (cell) => (state.terrain[cell.y]?.[cell.x] ?? 0) > 0
        const occupied = (cell) =>
          state.units.find((value) => value.health > 0 && same(value, cell))
        const canHit = (from, target) => {
          if (manhattan(from, target) > (unit.role === 'scout' ? 3 : 1)) return false
          let x = from.x,
            y = from.y
          const blocked = (cell) =>
            !walkable(cell) || (!same(cell, target) && !same(cell, unit) && !!occupied(cell))
          while (x !== target.x || y !== target.y) {
            const dx = Math.sign(target.x - x),
              dy = Math.sign(target.y - y)
            if (dx && dy && (blocked({ x: x + dx, y }) || blocked({ x, y: y + dy }))) return false
            if (Math.abs(target.x - x) >= Math.abs(target.y - y)) x += dx
            else y += dy
            if (blocked({ x, y })) return false
          }
          return true
        }
        let target = rivals.find((value) => canHit(unit, value))
        if (!target && !unit.moved && state.moves.length) {
          const costs = new Map()
          for (const rival of rivals)
            for (const cell of paths(
              rival,
              (cell) => walkable(cell) && (!occupied(cell) || same(cell, unit)),
              144,
            ))
              costs.set(key(cell), Math.min(costs.get(key(cell)) ?? Infinity, cell.path.length))
          const candidates = state.moves.map((cell) => ({
            cell,
            rating:
              (rivals.some((target) => canHit(cell, target)) ? 100 : 0) -
              (costs.get(key(cell)) ?? 1000),
          }))
          candidates.sort((a, b) => b.rating - a.rating)
          await selectCell(candidates[0].cell)
          const moved = controller.inspect().units.find((value) => value.id === unit.id)
          target = rivals.find((value) => canHit(moved, value))
        }
        if (target) await selectCell(target)
        else document.querySelector('[data-command="wait"]').click()
        await tick()
      } else if (options.id.startsWith('three-')) {
        const player = snapshot.player,
          target = snapshot.targets?.[0] ?? { x: 0, y: 0, z: -9.5 }
        const dx = target.x - player.x,
          dz = target.z - player.z
        const codes = []
        if (Math.abs(dx) > 0.15) codes.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft')
        if (Math.abs(dz) > 0.15) codes.push(dz > 0 ? 'ArrowDown' : 'ArrowUp')
        if (options.id === 'three-action') codes.push('Space')
        press(codes)
        await tick()
      } else if (options.id === 'phaser-platformer') {
        const player = snapshot.player,
          codes = []
        if (options.lose) codes.push('ArrowRight')
        else {
          if (snapshot.score !== previousScore && !player.grounded) awaitLanding = true
          previousScore = snapshot.score
          if (player.grounded) awaitLanding = false
          const target = snapshot.targets?.[0]
          if (!awaitLanding && target && Math.abs(target.x - player.x) > 6)
            codes.push(target.x > player.x ? 'ArrowRight' : 'ArrowLeft')
          const nearEdge = [400, 850, 1280, 1710].some(
            (edge) => player.x >= edge - 60 && player.x < edge,
          )
          if (
            !awaitLanding &&
            player.grounded &&
            (nearEdge || (target && Math.abs(target.x - player.x) < 45))
          )
            codes.push('Space')
        }
        press(codes)
        await tick()
      } else if (options.id === 'phaser-arcade') {
        const player = snapshot.player,
          codes = []
        if (!options.lose) {
          const targets = [...(snapshot.targets ?? [])].sort(
            (a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x),
          )
          const target = targets[0]
          if (target && Math.abs(target.x - player.x) > 5)
            codes.push(target.x > player.x ? 'ArrowRight' : 'ArrowLeft')
          codes.push('Space')
        }
        press(codes)
        await tick()
      }
    }
    return controller.inspect()
  } finally {
    press([])
  }
}
