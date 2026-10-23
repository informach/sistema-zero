import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  importBatchResultSchema,
  importSourceResultSchema,
  projectViewSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { InventoryStore } from './inventory-store'

export async function proveSourceImport(window: BrowserWindow, manager: DesktopWorkspaceManager) {
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
  for (const record of inventory.evidence) {
    const page = await store.page(record.id),
      ordinal = page.entries.findIndex(
        (source) =>
          source.disposition === 'eligible' &&
          source.path.endsWith('.md') &&
          ['copy', 'research', 'direction', 'calendar'].includes(source.category) &&
          (source.bytes ?? Infinity) <= 196608,
      )
    const source = page.entries[ordinal]
    if (!source) throw new Error('Amostra textual não encontrada na primeira página')
    console.log(`source-proof: ${record.origin} ${source.path}`)
    const invoke = () =>
      window.webContents.executeJavaScript(
        `window.marketing.loadInventoryText(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)},${JSON.stringify(record.id)},${ordinal})`,
      )
    const result = importSourceResultSchema.parse(await invoke()),
      repeated = importSourceResultSchema.parse(await invoke())
    if (JSON.stringify(result) !== JSON.stringify(repeated))
      throw new Error('Repetição mudou a referência carregada')
    const view = projectViewSchema.parse(await manager.view(inventory.projectId))
    const text = result.destinations
      .map((destination) => {
        const item = view.items.find((item) => item.id === destination.entityId)
        if (item?.document.kind !== 'evidence' || item.revisionId !== destination.revisionId)
          throw new Error('Referência não sincronizada no desktop')
        return item.document.body
      })
      .join('')
    if (createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex') !== source.sha256)
      throw new Error('Bytes importados diferem da origem')
    evidence.push({
      origin: record.origin,
      path: source.path,
      sha256: source.sha256,
      sourceVersionId: result.sourceVersionId,
      exactBytes: true,
      repeatedWithoutDuplication: true,
    })
  }
  const sourceInventory = inventory.evidence.find((record) => record.origin === 'sistema-zero')
  if (!sourceInventory) throw new Error('Inventário do Sistema Zero ausente')
  const selection = {
    product: 'cade-todo-mundo',
    categories: ['direction', 'copy', 'research', 'calendar', 'unclassified'],
    includeReview: true,
  }
  const batch = () =>
    window.webContents.executeJavaScript(
      `window.marketing.loadInventorySelection(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)},${JSON.stringify(sourceInventory.id)},${JSON.stringify(selection)})`,
    )
  const loaded = importBatchResultSchema.parse(await batch())
  if (loaded.selected < 2 || loaded.verifying || loaded.loaded + loaded.reused !== loaded.selected)
    throw new Error('A seleção textual do novo produto não foi inteiramente carregada')
  await window.loadURL(window.webContents.getURL())
  const repeatedBatch = importBatchResultSchema.parse(await batch())
  if (repeatedBatch.loaded || repeatedBatch.verifying || repeatedBatch.reused !== loaded.selected)
    throw new Error('A carga em lote não preservou os resultados após reinício do renderer')
  await window.webContents
    .executeJavaScript(`new Promise((resolve,reject)=>{
    const projectId=${JSON.stringify(inventory.projectId)};
    const ready=()=>{
      const select=document.querySelector('select[aria-label="Projeto atual"]');
      if(!select||![...select.options].some(option=>option.value===projectId))return false;
      if(select.value!==projectId){select.value=projectId;select.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const panel=document.querySelector('[aria-label="Cargas do acervo"]');
      if(!panel){[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar acervo')?.click();return false}
      const section=document.querySelector('[aria-label="Origens inventariadas"]');
      if(!section){const row=[...panel.querySelectorAll('li')].find(row=>row.textContent.includes('Fluxo Criativo'));[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir origens')?.click();return false}
      return document.querySelectorAll('[aria-label="Importar acervo existente"]').length===1&&section.textContent.includes('Referência carregada')&&[...section.querySelectorAll('button')].some(button=>button.textContent==='Abrir referência'&&!button.disabled);
    };
    const finish=()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Referência importada não apareceu na interface'))},30000);
    observer.observe(document.body,{childList:true,subtree:true});finish();
  })`)
    .catch(async (error) => {
      await writeFile(
        path.join(directory, 'source-import-failed.png'),
        (await window.webContents.capturePage()).toPNG(),
      )
      await writeFile(
        path.join(directory, 'source-import-failed.txt'),
        await window.webContents.executeJavaScript('document.body.innerText'),
      )
      throw error
    })
  await window.webContents.executeJavaScript(`new Promise(resolve=>{
    const button=[...document.querySelectorAll('[aria-label="Origens inventariadas"] button')].find(button=>button.textContent==='Abrir referência');
    button?.closest('li')?.scrollIntoView({block:'center'});requestAnimationFrame(()=>resolve(true));
  })`)
  await writeFile(
    path.join(directory, 'source-import-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'source-import-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        projectId: inventory.projectId,
        evidence,
        batch: { selection, loaded, repeated: repeatedBatch },
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ sourceImportProof: true, evidence, loaded, repeatedBatch }))
}
