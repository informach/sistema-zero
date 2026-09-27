# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.71s | 232 | 1.0ms | 182 |

**Top 10:** `indexSceneDocument` 14.8%, `map` 7.9%, `unit` 4.2%, `sampleSceneAnimationTrack` 3.4%, `indexSceneDocument` 2.0%, `(anonymous)` 2.0%, `indexSceneDocument` 1.9%, `every` 1.9%, `stringify` 1.9%, `cloneObject` 1.8%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 14.8% | 254.7ms | 14.8% | 254.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 7.9% | 137.0ms | 41.3% | 708.1ms | `map` | `[native code]` |
| 4.2% | 73.1ms | 5.1% | 87.7ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` |
| 3.4% | 59.2ms | 3.4% | 59.2ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` |
| 2.0% | 35.6ms | 2.0% | 35.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 2.0% | 35.3ms | 2.0% | 35.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 1.9% | 34.2ms | 1.9% | 34.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 1.9% | 33.5ms | 4.6% | 80.1ms | `every` | `[native code]` |
| 1.9% | 32.7ms | 1.9% | 32.7ms | `stringify` | `[native code]` |
| 1.8% | 32.3ms | 1.8% | 32.3ms | `cloneObject` | `[native code]` |
| 1.8% | 32.0ms | 1.8% | 32.0ms | `parseModule` | `[native code]` |
| 1.8% | 31.0ms | 1.8% | 31.0ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 1.8% | 31.0ms | 1.8% | 31.0ms | `Map` | `[native code]` |
| 1.7% | 30.8ms | 1.7% | 30.8ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 1.7% | 30.0ms | 1.7% | 30.0ms | `push` | `[native code]` |
| 1.7% | 29.6ms | 1.7% | 30.5ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` |
| 1.6% | 28.8ms | 1.6% | 28.8ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:36` |
| 1.6% | 27.8ms | 1.6% | 27.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.5% | 26.1ms | 1.5% | 26.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 1.4% | 25.1ms | 1.4% | 25.1ms | `entries` | `[native code]` |
| 1.0% | 18.6ms | 1.0% | 18.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 1.0% | 17.8ms | 1.0% | 17.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 0.9% | 17.0ms | 0.9% | 17.0ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:203` |
| 0.9% | 16.9ms | 2.6% | 45.1ms | `from` | `[native code]` |
| 0.9% | 16.8ms | 0.9% | 16.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:123` |
| 0.9% | 16.5ms | 0.9% | 16.5ms | `get` | `[native code]` |
| 0.9% | 16.4ms | 0.9% | 16.4ms | `set` | `[native code]` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `includes` | `[native code]` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `Vector3` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4838` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` |
| 0.9% | 15.9ms | 0.9% | 15.9ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.9% | 15.8ms | 0.9% | 15.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.8% | 15.4ms | 0.8% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.8% | 15.3ms | 0.8% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:70` |
| 0.8% | 15.2ms | 0.8% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:21` |
| 0.8% | 15.1ms | 1.6% | 28.7ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `isFinite` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `performIteration` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `multiplyMatrices` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `cacheSatisfy` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `compose` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10839` |
| 0.8% | 14.9ms | 0.8% | 14.9ms | `min` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5360` |
| 0.8% | 14.7ms | 0.8% | 14.7ms | `copyDataProperties` | `[native code]` |
| 0.8% | 14.6ms | 0.8% | 14.6ms | `hypot` | `[native code]` |
| 0.8% | 14.6ms | 0.8% | 14.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.8% | 14.5ms | 2.7% | 47.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 0.8% | 14.5ms | 2.4% | 42.2ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.8% | 14.4ms | 0.8% | 14.4ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.8% | 14.3ms | 0.8% | 14.3ms | `fromArray` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11083` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:35` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `Set` | `[native code]` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.7% | 13.3ms | 0.7% | 13.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.7% | 13.1ms | 0.7% | 13.1ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:126` |
| 0.7% | 13.0ms | 0.7% | 13.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:72` |
| 0.7% | 12.9ms | 0.7% | 12.9ms | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:36` |
| 0.7% | 12.7ms | 0.7% | 12.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.7% | 12.4ms | 0.7% | 12.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.7% | 12.1ms | 0.7% | 12.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.5% | 9.2ms | 0.5% | 9.2ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:134` |
| 0.2% | 4.8ms | 0.2% | 4.8ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 0.1% | 3.1ms | 0.1% | 3.1ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `requestInstantiate` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 1.1ms | 0.9% | 16.8ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.0% | 1.0ms | 0.9% | 16.0ms | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12867` |
| 0.0% | 982us | 0.0% | 982us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` |
| 0.0% | 980us | 0.0% | 980us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` |
| 0.0% | 952us | 0.0% | 952us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 935us | 0.0% | 935us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.0% | 927us | 0.0% | 927us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` |
| 0.0% | 912us | 0.0% | 912us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:216` |
| 0.0% | 911us | 0.0% | 911us | `Data3DTexture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 907us | 0.0% | 907us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.0% | 893us | 0.0% | 893us | `abs` | `[native code]` |
| 0.0% | 890us | 0.0% | 890us | `flatIntoArray` | `[native code]` |
| 0.0% | 889us | 0.0% | 889us | `next` | `[native code]` |
| 0.0% | 880us | 3.6% | 62.9ms | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` |
| 0.0% | 839us | 0.0% | 839us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.34s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 97.3% | 1.66s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.1% | 1.66s | 0.0% | 0us | `evaluate` | `[native code]` |
| 41.3% | 708.1ms | 7.9% | 137.0ms | `map` | `[native code]` |
| 34.6% | 594.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:104` |
| 27.6% | 474.3ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` |
| 24.7% | 425.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:98` |
| 19.1% | 327.6ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:117` |
| 14.8% | 254.7ms | 14.8% | 254.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 13.6% | 234.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` |
| 9.9% | 170.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:76` |
| 8.2% | 140.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:89` |
| 7.0% | 121.2ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 6.7% | 115.2ms | 0.0% | 0us | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:71` |
| 6.3% | 108.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:90` |
| 5.5% | 94.7ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 5.5% | 94.7ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 5.5% | 94.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 5.1% | 87.7ms | 4.2% | 73.1ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` |
| 4.6% | 80.1ms | 1.9% | 33.5ms | `every` | `[native code]` |
| 4.5% | 78.3ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 4.5% | 77.6ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 3.6% | 62.9ms | 0.0% | 880us | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` |
| 3.5% | 61.3ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 3.5% | 61.3ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 3.4% | 59.2ms | 3.4% | 59.2ms | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` |
| 3.3% | 57.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:101` |
| 2.9% | 50.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 2.7% | 47.3ms | 0.8% | 14.5ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 2.6% | 45.1ms | 0.9% | 16.9ms | `from` | `[native code]` |
| 2.5% | 44.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:86` |
| 2.4% | 42.2ms | 0.8% | 14.5ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 2.1% | 36.1ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` |
| 2.0% | 35.6ms | 2.0% | 35.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 2.0% | 35.3ms | 2.0% | 35.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 2.0% | 35.3ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 1.9% | 34.2ms | 1.9% | 34.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 1.9% | 32.7ms | 1.9% | 32.7ms | `stringify` | `[native code]` |
| 1.8% | 32.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:122` |
| 1.8% | 32.3ms | 1.8% | 32.3ms | `cloneObject` | `[native code]` |
| 1.8% | 32.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 1.8% | 32.0ms | 1.8% | 32.0ms | `parseModule` | `[native code]` |
| 1.8% | 32.0ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.8% | 31.5ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 1.8% | 31.0ms | 1.8% | 31.0ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 1.8% | 31.0ms | 0.0% | 0us | `sampleSceneAnimationTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:52` |
| 1.8% | 31.0ms | 0.0% | 0us | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:61` |
| 1.8% | 31.0ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` |
| 1.8% | 31.0ms | 1.8% | 31.0ms | `Map` | `[native code]` |
| 1.7% | 30.8ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:122` |
| 1.7% | 30.8ms | 1.7% | 30.8ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 1.7% | 30.5ms | 1.7% | 29.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` |
| 1.7% | 30.0ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 1.7% | 30.0ms | 1.7% | 30.0ms | `push` | `[native code]` |
| 1.7% | 29.3ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` |
| 1.6% | 28.8ms | 1.6% | 28.8ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:36` |
| 1.6% | 28.7ms | 0.8% | 15.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 1.6% | 27.8ms | 1.6% | 27.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.5% | 26.1ms | 1.5% | 26.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 1.4% | 25.1ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 1.4% | 25.1ms | 1.4% | 25.1ms | `entries` | `[native code]` |
| 1.1% | 19.1ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:199` |
| 1.0% | 18.6ms | 1.0% | 18.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 1.0% | 17.8ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:121` |
| 1.0% | 17.8ms | 1.0% | 17.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 0.9% | 17.0ms | 0.9% | 17.0ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:203` |
| 0.9% | 16.8ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.9% | 16.8ms | 0.0% | 1.1ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.9% | 16.8ms | 0.9% | 16.8ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:123` |
| 0.9% | 16.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:106` |
| 0.9% | 16.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:106` |
| 0.9% | 16.5ms | 0.9% | 16.5ms | `get` | `[native code]` |
| 0.9% | 16.4ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:101` |
| 0.9% | 16.4ms | 0.9% | 16.4ms | `set` | `[native code]` |
| 0.9% | 16.3ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 0.9% | 16.2ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `includes` | `[native code]` |
| 0.9% | 16.2ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.9% | 16.2ms | 0.0% | 0us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.9% | 16.2ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 0.9% | 16.2ms | 0.9% | 16.2ms | `Vector3` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4838` |
| 0.9% | 16.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:127` |
| 0.9% | 16.0ms | 0.0% | 0us | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12887` |
| 0.9% | 16.0ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` |
| 0.9% | 16.0ms | 0.0% | 1.0ms | `updateMatrixWorld` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12867` |
| 0.9% | 16.0ms | 0.0% | 0us | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:35` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` |
| 0.9% | 15.9ms | 0.9% | 15.9ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` |
| 0.9% | 15.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:27` |
| 0.9% | 15.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5078` |
| 0.9% | 15.8ms | 0.9% | 15.8ms | `Texture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.9% | 15.7ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` |
| 0.9% | 15.5ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:219` |
| 0.9% | 15.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `hexToRgb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.9% | 15.5ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.9% | 15.4ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 0.8% | 15.4ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` |
| 0.8% | 15.4ms | 0.8% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.8% | 15.3ms | 0.8% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:70` |
| 0.8% | 15.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:66` |
| 0.8% | 15.2ms | 0.8% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:21` |
| 0.8% | 15.1ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:71` |
| 0.8% | 15.1ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `isFinite` | `[native code]` |
| 0.8% | 15.0ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `performIteration` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `multiplyMatrices` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 15.0ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `cacheSatisfy` | `[native code]` |
| 0.8% | 15.0ms | 0.8% | 15.0ms | `compose` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10839` |
| 0.8% | 15.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:124` |
| 0.8% | 14.9ms | 0.0% | 0us | `geometryEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:93` |
| 0.8% | 14.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:318` |
| 0.8% | 14.9ms | 0.0% | 0us | `computeBoundingBox` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18766` |
| 0.8% | 14.9ms | 0.0% | 0us | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` |
| 0.8% | 14.9ms | 0.8% | 14.9ms | `min` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5360` |
| 0.8% | 14.9ms | 0.0% | 0us | `expandByPoint` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15905` |
| 0.8% | 14.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.8% | 14.7ms | 0.8% | 14.7ms | `copyDataProperties` | `[native code]` |
| 0.8% | 14.6ms | 0.8% | 14.6ms | `hypot` | `[native code]` |
| 0.8% | 14.6ms | 0.8% | 14.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.8% | 14.5ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:348` |
| 0.8% | 14.4ms | 0.8% | 14.4ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.8% | 14.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` |
| 0.8% | 14.4ms | 0.0% | 0us | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:44` |
| 0.8% | 14.3ms | 0.8% | 14.3ms | `fromArray` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11083` |
| 0.8% | 14.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:35` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `Set` | `[native code]` |
| 0.8% | 14.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.8% | 14.2ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.8% | 14.2ms | 0.0% | 0us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.7% | 13.6ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:60` |
| 0.7% | 13.6ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.7% | 13.6ms | 0.0% | 0us | `some` | `[native code]` |
| 0.7% | 13.3ms | 0.7% | 13.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.7% | 13.1ms | 0.7% | 13.1ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:126` |
| 0.7% | 13.0ms | 0.7% | 13.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:72` |
| 0.7% | 12.9ms | 0.7% | 12.9ms | `rotation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:36` |
| 0.7% | 12.7ms | 0.7% | 12.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.7% | 12.4ms | 0.7% | 12.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.7% | 12.1ms | 0.7% | 12.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.7% | 12.1ms | 0.0% | 0us | `setPose` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` |
| 0.5% | 9.2ms | 0.5% | 9.2ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:134` |
| 0.2% | 4.8ms | 0.2% | 4.8ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 0.2% | 4.7ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.2% | 3.8ms | 0.0% | 0us | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:30` |
| 0.1% | 3.1ms | 0.1% | 3.1ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.1% | 2.3ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `requestInstantiate` | `[native code]` |
| 0.1% | 2.3ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 0.1% | 1.8ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.1% | 1.8ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 1.6ms | 0.0% | 1.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 1.6ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 1.4ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.0% | 1.3ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:352` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.0% | 982us | 0.0% | 982us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` |
| 0.0% | 980us | 0.0% | 980us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` |
| 0.0% | 977us | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.0% | 952us | 0.0% | 952us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 935us | 0.0% | 935us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.0% | 927us | 0.0% | 927us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` |
| 0.0% | 912us | 0.0% | 912us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:216` |
| 0.0% | 911us | 0.0% | 911us | `Data3DTexture` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 911us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5083` |
| 0.0% | 907us | 0.0% | 907us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.0% | 893us | 0.0% | 893us | `abs` | `[native code]` |
| 0.0% | 890us | 0.0% | 890us | `flatIntoArray` | `[native code]` |
| 0.0% | 889us | 0.0% | 889us | `next` | `[native code]` |
| 0.0% | 872us | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:104` |
| 0.0% | 839us | 0.0% | 839us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 14.8% (254.7ms) | Total: 14.8% (254.7ms) | Samples: 35

