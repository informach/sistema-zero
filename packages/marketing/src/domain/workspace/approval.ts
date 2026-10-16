import {
  type AssetManifest,
  demonstrationSources,
  type EditionSnapshot,
  editionSnapshotSchema,
  type Revision,
} from '@sistemazero/marketing-contracts'
import { WorkspaceError } from './workspace-error'

/** Only final files already attached to these immutable component revisions can be approved. */
export function editionSnapshot(
  projectId: string,
  representationId: string,
  revisions: Revision[],
  assets: AssetManifest[],
): EditionSnapshot {
  const byId = new Map(revisions.map((revision) => [revision.entityId, revision]))
  const representation = byId.get(representationId)
  if (representation?.document.kind !== 'representation')
    throw new WorkspaceError('OBJECT_INACCESSIBLE', 'Formato não disponível')
  const representationDocument = representation.document
  const piece = byId.get(representation.document.pieceId)
  if (
    piece?.document.kind !== 'piece' ||
    !piece.document.representationIds.includes(representationId)
  )
    throw new WorkspaceError('DEPENDENCY_MISSING', 'A peça não contém este formato')
  if (piece.document.state === 'historical' || piece.document.state === 'incomplete')
    throw new WorkspaceError('INVALID_OPERATION', 'Conclua a peça antes de aprovar uma entrega')
  if (!representation.document.componentIds.length)
    throw new WorkspaceError('INVALID_OPERATION', 'Este formato ainda não tem peças para aprovar')
  const manifests = new Map(assets.map((asset) => [asset.id, asset]))
  const orderedAssets = representation.document.componentIds.map((id) => {
    const component = byId.get(id),
      document = component?.document
    if (
      !component ||
      !document ||
      (document.kind !== 'component' && document.kind !== 'video') ||
      document.representationId !== representationId
    )
      throw new WorkspaceError('DEPENDENCY_MISSING', 'Uma peça do formato não está disponível')
    if (document.assetIds?.length !== 1)
      throw new WorkspaceError(
        'ASSET_UNCONFIRMED',
        'Cada item precisa de um único arquivo final conferido; exporte a revisão escolhida',
      )
    const asset = manifests.get(document.assetIds[0] ?? '')
    if (asset?.role !== 'final' || asset.projectId !== projectId || !asset.width || !asset.height)
      throw new WorkspaceError(
        'ASSET_UNCONFIRMED',
        'O arquivo final ainda não foi confirmado com suas dimensões',
      )
    if (document.kind === 'video') {
      for (const source of demonstrationSources(document.timeline)) {
        const evidence = byId.get(source.evidenceId)
        if (
          evidence?.id !== source.evidenceRevisionId ||
          evidence.document.kind !== 'evidence' ||
          evidence.document.classification !== 'fact' ||
          evidence.document.validity !== 'current'
        )
          throw new WorkspaceError(
            'CONTEXT_CHANGED',
            'Uma fonte da demonstração mudou. Confira a evidência e atualize a montagem antes de aprovar.',
          )
      }
      const duration =
        (document.timeline.durationInFrames * 1000 * document.timeline.fps.denominator) /
        document.timeline.fps.numerator
      if (
        asset.mime !== 'video/mp4' ||
        asset.codec !== 'h264' ||
        asset.width !== document.timeline.width ||
        asset.height !== document.timeline.height ||
        Math.abs((asset.durationMs ?? 0) - duration) > 100
      )
        throw new WorkspaceError(
          'INVALID_RESULT',
          'O vídeo final não corresponde à montagem revisada',
        )
    } else if (
      !asset.mime.startsWith('image/') ||
      (document.composition &&
        (asset.width !== document.composition.width ||
          asset.height !== document.composition.height))
    )
      throw new WorkspaceError('INVALID_RESULT', 'A arte final não corresponde à peça revisada')
    const alt =
      document.kind === 'component'
        ? (document.alt ?? representationDocument.alt)
        : representationDocument.alt
    if (!alt.trim())
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Inclua uma descrição acessível antes de aprovar',
      )
    return { componentId: id, revisionId: component.id, asset, alt }
  })
  for (const revision of revisions) {
    if (revision.projectId !== projectId)
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'A revisão não pertence a este projeto')
    if (
      revision.document.kind === 'evidence' &&
      revision.document.classification === 'fact' &&
      revision.document.validity !== 'current'
    )
      throw new WorkspaceError(
        'INVALID_OPERATION',
        'Uma evidência factual precisa ser conferida antes de aprovar a entrega',
      )
  }
  const snapshot = editionSnapshotSchema.parse({
    schemaVersion: 1,
    projectId,
    representationId,
    pieceId: piece.entityId,
    revisions: [...revisions].sort((a, b) => a.entityId.localeCompare(b.entityId)),
    orderedAssets,
  })
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 2_000_000)
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'A edição excede 2 MB de contexto; divida a entrega em formatos menores',
    )
  return snapshot
}
