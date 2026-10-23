import { expect, test } from 'bun:test'
import vm from 'node:vm'
import { buildPreviewDoc } from '../../../preview/bootstrap'
import { gameTwoDRuntime } from '../runtime'

function diagnosticBootstrap(imports: Record<string, string> = {}) {
  const document = buildPreviewDoc({
    html: '<html><head><script>window.studentHeadRan = true</script></head><body></body></html>',
    css: '',
    js: '',
    runtimeInspection: true,
    extensionScripts: [gameTwoDRuntime],
    extensionImports: imports,
  })
  const scripts = [...document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  const bootstrap = scripts.find((script) =>
    script[2]?.includes('window.__SZSTUDIO_RUNTIME_INSPECTORS = Object.create(null)'),
  )
  const source = bootstrap?.[2]
  if (!bootstrap || typeof source !== 'string')
    throw new Error('Trusted diagnostic bootstrap missing')
  expect(bootstrap[1]).not.toContain('module')
  expect(document.indexOf(bootstrap[0])).toBeLessThan(
    document.indexOf('game-2d:observation', document.indexOf(bootstrap[0]) + bootstrap[0].length),
  )
  return source
}

/** VM models the native canvas receiver check; Chromium qualification is separate. */
function canvasContext(beforeRuntime = '') {
  const context = vm.createContext({})
  vm.runInContext(
    `window=globalThis; window.addEventListener=function(){}; requestAnimationFrame=function(){return 0};
    window.devicePixelRatio=1; window.innerWidth=640; window.innerHeight=720;
    globalThis.domReads=0; globalThis.canvasCreates=0;
    globalThis.CanvasRenderingContext2D=(() => {
      const canvases=new WeakMap();
      return class CanvasRenderingContext2D {
        constructor(canvas){canvases.set(this,canvas)}
        get canvas(){if(!canvases.has(this))throw new TypeError('Illegal invocation');return canvases.get(this)}
        setTransform(){}
      };
    })();
    globalThis.HTMLCanvasElement=(() => {
      const sizes=new WeakMap();
      return class HTMLCanvasElement {
        constructor(){sizes.set(this,{width:640,height:720});this.style={}}
        get width(){const size=sizes.get(this);if(!size)throw new TypeError('Illegal invocation');return size.width}
        set width(value){const size=sizes.get(this);if(!size)throw new TypeError('Illegal invocation');size.width=value}
        get height(){const size=sizes.get(this);if(!size)throw new TypeError('Illegal invocation');return size.height}
        set height(value){const size=sizes.get(this);if(!size)throw new TypeError('Illegal invocation');size.height=value}
        setAttribute(){} hasAttribute(){return false}
        getContext(){return new CanvasRenderingContext2D(this)}
        getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:640,height:720}}
      };
    })();
    globalThis.fixtureCanvas=new HTMLCanvasElement();
    document={addEventListener(){},hidden:false,querySelector(){domReads++;return fixtureCanvas},
      getElementById(){domReads++;return {}},createElement(){canvasCreates++;throw new Error('Unexpected canvas creation')}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap(), context)
  if (beforeRuntime) vm.runInContext(beforeRuntime, context)
  vm.runInContext(gameTwoDRuntime, context)
  return context
}

test('official repeatTrackSprite copies retain managed identity and projected bounds', () => {
  const result = vm.runInContext(
    `(() => {
      const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
      const group=SZGame2D.createGroup(),source=SZGame2D.createSprite({x:10,y:20,w:50,h:50});
      SZGame2D.addToGroup(group,source);SZGame2D.createSpriteTrack('pista');
      SZGame2D.putTrackSprite('pista',source,80,400);
      SZGame2D.repeatTrackSprite('pista',source,2,200,'line');
      const copy=group.items[1], snapshot=inspect.groupItems(group,64), bounds=inspect.spriteBounds(copy);
      let calls=0;const proxy=new Proxy(copy,{getOwnPropertyDescriptor(){calls++;throw Error('Proxy read')}});
      const rejected=inspect.spriteBounds(proxy)===null;
      SZGame2D.addToGroup(group,proxy);calls=0;
      return {size:snapshot?.length,copyIncluded:snapshot?.[1]===copy,projected:bounds?.projected,
        width:bounds?.bounds?.w,rejected,proxyGroupRejected:inspect.groupItems(group,64)===null,calls};
    })()`,
    canvasContext(),
  )
  expect(result.size).toBe(2)
  expect(result.copyIncluded).toBe(true)
  expect(result.projected).toBe(true)
  expect(result.width).toBeGreaterThan(0)
  expect(result.rejected).toBe(true)
  expect(result.proxyGroupRejected).toBe(true)
  expect(result.calls).toBe(0)
})

test('implicit canvas dimensions are observed without creating a stage or invoking authored getters', () => {
  const result = vm.runInContext(
    `(() => {
      const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
      const beforeReads=domReads,missing=inspect.stage(),missingReads=domReads-beforeReads;
      SZGame2D.onPointer(function(){});
      let calls=0;
      Object.defineProperty(fixtureCanvas,'width',{get(){calls++;return 99}});
      Object.defineProperty(fixtureCanvas,'height',{get(){calls++;return 99}});
      Object.defineProperty(HTMLCanvasElement.prototype,'width',{get(){calls++;return 99}});
      Object.defineProperty(HTMLCanvasElement.prototype,'height',{get(){calls++;return 99}});
      globalThis.HTMLCanvasElement=function(){calls++};
      const boundReads=domReads,stage=inspect.stage();
      return {missing,missingReads,stage,calls,observationReads:domReads-boundReads,canvasCreates};
    })()`,
    canvasContext(),
  )
  expect(result.missing).toBeNull()
  expect(result.missingReads).toBe(0)
  expect({ ...result.stage }).toEqual({ width: 640, height: 720, cameraX: 0, cameraY: 0 })
  expect(result.calls).toBe(0)
  expect(result.observationReads).toBe(0)
  expect(result.canvasCreates).toBe(0)
})

test('explicit logical dimensions take precedence over the native backing dimensions', () => {
  const result = vm.runInContext(
    `(() => {
      const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
      SZGame2D.setupStage(320,240);fixtureCanvas.width=1280;fixtureCanvas.height=960;
      return inspect.stage();
    })()`,
    canvasContext(),
  )
  expect({ ...result }).toEqual({ width: 320, height: 240, cameraX: 0, cameraY: 0 })
})

test('implicit stage observation rejects a Proxy canvas receiver without invoking its traps', () => {
  const result = vm.runInContext(
    `(() => {
      let calls=0;fixtureCanvas=new Proxy(fixtureCanvas,{get(target,key,receiver){calls++;return Reflect.get(target,key,receiver)}});
      SZGame2D.onPointer(function(){});calls=0;
      const stage=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage();
      return {stage,calls};
    })()`,
    canvasContext(),
  )
  expect(result.stage).toBeNull()
  expect(result.calls).toBe(0)
})

test('implicit stage without a drawing context remains unavailable like the public dimensions', () => {
  const result = vm.runInContext(
    `(() => {
      fixtureCanvas.getContext=function(){return null};SZGame2D.onPointer(function(){});
      return {width:SZGame2D.stageWidth(),height:SZGame2D.stageHeight(),
        stage:__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage()};
    })()`,
    canvasContext(),
  )
  expect(result.width).toBe(0)
  expect(result.height).toBe(0)
  expect(result.stage).toBeNull()
})

test('implicit stage rejects a fake context instead of disagreeing with public dimensions', () => {
  const result = vm.runInContext(
    `(() => {
      fixtureCanvas.getContext=function(){return {}};SZGame2D.onPointer(function(){});
      return {width:SZGame2D.stageWidth(),height:SZGame2D.stageHeight(),
        stage:__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage()};
    })()`,
    canvasContext(),
  )
  expect(result.width).toBe(0)
  expect(result.height).toBe(0)
  expect(result.stage).toBeNull()
})

test('implicit context observation uses its captured native canvas getter without author effects', () => {
  const result = vm.runInContext(
    `(() => {
      const context=fixtureCanvas.getContext('2d');fixtureCanvas.getContext=function(){return context};
      SZGame2D.onPointer(function(){});let calls=0;
      Object.defineProperty(context,'canvas',{get(){calls++;return null}});
      Object.defineProperty(CanvasRenderingContext2D.prototype,'canvas',{get(){calls++;return null}});
      globalThis.CanvasRenderingContext2D=function(){calls++};
      const reads=domReads,stage=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage();
      return {stage,calls,reads:domReads-reads};
    })()`,
    canvasContext(),
  )
  expect({ ...result.stage }).toEqual({ width: 640, height: 720, cameraX: 0, cameraY: 0 })
  expect(result.calls).toBe(0)
  expect(result.reads).toBe(0)
})

test('implicit stage refuses an authored context canvas getter without invoking it', () => {
  const result = vm.runInContext(
    `(() => {
      let calls=0;fixtureCanvas.getContext=function(){return {get canvas(){calls++;return fixtureCanvas}}};
      SZGame2D.onPointer(function(){});calls=0;
      return {stage:__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage(),calls};
    })()`,
    canvasContext(),
  )
  expect(result.stage).toBeNull()
  expect(result.calls).toBe(0)
})

test('implicit stage refuses a Proxy context without reading its traps', () => {
  const result = vm.runInContext(
    `(() => {
      let calls=0;const context=fixtureCanvas.getContext('2d');
      const proxy=new Proxy(context,{get(target,key,receiver){calls++;return Reflect.get(target,key,receiver)}});
      fixtureCanvas.getContext=function(){return proxy};SZGame2D.onPointer(function(){});calls=0;
      return {stage:__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage(),calls};
    })()`,
    canvasContext(),
  )
  expect(result.stage).toBeNull()
  expect(result.calls).toBe(0)
})

test('implicit stage requires the native context to belong to the bound canvas', () => {
  const result = vm.runInContext(
    `(() => {
      const other=new HTMLCanvasElement(),context=other.getContext('2d');
      fixtureCanvas.getContext=function(){return context};SZGame2D.onPointer(function(){});
      return __SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']().stage();
    })()`,
    canvasContext(),
  )
  expect(result).toBeNull()
})

test('missing native context getter makes implicit stage unavailable but preserves logical dimensions', () => {
  const result = vm.runInContext(
    `(() => {
      const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();SZGame2D.onPointer(function(){});
      const implicit=inspect.stage();SZGame2D.setupStage(320,240);
      return {implicit,logical:inspect.stage()};
    })()`,
    canvasContext('delete CanvasRenderingContext2D.prototype.canvas'),
  )
  expect(result.implicit).toBeNull()
  expect({ ...result.logical }).toEqual({ width: 320, height: 240, cameraX: 0, cameraY: 0 })
})

test('official managed groups are readable but unknown getters and forged public API are never called', () => {
  const context = vm.createContext({})
  vm.runInContext(
    `window = globalThis; window.addEventListener = function() {}; requestAnimationFrame = function() { return 0 }; document = {addEventListener() {}, hidden:false, querySelector() {return null}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap(), context)
  vm.runInContext(gameTwoDRuntime, context)
  const result = vm.runInContext(
    `(() => {
    const registry = window.__SZSTUDIO_RUNTIME_INSPECTORS;
    const inspect = registry['game-2d:observation']();
    const group = window.SZGame2D.createGroup();
    const sprite = window.SZGame2D.createSprite({x:31,y:47});
    window.SZGame2D.addToGroup(group, sprite);
    let calls = 0;
    const fake = {get items() { calls++; return [sprite] }};
    const rejected = inspect.groupItems(fake, 64) === null;
    const snapshot = inspect.groupItems(group, 64);
    window.SZGame2D = {inspectGroup() { calls++; return [sprite] }};
    const replaceRegistry = Reflect.set(window, '__SZSTUDIO_RUNTIME_INSPECTORS', {'game-2d:observation':()=>({})});
    const replaceFunction = Reflect.set(registry, 'game-2d:observation', () => { calls++ });
    WeakSet.prototype.has = function() { calls++; return true };
    Object.getOwnPropertyDescriptor = function() { calls++; throw new Error('forged') };
    const rejectedAfter = inspect.groupItems(fake, 64) === null;
    const current = inspect.groupItems(group, 64);
    return {calls,rejected,rejectedAfter,replaceRegistry,replaceFunction,sameActor:snapshot[0]===sprite && current[0]===sprite,
      frozen:Object.isFrozen(inspect) && Object.isFrozen(snapshot),size:current.length};
  })()`,
    context,
  )
  expect({ ...result }).toEqual({
    calls: 0,
    rejected: true,
    rejectedAfter: true,
    replaceRegistry: false,
    replaceFunction: false,
    sameActor: true,
    frozen: true,
    size: 1,
  })
})

test('ESM bootstrap reserves an unavailable observer before student HTML can forge one', () => {
  const context = vm.createContext({})
  vm.runInContext(
    `window = globalThis; window.addEventListener = function() {}; requestAnimationFrame = function() { return 0 }; document = {addEventListener() {}, hidden:false, querySelector() {return null}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap({ three: 'https://example.invalid/three.js' }), context)
  const result = vm.runInContext(
    `(() => {
    const registry = window.__SZSTUDIO_RUNTIME_INSPECTORS;
    return {value: registry['game-2d:observation'], forged: Reflect.set(registry, 'game-2d:observation', () => ({}))};
  })()`,
    context,
  )
  expect(result.value).toBeNull()
  expect(result.forged).toBe(false)
  vm.runInContext(gameTwoDRuntime, context)
  expect(
    vm.runInContext(`window.__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']`, context),
  ).toBeNull()
})

test('sprite bounds observation uses direct data and never runs a sprite getter', () => {
  const context = vm.createContext({})
  vm.runInContext(
    `window=globalThis; window.addEventListener=function(){}; requestAnimationFrame=function(){return 0}; document={addEventListener(){},hidden:false,querySelector(){return null}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap(), context)
  vm.runInContext(gameTwoDRuntime, context)
  const result = vm.runInContext(
    `(() => {
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const sprite=SZGame2D.createSprite({x:31,y:47,w:20,h:30});
    const before=inspect.spriteBounds(sprite);
    let calls=0;
    Object.defineProperty(sprite,'x',{get(){calls++;return 99}});
    return {before,after:inspect.spriteBounds(sprite),calls};
  })()`,
    context,
  )
  expect({ ...result.before.bounds }).toEqual({ x: 31, y: 47, w: 20, h: 30 })
  expect(result.before.projected).toBe(false)
  expect(result.after).toBeNull()
  expect(result.calls).toBe(0)
})

test('official group snapshots and bounds reject Proxy sprites without running descriptor traps', () => {
  const context = vm.createContext({})
  vm.runInContext(
    `window=globalThis; window.addEventListener=function(){}; requestAnimationFrame=function(){return 0}; document={addEventListener(){},hidden:false,querySelector(){return null}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap(), context)
  vm.runInContext(gameTwoDRuntime, context)
  const result = vm.runInContext(
    `(() => {
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const sprite=SZGame2D.createSprite({x:31,y:47,w:20,h:30});
    let calls=0;
    const proxy=new Proxy(sprite,{getOwnPropertyDescriptor(target,key){calls++;return Reflect.getOwnPropertyDescriptor(target,key)}});
    const group=SZGame2D.createGroup();SZGame2D.addToGroup(group,proxy);
    const proxyGroup=new Proxy(group,{get(target,key,receiver){calls++;return Reflect.get(target,key,receiver)}});
    calls=0;
    return {directRejected:inspect.spriteBounds(proxy)===null,memberRejected:inspect.groupItems(group,64)===null,
      groupRejected:inspect.groupItems(proxyGroup,64)===null,calls};
  })()`,
    context,
  )
  expect({ ...result }).toEqual({
    directRejected: true,
    memberRejected: true,
    groupRejected: true,
    calls: 0,
  })
})

test('sprite and group registration do not expose private identity sets through a later add monkeypatch', () => {
  const context = vm.createContext({})
  vm.runInContext(
    `window=globalThis; window.addEventListener=function(){}; requestAnimationFrame=function(){return 0}; document={addEventListener(){},hidden:false,querySelector(){return null}};`,
    context,
  )
  vm.runInContext(diagnosticBootstrap(), context)
  vm.runInContext(gameTwoDRuntime, context)
  const result = vm.runInContext(
    `(() => {
    const inspect=__SZSTUDIO_RUNTIME_INSPECTORS['game-2d:observation']();
    const original=WeakSet.prototype.add,escaped=[];
    WeakSet.prototype.add=function(value){escaped.push(this);return Reflect.apply(original,this,[value])};
    const group=SZGame2D.createGroup(),sprite=SZGame2D.createSprite({x:31,y:47,w:20,h:30});
    SZGame2D.addToGroup(group,sprite);
    const mirror=SZGame2D.createAllEnemiesGroup();
    WeakSet.prototype.add=original;
    let hasCalls=0;WeakSet.prototype.has=function(){hasCalls++;return true};
    const snapshot=inspect.groupItems(group,64),emptyMirror=inspect.groupItems(mirror,64);
    const bounds=inspect.spriteBounds(sprite);
    return {escaped:escaped.length,hasCalls,size:snapshot?.length,mirrorSize:emptyMirror?.length,bounds:bounds?.bounds};
  })()`,
    context,
  )
  expect({ ...result, bounds: { ...result.bounds } }).toEqual({
    escaped: 0,
    hasCalls: 0,
    size: 1,
    mirrorSize: 0,
    bounds: { x: 31, y: 47, w: 20, h: 30 },
  })
})
