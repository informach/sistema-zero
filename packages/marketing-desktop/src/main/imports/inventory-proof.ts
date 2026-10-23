import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { importRunSchema, projectSchema } from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { InventoryStore } from './inventory-store'
import { requestWorkspaceProof } from './workspace-proof'

export async function proveInventory(window: BrowserWindow, manager: DesktopWorkspaceManager) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const fixtureDirectory = path.join(app.getAppPath(), '.cache/connected-proof')
  const fixture = z
    .object({ userId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(fixtureDirectory, 'fixture.json'), 'utf8')))
  const scope = { origin: 'http://127.0.0.1:15314', userId: fixture.userId }
  z.object({
    status: z.literal('connected'),
    origin: z.literal(scope.origin),
    userId: z.literal(scope.userId),
  }).parse(await window.webContents.executeJavaScript('window.marketing.connection()'))
  const project = projectSchema.parse(
    await requestWorkspaceProof(window, {
      scope,
      method: 'POST',
      path: '/projects',
      body: {
        schemaVersion: 1,
        id: randomUUID(),
        operationId: randomUUID(),
        name: 'Acervo · inventário em revisão',
        product: 'Inventário das origens · preparação',
      },
    }),
  )
  await manager.synchronize()
  const resources = await manager.resources(scope, project.id)
  const directory = path.join(resources.directory, 'imports'),
    evidence = []
  for (const source of [
    { origin: 'sistema-zero', root: 'C:/Users/tocha/projects/sistema-zero' },
    { origin: 'fluxo-criativo', root: 'C:/Users/tocha/Documents/fluxo-criativo' },
  ] as const) {
    console.log(`inventory-proof: reading ${source.origin}`)
    const store = new InventoryStore(directory)
    const prepared = await store.prepare(
      source.root,
      source.origin,
      AbortSignal.timeout(10 * 60000),
      (files, bytes) => {
        if (files % 1000 === 0)
          console.log(`inventory-proof: ${source.origin} ${files} files ${bytes} bytes`)
      },
    )
    const { summary, products, ...input } = prepared
    const first = await store.page(prepared.id)
    // Commit the first chunk, then discard the store instance and reload the renderer.
    // This is an interrupted transfer, not a mocked server or a new import identity.
    for (const request of [
      { path: `/projects/${project.id}/imports`, body: input },
      {
        path: `/projects/${project.id}/imports/${prepared.id}/chunk`,
        body: { offset: 0, entries: first.entries },
      },
    ])
      importRunSchema.parse(
        await requestWorkspaceProof(window, { scope, method: 'POST', ...request }),
      )
    await window.loadURL(window.webContents.getURL())
    const recovered = await new InventoryStore(directory).list()
    if (
      !recovered.items.some((value) => value.id === prepared.id && value.digest === prepared.digest)
    )
      throw new Error('Inventário não recuperado após reabertura')
    console.log(`inventory-proof: resume ${source.origin}`)
    const finished = importRunSchema.parse(
      await window.webContents.executeJavaScript(
        `window.marketing.syncInventory(${JSON.stringify(scope)},${JSON.stringify(project.id)},${JSON.stringify(prepared.id)})`,
      ),
    )
    const repeated = importRunSchema.parse(
      await window.webContents.executeJavaScript(
        `window.marketing.syncInventory(${JSON.stringify(scope)},${JSON.stringify(project.id)},${JSON.stringify(prepared.id)})`,
      ),
    )
    if (finished.state !== 'inventoried' || JSON.stringify(finished) !== JSON.stringify(repeated))
      throw new Error('Repetição alterou o inventário confirmado')
    evidence.push({
      id: prepared.id,
      origin: source.origin,
      digest: prepared.digest,
      entries: prepared.entryCount,
      summary,
      products,
      resumeOffset: first.entries.length,
      repeatedWithoutDuplication: true,
    })
  }
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const projectId=${JSON.stringify(project.id)};
    const ready=()=>{
      const select=document.querySelector('select[aria-label="Projeto atual"]');
      if(!select||![...select.options].some(option=>option.value===projectId))return false;
      if(select.value!==projectId){select.value=projectId;select.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const panel=document.querySelector('[aria-label="Cargas do acervo"]');
      if(!panel){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar acervo');button?.click();return false}
      return panel.textContent.includes('Sistema Zero')&&panel.textContent.includes('Fluxo Criativo')&&panel.textContent.includes('Inventário confirmado');
    };
    const finish=()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Inventário não apareceu na bancada'))},30000);
    observer.observe(document.body,{childList:true,subtree:true});finish();
  })`)
  await writeFile(
    path.join(fixtureDirectory, 'inventory-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(fixtureDirectory, 'inventory-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        projectId: project.id,
        sourceReading: 'read-only',
        importedContent: false,
        published: false,
        rendererReloads: 2,
        evidence,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ inventoryProof: true, projectId: project.id, evidence }))
}
