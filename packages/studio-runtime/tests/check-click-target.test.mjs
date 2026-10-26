import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { gameTwoDInspectionRuntime } from '../../studio/src/official-extensions/game-2d/runtime/inspection.ts'
import { gameTwoDTextSpritesRuntime } from '../../studio/src/official-extensions/game-2d/runtime/textSprites.ts'
import { sceneTwoDRuntime } from '../../studio/src/official-extensions/scene-2d/runtime.ts'
import { spriteSceneRuntime } from '../../studio/src/official-extensions/scene-2d/spriteRuntime.ts'
import {
  chooseTargetPoint,
  createClickTargetReaderInPage,
  readStageGeometryInPage,
  stagePointToViewport,
} from '../runtime/check-click-target.mjs'

const box = (index, x, y, w = 100, h = 100) => ({ index, x, y, w, h, opacity: 1 })
const scene = (boxes, selectedIndex = 0, kind = 'sprite') => ({
  width: 640,
  height: 360,
  boxes,
  selectedIndex,
  kind,
})

test('uses current positions and sizes, choosing a visible exclusive part of partial overlaps', () => {
  assert.deepEqual(chooseTargetPoint(scene([box(0, 71, 83, 80, 40)])), { x: 111, y: 103 })
  const boxes = [box(0, 70, 80), box(1, 80, 80)]
  const point = chooseTargetPoint(scene(boxes))
  assert.ok(point.x > 70 && point.x < 80 && point.y > 80 && point.y < 180)
  assert.throws(
    () => chooseTargetPoint(scene([box(0, 70, 80), box(1, 70, 80)])),
    /região exclusiva/,
  )
})

test('empty click is outside all visible current group rectangles', () => {
  const boxes = [box(0, 260, 130), box(1, 0, 0, 200, 360)]
  const point = chooseTargetPoint(scene(boxes, -1, 'outsideGroup'))
  assert.ok(
    boxes.every(
      (b) => point.x < b.x || point.x > b.x + b.w || point.y < b.y || point.y > b.y + b.h,
    ),
  )
  assert.throws(
    () => chooseTargetPoint(scene([box(0, 0, 0, 640, 360)], -1, 'outsideGroup')),
    /região exclusiva/,
  )
})

test('repeat sends same admitted logical point even if original is hidden, but refuses a different actor', () => {
  const previousPoint = { x: 25, y: 25 }
  assert.deepEqual(
    chooseTargetPoint({
      ...scene([{ ...box(0, 0, 0), opacity: 0 }], 0, 'lastPoint'),
      previousPoint,
    }),
    previousPoint,
  )
  assert.deepEqual(
    chooseTargetPoint({ ...scene([box(0, 0, 0)], 0, 'lastPoint'), previousPoint }),
    previousPoint,
  )
  assert.throws(
    () => chooseTargetPoint({ ...scene([box(1, 0, 0)], -1, 'lastPoint'), previousPoint }),
    /Outro personagem/,
  )
  assert.throws(() => chooseTargetPoint(scene([], -1, 'lastPoint')), /anterior/)
})

test('sprite gesture uses the real existing rectangle when hidden, without bypassing other actors', () => {
  const hidden = { ...box(0, 0, 0), opacity: 0 }
  assert.deepEqual(chooseTargetPoint(scene([hidden])), { x: 50, y: 50 })
  assert.throws(() => chooseTargetPoint(scene([hidden, box(1, 0, 0)])), /região exclusiva/)
  assert.throws(() => chooseTargetPoint(scene([], 0)), /personagem/)
})

test('CSS size, centering and borders map in CSS pixels independently of backing DPR', () => {
  const geometry = {
    left: 100,
    top: 50,
    clientLeft: 3,
    clientTop: 5,
    clientWidth: 320,
    clientHeight: 180,
    viewportWidth: 1024,
    viewportHeight: 640,
  }
  assert.deepEqual(
    stagePointToViewport({ x: 320, y: 180 }, scene([]), {
      ...geometry,
      backingWidth: 1280,
      backingHeight: 720,
    }),
    { x: 263, y: 145 },
  )
  assert.throws(
    () => stagePointToViewport({ x: 320, y: 180 }, scene([]), { ...geometry, clientWidth: 0 }),
    /medir/,
  )
  assert.throws(
    () => stagePointToViewport({ x: 320, y: 180 }, scene([]), { ...geometry, left: -1000 }),
    /visível/,
  )
})

