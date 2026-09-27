# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 25.28s | 386 | 1.0ms | 181 |

**Top 10:** `postMessage` 36.2%, `deepEquals` 29.2%, `record` 6.6%, `Float64Array` 2.9%, `record` 2.7%, `(anonymous)` 2.0%, `packAnimations` 1.8%, `choice` 1.8%, `deepStrictEqual` 1.8%, `(module)` 1.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 36.2% | 9.16s | 36.2% | 9.16s | `postMessage` | `[native code]` |
| 29.2% | 7.40s | 29.2% | 7.40s | `deepEquals` | `[native code]` |
| 6.6% | 1.67s | 6.6% | 1.67s | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 2.9% | 744.8ms | 2.9% | 744.8ms | `Float64Array` | `[native code]` |
| 2.7% | 683.0ms | 2.7% | 683.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 2.0% | 519.1ms | 2.0% | 519.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:50` |
| 1.8% | 467.0ms | 4.7% | 1.21s | `packAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:24` |
| 1.8% | 466.3ms | 1.8% | 466.3ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 1.8% | 464.0ms | 1.8% | 464.0ms | `deepStrictEqual` | `node:assert:131` |
| 1.5% | 404.0ms | 1.5% | 404.0ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:14` |
| 1.2% | 327.4ms | 1.2% | 327.4ms | `Worker` | `[native code]` |
| 1.2% | 324.5ms | 1.2% | 324.5ms | `DataView` | `[native code]` |
| 1.0% | 277.8ms | 95.8% | 24.22s | `evaluate` | `[native code]` |
| 1.0% | 275.8ms | 97.0% | 24.53s | `(anonymous)` | `[native code]` |
| 0.9% | 247.0ms | 0.9% | 247.0ms | `packAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:14` |
| 0.8% | 219.3ms | 0.8% | 219.3ms | `push` | `[native code]` |
| 0.7% | 200.7ms | 96.7% | 24.45s | `processTicksAndRejections` | `[native code]` |
| 0.7% | 189.8ms | 0.7% | 189.8ms | `structuredClone` | `[native code]` |
| 0.6% | 168.6ms | 0.6% | 168.6ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 0.5% | 138.3ms | 1.1% | 281.3ms | `from` | `[native code]` |
| 0.3% | 78.4ms | 0.3% | 78.4ms | `Uint8Array` | `[native code]` |
| 0.3% | 75.9ms | 0.3% | 75.9ms | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |
| 0.2% | 62.5ms | 0.2% | 62.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts` |
| 0.2% | 61.2ms | 0.2% | 61.2ms | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:155` |
| 0.2% | 61.0ms | 17.2% | 4.36s | `packSceneGlbRequest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:68` |
| 0.2% | 60.9ms | 25.9% | 6.55s | `map` | `[native code]` |
| 0.1% | 47.7ms | 0.1% | 47.7ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.1% | 45.4ms | 0.1% | 45.4ms | `every` | `[native code]` |
| 0.1% | 44.8ms | 0.1% | 44.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.0% | 16.9ms | 0.0% | 16.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.0% | 16.2ms | 0.0% | 16.2ms | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:64` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `abs` | `[native code]` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `lc` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:523` |
| 0.0% | 16.0ms | 0.0% | 16.0ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:20` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `filter` | `[native code]` |
| 0.0% | 15.1ms | 0.3% | 79.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:90` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:100` |
| 0.0% | 14.7ms | 0.0% | 14.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:41` |
| 0.0% | 14.7ms | 0.0% | 14.7ms | `resolve` | `[native code]` |
| 0.0% | 14.7ms | 0.0% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.0% | 14.6ms | 0.0% | 14.6ms | `entries` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:698` |
| 0.0% | 13.7ms | 0.3% | 89.6ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.0% | 13.7ms | 0.0% | 13.7ms | `CryptoHasher` | `[native code]` |
| 0.0% | 13.6ms | 0.0% | 13.6ms | `copyDataProperties` | `[native code]` |
| 0.0% | 13.4ms | 0.0% | 13.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.0% | 7.0ms | 0.0% | 24.4ms | `parseModule` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `has` | `[native code]` |
| 0.0% | 1.8ms | 9.2% | 2.33s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:37` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:81` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `hasOwn` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.1% | 35.7ms | `anonymous` | `[native code]` |
| 0.0% | 992us | 0.0% | 992us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 985us | 0.0% | 985us | `set` | `[native code]` |
| 0.0% | 976us | 0.0% | 976us | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.0% | 964us | 0.0% | 964us | `next` | `[native code]` |
| 0.0% | 913us | 0.0% | 913us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` |
| 0.0% | 889us | 0.0% | 1.9ms | `refresh` | `internal:util/colors:18` |
| 0.0% | 889us | 0.0% | 889us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` |
| 0.0% | 888us | 0.0% | 888us | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 0.0% | 887us | 0.0% | 887us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 887us | 0.0% | 17.0ms | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.0% | 883us | 0.1% | 35.1ms | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.0% | 876us | 0.0% | 876us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 97.0% | 24.53s | 1.0% | 275.8ms | `(anonymous)` | `[native code]` |
| 96.7% | 24.45s | 0.7% | 200.7ms | `processTicksAndRejections` | `[native code]` |
| 95.8% | 24.22s | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 95.8% | 24.22s | 1.0% | 277.8ms | `evaluate` | `[native code]` |
| 54.8% | 13.86s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:50` |
| 37.5% | 9.49s | 0.0% | 0us | `runWorkerTask` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:19` |
| 37.5% | 9.49s | 0.0% | 0us | `Promise` | `[native code]` |
| 37.5% | 9.49s | 0.0% | 0us | `async prepareSceneGlbInWorker` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:16` |
| 36.2% | 9.16s | 0.0% | 0us | `postMessage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:63` |
| 36.2% | 9.16s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:74` |
| 36.2% | 9.16s | 36.2% | 9.16s | `postMessage` | `[native code]` |
| 29.2% | 7.40s | 0.0% | 0us | `deepStrictEqual` | `node:assert:133` |
| 29.2% | 7.40s | 29.2% | 7.40s | `deepEquals` | `[native code]` |
| 28.0% | 7.08s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:77` |
| 25.9% | 6.55s | 0.2% | 60.9ms | `map` | `[native code]` |
| 17.2% | 4.36s | 0.2% | 61.0ms | `packSceneGlbRequest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:68` |
| 17.2% | 4.36s | 0.0% | 0us | `async prepareSceneGlbInWorker` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:17` |
| 11.2% | 2.84s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:32` |
| 11.2% | 2.84s | 0.0% | 0us | `packAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:30` |
| 9.2% | 2.33s | 0.0% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:37` |
| 6.6% | 1.67s | 6.6% | 1.67s | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` |
| 4.7% | 1.21s | 1.8% | 467.0ms | `packAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:24` |
| 3.0% | 775.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:92` |
| 2.9% | 744.8ms | 2.9% | 744.8ms | `Float64Array` | `[native code]` |
| 2.7% | 683.0ms | 2.7% | 683.0ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 2.4% | 618.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:25` |
| 2.0% | 519.1ms | 2.0% | 519.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:50` |
| 2.0% | 514.0ms | 0.0% | 0us | `onMessage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:54` |
| 2.0% | 514.0ms | 0.0% | 0us | `readReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:24` |
| 1.8% | 466.3ms | 1.8% | 466.3ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 1.8% | 466.3ms | 0.0% | 0us | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:180` |
| 1.8% | 464.0ms | 1.8% | 464.0ms | `deepStrictEqual` | `node:assert:131` |
| 1.7% | 449.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:80` |
| 1.7% | 449.6ms | 0.0% | 0us | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:197` |
| 1.5% | 404.0ms | 1.5% | 404.0ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:14` |
| 1.3% | 337.1ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` |
| 1.3% | 337.1ms | 0.0% | 0us | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` |
| 1.3% | 337.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` |
| 1.2% | 327.4ms | 1.2% | 327.4ms | `Worker` | `[native code]` |
| 1.2% | 327.4ms | 0.0% | 0us | `createWorker` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:53` |
| 1.2% | 327.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:26` |
| 1.2% | 324.5ms | 1.2% | 324.5ms | `DataView` | `[native code]` |
| 1.2% | 324.5ms | 0.0% | 0us | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:135` |
| 1.1% | 281.3ms | 0.5% | 138.3ms | `from` | `[native code]` |
| 0.9% | 247.0ms | 0.9% | 247.0ms | `packAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:14` |
| 0.8% | 219.3ms | 0.8% | 219.3ms | `push` | `[native code]` |
| 0.8% | 218.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:84` |
| 0.7% | 189.8ms | 0.7% | 189.8ms | `structuredClone` | `[native code]` |
| 0.7% | 189.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:24` |
| 0.6% | 174.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:22` |
| 0.6% | 170.1ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` |
| 0.6% | 168.6ms | 0.6% | 168.6ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` |
| 0.6% | 155.7ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` |
| 0.6% | 154.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:23` |
| 0.5% | 139.2ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` |
| 0.5% | 138.6ms | 0.0% | 0us | `zlibSync` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` |
| 0.5% | 138.6ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` |
| 0.5% | 138.6ms | 0.0% | 0us | `encodePng` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` |
| 0.3% | 98.6ms | 0.0% | 0us | `link` | `[native code]` |
| 0.3% | 94.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:62` |
| 0.3% | 94.3ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:57` |
| 0.3% | 89.6ms | 0.0% | 13.7ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` |
| 0.3% | 79.2ms | 0.0% | 0us | `readSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` |
| 0.3% | 79.2ms | 0.0% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` |
| 0.3% | 79.2ms | 0.0% | 0us | `readSceneAnimationClip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` |
| 0.3% | 79.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` |
| 0.3% | 78.4ms | 0.3% | 78.4ms | `Uint8Array` | `[native code]` |
| 0.3% | 75.9ms | 0.3% | 75.9ms | `hsh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` |
| 0.2% | 75.2ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` |
| 0.2% | 63.8ms | 0.0% | 0us | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:164` |
| 0.2% | 62.5ms | 0.0% | 0us | `paintedSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:25` |
| 0.2% | 62.5ms | 0.2% | 62.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts` |
| 0.2% | 62.5ms | 0.0% | 0us | `makeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:43` |
| 0.2% | 62.5ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` |
| 0.2% | 62.5ms | 0.0% | 0us | `animatedScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` |
| 0.2% | 61.2ms | 0.2% | 61.2ms | `readBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:155` |
| 0.2% | 60.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` |
| 0.1% | 47.7ms | 0.1% | 47.7ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.1% | 47.7ms | 0.0% | 0us | `readSceneGlbReply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:191` |
| 0.1% | 47.0ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 0.1% | 46.6ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` |
| 0.1% | 46.6ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 0.1% | 45.4ms | 0.1% | 45.4ms | `every` | `[native code]` |
| 0.1% | 44.8ms | 0.1% | 44.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.1% | 39.1ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.1% | 35.7ms | 0.0% | 1.0ms | `anonymous` | `[native code]` |
| 0.1% | 35.1ms | 0.0% | 883us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` |
| 0.1% | 34.0ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.1% | 30.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.1% | 30.5ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` |
| 0.1% | 29.0ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` |
| 0.1% | 28.5ms | 0.0% | 0us | `prepareSceneGlbAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:75` |
| 0.1% | 28.0ms | 0.0% | 0us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` |
| 0.0% | 24.4ms | 0.0% | 7.0ms | `parseModule` | `[native code]` |
| 0.0% | 17.7ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` |
| 0.0% | 17.7ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` |
| 0.0% | 17.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 17.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 17.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 17.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 17.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 17.0ms | 0.0% | 887us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.0% | 16.9ms | 0.0% | 16.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.0% | 16.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 16.6ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:16` |
| 0.0% | 16.2ms | 0.0% | 16.2ms | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:64` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `abs` | `[native code]` |
| 0.0% | 16.1ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.0% | 16.1ms | 0.0% | 0us | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:746` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `lc` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:523` |
| 0.0% | 16.1ms | 0.0% | 0us | `wblk` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:577` |
| 0.0% | 16.0ms | 0.0% | 16.0ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.0% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` |
| 0.0% | 15.9ms | 0.0% | 14.7ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.0% | 15.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:19` |
| 0.0% | 15.8ms | 0.0% | 15.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:20` |
| 0.0% | 15.5ms | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:44` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `filter` | `[native code]` |
| 0.0% | 15.4ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.0% | 15.4ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 15.4ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.0% | 15.0ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` |
| 0.0% | 15.0ms | 0.0% | 0us | `SceneGlbMaterials` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:71` |
| 0.0% | 15.0ms | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:21` |
| 0.0% | 15.0ms | 0.0% | 15.0ms | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:90` |
| 0.0% | 14.9ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:100` |
| 0.0% | 14.7ms | 0.0% | 14.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:41` |
| 0.0% | 14.7ms | 0.0% | 14.7ms | `resolve` | `[native code]` |
| 0.0% | 14.6ms | 0.0% | 0us | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:178` |
| 0.0% | 14.6ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:334` |
| 0.0% | 14.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:188` |
| 0.0% | 14.6ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.0% | 14.6ms | 0.0% | 14.6ms | `entries` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.0% | 14.0ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.0% | 14.0ms | 0.0% | 14.0ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:698` |
| 0.0% | 13.8ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.0% | 13.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:111` |
| 0.0% | 13.7ms | 0.0% | 13.7ms | `CryptoHasher` | `[native code]` |
| 0.0% | 13.6ms | 0.0% | 0us | `floats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:71` |
| 0.0% | 13.6ms | 0.0% | 13.6ms | `copyDataProperties` | `[native code]` |
| 0.0% | 13.4ms | 0.0% | 0us | `some` | `[native code]` |
| 0.0% | 13.4ms | 0.0% | 0us | `texture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.0% | 13.4ms | 0.0% | 13.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `dflt` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` |
| 0.0% | 1.9ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `has` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `indexSceneAnimations` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` |
| 0.0% | 1.9ms | 0.0% | 889us | `refresh` | `internal:util/colors:18` |
| 0.0% | 1.9ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.0% | 1.7ms | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `compositeSceneImageRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:81` |
| 0.0% | 1.1ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `hasOwn` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 992us | 0.0% | 992us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 992us | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.0% | 992us | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 985us | 0.0% | 985us | `set` | `[native code]` |
| 0.0% | 985us | 0.0% | 0us | `prepareSceneGlbTrack` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` |
| 0.0% | 976us | 0.0% | 976us | `makeSceneGridGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` |
| 0.0% | 976us | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:37` |
| 0.0% | 964us | 0.0% | 964us | `next` | `[native code]` |
| 0.0% | 964us | 0.0% | 0us | `encodeSceneGlb` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:36` |
| 0.0% | 942us | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 942us | 0.0% | 0us | `prepareSceneGlbGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:23` |
| 0.0% | 913us | 0.0% | 913us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` |
| 0.0% | 889us | 0.0% | 889us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` |
| 0.0% | 888us | 0.0% | 0us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:82` |
| 0.0% | 888us | 0.0% | 888us | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 0.0% | 888us | 0.0% | 0us | `reserve` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:21` |
| 0.0% | 887us | 0.0% | 887us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 876us | 0.0% | 876us | `readKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` |

## Function Details

### `postMessage`
`[native code]` | Self: 36.2% (9.16s) | Total: 36.2% (9.16s) | Samples: 167

**Called by:**
- `postMessage` (167)

### `deepEquals`
`[native code]` | Self: 29.2% (7.40s) | Total: 29.2% (7.40s) | Samples: 31

**Called by:**
- `deepStrictEqual` (31)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:28` | Self: 6.6% (1.67s) | Total: 6.6% (1.67s) | Samples: 20

