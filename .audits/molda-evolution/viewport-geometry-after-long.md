# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.99s | 239 | 1.0ms | 61 |

**Top 10:** `join` 71.3%, `update` 6.9%, `update` 5.4%, `spatialGeometryHash` 1.7%, `syncUvs` 1.6%, `parseModule` 1.5%, `spatialGeometryHash` 1.5%, `SRGBToLinear` 0.8%, `faceRegion` 0.8%, `triangle` 0.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 71.3% | 1.42s | 71.3% | 1.42s | `join` | `[native code]` |
| 6.9% | 138.3ms | 9.4% | 187.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:48` |
| 5.4% | 109.2ms | 82.0% | 1.63s | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:35` |
| 1.7% | 34.6ms | 23.4% | 467.0ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` |
| 1.6% | 33.6ms | 1.6% | 33.6ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` |
| 1.5% | 31.7ms | 2.3% | 47.1ms | `parseModule` | `[native code]` |
| 1.5% | 31.7ms | 1.5% | 31.7ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:54` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `SRGBToLinear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 16.0ms | 0.8% | 16.0ms | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:53` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `fetch` | `[native code]` |
| 0.7% | 15.3ms | 4.6% | 92.1ms | `anonymous` | `[native code]` |
| 0.7% | 15.0ms | 92.2% | 1.83s | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:66` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:67` |
| 0.6% | 13.7ms | 29.3% | 584.2ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:52` |
| 0.6% | 13.2ms | 1.2% | 24.8ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` |
| 0.6% | 13.1ms | 0.6% | 13.1ms | `sort` | `[native code]` |
| 0.5% | 11.6ms | 0.5% | 11.6ms | `partCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:45` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.90s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 100.0% | 1.99s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 98.4% | 1.96s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 96.8% | 1.93s | 0.0% | 0us | `evaluate` | `[native code]` |
| 96.8% | 1.93s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 92.2% | 1.83s | 0.7% | 15.0ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:66` |
| 91.4% | 1.82s | 0.0% | 0us | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:53` |
| 82.0% | 1.63s | 5.4% | 109.2ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:35` |
| 71.3% | 1.42s | 71.3% | 1.42s | `join` | `[native code]` |
| 29.3% | 584.2ms | 0.6% | 13.7ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:52` |
| 23.4% | 467.0ms | 1.7% | 34.6ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` |
| 9.4% | 187.6ms | 6.9% | 138.3ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:48` |
| 4.6% | 92.1ms | 0.7% | 15.3ms | `anonymous` | `[native code]` |
| 3.9% | 78.1ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 2.3% | 47.7ms | 0.0% | 0us | `map` | `[native code]` |
| 2.3% | 47.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` |
| 2.3% | 47.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` |
| 2.3% | 47.1ms | 1.5% | 31.7ms | `parseModule` | `[native code]` |
| 1.6% | 33.6ms | 1.6% | 33.6ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` |
| 1.5% | 31.7ms | 0.0% | 0us | `PartGeometryResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` |
| 1.5% | 31.7ms | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:117` |
| 1.5% | 31.7ms | 0.0% | 0us | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:241` |
| 1.5% | 31.7ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` |
| 1.5% | 31.7ms | 1.5% | 31.7ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:54` |
| 1.2% | 24.8ms | 0.6% | 13.2ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` |
| 0.8% | 16.1ms | 0.0% | 0us | `MeshBasicMaterial` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22790` |
| 0.8% | 16.1ms | 0.0% | 0us | `convert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6709` |
| 0.8% | 16.1ms | 0.0% | 0us | `Color` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13958` |
| 0.8% | 16.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `SRGBToLinear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 16.1ms | 0.0% | 0us | `Mesh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` |
| 0.8% | 16.1ms | 0.0% | 0us | `set` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13985` |
| 0.8% | 16.1ms | 0.0% | 0us | `setHex` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:14034` |
| 0.8% | 16.0ms | 0.0% | 0us | `mapFaceUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` |
| 0.8% | 16.0ms | 0.0% | 0us | `PartGeometryResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:29` |
| 0.8% | 16.0ms | 0.8% | 16.0ms | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |
| 0.8% | 16.0ms | 0.0% | 0us | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:75` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.7% | 15.8ms | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:82` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:53` |
| 0.7% | 15.5ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.7% | 15.5ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.7% | 15.5ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `fetch` | `[native code]` |
| 0.7% | 15.3ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.7% | 15.3ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.7% | 15.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.7% | 15.3ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.7% | 15.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.7% | 15.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.7% | 15.3ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.7% | 15.3ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.7% | 15.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.7% | 15.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.7% | 15.3ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:67` |
| 0.6% | 13.1ms | 0.6% | 13.1ms | `sort` | `[native code]` |
| 0.6% | 13.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:71` |
| 0.5% | 11.6ms | 0.5% | 11.6ms | `partCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:45` |
| 0.5% | 11.6ms | 0.0% | 0us | `partPivot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\transform.ts:13` |

## Function Details

### `join`
`[native code]` | Self: 71.3% (1.42s) | Total: 71.3% (1.42s) | Samples: 182

**Called by:**
- `spatialGeometryHash` (69)
- `spatialGeometryHash` (67)
- `update` (46)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:48` | Self: 6.9% (138.3ms) | Total: 9.4% (187.6ms) | Samples: 15

