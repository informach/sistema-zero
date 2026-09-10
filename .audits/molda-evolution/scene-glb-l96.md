# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 8.07s | 949 | 1.0ms | 220 |

**Top 10:** `every` 16.7%, `dflt` 7.2%, `some` 4.9%, `compositeSceneImageRegion` 4.7%, `push` 4.2%, `map` 3.6%, `isFinite` 2.7%, `(anonymous)` 2.3%, `triangleUnitNormal` 2.2%, `set` 2.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 16.7% | 1.34s | 25.0% | 2.01s | `every` | `[native code]` |
| 7.2% | 584.4ms | 7.2% | 584.4ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 4.9% | 403.6ms | 6.7% | 541.0ms | `some` | `[native code]` |
| 4.7% | 379.9ms | 4.7% | 379.9ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 4.2% | 340.0ms | 4.2% | 340.0ms | `push` | `[native code]` |
| 3.6% | 298.4ms | 37.0% | 2.99s | `map` | `[native code]` |
| 2.7% | 222.8ms | 2.7% | 222.8ms | `isFinite` | `[native code]` |
| 2.3% | 186.2ms | 3.4% | 279.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 2.2% | 180.8ms | 2.6% | 212.7ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 2.2% | 180.0ms | 2.2% | 180.0ms | `set` | `[native code]` |
| 2.0% | 168.4ms | 2.0% | 168.4ms | `flatIntoArray` | `[native code]` |
| 1.9% | 156.8ms | 2.8% | 230.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.8% | 152.2ms | 1.8% | 152.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 1.6% | 135.0ms | 2.4% | 199.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 1.5% | 123.0ms | 1.5% | 123.0ms | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` |
| 1.4% | 119.2ms | 1.4% | 119.2ms | `entries` | `[native code]` |
| 1.4% | 114.2ms | 1.4% | 114.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.2% | 104.5ms | 1.2% | 104.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 1.2% | 103.2ms | 1.2% | 103.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 1.2% | 103.1ms | 1.2% | 103.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 1.2% | 101.7ms | 1.2% | 101.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 1.0% | 86.0ms | 3.0% | 248.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 1.0% | 84.1ms | 1.0% | 84.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 1.0% | 81.4ms | 1.0% | 81.4ms | `Set` | `[native code]` |
| 1.0% | 80.7ms | 1.0% | 80.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.9% | 79.4ms | 0.9% | 79.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.9% | 76.5ms | 0.9% | 76.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.9% | 76.5ms | 0.9% | 76.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.9% | 74.1ms | 0.9% | 74.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.9% | 73.3ms | 0.9% | 73.3ms | `max` | `[native code]` |
| 0.8% | 71.2ms | 0.8% | 72.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.8% | 67.9ms | 0.8% | 67.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.8% | 65.2ms | 0.8% | 65.2ms | `min` | `[native code]` |
| 0.7% | 61.5ms | 0.7% | 61.5ms | `stringify` | `[native code]` |
| 0.7% | 59.6ms | 0.7% | 59.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.6% | 49.8ms | 0.6% | 49.8ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.6% | 48.9ms | 1.3% | 108.7ms | `from` | `[native code]` |
| 0.5% | 48.0ms | 0.5% | 48.0ms | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:55` |
| 0.5% | 47.9ms | 0.5% | 47.9ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.5% | 46.6ms | 0.9% | 78.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.5% | 46.4ms | 0.5% | 46.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.5% | 45.1ms | 1.0% | 82.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 0.5% | 42.4ms | 0.6% | 50.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.5% | 41.9ms | 0.5% | 41.9ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.5% | 40.4ms | 0.5% | 40.4ms | `copyDataProperties` | `[native code]` |
| 0.4% | 33.6ms | 1.0% | 82.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.4% | 32.9ms | 0.4% | 32.9ms | `Buffer` | `[native code]` |
| 0.3% | 31.9ms | 0.3% | 31.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:657` |
| 0.3% | 31.4ms | 2.6% | 215.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.3% | 30.7ms | 0.3% | 30.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.3% | 30.6ms | 0.3% | 30.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.3% | 30.4ms | 0.3% | 30.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.3% | 30.1ms | 0.3% | 30.1ms | `Uint8Array` | `[native code]` |
| 0.3% | 28.1ms | 0.3% | 28.1ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.3% | 25.6ms | 0.7% | 59.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.2% | 23.7ms | 0.2% | 23.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.2% | 19.9ms | 0.2% | 19.9ms | `abs` | `[native code]` |
| 0.2% | 18.7ms | 0.2% | 18.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.2% | 18.4ms | 0.2% | 18.4ms | `splice` | `[native code]` |
| 0.2% | 17.6ms | 0.2% | 17.6ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.2% | 17.2ms | 1.1% | 94.7ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` |
| 0.2% | 16.5ms | 0.2% | 16.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.2% | 16.5ms | 2.3% | 186.0ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 16.0ms | 0.5% | 47.9ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |
| 0.1% | 16.0ms | 0.4% | 34.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:801` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.1% | 15.8ms | 0.6% | 51.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.1% | 15.8ms | 0.2% | 16.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.1% | 15.8ms | 0.1% | 15.8ms | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:48` |
| 0.1% | 15.7ms | 1.1% | 89.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:80` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `get` | `[native code]` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `resolve` | `[native code]` |
| 0.1% | 15.4ms | 0.1% | 15.4ms | `adler` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.1% | 15.2ms | 0.1% | 15.2ms | `DataView` | `[native code]` |
| 0.1% | 15.2ms | 0.1% | 15.2ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 15.1ms | 0.1% | 15.1ms | `addView` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts` |
| 0.1% | 15.0ms | 0.1% | 15.0ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.1% | 15.0ms | 0.1% | 15.0ms | `uncurryThis` | `internal:primordials` |
| 0.1% | 14.9ms | 0.1% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.1% | 14.8ms | 0.1% | 14.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.1% | 14.8ms | 1.2% | 102.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.1% | 14.8ms | 0.1% | 14.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:61` |
| 0.1% | 14.6ms | 0.5% | 47.8ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:71` |
| 0.1% | 14.4ms | 0.3% | 29.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 0.1% | 14.3ms | 0.1% | 14.3ms | `get buffer` | `[native code]` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.1% | 13.6ms | 0.9% | 74.8ms | `flatMap` | `[native code]` |
| 0.1% | 13.3ms | 0.1% | 13.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:27` |
| 0.1% | 13.0ms | 0.1% | 13.0ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.1% | 12.7ms | 1.3% | 106.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.1% | 11.6ms | 0.1% | 11.6ms | `fetch` | `[native code]` |
| 0.1% | 11.6ms | 0.1% | 11.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.1% | 11.5ms | 0.1% | 11.5ms | `hTree` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:460` |
| 0.1% | 8.3ms | 0.1% | 8.3ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.0% | 1.8ms | 0.2% | 17.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.0% | 1.1ms | 0.1% | 13.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.0% | 1.0ms | 0.2% | 16.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:160` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:13` |
| 0.0% | 996us | 0.0% | 996us | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 981us | 0.2% | 17.0ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.0% | 977us | 0.0% | 977us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 969us | 0.0% | 969us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:40` |
| 0.0% | 947us | 5.3% | 432.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.0% | 927us | 0.3% | 32.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.0% | 923us | 0.0% | 923us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:47` |
| 0.0% | 909us | 0.0% | 909us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:645` |
| 0.0% | 908us | 26.3% | 2.12s | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 0.0% | 896us | 0.0% | 896us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` |
| 0.0% | 894us | 0.0% | 894us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:73` |
| 0.0% | 889us | 0.0% | 889us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 879us | 0.0% | 879us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:50` |
| 0.0% | 878us | 0.0% | 878us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:105` |
| 0.0% | 878us | 0.3% | 28.6ms | `addView` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:40` |
| 0.0% | 877us | 0.0% | 877us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.0% | 845us | 0.0% | 845us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:662` |
| 0.0% | 843us | 0.0% | 843us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 16.15s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.6% | 8.04s | 0.0% | 0us | `evaluate` | `[native code]` |
| 99.6% | 8.04s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 93.8% | 7.57s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:87` |
| 59.4% | 4.79s | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` |
| 49.8% | 4.02s | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` |
| 37.0% | 2.99s | 3.6% | 298.4ms | `map` | `[native code]` |
| 26.3% | 2.12s | 0.0% | 908us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 25.0% | 2.01s | 16.7% | 1.34s | `every` | `[native code]` |
| 20.4% | 1.65s | 0.0% | 0us | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` |
| 20.4% | 1.65s | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` |
| 20.4% | 1.65s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` |
| 11.7% | 952.2ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` |
| 10.0% | 809.1ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` |
| 9.5% | 770.1ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` |
| 9.0% | 728.0ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` |
| 8.4% | 681.5ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` |
| 8.0% | 646.7ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` |
| 7.2% | 584.4ms | 7.2% | 584.4ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 6.7% | 541.0ms | 4.9% | 403.6ms | `some` | `[native code]` |
| 6.2% | 505.0ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 5.9% | 477.6ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 5.3% | 432.9ms | 0.0% | 947us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 4.7% | 379.9ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` |
| 4.7% | 379.9ms | 4.7% | 379.9ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 4.2% | 342.1ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 4.2% | 340.0ms | 4.2% | 340.0ms | `push` | `[native code]` |
| 3.9% | 322.8ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:43` |
| 3.8% | 314.6ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` |
| 3.8% | 314.6ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` |
| 3.5% | 283.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:83` |
| 3.4% | 279.3ms | 2.3% | 186.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 3.1% | 254.3ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` |
| 3.0% | 248.5ms | 1.0% | 86.0ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 2.8% | 230.5ms | 1.9% | 156.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 2.7% | 224.5ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 2.7% | 222.8ms | 2.7% | 222.8ms | `isFinite` | `[native code]` |
| 2.6% | 215.1ms | 0.3% | 31.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 2.6% | 212.7ms | 2.2% | 180.8ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 2.5% | 207.2ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:44` |
| 2.4% | 199.8ms | 1.6% | 135.0ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 2.3% | 186.0ms | 0.2% | 16.5ms | `flatIntoArrayWithCallback` | `[native code]` |
| 2.2% | 180.0ms | 2.2% | 180.0ms | `set` | `[native code]` |
| 2.2% | 179.5ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:74` |
| 2.0% | 168.4ms | 2.0% | 168.4ms | `flatIntoArray` | `[native code]` |
| 1.8% | 152.2ms | 1.8% | 152.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 1.8% | 145.4ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:45` |
| 1.7% | 138.0ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:93` |
| 1.5% | 123.0ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` |
| 1.5% | 123.0ms | 1.5% | 123.0ms | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` |
| 1.4% | 119.2ms | 1.4% | 119.2ms | `entries` | `[native code]` |
| 1.4% | 114.2ms | 1.4% | 114.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.3% | 108.7ms | 0.6% | 48.9ms | `from` | `[native code]` |
| 1.3% | 106.2ms | 0.1% | 12.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 1.2% | 104.5ms | 1.2% | 104.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 1.2% | 103.2ms | 1.2% | 103.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 1.2% | 103.1ms | 1.2% | 103.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 1.2% | 102.4ms | 0.1% | 14.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 1.2% | 101.7ms | 1.2% | 101.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 1.2% | 101.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:81` |
| 1.1% | 94.7ms | 0.2% | 17.2ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` |
| 1.1% | 89.1ms | 0.1% | 15.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 1.0% | 84.1ms | 1.0% | 84.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 1.0% | 82.9ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` |
| 1.0% | 82.8ms | 0.5% | 45.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 1.0% | 82.2ms | 0.4% | 33.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 1.0% | 81.4ms | 1.0% | 81.4ms | `Set` | `[native code]` |
| 1.0% | 80.7ms | 1.0% | 80.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.9% | 79.4ms | 0.9% | 79.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.9% | 78.5ms | 0.5% | 46.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.9% | 76.5ms | 0.9% | 76.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.9% | 76.5ms | 0.9% | 76.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.9% | 75.6ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:75` |
| 0.9% | 75.0ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 0.9% | 74.8ms | 0.1% | 13.6ms | `flatMap` | `[native code]` |
| 0.9% | 74.1ms | 0.9% | 74.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.9% | 73.3ms | 0.9% | 73.3ms | `max` | `[native code]` |
| 0.8% | 72.1ms | 0.8% | 71.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.8% | 67.9ms | 0.8% | 67.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.8% | 67.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.8% | 65.8ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` |
| 0.8% | 65.2ms | 0.8% | 65.2ms | `min` | `[native code]` |
| 0.7% | 61.5ms | 0.0% | 0us | `encodeGlbContainer` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:11` |
| 0.7% | 61.5ms | 0.7% | 61.5ms | `stringify` | `[native code]` |
| 0.7% | 61.2ms | 0.0% | 0us | `encodeGlbContainer` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:32` |
| 0.7% | 59.6ms | 0.7% | 59.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.7% | 59.1ms | 0.3% | 25.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.6% | 56.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 0.6% | 54.9ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` |
| 0.6% | 51.8ms | 0.1% | 15.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.6% | 50.1ms | 0.5% | 42.4ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.6% | 49.8ms | 0.6% | 49.8ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.6% | 49.1ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:22` |
| 0.5% | 48.0ms | 0.5% | 48.0ms | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:55` |
| 0.5% | 47.9ms | 0.1% | 16.0ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` |
| 0.5% | 47.9ms | 0.0% | 0us | `next` | `[native code]` |
| 0.5% | 47.9ms | 0.5% | 47.9ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.5% | 47.8ms | 0.1% | 14.6ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:71` |
| 0.5% | 46.4ms | 0.5% | 46.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.5% | 44.9ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 0.5% | 44.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 0.5% | 44.9ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 0.5% | 44.9ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 0.5% | 44.6ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.5% | 43.7ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:64` |
| 0.5% | 41.9ms | 0.5% | 41.9ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.5% | 41.1ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:53` |
| 0.5% | 40.4ms | 0.5% | 40.4ms | `copyDataProperties` | `[native code]` |
| 0.4% | 39.1ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 0.4% | 38.8ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.4% | 34.5ms | 0.1% | 16.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.4% | 32.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:90` |
| 0.4% | 32.9ms | 0.4% | 32.9ms | `Buffer` | `[native code]` |
| 0.3% | 32.2ms | 0.0% | 927us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.3% | 31.9ms | 0.3% | 31.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:657` |
| 0.3% | 30.7ms | 0.3% | 30.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.3% | 30.6ms | 0.3% | 30.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.3% | 30.5ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` |
| 0.3% | 30.4ms | 0.3% | 30.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.3% | 30.1ms | 0.3% | 30.1ms | `Uint8Array` | `[native code]` |
| 0.3% | 29.7ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:65` |
| 0.3% | 29.5ms | 0.1% | 14.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 0.3% | 28.6ms | 0.0% | 878us | `addView` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:40` |
| 0.3% | 28.1ms | 0.3% | 28.1ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.3% | 28.1ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.3% | 28.1ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.3% | 28.1ms | 0.0% | 0us | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` |
| 0.3% | 25.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.2% | 23.7ms | 0.2% | 23.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.2% | 23.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:42` |
| 0.2% | 19.9ms | 0.2% | 19.9ms | `abs` | `[native code]` |
| 0.2% | 18.7ms | 0.2% | 18.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.2% | 18.4ms | 0.2% | 18.4ms | `splice` | `[native code]` |
| 0.2% | 17.8ms | 0.0% | 1.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.2% | 17.6ms | 0.2% | 17.6ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.2% | 17.0ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.2% | 17.0ms | 0.0% | 981us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.2% | 16.8ms | 0.1% | 15.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.2% | 16.6ms | 0.0% | 1.0ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.2% | 16.5ms | 0.2% | 16.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.1% | 16.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:68` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 16.0ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:23` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:801` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.1% | 15.8ms | 0.1% | 15.8ms | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:48` |
| 0.1% | 15.6ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.1% | 15.6ms | 0.1% | 15.6ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:80` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 0.1% | 15.5ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 0.1% | 15.5ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:55` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `get` | `[native code]` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `resolve` | `[native code]` |
| 0.1% | 15.4ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1484` |
| 0.1% | 15.4ms | 0.1% | 15.4ms | `adler` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.1% | 15.2ms | 0.1% | 15.2ms | `DataView` | `[native code]` |
| 0.1% | 15.2ms | 0.0% | 0us | `encodeGlbContainer` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:18` |
| 0.1% | 15.2ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` |
| 0.1% | 15.2ms | 0.1% | 15.2ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 15.1ms | 0.1% | 15.1ms | `addView` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts` |
| 0.1% | 15.1ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:134` |
| 0.1% | 15.0ms | 0.1% | 15.0ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.1% | 15.0ms | 0.0% | 0us | `node:worker_threads` | `node:worker_threads:2` |
| 0.1% | 15.0ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.1% | 15.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.1% | 15.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:18` |
| 0.1% | 15.0ms | 0.0% | 0us | `bound require` | `[native code]` |
| 0.1% | 15.0ms | 0.0% | 0us | `node:events` | `node:events:9` |
| 0.1% | 15.0ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:50` |
| 0.1% | 15.0ms | 0.1% | 15.0ms | `uncurryThis` | `internal:primordials` |
| 0.1% | 14.9ms | 0.1% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.1% | 14.9ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:66` |
| 0.1% | 14.8ms | 0.1% | 14.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.1% | 14.8ms | 0.1% | 14.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:61` |
| 0.1% | 14.3ms | 0.1% | 14.3ms | `get buffer` | `[native code]` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.1% | 14.2ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.1% | 13.8ms | 0.0% | 1.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.1% | 13.3ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:27` |
| 0.1% | 13.3ms | 0.1% | 13.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:27` |
| 0.1% | 13.3ms | 0.0% | 0us | `filter` | `[native code]` |
| 0.1% | 13.0ms | 0.1% | 13.0ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.1% | 11.6ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.1% | 11.6ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.1% | 11.6ms | 0.1% | 11.6ms | `fetch` | `[native code]` |
| 0.1% | 11.6ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.1% | 11.6ms | 0.1% | 11.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.1% | 11.5ms | 0.0% | 0us | `wblk` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:575` |
| 0.1% | 11.5ms | 0.1% | 11.5ms | `hTree` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:460` |
| 0.1% | 11.5ms | 0.0% | 0us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:746` |
| 0.1% | 8.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.1% | 8.3ms | 0.1% | 8.3ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 4.5ms | 0.0% | 4.5ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:160` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:13` |
| 0.0% | 996us | 0.0% | 996us | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 985us | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` |
| 0.0% | 977us | 0.0% | 977us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 977us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 969us | 0.0% | 969us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:40` |
| 0.0% | 959us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:67` |
| 0.0% | 923us | 0.0% | 923us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:47` |
| 0.0% | 909us | 0.0% | 909us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:645` |
| 0.0% | 896us | 0.0% | 896us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` |
| 0.0% | 894us | 0.0% | 894us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:73` |
| 0.0% | 889us | 0.0% | 889us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 879us | 0.0% | 879us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:50` |
| 0.0% | 878us | 0.0% | 878us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:105` |
| 0.0% | 877us | 0.0% | 877us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.0% | 845us | 0.0% | 845us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:662` |
| 0.0% | 843us | 0.0% | 843us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` |

## Function Details

### `every`
`[native code]` | Self: 16.7% (1.34s) | Total: 25.0% (2.01s) | Samples: 147

**Called by:**
- `floats` (82)
- `every` (52)
- `validateBuffers` (52)
- `prepareSceneGlbTrack` (31)

**Calls:**
- `every` (52)
- `isFinite` (18)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` | Self: 7.2% (584.4ms) | Total: 7.2% (584.4ms) | Samples: 57

