import { type CDPSession, expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test.use({
  // Trace DOM snapshots use Playwright evaluation and can grant activation before Jogar.
  // Keep CDP observations/attachments instead; autoplay must see a genuinely untouched page.
  trace: 'off',
  launchOptions: {
    ignoreDefaultArgs: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  },
})

test.beforeEach(async ({ request }, testInfo) => {
  await testInfo.attach('audio-runtime-distribution', {
    body: await (await request.get('/distribution')).body(),
    contentType: 'application/json',
  })
})

const inputPages = new WeakMap<CDPSession, Page>()

// Playwright evaluation can mark user activation. CDP reads explicitly refuse that privilege.
async function evaluate<Value>(cdp: CDPSession, expression: string): Promise<Value> {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  })
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
  return response.result.value as Value
}

async function until(cdp: CDPSession, predicate: string) {
  await evaluate(
    cdp,
    `new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{clearInterval(poll);reject(new Error('Audio integration deadline '+JSON.stringify({state:globalThis.providerProbe?.read('audio'),media:globalThis.__audioMedia?.map(media=>({paused:media.paused,src:media.getAttribute('src'),currentTime:media.currentTime,readyState:media.readyState,error:media.error?.code})),activation:navigator.userActivation.hasBeenActive})))},20000);
    const poll=setInterval(()=>{if(${predicate}){clearTimeout(timeout);clearInterval(poll);resolve(true)}},20);
  })`,
  )
}

async function click(cdp: CDPSession, selector: string) {
  const position = await evaluate<{ x: number; y: number }>(
    cdp,
    `(()=>{
    const button=document.querySelector(${JSON.stringify(selector)});
    const bounds=button.getBoundingClientRect();
    globalThis.__audioClick={selector:${JSON.stringify(selector)},before:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},events:[]};
    for(const type of ['pointerdown','pointerup','click']) document.addEventListener(type,event=>{
      if(globalThis.__audioClick.events.length<12)globalThis.__audioClick.events.push({type:event.type,trusted:event.isTrusted,x:event.clientX,y:event.clientY,target:event.target?.getAttribute?.('data-audio-control')??event.target?.tagName});
    },{capture:true,once:true});
    return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  })()`,
  )
  const page = inputPages.get(cdp)
  if (!page) throw new Error('Audio input page not registered')
  // Use real pointer input with stable/receives-events checks. Bare coordinate
  // dispatch did not deliver pointerdown in the captured failing run.
  await page.locator(selector).click()
  const delivered = await evaluate<{ clicked: boolean; detail: unknown }>(
    cdp,
    `(()=>{
    const button=document.querySelector(${JSON.stringify(selector)});
    const bounds=button.getBoundingClientRect();
    return {clicked:globalThis.__audioClick.events.filter(event=>event.type==='click'&&event.trusted&&event.target===button.getAttribute('data-audio-control')).length===1,
      detail:{...globalThis.__audioClick,after:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},hit:document.elementFromPoint(${position.x},${position.y})?.outerHTML}};
  })()`,
  )
  expect(delivered.clicked, JSON.stringify(delivered.detail)).toBe(true)
}

const state = "globalThis.providerProbe.read('audio')"
const media = `globalThis.__audioMedia.map(media=>({paused:media.paused,src:media.getAttribute('src'),currentTime:media.currentTime,readyState:media.readyState,error:media.error?.code}))`

async function prepare(page: Page, fixture: string) {
  const cdp = await page.context().newCDPSession(page)
  await page.goto('/provider')
  await evaluate(
    cdp,
    `
    globalThis.__audioMedia=[];
    globalThis.Audio=new Proxy(globalThis.Audio,{construct(target,args){
      const media=Reflect.construct(target,args,target);
      globalThis.__audioMedia.push(media);
      return media;
    }});
  `,
  )
  expect(await evaluate(cdp, 'Array.isArray(globalThis.__audioMedia)')).toBe(true)
  inputPages.set(cdp, page)
  await until(cdp, '!!globalThis.providerProbe')
  await evaluate(cdp, `globalThis.providerProbe.prepare('audio',${JSON.stringify(fixture)})`)
  const prepared = await evaluate<{ status: string }>(cdp, state)
  expect(prepared.status, JSON.stringify(prepared)).toBe('ready')
  expect(await evaluate(cdp, 'navigator.userActivation.hasBeenActive')).toBe(false)
  return cdp
}

