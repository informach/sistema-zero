# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 18.92s | 2398 | 1.0ms | 214 |

**Top 10:** `every` 11.4%, `map` 8.0%, `push` 7.1%, `buildSceneGeometry` 4.6%, `(anonymous)` 3.8%, `buildSceneGeometry` 3.7%, `(anonymous)` 3.1%, `triangleUnitNormal` 3.1%, `triangulateFace` 2.9%, `(anonymous)` 2.8%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 11.4% | 2.17s | 24.3% | 4.60s | `every` | `[native code]` |
| 8.0% | 1.52s | 27.7% | 5.25s | `map` | `[native code]` |
| 7.1% | 1.35s | 7.1% | 1.35s | `push` | `[native code]` |
| 4.6% | 885.4ms | 6.0% | 1.15s | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:54` |
| 3.8% | 734.3ms | 3.8% | 734.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 3.7% | 700.3ms | 6.8% | 1.28s | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 3.1% | 603.2ms | 4.3% | 827.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 3.1% | 587.2ms | 5.2% | 993.6ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 2.9% | 556.5ms | 2.9% | 556.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 2.8% | 544.9ms | 2.8% | 544.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:33` |
| 2.8% | 544.2ms | 5.2% | 991.7ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 2.3% | 443.2ms | 2.3% | 443.2ms | `flatIntoArray` | `[native code]` |
| 1.7% | 328.9ms | 1.7% | 328.9ms | `splice` | `[native code]` |
| 1.6% | 317.3ms | 1.6% | 317.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 1.6% | 315.7ms | 1.6% | 315.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 1.5% | 293.5ms | 1.5% | 293.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.4% | 278.5ms | 1.4% | 278.5ms | `max` | `[native code]` |
| 1.4% | 278.0ms | 1.4% | 278.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 1.4% | 277.4ms | 1.4% | 277.4ms | `abs` | `[native code]` |
| 1.4% | 270.8ms | 1.4% | 270.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 1.4% | 265.0ms | 4.8% | 915.0ms | `flatIntoArrayWithCallback` | `[native code]` |
| 1.3% | 257.7ms | 1.8% | 345.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 1.2% | 240.1ms | 1.2% | 240.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 1.1% | 222.8ms | 6.2% | 1.18s | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 1.1% | 215.0ms | 1.1% | 215.0ms | `min` | `[native code]` |
| 1.0% | 197.5ms | 1.0% | 197.5ms | `isFinite` | `[native code]` |
| 1.0% | 194.6ms | 1.0% | 194.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 1.0% | 193.0ms | 1.0% | 193.0ms | `entries` | `[native code]` |
| 0.9% | 186.3ms | 0.9% | 186.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.9% | 177.7ms | 2.4% | 462.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.9% | 172.2ms | 1.2% | 236.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.8% | 156.0ms | 0.9% | 187.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.7% | 142.8ms | 0.7% | 142.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:75` |
| 0.7% | 142.4ms | 0.7% | 147.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.6% | 114.9ms | 0.6% | 114.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.5% | 109.4ms | 1.9% | 365.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 0.5% | 107.2ms | 1.2% | 242.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 0.5% | 105.3ms | 0.7% | 137.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.5% | 101.0ms | 0.5% | 101.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.5% | 100.9ms | 0.6% | 119.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.5% | 96.0ms | 1.6% | 321.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.4% | 90.9ms | 0.4% | 90.9ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.4% | 83.1ms | 0.7% | 148.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.4% | 79.1ms | 6.9% | 1.31s | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 0.4% | 76.4ms | 8.2% | 1.56s | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.3% | 71.2ms | 0.3% | 71.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` |
| 0.3% | 65.3ms | 0.3% | 65.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.3% | 64.5ms | 0.3% | 64.5ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.3% | 64.1ms | 0.3% | 64.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:44` |
| 0.3% | 64.0ms | 0.3% | 64.0ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.3% | 62.3ms | 1.9% | 373.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.3% | 60.5ms | 0.3% | 60.5ms | `indexOf` | `[native code]` |
| 0.3% | 59.7ms | 0.3% | 59.7ms | `hypot` | `[native code]` |
| 0.2% | 55.4ms | 1.8% | 345.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.2% | 53.8ms | 0.2% | 53.8ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.2% | 52.0ms | 0.4% | 83.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.2% | 50.9ms | 0.2% | 50.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 0.2% | 49.5ms | 0.2% | 49.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.2% | 49.3ms | 0.4% | 77.3ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.2% | 47.8ms | 0.7% | 140.3ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:29` |
| 0.2% | 45.7ms | 1.7% | 338.0ms | `flatMap` | `[native code]` |
| 0.2% | 45.7ms | 0.2% | 45.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` |
| 0.2% | 45.1ms | 0.2% | 45.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.2% | 44.8ms | 0.2% | 44.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.2% | 44.7ms | 0.2% | 44.7ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.2% | 44.4ms | 1.9% | 373.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.2% | 44.0ms | 0.5% | 107.3ms | `some` | `[native code]` |
| 0.2% | 42.4ms | 0.2% | 42.4ms | `clear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12549` |
| 0.2% | 40.7ms | 0.2% | 40.7ms | `update` | `[native code]` |
| 0.1% | 36.6ms | 0.3% | 67.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.1% | 33.8ms | 0.1% | 33.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.1% | 33.4ms | 0.2% | 47.0ms | `parseModule` | `[native code]` |
| 0.1% | 32.3ms | 0.1% | 35.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` |
| 0.1% | 32.2ms | 0.1% | 32.2ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 31.8ms | 0.2% | 44.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.1% | 30.8ms | 0.1% | 30.8ms | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `Set` | `[native code]` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `getAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18381` |
| 0.1% | 28.6ms | 46.6% | 8.82s | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:37` |
| 0.1% | 28.0ms | 0.1% | 28.0ms | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` |
| 0.1% | 25.8ms | 0.1% | 25.8ms | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:79` |
| 0.1% | 18.9ms | 0.1% | 19.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.0% | 18.4ms | 0.0% | 18.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` |
| 0.0% | 17.9ms | 0.0% | 17.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.0% | 17.3ms | 0.0% | 17.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 16.6ms | 0.0% | 16.6ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `Map` | `[native code]` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 16.3ms | 0.0% | 16.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:65` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `next` | `[native code]` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:44` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `getX` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `MeshBasicMaterial` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `mapMeshUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:80` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneMaterialResource.ts:35` |
| 0.0% | 14.8ms | 0.0% | 14.8ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.0% | 14.6ms | 0.0% | 14.6ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.0% | 14.5ms | 0.0% | 14.5ms | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:118` |
| 0.0% | 13.7ms | 0.2% | 55.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.0% | 13.5ms | 0.0% | 13.5ms | `copyProps` | `internal:primordials` |
| 0.0% | 12.9ms | 0.1% | 27.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` |
| 0.0% | 10.3ms | 0.6% | 117.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.0% | 4.9ms | 0.0% | 4.9ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 3.1ms | 0.0% | 3.1ms | `fetch` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:34` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` |
| 0.0% | 1.1ms | 2.9% | 549.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:43` |
| 0.0% | 993us | 0.0% | 993us | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:12` |
| 0.0% | 986us | 0.0% | 986us | `get buffer` | `[native code]` |
| 0.0% | 981us | 0.0% | 981us | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 0.0% | 968us | 0.0% | 968us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 961us | 0.0% | 1.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 956us | 0.0% | 956us | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 950us | 0.0% | 950us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` |
| 0.0% | 944us | 0.0% | 944us | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 930us | 0.0% | 16.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 919us | 0.3% | 65.4ms | `from` | `[native code]` |
| 0.0% | 918us | 0.0% | 918us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:71` |
| 0.0% | 910us | 0.0% | 910us | `sign` | `[native code]` |
| 0.0% | 904us | 0.0% | 904us | `dispose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:350` |
| 0.0% | 865us | 0.0% | 1.8ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 37.77s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.7% | 18.87s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 99.7% | 18.87s | 0.0% | 0us | `evaluate` | `[native code]` |
| 60.5% | 11.45s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:172` |
| 46.6% | 8.82s | 0.1% | 28.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:37` |
| 32.2% | 6.10s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:50` |
| 31.0% | 5.88s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:57` |
| 30.7% | 5.82s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:60` |
| 27.7% | 5.25s | 8.0% | 1.52s | `map` | `[native code]` |
| 24.3% | 4.60s | 11.4% | 2.17s | `every` | `[native code]` |
| 11.1% | 2.10s | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:73` |
| 8.2% | 1.56s | 0.4% | 76.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 7.1% | 1.35s | 7.1% | 1.35s | `push` | `[native code]` |
| 6.9% | 1.31s | 0.4% | 79.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 6.8% | 1.28s | 3.7% | 700.3ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 6.2% | 1.18s | 1.1% | 222.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 6.0% | 1.15s | 4.6% | 885.4ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:54` |
| 5.6% | 1.06s | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:31` |
| 5.2% | 993.6ms | 3.1% | 587.2ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 5.2% | 991.7ms | 2.8% | 544.2ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 4.8% | 915.0ms | 1.4% | 265.0ms | `flatIntoArrayWithCallback` | `[native code]` |
| 4.3% | 827.6ms | 3.1% | 603.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 3.8% | 734.3ms | 3.8% | 734.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 2.9% | 556.5ms | 2.9% | 556.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 2.9% | 549.6ms | 0.0% | 1.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:43` |
| 2.8% | 544.9ms | 2.8% | 544.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:33` |
| 2.4% | 462.9ms | 0.9% | 177.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 2.3% | 443.2ms | 2.3% | 443.2ms | `flatIntoArray` | `[native code]` |
| 2.0% | 396.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:75` |
| 1.9% | 373.4ms | 0.2% | 44.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 1.9% | 373.2ms | 0.3% | 62.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 1.9% | 365.8ms | 0.5% | 109.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 1.8% | 345.7ms | 0.2% | 55.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 1.8% | 345.2ms | 1.3% | 257.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 1.7% | 338.0ms | 0.2% | 45.7ms | `flatMap` | `[native code]` |
| 1.7% | 328.9ms | 1.7% | 328.9ms | `splice` | `[native code]` |
| 1.7% | 326.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:153` |
| 1.6% | 321.3ms | 0.5% | 96.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 1.6% | 317.3ms | 1.6% | 317.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 1.6% | 315.7ms | 1.6% | 315.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 1.5% | 293.5ms | 1.5% | 293.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.5% | 290.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:38` |
| 1.4% | 278.5ms | 1.4% | 278.5ms | `max` | `[native code]` |
| 1.4% | 278.0ms | 1.4% | 278.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 1.4% | 277.4ms | 1.4% | 277.4ms | `abs` | `[native code]` |
| 1.4% | 270.8ms | 1.4% | 270.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 1.2% | 242.2ms | 0.5% | 107.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 1.2% | 240.1ms | 1.2% | 240.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 1.2% | 236.6ms | 0.9% | 172.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 1.1% | 215.0ms | 1.1% | 215.0ms | `min` | `[native code]` |
| 1.0% | 197.5ms | 1.0% | 197.5ms | `isFinite` | `[native code]` |
| 1.0% | 194.6ms | 1.0% | 194.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 1.0% | 193.0ms | 1.0% | 193.0ms | `entries` | `[native code]` |
| 0.9% | 187.9ms | 0.8% | 156.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.9% | 186.3ms | 0.9% | 186.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.9% | 180.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:37` |
| 0.7% | 148.0ms | 0.4% | 83.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.7% | 147.3ms | 0.7% | 142.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.7% | 143.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:254` |
| 0.7% | 142.8ms | 0.7% | 142.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:75` |
| 0.7% | 140.3ms | 0.2% | 47.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:29` |
| 0.7% | 137.0ms | 0.5% | 105.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.6% | 123.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:323` |
| 0.6% | 119.0ms | 0.5% | 100.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.6% | 117.6ms | 0.0% | 10.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.6% | 114.9ms | 0.6% | 114.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.5% | 108.5ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 0.5% | 107.3ms | 0.2% | 44.0ms | `some` | `[native code]` |
| 0.5% | 101.0ms | 0.5% | 101.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.5% | 100.5ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:23` |
| 0.4% | 91.3ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 0.4% | 90.9ms | 0.4% | 90.9ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.4% | 83.5ms | 0.2% | 52.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.4% | 78.5ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` |
| 0.4% | 77.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.4% | 77.3ms | 0.2% | 49.3ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.3% | 71.2ms | 0.3% | 71.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` |
| 0.3% | 67.4ms | 0.1% | 36.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.3% | 65.4ms | 0.0% | 919us | `from` | `[native code]` |
| 0.3% | 65.3ms | 0.3% | 65.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.3% | 64.5ms | 0.3% | 64.5ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.3% | 64.1ms | 0.3% | 64.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:44` |
| 0.3% | 64.0ms | 0.3% | 64.0ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.3% | 60.5ms | 0.3% | 60.5ms | `indexOf` | `[native code]` |
| 0.3% | 59.7ms | 0.3% | 59.7ms | `hypot` | `[native code]` |
| 0.2% | 55.4ms | 0.0% | 13.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.2% | 53.8ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:89` |
| 0.2% | 53.8ms | 0.2% | 53.8ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.2% | 53.2ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.2% | 50.9ms | 0.2% | 50.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 0.2% | 49.5ms | 0.2% | 49.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.2% | 47.0ms | 0.1% | 33.4ms | `parseModule` | `[native code]` |
| 0.2% | 45.7ms | 0.2% | 45.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` |
| 0.2% | 45.1ms | 0.2% | 45.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.2% | 44.8ms | 0.2% | 44.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.2% | 44.7ms | 0.2% | 44.7ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.2% | 44.7ms | 0.1% | 31.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.2% | 43.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:90` |
| 0.2% | 42.4ms | 0.0% | 0us | `dispose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:358` |
| 0.2% | 42.4ms | 0.2% | 42.4ms | `clear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12549` |
| 0.2% | 41.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:78` |
| 0.2% | 41.4ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:346` |
| 0.2% | 40.7ms | 0.2% | 40.7ms | `update` | `[native code]` |
| 0.1% | 35.2ms | 0.1% | 32.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` |
| 0.1% | 34.5ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:61` |
| 0.1% | 33.8ms | 0.1% | 33.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.1% | 32.5ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.1% | 32.2ms | 0.1% | 32.2ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 30.8ms | 0.1% | 30.8ms | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `Set` | `[native code]` |
| 0.1% | 30.6ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:78` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `getAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18381` |
| 0.1% | 30.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:70` |
| 0.1% | 28.2ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:63` |
| 0.1% | 28.0ms | 0.1% | 28.0ms | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` |
| 0.1% | 28.0ms | 0.0% | 0us | `SceneRenderResource` | `[native code]` |
| 0.1% | 28.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:99` |
| 0.1% | 28.0ms | 0.0% | 0us | `Group` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13376` |
| 0.1% | 28.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:47` |
| 0.1% | 27.5ms | 0.0% | 12.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` |
| 0.1% | 25.8ms | 0.1% | 25.8ms | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:79` |
| 0.1% | 20.6ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:88` |
| 0.1% | 20.6ms | 0.0% | 0us | `computeBoundingBox` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18766` |
| 0.1% | 19.9ms | 0.1% | 18.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.0% | 18.4ms | 0.0% | 18.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` |
| 0.0% | 17.9ms | 0.0% | 17.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.0% | 17.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:30` |
| 0.0% | 17.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` |
| 0.0% | 17.3ms | 0.0% | 17.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 17.3ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.0% | 16.9ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` |
| 0.0% | 16.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.0% | 16.6ms | 0.0% | 16.6ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `Map` | `[native code]` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 16.3ms | 0.0% | 16.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:65` |
| 0.0% | 16.0ms | 0.0% | 930us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:202` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:329` |
| 0.0% | 15.9ms | 0.0% | 0us | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:177` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `next` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:168` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:44` |
| 0.0% | 15.7ms | 0.0% | 0us | `fromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5985` |
| 0.0% | 15.7ms | 0.0% | 0us | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `getX` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 15.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `MeshBasicMaterial` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 15.5ms | 0.0% | 0us | `Mesh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` |
| 0.0% | 15.4ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:284` |
| 0.0% | 15.3ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:35` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `mapMeshUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:80` |
| 0.0% | 14.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:265` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneMaterialResource.ts:35` |
| 0.0% | 14.8ms | 0.0% | 14.8ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.0% | 14.6ms | 0.0% | 14.6ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.0% | 14.5ms | 0.0% | 14.5ms | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:118` |
| 0.0% | 13.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:125` |
| 0.0% | 13.7ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:71` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `makeSafe` | `internal:primordials:49` |
| 0.0% | 13.5ms | 0.0% | 13.5ms | `copyProps` | `internal:primordials` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:streams/legacy` | `internal:streams/legacy:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 13.5ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.0% | 12.8ms | 0.0% | 12.8ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` |
| 0.0% | 12.8ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:74` |
| 0.0% | 6.2ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 4.9ms | 0.0% | 4.9ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 4.8ms | 0.0% | 4.8ms | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 3.1ms | `fetch` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 0us | `mapMeshUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:70` |
| 0.0% | 2.3ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 2.3ms | 0.0% | 2.3ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:71` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:34` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` |
| 0.0% | 1.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` |
| 0.0% | 1.8ms | 0.0% | 865us | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` |
| 0.0% | 1.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:177` |
| 0.0% | 1.7ms | 0.0% | 961us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 1.7ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:62` |
| 0.0% | 1.0ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:18` |
| 0.0% | 993us | 0.0% | 993us | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:12` |
| 0.0% | 986us | 0.0% | 986us | `get buffer` | `[native code]` |
| 0.0% | 981us | 0.0% | 981us | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` |
| 0.0% | 968us | 0.0% | 968us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 956us | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:61` |
| 0.0% | 956us | 0.0% | 956us | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 956us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:154` |
| 0.0% | 956us | 0.0% | 0us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.0% | 950us | 0.0% | 950us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` |
| 0.0% | 944us | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:10` |
| 0.0% | 944us | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:71` |
| 0.0% | 944us | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.0% | 944us | 0.0% | 944us | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 919us | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` |
| 0.0% | 918us | 0.0% | 918us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:71` |
| 0.0% | 910us | 0.0% | 910us | `sign` | `[native code]` |
| 0.0% | 910us | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:111` |
| 0.0% | 904us | 0.0% | 904us | `dispose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:350` |