**Called by:**
- `zlibSync` (57)

### `some`
`[native code]` | Self: 4.9% (403.6ms) | Total: 6.7% (541.0ms) | Samples: 34

**Called by:**
- `texture` (46)
- `triangulateFace` (8)

**Calls:**
- `(anonymous)` (14)
- `(anonymous)` (6)

### `compositeSceneImageRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` | Self: 4.7% (379.9ms) | Total: 4.7% (379.9ms) | Samples: 41

**Called by:**
- `texture` (41)

### `push`
`[native code]` | Self: 4.2% (340.0ms) | Total: 4.2% (340.0ms) | Samples: 50

**Called by:**
- `buildSceneGeometry` (20)
- `buildSceneGeometry` (12)
- `buildSceneGeometry` (8)
- `buildSceneGeometry` (8)
- `triangulateFace` (2)

### `map`
`[native code]` | Self: 3.6% (298.4ms) | Total: 37.0% (2.99s) | Samples: 39

**Called by:**
- `encodeSceneGlb` (162)
- `triangulateFace` (46)
- `buildSceneGeometry` (38)
- `buildSceneGeometry` (13)
- `(anonymous)` (8)
- `readSceneDocument` (8)
- `triangulateFace` (8)
- `triangulateFace` (7)
- `readSceneGeometry` (6)
- `triangulateFace` (6)
- `triangulateFace` (6)
- `readSceneAnimations` (5)
- `(anonymous)` (5)
- `triangleUnitNormal` (5)
- `readSceneAnimationClip` (5)
- `prepareSceneGlbTrack` (5)
- `(anonymous)` (4)
- `triangulateFace` (2)
- `(anonymous)` (1)
- `prepareSceneGlbTrack` (1)
- `readSceneGeometry` (1)

