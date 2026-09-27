# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.14s | 268 | 1.0ms | 222 |

**Top 10:** `indexSceneDocument` 10.2%, `map` 4.6%, `indexSceneDocument` 3.9%, `max` 3.3%, `evaluateSceneNodeFlags` 3.2%, `entries` 3.0%, `every` 2.9%, `indexSceneAnimations` 2.7%, `prepareSceneBounds` 2.1%, `prepareSceneBounds` 2.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 10.2% | 220.7ms | 11.0% | 236.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 4.6% | 100.0ms | 50.6% | 1.08s | `map` | `[native code]` |
| 3.9% | 84.7ms | 3.9% | 84.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 3.3% | 72.2ms | 3.3% | 72.2ms | `max` | `[native code]` |
| 3.2% | 70.1ms | 3.2% | 70.1ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 3.0% | 66.5ms | 3.0% | 66.5ms | `entries` | `[native code]` |
| 2.9% | 63.7ms | 5.7% | 123.6ms | `every` | `[native code]` |
| 2.7% | 59.4ms | 2.7% | 59.4ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 2.1% | 46.0ms | 3.2% | 70.3ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 2.1% | 45.7ms | 2.8% | 60.7ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 2.0% | 43.7ms | 2.0% | 43.7ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.8% | 40.7ms | 1.8% | 40.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 1.5% | 33.3ms | 1.5% | 33.3ms | `stringify` | `[native code]` |
| 1.4% | 31.5ms | 1.4% | 31.5ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` |
| 1.4% | 31.3ms | 1.4% | 31.3ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` |
| 1.4% | 31.0ms | 1.4% | 31.0ms | `Map` | `[native code]` |
| 1.4% | 30.5ms | 1.4% | 30.5ms | `get` | `[native code]` |
| 1.4% | 30.5ms | 2.9% | 62.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 1.4% | 30.4ms | 1.4% | 30.4ms | `abs` | `[native code]` |
| 1.4% | 30.3ms | 1.4% | 30.3ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` |
| 1.4% | 30.2ms | 1.4% | 30.2ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` |
| 1.3% | 29.6ms | 1.3% | 29.6ms | `min` | `[native code]` |
| 1.3% | 29.6ms | 1.3% | 29.6ms | `isFinite` | `[native code]` |
| 1.3% | 29.3ms | 1.3% | 29.3ms | `includes` | `[native code]` |
| 1.3% | 28.8ms | 1.3% | 28.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:114` |
| 1.2% | 27.3ms | 1.2% | 27.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.8% | 17.2ms | 0.8% | 18.4ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.7% | 17.1ms | 3.8% | 83.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.7% | 17.0ms | 1.4% | 31.6ms | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` |
| 0.7% | 16.9ms | 0.7% | 16.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:59` |
| 0.7% | 16.6ms | 0.7% | 16.6ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 0.7% | 16.3ms | 0.7% | 16.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` |
| 0.7% | 16.2ms | 0.7% | 16.2ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:105` |
| 0.7% | 16.2ms | 0.7% | 16.2ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` |
| 0.7% | 16.1ms | 3.7% | 79.7ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:71` |
| 0.7% | 16.1ms | 0.7% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `fetch` | `[native code]` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `uniqueById` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `_generateTables` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16491` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:73` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:63` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:112` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `next` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:162` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.7% | 15.5ms | 2.2% | 48.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `parseModule` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts` |
| 0.7% | 15.4ms | 1.4% | 31.5ms | `requestInstantiate` | `[native code]` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `hasOwn` | `[native code]` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.7% | 15.1ms | 0.7% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.7% | 15.1ms | 0.7% | 15.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` |
| 0.7% | 15.0ms | 0.7% | 16.0ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:60` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.6% | 15.0ms | 1.4% | 30.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.6% | 14.8ms | 0.6% | 14.8ms | `set` | `[native code]` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `push` | `[native code]` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `splice` | `[native code]` |
| 0.6% | 14.5ms | 0.6% | 14.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:51` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 0.6% | 13.4ms | 0.6% | 13.4ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.6% | 13.1ms | 0.7% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.6% | 13.0ms | 0.6% | 13.0ms | `trim` | `[native code]` |
| 0.5% | 12.7ms | 0.5% | 12.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.5% | 12.4ms | 1.2% | 27.5ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.5% | 11.9ms | 0.5% | 11.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.5% | 11.8ms | 0.5% | 11.8ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 0.4% | 9.4ms | 0.4% | 9.4ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:71` |
| 0.3% | 7.0ms | 0.3% | 7.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:12` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `values` | `[native code]` |
| 0.0% | 1.9ms | 0.7% | 16.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:146` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:117` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` |
| 0.0% | 1.8ms | 0.1% | 3.9ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hypot` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` |
| 0.0% | 999us | 0.0% | 999us | `readSurfaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 990us | 0.0% | 990us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:147` |
| 0.0% | 982us | 0.0% | 982us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 979us | 0.0% | 979us | `test` | `[native code]` |
| 0.0% | 971us | 0.0% | 971us | `CubicPoly` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 969us | 0.0% | 969us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 967us | 0.0% | 967us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 0.0% | 957us | 0.0% | 957us | `mergeUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37382` |
| 0.0% | 948us | 2.1% | 46.9ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:122` |
| 0.0% | 944us | 2.1% | 45.6ms | `from` | `[native code]` |
| 0.0% | 938us | 0.6% | 14.5ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.0% | 936us | 0.0% | 936us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:113` |
| 0.0% | 920us | 0.0% | 920us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:72` |
| 0.0% | 918us | 0.0% | 918us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:167` |
| 0.0% | 916us | 0.0% | 916us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18160` |
| 0.0% | 898us | 0.7% | 16.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:62` |
| 0.0% | 875us | 0.0% | 875us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 865us | 0.0% | 865us | `createModelAsset` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts` |
| 0.0% | 862us | 0.0% | 862us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 854us | 0.0% | 854us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.0% | 850us | 0.0% | 850us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.0% | 841us | 0.0% | 841us | `fromArray` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6608` |
| 0.0% | 837us | 0.0% | 837us | `Source` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7028` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 4.23s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 97.8% | 2.09s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.8% | 2.09s | 0.0% | 0us | `evaluate` | `[native code]` |
| 50.6% | 1.08s | 4.6% | 100.0ms | `map` | `[native code]` |
| 30.9% | 664.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:110` |
| 28.3% | 608.1ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` |
| 25.1% | 539.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:120` |
| 25.1% | 539.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:122` |
| 14.0% | 301.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:104` |
| 11.0% | 236.1ms | 10.2% | 220.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 10.5% | 226.7ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` |
| 8.1% | 174.0ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:117` |
| 7.6% | 163.3ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` |
| 7.2% | 155.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:78` |
| 6.4% | 138.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:95` |
| 5.7% | 123.6ms | 2.9% | 63.7ms | `every` | `[native code]` |
| 5.7% | 123.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:96` |
| 5.6% | 122.2ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 3.9% | 84.7ms | 3.9% | 84.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 3.8% | 83.7ms | 0.7% | 17.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 3.7% | 79.7ms | 0.7% | 16.1ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:71` |
| 3.5% | 76.8ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 3.3% | 72.2ms | 3.3% | 72.2ms | `max` | `[native code]` |
| 3.2% | 70.3ms | 2.1% | 46.0ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 3.2% | 70.1ms | 3.2% | 70.1ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 3.0% | 66.5ms | 3.0% | 66.5ms | `entries` | `[native code]` |
| 2.9% | 62.7ms | 1.4% | 30.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 2.8% | 62.1ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 2.8% | 62.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 2.8% | 62.1ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 2.8% | 62.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 2.8% | 61.1ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 2.8% | 60.7ms | 2.1% | 45.7ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 2.8% | 60.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:107` |
| 2.7% | 59.4ms | 2.7% | 59.4ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 2.7% | 58.6ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` |
| 2.6% | 56.4ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 2.5% | 55.4ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` |
| 2.3% | 49.6ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 2.2% | 49.0ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` |
| 2.2% | 48.1ms | 0.7% | 15.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 2.2% | 47.7ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 2.2% | 47.3ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:199` |
| 2.1% | 46.9ms | 0.0% | 948us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:122` |
| 2.1% | 45.6ms | 0.0% | 944us | `from` | `[native code]` |
| 2.0% | 43.7ms | 2.0% | 43.7ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.9% | 41.5ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 1.8% | 40.7ms | 1.8% | 40.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 1.6% | 35.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 1.5% | 33.3ms | 1.5% | 33.3ms | `stringify` | `[native code]` |
| 1.5% | 32.3ms | 0.0% | 0us | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 1.4% | 31.6ms | 0.7% | 17.0ms | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` |
| 1.4% | 31.5ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 1.4% | 31.5ms | 0.7% | 15.4ms | `requestInstantiate` | `[native code]` |
| 1.4% | 31.5ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 1.4% | 31.5ms | 1.4% | 31.5ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` |
| 1.4% | 31.3ms | 1.4% | 31.3ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` |
| 1.4% | 31.0ms | 1.4% | 31.0ms | `Map` | `[native code]` |
| 1.4% | 31.0ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:180` |
| 1.4% | 30.6ms | 0.6% | 15.0ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` |
| 1.4% | 30.5ms | 1.4% | 30.5ms | `get` | `[native code]` |
| 1.4% | 30.4ms | 1.4% | 30.4ms | `abs` | `[native code]` |
| 1.4% | 30.3ms | 1.4% | 30.3ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` |
| 1.4% | 30.2ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 1.4% | 30.2ms | 1.4% | 30.2ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` |
| 1.3% | 29.6ms | 1.3% | 29.6ms | `min` | `[native code]` |
| 1.3% | 29.6ms | 1.3% | 29.6ms | `isFinite` | `[native code]` |
| 1.3% | 29.3ms | 1.3% | 29.3ms | `includes` | `[native code]` |
| 1.3% | 29.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 1.3% | 28.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:112` |
| 1.3% | 28.8ms | 1.3% | 28.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:114` |
| 1.2% | 27.5ms | 0.5% | 12.4ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 1.2% | 27.3ms | 1.2% | 27.3ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.9% | 20.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.8% | 18.4ms | 0.8% | 17.2ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.8% | 17.8ms | 0.0% | 0us | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:35` |
| 0.7% | 16.9ms | 0.7% | 16.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:59` |
| 0.7% | 16.6ms | 0.0% | 1.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` |
| 0.7% | 16.6ms | 0.7% | 16.6ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 0.7% | 16.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:37` |
| 0.7% | 16.6ms | 0.0% | 0us | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.7% | 16.4ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` |
| 0.7% | 16.3ms | 0.7% | 16.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` |
| 0.7% | 16.2ms | 0.7% | 16.2ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:105` |
| 0.7% | 16.2ms | 0.7% | 16.2ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` |
| 0.7% | 16.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:86` |
| 0.7% | 16.1ms | 0.7% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` |
| 0.7% | 16.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `fetch` | `[native code]` |
| 0.7% | 16.0ms | 0.0% | 898us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:62` |
| 0.7% | 16.0ms | 0.7% | 15.0ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:60` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `uniqueById` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.7% | 15.8ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:334` |
| 0.7% | 15.8ms | 0.0% | 0us | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:214` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `_generateTables` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16491` |
| 0.7% | 15.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16467` |
| 0.7% | 15.7ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` |
| 0.7% | 15.7ms | 0.0% | 0us | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12887` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:73` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:63` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:112` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `next` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:162` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `parseModule` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts` |
| 0.7% | 15.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:55` |
| 0.7% | 15.4ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `hasOwn` | `[native code]` |
| 0.7% | 15.3ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:74` |
| 0.7% | 15.3ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.7% | 15.1ms | 0.0% | 0us | `reduce` | `[native code]` |
| 0.7% | 15.1ms | 0.7% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.7% | 15.1ms | 0.7% | 15.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` |
| 0.7% | 15.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` |
| 0.7% | 15.0ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` |
| 0.7% | 15.0ms | 0.6% | 13.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.7% | 15.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:157` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.6% | 14.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:260` |
| 0.6% | 14.8ms | 0.6% | 14.8ms | `set` | `[native code]` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `push` | `[native code]` |
| 0.6% | 14.7ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.6% | 14.7ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:58` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 0.6% | 14.6ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `splice` | `[native code]` |
| 0.6% | 14.5ms | 0.0% | 938us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.6% | 14.5ms | 0.6% | 14.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:51` |
| 0.6% | 14.4ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 0.6% | 14.1ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` |
| 0.6% | 13.4ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.6% | 13.4ms | 0.6% | 13.4ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.6% | 13.0ms | 0.0% | 0us | `some` | `[native code]` |
| 0.6% | 13.0ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.6% | 13.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` |
| 0.6% | 13.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:219` |
| 0.6% | 13.0ms | 0.0% | 0us | `normalizeHex` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` |
| 0.6% | 13.0ms | 0.6% | 13.0ms | `trim` | `[native code]` |
| 0.6% | 13.0ms | 0.0% | 0us | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` |
| 0.6% | 13.0ms | 0.0% | 0us | `scenePalette` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:16` |
| 0.5% | 12.7ms | 0.0% | 0us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.5% | 12.7ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.5% | 12.7ms | 0.5% | 12.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.5% | 12.2ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.5% | 11.9ms | 0.5% | 11.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.5% | 11.8ms | 0.5% | 11.8ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 0.4% | 10.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:125` |
| 0.4% | 9.4ms | 0.4% | 9.4ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:71` |
| 0.3% | 7.0ms | 0.3% | 7.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:12` |
| 0.3% | 7.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:29` |
| 0.1% | 3.9ms | 0.0% | 1.8ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.1% | 3.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:145` |
| 0.1% | 3.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:27` |
| 0.0% | 1.9ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `flatIntoArray` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:14` |
| 0.0% | 1.9ms | 0.0% | 0us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `values` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:146` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:117` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` |
| 0.0% | 1.8ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hypot` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:131` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` |
| 0.0% | 1.0ms | 0.0% | 0us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.0% | 1.0ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` |
| 0.0% | 999us | 0.0% | 999us | `readSurfaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 999us | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` |
| 0.0% | 990us | 0.0% | 990us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:147` |
| 0.0% | 982us | 0.0% | 982us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 982us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.0% | 979us | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:307` |
| 0.0% | 979us | 0.0% | 0us | `creationId` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:34` |
| 0.0% | 979us | 0.0% | 979us | `test` | `[native code]` |
| 0.0% | 971us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:31611` |
| 0.0% | 971us | 0.0% | 971us | `CubicPoly` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 969us | 0.0% | 969us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 967us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 0.0% | 967us | 0.0% | 967us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 0.0% | 957us | 0.0% | 957us | `mergeUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37382` |
| 0.0% | 957us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:959` |
| 0.0% | 936us | 0.0% | 936us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:113` |
| 0.0% | 934us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:66` |
| 0.0% | 931us | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:73` |
| 0.0% | 931us | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:121` |
| 0.0% | 920us | 0.0% | 920us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:72` |
| 0.0% | 918us | 0.0% | 918us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:167` |
| 0.0% | 916us | 0.0% | 916us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18160` |
| 0.0% | 916us | 0.0% | 0us | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:30` |
| 0.0% | 891us | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:72` |
| 0.0% | 875us | 0.0% | 875us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 865us | 0.0% | 865us | `createModelAsset` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts` |
| 0.0% | 865us | 0.0% | 0us | `makeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:31` |
| 0.0% | 863us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:67` |
| 0.0% | 862us | 0.0% | 862us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 854us | 0.0% | 854us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.0% | 850us | 0.0% | 850us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.0% | 841us | 0.0% | 0us | `mergeUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37380` |
| 0.0% | 841us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:1137` |
| 0.0% | 841us | 0.0% | 841us | `fromArray` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6608` |
| 0.0% | 841us | 0.0% | 0us | `cloneUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37328` |
| 0.0% | 837us | 0.0% | 837us | `Source` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7028` |
| 0.0% | 837us | 0.0% | 0us | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7302` |
| 0.0% | 837us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5078` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 10.2% (220.7ms) | Total: 11.0% (236.1ms) | Samples: 33