## Function Details

### `every`
`[native code]` | Self: 11.4% (2.17s) | Total: 24.3% (4.60s) | Samples: 244

**Called by:**
- `every` (240)
- `validateBuffers` (240)
- `(module)` (38)

**Calls:**
- `every` (240)
- `isFinite` (19)
- `(anonymous)` (15)

### `map`
`[native code]` | Self: 8.0% (1.52s) | Total: 27.7% (5.25s) | Samples: 182

**Called by:**
- `triangulateFace` (184)
- `buildSceneGeometry` (138)
- `buildSceneGeometry` (53)
- `(anonymous)` (45)
- `triangulateFace` (45)
- `triangleUnitNormal` (42)
- `triangulateFace` (31)
- `triangulateFace` (30)
- `triangulateFace` (26)
- `triangulateFace` (16)
- `readSceneDocument` (15)
- `readSceneGeometry` (12)
- `(anonymous)` (10)
- `tuple` (4)
- `mapMeshUv` (3)
- `update` (2)
- `readSceneGeometry` (2)
- `readSceneImage` (1)
- `readSceneDocument` (1)

**Calls:**
- `(anonymous)` (102)
- `(anonymous)` (73)
- `(anonymous)` (72)
- `(anonymous)` (54)
- `(anonymous)` (39)
- `(anonymous)` (36)
- `abs` (31)
- `readSceneGeometry` (12)
- `(anonymous)` (10)
- `(anonymous)` (9)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (5)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `readSceneGeometry` (2)
- `readSceneImage` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)