**Calls:**
- `(anonymous)` (162)
- `(anonymous)` (30)
- `(anonymous)` (18)
- `(anonymous)` (17)
- `(anonymous)` (16)
- `(anonymous)` (10)
- `(anonymous)` (9)
- `readSceneGeometry` (6)
- `abs` (5)
- `(anonymous)` (5)
- `readSceneAnimationClip` (5)
- `(anonymous)` (4)
- `readKey` (2)
- `readKey` (2)
- `readSceneGeometry` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `isFinite`
`[native code]` | Self: 2.7% (222.8ms) | Total: 2.7% (222.8ms) | Samples: 22

**Called by:**
- `every` (18)
- `triangulateFace` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 2.3% (186.2ms) | Total: 3.4% (279.3ms) | Samples: 21

**Called by:**
- `map` (30)

**Calls:**
- `max` (5)
- `min` (4)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 2.2% (180.8ms) | Total: 2.6% (212.7ms) | Samples: 23

**Called by:**
- `buildSceneGeometry` (29)

**Calls:**
- `map` (5)
- `max` (1)

### `set`
`[native code]` | Self: 2.2% (180.0ms) | Total: 2.2% (180.0ms) | Samples: 16

**Called by:**
- `prepareSceneGlbTrack` (9)
- `encodeGlbContainer` (5)
- `encodePng` (2)

