import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  importCalendarPreviewSchema,
  importCalendarResultSchema,
  importSourceResultSchema,
  importStructurePreviewSchema,
  importStructureResultSchema,
  projectViewSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import { rateLimitedTransport } from '../sync/rate-limit'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { InventoryStore } from './inventory-store'

export async function proveStructuredImport(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  review?: { directory: string; origin: 'http://127.0.0.1:15334' },
) {
  if (app.isPackaged) throw new Error('Prova disponível somente em desenvolvimento')
  const directory = review?.directory ?? path.join(app.getAppPath(), '.cache/connected-proof')
  const fixture = z
    .object({ userId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  const inventory = z
    .object({
      projectId: z.string().uuid(),
      evidence: z.array(z.object({ id: z.string().uuid(), origin: z.string() })),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'inventory-evidence.json'), 'utf8')))
  const run = inventory.evidence.find((value) => value.origin === 'sistema-zero')
  if (!run) throw new Error('Inventário do Sistema Zero ausente')
  const scope = { origin: review?.origin ?? 'http://127.0.0.1:15314', userId: fixture.userId }
  await manager.synchronize()
  const resources = await manager.resources(scope, inventory.projectId),
    store = new InventoryStore(path.join(resources.directory, 'imports'))
  const retryWaits: number[] = []
  const transport = rateLimitedTransport(
    resources.transport,
    new AbortController().signal,
    (ms) => {
      retryWaits.push(ms)
      console.log(JSON.stringify({ importRetryAfterMs: ms }))
    },
  )
  const request = (route: string, method: 'GET' | 'POST' = 'GET', body?: unknown) =>
    transport.request(route, method, body)
  const evidence = []
  for (const suffix of [
    'instagram/postagens/01-p01-a-p10.md',
    'instagram/postagens/02-p11-a-p20.md',
    'instagram/postagens/03-p21-a-p30.md',
    'instagram/postagens/09-p31-a-p40.md',
    'instagram/postagens/10-p41-a-p50.md',
    'instagram/postagens/11-p51-a-p60.md',
    'instagram/postagens/04-stories.md',
    'instagram/postagens/07-extras-para-familias.md',
    'instagram/02-fixados.md',
    'instagram/04-postagens-manychat.md',
    'instagram/01-destaques.md',
  ]) {
    let cursor: number | null = 0,
      ordinal = -1
    while (cursor !== null) {
      const page = await store.page(run.id, cursor)
      const index = page.entries.findIndex(
        (entry) => entry.path.endsWith(suffix) && !entry.path.includes('/historico/'),
      )
      if (index >= 0) {
        ordinal = cursor + index
        break
      }
      cursor = page.nextCursor
    }
    if (ordinal < 0) throw new Error(`Fonte não encontrada: ${suffix}`)
    const source = importSourceResultSchema.parse(
      await window.webContents.executeJavaScript(
        `window.marketing.loadInventoryText(${JSON.stringify(scope)},${JSON.stringify(inventory.projectId)},${JSON.stringify(run.id)},${ordinal})`,
      ),
    )
    const route = `/projects/${inventory.projectId}/import-sources/${source.sourceVersionId}/structure`
    const preview = importStructurePreviewSchema.parse(await request(route))
    if (preview.issues.length || !preview.pieces.length)
      throw new Error(`Conversão incompleta: ${suffix}`)
    for (const piece of preview.pieces) {
      const input = {
        operationId: randomUUID(),
        sourceVersionId: source.sourceVersionId,
        parserVersion: preview.parserVersion,
        key: piece.key,
        expectedMappingId: piece.mappingId,
      }
      const applied = importStructureResultSchema.parse(
        await request(`/projects/${inventory.projectId}/import-structures`, 'POST', input),
      )
      if (applied.status === 'conflict') throw new Error(`Conflito em ${piece.key}`)
      const receipt = await request(
        `/projects/${inventory.projectId}/receipts/${input.operationId}`,
      )
      const saved = z
        .object({ found: z.literal(true), result: importStructureResultSchema })
        .parse(receipt)
      if (JSON.stringify(saved.result) !== JSON.stringify(applied))
        throw new Error('Recibo diverge da conversão')
    }
    await window.loadURL(window.webContents.getURL())
    const confirmed = importStructurePreviewSchema.parse(await request(route))
    if (confirmed.pieces.some((piece) => piece.state !== 'imported'))
      throw new Error('Conversão não confirmada após recarga')
    evidence.push({
      source: suffix,
      sourceVersionId: source.sourceVersionId,
      pieces: confirmed.pieces.length,
      components: confirmed.pieces.reduce((total, piece) => total + piece.components, 0),
      directMessages: confirmed.pieces.reduce((total, piece) => total + piece.directMessages, 0),
      receiptsVerified: true,
      reloadVerified: true,
    })
    console.log(
      JSON.stringify({ structuredSourceConfirmed: suffix, pieces: confirmed.pieces.length }),
    )
  }
  let calendarOrdinal = -1,
    calendarCursor: number | null = 0
  while (calendarCursor !== null) {
    const page = await store.page(run.id, calendarCursor)
    const index = page.entries.findIndex(
      (entry) =>
        entry.path.endsWith('instagram/03-postagens.md') && !entry.path.includes('/historico/'),
    )
    if (index >= 0) {
      calendarOrdinal = calendarCursor + index
      break
    }
    calendarCursor = page.nextCursor
  }
  if (calendarOrdinal < 0) throw new Error('Calendário real não encontrado')
  const calendarSource = await store.loadText(
    run.id,
    inventory.projectId,
    calendarOrdinal,
    resources.transport,
    new AbortController().signal,
  )
  const calendarRoute = `/projects/${inventory.projectId}/import-sources/${calendarSource.sourceVersionId}/calendar`
  const calendar = importCalendarPreviewSchema.parse(await request(calendarRoute))
  if (
    calendar.entries.length !== 80 ||
    calendar.entries.some((entry) => !['new', 'update', 'imported'].includes(entry.state))
  )
    throw new Error('Calendário incompleto ou ambíguo')
  for (const entry of calendar.entries) {
    const input = {
      operationId: randomUUID(),
      sourceVersionId: calendar.sourceVersionId,
      parserVersion: calendar.parserVersion,
      key: entry.key,
      pieceId: entry.pieceId,
      expectedRevisionId: entry.revisionId,
      expectedMappingId: entry.mappingId,
    }
    const applied = importCalendarResultSchema.parse(
      await request(`/projects/${inventory.projectId}/import-calendars`, 'POST', input),
    )
    if (applied.status === 'conflict') throw new Error(`Conflito no calendário em ${entry.key}`)
    const saved = z
      .object({ found: z.literal(true), result: importCalendarResultSchema })
      .parse(await request(`/projects/${inventory.projectId}/receipts/${input.operationId}`))
    if (JSON.stringify(saved.result) !== JSON.stringify(applied))
      throw new Error('Recibo do calendário divergente')
  }
  const calendarConfirmed = importCalendarPreviewSchema.parse(await request(calendarRoute))
  if (calendarConfirmed.entries.some((entry) => entry.state !== 'imported'))
    throw new Error('Calendário não confirmado')
  await manager.synchronize()
  const view = projectViewSchema.parse(await manager.view(inventory.projectId))
  for (const entry of calendarConfirmed.entries) {
    const piece = view.items.find((item) => item.id === entry.pieceId)
    if (
      piece?.document.kind !== 'piece' ||
      piece.document.week !== entry.week ||
      piece.document.position !== entry.position ||
      piece.document.editorialDate !== null
    )
      throw new Error(`Calendário local diverge da origem em ${entry.key}`)
  }
  const piece = view.items.find(
    (item) =>
      item.document.kind === 'piece' &&
      item.document.sourceKey?.endsWith('/04-postagens-manychat.md#MC01'),
  )
  if (piece?.document.kind !== 'piece' || piece.document.state !== 'incomplete')
    throw new Error('MC01 não sincronizada em preparação')
  const representations = view.items.filter(
    (item) => item.document.kind === 'representation' && item.document.pieceId === piece.id,
  )
  if (representations.length !== 2) throw new Error('Direct não foi separado da peça visual')
  await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const ready=()=>{
      const select=document.querySelector('select[aria-label="Projeto atual"]');
      if(!select||![...select.options].some(option=>option.value===${JSON.stringify(inventory.projectId)}))return false;
      if(select.value!==${JSON.stringify(inventory.projectId)}){select.value=${JSON.stringify(inventory.projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}
      if(document.body.textContent.includes('Carregando o acervo'))return false;
      const buttons=[...document.querySelectorAll('button')];
      const pieces=buttons.find(button=>button.textContent==='Peças');
      if(pieces?.getAttribute('aria-pressed')==='false'){pieces.click();return false}
      const item=buttons.find(button=>button.textContent.startsWith('MC01 ·'));
      if(!item)return false;
      if(item.getAttribute('aria-pressed')!=='true'){item.click();return false}
      const direct=buttons.find(button=>button.textContent.startsWith('MC01 · Direct ·'));
      if(!direct)return false;
      if(direct.getAttribute('aria-pressed')!=='true'){direct.click();return false}
      return document.querySelector('[data-editorial-component]')?.textContent.includes('Oi, esta é uma resposta automática da Helena e do Júlio.')&&document.body.textContent.includes('Orientações de produção da origem');
    };
    const check=()=>{if(ready()){observer.disconnect();clearTimeout(timeout);clearInterval(poll);resolve(true)}};
    const observer=new MutationObserver(check),timeout=setTimeout(()=>{observer.disconnect();clearInterval(poll);reject(new Error('Peça convertida não apareceu no editor'))},30000),poll=setInterval(check,250);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true});check();
  })`)
  await window.webContents.executeJavaScript(`new Promise(resolve=>{
    const notes=[...document.querySelectorAll('details')].find(element=>element.querySelector('summary')?.textContent==='Orientações de produção da origem');
    if(!notes)throw new Error('Notas da mensagem ausentes');
    notes.open=true;notes.scrollIntoView({block:'center'});
    requestAnimationFrame(()=>requestAnimationFrame(resolve));
  })`)
  await writeFile(
    path.join(directory, 'structure-import-review.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  await writeFile(
    path.join(directory, 'structure-import-evidence.json'),
    JSON.stringify(
      {
        passed: true,
        projectId: inventory.projectId,
        evidence,
        calendar: {
          sourceVersionId: calendar.sourceVersionId,
          entries: calendar.entries.length,
          receiptsVerified: true,
          datesInferred: false,
        },
        retryWaits,
        publicationScheduled: false,
        sourceMediaReconciled: false,
      },
      null,
      2,
    ),
  )
  console.log(JSON.stringify({ structuredImportProof: true, evidence }))
}
