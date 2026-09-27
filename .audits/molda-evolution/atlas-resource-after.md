# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.73s | 618 | 1.0ms | 79 |

**Top 10:** `writeRegion` 48.3%, `(anonymous)` 25.8%, `normalizeHex` 7.3%, `normalizeHex` 5.5%, `hexToRgb` 2.8%, `fill` 2.2%, `rasterFaceRegion` 1.1%, `sort` 1.0%, `map` 0.6%, `parseModule` 0.4%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 48.3% | 2.29s | 74.5% | 3.53s | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` |
| 25.8% | 1.22s | 25.8% | 1.22s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` |
| 7.3% | 348.5ms | 7.7% | 367.4ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 5.5% | 261.0ms | 5.5% | 261.0ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` |
| 2.8% | 134.8ms | 2.8% | 134.8ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 2.2% | 108.8ms | 2.2% | 108.8ms | `fill` | `[native code]` |
| 1.1% | 54.9ms | 1.1% | 54.9ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` |
| 1.0% | 48.2ms | 1.0% | 48.2ms | `sort` | `[native code]` |
| 0.6% | 31.9ms | 14.5% | 688.7ms | `map` | `[native code]` |
| 0.4% | 19.5ms | 0.7% | 34.3ms | `parseModule` | `[native code]` |
| 0.3% | 18.8ms | 0.3% | 18.8ms | `/^#?([0-9a-f]{6})$/i` | `[native code]` |
| 0.3% | 17.8ms | 0.3% | 17.8ms | `trim` | `[native code]` |
| 0.3% | 16.4ms | 0.3% | 16.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `resolve` | `[native code]` |
| 0.3% | 15.6ms | 0.3% | 15.6ms | `entries` | `[native code]` |
| 0.3% | 15.1ms | 0.3% | 15.1ms | `push` | `[native code]` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.3% | 14.9ms | 97.5% | 4.62s | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:57` |
| 0.3% | 14.8ms | 0.3% | 14.8ms | `filter` | `[native code]` |
| 0.3% | 14.6ms | 0.3% | 14.6ms | `update` | `[native code]` |
| 0.2% | 14.1ms | 0.2% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 0.2% | 13.8ms | 0.2% | 13.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:215` |
| 0.2% | 13.0ms | 0.2% | 13.0ms | `from` | `[native code]` |
| 0.0% | 2.0ms | 92.5% | 4.38s | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:98` |
| 0.0% | 2.0ms | 1.1% | 52.5ms | `async (anonymous)` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `resolvePaletteColors` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 0.0% | 1.0ms | 0.3% | 16.1ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:28` |
| 0.0% | 961us | 0.3% | 16.5ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` |
| 0.0% | 960us | 0.0% | 960us | `createColorManagement` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 939us | 0.0% | 939us | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 831us | 0.0% | 831us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11995` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 9.41s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.5% | 4.71s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 99.5% | 4.71s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 98.9% | 4.68s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 98.8% | 4.68s | 0.0% | 0us | `evaluate` | `[native code]` |
| 97.6% | 4.62s | 0.0% | 0us | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:49` |
| 97.5% | 4.62s | 0.3% | 14.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:57` |
| 95.6% | 4.52s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:43` |
| 92.5% | 4.38s | 0.0% | 2.0ms | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:98` |
| 74.5% | 3.53s | 48.3% | 2.29s | `writeRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` |
| 25.8% | 1.22s | 25.8% | 1.22s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` |
| 14.5% | 688.7ms | 0.6% | 31.9ms | `map` | `[native code]` |
| 13.9% | 661.5ms | 0.0% | 0us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` |
| 13.6% | 646.3ms | 0.0% | 0us | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` |
| 13.2% | 629.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` |
| 7.7% | 367.4ms | 7.3% | 348.5ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 5.5% | 261.0ms | 5.5% | 261.0ms | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` |
| 2.8% | 134.8ms | 2.8% | 134.8ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 2.5% | 120.5ms | 0.0% | 0us | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:70` |
| 2.2% | 108.8ms | 0.0% | 0us | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:90` |
| 2.2% | 108.8ms | 2.2% | 108.8ms | `fill` | `[native code]` |
| 2.0% | 95.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:28` |
| 1.3% | 62.3ms | 0.0% | 0us | `atlasKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 1.1% | 54.9ms | 1.1% | 54.9ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` |
| 1.1% | 52.5ms | 0.0% | 2.0ms | `async (anonymous)` | `[native code]` |
| 1.0% | 48.2ms | 1.0% | 48.2ms | `sort` | `[native code]` |
| 0.7% | 35.0ms | 0.0% | 0us | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:92` |
| 0.7% | 35.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:93` |
| 0.7% | 35.0ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.7% | 34.3ms | 0.4% | 19.5ms | `parseModule` | `[native code]` |
| 0.6% | 32.7ms | 0.0% | 0us | `atlasKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:83` |
| 0.6% | 32.1ms | 0.0% | 0us | `rasterSwatch` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:55` |
| 0.6% | 29.6ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 0.3% | 18.8ms | 0.3% | 18.8ms | `/^#?([0-9a-f]{6})$/i` | `[native code]` |
| 0.3% | 17.8ms | 0.0% | 0us | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` |
| 0.3% | 17.8ms | 0.3% | 17.8ms | `trim` | `[native code]` |
| 0.3% | 17.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:51` |
| 0.3% | 16.5ms | 0.0% | 961us | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` |
| 0.3% | 16.4ms | 0.3% | 16.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.3% | 16.1ms | 0.0% | 1.0ms | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `resolve` | `[native code]` |
| 0.3% | 15.6ms | 0.3% | 15.6ms | `entries` | `[native code]` |
| 0.3% | 15.1ms | 0.3% | 15.1ms | `push` | `[native code]` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `rasterFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 0.3% | 14.8ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.3% | 14.8ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.3% | 14.8ms | 0.3% | 14.8ms | `filter` | `[native code]` |
| 0.3% | 14.8ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.3% | 14.8ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.3% | 14.8ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.3% | 14.8ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.3% | 14.8ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.3% | 14.6ms | 0.3% | 14.6ms | `update` | `[native code]` |
| 0.3% | 14.6ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:38` |
| 0.3% | 14.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:39` |
| 0.2% | 14.1ms | 0.2% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` |
| 0.2% | 13.8ms | 0.2% | 13.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:215` |
| 0.2% | 13.0ms | 0.0% | 0us | `partToJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:28` |
| 0.2% | 13.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:32` |
| 0.2% | 13.0ms | 0.2% | 13.0ms | `from` | `[native code]` |
| 0.2% | 13.0ms | 0.0% | 0us | `bytesToBase64` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:11` |
| 0.2% | 13.0ms | 0.0% | 0us | `assetToJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:36` |
| 0.2% | 13.0ms | 0.0% | 0us | `skinToJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:23` |
| 0.0% | 4.0ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `resolvePaletteColors` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:28` |
| 0.0% | 996us | 0.0% | 0us | `rasterAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:91` |
| 0.0% | 960us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6857` |
| 0.0% | 960us | 0.0% | 960us | `createColorManagement` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 939us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18128` |
| 0.0% | 939us | 0.0% | 939us | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 939us | 0.0% | 0us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11785` |
| 0.0% | 855us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:25` |
| 0.0% | 831us | 0.0% | 0us | `Mesh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23031` |
| 0.0% | 831us | 0.0% | 831us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11995` |
| 0.0% | 831us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:25786` |

## Function Details

### `writeRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:36` | Self: 48.3% (2.29s) | Total: 74.5% (3.53s) | Samples: 309

**Called by:**
- `rasterAtlas` (454)
- `(anonymous)` (3)

**Calls:**
- `(anonymous)` (146)
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:73` | Self: 25.8% (1.22s) | Total: 25.8% (1.22s) | Samples: 146

