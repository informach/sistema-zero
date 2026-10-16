import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  monitoringOverviewSchema,
  operationResultSchema,
  projectAnalyticsSchema,
  projectSchema,
  snapshotSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { captureProof } from '../src/main/imports/capture-proof'
import { waitProof } from '../src/main/imports/wait-proof'
import { proofBrowser } from './proof-browser'

const directory = path.resolve('.cache/intelligence-proof')
app.setName('Marketing Intelligence Review')
app.setPath('userData', path.join(directory, 'profile'))
app.on('window-all-closed', () => {})
async function main() {
  let window: BrowserWindow | undefined
  try {
    await app.whenReady()
    await mkdir(directory, { recursive: true })
    const browser = await proofBrowser('intelligence')
    window = browser.window
    const p = projectSchema.parse(
      await browser.request('/api/marketing/workspace/projects', {
        schemaVersion: 1,
        operationId: randomUUID(),
        id: randomUUID(),
        name: 'Prova de observações importadas',
        product: 'Revisão isolada',
      }),
    )
    await window.loadURL(`${browser.origin}/bancada`)
    await waitProof(
      window,
      `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(p.id)}))return false;if(select.value!==${JSON.stringify(p.id)}){select.value=${JSON.stringify(p.id)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}const button=[...document.querySelectorAll('[aria-label="Áreas da bancada"] button')].find(button=>button.textContent==='Fontes e referências');if(button?.getAttribute('aria-pressed')!=='true'){button?.click();return false}return !![...document.querySelectorAll('button')].find(button=>button.textContent==='Importar CSV ou JSON')})()`,
      'Fontes não abriram',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Importar CSV ou JSON').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] input[type="file"]')`,
      'Importação não abriu',
    )
    const now = new Date(Date.now() - 1000).toISOString()
    const observation = {
      schemaVersion: 1,
      sourceType: 'imported',
      network: 'instagram',
      subject: 'Post de referência',
      periodStart: now,
      periodEnd: now,
      collectedAt: now,
      sampleSize: 1,
      coverage: 'Uma observação pública. Alcance não coletado.',
      dimensions: {
        objective: 'Convidar para praticar',
        audienceNeed: 'Começar',
        series: 'Primeiro jogo',
        format: 'feed',
      },
      metrics: [
        {
          key: 'likes',
          label: 'Curtidas',
          unit: 'count',
          measurement: {
            value: 0,
            availability: 'observed',
            denominator: null,
            definition: 'Contador público no momento da coleta',
          },
        },
        {
          key: 'views',
          label: 'Visualizações',
          unit: 'count',
          measurement: {
            value: null,
            availability: 'unavailable',
            denominator: null,
            definition: 'Não fornecido pela fonte',
          },
        },
      ],
    }
    const records = [
      {
        title: 'Pesquisa com cobertura explícita',
        label: 'Arquivo de pesquisa',
        url: 'https://example.com/referencia',
        body: 'Referência de revisão, não é resultado real de campanha.',
        observation,
      },
    ]
    await window.webContents.executeJavaScript(
      `(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(JSON.stringify(records))}],'observacoes.json',{type:'application/json'}));const input=document.querySelector('[role="dialog"] input[type="file"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await waitProof(
      window,
      `document.querySelector('[role="dialog"]')?.textContent.includes('1 referências prontas')`,
      'Arquivo não foi lido',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Importar para o projeto').click()`,
    )
    await waitProof(
      window,
      `!document.querySelector('[role="dialog"]')&&!![...document.querySelectorAll('aside button')].find(button=>button.textContent.includes('Pesquisa com cobertura explícita'))`,
      'Importação não foi confirmada',
    )
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('aside button')].find(button=>button.textContent.includes('Pesquisa com cobertura explícita')).click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[aria-label="Métricas observadas na fonte"]')`,
      'Métricas da referência não apareceram',
    )
    const snapshot = snapshotSchema.parse(
        await browser.request(`/api/marketing/workspace/projects/${p.id}/snapshot`),
      ),
      source = snapshot.items.find(
        (item) => item.document.kind === 'evidence' && item.document.observation,
      )
    assert.ok(source)
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Resultados do projeto').click()`,
    )
    await waitProof(
      window,
      `!!document.querySelector('[role="dialog"] [aria-label="Referências públicas e dados importados"]')`,
      'Resultados importados não apareceram',
    )
    const analytics = projectAnalyticsSchema.parse(
      await browser.request(`/api/marketing/workspace/projects/${p.id}/analytics?days=7`),
    )
    assert.equal(analytics.rows.length, 0)
    assert.equal(analytics.observations.length, 1)
    assert.deepEqual(
      analytics.observations[0]?.observation.metrics.map((metric) => metric.measurement.value),
      [0, null],
    )
    await window.webContents.executeJavaScript(
      `new Promise(resolve=>{document.querySelector('[aria-label="Referências públicas e dados importados"]').scrollIntoView();requestAnimationFrame(()=>requestAnimationFrame(resolve))})`,
    )
    await writeFile(path.join(directory, 'observations-analytics.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] button[aria-label="Fechar"]').click()`,
    )
    const watch = operationResultSchema.parse(
      await browser.request('/api/marketing/workspace/operations', {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: p.id,
        entityId: randomUUID(),
        baseRevisionId: null,
        action: 'save',
        document: {
          schemaVersion: 1,
          kind: 'watchlist',
          title: 'Acompanhamento da pesquisa',
          body: 'Conferir referências importadas.',
          objective: 'Aprender',
          subjectType: 'topic',
          url: null,
          source: { label: 'Equipe' },
          enabled: true,
          evidenceIds: [],
        },
      }),
    )
    if (watch.status !== 'applied') throw new Error('Fixture')
    const route = `/api/marketing/workspace/projects/${p.id}/monitors/${watch.item.id}`
    await browser.request(`${route}/configure`, {
      schemaVersion: 1,
      operationId: randomUUID(),
      expectedRevisionId: watch.revisionId,
      expectedVersion: 0,
      config: {
        mode: 'manual',
        feedUrl: null,
        intervalHours: 720,
        timeZone: 'America/Sao_Paulo',
        dailyCallBudget: 0,
        enabled: true,
      },
    })
    await browser.request(`${route}/observations`, {
      schemaVersion: 1,
      operationId: randomUUID(),
      expectedVersion: 1,
      evidenceId: source.id,
      expectedRevisionId: source.revisionId,
      sourceType: 'imported',
    })
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent==='Novidades observadas').click()`,
    )
    await waitProof(
      window,
      `document.querySelector('[role="dialog"]')?.textContent.includes('Pesquisa com cobertura explícita')`,
      'Painel de novidades não carregou',
    )
    const overview = monitoringOverviewSchema.parse(
      await browser.request(`/api/marketing/workspace/projects/${p.id}/monitors/overview`),
    )
    assert.equal(overview.entries.length, 1)
    assert.equal(overview.entries[0]?.sourceType, 'imported')
    await writeFile(path.join(directory, 'overview.png'), await captureProof(window))
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent==='Conferir fonte e preparar variação').click()`,
    )
    await waitProof(
      window,
      `!document.querySelector('[role="dialog"]')&&!!document.querySelector('[aria-label="Métricas observadas na fonte"]')`,
      'Novidade não abriu a fonte sincronizada',
    )
    const evidence = {
      projectId: p.id,
      referenceId: source.id,
      importedThroughUi: true,
      populatedAnalytics: true,
      observedZero: 0,
      unavailable: null,
      overviewOpensConfirmedSource: true,
      publicationsCreated: 0,
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
    window.destroy()
    window = undefined
    app.exit(0)
  } catch (error) {
    if (window) {
      await writeFile(path.join(directory, 'failure.png'), await captureProof(window))
      await writeFile(
        path.join(directory, 'failure.txt'),
        await window.webContents.executeJavaScript('document.body.innerText'),
      )
      window.destroy()
    }
    console.error(error instanceof Error ? error.message : 'Falha na prova de inteligência')
    app.exit(1)
  }
}
void main()
