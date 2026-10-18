// Small bounded Canvas renderer used only by trusted L0 fixtures.
export function createRenderer() {
  let canvas
  let context
  let generation = 0
  let active = false
  const callbacks = new Set()
  const timers = new Set()
  const inputs = []
  const stats = { lines: 0, batches: 0 }

  function ensureCanvas() {
    if (canvas) return
    canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'Turtle L0')
    document.body.append(canvas)
    context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D unavailable')
    canvas.addEventListener('keydown', (event) => inputKey(event.key))
    canvas.focus()
  }

  function inputKey(key) {
    if (!active) return
    const keys = { ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down' }
    if (inputs.length < 32) inputs.push({ type: 'key', key: keys[key] ?? String(key).slice(0, 40) })
  }

  function draw(operations, delay, complete) {
    if (
      !Array.isArray(operations) ||
      operations.length > 10_000 ||
      !Number.isFinite(delay) ||
      delay < 0 ||
      delay > 1000
    )
      throw new Error('Invalid L0 drawing batch')
    // Validate synchronously so the caller can fail the run instead of leaving
    // Python suspended forever after an exception inside requestAnimationFrame.
    for (const operation of operations) {
      if (
        !Array.isArray(operation) ||
        operation.length !== 6 ||
        operation[0] !== 'line' ||
        !operation
          .slice(1, 5)
          .every((value) => typeof value === 'number' && Number.isFinite(value)) ||
        typeof operation[5] !== 'string' ||
        operation[5].length > 64
      )
        throw new Error('Invalid L0 line')
    }
    ensureCanvas()
    active = true
    const expected = generation
    const id = requestAnimationFrame(() => {
      callbacks.delete(id)
      if (generation !== expected) return
      for (const operation of operations) {
        context.strokeStyle = operation[5]
        context.beginPath()
        context.moveTo(320 + operation[1], 240 - operation[2])
        context.lineTo(320 + operation[3], 240 - operation[4])
        context.stroke()
        stats.lines++
      }
      stats.batches++
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (generation === expected) complete(inputs.splice(0))
      }, delay)
      timers.add(timer)
    })
    callbacks.add(id)
  }

  function stop() {
    active = false
    generation++
    for (const id of callbacks) cancelAnimationFrame(id)
    for (const timer of timers) clearTimeout(timer)
    callbacks.clear()
    timers.clear()
    inputs.length = 0
  }

  function reset() {
    stop()
    canvas?.remove()
    canvas = undefined
    context = undefined
    stats.lines = stats.batches = 0
  }

  return { draw, stop, reset, inputKey, stats }
}
