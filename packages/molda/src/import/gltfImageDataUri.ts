import { GLTF_DATA_URI_POLICY } from './gltfDataUri'
import { inspectRasterDataUri } from './importDataUri'

/** Core raster sources only. MIME declarations still need comparison with the image header. */
export function inspectGltfImageDataUri(uri: string, path: string) {
  return inspectRasterDataUri(uri, path, GLTF_DATA_URI_POLICY)
}
