# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 5.06s | 610 | 1.0ms | 131 |

**Top 10:** `indexSceneDocument` 26.9%, `prepareSceneGeometryUv` 10.0%, `prepareSceneGeometryUv` 9.0%, `prepareSceneGeometryUv` 8.5%, `prepareSceneGeometryUv` 6.9%, `entries` 4.0%, `indexSceneDocument` 3.9%, `prepareSceneGeometryUv` 3.5%, `prepareSceneGeometryUv` 2.8%, `prepareSceneGeometryUv` 2.6%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 26.9% | 1.36s | 26.9% | 1.36s | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 10.0% | 511.5ms | 10.0% | 511.5ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:34` |
| 9.0% | 459.8ms | 9.0% | 459.8ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:35` |
| 8.5% | 434.8ms | 8.5% | 434.8ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:56` |
| 6.9% | 350.9ms | 6.9% | 350.9ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:55` |
| 4.0% | 206.7ms | 4.0% | 206.7ms | `entries` | `[native code]` |
| 3.9% | 198.0ms | 3.9% | 198.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 3.5% | 181.0ms | 3.5% | 181.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:43` |
| 2.8% | 143.7ms | 2.8% | 143.7ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:27` |
| 2.6% | 136.0ms | 2.6% | 136.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:60` |
| 1.8% | 96.0ms | 1.8% | 96.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:70` |
| 1.8% | 91.5ms | 1.8% | 91.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` |
| 1.5% | 80.7ms | 1.5% | 80.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` |
| 1.3% | 67.1ms | 1.3% | 67.1ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:58` |
| 1.2% | 65.6ms | 1.2% | 65.6ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:28` |
| 1.2% | 61.0ms | 1.2% | 61.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:31` |
| 1.1% | 59.2ms | 1.1% | 59.2ms | `push` | `[native code]` |
| 0.9% | 48.4ms | 0.9% | 48.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` |
| 0.8% | 42.8ms | 4.9% | 249.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:23` |
| 0.5% | 30.1ms | 0.5% | 30.1ms | `resolve` | `[native code]` |
| 0.5% | 30.0ms | 7.0% | 357.4ms | `map` | `[native code]` |
| 0.3% | 16.5ms | 0.3% | 16.5ms | `Set` | `[native code]` |
| 0.3% | 16.4ms | 0.3% | 16.4ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.3% | 16.3ms | 1.2% | 65.3ms | `anonymous` | `[native code]` |
| 0.3% | 15.7ms | 0.3% | 15.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.3% | 15.6ms | 2.8% | 144.8ms | `some` | `[native code]` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.2% | 15.1ms | 0.2% | 15.1ms | `flatMap` | `[native code]` |
| 0.2% | 15.0ms | 0.2% | 15.0ms | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15748` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.2% | 14.8ms | 0.2% | 14.8ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:61` |
| 0.2% | 14.6ms | 0.5% | 30.1ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.2% | 14.6ms | 0.8% | 42.5ms | `every` | `[native code]` |
| 0.2% | 14.2ms | 0.2% | 14.2ms | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` |
| 0.2% | 14.0ms | 0.2% | 14.0ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.2% | 13.2ms | 0.2% | 13.2ms | `isFinite` | `[native code]` |
| 0.2% | 13.2ms | 0.2% | 13.2ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:185` |
| 0.2% | 12.3ms | 3.1% | 157.2ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` |
| 0.2% | 11.9ms | 0.2% | 11.9ms | `invert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.2% | 11.8ms | 0.8% | 43.5ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.1% | 8.9ms | 0.4% | 22.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.0% | 4.0ms | 0.4% | 20.3ms | `parseModule` | `[native code]` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `hasOwn` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `cacheSatisfy` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flatIntoArray` | `[native code]` |
| 0.0% | 990us | 0.0% | 990us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.0% | 989us | 0.0% | 989us | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` |
| 0.0% | 969us | 0.0% | 969us | `get` | `[native code]` |
| 0.0% | 969us | 0.0% | 969us | `stringify` | `[native code]` |
| 0.0% | 943us | 0.0% | 943us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:354` |
| 0.0% | 927us | 0.0% | 927us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.0% | 919us | 0.0% | 919us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 919us | 0.0% | 919us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:166` |
| 0.0% | 918us | 0.0% | 918us | `set` | `[native code]` |
| 0.0% | 892us | 0.0% | 892us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.0% | 876us | 0.0% | 876us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 875us | 0.0% | 875us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.0% | 869us | 0.0% | 869us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:370` |
| 0.0% | 846us | 0.0% | 846us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:64` |
| 0.0% | 842us | 0.0% | 842us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 10.03s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 98.9% | 5.01s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 98.9% | 5.01s | 0.0% | 0us | `evaluate` | `[native code]` |
| 90.8% | 4.60s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:51` |
| 52.8% | 2.68s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:178` |
| 37.5% | 1.90s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:157` |
| 26.9% | 1.36s | 26.9% | 1.36s | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 10.0% | 511.5ms | 10.0% | 511.5ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:34` |
| 9.0% | 459.8ms | 9.0% | 459.8ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:35` |
| 8.5% | 434.8ms | 8.5% | 434.8ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:56` |
| 7.0% | 357.4ms | 0.5% | 30.0ms | `map` | `[native code]` |
| 6.9% | 350.9ms | 6.9% | 350.9ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:55` |
| 5.0% | 257.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:50` |
| 4.9% | 249.6ms | 0.8% | 42.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:23` |
| 4.4% | 227.3ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:183` |
| 4.0% | 206.7ms | 4.0% | 206.7ms | `entries` | `[native code]` |
| 3.9% | 198.0ms | 3.9% | 198.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 3.5% | 181.0ms | 3.5% | 181.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:43` |
| 3.1% | 157.2ms | 0.2% | 12.3ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` |
| 2.8% | 144.8ms | 0.3% | 15.6ms | `some` | `[native code]` |
| 2.8% | 143.7ms | 2.8% | 143.7ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:27` |
| 2.6% | 136.0ms | 2.6% | 136.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:60` |
| 2.4% | 124.9ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 2.4% | 123.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:46` |
| 2.1% | 107.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:323` |
| 1.8% | 96.0ms | 1.8% | 96.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:70` |
| 1.8% | 91.5ms | 1.8% | 91.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` |
| 1.5% | 80.7ms | 1.5% | 80.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` |
| 1.5% | 80.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 1.3% | 67.1ms | 1.3% | 67.1ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:58` |
| 1.2% | 65.6ms | 1.2% | 65.6ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:28` |
| 1.2% | 65.3ms | 0.3% | 16.3ms | `anonymous` | `[native code]` |
| 1.2% | 63.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 1.2% | 61.0ms | 1.2% | 61.0ms | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:31` |
| 1.1% | 59.2ms | 1.1% | 59.2ms | `push` | `[native code]` |
| 0.9% | 50.5ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.9% | 48.4ms | 0.9% | 48.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` |
| 0.9% | 48.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.8% | 43.5ms | 0.2% | 11.8ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.8% | 42.5ms | 0.2% | 14.6ms | `every` | `[native code]` |
| 0.5% | 30.1ms | 0.2% | 14.6ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.5% | 30.1ms | 0.5% | 30.1ms | `resolve` | `[native code]` |
| 0.5% | 29.6ms | 0.0% | 0us | `from` | `[native code]` |
| 0.5% | 26.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` |
| 0.5% | 26.3ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.4% | 22.1ms | 0.1% | 8.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.4% | 20.3ms | 0.0% | 4.0ms | `parseModule` | `[native code]` |
| 0.3% | 16.8ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:346` |
| 0.3% | 16.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` |
| 0.3% | 16.5ms | 0.3% | 16.5ms | `Set` | `[native code]` |
| 0.3% | 16.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:31` |
| 0.3% | 16.4ms | 0.3% | 16.4ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.3% | 16.4ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:10` |
| 0.3% | 16.3ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.3% | 16.3ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.3% | 16.3ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.3% | 16.3ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.3% | 16.1ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.3% | 15.9ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.3% | 15.7ms | 0.3% | 15.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.3% | 15.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.3% | 15.5ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` |
| 0.3% | 15.5ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.3% | 15.4ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.3% | 15.4ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` |
| 0.2% | 15.1ms | 0.2% | 15.1ms | `flatMap` | `[native code]` |
| 0.2% | 15.0ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:93` |
| 0.2% | 15.0ms | 0.0% | 0us | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18842` |
| 0.2% | 15.0ms | 0.2% | 15.0ms | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15748` |
| 0.2% | 15.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:287` |
| 0.2% | 15.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.2% | 15.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.2% | 14.8ms | 0.2% | 14.8ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:61` |
| 0.2% | 14.6ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 0.2% | 14.2ms | 0.2% | 14.2ms | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` |
| 0.2% | 14.0ms | 0.0% | 0us | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:74` |
| 0.2% | 14.0ms | 0.2% | 14.0ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.2% | 14.0ms | 0.0% | 0us | `flush` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:49` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.2% | 13.2ms | 0.2% | 13.2ms | `isFinite` | `[native code]` |
| 0.2% | 13.2ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:168` |
| 0.2% | 13.2ms | 0.2% | 13.2ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:185` |
| 0.2% | 11.9ms | 0.2% | 11.9ms | `invert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.2% | 11.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:2638` |
| 0.2% | 11.9ms | 0.0% | 0us | `OrthographicCamera` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:46671` |
| 0.2% | 11.9ms | 0.0% | 0us | `updateProjectionMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:46778` |
| 0.1% | 9.9ms | 0.0% | 0us | `link` | `[native code]` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 2.4ms | 0.0% | 2.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 2.4ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.0% | 1.7ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `hasOwn` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `cacheSatisfy` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:124` |
| 0.0% | 1.0ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flatIntoArray` | `[native code]` |
| 0.0% | 990us | 0.0% | 990us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.0% | 989us | 0.0% | 989us | `prepareSceneGeometryUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` |
| 0.0% | 969us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` |
| 0.0% | 969us | 0.0% | 969us | `stringify` | `[native code]` |
| 0.0% | 969us | 0.0% | 969us | `get` | `[native code]` |
| 0.0% | 969us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:264` |
| 0.0% | 943us | 0.0% | 943us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:354` |
| 0.0% | 927us | 0.0% | 927us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.0% | 919us | 0.0% | 919us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:166` |
| 0.0% | 919us | 0.0% | 919us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 918us | 0.0% | 918us | `set` | `[native code]` |
| 0.0% | 918us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:270` |
| 0.0% | 892us | 0.0% | 892us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.0% | 876us | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 876us | 0.0% | 876us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 875us | 0.0% | 875us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.0% | 869us | 0.0% | 869us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:370` |
| 0.0% | 846us | 0.0% | 846us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:64` |
| 0.0% | 846us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:158` |
| 0.0% | 842us | 0.0% | 842us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.0% | 842us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 26.9% (1.36s) | Total: 26.9% (1.36s) | Samples: 144