**Called by:**
- `(anonymous)` (18)
- `readKey` (2)

### `Float64Array`
`[native code]` | Self: 2.9% (744.8ms) | Total: 2.9% (744.8ms) | Samples: 2

**Called by:**
- `packAnimations` (2)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 2.7% (683.0ms) | Total: 2.7% (683.0ms) | Samples: 9

**Called by:**
- `(anonymous)` (8)
- `readKey` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:50` | Self: 2.0% (519.1ms) | Total: 2.0% (519.1ms) | Samples: 7

**Called by:**
- `map` (7)

### `packAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:24` | Self: 1.8% (467.0ms) | Total: 4.7% (1.21s) | Samples: 1

**Called by:**
- `packSceneGlbRequest` (3)

**Calls:**
- `Float64Array` (2)

### `choice`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` | Self: 1.8% (466.3ms) | Total: 1.8% (466.3ms) | Samples: 1

**Called by:**
- `readSceneGlbReply` (1)

### `deepStrictEqual`
`node:assert:131` | Self: 1.8% (464.0ms) | Total: 1.8% (464.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:14` | Self: 1.5% (404.0ms) | Total: 1.5% (404.0ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `Worker`
`[native code]` | Self: 1.2% (327.4ms) | Total: 1.2% (327.4ms) | Samples: 4

**Called by:**
- `createWorker` (4)

### `DataView`
`[native code]` | Self: 1.2% (324.5ms) | Total: 1.2% (324.5ms) | Samples: 4

**Called by:**
- `readBytes` (4)

### `evaluate`
`[native code]` | Self: 1.0% (277.8ms) | Total: 95.8% (24.22s) | Samples: 1

**Called by:**
- `async asyncModuleEvaluation` (375)

**Calls:**
- `(module)` (211)
- `(module)` (64)
- `(module)` (25)
- `(module)` (21)
- `(module)` (19)
- `(module)` (14)
- `(module)` (11)
- `(module)` (6)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `(anonymous)`
`[native code]` | Self: 1.0% (275.8ms) | Total: 97.0% (24.53s) | Samples: 1

**Called by:**
- `processTicksAndRejections` (377)
- `refresh` (1)

**Calls:**
- `async asyncModuleEvaluation` (375)
- `async (anonymous)` (1)
- `async loadAndEvaluateModule` (1)
- `anonymous` (1)

### `packAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:14` | Self: 0.9% (247.0ms) | Total: 0.9% (247.0ms) | Samples: 1

**Called by:**
- `packSceneGlbRequest` (1)

### `push`
`[native code]` | Self: 0.8% (219.3ms) | Total: 0.8% (219.3ms) | Samples: 2

**Called by:**
- `(module)` (1)
- `buildSceneGeometry` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.7% (200.7ms) | Total: 96.7% (24.45s) | Samples: 1

**Calls:**
- `(anonymous)` (377)

### `structuredClone`
`[native code]` | Self: 0.7% (189.8ms) | Total: 0.7% (189.8ms) | Samples: 25

**Called by:**
- `(module)` (25)

### `compositeSceneImageRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:96` | Self: 0.6% (168.6ms) | Total: 0.6% (168.6ms) | Samples: 21

**Called by:**
- `texture` (21)

### `from`
`[native code]` | Self: 0.5% (138.3ms) | Total: 1.1% (281.3ms) | Samples: 14

**Called by:**
- `makeSceneGlbFixture` (10)
- `(anonymous)` (10)
- `prepareSceneGlbTrack` (2)
- `tuple` (2)
- `makeSceneGlbFixture` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (10)
- `arrayFromFastWithoutMapFn` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `Uint8Array`
`[native code]` | Self: 0.3% (78.4ms) | Total: 0.3% (78.4ms) | Samples: 2

**Called by:**
- `readBytes` (1)
- `(anonymous)` (1)

### `hsh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:659` | Self: 0.3% (75.9ms) | Total: 0.3% (75.9ms) | Samples: 1

**Called by:**
- `dflt` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts` | Self: 0.2% (62.5ms) | Total: 0.2% (62.5ms) | Samples: 1

**Called by:**
- `paintedSkin` (1)

### `readBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:155` | Self: 0.2% (61.2ms) | Total: 0.2% (61.2ms) | Samples: 1

**Called by:**
- `readSceneGlbReply` (1)

### `packSceneGlbRequest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:68` | Self: 0.2% (61.0ms) | Total: 17.2% (4.36s) | Samples: 1

**Called by:**
- `async prepareSceneGlbInWorker` (40)

**Calls:**
- `packAnimations` (35)
- `packAnimations` (3)
- `packAnimations` (1)

### `map`
`[native code]` | Self: 0.2% (60.9ms) | Total: 25.9% (6.55s) | Samples: 7

**Called by:**
- `packAnimations` (35)
- `(anonymous)` (35)
- `encodeSceneGlb` (32)
- `readSceneAnimations` (12)
- `readSceneAnimationClip` (12)
- `(anonymous)` (11)
- `readSceneDocument` (6)
- `readSceneGeometry` (5)
- `tuple` (5)
- `(anonymous)` (4)
- `triangulateFace` (2)
- `readSceneDocument` (1)
- `buildSceneGeometry` (1)
- `triangulateFace` (1)
- `SceneGlbMaterials` (1)
- `flatIntoArrayWithCallback` (1)
- `triangulateFace` (1)
- `prepareSceneGlbTrack` (1)
- `readSceneGeometry` (1)
- `readSceneImage` (1)

**Calls:**
- `(anonymous)` (35)
- `(anonymous)` (32)
- `(anonymous)` (28)
- `(anonymous)` (12)
- `readSceneAnimationClip` (12)
- `(anonymous)` (7)
- `readKey` (7)
- `readSceneGeometry` (5)
- `(anonymous)` (4)
- `readKey` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `abs` (1)
- `readKey` (1)
- `readSceneImage` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.1% (47.7ms) | Total: 0.1% (47.7ms) | Samples: 1

**Called by:**
- `readSceneGlbReply` (1)

### `every`
`[native code]` | Self: 0.1% (45.4ms) | Total: 0.1% (45.4ms) | Samples: 3

**Called by:**
- `floats` (2)
- `prepareSceneGlbTrack` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.1% (44.8ms) | Total: 0.1% (44.8ms) | Samples: 4

**Called by:**
- `prepareSceneGlbGeometry` (4)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.0% (16.9ms) | Total: 0.0% (16.9ms) | Samples: 2

**Called by:**
- `from` (2)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:64` | Self: 0.0% (16.2ms) | Total: 0.0% (16.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (16.1ms) | Total: 0.0% (16.1ms) | Samples: 2

**Called by:**
- `map` (2)

### `abs`
`[native code]` | Self: 0.0% (16.1ms) | Total: 0.0% (16.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `lc`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:523` | Self: 0.0% (16.1ms) | Total: 0.0% (16.1ms) | Samples: 1

**Called by:**
- `wblk` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` | Self: 0.0% (16.0ms) | Total: 0.0% (16.0ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:20` | Self: 0.0% (15.8ms) | Total: 0.0% (15.8ms) | Samples: 1

**Called by:**
- `from` (1)

### `filter`
`[native code]` | Self: 0.0% (15.4ms) | Total: 0.0% (15.4ms) | Samples: 1

**Called by:**
- `bound call` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:87` | Self: 0.0% (15.1ms) | Total: 0.3% (79.2ms) | Samples: 1

**Called by:**
- `map` (12)

**Calls:**
- `map` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 2

**Called by:**
- `map` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:18` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:90` | Self: 0.0% (15.0ms) | Total: 0.0% (15.0ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:100` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `get` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:41` | Self: 0.0% (14.7ms) | Total: 0.0% (14.7ms) | Samples: 1

### `resolve`
`[native code]` | Self: 0.0% (14.7ms) | Total: 0.0% (14.7ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 0.0% (14.7ms) | Total: 0.0% (15.9ms) | Samples: 1

**Called by:**
- `prepareSceneGlbGeometry` (2)

**Calls:**
- `push` (1)

### `entries`
`[native code]` | Self: 0.0% (14.6ms) | Total: 0.0% (14.6ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (14.0ms) | Total: 0.0% (14.0ms) | Samples: 1

**Called by:**
- `link` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (14.0ms) | Total: 0.0% (14.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:698` | Self: 0.0% (14.0ms) | Total: 0.0% (14.0ms) | Samples: 1

**Called by:**
- `zlibSync` (1)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:669` | Self: 0.0% (13.7ms) | Total: 0.3% (89.6ms) | Samples: 1

**Called by:**
- `zlibSync` (2)

**Calls:**
- `hsh` (1)

### `CryptoHasher`
`[native code]` | Self: 0.0% (13.7ms) | Total: 0.0% (13.7ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `copyDataProperties`
`[native code]` | Self: 0.0% (13.6ms) | Total: 0.0% (13.6ms) | Samples: 1

**Called by:**
- `floats` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 0.0% (13.4ms) | Total: 0.0% (13.4ms) | Samples: 1

**Called by:**
- `some` (1)

### `parseModule`
`[native code]` | Self: 0.0% (7.0ms) | Total: 0.0% (24.4ms) | Samples: 1

**Called by:**
- `async (anonymous)` (4)

**Calls:**
- `node:assert` (3)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:738` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 3

**Called by:**
- `zlibSync` (3)

### `has`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `indexSceneAnimations` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:37` | Self: 0.0% (1.8ms) | Total: 9.2% (2.33s) | Samples: 2

**Called by:**
- `map` (28)

**Calls:**
- `record` (18)
- `record` (8)

### `compositeSceneImageRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts:81` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `texture` (1)

### `hasOwn`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `anonymous`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.1% (35.7ms) | Samples: 1

**Called by:**
- `internal:assert/assertion_error` (3)
- `loadAssertionError` (3)
- `(anonymous)` (1)

**Calls:**
- `internal:assert/assertion_error` (3)
- `internal:util/colors` (2)
- `internal:util/inspect` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.0% (992us) | Total: 0.0% (992us) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `set`
`[native code]` | Self: 0.0% (985us) | Total: 0.0% (985us) | Samples: 1

**Called by:**
- `prepareSceneGlbTrack` (1)

### `makeSceneGridGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts:7` | Self: 0.0% (976us) | Total: 0.0% (976us) | Samples: 1

**Called by:**
- `makeSceneGlbFixture` (1)

### `next`
`[native code]` | Self: 0.0% (964us) | Total: 0.0% (964us) | Samples: 1

**Called by:**
- `encodeSceneGlb` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:135` | Self: 0.0% (913us) | Total: 0.0% (913us) | Samples: 1

**Called by:**
- `map` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (889us) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `internal:util/colors` (2)

**Calls:**
- `(anonymous)` (1)

### `append`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:88` | Self: 0.0% (889us) | Total: 0.0% (889us) | Samples: 1

**Called by:**
- `prepareSceneGlbTrack` (1)

### `requireScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` | Self: 0.0% (888us) | Total: 0.0% (888us) | Samples: 1

**Called by:**
- `reserve` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (887us) | Total: 0.0% (887us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (887us) | Total: 0.0% (17.0ms) | Samples: 1

**Called by:**
- `readKey` (3)

**Calls:**
- `from` (2)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:68` | Self: 0.0% (883us) | Total: 0.1% (35.1ms) | Samples: 1

**Called by:**
- `map` (7)

**Calls:**
- `tuple` (3)
- `tuple` (3)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:61` | Self: 0.0% (876us) | Total: 0.0% (876us) | Samples: 1

**Called by:**
- `map` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 95.8% (24.22s) | Samples: 0

**Called by:**
- `(anonymous)` (375)

**Calls:**
- `evaluate` (375)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (942us) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:92` | Self: 0.0% (0us) | Total: 3.0% (775.9ms) | Samples: 0

**Called by:**
- `evaluate` (11)

**Calls:**
- `deepStrictEqual` (11)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:63` | Self: 0.0% (0us) | Total: 0.1% (46.6ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (7)

**Calls:**
- `prepareSceneGlbTrack` (3)
- `prepareSceneGlbTrack` (2)
- `prepareSceneGlbTrack` (1)
- `prepareSceneGlbTrack` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.0% (0us) | Total: 0.0% (13.8ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:103` | Self: 0.0% (0us) | Total: 0.5% (138.6ms) | Samples: 0

**Called by:**
- `get` (8)

**Calls:**
- `encodePng` (8)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:180` | Self: 0.0% (0us) | Total: 1.8% (466.3ms) | Samples: 0

**Called by:**
- `readReply` (1)

**Calls:**
- `choice` (1)

### `readReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:24` | Self: 0.0% (0us) | Total: 2.0% (514.0ms) | Samples: 0

**Called by:**
- `onMessage` (2)

**Calls:**
- `readSceneGlbReply` (1)
- `readSceneGlbReply` (1)

### `prepareSceneGlbAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbAnimations.ts:75` | Self: 0.0% (0us) | Total: 0.1% (28.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (2)

**Calls:**
- `floats` (1)
- `floats` (1)

### `packAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:30` | Self: 0.0% (0us) | Total: 11.2% (2.84s) | Samples: 0

**Called by:**
- `packSceneGlbRequest` (35)

**Calls:**
- `map` (35)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:305` | Self: 0.0% (0us) | Total: 0.3% (79.2ms) | Samples: 0

**Called by:**
- `(module)` (12)

**Calls:**
- `readSceneAnimations` (12)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `node:assert` (3)

**Calls:**
- `get` (3)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:154` | Self: 0.0% (0us) | Total: 0.1% (29.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (3)

**Calls:**
- `from` (2)
- `map` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `linkAndEvaluateModule` (1)

### `readSceneImage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:178` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `postMessage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:63` | Self: 0.0% (0us) | Total: 36.2% (9.16s) | Samples: 0

**Called by:**
- `(anonymous)` (167)

**Calls:**
- `postMessage` (167)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `from` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.0% (15.0ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `map` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:29` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `hasOwn` (1)

### `createWorker`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:53` | Self: 0.0% (0us) | Total: 1.2% (327.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `Worker` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:50` | Self: 0.0% (0us) | Total: 54.8% (13.86s) | Samples: 0

**Called by:**
- `evaluate` (211)

**Calls:**
- `async prepareSceneGlbInWorker` (171)
- `async prepareSceneGlbInWorker` (40)

### `onMessage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:54` | Self: 0.0% (0us) | Total: 2.0% (514.0ms) | Samples: 0

**Calls:**
- `readReply` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:191` | Self: 0.0% (0us) | Total: 0.1% (47.7ms) | Samples: 0

**Called by:**
- `readReply` (1)

**Calls:**
- `record` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:23` | Self: 0.0% (0us) | Total: 0.0% (942us) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:99` | Self: 0.0% (0us) | Total: 0.6% (170.1ms) | Samples: 0

**Called by:**
- `get` (22)

**Calls:**
- `compositeSceneImageRegion` (21)
- `compositeSceneImageRegion` (1)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:16` | Self: 0.0% (0us) | Total: 0.0% (16.6ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `from` (2)

### `readSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:97` | Self: 0.0% (0us) | Total: 0.3% (79.2ms) | Samples: 0

**Called by:**
- `readSceneDocument` (12)

**Calls:**
- `map` (12)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:21` | Self: 0.0% (0us) | Total: 0.0% (15.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `SceneGlbMaterials` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (13.4ms) | Samples: 0

**Called by:**
- `texture` (1)

**Calls:**
- `(anonymous)` (1)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:44` | Self: 0.0% (0us) | Total: 0.0% (15.5ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `floats` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:77` | Self: 0.0% (0us) | Total: 28.0% (7.08s) | Samples: 0

**Called by:**
- `evaluate` (21)

**Calls:**
- `deepStrictEqual` (20)
- `deepStrictEqual` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.0% (992us) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `triangleUnitNormal` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.1% (34.0ms) | Samples: 0

**Called by:**
- `readKey` (3)
- `(anonymous)` (2)

**Calls:**
- `map` (5)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:42` | Self: 0.0% (0us) | Total: 0.6% (155.7ms) | Samples: 0

**Called by:**
- `(module)` (17)

**Calls:**
- `prepareSceneGlbGeometry` (15)
- `prepareSceneGlbGeometry` (1)
- `prepareSceneGlbGeometry` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (992us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `cross` (1)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:137` | Self: 0.0% (0us) | Total: 1.3% (337.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (32)

**Calls:**
- `texture` (22)
- `texture` (8)
- `texture` (1)
- `texture` (1)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:57` | Self: 0.0% (0us) | Total: 0.3% (94.3ms) | Samples: 0

**Called by:**
- `(module)` (10)

**Calls:**
- `from` (10)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:136` | Self: 0.0% (0us) | Total: 0.0% (985us) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `set` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `refresh` (2)

### `readKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:60` | Self: 0.0% (0us) | Total: 0.1% (28.0ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `record` (2)
- `record` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:80` | Self: 0.0% (0us) | Total: 1.7% (449.6ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `readSceneGlbReply` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:24` | Self: 0.0% (0us) | Total: 0.7% (189.8ms) | Samples: 0

**Called by:**
- `evaluate` (25)

**Calls:**
- `structuredClone` (25)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 0.1% (47.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (6)

**Calls:**
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `assign` (3)

**Calls:**
- `loadAssertionError` (3)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:71` | Self: 0.0% (0us) | Total: 0.0% (13.6ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `copyDataProperties` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:69` | Self: 0.0% (0us) | Total: 0.2% (75.2ms) | Samples: 0

**Called by:**
- `(module)` (9)

**Calls:**
- `prepareSceneGlbAnimations` (7)
- `prepareSceneGlbAnimations` (2)

### `reserve`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:21` | Self: 0.0% (0us) | Total: 0.0% (888us) | Samples: 0

**Called by:**
- `append` (1)

**Calls:**
- `requireScene` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:95` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (2)

**Calls:**
- `append` (1)
- `append` (1)

### `readBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:164` | Self: 0.0% (0us) | Total: 0.2% (63.8ms) | Samples: 0

**Called by:**
- `readSceneGlbReply` (1)

**Calls:**
- `Uint8Array` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:12` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `indexSceneAnimations` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:62` | Self: 0.0% (0us) | Total: 0.3% (94.3ms) | Samples: 0

**Called by:**
- `from` (10)

**Calls:**
- `from` (10)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.0% (16.8ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `tuple` (2)

### `indexSceneAnimations`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\animationIndex.ts:38` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `has` (1)

### `deepStrictEqual`
`node:assert:133` | Self: 0.0% (0us) | Total: 29.2% (7.40s) | Samples: 0

**Called by:**
- `(module)` (20)
- `(module)` (11)

**Calls:**
- `deepEquals` (31)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `map` (1)

### `readSceneAnimationClip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts:34` | Self: 0.0% (0us) | Total: 0.3% (79.2ms) | Samples: 0

**Called by:**
- `map` (12)

**Calls:**
- `map` (12)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts:32` | Self: 0.0% (0us) | Total: 11.2% (2.84s) | Samples: 0

**Called by:**
- `map` (35)

**Calls:**
- `map` (35)

### `wblk`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:577` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `dflt` (1)

**Calls:**
- `lc` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `parseModule` (3)

**Calls:**
- `assign` (3)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `get` (3)

**Calls:**
- `anonymous` (3)

### `prepareSceneGlbGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbGeometry.ts:13` | Self: 0.0% (0us) | Total: 0.5% (139.2ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (15)

**Calls:**
- `buildSceneGeometry` (6)
- `buildSceneGeometry` (4)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `validateBuffers` (1)

### `prepareSceneGlbTrack`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:149` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)

**Calls:**
- `every` (1)

### `SceneGlbMaterials`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:71` | Self: 0.0% (0us) | Total: 0.0% (15.0ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (1)

**Calls:**
- `map` (1)

### `readBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:135` | Self: 0.0% (0us) | Total: 1.2% (324.5ms) | Samples: 0

**Called by:**
- `readSceneGlbReply` (4)

**Calls:**
- `DataView` (4)

### `Promise`
`[native code]` | Self: 0.0% (0us) | Total: 37.5% (9.49s) | Samples: 0

**Called by:**
- `runWorkerTask` (171)

**Calls:**
- `(anonymous)` (167)
- `(anonymous)` (4)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 0.1% (46.6ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `map` (5)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` | Self: 0.0% (0us) | Total: 0.2% (62.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `animatedScene` (1)

### `append`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts:82` | Self: 0.0% (0us) | Total: 0.0% (888us) | Samples: 0

**Called by:**
- `prepareSceneGlbTrack` (1)

**Calls:**
- `reserve` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:22` | Self: 0.0% (0us) | Total: 0.6% (174.5ms) | Samples: 0

**Called by:**
- `evaluate` (14)

**Calls:**
- `makeSceneGlbFixture` (10)
- `makeSceneGlbFixture` (2)
- `makeSceneGlbFixture` (1)
- `makeSceneGlbFixture` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:26` | Self: 0.0% (0us) | Total: 1.2% (327.4ms) | Samples: 0

**Called by:**
- `Promise` (4)

**Calls:**
- `createWorker` (4)

### `animatedScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` | Self: 0.0% (0us) | Total: 0.2% (62.5ms) | Samples: 0

**Called by:**
- `makeSceneGlbFixture` (1)

**Calls:**
- `makeModel` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:84` | Self: 0.0% (0us) | Total: 0.8% (218.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `push` (1)

### `texture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts:101` | Self: 0.0% (0us) | Total: 0.0% (13.4ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `some` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:19` | Self: 0.0% (0us) | Total: 0.0% (15.8ms) | Samples: 0

**Called by:**
- `from` (1)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:188` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `Uint8Array` (1)

### `makeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:43` | Self: 0.0% (0us) | Total: 0.2% (62.5ms) | Samples: 0

**Called by:**
- `animatedScene` (1)

**Calls:**
- `paintedSkin` (1)

### `floats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\GlbBinary.ts:50` | Self: 0.0% (0us) | Total: 0.1% (30.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbAnimations` (1)
- `prepareSceneGlbGeometry` (1)

**Calls:**
- `every` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:111` | Self: 0.0% (0us) | Total: 0.0% (13.7ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `CryptoHasher` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:36` | Self: 0.0% (0us) | Total: 0.0% (964us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `next` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:23` | Self: 0.0% (0us) | Total: 0.6% (154.5ms) | Samples: 0

**Called by:**
- `evaluate` (19)

**Calls:**
- `readSceneDocument` (12)
- `readSceneDocument` (6)
- `readSceneDocument` (1)

### `encodePng`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\png.ts:55` | Self: 0.0% (0us) | Total: 0.5% (138.6ms) | Samples: 0

**Called by:**
- `texture` (8)

**Calls:**
- `zlibSync` (8)

### `readSceneGlbReply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts:197` | Self: 0.0% (0us) | Total: 1.7% (449.6ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `readBytes` (4)
- `readBytes` (1)
- `readBytes` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `entries` (1)

### `async prepareSceneGlbInWorker`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:16` | Self: 0.0% (0us) | Total: 37.5% (9.49s) | Samples: 0

**Called by:**
- `(module)` (171)

**Calls:**
- `runWorkerTask` (171)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts:25` | Self: 0.0% (0us) | Total: 2.4% (618.2ms) | Samples: 0

**Called by:**
- `evaluate` (64)

**Calls:**
- `encodeSceneGlb` (32)
- `encodeSceneGlb` (17)
- `encodeSceneGlb` (9)
- `encodeSceneGlb` (3)
- `encodeSceneGlb` (1)
- `encodeSceneGlb` (1)
- `encodeSceneGlb` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.1% (30.6ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `paintedSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:25` | Self: 0.0% (0us) | Total: 0.2% (62.5ms) | Samples: 0

**Called by:**
- `makeModel` (1)

**Calls:**
- `(anonymous)` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (98.6ms) | Samples: 0

**Called by:**
- `link` (6)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (6)
- `moduleDeclarationInstantiation` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` | Self: 0.0% (0us) | Total: 0.0% (17.7ms) | Samples: 0

**Called by:**
- `encodeSceneGlb` (3)

**Calls:**
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:334` | Self: 0.0% (0us) | Total: 0.0% (14.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `map` (1)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:15` | Self: 0.0% (0us) | Total: 0.0% (17.7ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `prepareSceneGlbHierarchy` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:74` | Self: 0.0% (0us) | Total: 36.2% (9.16s) | Samples: 0

**Called by:**
- `Promise` (167)

**Calls:**
- `postMessage` (167)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:328` | Self: 0.0% (0us) | Total: 0.2% (60.7ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `map` (6)

### `dflt`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:746` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `zlibSync` (1)

**Calls:**
- `wblk` (1)

### `zlibSync`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs:1486` | Self: 0.0% (0us) | Total: 0.5% (138.6ms) | Samples: 0

**Called by:**
- `encodePng` (8)

**Calls:**
- `dflt` (3)
- `dflt` (2)
- `dflt` (1)
- `dflt` (1)
- `dflt` (1)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:37` | Self: 0.0% (0us) | Total: 0.0% (976us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `makeSceneGridGeometry` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (39.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `parseModule` (4)
- `resolve` (1)

### `runWorkerTask`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\workerTask.ts:19` | Self: 0.0% (0us) | Total: 37.5% (9.49s) | Samples: 0

**Called by:**
- `async prepareSceneGlbInWorker` (171)

**Calls:**
- `Promise` (171)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:59` | Self: 0.0% (0us) | Total: 1.3% (337.1ms) | Samples: 0

**Called by:**
- `map` (32)

**Calls:**
- `get` (32)

### `encodeSceneGlb`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts:56` | Self: 0.0% (0us) | Total: 1.3% (337.1ms) | Samples: 0

**Called by:**
- `(module)` (32)

**Calls:**
- `map` (32)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.0% (14.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (15.4ms) | Samples: 0

**Called by:**
- `internal:util/inspect` (1)

**Calls:**
- `filter` (1)

### `async prepareSceneGlbInWorker`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlb.ts:17` | Self: 0.0% (0us) | Total: 17.2% (4.36s) | Samples: 0

**Called by:**
- `(module)` (40)

**Calls:**
- `packSceneGlbRequest` (40)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 77.4% | 19.58s | `[native code]` |
| 11.4% | 2.88s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 5.1% | 1.29s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbRequest.ts` |
| 1.8% | 464.0ms | `node:assert` |
| 1.6% | 418.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-worker.ts` |
| 0.7% | 185.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\composite.ts` |
| 0.5% | 138.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fflate@0.8.3\node_modules\fflate\esm\index.mjs` |
| 0.2% | 74.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.2% | 62.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts` |
| 0.2% | 61.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\workers\sceneGlbProtocol.ts` |
| 0.1% | 28.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\SceneGlbMaterials.ts` |
| 0.0% | 17.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 16.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readAnimation.ts` |
| 0.0% | 16.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlb.ts` |
| 0.0% | 15.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts` |
| 0.0% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.0% | 992us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 976us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneFixtures.ts` |
| 0.0% | 889us | `internal:util/colors` |
| 0.0% | 889us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbTrack.ts` |
