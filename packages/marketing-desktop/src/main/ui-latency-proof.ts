import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { operationResultSchema, projectSchema } from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { connectionStateSchema } from '../shared/connection'
import { readBoundedJson } from './bounded-json'
import { captureProof } from './imports/capture-proof'
import type { DesktopServerSession } from './server-session'
import type { DesktopWorkspaceManager } from './sync/workspace-manager'

// Runs the real renderer/preload/SQLite path and two independent web sessions.
// Three synthetic identities on one machine: not the two-person/two-computer pilot.
export async function proveUiLatency(
  native: BrowserWindow,
  manager: DesktopWorkspaceManager,
  server: DesktopServerSession,
) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/ui-latency-proof')
  await mkdir(directory, { recursive: true })
  const fixture = z
    .object({
      userId: z.string().uuid(),
      email: z.string(),
      password: z.string(),
      origin: z.literal('http://127.0.0.1:15334'),
    })
    .parse(
      JSON.parse(
        await readFile(
          path.join(app.getAppPath(), '.cache/native-connected-proof/fixture.json'),
          'utf8',
        ),
      ),
    )
  const writer = session.fromPartition(`ui-writer-${randomUUID()}`)
  const reader = session.fromPartition(`ui-reader-${randomUUID()}`)
  const owner = session.fromPartition(`ui-owner-${randomUUID()}`)
  const team = z
    .array(z.object({ userId: z.string().uuid(), email: z.string(), password: z.string() }))
    .length(2)
    .parse(JSON.parse(await readFile(path.join(directory, 'team.json'), 'utf8')))
  const statuses: Record<string, Record<string, number>> = {}
  async function request(client: Electron.Session, route: string, body?: unknown, method?: 'PUT') {
    const response = await client.fetch(`${fixture.origin}${route}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { origin: fixture.origin, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`HTTP ${response.status}: ${route}`)
    }
    return readBoundedJson(response)
  }
  await request(owner, '/api/auth/login', { email: fixture.email, password: fixture.password })
  for (const [index, client] of [writer, reader].entries())
    await request(client, '/api/auth/login', {
      email: team[index]!.email,
      password: team[index]!.password,
    })
  const invoke = (method: string, ...args: unknown[]) =>
    native.webContents.executeJavaScript(
      `window.marketing.${method}(${args.map((value) => JSON.stringify(value)).join(',')})`,
    )
  if (connectionStateSchema.parse(await invoke('connection')).status !== 'connected') {
    const pair = z.object({ code: z.string() }).parse(
      await invoke('connect', {
        origin: fixture.origin,
        label: 'Medição integrada de interface',
      }),
    )
    await request(owner, '/api/desktop', { action: 'approve', code: pair.code })
    assert.equal(connectionStateSchema.parse(await invoke('pollConnection')).status, 'connected')
  }
  assert.equal(connectionStateSchema.parse(await invoke('connection')).userId, fixture.userId)
  for (const [label, client] of [
    ['desktop', server.electronSession],
    ['web-writer', writer],
    ['web-reader', reader],
  ] as const) {
    statuses[label] = {}
    client.webRequest.onCompleted({ urls: [`${fixture.origin}/api/marketing/*`] }, (details) => {
      const key = String(details.statusCode)
      statuses[label]![key] = (statuses[label]![key] ?? 0) + 1
    })
  }
  const project = projectSchema.parse(
    await request(owner, '/api/marketing/workspace/projects', {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      name: 'Medição da interface colaborativa',
      product: 'Revisão técnica isolada',
    }),
  )
  for (const member of team) {
    await request(
      owner,
      `/api/marketing/workspace/projects/${project.id}/members`,
      {
        operationId: randomUUID(),
        userId: member.userId,
        permissions: ['read', 'edit', 'execute'],
      },
      'PUT',
    )
  }
  await request(owner, '/api/auth/logout', {})
  const entityId = randomUUID(),
    title = `Propagação ${randomUUID().slice(0, 8)}`
  let revisionId: string | null = null
  async function write(body: string) {
    const receipt = operationResultSchema.parse(
      await request(writer, '/api/marketing/workspace/operations', {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: project.id,
        entityId,
        baseRevisionId: revisionId,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'direction',
          title,
          body,
          objective: 'Conferir propagação na tela',
          audience: 'Equipe de revisão',
          voice: 'Direta',
          protectedTerms: [],
          referenceIds: [],
        },
      }),
    )
    assert.equal(receipt.status, 'applied')
    if (receipt.status !== 'applied') throw new Error('Conflito na medição')
    revisionId = receipt.revisionId
    return performance.now()
  }
  await write('Preparação da medição')
  assert.equal((await manager.synchronize()).phase, 'idle')
  await native.loadURL(native.webContents.getURL())
  native.webContents.setBackgroundThrottling(false)
  const windows = [writer, reader].map(
    (client) =>
      new BrowserWindow({
        width: 1280,
        height: 880,
        show: false,
        webPreferences: {
          session: client,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          backgroundThrottling: false,
          offscreen: true,
        },
      }),
  )
  const views = [native, ...windows]
  try {
    await Promise.all(windows.map((window) => window.loadURL(`${fixture.origin}/bancada`)))
    for (const window of views) {
      await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
        const ready=()=>{
          const project=document.querySelector('select[aria-label="Projeto atual"]');
          if(!project||![...project.options].some(option=>option.value===${JSON.stringify(project.id)}))return false;
          if(project.value!==${JSON.stringify(project.id)}){project.value=${JSON.stringify(project.id)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
          const direction=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Direção');
          if(direction?.getAttribute('aria-pressed')!=='true'){direction?.click();return false}
          const entry=[...document.querySelectorAll('aside button')].find(button=>button.textContent.startsWith(${JSON.stringify(title)}));
          if(entry?.getAttribute('aria-pressed')!=='true'){entry?.click();return false}
          return [...document.querySelectorAll('p')].some(node=>node.textContent==='Preparação da medição');
        };
        const check=()=>{try{if(ready()){clearInterval(poll);clearTimeout(deadline);resolve(true)}}catch(error){clearInterval(poll);clearTimeout(deadline);reject(error)}};
        const deadline=setTimeout(()=>{clearInterval(poll);reject(new Error('A bancada não abriu a direção da medição'))},120000),poll=setInterval(check,100);check();
      })`)
    }
    const samples: number[][] = views.map(() => [])
    for (let index = 0; index < 23; index++) {
      const marker = `${title}: amostra ${index}`
      // Observe before writing; no click, explicit synchronization or forced refresh.
      const observations = views.map((window) =>
        window.webContents
          .executeJavaScript(`new Promise((resolve,reject)=>{
        let done=false;
        const check=()=>{if(!done&&[...document.querySelectorAll('p')].some(node=>node.textContent===${JSON.stringify(marker)})){
          done=true;observer.disconnect();clearTimeout(deadline);requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)));
        }};
        const observer=new MutationObserver(check),deadline=setTimeout(()=>{observer.disconnect();reject(new Error('A revisão não apareceu na tela em 20 s'))},20000);
        observer.observe(document.body,{childList:true,subtree:true,characterData:true});check();
      })`)
          .then(() => performance.now()),
      )
      const confirmed = await write(marker)
      const arrivals = await Promise.all(observations)
      const elapsed = arrivals.map((value) => Math.max(0, value - confirmed))
      if (index >= 3)
        elapsed.forEach((value, view) => {
          samples[view]!.push(value)
        })
      console.log(JSON.stringify({ uiSample: index, elapsed }))
    }
    for (const [index, window] of views.entries())
      await writeFile(path.join(directory, `surface-${index}.png`), await captureProof(window))
    const navigation = await native.webContents.executeJavaScript(`(async()=>{
      const samples=[];
      for(let index=0;index<24;index++){
        const label=index%2?'Direção':'Peças',button=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent===label),started=performance.now();
        button.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        if(button.getAttribute('aria-pressed')!=='true')throw new Error('Navegação não mudou de seção');
        if(index>=4)samples.push(performance.now()-started);
      }return samples;
    })()`)
    const summary = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b)
      return {
        samples: values,
        p50: sorted[Math.ceil(sorted.length * 0.5) - 1]!,
        p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
        max: sorted.at(-1)!,
      }
    }
    assert.ok(
      (await manager.view(project.id)).items.some(
        (item) => item.id === entityId && item.revisionId === revisionId,
      ),
    )
    const result = {
      projectId: project.id,
      revisionId,
      computerCount: 1,
      identityCount: 3,
      sessionCount: 3,
      boundary: 'server-response-to-dom-and-two-animation-frames',
      syntheticDirection: true,
      realAcervoPresent: true,
      activeVisualJob: false,
      network: 'loopback',
      serverMode: 'Next development',
      electron: process.versions.electron,
      cpu: os.cpus()[0]?.model,
      memoryBytes: os.totalmem(),
      propagation: samples.map((values, index) => ({
        surface: ['desktop', 'web-writer', 'web-reader'][index],
        ...summary(values),
      })),
      navigation: summary(z.array(z.number()).parse(navigation)),
      statuses,
      processMetrics: app
        .getAppMetrics()
        .map((metric) => ({ type: metric.type, cpu: metric.cpu, memory: metric.memory })),
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    assert.ok(
      result.propagation.every((surface) => surface.p95 <= 3000),
      'Propagação p95 ultrapassa 3 s',
    )
    assert.ok(result.navigation.p95 <= 100, 'Navegação local p95 ultrapassa 100 ms')
    assert.ok(
      Object.values(statuses).every((codes) =>
        Object.keys(codes).every((code) => Number(code) < 400),
      ),
      'A carga produziu falha HTTP',
    )
  } finally {
    for (const window of windows) window.destroy()
  }
}
