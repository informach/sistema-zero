# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 5.71s | 737 | 1.0ms | 88 |

**Top 10:** `writeRegion` 48.4%, `(anonymous)` 13.7%, `rasterAtlas` 9.6%, `normalizeHex` 7.6%, `hexToRgb` 5.7%, `normalizeHex` 4.9%, `rasterFaceRegion` 1.4%, `parseModule` 1.2%, `trim` 1.2%, `(anonymous)` 0.6%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 48.4% | 2.77s | 62.8% | 3.59s | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` |
| 13.7% | 785.0ms | 13.7% | 785.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` |
| 9.6% | 552.3ms | 9.6% | 552.3ms | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:81` |
| 7.6% | 437.9ms | 7.9% | 451.7ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 5.7% | 328.6ms | 5.7% | 328.6ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 4.9% | 281.7ms | 4.9% | 281.7ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` |
| 1.4% | 81.9ms | 1.4% | 82.9ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` |
| 1.2% | 73.0ms | 1.6% | 96.3ms | `parseModule` | `[native code]` |
| 1.2% | 71.3ms | 1.2% | 71.3ms | `trim` | `[native code]` |
| 0.6% | 37.4ms | 0.6% | 37.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.6% | 35.2ms | 0.8% | 50.7ms | `sort` | `[native code]` |
| 0.5% | 29.7ms | 0.5% | 29.7ms | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:28` |
| 0.5% | 29.1ms | 85.3% | 4.88s | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:89` |
| 0.2% | 16.8ms | 18.8% | 1.07s | `map` | `[native code]` |
| 0.2% | 16.6ms | 0.3% | 18.5ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `tryPack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:101` |
| 0.2% | 15.6ms | 0.2% | 15.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:17` |
| 0.2% | 15.5ms | 0.2% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:48` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `rasterSwatch` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:56` |
| 0.2% | 14.8ms | 2.8% | 161.4ms | `anonymous` | `[native code]` |
| 0.2% | 14.2ms | 0.2% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 0.2% | 13.9ms | 0.2% | 13.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:21` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `/^#?([0-9a-f]{6})$/i` | `[native code]` |
| 0.2% | 12.8ms | 0.2% | 12.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7302` |
| 0.2% | 11.8ms | 0.2% | 11.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7587` |
| 0.1% | 7.1ms | 0.4% | 28.3ms | `forEach` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `cloneObject` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `faceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `entries` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7277` |
| 0.0% | 1.2ms | 1.2% | 72.6ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `cpus` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `internal:stream` | `internal:stream:35` |
| 0.0% | 1.2ms | 99.1% | 5.66s | `(anonymous)` | `[native code]` |
| 0.0% | 997us | 0.0% | 2.2ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` |
| 0.0% | 974us | 0.0% | 974us | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:35` |
| 0.0% | 961us | 0.1% | 5.7ms | `link` | `[native code]` |
| 0.0% | 946us | 0.0% | 946us | `resolve` | `[native code]` |
| 0.0% | 916us | 0.0% | 916us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.0% | 877us | 0.0% | 877us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:66` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 11.23s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.1% | 5.66s | 0.0% | 1.2ms | `(anonymous)` | `[native code]` |
| 98.8% | 5.65s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 98.2% | 5.61s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 98.2% | 5.61s | 0.0% | 0us | `evaluate` | `[native code]` |
| 97.3% | 5.56s | 0.0% | 0us | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:35` |
| 96.9% | 5.54s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:43` |
| 95.8% | 5.48s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:34` |
| 85.3% | 4.88s | 0.5% | 29.1ms | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:89` |
| 62.8% | 3.59s | 48.4% | 2.77s | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` |
| 18.8% | 1.07s | 0.2% | 16.8ms | `map` | `[native code]` |
| 18.6% | 1.06s | 0.0% | 0us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` |
| 18.3% | 1.04s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` |
| 14.0% | 806.1ms | 0.0% | 0us | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` |
| 13.7% | 785.0ms | 13.7% | 785.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` |
| 9.6% | 552.3ms | 9.6% | 552.3ms | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:81` |
| 7.9% | 451.7ms | 7.6% | 437.9ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 5.7% | 328.6ms | 5.7% | 328.6ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 4.9% | 281.7ms | 4.9% | 281.7ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` |
| 2.8% | 161.4ms | 0.2% | 14.8ms | `anonymous` | `[native code]` |
| 1.7% | 97.2ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.6% | 96.3ms | 1.2% | 73.0ms | `parseModule` | `[native code]` |
| 1.5% | 87.2ms | 0.0% | 0us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:70` |
| 1.4% | 82.9ms | 1.4% | 81.9ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` |
| 1.2% | 72.6ms | 0.0% | 1.2ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` |
| 1.2% | 71.3ms | 1.2% | 71.3ms | `trim` | `[native code]` |
| 1.2% | 71.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:22` |
| 0.8% | 50.7ms | 0.6% | 35.2ms | `sort` | `[native code]` |
| 0.8% | 49.4ms | 0.0% | 0us | `atlasKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 0.6% | 37.4ms | 0.6% | 37.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.5% | 29.7ms | 0.5% | 29.7ms | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:28` |
| 0.4% | 28.3ms | 0.1% | 7.1ms | `forEach` | `[native code]` |
| 0.4% | 26.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:37` |
| 0.4% | 25.9ms | 0.0% | 0us | `AtlasTexture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\atlasTexture.ts:18` |
| 0.4% | 25.9ms | 0.0% | 0us | `DataTexture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23905` |
| 0.3% | 21.6ms | 0.0% | 0us | `atlasKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:83` |
| 0.3% | 21.1ms | 0.0% | 0us | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:83` |
| 0.3% | 21.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:84` |
| 0.3% | 20.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:27` |
| 0.3% | 18.5ms | 0.2% | 16.6ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` |
| 0.2% | 16.0ms | 0.0% | 0us | `packAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:127` |
| 0.2% | 16.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:25` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `tryPack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:101` |
| 0.2% | 16.0ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.2% | 16.0ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.2% | 16.0ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.2% | 16.0ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.2% | 16.0ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.2% | 16.0ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.2% | 16.0ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.2% | 16.0ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.2% | 16.0ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.2% | 16.0ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.2% | 15.6ms | 0.2% | 15.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:17` |
| 0.2% | 15.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:48` |
| 0.2% | 15.5ms | 0.2% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:48` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `rasterSwatch` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:56` |
| 0.2% | 14.8ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.2% | 14.8ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.2% | 14.8ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.2% | 14.8ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.2% | 14.8ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.2% | 14.2ms | 0.2% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 0.2% | 13.9ms | 0.2% | 13.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:21` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `/^#?([0-9a-f]{6})$/i` | `[native code]` |
| 0.2% | 12.8ms | 0.2% | 12.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7302` |
| 0.2% | 11.8ms | 0.2% | 11.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7587` |
| 0.1% | 7.1ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.1% | 7.1ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.1% | 7.1ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:78` |
| 0.1% | 7.1ms | 0.0% | 0us | `node:assert` | `node:assert:2` |
| 0.1% | 5.7ms | 0.0% | 961us | `link` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `cloneObject` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 997us | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` |
| 0.0% | 2.2ms | 0.0% | 2.2ms | `faceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `entries` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7277` |
| 0.0% | 1.2ms | 0.0% | 0us | `populate` | `node:os:16` |
| 0.0% | 1.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:50` |
| 0.0% | 1.2ms | 0.0% | 0us | `get model` | `node:os:25` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `cpus` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `internal:stream` | `internal:stream:35` |
| 0.0% | 974us | 0.0% | 974us | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:35` |
| 0.0% | 961us | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 946us | 0.0% | 946us | `resolve` | `[native code]` |
| 0.0% | 916us | 0.0% | 916us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.0% | 877us | 0.0% | 0us | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:65` |
| 0.0% | 877us | 0.0% | 877us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:66` |

