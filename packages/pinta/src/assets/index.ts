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
  type SavedPalette,
  sanitizePaletteLibrary,
} from '../core/paletteLibrary'
export {
  isPintaAssetLike,
  PINTA_ASSET_KINDS,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaAssetKind,
  sanitizePintaAsset,
} from '../core/project'
export { PINTA_TOOL_PRESETS, type PintaToolPreset } from '../core/toolCuration'
export { type AssetImportResult, assetFromJson, assetToJson } from '../export/assetJson'
export { pintaAssetFromWire, pintaAssetToWire } from './wire'