### `push`
`[native code]` | Self: 7.1% (1.35s) | Total: 7.1% (1.35s) | Samples: 204

**Called by:**
- `buildSceneGeometry` (82)
- `buildSceneGeometry` (66)
- `buildSceneGeometry` (46)
- `triangulateFace` (5)
- `triangulateFace` (4)
- `buildSceneGeometry` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:54` | Self: 4.6% (885.4ms) | Total: 6.0% (1.15s) | Samples: 132

**Called by:**
- `update` (121)
- `(module)` (55)
- `(module)` (2)

**Calls:**
- `push` (46)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 3.8% (734.3ms) | Total: 3.8% (734.3ms) | Samples: 100

**Called by:**
- `map` (73)
- `flatIntoArrayWithCallback` (17)
- `some` (10)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 3.7% (700.3ms) | Total: 6.8% (1.28s) | Samples: 79

**Called by:**
- `update` (108)
- `(module)` (51)
- `(module)` (2)

**Calls:**
- `push` (82)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 3.1% (603.2ms) | Total: 4.3% (827.6ms) | Samples: 78

**Called by:**
- `map` (102)

**Calls:**
- `min` (13)
- `max` (11)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 3.1% (587.2ms) | Total: 5.2% (993.6ms) | Samples: 76

**Called by:**
- `buildSceneGeometry` (126)

**Calls:**
- `map` (42)
- `max` (7)
- `abs` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 2.9% (556.5ms) | Total: 2.9% (556.5ms) | Samples: 69

**Called by:**
- `buildSceneGeometry` (69)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:33` | Self: 2.8% (544.9ms) | Total: 2.8% (544.9ms) | Samples: 72

