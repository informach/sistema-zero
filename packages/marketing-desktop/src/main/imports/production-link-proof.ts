import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ProductionReport,
  productionLinkPreviewSchema,
  projectViewSchema,
} from '@sistemazero/marketing-contracts'
import type { BrowserWindow } from 'electron'
import type { WorkspaceRequest } from '../../shared/connection'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'

export async function proveProductionLink(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: WorkspaceRequest['scope'],
  report: ProductionReport,
  directory: string,
) {
  const status = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let checked=false, applied=false;
    const ready=()=>{
      const panel=document.querySelector('[aria-label="Vínculo das artes à peça"]');
      if(!panel)return null;
      const buttons=[...panel.querySelectorAll('button')];
      if(!checked){const button=buttons.find(button=>button.textContent==='Conferir vínculo com a peça atual');if(button&&!button.disabled){checked=true;button.click()}return null}
      if(panel.textContent.includes('7 artes vinculadas'))return 'linked';
      if(panel.textContent.includes('aguardam verificação do servidor'))return 'verifying';
      if(!applied){const button=buttons.find(button=>button.textContent==='Vincular 7 artes à peça');if(button&&!button.disabled){applied=true;button.click()}}
      return null;
    };
    const finish=()=>{try{const status=ready();if(status){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(status)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Vínculo não concluído: '+document.body.textContent.slice(-1800)))},180000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  if (status === 'verifying') {
    console.log(JSON.stringify({ nativeProductionLinkPending: true, reportId: report.id }))
    return
  }
  const resources = await manager.resources(scope, report.projectId)
  const result = productionLinkPreviewSchema.parse(
    await resources.transport.request(
      `/projects/${report.projectId}/production-reports/${report.id}/link`,
    ),
  )
  if (result.status !== 'linked' || result.link.components.length !== 7)
    throw new Error('Vínculo não persistido')
  await manager.synchronize()
  const view = projectViewSchema.parse(await manager.view(report.projectId))
  const piece = view.items.find((item) => item.id === result.link.pieceId)
  if (piece?.document.kind !== 'piece' || piece.document.state !== 'incomplete')
    throw new Error('O vínculo ativou a peça indevidamente')
  for (const component of result.link.components) {
    const item = view.items.find((item) => item.id === component.componentId)
    const source = report.review.files.find((file) => file.sha256 === component.sha256)
    if (
      item?.document.kind !== 'component' ||
      item.revisionId !== component.revisionId ||
      JSON.stringify(item.document.assetIds) !== JSON.stringify([component.assetId]) ||
      item.document.alt !== source?.alt?.short
    )
      throw new Error('Componente não sincronizado com a arte e o alt esperados')
  }
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Vínculo das artes à peça"]').scrollIntoView({block:'center'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(directory, 'production-link-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  const first = result.link.components[0]
  if (!first) throw new Error('Vínculo sem componente')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let opened=false;
    const ready=()=>{
      if(!opened){const panel=document.querySelector('[aria-label="Vínculo das artes à peça"]');const button=[...(panel?.querySelectorAll('button')??[])].find(button=>button.textContent==='Abrir peça');if(button&&!button.disabled){opened=true;button.click()}return false}
      const component=document.querySelector('[data-editorial-component="${first.componentId}"]');
      const image=component?.querySelector('img');return image?.complete&&image.naturalWidth>0;
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A peça vinculada não abriu com a primeira arte'))},60000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[data-editorial-component="${first.componentId}"]').scrollIntoView({block:'center'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(directory, 'production-linked-piece-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'production-link-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        link: result.link,
        clickedThroughInterface: true,
        confirmedInLocalProjection: true,
        openedEditablePiece: true,
        activated: false,
        approved: false,
        published: false,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      nativeProductionLinked: true,
      reportId: report.id,
      components: result.link.components.length,
    }),
  )
}
