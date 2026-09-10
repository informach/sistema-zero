# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.52s | 187 | 1.0ms | 60 |

**Top 10:** `(anonymous)` 55.6%, `update` 14.6%, `gc` 7.1%, `dflt` 3.9%, `(anonymous)` 2.8%, `(anonymous)` 2.8%, `inflate_fast` 2.0%, `from` 1.1%, `structuredClone` 1.0%, `sample` 1.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 55.6% | 848.9ms | 55.6% | 848.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:95` |
| 14.6% | 223.7ms | 14.6% | 223.7ms | `update` | `[native code]` |
| 7.1% | 108.9ms | 7.1% | 108.9ms | `gc` | `[native code]` |
| 3.9% | 59.5ms | 3.9% | 59.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 2.8% | 43.8ms | 2.8% | 43.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 2.8% | 43.1ms | 2.8% | 43.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` |
| 2.0% | 31.3ms | 2.0% | 31.3ms | `inflate_fast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs` |
| 1.1% | 17.2ms | 100.0% | 1.81s | `from` | `[native code]` |
| 1.0% | 16.4ms | 1.0% | 16.4ms | `structuredClone` | `[native code]` |
| 1.0% | 16.3ms | 1.0% | 16.3ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 1.0% | 16.1ms | 1.0% | 16.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:23` |
| 1.0% | 15.5ms | 1.0% | 15.5ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:804` |
| 1.0% | 15.2ms | 1.0% | 15.2ms | `inflate_table` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2066` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `fetch` | `[native code]` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `resolve` | `[native code]` |
| 0.9% | 14.6ms | 0.9% | 14.6ms | `push` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3501` |
| 0.9% | 14.0ms | 0.9% | 14.0ms | `issue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:51` |
| 0.2% | 4.1ms | 0.2% | 4.1ms | `parseModule` | `[native code]` |
| 0.1% | 2.0ms | 3.3% | 51.3ms | `async (anonymous)` | `[native code]` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `inflate_fast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:1769` |
| 0.0% | 970us | 0.0% | 970us | `adler32` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:612` |
| 0.0% | 893us | 0.0% | 893us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:107` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 2.97s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 100.0% | 1.81s | 1.1% | 17.2ms | `from` | `[native code]` |
| 97.8% | 1.49s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.6% | 1.48s | 0.0% | 0us | `evaluate` | `[native code]` |
| 62.3% | 950.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:110` |
| 61.8% | 943.6ms | 0.0% | 0us | `map` | `[native code]` |
| 61.4% | 936.7ms | 0.0% | 0us | `convertGltfMaterials` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:156` |
| 61.4% | 936.7ms | 0.0% | 0us | `materialize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:74` |
| 55.6% | 848.9ms | 55.6% | 848.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:95` |
| 55.6% | 848.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:91` |
| 55.6% | 848.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:94` |
| 14.6% | 223.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:113` |
| 14.6% | 223.7ms | 14.6% | 223.7ms | `update` | `[native code]` |
| 14.6% | 223.7ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:78` |
| 12.3% | 188.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:102` |
| 7.1% | 108.9ms | 7.1% | 108.9ms | `gc` | `[native code]` |
| 7.1% | 108.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:108` |
| 5.2% | 80.6ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:59` |
| 5.2% | 80.6ms | 0.0% | 0us | `decodeGltfRasters` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfRasters.ts:81` |
| 4.9% | 75.1ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` |
| 4.9% | 75.1ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:25` |
| 4.2% | 64.2ms | 0.0% | 0us | `inflateGltfPng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:20` |
| 4.2% | 64.2ms | 0.0% | 0us | `decodeGltfPngPlan` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:21` |
| 3.9% | 59.5ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` |
| 3.9% | 59.5ms | 3.9% | 59.5ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 3.3% | 51.3ms | 0.1% | 2.0ms | `async (anonymous)` | `[native code]` |
| 3.2% | 49.5ms | 0.0% | 0us | `push` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3484` |
| 2.8% | 43.8ms | 2.8% | 43.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 2.8% | 43.1ms | 2.8% | 43.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` |
| 2.1% | 33.2ms | 0.0% | 0us | `inflate$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2792` |
| 2.1% | 32.5ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:21` |
| 2.0% | 31.3ms | 2.0% | 31.3ms | `inflate_fast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs` |
| 1.1% | 17.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 1.1% | 17.0ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 1.0% | 16.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:103` |
| 1.0% | 16.4ms | 1.0% | 16.4ms | `structuredClone` | `[native code]` |
| 1.0% | 16.3ms | 1.0% | 16.3ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 1.0% | 16.3ms | 0.0% | 0us | `decodeGltfPngPlan` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:22` |
| 1.0% | 16.1ms | 1.0% | 16.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:23` |
| 1.0% | 15.5ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` |
| 1.0% | 15.5ms | 1.0% | 15.5ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:804` |
| 1.0% | 15.4ms | 0.0% | 0us | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:79` |
| 1.0% | 15.2ms | 0.0% | 0us | `inflate$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2764` |
| 1.0% | 15.2ms | 1.0% | 15.2ms | `inflate_table` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2066` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `fetch` | `[native code]` |
| 0.9% | 15.0ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.9% | 15.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `resolve` | `[native code]` |
| 0.9% | 14.6ms | 0.9% | 14.6ms | `push` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3501` |
| 0.9% | 14.0ms | 0.9% | 14.0ms | `issue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:51` |
| 0.9% | 14.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:116` |
| 0.9% | 14.0ms | 0.0% | 0us | `convertGltfMaterials` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:40` |
| 0.2% | 4.1ms | 0.2% | 4.1ms | `parseModule` | `[native code]` |
| 0.2% | 4.0ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.1% | 2.0ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `inflate_fast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:1769` |
| 0.0% | 983us | 0.0% | 0us | `readGltfPngPixels` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:57` |
| 0.0% | 970us | 0.0% | 970us | `adler32` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:612` |
| 0.0% | 970us | 0.0% | 0us | `inflate$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3036` |
| 0.0% | 893us | 0.0% | 893us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:107` |

## Function Details

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:95` | Self: 55.6% (848.9ms) | Total: 55.6% (848.9ms) | Samples: 102