### `flatIntoArray`
`[native code]` | Self: 2.0% (168.4ms) | Total: 2.0% (168.4ms) | Samples: 19

**Called by:**
- `flatIntoArrayWithCallback` (19)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 1.9% (156.8ms) | Total: 2.8% (230.5ms) | Samples: 20

**Called by:**
- `prepareSceneGlbGeometry` (28)

**Calls:**
- `push` (8)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 1.8% (152.2ms) | Total: 1.8% (152.2ms) | Samples: 23

**Called by:**
- `map` (16)
- `some` (6)
- `flatIntoArrayWithCallback` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 1.6% (135.0ms) | Total: 2.4% (199.8ms) | Samples: 15

**Called by:**
- `prepareSceneGlbGeometry` (27)

**Calls:**
- `push` (12)

### `append`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` | Self: 1.5% (123.0ms) | Total: 1.5% (123.0ms) | Samples: 13

**Called by:**
- `prepareSceneGlbTrack` (13)

### `entries`
`[native code]` | Self: 1.4% (119.2ms) | Total: 1.4% (119.2ms) | Samples: 6

**Called by:**
- `indexSceneDocument` (4)
- `readSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 1.4% (114.2ms) | Total: 1.4% (114.2ms) | Samples: 18

**Called by:**
- `buildSceneGeometry` (18)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` | Self: 1.2% (104.5ms) | Total: 1.2% (104.5ms) | Samples: 9

**Called by:**
- `buildSceneGeometry` (9)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 1.2% (103.2ms) | Total: 1.2% (103.2ms) | Samples: 20

**Called by:**
- `prepareSceneGlbHierarchy` (20)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 1.2% (103.1ms) | Total: 1.2% (103.1ms) | Samples: 14

**Called by:**
- `some` (14)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` | Self: 1.2% (101.7ms) | Total: 1.2% (101.7ms) | Samples: 17

**Called by:**
- `map` (17)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 1.0% (86.0ms) | Total: 3.0% (248.5ms) | Samples: 14

**Called by:**
- `prepareSceneGlbGeometry` (34)

**Calls:**
- `push` (20)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` | Self: 1.0% (84.1ms) | Total: 1.0% (84.1ms) | Samples: 11

**Called by:**
- `buildSceneGeometry` (11)

### `Set`
`[native code]` | Self: 1.0% (81.4ms) | Total: 1.0% (81.4ms) | Samples: 10

**Called by:**
- `prepareSceneGlbGeometry` (6)
- `prepareSceneGlbTrack` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` | Self: 1.0% (80.7ms) | Total: 1.0% (80.7ms) | Samples: 18

**Called by:**
- `map` (18)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` | Self: 0.9% (79.4ms) | Total: 0.9% (79.4ms) | Samples: 7

**Called by:**
- `buildSceneGeometry` (7)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 0.9% (76.5ms) | Total: 0.9% (76.5ms) | Samples: 10

**Called by:**
- `map` (10)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.9% (76.5ms) | Total: 0.9% (76.5ms) | Samples: 9

**Called by:**
- `buildSceneGeometry` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 0.9% (74.1ms) | Total: 0.9% (74.1ms) | Samples: 12

