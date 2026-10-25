/**
 * `@sistemazero/pinta/assets` — o desenho como DADO, sem uma linha de React.
 *
 * ⭐⭐ Este subpath existe por uma razão dura, não por organização: o `members` é um serviço Bun e
 * **não tem React nas dependências**. Um aviso no cabeçalho do `./lesson` dizendo "o servidor
 * importe só o que é puro" não vale nada — importar QUALQUER coisa daquele barril avalia o
 * `PintaLesson.tsx`, que importa React, e a resolução quebra no boot. A fronteira tem que ser o
 * grafo de módulos, e não a disciplina de quem escreve o import.
 *
 * Quem usa o quê:
 * - **members (servidor)**: valida na borda com `sanitizePintaAsset` e os tetos de `PINTA_LIMITS`;
 *   lê e escreve HTTP/jsonb com `pintaAssetFromWire`/`pintaAssetToWire`.
 * - **admin**: pré-cria o desenho do bloco com `createAsset` e oferece os presets de ferramenta.
 * - **arquivos `.pinta.json`**: usam `assetFromJson`/`assetToJson` (envelope portátil da galeria).
 * - **scripts que geram desenhos por código** (mapas da galeria, modelos): `buildTilemap` monta um
 *   mapa com camadas de peças (cada uma com as suas peças) e de objetos, e LANÇA no erro de
 *   autoria; `buildPixelTileset`/`bitmapFromArt` montam as peças.
 *
 * ⚠️ Nada aqui pode importar de `components/`, `lesson/` ou `state/` — há um teste que percorre o
 * grafo e reprova se React entrar. Ver `assets/purity.test.ts`.
 */
export {
  createAsset,
  createLessonAsset,
  type NewAssetInput,
  PINTA_LESSON_ASSET_OPTIONS,
  type PintaLessonAssetKind,
} from '../core/newAsset'
export {
  emptyPaletteLibrary,
  MAX_SAVED_PALETTES,
  mergePaletteLibraries,
  type PaletteLibrary,
  paletteLibraryContentKey,
  type RemovedPaletteMark,
  type SavedPalette,
  sanitizePaletteLibrary,
} from '../core/paletteLibrary'
export {
  type AnyTilesetAsset,
  isObjectLayer,
  isPintaAssetLike,
  isTileLayer,
  OBJECT_PROPERTY_KEY_PATTERN,
  PINTA_ASSET_KINDS,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaAssetKind,
  sanitizePintaAsset,
  type TilemapAsset,
  type TilemapLayer,
  type TilemapObject,
  type TilemapObjectLayer,
  type TilemapObjectPropertyValue,
  type TilemapTileLayer,
  type TilesetAsset,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
export { PINTA_TOOL_PRESETS, type PintaToolPreset } from '../core/toolCuration'
export { type AssetImportResult, assetFromJson, assetToJson } from '../export/assetJson'
export { bitmapFromArt, cellsFromArt } from '../templates/art'
export {
  buildPixelTileset,
  buildTilemap,
  type LayerSpec,
  type ObjectLayerSpec,
  type ObjectSpec,
  type TilemapLayerSpec,
  type TilemapSpec,
  type TileSpec,
} from '../templates/builders'
export { createMapObject } from '../tiles/mapObjects'
export { pintaAssetFromWire, pintaAssetToWire } from './wire'
