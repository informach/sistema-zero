import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app, type BrowserWindow, session, type WebContentsView } from 'electron'
import { z } from 'zod'
import { itemSchema } from '../../../marketing-contracts/src/editorial'
import { runViewSchema } from '../../../marketing-contracts/src/execution'
import { connectionStateSchema, unwrapWorkspaceResponse } from '../shared/connection'
import { readBoundedJson } from './bounded-json'
import type { DesktopServerSession } from './server-session'

export async function proveServerSession(
  window: BrowserWindow,
  server: DesktopServerSession,
  online: () => WebContentsView | undefined,
  openLink: (url: string) => void,
) {
  if (app.isPackaged) throw new Error('A prova usa somente a distribuição de desenvolvimento')
  const root = path.join(app.getAppPath(), '.cache/connected-proof')
  const fixture = z
    .object({
      origin: z.literal('http://127.0.0.1:15312'),
      email: z.string(),
      password: z.string(),
      userId: z.string().uuid(),
    })
    .parse(JSON.parse(await readFile(path.join(root, 'fixture.json'), 'utf8')))
  const invoke = (method: string, input?: unknown) =>
    window.webContents
      .executeJavaScript(
        `window.marketing.${method}(${input === undefined ? '' : JSON.stringify(input)})`,
      )
      .then((value) => (method === 'workspace' ? unwrapWorkspaceResponse(value) : value))
  if (!process.argv.includes('--smoke-resume')) {
    const pair = z
      .object({ code: z.string() })
      .parse(
        await invoke('connect', { origin: fixture.origin, label: 'Revisão Electron integrada' }),
      )
    const browser = session.fromPartition(`review-browser-${randomUUID()}`)
    async function post(route: string, body: unknown) {
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`Prova BFF ${route}: HTTP ${response.status}`)
      return readBoundedJson(response)
    }
    await post('/api/auth/login', { email: fixture.email, password: fixture.password })
    await post('/api/desktop', { action: 'describe', code: pair.code })
    await post('/api/desktop', { action: 'approve', code: pair.code })
    const connected = connectionStateSchema.parse(await invoke('pollConnection'))
    if (
      connected.status !== 'connected' ||
      connected.userId !== fixture.userId ||
      !connected.storageProtected
    )
      throw new Error('Conexão não confirmou a identidade e armazenamento protegido')
    const project = z.object({ id: z.string().uuid() }).parse(
      await invoke('workspace', {
        scope: { origin: fixture.origin, userId: fixture.userId },
        method: 'POST',
        path: '/projects',
        body: {
          schemaVersion: 1,
          operationId: randomUUID(),
          id: randomUUID(),
          name: 'Prova de equipe integrada',
          product: 'Sistema Zero',
        },
      }),
    )
    await writeFile(
      path.join(root, 'proof.json'),
      JSON.stringify({
        projectId: project.id,
        deviceId: connected.deviceId,
        userId: connected.userId,
      }),
    )
    await invoke('synchronize')
    await window.webContents.executeJavaScript(
      `window.marketing.saveDraft(${JSON.stringify({ origin: fixture.origin, userId: fixture.userId })},${JSON.stringify({ dependsOnOperationId: null, operation: { schemaVersion: 1, operationId: randomUUID(), projectId: project.id, entityId: randomUUID(), baseRevisionId: null, action: 'save', document: { schemaVersion: 1, kind: 'direction', title: 'Direção sincronizada', body: 'Teste de rascunho durável', objective: 'Ensinar', audience: 'Famílias', voice: 'Clareza', referenceIds: [], protectedTerms: [] } } })})`,
    )
  }
  const proof = z
    .object({
      projectId: z.string().uuid(),
      deviceId: z.string().uuid(),
      userId: z.string().uuid(),
    })
    .parse(JSON.parse(await readFile(path.join(root, 'proof.json'), 'utf8')))
  const directoryScope = { origin: fixture.origin, userId: fixture.userId }
  const team = z.array(z.object({ id: z.string(), name: z.string(), active: z.boolean() })).parse(
    await invoke('workspace', {
      scope: directoryScope,
      method: 'GET',
      path: `/projects/${proof.projectId}/members`,
    }),
  )
  if (
    !team.some(
      (member) =>
        member.id === fixture.userId && member.name === 'Revisão Marketing' && member.active,
    )
  )
    throw new Error('Diretório canônico da equipe não resolveu a conta')
  const staff = z.array(z.object({ id: z.string() })).parse(
    await invoke('workspace', {
      scope: directoryScope,
      method: 'GET',
      path: `/projects/${proof.projectId}/staff?q=${encodeURIComponent('Revisão')}`,
    }),
  )
  if (!staff.some((member) => member.id === fixture.userId))
    throw new Error('Busca da equipe não retornou a conta de revisão')
  const restored = connectionStateSchema.parse(await invoke('connection'))
  if (
    restored.deviceId !== proof.deviceId ||
    restored.userId !== proof.userId ||
    restored.status !== 'connected'
  )
    throw new Error('Sessão não restaurou a identidade vinculada')
  const snapshots = await Promise.all(
    Array.from({ length: 8 }, () =>
      invoke('workspace', {
        scope: { origin: fixture.origin, userId: fixture.userId },
        method: 'GET',
        path: `/projects/${proof.projectId}/snapshot`,
      }),
    ),
  )
  for (const snapshot of snapshots)
    z.object({ items: z.array(z.unknown()), cursor: z.number() }).parse(snapshot)
  const syncReport = z
    .object({ phase: z.string(), message: z.string() })
    .parse(await invoke('synchronize'))
  if (syncReport.phase !== 'idle') throw new Error(`Sincronização: ${syncReport.message}`)
  const cached = z
    .object({ items: z.array(z.unknown()).length(1), pending: z.array(z.unknown()).length(0) })
    .parse(await invoke('projectView', proof.projectId))
  let executionProof: unknown = null
  if (process.argv.includes('--smoke-execution')) {
    const source = itemSchema.parse(cached.items[0])
    const scope = { origin: fixture.origin, userId: fixture.userId }
    const request = {
      schemaVersion: 1,
      projectId: proof.projectId,
      entityId: source.id,
      revisionId: source.revisionId,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction:
        'Escreva uma legenda de até 25 palavras, em português, sobre aprender criando um jogo.',
      selection: [],
      protectedIds: [],
      limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
    }
    const context = z
      .object({ hash: z.string() })
      .parse(await invoke('workspace', { scope, method: 'POST', path: '/context', body: request }))
    const created = runViewSchema.parse(
      await invoke('workspace', {
        scope,
        method: 'POST',
        path: '/runs',
        body: {
          ...request,
          id: randomUUID(),
          operationId: randomUUID(),
          contextHash: context.hash,
        },
      }),
    )
    const completed = runViewSchema.parse(
      await invoke('execute', {
        scope,
        projectId: proof.projectId,
        runId: created.request.id,
        strategy: 'start',
      }),
    )
    if (
      completed.state !== 'succeeded' ||
      completed.outcome?.status !== 'succeeded' ||
      !completed.outcome.text.trim() ||
      !completed.outcome.mode.startsWith('ChatGPT')
    )
      throw new Error('A execução nativa não confirmou o resultado no servidor')
    const confirmed = runViewSchema.parse(
      await invoke('workspace', {
        scope,
        method: 'GET',
        path: `/projects/${proof.projectId}/runs/${created.request.id}`,
      }),
    )
    executionProof = {
      id: confirmed.request.id,
      state: confirmed.state,
      epoch: confirmed.epoch,
      mode: completed.outcome.mode,
      textReceived: true,
    }
  }
  const mismatched = await server.electronSession.fetch(
    `${fixture.origin}/api/marketing/workspace/projects`,
    {
      headers: {
        'x-marketing-desktop-user': randomUUID(),
        'x-marketing-desktop-device': proof.deviceId,
      },
    },
  )
  if (mismatched.status !== 401)
    throw new Error('A sincronização aceitou a identidade de outra conta')
  const workbenchRendered =
    await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const ready=()=>Boolean(document.querySelector('[data-marketing-workbench]'));
    if(ready()){resolve(true);return}
    const observer=new MutationObserver(()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}});
    const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('A bancada não foi renderizada'))},10000);
    observer.observe(document.body,{childList:true,subtree:true});
  })`)
  const sample = z
    .object({ projectId: z.string().uuid(), confirmedItems: z.number() })
    .parse(JSON.parse(await readFile(path.join(root, 'sample-import.json'), 'utf8')))
  const sampleView = z
    .object({ items: z.array(itemSchema), pending: z.array(z.unknown()) })
    .parse(await invoke('projectView', sample.projectId))
  if (sampleView.items.length !== sample.confirmedItems || sampleView.pending.length)
    throw new Error('A amostra do acervo não chegou ao cache do desktop')
  const piece = sampleView.items.find(
    (item) => item.document.kind === 'piece' && item.document.sourceKey === 'instagram:P01',
  )
  if (piece?.document.kind !== 'piece') throw new Error('P01 ausente na amostra')
  const representationId = piece.document.representationIds[0]
  const representation = sampleView.items.find((item) => item.id === representationId)
  if (representation?.document.kind !== 'representation') throw new Error('Formato de P01 ausente')
  const componentId = representation.document.componentIds[0]
  const component = sampleView.items.find((item) => item.id === componentId)
  if (!component) throw new Error('Componente de P01 ausente')
  let handoffRevision = component.revisionId
  let editorialProof: unknown = null
  if (process.argv.includes('--smoke-editorial')) {
    const results: unknown[] = []
    const handoffComponentId = component.id
    for (const key of ['P01', 'P07', 'P34']) {
      const sourcePiece = sampleView.items.find(
        (item) => item.document.kind === 'piece' && item.document.sourceKey === `instagram:${key}`,
      )
      if (sourcePiece?.document.kind !== 'piece') throw new Error(`${key} ausente`)
      const sourceRepresentation = sampleView.items.find(
        (item) =>
          sourcePiece.document.kind === 'piece' &&
          sourcePiece.document.representationIds.includes(item.id),
      )
      if (sourceRepresentation?.document.kind !== 'representation')
        throw new Error(`Formato ${key} ausente`)
      const component = sampleView.items.find(
        (item) =>
          sourceRepresentation.document.kind === 'representation' &&
          sourceRepresentation.document.componentIds[0] === item.id,
      )
      if (!component) throw new Error(`Componente ${key} ausente`)
      const scope = { origin: fixture.origin, userId: fixture.userId }
      const request = {
        schemaVersion: 1,
        projectId: sample.projectId,
        entityId: component.id,
        revisionId: component.revisionId,
        intent: 'adjust',
        capability: 'copy',
        provider: key === 'P34' ? 'claude' : 'codex',
        instruction:
          'Melhore minimamente a clareza deste slide. Preserve o sentido, as falas e o produto; não acrescente promessas. Mude somente o campo body.',
        selection: [],
        protectedIds: [],
        limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
      }
      const context = z
        .object({ hash: z.string() })
        .parse(
          await invoke('workspace', { scope, path: '/context', method: 'POST', body: request }),
        )
      const created = runViewSchema.parse(
        await invoke('workspace', {
          scope,
          path: '/runs',
          method: 'POST',
          body: {
            ...request,
            id: randomUUID(),
            operationId: randomUUID(),
            contextHash: context.hash,
          },
        }),
      )
      const result = runViewSchema.parse(
        await invoke('execute', {
          scope,
          projectId: sample.projectId,
          runId: created.request.id,
          strategy: 'start',
        }),
      )
      if (result.application?.result?.status !== 'applied')
        throw new Error(
          `A proposta nativa não foi aplicada: ${result.application?.error?.message ?? result.application?.result?.status ?? result.state}`,
        )
      const undone = runViewSchema.parse(
        await invoke('workspace', {
          scope,
          path: `/projects/${sample.projectId}/runs/${created.request.id}/undo`,
          method: 'POST',
          body: {},
        }),
      )
      if (undone.application?.undo?.status !== 'applied')
        throw new Error('Desfazer da copy nativa não confirmou nova revisão')
      const restored = undone.application.undo.items.find((item) => item.id === component.id)
      if (!restored) throw new Error('Desfazer não incluiu o componente de origem')
      if (component.id === handoffComponentId) handoffRevision = restored.revisionId
      results.push({
        piece: key,
        runId: created.request.id,
        mode: result.outcome?.status === 'succeeded' ? result.outcome.mode : null,
        applied: true,
        undone: true,
        before: component.document,
        proposal: result.outcome?.status === 'succeeded' ? result.outcome.editorial : null,
      })
      await writeFile(path.join(root, 'editorial-quality.json'), JSON.stringify(results, null, 2))
    }
    editorialProof = results
    await invoke('synchronize')
  }
  const handoff = z.object({ id: z.string().uuid() }).parse(
    await invoke('workspace', {
      scope: { origin: fixture.origin, userId: fixture.userId },
      method: 'POST',
      path: '/handoffs',
      body: {
        schemaVersion: 1,
        projectId: sample.projectId,
        entityId: component.id,
        revisionId: handoffRevision,
        selection: [],
        intent: 'adjust',
      },
    }),
  )
  const deepLink = new URL(`sistema-zero-marketing://open/${handoff.id}`)
  deepLink.searchParams.set('server', fixture.origin)
  openLink(deepLink.href)
  const sampleRendered = await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const ready=()=>Boolean(document.querySelector('[data-editorial-component="${component.id}"]')?.textContent.trim());
    if(ready()){resolve(true);return}
    const observer=new MutationObserver(()=>{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}});
    const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('A amostra não apareceu na bancada'))},15000);
    observer.observe(document.body,{childList:true,subtree:true});
  })`)
  await window.webContents.executeJavaScript(
    'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  )
  await writeFile(
    path.join(root, 'workbench.png'),
    (await window.webContents.capturePage()).toPNG(),
  )
  const libraryRendered = process.argv.includes('--smoke-library')
    ? await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
    const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Arquivos do projeto');
    if(!button){reject(new Error('Biblioteca não disponível na bancada'));return}
    const ready=()=>{
      const dialog=document.querySelector('[role="dialog"]');
      const error=dialog?.querySelector('[role="alert"]')?.textContent;
      if(error)throw new Error(error);
      return Boolean(dialog?.textContent.includes('Nenhum arquivo registrado neste projeto.'));
    };
    const finish=()=>{try{if(ready()){observer.disconnect();clearTimeout(timeout);resolve(true)}}catch(error){observer.disconnect();clearTimeout(timeout);reject(error)}};
    const observer=new MutationObserver(finish),timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Biblioteca não carregou'))},15000);
    observer.observe(document.body,{childList:true,subtree:true});button.click();finish();
  })`)
    : null
  if (libraryRendered)
    await window.webContents.executeJavaScript(
      'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',
    )
  if (libraryRendered)
    await writeFile(
      path.join(root, 'media-library.png'),
      (await window.webContents.capturePage()).toPNG(),
    )
  await invoke('online', true)
  const view = online()
  if (!view) throw new Error('Interface online não foi criada')
  const isolation = z
    .object({
      node: z.literal('undefined'),
      bridge: z.literal('undefined'),
      login: z.literal(false),
    })
    .parse(
      await view.webContents.executeJavaScript(
        '({node:typeof window.require,bridge:typeof window.marketing,login:location.pathname==="/login"})',
      ),
    )
  const cookies = await server.electronSession.cookies.get({ url: fixture.origin })
  const credential = cookies.find((cookie) => cookie.name === 'sz_mkt_desktop')
  if (!credential?.httpOnly || credential.session)
    throw new Error('Credencial não é HttpOnly persistente')
  await server.electronSession.cookies.flushStore()
  const report = {
    connected: true,
    canonicalTeam: true,
    workbenchRendered,
    sampleRendered,
    libraryRendered,
    sampleItems: sampleView.items.length,
    editorialProof,
    resumed: process.argv.includes('--smoke-resume'),
    parallelRequests: snapshots.length,
    cacheItems: cached.items.length,
    cachePending: cached.pending.length,
    identityMismatchRejected: true,
    executionProof,
    isolation,
    cookieHttpOnly: credential.httpOnly,
    storagePath: server.electronSession.getStoragePath(),
  }
  await writeFile(
    path.join(root, report.resumed ? 'resumed.json' : 'connected.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify({ sessionProof: report }))
}
