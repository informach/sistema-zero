import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { importCoverageSchema } from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import type { SyncTransport } from '../sync/sync-engine'

/** Exercises the actual shared renderer and scoped API in the isolated review profile. */
export async function proveImportCoverage(
  window: BrowserWindow,
  transport: SyncTransport,
  input: { projectId: string; inventoryId: string; directory: string },
) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const coverage = importCoverageSchema.parse(
    await transport.request(`/projects/${input.projectId}/imports/${input.inventoryId}/coverage`),
  )
  if (coverage.summary.reduce((sum, row) => sum + row.count, 0) !== coverage.run.received)
    throw new Error('A cobertura não reconcilia todo o inventário recebido')
  const displayed = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let clicked=false,filtered=false;
    const ready=()=>{
      const panel=document.querySelector('[aria-label="Cobertura da carga"]');
      if(!panel)return null;
      if(!clicked){const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Conferir cobertura da carga');if(button&&!button.disabled){clicked=true;button.click()}return null}
      const select=panel.querySelector('select');
      if(!select||select.disabled)return null;
      if(!filtered){filtered=true;select.value='loaded';select.dispatchEvent(new Event('change',{bubbles:true}));return null}
      if(select.value!=='loaded'||select.disabled)return null;
      const rows=[...panel.querySelectorAll('[aria-label="Origens e destinos da carga"] > li')];
      if(!rows.length||rows.some(row=>!row.textContent.includes('Preservadas no projeto')))return null;
      return { rows:rows.length, counts:[...panel.querySelectorAll('dl > div')].map(row=>({label:row.querySelector('dt').textContent,count:row.querySelector('dd').textContent})), destinations:rows.filter(row=>[...row.querySelectorAll('button')].some(button=>button.textContent.includes('Abrir referência preservada'))).length };
    };
    const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A interface não mostrou a cobertura e seus destinos'))},60000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Cobertura da carga"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(input.directory, 'coverage-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(input.directory, 'coverage-evidence.json'),
    JSON.stringify(
      {
        projectId: input.projectId,
        inventoryId: input.inventoryId,
        summary: coverage.summary,
        displayed,
        activated: false,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      nativeCoverageProof: true,
      received: coverage.run.received,
      summary: coverage.summary,
    }),
  )
}
