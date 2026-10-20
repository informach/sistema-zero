import assert from 'node:assert/strict'
import inspector from 'node:inspector'
import test from 'node:test'
import vm from 'node:vm'
import { gameTwoDInspectionRuntime } from '../../studio/src/official-extensions/game-2d/runtime/inspection.ts'
import { gameTwoDLifecycleRuntime } from '../../studio/src/official-extensions/game-2d/runtime/lifecycle.ts'
import { gameTwoDSpritesRuntime } from '../../studio/src/official-extensions/game-2d/runtime/sprites.ts'
import {
  createClickTargetHandle,
  createClickTargetReaderInPage,
  observeSpriteMotion,
} from '../runtime/check-click-target.mjs'

assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the repository Node24 toolchain')

// Real lifecycle/inspection fragments; native full-engine/Chromium remains a later gate.
function motor(name = 'directional-fixture') {
  const context = vm.createContext({}, { name })
  vm.runInContext(
    `window=globalThis;window.addEventListener=function(){};
    document={hidden:false};let nextFrame;
    requestAnimationFrame=fn=>(nextFrame=fn,1);cancelAnimationFrame=()=>{};
    __SZSTUDIO_RUNTIME_INSPECTORS={};
    HTMLCanvasElement=(()=>{const sizes=new WeakMap();return class {
      constructor(){sizes.set(this,{width:640,height:480})}
      get width(){const size=sizes.get(this);if(!size)throw TypeError('brand');return size.width}
      get height(){const size=sizes.get(this);if(!size)throw TypeError('brand');return size.height}
    }})();
    var _stageCanvas=new HTMLCanvasElement(),_logicalW=640,_logicalH=480,camera={x:0,y:0};
    var _managedGroups=new WeakSet(),_managedSprites=new WeakSet();
    var fixtureProjected=false;
    var _spriteScene={owns(){return fixtureProjected},bounds(){return null},release(){},active(){return false},simulationBlocked(){return false}};
    var _spriteGroupOwners=new WeakMap();
    function _removeSpriteClickHandlers(){};
    function _isFiniteNumber(value){return typeof value==='number'&&Number.isFinite(value)};
    function _finiteNumber(value,fallback){return _isFiniteNumber(value)?value:fallback};
    var _paused=false,_warnedOnce={},particles=[];
    function _runOverlapHandlers(){};function warnOnce(){};function _registerRuntimeDomain(){};
    function stepFixtureFrame(time){const fn=nextFrame;nextFrame=null;if(fn)fn(time)};
    function fixtureSprite(x,y){return createSprite({x,y,w:20,h:20})};`,
    context,
  )
  vm.runInContext(gameTwoDSpritesRuntime, context)
  vm.runInContext(gameTwoDLifecycleRuntime, context)
  vm.runInContext(gameTwoDInspectionRuntime, context)
  return context
}
test('official clock observes actual driver frames, pause and errors before its first read', () => {
  const result = vm.runInContext(
    `(() => {
    gameLoop(()=>{throw Error('author callback')},'author');
    stepFixtureFrame(100);
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const first=inspect.lifecycle();
    _paused=true;const paused=inspect.lifecycle();
    return {first,paused};
  })()`,
    motor(),
  )
  assert.equal(result.first.frame, 1)
  assert.equal(result.first.errors, 1)
  assert.equal(result.first.paused, false)
  assert.equal(result.paused.paused, true)
})

test('private reader binds identity and reports the motor state without adding a game global', () => {
  const context = motor()
  vm.runInContext(`fixtureScope={get(){return {v:actor}}};actor=fixtureSprite(50,70);`, context)
  const reader = vm.runInContext(
    `(${createClickTargetReaderInPage.toString()})({scope:'fixtureScope',maxGroupItems:64})`,
    context,
  )
  const actor = vm.runInContext('actor', context)
  assert.equal(reader.position(actor).y, 70)
  assert.throws(() => reader.position(vm.runInContext('fixtureSprite(50,70)', context)), /mudou/)
  assert.equal(vm.runInContext(`typeof window.motionResult`, context), 'undefined')
})

