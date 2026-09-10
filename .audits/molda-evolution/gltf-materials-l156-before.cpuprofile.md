# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 17.35s | 2276 | 1.0ms | 55 |

**Top 10:** `(anonymous)` 49.9%, `(anonymous)` 30.5%, `(anonymous)` 8.4%, `(anonymous)` 7.1%, `update` 1.2%, `gc` 0.5%, `gltfLinearToSrgb` 0.3%, `dflt` 0.3%, `(anonymous)` 0.2%, `from` 0.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 49.9% | 8.67s | 49.9% | 8.67s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` |
| 30.5% | 5.30s | 30.5% | 5.30s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:85` |
| 8.4% | 1.46s | 8.4% | 1.46s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 7.1% | 1.24s | 7.1% | 1.24s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:81` |
| 1.2% | 223.1ms | 1.2% | 223.1ms | `update` | `[native code]` |
| 0.5% | 88.1ms | 0.5% | 88.1ms | `gc` | `[native code]` |
| 0.3% | 63.3ms | 0.3% | 63.3ms | `gltfLinearToSrgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialConversionTypes.ts:20` |
| 0.3% | 60.5ms | 0.3% | 60.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.2% | 49.2ms | 0.7% | 126.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:90` |
| 0.1% | 31.0ms | 97.0% | 16.85s | `from` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:80` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:51` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `zero$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:8` |
| 0.0% | 15.3ms | 0.0% | 15.3ms | `anonymous` | `[native code]` |
| 0.0% | 15.0ms | 0.0% | 15.8ms | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:57` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:103` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `set` | `[native code]` |
| 0.0% | 13.8ms | 0.0% | 13.8ms | `srgbToLinear` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:42` |
| 0.0% | 12.8ms | 0.2% | 47.9ms | `async (anonymous)` | `[native code]` |
| 0.0% | 6.8ms | 0.1% | 22.1ms | `parseModule` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 0.0% | 983us | 0.0% | 983us | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |
| 0.0% | 967us | 0.0% | 1.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 34.70s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.7% | 17.32s | 0.0% | 0us | `evaluate` | `[native code]` |
| 99.7% | 17.32s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.0% | 16.85s | 0.1% | 31.0ms | `from` | `[native code]` |
| 96.9% | 16.82s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:110` |
| 96.9% | 16.82s | 0.0% | 0us | `convertGltfMaterials` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:156` |
| 96.9% | 16.82s | 0.0% | 0us | `materialize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:74` |
| 49.9% | 8.67s | 49.9% | 8.67s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` |
| 30.5% | 5.30s | 30.5% | 5.30s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:85` |
| 8.4% | 1.46s | 8.4% | 1.46s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 7.1% | 1.24s | 7.1% | 1.24s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:81` |
| 1.2% | 223.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:113` |
| 1.2% | 223.1ms | 1.2% | 223.1ms | `update` | `[native code]` |
| 1.2% | 223.1ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:78` |
| 0.9% | 172.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:102` |
| 0.7% | 126.5ms | 0.2% | 49.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:90` |
| 0.5% | 88.1ms | 0.5% | 88.1ms | `gc` | `[native code]` |
| 0.5% | 88.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:108` |
| 0.4% | 77.9ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` |
| 0.4% | 77.9ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:25` |
| 0.4% | 77.9ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` |
| 0.3% | 63.5ms | 0.0% | 0us | `map` | `[native code]` |
| 0.3% | 63.5ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:59` |
| 0.3% | 63.5ms | 0.0% | 0us | `decodeGltfRasters` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfRasters.ts:81` |
| 0.3% | 63.3ms | 0.3% | 63.3ms | `gltfLinearToSrgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialConversionTypes.ts:20` |
| 0.3% | 60.5ms | 0.3% | 60.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.2% | 48.6ms | 0.0% | 0us | `decodeGltfPngPlan` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:22` |
| 0.2% | 47.9ms | 0.0% | 12.8ms | `async (anonymous)` | `[native code]` |
| 0.1% | 31.0ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:21` |
| 0.1% | 22.1ms | 0.0% | 6.8ms | `parseModule` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:80` |
| 0.0% | 15.8ms | 0.0% | 15.0ms | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:57` |
| 0.0% | 15.7ms | 0.0% | 0us | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:78` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:51` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `zero$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:8` |
| 0.0% | 15.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:141` |
| 0.0% | 15.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\jpeg-js@0.4.4\node_modules\jpeg-js\index.js:2` |
| 0.0% | 15.3ms | 0.0% | 15.3ms | `anonymous` | `[native code]` |
| 0.0% | 15.3ms | 0.0% | 0us | `require` | `[native code]` |
| 0.0% | 15.3ms | 0.0% | 0us | `bound require` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:103` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `set` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 0us | `inflateGltfPng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:20` |
| 0.0% | 14.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:15` |
| 0.0% | 14.9ms | 0.0% | 0us | `push` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3501` |
| 0.0% | 14.9ms | 0.0% | 0us | `decodeGltfPngPlan` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:21` |
| 0.0% | 13.8ms | 0.0% | 13.8ms | `srgbToLinear` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:42` |
| 0.0% | 12.8ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 12.8ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.0% | 12.8ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 967us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:79` |
| 0.0% | 983us | 0.0% | 983us | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |

