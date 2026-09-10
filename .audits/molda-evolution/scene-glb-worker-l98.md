# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 26.35s | 672 | 1.0ms | 152 |

**Top 10:** `postMessage` 55.5%, `deepEquals` 23.0%, `Worker` 6.1%, `bind` 1.7%, `readSceneGlbReply` 1.4%, `(anonymous)` 1.1%, `(module)` 1.1%, `arrayFromFastWithoutMapFn` 1.0%, `(anonymous)` 0.9%, `resolvePromiseWithFirstResolvingFunctionCallCheck` 0.8%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 55.5% | 14.64s | 55.5% | 14.64s | `postMessage` | `[native code]` |
| 23.0% | 6.07s | 23.0% | 6.07s | `deepEquals` | `[native code]` |
| 6.1% | 1.61s | 6.6% | 1.74s | `Worker` | `[native code]` |
| 1.7% | 449.6ms | 1.7% | 449.6ms | `bind` | `[native code]` |
| 1.4% | 370.4ms | 2.4% | 647.3ms | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:198` |
| 1.1% | 312.6ms | 99.0% | 26.10s | `(anonymous)` | `[native code]` |
| 1.1% | 297.9ms | 1.1% | 297.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:74` |
| 1.0% | 276.9ms | 1.0% | 276.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.9% | 249.7ms | 0.9% | 249.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:63` |
| 0.8% | 231.3ms | 0.8% | 231.3ms | `resolvePromiseWithFirstResolvingFunctionCallCheck` | `[native code]` |
| 0.8% | 212.6ms | 0.8% | 212.6ms | `structuredClone` | `[native code]` |
| 0.7% | 203.8ms | 0.7% | 203.8ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 0.7% | 198.8ms | 65.6% | 17.28s | `Promise` | `[native code]` |
| 0.5% | 154.7ms | 2.2% | 602.4ms | `from` | `[native code]` |
| 0.4% | 124.2ms | 0.4% | 124.2ms | `toUpperCase` | `[native code]` |
| 0.4% | 108.9ms | 0.4% | 108.9ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.2% | 73.9ms | 0.2% | 75.8ms | `some` | `[native code]` |
| 0.2% | 62.6ms | 0.2% | 62.6ms | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:176` |
| 0.2% | 62.1ms | 0.2% | 62.1ms | `deepStrictEqual` | `node:assert` |
| 0.2% | 61.6ms | 0.2% | 61.6ms | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:135` |
| 0.2% | 59.9ms | 0.2% | 59.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.1% | 30.9ms | 0.1% | 30.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:689` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `resolve` | `[native code]` |
| 0.1% | 28.1ms | 0.1% | 44.5ms | `every` | `[native code]` |
| 0.0% | 17.0ms | 0.0% | 17.0ms | `set` | `[native code]` |
| 0.0% | 16.8ms | 0.0% | 16.8ms | `min` | `[native code]` |
| 0.0% | 16.5ms | 0.0% | 17.4ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.0% | 16.2ms | 0.0% | 16.2ms | `anonymous` | `[native code]` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.0% | 15.9ms | 0.0% | 16.8ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:134` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.0% | 15.6ms | 0.0% | 15.6ms | `splice` | `[native code]` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:59` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `encodeGlbContainer` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:12` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:19` |
| 0.0% | 15.1ms | 0.0% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 14.5ms | 0.0% | 14.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:45` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `reserve` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 14.3ms | 0.0% | 14.3ms | `Set` | `[native code]` |
| 0.0% | 14.0ms | 0.1% | 40.3ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.0% | 13.7ms | 0.0% | 13.7ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` |
| 0.0% | 12.1ms | 0.0% | 12.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isFinite` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `materialLink` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:26` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.0% | 1.0ms | 0.0% | 25.7ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 995us | 0.0% | 995us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 0.0% | 967us | 4.1% | 1.09s | `map` | `[native code]` |
| 0.0% | 953us | 0.0% | 953us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:81` |
| 0.0% | 918us | 0.0% | 918us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` |
| 0.0% | 910us | 0.0% | 910us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:63` |
| 0.0% | 893us | 0.0% | 893us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 870us | 0.0% | 870us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:57` |
| 0.0% | 865us | 0.1% | 47.8ms | `async (anonymous)` | `[native code]` |
| 0.0% | 861us | 0.0% | 861us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.0% | 851us | 0.0% | 851us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.0% | 851us | 0.0% | 851us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.0% | 844us | 0.0% | 844us | `update` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 99.0% | 26.10s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 99.0% | 26.10s | 1.1% | 312.6ms | `(anonymous)` | `[native code]` |
| 97.7% | 25.76s | 0.0% | 0us | `evaluate` | `[native code]` |
| 97.7% | 25.76s | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 65.6% | 17.28s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:48` |
| 65.6% | 17.28s | 0.0% | 0us | `runWorkerTask` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:19` |
| 65.6% | 17.28s | 0.7% | 198.8ms | `Promise` | `[native code]` |
| 55.5% | 14.64s | 55.5% | 14.64s | `postMessage` | `[native code]` |
| 55.5% | 14.64s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:74` |
| 55.5% | 14.64s | 0.0% | 0us | `postMessage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:61` |
| 23.0% | 6.07s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:73` |
| 23.0% | 6.07s | 23.0% | 6.07s | `deepEquals` | `[native code]` |
| 23.0% | 6.07s | 0.0% | 0us | `deepStrictEqual` | `node:assert:133` |
| 8.3% | 2.19s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:26` |
| 6.6% | 1.74s | 0.0% | 0us | `createWorker` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:51` |
| 6.6% | 1.74s | 6.1% | 1.61s | `Worker` | `[native code]` |
| 4.1% | 1.09s | 0.0% | 967us | `map` | `[native code]` |
| 2.9% | 771.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:76` |
| 2.4% | 650.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:25` |
| 2.4% | 647.3ms | 1.4% | 370.4ms | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:198` |
| 2.2% | 602.4ms | 0.5% | 154.7ms | `from` | `[native code]` |
| 1.7% | 449.6ms | 1.7% | 449.6ms | `bind` | `[native code]` |
| 1.7% | 449.6ms | 0.0% | 0us | `createWorker` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:56` |
| 1.4% | 386.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` |
| 1.4% | 386.3ms | 0.0% | 0us | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` |
| 1.4% | 386.3ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` |
| 1.1% | 297.9ms | 1.1% | 297.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:74` |
| 1.0% | 276.9ms | 1.0% | 276.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.9% | 249.7ms | 0.9% | 249.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:63` |
| 0.9% | 246.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:23` |
| 0.8% | 231.3ms | 0.8% | 231.3ms | `resolvePromiseWithFirstResolvingFunctionCallCheck` | `[native code]` |
| 0.8% | 212.6ms | 0.8% | 212.6ms | `structuredClone` | `[native code]` |
| 0.8% | 212.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:24` |
| 0.7% | 203.8ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` |
| 0.7% | 203.8ms | 0.7% | 203.8ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 0.5% | 156.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:22` |
| 0.5% | 153.5ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 0.5% | 153.5ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 0.5% | 141.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:62` |
| 0.5% | 141.1ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:57` |
| 0.5% | 139.8ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` |
| 0.5% | 138.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.4% | 124.2ms | 0.4% | 124.2ms | `toUpperCase` | `[native code]` |
| 0.4% | 124.2ms | 0.0% | 0us | `get` | `[native code]` |
| 0.4% | 123.0ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` |
| 0.4% | 108.9ms | 0.4% | 108.9ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 0.4% | 108.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` |
| 0.4% | 106.6ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` |
| 0.4% | 106.6ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` |
| 0.3% | 92.0ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` |
| 0.3% | 91.7ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` |
| 0.3% | 79.4ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` |
| 0.2% | 77.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 0.2% | 77.2ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 0.2% | 77.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 0.2% | 77.2ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 0.2% | 75.8ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.2% | 75.8ms | 0.2% | 73.9ms | `some` | `[native code]` |
| 0.2% | 62.6ms | 0.2% | 62.6ms | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:176` |
| 0.2% | 62.1ms | 0.2% | 62.1ms | `deepStrictEqual` | `node:assert` |
| 0.2% | 61.6ms | 0.0% | 0us | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:197` |
| 0.2% | 61.6ms | 0.2% | 61.6ms | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:135` |
| 0.2% | 60.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:87` |
| 0.2% | 59.9ms | 0.2% | 59.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.2% | 57.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 0.1% | 47.8ms | 0.0% | 865us | `async (anonymous)` | `[native code]` |
| 0.1% | 44.5ms | 0.1% | 28.1ms | `every` | `[native code]` |
| 0.1% | 40.3ms | 0.0% | 14.0ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.1% | 30.9ms | 0.1% | 30.9ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:689` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `resolve` | `[native code]` |
| 0.0% | 25.7ms | 0.0% | 1.0ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.0% | 17.4ms | 0.0% | 16.5ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.0% | 17.1ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` |
| 0.0% | 17.0ms | 0.0% | 17.0ms | `set` | `[native code]` |
| 0.0% | 17.0ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` |
| 0.0% | 16.8ms | 0.0% | 16.8ms | `min` | `[native code]` |
| 0.0% | 16.8ms | 0.0% | 15.9ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:134` |
| 0.0% | 16.7ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:43` |
| 0.0% | 16.2ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 16.2ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 16.2ms | 0.0% | 0us | `parseModule` | `[native code]` |
| 0.0% | 16.2ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 16.2ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 16.2ms | 0.0% | 16.2ms | `anonymous` | `[native code]` |
| 0.0% | 16.1ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.0% | 15.8ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:59` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 15.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.0% | 15.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` |
| 0.0% | 15.7ms | 0.0% | 15.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 0.0% | 15.6ms | 0.0% | 15.6ms | `splice` | `[native code]` |
| 0.0% | 15.6ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:59` |
| 0.0% | 15.5ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 0.0% | 15.4ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:93` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `encodeGlbContainer` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:12` |
| 0.0% | 15.2ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:16` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:19` |
| 0.0% | 15.1ms | 0.0% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.0% | 15.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `p` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 14.9ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` |
| 0.0% | 14.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 14.5ms | 0.0% | 14.5ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:45` |
| 0.0% | 14.4ms | 0.0% | 0us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:82` |
| 0.0% | 14.4ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `reserve` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` |
| 0.0% | 14.4ms | 0.0% | 0us | `next` | `[native code]` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 14.4ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` |
| 0.0% | 14.3ms | 0.0% | 14.3ms | `Set` | `[native code]` |
| 0.0% | 13.7ms | 0.0% | 13.7ms | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` |
| 0.0% | 13.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` |
| 0.0% | 12.6ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` |
| 0.0% | 12.6ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:74` |
| 0.0% | 12.1ms | 0.0% | 12.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 2.0ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.0% | 1.9ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:78` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isFinite` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.0% | 1.8ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `materialLink` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:26` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` |
| 0.0% | 1.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.0% | 1.0ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:62` |
| 0.0% | 1.0ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:71` |
| 0.0% | 995us | 0.0% | 995us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 0.0% | 982us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.0% | 967us | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.0% | 953us | 0.0% | 953us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:81` |
| 0.0% | 918us | 0.0% | 918us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` |
| 0.0% | 910us | 0.0% | 910us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:63` |
| 0.0% | 896us | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` |
| 0.0% | 893us | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 893us | 0.0% | 893us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 870us | 0.0% | 870us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:57` |
| 0.0% | 861us | 0.0% | 861us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.0% | 851us | 0.0% | 851us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.0% | 851us | 0.0% | 851us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.0% | 844us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:105` |
| 0.0% | 844us | 0.0% | 844us | `update` | `[native code]` |

