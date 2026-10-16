import {
  batchOperationSchema,
  canonicalJson,
  type ProductionLinkApply,
  type ProductionLinkPreview,
  productionLinkSchema,
  productionReportSchema,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { structuredCopyVersion } from '@sistemazero/marketing-import'
import { and, desc, eq, inArray, like } from 'drizzle-orm'
import { payloadHash } from '../../../application/workspace/workspace.service'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { Database } from './db'
import { requireImportProduct } from './import-product'
import {
  DrizzleWorkspaceRepository,
  projectAccess,
  receipt,
  recordChange,
  type WorkspaceTransaction,
} from './workspace.repository'
import {
  editorialAssets as assets,
  editorialItems as items,
  editorialImportProductionLinks as links,
  editorialImportStructures as mappings,
  editorialReceipts as receipts,
  editorialImportProductionReports as reports,
  editorialRevisions as revisions,
  editorialImports as runs,
} from './workspace-schema'

const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)

/** A report is an immutable source snapshot; the preview compares it with the live editorial graph. */
export async function previewProductionLink(
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  reportId: string,
): Promise<ProductionLinkPreview> {
  await projectAccess(tx, actorId, projectId, 'read')
  const [row] = await tx
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.projectId, projectId)))
  if (!row)
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Conferência não disponível neste projeto')
  const [linked] = await tx.select().from(links).where(eq(links.reportId, reportId))
  if (linked) return { status: 'linked', link: productionLinkSchema.parse(linked.link) }
  const blocked = (...reasons: string[]): ProductionLinkPreview => ({
    status: 'blocked',
    reportId,
    reasons,
  })
  const report = productionReportSchema.parse(row.report)
  const [run] = await tx.select().from(runs).where(eq(runs.id, row.runId))
  if (run?.state !== 'inventoried')
    return blocked('O inventário foi desativado; preserve a conferência como histórico.')
  await requireImportProduct(tx, projectId, run.origin, report.review.folder.product)
  if (report.review.state !== 'ready-for-review')
    return blocked('Resolva as divergências da conferência antes de vincular as artes.')
  const source = report.sources.find((value) => value.path === report.review.copySourcePath)
  if (!source) return blocked('A fonte canônica não está preservada neste relatório.')
  const [mapping] = await tx
    .select()
    .from(mappings)
    .where(
      and(
        eq(mappings.projectId, projectId),
        eq(mappings.sourceVersionId, source.sourceVersionId),
        eq(mappings.sectionKey, report.review.folder.key),
        eq(mappings.parserVersion, structuredCopyVersion),
      ),
    )
    .orderBy(desc(mappings.sequence))
    .limit(1)
  if (!mapping)
    return blocked('Converta a copy desta origem em peça editável antes de vincular as artes.')
  const [latest] = await tx
    .select({ id: mappings.id })
    .from(mappings)
    .where(
      and(
        eq(mappings.projectId, projectId),
        eq(mappings.pieceId, mapping.pieceId),
        like(mappings.parserVersion, 'editorial-markdown-%'),
      ),
    )
    .orderBy(desc(mappings.sequence))
    .limit(1)
  if (latest?.id !== mapping.id)
    return blocked(
      'A peça já recebeu outra versão de copy; compare as versões antes de vincular esta produção.',
    )
  const current = await tx
    .select()
    .from(items)
    .where(
      and(
        eq(items.projectId, projectId),
        inArray(
          items.id,
          mapping.destinations.map((value) => value.entityId),
        ),
      ),
    )
  const baseline = await tx
    .select()
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        inArray(
          revisions.id,
          mapping.destinations.map((value) => value.revisionId),
        ),
      ),
    )
  const piece = current.find((value) => value.id === mapping.pieceId)
  if (
    !piece ||
    piece.archived ||
    piece.document.kind !== 'piece' ||
    piece.document.state === 'historical'
  )
    return blocked('A peça foi arquivada ou é histórica; o original permanece preservado.')
  const pieceDocument = piece.document
  const main = current.filter(
    (value) =>
      value.document.kind === 'representation' &&
      value.document.purpose === 'publication' &&
      value.document.pieceId === piece.id &&
      pieceDocument.representationIds.includes(value.id),
  )
  const representation = main[0]
  if (
    main.length !== 1 ||
    !representation ||
    representation.archived ||
    representation.document.kind !== 'representation'
  )
    return blocked('O formato de publicação está ausente ou ambíguo.')
  const baseRepresentation = baseline.find((value) => value.entityId === representation.id)
  if (
    !baseRepresentation ||
    canonicalJson(baseRepresentation.document) !== canonicalJson(representation.document)
  )
    return blocked(
      'O formato foi editado após a importação; a conferência não substitui essa edição.',
    )
  const components: Extract<ProductionLinkPreview, { status: 'ready' }>['components'] = []
  for (const id of representation.document.componentIds) {
    const component = current.find((value) => value.id === id)
    const base = baseline.find((value) => value.entityId === id)
    if (
      !component ||
      component.archived ||
      component.document.kind !== 'component' ||
      component.document.representationId !== representation.id ||
      !base ||
      canonicalJson(component.document) !== canonicalJson(base.document)
    )
      return blocked(
        'Um componente foi editado após a importação. Compare a copy e a arte sem substituir o trabalho da equipe.',
      )
    if (component.document.componentType === 'caption') continue
    if (component.document.assetIds.length || component.document.composition)
      return blocked('Um componente já possui arte; a importação não a substitui automaticamente.')
    const file = report.review.files[components.length]
    const original = report.sources.find((value) => value.path === file?.path)
    if (!file?.alt || !original?.assetId)
      return blocked('Ordem, original ou texto alternativo ausente.')
    const [asset] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.projectId, projectId),
          eq(assets.id, original.assetId),
          eq(assets.confirmed, true),
        ),
      )
    if (
      asset?.manifest.role !== 'original' ||
      asset.manifest.sha256 !== file.sha256 ||
      !asset.manifest.mime.startsWith('image/') ||
      !asset.manifest.width ||
      !asset.manifest.height
    )
      return blocked(
        'O original visual não está confirmado com hash e dimensões. Vídeos exigem montagem própria.',
      )
    components.push({
      componentId: id,
      revisionId: component.revisionId,
      originalAssetId: asset.id,
      sha256: file.sha256,
      position: file.position,
      path: file.path,
      alt: file.alt.short,
    })
  }
  if (!components.length || components.length !== report.review.files.length)
    return blocked('A quantidade de artes não coincide com os componentes visuais.')
  return {
    status: 'ready',
    reportId,
    pieceId: piece.id,
    representationId: representation.id,
    components,
    planHash: payloadHash({
      reportId,
      mappingId: mapping.id,
      revisions: current
        .map((value) => ({ id: value.id, revisionId: value.revisionId }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }),
  }
}

export async function applyProductionLink(
  db: Database,
  tx: WorkspaceTransaction,
  actorId: string,
  projectId: string,
  reportId: string,
  input: ProductionLinkApply,
) {
  await projectAccess(tx, actorId, projectId, 'edit')
  const hash = payloadHash({ action: 'link-import-production', reportId, input })
  const saved = await receipt(tx, projectId, actorId, input.operationId, hash)
  if (saved) return productionLinkSchema.parse(saved.result)
  const preview = await previewProductionLink(tx, actorId, projectId, reportId)
  if (preview.status === 'blocked') throw conflict(preview.reasons.join(' '))
  if (preview.status === 'linked') {
    if (
      preview.link.planHash !== input.planHash ||
      input.assets.length !== preview.link.components.length ||
      !preview.link.components.every((value) =>
        input.assets.some(
          (asset) => asset.componentId === value.componentId && asset.assetId === value.assetId,
        ),
      )
    )
      throw conflict('Esta conferência já foi vinculada com outra seleção de arquivos.')
    return preview.link
  }
  if (preview.planHash !== input.planHash)
    throw conflict('A peça mudou desde a prévia; confira novamente antes de vincular.')
  if (
    input.assets.length !== preview.components.length ||
    input.assets.some(
      (value) =>
        !preview.components.some((component) => component.componentId === value.componentId),
    )
  )
    throw conflict('A seleção deve conter exatamente os componentes visuais da conferência.')
  const changes = []
  const selected = []
  for (const component of preview.components) {
    const chosen = input.assets.find((value) => value.componentId === component.componentId)
    const [final] = chosen
      ? await tx
          .select()
          .from(assets)
          .where(
            and(
              eq(assets.id, chosen.assetId),
              eq(assets.projectId, projectId),
              eq(assets.confirmed, true),
            ),
          )
      : []
    const [original] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, component.originalAssetId),
          eq(assets.projectId, projectId),
          eq(assets.confirmed, true),
        ),
      )
    if (
      !final ||
      !original ||
      final.manifest.role !== 'final' ||
      final.manifest.sourceAssetId !== original.id ||
      final.manifest.sha256 !== original.manifest.sha256 ||
      final.manifest.size !== original.manifest.size ||
      final.manifest.mime !== original.manifest.mime ||
      final.manifest.width !== original.manifest.width ||
      final.manifest.height !== original.manifest.height
    )
      throw conflict('O arquivo final não corresponde ao original confirmado desta posição.')
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, component.componentId), eq(items.projectId, projectId)))
    if (item?.document.kind !== 'component') throw conflict('Componente indisponível')
    changes.push({
      entityId: item.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: { ...item.document, assetIds: [final.id], alt: component.alt },
    })
    selected.push({
      componentId: item.id,
      assetId: final.id,
      originalAssetId: original.id,
      sha256: final.manifest.sha256,
    })
  }
  const batch = batchOperationSchema.parse({
    schemaVersion: 1,
    projectId,
    operationId: await stableEditorialId(`${input.operationId}:production-link`),
    changes,
  })
  const applied = await new DrizzleWorkspaceRepository(db).applyBatchInTransaction(
    tx,
    actorId,
    batch,
    payloadHash(batch),
  )
  if (applied.status !== 'applied') throw conflict('A revisão mudou; nenhum vínculo foi aplicado.')
  const link = productionLinkSchema.parse({
    reportId,
    pieceId: preview.pieceId,
    representationId: preview.representationId,
    planHash: preview.planHash,
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    components: selected.map((value) => ({
      ...value,
      revisionId: applied.items.find((item) => item.id === value.componentId)?.revisionId,
    })),
  })
  await tx.insert(links).values({ reportId, projectId, link })
  await tx
    .insert(receipts)
    .values({ projectId, actorId, operationId: input.operationId, hash, result: link })
  await recordChange(tx, projectId, actorId, 'import', reportId, null)
  return link
}
