# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 192.7ms | 25 | 1.0ms | 55 |

**Top 10:** `fetch` 13.0%, `moduleDeclarationInstantiation` 8.6%, `anonymous` 8.2%, `buildSphere` 8.1%, `shift` 8.0%, `normalize` 8.0%, `syncUvs` 7.9%, `paletteUpdate` 7.9%, `spatialGeometryHash` 7.8%, `(anonymous)` 7.3%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 13.0% | 25.0ms | 13.0% | 25.0ms | `fetch` | `[native code]` |
| 8.6% | 16.6ms | 8.6% | 16.6ms | `moduleDeclarationInstantiation` | `[native code]` |
| 8.2% | 15.9ms | 27.3% | 52.7ms | `anonymous` | `[native code]` |
| 8.1% | 15.7ms | 16.2% | 31.2ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` |
| 8.0% | 15.5ms | 8.0% | 15.5ms | `shift` | `internal:fixed_queue:44` |
| 8.0% | 15.5ms | 8.0% | 15.5ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 7.9% | 15.4ms | 7.9% | 15.4ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` |
| 7.9% | 15.2ms | 32.1% | 61.8ms | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:53` |
| 7.8% | 15.1ms | 7.8% | 15.1ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` |
| 7.3% | 14.1ms | 7.3% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:68` |
| 7.2% | 14.0ms | 7.2% | 14.0ms | `join` | `[native code]` |
| 3.6% | 7.0ms | 12.3% | 23.8ms | `parseModule` | `[native code]` |
| 1.7% | 3.3ms | 14.7% | 28.4ms | `requestInstantiate` | `[native code]` |
| 1.0% | 2.0ms | 1.0% | 2.0ms | `partSize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:38` |
| 0.5% | 987us | 0.5% | 987us | `@lazy` | `[native code]` |
| 0.4% | 885us | 0.4% | 885us | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 216.4ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 94.0% | 181.2ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 80.3% | 154.8ms | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 68.2% | 131.5ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 56.1% | 108.2ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 42.8% | 82.5ms | 0.0% | 0us | `link` | `[native code]` |
| 38.4% | 74.0ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 32.1% | 61.8ms | 7.9% | 15.2ms | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:53` |
| 32.1% | 61.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:62` |
| 27.3% | 52.7ms | 8.2% | 15.9ms | `anonymous` | `[native code]` |
| 24.0% | 46.3ms | 0.0% | 0us | `map` | `[native code]` |
| 16.6% | 32.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` |
| 16.6% | 32.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` |
| 16.2% | 31.2ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:284` |
| 16.2% | 31.2ms | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:117` |
| 16.2% | 31.2ms | 8.1% | 15.7ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` |
| 16.2% | 31.2ms | 0.0% | 0us | `PartGeometryResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` |
| 16.1% | 31.2ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:35` |
| 14.7% | 28.4ms | 1.7% | 3.3ms | `requestInstantiate` | `[native code]` |
| 14.7% | 28.4ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 13.0% | 25.0ms | 13.0% | 25.0ms | `fetch` | `[native code]` |
| 13.0% | 25.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 12.3% | 23.8ms | 3.6% | 7.0ms | `parseModule` | `[native code]` |
| 8.7% | 16.8ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 8.7% | 16.8ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 8.7% | 16.8ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 8.7% | 16.8ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 8.7% | 16.8ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 8.7% | 16.8ms | 0.0% | 0us | `assign` | `[native code]` |
| 8.7% | 16.8ms | 0.0% | 0us | `get` | `node:assert:70` |
| 8.6% | 16.6ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 8.6% | 16.6ms | 8.6% | 16.6ms | `moduleDeclarationInstantiation` | `[native code]` |
| 8.0% | 15.5ms | 8.0% | 15.5ms | `shift` | `internal:fixed_queue:44` |
| 8.0% | 15.5ms | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` |
| 8.0% | 15.5ms | 8.0% | 15.5ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 7.9% | 15.4ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:48` |
| 7.9% | 15.4ms | 7.9% | 15.4ms | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` |
| 7.8% | 15.1ms | 7.8% | 15.1ms | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` |
| 7.3% | 14.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:25` |
| 7.3% | 14.1ms | 0.0% | 0us | `atlasItems` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:65` |
| 7.3% | 14.1ms | 0.0% | 0us | `packAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:123` |
| 7.3% | 14.1ms | 7.3% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:68` |
| 7.2% | 14.0ms | 7.2% | 14.0ms | `join` | `[native code]` |
| 7.2% | 14.0ms | 0.0% | 0us | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` |
| 3.4% | 6.6ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 1.7% | 3.3ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 1.0% | 2.0ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 1.0% | 2.0ms | 1.0% | 2.0ms | `partSize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:38` |
| 1.0% | 2.0ms | 0.0% | 0us | `spatialGeometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:47` |
| 0.5% | 987us | 0.0% | 0us | `node:fs/promises` | `node:fs/promises:2` |
| 0.5% | 987us | 0.5% | 987us | `@lazy` | `[native code]` |
| 0.4% | 885us | 0.4% | 885us | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |
| 0.4% | 885us | 0.0% | 0us | `PartGeometryResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:29` |
| 0.4% | 885us | 0.0% | 0us | `mapFaceUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` |
| 0.4% | 885us | 0.0% | 0us | `syncUvs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:75` |

## Function Details

### `fetch`
`[native code]` | Self: 13.0% (25.0ms) | Total: 13.0% (25.0ms) | Samples: 2

**Called by:**
- `requestFetch` (2)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 8.6% (16.6ms) | Total: 8.6% (16.6ms) | Samples: 3

**Called by:**
- `link` (3)

### `anonymous`
`[native code]` | Self: 8.2% (15.9ms) | Total: 27.3% (52.7ms) | Samples: 2

**Called by:**
- `internal:assert/assertion_error` (3)
- `(anonymous)` (3)
- `loadAssertionError` (3)
- `node:fs` (2)

**Calls:**
- `internal:assert/assertion_error` (3)
- `internal:util/colors` (3)
- `node:fs` (2)
- `node:fs/promises` (1)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` | Self: 8.1% (15.7ms) | Total: 16.2% (31.2ms) | Samples: 1