**Called by:**
- `map` (72)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 2.8% (544.2ms) | Total: 5.2% (991.7ms) | Samples: 65

**Called by:**
- `update` (79)
- `(module)` (53)

**Calls:**
- `push` (66)
- `triangleUnitNormal` (1)

### `flatIntoArray`
`[native code]` | Self: 2.3% (443.2ms) | Total: 2.3% (443.2ms) | Samples: 63

**Called by:**
- `flatIntoArrayWithCallback` (63)

### `splice`
`[native code]` | Self: 1.7% (328.9ms) | Total: 1.7% (328.9ms) | Samples: 30

**Called by:**
- `triangulateFace` (30)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 1.6% (317.3ms) | Total: 1.6% (317.3ms) | Samples: 39

**Called by:**
- `map` (39)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` | Self: 1.6% (315.7ms) | Total: 1.6% (315.7ms) | Samples: 36

**Called by:**
- `map` (36)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 1.5% (293.5ms) | Total: 1.5% (293.5ms) | Samples: 42

**Called by:**
- `buildSceneGeometry` (42)

### `max`
`[native code]` | Self: 1.4% (278.5ms) | Total: 1.4% (278.5ms) | Samples: 37

**Called by:**
- `(anonymous)` (11)
- `triangulateFace` (8)
- `triangulateFace` (8)
- `triangleUnitNormal` (7)
- `triangulateFace` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 1.4% (278.0ms) | Total: 1.4% (278.0ms) | Samples: 38

**Called by:**
- `buildSceneGeometry` (38)

### `abs`
`[native code]` | Self: 1.4% (277.4ms) | Total: 1.4% (277.4ms) | Samples: 32

**Called by:**
- `map` (31)
- `triangleUnitNormal` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` | Self: 1.4% (270.8ms) | Total: 1.4% (270.8ms) | Samples: 27

**Called by:**
- `buildSceneGeometry` (27)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 1.4% (265.0ms) | Total: 4.8% (915.0ms) | Samples: 26

**Called by:**
- `triangulateFace` (80)
- `flatMap` (33)

**Calls:**
- `flatIntoArray` (63)
- `(anonymous)` (17)
- `(anonymous)` (6)
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 1.3% (257.7ms) | Total: 1.8% (345.2ms) | Samples: 26

**Called by:**
- `buildSceneGeometry` (35)

**Calls:**
- `min` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` | Self: 1.2% (240.1ms) | Total: 1.2% (240.1ms) | Samples: 28

**Called by:**
- `buildSceneGeometry` (28)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 1.1% (222.8ms) | Total: 6.2% (1.18s) | Samples: 27

**Called by:**
- `buildSceneGeometry` (144)

**Calls:**
- `flatIntoArrayWithCallback` (80)
- `flatMap` (37)

### `min`
`[native code]` | Self: 1.1% (215.0ms) | Total: 1.1% (215.0ms) | Samples: 22

**Called by:**
- `(anonymous)` (13)
- `triangulateFace` (9)

### `isFinite`
`[native code]` | Self: 1.0% (197.5ms) | Total: 1.0% (197.5ms) | Samples: 21

**Called by:**
- `every` (19)
- `triangulateFace` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 1.0% (194.6ms) | Total: 1.0% (194.6ms) | Samples: 33

**Called by:**
- `update` (32)
- `readSceneDocument` (1)

### `entries`
`[native code]` | Self: 1.0% (193.0ms) | Total: 1.0% (193.0ms) | Samples: 22

**Called by:**
- `indexSceneDocument` (13)
- `buildSceneGeometry` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` | Self: 0.9% (186.3ms) | Total: 0.9% (186.3ms) | Samples: 33