**Called by:**
- `update` (35)

### `map`
`[native code]` | Self: 7.9% (137.0ms) | Total: 41.3% (708.1ms) | Samples: 18

**Called by:**
- `readSceneAnimations` (12)
- `readSceneAnimationClip` (12)
- `sampleSceneAnimationTrack` (12)
- `(anonymous)` (7)
- `readSceneGeometry` (6)
- `readSceneDocument` (6)
- `tuple` (6)
- `(anonymous)` (5)
- `triangulateFace` (4)
- `(anonymous)` (4)
- `unit` (4)
- `buildSceneGeometry` (3)
- `triangleUnitNormal` (3)
- `buildSceneGeometry` (2)
- `(module)` (2)
- `rotation` (1)
- `triangulateFace` (1)
- `update` (1)
- `update` (1)
- `sample` (1)

**Calls:**
- `readSceneAnimationClip` (12)
- `readKey` (10)
- `(anonymous)` (7)
- `readSceneGeometry` (6)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `readKey` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `abs` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:29` | Self: 4.2% (73.1ms) | Total: 5.1% (87.7ms) | Samples: 5

**Called by:**
- `rotation` (4)
- `rotation` (1)
- `rotation` (1)

**Calls:**
- `hypot` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:69` | Self: 3.4% (59.2ms) | Total: 3.4% (59.2ms) | Samples: 6