**Called by:**
- `from` (102)

### `update`
`[native code]` | Self: 14.6% (223.7ms) | Total: 14.6% (223.7ms) | Samples: 32

**Called by:**
- `digest` (32)

### `gc`
`[native code]` | Self: 7.1% (108.9ms) | Total: 7.1% (108.9ms) | Samples: 13

**Called by:**
- `(module)` (13)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` | Self: 3.9% (59.5ms) | Total: 3.9% (59.5ms) | Samples: 6

**Called by:**
- `zlibSync` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` | Self: 2.8% (43.8ms) | Total: 2.8% (43.8ms) | Samples: 4

**Called by:**
- `from` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:77` | Self: 2.8% (43.1ms) | Total: 2.8% (43.1ms) | Samples: 3

**Called by:**
- `from` (3)

### `inflate_fast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs` | Self: 2.0% (31.3ms) | Total: 2.0% (31.3ms) | Samples: 2

**Called by:**
- `inflate$1` (2)

### `from`
`[native code]` | Self: 1.1% (17.2ms) | Total: 100.0% (1.81s) | Samples: 5

**Called by:**
- `materialize` (110)
- `(anonymous)` (102)
- `fixture` (5)

**Calls:**
- `(anonymous)` (102)
- `(anonymous)` (102)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (1)

### `structuredClone`
`[native code]` | Self: 1.0% (16.4ms) | Total: 1.0% (16.4ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` | Self: 1.0% (16.3ms) | Total: 1.0% (16.3ms) | Samples: 2