**Called by:**
- `buildSceneGeometry` (33)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.9% (177.7ms) | Total: 2.4% (462.9ms) | Samples: 17

**Called by:**
- `buildSceneGeometry` (62)

**Calls:**
- `map` (45)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.9% (172.2ms) | Total: 1.2% (236.6ms) | Samples: 29

**Called by:**
- `buildSceneGeometry` (37)

**Calls:**
- `max` (8)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` | Self: 0.8% (156.0ms) | Total: 0.9% (187.9ms) | Samples: 15

**Called by:**
- `buildSceneGeometry` (19)

**Calls:**
- `push` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:75` | Self: 0.7% (142.8ms) | Total: 0.7% (142.8ms) | Samples: 15

**Called by:**
- `every` (15)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.7% (142.4ms) | Total: 0.7% (147.3ms) | Samples: 16

**Called by:**
- `buildSceneGeometry` (21)

**Calls:**
- `intersect` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` | Self: 0.6% (114.9ms) | Total: 0.6% (114.9ms) | Samples: 15

**Called by:**
- `buildSceneGeometry` (15)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` | Self: 0.5% (109.4ms) | Total: 1.9% (365.8ms) | Samples: 18

**Called by:**
- `buildSceneGeometry` (48)

**Calls:**
- `map` (30)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` | Self: 0.5% (107.2ms) | Total: 1.2% (242.2ms) | Samples: 13

**Called by:**
- `buildSceneGeometry` (29)

**Calls:**
- `map` (16)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` | Self: 0.5% (105.3ms) | Total: 0.7% (137.0ms) | Samples: 9

**Called by:**
- `buildSceneGeometry` (12)

**Calls:**
- `hypot` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` | Self: 0.5% (101.0ms) | Total: 0.5% (101.0ms) | Samples: 14

**Called by:**
- `buildSceneGeometry` (14)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.5% (100.9ms) | Total: 0.6% (119.0ms) | Samples: 18

**Called by:**
- `buildSceneGeometry` (22)

**Calls:**
- `point` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` | Self: 0.5% (96.0ms) | Total: 1.6% (321.3ms) | Samples: 11

**Called by:**
- `buildSceneGeometry` (42)

**Calls:**
- `map` (31)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.4% (90.9ms) | Total: 0.4% (90.9ms) | Samples: 13

**Called by:**
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` | Self: 0.4% (83.1ms) | Total: 0.7% (148.0ms) | Samples: 14

**Called by:**
- `buildSceneGeometry` (22)

**Calls:**
- `max` (8)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` | Self: 0.4% (79.1ms) | Total: 6.9% (1.31s) | Samples: 10

**Called by:**
- `update` (106)
- `(module)` (56)
- `(module)` (7)

**Calls:**
- `triangleUnitNormal` (126)
- `triangleUnitNormal` (10)
- `triangleUnitNormal` (10)
- `triangleUnitNormal` (5)
- `triangleUnitNormal` (3)
- `triangleUnitNormal` (2)
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)
- `normalize` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.4% (76.4ms) | Total: 8.2% (1.56s) | Samples: 5

**Called by:**
- `buildSceneGeometry` (189)

**Calls:**
- `map` (184)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` | Self: 0.3% (71.2ms) | Total: 0.3% (71.2ms) | Samples: 7

**Called by:**
- `map` (7)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` | Self: 0.3% (65.3ms) | Total: 0.3% (65.3ms) | Samples: 9

**Called by:**
- `map` (9)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.3% (64.5ms) | Total: 0.3% (64.5ms) | Samples: 11

**Called by:**
- `from` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:44` | Self: 0.3% (64.1ms) | Total: 0.3% (64.1ms) | Samples: 7

**Called by:**
- `map` (7)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.3% (64.0ms) | Total: 0.3% (64.0ms) | Samples: 10

**Called by:**
- `buildSceneGeometry` (10)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.3% (62.3ms) | Total: 1.9% (373.2ms) | Samples: 9

**Called by:**
- `map` (54)

**Calls:**
- `map` (45)

### `indexOf`
`[native code]` | Self: 0.3% (60.5ms) | Total: 0.3% (60.5ms) | Samples: 5

**Called by:**
- `triangulateFace` (5)

### `hypot`
`[native code]` | Self: 0.3% (59.7ms) | Total: 0.3% (59.7ms) | Samples: 5

**Called by:**
- `triangulateFace` (3)
- `normalize` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.2% (55.4ms) | Total: 1.8% (345.7ms) | Samples: 15

**Called by:**
- `buildSceneGeometry` (49)

**Calls:**
- `map` (26)
- `indexOf` (5)
- `max` (3)

### `computeBoundingSphere`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.2% (53.8ms) | Total: 0.2% (53.8ms) | Samples: 6

**Called by:**
- `geometryEntry` (6)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` | Self: 0.2% (52.0ms) | Total: 0.4% (83.5ms) | Samples: 9

**Called by:**
- `buildSceneGeometry` (14)

**Calls:**
- `push` (5)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` | Self: 0.2% (50.9ms) | Total: 0.2% (50.9ms) | Samples: 8

**Called by:**
- `update` (8)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.2% (49.5ms) | Total: 0.2% (49.5ms) | Samples: 5

**Called by:**
- `update` (4)
- `(module)` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.2% (49.3ms) | Total: 0.4% (77.3ms) | Samples: 8

**Called by:**
- `triangleUnitNormal` (9)
- `buildSceneGeometry` (1)

**Calls:**
- `hypot` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:29` | Self: 0.2% (47.8ms) | Total: 0.7% (140.3ms) | Samples: 4

**Called by:**
- `update` (9)
- `(module)` (3)
- `(module)` (1)

**Calls:**
- `entries` (9)

### `flatMap`
`[native code]` | Self: 0.2% (45.7ms) | Total: 1.7% (338.0ms) | Samples: 4

**Called by:**
- `triangulateFace` (37)

**Calls:**
- `flatIntoArrayWithCallback` (33)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` | Self: 0.2% (45.7ms) | Total: 0.2% (45.7ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` | Self: 0.2% (45.1ms) | Total: 0.2% (45.1ms) | Samples: 6

**Called by:**
- `flatIntoArrayWithCallback` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.2% (44.8ms) | Total: 0.2% (44.8ms) | Samples: 5

