import { expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { instrumentCheckScript } from '../../studio/src/check/instrumentCheckScript'
import { gameTwoDRuntime } from '../../studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../studio/src/preview/bootstrap'

async function outputTail(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader(),
    decoder = new TextDecoder()
  let tail = ''
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) return (tail + decoder.decode()).slice(-64_000)
      tail = (tail + decoder.decode(next.value, { stream: true })).slice(-64_000)
    }
  } finally {
    reader.releaseLock()
  }
}

test('native Node24 CDP path ownership contracts, including under Bun CI', async () => {
  const temporaryRoot = resolve(tmpdir()),
    directory = await mkdtemp(join(temporaryRoot, 'sz-click-target-cdp-'))
  if (!resolve(directory).startsWith(temporaryRoot + sep))
    throw new Error('Unsafe native fixture path')
  let child: Pick<ReturnType<typeof Bun.spawn>, 'exitCode' | 'kill' | 'exited'> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let expired = false
  try {
    const html = buildPreviewDoc({
      html: '<html><head></head><body></body></html>',
      css: '',
      js: '',
      runtimeInspection: true,
      extensionScripts: [gameTwoDRuntime],
    })
    const bootstrap = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find((script) =>
      script[2]?.includes('window.__SZSTUDIO_RUNTIME_INSPECTORS = Object.create(null)'),
    )?.[2]
    if (!bootstrap) throw new Error('Trusted inspection bootstrap missing')
    const scope = '__sz0123456789abcdef01234567'
    const pupil = instrumentCheckScript(
      `
var authorEffects=0;
var sprite=SZGame2D.createSprite({x:31,y:47,w:20,h:30});
var group=SZGame2D.createGroup();SZGame2D.addToGroup(group,sprite);
var jogo={cena:{alvos:{personagem:sprite,grupo:group}}};
var taggedNamespace={personagem:sprite};Object.defineProperty(taggedNamespace,Symbol.toStringTag,{get(){authorEffects++;return 'Autoral'}});
var traps={getOwnPropertyDescriptor(target,key){authorEffects++;return Reflect.getOwnPropertyDescriptor(target,key)},get(target,key,receiver){authorEffects++;return Reflect.get(target,key,receiver)},ownKeys(target){authorEffects++;return Reflect.ownKeys(target)}};
var namespaceProxy=new Proxy({personagem:sprite},traps);
var targetProxyNamespace={personagem:new Proxy(sprite,traps)};
var groupProxy=new Proxy(group,traps);
var accessorNamespace={};Object.defineProperty(accessorNamespace,'personagem',{get(){authorEffects++;return sprite}});
var revocable=Proxy.revocable({personagem:sprite},traps);revocable.revoke();var revokedNamespace=revocable.proxy;
var fakeScopeBox=new Proxy({v:sprite},traps);
globalThis[${JSON.stringify(scope)}].add(function(name){return name==='fakeBox'?fakeScopeBox:null},[]);
`,
      scope,
    )
    const fixture = join(directory, 'fixture.js')
    await writeFile(
      fixture,
      `window=globalThis;window.addEventListener=function(){};requestAnimationFrame=function(){return 0};document={addEventListener(){},hidden:false,querySelector(){return null}};\n${bootstrap}\n${gameTwoDRuntime}\n${pupil}`,
    )
    const native = Bun.spawn(
      [
        process.env.STUDIO_RUNTIME_TEST_NODE ?? process.env.STUDIO_PYTHON_TEST_NODE ?? 'node',
        '--test-reporter=tap',
        fileURLToPath(new URL('./click-target-cdp.cases.mjs', import.meta.url)),
        fixture,
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
        windowsHide: true,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      },
    )
    child = native
    timer = setTimeout(() => {
      expired = true
      native.kill()
    }, 20_000)
    const [code, stdout, stderr] = await Promise.all([
      native.exited,
      outputTail(native.stdout),
      outputTail(native.stderr),
    ])
    const output = `${stdout}\n${stderr}`.replace(/\r\n/g, '\n')
    if (
      expired ||
      code !== 0 ||
      !/^# tests 7$/m.test(output) ||
      !/^# pass 7$/m.test(output) ||
      !/^# fail 0$/m.test(output) ||
      !/^# cancelled 0$/m.test(output) ||
      !/^# skipped 0$/m.test(output)
    )
      throw new Error(`Native CDP: exit=${code}, expired=${expired}\n${output.slice(-12_000)}`)
    expect(code).toBe(0)
    console.info(
      'Native Node24 CDP:7 passed,0 failed/cancelled/skipped; Chromium qualification is separate',
    )
  } finally {
    clearTimeout(timer)
    if (child?.exitCode === null) child.kill()
    await child?.exited
    await rm(directory, { recursive: true, force: true })
  }
}, 25_000)
