# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 6.71s | 956 | 1.0ms | 172 |

**Top 10:** `stringify` 9.3%, `indexSceneDocument` 5.8%, `every` 5.7%, `composeTransform` 5.0%, `evaluateSceneNodeFlags` 3.8%, `transformPoint` 3.6%, `indexSceneAnimations` 3.5%, `indexSceneNodes` 3.4%, `sceneBounds` 3.0%, `sceneBounds` 3.0%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 9.3% | 629.4ms | 9.3% | 629.4ms | `stringify` | `[native code]` |
| 5.8% | 393.9ms | 5.8% | 393.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 5.7% | 385.9ms | 5.7% | 385.9ms | `every` | `[native code]` |
| 5.0% | 336.8ms | 5.0% | 336.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 3.8% | 258.1ms | 3.8% | 258.1ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 3.6% | 243.2ms | 3.6% | 243.2ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 3.5% | 237.3ms | 3.5% | 237.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 3.4% | 229.8ms | 3.4% | 229.8ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` |
| 3.0% | 207.1ms | 3.0% | 207.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 3.0% | 206.6ms | 3.0% | 206.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` |
| 2.3% | 159.8ms | 2.3% | 159.8ms | `Map` | `[native code]` |
| 2.3% | 154.5ms | 2.7% | 185.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 2.2% | 149.5ms | 2.2% | 149.5ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` |
| 2.1% | 144.9ms | 2.1% | 144.9ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 2.0% | 136.1ms | 2.7% | 186.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` |
| 2.0% | 135.9ms | 14.4% | 973.0ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 2.0% | 135.6ms | 2.0% | 135.6ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 1.8% | 123.5ms | 2.4% | 165.1ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 1.7% | 120.4ms | 7.5% | 506.4ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:90` |
| 1.7% | 118.6ms | 8.3% | 558.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 1.7% | 117.5ms | 1.7% | 117.5ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` |
| 1.5% | 103.2ms | 1.7% | 118.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` |
| 1.4% | 98.5ms | 1.4% | 98.5ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 1.3% | 93.6ms | 4.6% | 309.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` |
| 1.1% | 79.1ms | 1.1% | 79.1ms | `min` | `[native code]` |
| 1.1% | 78.4ms | 1.1% | 78.4ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` |
| 1.1% | 77.5ms | 100.0% | 7.31s | `map` | `[native code]` |
| 0.9% | 66.5ms | 0.9% | 66.5ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` |
| 0.9% | 66.4ms | 0.9% | 66.4ms | `entries` | `[native code]` |
| 0.9% | 65.1ms | 0.9% | 65.1ms | `copyDataProperties` | `[native code]` |
| 0.9% | 64.7ms | 0.9% | 64.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:85` |
| 0.9% | 64.2ms | 0.9% | 64.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` |
| 0.8% | 58.9ms | 2.1% | 147.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` |
| 0.8% | 58.1ms | 0.8% | 58.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` |
| 0.8% | 54.7ms | 0.8% | 54.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 0.7% | 49.4ms | 0.7% | 49.4ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:80` |
| 0.7% | 48.3ms | 0.7% | 48.3ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.7% | 47.3ms | 0.7% | 47.3ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.6% | 44.5ms | 0.6% | 44.5ms | `performIteration` | `[native code]` |
| 0.6% | 42.5ms | 0.6% | 42.5ms | `hypot` | `[native code]` |
| 0.6% | 42.0ms | 0.6% | 42.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:165` |
| 0.5% | 35.7ms | 0.5% | 35.7ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.4% | 31.0ms | 0.4% | 31.0ms | `max` | `[native code]` |
| 0.4% | 30.2ms | 0.4% | 30.2ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:30` |
| 0.4% | 29.7ms | 0.4% | 29.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:90` |
| 0.4% | 29.6ms | 0.4% | 29.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:76` |
| 0.4% | 28.8ms | 0.6% | 44.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` |
| 0.4% | 28.7ms | 2.0% | 137.6ms | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:34` |
| 0.4% | 27.9ms | 0.4% | 27.9ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:48` |
| 0.4% | 27.0ms | 0.4% | 28.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:78` |
| 0.2% | 19.0ms | 0.2% | 19.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:164` |
| 0.2% | 18.9ms | 0.2% | 18.9ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.2% | 18.5ms | 0.2% | 18.5ms | `next` | `[native code]` |
| 0.2% | 18.1ms | 0.5% | 34.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.2% | 17.5ms | 0.2% | 17.5ms | `uniqueById` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:102` |
| 0.2% | 17.0ms | 0.2% | 17.0ms | `selectSceneSubtrees` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:94` |
| 0.2% | 16.5ms | 0.2% | 16.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:89` |
| 0.2% | 16.4ms | 0.2% | 16.4ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.2% | 16.4ms | 6.9% | 468.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` |
| 0.2% | 16.3ms | 0.2% | 16.3ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:71` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `keys` | `[native code]` |
| 0.2% | 15.9ms | 0.2% | 15.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:83` |
| 0.2% | 15.9ms | 0.2% | 15.9ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.2% | 15.5ms | 0.2% | 15.5ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.2% | 15.4ms | 0.2% | 15.4ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 15.3ms | 0.2% | 15.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:20` |
| 0.2% | 15.2ms | 0.2% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:50` |
| 0.2% | 15.0ms | 0.2% | 15.0ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:82` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` |
| 0.2% | 14.7ms | 0.2% | 14.7ms | `requestInstantiate` | `[native code]` |
| 0.2% | 14.6ms | 0.2% | 14.6ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` |
| 0.2% | 14.2ms | 0.6% | 43.9ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:59` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.2% | 13.5ms | 0.3% | 25.9ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.2% | 13.4ms | 5.2% | 355.1ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:102` |
| 0.1% | 13.3ms | 0.1% | 13.3ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:51` |
| 0.1% | 12.4ms | 0.1% | 12.4ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.1% | 12.2ms | 0.6% | 41.8ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:61` |
| 0.1% | 12.1ms | 0.1% | 12.1ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.1% | 9.6ms | 0.1% | 9.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 5.5ms | 0.5% | 34.1ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `parseModule` | `[native code]` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` |
| 0.0% | 2.0ms | 0.6% | 40.5ms | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `selectSceneSubtrees` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:97` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `values` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requireEditableScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts` |
| 0.0% | 1.0ms | 21.7% | 1.46s | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:31` |
| 0.0% | 1.0ms | 0.2% | 16.8ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:11` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:66` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:29` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `filter` | `[native code]` |
| 0.0% | 990us | 0.0% | 990us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.0% | 985us | 0.0% | 985us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 960us | 4.4% | 298.9ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 0.0% | 943us | 0.0% | 943us | `text` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 939us | 0.0% | 2.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:51` |
| 0.0% | 937us | 0.0% | 937us | `cloneObject` | `[native code]` |
| 0.0% | 927us | 0.0% | 927us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 917us | 0.0% | 917us | `get` | `[native code]` |
| 0.0% | 908us | 0.0% | 908us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.0% | 900us | 0.0% | 900us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` |
| 0.0% | 885us | 0.0% | 885us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:71` |
| 0.0% | 876us | 0.0% | 876us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.0% | 861us | 0.0% | 861us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` |
| 0.0% | 833us | 0.0% | 833us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:49` |
| 0.0% | 831us | 0.0% | 831us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 13.39s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 100.0% | 7.31s | 1.1% | 77.5ms | `map` | `[native code]` |
| 99.7% | 6.69s | 0.0% | 0us | `evaluate` | `[native code]` |
| 99.7% | 6.69s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.8% | 6.57s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:62` |
| 96.3% | 6.47s | 0.0% | 0us | `reduce` | `[native code]` |
| 96.3% | 6.47s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:66` |
| 61.6% | 4.14s | 0.0% | 0us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:68` |
| 24.0% | 1.61s | 0.0% | 0us | `sceneAnimationContext` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:8` |
| 24.0% | 1.61s | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:15` |
| 21.7% | 1.46s | 0.0% | 1.0ms | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:31` |
| 20.1% | 1.35s | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` |
| 14.4% | 973.0ms | 2.0% | 135.9ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 13.6% | 919.3ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 9.3% | 629.4ms | 9.3% | 629.4ms | `stringify` | `[native code]` |
| 8.3% | 558.6ms | 1.7% | 118.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` |
| 7.5% | 506.4ms | 1.7% | 120.4ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:90` |
| 6.9% | 468.2ms | 0.2% | 16.4ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` |
| 5.8% | 393.9ms | 5.8% | 393.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 5.7% | 385.9ms | 5.7% | 385.9ms | `every` | `[native code]` |
| 5.2% | 355.1ms | 0.2% | 13.4ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:102` |
| 5.0% | 336.8ms | 5.0% | 336.8ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` |
| 4.6% | 309.4ms | 1.3% | 93.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` |
| 4.4% | 298.9ms | 0.0% | 960us | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` |
| 3.8% | 258.1ms | 3.8% | 258.1ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` |
| 3.6% | 243.2ms | 3.6% | 243.2ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` |
| 3.5% | 237.3ms | 3.5% | 237.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` |
| 3.4% | 229.8ms | 3.4% | 229.8ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` |
| 3.0% | 207.1ms | 3.0% | 207.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` |
| 3.0% | 206.6ms | 3.0% | 206.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` |
| 2.7% | 186.7ms | 2.0% | 136.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` |
| 2.7% | 185.6ms | 2.3% | 154.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 2.4% | 165.1ms | 1.8% | 123.5ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` |
| 2.3% | 159.8ms | 2.3% | 159.8ms | `Map` | `[native code]` |
| 2.3% | 158.9ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:38` |
| 2.2% | 151.1ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` |
| 2.2% | 149.5ms | 2.2% | 149.5ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` |
| 2.2% | 148.9ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` |
| 2.1% | 147.0ms | 0.8% | 58.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` |
| 2.1% | 144.9ms | 2.1% | 144.9ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 2.0% | 137.6ms | 0.4% | 28.7ms | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:34` |
| 2.0% | 135.6ms | 2.0% | 135.6ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 1.7% | 118.6ms | 1.5% | 103.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` |
| 1.7% | 117.5ms | 1.7% | 117.5ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` |
| 1.5% | 101.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:65` |
| 1.4% | 98.5ms | 1.4% | 98.5ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 1.3% | 90.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:34` |
| 1.1% | 79.1ms | 1.1% | 79.1ms | `min` | `[native code]` |
| 1.1% | 78.4ms | 1.1% | 78.4ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` |
| 0.9% | 66.5ms | 0.9% | 66.5ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` |
| 0.9% | 66.4ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.9% | 66.4ms | 0.9% | 66.4ms | `entries` | `[native code]` |
| 0.9% | 65.1ms | 0.9% | 65.1ms | `copyDataProperties` | `[native code]` |
| 0.9% | 64.7ms | 0.9% | 64.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:85` |
| 0.9% | 64.2ms | 0.9% | 64.2ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` |
| 0.9% | 61.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 0.9% | 61.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 0.9% | 60.8ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` |
| 0.8% | 59.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.8% | 58.1ms | 0.8% | 58.1ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` |
| 0.8% | 54.7ms | 0.8% | 54.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 0.7% | 50.3ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:61` |
| 0.7% | 49.4ms | 0.7% | 49.4ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:80` |
| 0.7% | 48.3ms | 0.7% | 48.3ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.7% | 47.3ms | 0.7% | 47.3ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` |
| 0.6% | 44.5ms | 0.6% | 44.5ms | `performIteration` | `[native code]` |
| 0.6% | 44.4ms | 0.4% | 28.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` |
| 0.6% | 43.9ms | 0.2% | 14.2ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:59` |
| 0.6% | 42.5ms | 0.6% | 42.5ms | `hypot` | `[native code]` |
| 0.6% | 42.0ms | 0.6% | 42.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:165` |
| 0.6% | 41.8ms | 0.1% | 12.2ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:61` |
| 0.6% | 40.5ms | 0.0% | 2.0ms | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.6% | 40.5ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.5% | 35.7ms | 0.5% | 35.7ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.5% | 34.1ms | 0.2% | 18.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.5% | 34.1ms | 0.0% | 5.5ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.5% | 33.8ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:37` |
| 0.4% | 31.0ms | 0.4% | 31.0ms | `max` | `[native code]` |
| 0.4% | 30.2ms | 0.4% | 30.2ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:30` |
| 0.4% | 29.7ms | 0.4% | 29.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:90` |
| 0.4% | 29.6ms | 0.4% | 29.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:76` |
| 0.4% | 28.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:64` |
| 0.4% | 28.0ms | 0.4% | 27.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:78` |
| 0.4% | 27.9ms | 0.4% | 27.9ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:48` |
| 0.3% | 26.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.3% | 25.9ms | 0.2% | 13.5ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.2% | 19.8ms | 0.0% | 0us | `editable` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:15` |
| 0.2% | 19.0ms | 0.2% | 19.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:164` |
| 0.2% | 18.9ms | 0.2% | 18.9ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` |
| 0.2% | 18.5ms | 0.2% | 18.5ms | `next` | `[native code]` |
| 0.2% | 17.5ms | 0.2% | 17.5ms | `uniqueById` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:102` |
| 0.2% | 17.0ms | 0.2% | 17.0ms | `selectSceneSubtrees` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:94` |
| 0.2% | 17.0ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 0.2% | 16.8ms | 0.0% | 1.0ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:11` |
| 0.2% | 16.5ms | 0.2% | 16.5ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:89` |
| 0.2% | 16.4ms | 0.2% | 16.4ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.2% | 16.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` |
| 0.2% | 16.3ms | 0.2% | 16.3ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` |
| 0.2% | 16.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` |
| 0.2% | 16.0ms | 0.0% | 0us | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:71` |
| 0.2% | 16.0ms | 0.2% | 16.0ms | `keys` | `[native code]` |
| 0.2% | 15.9ms | 0.2% | 15.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:83` |
| 0.2% | 15.9ms | 0.2% | 15.9ms | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.2% | 15.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:21` |
| 0.2% | 15.5ms | 0.2% | 15.5ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.2% | 15.4ms | 0.2% | 15.4ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 15.3ms | 0.2% | 15.3ms | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:20` |
| 0.2% | 15.2ms | 0.2% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:50` |
| 0.2% | 15.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:77` |
| 0.2% | 15.0ms | 0.2% | 15.0ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:82` |
| 0.2% | 14.9ms | 0.2% | 14.9ms | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` |
| 0.2% | 14.7ms | 0.2% | 14.7ms | `requestInstantiate` | `[native code]` |
| 0.2% | 14.7ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.2% | 14.7ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.2% | 14.6ms | 0.2% | 14.6ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.2% | 13.7ms | 0.0% | 0us | `from` | `[native code]` |
| 0.1% | 13.3ms | 0.1% | 13.3ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:51` |
| 0.1% | 12.8ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:325` |
| 0.1% | 12.8ms | 0.0% | 0us | `node` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:74` |
| 0.1% | 12.8ms | 0.0% | 0us | `transform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:50` |
| 0.1% | 12.8ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.1% | 12.6ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:14` |
| 0.1% | 12.4ms | 0.1% | 12.4ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.1% | 12.1ms | 0.1% | 12.1ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.1% | 11.5ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:70` |
| 0.1% | 9.6ms | 0.1% | 9.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `parseModule` | `[native code]` |
| 0.0% | 4.7ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` |
| 0.0% | 2.8ms | 0.0% | 939us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:51` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `selectSceneSubtrees` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:97` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `values` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:21` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.7ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:15` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requireEditableScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:66` |
| 0.0% | 1.0ms | 0.0% | 0us | `requireEditableScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:39` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `evaluateSceneNodeFlags` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:29` |
| 0.0% | 1.0ms | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `filter` | `[native code]` |
| 0.0% | 995us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:43` |
| 0.0% | 990us | 0.0% | 990us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.0% | 985us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 985us | 0.0% | 985us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 943us | 0.0% | 943us | `text` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 943us | 0.0% | 0us | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:49` |
| 0.0% | 937us | 0.0% | 937us | `cloneObject` | `[native code]` |
| 0.0% | 937us | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:111` |
| 0.0% | 927us | 0.0% | 927us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.0% | 922us | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` |
| 0.0% | 917us | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:94` |
| 0.0% | 917us | 0.0% | 917us | `get` | `[native code]` |
| 0.0% | 913us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:20` |
| 0.0% | 908us | 0.0% | 908us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.0% | 907us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` |
| 0.0% | 900us | 0.0% | 900us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` |
| 0.0% | 885us | 0.0% | 885us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:71` |
| 0.0% | 876us | 0.0% | 876us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.0% | 876us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:24` |
| 0.0% | 863us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:43` |
| 0.0% | 861us | 0.0% | 861us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` |
| 0.0% | 857us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:22` |
| 0.0% | 853us | 0.0% | 0us | `setSceneAnimationKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:16` |
| 0.0% | 833us | 0.0% | 833us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:49` |
| 0.0% | 831us | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 831us | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.0% | 831us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 0.0% | 831us | 0.0% | 831us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |

## Function Details

### `stringify`
`[native code]` | Self: 9.3% (629.4ms) | Total: 9.3% (629.4ms) | Samples: 94

**Called by:**
- `indexSceneAnimations` (51)
- `(anonymous)` (25)
- `(anonymous)` (14)
- `(module)` (2)
- `setSceneAnimationKeys` (1)
- `(anonymous)` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 5.8% (393.9ms) | Total: 5.8% (393.9ms) | Samples: 53

**Called by:**
- `sceneCommandSelection` (32)
- `finishSceneCommand` (21)

### `every`
`[native code]` | Self: 5.7% (385.9ms) | Total: 5.7% (385.9ms) | Samples: 55

**Called by:**
- `sceneBounds` (55)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:100` | Self: 5.0% (336.8ms) | Total: 5.0% (336.8ms) | Samples: 50

