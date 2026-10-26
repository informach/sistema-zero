// Input geometry only. No answer, grading predicate or student-state mutation belongs here.
export const CLICK_TARGET_LIMITS = Object.freeze({ maxGroupItems: 64 })

const finite = (value) => typeof value === 'number' && Number.isFinite(value)

/** One private handle and one existing page. No answer/threshold enters the game. */
export async function observeSpriteMotion(probe, { scope, target, idleMs }, idle, act) {
  const positions = await probe.handle(createClickTargetReaderInPage, {
    scope,
    ...CLICK_TARGET_LIMITS,
  })
  let primary, result
  let failed = false
  try {
    const baselineInitial = await positions.position(target)
    await idle(idleMs)
    const baselineFinal = await positions.position(target)
    const actionInitial = await positions.position(target)
    await act()
    const actionFinal = await positions.position(target)
    result = {
      initial: { found: true, value: actionInitial[target.axis] },
      final: { found: true, value: actionFinal[target.axis] },
      motion: { baselineInitial, baselineFinal, actionInitial, actionFinal },
    }
  } catch (error) {
    primary = error
    failed = true
  }
  try {
    await positions.dispose()
  } catch (cleanupError) {
    if (failed)
      throw new AggregateError([primary, cleanupError], 'A observação e sua liberação falharam.')
    throw cleanupError
  }
  if (failed) throw primary
  return result
}
const contains = (box, point) =>
  point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h

/** Choose an exclusive interior cell, bounded by the current group (at most 64 rectangles). */
export function chooseTargetPoint(scene) {
  const { width, height, boxes, selectedIndex, kind } = scene
  if (
    !finite(width) ||
    !finite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Array.isArray(boxes) ||
    boxes.length > CLICK_TARGET_LIMITS.maxGroupItems
  )
    throw new Error('O palco ou o grupo excedeu os limites de observação do clique.')
  for (const box of boxes)
    if (![box.x, box.y, box.w, box.h, box.opacity].every(finite) || box.w <= 0 || box.h <= 0)
      throw new Error('A geometria do grupo não pôde ser observada.')
  const visible = boxes.filter((box) => box.opacity > 0)
  if (kind === 'lastPoint') {
    const point = scene.previousPoint
    if (
      !point ||
      !finite(point.x) ||
      !finite(point.y) ||
      point.x <= 0 ||
      point.x >= width ||
      point.y <= 0 ||
      point.y >= height
    )
      throw new Error('Não há ponto anterior admitido neste objetivo.')
    if (visible.some((box) => box.index !== selectedIndex && contains(box, point)))
      throw new Error('Outro personagem ocupa o ponto da repetição; o gesto é ambíguo.')
    return { x: point.x, y: point.y }
  }
  const selected = boxes.find((box) => box.index === selectedIndex)
  // `sprite` identifies its current place, not a promise that the program will handle
  // the gesture. Hiding a real actor is program state, not an observation failure.
  if (kind === 'sprite' && !selected)
    throw new Error('O personagem escolhido não tem geometria disponível no grupo atual.')
  const domain = kind === 'sprite' ? selected : { x: 0, y: 0, w: width, h: height }
  const left = Math.max(0, domain.x),
    right = Math.min(width, domain.x + domain.w)
  const top = Math.max(0, domain.y),
    bottom = Math.min(height, domain.y + domain.h)
  if (right <= left || bottom <= top) throw new Error('O alvo está fora do palco observado.')
  const obstacles = visible.filter((box) => kind !== 'sprite' || box.index !== selectedIndex)
  const free = (point) => !obstacles.some((box) => contains(box, point))
  const center = { x: (left + right) / 2, y: (top + bottom) / 2 }
  if (free(center)) return center
  const xs = new Set([left, right]),
    ys = new Set([top, bottom])
  for (const box of obstacles) {
    for (const x of [box.x, box.x + box.w]) if (x > left && x < right) xs.add(x)
    for (const y of [box.y, box.y + box.h]) if (y > top && y < bottom) ys.add(y)
  }
  const columns = [...xs].sort((a, b) => a - b),
    rows = [...ys].sort((a, b) => a - b)
  for (let y = 1; y < rows.length; y++)
    for (let x = 1; x < columns.length; x++) {
      const point = { x: (columns[x - 1] + columns[x]) / 2, y: (rows[y - 1] + rows[y]) / 2 }
      if (free(point)) return point
    }
  throw new Error('Não existe região exclusiva observável para este gesto.')
}

