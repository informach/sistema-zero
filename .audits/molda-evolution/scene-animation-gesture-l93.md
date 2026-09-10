# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.93s | 232 | 1.0ms | 216 |

**Top 10:** `indexSceneDocument` 9.6%, `Set` 9.1%, `entries` 7.3%, `map` 7.0%, `get` 2.9%, `every` 2.6%, `composeTransform` 2.3%, `(anonymous)` 2.2%, `id` 1.6%, `composeTransform` 1.6%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 9.6% | 187.2ms | 11.2% | 218.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 9.1% | 176.5ms | 9.1% | 176.5ms | `Set` | `[native code]` |
| 7.3% | 141.9ms | 7.3% | 141.9ms | `entries` | `[native code]` |
| 7.0% | 137.3ms | 31.0% | 600.5ms | `map` | `[native code]` |
| 2.9% | 56.4ms | 2.9% | 56.4ms | `get` | `[native code]` |
| 2.6% | 51.4ms | 5.5% | 106.7ms | `every` | `[native code]` |
| 2.3% | 44.8ms | 3.1% | 61.1ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 2.2% | 43.0ms | 2.2% | 43.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:82` |
| 1.6% | 32.3ms | 1.6% | 32.3ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 1.6% | 32.2ms | 1.6% | 32.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 1.6% | 31.9ms | 1.6% | 31.9ms | `min` | `[native code]` |
| 1.6% | 31.1ms | 1.6% | 31.1ms | `hasOwn` | `[native code]` |
| 1.5% | 29.9ms | 1.5% | 29.9ms | `Map` | `[native code]` |
| 1.5% | 29.8ms | 1.5% | 29.8ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 1.3% | 25.3ms | 1.3% | 25.3ms | `isFinite` | `[native code]` |
| 1.2% | 24.0ms | 1.2% | 24.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts` |
| 1.1% | 21.4ms | 1.1% | 21.4ms | `stringify` | `[native code]` |
| 0.9% | 17.9ms | 0.9% | 17.9ms | `parseModule` | `[native code]` |
| 0.8% | 17.2ms | 0.8% | 17.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.8% | 17.1ms | 0.8% | 17.1ms | `set` | `[native code]` |
| 0.8% | 17.0ms | 0.8% | 17.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.8% | 17.0ms | 0.8% | 17.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.8% | 16.6ms | 0.8% | 16.6ms | `push` | `[native code]` |
| 0.8% | 16.3ms | 0.8% | 16.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:102` |
| 0.8% | 16.2ms | 0.8% | 16.2ms | `hypot` | `[native code]` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.8% | 16.0ms | 0.8% | 16.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.8% | 15.9ms | 0.8% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.8% | 15.9ms | 0.8% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.8% | 15.8ms | 0.8% | 15.8ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 0.8% | 15.7ms | 0.8% | 15.7ms | `copy` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10006` |
| 0.8% | 15.6ms | 0.8% | 15.6ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:84` |
| 0.8% | 15.6ms | 0.8% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.8% | 15.5ms | 0.8% | 15.5ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.8% | 15.5ms | 1.5% | 29.8ms | `sort` | `[native code]` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` |
| 0.7% | 15.2ms | 4.9% | 96.7ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.7% | 15.1ms | 2.3% | 44.8ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.7% | 15.1ms | 0.9% | 18.0ms | `keys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:132` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:327` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:34` |
| 0.7% | 14.9ms | 0.7% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11848` |
| 0.7% | 14.7ms | 0.7% | 14.7ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:158` |
| 0.7% | 14.6ms | 0.8% | 15.6ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.7% | 14.5ms | 0.7% | 14.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:88` |
| 0.7% | 14.4ms | 1.5% | 29.2ms | `from` | `[native code]` |
| 0.7% | 14.3ms | 0.7% | 14.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:93` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `clampInt` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\limits.ts:78` |
| 0.7% | 14.1ms | 2.2% | 43.9ms | `async (anonymous)` | `[native code]` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.7% | 14.0ms | 0.7% | 14.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.7% | 13.9ms | 0.8% | 15.9ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` |
| 0.7% | 13.6ms | 0.7% | 13.6ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.6% | 13.3ms | 0.6% | 13.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:45` |
| 0.6% | 12.9ms | 1.6% | 31.4ms | `some` | `[native code]` |
| 0.6% | 12.7ms | 0.6% | 12.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.6% | 12.2ms | 0.6% | 12.2ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 11.5ms | 0.5% | 11.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 0.5% | 9.9ms | 0.5% | 9.9ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` |
| 0.5% | 9.7ms | 0.5% | 9.7ms | `resolve` | `[native code]` |
| 0.4% | 9.3ms | 11.6% | 225.6ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:49` |
| 0.1% | 2.9ms | 0.3% | 5.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:123` |
| 0.1% | 2.0ms | 0.9% | 18.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:53` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 1.0ms | 7.3% | 142.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:43` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:107` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `add` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` |
| 0.0% | 999us | 0.0% | 999us | `flatIntoArray` | `[native code]` |
| 0.0% | 996us | 0.0% | 996us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 992us | 0.0% | 992us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.0% | 984us | 0.0% | 984us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:49` |
| 0.0% | 970us | 0.0% | 970us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 967us | 0.1% | 2.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` |
| 0.0% | 956us | 0.0% | 956us | `next` | `[native code]` |
| 0.0% | 953us | 0.0% | 953us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` |
| 0.0% | 925us | 0.0% | 925us | `values` | `[native code]` |
| 0.0% | 921us | 0.0% | 921us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` |
| 0.0% | 875us | 0.0% | 1.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 0.0% | 860us | 0.0% | 860us | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 0.0% | 859us | 0.0% | 859us | `affineInverse` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:126` |
| 0.0% | 850us | 0.0% | 850us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.76s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 97.7% | 1.89s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.1% | 1.88s | 0.0% | 0us | `evaluate` | `[native code]` |
| 51.6% | 1.00s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:91` |
| 31.0% | 600.5ms | 7.0% | 137.3ms | `map` | `[native code]` |
| 13.7% | 266.9ms | 0.0% | 0us | `sceneAnimationContext` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:8` |
| 13.0% | 251.8ms | 0.0% | 0us | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:31` |
| 12.9% | 251.2ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:15` |
| 12.3% | 238.3ms | 0.0% | 0us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:68` |
| 11.8% | 228.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` |
| 11.6% | 225.6ms | 0.4% | 9.3ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:49` |
| 11.2% | 218.4ms | 9.6% | 187.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 9.7% | 189.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:93` |
| 9.1% | 176.5ms | 9.1% | 176.5ms | `Set` | `[native code]` |
| 7.9% | 154.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:68` |
| 7.6% | 148.0ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` |
| 7.3% | 142.1ms | 0.0% | 1.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 7.3% | 141.9ms | 7.3% | 141.9ms | `entries` | `[native code]` |
| 6.4% | 125.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:82` |
| 6.0% | 116.7ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 5.6% | 109.3ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` |
| 5.5% | 107.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:69` |
| 5.5% | 106.7ms | 2.6% | 51.4ms | `every` | `[native code]` |
| 4.9% | 96.7ms | 0.7% | 15.2ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 4.8% | 93.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:57` |
| 4.5% | 87.9ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:79` |
| 3.9% | 76.9ms | 0.0% | 0us | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:167` |
| 3.8% | 75.5ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 3.2% | 62.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 3.1% | 61.1ms | 2.3% | 44.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 3.1% | 60.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:92` |
| 2.9% | 57.6ms | 0.0% | 0us | `prepareSceneAnimation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:79` |
| 2.9% | 56.4ms | 2.9% | 56.4ms | `get` | `[native code]` |
| 2.4% | 47.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:83` |
| 2.4% | 46.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 2.4% | 46.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 2.3% | 45.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 2.3% | 44.9ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 2.3% | 44.8ms | 0.7% | 15.1ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 2.2% | 43.9ms | 0.7% | 14.1ms | `async (anonymous)` | `[native code]` |
| 2.2% | 43.8ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:59` |
| 2.2% | 43.0ms | 2.2% | 43.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:82` |
| 2.1% | 42.2ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 1.9% | 36.8ms | 0.0% | 0us | `link` | `[native code]` |
| 1.8% | 36.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:61` |
| 1.6% | 32.3ms | 1.6% | 32.3ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 1.6% | 32.2ms | 1.6% | 32.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 1.6% | 31.9ms | 1.6% | 31.9ms | `min` | `[native code]` |
| 1.6% | 31.6ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 1.6% | 31.6ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 1.6% | 31.4ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` |
| 1.6% | 31.4ms | 0.6% | 12.9ms | `some` | `[native code]` |
| 1.6% | 31.1ms | 1.6% | 31.1ms | `hasOwn` | `[native code]` |
| 1.5% | 29.9ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 1.5% | 29.9ms | 1.5% | 29.9ms | `Map` | `[native code]` |
| 1.5% | 29.8ms | 1.5% | 29.8ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 1.5% | 29.8ms | 0.8% | 15.5ms | `sort` | `[native code]` |
| 1.5% | 29.8ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:93` |
| 1.5% | 29.2ms | 0.7% | 14.4ms | `from` | `[native code]` |
| 1.4% | 28.3ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:77` |
| 1.4% | 28.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 1.4% | 28.1ms | 0.0% | 0us | `selectSceneSubtrees` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:94` |
| 1.4% | 28.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 1.3% | 26.9ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` |
| 1.3% | 25.3ms | 1.3% | 25.3ms | `isFinite` | `[native code]` |
| 1.2% | 24.0ms | 1.2% | 24.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts` |
| 1.1% | 21.4ms | 1.1% | 21.4ms | `stringify` | `[native code]` |
| 0.9% | 18.6ms | 0.1% | 2.0ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.9% | 18.2ms | 0.0% | 0us | `filter` | `[native code]` |
| 0.9% | 18.0ms | 0.7% | 15.1ms | `keys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:132` |
| 0.9% | 18.0ms | 0.0% | 0us | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:178` |
| 0.9% | 17.9ms | 0.9% | 17.9ms | `parseModule` | `[native code]` |
| 0.8% | 17.2ms | 0.8% | 17.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.8% | 17.1ms | 0.8% | 17.1ms | `set` | `[native code]` |
| 0.8% | 17.0ms | 0.8% | 17.0ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.8% | 17.0ms | 0.8% | 17.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.8% | 16.8ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` |
| 0.8% | 16.6ms | 0.8% | 16.6ms | `push` | `[native code]` |
| 0.8% | 16.5ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` |
| 0.8% | 16.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.8% | 16.3ms | 0.8% | 16.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:102` |
| 0.8% | 16.2ms | 0.8% | 16.2ms | `hypot` | `[native code]` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.8% | 16.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:27` |
| 0.8% | 16.0ms | 0.8% | 16.0ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.8% | 16.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` |
| 0.8% | 16.0ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` |
| 0.8% | 15.9ms | 0.8% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.8% | 15.9ms | 0.7% | 13.9ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.8% | 15.9ms | 0.8% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.8% | 15.8ms | 0.8% | 15.8ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 0.8% | 15.8ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:22` |
| 0.8% | 15.7ms | 0.0% | 0us | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12863` |
| 0.8% | 15.7ms | 0.8% | 15.7ms | `copy` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10006` |
| 0.8% | 15.7ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` |
| 0.8% | 15.7ms | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:39` |
| 0.8% | 15.6ms | 0.7% | 14.6ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.8% | 15.6ms | 0.8% | 15.6ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:84` |
| 0.8% | 15.6ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.8% | 15.6ms | 0.8% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.8% | 15.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:94` |
| 0.8% | 15.5ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.8% | 15.5ms | 0.8% | 15.5ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.8% | 15.5ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` |
| 0.7% | 15.3ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` |
| 0.7% | 15.3ms | 0.0% | 0us | `apply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:193` |
| 0.7% | 15.3ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:167` |
| 0.7% | 15.3ms | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:86` |
| 0.7% | 15.3ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.7% | 15.2ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.7% | 15.2ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.7% | 15.2ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.7% | 15.1ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:191` |
| 0.7% | 15.1ms | 0.0% | 0us | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:327` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:34` |
| 0.7% | 14.9ms | 0.7% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.7% | 14.8ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.7% | 14.8ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.7% | 14.8ms | 0.0% | 0us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` |
| 0.7% | 14.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:359` |
| 0.7% | 14.8ms | 0.7% | 14.8ms | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11848` |
| 0.7% | 14.8ms | 0.0% | 0us | `Mesh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23031` |
| 0.7% | 14.7ms | 0.7% | 14.7ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.7% | 14.6ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:158` |
| 0.7% | 14.5ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.7% | 14.5ms | 0.7% | 14.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:88` |
| 0.7% | 14.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:46` |
| 0.7% | 14.3ms | 0.7% | 14.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:93` |
| 0.7% | 14.2ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` |
| 0.7% | 14.2ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` |
| 0.7% | 14.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:25` |
| 0.7% | 14.1ms | 0.0% | 0us | `makeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:44` |
| 0.7% | 14.1ms | 0.0% | 0us | `faceSkinSize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:126` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `clampInt` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\limits.ts:78` |
| 0.7% | 14.1ms | 0.0% | 0us | `animatedScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.7% | 14.1ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.7% | 14.0ms | 0.7% | 14.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.7% | 13.9ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` |
| 0.7% | 13.9ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:24` |
| 0.7% | 13.9ms | 0.7% | 13.9ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` |
| 0.7% | 13.8ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:65` |
| 0.7% | 13.6ms | 0.7% | 13.6ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.6% | 13.3ms | 0.6% | 13.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:45` |
| 0.6% | 13.0ms | 0.0% | 0us | `editable` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:15` |
| 0.6% | 13.0ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:37` |
| 0.6% | 12.9ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.6% | 12.7ms | 0.6% | 12.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.6% | 12.2ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.6% | 12.2ms | 0.6% | 12.2ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 11.5ms | 0.5% | 11.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 0.5% | 9.9ms | 0.5% | 9.9ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` |
| 0.5% | 9.7ms | 0.5% | 9.7ms | `resolve` | `[native code]` |
| 0.3% | 5.8ms | 0.1% | 2.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:123` |
| 0.1% | 2.9ms | 0.0% | 0us | `changed` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:122` |
| 0.1% | 2.6ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:102` |
| 0.1% | 2.6ms | 0.0% | 967us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` |
| 0.1% | 2.0ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 2.0ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.1% | 1.9ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 1.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:99` |
| 0.0% | 1.9ms | 0.0% | 875us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:53` |
| 0.0% | 1.3ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 0.0% | 1.0ms | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:63` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:43` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:107` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `compileSceneAnimation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:112` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `add` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` |
| 0.0% | 999us | 0.0% | 999us | `flatIntoArray` | `[native code]` |
| 0.0% | 996us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.0% | 996us | 0.0% | 996us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 993us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:21` |
| 0.0% | 992us | 0.0% | 992us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.0% | 986us | 0.0% | 0us | `prepareSceneAnimation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:80` |
| 0.0% | 984us | 0.0% | 984us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:49` |
| 0.0% | 970us | 0.0% | 970us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 959us | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:74` |
| 0.0% | 956us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:92` |
| 0.0% | 956us | 0.0% | 956us | `next` | `[native code]` |
| 0.0% | 953us | 0.0% | 953us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` |
| 0.0% | 952us | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:94` |
| 0.0% | 939us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:43` |
| 0.0% | 932us | 0.0% | 0us | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 0.0% | 925us | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:51` |
| 0.0% | 925us | 0.0% | 925us | `values` | `[native code]` |
| 0.0% | 921us | 0.0% | 921us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` |
| 0.0% | 887us | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:84` |
| 0.0% | 879us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:68` |
| 0.0% | 875us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:61` |
| 0.0% | 875us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:64` |
| 0.0% | 875us | 0.0% | 0us | `performIteration` | `[native code]` |
| 0.0% | 860us | 0.0% | 860us | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 0.0% | 860us | 0.0% | 0us | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:168` |
| 0.0% | 859us | 0.0% | 859us | `affineInverse` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:126` |
| 0.0% | 859us | 0.0% | 0us | `prepareSceneAnimationPoseTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:110` |
| 0.0% | 855us | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:137` |
| 0.0% | 850us | 0.0% | 850us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 9.6% (187.2ms) | Total: 11.2% (218.4ms) | Samples: 33

**Called by:**
- `sceneCommandSelection` (20)
- `update` (10)
- `finishSceneCommand` (6)

**Calls:**
- `hasOwn` (3)

### `Set`
`[native code]` | Self: 9.1% (176.5ms) | Total: 9.1% (176.5ms) | Samples: 22

**Called by:**
- `setSceneAnimationKeys` (21)
- `update` (1)

### `entries`
`[native code]` | Self: 7.3% (141.9ms) | Total: 7.3% (141.9ms) | Samples: 14

**Called by:**
- `indexSceneDocument` (13)
- `performIteration` (1)

### `map`
`[native code]` | Self: 7.0% (137.3ms) | Total: 31.0% (600.5ms) | Samples: 13

**Called by:**
- `setSceneAnimationKeys` (7)
- `readSceneAnimationClip` (7)
- `readSceneDocument` (6)
- `setSceneAnimationKeys` (6)
- `readSceneGeometry` (5)
- `triangulateFace` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `readSceneAnimations` (3)
- `setSceneAnimationKeys` (2)
- `setSceneAnimationKeys` (2)
- `setSceneAnimationKeys` (1)
- `triangulateFace` (1)
- `setSceneAnimationKeys` (1)
- `tuple` (1)
- `readSceneGeometry` (1)

**Calls:**
- `readSceneGeometry` (5)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `readKey` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `readSceneAnimationClip` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)
- `readKey` (1)
- `(anonymous)` (1)

### `get`
`[native code]` | Self: 2.9% (56.4ms) | Total: 2.9% (56.4ms) | Samples: 5

**Called by:**
- `indexSceneNodes` (2)
- `selectSceneSubtrees` (2)
- `evaluateSceneInstances` (1)

### `every`
`[native code]` | Self: 2.6% (51.4ms) | Total: 5.5% (106.7ms) | Samples: 7

**Called by:**
- `every` (5)
- `validateBuffers` (5)
- `composeTransform` (3)
- `setPose` (1)

**Calls:**
- `every` (5)
- `isFinite` (2)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` | Self: 2.3% (44.8ms) | Total: 3.1% (61.1ms) | Samples: 3

