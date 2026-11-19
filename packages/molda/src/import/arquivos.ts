/** Arquivos locais compartilhados por Molda e oficina de cenários. */
export { readZipFiles } from '../export/backupFile'
export { zipFilesBlob } from '../export/zip'
export { gltfResourcePath } from './gltfResourcePath'
export {
  decodeImportDataUri,
  type ImportDataUriPolicy,
  inspectImportDataPayload,
} from './importDataUri'
export { literalLocalFilePath, literalResourcePath } from './literalResourcePath'
export { inspectReferenceRaster } from './rasterHeader'