**Called by:**
- `indexSceneNodes` (50)

### `evaluateSceneNodeFlags`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:32` | Self: 3.8% (258.1ms) | Total: 3.8% (258.1ms) | Samples: 30

**Called by:**
- `evaluateSceneInstances` (17)
- `sceneCommandSelection` (13)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:166` | Self: 3.6% (243.2ms) | Total: 3.6% (243.2ms) | Samples: 29

**Called by:**
- `sceneBounds` (29)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:40` | Self: 3.5% (237.3ms) | Total: 3.5% (237.3ms) | Samples: 37

**Called by:**
- `indexSceneDocument` (37)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` | Self: 3.4% (229.8ms) | Total: 3.4% (229.8ms) | Samples: 26

**Called by:**
- `indexSceneDocument` (26)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:87` | Self: 3.0% (207.1ms) | Total: 3.0% (207.1ms) | Samples: 32

**Called by:**
- `finishSceneCommand` (32)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:91` | Self: 3.0% (206.6ms) | Total: 3.0% (206.6ms) | Samples: 31

**Called by:**
- `finishSceneCommand` (31)

### `Map`
`[native code]` | Self: 2.3% (159.8ms) | Total: 2.3% (159.8ms) | Samples: 21

**Called by:**
- `setSceneAnimationKeys` (20)
- `setSceneAnimationKeys` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` | Self: 2.3% (154.5ms) | Total: 2.7% (185.6ms) | Samples: 18