**Called by:**
- `update` (145)
- `readSceneDocument` (1)

**Calls:**
- `hasOwn` (2)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:34` | Self: 10.0% (511.5ms) | Total: 10.0% (511.5ms) | Samples: 69

**Called by:**
- `update` (69)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:35` | Self: 9.0% (459.8ms) | Total: 9.0% (459.8ms) | Samples: 63

**Called by:**
- `update` (63)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:56` | Self: 8.5% (434.8ms) | Total: 8.5% (434.8ms) | Samples: 46

**Called by:**
- `update` (46)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:55` | Self: 6.9% (350.9ms) | Total: 6.9% (350.9ms) | Samples: 47

**Called by:**
- `update` (47)

### `entries`
`[native code]` | Self: 4.0% (206.7ms) | Total: 4.0% (206.7ms) | Samples: 29

**Called by:**
- `indexSceneDocument` (29)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` | Self: 3.9% (198.0ms) | Total: 3.9% (198.0ms) | Samples: 22

**Called by:**
- `update` (22)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:43` | Self: 3.5% (181.0ms) | Total: 3.5% (181.0ms) | Samples: 18

**Called by:**
- `update` (18)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:27` | Self: 2.8% (143.7ms) | Total: 2.8% (143.7ms) | Samples: 17

**Called by:**
- `update` (17)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:60` | Self: 2.6% (136.0ms) | Total: 2.6% (136.0ms) | Samples: 12