**Called by:**
- `readGltfPngPixels` (1)
- `readGltfPngPixels` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:23` | Self: 1.0% (16.1ms) | Total: 1.0% (16.1ms) | Samples: 1

**Called by:**
- `from` (1)

### `p`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:804` | Self: 1.0% (15.5ms) | Total: 1.0% (15.5ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `inflate_table`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2066` | Self: 1.0% (15.2ms) | Total: 1.0% (15.2ms) | Samples: 1

**Called by:**
- `inflate$1` (1)

### `fetch`
`[native code]` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `resolve`
`[native code]` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3501` | Self: 0.9% (14.6ms) | Total: 0.9% (14.6ms) | Samples: 1

**Called by:**
- `inflateGltfPng` (1)

### `issue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:51` | Self: 0.9% (14.0ms) | Total: 0.9% (14.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `parseModule`
`[native code]` | Self: 0.2% (4.1ms) | Total: 0.2% (4.1ms) | Samples: 4

**Called by:**
- `async (anonymous)` (4)

### `async (anonymous)`
`[native code]` | Self: 0.1% (2.0ms) | Total: 3.3% (51.3ms) | Samples: 1

**Called by:**
- `requestInstantiate` (2)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (4)
- `resolve` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `inflate_fast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:1769` | Self: 0.1% (1.9ms) | Total: 0.1% (1.9ms) | Samples: 2

**Called by:**
- `inflate$1` (2)

### `adler32`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:612` | Self: 0.0% (970us) | Total: 0.0% (970us) | Samples: 1

**Called by:**
- `inflate$1` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:107` | Self: 0.0% (893us) | Total: 0.0% (893us) | Samples: 1

**Called by:**
- `evaluate` (1)

### `convertGltfMaterials`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:156` | Self: 0.0% (0us) | Total: 61.4% (936.7ms) | Samples: 0

**Called by:**
- `(module)` (110)

**Calls:**
- `materialize` (110)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:94` | Self: 0.0% (0us) | Total: 55.6% (848.9ms) | Samples: 0

**Called by:**
- `map` (102)

**Calls:**
- `from` (102)

### `materialize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:74` | Self: 0.0% (0us) | Total: 61.4% (936.7ms) | Samples: 0

**Called by:**
- `convertGltfMaterials` (110)

**Calls:**
- `from` (110)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` | Self: 0.0% (0us) | Total: 4.9% (75.1ms) | Samples: 0

**Called by:**
- `fixture` (7)

**Calls:**
- `zlibSync` (6)
- `zlibSync` (1)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` | Self: 0.0% (0us) | Total: 1.0% (15.5ms) | Samples: 0

**Called by:**
- `encodePng` (1)

**Calls:**
- `p` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.0ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (4.0ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (17.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (2)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (15.0ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (15.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `decodeGltfPngPlan`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:21` | Self: 0.0% (0us) | Total: 4.2% (64.2ms) | Samples: 0

**Called by:**
- `map` (7)

**Calls:**
- `inflateGltfPng` (7)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:78` | Self: 0.0% (0us) | Total: 14.6% (223.7ms) | Samples: 0

**Called by:**
- `(module)` (32)

**Calls:**
- `update` (32)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:21` | Self: 0.0% (0us) | Total: 2.1% (32.5ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `from` (5)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (17.0ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (2)

**Calls:**
- `async (anonymous)` (2)

### `inflate$1`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2764` | Self: 0.0% (0us) | Total: 1.0% (15.2ms) | Samples: 0

**Called by:**
- `push` (1)

**Calls:**
- `inflate_table` (1)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:79` | Self: 0.0% (0us) | Total: 1.0% (15.4ms) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (1)

**Calls:**
- `sample` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:25` | Self: 0.0% (0us) | Total: 4.9% (75.1ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `encodePng` (7)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (2.97s) | Samples: 0

**Called by:**
- `moduleEvaluation` (180)
- `async loadAndEvaluateModule` (180)

**Calls:**
- `evaluate` (180)
- `moduleEvaluation` (180)

### `inflate$1`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:2792` | Self: 0.0% (0us) | Total: 2.1% (33.2ms) | Samples: 0

**Called by:**
- `push` (4)

**Calls:**
- `inflate_fast` (2)
- `inflate_fast` (2)

### `inflate$1`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3036` | Self: 0.0% (0us) | Total: 0.0% (970us) | Samples: 0

**Called by:**
- `push` (1)

**Calls:**
- `adler32` (1)

### `inflateGltfPng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngInflate.ts:20` | Self: 0.0% (0us) | Total: 4.2% (64.2ms) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (7)

**Calls:**
- `push` (6)
- `push` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 61.8% (943.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (102)
- `decodeGltfRasters` (9)
- `convertGltfMaterials` (1)

**Calls:**
- `(anonymous)` (102)
- `decodeGltfPngPlan` (7)
- `decodeGltfPngPlan` (2)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:108` | Self: 0.0% (0us) | Total: 7.1% (108.9ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `gc` (13)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts:91` | Self: 0.0% (0us) | Total: 55.6% (848.9ms) | Samples: 0

**Called by:**
- `from` (102)

**Calls:**
- `map` (102)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:102` | Self: 0.0% (0us) | Total: 12.3% (188.3ms) | Samples: 0

**Called by:**
- `evaluate` (21)

**Calls:**
- `fixture` (9)
- `fixture` (7)
- `fixture` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:116` | Self: 0.0% (0us) | Total: 0.9% (14.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `issue` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:59` | Self: 0.0% (0us) | Total: 5.2% (80.6ms) | Samples: 0

**Called by:**
- `(module)` (9)

**Calls:**
- `decodeGltfRasters` (9)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:113` | Self: 0.0% (0us) | Total: 14.6% (223.7ms) | Samples: 0

**Called by:**
- `evaluate` (32)

**Calls:**
- `digest` (32)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` | Self: 0.0% (0us) | Total: 3.9% (59.5ms) | Samples: 0

**Called by:**
- `encodePng` (6)

**Calls:**
- `dflt` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:110` | Self: 0.0% (0us) | Total: 62.3% (950.7ms) | Samples: 0

**Called by:**
- `evaluate` (111)

**Calls:**
- `convertGltfMaterials` (110)
- `convertGltfMaterials` (1)

### `decodeGltfRasters`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfRasters.ts:81` | Self: 0.0% (0us) | Total: 5.2% (80.6ms) | Samples: 0

**Called by:**
- `fixture` (9)

**Calls:**
- `map` (9)

### `decodeGltfPngPlan`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPng.ts:22` | Self: 0.0% (0us) | Total: 1.0% (16.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `readGltfPngPixels` (1)
- `readGltfPngPixels` (1)

### `readGltfPngPixels`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts:57` | Self: 0.0% (0us) | Total: 0.0% (983us) | Samples: 0

**Called by:**
- `decodeGltfPngPlan` (1)

**Calls:**
- `sample` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts:103` | Self: 0.0% (0us) | Total: 1.0% (16.4ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `structuredClone` (2)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.6% (1.48s) | Samples: 0

**Called by:**
- `moduleEvaluation` (180)

**Calls:**
- `(module)` (111)
- `(module)` (32)
- `(module)` (21)
- `(module)` (13)
- `(module)` (2)
- `(module)` (1)

### `convertGltfMaterials`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts:40` | Self: 0.0% (0us) | Total: 0.9% (14.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs:3484` | Self: 0.0% (0us) | Total: 3.2% (49.5ms) | Samples: 0

**Called by:**
- `inflateGltfPng` (6)

**Calls:**
- `inflate$1` (4)
- `inflate$1` (1)
- `inflate$1` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.8% (1.49s) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (180)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 61.3% | 935.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfMaterialImages.ts` |
| 26.3% | 402.6ms | `[native code]` |
| 4.9% | 75.1ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 4.2% | 64.2ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\pako@3.0.1\node_modules\pako\dist\pako.mjs` |
| 1.1% | 17.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-gltf-materials.ts` |
| 1.0% | 16.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfPngPixels.ts` |
| 0.9% | 14.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\import\gltfNativeMaterials.ts` |