/** Inverse of the official Game2D pointer mapping: CSS pixels, never the DPR backing store. */
export function stagePointToViewport(point, scene, geometry) {
  const {
    left,
    top,
    clientLeft,
    clientTop,
    clientWidth,
    clientHeight,
    viewportWidth,
    viewportHeight,
  } = geometry
  if (
    ![
      left,
      top,
      clientLeft,
      clientTop,
      clientWidth,
      clientHeight,
      viewportWidth,
      viewportHeight,
      scene.width,
      scene.height,
      point.x,
      point.y,
    ].every(finite) ||
    clientWidth <= 0 ||
    clientHeight <= 0 ||
    scene.width <= 0 ||
    scene.height <= 0
  )
    throw new Error('Não foi possível medir o palco visível.')
  const x = left + clientLeft + (point.x * clientWidth) / scene.width
  const y = top + clientTop + (point.y * clientHeight) / scene.height
  if (x <= 0 || x >= viewportWidth || y <= 0 || y >= viewportHeight)
    throw new Error('O ponto do gesto não está na área visível da página.')
  return { x, y }
}

/** Runs in an isolated world: student code cannot replace DOM methods used for hit testing. */
export function readStageGeometryInPage(point) {
  const stages = [...document.querySelectorAll('canvas[data-sz-game-2d-stage]')].filter(
    (canvas) => {
      const style = getComputedStyle(canvas)
      return (
        canvas.clientWidth > 0 &&
        canvas.clientHeight > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0
      )
    },
  )
  if (stages.length !== 1) throw new Error('O teste precisa de um único palco Jogo 2D visível.')
  const canvas = stages[0],
    style = getComputedStyle(canvas)
  let ancestor = canvas.parentElement
  for (let depth = 0; ancestor; depth++) {
    const ancestorStyle = getComputedStyle(ancestor)
    if (depth >= 64 || ancestorStyle.transform !== 'none' || Number(ancestorStyle.opacity) <= 0)
      throw new Error('A transformação dos ancestrais do palco ainda não está qualificada.')
    ancestor = ancestor.parentElement
  }
  if (
    style.transform !== 'none' ||
    [style.paddingLeft, style.paddingRight, style.paddingTop, style.paddingBottom].some(
      (value) => Number.parseFloat(value) !== 0,
    )
  )
    throw new Error('A transformação visual deste palco ainda não é observável pelo teste.')
  if (point && document.elementFromPoint(point.x, point.y) !== canvas)
    throw new Error('Outro elemento impede o palco de receber o gesto.')
  const rect = canvas.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    clientLeft: canvas.clientLeft,
    clientTop: canvas.clientTop,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
  }
}

/**
 * Host-only CDP owner. Paths remain references; values are never serialized through page code.
 * Metadata is checked before the next descriptor read, so a Proxy never reaches ownData.
 */