**Called by:**
- `update` (12)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:70` | Self: 1.8% (96.0ms) | Total: 1.8% (96.0ms) | Samples: 16

**Called by:**
- `update` (16)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` | Self: 1.8% (91.5ms) | Total: 1.8% (91.5ms) | Samples: 11

**Called by:**
- `update` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` | Self: 1.5% (80.7ms) | Total: 1.5% (80.7ms) | Samples: 8

**Called by:**
- `some` (8)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:58` | Self: 1.3% (67.1ms) | Total: 1.3% (67.1ms) | Samples: 8

**Called by:**
- `update` (8)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:28` | Self: 1.2% (65.6ms) | Total: 1.2% (65.6ms) | Samples: 12

**Called by:**
- `update` (12)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:31` | Self: 1.2% (61.0ms) | Total: 1.2% (61.0ms) | Samples: 6

**Called by:**
- `update` (6)

### `push`
`[native code]` | Self: 1.1% (59.2ms) | Total: 1.1% (59.2ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` | Self: 0.9% (48.4ms) | Total: 0.9% (48.4ms) | Samples: 7

**Called by:**
- `some` (7)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:23` | Self: 0.8% (42.8ms) | Total: 4.9% (249.6ms) | Samples: 5

**Called by:**
- `update` (32)
- `readSceneDocument` (2)

**Calls:**
- `entries` (29)

### `resolve`
`[native code]` | Self: 0.5% (30.1ms) | Total: 0.5% (30.1ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `map`
`[native code]` | Self: 0.5% (30.0ms) | Total: 7.0% (357.4ms) | Samples: 2

**Called by:**
- `readSceneDocument` (13)
- `readSceneGeometry` (11)
- `(anonymous)` (8)
- `tuple` (4)
- `readSceneGeometry` (2)
- `(anonymous)` (1)
- `triangulateFace` (1)
- `buildSceneGeometry` (1)
- `(anonymous)` (1)
- `triangulateFace` (1)

**Calls:**
- `readSceneGeometry` (11)
- `(anonymous)` (8)
- `(anonymous)` (6)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `readSceneGeometry` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `number` (1)

### `Set`
`[native code]` | Self: 0.3% (16.5ms) | Total: 0.3% (16.5ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` | Self: 0.3% (16.4ms) | Total: 0.3% (16.4ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `anonymous`
`[native code]` | Self: 0.3% (16.3ms) | Total: 1.2% (65.3ms) | Samples: 1

**Called by:**
- `internal:streams/transform` (1)
- `node:crypto` (1)
- `internal:streams/lazy_transform` (1)
- `internal:streams/duplex` (1)

**Calls:**
- `internal:streams/transform` (1)
- `internal:streams/lazy_transform` (1)
- `internal:streams/duplex` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` | Self: 0.3% (15.7ms) | Total: 0.3% (15.7ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `some`
`[native code]` | Self: 0.3% (15.6ms) | Total: 2.8% (144.8ms) | Samples: 2

**Called by:**
- `prepareSceneGeometryUv` (17)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (7)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` | Self: 0.3% (15.5ms) | Total: 0.3% (15.5ms) | Samples: 1

**Called by:**
- `indexSceneNodes` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.3% (15.5ms) | Total: 0.3% (15.5ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.3% (15.4ms) | Total: 0.3% (15.4ms) | Samples: 1

**Called by:**
- `map` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.3% (15.4ms) | Total: 0.3% (15.4ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `flatMap`
`[native code]` | Self: 0.2% (15.1ms) | Total: 0.2% (15.1ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `setFromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15748` | Self: 0.2% (15.0ms) | Total: 0.2% (15.0ms) | Samples: 1

**Called by:**
- `computeBoundingSphere` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` | Self: 0.2% (14.9ms) | Total: 0.2% (14.9ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.2% (14.9ms) | Total: 0.2% (14.9ms) | Samples: 2

**Called by:**
- `map` (2)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:61` | Self: 0.2% (14.8ms) | Total: 0.2% (14.8ms) | Samples: 1

**Called by:**
- `map` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.2% (14.6ms) | Total: 0.5% (30.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `from` (1)

### `every`
`[native code]` | Self: 0.2% (14.6ms) | Total: 0.8% (42.5ms) | Samples: 1

**Called by:**
- `every` (1)
- `validateBuffers` (1)
- `update` (1)

**Calls:**
- `isFinite` (1)
- `every` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` | Self: 0.2% (14.2ms) | Total: 0.2% (14.2ms) | Samples: 1

**Called by:**
- `update` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.2% (14.0ms) | Total: 0.2% (14.0ms) | Samples: 1

**Called by:**
- `from` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 0.2% (13.7ms) | Total: 0.2% (13.7ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.2% (13.7ms) | Total: 0.2% (13.7ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `isFinite`
`[native code]` | Self: 0.2% (13.2ms) | Total: 0.2% (13.2ms) | Samples: 1

**Called by:**
- `every` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:185` | Self: 0.2% (13.2ms) | Total: 0.2% (13.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:40` | Self: 0.2% (12.3ms) | Total: 3.1% (157.2ms) | Samples: 1

**Called by:**
- `update` (18)

**Calls:**
- `some` (17)

### `invert`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.2% (11.9ms) | Total: 0.2% (11.9ms) | Samples: 1

**Called by:**
- `updateProjectionMatrix` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.2% (11.8ms) | Total: 0.8% (43.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)
- `(anonymous)` (2)

**Calls:**
- `map` (4)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.1% (8.9ms) | Total: 0.4% (22.1ms) | Samples: 2

**Called by:**
- `update` (3)

**Calls:**
- `push` (1)

### `parseModule`
`[native code]` | Self: 0.0% (4.0ms) | Total: 0.4% (20.3ms) | Samples: 1

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `node:crypto` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (3.2ms) | Total: 0.0% (3.2ms) | Samples: 3

**Called by:**
- `map` (3)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (2.4ms) | Total: 0.0% (2.4ms) | Samples: 2

**Called by:**
- `link` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `update` (2)

### `hasOwn`
`[native code]` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 2

**Called by:**
- `indexSceneDocument` (2)

### `cacheSatisfy`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `/^[A-Za-z0-9_:-]+$/`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `id` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.0% (990us) | Total: 0.0% (990us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` | Self: 0.0% (989us) | Total: 0.0% (989us) | Samples: 1

**Called by:**
- `update` (1)

### `get`
`[native code]` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `update` (1)

### `stringify`
`[native code]` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `update` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:354` | Self: 0.0% (943us) | Total: 0.0% (943us) | Samples: 1

**Called by:**
- `(module)` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` | Self: 0.0% (927us) | Total: 0.0% (927us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.0% (919us) | Total: 0.0% (919us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:166` | Self: 0.0% (919us) | Total: 0.0% (919us) | Samples: 1

**Called by:**
- `(module)` (1)

### `set`
`[native code]` | Self: 0.0% (918us) | Total: 0.0% (918us) | Samples: 1

**Called by:**
- `update` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` | Self: 0.0% (892us) | Total: 0.0% (892us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (876us) | Total: 0.0% (876us) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` | Self: 0.0% (875us) | Total: 0.0% (875us) | Samples: 1

**Called by:**
- `update` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:370` | Self: 0.0% (869us) | Total: 0.0% (869us) | Samples: 1

**Called by:**
- `(module)` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:64` | Self: 0.0% (846us) | Total: 0.0% (846us) | Samples: 1

**Called by:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` | Self: 0.0% (842us) | Total: 0.0% (842us) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `point` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:2638` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `OrthographicCamera` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `OrthographicCamera`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:46671` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `updateProjectionMatrix` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (876us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `cross` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:183` | Self: 0.0% (0us) | Total: 4.4% (227.3ms) | Samples: 0

**Called by:**
- `(module)` (28)

**Calls:**
- `buildSceneGeometry` (13)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` | Self: 0.0% (0us) | Total: 0.5% (26.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:346` | Self: 0.0% (0us) | Total: 0.3% (16.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)

### `computeBoundingSphere`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18842` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `geometryEntry` (1)

**Calls:**
- `setFromBufferAttribute` (1)

### `prepareSceneGeometryUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:74` | Self: 0.0% (0us) | Total: 0.2% (14.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `flush` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.9% (48.2ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `tuple` (3)
- `tuple` (2)
- `map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:178` | Self: 0.0% (0us) | Total: 52.8% (2.68s) | Samples: 0

**Called by:**
- `(module)` (334)

**Calls:**
- `prepareSceneGeometryUv` (69)
- `prepareSceneGeometryUv` (63)
- `prepareSceneGeometryUv` (47)
- `prepareSceneGeometryUv` (46)
- `prepareSceneGeometryUv` (18)
- `prepareSceneGeometryUv` (18)
- `prepareSceneGeometryUv` (17)
- `prepareSceneGeometryUv` (16)
- `prepareSceneGeometryUv` (12)
- `prepareSceneGeometryUv` (12)
- `prepareSceneGeometryUv` (8)
- `prepareSceneGeometryUv` (6)
- `prepareSceneGeometryUv` (1)
- `prepareSceneGeometryUv` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 2.4% (124.9ms) | Samples: 0

**Called by:**
- `update` (13)

**Calls:**
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.0% (842us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:287` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `geometryEntry` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `push` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:264` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `get` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:270` | Self: 0.0% (0us) | Total: 0.0% (918us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `set` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.2ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `forEach` (1)
- `cacheSatisfy` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 0.3% (16.1ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (1)
- `flatMap` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (9.9ms) | Samples: 0

**Called by:**
- `link` (6)
- `linkAndEvaluateModule` (2)

**Calls:**
- `link` (6)
- `moduleDeclarationInstantiation` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:31` | Self: 0.0% (0us) | Total: 0.3% (16.4ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `makeSceneGridGeometry` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (50.5ms) | Samples: 0

**Calls:**
- `resolve` (2)
- `parseModule` (2)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 1.5% (80.7ms) | Samples: 0

**Called by:**
- `map` (11)

**Calls:**
- `map` (11)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `composeTransform` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 0.2% (14.6ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `every` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `triangulateFace` (1)

**Calls:**
- `flatIntoArray` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:51` | Self: 0.0% (0us) | Total: 90.8% (4.60s) | Samples: 0

**Called by:**
- `evaluate` (554)

**Calls:**
- `update` (334)
- `update` (211)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `/^[A-Za-z0-9_:-]+$/` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:168` | Self: 0.0% (0us) | Total: 0.2% (13.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `every` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (10.03s) | Samples: 0

**Called by:**
- `moduleEvaluation` (604)
- `async loadAndEvaluateModule` (603)

**Calls:**
- `moduleEvaluation` (604)
- `evaluate` (603)

### `flush`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts:49` | Self: 0.0% (0us) | Total: 0.2% (14.0ms) | Samples: 0

**Called by:**
- `prepareSceneGeometryUv` (1)

**Calls:**
- `from` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `stringify` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:46` | Self: 0.0% (0us) | Total: 2.4% (123.9ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `readSceneDocument` (13)
- `readSceneDocument` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:50` | Self: 0.0% (0us) | Total: 5.0% (257.9ms) | Samples: 0

**Called by:**
- `evaluate` (30)

**Calls:**
- `update` (28)
- `update` (1)
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `push` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:10` | Self: 0.0% (0us) | Total: 0.3% (16.4ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:323` | Self: 0.0% (0us) | Total: 2.1% (107.1ms) | Samples: 0

**Called by:**
- `(module)` (13)

**Calls:**
- `map` (13)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (2)

**Calls:**
- `link` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.0% (0us) | Total: 0.3% (15.9ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `push` (2)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 98.9% (5.01s) | Samples: 0

**Calls:**
- `moduleEvaluation` (603)
- `linkAndEvaluateModule` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:158` | Self: 0.0% (0us) | Total: 0.0% (846us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` | Self: 0.0% (0us) | Total: 0.3% (16.5ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `Set` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:157` | Self: 0.0% (0us) | Total: 37.5% (1.90s) | Samples: 0

**Called by:**
- `(module)` (211)
- `(module)` (1)

**Calls:**
- `indexSceneDocument` (145)
- `indexSceneDocument` (32)
- `indexSceneDocument` (22)
- `indexSceneDocument` (11)
- `indexSceneDocument` (2)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `tuple` (1)
- `flush` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (1)
- `typedArrayViewTypedArrayFromFast` (1)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:93` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `computeBoundingSphere` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 98.9% (5.01s) | Samples: 0

**Called by:**
- `moduleEvaluation` (603)

**Calls:**
- `(module)` (554)
- `(module)` (30)
- `(module)` (16)
- `(module)` (2)
- `(module)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:124` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.5% (26.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `map` (2)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `updateProjectionMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:46778` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `OrthographicCamera` (1)

**Calls:**
- `invert` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 1.2% (63.2ms) | Samples: 0

**Called by:**
- `map` (8)

**Calls:**
- `map` (8)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 52.3% | 2.65s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometryUv.ts` |
| 33.4% | 1.69s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 9.1% | 461.6ms | `[native code]` |
| 1.8% | 93.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.8% | 44.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.5% | 27.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.5% | 26.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.3% | 16.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.3% | 15.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 0.3% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.2% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 1.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 927us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts` |
| 0.0% | 846us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