## Function Details

### `writeRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` | Self: 48.4% (2.77s) | Total: 62.8% (3.59s) | Samples: 339

**Called by:**
- `rasterAtlas` (462)
- `(anonymous)` (5)

**Calls:**
- `(anonymous)` (119)
- `(anonymous)` (9)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` | Self: 13.7% (785.0ms) | Total: 13.7% (785.0ms) | Samples: 119

**Called by:**
- `writeRegion` (119)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:81` | Self: 9.6% (552.3ms) | Total: 9.6% (552.3ms) | Samples: 72

**Called by:**
- `update` (72)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` | Self: 7.6% (437.9ms) | Total: 7.9% (451.7ms) | Samples: 61

**Called by:**
- `hexToRgb` (63)

**Calls:**
- `/^#?([0-9a-f]{6})$/i` (2)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` | Self: 5.7% (328.6ms) | Total: 5.7% (328.6ms) | Samples: 29

**Called by:**
- `(anonymous)` (24)
- `rasterFaceRegion` (5)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` | Self: 4.9% (281.7ms) | Total: 4.9% (281.7ms) | Samples: 39

**Called by:**
- `hexToRgb` (39)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` | Self: 1.4% (81.9ms) | Total: 1.4% (82.9ms) | Samples: 10

**Called by:**
- `rasterAtlas` (11)

