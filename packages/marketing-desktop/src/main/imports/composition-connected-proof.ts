import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  batchOperationSchema,
  createPieceBatch,
  projectViewSchema,
  runPageSchema,
  type runViewSchema,
  stableEditorialId,
  uploadViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'

export async function proveConnectedComposition(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: { origin: string; userId: string },
  credentials: { email: string; password: string },
) {
  if (app.isPackaged || scope.origin !== 'http://127.0.0.1:15334')
    throw new Error('Prova restrita à revisão nativa')
  const directory = path.join(app.getAppPath(), '.cache/composition-connected-proof')
  await mkdir(directory, { recursive: true })
  const projectId = await stableEditorialId(`${scope.userId}:composition-connected-v1`)
  const request = (route: string, method = 'GET', body?: unknown) =>
    window.webContents.executeJavaScript(
      `window.marketing.workspace(${JSON.stringify({ scope, path: route, method, ...(body ? { body } : {}) })})`,
    )
  await request('/projects', 'POST', {
    schemaVersion: 1,
    id: projectId,
    operationId: await stableEditorialId(`${projectId}:create`),
    name: 'Revisão integrada de animações',
    product: 'Sistema Zero',
  })
  let batch: ReturnType<typeof batchOperationSchema.parse>
  const fixtureFile = path.join(directory, 'batch.json')
  try {
    batch = batchOperationSchema.parse(JSON.parse(await readFile(fixtureFile, 'utf8')))
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    batch = createPieceBatch({
      projectId,
      title: 'Animação conectada',
      brief: 'Convite à criação de um jogo',
      format: 'story',
      medium: 'video',
    })
    const video = batch.changes.find((change) => change.document?.kind === 'video')
    if (video?.document?.kind !== 'video') throw new Error('Vídeo ausente')
    video.document.timeline = videoSchema.parse({
      ...video.document.timeline,
      width: 360,
      height: 640,
      durationInFrames: 90,
      clips: [
        {
          id: crypto.randomUUID(),
          trackId: video.document.timeline.tracks[0]!.id,
          kind: 'text',
          text: 'Crie seu jogo',
          startFrame: 0,
          durationInFrames: 90,
        },
      ],
    })
    await writeFile(fixtureFile, JSON.stringify(batch, null, 2))
  }
  assert.equal(batch.projectId, projectId)
  const video = batch.changes.find((change) => change.document?.kind === 'video')
  if (video?.document?.kind !== 'video') throw new Error('Vídeo ausente')
  await request('/batches', 'POST', batch)
  await manager.synchronize()
  const openPiece = async (target: BrowserWindow) => {
    await waitProof(
      target,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(projectId)}))return false;if(select.value!==${JSON.stringify(projectId)}){select.value=${JSON.stringify(projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}const button=[...document.querySelectorAll('button')].find(button=>button.querySelector('span')?.textContent==='Animação conectada');if(!button)return false;if(button.getAttribute('aria-pressed')!=='true'){button.click();return false}return !!document.getElementById(${JSON.stringify(`request-${video.entityId}`)})})()`,
      'A peça não abriu na bancada',
    )
  }
  await openPiece(window)
  const panel = `document.getElementById(${JSON.stringify(`request-${video.entityId}`)})`
  const choose = async (value: string) => {
    await window.webContents.executeJavaScript(
      `(()=>{const panel=${panel};const select=[...panel.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value===${JSON.stringify(value)}));if(!select)throw new Error('Controle não encontrado');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    )
  }
  const runsRoute = `/projects/${projectId}/runs?entityId=${video.entityId}`
  let runs = runPageSchema.parse(await request(runsRoute)).items
  if (!runs.length) {
    await choose('composition')
    await waitProof(
      window,
      `!!${panel}.querySelector('option[value="${video.document.timeline.clips[0]!.id}"]')`,
      'Seletor de cena ausente',
    )
    await choose(video.document.timeline.clips[0]!.id)
    await choose('codex')
    await window.webContents.executeJavaScript(
      `(()=>{const panel=${panel};const input=panel.querySelector('textarea:not([readonly])');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Anime a frase atual com entrada suave por opacidade e duas formas geométricas pequenas. Preserve a frase literalmente, fonte Nunito legível em amarelo sobre o fundo azul da montagem, margens de pelo menos 24 px e fundo transparente.');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    )
    await waitProof(
      window,
      `!![...${panel}.querySelectorAll('button')].find(button=>button.textContent==='Executar pedido'&&!button.disabled)`,
      'Pedido não ficou disponível',
    )
    await window.webContents.executeJavaScript(`${panel}.scrollIntoView({block:'center'})`)
    await writeFile(path.join(directory, 'native-request.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `[...${panel}.querySelectorAll('button')].find(button=>button.textContent==='Executar pedido').click()`,
    )
  }
  const deadline = Date.now() + 600000
  let completed: ReturnType<typeof runViewSchema.parse> | undefined,
    state = ''
  while (Date.now() < deadline) {
    runs = runPageSchema.parse(await request(runsRoute)).items
    const run = runs[0]
    if (run && run.state !== state) {
      state = run.state
      console.log(`composition-connected: ${state}`)
    }
    if (run?.state === 'succeeded') {
      completed = run
      break
    }
    if (run && ['failed', 'waiting', 'canceled'].includes(run.state))
      throw new Error(`Pedido preservado: ${JSON.stringify(run.outcome)}`)
    await delay(1500)
  }
  assert(completed, 'A produção não terminou dentro do prazo')
  assert.equal(completed.application?.result?.status, 'applied')
  await manager.synchronize()
  const view = projectViewSchema.parse(await manager.view(projectId)),
    item = view.items.find((item) => item.id === video.entityId)
  assert(item?.document.kind === 'video')
  const generated = item.document.timeline.clips[0]?.generated
  assert(generated)
  assert.equal(generated.input.body, 'Crie seu jogo')
  const file = uploadViewSchema.parse(
    await request(`/projects/${projectId}/assets/${generated.outputAssetId}`),
  )
  assert.equal(file.state, 'confirmed')
  assert.equal(file.manifest.sha256, generated.outputSha256)
  const inspectPreview = async (target: BrowserWindow, name: string) => {
    await waitProof(
      target,
      `(()=>{const article=document.querySelector('[data-editorial-component="${video.entityId}"]');const video=article?.querySelector('video');if(!video||video.readyState<2)return false;article.scrollIntoView({block:'center'});const play=article.querySelector('button[aria-label="Play video"]');if(video.currentTime<0.6){play?.click();return false}article.querySelector('button[aria-label="Pause video"]')?.click();return true})()`,
      'A prévia validada não reproduziu',
    )
    await writeFile(path.join(directory, `${name}.png`), await captureProof(target))
  }
  await inspectPreview(window, 'native-result')
  const browser = session.fromPartition(`composition-web-${crypto.randomUUID()}`)
  const login = await browser.fetch(`${scope.origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: scope.origin, 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  await login.body?.cancel()
  assert(login.ok, 'Login da prova web falhou')
  const web = new BrowserWindow({
    show: false,
    width: 1280,
    height: 1000,
    webPreferences: {
      session: browser,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: true,
      backgroundThrottling: false,
    },
  })
  try {
    await web.loadURL(`${scope.origin}/bancada`)
    await openPiece(web)
    assert.equal(await web.webContents.executeJavaScript('typeof window.marketing'), 'undefined')
    await inspectPreview(web, 'web-result')
    await web.webContents.executeJavaScript(
      `(()=>{const select=[...${panel}.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value==='composition'));select.value='composition';select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    )
    await waitProof(
      web,
      `${panel}.textContent.includes('Requer app desktop')`,
      'A etapa local não foi indicada no web',
    )
    await web.webContents.executeJavaScript(`${panel}.scrollIntoView({block:'center'})`)
    await writeFile(path.join(directory, 'web-desktop-step.png'), await captureProof(web))
    const evidence = {
      projectId,
      videoId: video.entityId,
      runId: completed.request.id,
      revisionId: item.revisionId,
      sourceSha256: generated.sourceSha256,
      outputAssetId: generated.outputAssetId,
      outputSha256: generated.outputSha256,
      confirmed: true,
      nativeUiRequest: true,
      webPreview: true,
      webPreload: false,
      desktopStepIndicated: true,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } finally {
    web.destroy()
  }
}
