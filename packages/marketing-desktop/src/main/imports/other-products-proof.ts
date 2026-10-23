import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  importBatchResultSchema,
  importCategorySchema,
  importDeltaSchema,
  importPageSchema,
  importProductBindingSchema,
  importReconcileResultSchema,
  importReleasePreviewSchema,
  importReleaseSchema,
  importRunSchema,
  projectSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import { z } from 'zod'
import type { WorkspaceRequest } from '../../shared/connection'
import { rateLimitedTransport } from '../sync/rate-limit'
import type { DesktopWorkspaceManager } from '../sync/workspace-manager'
import { InventoryStore } from './inventory-store'

/** Loads each explicitly named product into its own review project. Reuses the
 * desktop's real inventory, original-file, transfer and receipt implementations. */
export async function proveOtherProducts(
  manager: DesktopWorkspaceManager,
  scope: WorkspaceRequest['scope'],
) {
  if (app.isPackaged) throw new Error('Carga de revisão restrita ao desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/native-connected-proof')
  const fixture = z
    .object({ userId: z.string().uuid() })
    .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
  if (fixture.userId !== scope.userId) throw new Error('Identidade da revisão mudou')
  const signal = new AbortController().signal
  const tasks: Array<{
    product: string
    name: string
    label: string
    origins: Array<'sistema-zero' | 'fluxo-criativo'>
  }> = [
    {
      product: 'cade-todo-mundo',
      name: 'Cadê Todo Mundo? · acervo em preparação',
      label: 'Cadê Todo Mundo?',
      origins: ['sistema-zero'],
    },
    {
      product: 'desafio-primeiro-jogo',
      name: 'Desafio Primeiro Jogo · acervo em preparação',
      label: 'Desafio Primeiro Jogo',
      origins: ['sistema-zero', 'fluxo-criativo'],
    },
    {
      product: 'programando-com-diversao',
      name: 'Programando com Diversão · referências históricas',
      label: 'Programando com Diversão',
      origins: ['fluxo-criativo'],
    },
    {
      product: 'comunidade-dos-criadores',
      name: 'Comunidade dos Criadores · acervo em preparação',
      label: 'Comunidade dos Criadores',
      origins: ['fluxo-criativo'],
    },
    {
      product: 'shared',
      name: 'Referências compartilhadas · acervo em preparação',
      label: 'Referências compartilhadas',
      origins: ['sistema-zero', 'fluxo-criativo'],
    },
  ]
  const evidence: Array<{
    projectId: string
    inventoryId: string
    product: string
    origin: string
    result: z.infer<typeof importBatchResultSchema>
  }> = []
  const baseId = await stableEditorialId(`${scope.userId}:native-import:comunidade-dos-criadores`)
  const base = await manager.resources(scope, baseId)
  const central = rateLimitedTransport(base.transport, signal)
  for (const task of tasks) {
    const projectId = await stableEditorialId(`${scope.userId}:native-import:${task.product}`)
    const project = projectSchema.parse(
      await central.request('/projects', 'POST', {
        schemaVersion: 1,
        id: projectId,
        operationId: await stableEditorialId(`${projectId}:create`),
        name: task.name,
        product: task.label,
      }),
    )
    if (project.id !== projectId) throw new Error('O servidor retornou outro projeto')
    await manager.synchronize()
    const resources = await manager.resources(scope, projectId)
    const transport = rateLimitedTransport(resources.transport, signal)
    const store = new InventoryStore(path.join(resources.directory, 'imports'))
    for (const origin of task.origins) {
      let prepared = (await store.list()).items
        .filter((value) => value.origin === origin)
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0]
      if (!prepared)
        prepared = await store.prepare(
          origin === 'sistema-zero'
            ? 'C:/Users/tocha/projects/sistema-zero'
            : 'C:/Users/tocha/Documents/fluxo-criativo',
          origin,
          signal,
          () => {},
        )
      if (!prepared.products.includes(task.product))
        throw new Error('Produto não encontrado na origem selecionada')
      const run = importRunSchema.parse(
        await store.synchronize(prepared.id, projectId, transport, signal, () => {}),
      )
      const bindings = z
        .array(importProductBindingSchema)
        .parse(await transport.request(`/projects/${projectId}/import-products`))
      const current = bindings.find((binding) => binding.origin === origin)
      if (current && (current.product !== task.product || current.includeShared))
        throw new Error('O projeto tem outro vínculo; não alterar a decisão da equipe')
      if (!current)
        await transport.request(`/projects/${projectId}/import-products`, 'PUT', {
          operationId: await stableEditorialId(`${projectId}:${origin}:bind`),
          origin,
          product: task.product,
          includeShared: false,
          expectedRevisionId: null,
        })
      // This file is only the previous tool's active-product pointer. Preserve its
      // path/hash and an explicit disposition, without adopting its product state.
      if (task.product === 'shared' && origin === 'fluxo-criativo') {
        let cursor: number | null = 0
        while (cursor !== null) {
          const page = importPageSchema.parse(
            await transport.request(`/projects/${projectId}/imports/${run.id}?cursor=${cursor}`),
          )
          const marker = page.entries.find((entry) => entry.source.path === 'meus-produtos/.ativo')
          if (marker && !marker.result && !marker.decision)
            await transport.request(`/projects/${projectId}/imports/${run.id}/decisions`, 'PUT', {
              operationId: await stableEditorialId(`${projectId}:${run.id}:active-marker`),
              ordinal: marker.ordinal,
              expectedRevisionId: null,
              state: 'omitted',
              reason:
                'Marcador de produto ativo da ferramenta anterior; não é conteúdo editorial. Identidade e hash ficam no inventário, sem ativar produtos por inferência.',
            })
          if (marker) break
          cursor = page.nextCursor
        }
      }
      console.log(
        JSON.stringify({ otherProductStarted: task.product, origin, inventoryId: run.id }),
      )
      let lastProgress = 0
      const result = importBatchResultSchema.parse(
        await store.loadSelection(
          run.id,
          projectId,
          {
            product: task.product,
            categories: importCategorySchema.options.filter((category) => category !== 'technical'),
            includeReview: true,
          },
          transport,
          signal,
          async (file, expected) => {
            const asset = await manager.importMedia(scope, projectId, file, { expected, signal })
            return manager.upload(scope, projectId, asset.id, () => {}, signal)
          },
          (value) => {
            const completed = value.loaded + value.reused + value.skipped
            if (completed >= lastProgress + 25) {
              lastProgress = completed
              console.log(JSON.stringify({ otherProductProgress: task.product, origin, ...value }))
            }
          },
        ),
      )
      evidence.push({ projectId, inventoryId: run.id, product: task.product, origin, result })
      await writeFile(
        path.join(directory, 'other-products-evidence.json'),
        JSON.stringify({ evidence, activated: false, published: false }, null, 2),
      )
      console.log(JSON.stringify({ otherProductPreservation: evidence.at(-1) }))
    }
  }
  await manager.synchronize()
}