**Called by:**
- `sample` (6)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 2.0% (35.6ms) | Total: 2.0% (35.6ms) | Samples: 6

**Called by:**
- `update` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 2.0% (35.3ms) | Total: 2.0% (35.3ms) | Samples: 6

**Called by:**
- `map` (6)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 1.9% (34.2ms) | Total: 1.9% (34.2ms) | Samples: 6

**Called by:**
- `update` (6)

### `every`
`[native code]` | Self: 1.9% (33.5ms) | Total: 4.6% (80.1ms) | Samples: 5

**Called by:**
- `update` (3)
- `every` (3)
- `validateBuffers` (3)

**Calls:**
- `every` (3)
- `isFinite` (1)

### `stringify`
`[native code]` | Self: 1.9% (32.7ms) | Total: 1.9% (32.7ms) | Samples: 5

**Called by:**
- `indexSceneAnimations` (5)

### `cloneObject`
`[native code]` | Self: 1.8% (32.3ms) | Total: 1.8% (32.3ms) | Samples: 3

**Called by:**
- `(anonymous)` (2)
- `(module)` (1)

### `parseModule`
`[native code]` | Self: 1.8% (32.0ms) | Total: 1.8% (32.0ms) | Samples: 5

**Called by:**
- `async (anonymous)` (5)

