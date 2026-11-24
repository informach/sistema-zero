/** Inspeção estrutural compartilhada, sem UI, IO ou decodificação de pixels.
 * O consumidor que aceita extensões obrigatórias assume sua validação/decodificação.
 * A importação nativa continua recusando-as por padrão. */

export { affineTrsChain } from '../export/affineTrsChain'
export { encodeGlbContainer } from '../export/glbContainer'
export { normalizeGlbImagePadding, stabilizeGeneratedGlbImages } from '../export/glbImagePadding'
export type { AffineMatrix } from '../scene/matrix'
export { type GltfDocument, readGltfDocument } from './gltfDocument'
export { GLTF_INPUT_LIMITS } from './gltfInput'
export { inspectReferenceRaster } from './rasterHeader'
