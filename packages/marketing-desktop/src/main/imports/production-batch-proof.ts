import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ProductionReport,
  productionLinkPreviewSchema,
  productionReportPageSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { SyncTransport } from '../sync/sync-engine'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'

export async function proveProductionBatchLinks(
  window: BrowserWindow,
  transport: SyncTransport,
  input: { projectId: string; inventoryId: string; directory: string },
) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const status = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let checked=false,started=false;
    const ready=()=>{
      const panel=document.querySelector('[aria-label="Vínculos da carga inteira"]');
      if(!panel)return null;
      const buttons=[...panel.querySelectorAll('button')];
      if(!checked){const button=buttons.find(button=>button.textContent==='Conferir vínculos da carga inteira');if(button&&!button.disabled){checked=true;button.click()}return null}
      const messages=[...panel.querySelectorAll('[role="status"]')].map(node=>node.textContent);
      if(messages.some(text=>text.includes('Sequência concluída.')||text.includes('Sequência interrompida;')))return messages.join(' ');
      if(!started){const button=buttons.find(button=>/^Vincular artes de \\d+ peças conferidas$/.test(button.textContent));if(button&&!button.disabled){started=true;button.click();return null}
        if(messages.some(text=>text.includes('conferências consultadas.'))&&!buttons.some(button=>button.disabled))return 'Nenhum vínculo novo aplicável.';
      }
      return null;
    };
    const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Vínculos excederam vinte minutos; conservar recibos e retomar'))},1200000),poll=setInterval(finish,500);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const reports = await readReports(transport, input)
  const results = []
  for (const report of reports) {
    const preview = productionLinkPreviewSchema.parse(
      await transport.request(`/projects/${input.projectId}/production-reports/${report.id}/link`),
    )
    results.push({ key: report.review.folder.key, ...preview })
  }
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Vínculos da carga inteira"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(input.directory, 'production-batch-links-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(input.directory, 'production-batch-links-evidence.json'),
    JSON.stringify({ status, results, approved: false, published: false }, null, 2),
  )
  console.log(
    JSON.stringify({
      nativeProductionBatchLinks: true,
      status,
      counts: {
        linked: results.filter((row) => row.status === 'linked').length,
        blocked: results.filter((row) => row.status === 'blocked').length,
        ready: results.filter((row) => row.status === 'ready').length,
      },
    }),
  )
  if (typeof status !== 'string' || status.includes('Sequência interrompida;'))
    throw new Error('A sequência de vínculos foi interrompida; confira a interface')
  const blockedIds = new Set(
    results.filter((row) => row.status === 'blocked').map((row) => row.reportId),
  )
  await provePendingReports(
    window,
    reports.filter((report) => blockedIds.has(report.id)),
    input.directory,
  )
}

async function provePendingReports(
  window: BrowserWindow,
  reports: ProductionReport[],
  directory: string,
) {
  await window.webContents.executeJavaScript(`(()=>{
    const select=document.querySelector('[aria-label="Filtrar situação das peças importadas"]');
    if(!select)throw new Error('Filtro de pendências ausente');
    select.value='blocked';select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`)
  const keys = z.array(z.string()).parse(
    await waitProof(
      window,
      `(()=>{
    const list=document.querySelector('[aria-label="Situação dos vínculos"]');
    const rows=list?[...list.children]:[];
    if(rows.length!==${reports.length}||rows.some(row=>![...row.querySelectorAll('button')].some(button=>button.textContent==='Conferir pendência')))return null;
    return rows.map(row=>row.querySelector('p').textContent);
  })()`,
      'O filtro não mostrou todas as pendências',
    ),
  )
  const expected = reports.map((report) => report.review.folder.key).sort()
  if (JSON.stringify([...keys].sort()) !== JSON.stringify(expected))
    throw new Error('As pendências da interface divergem dos recibos do servidor')
  const evidence = []
  for (const report of reports) {
    const label = `Conferência ${report.review.folder.key}`
    await window.webContents.executeJavaScript(`(()=>{
      const list=document.querySelector('[aria-label="Situação dos vínculos"]');
      const row=[...list.children].find(row=>row.querySelector('p')?.textContent===${JSON.stringify(report.review.folder.key)});
      const button=[...row.querySelectorAll('button')].find(button=>button.textContent==='Conferir pendência');
      if(!button||button.disabled)throw new Error('A pendência não pode ser consultada');
      button.click();
    })()`)
    const rendered = z
      .object({ issues: z.array(z.string()), files: z.number(), focused: z.boolean() })
      .parse(
        await waitProof(
          window,
          `(()=>{
        const panel=[...document.querySelectorAll('section')].find(node=>node.getAttribute('aria-label')===${JSON.stringify(label)});
        if(!panel||document.activeElement!==panel)return null;
        return { issues:[...panel.querySelectorAll('[aria-label="Pendências da produção"] > li > p:first-child')].map(node=>node.textContent),files:panel.querySelector('[aria-label="Ordem das artes e texto alternativo"]').children.length,focused:document.activeElement===panel };
      })()`,
          `A conferência ${report.review.folder.key} não abriu`,
        ),
      )
    if (
      rendered.files !== report.review.files.length ||
      !rendered.focused ||
      JSON.stringify(rendered.issues) !==
        JSON.stringify(report.review.issues.map((issue) => issue.message))
    )
      throw new Error(`Conferência incompleta na interface: ${report.review.folder.key}`)
    evidence.push({ key: report.review.folder.key, ...rendered })
  }
  await writeFile(
    path.join(directory, 'production-pending-evidence.json'),
    JSON.stringify({ reports: evidence, approved: false, published: false }, null, 2),
  )
  await writeFile(path.join(directory, 'production-pending-review.png'), await captureProof(window))
  console.log(
    JSON.stringify({ nativeProductionPendingProof: true, reports: evidence.length, keys }),
  )
}