## Function Details

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` | Self: 49.9% (8.67s) | Total: 49.9% (8.67s) | Samples: 1141

**Called by:**
- `from` (1141)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:85` | Self: 30.5% (5.30s) | Total: 30.5% (5.30s) | Samples: 707

**Called by:**
- `from` (707)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` | Self: 8.4% (1.46s) | Total: 8.4% (1.46s) | Samples: 199

**Called by:**
- `from` (199)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:81` | Self: 7.1% (1.24s) | Total: 7.1% (1.24s) | Samples: 152

**Called by:**
- `from` (152)

### `update`
`[native code]` | Self: 1.2% (223.1ms) | Total: 1.2% (223.1ms) | Samples: 27

**Called by:**
- `digest` (27)

### `gc`
`[native code]` | Self: 0.5% (88.1ms) | Total: 0.5% (88.1ms) | Samples: 11

**Called by:**
- `(module)` (11)

### `gltfLinearToSrgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialConversionTypes.ts:20` | Self: 0.3% (63.3ms) | Total: 0.3% (63.3ms) | Samples: 9

**Called by:**
- `(anonymous)` (9)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` | Self: 0.3% (60.5ms) | Total: 0.3% (60.5ms) | Samples: 5

**Called by:**
- `zlibSync` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:90` | Self: 0.2% (49.2ms) | Total: 0.7% (126.5ms) | Samples: 6

**Called by:**
- `from` (16)

**Calls:**
- `gltfLinearToSrgb` (9)
- `srgbToLinear` (1)

### `from`
`[native code]` | Self: 0.1% (31.0ms) | Total: 97.0% (16.85s) | Samples: 2

**Called by:**
- `materialize` (2216)
- `fixture` (2)

**Calls:**
- `(anonymous)` (1141)
- `(anonymous)` (707)
- `(anonymous)` (199)
- `(anonymous)` (152)
- `(anonymous)` (16)
- `(anonymous)` (1)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:80` | Self: 0.0% (15.9ms) | Total: 0.0% (15.9ms) | Samples: 1

**Called by:**
- `decodeGltfPngPlan` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:51` | Self: 0.0% (15.7ms) | Total: 0.0% (15.7ms) | Samples: 1