### `requireScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` | Self: 1.8% (31.0ms) | Total: 1.8% (31.0ms) | Samples: 2

**Called by:**
- `number` (2)

### `Map`
`[native code]` | Self: 1.8% (31.0ms) | Total: 1.8% (31.0ms) | Samples: 3

**Called by:**
- `sample` (2)
- `update` (1)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` | Self: 1.7% (30.8ms) | Total: 1.7% (30.8ms) | Samples: 2

**Called by:**
- `sample` (2)

### `push`
`[native code]` | Self: 1.7% (30.0ms) | Total: 1.7% (30.0ms) | Samples: 4

**Called by:**
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:102` | Self: 1.7% (29.6ms) | Total: 1.7% (30.5ms) | Samples: 2

**Called by:**
- `(module)` (3)

**Calls:**
- `next` (1)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:36` | Self: 1.6% (28.8ms) | Total: 1.6% (28.8ms) | Samples: 2

**Called by:**
- `composeTransform` (1)
- `composeTransform` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 1.6% (27.8ms) | Total: 1.6% (27.8ms) | Samples: 3

**Called by:**
- `buildSceneGeometry` (3)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` | Self: 1.5% (26.1ms) | Total: 1.5% (26.1ms) | Samples: 3

**Called by:**
- `indexSceneDocument` (3)

### `entries`
`[native code]` | Self: 1.4% (25.1ms) | Total: 1.4% (25.1ms) | Samples: 11

**Called by:**
- `indexSceneDocument` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` | Self: 1.0% (18.6ms) | Total: 1.0% (18.6ms) | Samples: 5

**Called by:**
- `map` (5)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` | Self: 1.0% (17.8ms) | Total: 1.0% (17.8ms) | Samples: 3

**Called by:**
- `sample` (3)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:203` | Self: 0.9% (17.0ms) | Total: 0.9% (17.0ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `from`
`[native code]` | Self: 0.9% (16.9ms) | Total: 2.6% (45.1ms) | Samples: 3

**Called by:**
- `tuple` (3)
- `update` (2)
- `(module)` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (2)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:123` | Self: 0.9% (16.8ms) | Total: 0.9% (16.8ms) | Samples: 2

**Called by:**
- `evaluate` (2)

