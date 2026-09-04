/** Contrato único entre quem monta e quem restaura o backup da galeria. */
export const MOLDA_GALLERY_ZIP_ENTRY = 'galeria.molda.json'

/**
 * Teto do JSON do backup (o mesmo do Pinta). O ZIP em si pode ser maior: o
 * leitor só puxa a entrada canônica e nunca carrega os `.glb`/`.hdr`.
 */
export const MAX_BACKUP_FILE_BYTES = 32 * 1024 * 1024
