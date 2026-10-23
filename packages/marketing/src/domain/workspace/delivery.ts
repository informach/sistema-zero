import {
  type ApprovedEdition,
  deliveryFormatsFor,
  editorialCaption,
} from '@sistemazero/marketing-contracts'
import type { PublicationFormat } from '../publication/publication'
import { WorkspaceError } from './workspace-error'

/** Product delivery profiles; provider-specific upload checks remain in each publisher. */
export function deliveryCopy(edition: ApprovedEdition, format: PublicationFormat) {
  const representation = edition.snapshot.revisions.find(
    (row) => row.entityId === edition.snapshot.representationId,
  )?.document
  const piece = edition.snapshot.revisions.find(
    (row) => row.entityId === edition.snapshot.pieceId,
  )?.document
  if (representation?.kind !== 'representation' || piece?.kind !== 'piece')
    throw new WorkspaceError('INVALID_RESULT', 'A edição está incompleta')
  if (representation.purpose === 'direct')
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Mensagens de direct não podem ser enviadas como publicação',
    )
  if (!deliveryFormatsFor(representation.format).includes(format))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Adapte e aprove uma representação para este destino antes de preparar a entrega',
    )
  const files = edition.snapshot.orderedAssets
  const video = ['ig_reels', 'fb_reels', 'yt_video', 'yt_short', 'tt_video'].includes(format)
  if (video && (files.length !== 1 || files[0]?.asset.mime !== 'video/mp4'))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Este destino precisa de um único vídeo MP4 aprovado',
    )
  if (format === 'ig_feed' && (files.length !== 1 || !files[0]?.asset.mime.startsWith('image/')))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'O post de imagem precisa de uma única arte aprovada',
    )
  if (
    format === 'ig_carousel' &&
    (files.length < 2 ||
      files.length > 10 ||
      files.some((file) => !file.asset.mime.startsWith('image/')))
  )
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'O publicador atual de carrosséis aceita de 2 a 10 imagens. Adapte a representação para este perfil.',
    )
  if (format === 'fb_post' && (files.length !== 1 || !files[0]?.asset.mime.startsWith('image/')))
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'O publicador atual de posts do Facebook aceita uma imagem por entrega',
    )
  if (
    ['ig_reels', 'ig_story', 'fb_reels', 'yt_short', 'tt_video'].includes(format) &&
    files.some(
      ({ asset }) => !asset.width || !asset.height || asset.width * 16 !== asset.height * 9,
    )
  )
    throw new WorkspaceError(
      'INVALID_OPERATION',
      'Este perfil de entrega usa a versão vertical 9:16. Adapte a representação antes de aprovar.',
    )
  // Caption is already the approved text. Never silently append, truncate or regenerate CTA/tags.
  return {
    caption: editorialCaption(representation, edition.snapshot.revisions),
    title: piece.title,
    contentType:
      representation.format === 'story'
        ? ('story' as const)
        : representation.format === 'carousel'
          ? ('carousel' as const)
          : representation.format === 'reel'
            ? ('reels' as const)
            : representation.format === 'long-video'
              ? ('video_long' as const)
              : ('static_post' as const),
  }
}