async function readReports(
  transport: SyncTransport,
  input: { projectId: string; inventoryId: string },
) {
  const reports: ProductionReport[] = []
  const cursors = new Set<string>()
  let after: string | null = null
  do {
    const page = productionReportPageSchema.parse(
      await transport.request(
        `/projects/${input.projectId}/imports/${input.inventoryId}/production-reports${after ? `?after=${after}` : ''}`,
      ),
    )
    if (
      page.items.some(
        (row) => row.projectId !== input.projectId || row.inventoryId !== input.inventoryId,
      )
    )
      throw new Error('A consulta retornou outra carga')
    reports.push(...page.items)
    if (reports.length > 1000) throw new Error('A prova excede 1.000 conferências')
    after = page.nextCursor
    if (after && cursors.has(after)) throw new Error('A paginação não avançou')
    if (after) cursors.add(after)
  } while (after)
  if (new Set(reports.map((report) => report.review.folder.path)).size !== reports.length)
    throw new Error('A sequência duplicou uma pasta de produção')
  return reports
}

/** Runs the sequential sharing action through the same button used by the team. */
export async function proveProductionBatch(
  window: BrowserWindow,
  transport: SyncTransport,
  input: { projectId: string; inventoryId: string; directory: string },
) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const status = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let located=false,started=false;
    const ready=()=>{
      const panel=document.querySelector('[aria-label="Conferência das artes locais"]');
      if(!panel)return null;
      const buttons=[...panel.querySelectorAll('button')];
      if(!located){const button=buttons.find(button=>button.textContent==='Localizar peças produzidas');if(button&&!button.disabled){located=true;button.click()}return null}
      if(!started){const button=buttons.find(button=>/^Compartilhar \\d+ conferências do produto$/.test(button.textContent));if(button&&!button.disabled){started=true;button.click()}return null}
      const status=[...panel.querySelectorAll('[role="status"]')].map(node=>node.textContent).find(text=>text.includes('Sequência concluída.')||text.includes('Sequência interrompida;'));
      return status??null;
    };
    const finish=()=>{try{const value=ready();if(value){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(value)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('A sequência de conferências excedeu vinte minutos; recibos devem ser retomados pela mesma ação'))},1200000),poll=setInterval(finish,500);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const reports = await readReports(transport, input)
  await window.webContents.executeJavaScript(
    `new Promise(resolve=>{document.querySelector('[aria-label="Conferência das artes locais"]').scrollIntoView({block:'start'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
  )
  await writeFile(
    path.join(input.directory, 'production-batch-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  const evidence = {
    status,
    reports: reports.map((report) => ({
      id: report.id,
      key: report.review.folder.key,
      state: report.review.state,
      files: report.review.files.length,
      sources: report.sources.length,
    })),
    approved: false,
    published: false,
  }
  await writeFile(
    path.join(input.directory, 'production-batch-evidence.json'),
    JSON.stringify(evidence, null, 2),
  )
  console.log(JSON.stringify({ nativeProductionBatch: evidence }))
  if (typeof status !== 'string' || !status.includes('Sequência concluída.'))
    throw new Error('A sequência foi interrompida; confira a mensagem na interface')
  return reports
}