**Called by:**
- `readGltfPngPixels` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` | Self: 0.0% (15.5ms) | Total: 0.0% (15.5ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `zero$1`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:8` | Self: 0.0% (15.4ms) | Total: 0.0% (15.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `anonymous`
`[native code]` | Self: 0.0% (15.3ms) | Total: 0.0% (15.3ms) | Samples: 1

**Called by:**
- `require` (1)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:57` | Self: 0.0% (15.0ms) | Total: 0.0% (15.8ms) | Samples: 1

**Called by:**
- `decodeGltfPngPlan` (2)

**Calls:**
- `sample` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:103` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `from` (1)

### `set`
`[native code]` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `srgbToLinear`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:42` | Self: 0.0% (13.8ms) | Total: 0.0% (13.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (12.8ms) | Total: 0.2% (47.9ms) | Samples: 1

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (4)
- `async (anonymous)` (1)

### `parseModule`
`[native code]` | Self: 0.0% (6.8ms) | Total: 0.1% (22.1ms) | Samples: 3

**Called by:**
- `async (anonymous)` (4)

**Calls:**
- `(anonymous)` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `readGltfPngPixels` (1)
- `readGltfPngPixels` (1)

### `hsh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` | Self: 0.0% (983us) | Total: 0.0% (983us) | Samples: 1

**Called by:**
- `dflt` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` | Self: 0.0% (967us) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `zlibSync` (2)

**Calls:**
- `hsh` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (63.5ms) | Samples: 0

**Called by:**
- `decodeGltfRasters` (6)

**Calls:**
- `decodeGltfPngPlan` (5)
- `decodeGltfPngPlan` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:113` | Self: 0.0% (0us) | Total: 1.2% (223.1ms) | Samples: 0

**Called by:**
- `evaluate` (27)

**Calls:**
- `digest` (27)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:102` | Self: 0.0% (0us) | Total: 0.9% (172.6ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `fixture` (8)
- `fixture` (6)
- `fixture` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:141` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `zero$1` (1)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:78` | Self: 0.0% (0us) | Total: 0.0% (15.7ms) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (1)

**Calls:**
- `sample` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\jpeg-js@0.4.4\node_modules\jpeg-js\index.js:2` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:21` | Self: 0.0% (0us) | Total: 0.1% (31.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `from` (2)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (12.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `decodeGltfPngPlan`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:21` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `inflateGltfPng` (1)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:78` | Self: 0.0% (0us) | Total: 1.2% (223.1ms) | Samples: 0

**Called by:**
- `(module)` (27)

**Calls:**
- `update` (27)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:79` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (1)

**Calls:**
- `sample` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:25` | Self: 0.0% (0us) | Total: 0.4% (77.9ms) | Samples: 0

**Called by:**
- `(module)` (8)

**Calls:**
- `encodePng` (8)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (34.70s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2275)
- `async loadAndEvaluateModule` (2271)

**Calls:**
- `moduleEvaluation` (2275)
- `evaluate` (2271)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `bound require` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (12.8ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` | Self: 0.0% (0us) | Total: 0.4% (77.9ms) | Samples: 0

**Called by:**
- `fixture` (8)

**Calls:**
- `zlibSync` (8)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:108` | Self: 0.0% (0us) | Total: 0.5% (88.1ms) | Samples: 0

**Called by:**
- `evaluate` (11)

**Calls:**
- `gc` (11)

### `materialize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:74` | Self: 0.0% (0us) | Total: 96.9% (16.82s) | Samples: 0

**Called by:**
- `convertGltfMaterials` (2216)

**Calls:**
- `from` (2216)

### `convertGltfMaterials`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:156` | Self: 0.0% (0us) | Total: 96.9% (16.82s) | Samples: 0

**Called by:**
- `(module)` (2216)

**Calls:**
- `materialize` (2216)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:110` | Self: 0.0% (0us) | Total: 96.9% (16.82s) | Samples: 0

**Called by:**
- `evaluate` (2216)

**Calls:**
- `convertGltfMaterials` (2216)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (12.8ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:15` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `push` (1)

**Calls:**
- `set` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3501` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `inflateGltfPng` (1)

**Calls:**
- `(anonymous)` (1)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` | Self: 0.0% (0us) | Total: 0.4% (77.9ms) | Samples: 0

**Called by:**
- `encodePng` (8)

**Calls:**
- `dflt` (5)
- `dflt` (2)
- `dflt` (1)

### `inflateGltfPng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:20` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (1)

**Calls:**
- `push` (1)

### `decodeGltfRasters`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfRasters.ts:81` | Self: 0.0% (0us) | Total: 0.3% (63.5ms) | Samples: 0

**Called by:**
- `fixture` (6)

**Calls:**
- `map` (6)

### `decodeGltfPngPlan`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:22` | Self: 0.0% (0us) | Total: 0.2% (48.6ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `readGltfPngPixels` (2)
- `readGltfPngPixels` (1)
- `readGltfPngPixels` (1)
- `readGltfPngPixels` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `require` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (17.32s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2271)

**Calls:**
- `(module)` (2216)
- `(module)` (27)
- `(module)` (16)
- `(module)` (11)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (17.32s) | Samples: 0

**Calls:**
- `moduleEvaluation` (2271)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:59` | Self: 0.0% (0us) | Total: 0.3% (63.5ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `decodeGltfRasters` (6)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 96.4% | 16.74s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 2.2% | 392.3ms | `[native code]` |
| 0.4% | 77.9ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.3% | 63.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialConversionTypes.ts` |
| 0.2% | 48.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 0.0% | 15.4ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs` |
| 0.0% | 13.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts` |