**Called by:**
- `paletteUpdate` (23)

**Calls:**
- `syncUvs` (7)
- `syncUvs` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:35` | Self: 5.4% (109.2ms) | Total: 82.0% (1.63s) | Samples: 9

**Called by:**
- `paletteUpdate` (205)

**Calls:**
- `spatialGeometryHash` (72)
- `spatialGeometryHash` (71)
- `join` (46)
- `spatialGeometryHash` (5)
- `spatialGeometryHash` (2)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` | Self: 1.7% (34.6ms) | Total: 23.4% (467.0ms) | Samples: 5

**Called by:**
- `update` (72)

**Calls:**
- `join` (67)

### `syncUvs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` | Self: 1.6% (33.6ms) | Total: 1.6% (33.6ms) | Samples: 7

**Called by:**
- `update` (7)

### `parseModule`
`[native code]` | Self: 1.5% (31.7ms) | Total: 2.3% (47.1ms) | Samples: 2

**Called by:**
- `async (anonymous)` (3)

**Calls:**
- `node:assert` (1)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:54` | Self: 1.5% (31.7ms) | Total: 1.5% (31.7ms) | Samples: 5

**Called by:**
- `update` (5)

### `SRGBToLinear`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.8% (16.1ms) | Total: 0.8% (16.1ms) | Samples: 1

**Called by:**
- `convert` (1)

### `faceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` | Self: 0.8% (16.0ms) | Total: 0.8% (16.0ms) | Samples: 1

**Called by:**
- `mapFaceUv` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` | Self: 0.7% (15.9ms) | Total: 0.7% (15.9ms) | Samples: 1

**Called by:**
- `buildSphere` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 1

**Called by:**
- `triangle` (1)

### `syncUvs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:53` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `update` (1)

### `fetch`
`[native code]` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `anonymous`
`[native code]` | Self: 0.7% (15.3ms) | Total: 4.6% (92.1ms) | Samples: 1

**Called by:**
- `internal:assert/assertion_error` (1)
- `loadAssertionError` (1)
- `internal:fs/streams` (1)
- `node:stream` (1)
- `get WriteStream` (1)
- `internal:stream` (1)

