import assert from 'node:assert/strict'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { projectViewSchema, runPageSchema, snapshotSchema } from '@sistemazero/marketing-contracts'
import { app, BrowserWindow, session } from 'electron'
import { z } from 'zod'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { proveCacheCleanup } from './cache-cleanup-proof'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'
import { requestWorkspaceProof } from './workspace-proof'

export async function proveMetricsLearning(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: { origin: string; userId: string },
  credentials: { email: string; password: string },
) {
  if (app.isPackaged || scope.origin !== 'http://127.0.0.1:15334')
    throw new Error('Prova restrita à revisão nativa')
  const directory = path.join(app.getAppPath(), '.cache/metrics-learning-proof')
  const fixture = z
    .object({
      projectId: z.string().uuid(),
      pieceId: z.string().uuid(),
      editionId: z.string().uuid(),
      editionHash: z.string(),
      deliveryId: z.string().uuid(),
      snapshotId: z.string().uuid(),
      syntheticMetrics: z.literal(true),
      socialPublicationPerformed: z.literal(false),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  const request = (route: string) =>
    requestWorkspaceProof(window, { scope, path: route, method: 'GET' })
  const click = (target: BrowserWindow, label: string) =>
    target.webContents.executeJavaScript(
      `(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent===${JSON.stringify(label)}&&!button.disabled);if(!button)throw new Error('Botão ausente: '+${JSON.stringify(label)});button.click()})()`,
    )
  const selectProject = (target: BrowserWindow) =>
    waitProof(
      target,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(fixture.projectId)}))return false;if(select.value!==${JSON.stringify(fixture.projectId)}){select.value=${JSON.stringify(fixture.projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}return true})()`,
      'Projeto da revisão não abriu',
    )
  await manager.synchronize()
  await selectProject(window)
  let view = projectViewSchema.parse(await manager.view(fixture.projectId))
  const piece = view.items.find((item) => item.id === fixture.pieceId)
  assert(piece)
  await waitProof(
    window,
    `(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.querySelector('span')?.textContent===${JSON.stringify(piece.document.title)});if(!button)return false;if(button.getAttribute('aria-pressed')!=='true'){button.click();return false}return true})()`,
    'Peça de revisão não abriu',
  )
  await waitProof(
    window,
    `(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('Stories no Instagram · Publicada'));if(!button)return false;if(!document.querySelector('[aria-label="Resultados desta edição"]'))button.click();return !!document.querySelector('[aria-label="Resultados desta edição"] dd')})()`,
    'Métricas não abriram',
  )
  const metrics = `document.querySelector('[aria-label="Resultados desta edição"]')`
  const observed = z
    .array(z.object({ label: z.string(), value: z.string() }))
    .parse(
      await window.webContents.executeJavaScript(
        `[...${metrics}.querySelectorAll('dl>div')].map(row=>({label:row.querySelector('dt').textContent,value:row.querySelector('dd').textContent}))`,
      ),
    )
  assert.deepEqual(observed, [
    { label: 'Visualizações', value: '1.200' },
    { label: 'Curtidas', value: '42' },
    { label: 'Comentários', value: '—' },
    { label: 'Compartilhamentos', value: '0' },
    { label: 'Salvamentos', value: '36' },
  ])
  await window.webContents.executeJavaScript(`${metrics}.scrollIntoView({block:'center'})`)
  await writeFile(path.join(directory, 'native-metrics.png'), await captureProof(window))
  let analysis = view.items.find((item) => item.document.kind === 'analysis')
  if (!analysis) {
    await click(window, 'Preparar análise com IA a partir desta coleta')
    await waitProof(
      window,
      `!!document.querySelector('[id^="request-"] textarea:not([readonly])') && document.body.textContent.includes('Análise pendente.')`,
      'Análise não abriu',
    )
    await manager.synchronize()
    view = projectViewSchema.parse(await manager.view(fixture.projectId))
    analysis = view.items.find((item) => item.document.kind === 'analysis')
  } else {
    await waitProof(
      window,
      `(()=>{const area=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Resumos e decisões');if(area?.getAttribute('aria-pressed')!=='true'){area?.click();return false}const entry=[...document.querySelectorAll('aside button')].find(button=>button.textContent.startsWith(${JSON.stringify(analysis.document.title)}));if(entry?.getAttribute('aria-pressed')!=='true'){entry?.click();return false}return !!document.getElementById('request-${analysis.id}')})()`,
      'Análise existente não abriu',
    )
  }
  assert(analysis?.document.kind === 'analysis')
  const analysisId = analysis.id
  const evidence = view.items.find(
    (item) =>
      item.document.kind === 'evidence' &&
      item.document.source.sourceKey?.endsWith(`snapshot:${fixture.snapshotId}`),
  )
  assert(evidence?.document.kind === 'evidence')
  assert(evidence.document.body.includes('Comentários: não fornecido'))
  assert(evidence.document.body.includes('Compartilhamentos: 0.'))
  assert(analysis.document.evidenceIds.includes(evidence.id))
  const basis = analysis.document.basis
  const runsRoute = `/projects/${fixture.projectId}/runs?entityId=${analysisId}`
  let runs = runPageSchema.parse(await request(runsRoute)).items
  const panel = `document.getElementById('request-${analysisId}')`
  if (
    !runs.some(
      (run) =>
        run.state !== 'succeeded' || (run.outcome?.status === 'succeeded' && run.outcome.editorial),
    )
  ) {
    await window.webContents.executeJavaScript(
      `(()=>{const panel=${panel};const select=[...panel.querySelectorAll('select')].find(select=>[...select.options].some(option=>option.value==='codex'));select.value='codex';select.dispatchEvent(new Event('change',{bubbles:true}));const input=panel.querySelector('textarea:not([readonly])');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Analise a coleta vinculada e a edição aprovada, não o rascunho posterior. Estes números são uma fixture de revisão, não resultados reais do negócio; diga isso no texto. Separe observações, limitações e hipóteses. Com 1200 visualizações e 36 salvamentos, a razão é 3%; não confunda visualizações com pessoas. Comentários não foram fornecidos e compartilhamentos observados são zero. Não infira causalidade nem conversões. Proponha um experimento com uma variável, critério em 48 horas e sugestão de pauta. Preencha a hipótese para alimentar a próxima pauta. Preserve as referências de origem.');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    )
    await waitProof(
      window,
      `[...${panel}.querySelectorAll('button')].some(button=>button.textContent==='Executar pedido'&&!button.disabled)`,
      'Execução não habilitou',
    )
    await window.webContents.executeJavaScript(`${panel}.scrollIntoView({block:'center'})`)
    await writeFile(path.join(directory, 'native-request.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `[...${panel}.querySelectorAll('button')].find(button=>button.textContent==='Executar pedido').click()`,
    )
  }
  const deadline = Date.now() + 600000
  let previousState = ''
  while (Date.now() < deadline) {
    runs = runPageSchema.parse(await request(runsRoute)).items
    const run = runs[0]
    if (run && run.state !== previousState) {
      previousState = run.state
      console.log(`metrics-learning: ${run.state}`)
    }
    if (run?.state === 'succeeded' && run.outcome?.status === 'succeeded' && run.outcome.editorial)
      break
    if (run && ['failed', 'waiting', 'canceled'].includes(run.state))
      throw new Error(`Análise preservada: ${JSON.stringify(run.outcome)}`)
    await delay(1500)
  }
  const run = runs[0]
  assert.equal(run?.state, 'succeeded')
  assert.equal(run?.application?.result?.status, 'applied')
  await manager.synchronize()
  view = projectViewSchema.parse(await manager.view(fixture.projectId))
  analysis = view.items.find((item) => item.id === analysisId)
  assert(analysis?.document.kind === 'analysis')
  assert.deepEqual(analysis.document.basis, basis)
  assert(analysis.document.evidenceIds.includes(evidence.id))
  assert(analysis.document.hypothesis.trim())
  assert(analysis.document.evaluationCriterion?.trim())
  assert(!analysis.document.body.startsWith('Análise pendente.'))
  await writeFile(path.join(directory, 'analysis.json'), JSON.stringify(analysis, null, 2))
  const browser = session.fromPartition(`metrics-learning-${crypto.randomUUID()}`)
  const login = await browser.fetch(`${scope.origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: scope.origin, 'content-type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  await login.body?.cancel()
  assert(login.ok)
  const web = new BrowserWindow({
    show: false,
    width: 1280,
    height: 1000,
    webPreferences: {
      session: browser,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: true,
      backgroundThrottling: false,
    },
  })
  try {
    await web.loadURL(`${scope.origin}/bancada`)
    await selectProject(web)
    await waitProof(
      web,
      `(()=>{const area=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Resumos e decisões');if(area?.getAttribute('aria-pressed')!=='true'){area?.click();return false}const entry=[...document.querySelectorAll('aside button')].find(button=>button.textContent.startsWith(${JSON.stringify(analysis.document.title)}));if(entry?.getAttribute('aria-pressed')!=='true'){entry?.click();return false}return !!document.getElementById('request-${analysisId}')})()`,
      'Análise sincronizada não abriu na web',
    )
    await writeFile(path.join(directory, 'web-analysis.png'), await captureProof(web))
    if (!analysis.document.proposedPieceId) {
      await click(web, 'Preparar próxima pauta')
      await waitProof(
        web,
        `!!document.querySelector('[role="dialog"][aria-label="Próxima pauta a partir da análise"]')`,
        'Próxima pauta não abriu',
      )
      assert.equal(
        await web.webContents.executeJavaScript(
          `document.querySelector('[role="dialog"] textarea[id$="-criterion"]').value`,
        ),
        analysis.document.evaluationCriterion,
      )
      assert.equal(
        await web.webContents.executeJavaScript(
          `document.querySelector('[role="dialog"] textarea[id$="-hypothesis"]').value`,
        ),
        analysis.document.hypothesis,
      )
      await web.webContents.executeJavaScript(
        `(()=>{const dialog=document.querySelector('[role="dialog"]');for(const [suffix,value] of [['format','story'],['medium','video']]){const select=dialog.querySelector('select[id$="-'+suffix+'"]');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}})()`,
      )
      await web.webContents.executeJavaScript(
        'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',
      )
      await writeFile(path.join(directory, 'web-next-dialog.png'), await captureProof(web))
      await web.webContents.executeJavaScript(
        `document.querySelector('[role="dialog"] form').requestSubmit()`,
      )
      await waitProof(
        web,
        `!document.querySelector('[role="dialog"]') && document.body.textContent.includes('Próximo ciclo ·')`,
        'Nova pauta não foi confirmada',
      )
    } else await click(web, 'Abrir pauta proposta')
    const response = await browser.fetch(
      `${scope.origin}/api/marketing/workspace/projects/${fixture.projectId}/snapshot`,
    )
    assert(response.ok)
    const snapshot = snapshotSchema.parse(await response.json())
    const next = snapshot.items.find(
      (item) =>
        item.document.kind === 'piece' && item.document.originAnalysis?.entityId === analysisId,
    )
    assert(next?.document.kind === 'piece')
    assert.equal(next.document.state, 'draft')
    const origin = next.document.originAnalysis
    assert(origin)
    assert.equal(
      origin.revisionId,
      run?.application?.result?.status === 'applied'
        ? run.application.result.items.find((item) => item.id === analysisId)?.revisionId
        : undefined,
    )
    assert.equal(
      next.document.brief,
      `${analysis.document.body}\n\nHipótese a testar:\n${analysis.document.hypothesis}\n\nCritério de avaliação:\n${analysis.document.evaluationCriterion}`,
    )
    const representation = snapshot.items.find(
      (item) => item.document.kind === 'representation' && item.document.pieceId === next.id,
    )
    assert(representation?.document.kind === 'representation')
    assert.equal(representation.document.format, 'story')
    assert.equal(representation.document.medium, 'video')
    await writeFile(path.join(directory, 'web-next-piece.png'), await captureProof(web))
    const result = {
      ...fixture,
      analysisId,
      analysisRevisionId: origin.revisionId,
      evidenceId: evidence.id,
      runId: run?.request.id,
      realProvider: 'codex',
      nativeRequest: true,
      webCreatedNextPiece: true,
      nextPieceId: next.id,
      format: 'story',
      medium: 'video',
      approvedBasisPreserved: true,
      missingMetricDistinctFromZero: true,
      syntheticMetrics: true,
      socialPublicationPerformed: false,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    if (process.argv.includes('--smoke-execution-cache')) {
      assert(run)
      const resources = await manager.resources(scope, fixture.projectId)
      const receiptBefore = resources.store.execution(run.request.id)
      const temporary = path.join(resources.runtimeDirectory, run.request.id)
      await stat(temporary)
      const exported = z
        .object({ assetId: z.string().uuid() })
        .parse(
          JSON.parse(
            await readFile(
              path.join(app.getAppPath(), '.cache/edition-export-proof/evidence.json'),
              'utf8',
            ),
          ),
        )
      await manager.download(scope, fixture.projectId, exported.assetId)
      await proveCacheCleanup(window, manager, scope, fixture.projectId, directory)
      await assert.rejects(stat(temporary), { code: 'ENOENT' })
      assert.deepEqual(resources.store.execution(run.request.id), receiptBefore)
      const retainedRun = runPageSchema
        .parse(await request(runsRoute))
        .items.find((item) => item.request.id === run.request.id)
      assert.deepEqual(retainedRun?.outcome, run.outcome)
      await writeFile(
        path.join(directory, 'execution-cache.json'),
        JSON.stringify(
          {
            runId: run.request.id,
            temporaryRemovedViaUi: true,
            receiptPreserved: true,
            remoteResultPreserved: true,
            r2DownloadAfterCleanup: true,
          },
          null,
          2,
        ),
      )
      console.log(
        'execution-cache: UI cleanup, original download, local receipt and remote outcome verified',
      )
    }
  } finally {
    web.destroy()
  }
}
