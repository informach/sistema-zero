import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  assetLibraryPageSchema,
  batchOperationSchema,
  createPieceBatch,
  projectViewSchema,
  runPageSchema,
  stableEditorialId,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import type { WorkspaceRequest } from '../../shared/connection'
import { mediaInputArguments, mediaProcess } from '../media/media-process'
import { probeVideo } from '../media/probe-video'
import { downloadAsset } from '../sync/asset-download'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'
import { requestWorkspaceProof } from './workspace-proof'

/** Existing silent screen recording, copied into a dedicated review project. Never publishes. */
export async function proveRecordedVideo(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: { origin: string; userId: string },
  credentials: { email: string; password: string },
) {
  if (app.isPackaged || scope.origin !== 'http://127.0.0.1:15334')
    throw new Error('Prova restrita à revisão nativa')
  const directory = path.join(app.getAppPath(), '.cache/recorded-video-proof-v2')
  await mkdir(directory, { recursive: true })
  const projectId = await stableEditorialId(`${scope.userId}:recorded-video-v2`)
  const request = (route: string, method: WorkspaceRequest['method'] = 'GET', body?: unknown) =>
    requestWorkspaceProof(window, { scope, path: route, method, ...(body ? { body } : {}) })
  await request('/projects', 'POST', {
    schemaVersion: 1,
    id: projectId,
    operationId: await stableEditorialId(`${projectId}:create`),
    name: 'Revisão de gravação sincronizada',
    product: 'Revisão isolada',
  })
  const fixtureFile = path.join(directory, 'batch.json')
  let batch: ReturnType<typeof batchOperationSchema.parse>
  try {
    console.log('recorded-video: opening web upload')
    batch = batchOperationSchema.parse(JSON.parse(await readFile(fixtureFile, 'utf8')))
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    batch = createPieceBatch({
      projectId,
      title: 'Gravação do Duelo',
      brief: 'Prova técnica com uma gravação real de tela do acervo P21, sem fala.',
      format: 'reel',
      medium: 'video',
    })
    const video = batch.changes.find((change) => change.document?.kind === 'video')
    assert(video?.document?.kind === 'video')
    video.document.timeline.width = 800
    video.document.timeline.height = 600
    await writeFile(fixtureFile, JSON.stringify(batch, null, 2))
  }
  assert.equal(batch.projectId, projectId)
  await request('/batches', 'POST', batch)
  const video = batch.changes.find((change) => change.document?.kind === 'video')
  assert(video?.document?.kind === 'video')
  const videoId = video.entityId
  const panel = `document.getElementById(${JSON.stringify(`request-${videoId}`)})`
  const openPiece = async (target: BrowserWindow) => {
    await waitProof(
      target,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(projectId)}))return false;if(select.value!==${JSON.stringify(projectId)}){select.value=${JSON.stringify(projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}const button=[...document.querySelectorAll('button')].find(button=>button.querySelector('span')?.textContent==='Gravação do Duelo');if(!button)return false;if(button.getAttribute('aria-pressed')!=='true'){button.click();return false}return !!${panel}})()`,
      'A gravação não abriu na bancada',
    )
  }
  const choose = async (target: BrowserWindow, value: string) => {
    await waitProof(
      target,
      `!!${panel}?.querySelector('option[value="${value}"]')`,
      'Opção ausente',
    )
    await target.webContents.executeJavaScript(
      `(()=>{const select=[...${panel}.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value===${JSON.stringify(value)}));select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    )
  }
  const browser = session.fromPartition(`recorded-video-web-${crypto.randomUUID()}`)
  const login = await browser.fetch(`${scope.origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: scope.origin, 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  await login.body?.cancel()
  assert(login.ok)
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
  const source = path.resolve(
    app.getAppPath(),
    '../../docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p21-ver-a-atividade/apoio/demonstracao-duelo.webm',
  )
  const bytes = await readFile(source)
  const sourceHash = createHash('sha256').update(bytes).digest('hex')
  try {
    await web.loadURL(`${scope.origin}/bancada`)
    await openPiece(web)
    assert.equal(await web.webContents.executeJavaScript('typeof window.marketing'), 'undefined')
    const assets = async () =>
      assetLibraryPageSchema.parse(await request(`/projects/${projectId}/assets`)).items
    if (process.argv.includes('--smoke-rejected-upload')) {
      const invalid = 'Integrity verification fixture with a controlled byte change.'
      await web.webContents.executeJavaScript(
        `[...document.querySelectorAll('button')].find(button=>button.textContent==='Arquivos do projeto').click()`,
      )
      await waitProof(
        web,
        `!!document.querySelector('[role="dialog"] input[type="file"]')`,
        'Upload ausente',
      )
      await web.webContents.executeJavaScript(
        // Fault injection only in this disposable browser: after SHA-256 is read,
        // change a byte of the subsequent transfer. Its part MD5 is still valid;
        // the server must independently reject the final SHA-256 mismatch.
        `(()=>{const slice=File.prototype.slice;let reads=0;File.prototype.slice=function(...args){const part=slice.apply(this,args);if(this.name==='integridade-divergente.txt'){const read=part.arrayBuffer.bind(part);part.arrayBuffer=async()=>{const value=await read();if(reads++>0)new Uint8Array(value)[0]^=1;return value}}return part};const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(invalid)}],'integridade-divergente.txt',{type:'text/plain'}));const input=document.querySelector('[role="dialog"] input[type="file"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      )
      await waitProof(
        web,
        `document.querySelector('[role="dialog"]')?.textContent.includes('A conferência do arquivo precisa de atenção.')`,
        'A rejeição não foi apresentada',
        120000,
      )
      const failed = (await assets()).find(
        (item) => item.manifest.sha256 === createHash('sha256').update(invalid).digest('hex'),
      )
      assert.equal(failed?.state, 'failed')
      assert(failed?.error)
      assert.equal(
        await web.webContents.executeJavaScript(
          `(()=>{const row=[...document.querySelectorAll('[role="dialog"] li')].find(item=>item.textContent.includes('integridade-divergente.txt'));return !![...row.querySelectorAll('button')].find(button=>button.textContent==='Usar como referência')})()`,
        ),
        false,
      )
      await writeFile(path.join(directory, 'rejected-upload.png'), await captureProof(web))
      await writeFile(
        path.join(directory, 'rejected-upload.json'),
        JSON.stringify(
          {
            assetId: failed.manifest.id,
            state: failed.state,
            error: failed.error,
            attachAllowed: false,
          },
          null,
          2,
        ),
      )
      console.log('recorded-video: altered upload visibly rejected and cannot be attached')
      return
    }
    let original = (await assets()).find(
      (item) => item.manifest.sha256 === sourceHash && item.state === 'confirmed',
    )
    if (original?.state !== 'confirmed') {
      await web.webContents.executeJavaScript(
        `[...document.querySelectorAll('button')].find(button=>button.textContent==='Arquivos do projeto').click()`,
      )
      await waitProof(
        web,
        `!!document.querySelector('[role="dialog"] input[type="file"]')`,
        'Upload ausente',
      )
      // Supplies the actual existing file to the normal browser input; no native bridge or upload shortcut.
      await web.webContents.executeJavaScript(
        `(()=>{const data=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([data],'demonstracao-duelo.webm',{type:'video/webm'}));const input=document.querySelector('[role="dialog"] input[type="file"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      )
      await waitProof(
        web,
        `document.querySelector('[role="dialog"]')?.textContent.includes('Arquivo confirmado')`,
        'Upload não confirmado',
        120000,
      )
      original = (await assets()).find(
        (item) => item.manifest.sha256 === sourceHash && item.state === 'confirmed',
      )
      assert(original)
      await writeFile(path.join(directory, 'web-upload.png'), await captureProof(web))
    }
    assert.equal(original.state, 'confirmed')
    console.log('recorded-video: original confirmed')
    assert.equal(original.manifest.size, bytes.length)
    await manager.synchronize()
    const initial = projectViewSchema
      .parse(await manager.view(projectId))
      .items.find((item) => item.id === videoId)
    assert(initial?.document.kind === 'video')
    if (!initial.document.referenceAssetIds?.includes(original.manifest.id)) {
      await web.webContents.executeJavaScript(
        `if(!document.querySelector('[role="dialog"]'))[...document.querySelectorAll('button')].find(button=>button.textContent==='Arquivos do projeto').click()`,
      )
      await waitProof(
        web,
        `!![...document.querySelectorAll('[role="dialog"] li')].find(item=>item.textContent.includes('demonstracao-duelo.webm') && item.textContent.includes('Confirmado'))`,
        'Gravação ausente na biblioteca',
      )
      await web.webContents.executeJavaScript(
        `(()=>{const row=[...document.querySelectorAll('[role="dialog"] li')].find(item=>item.textContent.includes('demonstracao-duelo.webm') && item.textContent.includes('Confirmado'));[...row.querySelectorAll('button')].find(button=>button.textContent==='Usar como referência').click()})()`,
      )
      await waitProof(
        web,
        `document.querySelector('[role="dialog"]')?.textContent.includes('Referência vinculada')`,
        'Referência não vinculada',
      )
    }
    await manager.synchronize()
    await window.loadURL(window.webContents.getURL())
    await openPiece(window)
    const resources = await manager.resources(scope, projectId)
    const document = async () => {
      await manager.synchronize()
      const item = projectViewSchema
        .parse(await manager.view(projectId))
        .items.find((item) => item.id === videoId)
      assert(item?.document.kind === 'video')
      return item
    }
    const route = `/projects/${projectId}/runs?entityId=${videoId}`
    const execute = async (
      capability: 'prepare-media' | 'video-edit' | 'render',
      instruction?: string,
    ) => {
      const existing = runPageSchema.parse(await request(route)).items
      let completed = existing.find(
        (run) => run.request.capability === capability && run.state === 'succeeded',
      )
      if (!completed) {
        await choose(window, capability)
        if (capability === 'prepare-media') await choose(window, original.manifest.id)
        if (instruction) {
          await choose(window, 'codex')
          await window.webContents.executeJavaScript(
            `(()=>{const input=${panel}.querySelector('textarea:not([readonly])');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(instruction)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
          )
        }
        await waitProof(
          window,
          `!![...${panel}.querySelectorAll('button')].find(button=>button.textContent==='Executar pedido'&&!button.disabled)`,
          'Pedido indisponível',
        )
        await window.webContents.executeJavaScript(
          `[...${panel}.querySelectorAll('button')].find(button=>button.textContent==='Executar pedido').click()`,
        )
        const deadline = Date.now() + 600000
        let previous = ''
        while (Date.now() < deadline) {
          const run = runPageSchema
            .parse(await request(route))
            .items.find(
              (run) =>
                run.request.capability === capability &&
                !existing.some((old) => old.request.id === run.request.id),
            )
          if (run && run.state !== previous) {
            previous = run.state
            console.log(`recorded-video ${capability}: ${previous}`)
          }
          if (run?.state === 'succeeded') {
            completed = run
            break
          }
          if (run && ['failed', 'waiting', 'canceled'].includes(run.state))
            throw new Error(`Pedido preservado: ${JSON.stringify(run.outcome)}`)
          // The UI already polls execution progress. The harness must not exhaust
          // the same person's quota with another high-frequency observer.
          await delay(5000)
        }
      }
      assert(completed, `A etapa ${capability} não terminou`)
      assert.equal(completed.application?.result?.status, 'applied')
      return completed
    }
    const preparation = await execute('prepare-media')
    const prepared = await document()
    assert(prepared.document.kind === 'video')
    const derivative = prepared.document.preparations?.find(
      (item) => item.sourceAssetId === original.manifest.id,
    )
    assert(derivative?.proxyAssetId && derivative.thumbnailAssetId)
    assert.equal(derivative.sourceSha256, sourceHash)
    assert.equal(derivative.metadata.hasAudio, false)
    assert.equal(derivative.waveformAssetId, null)
    for (const id of [derivative.proxyAssetId, derivative.thumbnailAssetId]) {
      const file = uploadViewSchema.parse(await request(`/projects/${projectId}/assets/${id}`))
      assert.equal(file.state, 'confirmed')
    }
    const edited = await execute(
      'video-edit',
      'Use a gravação demonstracao-duelo.webm: mantenha somente o intervalo de 500 a 3500 ms, sem mudar a velocidade, mostrando a imagem inteira. A montagem deve ter exatamente 90 frames a 30 fps e manter 800 × 600. Sobreponha no topo o texto “Uma criação em movimento” durante os primeiros 60 frames, com entrada suave por opacidade, sem cobrir a região central do jogo. Não invente áudio nem fala. Não acrescente outras fontes ou cenas.',
    )
    const montage = await document()
    assert(montage.document.kind === 'video')
    const clip = montage.document.timeline.clips.find((clip) => clip.kind === 'video')
    assert(clip)
    assert.equal(clip.assetId, original.manifest.id)
    assert.equal(clip.sourceStartMs, 500)
    assert.equal(clip.durationInFrames, 90)
    assert.equal(clip.playbackRate, 1)
    assert.equal(montage.document.timeline.durationInFrames, 90)
    assert(
      montage.document.timeline.clips.some(
        (clip) => clip.kind === 'text' && clip.text === 'Uma criação em movimento',
      ),
    )
    const rendered = await execute('render')
    const final = await document()
    assert(final.document.kind === 'video' && final.document.assetIds?.length === 1)
    const output = uploadViewSchema.parse(
      await request(`/projects/${projectId}/assets/${final.document.assetIds[0]}`),
    )
    assert.equal(output.state, 'confirmed')
    await downloadAsset(
      projectId,
      output.manifest.id,
      resources.assets,
      resources.transport,
      AbortSignal.timeout(60000),
    )
    const local = await resources.assets.verify(output.manifest.id)
    const metadata = await probeVideo(local.path, output.manifest.mime, AbortSignal.timeout(30000))
    assert.equal(metadata.width, 800)
    assert.equal(metadata.height, 600)
    assert.equal(metadata.codec, 'h264')
    assert(Math.abs(metadata.durationMs! - 3000) < 100)
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        ...mediaInputArguments(local.path, output.manifest.mime),
        '-ss',
        '1',
        '-frames:v',
        '1',
        path.join(directory, 'final-frame.png'),
      ],
      AbortSignal.timeout(30000),
    )
    assert.equal(
      createHash('sha256')
        .update(await readFile(source))
        .digest('hex'),
      sourceHash,
    )
    await web.loadURL(`${scope.origin}/bancada`)
    await openPiece(web)
    await waitProof(
      web,
      `(()=>{const article=document.querySelector('[data-editorial-component="${videoId}"]');const video=article?.querySelector('video');if(!video||video.readyState<2)return false;article.scrollIntoView({block:'center'});if(video.currentTime<1.5){article.querySelector('button[aria-label="Play video"]')?.click();return false}article.querySelector('button[aria-label="Pause video"]')?.click();return true})()`,
      'Prévia web não reproduziu',
    )
    assert.equal(
      await web.webContents.executeJavaScript(
        `document.querySelector('[data-editorial-component="${videoId}"] video').currentSrc.includes(${JSON.stringify(derivative.proxyAssetId)})`,
      ),
      true,
      'A prévia precisa consumir o proxy confirmado',
    )
    await writeFile(path.join(directory, 'web-result.png'), await captureProof(web))
    await choose(web, 'prepare-media')
    await waitProof(
      web,
      `${panel}.textContent.includes('Requer app desktop')`,
      'Etapa desktop não sinalizada',
    )
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-editorial-component="${videoId}"]').scrollIntoView({block:'center'})`,
    )
    await writeFile(path.join(directory, 'native-result.png'), await captureProof(window))
    const evidence = {
      projectId,
      videoId,
      sourceAssetId: original.manifest.id,
      sourceHash,
      sourceKind: 'Existing P21 silent screen recording; not phone footage or recorded speech',
      preparationRunId: preparation.request.id,
      editRunId: edited.request.id,
      renderRunId: rendered.request.id,
      derivative,
      timeline: montage.document.timeline,
      output: output.manifest,
      metadata,
      webUpload: true,
      nativeUiRequests: true,
      realCodex: true,
      remoteStorage: true,
      webPreview: true,
      confirmedProxyPlayback: true,
      webPreload: false,
      originalPreserved: true,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } catch (error) {
    await writeFile(
      path.join(directory, `failure-${Date.now()}.json`),
      JSON.stringify(
        {
          message: error instanceof Error ? error.message : String(error),
          web: await web.webContents.executeJavaScript('document.body.innerText'),
          native: await window.webContents.executeJavaScript('document.body.innerText'),
        },
        null,
        2,
      ),
    )
    throw error
  } finally {
    web.destroy()
  }
}
