/**
 * O clique no sprite de um grupo (o passo `clickTarget` dos objetivos), uma fonte só para os dois
 * executores:
 * - o do servidor (`studio-runtime/runtime/check-click-target.mjs`), que recebe estas funções pelo
 *   módulo gerado `click-target.generated.mjs` (`studio-runtime/scripts/validation-profile.ts`; o
 *   `check:validation-profile` reprova se o gerado não for o desta fonte);
 * - o piloto da aba "Meus testes" do Estúdio (`studentTests/driver.ts`), que as injeta pela fonte
 *   dentro do jogo.
 *
 * ⚠️ Por isso cada função é AUTOCONTIDA: nada de fora dela além dos parâmetros e das globais da
 * página (sem ajudante do módulo, sem constante do módulo; `CLICK_TARGET_LIMITS` é só para quem
 * chama). Só geometria do gesto: nenhuma resposta, régua de nota ou mudança no estado do jogo.
 */

export const CLICK_TARGET_LIMITS = Object.freeze({ maxGroupItems: 64 })

export interface ClickTargetBox {
  index: number
  x: number
  y: number
  w: number
  h: number
  opacity: number
}

export interface ClickTargetScene {
  width: number
  height: number
  boxes: ClickTargetBox[]
  selectedIndex: number
  kind: 'sprite' | 'outsideGroup' | 'lastPoint'
  previousPoint?: { x: number; y: number }
}

export interface StageGeometry {
  left: number
  top: number
  clientLeft: number
  clientTop: number
  clientWidth: number
  clientHeight: number
  viewportWidth: number
  viewportHeight: number
}

/** Choose an exclusive interior cell, bounded by the current group (at most 64 rectangles). */
export function chooseTargetPoint(scene: ClickTargetScene): { x: number; y: number } {
  const finite = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
  const contains = (box: ClickTargetBox, point: { x: number; y: number }) =>
    point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h
  const maxGroupItems = 64
  const { width, height, boxes, selectedIndex, kind } = scene
  if (
    !finite(width) ||
    !finite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Array.isArray(boxes) ||
    boxes.length > maxGroupItems
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
  const domain = kind === 'sprite' && selected ? selected : { x: 0, y: 0, w: width, h: height }
  const left = Math.max(0, domain.x),
    right = Math.min(width, domain.x + domain.w)
  const top = Math.max(0, domain.y),
    bottom = Math.min(height, domain.y + domain.h)
  if (right <= left || bottom <= top) throw new Error('O alvo está fora do palco observado.')
  const obstacles = visible.filter((box) => kind !== 'sprite' || box.index !== selectedIndex)
  const free = (point: { x: number; y: number }) => !obstacles.some((box) => contains(box, point))
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
      const point = {
        x: ((columns[x - 1] as number) + (columns[x] as number)) / 2,
        y: ((rows[y - 1] as number) + (rows[y] as number)) / 2,
      }
      if (free(point)) return point
    }
  throw new Error('Não existe região exclusiva observável para este gesto.')
}