**Calls:**
- `faceKey` (1)

### `parseModule`
`[native code]` | Self: 1.2% (73.0ms) | Total: 1.6% (96.3ms) | Samples: 7

**Called by:**
- `async (anonymous)` (10)

**Calls:**
- `node:assert` (2)
- `node:assert` (1)

### `trim`
`[native code]` | Self: 1.2% (71.3ms) | Total: 1.2% (71.3ms) | Samples: 9

**Called by:**
- `normalizeHex` (9)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` | Self: 0.6% (37.4ms) | Total: 0.6% (37.4ms) | Samples: 9

**Called by:**
- `writeRegion` (9)

### `sort`
`[native code]` | Self: 0.6% (35.2ms) | Total: 0.8% (50.7ms) | Samples: 5

**Called by:**
- `atlasKey` (5)
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `writeRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:28` | Self: 0.5% (29.7ms) | Total: 0.5% (29.7ms) | Samples: 3

**Called by:**
- `rasterAtlas` (3)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:89` | Self: 0.5% (29.1ms) | Total: 85.3% (4.88s) | Samples: 2

**Called by:**
- `update` (623)

**Calls:**
- `writeRegion` (462)
- `rasterFaceRegion` (129)
- `rasterFaceRegion` (14)
- `rasterFaceRegion` (11)
- `writeRegion` (3)
- `writeRegion` (1)
- `rasterFaceRegion` (1)

### `map`
`[native code]` | Self: 0.2% (16.8ms) | Total: 18.8% (1.07s) | Samples: 2

**Called by:**
- `rasterFaceRegion` (129)
- `atlasKey` (1)
- `atlasItems` (1)

**Calls:**
- `(anonymous)` (126)
- `hexToRgb` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` | Self: 0.2% (16.6ms) | Total: 0.3% (18.5ms) | Samples: 2

**Called by:**
- `atlasKey` (4)

**Calls:**
- `entries` (2)

### `tryPack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:101` | Self: 0.2% (16.0ms) | Total: 0.2% (16.0ms) | Samples: 1

**Called by:**
- `packAtlas` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:17` | Self: 0.2% (15.6ms) | Total: 0.2% (15.6ms) | Samples: 1

**Called by:**
- `paletteUpdate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:48` | Self: 0.2% (15.5ms) | Total: 0.2% (15.5ms) | Samples: 1

**Called by:**
- `sort` (1)

### `rasterSwatch`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:56` | Self: 0.2% (14.9ms) | Total: 0.2% (14.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 0.2% (14.8ms) | Total: 2.8% (161.4ms) | Samples: 1

**Called by:**
- `internal:assert/assertion_error` (2)
- `loadAssertionError` (2)
- `internal:fs/streams` (2)
- `node:stream` (2)
- `get WriteStream` (2)
- `internal:streams/duplex` (1)
- `internal:streams/operators` (1)
- `internal:streams/pipeline` (1)
- `node:assert` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)