export async function createClickTargetHandle(cdp, factory, arg) {
  const objectGroup = `sz-click-target-${globalThis.crypto.randomUUID()}`
  const release = () => cdp.send('Runtime.releaseObjectGroup', { objectGroup })
  const replyError = (reply) => {
    if (reply.exceptionDetails)
      throw new Error(
        reply.exceptionDetails.exception?.description?.split('\n')[0] ??
          'Falha ao observar o alvo.',
      )
    return reply.result
  }
  try {
    const initial = replyError(
      await cdp.send('Runtime.evaluate', {
        expression: `(${factory.toString()})(${JSON.stringify(arg)})`,
        returnByValue: false,
        awaitPromise: false,
        generatePreview: false,
        objectGroup,
      }),
    )
    const objectId = initial?.objectId
    if (!objectId || initial.subtype === 'proxy')
      throw new Error('Não foi possível observar os alvos do gesto.')
    const invoke = async (method, args, returnByValue) =>
      replyError(
        await cdp.send('Runtime.callFunctionOn', {
          objectId,
          functionDeclaration:
            'function(method, first, second, third) { return this[method](first, second, third) }',
          arguments: [{ value: method }, ...args],
          returnByValue,
          awaitPromise: false,
          generatePreview: false,
          objectGroup,
        }),
      )
    const observable = (value) => {
      if (value?.subtype === 'proxy')
        throw new Error('O alvo contém um Proxy e não pode ser observado sem executar o programa.')
      if (!value?.objectId || (value.type !== 'object' && value.type !== 'function'))
        throw new Error('O alvo não contém um objeto diretamente observável.')
      return value
    }
    const partsOf = (path) => {
      if (typeof path !== 'string') throw new Error('Caminho de alvo inválido.')
      const parts = path.split('.')
      if (
        parts.length > 4 ||
        parts.some((part) => !part || ['__proto__', 'prototype', 'constructor'].includes(part))
      )
        throw new Error('Caminho de alvo inválido.')
      return parts
    }
    const resolveParts = async (parts) => {
      const box = observable(await invoke('root', [{ value: parts[0] }], false))
      let value = observable(
        await invoke('ownValue', [{ objectId: box.objectId }, { value: 'v' }], false),
      )
      for (const part of parts.slice(1))
        value = observable(
          await invoke('ownValue', [{ objectId: value.objectId }, { value: part }], false),
        )
      return value
    }
    return {
      resolve: async (path) => resolveParts(partsOf(path)),
      call: async (method, value) => (await invoke(method, [{ value }], true))?.value,
      bounds: async (path) => {
        const actor = await resolveParts(partsOf(path))
        return (await invoke('bounds', [{ objectId: actor.objectId }], true))?.value
      },
      position: async (target) => {
        const actor = await resolveParts(partsOf(target.path))
        return (await invoke('position', [{ objectId: actor.objectId }], true))?.value
      },
      read: async (target) => {
        const paths = (await invoke('paths', [{ value: target }], true))?.value
        const groupParts = partsOf(paths?.groupPath)
        const actorParts = paths.actorPath === null ? null : partsOf(paths.actorPath)
        const group = await resolveParts(groupParts)
        const actor = actorParts ? await resolveParts(actorParts) : null
        return (
          await invoke(
            'read',
            [
              { value: target },
              { objectId: group.objectId },
              actor ? { objectId: actor.objectId } : { value: null },
            ],
            true,
          )
        )?.value
      },
      dispose: release,
    }
  } catch (error) {
    try {
      await release()
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'A observação e sua liberação falharam.')
    }
    throw error
  }
}

/**
 * A private CDP handle owns this closure for ONE objective. It retains object identity only;
 * no property/global is added to the student's game, and no expected answer enters the page.
 */
