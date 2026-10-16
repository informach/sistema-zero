import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { ProductionReport } from '@sistemazero/marketing-contracts'
import { sharedProductionReports } from '../src/import-production-receipts'

test('shared receipts are read across pages and scoped to one immutable inventory', async () => {
  const projectId = randomUUID(),
    inventoryId = randomUUID()
  const report: ProductionReport = {
    id: randomUUID(),
    projectId,
    inventoryId,
    inventoryDigest: 'a'.repeat(64),
    createdBy: randomUUID(),
    createdAt: new Date().toISOString(),
    review: {
      parserVersion: 'editorial-production-v1',
      folder: {
        path: 'docs/marketing/kids/produto/instagram/producao/postagens/p01-primeiro',
        key: 'P01',
        product: 'produto',
      },
      copySourcePath: null,
      state: 'incomplete',
      files: [],
      matchingCopies: [],
      otherCopies: [],
      issues: [],
    },
    sources: [
      { path: 'copy.md', sourceVersionId: randomUUID(), sha256: 'b'.repeat(64), assetId: null },
    ],
  }
  const second: ProductionReport = {
    ...report,
    id: randomUUID(),
    review: {
      ...report.review,
      folder: {
        ...report.review.folder,
        key: 'P02',
        path: report.review.folder.path.replace('p01-primeiro', 'p02-segundo'),
      },
    },
  }
  const routes: string[] = []
  const rows = await sharedProductionReports(
    async (route) => {
      routes.push(route)
      return routes.length === 1
        ? { items: [report], nextCursor: report.id }
        : { items: [second], nextCursor: null }
    },
    projectId,
    inventoryId,
  )
  expect(rows).toEqual([report, second])
  expect(routes[1]).toEndWith(`?after=${report.id}`)
  for (const wrong of [
    { ...report, projectId: randomUUID() },
    { ...report, inventoryId: randomUUID() },
  ])
    await expect(
      sharedProductionReports(
        async () => ({ items: [wrong], nextCursor: null }),
        projectId,
        inventoryId,
      ),
    ).rejects.toThrow('outra carga')
  await expect(
    sharedProductionReports(
      async () => ({ items: [report], nextCursor: report.id }),
      projectId,
      inventoryId,
    ),
  ).rejects.toThrow('repetida')
  await expect(
    sharedProductionReports(
      async () => ({ items: [report, { ...report, id: randomUUID() }], nextCursor: null }),
      projectId,
      inventoryId,
    ),
  ).rejects.toThrow('repetida')
  let calls = 0
  await expect(
    sharedProductionReports(
      async () => {
        calls++
        return {}
      },
      projectId,
      inventoryId,
      () => true,
    ),
  ).rejects.toThrow('interrompida')
  expect(calls).toBe(0)
})
