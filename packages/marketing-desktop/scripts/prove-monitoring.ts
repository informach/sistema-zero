import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  monitoringStatusSchema,
  operationResultSchema,
  projectSchema,
} from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { captureProof } from '../src/main/imports/capture-proof'
import { waitProof } from '../src/main/imports/wait-proof'

const directory = path.resolve('.cache/monitoring-proof')
app.setName('Marketing Monitoring Review')
app.setPath('userData', path.join(directory, 'profile'))
app.on('window-all-closed', () => {})
async function main() {
  await app.whenReady()
  await mkdir(directory, { recursive: true })
  let window: BrowserWindow | undefined
  let cleanup: (() => Promise<void>) | undefined
  try {
    const fixture = z
      .object({
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile('.cache/native-connected-proof/fixture.json', 'utf8')))
    const browser = session.fromPartition(`monitoring-${randomUUID()}`)
    async function request(route: string, body?: unknown) {
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`HTTP ${response.status}: ${route}`)
      }
      return response.json()
    }
    await request('/api/auth/login', { email: fixture.email, password: fixture.password })
    const project = projectSchema.parse(
      await request('/api/marketing/workspace/projects', {
        schemaVersion: 1,
        operationId: randomUUID(),
        id: randomUUID(),
        name: 'Prova de acompanhamento recorrente',
        product: 'Revisão isolada',
      }),
    )
    const watch = operationResultSchema.parse(
      await request('/api/marketing/workspace/operations', {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: project.id,
        entityId: randomUUID(),
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'watchlist',
          title: 'Novidades públicas do Remotion',
          body: 'Observar novidades de produção de vídeo e manter referências verificáveis.',
          objective: 'Conferir o acompanhamento recorrente',
          subjectType: 'topic',
          source: { label: 'Blog oficial do Remotion' },
          url: 'https://www.remotion.dev/blog',
          enabled: true,
          evidenceIds: [],
        },
      }),
    )
    if (watch.status !== 'applied') throw new Error('Fixture conflitante')
    const endpoint = `/api/marketing/workspace/projects/${project.id}/monitors/${watch.item.id}`
    cleanup = async () => {
      const state = monitoringStatusSchema.parse(await request(endpoint))
      if (state.monitor?.config.enabled)
        await request(`${endpoint}/configure`, {
          schemaVersion: 1,
          operationId: randomUUID(),
          expectedRevisionId: watch.item.revisionId,
          expectedVersion: state.monitor.version,
          config: { ...state.monitor.config, enabled: false },
        })
    }
    window = new BrowserWindow({
      show: false,
      width: 1280,
      height: 950,
      webPreferences: {
        session: browser,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        offscreen: true,
        backgroundThrottling: false,
      },
    })
    await window.loadURL(`${fixture.origin}/bancada`)
    await waitProof(
      window,
      `(()=>{
      const project=document.querySelector('select[aria-label="Projeto atual"]');if(!project||![...project.options].some(option=>option.value===${JSON.stringify(project.id)}))return false;
      if(project.value!==${JSON.stringify(project.id)}){project.value=${JSON.stringify(project.id)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const area=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Perfis e temas');if(area?.getAttribute('aria-pressed')!=='true'){area?.click();return false}
      const entry=[...document.querySelectorAll('aside button')].find(button=>button.textContent.startsWith('Novidades públicas do Remotion'));if(entry?.getAttribute('aria-pressed')!=='true'){entry?.click();return false}
      const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Configurar acompanhamento');return button&&!button.disabled;
    })()`,
      'A fonte não abriu na bancada',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Configurar acompanhamento').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"][aria-label="Configurar acompanhamento"] select[id$="-mode"]')`,
      'Configuração não abriu',
    )
    await window.webContents.executeJavaScript(
      `(()=>{const mode=document.querySelector('[role="dialog"] select[id$="-mode"]');mode.value='feed';mode.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] input[id$="-url"]')`,
      'Modo feed não abriu',
    )
    await window.webContents.executeJavaScript(
      `(()=>{const dialog=document.querySelector('[role="dialog"]');for(const [suffix,value] of [['-url','https://www.remotion.dev/blog/rss.xml'],['-interval','720'],['-budget','1']]){const input=dialog.querySelector('input[id$="'+suffix+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))}})()`,
    )
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    )
    await writeFile(path.join(directory, 'configuration.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] form').requestSubmit()`,
    )
    await waitProof(
      window,
      `(()=>{const error=document.querySelector('[role="dialog"] [role="alert"]');if(error)throw new Error(error.textContent);return !document.querySelector('[role="dialog"]')})()`,
      'Configuração não foi confirmada',
    )
    await waitProof(
      window,
      `(()=>{const panel=document.querySelector('[aria-label="Acompanhamento recorrente"]');if(panel?.textContent.includes('Precisa de revisão para retomar'))throw new Error(panel.textContent);return panel?.textContent.includes('Novidades e alterações observadas')})()`,
      'O servidor não confirmou a coleta em 60 segundos',
    )
    const collected = monitoringStatusSchema.parse(await request(endpoint))
    assert.ok(collected.entries.length > 0)
    assert.equal(collected.monitor?.callsToday, 1)
    assert.ok(collected.monitor?.lastCollectedAt)
    assert.ok(collected.entries.every((entry) => entry.sourceType === 'public'))
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>{document.querySelector('[aria-label="Acompanhamento recorrente"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
    )
    await writeFile(path.join(directory, 'observations.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Configurar ou pausar').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] input[type="checkbox"]')`,
      'Pausa não abriu',
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] input[type="checkbox"]').click()`,
    )
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`,
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] form').requestSubmit()`,
    )
    await waitProof(
      window,
      `!document.querySelector('[role="dialog"]')&&document.querySelector('[aria-label="Acompanhamento recorrente"]')?.textContent.includes('Acompanhamento pausado')`,
      'A pausa não foi confirmada',
    )
    assert.equal(monitoringStatusSchema.parse(await request(endpoint)).monitor?.state, 'disabled')
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Resultados do projeto').click()`,
    )
    await waitProof(
      window,
      `document.querySelector('[role="dialog"]')?.textContent.includes('Ainda não há entregas publicadas')`,
      'Resultados do projeto não abriram',
    )
    const dimensions = await window.webContents.executeJavaScript(
      `[...document.querySelector('[role="dialog"] select[id$="-dimension"]').options].map(option=>option.value)`,
    )
    assert.deepEqual(dimensions, ['objective', 'audienceNeed', 'series', 'format'])
    await writeFile(path.join(directory, 'analytics-empty.png'), await captureProof(window))
    const evidence = {
      projectId: project.id,
      watchlistId: watch.item.id,
      publicFeed: 'https://www.remotion.dev/blog/rss.xml',
      entries: collected.entries.length,
      calls: collected.monitor?.callsToday,
      lastCollectedAt: collected.monitor?.lastCollectedAt,
      pausedThroughUi: true,
      desktopExecutor: false,
      dimensions,
      publicationsCreated: 0,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
    await cleanup()
    cleanup = undefined
    window.destroy()
    window = undefined
    app.exit(0)
  } catch (error) {
    if (window) {
      await writeFile(path.join(directory, 'failure.png'), await captureProof(window))
      await writeFile(
        path.join(directory, 'failure.txt'),
        await window.webContents.executeJavaScript('document.body.innerText'),
      )
      window.destroy()
    }
    try {
      await cleanup?.()
    } catch {
      console.error('A configuração de revisão precisa ser conferida antes de nova coleta')
    }
    console.error(error instanceof Error ? error.message : 'Falha na prova de acompanhamento')
    app.exit(1)
  }
}
void main()
