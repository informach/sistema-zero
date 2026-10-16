import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  assetDownloadSchema,
  importFileLoadResultSchema,
  projectViewSchema,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { InventoryStore } from './inventory-store'

export async function proveFileImport(window: BrowserWindow, manager: DesktopWorkspaceManager) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/connected-proof')
  const fixture = z
    .object({ userId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  const inventory = z
    .object({
      projectId: z.string().uuid(),
      evidence: z.array(
        z.object({ id: z.string().uuid(), origin: z.enum(['sistema-zero', 'fluxo-criativo']) }),
      ),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'inventory-evidence.json'), 'utf8')))
  const scope = { origin: 'http://127.0.0.1:15314', userId: fixture.userId }
  await manager.synchronize()
  const resources = await manager.resources(scope, inventory.projectId),
    store = new InventoryStore(path.join(resources.directory, 'imports'))
  const evidence = []
  let imageReference: string | undefined
  for (const candidate of [
    { origin: 'sistema-zero', suffix: '/postagens/p01-uma-ideia-dele/01-p01.png' },
    { origin: 'fluxo-criativo', suffix: 'meus-produtos/index.js' },
  ]) {
    const run = inventory.evidence.find((entry) => entry.origin === candidate.origin)
    if (!run) throw new Error('Inventário de origem ausente')
    let cursor: number | null = 0,
      ordinal = -1
    while (cursor !== null) {
      const page = await store.page(run.id, cursor),
        index = page.entries.findIndex((entry) => entry.path.endsWith(candidate.suffix))
      if (index >= 0) {
        ordinal = cursor + index
        break
      }
      cursor = page.nextCursor
    }
    if (ordinal < 0) throw new Error('Arquivo de amostra ausente')
    const source = (await store.page(run.id, ordinal)).entries[0]
    if (!source?.sha256 || !source.bytes) throw new Error('Original sem hash ou tamanho')
    console.log(`file-proof: ${source.path}`)
    const invoke = async () =>
      importFileLoadResultSchema.parse(
        await window.webContents.executeJavaScript(
          `window.marketing.loadInventoryFile(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)},${JSON.stringify(run.id)},${ordinal})`,
        ),
      )
    let outcome = await invoke()
    const waitedForIntegrity = outcome.status === 'verifying'
    if (outcome.status === 'verifying') {
      const assetId = outcome.assetId,
        deadline = Date.now() + 120000
      for (;;) {
        const state = uploadViewSchema.parse(
          await resources.transport.request(`/projects/${inventory.projectId}/assets/${assetId}`),
        )
        if (state.state === 'failed') throw new Error(state.error ?? 'Arquivo rejeitado')
        if (state.state === 'confirmed') break
        if (Date.now() >= deadline)
          throw new Error('Servidor não concluiu a conferência do arquivo')
        await delay(750)
      }
      await window.loadURL(window.webContents.getURL())
      outcome = await invoke()
    }
    if (outcome.status !== 'loaded') throw new Error('Arquivo ainda não vinculado após confirmação')
    const repeated = await invoke()
    if (JSON.stringify(repeated) !== JSON.stringify(outcome))
      throw new Error('Repetição duplicou a origem')
    const view = projectViewSchema.parse(await manager.view(inventory.projectId))
    const reference = view.items.find(
      (entry) => entry.id === outcome.result.destinations[0]?.entityId,
    )
    if (reference?.document.kind !== 'evidence') throw new Error('Referência importada ausente')
    const assetId = reference.document.assetIds?.[0]
    if (!assetId) throw new Error('Referência sem vínculo ao original confirmado')
    const descriptor = assetDownloadSchema.parse(
      await resources.transport.request(
        `/projects/${inventory.projectId}/assets/${assetId}/export`,
      ),
    )
    if (descriptor.manifest.sha256 !== source.sha256 || descriptor.manifest.size !== source.bytes)
      throw new Error('Manifesto diferente da origem')
    const remote = await fetch(descriptor.url, {
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    })
    if (
      !remote.ok ||
      !remote.body ||
      !remote.headers.get('content-disposition')?.startsWith('attachment;')
    )
      throw new Error('Exportação remota não é um anexo confirmado')
    const hash = createHash('sha256')
    let size = 0
    const reader = remote.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        hash.update(value)
        size += value.length
      }
    } finally {
      reader.releaseLock()
    }
    if (hash.digest('hex') !== source.sha256 || size !== source.bytes)
      throw new Error('Bytes do R2 diferentes da origem')
    const request = { projectId: inventory.projectId, assetId, expectedHash: source.sha256 }
    if (await manager.exportAssetFile(scope, request, async () => null))
      throw new Error('Exportação cancelada foi gravada')
    // Remove only this reproducible review cache entry to exercise a fresh download.
    await resources.assets.evict(assetId)
    const destination = path.join(
      directory,
      `file-import-${candidate.origin}${path.extname(source.path)}`,
    )
    await writeFile(destination, 'destino anterior')
    if (!(await manager.exportAssetFile(scope, request, async () => destination)))
      throw new Error('Exportação não concluída')
    const exported = await readFile(destination)
    if (createHash('sha256').update(exported).digest('hex') !== source.sha256)
      throw new Error('Exportação local divergente')
    if (candidate.origin === 'sistema-zero') imageReference = reference.id
    evidence.push({
      origin: candidate.origin,
      source: source.path,
      sha256: source.sha256,
      size: source.bytes,
      assetId,
      referenceId: reference.id,
      waitedForIntegrity,
      repeatedWithoutDuplication: true,
      verifiedR2Bytes: true,
      recoveredFromEmptyCache: true,
      exportedExactBytes: true,
    })
  }
  if (!imageReference) throw new Error('Referência visual ausente')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const projectId=${JSON.stringify(inventory.projectId)}, reference=${JSON.stringify(imageReference)};
    const ready=()=>{
      const select=document.querySelector('select[aria-label="Projeto atual"]');
      if(!select||![...select.options].some(option=>option.value===projectId))return false;
      if(select.value!==projectId){select.value=projectId;select.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const buttons=[...document.querySelectorAll('button')];
      const sources=buttons.find(button=>button.textContent==='Fontes e referências');
      if(sources?.getAttribute('aria-pressed')==='false'){sources.click();return false}
      const source=buttons.find(button=>button.textContent.includes('01-p01.png'));
      if(!source)return false;
      const attachments=buttons.find(button=>button.textContent==='Arquivos desta referência (1)');
      if(!attachments){source.click();return false}
      if(attachments.getAttribute('aria-expanded')==='false'){attachments.click();return false}
      const preview=buttons.find(button=>button.textContent==='Conferir mídia');
      if(preview){preview.click();return false}
      return [...document.images].some(img=>img.alt==='01-p01.png'&&img.complete&&img.naturalWidth>0);
    };
    const check=()=>{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}};
    const observer=new MutationObserver(check),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Prévia do original não apareceu na referência'))},30000),poll=setInterval(check,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});check();
  })`)
  await window.webContents.executeJavaScript(`new Promise(resolve=>{
    const image=[...document.images].find(img=>img.alt==='01-p01.png');
    if(!image)throw new Error('Imagem importada ausente');
    image.scrollIntoView({block:'center'});
    requestAnimationFrame(()=>requestAnimationFrame(resolve));
  })`)
  await writeFile(
    path.join(directory, 'file-import-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'file-import-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        projectId: inventory.projectId,
        storage: 'R2 testes-marketing',
        nativeDialogAutomated: false,
        evidence,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ fileImportProof: true, evidence }))
}