## Function Details

### `postMessage`
`[native code]` | Self: 55.5% (14.64s) | Total: 55.5% (14.64s) | Samples: 472

**Called by:**
- `postMessage` (472)

### `deepEquals`
`[native code]` | Self: 23.0% (6.07s) | Total: 23.0% (6.07s) | Samples: 31

**Called by:**
- `deepStrictEqual` (31)

### `Worker`
`[native code]` | Self: 6.1% (1.61s) | Total: 6.6% (1.74s) | Samples: 6

**Called by:**
- `createWorker` (7)

**Calls:**
- `get` (1)

### `bind`
`[native code]` | Self: 1.7% (449.6ms) | Total: 1.7% (449.6ms) | Samples: 1

**Called by:**
- `createWorker` (1)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:198` | Self: 1.4% (370.4ms) | Total: 2.4% (647.3ms) | Samples: 1

**Called by:**
- `(module)` (2)

**Calls:**
- `from` (1)

### `(anonymous)`
`[native code]` | Self: 1.1% (312.6ms) | Total: 99.0% (26.10s) | Samples: 2

**Called by:**
- `processTicksAndRejections` (670)

**Calls:**
- `async asyncModuleEvaluation` (665)
- `async (anonymous)` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:74` | Self: 1.1% (297.9ms) | Total: 1.1% (297.9ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 1.0% (276.9ms) | Total: 1.0% (276.9ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:63` | Self: 0.9% (249.7ms) | Total: 0.9% (249.7ms) | Samples: 1

**Called by:**
- `Promise` (1)

### `resolvePromiseWithFirstResolvingFunctionCallCheck`
`[native code]` | Self: 0.8% (231.3ms) | Total: 0.8% (231.3ms) | Samples: 1

### `structuredClone`
`[native code]` | Self: 0.8% (212.6ms) | Total: 0.8% (212.6ms) | Samples: 30

**Called by:**
- `(module)` (30)

### `compositeSceneImageRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` | Self: 0.7% (203.8ms) | Total: 0.7% (203.8ms) | Samples: 24

**Called by:**
- `texture` (24)

### `Promise`
`[native code]` | Self: 0.7% (198.8ms) | Total: 65.6% (17.28s) | Samples: 1

**Called by:**
- `runWorkerTask` (482)

**Calls:**
- `(anonymous)` (472)
- `(anonymous)` (8)
- `(anonymous)` (1)

### `from`
`[native code]` | Self: 0.5% (154.7ms) | Total: 2.2% (602.4ms) | Samples: 22

**Called by:**
- `makeSceneGlbFixture` (21)
- `(anonymous)` (21)
- `prepareSceneGlbTrack` (2)
- `readSceneGlbReply` (1)
- `tuple` (1)
- `makeSceneGlbFixture` (1)

**Calls:**
- `(anonymous)` (21)
- `next` (1)
- `(anonymous)` (1)
- `arrayFromFastWithoutMapFn` (1)
- `(anonymous)` (1)

### `toUpperCase`
`[native code]` | Self: 0.4% (124.2ms) | Total: 0.4% (124.2ms) | Samples: 1

**Called by:**
- `get` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` | Self: 0.4% (108.9ms) | Total: 0.4% (108.9ms) | Samples: 2

**Called by:**
- `readKey` (1)
- `(anonymous)` (1)

### `some`
`[native code]` | Self: 0.2% (73.9ms) | Total: 0.2% (75.8ms) | Samples: 4

**Called by:**
- `texture` (6)

**Calls:**
- `(anonymous)` (2)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:176` | Self: 0.2% (62.6ms) | Total: 0.2% (62.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `deepStrictEqual`
`node:assert` | Self: 0.2% (62.1ms) | Total: 0.2% (62.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `readBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:135` | Self: 0.2% (61.6ms) | Total: 0.2% (61.6ms) | Samples: 1

**Called by:**
- `readSceneGlbReply` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` | Self: 0.2% (59.9ms) | Total: 0.2% (59.9ms) | Samples: 3

**Called by:**
- `zlibSync` (3)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:689` | Self: 0.1% (30.9ms) | Total: 0.1% (30.9ms) | Samples: 2

**Called by:**
- `zlibSync` (2)

### `resolve`
`[native code]` | Self: 0.1% (30.6ms) | Total: 0.1% (30.6ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `every`
`[native code]` | Self: 0.1% (28.1ms) | Total: 0.1% (44.5ms) | Samples: 2

**Called by:**
- `every` (1)
- `validateBuffers` (1)
- `prepareSceneGlbTrack` (1)
- `floats` (1)

**Calls:**
- `isFinite` (1)
- `every` (1)

### `set`
`[native code]` | Self: 0.0% (17.0ms) | Total: 0.0% (17.0ms) | Samples: 2

**Called by:**
- `prepareSceneGlbTrack` (2)

### `min`
`[native code]` | Self: 0.0% (16.8ms) | Total: 0.0% (16.8ms) | Samples: 2

**Called by:**
- `floats` (1)
- `(anonymous)` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.0% (16.5ms) | Total: 0.0% (17.4ms) | Samples: 2

**Called by:**
- `map` (3)

**Calls:**
- `record` (1)

### `anonymous`
`[native code]` | Self: 0.0% (16.2ms) | Total: 0.0% (16.2ms) | Samples: 1

**Called by:**
- `loadAssertionError` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` | Self: 0.0% (16.1ms) | Total: 0.0% (16.1ms) | Samples: 2

**Called by:**
- `prepareSceneGlbHierarchy` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.0% (15.9ms) | Total: 0.0% (15.9ms) | Samples: 2

**Called by:**
- `prepareSceneGlbGeometry` (2)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:134` | Self: 0.0% (15.9ms) | Total: 0.0% (16.8ms) | Samples: 1

**Called by:**
- `prepareSceneGlbAnimations` (2)

**Calls:**
- `next` (1)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.0% (15.8ms) | Total: 0.0% (15.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 0.0% (15.7ms) | Total: 0.0% (15.7ms) | Samples: 2

**Called by:**
- `readSceneDocument` (2)

### `splice`
`[native code]` | Self: 0.0% (15.6ms) | Total: 0.0% (15.6ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:59` | Self: 0.0% (15.5ms) | Total: 0.0% (15.5ms) | Samples: 1

**Called by:**
- `map` (1)

### `encodeGlbContainer`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts:12` | Self: 0.0% (15.4ms) | Total: 0.0% (15.4ms) | Samples: 1

**Called by:**
- `encodeSceneGlb` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:19` | Self: 0.0% (15.2ms) | Total: 0.0% (15.2ms) | Samples: 1

**Called by:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (15.1ms) | Total: 0.0% (15.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `p`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:45` | Self: 0.0% (14.5ms) | Total: 0.0% (14.5ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `reserve`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` | Self: 0.0% (14.4ms) | Total: 0.0% (14.4ms) | Samples: 1

**Called by:**
- `append` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.0% (14.4ms) | Total: 0.0% (14.4ms) | Samples: 2

**Called by:**
- `next` (2)

### `Set`
`[native code]` | Self: 0.0% (14.3ms) | Total: 0.0% (14.3ms) | Samples: 2

**Called by:**
- `prepareSceneGlbTrack` (1)
- `(anonymous)` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (14.0ms) | Total: 0.1% (40.3ms) | Samples: 2

**Called by:**
- `map` (5)

**Calls:**
- `tuple` (2)
- `map` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:92` | Self: 0.0% (13.7ms) | Total: 0.0% (13.7ms) | Samples: 1

**Called by:**
- `prepareSceneGlbAnimations` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 0.0% (12.1ms) | Total: 0.0% (12.1ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.0% (11.3ms) | Total: 0.0% (11.3ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` | Self: 0.0% (11.1ms) | Total: 0.0% (11.1ms) | Samples: 2

**Called by:**
- `tuple` (2)

### `choice`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `readKey` (2)

### `isFinite`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `prepareSceneGlbTrack` (1)
- `every` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `some` (2)

### `materialLink`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:26` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:32` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:36` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (1.0ms) | Total: 0.0% (25.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)
- `readKey` (2)

**Calls:**
- `list` (2)
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` | Self: 0.0% (995us) | Total: 0.0% (995us) | Samples: 1

**Called by:**
- `encodeSceneGlb` (1)

### `map`
`[native code]` | Self: 0.0% (967us) | Total: 4.1% (1.09s) | Samples: 1

**Called by:**
- `encodeSceneGlb` (37)
- `readSceneAnimations` (13)
- `(anonymous)` (13)
- `readSceneAnimationClip` (13)
- `readSceneGeometry` (6)
- `readSceneDocument` (6)
- `(anonymous)` (4)
- `triangulateFace` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `(anonymous)` (1)
- `triangleUnitNormal` (1)
- `readKey` (1)

**Calls:**
- `(anonymous)` (37)
- `(anonymous)` (13)
- `readSceneAnimationClip` (13)
- `readSceneGeometry` (6)
- `readKey` (5)
- `(anonymous)` (4)
- `readKey` (3)
- `readKey` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readKey` (1)
- `(anonymous)` (1)
- `readKey` (1)
- `readKey` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:81` | Self: 0.0% (953us) | Total: 0.0% (953us) | Samples: 1

**Called by:**
- `map` (1)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` | Self: 0.0% (918us) | Total: 0.0% (918us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:63` | Self: 0.0% (910us) | Total: 0.0% (910us) | Samples: 1

**Called by:**
- `from` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (893us) | Total: 0.0% (893us) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:57` | Self: 0.0% (870us) | Total: 0.0% (870us) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (865us) | Total: 0.1% (47.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `resolve` (2)
- `parseModule` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.0% (851us) | Total: 0.0% (851us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 0.0% (851us) | Total: 0.0% (851us) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `update`
`[native code]` | Self: 0.0% (844us) | Total: 0.0% (844us) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `splice` (1)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:57` | Self: 0.0% (0us) | Total: 0.5% (141.1ms) | Samples: 0

**Called by:**
- `(module)` (21)

**Calls:**
- `from` (21)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:136` | Self: 0.0% (0us) | Total: 0.4% (108.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `materialLink` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (2)

**Calls:**
- `from` (2)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` | Self: 0.0% (0us) | Total: 0.0% (17.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (2)

**Calls:**
- `set` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `map` (2)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:43` | Self: 0.0% (0us) | Total: 0.0% (16.7ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (2)

**Calls:**
- `floats` (1)
- `floats` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:48` | Self: 0.0% (0us) | Total: 65.6% (17.28s) | Samples: 0

**Called by:**
- `evaluate` (482)

**Calls:**
- `runWorkerTask` (482)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:16` | Self: 0.0% (0us) | Total: 0.0% (15.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `from` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` | Self: 0.0% (0us) | Total: 0.7% (203.8ms) | Samples: 0

**Called by:**
- `get` (24)

**Calls:**
- `compositeSceneImageRegion` (24)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:78` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `choice` (2)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 0.2% (77.2ms) | Samples: 0

**Called by:**
- `readSceneDocument` (13)

**Calls:**
- `map` (13)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (0us) | Total: 0.2% (77.2ms) | Samples: 0

**Called by:**
- `map` (13)

**Calls:**
- `map` (13)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (2)

**Calls:**
- `triangleUnitNormal` (1)
- `triangleUnitNormal` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` | Self: 0.0% (0us) | Total: 0.5% (139.8ms) | Samples: 0

**Called by:**
- `(module)` (19)

**Calls:**
- `prepareSceneGlbGeometry` (17)
- `prepareSceneGlbGeometry` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (893us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `cross` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:74` | Self: 0.0% (0us) | Total: 0.0% (12.6ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `floats` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` | Self: 0.0% (0us) | Total: 0.3% (92.0ms) | Samples: 0

**Called by:**
- `(module)` (12)

**Calls:**
- `prepareSceneGlbAnimations` (11)
- `prepareSceneGlbAnimations` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 0.2% (57.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (7)

**Calls:**
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:24` | Self: 0.0% (0us) | Total: 0.8% (212.6ms) | Samples: 0

**Called by:**
- `evaluate` (30)

**Calls:**
- `structuredClone` (30)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `append` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `map` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` | Self: 0.0% (0us) | Total: 0.0% (896us) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `every` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:62` | Self: 0.0% (0us) | Total: 0.5% (141.1ms) | Samples: 0

**Called by:**
- `from` (21)

**Calls:**
- `from` (21)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.0% (14.5ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (2)

### `deepStrictEqual`
`node:assert:133` | Self: 0.0% (0us) | Total: 23.0% (6.07s) | Samples: 0

**Called by:**
- `(module)` (22)
- `(module)` (9)

**Calls:**
- `deepEquals` (31)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 0.2% (77.2ms) | Samples: 0

**Called by:**
- `map` (13)

**Calls:**
- `map` (13)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:26` | Self: 0.0% (0us) | Total: 8.3% (2.19s) | Samples: 0

**Called by:**
- `Promise` (8)

**Calls:**
- `createWorker` (7)
- `createWorker` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `assign` (1)

### `createWorker`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:51` | Self: 0.0% (0us) | Total: 6.6% (1.74s) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `Worker` (7)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 0.0% (0us) | Total: 0.2% (75.8ms) | Samples: 0

**Called by:**
- `get` (6)

**Calls:**
- `some` (6)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:93` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `encodeGlbContainer` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` | Self: 0.0% (0us) | Total: 0.4% (123.0ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (17)

**Calls:**
- `buildSceneGeometry` (7)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:105` | Self: 0.0% (0us) | Total: 0.0% (844us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.0% (15.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (0us) | Total: 0.0% (15.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `map` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 0.5% (153.5ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:23` | Self: 0.0% (0us) | Total: 0.9% (246.5ms) | Samples: 0

**Called by:**
- `evaluate` (21)

**Calls:**
- `readSceneDocument` (13)
- `readSceneDocument` (6)
- `readSceneDocument` (2)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` | Self: 0.0% (0us) | Total: 0.4% (106.6ms) | Samples: 0

**Called by:**
- `texture` (7)

**Calls:**
- `zlibSync` (6)
- `zlibSync` (1)

### `append`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:82` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `prepareSceneGlbTrack` (1)

**Calls:**
- `reserve` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:62` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `isFinite` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:22` | Self: 0.0% (0us) | Total: 0.5% (156.4ms) | Samples: 0

**Called by:**
- `evaluate` (22)

**Calls:**
- `makeSceneGlbFixture` (21)
- `makeSceneGlbFixture` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `min` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1485` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `encodePng` (1)

**Calls:**
- `p` (1)

### `runWorkerTask`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:19` | Self: 0.0% (0us) | Total: 65.6% (17.28s) | Samples: 0

**Called by:**
- `(module)` (482)

**Calls:**
- `Promise` (482)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:76` | Self: 0.0% (0us) | Total: 2.9% (771.6ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `readSceneGlbReply` (2)
- `readSceneGlbReply` (1)
- `readSceneGlbReply` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.0% (26.10s) | Samples: 0

**Calls:**
- `(anonymous)` (670)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` | Self: 0.0% (0us) | Total: 1.4% (386.3ms) | Samples: 0

**Called by:**
- `map` (37)

**Calls:**
- `get` (37)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` | Self: 0.0% (0us) | Total: 0.0% (12.6ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `every` (1)

### `parseModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `node:assert` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 97.7% (25.76s) | Samples: 0

**Called by:**
- `(anonymous)` (665)

**Calls:**
- `evaluate` (665)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 0.0% (15.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `every` (1)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:197` | Self: 0.0% (0us) | Total: 0.2% (61.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readBytes` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` | Self: 0.0% (0us) | Total: 0.3% (79.4ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (11)

**Calls:**
- `prepareSceneGlbTrack` (2)
- `prepareSceneGlbTrack` (2)
- `prepareSceneGlbTrack` (2)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:25` | Self: 0.0% (0us) | Total: 2.4% (650.8ms) | Samples: 0

**Called by:**
- `evaluate` (72)

**Calls:**
- `encodeSceneGlb` (37)
- `encodeSceneGlb` (19)
- `encodeSceneGlb` (12)
- `encodeSceneGlb` (3)
- `encodeSceneGlb` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:87` | Self: 0.0% (0us) | Total: 0.2% (60.0ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `deepStrictEqual` (9)

### `postMessage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:61` | Self: 0.0% (0us) | Total: 55.5% (14.64s) | Samples: 0

**Called by:**
- `(anonymous)` (472)

**Calls:**
- `postMessage` (472)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` | Self: 0.0% (0us) | Total: 0.0% (17.1ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `prepareSceneGlbHierarchy` (2)
- `prepareSceneGlbHierarchy` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.5% (138.4ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:71` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `Set` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (2)

**Calls:**
- `indexSceneDocument` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:351` | Self: 0.0% (0us) | Total: 0.0% (15.7ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (2)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` | Self: 0.0% (0us) | Total: 0.4% (106.6ms) | Samples: 0

**Called by:**
- `get` (7)

**Calls:**
- `encodePng` (7)

### `createWorker`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:56` | Self: 0.0% (0us) | Total: 1.7% (449.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `bind` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:74` | Self: 0.0% (0us) | Total: 55.5% (14.64s) | Samples: 0

**Called by:**
- `Promise` (472)

**Calls:**
- `postMessage` (472)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 0.5% (153.5ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `map` (6)

### `next`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.4ms) | Samples: 0

**Called by:**
- `from` (1)
- `prepareSceneGlbTrack` (1)

**Calls:**
- `arrayIteratorNextHelper` (2)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` | Self: 0.0% (0us) | Total: 0.3% (91.7ms) | Samples: 0

**Called by:**
- `encodePng` (6)

**Calls:**
- `dflt` (3)
- `dflt` (2)
- `dflt` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:73` | Self: 0.0% (0us) | Total: 23.0% (6.07s) | Samples: 0

**Called by:**
- `evaluate` (23)

**Calls:**
- `deepStrictEqual` (22)
- `deepStrictEqual` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 0.2% (77.2ms) | Samples: 0

**Called by:**
- `(module)` (13)

**Calls:**
- `readSceneAnimations` (13)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:59` | Self: 0.0% (0us) | Total: 0.0% (15.8ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `min` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.7% (25.76s) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (665)

**Calls:**
- `(module)` (482)
- `(module)` (72)
- `(module)` (30)
- `(module)` (23)
- `(module)` (22)
- `(module)` (21)
- `(module)` (9)
- `(module)` (4)
- `(module)` (1)
- `(module)` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` | Self: 0.0% (0us) | Total: 1.4% (386.3ms) | Samples: 0

**Called by:**
- `(module)` (37)

**Calls:**
- `map` (37)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` | Self: 0.0% (0us) | Total: 1.4% (386.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (37)

**Calls:**
- `texture` (24)
- `texture` (7)
- `texture` (6)

### `get`
`[native code]` | Self: 0.0% (0us) | Total: 0.4% (124.2ms) | Samples: 0

**Called by:**
- `Worker` (1)

**Calls:**
- `toUpperCase` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` | Self: 0.0% (0us) | Total: 0.0% (13.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `Set` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 93.0% | 24.53s | `[native code]` |
| 1.8% | 494.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts` |
| 1.1% | 297.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts` |
| 0.9% | 249.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts` |
| 0.7% | 203.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts` |
| 0.5% | 154.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.4% | 106.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.2% | 62.1ms | `node:assert` |
| 0.1% | 48.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.1% | 47.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.1% | 44.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` |
| 0.1% | 40.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 31.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.0% | 16.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts` |
| 0.0% | 15.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\glbContainer.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts` |
| 0.0% | 1.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 995us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 0.0% | 893us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 870us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts` |