**Called by:**
- `writeRegion` (146)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` | Self: 7.3% (348.5ms) | Total: 7.7% (367.4ms) | Samples: 43

**Called by:**
- `hexToRgb` (48)

**Calls:**
- `/^#?([0-9a-f]{6})$/i` (5)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:15` | Self: 5.5% (261.0ms) | Total: 5.5% (261.0ms) | Samples: 35

**Called by:**
- `hexToRgb` (35)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` | Self: 2.8% (134.8ms) | Total: 2.8% (134.8ms) | Samples: 21

**Called by:**
- `(anonymous)` (18)
- `rasterFaceRegion` (3)

### `fill`
`[native code]` | Self: 2.2% (108.8ms) | Total: 2.2% (108.8ms) | Samples: 13

**Called by:**
- `rasterAtlas` (13)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:68` | Self: 1.1% (54.9ms) | Total: 1.1% (54.9ms) | Samples: 4

**Called by:**
- `rasterAtlas` (4)

### `sort`
`[native code]` | Self: 1.0% (48.2ms) | Total: 1.0% (48.2ms) | Samples: 5

**Called by:**
- `atlasKey` (5)

### `map`
`[native code]` | Self: 0.6% (31.9ms) | Total: 14.5% (688.7ms) | Samples: 2

**Called by:**
- `rasterFaceRegion` (93)
- `assetToJson` (2)
- `atlasKey` (1)

**Calls:**
- `(anonymous)` (91)
- `partToJson` (2)
- `(anonymous)` (1)

