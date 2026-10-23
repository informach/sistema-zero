import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { type InventoryEntry, inventoryDigestInput } from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ImportService } from '../src/application/workspace/import.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleImportRepository } from '../src/infrastructure/persistence/drizzle/import.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import {
  editorialAssets,
  editorialImportSourceTexts,
} from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('production provenance PostgreSQL', () => {
  let connection: DbConnection, imports: ImportService, workspace: WorkspaceService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Revisão',
    role: 'staff',
    status: 'active',
  }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    imports = new ImportService(new DrizzleImportRepository(connection.db))
    workspace = new WorkspaceService(
      new DrizzleWorkspaceRepository(connection.db),
      fixtureDirectory,
    )
  })
  afterAll(async () => connection?.close())
  test('fixed-post reports retain canonical copy and publication instructions, remain incomplete and cannot link by count', async () => {
    const projectId = randomUUID(),
      runId = randomUUID(),
      base = 'docs/marketing/kids/produto/instagram',
      folder = `${base}/producao/fixados/01-primeiro`
    const sources = new Map([
      [
        `${base}/02-fixados.md`,
        '## F01 · Primeiro\n**Formato:** Carrossel, 1 slide.\n### Slide 1\n> Texto original.\n### Legenda\n> Legenda.',
      ],
      [`${folder}/legenda.txt`, 'Legenda.'],
      [
        `${folder}/publicacao.txt`,
        'Produção provisória: substituir por gravação antes de publicar.',
      ],
    ])
    const entries: InventoryEntry[] = [...sources]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([path, text]) => ({
        path,
        kind: 'file',
        product: 'produto',
        category: 'copy',
        disposition: 'eligible',
        validity: 'unverified',
        reason: 'Fonte da revisão',
        bytes: Buffer.byteLength(text),
        sha256: createHash('sha256').update(text).digest('hex'),
      }))
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Fixados',
      product: 'produto',
    })
    await imports.bindProduct(owner, projectId, {
      operationId: randomUUID(),
      origin: 'sistema-zero',
      product: 'produto',
      includeShared: false,
      expectedRevisionId: null,
    })
    await imports.start(owner, projectId, {
      id: runId,
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v2',
      capturedAt: new Date().toISOString(),
      entryCount: entries.length,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            policyVersion: 'marketing-acervo-v2',
            entries,
          }),
        )
        .digest('hex'),
    })
    await imports.chunk(owner, projectId, runId, { offset: 0, entries })
    await imports.finish(owner, projectId, runId)
    for (const [ordinal, entry] of entries.entries())
      await imports.loadSource(owner, projectId, runId, {
        operationId: randomUUID(),
        ordinal,
        content: {
          kind: 'text',
          base64: Buffer.from(sources.get(entry.path) ?? '').toString('base64'),
        },
      })
    const input = { operationId: randomUUID(), folderPath: folder }
    const collaborator: Actor = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: collaborator.userId,
      permissions: ['read', 'edit'],
    })
    const [report, colleagueReport] = await Promise.all([
      imports.shareProduction(owner, projectId, runId, input),
      imports.shareProduction(collaborator, projectId, runId, input),
    ])
    expect(colleagueReport).toEqual(report)
    expect(await imports.shareProduction(collaborator, projectId, runId, input)).toEqual(report)
    expect(report.review).toMatchObject({
      parserVersion: 'editorial-production-v2',
      state: 'incomplete',
      copySourcePath: `${base}/02-fixados.md`,
      folder: { key: 'F01' },
    })
    expect(report.sources.map((source) => source.path)).toEqual(entries.map((entry) => entry.path))
    expect(report.review.issues.some((issue) => issue.path === `${folder}/publicacao.txt`)).toBe(
      true,
    )
    expect(await imports.shareProduction(owner, projectId, runId, input)).toEqual(report)
    expect((await imports.previewProductionLink(owner, projectId, report.id)).status).toBe(
      'blocked',
    )
    expect((await imports.productionReports(owner, projectId, runId, undefined)).items).toEqual([
      report,
    ])
  })
  test('report is recomputed from preserved sources, retains original attachments and cannot assert unconfirmed media or overwrite current copy', async () => {
    const projectId = randomUUID(),
      runId = randomUUID(),
      product = 'produto',
      base = `docs/marketing/kids/${product}/instagram`
    const folder = `${base}/producao/postagens/p01-primeira`,
      canonical = `${base}/postagens/copy.md`
    const raw = new Map([
      [
        canonical,
        '## P01 · Primeira\n**Formato:** Imagem única.\n### Arte\n> Texto público.\n### Legenda\n> Legenda da origem.',
      ],
      [
        `${folder}/apoio/copy.json`,
        JSON.stringify({
          id: 'P01',
          art: ['Texto público.'],
          caption: 'Legenda da origem.',
          source: canonical,
        }),
      ],
      [`${folder}/legenda.txt`, 'Legenda da origem.'],
      [
        `${folder}/texto-alternativo.txt`,
        'IMAGEM ÚNICA\nCurto: Arte com texto.\nLongo: Imagem da primeira postagem.',
      ],
      // Repository evidence only: the real upload verifier is exercised separately against R2.
      [`${folder}/01-p01.png`, 'original-confirmed-by-fixture'],
    ])
    const entries: InventoryEntry[] = [...raw]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([path, text]) => ({
        path,
        kind: 'file',
        product,
        category: path.endsWith('.png')
          ? 'final-media'
          : path.endsWith('.json')
            ? 'production-source'
            : 'copy',
        disposition: 'eligible',
        validity: 'unverified',
        reason: 'Origem da prova',
        bytes: Buffer.byteLength(text),
        sha256: createHash('sha256').update(text).digest('hex'),
      }))
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Produção',
      product,
    })
    await imports.bindProduct(owner, projectId, {
      operationId: randomUUID(),
      origin: 'sistema-zero',
      product,
      includeShared: false,
      expectedRevisionId: null,
    })
    await imports.start(owner, projectId, {
      id: runId,
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v2',
      capturedAt: new Date().toISOString(),
      entryCount: entries.length,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            policyVersion: 'marketing-acervo-v2',
            entries,
          }),
        )
        .digest('hex'),
    })
    await imports.chunk(owner, projectId, runId, { offset: 0, entries })
    await imports.finish(owner, projectId, runId)
    const input = { operationId: randomUUID(), folderPath: folder }
    await rejects(imports.shareProduction(owner, projectId, runId, input), /ainda não carregada/)
    const originalIds = new Map<string, string>()
    const loadedSources = new Map<string, Awaited<ReturnType<ImportService['loadSource']>>>()
    for (const [ordinal, entry] of entries.entries()) {
      const original = raw.get(entry.path)
      if (original === undefined) throw new Error('Origem ausente')
      const asset = entry.path.endsWith('.png') || entry.path.endsWith('.json')
      const assetId = randomUUID()
      if (asset) {
        originalIds.set(entry.path, assetId)
        await connection.db.insert(editorialAssets).values({
          id: assetId,
          projectId,
          confirmed: true,
          createdBy: owner.userId,
          storageKey: `review/${projectId}/${assetId}`,
          manifest: {
            schemaVersion: 1,
            id: assetId,
            projectId,
            name: entry.path.split('/').at(-1) ?? 'origem',
            mime: entry.path.endsWith('.png') ? 'image/png' : 'application/json',
            role: 'original',
            sourceAssetId: null,
            sha256: entry.sha256 ?? '',
            size: entry.bytes ?? 0,
            width: 1080,
            height: 1350,
            durationMs: null,
            codec: null,
            rotation: null,
          },
        })
      }
      loadedSources.set(
        entry.path,
        await imports.loadSource(owner, projectId, runId, {
          operationId: randomUUID(),
          ordinal,
          content: asset
            ? { kind: 'asset', assetId }
            : { kind: 'text', base64: Buffer.from(original).toString('base64') },
        }),
      )
    }
    await rejects(imports.shareProduction(owner, projectId, runId, input), /fonte textual/)
    const jsonPath = `${folder}/apoio/copy.json`,
      originalJson = raw.get(jsonPath),
      jsonSource = loadedSources.get(jsonPath)
    if (!originalJson || !jsonSource) throw new Error('Fonte JSON ausente')
    const extracted = await imports.loadSource(owner, projectId, runId, {
      operationId: randomUUID(),
      ordinal: entries.findIndex((entry) => entry.path === jsonPath),
      content: { kind: 'text', base64: Buffer.from(originalJson).toString('base64') },
    })
    expect(extracted.sourceVersionId).toBe(jsonSource.sourceVersionId)
    expect(extracted.destinations).toEqual(jsonSource.destinations)
    const canonicalSource = loadedSources.get(canonical)
    const current = (await workspace.snapshot(owner, projectId)).items.find(
      (item) => item.id === canonicalSource?.destinations[0]?.entityId,
    )
    if (!current) throw new Error('Copy não carregada')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: current.id,
      baseRevisionId: current.revisionId,
      action: 'save',
      document: { ...current.document, body: 'Edição humana posterior.' },
    })
    const pngId = originalIds.get(`${folder}/01-p01.png`)
    if (!pngId) throw new Error('Original ausente')
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: false })
      .where(eq(editorialAssets.id, pngId))
    await rejects(imports.shareProduction(owner, projectId, runId, input), /não confirmado/)
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: true })
      .where(eq(editorialAssets.id, pngId))
    await rejects(
      async () =>
        imports.shareProduction(owner, projectId, runId, {
          ...input,
          review: { state: 'ready-for-review' },
        }),
      /Unrecognized|chave|key/i,
    )
    const [report, repeated] = await Promise.all([
      imports.shareProduction(owner, projectId, runId, input),
      imports.shareProduction(owner, projectId, runId, input),
    ])
    expect(repeated).toEqual(report)
    expect(report.review.state).toBe('ready-for-review')
    expect(report.review.files[0]?.alt?.short).toBe('Arte com texto.')
    expect(report.sources.find((source) => source.path.endsWith('.png'))?.assetId).toBe(pngId)
    expect(report.review.matchingCopies).toEqual([jsonPath])
    expect((await imports.productionReports(owner, projectId, runId, undefined)).items).toEqual([
      report,
    ])
    const snapshot = await workspace.snapshot(owner, projectId)
    expect(snapshot.items.find((item) => item.id === current.id)?.document).toMatchObject({
      body: 'Edição humana posterior.',
    })
    expect(snapshot.items.every((item) => item.kind === 'evidence')).toBe(true)
    expect(
      snapshot.items.find((item) => item.id === jsonSource.destinations[0]?.entityId)?.document,
    ).toMatchObject({ assetIds: [originalIds.get(jsonPath)] })
    const reader: Actor = { ...owner, userId: randomUUID() }
    await rejects(imports.productionReports(reader, projectId, runId, undefined), /disponível/)
    await workspace.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read'],
    })
    expect((await imports.productionReports(reader, projectId, runId, undefined)).items).toEqual([
      report,
    ])
    await rejects(
      imports.shareProduction(reader, projectId, runId, { ...input, operationId: randomUUID() }),
      /disponível/,
    )
    await connection.db
      .update(editorialImportSourceTexts)
      .set({ text: 'Bytes adulterados' })
      .where(eq(editorialImportSourceTexts.sourceVersionId, extracted.sourceVersionId))
    await rejects(
      imports.shareProduction(owner, projectId, runId, { ...input, operationId: randomUUID() }),
      /hash da origem/,
    )
    expect((await imports.productionReports(owner, projectId, runId, undefined)).items).toEqual([
      report,
    ])
  })
})