**Calls:**
- `internal:assert/assertion_error` (2)
- `internal:util/colors` (2)
- `internal:fs/streams` (2)
- `node:stream` (2)
- `internal:stream` (1)
- `internal:streams/duplex` (1)
- `internal:streams/operators` (1)
- `internal:primordials` (1)
- `internal:streams/pipeline` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` | Self: 0.2% (14.2ms) | Total: 0.2% (14.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:21` | Self: 0.2% (13.9ms) | Total: 0.2% (13.9ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `/^#?([0-9a-f]{6})$/i`
`[native code]` | Self: 0.2% (13.7ms) | Total: 0.2% (13.7ms) | Samples: 2

**Called by:**
- `normalizeHex` (2)

### `Texture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7302` | Self: 0.2% (12.8ms) | Total: 0.2% (12.8ms) | Samples: 1

**Called by:**
- `DataTexture` (1)

### `Texture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7587` | Self: 0.2% (11.8ms) | Total: 0.2% (11.8ms) | Samples: 1

**Called by:**
- `DataTexture` (1)

### `forEach`
`[native code]` | Self: 0.1% (7.1ms) | Total: 0.4% (28.3ms) | Samples: 1

**Called by:**
- `rasterAtlas` (6)
- `bound call` (1)

**Calls:**
- `(anonymous)` (6)

### `cloneObject`
`[native code]` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 2

**Called by:**
- `paletteUpdate` (2)

### `faceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` | Self: 0.0% (2.2ms) | Total: 0.0% (2.2ms) | Samples: 2

**Called by:**
- `atlasItems` (1)
- `rasterFaceRegion` (1)

### `entries`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `atlasItems` (2)

### `Texture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7277` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `DataTexture` (1)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` | Self: 0.0% (1.2ms) | Total: 1.2% (72.6ms) | Samples: 1

**Called by:**
- `hexToRgb` (10)

**Calls:**
- `trim` (9)

### `cpus`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `populate` (1)

### `internal:stream`
`internal:stream:35` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (1.2ms) | Total: 99.1% (5.66s) | Samples: 1

**Called by:**
- `processTicksAndRejections` (733)
- `refresh` (2)

**Calls:**
- `async loadAndEvaluateModule` (725)
- `async (anonymous)` (7)
- `get WriteStream` (2)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` | Self: 0.0% (997us) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `atlasKey` (2)

**Calls:**
- `faceKey` (1)

### `writeRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:35` | Self: 0.0% (974us) | Total: 0.0% (974us) | Samples: 1

**Called by:**
- `rasterAtlas` (1)

### `link`
`[native code]` | Self: 0.0% (961us) | Total: 0.1% (5.7ms) | Samples: 1

**Called by:**
- `link` (5)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (5)

### `resolve`
`[native code]` | Self: 0.0% (946us) | Total: 0.0% (946us) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` | Self: 0.0% (916us) | Total: 0.0% (916us) | Samples: 1

**Called by:**
- `rasterAtlas` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:66` | Self: 0.0% (877us) | Total: 0.0% (877us) | Samples: 1

**Called by:**
- `map` (1)

### `packAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:127` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `tryPack` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:50` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `get model` (1)

### `internal:primordials`
`internal:primordials:78` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:27` | Self: 0.0% (0us) | Total: 0.3% (20.1ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `update` (4)
- `update` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `internal:util/colors` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:84` | Self: 0.0% (0us) | Total: 0.3% (21.1ms) | Samples: 0

**Called by:**
- `forEach` (6)

**Calls:**
- `writeRegion` (5)
- `rasterSwatch` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.7% (97.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `parseModule` (10)
- `resolve` (1)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `bound call` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` | Self: 0.0% (0us) | Total: 18.3% (1.04s) | Samples: 0

**Called by:**
- `map` (126)

**Calls:**
- `hexToRgb` (102)
- `hexToRgb` (24)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:83` | Self: 0.0% (0us) | Total: 0.3% (21.1ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `forEach` (6)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `makeSafe` (1)

**Calls:**
- `forEach` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.2% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.2% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:assert`
`node:assert:2` | Self: 0.0% (0us) | Total: 0.1% (7.1ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `assign` (2)

### `AtlasTexture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\atlasTexture.ts:18` | Self: 0.0% (0us) | Total: 0.4% (25.9ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `DataTexture` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:48` | Self: 0.0% (0us) | Total: 0.2% (15.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `sort` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.2% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:25` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `packAtlas` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:70` | Self: 0.0% (0us) | Total: 1.5% (87.2ms) | Samples: 0

**Called by:**
- `rasterAtlas` (14)

**Calls:**
- `hexToRgb` (9)
- `hexToRgb` (5)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 98.8% (5.65s) | Samples: 0

**Calls:**
- `(anonymous)` (733)

### `DataTexture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23905` | Self: 0.0% (0us) | Total: 0.4% (25.9ms) | Samples: 0

**Called by:**
- `AtlasTexture` (3)

**Calls:**
- `Texture` (1)
- `Texture` (1)
- `Texture` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (11.23s) | Samples: 0

**Called by:**
- `moduleEvaluation` (724)
- `async loadAndEvaluateModule` (724)

**Calls:**
- `evaluate` (724)
- `moduleEvaluation` (724)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:34` | Self: 0.0% (0us) | Total: 95.8% (5.48s) | Samples: 0

**Called by:**
- `paletteUpdate` (700)
- `(module)` (4)

**Calls:**
- `rasterAtlas` (623)
- `rasterAtlas` (72)
- `rasterAtlas` (6)
- `AtlasTexture` (3)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:22` | Self: 0.0% (0us) | Total: 1.2% (71.0ms) | Samples: 0

**Called by:**
- `paletteUpdate` (13)

**Calls:**
- `atlasKey` (7)
- `atlasKey` (6)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:65` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `atlasKey` (1)

**Calls:**
- `map` (1)

### `atlasKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` | Self: 0.0% (0us) | Total: 0.8% (49.4ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `sort` (5)
- `map` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `assign` (2)

**Calls:**
- `loadAssertionError` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `get` (2)

**Calls:**
- `anonymous` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:37` | Self: 0.0% (0us) | Total: 0.4% (26.0ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `paletteUpdate` (4)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `refresh` (2)

### `get model`
`node:os:25` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `populate` (1)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` | Self: 0.0% (0us) | Total: 14.0% (806.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (102)
- `rasterFaceRegion` (9)
- `map` (1)

**Calls:**
- `normalizeHex` (63)
- `normalizeHex` (39)
- `normalizeHex` (10)

### `atlasKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:83` | Self: 0.0% (0us) | Total: 0.3% (21.6ms) | Samples: 0

**Called by:**
- `update` (7)

**Calls:**
- `atlasItems` (4)
- `atlasItems` (2)
- `atlasItems` (1)

### `paletteUpdate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:35` | Self: 0.0% (0us) | Total: 97.3% (5.56s) | Samples: 0

**Called by:**
- `(module)` (712)
- `(module)` (4)

**Calls:**
- `update` (700)
- `update` (13)
- `cloneObject` (2)
- `update` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `anonymous` (2)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.2% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (961us) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` | Self: 0.0% (0us) | Total: 18.6% (1.06s) | Samples: 0

**Called by:**
- `rasterAtlas` (129)

**Calls:**
- `map` (129)

### `populate`
`node:os:16` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `get model` (1)

**Calls:**
- `cpus` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:43` | Self: 0.0% (0us) | Total: 96.9% (5.54s) | Samples: 0

**Called by:**
- `evaluate` (712)

**Calls:**
- `paletteUpdate` (712)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (2)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 98.2% (5.61s) | Samples: 0

**Called by:**
- `moduleEvaluation` (724)

**Calls:**
- `(module)` (712)
- `(module)` (5)
- `(module)` (4)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 98.2% (5.61s) | Samples: 0

**Called by:**
- `(anonymous)` (725)

**Calls:**
- `moduleEvaluation` (724)
- `linkAndEvaluateModule` (1)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.2% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 75.2% | 4.30s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 18.3% | 1.04s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts` |
| 4.2% | 241.3ms | `[native code]` |
| 0.8% | 51.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts` |
| 0.5% | 29.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts` |
| 0.4% | 25.9ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.2% | 15.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts` |
| 0.0% | 1.2ms | `internal:stream` |
