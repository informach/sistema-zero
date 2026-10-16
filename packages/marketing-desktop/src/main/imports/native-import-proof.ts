import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  importBatchResultSchema,
  importCategorySchema,
  importProductBindingSchema,
  importRunSchema,
  productionReportPageSchema,
  productionShareResultSchema,
  projectSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow, session } from 'electron'
import { z } from 'zod'
import { connectionStateSchema } from '../../shared/connection'
import { readBoundedJson } from '../bounded-json'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { proveCacheCleanup } from './cache-cleanup-proof'
import { proveConnectedComposition } from './composition-connected-proof'
import { proveImportCoverage } from './coverage-proof'
import { proveImportDelta } from './delta-proof'
import { profileImport } from './import-profile'
import { proveNativeIntelligence } from './intelligence-proof'
import { InventoryStore } from './inventory-store'
import { proveOtherProducts, proveOtherReleases } from './other-products-proof'
import { proveProductionBatch, proveProductionBatchLinks } from './production-batch-proof'
import { proveProductionLink } from './production-link-proof'
import { proveWebProductionReport } from './shared-report-proof'
import { proveStructuredImport } from './structure-proof'

/** A separate DB, account and OS-protected profile; never changes the older connected proof. */
export async function proveNativeImport(window: BrowserWindow, manager: DesktopWorkspaceManager) {
  if (app.isPackaged) throw new Error('Prova restrita à distribuição de desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/native-connected-proof')
  const fixture = z
    .object({
      userId: z.string().uuid(),
      email: z.string(),
      password: z.string(),
      origin: z.literal('http://127.0.0.1:15334'),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  const scope = { origin: fixture.origin, userId: fixture.userId }
  const invoke = (method: string, ...args: unknown[]) =>
    window.webContents.executeJavaScript(
      `window.marketing.${method}(${args.map((value) => JSON.stringify(value)).join(',')})`,
    )
  const before = connectionStateSchema.parse(await invoke('connection'))
  if (before.status !== 'connected') {
    const pair = z
      .object({ code: z.string() })
      .parse(
        await invoke('connect', { origin: fixture.origin, label: 'Revisão integrada do acervo' }),
      )
    const browser = session.fromPartition(`native-review-login-${randomUUID()}`)
    for (const [route, body] of [
      ['/api/auth/login', { email: fixture.email, password: fixture.password }],
      ['/api/desktop', { action: 'describe', code: pair.code }],
      ['/api/desktop', { action: 'approve', code: pair.code }],
    ] as const) {
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`Autenticação da prova ${route}: HTTP ${response.status}`)
      await readBoundedJson(response)
    }
    connectionStateSchema.parse(await invoke('pollConnection'))
  }
  const connected = connectionStateSchema.parse(await invoke('connection'))
  if (
    connected.status !== 'connected' ||
    connected.userId !== fixture.userId ||
    connected.origin !== fixture.origin ||
    !connected.storageProtected
  )
    throw new Error('Identidade da revisão não corresponde ao perfil isolado')
  if (process.argv.includes('--smoke-intelligence'))
    return proveNativeIntelligence(window, manager, scope)
  if (process.argv.includes('--smoke-composition-connected'))
    return proveConnectedComposition(window, manager, scope, {
      email: fixture.email,
      password: fixture.password,
    })
  const projectId = await stableEditorialId(
    `${fixture.userId}:native-import:comunidade-dos-criadores`,
  )
  const project = projectSchema.parse(
    await invoke('workspace', {
      scope,
      path: '/projects',
      method: 'POST',
      body: {
        schemaVersion: 1,
        id: projectId,
        operationId: await stableEditorialId(`${projectId}:create`),
        name: 'Comunidade dos Criadores · acervo em preparação',
        product: 'Comunidade dos Criadores',
      },
    }),
  )
  await manager.synchronize()
  const resources = await manager.resources(scope, project.id)
  const store = new InventoryStore(path.join(resources.directory, 'imports'))
  // A rescan creates another immutable snapshot. Keep the original proof's
  // inventory as baseline instead of choosing whichever UUID sorts first.
  const inventoryArgument = process.argv.find((value) =>
    value.startsWith('--smoke-native-inventory='),
  )
  let prepared = inventoryArgument
    ? (await store.page(z.string().uuid().parse(inventoryArgument.split('=')[1]), 0)).prepared
    : (await store.list()).items
        .filter((value) => value.origin === 'sistema-zero')
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0]
  if (!prepared)
    prepared = await store.prepare(
      'C:/Users/tocha/projects/sistema-zero',
      'sistema-zero',
      AbortSignal.timeout(10 * 60000),
      (files, bytes) => {
        if (files % 1000 === 0) console.log(JSON.stringify({ nativeInventory: files, bytes }))
      },
    )
  const run = importRunSchema.parse(await invoke('syncInventory', scope, project.id, prepared.id))
  if (run.state !== 'inventoried') throw new Error('Inventário não confirmado')
  console.log(
    JSON.stringify({
      nativeInventoryConfirmed: true,
      projectId: project.id,
      inventoryId: run.id,
      entries: prepared.entryCount,
    }),
  )
  await manager.synchronize()
  await window.loadURL(window.webContents.getURL())
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    let selected=false, bound=false;
    const ready=()=>{
      const project=document.querySelector('select[aria-label="Projeto atual"]');
      if(!project||![...project.options].some(option=>option.value===${JSON.stringify(project.id)}))return false;
      if(project.value!==${JSON.stringify(project.id)}){project.value=${JSON.stringify(project.id)};project.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const list=document.querySelector('[aria-label="Cargas do acervo"]');
      if(!list){[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar acervo')?.click();return false}
      if(!selected){const row=[...list.querySelectorAll('li')].find(row=>row.textContent.includes(${JSON.stringify(new Date(prepared.capturedAt).toLocaleString('pt-BR'))}));const button=[...(row?.querySelectorAll('button')??[])].find(button=>button.textContent==='Conferir origens');if(button&&!button.disabled){selected=true;button.click()}return false}
      const field=[...document.querySelectorAll('fieldset')].find(field=>field.querySelector('legend')?.textContent==='Produto de destino');
      if(!field)return false;
      if(field.textContent.includes('Vínculo confirmado: comunidade-dos-criadores'))return true;
      const select=field.querySelector('select');
      if(select?.value!=='comunidade-dos-criadores'){select.value='comunidade-dos-criadores';select.dispatchEvent(new Event('change',{bubbles:true}));return false}
      const submit=[...field.querySelectorAll('button')].find(button=>button.textContent==='Vincular produto ao projeto');
      if(submit&&!submit.disabled&&!bound){bound=true;submit.click()}
      return false;
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Vínculo não confirmado pela interface: '+document.body.textContent.slice(-1500)))},120000),poll=setInterval(finish,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  const bindings = z.array(importProductBindingSchema).parse(
    await invoke('workspace', {
      scope,
      path: `/projects/${project.id}/import-products`,
      method: 'GET',
    }),
  )
  if (
    !bindings.some(
      (value) =>
        value.origin === 'sistema-zero' &&
        value.product === 'comunidade-dos-criadores' &&
        !value.includeShared,
    )
  )
    throw new Error('O vínculo da interface não foi persistido no servidor')
  const selection = await window.webContents.executeJavaScript(`(()=>{
    const field=[...document.querySelectorAll('fieldset')].find(field=>field.querySelector('legend')?.textContent==='Carregar ou retomar um conjunto');
    if(!field)throw new Error('Carga por produto ausente');
    const select=field.querySelector('select');
    return [...select.options].map(option=>option.value);
  })()`)
  if (JSON.stringify(selection) !== JSON.stringify(['comunidade-dos-criadores']))
    throw new Error('A seleção permite misturar produtos')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const finish=()=>{
      const field=[...document.querySelectorAll('fieldset')].find(field=>field.querySelector('legend')?.textContent==='Produto de destino');
      if(!field||field.disabled)return;
      observer.disconnect();clearTimeout(timeout);field.scrollIntoView({block:'start'});
      requestAnimationFrame(()=>requestAnimationFrame(resolve));
    };
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('O vínculo permaneceu ocupado'))},10000);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
  })`)
  await writeFile(
    path.join(directory, 'product-binding-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'inventory-evidence.json'),
    JSON.stringify(
      {
        projectId: project.id,
        evidence: [{ id: run.id, origin: run.origin, digest: run.digest, entries: run.entryCount }],
        productBindingVerified: true,
        published: false,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      nativeProductBindingProof: true,
      projectId: project.id,
      origin: run.origin,
      product: bindings[0]?.product,
    }),
  )
  if (process.argv.includes('--smoke-native-clear-cache')) {
    await proveCacheCleanup(window, manager, scope, project.id, directory)
    return
  }
  if (process.argv.includes('--smoke-native-load-all')) {
    const stopProfile = process.argv.includes('--smoke-native-profile')
      ? await profileImport(window, directory)
      : null
    try {
      const result = importBatchResultSchema.parse(
        await invoke('loadInventorySelection', scope, project.id, run.id, {
          product: 'comunidade-dos-criadores',
          categories: importCategorySchema.options.filter((category) => category !== 'technical'),
          includeReview: process.argv.includes('--smoke-native-load-review'),
        }),
      )
      await writeFile(
        path.join(directory, 'bulk-import-evidence.json'),
        JSON.stringify(
          { projectId: project.id, inventoryId: run.id, result, activated: false },
          null,
          2,
        ),
      )
      console.log(JSON.stringify({ nativeBulkImport: result, projectId: project.id }))
    } finally {
      await stopProfile?.()
    }
  }
  if (process.argv.includes('--smoke-native-structure'))
    await proveStructuredImport(window, manager, { directory, origin: fixture.origin })
  if (process.argv.includes('--smoke-native-coverage'))
    await proveImportCoverage(window, resources.transport, {
      projectId: project.id,
      inventoryId: run.id,
      directory,
    })
  if (process.argv.includes('--smoke-native-share-all'))
    await proveProductionBatch(window, resources.transport, {
      projectId: project.id,
      inventoryId: run.id,
      directory,
    })
  if (process.argv.includes('--smoke-native-link-all'))
    await proveProductionBatchLinks(window, resources.transport, {
      projectId: project.id,
      inventoryId: run.id,
      directory,
    })
  if (
    process.argv.includes('--smoke-native-delta') ||
    process.argv.includes('--smoke-native-activate')
  )
    await proveImportDelta(window, resources.transport, {
      projectId: project.id,
      inventoryId: run.id,
      directory,
      activate: process.argv.includes('--smoke-native-activate'),
      reconcile: process.argv.includes('--smoke-native-reconcile')
        ? async (inventoryId) =>
            importBatchResultSchema.parse(
              await invoke('loadInventorySelection', scope, project.id, inventoryId, {
                product: 'comunidade-dos-criadores',
                categories: importCategorySchema.options.filter(
                  (category) => category !== 'technical',
                ),
                includeReview: true,
              }),
            )
        : undefined,
    })
  if (process.argv.includes('--smoke-native-other-products'))
    await proveOtherProducts(manager, scope)
  if (process.argv.includes('--smoke-native-activate-products'))
    await proveOtherReleases(manager, scope)
  if (process.argv.includes('--smoke-native-share')) {
    const folder =
      'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele'
    const result = productionShareResultSchema.parse(
      await invoke('shareInventoryProduction', scope, project.id, run.id, folder),
    )
    if (result.status === 'verifying') {
      console.log(
        JSON.stringify({ nativeProductionPending: result.pending, projectId: project.id }),
      )
      await writeFile(
        path.join(directory, 'production-sharing-pending.json'),
        JSON.stringify(result),
      )
      return
    }
    if (
      result.report.review.files.length !== 7 ||
      result.report.review.state !== 'ready-for-review'
    )
      throw new Error('Conferência compartilhada incompleta')
    const repeated = productionShareResultSchema.parse(
      await invoke('shareInventoryProduction', scope, project.id, run.id, folder),
    )
    if (repeated.status !== 'shared' || repeated.report.id !== result.report.id)
      throw new Error('Retomada duplicou o relatório')
    const page = productionReportPageSchema.parse(
      await invoke('workspace', {
        scope,
        method: 'GET',
        path: `/projects/${project.id}/imports/${run.id}/production-reports`,
      }),
    )
    if (!page.items.some((value) => value.id === result.report.id))
      throw new Error('Relatório não consultável pelo servidor')
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
      let consulted=false, selected=false;
      const ready=()=>{
        const panel=document.querySelector('[aria-label="Conferências compartilhadas"]');
        if(!panel)return false;
        const buttons=[...panel.querySelectorAll('button')];
        if(!consulted){const button=buttons.find(button=>button.textContent==='Consultar conferências compartilhadas');if(button&&!button.disabled){consulted=true;button.click()}return false}
        if(!selected){const button=buttons.find(button=>button.textContent.startsWith('P01 ·'));if(button&&!button.disabled){selected=true;button.click()}return false}
        const image=panel.querySelector('img');
        if(image?.complete&&image.naturalWidth>0)return true;
        const button=buttons.find(button=>button.textContent==='Conferir imagem 1');if(button&&!button.disabled)button.click();
        return false;
      };
      const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);clearInterval(poll);reject(error)}};
      const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Conferência compartilhada não abriu a imagem'))},120000),poll=setInterval(finish,250);
      observer.observe(document.body,{childList:true,subtree:true,attributes:true});finish();
    })`)
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>{document.querySelector('[aria-label="Conferências compartilhadas"] img').scrollIntoView({block:'center'});requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
    )
    await writeFile(
      path.join(directory, 'production-sharing-review.png'),
      (await window.webContents.capturePage()).toPNG(),
    )
    const web = await proveWebProductionReport({
      ...fixture,
      projectId: project.id,
      capturedAt: prepared.capturedAt,
      directory,
    })
    await writeFile(
      path.join(directory, 'production-sharing-evidence.json'),
      JSON.stringify(
        {
          passed: true,
          report: result.report,
          repeatedWithoutDuplication: true,
          linkedToComponents: false,
          approved: false,
          ...web,
        },
        null,
        2,
      ),
    )
    console.log(
      JSON.stringify({
        nativeProductionShared: true,
        reportId: result.report.id,
        originals: result.report.review.files.length,
        sources: result.report.sources.length,
      }),
    )
    if (process.argv.includes('--smoke-native-link'))
      await proveProductionLink(window, manager, scope, result.report, directory)
  }
}