### `parseModule`
`[native code]` | Self: 0.4% (19.5ms) | Total: 0.7% (34.3ms) | Samples: 4

**Called by:**
- `async (anonymous)` (5)

**Calls:**
- `node:assert` (1)

### `/^#?([0-9a-f]{6})$/i`
`[native code]` | Self: 0.3% (18.8ms) | Total: 0.3% (18.8ms) | Samples: 5

**Called by:**
- `normalizeHex` (5)

### `trim`
`[native code]` | Self: 0.3% (17.8ms) | Total: 0.3% (17.8ms) | Samples: 6

**Called by:**
- `normalizeHex` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` | Self: 0.3% (16.4ms) | Total: 0.3% (16.4ms) | Samples: 2

**Called by:**
- `writeRegion` (2)

### `resolve`
`[native code]` | Self: 0.3% (16.0ms) | Total: 0.3% (16.0ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `entries`
`[native code]` | Self: 0.3% (15.6ms) | Total: 0.3% (15.6ms) | Samples: 2

**Called by:**
- `atlasItems` (2)

### `push`
`[native code]` | Self: 0.3% (15.1ms) | Total: 0.3% (15.1ms) | Samples: 1

**Called by:**
- `atlasItems` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` | Self: 0.3% (15.0ms) | Total: 0.3% (15.0ms) | Samples: 1