### `get`
`[native code]` | Self: 0.9% (16.5ms) | Total: 0.9% (16.5ms) | Samples: 2

**Called by:**
- `evaluateSceneInstances` (1)
- `sample` (1)

### `set`
`[native code]` | Self: 0.9% (16.4ms) | Total: 0.9% (16.4ms) | Samples: 2

**Called by:**
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `includes`
`[native code]` | Self: 0.9% (16.2ms) | Total: 0.9% (16.2ms) | Samples: 1

**Called by:**
- `record` (1)

### `evaluateSceneNodeFlags`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` | Self: 0.9% (16.2ms) | Total: 0.9% (16.2ms) | Samples: 2

**Called by:**
- `evaluateSceneInstances` (2)

### `Vector3`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4838` | Self: 0.9% (16.2ms) | Total: 0.9% (16.2ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` | Self: 0.9% (16.0ms) | Total: 0.9% (16.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:10` | Self: 0.9% (15.9ms) | Total: 0.9% (15.9ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `Texture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.9% (15.8ms) | Total: 0.9% (15.8ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `hexToRgb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts:27` | Self: 0.9% (15.5ms) | Total: 0.9% (15.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.9% (15.5ms) | Total: 0.9% (15.5ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.9% (15.5ms) | Total: 0.9% (15.5ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.8% (15.4ms) | Total: 0.8% (15.4ms) | Samples: 3

**Called by:**
- `map` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:70` | Self: 0.8% (15.3ms) | Total: 0.8% (15.3ms) | Samples: 1

**Called by:**
- `from` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:21` | Self: 0.8% (15.2ms) | Total: 0.8% (15.2ms) | Samples: 1

**Called by:**
- `update` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.8% (15.1ms) | Total: 1.6% (28.7ms) | Samples: 1

**Called by:**
- `update` (2)

**Calls:**
- `push` (1)

### `isFinite`
`[native code]` | Self: 0.8% (15.0ms) | Total: 0.8% (15.0ms) | Samples: 1

**Called by:**
- `every` (1)

### `performIteration`
`[native code]` | Self: 0.8% (15.0ms) | Total: 0.8% (15.0ms) | Samples: 1

**Called by:**
- `evaluateSceneInstances` (1)

### `multiplyMatrices`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.8% (15.0ms) | Total: 0.8% (15.0ms) | Samples: 1

**Called by:**
- `updateMatrixWorld` (1)

