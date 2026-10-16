import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  approvedEditionSchema,
  batchOperationSchema,
  createPieceBatch,
  editionPageSchema,
  operationResultSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import type { WorkspaceRequest } from '../../shared/connection'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'
import { requestWorkspaceProof } from './workspace-proof'

/** A dedicated project; no real publication or approval of the imported production acervo. */
export async function proveEditionExport(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: { origin: string; userId: string },
  credentials: { email: string; password: string },
) {
  if (app.isPackaged || scope.origin !== 'http://127.0.0.1:15334')
    throw new Error('Prova restrita à revisão nativa')
  const directory = path.join(app.getAppPath(), '.cache/edition-export-proof')
  await mkdir(directory, { recursive: true })
  const projectId = await stableEditorialId(`${scope.userId}:edition-export-v1`)
  const request = (route: string, method: WorkspaceRequest['method'] = 'GET', body?: unknown) =>
    requestWorkspaceProof(window, { scope, path: route, method, ...(body ? { body } : {}) })
  await request('/projects', 'POST', {
    schemaVersion: 1,
    id: projectId,
    operationId: await stableEditorialId(`${projectId}:create`),
    name: 'Revisão de exportação da edição',
    product: 'Revisão isolada',
  })
  await manager.synchronize()
  const resources = await manager.resources(scope, projectId)
  const waitForUpload = async (id: string) => {
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      const view = await resources.transfer.confirm(projectId, id)
      if (view.state === 'confirmed') return
      if (view.state === 'failed') throw new Error(view.error ?? 'Arquivo recusado')
      await delay(1000)
    }
    throw new Error('A conferência remota do arquivo não terminou')
  }
  let batch: ReturnType<typeof batchOperationSchema.parse>
  try {
    batch = batchOperationSchema.parse(
      JSON.parse(await readFile(path.join(directory, 'batch.json'), 'utf8')),
    )
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    const source = path.join(app.getAppPath(), '.cache/hybrid-video-proof/source-art/art.png')
    const bytes = await readFile(source)
    const original = await manager.importMedia(scope, projectId, source, {
      expected: { sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length },
    })
    await manager.upload(scope, projectId, original.id, () => {})
    await waitForUpload(original.id)
    const final = await manager.prepareImportedFinal(
      scope,
      projectId,
      original.id,
      original.sha256,
      new AbortController().signal,
    )
    await manager.upload(scope, projectId, final.id, () => {})
    await waitForUpload(final.id)
    batch = createPieceBatch({
      projectId,
      title: 'Story de conferência da exportação',
      brief: 'Fixture para conferir integridade e edição imutável',
      format: 'story',
      medium: 'image',
    })
    const component = batch.changes.find((change) => change.document?.kind === 'component')
    const representation = batch.changes.find(
      (change) => change.document?.kind === 'representation',
    )
    if (
      component?.document?.kind !== 'component' ||
      representation?.document?.kind !== 'representation'
    )
      throw new Error('Fixture incompleta')
    component.document.body = 'Uma criação de cada vez.'
    component.document.alt = 'Arte da prova de criação de jogo.'
    component.document.assetIds = [final.id]
    representation.document.caption = 'Conheça a atividade.'
    await writeFile(path.join(directory, 'batch.json'), JSON.stringify(batch, null, 2))
  }
  await request('/batches', 'POST', batch)
  await manager.synchronize()
  const representation = batch.changes.find((change) => change.document?.kind === 'representation')
  if (!representation) throw new Error('Representação ausente')
  const route = `/projects/${projectId}/representations/${representation.entityId}/editions`
  const panel = `document.querySelector('[aria-label="Conferência da entrega"]')`
  async function openPiece(target: BrowserWindow) {
    await waitProof(
      target,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(projectId)}))return false;if(select.value!==${JSON.stringify(projectId)}){select.value=${JSON.stringify(projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}const button=[...document.querySelectorAll('button')].find(button=>button.querySelector('span')?.textContent==='Story de conferência da exportação');if(!button)return false;if(button.getAttribute('aria-pressed')!=='true'){button.click();return false}return !!${panel}})()`,
      'A peça de exportação não abriu',
    )
  }
  async function click(target: BrowserWindow, label: string) {
    await target.webContents.executeJavaScript(
      `(()=>{const button=[...${panel}.querySelectorAll('button')].find(button=>button.textContent===${JSON.stringify(label)});if(!button||button.disabled)throw new Error('Ação indisponível: '+${JSON.stringify(label)});button.click()})()`,
    )
  }
  await openPiece(window)
  let editions = editionPageSchema.parse(await request(route))
  if (!editions.items.length) {
    await click(window, 'Conferir arquivos finais')
    await waitProof(
      window,
      `${panel}.querySelectorAll('input[type="checkbox"]').length===3 && [...${panel}.querySelectorAll('img')].some(image=>image.complete&&image.naturalWidth>0)`,
      'A prévia aprovada não carregou',
    )
    await window.webContents.executeJavaScript(
      `${panel}.scrollIntoView({block:'start'}); [...${panel}.querySelectorAll('input[type="checkbox"]')].forEach(input=>input.click())`,
    )
    await writeFile(path.join(directory, 'native-approval.png'), await captureProof(window))
    await waitProof(
      window,
      `[...${panel}.querySelectorAll('button')].some(button=>button.textContent==='Aprovar esta edição'&&!button.disabled)`,
      'Conferência não habilitou aprovação',
    )
    await click(window, 'Aprovar esta edição')
    await waitProof(
      window,
      `${panel}.textContent.includes('Esta é a edição já aprovada')`,
      'Aprovação não confirmou',
    )
    editions = editionPageSchema.parse(await request(route))
  }
  const id = editions.items[0]?.id
  if (!id) throw new Error('Edição ausente')
  const edition = approvedEditionSchema.parse(
    await request(`/projects/${projectId}/editions/${id}`),
  )
  const asset = edition.snapshot.orderedAssets[0]
  if (!asset) throw new Error('Arquivo aprovado ausente')
  // Change the current draft; both exports must still use the exact approved revision.
  const component = edition.snapshot.revisions.find(
    (revision) => revision.entityId === asset.componentId,
  )
  if (component?.document?.kind !== 'component') throw new Error('Componente ausente')
  const changed = operationResultSchema.parse(
    await request('/operations', 'POST', {
      schemaVersion: 1,
      operationId: await stableEditorialId(`${id}:later-draft`),
      projectId,
      entityId: component.entityId,
      baseRevisionId: component.id,
      action: 'save',
      document: {
        ...component.document,
        body: 'Rascunho posterior à aprovação.',
        alt: 'Descrição posterior, não aprovada.',
        assetIds: [],
      },
    }),
  )
  assert.equal(changed.status, 'applied')
  const input = {
    projectId,
    editionId: id,
    componentId: asset.componentId,
    assetId: asset.asset.id,
    expectedHash: edition.hash,
  }
  const saved = path.join(directory, 'native-export.png')
  await writeFile(saved, 'existing destination')
  assert.equal(await manager.exportEditionFile(scope, input, async () => null), false)
  assert.equal(await readFile(saved, 'utf8'), 'existing destination')
  let filename = ''
  assert.equal(
    await manager.exportEditionFile(scope, input, async (name) => {
      filename = name
      return saved
    }),
    true,
  )
  const nativeBytes = await readFile(saved)
  assert.equal(createHash('sha256').update(nativeBytes).digest('hex'), asset.asset.sha256)
  assert.equal(nativeBytes.length, asset.asset.size)
  await assert.rejects(
    manager.exportEditionFile(scope, { ...input, expectedHash: '0'.repeat(64) }, async () => saved),
  )
  assert.equal(
    createHash('sha256')
      .update(await readFile(saved))
      .digest('hex'),
    asset.asset.sha256,
  )
  const browser = session.fromPartition(`edition-export-${randomUUID()}`)
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
  try {
    await web.loadURL(`${scope.origin}/bancada`)
    await openPiece(web)
    await waitProof(
      web,
      `[...${panel}.querySelectorAll('button')].some(button=>button.textContent.includes('arquivo(s)'))`,
      'Histórico de edições não abriu',
    )
    await web.webContents.executeJavaScript(
      `(()=>{const details=[...${panel}.querySelectorAll('details')].find(details=>details.querySelector('summary')?.textContent.startsWith('Edições aprovadas'));details.open=true;details.querySelector('button').click()})()`,
    )
    await waitProof(
      web,
      `${panel}.textContent.includes('Esta é a edição já aprovada')`,
      'Edição aprovada não abriu no web',
    )
    await waitProof(
      web,
      `[...${panel}.querySelectorAll('img')].some(image=>image.complete&&image.naturalWidth>0&&image.getBoundingClientRect().height>20)`,
      'A imagem aprovada não carregou no web',
    )
    assert.equal(
      await web.webContents.executeJavaScript(
        `${panel}.textContent.includes('Descrição posterior, não aprovada.')`,
      ),
      false,
    )
    await web.webContents.executeJavaScript(
      `(()=>{const details=[...${panel}.querySelectorAll('details')].find(details=>details.querySelector('summary')?.textContent==='Arquivos para publicação manual');details.open=true;details.scrollIntoView({block:'center'})})()`,
    )
    await click(web, 'Preparar download')
    await waitProof(web, `!!${panel}.querySelector('a[download]')`, 'O download não foi preparado')
    await writeFile(path.join(directory, 'web-download.png'), await captureProof(web))
    const webPath = path.join(directory, 'web-export.png')
    const download = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Download web não concluiu')), 60000)
      browser.once('will-download', (_event, item) => {
        item.setSavePath(webPath)
        item.once('done', (_event, state) => {
          clearTimeout(timeout)
          if (state === 'completed') resolve()
          else reject(new Error(`Download ${state}`))
        })
      })
    })
    const clicked = web.webContents.executeJavaScript(
      `${panel}.querySelector('a[download]').click()`,
    )
    await Promise.all([download, clicked])
    const webBytes = await readFile(webPath)
    assert.equal(webBytes.length, nativeBytes.length)
    assert.equal(createHash('sha256').update(webBytes).digest('hex'), asset.asset.sha256)
    assert.equal(await web.webContents.executeJavaScript('typeof window.marketing'), 'undefined')
    const evidence = {
      projectId,
      editionId: id,
      editionHash: edition.hash,
      filename,
      assetId: asset.asset.id,
      sha256: asset.asset.sha256,
      size: nativeBytes.length,
      nativeExportCore: true,
      nativeFileDialogTested: false,
      webUiDownload: true,
      cancelledDestinationPreserved: true,
      wrongEditionHashRejected: true,
      laterDraftDidNotReplaceApprovedRevision: true,
      r2Confirmed: true,
      noPublication: true,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } finally {
    web.destroy()
  }
}
