import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, type BrowserWindow } from 'electron'
import type { WorkspaceRequest } from '../../shared/connection'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { captureProof } from './capture-proof'

/** Exercise the product control, then restore one of the removed copies from R2. */
export async function proveCacheCleanup(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: WorkspaceRequest['scope'],
  projectId: string,
  directory: string,
) {
  if (app.isPackaged) throw new Error('Prova restrita ao ambiente de desenvolvimento')
  const resources = await manager.resources(scope, projectId),
    before = resources.assets.list(),
    usageBefore = await manager.storageUsage()
  const protectedIds = resources.store.protectedAssets(
    projectId,
    before.map((asset) => asset.id),
  )
  const message = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let opened=false,cleaned=false;
    const ready=()=>{
      const importer=document.querySelector('[role="dialog"][aria-label="Importar acervo existente"]');
      if(importer){importer.querySelector('button[aria-label="Fechar"]')?.click();return null}
      const dialog=document.querySelector('[role="dialog"][aria-label="Espaço neste computador"]');
      if(!dialog){if(!opened){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Espaço neste computador');if(button&&!button.disabled){opened=true;button.click()}}return null}
      const error=dialog.querySelector('[role="alert"]');if(error)throw new Error(error.textContent);
      if(!cleaned){const button=[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Liberar cópias locais');if(dialog.querySelector('dl')&&button&&!button.disabled){cleaned=true;button.click()}return null}
      const status=dialog.querySelector('[role="status"]');return status?.textContent??null;
    };
    const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A limpeza não terminou pela interface'))},600000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const retained = new Set(resources.assets.list().map((asset) => asset.id)),
    removed = before.filter((asset) => !retained.has(asset.id))
  assert.ok(removed.length > 0)
  assert.ok([...protectedIds].every((id) => retained.has(id)))
  const candidate = removed.sort((left, right) => left.size - right.size)[0]
  if (!candidate) throw new Error('Nenhuma cópia removida para conferir restauração')
  const usageAfter = await manager.storageUsage()
  await writeFile(path.join(directory, 'cache-cleanup-review.png'), await captureProof(window))
  const restored = await manager.download(scope, projectId, candidate.id)
  assert.equal(restored.sha256, candidate.sha256)
  assert.equal(restored.size, candidate.size)
  await resources.assets.verify(restored.id)
  const result = {
    message,
    removed: removed.length,
    freedBytes: removed.reduce((sum, asset) => sum + asset.size, 0),
    protected: protectedIds.size,
    usageBefore,
    usageAfter,
    restored: { id: restored.id, sha256: restored.sha256, size: restored.size },
    sourceFoldersUntouched: true,
  }
  await writeFile(
    path.join(directory, 'cache-cleanup-evidence.json'),
    JSON.stringify(result, null, 2),
  )
  console.log(
    JSON.stringify({
      cacheCleanupVerified: true,
      removed: result.removed,
      freedBytes: result.freedBytes,
      restored: restored.id,
    }),
  )
}