**Called by:**
- `map` (5)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` | Self: 0.2% (44.7ms) | Total: 0.2% (44.7ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` | Self: 0.2% (44.4ms) | Total: 1.9% (373.4ms) | Samples: 3

**Called by:**
- `buildSceneGeometry` (33)

**Calls:**
- `splice` (30)

### `some`
`[native code]` | Self: 0.2% (44.0ms) | Total: 0.5% (107.3ms) | Samples: 9

**Called by:**
- `triangulateFace` (19)

**Calls:**
- `(anonymous)` (10)

### `clear`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12549` | Self: 0.2% (42.4ms) | Total: 0.2% (42.4ms) | Samples: 2

**Called by:**
- `dispose` (2)

### `update`
`[native code]` | Self: 0.2% (40.7ms) | Total: 0.2% (40.7ms) | Samples: 4

**Called by:**
- `(module)` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` | Self: 0.1% (36.6ms) | Total: 0.3% (67.4ms) | Samples: 7

**Called by:**
- `buildSceneGeometry` (10)

**Calls:**
- `turn` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` | Self: 0.1% (33.8ms) | Total: 0.1% (33.8ms) | Samples: 6

**Called by:**
- `buildSceneGeometry` (6)

### `parseModule`
`[native code]` | Self: 0.1% (33.4ms) | Total: 0.2% (47.0ms) | Samples: 5

**Called by:**
- `async (anonymous)` (7)