**Called by:**
- `frame` (3)
- `indexSceneNodes` (1)

**Calls:**
- `hypot` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:82` | Self: 2.2% (43.0ms) | Total: 2.2% (43.0ms) | Samples: 4

**Called by:**
- `map` (4)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 1.6% (32.3ms) | Total: 1.6% (32.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (1)
- `setSceneAnimationKeys` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` | Self: 1.6% (32.2ms) | Total: 1.6% (32.2ms) | Samples: 4

**Called by:**
- `indexSceneNodes` (3)
- `frame` (1)

### `min`
`[native code]` | Self: 1.6% (31.9ms) | Total: 1.6% (31.9ms) | Samples: 3

**Called by:**
- `sceneBounds` (2)
- `triangulateFace` (1)

### `hasOwn`
`[native code]` | Self: 1.6% (31.1ms) | Total: 1.6% (31.1ms) | Samples: 3

**Called by:**
- `indexSceneDocument` (3)

### `Map`
`[native code]` | Self: 1.5% (29.9ms) | Total: 1.5% (29.9ms) | Samples: 3

**Called by:**
- `setSceneAnimationKeys` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `apply` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` | Self: 1.5% (29.8ms) | Total: 1.5% (29.8ms) | Samples: 3

**Called by:**
- `indexSceneDocument` (2)
- `prepareSceneAnimation` (1)

### `isFinite`
`[native code]` | Self: 1.3% (25.3ms) | Total: 1.3% (25.3ms) | Samples: 2

**Called by:**
- `every` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts` | Self: 1.2% (24.0ms) | Total: 1.2% (24.0ms) | Samples: 3

