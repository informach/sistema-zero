// Shim: a implementação vive no @sistemazero/member-shell. O guard de sessão
// (`requireUploadSession`) depende dos cookies deste app → vem do `shell`;
// os helpers sem estado são re-exports diretos do package.
import { shell } from './shell'

export {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  mediaErrorResponse,
  optimizeAndStoreAvatar,
  rejectOversizedRequest,
  removeStaleAvatars,
  type StoredAvatar,
} from '@sistemazero/member-shell/server/media'

export const { requireUploadSession } = shell.media