test('logical dimensions already admitted by the engine have no duplicate absolute-click cap', () => {
  const real = { ...scene([box(0, 71, 83, 80, 40)]), width: 8000 }
  assert.deepEqual(chooseTargetPoint(real), { x: 111, y: 103 })
  for (const width of [0, -1, NaN, Infinity])
    assert.throws(() => chooseTargetPoint({ ...real, width }), /limites/)
  assert.throws(
    () => chooseTargetPoint(scene(Array.from({ length: 65 }, (_, i) => box(i, i * 2, 0)))),
    /limites/,
  )
})

function readerFixture(height = 360) {
  // Models native receiver validation; this VM is not a browser qualification.
  const canvasSizes = new WeakMap()
  class FixtureCanvas {
    constructor() {
      canvasSizes.set(this, { width: 640, height })
    }
    get width() {
      const size = canvasSizes.get(this)
      if (!size) throw new TypeError('Illegal canvas receiver')
      return size.width
    }
    get height() {
      const size = canvasSizes.get(this)
      if (!size) throw new TypeError('Illegal canvas receiver')
      return size.height
    }
  }
  const managedSprites = new WeakSet()
  const createSprite = (options) => {
    const sprite = { ...options }
    managedSprites.add(sprite)
    return sprite
  }
  const a = createSprite({ x: 10, y: 20, w: 50, h: 50 }),
    b = createSprite({ x: 200, y: 20, w: 50, h: 50 })
  // Official createGroup exposes items through its managed, own accessor.
  const items = [a, b],
    group = {
      get items() {
        return items
      },
    }
  const variables = { esconderijo1: a, esconderijos: group }
  const host = {
    width: () => 640,
    height: () => height,
    camera: () => ({ x: 0, y: 0 }),
    spriteAlive: () => true,
    warn() {},
    wake() {},
  }
  const scene = new Function('host', `${sceneTwoDRuntime}; return createScene2D(host)`)(host)
  const track = new Function(
    'host',
    'scene',
    `${spriteSceneRuntime}; return createSpriteScene(host, scene)`,
  )(host, scene)
  const api = { stageWidth: () => 640, stageHeight: () => 360, cameraX: () => 0, cameraY: () => 0 }
  const context = vm.createContext({
    __szFixture: { get: (name) => ({ v: variables[name] }) },
    SZGame2D: api,
    _managedGroups: new WeakSet([group]),
    _managedSprites: managedSprites,
    _managedArtHitboxes: new WeakSet(),
    _destroyedSprites: new WeakSet(),
    MAX_GROUP: 400,
    _logicalW: 640,
    _logicalH: height,
    HTMLCanvasElement: FixtureCanvas,
    _stageCanvas: new FixtureCanvas(),
    camera: { x: 0, y: 0 },
    _spriteScene: track,
    _spritePaintEpoch: 1,
    _isDestroyedSprite: () => false,
    _layoutSpriteText: () => {},
    _finiteNumber: (value, fallback) =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback,
  })
  vm.runInContext(
    "window = globalThis; Object.defineProperty(window, '__SZSTUDIO_RUNTIME_INSPECTORS', {value:Object.create(null),writable:false,configurable:false})",
    context,
  )
  vm.runInContext(gameTwoDInspectionRuntime, context)
  const pageReader = vm.runInContext(
    `(${createClickTargetReaderInPage.toString()})({scope:'__szFixture',maxGroupItems:64,maxLogicalSize:4000})`,
    context,
  )
  // Geometry unit fixture: real CDP path resolution is covered by the native protocol cases.
  const reader = {
    read(target) {
      const paths = pageReader.paths(target)
      return pageReader.read(
        target,
        variables[paths.groupPath],
        paths.actorPath === null ? null : variables[paths.actorPath],
      )
    },
    admit: (point) => pageReader.admit(point),
  }
  return { reader, variables, a, b, group, api, context, track, createSprite }
}