/** Reconciles the already-preserved review projects against a fresh disk scan.
 * Releasing an imported reference collection never activates a commercial product. */
export async function proveOtherReleases(
  manager: DesktopWorkspaceManager,
  scope: WorkspaceRequest['scope'],
) {
  if (app.isPackaged) throw new Error('Liberação de revisão restrita ao desenvolvimento')
  const directory = path.join(app.getAppPath(), '.cache/native-connected-proof')
  const prior = z
    .object({
      evidence: z
        .array(
          z.object({
            projectId: z.string().uuid(),
            inventoryId: z.string().uuid(),
            product: z.string(),
            origin: z.enum(['sistema-zero', 'fluxo-criativo']),
            result: importBatchResultSchema,
          }),
        )
        .length(7),
    })
    .parse(JSON.parse(await readFile(path.join(directory, 'other-products-evidence.json'), 'utf8')))
  const releases = []
  const signal = new AbortController().signal
  for (const entry of prior.evidence) {
    if (
      entry.projectId !==
      (await stableEditorialId(`${scope.userId}:native-import:${entry.product}`))
    )
      throw new Error('Projeto fora da conta de revisão')
    const resources = await manager.resources(scope, entry.projectId)
    const transport = rateLimitedTransport(resources.transport, signal)
    const store = new InventoryStore(path.join(resources.directory, 'imports'))
    console.log(JSON.stringify({ otherReleaseStarted: entry.product, origin: entry.origin }))
    const prepared = await store.rescan(entry.inventoryId, signal, () => {})
    if (prepared.origin !== entry.origin) throw new Error('Origem divergente da carga preservada')
    const current = await store.synchronize(
      prepared.id,
      entry.projectId,
      transport,
      signal,
      () => {},
    )
    const delta = importDeltaSchema.parse(
      await transport.request(
        `/projects/${entry.projectId}/imports/${current.id}/compare?previousId=${entry.inventoryId}`,
      ),
    )
    let releaseInventoryId = entry.inventoryId
    let expected = entry.result
    if (delta.summary.some((row) => row.state !== 'unchanged' && row.count > 0)) {
      const reconciled = importReconcileResultSchema.parse(
        await transport.request(
          `/projects/${entry.projectId}/imports/${current.id}/reconcile`,
          'POST',
          {
            operationId: await stableEditorialId(
              `${entry.projectId}:${current.id}:reconcile:${entry.inventoryId}`,
            ),
            previousId: entry.inventoryId,
            previousDigest: delta.previous.digest,
            currentDigest: current.digest,
          },
        ),
      )
      expected = await store.loadSelection(
        current.id,
        entry.projectId,
        {
          product: entry.product,
          categories: importCategorySchema.options.filter((category) => category !== 'technical'),
          includeReview: true,
        },
        transport,
        signal,
        async (file, expectedSource) => {
          const asset = await manager.importMedia(scope, entry.projectId, file, {
            expected: expectedSource,
            signal,
          })
          return manager.upload(scope, entry.projectId, asset.id, () => {}, signal)
        },
        () => {},
      )
      const verification = await store.rescan(current.id, signal, () => {})
      await store.synchronize(verification.id, entry.projectId, transport, signal, () => {})
      releaseInventoryId = current.id
      console.log(
        JSON.stringify({
          otherReleaseReconciled: entry.product,
          origin: entry.origin,
          reconciled,
          result: expected,
        }),
      )
    }
    const endpoint = `/projects/${entry.projectId}/imports/${releaseInventoryId}/release`
    const plan = importReleasePreviewSchema.parse(await transport.request(endpoint))
    if (
      plan.blockers.length ||
      plan.summary.pending ||
      expected.verifying ||
      plan.summary.preserved !== expected.loaded + expected.reused ||
      plan.summary.omitted !== expected.skipped
    )
      throw new Error(
        `A carga ${entry.product} tem disposição incompleta: ${JSON.stringify({ summary: plan.summary, blockers: plan.blockers })}`,
      )
    const released = importReleaseSchema.parse(
      await transport.request(endpoint, 'POST', {
        operationId: await stableEditorialId(
          `${entry.projectId}:${entry.inventoryId}:release:${plan.planHash}`,
        ),
        expectedPlanHash: plan.planHash,
      }),
    )
    const verified = importReleasePreviewSchema.parse(await transport.request(endpoint))
    if (
      verified.state !== 'current' ||
      verified.latest?.id !== released.id ||
      verified.blockers.length
    )
      throw new Error('A continuidade da carga não foi confirmada')
    releases.push({
      product: entry.product,
      origin: entry.origin,
      delta: delta.summary,
      release: released,
    })
    await writeFile(
      path.join(directory, 'other-products-released-evidence.json'),
      JSON.stringify(
        { releases, environment: 'native-review', published: false, approved: false },
        null,
        2,
      ),
    )
    console.log(
      JSON.stringify({
        otherReleaseConfirmed: entry.product,
        origin: entry.origin,
        summary: released.summary,
      }),
    )
  }
  await manager.synchronize()
}