test('Python audio without a user gesture reports the browser autoplay denial', async ({
  page,
}, testInfo) => {
  const cdp = await prepare(page, 'portableAudio')
  await evaluate(cdp, "globalThis.providerProbe.run('audio')")
  await until(cdp, `${state}.status==='failed'`)
  const failed = await evaluate<{
    events: Array<{ type: string; traceback?: string; message?: string }>
  }>(cdp, state)
  expect(JSON.stringify(failed)).toContain('Clique em Jogar ou Executar')
  expect(await evaluate(cdp, 'navigator.userActivation.hasBeenActive')).toBe(false)
  expect(
    (await evaluate<Array<{ paused: boolean; src: string | null }>>(cdp, media)).every(
      (item) => item.paused && item.src === null,
    ),
  ).toBe(true)
  await testInfo.attach('autoplay-denial', {
    body: JSON.stringify(failed),
    contentType: 'application/json',
  })
  await evaluate(cdp, "globalThis.providerProbe.dispose('audio')")
})

for (const prefix of ['', 'classic-']) {
  test(`${prefix || 'pro-'}Python plays overlapping audio without Turtle and stops individual voices`, async ({
    page,
  }, testInfo) => {
    const cdp = await prepare(page, `${prefix}portableAudio`)
    await click(cdp, '[data-audio-control="start"]')
    await until(
      cdp,
      `${state}.status==='failed' || (${state}.status==='waiting-input' && globalThis.__audioMedia.length===2 && globalThis.__audioMedia.every(media=>!media.paused && media.currentTime>0.1))`,
    )
    const playing = await evaluate(cdp, state)
    expect((playing as { status: string }).status, JSON.stringify(playing)).toBe('waiting-input')
    const playingMedia = await evaluate<
      Array<{ paused: boolean; src: string; currentTime: number }>
    >(cdp, media)
    expect(playingMedia).toHaveLength(2)
    expect(playingMedia[0]!.src).toBe(playingMedia[1]!.src)
    expect(playingMedia.every((item) => !item.paused && item.currentTime > 0.1)).toBe(true)
    await evaluate(
      cdp,
      `(()=>{const request=${state}.events.findLast(event=>event.type==='input-request');return globalThis.providerProbe.input('audio',request.requestId,{kind:'line',text:''})})()`,
    )
    await until(
      cdp,
      `${state}.status==='failed' || ${state}.events.some(event=>event.type==='console' && event.text.includes('first stopped'))`,
    )
    const firstStopped = await evaluate<Array<{ paused: boolean; src: string | null }>>(cdp, media)
    expect(firstStopped[0]!.src).toBeNull()
    expect(firstStopped[0]!.paused).toBe(true)
    expect(firstStopped[1]!.src).not.toBeNull()
    await until(cdp, `${state}.status==='waiting-input'`)
    await evaluate(
      cdp,
      `(()=>{const request=${state}.events.findLast(event=>event.type==='input-request');return globalThis.providerProbe.input('audio',request.requestId,{kind:'line',text:''})})()`,
    )
    await until(cdp, `['completed','failed'].includes(${state}.status)`)
    const completed = await evaluate<{ status: string }>(cdp, state)
    expect(completed.status, JSON.stringify(completed)).toBe('completed')
    expect(
      (await evaluate<Array<{ paused: boolean; src: string | null }>>(cdp, media)).every(
        (item) => item.paused && item.src === null,
      ),
    ).toBe(true)
    await testInfo.attach('actual-python-audio', {
      body: JSON.stringify({ playing, playingMedia, firstStopped, completed }),
      contentType: 'application/json',
    })
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')")
  })

  test(`${prefix || 'pro-'}Stop revokes audio while Python waits for input`, async ({ page }) => {
    const cdp = await prepare(page, `${prefix}portableAudio`)
    await click(cdp, '[data-audio-control="start"]')
    await until(
      cdp,
      `${state}.status==='failed' || (${state}.status==='waiting-input' && globalThis.__audioMedia.length===2)`,
    )
    expect(await evaluate(cdp, `${state}.status`)).toBe('waiting-input')
    await click(cdp, '[data-audio-control="stop"]')
    await until(cdp, `${state}.status==='stopped'`)
    expect(
      (await evaluate<Array<{ paused: boolean; src: string | null }>>(cdp, media)).every(
        (item) => item.paused && item.src === null,
      ),
    ).toBe(true)
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')")
  })

  test(`${prefix || 'pro-'}authored sz_audio module keeps Python import precedence`, async ({
    page,
  }) => {
    const cdp = await prepare(page, `${prefix}portableAudioNamespace`)
    await click(cdp, '[data-audio-control="start"]')
    await until(cdp, `['completed','failed'].includes(${state}.status)`)
    const completed = await evaluate<{
      status: string
      events: Array<{ type: string; text?: string }>
    }>(cdp, state)
    expect(completed.status, JSON.stringify(completed)).toBe('completed')
    expect(
      completed.events
        .filter((event) => event.type === 'console')
        .map((event) => event.text)
        .join(''),
    ).toBe('author audio preserved\n')
    expect(await evaluate(cdp, 'globalThis.__audioMedia.length')).toBe(0)
    await evaluate(cdp, "globalThis.providerProbe.dispose('audio')")
  })
}