test('adaptive sprite clicks hit official track-projected bounds instead of raw world coordinates', () => {
  const f = readerFixture(720)
  f.a._paintEpoch = 1
  f.a._paintOrder = 1
  f.track.createSpriteTrack('pista')
  f.track.putTrackSprite('pista', f.a, 80, 400)
  const projected = f.track.bounds(f.a)
  assert.ok(projected)
  const observed = f.reader.read({
    kind: 'sprite',
    path: 'esconderijo1',
    groupPath: 'esconderijos',
  })
  const point = chooseTargetPoint(observed)
  const hitSource = gameTwoDTextSpritesRuntime.match(
    /function _spriteContainsPointer\(sprite, x, y\) \{[\s\S]*?\n {2}\}/,
  )?.[0]
  assert.ok(hitSource)
  const hit = vm.runInContext(`(${hitSource})`, f.context)
  assert.equal(hit(f.a, point.x, point.y), true)
  assert.ok(point.x > projected.x && point.x < projected.x + projected.w)
  assert.ok(point.y > projected.y && point.y < projected.y + projected.h)
})

test('projected group obstacles fence empty and repeated gestures; offscreen tracks never fall back to raw boxes', () => {
  const f = readerFixture(720)
  f.track.createSpriteTrack('pista')
  f.track.putTrackSprite('pista', f.a, 80, 400)
  f.track.putTrackSprite('pista', f.b, 80, 400)
  assert.throws(
    () =>
      chooseTargetPoint(
        f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' }),
      ),
    /região exclusiva/,
  )
  f.track.putTrackSprite('pista', f.b, 0, 5000)
  const observed = f.reader.read({
    kind: 'sprite',
    path: 'esconderijo1',
    groupPath: 'esconderijos',
  })
  assert.equal(observed.boxes.length, 1)
  const point = chooseTargetPoint(observed)
  f.reader.admit(point)
  f.a.opacity = 0
  f.track.putTrackSprite('pista', f.b, 80, 400)
  assert.throws(() => chooseTargetPoint(f.reader.read({ kind: 'lastPoint' })), /Outro personagem/)
  const empty = f.reader.read({ kind: 'outsideGroup', path: 'esconderijos' })
  assert.deepEqual({ ...empty.boxes[1] }, { index: 1, ...f.track.bounds(f.b), opacity: 1 })
  f.track.putTrackSprite('pista', f.a, 0, 5000)
  const unavailable = f.reader.read({
    kind: 'sprite',
    path: 'esconderijo1',
    groupPath: 'esconderijos',
  })
  assert.throws(() => chooseTargetPoint(unavailable), /personagem/)
})

test('official projection capabilities are captured before mutable facades and refuse sprite accessors', () => {
  const f = readerFixture(720)
  f.track.createSpriteTrack('pista')
  f.track.putTrackSprite('pista', f.a, 80, 400)
  const expected = f.track.bounds(f.a)
  assert.ok(expected)
  let calls = 0
  f.track.owns = f.track.bounds = () => {
    calls++
    throw Error('replaced facade')
  }
  const observed = f.reader.read({
    kind: 'sprite',
    path: 'esconderijo1',
    groupPath: 'esconderijos',
  })
  assert.deepEqual({ ...observed.boxes[0] }, { index: 0, ...expected, opacity: 1 })
  Object.defineProperty(f.a, 'x', {
    get() {
      calls++
      return 1
    },
  })
  const inspect = vm.runInContext(
    "__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']()",
    f.context,
  )
  assert.equal(inspect.spriteBounds(f.a), null)
  assert.equal(calls, 0)
})

test('private reader retains actor identity even when its variable/index is replaced', () => {
  const f = readerFixture()
  f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' })
  f.reader.admit({ x: 35, y: 45 })
  const replacement = f.createSprite(f.a)
  f.group.items[0] = replacement
  f.variables.esconderijo1 = replacement
  const observed = f.reader.read({ kind: 'lastPoint' })
  assert.equal(observed.selectedIndex, -1)
  assert.throws(() => chooseTargetPoint(observed), /Outro personagem/)
  f.variables.esconderijos = { items: [replacement] }
  assert.throws(() => f.reader.read({ kind: 'lastPoint' }), /grupo mudou/)
})