**Called by:**
- `update` (33)
- `readSceneDocument` (1)

**Calls:**
- `hasOwn` (1)

### `map`
`[native code]` | Self: 4.6% (100.0ms) | Total: 50.6% (1.08s) | Samples: 10

**Called by:**
- `(module)` (58)
- `readSceneAnimations` (11)
- `readSceneAnimationClip` (11)
- `(anonymous)` (6)
- `sampleSceneAnimationTrack` (6)
- `readSceneDocument` (5)
- `tuple` (5)
- `readSceneGeometry` (4)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(module)` (2)
- `triangulateFace` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `readSceneDocument` (1)
- `triangulateFace` (1)
- `triangleUnitNormal` (1)
- `scenePalette` (1)
- `unit` (1)
- `sample` (1)

**Calls:**
- `(anonymous)` (58)
- `readSceneAnimationClip` (11)
- `(anonymous)` (6)
- `readKey` (5)
- `readKey` (4)
- `readSceneGeometry` (4)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `abs` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readSceneImage` (1)
- `(anonymous)` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 3.9% (84.7ms) | Total: 3.9% (84.7ms) | Samples: 16

**Called by:**
- `update` (15)
- `readSceneDocument` (1)

### `max`
`[native code]` | Self: 3.3% (72.2ms) | Total: 3.3% (72.2ms) | Samples: 7