**Called by:**
- `map` (3)

### `stringify`
`[native code]` | Self: 1.1% (21.4ms) | Total: 1.1% (21.4ms) | Samples: 6

**Called by:**
- `(module)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `indexSceneAnimations` (1)

### `parseModule`
`[native code]` | Self: 0.9% (17.9ms) | Total: 0.9% (17.9ms) | Samples: 3

**Called by:**
- `async (anonymous)` (3)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` | Self: 0.8% (17.2ms) | Total: 0.8% (17.2ms) | Samples: 3

**Called by:**
- `indexSceneNodes` (2)
- `frame` (1)

### `set`
`[native code]` | Self: 0.8% (17.1ms) | Total: 0.8% (17.1ms) | Samples: 4

**Called by:**
- `indexSceneNodes` (1)
- `evaluateSceneInstances` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `indexSceneNodes` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.8% (17.0ms) | Total: 0.8% (17.0ms) | Samples: 2

**Called by:**
- `sceneCommandSelection` (1)
- `finishSceneCommand` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.8% (17.0ms) | Total: 0.8% (17.0ms) | Samples: 2

**Called by:**
- `readKey` (1)
- `setSceneAnimationKeys` (1)

### `push`
`[native code]` | Self: 0.8% (16.6ms) | Total: 0.8% (16.6ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:102` | Self: 0.8% (16.3ms) | Total: 0.8% (16.3ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `hypot`
`[native code]` | Self: 0.8% (16.2ms) | Total: 0.8% (16.2ms) | Samples: 1

**Called by:**
- `composeTransform` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 0.8% (16.1ms) | Total: 0.8% (16.1ms) | Samples: 2

**Called by:**
- `sceneCommandSelection` (1)
- `update` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` | Self: 0.8% (16.0ms) | Total: 0.8% (16.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.8% (15.9ms) | Total: 0.8% (15.9ms) | Samples: 1

**Called by:**
- `update` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.8% (15.9ms) | Total: 0.8% (15.9ms) | Samples: 1

**Called by:**
- `update` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` | Self: 0.8% (15.8ms) | Total: 0.8% (15.8ms) | Samples: 2

**Called by:**
- `finishSceneCommand` (2)

### `copy`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10006` | Self: 0.8% (15.7ms) | Total: 0.8% (15.7ms) | Samples: 1

**Called by:**
- `updateMatrixWorld` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:84` | Self: 0.8% (15.6ms) | Total: 0.8% (15.6ms) | Samples: 1

**Called by:**
- `frame` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.8% (15.6ms) | Total: 0.8% (15.6ms) | Samples: 2

**Called by:**
- `some` (2)

### `evaluateSceneNodeFlags`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` | Self: 0.8% (15.5ms) | Total: 0.8% (15.5ms) | Samples: 1

**Called by:**
- `evaluateSceneInstances` (1)

### `sort`
`[native code]` | Self: 0.8% (15.5ms) | Total: 1.5% (29.8ms) | Samples: 1

**Called by:**
- `setSceneAnimationKeys` (3)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` | Self: 0.7% (15.3ms) | Total: 0.7% (15.3ms) | Samples: 1

**Called by:**
- `filter` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.7% (15.2ms) | Total: 4.9% (96.7ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (6)
- `prepareSceneAnimation` (6)

**Calls:**
- `composeTransform` (3)
- `composeTransform` (2)
- `composeTransform` (2)
- `set` (1)
- `composeTransform` (1)
- `composeTransform` (1)
- `composeTransform` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.7% (15.1ms) | Total: 2.3% (44.8ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `record` (1)
- `record` (1)

### `keys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:132` | Self: 0.7% (15.1ms) | Total: 0.9% (18.0ms) | Samples: 1

**Called by:**
- `frame` (4)

**Calls:**
- `changed` (3)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` | Self: 0.7% (15.0ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:327` | Self: 0.7% (15.0ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:34` | Self: 0.7% (15.0ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 0.7% (14.9ms) | Total: 0.7% (14.9ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.7% (14.8ms) | Total: 0.7% (14.8ms) | Samples: 1

**Called by:**
- `update` (1)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.7% (14.8ms) | Total: 0.7% (14.8ms) | Samples: 1

**Called by:**
- `orientation` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` | Self: 0.7% (14.8ms) | Total: 0.7% (14.8ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11848` | Self: 0.7% (14.8ms) | Total: 0.7% (14.8ms) | Samples: 1

**Called by:**
- `Mesh` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.7% (14.7ms) | Total: 0.7% (14.7ms) | Samples: 2

**Called by:**
- `from` (2)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.7% (14.6ms) | Total: 0.7% (14.6ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:369` | Self: 0.7% (14.6ms) | Total: 0.7% (14.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `frame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:158` | Self: 0.7% (14.6ms) | Total: 0.7% (14.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` | Self: 0.7% (14.6ms) | Total: 0.8% (15.6ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (2)

**Calls:**
- `set` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:88` | Self: 0.7% (14.5ms) | Total: 0.7% (14.5ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (1)

### `from`
`[native code]` | Self: 0.7% (14.4ms) | Total: 1.5% (29.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:93` | Self: 0.7% (14.3ms) | Total: 0.7% (14.3ms) | Samples: 2

**Called by:**
- `sort` (2)

### `clampInt`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\limits.ts:78` | Self: 0.7% (14.1ms) | Total: 0.7% (14.1ms) | Samples: 1

**Called by:**
- `faceSkinSize` (1)

### `async (anonymous)`
`[native code]` | Self: 0.7% (14.1ms) | Total: 2.2% (43.9ms) | Samples: 1

**Called by:**
- `requestInstantiate` (2)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (3)
- `resolve` (2)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.7% (14.1ms) | Total: 0.7% (14.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.7% (14.0ms) | Total: 0.7% (14.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` | Self: 0.7% (13.9ms) | Total: 0.7% (13.9ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.7% (13.9ms) | Total: 0.8% (15.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)
- `readKey` (1)

**Calls:**
- `list` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` | Self: 0.7% (13.9ms) | Total: 0.7% (13.9ms) | Samples: 1

**Called by:**
- `indexSceneNodes` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:22` | Self: 0.7% (13.9ms) | Total: 0.7% (13.9ms) | Samples: 1

**Called by:**
- `setSceneAnimationKeys` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` | Self: 0.7% (13.6ms) | Total: 0.7% (13.6ms) | Samples: 1

**Called by:**
- `readKey` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:45` | Self: 0.6% (13.3ms) | Total: 0.6% (13.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `some`
`[native code]` | Self: 0.6% (12.9ms) | Total: 1.6% (31.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)
- `setPose` (2)
- `triangulateFace` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.6% (12.7ms) | Total: 0.6% (12.7ms) | Samples: 1

**Called by:**
- `map` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.6% (12.2ms) | Total: 0.6% (12.2ms) | Samples: 1

**Called by:**
- `link` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` | Self: 0.5% (11.5ms) | Total: 0.5% (11.5ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` | Self: 0.5% (9.9ms) | Total: 0.5% (9.9ms) | Samples: 2

**Called by:**
- `prepareSceneAnimation` (2)

### `resolve`
`[native code]` | Self: 0.5% (9.7ms) | Total: 0.5% (9.7ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:49` | Self: 0.4% (9.3ms) | Total: 11.6% (225.6ms) | Samples: 1

**Called by:**
- `(module)` (28)

**Calls:**
- `Set` (21)
- `map` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:123` | Self: 0.1% (2.9ms) | Total: 0.3% (5.8ms) | Samples: 3

**Called by:**
- `filter` (3)
- `some` (3)

**Calls:**
- `some` (3)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 0.1% (2.0ms) | Total: 0.9% (18.6ms) | Samples: 2

**Called by:**
- `update` (3)

**Calls:**
- `push` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` | Self: 0.1% (1.9ms) | Total: 0.1% (1.9ms) | Samples: 1

**Called by:**
- `tuple` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:53` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `sample` (1)
- `prepareSceneAnimationPoseTransform` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.0% (1.0ms) | Total: 7.3% (142.1ms) | Samples: 1

**Called by:**
- `update` (6)
- `sceneCommandSelection` (4)
- `finishSceneCommand` (4)

**Calls:**
- `entries` (13)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `prepareSceneAnimationPoseTransform` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:43` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:107` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `fetch`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `add`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `compileSceneAnimation` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `indexSceneNodes` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (999us) | Total: 0.0% (999us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.0% (996us) | Total: 0.0% (996us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` | Self: 0.0% (992us) | Total: 0.0% (992us) | Samples: 1

**Called by:**
- `prepareSceneAnimation` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:49` | Self: 0.0% (984us) | Total: 0.0% (984us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.0% (970us) | Total: 0.0% (970us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` | Self: 0.0% (967us) | Total: 0.1% (2.6ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `stringify` (1)

### `next`
`[native code]` | Self: 0.0% (956us) | Total: 0.0% (956us) | Samples: 1

**Called by:**
- `setSceneAnimationKeys` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:380` | Self: 0.0% (953us) | Total: 0.0% (953us) | Samples: 1

**Called by:**
- `(module)` (1)

### `values`
`[native code]` | Self: 0.0% (925us) | Total: 0.0% (925us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:95` | Self: 0.0% (921us) | Total: 0.0% (921us) | Samples: 1

**Called by:**
- `update` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` | Self: 0.0% (875us) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (2)

**Calls:**
- `transformPoint` (1)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` | Self: 0.0% (860us) | Total: 0.0% (860us) | Samples: 1

**Called by:**
- `frame` (1)

### `affineInverse`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:126` | Self: 0.0% (859us) | Total: 0.0% (859us) | Samples: 1

**Called by:**
- `prepareSceneAnimationPoseTransform` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` | Self: 0.0% (850us) | Total: 0.0% (850us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` | Self: 0.0% (0us) | Total: 0.8% (16.8ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)

### `performIteration`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (875us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `entries` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 1.9% (36.8ms) | Samples: 0

**Called by:**
- `link` (2)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (2)
- `moduleDeclarationInstantiation` (1)

### `frame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:178` | Self: 0.0% (0us) | Total: 0.9% (18.0ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `keys` (4)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` | Self: 0.0% (0us) | Total: 0.7% (14.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.0ms) | Samples: 0

**Called by:**
- `triangulateFace` (2)

**Calls:**
- `(anonymous)` (1)
- `flatIntoArray` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.0% (0us) | Total: 0.7% (14.5ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.76s) | Samples: 0

**Called by:**
- `moduleEvaluation` (224)
- `async loadAndEvaluateModule` (224)

**Calls:**
- `evaluate` (224)
- `moduleEvaluation` (224)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 1.6% (31.6ms) | Samples: 0

**Called by:**
- `readSceneDocument` (3)

**Calls:**
- `map` (3)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:39` | Self: 0.0% (0us) | Total: 0.8% (15.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sceneAnimationContext` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:24` | Self: 0.0% (0us) | Total: 0.7% (13.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `record` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:93` | Self: 0.0% (0us) | Total: 9.7% (189.8ms) | Samples: 0

**Called by:**
- `evaluate` (22)

**Calls:**
- `update` (17)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)
- `update` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:79` | Self: 0.0% (0us) | Total: 4.5% (87.9ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `map` (7)

### `apply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:193` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Map` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:86` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `composeTransform` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:27` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `makeSceneGridGeometry` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:110` | Self: 0.0% (0us) | Total: 0.0% (859us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `affineInverse` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.2ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (2)

**Calls:**
- `async (anonymous)` (2)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:167` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `every` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:94` | Self: 0.0% (0us) | Total: 0.8% (15.6ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `setPose` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 2.4% (46.7ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 3.2% (62.2ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `map` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringify` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.0% (996us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `triangleUnitNormal` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:74` | Self: 0.0% (0us) | Total: 0.0% (959us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sampleSceneAnimationTrack` (1)

### `Mesh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23031` | Self: 0.0% (0us) | Total: 0.7% (14.8ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `Object3D` (1)

### `prepareSceneAnimation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:79` | Self: 0.0% (0us) | Total: 2.9% (57.6ms) | Samples: 0

**Called by:**
- `(module)` (10)

**Calls:**
- `indexSceneNodes` (6)
- `indexSceneNodes` (2)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 6.0% (116.7ms) | Samples: 0

**Called by:**
- `update` (11)

**Calls:**
- `triangulateFace` (4)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `compileSceneAnimation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:112` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `add` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` | Self: 0.0% (0us) | Total: 7.6% (148.0ms) | Samples: 0

**Called by:**
- `(module)` (17)
- `(module)` (4)
- `(module)` (1)

**Calls:**
- `indexSceneDocument` (10)
- `indexSceneDocument` (6)
- `indexSceneDocument` (4)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `get` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.0% (0us) | Total: 1.4% (28.2ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `map` (3)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:77` | Self: 0.0% (0us) | Total: 1.4% (28.3ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `map` (2)
- `Map` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` | Self: 0.0% (0us) | Total: 0.8% (16.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:57` | Self: 0.0% (0us) | Total: 4.8% (93.9ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `readSceneDocument` (6)
- `readSceneDocument` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:61` | Self: 0.0% (0us) | Total: 1.8% (36.7ms) | Samples: 0

**Called by:**
- `evaluate` (8)

**Calls:**
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)
- `prepareSceneAnimationPoseTransform` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` | Self: 0.0% (0us) | Total: 0.7% (14.2ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `set` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:37` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `editable` (1)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 3.8% (75.5ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (4)
- `map` (3)

**Calls:**
- `map` (7)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.2ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (2)

### `finishSceneCommand`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:68` | Self: 0.0% (0us) | Total: 12.3% (238.3ms) | Samples: 0

**Called by:**
- `(module)` (28)

**Calls:**
- `indexSceneDocument` (6)
- `indexSceneDocument` (5)
- `indexSceneDocument` (4)
- `sceneBounds` (2)
- `sceneBounds` (2)
- `sceneBounds` (2)
- `sceneBounds` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `sceneBounds` (1)
- `sceneBounds` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:94` | Self: 0.0% (0us) | Total: 0.0% (952us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:83` | Self: 0.0% (0us) | Total: 2.4% (47.9ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `setPose` (2)
- `setPose` (1)
- `setPose` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:46` | Self: 0.0% (0us) | Total: 0.7% (14.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `from` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:69` | Self: 0.0% (0us) | Total: 5.5% (107.9ms) | Samples: 0

**Called by:**
- `evaluate` (11)

**Calls:**
- `update` (7)
- `update` (4)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:22` | Self: 0.0% (0us) | Total: 0.8% (15.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `id` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:59` | Self: 0.0% (0us) | Total: 2.2% (43.8ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `readSceneAnimationClip` (4)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 1.5% (29.9ms) | Samples: 0

**Called by:**
- `update` (5)

**Calls:**
- `every` (5)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` | Self: 0.0% (0us) | Total: 0.0% (932us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `stringify` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.0% (0us) | Total: 0.7% (14.6ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `point` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:68` | Self: 0.0% (0us) | Total: 0.0% (879us) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `from` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` | Self: 0.0% (0us) | Total: 0.7% (13.9ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (1)

**Calls:**
- `prepareSceneBounds` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `min` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` | Self: 0.0% (0us) | Total: 0.8% (15.5ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `evaluateSceneNodeFlags` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:21` | Self: 0.0% (0us) | Total: 0.0% (993us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `record` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (12.2ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 1.6% (31.6ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `readSceneAnimations` (3)

### `updateMatrixWorld`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12863` | Self: 0.0% (0us) | Total: 0.8% (15.7ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `copy` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:65` | Self: 0.0% (0us) | Total: 0.7% (13.8ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `from` (1)

### `makeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:44` | Self: 0.0% (0us) | Total: 0.7% (14.1ms) | Samples: 0

**Called by:**
- `animatedScene` (1)

**Calls:**
- `faceSkinSize` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:15` | Self: 0.0% (0us) | Total: 12.9% (251.2ms) | Samples: 0

**Called by:**
- `(module)` (31)

**Calls:**
- `sceneAnimationContext` (31)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:68` | Self: 0.0% (0us) | Total: 7.9% (154.0ms) | Samples: 0

**Called by:**
- `evaluate` (21)

**Calls:**
- `update` (19)
- `update` (1)
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 1.4% (28.1ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (1)
- `tuple` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 2.3% (44.9ms) | Samples: 0

**Called by:**
- `sceneCommandSelection` (2)
- `update` (1)
- `finishSceneCommand` (1)

**Calls:**
- `indexSceneAnimations` (2)
- `indexSceneAnimations` (1)
- `indexSceneAnimations` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:93` | Self: 0.0% (0us) | Total: 1.5% (29.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `sort` (3)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` | Self: 0.0% (0us) | Total: 0.8% (15.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `updateMatrixWorld` (1)

### `selectSceneSubtrees`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:94` | Self: 0.0% (0us) | Total: 1.4% (28.1ms) | Samples: 0

**Called by:**
- `editable` (1)
- `sceneCommandSelection` (1)

**Calls:**
- `get` (2)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:31` | Self: 0.0% (0us) | Total: 13.0% (251.8ms) | Samples: 0

**Called by:**
- `sceneAnimationContext` (31)

**Calls:**
- `indexSceneDocument` (20)
- `indexSceneDocument` (4)
- `indexSceneDocument` (3)
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.0% (0us) | Total: 0.8% (15.6ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `some` (2)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:63` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `composeTransform` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.7% (14.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` | Self: 0.0% (0us) | Total: 0.7% (14.8ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:64` | Self: 0.0% (0us) | Total: 0.0% (875us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `performIteration` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` | Self: 0.0% (0us) | Total: 0.8% (16.5ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (2)

**Calls:**
- `min` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:191` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Set` (1)

### `frame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:168` | Self: 0.0% (0us) | Total: 0.0% (860us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `affineMultiply` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:61` | Self: 0.0% (0us) | Total: 0.0% (875us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:359` | Self: 0.0% (0us) | Total: 0.7% (14.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Mesh` (1)

### `frame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:167` | Self: 0.0% (0us) | Total: 3.9% (76.9ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `composeTransform` (3)
- `composeTransform` (1)
- `composeTransform` (1)
- `composeTransform` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:82` | Self: 0.0% (0us) | Total: 6.4% (125.8ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `frame` (6)
- `frame` (4)
- `frame` (1)
- `frame` (1)
- `apply` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:102` | Self: 0.0% (0us) | Total: 0.1% (2.6ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:91` | Self: 0.0% (0us) | Total: 51.6% (1.00s) | Samples: 0

**Called by:**
- `evaluate` (116)

**Calls:**
- `setSceneAnimationKeys` (31)
- `finishSceneCommand` (28)
- `setSceneAnimationKeys` (28)
- `setSceneAnimationKeys` (7)
- `setSceneAnimationKeys` (4)
- `setSceneAnimationKeys` (3)
- `setSceneAnimationKeys` (3)
- `setSceneAnimationKeys` (2)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (0us) | Total: 0.1% (1.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `tuple` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:92` | Self: 0.0% (0us) | Total: 3.1% (60.4ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `prepareSceneAnimation` (10)
- `sample` (1)
- `prepareSceneAnimation` (1)
- `compileSceneAnimation` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 0.1% (2.0ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.8% (16.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 2.4% (46.7ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `map` (5)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (0us) | Total: 0.7% (14.8ms) | Samples: 0

**Called by:**
- `evaluateSceneInstances` (1)

**Calls:**
- `affineDeterminant` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:137` | Self: 0.0% (0us) | Total: 0.0% (855us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sampleSceneAnimationTrack` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `requestInstantiate` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` | Self: 0.0% (0us) | Total: 0.6% (12.9ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `some` (1)

### `animatedScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` | Self: 0.0% (0us) | Total: 0.7% (14.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `makeModel` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` | Self: 0.0% (0us) | Total: 5.6% (109.3ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (5)
- `update` (4)
- `sceneCommandSelection` (3)

**Calls:**
- `indexSceneNodes` (6)
- `indexSceneNodes` (2)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.7% (14.8ms) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `orientation` (1)

### `faceSkinSize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\shapes.ts:126` | Self: 0.0% (0us) | Total: 0.7% (14.1ms) | Samples: 0

**Called by:**
- `makeModel` (1)

**Calls:**
- `clampInt` (1)

### `prepareSceneAnimationPoseTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:84` | Self: 0.0% (0us) | Total: 0.0% (887us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `set` (1)

### `changed`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts:122` | Self: 0.0% (0us) | Total: 0.1% (2.9ms) | Samples: 0

**Called by:**
- `keys` (3)

**Calls:**
- `filter` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:43` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringify` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:99` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `stringify` (2)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (18.2ms) | Samples: 0

**Called by:**
- `changed` (3)
- `setSceneAnimationKeys` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:51` | Self: 0.0% (0us) | Total: 0.0% (925us) | Samples: 0

**Called by:**
- `finishSceneCommand` (1)

**Calls:**
- `values` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 2.3% (45.6ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 2.1% (42.2ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `map` (4)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:92` | Self: 0.0% (0us) | Total: 0.0% (956us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `next` (1)

### `sceneAnimationContext`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:8` | Self: 0.0% (0us) | Total: 13.7% (266.9ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (31)
- `prepareSceneAnimationPoseTransform` (1)

**Calls:**
- `sceneCommandSelection` (31)
- `sceneCommandSelection` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `filter` (1)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `sceneAnimationContext` (1)

**Calls:**
- `selectSceneSubtrees` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.7% (1.89s) | Samples: 0

**Calls:**
- `moduleEvaluation` (224)
- `linkAndEvaluateModule` (1)

### `prepareSceneAnimation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:80` | Self: 0.0% (0us) | Total: 0.0% (986us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `indexSceneAnimations` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts:25` | Self: 0.0% (0us) | Total: 0.7% (14.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `animatedScene` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` | Self: 0.0% (0us) | Total: 1.3% (26.9ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)
- `prepareSceneAnimation` (1)

**Calls:**
- `get` (2)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.1% (1.88s) | Samples: 0

**Called by:**
- `moduleEvaluation` (224)

**Calls:**
- `(module)` (116)
- `(module)` (22)
- `(module)` (21)
- `(module)` (13)
- `(module)` (13)
- `(module)` (11)
- `(module)` (9)
- `(module)` (8)
- `(module)` (4)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` | Self: 0.0% (0us) | Total: 1.6% (31.4ms) | Samples: 0

**Called by:**
- `indexSceneNodes` (2)
- `prepareSceneAnimationPoseTransform` (1)

**Calls:**
- `every` (3)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` | Self: 0.0% (0us) | Total: 11.8% (228.8ms) | Samples: 0

**Called by:**
- `(module)` (19)
- `(module)` (7)

**Calls:**
- `buildSceneGeometry` (11)
- `validateBuffers` (5)
- `buildSceneGeometry` (3)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.8% (15.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `editable`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:15` | Self: 0.0% (0us) | Total: 0.6% (13.0ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (1)

**Calls:**
- `selectSceneSubtrees` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 44.9% | 870.3ms | `[native code]` |
| 12.1% | 236.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 7.4% | 143.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 6.3% | 123.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts` |
| 5.5% | 107.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 2.9% | 57.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts` |
| 2.9% | 57.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 2.5% | 49.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 2.3% | 46.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 2.3% | 44.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts` |
| 2.1% | 42.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 1.7% | 33.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationPoseTransform.ts` |
| 1.5% | 30.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 1.4% | 28.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.8% | 16.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-gesture.ts` |
| 0.8% | 16.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.8% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.7% | 14.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\limits.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 0.0% | 996us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 970us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