export function createClickTargetReaderInPage({ scope, maxGroupItems }) {
  let pending = null,
    previous = null,
    positionActor = null
  const acquireInspection = globalThis.__SZSTUDIO_RUNTIME_INSPECTORS?.['game-2d:observation']
  if (typeof acquireInspection !== 'function')
    throw new Error('O motor não oferece observação oficial de grupos.')
  const inspection = acquireInspection()
  // Existing lexical scope reader is a separate preexisting boundary. Do not widen its authority.
  const scopeReader = globalThis[scope]
  const own = (object, key) => {
    const entry = inspection.ownData(object, key)
    if (!entry.found) throw new Error('O alvo não contém dados diretamente observáveis.')
    return entry.value
  }
  const number = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error('Geometria não finita.')
    return value
  }
  const optional = (object, key, fallback) => {
    const entry = inspection.ownData(object, key)
    if (entry.inaccessible) throw new Error('O alvo não contém dados diretamente observáveis.')
    return entry.found ? entry.value : fallback
  }
  const paths = (target) => {
    const kind = own(target, 'kind')
    if (kind === 'lastPoint' && !previous) throw new Error('Não há gesto anterior neste objetivo.')
    return {
      groupPath:
        kind === 'lastPoint'
          ? previous.groupPath
          : (optional(target, 'groupPath', null) ?? own(target, 'path')),
      actorPath: kind === 'sprite' ? own(target, 'path') : null,
    }
  }
  return {
    // Both methods are called only through the private CDP object, never added to the game.
    root(name) {
      return scopeReader.get(name)
    },
    ownValue(object, key) {
      const entry = inspection.ownData(object, key)
      return entry.found ? entry.value : undefined
    },
    paths,
    bounds(actor) {
      const stage = inspection.stage()
      if (!stage || number(stage.cameraX) !== 0 || number(stage.cameraY) !== 0)
        throw Error('O teste precisa de um palco estável sem câmera.')
      if (positionActor && positionActor !== actor) throw Error('O sprite mudou durante o teste.')
      positionActor = actor
      const bounds = inspection.contactBounds?.(actor),
        clock = inspection.lifecycle()
      if (!bounds) throw Error('A área de contato não pôde ser observada.')
      return {
        ...bounds,
        width: number(stage.width),
        height: number(stage.height),
        frame: number(clock.frame),
        generation: number(clock.generation),
        errors: number(clock.errors),
        paused: clock.paused,
      }
    },
    position(actor) {
      const stage = inspection.stage()
      if (!stage || number(stage.cameraX) !== 0 || number(stage.cameraY) !== 0)
        throw new Error('Não foi possível observar o palco estável deste movimento.')
      const position = inspection.spritePosition(actor)
      if (!position || position.projected)
        throw new Error('O teste não observou um sprite livre oficial.')
      if (positionActor && actor !== positionActor)
        throw new Error('O personagem mudou durante o teste.')
      positionActor = actor
      const clock = inspection.lifecycle()
      return {
        x: number(position.x),
        y: number(position.y),
        frame: number(clock.frame),
        generation: number(clock.generation),
        errors: number(clock.errors),
        paused: clock.paused,
      }
    },
    read(target, group, resolvedActor) {
      const stage = inspection.stage()
      if (!stage) throw new Error('O executor não observou o palco oficial Jogo 2D.')
      if (number(stage.cameraX) !== 0 || number(stage.cameraY) !== 0)
        throw new Error('Cliques adaptativos com câmera ainda não estão qualificados.')
      const width = number(stage.width),
        height = number(stage.height)
      if (width <= 0 || height <= 0)
        throw new Error('O palco excedeu os limites de observação do clique.')
      if (target.kind === 'lastPoint' && !previous)
        throw new Error('Não há gesto anterior neste objetivo.')
      const { groupPath } = paths(target)
      if (target.kind === 'lastPoint' && group !== previous.group)
        throw new Error('O grupo mudou desde o gesto anterior.')
      const actor =
        target.kind === 'sprite'
          ? resolvedActor
          : target.kind === 'lastPoint'
            ? previous.actor
            : null
      const items = inspection.groupItems(group, maxGroupItems)
      if (!items) throw new Error('O grupo oficial não pôde ser observado dentro dos limites.')
      const boxes = [],
        identities = new Set()
      let selectedIndex = -1
      for (let index = 0; index < items.length; index++) {
        const sprite = own(items, String(index))
        if (identities.has(sprite)) throw new Error('O grupo contém alvos duplicados.')
        identities.add(sprite)
        if (sprite === actor) selectedIndex = index
        const angle = number(optional(sprite, 'angle', 0)),
          direction = optional(sprite, 'direction', '')
        if (angle !== 0 || direction === 'up' || direction === 'down')
          throw new Error('A geometria rotacionada ainda não está qualificada.')
        // Keep the direct-data contract before calling the engine's read-only projection.
        for (const key of ['x', 'y', 'w', 'h']) number(own(sprite, key))
        const observation = inspection.spriteBounds(sprite)
        if (!observation) throw new Error('A geometria do alvo não pôde ser observada.')
        const bounds = observation.bounds
        // Offscreen track sprites neither occlude the stage nor acquire a raw-world fallback.
        if (!bounds) continue
        const box = {
          index,
          x: number(own(bounds, 'x')),
          y: number(own(bounds, 'y')),
          w: number(own(bounds, 'w')),
          h: number(own(bounds, 'h')),
          opacity: number(optional(sprite, 'opacity', 1)),
        }
        if (box.w <= 0 || box.h <= 0) throw new Error('Dimensões do alvo inválidas.')
        boxes.push(box)
      }
      if (target.kind === 'sprite' && selectedIndex < 0)
        throw new Error('O alvo não pertence ao grupo observado.')
      pending = { group, actor, groupPath }
      return {
        width,
        height,
        boxes,
        selectedIndex,
        kind: target.kind,
        ...(target.kind === 'lastPoint' ? { previousPoint: previous.point } : {}),
      }
    },
    admit(point) {
      if (!pending) throw new Error('O gesto não foi observado antes de ser admitido.')
      previous = { ...pending, point: { x: number(point.x), y: number(point.y) } }
      pending = null
    },
  }
}
