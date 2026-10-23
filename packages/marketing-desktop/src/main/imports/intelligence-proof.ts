import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  monitoringOverviewSchema,
  productionActivityReportSchema,
  projectAnalyticsSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { captureProof } from './capture-proof'
import { waitProof } from './wait-proof'
import { requestWorkspaceProof } from './workspace-proof'

/** Real native renderer, IPC allowlist, paired device session and local SQLite. */
export async function proveNativeIntelligence(
  window: BrowserWindow,
  manager: DesktopWorkspaceManager,
  scope: { origin: string; userId: string },
) {
  if (app.isPackaged || scope.origin !== 'http://127.0.0.1:15334')
    throw new Error('Prova restrita ao ambiente nativo de revisão')
  const directory = path.join(app.getAppPath(), '.cache/intelligence-proof')
  const fixture = z
    .object({ projectId: z.string().uuid(), referenceId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(directory, 'evidence.json'), 'utf8')))
  await manager.synchronize()
  const request = (route: string) =>
    requestWorkspaceProof(window, { scope, path: route, method: 'GET' })
  const report = projectAnalyticsSchema.parse(
    await request(`/projects/${fixture.projectId}/analytics?days=7`),
  )
  assert.equal(report.observations[0]?.evidenceId, fixture.referenceId)
  const production = productionActivityReportSchema.parse(
    await request(`/projects/${fixture.projectId}/production?days=28`),
  )
  assert.equal(production.projectId, fixture.projectId)
  assert.equal(
    monitoringOverviewSchema.parse(
      await request(`/projects/${fixture.projectId}/monitors/overview`),
    ).entries[0]?.evidenceId,
    fixture.referenceId,
  )
  await waitProof(
    window,
    `(()=>{const select=document.querySelector('select[aria-label="Projeto atual"]');if(!select||![...select.options].some(option=>option.value===${JSON.stringify(fixture.projectId)}))return false;if(select.value!==${JSON.stringify(fixture.projectId)}){select.value=${JSON.stringify(fixture.projectId)};select.dispatchEvent(new Event('change',{bubbles:true}));return false}return !![...document.querySelectorAll('button')].find(button=>button.textContent==='Resultados do projeto')})()`,
    'Projeto não abriu no desktop',
  )
  for (const [label, ready, file] of [
    [
      'Resultados do projeto',
      `!!document.querySelector('[role="dialog"] [aria-label="Referências públicas e dados importados"]')`,
      'native-analytics.png',
    ],
    [
      'Processo produtivo',
      `document.querySelector('[role="dialog"]')?.textContent.includes('Ainda não há pedidos de IA')`,
      'native-production.png',
    ],
    [
      'Novidades observadas',
      `document.querySelector('[role="dialog"]')?.textContent.includes('Pesquisa com cobertura explícita')`,
      'native-overview.png',
    ],
  ] as const) {
    await window.webContents.executeJavaScript(
      `[...document.querySelectorAll('button')].find(button=>button.textContent===${JSON.stringify(label)}).click()`,
    )
    await waitProof(window, ready, `${label} não abriu no desktop`)
    await writeFile(path.join(directory, file), await captureProof(window))
    await window.webContents.executeJavaScript(
      `document.querySelector('[role="dialog"] button[aria-label="Fechar"]').click()`,
    )
    await waitProof(window, `!document.querySelector('[role="dialog"]')`, 'Modal não fechou')
  }
  const evidence = {
    projectId: fixture.projectId,
    referenceId: fixture.referenceId,
    nativeRenderer: true,
    realIpc: true,
    pairedSession: true,
    localSqlite: true,
    analytics: true,
    production: true,
    monitoring: true,
  }
  await writeFile(path.join(directory, 'native-evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
}