**Calls:**
- `internal:assert/assertion_error` (1)
- `internal:util/colors` (1)
- `internal:fs/streams` (1)
- `node:stream` (1)
- `internal:stream` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:66` | Self: 0.7% (15.0ms) | Total: 92.2% (1.83s) | Samples: 1

**Called by:**
- `evaluate` (229)

**Calls:**
- `paletteUpdate` (228)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:67` | Self: 0.7% (14.8ms) | Total: 0.7% (14.8ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:52` | Self: 0.6% (13.7ms) | Total: 29.3% (584.2ms) | Samples: 2

**Called by:**
- `update` (71)

**Calls:**
- `join` (69)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` | Self: 0.6% (13.2ms) | Total: 1.2% (24.8ms) | Samples: 1

**Called by:**
- `update` (2)

**Calls:**
- `partPivot` (1)

### `sort`
`[native code]` | Self: 0.6% (13.1ms) | Total: 0.6% (13.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `partCenter`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:45` | Self: 0.5% (11.6ms) | Total: 0.5% (11.6ms) | Samples: 1

**Called by:**
- `partPivot` (1)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:117` | Self: 0.0% (0us) | Total: 1.5% (31.7ms) | Samples: 0

**Called by:**
- `PartGeometryResource` (2)

**Calls:**
- `buildPartGeometry` (2)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `Color`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13958` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `MeshBasicMaterial` (1)

**Calls:**
- `set` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` | Self: 0.0% (0us) | Total: 2.3% (47.7ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `PartGeometryResource` (2)
- `PartGeometryResource` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `assign` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Mesh` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (1.99s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (237)
- `refresh` (1)

**Calls:**
- `async loadAndEvaluateModule` (235)
- `async (anonymous)` (2)
- `get WriteStream` (1)
- `requestSatisfyUtil` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:71` | Self: 0.0% (0us) | Total: 0.6% (13.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `sort` (1)

### `paletteUpdate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:53` | Self: 0.0% (0us) | Total: 91.4% (1.82s) | Samples: 0

**Called by:**
- `(module)` (228)

**Calls:**
- `update` (205)
- `update` (23)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 2.3% (47.7ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `(anonymous)` (3)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 3.9% (78.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (3)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `syncUvs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:75` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `PartGeometryResource` (1)

**Calls:**
- `mapFaceUv` (1)

### `setHex`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:14034` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `set` (1)

**Calls:**
- `convert` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `convert`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6709` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `setHex` (1)

**Calls:**
- `SRGBToLinear` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `PartGeometryResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` | Self: 0.0% (0us) | Total: 1.5% (31.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `buildGeometry` (2)

### `MeshBasicMaterial`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22790` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `Mesh` (1)

**Calls:**
- `Color` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `PartGeometryResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:29` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `syncUvs` (1)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:241` | Self: 0.0% (0us) | Total: 1.5% (31.7ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (2)

**Calls:**
- `triangle` (1)
- `triangle` (1)

### `mapFaceUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `syncUvs` (1)

**Calls:**
- `faceRegion` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 98.4% (1.96s) | Samples: 0

**Calls:**
- `(anonymous)` (237)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.90s) | Samples: 0

**Called by:**
- `moduleEvaluation` (238)
- `async loadAndEvaluateModule` (235)

**Calls:**
- `moduleEvaluation` (238)
- `evaluate` (235)

### `set`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13985` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `Color` (1)

**Calls:**
- `setHex` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anonymous` (1)

### `partPivot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\transform.ts:13` | Self: 0.0% (0us) | Total: 0.5% (11.6ms) | Samples: 0

**Called by:**
- `spatialGeometryHash` (1)

**Calls:**
- `partCenter` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:82` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `buildSphere` (1)

**Calls:**
- `cross` (1)

### `Mesh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `MeshBasicMaterial` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` | Self: 0.0% (0us) | Total: 2.3% (47.7ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `map` (3)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` | Self: 0.0% (0us) | Total: 1.5% (31.7ms) | Samples: 0

**Called by:**
- `buildGeometry` (2)

**Calls:**
- `buildSphere` (2)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 96.8% (1.93s) | Samples: 0

**Called by:**
- `moduleEvaluation` (235)

**Calls:**
- `(module)` (229)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 96.8% (1.93s) | Samples: 0

**Called by:**
- `(anonymous)` (235)

**Calls:**
- `moduleEvaluation` (235)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 75.1% | 1.49s | `[native code]` |
| 14.8% | 296.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` |
| 4.6% | 93.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` |
| 1.4% | 29.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts` |
| 0.8% | 16.1ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 16.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts` |
| 0.7% | 15.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.7% | 15.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.5% | 11.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts` |
