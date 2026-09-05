import { MOLDA_LIMITS } from '../core/limits'

/** Contrato único entre quem monta e quem restaura o backup da galeria. */
export const MOLDA_GALLERY_ZIP_ENTRY = 'galeria.molda.json'

/**
 * O JSON usa base64 para as peles, então pode ser maior que o orçamento binário
 * da galeria. O fator 2 cobre essa expansão e os metadados sem aceitar tamanho
 * ilimitado de uma entrada externa. O ZIP em si pode ser maior: o leitor só
 * puxa a entrada canônica e nunca carrega os `.glb`/`.hdr`.
 */
export const MAX_BACKUP_FILE_BYTES = MOLDA_LIMITS.maxGalleryBytes * 2

/** Maior contagem não reservada ao marcador ZIP64 no EOCD clássico. */
export const MAX_CLASSIC_ZIP_ENTRIES = 0xfffe