**Called by:**
- `finishSceneCommand` (22)

**Calls:**
- `max` (4)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:54` | Self: 2.2% (149.5ms) | Total: 2.2% (149.5ms) | Samples: 17

**Called by:**
- `sceneBounds` (17)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` | Self: 2.1% (144.9ms) | Total: 2.1% (144.9ms) | Samples: 20

**Called by:**
- `indexSceneDocument` (20)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:96` | Self: 2.0% (136.1ms) | Total: 2.7% (186.7ms) | Samples: 18

**Called by:**
- `finishSceneCommand` (26)

**Calls:**
- `min` (8)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 2.0% (135.9ms) | Total: 14.4% (973.0ms) | Samples: 22

**Called by:**
- `indexSceneDocument` (138)

**Calls:**
- `composeTransform` (50)
- `composeTransform` (20)
- `composeTransform` (13)
- `composeTransform` (8)
- `composeTransform` (7)
- `composeTransform` (7)
- `composeTransform` (7)
- `composeTransform` (3)
- `composeTransform` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 2.0% (135.6ms) | Total: 2.0% (135.6ms) | Samples: 16

**Called by:**
- `sceneBounds` (16)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:74` | Self: 1.8% (123.5ms) | Total: 2.4% (165.1ms) | Samples: 13

