import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  importProductionPreviewSchema,
  preparedImportSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { DesktopServerSession } from '../server-session'

/** Fault injection is restricted to the paired local review profile and this single read-only route. */
export function delayReviewConnectionProbe(server: DesktopServerSession) {
  if (app.isPackaged || server.origin !== 'http://127.0.0.1:15314')
    throw new Error('Falha controlada restrita ao perfil local de revisão')
  server.electronSession.webRequest.onBeforeRequest(
    { urls: ['http://127.0.0.1:15314/api/desktop/connect'] },
    (_details, callback) => {
      console.log(JSON.stringify({ delayedConnectionProbe: true, milliseconds: 15000 }))
      setTimeout(() => callback({ cancel: false }), 15000)
    },
  )
}

/** Uses the durable, previously paired review profile; no auth or transport substitution. */
export async function proveProductionReview(window: BrowserWindow) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/connected-proof')
  const fixture = z
    .object({ userId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  const inventory = z
    .object({
      projectId: z.string().uuid(),
      evidence: z.array(z.object({ id: z.string().uuid(), origin: z.string() })),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'inventory-evidence.json'), 'utf8')))
  const run = inventory.evidence.find((entry) => entry.origin === 'sistema-zero')
  if (!run) throw new Error('Inventário de revisão ausente')
  const scope = { origin: 'http://127.0.0.1:15314', userId: fixture.userId }
  const cachedProjectListMs =
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const finish=()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(select&&[...select.options].some(option=>option.value===${JSON.stringify(inventory.projectId)})){observer.disconnect();clearTimeout(timeout);resolve(performance.now())}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('O acervo local ficou aguardando o servidor na abertura'))},5000);
    observer.observe(document.body,{childList:true,subtree:true});finish();
  })`)
  const locals = z
    .object({ items: z.array(preparedImportSchema) })
    .parse(
      await window.webContents.executeJavaScript(
        `window.marketing.localInventories(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)})`,
      ),
    )
  const local = locals.items.find((entry) => entry.id === run.id)
  if (!local) throw new Error('Inventário não está no cache do perfil de revisão')
  const folder =
    'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele'
  const result = importProductionPreviewSchema.parse(
    await window.webContents.executeJavaScript(
      `window.marketing.reviewInventoryProduction(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)},${JSON.stringify(run.id)},${JSON.stringify(folder)})`,
    ),
  )
  if (
    result.review.files.length !== 7 ||
    result.review.state !== 'ready-for-review' ||
    !result.review.matchingCopies.some((file) => file.endsWith('/v4/copy-fonte.md')) ||
    !result.review.otherCopies.some((file) => file.endsWith('/v3/copy-fonte.md'))
  )
    throw new Error('P01 não preservou a correspondência entre versões')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let selectedInventory=false, clickedReview=false;
    const ready=()=>{
      const project=document.querySelector('select[aria-label="Projeto atual"]');
      if(!project||![...project.options].some(option=>option.value===${JSON.stringify(inventory.projectId)}))return false;
      if(project.value!==${JSON.stringify(inventory.projectId)}){project.value=${JSON.stringify(inventory.projectId)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const buttons=[...document.querySelectorAll('button')];
      const list=document.querySelector('[aria-label="Cargas do acervo"]');
      if(!list){buttons.find(button=>button.textContent==='Importar acervo')?.click();return false}
      if(!selectedInventory){const row=[...list.querySelectorAll('li')].find(row=>row.textContent.includes(${JSON.stringify(new Date(local.capturedAt).toLocaleString('pt-BR'))})&&row.textContent.includes('Sistema Zero'));const button=[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir origens');if(button&&!button.disabled){selectedInventory=true;button.click()}return false}
      const panel=document.querySelector('[aria-label="Conferência das artes locais"]');
      if(!panel)return false;
      const locate=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Localizar peças produzidas');
      if(locate){if(!locate.disabled)locate.click();return false}
      const choice=panel.querySelector('select');
      if(!choice)return false;
      if(choice.value!==${JSON.stringify(folder)}){choice.value=${JSON.stringify(folder)};choice.dispatchEvent(new Event('change',{bubbles:true}));return false}
      if(!clickedReview){const check=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Conferir integridade e versões');if(check&&!check.disabled){clickedReview=true;check.click()}return false}
      return panel.textContent.includes('Correspondência textual conferida')&&panel.querySelector('[aria-label="Ordem das artes e texto alternativo"]')?.children.length===7&&panel.textContent.includes('Outras versões preservadas (1)');
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Conferência não apareceu na interface: '+document.body.textContent.slice(-2000)))},180000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{const panel=document.querySelector('[aria-label="Conferência das artes locais"]');panel.scrollIntoView({block:'start'});for(const details of panel.querySelectorAll('details'))if(details.querySelector('summary')?.textContent.includes('versões')||details.querySelector('summary')?.textContent.includes('Fontes'))details.open=true;requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(directory, 'production-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'production-review-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        localReadOnly: true,
        serverReconciliation: false,
        cachedProjectListMs,
        result,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      productionReviewProof: true,
      files: 7,
      buttonsClicked: true,
      serverReconciliation: false,
      cachedProjectListMs,
    }),
  )
}