**Called by:**
- `buildSceneGeometry` (12)

### `max`
`[native code]` | Self: 0.9% (73.3ms) | Total: 0.9% (73.3ms) | Samples: 7

**Called by:**
- `(anonymous)` (5)
- `triangleUnitNormal` (1)
- `triangulateFace` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` | Self: 0.8% (71.2ms) | Total: 0.8% (72.1ms) | Samples: 6

**Called by:**
- `buildSceneGeometry` (7)

**Calls:**
- `max` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 0.8% (67.9ms) | Total: 0.8% (67.9ms) | Samples: 10

**Called by:**
- `prepareSceneGlbHierarchy` (10)

### `min`
`[native code]` | Self: 0.8% (65.2ms) | Total: 0.8% (65.2ms) | Samples: 7

**Called by:**
- `(anonymous)` (4)
- `triangulateFace` (3)

### `stringify`
`[native code]` | Self: 0.7% (61.5ms) | Total: 0.7% (61.5ms) | Samples: 4

**Called by:**
- `encodeGlbContainer` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` | Self: 0.7% (59.6ms) | Total: 0.7% (59.6ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (5)

### `p`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` | Self: 0.6% (49.8ms) | Total: 0.6% (49.8ms) | Samples: 4

**Called by:**
- `zlibSync` (4)

### `from`
`[native code]` | Self: 0.6% (48.9ms) | Total: 1.3% (108.7ms) | Samples: 8

**Called by:**
- `prepareSceneGlbTrack` (8)
- `list` (2)
- `(module)` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (2)
- `typedArrayViewTypedArrayFromFast` (2)
- `next` (1)
- `Uint8Array` (1)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:55` | Self: 0.5% (48.0ms) | Total: 0.5% (48.0ms) | Samples: 3

**Called by:**
- `prepareSceneGlbGeometry` (2)
- `prepareSceneGlbAnimations` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.5% (47.9ms) | Total: 0.5% (47.9ms) | Samples: 6

**Called by:**
- `next` (6)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.5% (46.6ms) | Total: 0.9% (78.5ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (8)

**Calls:**
- `min` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` | Self: 0.5% (46.4ms) | Total: 0.5% (46.4ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` | Self: 0.5% (45.1ms) | Total: 1.0% (82.8ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (11)

**Calls:**
- `map` (7)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.5% (42.4ms) | Total: 0.6% (50.1ms) | Samples: 3

**Called by:**
- `prepareSceneGlbGeometry` (11)

**Calls:**
- `push` (8)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.5% (41.9ms) | Total: 0.5% (41.9ms) | Samples: 4

**Called by:**
- `triangleUnitNormal` (4)

### `copyDataProperties`
`[native code]` | Self: 0.5% (40.4ms) | Total: 0.5% (40.4ms) | Samples: 3

**Called by:**
- `addView` (2)
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.4% (33.6ms) | Total: 1.0% (82.2ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (11)

**Calls:**
- `map` (6)

### `Buffer`
`[native code]` | Self: 0.4% (32.9ms) | Total: 0.4% (32.9ms) | Samples: 6

**Called by:**
- `(anonymous)` (6)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:657` | Self: 0.3% (31.9ms) | Total: 0.3% (31.9ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.3% (31.4ms) | Total: 2.6% (215.1ms) | Samples: 7

**Called by:**
- `buildSceneGeometry` (30)

**Calls:**
- `flatIntoArrayWithCallback` (15)
- `flatMap` (8)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` | Self: 0.3% (30.7ms) | Total: 0.3% (30.7ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` | Self: 0.3% (30.6ms) | Total: 0.3% (30.6ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.3% (30.4ms) | Total: 0.3% (30.4ms) | Samples: 5

**Called by:**
- `buildSceneGeometry` (5)

### `Uint8Array`
`[native code]` | Self: 0.3% (30.1ms) | Total: 0.3% (30.1ms) | Samples: 2

**Called by:**
- `from` (1)
- `floats` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.3% (28.1ms) | Total: 0.3% (28.1ms) | Samples: 2

**Called by:**
- `from` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` | Self: 0.3% (25.6ms) | Total: 0.7% (59.1ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (8)

**Calls:**
- `map` (6)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.2% (23.7ms) | Total: 0.2% (23.7ms) | Samples: 2

**Called by:**
- `prepareSceneGlbHierarchy` (2)

### `abs`
`[native code]` | Self: 0.2% (19.9ms) | Total: 0.2% (19.9ms) | Samples: 6

**Called by:**
- `map` (5)
- `triangulateFace` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.2% (18.7ms) | Total: 0.2% (18.7ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (4)

### `splice`
`[native code]` | Self: 0.2% (18.4ms) | Total: 0.2% (18.4ms) | Samples: 4

**Called by:**
- `triangulateFace` (4)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` | Self: 0.2% (17.6ms) | Total: 0.2% (17.6ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` | Self: 0.2% (17.2ms) | Total: 1.1% (94.7ms) | Samples: 3

**Called by:**
- `prepareSceneGlbAnimations` (12)

**Calls:**
- `set` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` | Self: 0.2% (16.5ms) | Total: 0.2% (16.5ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (4)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.2% (16.5ms) | Total: 2.3% (186.0ms) | Samples: 2

**Called by:**
- `triangulateFace` (15)
- `flatMap` (6)
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `flatIntoArray` (19)
- `(anonymous)` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` | Self: 0.1% (16.0ms) | Total: 0.5% (47.9ms) | Samples: 2

**Called by:**
- `prepareSceneGlbAnimations` (6)

**Calls:**
- `next` (4)

### `hsh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 4

**Called by:**
- `dflt` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` | Self: 0.1% (16.0ms) | Total: 0.4% (34.5ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (5)

**Calls:**
- `splice` (4)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `p`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:801` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.1% (15.9ms) | Total: 0.1% (15.9ms) | Samples: 2

**Called by:**
- `from` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` | Self: 0.1% (15.8ms) | Total: 0.6% (51.8ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (10)

**Calls:**
- `some` (8)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.1% (15.8ms) | Total: 0.2% (16.8ms) | Samples: 3

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `intersect` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:48` | Self: 0.1% (15.8ms) | Total: 0.1% (15.8ms) | Samples: 1

**Called by:**
- `encodeSceneGlb` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.1% (15.7ms) | Total: 1.1% (89.1ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (9)

**Calls:**
- `map` (8)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` | Self: 0.1% (15.6ms) | Total: 0.1% (15.6ms) | Samples: 2

**Called by:**
- `readKey` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` | Self: 0.1% (15.6ms) | Total: 0.1% (15.6ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:80` | Self: 0.1% (15.6ms) | Total: 0.1% (15.6ms) | Samples: 1

**Called by:**
- `prepareSceneGlbAnimations` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` | Self: 0.1% (15.5ms) | Total: 0.1% (15.5ms) | Samples: 2

**Called by:**
- `prepareSceneGlbGeometry` (2)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` | Self: 0.1% (15.5ms) | Total: 0.1% (15.5ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `get`
`[native code]` | Self: 0.1% (15.5ms) | Total: 0.1% (15.5ms) | Samples: 1

**Called by:**
- `prepareSceneGlbAnimations` (1)

### `resolve`
`[native code]` | Self: 0.1% (15.5ms) | Total: 0.1% (15.5ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `adler`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` | Self: 0.1% (15.4ms) | Total: 0.1% (15.4ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `DataView`
`[native code]` | Self: 0.1% (15.2ms) | Total: 0.1% (15.2ms) | Samples: 1

**Called by:**
- `encodeGlbContainer` (1)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.1% (15.2ms) | Total: 0.1% (15.2ms) | Samples: 2

**Called by:**
- `triangleUnitNormal` (2)

### `addView`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts` | Self: 0.1% (15.1ms) | Total: 0.1% (15.1ms) | Samples: 1

**Called by:**
- `floats` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` | Self: 0.1% (15.0ms) | Total: 0.1% (15.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `uncurryThis`
`internal:primordials` | Self: 0.1% (15.0ms) | Total: 0.1% (15.0ms) | Samples: 1

**Called by:**
- `internal:primordials` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` | Self: 0.1% (14.9ms) | Total: 0.1% (14.9ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.1% (14.8ms) | Total: 0.1% (14.8ms) | Samples: 1

**Called by:**
- `map` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.1% (14.8ms) | Total: 1.2% (102.4ms) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (5)

**Calls:**
- `entries` (4)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:61` | Self: 0.1% (14.8ms) | Total: 0.1% (14.8ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:71` | Self: 0.1% (14.6ms) | Total: 0.5% (47.8ms) | Samples: 1

**Called by:**
- `prepareSceneGlbAnimations` (6)

**Calls:**
- `Set` (4)
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` | Self: 0.1% (14.4ms) | Total: 0.3% (29.5ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `map` (2)

### `get buffer`
`[native code]` | Self: 0.1% (14.3ms) | Total: 0.1% (14.3ms) | Samples: 1

**Called by:**
- `floats` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.1% (14.2ms) | Total: 0.1% (14.2ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.1% (14.2ms) | Total: 0.1% (14.2ms) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `flatMap`
`[native code]` | Self: 0.1% (13.6ms) | Total: 0.9% (74.8ms) | Samples: 2

**Called by:**
- `triangulateFace` (8)

**Calls:**
- `flatIntoArrayWithCallback` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:27` | Self: 0.1% (13.3ms) | Total: 0.1% (13.3ms) | Samples: 1

**Called by:**
- `filter` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` | Self: 0.1% (13.0ms) | Total: 0.1% (13.0ms) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.1% (12.7ms) | Total: 1.3% (106.2ms) | Samples: 1

**Called by:**
- `map` (9)

**Calls:**
- `map` (8)

### `fetch`
`[native code]` | Self: 0.1% (11.6ms) | Total: 0.1% (11.6ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` | Self: 0.1% (11.6ms) | Total: 0.1% (11.6ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `hTree`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:460` | Self: 0.1% (11.5ms) | Total: 0.1% (11.5ms) | Samples: 1

**Called by:**
- `wblk` (1)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.1% (8.3ms) | Total: 0.1% (8.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` | Self: 0.0% (4.5ms) | Total: 0.0% (4.5ms) | Samples: 5

**Called by:**
- `(module)` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` | Self: 0.0% (1.8ms) | Total: 0.2% (17.8ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `point` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.0% (1.1ms) | Total: 0.1% (13.8ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `copyDataProperties` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` | Self: 0.0% (1.0ms) | Total: 0.2% (16.6ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (2)

**Calls:**
- `entries` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:160` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:13` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (996us) | Total: 0.0% (996us) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` | Self: 0.0% (981us) | Total: 0.2% (17.0ms) | Samples: 1

**Called by:**
- `zlibSync` (5)

**Calls:**
- `hsh` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (977us) | Total: 0.0% (977us) | Samples: 1

**Called by:**
- `map` (1)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:40` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `texture` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (947us) | Total: 5.3% (432.9ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (47)

**Calls:**
- `map` (46)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` | Self: 0.0% (927us) | Total: 0.3% (32.2ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `push` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:47` | Self: 0.0% (923us) | Total: 0.0% (923us) | Samples: 1

**Called by:**
- `map` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:645` | Self: 0.0% (909us) | Total: 0.0% (909us) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (908us) | Total: 26.3% (2.12s) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (267)

**Calls:**
- `triangulateFace` (47)
- `triangulateFace` (30)
- `triangulateFace` (18)
- `triangulateFace` (12)
- `triangulateFace` (11)
- `triangulateFace` (11)
- `triangulateFace` (11)
- `triangulateFace` (10)
- `triangulateFace` (9)
- `triangulateFace` (9)
- `triangulateFace` (9)
- `triangulateFace` (8)
- `triangulateFace` (8)
- `triangulateFace` (7)
- `triangulateFace` (7)
- `triangulateFace` (5)
- `triangulateFace` (5)
- `triangulateFace` (5)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:73` | Self: 0.0% (894us) | Total: 0.0% (894us) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 0.0% (889us) | Total: 0.0% (889us) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:50` | Self: 0.0% (879us) | Total: 0.0% (879us) | Samples: 1

**Called by:**
- `encodeSceneGlb` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:105` | Self: 0.0% (878us) | Total: 0.0% (878us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `addView`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:40` | Self: 0.0% (878us) | Total: 0.3% (28.6ms) | Samples: 1

**Called by:**
- `floats` (3)

**Calls:**
- `copyDataProperties` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` | Self: 0.0% (877us) | Total: 0.0% (877us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:662` | Self: 0.0% (845us) | Total: 0.0% (845us) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` | Self: 0.0% (843us) | Total: 0.0% (843us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` | Self: 0.0% (0us) | Total: 3.8% (314.6ms) | Samples: 0

**Called by:**
- `(module)` (38)
- `(module)` (2)

**Calls:**
- `prepareSceneGlbHierarchy` (40)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:22` | Self: 0.0% (0us) | Total: 0.6% (49.1ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (6)

**Calls:**
- `Set` (6)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` | Self: 0.0% (0us) | Total: 0.3% (30.5ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `isFinite` (4)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (0us) | Total: 0.3% (28.1ms) | Samples: 0

**Called by:**
- `readKey` (2)

**Calls:**
- `list` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:18` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `bound require` (1)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 0.5% (44.9ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `map` (5)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` | Self: 0.0% (0us) | Total: 3.1% (254.3ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (31)

**Calls:**
- `every` (31)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:87` | Self: 0.0% (0us) | Total: 93.8% (7.57s) | Samples: 0

**Called by:**
- `evaluate` (886)

**Calls:**
- `encodeSceneGlb` (577)
- `encodeSceneGlb` (157)
- `encodeSceneGlb` (104)
- `encodeSceneGlb` (38)
- `encodeSceneGlb` (10)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 0.1% (15.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `indexSceneAnimations` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:66` | Self: 0.0% (0us) | Total: 0.1% (14.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `from` (1)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` | Self: 0.0% (0us) | Total: 9.0% (728.0ms) | Samples: 0

**Called by:**
- `texture` (72)

**Calls:**
- `zlibSync` (66)
- `zlibSync` (5)
- `zlibSync` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.0% (977us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (44.6ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `Buffer` (6)
- `requestSatisfyUtil` (1)

### `wblk`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:575` | Self: 0.0% (0us) | Total: 0.1% (11.5ms) | Samples: 0

**Called by:**
- `dflt` (1)

**Calls:**
- `hTree` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.4% (38.8ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `resolve` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` | Self: 0.0% (0us) | Total: 20.4% (1.65s) | Samples: 0

**Called by:**
- `map` (162)

**Calls:**
- `get` (162)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` | Self: 0.0% (0us) | Total: 1.5% (123.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (13)

**Calls:**
- `append` (13)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1484` | Self: 0.0% (0us) | Total: 0.1% (15.4ms) | Samples: 0

**Called by:**
- `encodePng` (1)

**Calls:**
- `adler` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (0us) | Total: 0.3% (28.1ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (2)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 5.9% (477.6ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (52)

**Calls:**
- `every` (52)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:64` | Self: 0.0% (0us) | Total: 0.5% (43.7ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (3)
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `addView` (3)
- `addView` (1)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:53` | Self: 0.0% (0us) | Total: 0.5% (41.1ms) | Samples: 0

**Called by:**
- `texture` (2)

**Calls:**
- `set` (2)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` | Self: 0.0% (0us) | Total: 59.4% (4.79s) | Samples: 0

**Called by:**
- `(module)` (577)
- `(module)` (17)

**Calls:**
- `prepareSceneGlbGeometry` (519)
- `prepareSceneGlbGeometry` (23)
- `prepareSceneGlbGeometry` (23)
- `prepareSceneGlbGeometry` (19)
- `prepareSceneGlbGeometry` (6)
- `prepareSceneGlbGeometry` (1)
- `prepareSceneGlbGeometry` (1)
- `prepareSceneGlbGeometry` (1)
- `prepareSceneGlbGeometry` (1)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (75.0ms) | Samples: 0

**Called by:**
- `node:events` (1)
- `node:worker_threads` (1)
- `internal:validators` (1)
- `internal:shared` (1)
- `bound require` (1)

**Calls:**
- `internal:primordials` (1)
- `node:worker_threads` (1)
- `internal:validators` (1)
- `internal:shared` (1)
- `node:events` (1)

### `next`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (47.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbTrack` (4)
- `from` (1)
- `prepareSceneGlbTrack` (1)

**Calls:**
- `arrayIteratorNextHelper` (6)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 0.5% (44.9ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `readSceneAnimations` (5)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` | Self: 0.0% (0us) | Total: 1.0% (82.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (13)

**Calls:**
- `from` (8)
- `map` (5)

### `node:worker_threads`
`node:worker_threads:2` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` | Self: 0.0% (0us) | Total: 0.3% (28.1ms) | Samples: 0

**Called by:**
- `tuple` (2)

**Calls:**
- `from` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (13.3ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `(anonymous)` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:45` | Self: 0.0% (0us) | Total: 1.8% (145.4ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (19)

**Calls:**
- `floats` (19)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:43` | Self: 0.0% (0us) | Total: 3.9% (322.8ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (23)

**Calls:**
- `floats` (18)
- `floats` (3)
- `floats` (2)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.6% (8.04s) | Samples: 0

**Calls:**
- `moduleEvaluation` (947)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:44` | Self: 0.0% (0us) | Total: 2.5% (207.2ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (23)

**Calls:**
- `floats` (23)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `anonymous` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:75` | Self: 0.0% (0us) | Total: 0.9% (75.6ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (12)

**Calls:**
- `floats` (12)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:81` | Self: 0.0% (0us) | Total: 1.2% (101.1ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `readSceneDocument` (8)
- `readSceneDocument` (5)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` | Self: 0.0% (0us) | Total: 9.5% (770.1ms) | Samples: 0

**Called by:**
- `get` (75)

**Calls:**
- `encodePng` (72)
- `encodePng` (2)
- `encodePng` (1)

### `encodeGlbContainer`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:11` | Self: 0.0% (0us) | Total: 0.7% (61.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (4)

**Calls:**
- `stringify` (4)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:27` | Self: 0.0% (0us) | Total: 0.1% (13.3ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `filter` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (16.15s) | Samples: 0

**Called by:**
- `moduleEvaluation` (951)
- `async loadAndEvaluateModule` (947)

**Calls:**
- `moduleEvaluation` (951)
- `evaluate` (947)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` | Self: 0.0% (0us) | Total: 8.4% (681.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (83)

**Calls:**
- `prepareSceneGlbTrack` (31)
- `prepareSceneGlbTrack` (13)
- `prepareSceneGlbTrack` (13)
- `prepareSceneGlbTrack` (12)
- `prepareSceneGlbTrack` (6)
- `prepareSceneGlbTrack` (6)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` | Self: 0.0% (0us) | Total: 3.8% (314.6ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (40)

**Calls:**
- `indexSceneDocument` (20)
- `indexSceneDocument` (10)
- `indexSceneDocument` (5)
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:67` | Self: 0.0% (0us) | Total: 0.0% (959us) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `from` (1)

### `internal:primordials`
`internal:primordials:50` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `uncurryThis` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` | Self: 0.0% (0us) | Total: 49.8% (4.02s) | Samples: 0

**Called by:**
- `encodeSceneGlb` (519)

**Calls:**
- `buildSceneGeometry` (267)
- `validateBuffers` (52)
- `buildSceneGeometry` (41)
- `buildSceneGeometry` (38)
- `buildSceneGeometry` (34)
- `buildSceneGeometry` (28)
- `buildSceneGeometry` (27)
- `buildSceneGeometry` (13)
- `buildSceneGeometry` (11)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (11.6ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `node:events`
`node:events:9` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` | Self: 0.0% (0us) | Total: 0.8% (65.8ms) | Samples: 0

**Called by:**
- `encodePng` (5)

**Calls:**
- `p` (4)
- `p` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.1% (8.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.1% (15.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 0.4% (39.1ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (0us) | Total: 0.8% (67.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (13)

**Calls:**
- `map` (13)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` | Self: 0.0% (0us) | Total: 0.0% (985us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `abs` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:93` | Self: 0.0% (0us) | Total: 1.7% (138.0ms) | Samples: 0

**Called by:**
- `(module)` (10)

**Calls:**
- `encodeGlbContainer` (5)
- `encodeGlbContainer` (4)
- `encodeGlbContainer` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:83` | Self: 0.0% (0us) | Total: 3.5% (283.8ms) | Samples: 0

**Called by:**
- `evaluate` (30)

**Calls:**
- `encodeSceneGlb` (17)
- `encodeSceneGlb` (6)
- `encodeSceneGlb` (5)
- `encodeSceneGlb` (2)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 0.0% (0us) | Total: 6.2% (505.0ms) | Samples: 0

**Called by:**
- `get` (46)

**Calls:**
- `some` (46)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (11.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 2.7% (224.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (38)

**Calls:**
- `map` (38)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:68` | Self: 0.0% (0us) | Total: 0.1% (16.0ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `from` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.1% (14.2ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `cross` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` | Self: 0.0% (0us) | Total: 11.7% (952.2ms) | Samples: 0

**Called by:**
- `(module)` (104)
- `(module)` (6)

**Calls:**
- `prepareSceneGlbAnimations` (83)
- `prepareSceneGlbAnimations` (14)
- `prepareSceneGlbAnimations` (12)
- `prepareSceneGlbAnimations` (1)

### `encodeGlbContainer`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:18` | Self: 0.0% (0us) | Total: 0.1% (15.2ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `DataView` (1)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` | Self: 0.0% (0us) | Total: 10.0% (809.1ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (23)
- `prepareSceneGlbGeometry` (19)
- `prepareSceneGlbGeometry` (18)
- `prepareSceneGlbAnimations` (12)
- `prepareSceneGlbAnimations` (10)

**Calls:**
- `every` (82)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 4.2% (342.1ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (41)

**Calls:**
- `triangleUnitNormal` (29)
- `triangleUnitNormal` (5)
- `triangleUnitNormal` (2)
- `triangleUnitNormal` (2)
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` | Self: 0.0% (0us) | Total: 0.1% (15.2ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `sub` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:42` | Self: 0.0% (0us) | Total: 0.2% (23.2ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `makeSceneGridGeometry` (5)
- `makeSceneGridGeometry` (3)
- `makeSceneGridGeometry` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` | Self: 0.0% (0us) | Total: 0.6% (54.9ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (5)

**Calls:**
- `normalize` (4)
- `normalize` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:74` | Self: 0.0% (0us) | Total: 2.2% (179.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (14)

**Calls:**
- `floats` (10)
- `floats` (2)
- `floats` (1)
- `floats` (1)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 0.5% (44.9ms) | Samples: 0

**Called by:**
- `readSceneDocument` (5)

**Calls:**
- `map` (5)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:23` | Self: 0.0% (0us) | Total: 0.1% (16.0ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.3% (25.2ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb.ts:90` | Self: 0.0% (0us) | Total: 0.4% (32.9ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `(anonymous)` (6)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.0% (0us) | Total: 0.1% (15.6ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `record` (2)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (11.6ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` | Self: 0.0% (0us) | Total: 4.7% (379.9ms) | Samples: 0

**Called by:**
- `get` (41)

**Calls:**
- `compositeSceneImageRegion` (41)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 0.6% (56.1ms) | Samples: 0

**Called by:**
- `(module)` (8)

**Calls:**
- `map` (8)

### `encodeGlbContainer`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:32` | Self: 0.0% (0us) | Total: 0.7% (61.2ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (5)

**Calls:**
- `set` (5)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` | Self: 0.0% (0us) | Total: 8.0% (646.7ms) | Samples: 0

**Called by:**
- `encodePng` (66)

**Calls:**
- `dflt` (57)
- `dflt` (5)
- `dflt` (1)
- `dflt` (1)
- `dflt` (1)
- `dflt` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:746` | Self: 0.0% (0us) | Total: 0.1% (11.5ms) | Samples: 0

**Called by:**
- `zlibSync` (1)

**Calls:**
- `wblk` (1)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` | Self: 0.0% (0us) | Total: 20.4% (1.65s) | Samples: 0

**Called by:**
- `(anonymous)` (162)

**Calls:**
- `texture` (75)
- `texture` (46)
- `texture` (41)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:134` | Self: 0.0% (0us) | Total: 0.1% (15.1ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `next` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.6% (8.04s) | Samples: 0

**Called by:**
- `moduleEvaluation` (947)

**Calls:**
- `(module)` (886)
- `(module)` (30)
- `(module)` (13)
- `(module)` (9)
- `(module)` (6)
- `(module)` (2)
- `(module)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 0.5% (44.9ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `map` (5)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` | Self: 0.0% (0us) | Total: 20.4% (1.65s) | Samples: 0

**Called by:**
- `(module)` (157)
- `(module)` (5)

**Calls:**
- `map` (162)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.2% (17.0ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `entries` (1)
- `map` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:55` | Self: 0.0% (0us) | Total: 0.1% (15.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `get` (1)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:65` | Self: 0.0% (0us) | Total: 0.3% (29.7ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (2)

**Calls:**
- `get buffer` (1)
- `Uint8Array` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 46.4% | 3.74s | `[native code]` |
| 18.5% | 1.50s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 9.0% | 728.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 8.8% | 713.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 4.7% | 379.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts` |
| 3.8% | 310.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 2.6% | 211.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 2.3% | 186.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` |
| 1.2% | 103.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts` |
| 0.7% | 64.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts` |
| 0.3% | 30.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts` |
| 0.3% | 26.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 23.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.2% | 17.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.1% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts` |
| 0.1% | 15.0ms | `internal:primordials` |
| 0.0% | 969us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts` |
