import {
  artAssetIds,
  type EditorialDocument,
  preparedAssetIds,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
export function references(document: EditorialDocument): {
  items: string[]
  revisions: string[]
  assets: string[]
} {
  const refs = { items: [] as string[], revisions: [] as string[], assets: [] as string[] }
  switch (document.kind) {
    case 'evidence':
      refs.assets.push(...(document.assetIds ?? []))
      break
    case 'direction':
      refs.items.push(...document.referenceIds)
      break
    case 'piece':
      refs.items.push(...document.evidenceIds, ...document.representationIds)
      break
    case 'representation':
      refs.items.push(document.pieceId, ...document.componentIds)
      if (document.sourceRevisionId) refs.revisions.push(document.sourceRevisionId)
      break
    case 'component':
      refs.items.push(document.representationId)
      refs.assets.push(...document.assetIds)
      refs.assets.push(...(document.referenceAssetIds ?? []))
      if (document.composition) refs.assets.push(...artAssetIds(document.composition))
      if (document.sourceRevisionId) refs.revisions.push(document.sourceRevisionId)
      break
    case 'video':
      if (document.sourceRevisionId) refs.revisions.push(document.sourceRevisionId)
      refs.revisions.push(
        ...document.timeline.clips.flatMap((clip) => (clip.art ? [clip.art.sourceRevisionId] : [])),
      )
      for (const preparation of document.preparations ?? [])
        refs.assets.push(preparation.sourceAssetId, ...preparedAssetIds(preparation))
      refs.items.push(document.representationId)
      refs.assets.push(...(document.assetIds ?? []), ...(document.referenceAssetIds ?? []))
      refs.assets.push(...videoAssetIds(document.timeline))
      break
    case 'comment':
      refs.revisions.push(document.revisionId)
      break
    case 'analysis':
      refs.items.push(...document.evidenceIds)
      refs.revisions.push(...(document.basis ?? []).map((source) => source.revisionId))
      if (document.proposedPieceId) refs.items.push(document.proposedPieceId)
      break
    case 'watchlist':
      refs.items.push(...document.evidenceIds)
      break
  }
  return {
    items: [...new Set(refs.items)],
    revisions: [...new Set(refs.revisions)],
    assets: [...new Set(refs.assets)],
  }
}