**Called by:**
- `buildPartGeometry` (2)

**Calls:**
- `triangle` (1)

### `shift`
`internal:fixed_queue:44` | Self: 8.0% (15.5ms) | Total: 8.0% (15.5ms) | Samples: 1

**Called by:**
- `processTicksAndRejections` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 8.0% (15.5ms) | Total: 8.0% (15.5ms) | Samples: 1

**Called by:**
- `triangle` (1)

### `syncUvs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` | Self: 7.9% (15.4ms) | Total: 7.9% (15.4ms) | Samples: 1

**Called by:**
- `update` (1)

### `paletteUpdate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:53` | Self: 7.9% (15.2ms) | Total: 32.1% (61.8ms) | Samples: 1

**Called by:**
- `(module)` (6)

**Calls:**
- `update` (4)
- `update` (1)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:46` | Self: 7.8% (15.1ms) | Total: 7.8% (15.1ms) | Samples: 1

**Called by:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:68` | Self: 7.3% (14.1ms) | Total: 7.3% (14.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `join`
`[native code]` | Self: 7.2% (14.0ms) | Total: 7.2% (14.0ms) | Samples: 1

**Called by:**
- `spatialGeometryHash` (1)

### `parseModule`
`[native code]` | Self: 3.6% (7.0ms) | Total: 12.3% (23.8ms) | Samples: 5

**Called by:**
- `async (anonymous)` (8)

**Calls:**
- `node:assert` (3)

### `requestInstantiate`
`[native code]` | Self: 1.7% (3.3ms) | Total: 14.7% (28.4ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (3)

**Calls:**
- `async (anonymous)` (2)

### `partSize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:38` | Self: 1.0% (2.0ms) | Total: 1.0% (2.0ms) | Samples: 2

**Called by:**
- `spatialGeometryHash` (2)

### `@lazy`
`[native code]` | Self: 0.5% (987us) | Total: 0.5% (987us) | Samples: 1

**Called by:**
- `node:fs/promises` (1)

### `faceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` | Self: 0.4% (885us) | Total: 0.4% (885us) | Samples: 1

**Called by:**
- `mapFaceUv` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 24.0% (46.3ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `atlasItems` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `internal:util/colors` (3)

**Calls:**
- `(anonymous)` (3)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` | Self: 0.0% (0us) | Total: 7.2% (14.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `join` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:35` | Self: 0.0% (0us) | Total: 16.1% (31.2ms) | Samples: 0

**Called by:**
- `paletteUpdate` (4)

**Calls:**
- `spatialGeometryHash` (2)
- `spatialGeometryHash` (1)
- `spatialGeometryHash` (1)

### `packAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:123` | Self: 0.0% (0us) | Total: 7.3% (14.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `atlasItems` (1)

### `mapFaceUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` | Self: 0.0% (0us) | Total: 0.4% (885us) | Samples: 0

**Called by:**
- `syncUvs` (1)

**Calls:**
- `faceRegion` (1)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:117` | Self: 0.0% (0us) | Total: 16.2% (31.2ms) | Samples: 0

**Called by:**
- `PartGeometryResource` (2)

**Calls:**
- `buildPartGeometry` (2)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `refresh` (3)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `get` (3)

**Calls:**
- `anonymous` (3)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `assign` (3)

**Calls:**
- `loadAssertionError` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` | Self: 0.0% (0us) | Total: 16.6% (32.1ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `PartGeometryResource` (2)
- `PartGeometryResource` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:62` | Self: 0.0% (0us) | Total: 32.1% (61.8ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `paletteUpdate` (6)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `parseModule` (3)

**Calls:**
- `assign` (3)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 38.4% (74.0ms) | Samples: 0

**Called by:**
- `requestInstantiate` (2)
- `async (anonymous)` (2)
- `(anonymous)` (1)

**Calls:**
- `parseModule` (8)
- `requestFetch` (2)
- `async (anonymous)` (2)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (0us) | Total: 0.5% (987us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `@lazy` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 1.7% (3.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 3.4% (6.6ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 14.7% (28.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (3)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 42.8% (82.5ms) | Samples: 0

**Called by:**
- `link` (11)
- `linkAndEvaluateModule` (3)

**Calls:**
- `link` (11)
- `moduleDeclarationInstantiation` (3)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 13.0% (25.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `fetch` (2)

### `PartGeometryResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:29` | Self: 0.0% (0us) | Total: 0.4% (885us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `syncUvs` (1)

### `PartGeometryResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` | Self: 0.0% (0us) | Total: 16.2% (31.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `buildGeometry` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:25` | Self: 0.0% (0us) | Total: 7.3% (14.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `packAtlas` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:48` | Self: 0.0% (0us) | Total: 7.9% (15.4ms) | Samples: 0

**Called by:**
- `paletteUpdate` (1)

**Calls:**
- `syncUvs` (1)

### `syncUvs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:75` | Self: 0.0% (0us) | Total: 0.4% (885us) | Samples: 0

**Called by:**
- `PartGeometryResource` (1)

**Calls:**
- `mapFaceUv` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 80.3% (154.8ms) | Samples: 0

**Calls:**
- `(anonymous)` (15)
- `shift` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (216.4ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (10)
- `async loadAndEvaluateModule` (10)

**Calls:**
- `evaluate` (10)
- `moduleEvaluation` (10)

### `atlasItems`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:65` | Self: 0.0% (0us) | Total: 7.3% (14.1ms) | Samples: 0

**Called by:**
- `packAtlas` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 94.0% (181.2ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (15)
- `refresh` (3)
- `(anonymous)` (1)

**Calls:**
- `async loadAndEvaluateModule` (13)
- `anonymous` (3)
- `requestSatisfyUtil` (2)
- `(anonymous)` (1)
- `async (anonymous)` (1)

### `spatialGeometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:47` | Self: 0.0% (0us) | Total: 1.0% (2.0ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `partSize` (2)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` | Self: 0.0% (0us) | Total: 8.0% (15.5ms) | Samples: 0

**Called by:**
- `buildSphere` (1)

**Calls:**
- `normalize` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:284` | Self: 0.0% (0us) | Total: 16.2% (31.2ms) | Samples: 0

**Called by:**
- `buildGeometry` (2)

**Calls:**
- `buildSphere` (2)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 1.0% (2.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 8.6% (16.6ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (3)

**Calls:**
- `link` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:27` | Self: 0.0% (0us) | Total: 16.6% (32.1ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `map` (3)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 8.7% (16.8ms) | Samples: 0

**Called by:**
- `node:assert` (3)

**Calls:**
- `get` (3)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 56.1% (108.2ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (10)

**Calls:**
- `(module)` (6)
- `(module)` (3)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 68.2% (131.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (10)
- `linkAndEvaluateModule` (3)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 43.0% | 83.0ms | `[native code]` |
| 8.1% | 15.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 8.0% | 15.5ms | `internal:fixed_queue` |
| 8.0% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 7.9% | 15.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` |
| 7.9% | 15.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts` |
| 7.8% | 15.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` |
| 7.7% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts` |
| 1.0% | 2.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts` |