test('the real orchestrator observes idle before input, uses fresh action initial and disposes once', async () => {
  const order = [],
    samples = [
      { x: 50, y: 70, frame: 1, generation: 0, errors: 0, paused: false },
      { x: 50, y: 70, frame: 6, generation: 0, errors: 0, paused: false },
      { x: 50, y: 70, frame: 7, generation: 0, errors: 0, paused: false },
      { x: 50, y: 65, frame: 12, generation: 0, errors: 0, paused: false },
    ]
  const target = { kind: 'spritePosition', path: 'hero', axis: 'y' }
  const result = await observeSpriteMotion(
    {
      async handle() {
        order.push('handle')
        return {
          async position(current) {
            assert.equal(current, target)
            order.push('read')
            return samples.shift()
          },
          async dispose() {
            order.push('dispose')
          },
        }
      },
    },
    { scope: 'fixtureScope', target, idleMs: 80 },
    async (ms) => {
      assert.equal(ms, 80)
      order.push('idle')
    },
    async () => {
      order.push('real-input-port')
    },
  )
  assert.deepEqual(order, [
    'handle',
    'read',
    'idle',
    'read',
    'read',
    'real-input-port',
    'read',
    'dispose',
  ])
  assert.equal(result.initial.value, 70)
  assert.equal(result.final.value, 65)
  assert.equal(result.motion.actionInitial.frame, 7)
})

test('observer preserves primary and cleanup failures, even an undefined rejection', async () => {
  for (const rejected of [Error('input failed'), undefined]) {
    const cleanup = Error('cleanup failed')
    let reads = 0,
      disposed = 0,
      caught
    try {
      await observeSpriteMotion(
        {
          async handle() {
            return {
              async position() {
                reads++
                return {}
              },
              async dispose() {
                disposed++
                throw cleanup
              },
            }
          },
        },
        { scope: 'fixtureScope', target: { path: 'hero', axis: 'y' }, idleMs: 80 },
        async () => {},
        async () => {
          throw rejected
        },
      )
    } catch (error) {
      caught = error
    }
    assert(caught instanceof AggregateError)
    assert.deepEqual(caught.errors, [rejected, cleanup])
    assert.equal(disposed, 1)
    assert.equal(reads, 3)
  }
})
test('position admission uses official identity before descriptors, with no authored getter or Proxy traps', () => {
  const result = vm.runInContext(
    `(() => {
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const sprite=fixtureSprite(123,-50);let calls=0;
    const good=inspect.spritePosition(sprite);
    const proxy=new Proxy(sprite,{getOwnPropertyDescriptor(){calls++;throw Error('trap')}});
    const unknown=new Proxy({},{getOwnPropertyDescriptor(){calls++;throw Error('trap')}});
    const badProxy=inspect.spritePosition(proxy),badUnknown=inspect.spritePosition(unknown);
    Object.defineProperty(sprite,'y',{get(){calls++;return -999}});
    const getter=inspect.spritePosition(sprite);
    return {good,badProxy,badUnknown,getter,calls};
  })()`,
    motor(),
  )
  assert.equal(result.good.x, 123)
  assert.equal(result.good.y, -50)
  assert.equal(result.badProxy, null)
  assert.equal(result.badUnknown, null)
  assert.equal(result.getter, null)
  assert.equal(result.calls, 0)
})

test('camera and projected sprites are explicitly unavailable in the first free-motion capability', () => {
  const context = motor()
  vm.runInContext(`fixtureScope={get(){return {v:actor}}};actor=fixtureSprite(50,70);`, context)
  const reader = vm.runInContext(
    `(${createClickTargetReaderInPage.toString()})({scope:'fixtureScope',maxGroupItems:64})`,
    context,
  )
  const actor = vm.runInContext('actor', context)
  vm.runInContext('camera.x=5', context)
  assert.throws(() => reader.position(actor), /palco estável/)
  vm.runInContext('camera.x=0;fixtureProjected=true', context)
  assert.throws(() => reader.position(actor), /sprite livre oficial/)
  vm.runInContext('fixtureProjected=false', context)
  assert.equal(reader.position(actor).x, 50)
})

test('failed initial observation never sends input and still releases its private handle', async () => {
  const primary = Error('missing actor')
  let inputs = 0,
    disposed = 0,
    idles = 0
  await assert.rejects(
    observeSpriteMotion(
      {
        async handle() {
          return {
            async position() {
              throw primary
            },
            async dispose() {
              disposed++
            },
          }
        },
      },
      { scope: 'fixtureScope', target: { path: 'hero', axis: 'y' }, idleMs: 80 },
      async () => {
        idles++
      },
      async () => {
        inputs++
      },
    ),
    (error) => error === primary,
  )
  assert.equal(inputs, 0)
  assert.equal(idles, 0)
  assert.equal(disposed, 1)
})

