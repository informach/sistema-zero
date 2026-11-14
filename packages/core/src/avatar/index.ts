/**
 * O avatar (pack Cute Characters): o catálogo, as regras de combinação, o sorteio e os arquivos.
 * Puro (sem React, three nem banco): o servidor, a tela e o jogo usam o mesmo.
 */
export { type BodyMeasures, bodyMeasures, type PhysicalBody, physicalBody } from './body'
export { AVATAR_CATALOG } from './catalog.generated'
export {
  type AvatarCommunity,
  type AvatarFilter,
  type DrawOptions,
  drawAvatar,
  FRIENDLY_EXPRESSIONS,
  isListed,
  matchesFilter,
  seededRandom,
} from './draw'
export {
  AVATAR_BUCKET_FOLDER,
  AVATAR_FILE_ROUTE,
  avatarBucketKey,
  avatarFiles,
  avatarFileUrl,
  isAvatarFile,
} from './files'
export {
  type AvatarProblem,
  type AvatarSlots,
  avatarProblems,
  equipPart,
  FANTASIA_SLOT,
  GROUP_CONFLICTS,
  isAvatarOwned,
  ownershipOf,
  partOf,
  partsConflict,
  REQUIRED_SLOTS,
  removeSlot,
  setSlots,
  withEars,
  wornSet,
} from './rules'
export type * from './types'