**Called by:**
- `indexSceneNodes` (20)

**Calls:**
- `hypot` (7)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:90` | Self: 1.7% (120.4ms) | Total: 7.5% (506.4ms) | Samples: 14

**Called by:**
- `finishSceneCommand` (69)

**Calls:**
- `every` (55)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:88` | Self: 1.7% (118.6ms) | Total: 8.3% (558.6ms) | Samples: 24

**Called by:**
- `finishSceneCommand` (77)

**Calls:**
- `transformPoint` (29)
- `transformPoint` (16)
- `transformPoint` (4)
- `transformPoint` (4)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:39` | Self: 1.7% (117.5ms) | Total: 1.7% (117.5ms) | Samples: 28

**Called by:**
- `indexSceneDocument` (28)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:89` | Self: 1.5% (103.2ms) | Total: 1.7% (118.6ms) | Samples: 8

**Called by:**
- `finishSceneCommand` (9)

**Calls:**
- `requireScene` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` | Self: 1.4% (98.5ms) | Total: 1.4% (98.5ms) | Samples: 20

**Called by:**
- `indexSceneDocument` (20)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:103` | Self: 1.3% (93.6ms) | Total: 4.6% (309.4ms) | Samples: 13

**Called by:**
- `map` (38)

**Calls:**
- `stringify` (25)

### `min`
`[native code]` | Self: 1.1% (79.1ms) | Total: 1.1% (79.1ms) | Samples: 11