test('reader rejects an untrusted Proxy group member before descriptor observation', () => {
  const f = readerFixture()
  let calls = 0
  const proxy = new Proxy(f.a, {
    getOwnPropertyDescriptor(target, key) {
      calls++
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })
  f.group.items[0] = proxy
  f.variables.esconderijo1 = proxy
  assert.throws(
    () => f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' }),
    /grupo oficial/,
  )
  assert.equal(calls, 0)
})

test('reader never invokes target accessors or admits unsupported/non-finite geometry', () => {
  const f = readerFixture()
  let reads = 0
  Object.defineProperty(f.a, 'x', {
    get: () => {
      reads++
      return 10
    },
  })
  assert.throws(
    () => f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' }),
    /observáveis/,
  )
  assert.equal(reads, 0)
  const g = readerFixture()
  g.context.camera.x = 10
  assert.throws(() => g.reader.read({ kind: 'outsideGroup', path: 'esconderijos' }), /câmera/)
  g.context.camera.x = 0
  g.a.x = NaN
  assert.throws(() => g.reader.read({ kind: 'outsideGroup', path: 'esconderijos' }), /não finita/)
})

test('isolated geometry refuses ambiguous/occluded/transformed stages instead of guessing', () => {
  const style = {
    display: 'block',
    opacity: '1',
    visibility: 'visible',
    transform: 'none',
    paddingLeft: '0px',
    paddingRight: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
  }
  const parent = { parentElement: null, style: { ...style } }
  const canvas = {
    clientWidth: 320,
    clientHeight: 180,
    clientLeft: 3,
    clientTop: 5,
    parentElement: parent,
    style: { ...style },
    getBoundingClientRect: () => ({ left: 100, top: 50 }),
  }
  let stages = [canvas],
    hit = canvas
  const context = vm.createContext({
    document: { querySelectorAll: () => stages, elementFromPoint: () => hit },
    getComputedStyle: (element) => element.style,
    innerWidth: 1024,
    innerHeight: 640,
  })
  const read = vm.runInContext(`(${readStageGeometryInPage.toString()})`, context)
  assert.equal(read(null).clientWidth, 320)
  stages = [canvas, canvas]
  assert.throws(() => read(null), /único palco/)
  stages = [canvas]
  hit = parent
  assert.throws(() => read({ x: 200, y: 100 }), /impede/)
  hit = canvas
  parent.style.transform = 'matrix(2,0,0,2,0,0)'
  assert.throws(() => read(null), /ancestrais/)
  parent.style.transform = 'none'
  canvas.style.paddingLeft = '12px'
  assert.throws(() => read(null), /transformação visual/)
  canvas.style.paddingLeft = '0px'
  canvas.style.opacity = '0'
  assert.throws(() => read({ x: 200, y: 100 }), /palco.*visível/)
  canvas.style.opacity = '1'
  parent.style.opacity = '0'
  assert.throws(() => read({ x: 200, y: 100 }), /ancestrais/)
  parent.style.opacity = '0.2'
  assert.equal(read({ x: 200, y: 100 }).clientWidth, 320)
})

test('unknown group accessor never runs during observation and mutable indexOf is not called', () => {
  const f = readerFixture()
  let achados = 0
  f.variables.esconderijos = {
    get items() {
      achados++
      return [f.a]
    },
  }
  assert.throws(
    () => f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' }),
    /grupo.*oficial/i,
  )
  assert.equal(achados, 0)
  f.variables.esconderijos = f.group
  f.group.items.indexOf = () => {
    achados++
    return 0
  }
  assert.equal(
    f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' })
      .selectedIndex,
    0,
  )
  assert.equal(achados, 0)
})

test('private reader does not use the mutable public Game2D facade', () => {
  const f = readerFixture()
  let calls = 0
  f.context.SZGame2D = {
    stageWidth: () => {
      calls++
      return 640
    },
    cameraX: () => {
      calls++
      return 0
    },
  }
  f.reader.read({ kind: 'sprite', path: 'esconderijo1', groupPath: 'esconderijos' })
  assert.equal(calls, 0)
  assert.equal(
    vm.runInContext("Reflect.set(globalThis,'__SZSTUDIO_RUNTIME_INSPECTORS',{})", f.context),
    false,
  )
  assert.equal(
    vm.runInContext(
      "Reflect.set(globalThis.__SZSTUDIO_RUNTIME_INSPECTORS,'game-2d:observation',()=>({}))",
      f.context,
    ),
    false,
  )
})
