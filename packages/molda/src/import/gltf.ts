/** Inspeção estrutural compartilhada, sem UI, IO ou decodificação de pixels.
 * O consumidor que aceita extensões obrigatórias assume sua validação/decodificação.
 * A importação nativa continua recusando-as por padrão. */

export { normalizeGlbImagePadding } from '../export/glbImagePadding'
export { type GltfDocument, readGltfDocument } from './gltfDocument'
export { GLTF_INPUT_LIMITS } from './gltfInput'
export { inspectReferenceRaster } from './rasterHeader'