**Called by:**
- `sceneBounds` (8)
- `prepareSceneBounds` (3)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:83` | Self: 1.1% (78.4ms) | Total: 1.1% (78.4ms) | Samples: 13

**Called by:**
- `indexSceneNodes` (13)

### `map`
`[native code]` | Self: 1.1% (77.5ms) | Total: 100.0% (7.31s) | Samples: 9

**Called by:**
- `(module)` (937)
- `setSceneAnimationKeys` (41)
- `setSceneAnimationKeys` (24)
- `readSceneGeometry` (10)
- `readSceneDocument` (10)
- `(anonymous)` (8)
- `readSceneAnimationClip` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `setSceneAnimationKeys` (1)
- `(anonymous)` (1)
- `readSceneDocument` (1)
- `tuple` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (919)
- `(anonymous)` (38)
- `(anonymous)` (22)
- `(anonymous)` (18)
- `readSceneGeometry` (10)
- `(anonymous)` (8)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node` (1)
- `readKey` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:79` | Self: 0.9% (66.5ms) | Total: 0.9% (66.5ms) | Samples: 7

**Called by:**
- `indexSceneNodes` (7)

### `entries`
`[native code]` | Self: 0.9% (66.4ms) | Total: 0.9% (66.4ms) | Samples: 9

**Called by:**
- `indexSceneDocument` (9)

### `copyDataProperties`
`[native code]` | Self: 0.9% (65.1ms) | Total: 0.9% (65.1ms) | Samples: 9

**Called by:**
- `evaluateSceneInstances` (7)
- `editable` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:85` | Self: 0.9% (64.7ms) | Total: 0.9% (64.7ms) | Samples: 11

**Called by:**
- `finishSceneCommand` (11)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:81` | Self: 0.9% (64.2ms) | Total: 0.9% (64.2ms) | Samples: 7

**Called by:**
- `indexSceneNodes` (7)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` | Self: 0.8% (58.9ms) | Total: 2.1% (147.0ms) | Samples: 8

**Called by:**
- `map` (22)

**Calls:**
- `stringify` (14)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:29` | Self: 0.8% (58.1ms) | Total: 0.8% (58.1ms) | Samples: 6

**Called by:**
- `indexSceneDocument` (6)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` | Self: 0.8% (54.7ms) | Total: 0.8% (54.7ms) | Samples: 12

**Called by:**
- `finishSceneCommand` (12)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:80` | Self: 0.7% (49.4ms) | Total: 0.7% (49.4ms) | Samples: 8

**Called by:**
- `indexSceneNodes` (8)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 0.7% (48.3ms) | Total: 0.7% (48.3ms) | Samples: 8

**Called by:**
- `finishSceneCommand` (7)
- `sceneCommandSelection` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:82` | Self: 0.7% (47.3ms) | Total: 0.7% (47.3ms) | Samples: 7

**Called by:**
- `indexSceneNodes` (7)

### `performIteration`
`[native code]` | Self: 0.6% (44.5ms) | Total: 0.6% (44.5ms) | Samples: 4

**Called by:**
- `setSceneAnimationKeys` (1)
- `evaluateSceneInstances` (1)
- `(anonymous)` (1)
- `setSceneAnimationKeys` (1)

### `hypot`
`[native code]` | Self: 0.6% (42.5ms) | Total: 0.6% (42.5ms) | Samples: 8

**Called by:**
- `composeTransform` (7)
- `composeTransform` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:165` | Self: 0.6% (42.0ms) | Total: 0.6% (42.0ms) | Samples: 4

**Called by:**
- `sceneBounds` (4)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.5% (35.7ms) | Total: 0.5% (35.7ms) | Samples: 6

**Called by:**
- `orientation` (6)

### `max`
`[native code]` | Self: 0.4% (31.0ms) | Total: 0.4% (31.0ms) | Samples: 4

**Called by:**
- `sceneBounds` (4)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:30` | Self: 0.4% (30.2ms) | Total: 0.4% (30.2ms) | Samples: 3

**Called by:**
- `indexSceneDocument` (3)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:90` | Self: 0.4% (29.7ms) | Total: 0.4% (29.7ms) | Samples: 2

**Called by:**
- `finishSceneCommand` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:76` | Self: 0.4% (29.6ms) | Total: 0.4% (29.6ms) | Samples: 3

**Called by:**
- `finishSceneCommand` (3)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:86` | Self: 0.4% (28.8ms) | Total: 0.6% (44.4ms) | Samples: 3

**Called by:**
- `sceneCommandSelection` (3)
- `finishSceneCommand` (1)

**Calls:**
- `next` (1)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:34` | Self: 0.4% (28.7ms) | Total: 2.0% (137.6ms) | Samples: 2

**Called by:**
- `sceneAnimationContext` (16)

**Calls:**
- `evaluateSceneNodeFlags` (13)
- `next` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:48` | Self: 0.4% (27.9ms) | Total: 0.4% (27.9ms) | Samples: 2

**Called by:**
- `sceneBounds` (2)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:78` | Self: 0.4% (27.0ms) | Total: 0.4% (28.0ms) | Samples: 2

**Called by:**
- `indexSceneNodes` (3)