### `cacheSatisfy`
`[native code]` | Self: 0.8% (15.0ms) | Total: 0.8% (15.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `compose`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10839` | Self: 0.8% (15.0ms) | Total: 0.8% (15.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `min`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5360` | Self: 0.8% (14.9ms) | Total: 0.8% (14.9ms) | Samples: 1

**Called by:**
- `expandByPoint` (1)

### `copyDataProperties`
`[native code]` | Self: 0.8% (14.7ms) | Total: 0.8% (14.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `hypot`
`[native code]` | Self: 0.8% (14.6ms) | Total: 0.8% (14.6ms) | Samples: 1

**Called by:**
- `unit` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` | Self: 0.8% (14.6ms) | Total: 0.8% (14.6ms) | Samples: 2

**Called by:**
- `map` (2)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` | Self: 0.8% (14.5ms) | Total: 2.7% (47.3ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (6)

**Calls:**
- `stringify` (5)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.8% (14.5ms) | Total: 2.4% (42.2ms) | Samples: 1

**Called by:**
- `readKey` (4)

**Calls:**
- `from` (3)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.8% (14.4ms) | Total: 0.8% (14.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `fromArray`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11083` | Self: 0.8% (14.3ms) | Total: 0.8% (14.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:35` | Self: 0.8% (14.2ms) | Total: 0.8% (14.2ms) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `Set`
`[native code]` | Self: 0.8% (14.2ms) | Total: 0.8% (14.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.8% (14.2ms) | Total: 0.8% (14.2ms) | Samples: 1

**Called by:**
- `orientation` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` | Self: 0.7% (13.3ms) | Total: 0.7% (13.3ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:126` | Self: 0.7% (13.1ms) | Total: 0.7% (13.1ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:72` | Self: 0.7% (13.0ms) | Total: 0.7% (13.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:36` | Self: 0.7% (12.9ms) | Total: 0.7% (12.9ms) | Samples: 1

**Called by:**
- `sample` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.7% (12.7ms) | Total: 0.7% (12.7ms) | Samples: 2

**Called by:**
- `from` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.7% (12.4ms) | Total: 0.7% (12.4ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.7% (12.1ms) | Total: 0.7% (12.1ms) | Samples: 1

**Called by:**
- `some` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:134` | Self: 0.5% (9.2ms) | Total: 0.5% (9.2ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` | Self: 0.2% (4.8ms) | Total: 0.2% (4.8ms) | Samples: 5

**Called by:**
- `indexSceneDocument` (5)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` | Self: 0.1% (3.1ms) | Total: 0.1% (3.1ms) | Samples: 3

**Called by:**
- `update` (3)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.1% (2.9ms) | Total: 0.1% (2.9ms) | Samples: 3

**Called by:**
- `update` (3)

### `requestInstantiate`
`[native code]` | Self: 0.1% (2.3ms) | Total: 0.1% (2.3ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 2

**Called by:**
- `map` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 0.0% (1.6ms) | Total: 0.0% (1.6ms) | Samples: 2

**Called by:**
- `map` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `some` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.0% (1.1ms) | Total: 0.9% (16.8ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `map` (3)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `updateMatrixWorld`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12867` | Self: 0.0% (1.0ms) | Total: 0.9% (16.0ms) | Samples: 1

**Called by:**
- `updateMatrixWorld` (2)

**Calls:**
- `multiplyMatrices` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `update` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:55` | Self: 0.0% (980us) | Total: 0.0% (980us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` | Self: 0.0% (952us) | Total: 0.0% (952us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.0% (935us) | Total: 0.0% (935us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:116` | Self: 0.0% (927us) | Total: 0.0% (927us) | Samples: 1

**Called by:**
- `(module)` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:216` | Self: 0.0% (912us) | Total: 0.0% (912us) | Samples: 1

**Called by:**
- `(module)` (1)

### `Data3DTexture`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (911us) | Total: 0.0% (911us) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.0% (907us) | Total: 0.0% (907us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `abs`
`[native code]` | Self: 0.0% (893us) | Total: 0.0% (893us) | Samples: 1

**Called by:**
- `map` (1)

### `flatIntoArray`
`[native code]` | Self: 0.0% (890us) | Total: 0.0% (890us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `next`
`[native code]` | Self: 0.0% (889us) | Total: 0.0% (889us) | Samples: 1

**Called by:**
- `sample` (1)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:34` | Self: 0.0% (880us) | Total: 3.6% (62.9ms) | Samples: 1

**Called by:**
- `sample` (7)

**Calls:**
- `unit` (4)
- `unit` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` | Self: 0.0% (839us) | Total: 0.0% (839us) | Samples: 1

**Called by:**
- `map` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.3% (1.66s) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (225)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` | Self: 0.0% (0us) | Total: 0.8% (14.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.0% (0us) | Total: 0.8% (14.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `copyDataProperties` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 7.0% (121.2ms) | Samples: 0

**Called by:**
- `update` (18)

**Calls:**
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:27` | Self: 0.0% (0us) | Total: 0.9% (15.9ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `makeSceneGridGeometry` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `hexToRgb` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:66` | Self: 0.0% (0us) | Total: 0.8% (15.3ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `from` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.9% (16.2ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `map` (4)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:348` | Self: 0.0% (0us) | Total: 0.8% (14.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `Map` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:182` | Self: 0.0% (0us) | Total: 0.9% (16.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `updateMatrixWorld` (2)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:52` | Self: 0.0% (0us) | Total: 1.8% (31.0ms) | Samples: 0

**Called by:**
- `sample` (2)

**Calls:**
- `number` (2)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.0% (0us) | Total: 0.9% (16.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` | Self: 0.0% (0us) | Total: 0.8% (15.0ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `performIteration` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:104` | Self: 0.0% (0us) | Total: 34.6% (594.5ms) | Samples: 0

**Called by:**
- `evaluate` (96)

**Calls:**
- `update` (77)
- `update` (7)
- `update` (5)
- `update` (2)
- `update` (1)
- `cloneObject` (1)
- `update` (1)
- `update` (1)
- `update` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 2.0% (35.3ms) | Samples: 0

**Called by:**
- `readKey` (6)

**Calls:**
- `map` (6)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 5.5% (94.7ms) | Samples: 0

**Called by:**
- `readSceneDocument` (12)

**Calls:**
- `map` (12)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.8% (14.2ms) | Samples: 0

**Called by:**
- `setPose` (1)

**Calls:**
- `orientation` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 2.9% (50.3ms) | Samples: 0

**Called by:**
- `map` (7)

**Calls:**
- `map` (7)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `some` (1)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:30` | Self: 0.0% (0us) | Total: 0.2% (3.8ms) | Samples: 0

**Called by:**
- `rotation` (2)
- `rotation` (1)
- `rotation` (1)

**Calls:**
- `map` (4)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (0us) | Total: 4.5% (77.6ms) | Samples: 0

**Called by:**
- `map` (10)

**Calls:**
- `tuple` (6)
- `tuple` (4)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (13.6ms) | Samples: 0

**Called by:**
- `setPose` (1)
- `triangulateFace` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:106` | Self: 0.0% (0us) | Total: 0.9% (16.8ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `cloneObject` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:90` | Self: 0.0% (0us) | Total: 6.3% (108.9ms) | Samples: 0

**Called by:**
- `evaluate` (21)

**Calls:**
- `update` (21)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:101` | Self: 0.0% (0us) | Total: 3.3% (57.5ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `setPose` (2)
- `setPose` (2)
- `setPose` (1)

### `sampleSceneAnimationTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:71` | Self: 0.0% (0us) | Total: 6.7% (115.2ms) | Samples: 0

**Called by:**
- `sample` (12)

**Calls:**
- `map` (12)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:76` | Self: 0.0% (0us) | Total: 9.9% (170.3ms) | Samples: 0

**Called by:**
- `evaluate` (19)

**Calls:**
- `readSceneDocument` (12)
- `readSceneDocument` (6)
- `readSceneDocument` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:199` | Self: 0.0% (0us) | Total: 1.1% (19.1ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `every` (3)
- `from` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:106` | Self: 0.0% (0us) | Total: 0.9% (16.8ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `map` (2)

### `setFromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` | Self: 0.0% (0us) | Total: 0.8% (14.9ms) | Samples: 0

**Called by:**
- `computeBoundingBox` (1)

**Calls:**
- `expandByPoint` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.9% (16.8ms) | Samples: 0

**Called by:**
- `update` (4)

**Calls:**
- `triangleUnitNormal` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5083` | Self: 0.0% (0us) | Total: 0.0% (911us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Data3DTexture` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 4.5% (78.3ms) | Samples: 0

**Called by:**
- `update` (14)

**Calls:**
- `indexSceneAnimations` (6)
- `indexSceneAnimations` (5)
- `indexSceneAnimations` (3)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.0% (0us) | Total: 0.9% (16.2ms) | Samples: 0

**Called by:**
- `readKey` (1)

**Calls:**
- `includes` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:86` | Self: 0.0% (0us) | Total: 2.5% (44.3ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `map` (5)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 5.5% (94.7ms) | Samples: 0

**Called by:**
- `map` (12)

**Calls:**
- `map` (12)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:35` | Self: 0.0% (0us) | Total: 0.9% (16.0ms) | Samples: 0

**Called by:**
- `sample` (2)

**Calls:**
- `unit` (1)
- `unit` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:124` | Self: 0.0% (0us) | Total: 0.8% (15.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `compose` (1)

### `rotation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:44` | Self: 0.0% (0us) | Total: 0.8% (14.4ms) | Samples: 0

**Called by:**
- `sample` (3)

**Calls:**
- `unit` (1)
- `unit` (1)
- `map` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.9% (15.4ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `map` (3)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:174` | Self: 0.0% (0us) | Total: 0.7% (12.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `some` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:60` | Self: 0.0% (0us) | Total: 0.7% (13.6ms) | Samples: 0

**Called by:**
- `indexSceneNodes` (1)

**Calls:**
- `finiteTuple` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:188` | Self: 0.0% (0us) | Total: 27.6% (474.3ms) | Samples: 0

**Called by:**
- `(module)` (77)

**Calls:**
- `indexSceneDocument` (35)
- `indexSceneDocument` (14)
- `indexSceneDocument` (11)
- `indexSceneDocument` (6)
- `indexSceneDocument` (6)
- `indexSceneDocument` (4)
- `indexSceneDocument` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:219` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 3.5% (61.3ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:122` | Self: 0.0% (0us) | Total: 1.8% (32.3ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `composeTransform` (2)
- `composeTransform` (1)
- `composeTransform` (1)
- `fromArray` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:127` | Self: 0.0% (0us) | Total: 0.9% (16.2ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `Vector3` (2)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (4.7ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (0us) | Total: 0.8% (14.2ms) | Samples: 0

**Called by:**
- `evaluateSceneInstances` (1)

**Calls:**
- `affineDeterminant` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `setPose`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:164` | Self: 0.0% (0us) | Total: 1.7% (29.3ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:352` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `updateMatrixWorld`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12887` | Self: 0.0% (0us) | Total: 0.9% (16.0ms) | Samples: 0

**Called by:**
- `setPose` (2)

**Calls:**
- `updateMatrixWorld` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:89` | Self: 0.0% (0us) | Total: 8.2% (140.8ms) | Samples: 0

**Called by:**
- `evaluate` (18)

**Calls:**
- `update` (17)
- `update` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` | Self: 0.0% (0us) | Total: 1.8% (31.0ms) | Samples: 0

**Called by:**
- `update` (4)

**Calls:**
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `expandByPoint`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15905` | Self: 0.0% (0us) | Total: 0.8% (14.9ms) | Samples: 0

**Called by:**
- `setFromBufferAttribute` (1)

**Calls:**
- `min` (1)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:61` | Self: 0.0% (0us) | Total: 1.8% (31.0ms) | Samples: 0

**Called by:**
- `sampleSceneAnimationTrack` (2)

**Calls:**
- `requireScene` (2)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.7% (30.0ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `forEach` (1)
- `cacheSatisfy` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:5078` | Self: 0.0% (0us) | Total: 0.9% (15.8ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Texture` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.8% (32.0ms) | Samples: 0

**Calls:**
- `parseModule` (5)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (0us) | Total: 0.7% (13.6ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `composeTransform` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:117` | Self: 0.0% (0us) | Total: 19.1% (327.6ms) | Samples: 0

**Called by:**
- `(module)` (34)

**Calls:**
- `sampleSceneAnimationTrack` (12)
- `rotation` (7)
- `sampleSceneAnimationTrack` (6)
- `rotation` (3)
- `sampleSceneAnimationTrack` (2)
- `rotation` (2)
- `map` (1)
- `rotation` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:318` | Self: 0.0% (0us) | Total: 0.8% (14.9ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `geometryEntry` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.0% (0us) | Total: 1.4% (25.1ms) | Samples: 0

**Called by:**
- `update` (11)

**Calls:**
- `entries` (11)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts:98` | Self: 0.0% (0us) | Total: 24.7% (425.1ms) | Samples: 0

**Called by:**
- `evaluate` (46)

**Calls:**
- `sample` (34)
- `sample` (3)
- `sample` (3)
- `sample` (2)
- `sample` (2)
- `sample` (1)
- `sample` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` | Self: 0.0% (0us) | Total: 0.9% (15.7ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `get` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:101` | Self: 0.0% (0us) | Total: 0.9% (16.4ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `Map` (2)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 1.8% (31.5ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `every` (3)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` | Self: 0.0% (0us) | Total: 0.0% (977us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `set` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `triangulateFace` (2)

**Calls:**
- `(anonymous)` (1)
- `flatIntoArray` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 1.8% (32.3ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:189` | Self: 0.0% (0us) | Total: 2.1% (36.1ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `evaluateSceneInstances` (3)
- `evaluateSceneInstances` (2)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)

### `computeBoundingBox`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18766` | Self: 0.0% (0us) | Total: 0.8% (14.9ms) | Samples: 0

**Called by:**
- `geometryEntry` (1)

**Calls:**
- `setFromBufferAttribute` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:121` | Self: 0.0% (0us) | Total: 1.0% (17.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `composeTransform` (3)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` | Self: 0.0% (0us) | Total: 0.8% (14.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sceneBounds` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.34s) | Samples: 0

**Called by:**
- `moduleEvaluation` (227)
- `async loadAndEvaluateModule` (225)

**Calls:**
- `moduleEvaluation` (227)
- `evaluate` (225)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` | Self: 0.0% (0us) | Total: 0.8% (15.1ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `point` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` | Self: 0.0% (0us) | Total: 0.9% (16.2ms) | Samples: 0

**Called by:**
- `update` (2)

**Calls:**
- `evaluateSceneNodeFlags` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 3.5% (61.3ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `map` (6)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:104` | Self: 0.0% (0us) | Total: 0.0% (872us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `get` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.0% (0us) | Total: 0.9% (16.3ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `push` (3)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts:122` | Self: 0.0% (0us) | Total: 1.7% (30.8ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `affineMultiply` (2)

### `geometryEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:93` | Self: 0.0% (0us) | Total: 0.8% (14.9ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `computeBoundingBox` (1)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (15.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.1% (1.66s) | Samples: 0

**Called by:**
- `moduleEvaluation` (225)

**Calls:**
- `(module)` (96)
- `(module)` (46)
- `(module)` (21)
- `(module)` (19)
- `(module)` (18)
- `(module)` (5)
- `(module)` (5)
- `(module)` (3)
- `(module)` (2)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:71` | Self: 0.0% (0us) | Total: 0.8% (15.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `finiteTuple` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:214` | Self: 0.0% (0us) | Total: 13.6% (234.8ms) | Samples: 0

**Called by:**
- `(module)` (21)
- `(module)` (17)

**Calls:**
- `buildSceneGeometry` (18)
- `buildSceneGeometry` (4)
- `buildSceneGeometry` (3)
- `validateBuffers` (3)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 5.5% (94.7ms) | Samples: 0

**Called by:**
- `(module)` (12)

**Calls:**
- `readSceneAnimations` (12)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` | Self: 0.0% (0us) | Total: 0.8% (15.4ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `set` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` | Self: 0.0% (0us) | Total: 0.8% (14.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `Set` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 30.7% | 526.7ms | `[native code]` |
| 19.8% | 339.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 12.1% | 208.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\sampleAnimation.ts` |
| 6.0% | 104.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 5.5% | 95.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 5.5% | 94.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 5.4% | 93.3ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 3.1% | 54.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation.ts` |
| 2.6% | 45.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts` |
| 2.0% | 35.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 1.7% | 30.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts` |
| 1.1% | 20.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 1.0% | 17.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.9% | 15.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.9% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\color.ts` |
| 0.8% | 14.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 1.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 980us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts` |