**Called by:**
- `prepareSceneBounds` (3)
- `sceneBounds` (3)
- `sceneBounds` (1)

### `evaluateSceneNodeFlags`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` | Self: 3.2% (70.1ms) | Total: 3.2% (70.1ms) | Samples: 7

**Called by:**
- `evaluateSceneInstances` (5)
- `sceneBounds` (2)

### `entries`
`[native code]` | Self: 3.0% (66.5ms) | Total: 3.0% (66.5ms) | Samples: 9

**Called by:**
- `indexSceneDocument` (9)

### `every`
`[native code]` | Self: 2.9% (63.7ms) | Total: 5.7% (123.6ms) | Samples: 7

**Called by:**
- `update` (3)
- `every` (3)
- `validateBuffers` (3)
- `composeTransform` (2)
- `update` (1)

**Calls:**
- `every` (3)
- `isFinite` (2)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` | Self: 2.7% (59.4ms) | Total: 2.7% (59.4ms) | Samples: 6

**Called by:**
- `indexSceneDocument` (6)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` | Self: 2.1% (46.0ms) | Total: 3.2% (70.3ms) | Samples: 4

**Called by:**
- `sceneBounds` (7)

**Calls:**
- `max` (3)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` | Self: 2.1% (45.7ms) | Total: 2.8% (60.7ms) | Samples: 4

**Called by:**
- `sceneBounds` (6)

**Calls:**
- `min` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 2.0% (43.7ms) | Total: 2.0% (43.7ms) | Samples: 3

**Called by:**
- `update` (3)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` | Self: 1.8% (40.7ms) | Total: 1.8% (40.7ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `stringify`
`[native code]` | Self: 1.5% (33.3ms) | Total: 1.5% (33.3ms) | Samples: 5

**Called by:**
- `indexSceneAnimations` (4)
- `(module)` (1)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` | Self: 1.4% (31.5ms) | Total: 1.4% (31.5ms) | Samples: 5

**Called by:**
- `rotation` (3)
- `rotation` (2)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` | Self: 1.4% (31.3ms) | Total: 1.4% (31.3ms) | Samples: 2

**Called by:**
- `sample` (2)

### `Map`
`[native code]` | Self: 1.4% (31.0ms) | Total: 1.4% (31.0ms) | Samples: 2

**Called by:**
- `setPose` (2)

### `get`
`[native code]` | Self: 1.4% (30.5ms) | Total: 1.4% (30.5ms) | Samples: 3

**Called by:**
- `indexSceneNodes` (1)
- `sceneBounds` (1)
- `evaluateSceneInstances` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` | Self: 1.4% (30.5ms) | Total: 2.9% (62.7ms) | Samples: 3

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `transformPoint` (2)
- `transformPoint` (1)

### `abs`
`[native code]` | Self: 1.4% (30.4ms) | Total: 1.4% (30.4ms) | Samples: 2

**Called by:**
- `map` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` | Self: 1.4% (30.3ms) | Total: 1.4% (30.3ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` | Self: 1.4% (30.2ms) | Total: 1.4% (30.2ms) | Samples: 3

**Called by:**
- `sceneBounds` (3)

### `min`
`[native code]` | Self: 1.3% (29.6ms) | Total: 1.3% (29.6ms) | Samples: 3

**Called by:**
- `prepareSceneBounds` (2)
- `sceneBounds` (1)

### `isFinite`
`[native code]` | Self: 1.3% (29.6ms) | Total: 1.3% (29.6ms) | Samples: 2

**Called by:**
- `every` (2)

### `includes`
`[native code]` | Self: 1.3% (29.3ms) | Total: 1.3% (29.3ms) | Samples: 5

**Called by:**
- `record` (3)
- `id` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:114` | Self: 1.3% (28.8ms) | Total: 1.3% (28.8ms) | Samples: 2

**Called by:**
- `map` (2)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 1.2% (27.3ms) | Total: 1.2% (27.3ms) | Samples: 2

**Called by:**
- `from` (2)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` | Self: 0.8% (17.2ms) | Total: 0.8% (18.4ms) | Samples: 2

**Called by:**
- `indexSceneDocument` (3)

**Calls:**
- `set` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.7% (17.1ms) | Total: 3.8% (83.7ms) | Samples: 3

**Called by:**
- `update` (12)

**Calls:**
- `entries` (9)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` | Self: 0.7% (17.0ms) | Total: 1.4% (31.6ms) | Samples: 2

**Called by:**
- `sample` (4)

**Calls:**
- `unit` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:59` | Self: 0.7% (16.9ms) | Total: 0.7% (16.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` | Self: 0.7% (16.6ms) | Total: 0.7% (16.6ms) | Samples: 2

**Called by:**
- `sceneBounds` (2)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` | Self: 0.7% (16.3ms) | Total: 0.7% (16.3ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (4)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:105` | Self: 0.7% (16.2ms) | Total: 0.7% (16.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` | Self: 0.7% (16.2ms) | Total: 0.7% (16.2ms) | Samples: 3

**Called by:**
- `sample` (3)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:71` | Self: 0.7% (16.1ms) | Total: 3.7% (79.7ms) | Samples: 2

**Called by:**
- `sample` (8)

**Calls:**
- `map` (6)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` | Self: 0.7% (16.1ms) | Total: 0.7% (16.1ms) | Samples: 2

**Called by:**
- `update` (2)

### `fetch`
`[native code]` | Self: 0.7% (16.0ms) | Total: 0.7% (16.0ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` | Self: 0.7% (15.9ms) | Total: 0.7% (15.9ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` | Self: 0.7% (15.9ms) | Total: 0.7% (15.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `uniqueById`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 1

**Called by:**
- `readSceneImage` (1)

### `_generateTables`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16491` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `updateMatrixWorld`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `updateMatrixWorld` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:73` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:63` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `sample` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:112` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `next`
`[native code]` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `sample` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:162` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 2

**Called by:**
- `update` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` | Self: 0.7% (15.5ms) | Total: 2.2% (48.1ms) | Samples: 2

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `max` (3)

### `parseModule`
`[native code]` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `from` (1)

### `requestInstantiate`
`[native code]` | Self: 0.7% (15.4ms) | Total: 1.4% (31.5ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (2)

**Calls:**
- `async (anonymous)` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `hasOwn`
`[native code]` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.7% (15.2ms) | Total: 0.7% (15.2ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` | Self: 0.7% (15.1ms) | Total: 0.7% (15.1ms) | Samples: 1

**Called by:**
- `reduce` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` | Self: 0.7% (15.1ms) | Total: 0.7% (15.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:60` | Self: 0.7% (15.0ms) | Total: 0.7% (16.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `get` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.7% (15.0ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` | Self: 0.6% (15.0ms) | Total: 1.4% (30.6ms) | Samples: 1

**Called by:**
- `(module)` (2)

**Calls:**
- `next` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.6% (14.9ms) | Total: 0.6% (14.9ms) | Samples: 1

**Called by:**
- `map` (1)

### `set`
`[native code]` | Self: 0.6% (14.8ms) | Total: 0.6% (14.8ms) | Samples: 2

**Called by:**
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `push`
`[native code]` | Self: 0.6% (14.7ms) | Total: 0.6% (14.7ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` | Self: 0.6% (14.6ms) | Total: 0.6% (14.6ms) | Samples: 2

**Called by:**
- `sample` (2)

### `splice`
`[native code]` | Self: 0.6% (14.6ms) | Total: 0.6% (14.6ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:51` | Self: 0.6% (14.5ms) | Total: 0.6% (14.5ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` | Self: 0.6% (14.1ms) | Total: 0.6% (14.1ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.6% (13.4ms) | Total: 0.6% (13.4ms) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.6% (13.1ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `number` (2)

### `trim`
`[native code]` | Self: 0.6% (13.0ms) | Total: 0.6% (13.0ms) | Samples: 1

**Called by:**
- `normalizeHex` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.5% (12.7ms) | Total: 0.5% (12.7ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.5% (12.4ms) | Total: 1.2% (27.5ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (3)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.5% (11.9ms) | Total: 0.5% (11.9ms) | Samples: 1

**Called by:**
- `some` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` | Self: 0.5% (11.8ms) | Total: 0.5% (11.8ms) | Samples: 1

**Called by:**
- `sample` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:71` | Self: 0.4% (9.4ms) | Total: 0.4% (9.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:12` | Self: 0.3% (7.0ms) | Total: 0.3% (7.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `flatIntoArrayWithCallback` (2)

### `values`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `prepareSceneBounds` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` | Self: 0.0% (1.9ms) | Total: 0.7% (16.6ms) | Samples: 2

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `min` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:146` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `evaluate` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:117` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `evaluate` (2)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.0% (1.8ms) | Total: 0.1% (3.9ms) | Samples: 2

**Called by:**
- `map` (4)

**Calls:**
- `record` (2)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `composeTransform` (1)
- `composeTransform` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 2

**Called by:**
- `from` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `hypot`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `composeTransform` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `some` (1)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `orientation` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `readSurfaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` | Self: 0.0% (999us) | Total: 0.0% (999us) | Samples: 1

**Called by:**
- `readSceneGeometry` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:147` | Self: 0.0% (990us) | Total: 0.0% (990us) | Samples: 1

**Called by:**
- `evaluate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `map` (1)

### `test`
`[native code]` | Self: 0.0% (979us) | Total: 0.0% (979us) | Samples: 1

**Called by:**
- `creationId` (1)

### `CubicPoly`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (971us) | Total: 0.0% (971us) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` | Self: 0.0% (967us) | Total: 0.0% (967us) | Samples: 1

**Called by:**
- `map` (1)

### `mergeUniforms`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37382` | Self: 0.0% (957us) | Total: 0.0% (957us) | Samples: 1

**Called by:**
- `(module)` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:122` | Self: 0.0% (948us) | Total: 2.1% (46.9ms) | Samples: 1

**Called by:**
- `(module)` (5)

**Calls:**
- `affineMultiply` (2)
- `affineMultiply` (2)

### `from`
`[native code]` | Self: 0.0% (944us) | Total: 2.1% (45.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `update` (1)
- `tuple` (1)
- `(module)` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (2)
- `typedArrayViewTypedArrayFromFast` (2)
- `(anonymous)` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (938us) | Total: 0.6% (14.5ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (2)

**Calls:**
- `set` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:113` | Self: 0.0% (936us) | Total: 0.0% (936us) | Samples: 1

**Called by:**
- `(module)` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:72` | Self: 0.0% (920us) | Total: 0.0% (920us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:167` | Self: 0.0% (918us) | Total: 0.0% (918us) | Samples: 1

**Called by:**
- `(module)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18160` | Self: 0.0% (916us) | Total: 0.0% (916us) | Samples: 1

**Called by:**
- `evaluate` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:62` | Self: 0.0% (898us) | Total: 0.7% (16.0ms) | Samples: 1

**Called by:**
- `update` (2)

**Calls:**
- `reduce` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` | Self: 0.0% (875us) | Total: 0.0% (875us) | Samples: 1

**Called by:**
- `(module)` (1)

### `createModelAsset`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts` | Self: 0.0% (865us) | Total: 0.0% (865us) | Samples: 1

**Called by:**
- `makeModel` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 0.0% (862us) | Total: 0.0% (862us) | Samples: 1

**Called by:**
- `update` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` | Self: 0.0% (854us) | Total: 0.0% (854us) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.0% (850us) | Total: 0.0% (850us) | Samples: 1

**Called by:**
- `update` (1)

### `fromArray`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6608` | Self: 0.0% (841us) | Total: 0.0% (841us) | Samples: 1

**Called by:**
- `cloneUniforms` (1)

### `Source`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7028` | Self: 0.0% (837us) | Total: 0.0% (837us) | Samples: 1

**Called by:**
- `Texture` (1)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 2.8% (62.1ms) | Samples: 0

**Called by:**
- `readSceneDocument` (11)

**Calls:**
- `map` (11)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 3.5% (76.8ms) | Samples: 0

**Called by:**
- `update` (8)

**Calls:**
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:86` | Self: 0.0% (0us) | Total: 0.7% (16.1ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `map` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:122` | Self: 0.0% (0us) | Total: 25.1% (539.9ms) | Samples: 0

**Called by:**
- `map` (58)

**Calls:**
- `sceneBounds` (18)
- `sceneBounds` (8)
- `sceneBounds` (6)
- `sceneBounds` (5)
- `sceneBounds` (3)
- `sceneBounds` (3)
- `sceneBounds` (3)
- `sceneBounds` (2)
- `sceneBounds` (2)
- `sceneBounds` (2)
- `sceneBounds` (2)
- `sceneBounds` (1)
- `sceneBounds` (1)
- `sceneBounds` (1)
- `sceneBounds` (1)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:35` | Self: 0.0% (0us) | Total: 0.8% (17.8ms) | Samples: 0

**Called by:**
- `sample` (4)

**Calls:**
- `unit` (3)
- `unit` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:131` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `stringify` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:96` | Self: 0.0% (0us) | Total: 5.7% (123.3ms) | Samples: 0

**Called by:**
- `evaluate` (15)

**Calls:**
- `update` (10)
- `update` (5)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:260` | Self: 0.0% (0us) | Total: 0.6% (14.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `every` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` | Self: 0.0% (0us) | Total: 28.3% (608.1ms) | Samples: 0

**Called by:**
- `(module)` (81)
- `(module)` (5)
- `(module)` (3)

**Calls:**
- `indexSceneDocument` (33)
- `indexSceneDocument` (15)
- `indexSceneDocument` (15)
- `indexSceneDocument` (12)
- `indexSceneDocument` (7)
- `indexSceneDocument` (2)
- `indexSceneDocument` (2)
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:219` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `scenePalette` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `some` (2)

### `cloneUniforms`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37328` | Self: 0.0% (0us) | Total: 0.0% (841us) | Samples: 0

**Called by:**
- `mergeUniforms` (1)

**Calls:**
- `fromArray` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:66` | Self: 0.0% (0us) | Total: 0.0% (934us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `from` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:180` | Self: 0.0% (0us) | Total: 1.4% (31.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `Map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:157` | Self: 0.0% (0us) | Total: 0.7% (15.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `arrayIteratorNextHelper` (1)

### `reduce`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (31.5ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:334` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `updateMatrixWorld`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12887` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `updateMatrixWorld` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.5% (12.7ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 2.2% (47.7ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (16.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `setPose` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:110` | Self: 0.0% (0us) | Total: 30.9% (664.6ms) | Samples: 0

**Called by:**
- `evaluate` (90)

**Calls:**
- `update` (81)
- `update` (4)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 1.4% (30.2ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `every` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:107` | Self: 0.0% (0us) | Total: 2.8% (60.7ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `setPose` (2)
- `setPose` (2)
- `setPose` (1)
- `setPose` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` | Self: 0.0% (0us) | Total: 1.5% (32.3ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (4)

**Calls:**
- `stringify` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:120` | Self: 0.0% (0us) | Total: 25.1% (539.9ms) | Samples: 0

**Called by:**
- `evaluate` (58)

**Calls:**
- `map` (58)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:67` | Self: 0.0% (0us) | Total: 0.0% (863us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `from` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` | Self: 0.0% (0us) | Total: 0.6% (14.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:1137` | Self: 0.0% (0us) | Total: 0.0% (841us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `mergeUniforms` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:125` | Self: 0.0% (0us) | Total: 0.4% (10.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` | Self: 0.0% (0us) | Total: 2.5% (55.4ms) | Samples: 0

**Called by:**
- `sceneBounds` (4)
- `update` (1)

**Calls:**
- `evaluateSceneNodeFlags` (5)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `triangulateFace` (2)

**Calls:**
- `flatIntoArray` (2)

### `scenePalette`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:16` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:121` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `composeTransform` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 2.8% (62.1ms) | Samples: 0

**Called by:**
- `(module)` (11)

**Calls:**
- `readSceneAnimations` (11)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (4.23s) | Samples: 0

**Called by:**
- `moduleEvaluation` (274)
- `async loadAndEvaluateModule` (265)

**Calls:**
- `moduleEvaluation` (274)
- `evaluate` (265)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` | Self: 0.0% (0us) | Total: 0.6% (14.6ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `splice` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:27` | Self: 0.0% (0us) | Total: 0.1% (3.7ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `migrateLegacyModel` (2)
- `migrateLegacyModel` (1)
- `makeModel` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:959` | Self: 0.0% (0us) | Total: 0.0% (957us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `mergeUniforms` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `hexToRgb` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` | Self: 0.0% (0us) | Total: 0.0% (999us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `readSurfaces` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.8% (2.09s) | Samples: 0

**Calls:**
- `moduleEvaluation` (265)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `updateMatrixWorld` (1)

### `mergeUniforms`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37380` | Self: 0.0% (0us) | Total: 0.0% (841us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `cloneUniforms` (1)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:26` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `normalizeHex` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `from` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `hypot` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:72` | Self: 0.0% (0us) | Total: 0.0% (891us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `finiteTuple` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:104` | Self: 0.0% (0us) | Total: 14.0% (301.2ms) | Samples: 0

**Called by:**
- `evaluate` (34)

**Calls:**
- `sample` (22)
- `sample` (5)
- `sample` (2)
- `sample` (1)
- `sample` (1)
- `sample` (1)
- `sample` (1)
- `sample` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `orientation` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 2.3% (49.6ms) | Samples: 0

**Called by:**
- `readKey` (4)
- `(anonymous)` (1)

**Calls:**
- `map` (5)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (0us) | Total: 1.9% (41.5ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `tuple` (4)
- `tuple` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.6% (13.4ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `cross` (1)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:30` | Self: 0.0% (0us) | Total: 0.0% (916us) | Samples: 0

**Called by:**
- `rotation` (1)

**Calls:**
- `map` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 5.6% (122.2ms) | Samples: 0

**Called by:**
- `update` (15)

**Calls:**
- `indexSceneAnimations` (6)
- `indexSceneAnimations` (4)
- `indexSceneAnimations` (4)
- `indexSceneAnimations` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` | Self: 0.0% (0us) | Total: 2.7% (58.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (8)

**Calls:**
- `evaluateSceneInstances` (4)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:199` | Self: 0.0% (0us) | Total: 2.2% (47.3ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `every` (3)
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.9% (20.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `tuple` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.0% (0us) | Total: 0.5% (12.7ms) | Samples: 0

**Called by:**
- `readKey` (2)
- `(anonymous)` (1)

**Calls:**
- `includes` (3)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 2.8% (62.1ms) | Samples: 0

**Called by:**
- `map` (11)

**Calls:**
- `map` (11)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:112` | Self: 0.0% (0us) | Total: 1.3% (28.8ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `map` (2)

### `readSceneImage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:214` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `uniqueById` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` | Self: 0.0% (0us) | Total: 7.6% (163.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (18)

**Calls:**
- `prepareSceneBounds` (7)
- `prepareSceneBounds` (6)
- `prepareSceneBounds` (3)
- `prepareSceneBounds` (2)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (0us) | Total: 0.5% (12.2ms) | Samples: 0

**Called by:**
- `readKey` (1)

**Calls:**
- `from` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:55` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `from` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `readSceneDocument` (1)
- `readSceneDocument` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5078` | Self: 0.0% (0us) | Total: 0.0% (837us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Texture` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 2.8% (61.1ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:145` | Self: 0.0% (0us) | Total: 0.1% (3.8ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `composeTransform` (2)
- `composeTransform` (1)
- `composeTransform` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` | Self: 0.0% (0us) | Total: 0.6% (14.4ms) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `get` (1)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `evaluateSceneInstances` (1)

**Calls:**
- `affineDeterminant` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (31.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `requestInstantiate` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 2.8% (62.1ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `migrateLegacyModel` (1)

**Calls:**
- `map` (5)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` | Self: 0.0% (0us) | Total: 2.2% (49.0ms) | Samples: 0

**Called by:**
- `update` (7)

**Calls:**
- `indexSceneNodes` (3)
- `indexSceneNodes` (2)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:95` | Self: 0.0% (0us) | Total: 6.4% (138.6ms) | Samples: 0

**Called by:**
- `evaluate` (18)

**Calls:**
- `update` (15)
- `update` (3)

### `Texture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:7302` | Self: 0.0% (0us) | Total: 0.0% (837us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Source` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:14` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `sceneBounds` (2)

**Calls:**
- `values` (2)

### `normalizeHex`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:13` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `hexToRgb` (1)

**Calls:**
- `trim` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `normalize` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:117` | Self: 0.0% (0us) | Total: 8.1% (174.0ms) | Samples: 0

**Called by:**
- `(module)` (22)

**Calls:**
- `sampleSceneAnimationTrack` (8)
- `rotation` (4)
- `rotation` (4)
- `sampleSceneAnimationTrack` (3)
- `map` (1)
- `sampleSceneAnimationTrack` (1)
- `sampleSceneAnimationTrack` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:74` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `max` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:78` | Self: 0.0% (0us) | Total: 7.2% (155.6ms) | Samples: 0

**Called by:**
- `evaluate` (18)

**Calls:**
- `readSceneDocument` (11)
- `readSceneDocument` (4)
- `readSceneDocument` (2)
- `readSceneDocument` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:307` | Self: 0.0% (0us) | Total: 0.0% (979us) | Samples: 0

**Called by:**
- `migrateLegacyModel` (1)

**Calls:**
- `creationId` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16467` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `_generateTables` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:31611` | Self: 0.0% (0us) | Total: 0.0% (971us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `CubicPoly` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 1.6% (35.2ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `map` (2)

### `makeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:31` | Self: 0.0% (0us) | Total: 0.0% (865us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `createModelAsset` (1)

### `creationId`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:34` | Self: 0.0% (0us) | Total: 0.0% (979us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `test` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:73` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `sample` (1)

**Calls:**
- `finiteTuple` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` | Self: 0.0% (0us) | Total: 0.7% (16.4ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.0% (0us) | Total: 0.6% (14.7ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `push` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 1.3% (29.3ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:29` | Self: 0.0% (0us) | Total: 0.3% (7.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `makeSceneGridGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` | Self: 0.0% (0us) | Total: 0.7% (15.0ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `get` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.8% (2.09s) | Samples: 0

**Called by:**
- `moduleEvaluation` (265)

**Calls:**
- `(module)` (90)
- `(module)` (58)
- `(module)` (34)
- `(module)` (18)
- `(module)` (18)
- `(module)` (15)
- `(module)` (6)
- `(module)` (4)
- `(module)` (4)
- `(module)` (2)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `every` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 2.6% (56.4ms) | Samples: 0

**Called by:**
- `update` (5)

**Calls:**
- `triangleUnitNormal` (3)
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` | Self: 0.0% (0us) | Total: 10.5% (226.7ms) | Samples: 0

**Called by:**
- `(module)` (15)
- `(module)` (10)

**Calls:**
- `buildSceneGeometry` (8)
- `buildSceneGeometry` (5)
- `validateBuffers` (3)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:37` | Self: 0.0% (0us) | Total: 0.7% (16.6ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `id` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:58` | Self: 0.0% (0us) | Total: 0.6% (14.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `evaluateSceneNodeFlags` (2)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.0% (0us) | Total: 0.7% (16.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `includes` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 32.7% | 703.3ms | `[native code]` |
| 17.3% | 371.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 15.3% | 329.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 8.0% | 173.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 4.1% | 89.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts` |
| 3.7% | 81.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 3.3% | 71.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 2.9% | 63.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts` |
| 2.1% | 46.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 2.0% | 44.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 1.9% | 41.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 1.6% | 36.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 1.4% | 30.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.8% | 19.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts` |
| 0.7% | 16.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 0.7% | 15.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.3% | 7.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.0% | 875us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 865us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts` |