**Calls:**
- `hypot` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:164` | Self: 0.2% (19.0ms) | Total: 0.2% (19.0ms) | Samples: 4

**Called by:**
- `sceneBounds` (4)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:74` | Self: 0.2% (18.9ms) | Total: 0.2% (18.9ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (4)

### `next`
`[native code]` | Self: 0.2% (18.5ms) | Total: 0.2% (18.5ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (1)
- `setSceneAnimationKeys` (1)
- `requireEditableScene` (1)
- `sceneCommandSelection` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.2% (18.1ms) | Total: 0.5% (34.1ms) | Samples: 4

**Called by:**
- `sceneCommandSelection` (4)
- `finishSceneCommand` (1)
- `readSceneDocument` (1)

**Calls:**
- `keys` (2)

### `uniqueById`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:102` | Self: 0.2% (17.5ms) | Total: 0.2% (17.5ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (2)
- `indexSceneAnimations` (2)

### `selectSceneSubtrees`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:94` | Self: 0.2% (17.0ms) | Total: 0.2% (17.0ms) | Samples: 3

**Called by:**
- `sceneCommandSelection` (2)
- `editable` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:89` | Self: 0.2% (16.5ms) | Total: 0.2% (16.5ms) | Samples: 3

**Called by:**
- `finishSceneCommand` (2)
- `sceneCommandSelection` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.2% (16.4ms) | Total: 0.2% (16.4ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:79` | Self: 0.2% (16.4ms) | Total: 6.9% (468.2ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (60)

**Calls:**
- `evaluateSceneInstances` (18)
- `evaluateSceneInstances` (17)
- `evaluateSceneInstances` (11)
- `evaluateSceneInstances` (7)
- `evaluateSceneInstances` (2)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)
- `evaluateSceneInstances` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:70` | Self: 0.2% (16.3ms) | Total: 0.2% (16.3ms) | Samples: 3

**Called by:**
- `indexSceneDocument` (3)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:71` | Self: 0.2% (16.0ms) | Total: 0.2% (16.0ms) | Samples: 1

**Called by:**
- `reduce` (1)

### `keys`
`[native code]` | Self: 0.2% (16.0ms) | Total: 0.2% (16.0ms) | Samples: 2

**Called by:**
- `indexSceneDocument` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:83` | Self: 0.2% (15.9ms) | Total: 0.2% (15.9ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` | Self: 0.2% (15.9ms) | Total: 0.2% (15.9ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` | Self: 0.2% (15.5ms) | Total: 0.2% (15.5ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `requireScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.2% (15.4ms) | Total: 0.2% (15.4ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:20` | Self: 0.2% (15.3ms) | Total: 0.2% (15.3ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:50` | Self: 0.2% (15.2ms) | Total: 0.2% (15.2ms) | Samples: 1

**Called by:**
- `sceneCommandSelection` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:82` | Self: 0.2% (15.0ms) | Total: 0.2% (15.0ms) | Samples: 1

**Called by:**
- `finishSceneCommand` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:49` | Self: 0.2% (14.9ms) | Total: 0.2% (14.9ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `requestInstantiate`
`[native code]` | Self: 0.2% (14.7ms) | Total: 0.2% (14.7ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:27` | Self: 0.2% (14.6ms) | Total: 0.2% (14.6ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:59` | Self: 0.2% (14.2ms) | Total: 0.6% (43.9ms) | Samples: 1

**Called by:**
- `reduce` (5)
- `(anonymous)` (1)

**Calls:**
- `readSceneAnimationClip` (4)
- `readSceneAnimationClip` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.2% (13.7ms) | Total: 0.2% (13.7ms) | Samples: 2

**Called by:**
- `from` (2)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.2% (13.5ms) | Total: 0.3% (25.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)
- `setSceneAnimationKeys` (1)

**Calls:**
- `/^[A-Za-z0-9_:-]+$/` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:102` | Self: 0.2% (13.4ms) | Total: 5.2% (355.1ms) | Samples: 1

**Called by:**
- `reduce` (42)

**Calls:**
- `map` (41)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:51` | Self: 0.1% (13.3ms) | Total: 0.1% (13.3ms) | Samples: 2

**Called by:**
- `indexSceneDocument` (2)

### `/^[A-Za-z0-9_:-]+$/`
`[native code]` | Self: 0.1% (12.4ms) | Total: 0.1% (12.4ms) | Samples: 1

**Called by:**
- `id` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:61` | Self: 0.1% (12.2ms) | Total: 0.6% (41.8ms) | Samples: 1

**Called by:**
- `reduce` (3)

**Calls:**
- `performIteration` (1)
- `map` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` | Self: 0.1% (12.1ms) | Total: 0.1% (12.1ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 0.1% (9.6ms) | Total: 0.1% (9.6ms) | Samples: 1

**Called by:**
- `sceneCommandSelection` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` | Self: 0.0% (5.5ms) | Total: 0.5% (34.1ms) | Samples: 5

**Called by:**
- `sceneBounds` (8)

**Calls:**
- `min` (3)

### `parseModule`
`[native code]` | Self: 0.0% (4.7ms) | Total: 0.0% (4.7ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:56` | Self: 0.0% (4.0ms) | Total: 0.0% (4.0ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (4)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:158` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 3

**Called by:**
- `orientation` (3)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (2.0ms) | Total: 0.6% (40.5ms) | Samples: 2

**Called by:**
- `evaluateSceneInstances` (11)

**Calls:**
- `affineDeterminant` (6)
- `affineDeterminant` (3)

### `selectSceneSubtrees`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:97` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `editable` (2)

### `values`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `setSceneAnimationKeys` (2)

### `requireEditableScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `editable` (1)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:31` | Self: 0.0% (1.0ms) | Total: 21.7% (1.46s) | Samples: 1

**Called by:**
- `sceneAnimationContext` (229)

**Calls:**
- `indexSceneDocument` (97)
- `indexSceneDocument` (77)
- `indexSceneDocument` (32)
- `indexSceneDocument` (5)
- `indexSceneDocument` (4)
- `indexSceneDocument` (3)
- `indexSceneDocument` (2)
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:11` | Self: 0.0% (1.0ms) | Total: 0.2% (16.8ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (3)

**Calls:**
- `uniqueById` (2)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:66` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `indexSceneNodes` (1)

### `evaluateSceneNodeFlags`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:29` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `evaluateSceneInstances` (1)

### `filter`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `setSceneAnimationKeys` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` | Self: 0.0% (990us) | Total: 0.0% (990us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (985us) | Total: 0.0% (985us) | Samples: 1

**Called by:**
- `map` (1)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:37` | Self: 0.0% (960us) | Total: 4.4% (298.9ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (52)

**Calls:**
- `stringify` (51)

### `text`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (943us) | Total: 0.0% (943us) | Samples: 1

**Called by:**
- `id` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:51` | Self: 0.0% (939us) | Total: 0.0% (2.8ms) | Samples: 1

**Called by:**
- `sceneCommandSelection` (2)

**Calls:**
- `values` (1)

### `cloneObject`
`[native code]` | Self: 0.0% (937us) | Total: 0.0% (937us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.0% (927us) | Total: 0.0% (927us) | Samples: 1

**Called by:**
- `map` (1)

### `get`
`[native code]` | Self: 0.0% (917us) | Total: 0.0% (917us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.0% (908us) | Total: 0.0% (908us) | Samples: 1

**Called by:**
- `map` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:66` | Self: 0.0% (900us) | Total: 0.0% (900us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:71` | Self: 0.0% (885us) | Total: 0.0% (885us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` | Self: 0.0% (876us) | Total: 0.0% (876us) | Samples: 1

**Called by:**
- `setSceneAnimationKeys` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:51` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `finishSceneCommand`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:49` | Self: 0.0% (833us) | Total: 0.0% (833us) | Samples: 1

**Called by:**
- `reduce` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (831us) | Total: 0.0% (831us) | Samples: 1

**Called by:**
- `map` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:43` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `next` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (13.39s) | Samples: 0

**Called by:**
- `moduleEvaluation` (953)
- `async loadAndEvaluateModule` (953)

**Calls:**
- `evaluate` (953)
- `moduleEvaluation` (953)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:77` | Self: 0.0% (0us) | Total: 0.2% (15.0ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `stringify` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 13.6% (919.3ms) | Samples: 0

**Called by:**
- `sceneCommandSelection` (77)
- `finishSceneCommand` (73)

**Calls:**
- `indexSceneAnimations` (52)
- `indexSceneAnimations` (37)
- `indexSceneAnimations` (28)
- `indexSceneAnimations` (20)
- `indexSceneAnimations` (6)
- `indexSceneAnimations` (3)
- `indexSceneAnimations` (3)
- `indexSceneAnimations` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.0% (985us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:15` | Self: 0.0% (0us) | Total: 24.0% (1.61s) | Samples: 0

**Called by:**
- `reduce` (236)
- `(anonymous)` (11)

**Calls:**
- `sceneAnimationContext` (247)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:22` | Self: 0.0% (0us) | Total: 0.0% (857us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `id` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Calls:**
- `parseModule` (2)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 0.2% (17.0ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (4)

**Calls:**
- `map` (4)

### `finishSceneCommand`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:68` | Self: 0.0% (0us) | Total: 61.6% (4.14s) | Samples: 0

**Called by:**
- `reduce` (572)
- `(anonymous)` (4)

**Calls:**
- `indexSceneDocument` (101)
- `sceneBounds` (77)
- `indexSceneDocument` (73)
- `sceneBounds` (69)
- `sceneBounds` (60)
- `sceneBounds` (32)
- `sceneBounds` (31)
- `sceneBounds` (26)
- `sceneBounds` (22)
- `indexSceneDocument` (21)
- `sceneBounds` (12)
- `sceneBounds` (11)
- `sceneBounds` (10)
- `sceneBounds` (9)
- `indexSceneDocument` (7)
- `indexSceneDocument` (4)
- `indexSceneDocument` (3)
- `indexSceneDocument` (2)
- `indexSceneDocument` (2)
- `sceneBounds` (1)
- `indexSceneDocument` (1)
- `sceneBounds` (1)
- `indexSceneDocument` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (14.7ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:46` | Self: 0.0% (0us) | Total: 0.9% (60.8ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (10)

**Calls:**
- `prepareSceneBounds` (8)
- `prepareSceneBounds` (1)
- `prepareSceneBounds` (1)

### `transform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:50` | Self: 0.0% (0us) | Total: 0.1% (12.8ms) | Samples: 0

**Called by:**
- `node` (1)

**Calls:**
- `tuple` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (0us) | Total: 0.1% (12.8ms) | Samples: 0

**Called by:**
- `transform` (1)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.3% (26.0ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `id` (2)
- `id` (1)

### `reduce`
`[native code]` | Self: 0.0% (0us) | Total: 96.3% (6.47s) | Samples: 0

**Called by:**
- `(anonymous)` (919)

**Calls:**
- `finishSceneCommand` (572)
- `setSceneAnimationKeys` (236)
- `setSceneAnimationKeys` (42)
- `setSceneAnimationKeys` (24)
- `setSceneAnimationKeys` (20)
- `setSceneAnimationKeys` (8)
- `setSceneAnimationKeys` (5)
- `setSceneAnimationKeys` (3)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `finishSceneCommand` (1)
- `setSceneAnimationKeys` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 0.9% (61.7ms) | Samples: 0

**Called by:**
- `map` (10)

**Calls:**
- `map` (10)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:105` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `filter` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:37` | Self: 0.0% (0us) | Total: 0.5% (33.8ms) | Samples: 0

**Called by:**
- `reduce` (8)

**Calls:**
- `editable` (7)
- `performIteration` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:16` | Self: 0.0% (0us) | Total: 0.0% (853us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `Map` (1)

### `node`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:74` | Self: 0.0% (0us) | Total: 0.1% (12.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `transform` (1)

### `editable`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:15` | Self: 0.0% (0us) | Total: 0.2% (19.8ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (7)

**Calls:**
- `selectSceneSubtrees` (2)
- `copyDataProperties` (2)
- `requireEditableScene` (1)
- `selectSceneSubtrees` (1)
- `requireEditableScene` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (14.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` | Self: 0.0% (0us) | Total: 20.1% (1.35s) | Samples: 0

**Called by:**
- `finishSceneCommand` (101)
- `sceneCommandSelection` (97)
- `readSceneDocument` (1)

**Calls:**
- `indexSceneNodes` (138)
- `indexSceneNodes` (26)
- `indexSceneNodes` (20)
- `indexSceneNodes` (4)
- `indexSceneNodes` (4)
- `indexSceneNodes` (3)
- `indexSceneNodes` (2)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:21` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `reduce` (1)

**Calls:**
- `record` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:325` | Self: 0.0% (0us) | Total: 0.1% (12.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `sceneAnimationContext`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationCommandContext.ts:8` | Self: 0.0% (0us) | Total: 24.0% (1.61s) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (247)

**Calls:**
- `sceneCommandSelection` (229)
- `sceneCommandSelection` (16)
- `sceneCommandSelection` (2)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:38` | Self: 0.0% (0us) | Total: 2.3% (158.9ms) | Samples: 0

**Called by:**
- `reduce` (20)

**Calls:**
- `Map` (20)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:39` | Self: 0.0% (0us) | Total: 2.2% (148.9ms) | Samples: 0

**Called by:**
- `reduce` (24)

**Calls:**
- `map` (24)

### `requireEditableScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:39` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `editable` (1)

**Calls:**
- `next` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:43` | Self: 0.0% (0us) | Total: 0.0% (863us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `stringify` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:66` | Self: 0.0% (0us) | Total: 96.3% (6.47s) | Samples: 0

**Called by:**
- `map` (919)

**Calls:**
- `reduce` (919)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.0% (0us) | Total: 0.9% (66.4ms) | Samples: 0

**Called by:**
- `sceneCommandSelection` (5)
- `finishSceneCommand` (4)

**Calls:**
- `entries` (9)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:34` | Self: 0.0% (0us) | Total: 1.3% (90.7ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `readSceneDocument` (10)
- `readSceneDocument` (2)
- `readSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` | Self: 0.0% (0us) | Total: 0.2% (16.4ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `record` (2)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:20` | Self: 0.0% (0us) | Total: 0.0% (913us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `from` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:111` | Self: 0.0% (0us) | Total: 0.0% (937us) | Samples: 0

**Called by:**
- `sceneCommandSelection` (1)

**Calls:**
- `cloneObject` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.8% (59.9ms) | Samples: 0

**Called by:**
- `map` (8)

**Calls:**
- `map` (8)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (6.69s) | Samples: 0

**Calls:**
- `moduleEvaluation` (953)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:61` | Self: 0.0% (0us) | Total: 0.7% (50.3ms) | Samples: 0

**Called by:**
- `sceneBounds` (7)

**Calls:**
- `copyDataProperties` (7)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:81` | Self: 0.0% (0us) | Total: 0.0% (922us) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `performIteration` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` | Self: 0.0% (0us) | Total: 0.2% (16.1ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `readKey` (1)

**Calls:**
- `map` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:94` | Self: 0.0% (0us) | Total: 0.0% (917us) | Samples: 0

**Called by:**
- `sceneCommandSelection` (1)

**Calls:**
- `get` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:65` | Self: 0.0% (0us) | Total: 1.5% (101.4ms) | Samples: 0

**Called by:**
- `map` (18)

**Calls:**
- `setSceneAnimationKeys` (11)
- `finishSceneCommand` (4)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)
- `setSceneAnimationKeys` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.6% (40.5ms) | Samples: 0

**Called by:**
- `sceneBounds` (11)

**Calls:**
- `orientation` (11)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:24` | Self: 0.0% (0us) | Total: 0.0% (876us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `record` (1)

### `setSceneAnimationKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:70` | Self: 0.0% (0us) | Total: 0.1% (11.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `stringify` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 0.9% (61.7ms) | Samples: 0

**Called by:**
- `(module)` (10)

**Calls:**
- `map` (10)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` | Self: 0.0% (0us) | Total: 0.2% (16.0ms) | Samples: 0

**Called by:**
- `sceneAnimationContext` (2)

**Calls:**
- `selectSceneSubtrees` (2)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (13.7ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (1)
- `tuple` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (2)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `tuple` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:62` | Self: 0.0% (0us) | Total: 97.8% (6.57s) | Samples: 0

**Called by:**
- `evaluate` (937)

**Calls:**
- `map` (937)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:45` | Self: 0.0% (0us) | Total: 2.2% (151.1ms) | Samples: 0

**Called by:**
- `sceneBounds` (18)

**Calls:**
- `evaluateSceneNodeFlags` (17)
- `evaluateSceneNodeFlags` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (6.69s) | Samples: 0

**Called by:**
- `moduleEvaluation` (953)

**Calls:**
- `(module)` (937)
- `(module)` (13)
- `(module)` (2)
- `(module)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-animation-pose.ts:21` | Self: 0.0% (0us) | Total: 0.2% (15.9ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `makeSceneGridGeometry` (1)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:49` | Self: 0.0% (0us) | Total: 0.0% (943us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `text` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:15` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `sceneCommandSelection` (2)

**Calls:**
- `uniqueById` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts:64` | Self: 0.0% (0us) | Total: 0.4% (28.0ms) | Samples: 0

**Called by:**
- `readSceneAnimationClip` (1)
- `map` (1)

**Calls:**
- `performIteration` (1)
- `map` (1)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:14` | Self: 0.0% (0us) | Total: 0.1% (12.6ms) | Samples: 0

**Called by:**
- `setSceneAnimationKeys` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` | Self: 0.0% (0us) | Total: 0.0% (907us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 24.8% | 1.66s | `[native code]` |
| 18.9% | 1.27s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 18.5% | 1.24s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 9.0% | 605.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts` |
| 8.7% | 591.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 8.0% | 538.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts` |
| 6.9% | 470.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 3.1% | 208.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationKeyBatch.ts` |
| 1.0% | 68.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.4% | 31.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts` |
| 0.2% | 15.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 990us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
