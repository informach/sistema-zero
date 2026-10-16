import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ImportBatchResult,
  importDeltaSchema,
  importReleasePreviewSchema,
  importRunSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { SyncTransport } from '../sync/sync-engine'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'

/** Rescans through the actual desktop button, retaining immutable inventories.
 * Explicit reconciliation can preserve new sources and carry unchanged receipts;
 * activation records readiness to continue, never editorial approval/publication. */
export async function proveImportDelta(
  window: BrowserWindow,
  transport: SyncTransport,
  input: {
    projectId: string
    inventoryId: string
    directory: string
    activate?: boolean
    expectedPreserved?: number
    reconcile?: (inventoryId: string) => Promise<ImportBatchResult>
  },
): Promise<void> {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let started=false,compared=false;
    const ready=()=>{
      if(!started){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Conferir novamente a pasta');if(button&&!button.disabled){started=true;button.click()}return null}
      if(!compared&&!document.body.textContent.includes('Novo inventário registrado.'))return null;
      const panel=document.querySelector('[aria-label="Mudanças entre inventários"]');
      const select=panel?.querySelector('select');
      if(!select||select.disabled)return null;
      if(select.value!==${JSON.stringify(input.inventoryId)}){select.value=${JSON.stringify(input.inventoryId)};select.dispatchEvent(new Event('change',{bubbles:true}));return null}
      if(!compared){const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Comparar inventários');if(button&&!button.disabled){compared=true;button.click()}return null}
      return panel.querySelector('dl')&&!select.disabled?true:null;
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A nova leitura e comparação não foram concluídas pela interface'))},600000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const runs = z
    .array(importRunSchema)
    .parse(await transport.request(`/projects/${input.projectId}/imports`))
  const current = runs
    .filter((run) => run.origin === 'sistema-zero' && run.id !== input.inventoryId)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]
  if (current?.state !== 'inventoried')
    throw new Error('A nova leitura não foi preservada como inventário completo')
  const delta = importDeltaSchema.parse(
    await transport.request(
      `/projects/${input.projectId}/imports/${current.id}/compare?previousId=${input.inventoryId}`,
    ),
  )
  const displayed = z.array(z.object({ label: z.string(), count: z.string() })).parse(
    await window.webContents.executeJavaScript(`(()=>{
      const panel=document.querySelector('[aria-label="Mudanças entre inventários"]');
      return [...panel.querySelectorAll('dl > div')].map(row=>({label:row.querySelector('dt').textContent,count:row.querySelector('dd').textContent}));
    })()`),
  )
  const labels = {
    added: 'Origens novas',
    removed: 'Removidas da pasta',
    changed: 'Conteúdo alterado',
    reclassified: 'Classificação alterada',
    unchanged: 'Sem mudança',
  }
  for (const [state, label] of Object.entries(labels)) {
    const count = delta.summary.find((row) => row.state === state)?.count ?? 0
    if (displayed.find((row) => row.label === label)?.count !== count.toLocaleString('pt-BR'))
      throw new Error('As contagens da interface divergem do retrato confirmado')
  }
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Mudanças entre inventários"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(path.join(input.directory, 'delta-review.png'), await captureProof(window))
  const evidence = {
    previousId: input.inventoryId,
    currentId: current.id,
    summary: delta.summary,
    displayed,
    imported: false,
    activated: false,
  }
  await writeFile(
    path.join(input.directory, 'delta-evidence.json'),
    JSON.stringify(evidence, null, 2),
  )
  console.log(JSON.stringify({ nativeDeltaProof: true, ...evidence }))
  if (input.reconcile && delta.summary.some((row) => row.state !== 'unchanged' && row.count > 0)) {
    await window.webContents.executeJavaScript(`(()=>{
      const panel=document.querySelector('[aria-label="Mudanças entre inventários"]');
      const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Reaproveitar origens sem mudanças');
      if(!button||button.disabled)throw new Error('Reconciliação não disponível');button.click();
    })()`)
    const notice = z.string().parse(
      await waitProof(
        window,
        `(()=>{
      const panel=document.querySelector('[aria-label="Mudanças entre inventários"]');
      return [...panel.querySelectorAll('[role="status"]')].map(node=>node.textContent).find(text=>text.includes('conferências reaproveitadas;'))||null;
    })()`,
        'A reconciliação não foi confirmada na interface',
      ),
    )
    const loaded = await input.reconcile(current.id)
    await writeFile(
      path.join(input.directory, 'delta-reconciled-evidence.json'),
      JSON.stringify({ ...evidence, notice, loaded }, null, 2),
    )
    console.log(
      JSON.stringify({ nativeDeltaReconciled: true, inventoryId: current.id, notice, loaded }),
    )
    if (loaded.verifying)
      throw new Error(
        `A nova carga ${current.id} ainda aguarda verificação de arquivos; retome a mesma carga`,
      )
    return proveImportDelta(window, transport, {
      projectId: input.projectId,
      inventoryId: current.id,
      directory: input.directory,
      activate: input.activate,
      expectedPreserved: loaded.loaded + loaded.reused,
    })
  }
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let returned=false,checked=false;
    const ready=()=>{
      if(!returned){const button=[...document.querySelectorAll('button')].find(button=>button.textContent==='Voltar à carga já preparada');if(button&&!button.disabled){returned=true;button.click()}return null}
      if([...document.querySelectorAll('button')].some(button=>button.textContent==='Voltar à carga já preparada'))return null;
      const panel=document.querySelector('[aria-label="Liberação do acervo"]');
      if(!panel)return null;
      if(!checked){const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Conferir liberação do acervo');if(button&&!button.disabled){checked=true;button.click()}return null}
      return panel.textContent.includes('Última conferência recebida:')?true:null;
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A conferência de liberação não exibiu as pendências reais'))},60000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const release = importReleasePreviewSchema.parse(
    await transport.request(`/projects/${input.projectId}/imports/${input.inventoryId}/release`),
  )
  if (release.summary.productionLinked !== 37)
    throw new Error('A conferência diverge das 37 peças vinculadas')
  const rendered = z
    .array(z.string())
    .parse(
      await window.webContents.executeJavaScript(
        `(()=>[...document.querySelectorAll('[aria-label="Pendências para liberar o acervo"] li')].map(node=>node.textContent))()`,
      ),
    )
  if (JSON.stringify(rendered) !== JSON.stringify(release.blockers))
    throw new Error('A interface não mostrou as mesmas pendências do servidor')
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Liberação do acervo"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(input.directory, 'release-preparation-review.png'),
    await captureProof(window),
  )
  await writeFile(
    path.join(input.directory, 'release-preparation-evidence.json'),
    JSON.stringify(release, null, 2),
  )
  console.log(
    JSON.stringify({
      nativeReleasePreparationProof: true,
      state: release.state,
      summary: release.summary,
      blockers: release.blockers,
    }),
  )
  if (!input.activate) return
  if (
    release.blockers.length ||
    release.summary.preserved === 0 ||
    (input.expectedPreserved !== undefined &&
      release.summary.preserved !== input.expectedPreserved) ||
    release.summary.pending !== 0 ||
    release.summary.productionPending !== 10
  )
    throw new Error(
      `Acervo ainda não reconciliado: ${JSON.stringify({ summary: release.summary, blockers: release.blockers })}`,
    )
  if (release.state !== 'current') {
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let clicked=false;
      const check=()=>{
        const panel=document.querySelector('[aria-label="Liberação do acervo"]');
        if(!panel)return false;
        if(!clicked){const button=[...panel.querySelectorAll('button')].find(button=>button.textContent==='Liberar acervo com as pendências identificadas');if(button&&!button.disabled){clicked=true;button.click()}return false}
        return panel.querySelector('[role="status"]')?.textContent.includes('Acervo liberado para continuidade.');
      };
      const finish=()=>{try{if(check()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Liberação não confirmada na interface'))},120000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`)
  }
  const activated = importReleasePreviewSchema.parse(
    await transport.request(`/projects/${input.projectId}/imports/${input.inventoryId}/release`),
  )
  if (activated.state !== 'current' || !activated.latest || activated.blockers.length)
    throw new Error('O servidor não confirmou a continuidade do acervo')
  await writeFile(
    path.join(input.directory, 'release-activated-review.png'),
    await captureProof(window),
  )
  await writeFile(
    path.join(input.directory, 'release-activated-evidence.json'),
    JSON.stringify(
      {
        projectId: input.projectId,
        inventoryId: input.inventoryId,
        release: activated,
        published: false,
        approved: false,
        environment: 'native-review',
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      nativeReleaseActivated: true,
      releaseId: activated.latest.id,
      summary: activated.summary,
    }),
  )
}
