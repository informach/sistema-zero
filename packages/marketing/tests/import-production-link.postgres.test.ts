import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import {
  type AssetManifest,
  type InventoryEntry,
  inventoryDigestInput,
} from '@sistemazero/marketing-contracts'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ImportService } from '../src/application/workspace/import.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleImportRepository } from '../src/infrastructure/persistence/drizzle/import.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { editorialAssets } from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('production links PostgreSQL', () => {
  let connection: DbConnection, imports: ImportService, workspace: WorkspaceService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Conferência',
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
  async function fixture() {
    const projectId = randomUUID(),
      runId = randomUUID()
    const base = 'docs/marketing/kids/produto/instagram',
      folder = `${base}/producao/postagens/p01-titulo`,
      sourcePath = `${base}/postagens/copy.md`
    const raw = new Map([
      [
        sourcePath,
        '## P01 · Título\n**Formato:** Carrossel, 2 slides.\n### Slide 1\n> Olá.\n### Slide 2\n> Segunda tela.\n### Legenda\n> Legenda.\n',
      ],
      [
        `${folder}/apoio/copy.json`,
        JSON.stringify({
          id: 'P01',
          slides: [['Olá.'], ['Segunda tela.']],
          caption: 'Legenda.',
          source: sourcePath,
        }),
      ],
      [`${folder}/legenda.txt`, 'Legenda.'],
      [
        `${folder}/texto-alternativo.txt`,
        'SLIDE 1\nCurto: Um.\nLongo: Primeira arte.\nSLIDE 2\nCurto: Dois.\nLongo: Segunda arte.',
      ],
      // These are repository fixtures; actual file decoding and R2 verification have separate proofs.
      [`${folder}/01-p01.png`, 'fixture-original-one'],
      [`${folder}/02-p01.png`, 'fixture-original-two'],
    ])
    const entries: InventoryEntry[] = [...raw]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([path, text]) => ({
        path,
        kind: 'file',
        product: 'produto',
        category: path.endsWith('.png')
          ? 'final-media'
          : path.endsWith('.json')
            ? 'production-source'
            : 'copy',
        disposition: 'eligible',
        validity: 'unverified',
        reason: 'Prova',
        sha256: createHash('sha256').update(text).digest('hex'),
        bytes: Buffer.byteLength(text),
      }))
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Produção',
      product: 'Produto',
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
    let sourceVersionId: string | undefined
    const originals: AssetManifest[] = []
    for (const [ordinal, entry] of entries.entries()) {
      const text = raw.get(entry.path)
      if (text === undefined) throw new Error('Fixture ausente')
      let assetId: string | undefined
      if (entry.path.endsWith('.png')) {
        assetId = randomUUID()
        const manifest: AssetManifest = {
          schemaVersion: 1,
          id: assetId,
          projectId,
          name: entry.path,
          role: 'original',
          sourceAssetId: null,
          sha256: entry.sha256 ?? '',
          size: entry.bytes ?? 0,
          mime: 'image/png',
          width: 1080,
          height: 1350,
          durationMs: null,
          codec: null,
          rotation: null,
        }
        originals.push(manifest)
        await connection.db.insert(editorialAssets).values({
          id: assetId,
          projectId,
          confirmed: true,
          createdBy: owner.userId,
          storageKey: `review/${projectId}/${assetId}`,
          manifest,
        })
      }
      const loaded = await imports.loadSource(owner, projectId, runId, {
        operationId: randomUUID(),
        ordinal,
        content: assetId
          ? { kind: 'asset', assetId }
          : { kind: 'text', base64: Buffer.from(text).toString('base64') },
      })
      if (entry.path === sourcePath) sourceVersionId = loaded.sourceVersionId
    }
    if (!sourceVersionId) throw new Error('Copy ausente')
    const report = await imports.shareProduction(owner, projectId, runId, {
      operationId: randomUUID(),
      folderPath: folder,
    })
    const structure = async () => {
      const preview = await imports.previewStructure(owner, projectId, sourceVersionId)
      await imports.applyStructure(owner, projectId, {
        operationId: randomUUID(),
        sourceVersionId,
        parserVersion: preview.parserVersion,
        key: 'P01',
        expectedMappingId: null,
      })
    }
    const finals = async () => {
      const result = []
      for (const original of originals) {
        const manifest: AssetManifest = {
          ...original,
          id: randomUUID(),
          role: 'final',
          sourceAssetId: original.id,
        }
        await connection.db.insert(editorialAssets).values({
          id: manifest.id,
          projectId,
          confirmed: true,
          createdBy: owner.userId,
          storageKey: `review/${projectId}/${manifest.id}`,
          manifest,
        })
        result.push(manifest)
      }
      return result
    }
    return { projectId, runId, report, structure, finals, originals, entries }
  }
  test('links ordered final files atomically, preserves source/copy/calendar, refuses wrong or unconfirmed media and replays without replacing later edits', async () => {
    const f = await fixture()
    expect((await imports.previewProductionLink(owner, f.projectId, f.report.id)).status).toBe(
      'blocked',
    )
    await f.structure()
    const preview = await imports.previewProductionLink(owner, f.projectId, f.report.id)
    if (preview.status !== 'ready') throw new Error(JSON.stringify(preview))
    expect(preview.components.map((value) => value.alt)).toEqual(['Um.', 'Dois.'])
    const files = await f.finals()
    const input = {
      operationId: randomUUID(),
      planHash: preview.planHash,
      assets: preview.components.map((component) => ({
        componentId: component.componentId,
        assetId: files.find((file) => file.sourceAssetId === component.originalAssetId)?.id,
      })),
    }
    await rejects(
      async () =>
        imports.applyProductionLink(owner, f.projectId, f.report.id, {
          ...input,
          assets: input.assets.map((value) => ({ ...value, assetId: f.originals[0]?.id })),
        }),
      /única/,
    )
    await rejects(
      imports.applyProductionLink(owner, f.projectId, f.report.id, {
        ...input,
        assets: preview.components.map((value) => ({
          componentId: value.componentId,
          assetId: value.originalAssetId,
        })),
      }),
      /original confirmado/,
    )
    const last = files[1]
    if (!last) throw new Error('Final ausente')
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: false })
      .where(eq(editorialAssets.id, last.id))
    await rejects(
      imports.applyProductionLink(owner, f.projectId, f.report.id, input),
      /original confirmado/,
    )
    const before = await workspace.snapshot(owner, f.projectId)
    expect(
      before.items
        .filter((item) => item.document.kind === 'component')
        .every((item) => item.document.kind === 'component' && !item.document.assetIds.length),
    ).toBe(true)
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: true })
      .where(eq(editorialAssets.id, last.id))
    const reader: Actor = { ...owner, userId: randomUUID() }
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read'],
    })
    expect((await imports.previewProductionLink(reader, f.projectId, f.report.id)).status).toBe(
      'ready',
    )
    await rejects(
      imports.applyProductionLink(reader, f.projectId, f.report.id, input),
      /disponível/,
    )
    await rejects(
      imports.previewProductionLink({ ...reader, userId: randomUUID() }, f.projectId, f.report.id),
      /disponível/,
    )
    const [linked, replay] = await Promise.all([
      imports.applyProductionLink(owner, f.projectId, f.report.id, input),
      imports.applyProductionLink(owner, f.projectId, f.report.id, input),
    ])
    expect(replay).toEqual(linked)
    expect(linked.components.map((value) => value.originalAssetId)).toEqual(
      preview.components.map((value) => value.originalAssetId),
    )
    const after = await workspace.snapshot(owner, f.projectId)
    for (const item of after.items) {
      const previous = before.items.find((value) => value.id === item.id)
      if (!previous) throw new Error('O vínculo criou um objeto editorial inesperado')
      if (item.document.kind === 'component' && item.document.componentType !== 'caption') {
        expect(item.document).toMatchObject({
          ...previous?.document,
          assetIds: [linked.components.find((value) => value.componentId === item.id)?.assetId],
          alt: preview.components.find((value) => value.componentId === item.id)?.alt,
        })
      } else expect(item).toEqual(previous)
    }
    expect(after.items.find((item) => item.id === linked.pieceId)?.document).toMatchObject({
      state: 'incomplete',
    })
    const component = after.items.find((item) => item.id === linked.components[0]?.componentId)
    if (component?.document.kind !== 'component') throw new Error('Componente ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: component.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: { ...component.document, assetIds: [], body: 'Edição posterior da equipe.' },
    })
    expect(await imports.applyProductionLink(owner, f.projectId, f.report.id, input)).toEqual(
      linked,
    )
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find((item) => item.id === component.id)
        ?.document,
    ).toMatchObject({ assetIds: [], body: 'Edição posterior da equipe.' })
    expect((await imports.previewProductionLink(owner, f.projectId, f.report.id)).status).toBe(
      'linked',
    )
  })
  test('a changed inventory reuses unchanged production receipts without rewriting current editorial revisions', async () => {
    const f = await fixture()
    await f.structure()
    const plan = await imports.previewProductionLink(owner, f.projectId, f.report.id)
    if (plan.status !== 'ready') throw new Error('Vínculo indisponível')
    const files = await f.finals()
    const linked = await imports.applyProductionLink(owner, f.projectId, f.report.id, {
      operationId: randomUUID(),
      planHash: plan.planHash,
      assets: plan.components.map((component) => ({
        componentId: component.componentId,
        assetId: files.find((file) => file.sourceAssetId === component.originalAssetId)?.id,
      })),
    })
    const before = await workspace.snapshot(owner, f.projectId)
    const caption = before.items.find(
      (item) => item.document.kind === 'component' && item.document.componentType === 'caption',
    )
    if (caption?.document.kind !== 'component') throw new Error('Legenda ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: caption.id,
      baseRevisionId: caption.revisionId,
      action: 'save',
      document: { ...caption.document, body: 'Texto posterior da equipe.' },
    })
    const edited = await workspace.snapshot(owner, f.projectId)
    async function seal(values: InventoryEntry[]) {
      const input = {
        id: randomUUID(),
        origin: 'sistema-zero' as const,
        policyVersion: 'marketing-acervo-v2' as const,
        capturedAt: new Date().toISOString(),
        entryCount: values.length,
        digest: createHash('sha256')
          .update(
            inventoryDigestInput({
              origin: 'sistema-zero',
              policyVersion: 'marketing-acervo-v2',
              entries: values,
            }),
          )
          .digest('hex'),
      }
      await imports.start(owner, f.projectId, input)
      await imports.chunk(owner, f.projectId, input.id, { offset: 0, entries: values })
      await imports.finish(owner, f.projectId, input.id)
      return input
    }
    const sample = f.entries[0]
    if (!sample) throw new Error('Origem ausente')
    const values = [...f.entries, { ...sample, path: 'output/instagram/nova-copy.md' }]
    const next = await seal(values)
    const command = {
      operationId: randomUUID(),
      previousId: f.runId,
      previousDigest: f.report.inventoryDigest,
      currentDigest: next.digest,
    }
    expect(await imports.reconcile(owner, f.projectId, next.id, command)).toMatchObject({
      sources: 6,
      reports: 1,
      links: 1,
      reportsPending: 0,
    })
    expect((await workspace.snapshot(owner, f.projectId)).items).toEqual(edited.items)
    const [report] = (await imports.productionReports(owner, f.projectId, next.id, undefined)).items
    if (!report) throw new Error('Conferência não reconciliada')
    expect(report.inheritedFrom).toEqual({ inventoryId: f.runId, reportId: f.report.id })
    expect(await imports.previewProductionLink(owner, f.projectId, report.id)).toEqual({
      status: 'linked',
      link: { ...linked, reportId: report.id, inheritedFrom: f.report.id },
    })
    const changed = await seal(
      f.entries.map((entry) =>
        entry.path.endsWith('01-p01.png') ? { ...entry, sha256: 'c'.repeat(64) } : entry,
      ),
    )
    expect(
      await imports.reconcile(owner, f.projectId, changed.id, {
        ...command,
        operationId: randomUUID(),
        currentDigest: changed.digest,
      }),
    ).toMatchObject({ sources: 5, reports: 0, links: 0, reportsPending: 1 })
    expect(
      (await imports.productionReports(owner, f.projectId, changed.id, undefined)).items,
    ).toEqual([])
    const alternate = await seal(
      [
        ...f.entries,
        { ...sample, path: `${f.report.review.folder.path}/nova-alternativa.png` },
      ].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    )
    expect(
      await imports.reconcile(owner, f.projectId, alternate.id, {
        ...command,
        operationId: randomUUID(),
        currentDigest: alternate.digest,
      }),
    ).toMatchObject({ reports: 0, links: 0, reportsPending: 1 })
  })
  test('human copy edits, stale previews, archived inventory and foreign reports cannot be linked', async () => {
    const f = await fixture()
    await f.structure()
    const preview = await imports.previewProductionLink(owner, f.projectId, f.report.id)
    if (preview.status !== 'ready') throw new Error(JSON.stringify(preview))
    const files = await f.finals(),
      input = {
        operationId: randomUUID(),
        planHash: preview.planHash,
        assets: preview.components.map((component) => ({
          componentId: component.componentId,
          assetId: files.find((file) => file.sourceAssetId === component.originalAssetId)?.id,
        })),
      }
    const snapshot = await workspace.snapshot(owner, f.projectId)
    const piece = snapshot.items.find((item) => item.id === preview.pieceId)
    if (piece?.document.kind !== 'piece') throw new Error('Peça ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: piece.id,
      baseRevisionId: piece.revisionId,
      action: 'save',
      document: { ...piece.document, week: 12 },
    })
    await rejects(
      imports.applyProductionLink(owner, f.projectId, f.report.id, input),
      /mudou desde/,
    )
    const updated = await imports.previewProductionLink(owner, f.projectId, f.report.id)
    expect(updated.status).toBe('ready')
    const caption = snapshot.items.find(
      (item) => item.document.kind === 'component' && item.document.componentType === 'caption',
    )
    if (caption?.document.kind !== 'component') throw new Error('Legenda ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: caption.id,
      baseRevisionId: caption.revisionId,
      action: 'save',
      document: { ...caption.document, body: 'Legenda humana.' },
    })
    expect((await imports.previewProductionLink(owner, f.projectId, f.report.id)).status).toBe(
      'blocked',
    )
    await rejects(imports.applyProductionLink(owner, f.projectId, f.report.id, input), /editado/)
    const other = await fixture()
    await rejects(imports.previewProductionLink(owner, other.projectId, f.report.id), /disponível/)
    await other.structure()
    await imports.retire(owner, other.projectId, other.runId)
    expect(
      await imports.previewProductionLink(owner, other.projectId, other.report.id),
    ).toMatchObject({
      status: 'blocked',
      reasons: ['O inventário foi desativado; preserve a conferência como histórico.'],
    })
  })
})