/** Inverse of the official Game2D pointer mapping: CSS pixels, never the DPR backing store. */
export function stagePointToViewport(
  point: { x: number; y: number },
  scene: { width: number; height: number },
  geometry: StageGeometry,
): { x: number; y: number } {
  const finite = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)
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
export function readStageGeometryInPage(point: { x: number; y: number } | null): StageGeometry {
  const stages = [
    ...document.querySelectorAll<HTMLCanvasElement>('canvas[data-sz-game-2d-stage]'),
  ].filter((canvas) => {
    const style = getComputedStyle(canvas)
    return (
      canvas.clientWidth > 0 &&
      canvas.clientHeight > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0
    )
  })
  const canvas = stages[0]
  if (stages.length !== 1 || !canvas)
    throw new Error('O teste precisa de um único palco Jogo 2D visível.')
  const style = getComputedStyle(canvas)
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

/** O que o inspetor oficial do Jogo 2D (`game-2d:observation`) oferece a este leitor. */
interface GameTwoDInspection {
  ownData(object: unknown, key: string): { found: boolean; inaccessible?: boolean; value?: unknown }
  groupItems(group: unknown, max: number): unknown
  spriteBounds(sprite: unknown): { bounds: unknown } | null
  stage(): { cameraX: unknown; cameraY: unknown; width: unknown; height: unknown } | null
  contactBounds?(actor: unknown): Record<string, unknown> | null
  spritePosition(actor: unknown): { x: unknown; y: unknown; projected?: boolean } | null
  lifecycle(): { frame: unknown; generation: unknown; errors: unknown; paused: unknown }
}

/** O alvo do passo `clickTarget` como o leitor o recebe (o formato do contrato dos objetivos). */
type ClickTargetInput = Record<string, unknown>

/**
 * A private CDP handle owns this closure for ONE objective. It retains object identity only;
 * no property/global is added to the student's game, and no expected answer enters the page.
 */
export function createClickTargetReaderInPage({
  scope,
  maxGroupItems,
}: {
  scope: string
  maxGroupItems: number
}) {
  let pending: { group: unknown; actor: unknown; groupPath: unknown } | null = null,
    previous: { group: unknown; actor: unknown; groupPath: unknown; point: unknown } | null = null,
    positionActor: unknown = null
  const registry = (
    globalThis as unknown as {
      __SZSTUDIO_RUNTIME_INSPECTORS?: Record<string, unknown>
    }
  ).__SZSTUDIO_RUNTIME_INSPECTORS
  const acquireInspection = registry?.['game-2d:observation']
  if (typeof acquireInspection !== 'function')
    throw new Error('O motor não oferece observação oficial de grupos.')
  const inspection = acquireInspection() as GameTwoDInspection
  // Existing lexical scope reader is a separate preexisting boundary. Do not widen its authority.
  const scopeReader = (globalThis as unknown as Record<string, { get(name: string): unknown }>)[
    scope
  ]
  const own = (object: unknown, key: string) => {
    const entry = inspection.ownData(object, key)
    if (!entry.found) throw new Error('O alvo não contém dados diretamente observáveis.')
    return entry.value
  }
  const number = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error('Geometria não finita.')
    return value
  }
  const optional = (object: unknown, key: string, fallback: unknown) => {
    const entry = inspection.ownData(object, key)
    if (entry.inaccessible) throw new Error('O alvo não contém dados diretamente observáveis.')
    return entry.found ? entry.value : fallback
  }
  const paths = (target: ClickTargetInput) => {
    const kind = own(target, 'kind')
    if (kind === 'lastPoint' && !previous) throw new Error('Não há gesto anterior neste objetivo.')
    return {
      groupPath:
        kind === 'lastPoint'
          ? previous?.groupPath
          : (optional(target, 'groupPath', null) ?? own(target, 'path')),
      actorPath: kind === 'sprite' ? own(target, 'path') : null,
    }
  }
  return {
    // Both methods are called only through the private CDP object, never added to the game.
    root(name: string) {
      return (scopeReader as { get(name: string): unknown }).get(name)
    },
    ownValue(object: unknown, key: string) {
      const entry = inspection.ownData(object, key)
      return entry.found ? entry.value : undefined
    },
    paths,
    bounds(actor: unknown) {
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
    position(actor: unknown) {
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
    read(target: ClickTargetInput, group: unknown, resolvedActor: unknown) {
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
      if (target.kind === 'lastPoint' && group !== previous?.group)
        throw new Error('O grupo mudou desde o gesto anterior.')
      const actor =
        target.kind === 'sprite'
          ? resolvedActor
          : target.kind === 'lastPoint'
            ? previous?.actor
            : null
      const items = inspection.groupItems(group, maxGroupItems) as
        | { length: number }
        | null
        | undefined
      if (!items) throw new Error('O grupo oficial não pôde ser observado dentro dos limites.')
      const boxes: ClickTargetBox[] = [],
        identities = new Set<unknown>()
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
        kind: target.kind as ClickTargetScene['kind'],
        ...(target.kind === 'lastPoint' ? { previousPoint: previous?.point } : {}),
      }
    },
    admit(point: { x: unknown; y: unknown }) {
      if (!pending) throw new Error('O gesto não foi observado antes de ser admitido.')
      previous = { ...pending, point: { x: number(point.x), y: number(point.y) } }
      pending = null
    },
  }
}