test('native CDP position resolves references and refuses Proxy/getter paths before observation', async () => {
  const session = new inspector.Session()
  session.connect()
  let contextId
  session.on('Runtime.executionContextCreated', ({ params }) => {
    if (params.context.name === 'directional-cdp-owned') contextId = params.context.id
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result))),
    )
  let handle
  try {
    await send('Runtime.enable')
    const context = motor('directional-cdp-owned')
    vm.runInContext(
      `var authorEffects=0,actor=fixtureSprite(50,70),actors={avatar:actor};
      var proxy=new Proxy(actors,{getOwnPropertyDescriptor(){authorEffects++;throw Error('trap')}});
      Object.defineProperty(actors,'getter',{get(){authorEffects++;return actor}});
      var fixtureScope={get(name){return {v:name==='actors'?actors:proxy}}};`,
      context,
    )
    assert.ok(contextId)
    const cdp = {
      send(method, params) {
        return send(method, method === 'Runtime.evaluate' ? { ...params, contextId } : params)
      },
    }
    handle = await createClickTargetHandle(cdp, createClickTargetReaderInPage, {
      scope: 'fixtureScope',
      maxGroupItems: 64,
    })
    assert.equal((await handle.position({ path: 'actors.avatar' })).y, 70)
    await assert.rejects(handle.position({ path: 'unknown.avatar' }), /Proxy/)
    await assert.rejects(handle.position({ path: 'actors.getter' }), /observável/)
    assert.equal(vm.runInContext('authorEffects', context), 0)
    vm.runInContext('actors.avatar=fixtureSprite(50,70)', context)
    await assert.rejects(handle.position({ path: 'actors.avatar' }), /mudou/)
  } finally {
    try {
      await handle?.dispose()
    } finally {
      session.disconnect()
    }
  }
})

test('official destruction rejects a finite-position sprite before any authored descriptor read', () => {
  const result = vm.runInContext(
    `(() => {
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const actor=createSprite({x:50,y:70,w:20,h:20});
    actor.destroyed=true;
    const authoredFlagIgnored=inspect.spritePosition(actor);
    destroySprite(actor);
    const stillManaged=_managedSprites.has(actor), destroyed=_destroyedSprites.has(actor);
    const finite=Number.isFinite(actor.x)&&Number.isFinite(actor.y);
    const position=inspect.spritePosition(actor);
    WeakSet.prototype.has=function(){throw Error('authored replacement')};
    let calls=0;
    Object.defineProperty(actor,'x',{get(){calls++;return 999}});
    const getterPosition=inspect.spritePosition(actor);
    return {stillManaged,destroyed,finite,position,getterPosition,calls,authoredFlagIgnored};
  })()`,
    motor(),
  )
  assert.equal(result.stillManaged, true)
  assert.equal(result.destroyed, true)
  assert.equal(result.finite, true)
  assert.equal(result.authoredFlagIgnored.y, 70)
  assert.equal(result.position, null)
  assert.equal(result.getterPosition, null)
  assert.equal(result.calls, 0)
})

test('destruction between observed samples aborts as unavailable and cannot yield a false or passing coordinate', async () => {
  for (const phase of ['idle', 'action']) {
    const context = motor()
    vm.runInContext(
      `fixtureScope={get(){return {v:actor}}};actor=createSprite({x:50,y:70,w:20,h:20});`,
      context,
    )
    const reader = vm.runInContext(
      `(${createClickTargetReaderInPage.toString()})({scope:'fixtureScope',maxGroupItems:64})`,
      context,
    )
    const actor = vm.runInContext('actor', context)
    let disposed = 0,
      inputs = 0,
      observed
    await assert.rejects(async () => {
      observed = await observeSpriteMotion(
        {
          async handle() {
            return {
              async position() {
                return reader.position(actor)
              },
              async dispose() {
                disposed++
              },
            }
          },
        },
        { scope: 'fixtureScope', target: { path: 'actor', axis: 'y' }, idleMs: 80 },
        async () => {
          if (phase === 'idle') vm.runInContext('destroySprite(actor);actor.y-=20', context)
        },
        async () => {
          inputs++
          vm.runInContext('destroySprite(actor);actor.y-=20', context)
        },
      )
    }, /sprite livre oficial/)
    assert.equal(observed, undefined)
    assert.equal(disposed, 1)
    assert.equal(inputs, phase === 'idle' ? 0 : 1)
  }
})