**Calls:**
- `node:crypto` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` | Self: 0.1% (32.3ms) | Total: 0.1% (35.2ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (8)

**Calls:**
- `point` (2)
- `turn` (1)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.1% (32.2ms) | Total: 0.1% (32.2ms) | Samples: 4

**Called by:**
- `triangleUnitNormal` (3)
- `triangleUnitNormal` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` | Self: 0.1% (31.8ms) | Total: 0.2% (44.7ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `point` (1)

### `turn`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.1% (30.8ms) | Total: 0.1% (30.8ms) | Samples: 3

**Called by:**
- `triangulateFace` (3)

### `Set`
`[native code]` | Self: 0.1% (30.6ms) | Total: 0.1% (30.6ms) | Samples: 3

**Called by:**
- `geometryEntry` (3)

### `getAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18381` | Self: 0.1% (30.6ms) | Total: 0.1% (30.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:37` | Self: 0.1% (28.6ms) | Total: 46.6% (8.82s) | Samples: 3

**Called by:**
- `update` (712)
- `(module)` (391)
- `(module)` (23)

**Calls:**
- `triangulateFace` (189)
- `triangulateFace` (144)
- `triangulateFace` (69)
- `triangulateFace` (62)
- `triangulateFace` (49)
- `triangulateFace` (48)
- `triangulateFace` (42)
- `triangulateFace` (42)
- `triangulateFace` (38)
- `triangulateFace` (37)
- `triangulateFace` (35)
- `triangulateFace` (33)
- `triangulateFace` (33)
- `triangulateFace` (29)
- `triangulateFace` (28)
- `triangulateFace` (27)
- `triangulateFace` (22)
- `triangulateFace` (22)
- `triangulateFace` (21)
- `triangulateFace` (21)
- `triangulateFace` (19)
- `triangulateFace` (15)
- `triangulateFace` (14)
- `triangulateFace` (14)
- `triangulateFace` (12)
- `triangulateFace` (10)
- `triangulateFace` (8)
- `triangulateFace` (6)
- `triangulateFace` (6)
- `triangulateFace` (5)
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (3)
- `triangulateFace` (3)
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` | Self: 0.1% (28.0ms) | Total: 0.1% (28.0ms) | Samples: 1

**Called by:**
- `Group` (1)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:79` | Self: 0.1% (25.8ms) | Total: 0.1% (25.8ms) | Samples: 4

**Called by:**
- `update` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` | Self: 0.1% (18.9ms) | Total: 0.1% (19.9ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (6)

**Calls:**
- `point` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:20` | Self: 0.0% (18.4ms) | Total: 0.0% (18.4ms) | Samples: 4

**Called by:**
- `update` (4)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 0.0% (17.9ms) | Total: 0.0% (17.9ms) | Samples: 3

**Called by:**
- `update` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (17.3ms) | Total: 0.0% (17.3ms) | Samples: 2

**Called by:**
- `map` (2)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.0% (16.6ms) | Total: 0.0% (16.6ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` | Self: 0.0% (16.5ms) | Total: 0.0% (16.5ms) | Samples: 3

**Called by:**
- `buildSceneGeometry` (3)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` | Self: 0.0% (16.5ms) | Total: 0.0% (16.5ms) | Samples: 2

**Called by:**
- `triangleUnitNormal` (2)

### `Map`
`[native code]` | Self: 0.0% (16.4ms) | Total: 0.0% (16.4ms) | Samples: 2

**Called by:**
- `sceneBounds` (1)
- `update` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` | Self: 0.0% (16.4ms) | Total: 0.0% (16.4ms) | Samples: 3

**Called by:**
- `buildSceneGeometry` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:65` | Self: 0.0% (16.3ms) | Total: 0.0% (16.3ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.0% (15.9ms) | Total: 0.0% (15.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `next`
`[native code]` | Self: 0.0% (15.9ms) | Total: 0.0% (15.9ms) | Samples: 1

**Called by:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:44` | Self: 0.0% (15.8ms) | Total: 0.0% (15.8ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `getX`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (15.7ms) | Total: 0.0% (15.7ms) | Samples: 1

**Called by:**
- `fromBufferAttribute` (1)

### `MeshBasicMaterial`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (15.5ms) | Total: 0.0% (15.5ms) | Samples: 1

**Called by:**
- `Mesh` (1)

### `mapMeshUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:80` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneMaterialResource.ts:35` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `update` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.0% (14.8ms) | Total: 0.0% (14.8ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` | Self: 0.0% (14.6ms) | Total: 0.0% (14.6ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:118` | Self: 0.0% (14.5ms) | Total: 0.0% (14.5ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` | Self: 0.0% (13.7ms) | Total: 0.2% (55.4ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (5)

**Calls:**
- `point` (3)

### `copyProps`
`internal:primordials` | Self: 0.0% (13.5ms) | Total: 0.0% (13.5ms) | Samples: 2

**Called by:**
- `makeSafe` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` | Self: 0.0% (12.9ms) | Total: 0.1% (27.5ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `point` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.0% (12.8ms) | Total: 0.0% (12.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` | Self: 0.0% (12.8ms) | Total: 0.0% (12.8ms) | Samples: 1

**Called by:**
- `geometryEntry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` | Self: 0.0% (10.3ms) | Total: 0.6% (117.6ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (21)

**Calls:**
- `some` (19)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (4.9ms) | Total: 0.0% (4.9ms) | Samples: 5

**Called by:**
- `triangulateFace` (5)

### `setFromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (4.8ms) | Total: 0.0% (4.8ms) | Samples: 5

**Called by:**
- `computeBoundingBox` (5)

### `fetch`
`[native code]` | Self: 0.0% (3.1ms) | Total: 0.0% (3.1ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.0% (2.3ms) | Total: 0.0% (2.3ms) | Samples: 2

**Called by:**
- `triangleUnitNormal` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:34` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:43` | Self: 0.0% (1.1ms) | Total: 2.9% (549.6ms) | Samples: 1

**Called by:**
- `update` (37)
- `(module)` (16)
- `(module)` (1)

**Calls:**
- `map` (53)

### `turn`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:12` | Self: 0.0% (993us) | Total: 0.0% (993us) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `get buffer`
`[native code]` | Self: 0.0% (986us) | Total: 0.0% (986us) | Samples: 1

**Called by:**
- `(module)` (1)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:14` | Self: 0.0% (981us) | Total: 0.0% (981us) | Samples: 1

**Called by:**
- `hexToRgb` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (968us) | Total: 0.0% (968us) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` | Self: 0.0% (961us) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `point` (1)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.0% (956us) | Total: 0.0% (956us) | Samples: 1

**Called by:**
- `orientation` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` | Self: 0.0% (950us) | Total: 0.0% (950us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.0% (944us) | Total: 0.0% (944us) | Samples: 1

**Called by:**
- `composeTransform` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (930us) | Total: 0.0% (16.0ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `tuple` (2)

### `from`
`[native code]` | Self: 0.0% (919us) | Total: 0.3% (65.4ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (6)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (2)
- `update` (1)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (11)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:71` | Self: 0.0% (918us) | Total: 0.0% (918us) | Samples: 1

**Called by:**
- `update` (1)

### `sign`
`[native code]` | Self: 0.0% (910us) | Total: 0.0% (910us) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `dispose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:350` | Self: 0.0% (904us) | Total: 0.0% (904us) | Samples: 1

**Called by:**
- `(module)` (1)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` | Self: 0.0% (865us) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `normalizeHex` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (6.2ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` | Self: 0.0% (0us) | Total: 0.0% (13.7ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `isFinite` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:31` | Self: 0.0% (0us) | Total: 5.6% (1.06s) | Samples: 0

**Called by:**
- `update` (97)
- `(module)` (42)

**Calls:**
- `map` (138)
- `push` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:35` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `sub` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:177` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `map` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:111` | Self: 0.0% (0us) | Total: 0.0% (910us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `sign` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:323` | Self: 0.0% (0us) | Total: 0.6% (123.2ms) | Samples: 0

**Called by:**
- `(module)` (15)

**Calls:**
- `map` (15)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:18` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `Map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:153` | Self: 0.0% (0us) | Total: 1.7% (326.0ms) | Samples: 0

**Called by:**
- `(module)` (33)
- `(module)` (24)

**Calls:**
- `indexSceneDocument` (32)
- `indexSceneDocument` (11)
- `indexSceneDocument` (8)
- `indexSceneDocument` (4)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:71` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:37` | Self: 0.0% (0us) | Total: 0.9% (180.6ms) | Samples: 0

**Called by:**
- `evaluate` (20)

**Calls:**
- `readSceneDocument` (15)
- `readSceneDocument` (4)
- `readSceneDocument` (1)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:88` | Self: 0.0% (0us) | Total: 0.1% (20.6ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `computeBoundingBox` (6)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (108.5ms) | Samples: 0

**Called by:**
- `internal:streams/transform` (2)
- `node:crypto` (2)
- `internal:streams/legacy` (2)
- `internal:streams/duplex` (2)
- `internal:shared` (2)
- `internal:validators` (2)
- `internal:streams/lazy_transform` (2)
- `node:events` (2)

**Calls:**
- `internal:streams/transform` (2)
- `internal:shared` (2)
- `internal:streams/legacy` (2)
- `internal:streams/duplex` (2)
- `internal:primordials` (2)
- `internal:validators` (2)
- `internal:streams/lazy_transform` (2)
- `node:events` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (53.2ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (7)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:57` | Self: 0.0% (0us) | Total: 31.0% (5.88s) | Samples: 0

**Called by:**
- `evaluate` (742)

**Calls:**
- `update` (710)
- `update` (24)
- `update` (6)
- `update` (1)
- `update` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:329` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:254` | Self: 0.0% (0us) | Total: 0.7% (143.8ms) | Samples: 0

**Called by:**
- `(module)` (14)
- `(module)` (6)

**Calls:**
- `geometryEntry` (6)
- `geometryEntry` (6)
- `geometryEntry` (4)
- `geometryEntry` (3)
- `geometryEntry` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:30` | Self: 0.0% (0us) | Total: 0.0% (17.9ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `mapMeshUv` (3)
- `mapMeshUv` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:47` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `SceneRenderResource` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:99` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `SceneRenderResource` (1)

**Calls:**
- `Group` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` | Self: 0.0% (0us) | Total: 0.0% (919us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:125` | Self: 0.0% (0us) | Total: 0.0% (13.7ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `record` (1)
- `record` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:346` | Self: 0.0% (0us) | Total: 0.2% (41.4ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)
- `sceneBounds` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:50` | Self: 0.0% (0us) | Total: 32.2% (6.10s) | Samples: 0

**Called by:**
- `evaluate` (794)

**Calls:**
- `update` (741)
- `update` (33)
- `update` (14)
- `update` (2)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:10` | Self: 0.0% (0us) | Total: 0.0% (944us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `indexSceneNodes` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (18.87s) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (2390)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `makeSafe`
`internal:primordials:49` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `internal:primordials` (2)

**Calls:**
- `copyProps` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` | Self: 0.0% (0us) | Total: 0.0% (15.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Mesh` (1)

### `readSceneImage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:177` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `hexToRgb` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:265` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `update` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (37.77s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2392)
- `async loadAndEvaluateModule` (2390)

**Calls:**
- `moduleEvaluation` (2392)
- `evaluate` (2390)

### `computeBoundingBox`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18766` | Self: 0.0% (0us) | Total: 0.1% (20.6ms) | Samples: 0

**Called by:**
- `geometryEntry` (6)

**Calls:**
- `setFromBufferAttribute` (5)
- `setFromBufferAttribute` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `fromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5985` | Self: 0.0% (0us) | Total: 0.0% (15.7ms) | Samples: 0

**Called by:**
- `setFromBufferAttribute` (1)

**Calls:**
- `getX` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.1% (32.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (2)

**Calls:**
- `map` (4)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (0us) | Total: 0.0% (944us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `composeTransform` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `cross` (2)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:89` | Self: 0.0% (0us) | Total: 0.2% (53.8ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `computeBoundingSphere` (6)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:75` | Self: 0.0% (0us) | Total: 2.0% (396.3ms) | Samples: 0

**Called by:**
- `evaluate` (38)

**Calls:**
- `every` (38)

### `setFromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` | Self: 0.0% (0us) | Total: 0.0% (15.7ms) | Samples: 0

**Called by:**
- `computeBoundingBox` (1)

**Calls:**
- `fromBufferAttribute` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:61` | Self: 0.0% (0us) | Total: 0.1% (34.5ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `from` (6)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:78` | Self: 0.0% (0us) | Total: 0.1% (30.6ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `Set` (3)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:74` | Self: 0.0% (0us) | Total: 0.0% (12.8ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `BufferGeometry` (1)

### `dispose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:358` | Self: 0.0% (0us) | Total: 0.2% (42.4ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `clear` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:90` | Self: 0.0% (0us) | Total: 0.2% (43.3ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `dispose` (2)
- `dispose` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.0% (16.6ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `id` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:202` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 0.4% (91.3ms) | Samples: 0

**Called by:**
- `map` (12)

**Calls:**
- `map` (12)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:60` | Self: 0.0% (0us) | Total: 30.7% (5.82s) | Samples: 0

**Called by:**
- `evaluate` (738)

**Calls:**
- `buildSceneGeometry` (391)
- `validateBuffers` (68)
- `buildSceneGeometry` (56)
- `buildSceneGeometry` (55)
- `buildSceneGeometry` (53)
- `buildSceneGeometry` (51)
- `buildSceneGeometry` (42)
- `buildSceneGeometry` (16)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:61` | Self: 0.0% (0us) | Total: 0.0% (956us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `orientation` (1)

### `SceneRenderResource`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:78` | Self: 0.0% (0us) | Total: 0.2% (41.6ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `update` (4)
- `get buffer` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:70` | Self: 0.0% (0us) | Total: 0.1% (30.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `getAttribute` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `internal:primordials`
`internal:primordials:71` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `makeSafe` (2)

### `mapMeshUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts:70` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `map` (3)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:168` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `next` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:172` | Self: 0.0% (0us) | Total: 60.5% (11.45s) | Samples: 0

**Called by:**
- `(module)` (741)
- `(module)` (710)

**Calls:**
- `buildSceneGeometry` (712)
- `validateBuffers` (166)
- `buildSceneGeometry` (121)
- `buildSceneGeometry` (108)
- `buildSceneGeometry` (106)
- `buildSceneGeometry` (97)
- `buildSceneGeometry` (79)
- `buildSceneGeometry` (37)
- `buildSceneGeometry` (9)
- `buildSceneGeometry` (6)
- `buildSceneGeometry` (4)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)

### `Group`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13376` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Object3D` (1)

### `internal:streams/legacy`
`internal:streams/legacy:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` | Self: 0.0% (0us) | Total: 0.4% (78.5ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (10)
- `buildSceneGeometry` (1)

**Calls:**
- `normalize` (9)
- `normalize` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` | Self: 0.0% (0us) | Total: 0.0% (16.9ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `sub` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.4% (77.5ms) | Samples: 0

**Called by:**
- `map` (10)

**Calls:**
- `map` (10)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts:38` | Self: 0.0% (0us) | Total: 1.5% (290.7ms) | Samples: 0

**Called by:**
- `evaluate` (42)

**Calls:**
- `buildSceneGeometry` (23)
- `buildSceneGeometry` (7)
- `validateBuffers` (6)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:23` | Self: 0.0% (0us) | Total: 0.5% (100.5ms) | Samples: 0

**Called by:**
- `update` (11)
- `readSceneDocument` (2)

**Calls:**
- `entries` (13)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:62` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `update` (1)

**Calls:**
- `from` (2)

### `Mesh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` | Self: 0.0% (0us) | Total: 0.0% (15.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `MeshBasicMaterial` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:154` | Self: 0.0% (0us) | Total: 0.0% (956us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:73` | Self: 0.0% (0us) | Total: 11.1% (2.10s) | Samples: 0

**Called by:**
- `update` (166)
- `(module)` (68)
- `(module)` (6)

**Calls:**
- `every` (240)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:63` | Self: 0.0% (0us) | Total: 0.1% (28.2ms) | Samples: 0

**Called by:**
- `update` (2)
- `(module)` (1)

**Calls:**
- `from` (3)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:284` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Map` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:71` | Self: 0.0% (0us) | Total: 0.0% (944us) | Samples: 0

**Called by:**
- `indexSceneNodes` (1)

**Calls:**
- `finiteTuple` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (18.87s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2390)

**Calls:**
- `(module)` (794)
- `(module)` (742)
- `(module)` (738)
- `(module)` (42)
- `(module)` (38)
- `(module)` (20)
- `(module)` (5)
- `(module)` (4)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `map` (2)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.0% (13.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (0us) | Total: 0.0% (956us) | Samples: 0

**Called by:**
- `evaluateSceneInstances` (1)

**Calls:**
- `affineDeterminant` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 40.6% | 7.68s | `[native code]` |
| 31.7% | 5.99s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 19.0% | 3.59s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 4.2% | 811.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 1.4% | 264.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 1.0% | 204.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 161.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-uv.ts` |
| 0.3% | 60.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.2% | 48.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 41.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 0.0% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshUv.ts` |
| 0.0% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneMaterialResource.ts` |
| 0.0% | 13.5ms | `internal:primordials` |
| 0.0% | 1.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts` |