**Called by:**
- `rasterAtlas` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:57` | Self: 0.3% (14.9ms) | Total: 97.5% (4.62s) | Samples: 1

**Called by:**
- `evaluate` (602)

**Calls:**
- `paletteUpdate` (601)

### `filter`
`[native code]` | Self: 0.3% (14.8ms) | Total: 0.3% (14.8ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `update`
`[native code]` | Self: 0.3% (14.6ms) | Total: 0.3% (14.6ms) | Samples: 1

**Called by:**
- `digest` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` | Self: 0.2% (14.1ms) | Total: 0.2% (14.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:215` | Self: 0.2% (13.8ms) | Total: 0.2% (13.8ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `from`
`[native code]` | Self: 0.2% (13.0ms) | Total: 0.2% (13.0ms) | Samples: 2

**Called by:**
- `bytesToBase64` (2)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:98` | Self: 0.0% (2.0ms) | Total: 92.5% (4.38s) | Samples: 2

**Called by:**
- `update` (572)

**Calls:**
- `writeRegion` (454)
- `rasterFaceRegion` (93)
- `rasterFaceRegion` (18)
- `rasterFaceRegion` (4)
- `rasterFaceRegion` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (2.0ms) | Total: 1.1% (52.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)
- `requestInstantiate` (1)

**Calls:**
- `parseModule` (5)
- `resolve` (1)

### `resolvePaletteColors`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `update` (1)
- `rasterAtlas` (1)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:75` | Self: 0.0% (1.0ms) | Total: 0.3% (16.1ms) | Samples: 1

**Called by:**
- `atlasKey` (2)

**Calls:**
- `push` (1)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:28` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:73` | Self: 0.0% (961us) | Total: 0.3% (16.5ms) | Samples: 1

**Called by:**
- `atlasKey` (3)

**Calls:**
- `entries` (2)

### `createColorManagement`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (960us) | Total: 0.0% (960us) | Samples: 1

**Called by:**
- `(module)` (1)

### `generateUUID`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (939us) | Total: 0.0% (939us) | Samples: 1

**Called by:**
- `Object3D` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11995` | Self: 0.0% (831us) | Total: 0.0% (831us) | Samples: 1

**Called by:**
- `Mesh` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:25` | Self: 0.0% (0us) | Total: 0.0% (855us) | Samples: 0

**Called by:**
- `paletteUpdate` (1)

**Calls:**
- `resolvePaletteColors` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:43` | Self: 0.0% (0us) | Total: 95.6% (4.52s) | Samples: 0

**Called by:**
- `paletteUpdate` (591)

**Calls:**
- `rasterAtlas` (572)
- `rasterAtlas` (13)
- `rasterAtlas` (5)
- `rasterAtlas` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `assign` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:25786` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Mesh` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 99.5% (4.71s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (614)

**Calls:**
- `async loadAndEvaluateModule` (611)
- `async (anonymous)` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:39` | Self: 0.0% (0us) | Total: 0.3% (14.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:93` | Self: 0.0% (0us) | Total: 0.7% (35.0ms) | Samples: 0

**Called by:**
- `forEach` (5)

**Calls:**
- `writeRegion` (3)
- `rasterSwatch` (2)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (4.0ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `atlasKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:83` | Self: 0.0% (0us) | Total: 0.6% (32.7ms) | Samples: 0

**Called by:**
- `update` (5)

**Calls:**
- `atlasItems` (3)
- `atlasItems` (2)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `internal:util/inspect` (1)

**Calls:**
- `filter` (1)

### `bytesToBase64`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:11` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `skinToJson` (2)

**Calls:**
- `from` (2)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:38` | Self: 0.0% (0us) | Total: 0.3% (14.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `update` (1)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:90` | Self: 0.0% (0us) | Total: 2.2% (108.8ms) | Samples: 0

**Called by:**
- `update` (13)

**Calls:**
- `fill` (13)

### `rasterSwatch`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:55` | Self: 0.0% (0us) | Total: 0.6% (32.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `hexToRgb` (2)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` | Self: 0.0% (0us) | Total: 0.3% (17.8ms) | Samples: 0

**Called by:**
- `hexToRgb` (6)

**Calls:**
- `trim` (6)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` | Self: 0.0% (0us) | Total: 13.6% (646.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (72)
- `rasterFaceRegion` (15)
- `rasterSwatch` (2)

**Calls:**
- `normalizeHex` (48)
- `normalizeHex` (35)
- `normalizeHex` (6)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.5% (4.71s) | Samples: 0

**Calls:**
- `(anonymous)` (614)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (9.41s) | Samples: 0

**Called by:**
- `moduleEvaluation` (626)
- `async loadAndEvaluateModule` (611)

**Calls:**
- `moduleEvaluation` (626)
- `evaluate` (611)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18128` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Object3D` (1)

### `atlasKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:84` | Self: 0.0% (0us) | Total: 1.3% (62.3ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `sort` (5)
- `map` (1)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:92` | Self: 0.0% (0us) | Total: 0.7% (35.0ms) | Samples: 0

**Called by:**
- `update` (5)

**Calls:**
- `forEach` (5)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `rasterAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:91` | Self: 0.0% (0us) | Total: 0.0% (996us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `resolvePaletteColors` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` | Self: 0.0% (0us) | Total: 13.2% (629.5ms) | Samples: 0

**Called by:**
- `map` (91)

**Calls:**
- `hexToRgb` (72)
- `hexToRgb` (18)
- `hexToRgb` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6857` | Self: 0.0% (0us) | Total: 0.0% (960us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `createColorManagement` (1)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (29.6ms) | Samples: 0

**Called by:**
- `internal:assert/assertion_error` (1)
- `loadAssertionError` (1)

**Calls:**
- `internal:assert/assertion_error` (1)
- `internal:util/inspect` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:32` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `assetToJson` (2)

### `partToJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:28` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `skinToJson` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:71` | Self: 0.0% (0us) | Total: 13.9% (661.5ms) | Samples: 0

**Called by:**
- `rasterAtlas` (93)

**Calls:**
- `map` (93)

### `Mesh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23031` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Object3D` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:51` | Self: 0.0% (0us) | Total: 0.3% (17.1ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `paletteUpdate` (2)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (35.0ms) | Samples: 0

**Called by:**
- `rasterAtlas` (5)

**Calls:**
- `(anonymous)` (5)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11785` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `generateUUID` (1)

### `rasterFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts:70` | Self: 0.0% (0us) | Total: 2.5% (120.5ms) | Samples: 0

**Called by:**
- `rasterAtlas` (18)

**Calls:**
- `hexToRgb` (15)
- `hexToRgb` (3)

### `paletteUpdate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts:49` | Self: 0.0% (0us) | Total: 97.6% (4.62s) | Samples: 0

**Called by:**
- `(module)` (601)
- `(module)` (2)

**Calls:**
- `update` (591)
- `update` (11)
- `update` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `skinToJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:23` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `partToJson` (2)

**Calls:**
- `bytesToBase64` (2)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 98.8% (4.68s) | Samples: 0

**Called by:**
- `moduleEvaluation` (611)

**Calls:**
- `(module)` (602)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 98.9% (4.68s) | Samples: 0

**Called by:**
- `(anonymous)` (611)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (611)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\modelAtlasResource.ts:28` | Self: 0.0% (0us) | Total: 2.0% (95.0ms) | Samples: 0

**Called by:**
- `paletteUpdate` (11)

**Calls:**
- `atlasKey` (6)
- `atlasKey` (5)

### `assetToJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:36` | Self: 0.0% (0us) | Total: 0.2% (13.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `map` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 76.0% | 3.60s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlasRaster.ts` |
| 15.7% | 745.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts` |
| 7.1% | 336.7ms | `[native code]` |
| 0.3% | 16.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts` |
| 0.3% | 15.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 0.3% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-atlas-resource.ts` |
| 0.0% | 2.7ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
