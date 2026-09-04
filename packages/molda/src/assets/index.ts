/**
 * `@sistemazero/molda/assets`: a face PURA do pacote (zero React, zero
 * zustand, zero three, zero IndexedDB). É o que o host kids e o Estúdio
 * importam para validar, converter e medir criações fora do app. O teste
 * `purity.test.ts` varre o grafo de módulos e reprova qualquer import de UI.
 */
export { assetBytes } from '../core/bytes'
export { hexToRgb, normalizeHex, rgbToHex } from '../core/color'
export type { TexelsPerUnit, TextureSize } from '../core/limits'
export { clampInt, isTexelsPerUnit, isTextureSize, MOLDA_LIMITS } from '../core/limits'
export type {
  FaceId,
  MoldaAsset,
  MoldaAssetBase,
  MoldaAssetKind,
  MoldaAssetPaletteId,
  MoldaCustomPalette,
  MoldaModelAsset,
  MoldaPaletteFields,
  MoldaPart,
  MoldaSkin,
  MoldaSkyAsset,
  MoldaSnap,
  MoldaTextureAsset,
  NewAssetInput,
  ShapeId,
  Vec3,
} from '../core/model'
export {
  createAsset,
  createModelAsset,
  createPart,
  createSkyAsset,
  createTextureAsset,
  FACE_IDS,
  hasPalette,
  isMoldaAssetKind,
  isMoldaAssetLike,
  isShapeId,
  MOLDA_ASSET_KINDS,
  SHAPE_IDS,
} from '../core/model'
export { normalizeAssetName, uniqueAssetName } from '../core/names'
export type { MoldaPalette, PaletteId } from '../core/palette'
export {
  DEFAULT_PALETTE_ID,
  firstPaintableIndex,
  getPalette,
  isPaletteId,
  PALETTE_SIZE,
  PALETTES,
  RESERVED_INDEX,
} from '../core/palette'
export {
  resolvePaletteColors,
  sanitizeCustomPalette,
  sanitizeExtraColors,
  sanitizeMoldaAsset,
  sanitizeSkin,
} from '../core/sanitize'
export { base64ToBytes, bytesToBase64 } from '../core/skinCodec'
export type { MoldaAssetJson, MoldaSkinJson } from '../export/assetJson'
export { assetFromJson, assetToJson } from '../export/assetJson'
export type { MoldaGalleryJson, MoldaImportResult } from '../export/projectJson'
export {
  GALLERY_FILE_NAME,
  GALLERY_FORMAT,
  GALLERY_VERSION,
  galleryToJson,
  galleryToJsonText,
  importMoldaJson,
} from '../export/projectJson'
export { FACES_BY_SHAPE, faceSkinSize, faceUnits, partCenter, partSize } from '../model/shapes'
export { cloneSkin, createSkin, flipSkinH, isSkinBlank, resampleSkin } from '../model/skinOps'
export { bakeTwins, mirrorTwinOf, syncTwins } from '../model/twins'
export type { SkyClouds, SkyParams, SkyPresetChoice, SkyPresetId } from '../sky/params'
export {
  DEFAULT_SKY_PRESET,
  isSkyPresetId,
  SKY_PRESET_IDS,
  SKY_RANGES,
  sanitizeSkyParams,
  skyPreset,
} from '../sky/params'
export type { MoldaAssetWire } from './wire'
export { moldaAssetFromWire, moldaAssetToWire } from './wire'
