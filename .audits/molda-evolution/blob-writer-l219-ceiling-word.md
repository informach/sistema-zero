# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.18s | 381 | 1.0ms | 170 |

**Top 10:** `structuredClone` 47.9%, `Uint8Array` 13.9%, `digest` 13.6%, `sameScenePixelBytes` 9.7%, `update` 1.9%, `gc` 1.7%, `structuredBytes` 1.0%, `deepEquals` 1.0%, `store` 0.7%, `(anonymous)` 0.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 47.9% | 2.00s | 47.9% | 2.00s | `structuredClone` | `[native code]` |
| 13.9% | 583.9ms | 13.9% | 583.9ms | `Uint8Array` | `[native code]` |
| 13.6% | 572.3ms | 13.6% | 572.3ms | `digest` | `[native code]` |
| 9.7% | 409.4ms | 9.7% | 409.4ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` |
| 1.9% | 80.2ms | 1.9% | 80.2ms | `update` | `[native code]` |
| 1.7% | 72.3ms | 1.7% | 72.3ms | `gc` | `[native code]` |
| 1.0% | 45.2ms | 1.0% | 45.2ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 1.0% | 43.4ms | 1.0% | 43.4ms | `deepEquals` | `[native code]` |
| 0.7% | 31.3ms | 0.7% | 31.3ms | `store` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.7% | 31.3ms | 0.7% | 31.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:33` |
| 0.7% | 30.6ms | 0.7% | 30.6ms | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js` |
| 0.7% | 30.3ms | 0.7% | 30.3ms | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:48` |
| 0.6% | 28.9ms | 0.6% | 28.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.4% | 16.8ms | 0.4% | 16.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.4% | 16.8ms | 0.4% | 16.8ms | `resolve` | `[native code]` |
| 0.3% | 16.0ms | 27.6% | 1.15s | `map` | `[native code]` |
| 0.3% | 15.9ms | 51.4% | 2.15s | `(anonymous)` | `[native code]` |
| 0.3% | 15.6ms | 0.7% | 30.9ms | `parseModule` | `[native code]` |
| 0.3% | 15.6ms | 2.1% | 91.3ms | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` |
| 0.3% | 15.3ms | 0.3% | 15.3ms | `internal:promisify` | `internal:promisify:49` |
| 0.3% | 14.2ms | 0.3% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:56` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `stringify` | `[native code]` |
| 0.3% | 12.9ms | 10.3% | 434.9ms | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` |
| 0.2% | 11.1ms | 0.2% | 11.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:182` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `fetch` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 2.1ms | 0.2% | 11.0ms | `requestInstantiate` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:22` |
| 0.0% | 997us | 0.0% | 997us | `getRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:161` |
| 0.0% | 987us | 0.0% | 987us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 980us | 0.0% | 980us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:23` |
| 0.0% | 920us | 0.0% | 920us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:65` |
| 0.0% | 881us | 0.0% | 881us | `push` | `[native code]` |
| 0.0% | 856us | 0.0% | 856us | `BroadcastChannel` | `[native code]` |
| 0.0% | 856us | 0.0% | 856us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.0% | 852us | 0.0% | 852us | `flatMap` | `[native code]` |
| 0.0% | 841us | 0.0% | 841us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:89` |
| 0.0% | 840us | 1.1% | 47.7ms | `from` | `[native code]` |
| 0.0% | 839us | 0.7% | 32.1ms | `Promise` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 51.4% | 2.15s | 0.3% | 15.9ms | `(anonymous)` | `[native code]` |
| 50.8% | 2.12s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 47.9% | 2.00s | 47.9% | 2.00s | `structuredClone` | `[native code]` |
| 35.3% | 1.47s | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` |
| 34.5% | 1.44s | 0.0% | 0us | `bound _iterate` | `[native code]` |
| 34.5% | 1.44s | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` |
| 27.6% | 1.15s | 0.3% | 16.0ms | `map` | `[native code]` |
| 22.0% | 923.5ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 22.0% | 923.5ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 13.9% | 583.9ms | 13.9% | 583.9ms | `Uint8Array` | `[native code]` |
| 13.6% | 572.3ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:78` |
| 13.6% | 572.3ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:87` |
| 13.6% | 572.3ms | 13.6% | 572.3ms | `digest` | `[native code]` |
| 13.0% | 547.8ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 13.0% | 547.7ms | 0.0% | 0us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` |
| 13.0% | 547.7ms | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` |
| 13.0% | 547.7ms | 0.0% | 0us | `invoke` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` |
| 12.2% | 510.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` |
| 11.9% | 500.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` |
| 11.9% | 499.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` |
| 10.8% | 452.3ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 10.3% | 434.9ms | 0.3% | 12.9ms | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` |
| 10.1% | 424.9ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` |
| 10.0% | 422.0ms | 0.0% | 0us | `readSceneImageStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` |
| 10.0% | 422.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` |
| 9.8% | 410.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 9.7% | 409.4ms | 0.0% | 0us | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 9.7% | 409.4ms | 9.7% | 409.4ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` |
| 7.9% | 332.8ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:186` |
| 6.5% | 273.3ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` |
| 6.5% | 273.3ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` |
| 6.5% | 273.3ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:163` |
| 5.1% | 216.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` |
| 5.1% | 216.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` |
| 5.1% | 216.4ms | 0.0% | 0us | `some` | `[native code]` |
| 4.6% | 192.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` |
| 4.4% | 186.1ms | 0.0% | 0us | `async inspectSceneBlobRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` |
| 4.4% | 186.1ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` |
| 4.1% | 173.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` |
| 4.1% | 173.0ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` |
| 3.5% | 147.3ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:127` |
| 3.3% | 141.8ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` |
| 3.3% | 141.8ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:106` |
| 3.3% | 141.8ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` |
| 2.7% | 114.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` |
| 2.6% | 109.6ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` |
| 2.6% | 109.2ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` |
| 2.1% | 91.3ms | 0.3% | 15.6ms | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` |
| 2.1% | 91.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` |
| 1.9% | 80.2ms | 1.9% | 80.2ms | `update` | `[native code]` |
| 1.8% | 76.5ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 1.8% | 75.8ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` |
| 1.8% | 75.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` |
| 1.7% | 72.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` |
| 1.7% | 72.3ms | 1.7% | 72.3ms | `gc` | `[native code]` |
| 1.5% | 65.5ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.5% | 63.7ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` |
| 1.4% | 62.6ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:70` |
| 1.4% | 62.6ms | 0.0% | 0us | `put` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` |
| 1.4% | 59.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` |
| 1.1% | 47.7ms | 0.0% | 840us | `from` | `[native code]` |
| 1.1% | 47.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` |
| 1.1% | 47.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` |
| 1.1% | 47.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` |
| 1.1% | 46.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` |
| 1.1% | 46.9ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` |
| 1.1% | 46.7ms | 0.0% | 0us | `generatorResume` | `[native code]` |
| 1.1% | 46.3ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` |
| 1.0% | 45.2ms | 1.0% | 45.2ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 1.0% | 45.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:116` |
| 1.0% | 43.4ms | 1.0% | 43.4ms | `deepEquals` | `[native code]` |
| 1.0% | 43.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` |
| 0.7% | 32.1ms | 0.0% | 839us | `Promise` | `[native code]` |
| 0.7% | 31.9ms | 0.0% | 0us | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` |
| 0.7% | 31.9ms | 0.0% | 0us | `cloneValueForInsertion` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` |
| 0.7% | 31.3ms | 0.7% | 31.3ms | `store` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.7% | 31.3ms | 0.0% | 0us | `async store` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:15` |
| 0.7% | 31.3ms | 0.7% | 31.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:33` |
| 0.7% | 31.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:29` |
| 0.7% | 30.9ms | 0.3% | 15.6ms | `parseModule` | `[native code]` |
| 0.7% | 30.6ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:113` |
| 0.7% | 30.6ms | 0.7% | 30.6ms | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js` |
| 0.7% | 30.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` |
| 0.7% | 30.3ms | 0.7% | 30.3ms | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:48` |
| 0.6% | 28.9ms | 0.6% | 28.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.4% | 16.8ms | 0.4% | 16.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.4% | 16.8ms | 0.4% | 16.8ms | `resolve` | `[native code]` |
| 0.4% | 16.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` |
| 0.3% | 16.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` |
| 0.3% | 16.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:187` |
| 0.3% | 16.0ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` |
| 0.3% | 16.0ms | 0.0% | 0us | `readSurfaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:182` |
| 0.3% | 16.0ms | 0.0% | 0us | `uv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:33` |
| 0.3% | 15.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` |
| 0.3% | 15.5ms | 0.0% | 0us | `_getRecordsForNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:168` |
| 0.3% | 15.5ms | 0.0% | 0us | `valueToKey` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` |
| 0.3% | 15.5ms | 0.0% | 0us | `getRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` |
| 0.3% | 15.5ms | 0.0% | 0us | `cmp` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:27` |
| 0.3% | 15.5ms | 0.0% | 0us | `performIteration` | `[native code]` |
| 0.3% | 15.5ms | 0.0% | 0us | `delete` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:24` |
| 0.3% | 15.5ms | 0.0% | 0us | `_findRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:183` |
| 0.3% | 15.5ms | 0.0% | 0us | `deleteRecord` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:197` |
| 0.3% | 15.5ms | 0.0% | 0us | `bound deleteRecord` | `[native code]` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` |
| 0.3% | 15.5ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` |
| 0.3% | 15.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` |
| 0.3% | 15.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.3% | 15.3ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.3% | 15.3ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.3% | 15.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.3% | 15.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.3% | 15.3ms | 0.3% | 15.3ms | `internal:promisify` | `internal:promisify:49` |
| 0.3% | 15.3ms | 0.0% | 0us | `node:fs` | `node:fs:307` |
| 0.3% | 15.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.3% | 15.3ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.3% | 15.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.3% | 15.0ms | 0.0% | 0us | `getAllValues` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` |
| 0.3% | 15.0ms | 0.0% | 0us | `bound getAllValues` | `[native code]` |
| 0.3% | 14.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` |
| 0.3% | 14.6ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` |
| 0.3% | 14.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` |
| 0.3% | 14.2ms | 0.3% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:56` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.3% | 13.8ms | 0.0% | 0us | `readSceneMaterial` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:109` |
| 0.3% | 13.8ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:80` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `stringify` | `[native code]` |
| 0.3% | 13.0ms | 0.0% | 0us | `makeSceneAtlasDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAtlasFixture.ts:7` |
| 0.3% | 13.0ms | 0.0% | 0us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` |
| 0.3% | 13.0ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:46` |
| 0.3% | 12.9ms | 0.0% | 0us | `link` | `[native code]` |
| 0.3% | 12.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:162` |
| 0.3% | 12.9ms | 0.0% | 0us | `readSceneStorageManifest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:77` |
| 0.3% | 12.9ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:168` |
| 0.2% | 11.1ms | 0.2% | 11.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:182` |
| 0.2% | 11.0ms | 0.0% | 2.1ms | `requestInstantiate` | `[native code]` |
| 0.2% | 11.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `fetch` | `[native code]` |
| 0.2% | 8.8ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.1% | 7.7ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.1% | 4.2ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 3.4ms | 0.0% | 3.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.0% | 2.1ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:22` |
| 0.0% | 997us | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` |
| 0.0% | 997us | 0.0% | 0us | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:48` |
| 0.0% | 997us | 0.0% | 997us | `getRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:161` |
| 0.0% | 987us | 0.0% | 987us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 980us | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:95` |
| 0.0% | 980us | 0.0% | 980us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:23` |
| 0.0% | 920us | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 0.0% | 920us | 0.0% | 920us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:65` |
| 0.0% | 881us | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:231` |
| 0.0% | 881us | 0.0% | 881us | `push` | `[native code]` |
| 0.0% | 881us | 0.0% | 0us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:18` |
| 0.0% | 856us | 0.0% | 0us | `open` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:26` |
| 0.0% | 856us | 0.0% | 856us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.0% | 856us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:123` |
| 0.0% | 856us | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` |
| 0.0% | 856us | 0.0% | 0us | `notifySceneStorageCommit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:62` |
| 0.0% | 856us | 0.0% | 856us | `BroadcastChannel` | `[native code]` |
| 0.0% | 852us | 0.0% | 852us | `flatMap` | `[native code]` |
| 0.0% | 852us | 0.0% | 0us | `readSceneMaterial` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:140` |
| 0.0% | 841us | 0.0% | 841us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:89` |
| 0.0% | 840us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` |
| 0.0% | 840us | 0.0% | 0us | `waitForOthersClosed` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` |
| 0.0% | 839us | 0.0% | 0us | `async nativeDatabase` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:5` |
| 0.0% | 839us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:157` |
| 0.0% | 839us | 0.0% | 0us | `async nativeDatabase` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:10` |

## Function Details

### `structuredClone`
`[native code]` | Self: 47.9% (2.00s) | Total: 47.9% (2.00s) | Samples: 170

**Called by:**
- `_iterate` (121)
- `(module)` (43)
- `cloneValueForInsertion` (5)
- `getAllValues` (1)

### `Uint8Array`
`[native code]` | Self: 13.9% (583.9ms) | Total: 13.9% (583.9ms) | Samples: 58

**Called by:**
- `(anonymous)` (44)
- `(anonymous)` (14)

### `digest`
`[native code]` | Self: 13.6% (572.3ms) | Total: 13.6% (572.3ms) | Samples: 36

**Called by:**
- `async scenePixelHash` (36)

### `sameScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` | Self: 9.7% (409.4ms) | Total: 9.7% (409.4ms) | Samples: 46

**Called by:**
- `sameSceneStoredValue` (46)

### `update`
`[native code]` | Self: 1.9% (80.2ms) | Total: 1.9% (80.2ms) | Samples: 10

**Called by:**
- `digest` (8)
- `(module)` (2)

### `gc`
`[native code]` | Self: 1.7% (72.3ms) | Total: 1.7% (72.3ms) | Samples: 14

**Called by:**
- `(module)` (14)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` | Self: 1.0% (45.2ms) | Total: 1.0% (45.2ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `deepEquals`
`[native code]` | Self: 1.0% (43.4ms) | Total: 1.0% (43.4ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `store`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.7% (31.3ms) | Total: 0.7% (31.3ms) | Samples: 1

**Called by:**
- `async mutateSceneBlobStorage` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:33` | Self: 0.7% (31.3ms) | Total: 0.7% (31.3ms) | Samples: 1

**Called by:**
- `Promise` (1)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js` | Self: 0.7% (30.6ms) | Total: 0.7% (30.6ms) | Samples: 1

**Called by:**
- `put` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:48` | Self: 0.7% (30.3ms) | Total: 0.7% (30.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.6% (28.9ms) | Total: 0.6% (28.9ms) | Samples: 4

**Called by:**
- `from` (3)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` | Self: 0.4% (16.8ms) | Total: 0.4% (16.8ms) | Samples: 2

**Called by:**
- `from` (2)

### `resolve`
`[native code]` | Self: 0.4% (16.8ms) | Total: 0.4% (16.8ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `map`
`[native code]` | Self: 0.3% (16.0ms) | Total: 27.6% (1.15s) | Samples: 1

**Called by:**
- `readSceneImageStructure` (45)
- `readSceneDocumentStructure` (45)
- `async hydrateSceneStorage` (14)
- `fixture` (6)
- `readSceneDocumentStructure` (2)
- `readSceneDocumentStructure` (2)
- `readSurfaces` (1)
- `uv` (1)

**Calls:**
- `readSceneImageStructure` (45)
- `(anonymous)` (45)
- `(anonymous)` (14)
- `(anonymous)` (6)
- `readSceneGeometry` (1)
- `readSceneMaterial` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `readSceneMaterial` (1)

### `(anonymous)`
`[native code]` | Self: 0.3% (15.9ms) | Total: 51.4% (2.15s) | Samples: 1

**Called by:**
- `processTicksAndRejections` (191)
- `refresh` (1)

**Calls:**
- `async asyncModuleEvaluation` (105)
- `async hydrateSceneStorage` (27)
- `async hydrateSceneStorage` (21)
- `async mutateSceneBlobStorage` (13)
- `async prepareSceneStorage` (9)
- `async inspectSnapshot` (6)
- `async (anonymous)` (3)
- `async loadAndEvaluateModule` (3)
- `async mutateSceneBlobStorage` (2)
- `requestSatisfyUtil` (1)
- `async inspectSnapshot` (1)
- `anonymous` (1)

### `parseModule`
`[native code]` | Self: 0.3% (15.6ms) | Total: 0.7% (30.9ms) | Samples: 1

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `node:assert/strict` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` | Self: 0.3% (15.6ms) | Total: 2.1% (91.3ms) | Samples: 1

**Called by:**
- `collectUnreferencedSceneBlobs` (7)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (7)

### `valueToKeyWithoutThrowing`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` | Self: 0.3% (15.5ms) | Total: 0.3% (15.5ms) | Samples: 3

**Called by:**
- `valueToKey` (3)

### `internal:promisify`
`internal:promisify:49` | Self: 0.3% (15.3ms) | Total: 0.3% (15.3ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:56` | Self: 0.3% (14.2ms) | Total: 0.3% (14.2ms) | Samples: 1

**Called by:**
- `from` (1)

### `choice`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` | Self: 0.3% (13.8ms) | Total: 0.3% (13.8ms) | Samples: 1

**Called by:**
- `readSceneMaterial` (1)

### `stringify`
`[native code]` | Self: 0.3% (13.8ms) | Total: 0.3% (13.8ms) | Samples: 1

**Called by:**
- `digest` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` | Self: 0.3% (12.9ms) | Total: 10.3% (434.9ms) | Samples: 1

**Called by:**
- `readSceneDocument` (45)
- `readSceneStorageManifest` (1)

**Calls:**
- `map` (45)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:182` | Self: 0.2% (11.1ms) | Total: 0.2% (11.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `fetch`
`[native code]` | Self: 0.2% (8.8ms) | Total: 0.2% (8.8ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (3.4ms) | Total: 0.0% (3.4ms) | Samples: 3

**Called by:**
- `link` (3)

### `requestInstantiate`
`[native code]` | Self: 0.0% (2.1ms) | Total: 0.2% (11.0ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (2)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:22` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

### `getRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:161` | Self: 0.0% (997us) | Total: 0.0% (997us) | Samples: 1

**Called by:**
- `values` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` | Self: 0.0% (987us) | Total: 0.0% (987us) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:23` | Self: 0.0% (980us) | Total: 0.0% (980us) | Samples: 1

**Called by:**
- `dispatchEvent` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:65` | Self: 0.0% (920us) | Total: 0.0% (920us) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `push`
`[native code]` | Self: 0.0% (881us) | Total: 0.0% (881us) | Samples: 1

**Called by:**
- `structuredBytes` (1)

### `BroadcastChannel`
`[native code]` | Self: 0.0% (856us) | Total: 0.0% (856us) | Samples: 1

**Called by:**
- `open` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` | Self: 0.0% (856us) | Total: 0.0% (856us) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `flatMap`
`[native code]` | Self: 0.0% (852us) | Total: 0.0% (852us) | Samples: 1

**Called by:**
- `readSceneMaterial` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:89` | Self: 0.0% (841us) | Total: 0.0% (841us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `from`
`[native code]` | Self: 0.0% (840us) | Total: 1.1% (47.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (6)
- `waitForOthersClosed` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `Promise`
`[native code]` | Self: 0.0% (839us) | Total: 0.7% (32.1ms) | Samples: 1

**Called by:**
- `async nativeDatabase` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `collectRecords` (1)

### `readSurfaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:182` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `readSceneGeometry` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:123` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `invoke` (1)

**Calls:**
- `notifySceneStorageCommit` (1)

### `values`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:48` | Self: 0.0% (0us) | Total: 0.0% (997us) | Samples: 0

**Called by:**
- `_iterate` (1)

**Calls:**
- `getRecords` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` | Self: 0.0% (0us) | Total: 1.1% (46.9ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `from` (6)

### `performIteration`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `delete` (3)

**Calls:**
- `generatorResume` (3)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `link` (9)
- `linkAndEvaluateModule` (3)

**Calls:**
- `link` (9)
- `moduleDeclarationInstantiation` (3)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:70` | Self: 0.0% (0us) | Total: 1.4% (62.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `async store` (1)
- `store` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.5% (65.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `resolve` (2)
- `parseModule` (2)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` | Self: 0.0% (0us) | Total: 0.7% (31.9ms) | Samples: 0

**Called by:**
- `put` (5)

**Calls:**
- `cloneValueForInsertion` (5)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` | Self: 0.0% (0us) | Total: 1.1% (47.0ms) | Samples: 0

**Called by:**
- `collectRecords` (5)

**Calls:**
- `collectRecords` (5)

### `delete`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:24` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `deleteRecord` (3)

**Calls:**
- `performIteration` (3)

### `bound getAllValues`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `getAllValues` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:29` | Self: 0.0% (0us) | Total: 0.7% (31.3ms) | Samples: 0

**Called by:**
- `async store` (1)

**Calls:**
- `Promise` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (8.8ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` | Self: 0.0% (0us) | Total: 0.0% (920us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 22.0% (923.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (105)

**Calls:**
- `evaluate` (105)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` | Self: 0.0% (0us) | Total: 10.1% (424.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)
- `async hydrateSceneStorage` (4)

**Calls:**
- `async scenePixelHash` (25)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` | Self: 0.0% (0us) | Total: 2.6% (109.2ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (19)

**Calls:**
- `readSceneDocument` (18)
- `readSceneDocument` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` | Self: 0.0% (0us) | Total: 35.3% (1.47s) | Samples: 0

**Calls:**
- `bound _iterate` (122)
- `bound deleteRecord` (3)
- `bound getAllValues` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` | Self: 0.0% (0us) | Total: 10.0% (422.0ms) | Samples: 0

**Called by:**
- `map` (45)

**Calls:**
- `(anonymous)` (44)
- `(anonymous)` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` | Self: 0.0% (0us) | Total: 13.0% (547.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `dispatchEvent` (57)
- `dispatchEvent` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` | Self: 0.0% (0us) | Total: 1.1% (47.0ms) | Samples: 0

**Called by:**
- `invoke` (5)

**Calls:**
- `collectRecords` (5)

### `_findRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:183` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `cmp` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` | Self: 0.0% (0us) | Total: 0.4% (16.7ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `digest` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` | Self: 0.0% (0us) | Total: 12.2% (510.9ms) | Samples: 0

**Called by:**
- `evaluate` (43)

**Calls:**
- `structuredClone` (43)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:106` | Self: 0.0% (0us) | Total: 3.3% (141.8ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (24)

**Calls:**
- `async prepareSceneStorage` (19)
- `async prepareSceneStorage` (3)
- `async prepareSceneStorage` (2)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:95` | Self: 0.0% (0us) | Total: 0.0% (980us) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `invokeEventListeners` (1)

### `invoke`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` | Self: 0.0% (0us) | Total: 13.0% (547.7ms) | Samples: 0

**Called by:**
- `invokeEventListeners` (58)

**Calls:**
- `(anonymous)` (52)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` | Self: 0.0% (0us) | Total: 0.7% (30.4ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `digest` (4)
- `digest` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:46` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `makeSceneAtlasDocument` (3)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:231` | Self: 0.0% (0us) | Total: 0.0% (881us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `deleteRecord`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:197` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `bound deleteRecord` (3)

**Calls:**
- `delete` (3)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (3)

**Calls:**
- `link` (3)

### `bound _iterate`
`[native code]` | Self: 0.0% (0us) | Total: 34.5% (1.44s) | Samples: 0

**Called by:**
- `_start` (122)

**Calls:**
- `_iterate` (121)
- `_iterate` (1)

### `notifySceneStorageCommit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:62` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `open` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Called by:**
- `migrateLegacyModel` (2)
- `async prepareSceneStorage` (1)

**Calls:**
- `sceneBounds` (1)
- `indexSceneDocument` (1)
- `sceneBounds` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (7.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `linkAndEvaluateModule` (3)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `open`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:26` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `notifySceneStorageCommit` (1)

**Calls:**
- `BroadcastChannel` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:163` | Self: 0.0% (0us) | Total: 6.5% (273.3ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (19)

**Calls:**
- `async hydrateSceneStorage` (14)
- `async hydrateSceneStorage` (4)
- `async hydrateSceneStorage` (1)

### `generatorResume`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (46.7ms) | Samples: 0

**Called by:**
- `getRecords` (3)
- `performIteration` (3)
- `_getRecordsForNode` (3)

**Calls:**
- `getRecords` (3)
- `_getRecordsForNode` (3)
- `_findRecords` (3)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `readSurfaces` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` | Self: 0.0% (0us) | Total: 0.3% (14.6ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (2)

**Calls:**
- `map` (2)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` | Self: 0.0% (0us) | Total: 1.1% (46.3ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)
- `readSceneDocument` (1)

**Calls:**
- `map` (2)

### `cmp`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:27` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `_findRecords` (3)

**Calls:**
- `valueToKey` (3)

### `async store`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:15` | Self: 0.0% (0us) | Total: 0.7% (31.3ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (1)

**Calls:**
- `(anonymous)` (1)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` | Self: 0.0% (0us) | Total: 6.5% (273.3ms) | Samples: 0

**Called by:**
- `async inspectSceneBlobRecords` (13)
- `(anonymous)` (6)

**Calls:**
- `async inspectSnapshot` (19)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` | Self: 0.0% (0us) | Total: 0.0% (997us) | Samples: 0

**Called by:**
- `bound _iterate` (1)

**Calls:**
- `values` (1)

### `getAllValues`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `bound getAllValues` (1)

**Calls:**
- `structuredClone` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` | Self: 0.0% (0us) | Total: 1.1% (46.9ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `map` (6)

### `valueToKey`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `cmp` (3)

**Calls:**
- `valueToKeyWithoutThrowing` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` | Self: 0.0% (0us) | Total: 0.3% (15.9ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` | Self: 0.0% (0us) | Total: 9.7% (409.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (25)
- `(anonymous)` (21)

**Calls:**
- `sameScenePixelBytes` (46)

### `readSceneMaterial`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:109` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `choice` (1)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 1.8% (76.5ms) | Samples: 0

**Called by:**
- `internal:assert/assertion_error` (1)
- `(anonymous)` (1)
- `loadAssertionError` (1)
- `node:assert/strict` (1)
- `node:fs` (1)

**Calls:**
- `node:assert` (1)
- `internal:assert/assertion_error` (1)
- `internal:promisify` (1)
- `internal:util/colors` (1)
- `node:fs` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` | Self: 0.0% (0us) | Total: 11.9% (499.8ms) | Samples: 0

**Called by:**
- `invoke` (52)

**Calls:**
- `(anonymous)` (49)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:168` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (1)

**Calls:**
- `readSceneStorageManifest` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:113` | Self: 0.0% (0us) | Total: 0.7% (30.6ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (3)

**Calls:**
- `readSceneDocumentStructure` (2)
- `readSceneDocumentStructure` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` | Self: 0.0% (0us) | Total: 2.1% (91.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (8)

**Calls:**
- `collectUnreferencedSceneBlobs` (7)
- `collectUnreferencedSceneBlobs` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` | Self: 0.0% (0us) | Total: 4.6% (192.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (25)

**Calls:**
- `sameSceneStoredValue` (25)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` | Self: 0.0% (0us) | Total: 0.3% (14.7ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `async mutateSceneBlobStorage` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` | Self: 0.0% (0us) | Total: 0.0% (840us) | Samples: 0

**Calls:**
- `waitForOthersClosed` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 5.1% (216.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `(anonymous)` (21)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:80` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `stringify` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:157` | Self: 0.0% (0us) | Total: 0.0% (839us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async nativeDatabase` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:87` | Self: 0.0% (0us) | Total: 13.6% (572.3ms) | Samples: 0

**Called by:**
- `async scenePixelHash` (36)

**Calls:**
- `digest` (36)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` | Self: 0.0% (0us) | Total: 4.1% (173.0ms) | Samples: 0

**Called by:**
- `map` (14)

**Calls:**
- `Uint8Array` (14)

### `readSceneStorageManifest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:77` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (1)

**Calls:**
- `readSceneDocumentStructure` (1)

### `async inspectSceneBlobRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` | Self: 0.0% (0us) | Total: 4.4% (186.1ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (13)

**Calls:**
- `async inspectSnapshot` (13)

### `cloneValueForInsertion`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` | Self: 0.0% (0us) | Total: 0.7% (31.9ms) | Samples: 0

**Called by:**
- `buildRecordAddPut` (5)

**Calls:**
- `structuredClone` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` | Self: 0.0% (0us) | Total: 5.1% (216.4ms) | Samples: 0

**Called by:**
- `some` (21)

**Calls:**
- `sameSceneStoredValue` (21)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:127` | Self: 0.0% (0us) | Total: 3.5% (147.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)
- `async prepareSceneStorage` (2)

**Calls:**
- `async scenePixelHash` (11)

### `async nativeDatabase`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:5` | Self: 0.0% (0us) | Total: 0.0% (839us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async nativeDatabase` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `assign` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `collectRecords` (1)

**Calls:**
- `finish` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` | Self: 0.0% (0us) | Total: 1.8% (75.7ms) | Samples: 0

**Called by:**
- `finish` (7)

**Calls:**
- `put` (6)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:162` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `async mutateSceneBlobStorage` (2)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Called by:**
- `makeSceneAtlasDocument` (3)

**Calls:**
- `readSceneDocument` (2)
- `readSceneDocument` (1)

### `async nativeDatabase`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:10` | Self: 0.0% (0us) | Total: 0.0% (839us) | Samples: 0

**Called by:**
- `async nativeDatabase` (1)

**Calls:**
- `Promise` (1)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` | Self: 0.0% (0us) | Total: 3.3% (141.8ms) | Samples: 0

**Called by:**
- `(module)` (20)
- `(module)` (2)
- `(module)` (2)

**Calls:**
- `async mutateSceneBlobStorage` (24)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` | Self: 0.0% (0us) | Total: 4.4% (186.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)

**Calls:**
- `async inspectSceneBlobRecords` (13)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` | Self: 0.0% (0us) | Total: 0.3% (14.3ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:78` | Self: 0.0% (0us) | Total: 13.6% (572.3ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (25)
- `async prepareSceneStorage` (11)

**Calls:**
- `async scenePixelHash` (36)

### `put`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` | Self: 0.0% (0us) | Total: 1.4% (62.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `buildRecordAddPut` (5)
- `buildRecordAddPut` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` | Self: 0.0% (0us) | Total: 1.7% (72.3ms) | Samples: 0

**Called by:**
- `evaluate` (14)

**Calls:**
- `gc` (14)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (4.2ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` | Self: 0.0% (0us) | Total: 5.1% (216.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `some` (21)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (11.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (2)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 10.8% (452.3ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (27)
- `async prepareSceneStorage` (18)
- `migrateLegacyModel` (1)

**Calls:**
- `readSceneDocumentStructure` (45)
- `readSceneDocumentStructure` (1)

### `makeSceneAtlasDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAtlasFixture.ts:7` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Called by:**
- `fixture` (3)

**Calls:**
- `migrateLegacyModel` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` | Self: 0.0% (0us) | Total: 2.7% (114.1ms) | Samples: 0

**Called by:**
- `evaluate` (20)

**Calls:**
- `async mutateSceneBlobStorage` (20)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` | Self: 0.0% (0us) | Total: 4.1% (173.0ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (14)

**Calls:**
- `map` (14)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` | Self: 0.0% (0us) | Total: 2.6% (109.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `(anonymous)` (5)
- `collectUnreferencedSceneBlobs` (1)

**Calls:**
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `getRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `generatorResume` (3)

### `readSceneImageStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` | Self: 0.0% (0us) | Total: 10.0% (422.0ms) | Samples: 0

**Called by:**
- `map` (45)

**Calls:**
- `map` (45)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 50.8% (2.12s) | Samples: 0

**Calls:**
- `(anonymous)` (191)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` | Self: 0.0% (0us) | Total: 3.3% (141.8ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (24)

**Calls:**
- `async prepareSceneStorage` (24)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` | Self: 0.0% (0us) | Total: 1.8% (75.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `finish` (7)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 9.8% (410.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (44)

**Calls:**
- `Uint8Array` (44)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` | Self: 0.0% (0us) | Total: 11.9% (500.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (49)
- `collectRecords` (5)

**Calls:**
- `(anonymous)` (25)
- `(anonymous)` (21)
- `(anonymous)` (8)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` | Self: 0.0% (0us) | Total: 13.0% (547.7ms) | Samples: 0

**Called by:**
- `_start` (57)
- `_start` (1)

**Calls:**
- `invokeEventListeners` (58)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` | Self: 0.0% (0us) | Total: 1.4% (59.9ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `fixture` (6)
- `fixture` (3)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` | Self: 0.0% (0us) | Total: 6.5% (273.3ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (19)

**Calls:**
- `async hydrateSceneStorage` (19)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:187` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `uv` (1)

### `waitForOthersClosed`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` | Self: 0.0% (0us) | Total: 0.0% (840us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `from` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` | Self: 0.0% (0us) | Total: 13.0% (547.7ms) | Samples: 0

**Called by:**
- `dispatchEvent` (58)

**Calls:**
- `invoke` (58)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` | Self: 0.0% (0us) | Total: 1.5% (63.7ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `update` (8)

### `uv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:33` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `_getRecordsForNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:168` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `generatorResume` (3)

**Calls:**
- `generatorResume` (3)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:18` | Self: 0.0% (0us) | Total: 0.0% (881us) | Samples: 0

**Called by:**
- `async inspectSnapshot` (1)

**Calls:**
- `push` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` | Self: 0.0% (0us) | Total: 1.0% (43.4ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `deepEquals` (3)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Calls:**
- `dispatchEvent` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` | Self: 0.0% (0us) | Total: 1.1% (47.0ms) | Samples: 0

**Calls:**
- `_start` (5)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` | Self: 0.0% (0us) | Total: 34.5% (1.44s) | Samples: 0

**Called by:**
- `bound _iterate` (121)

**Calls:**
- `structuredClone` (121)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` | Self: 0.0% (0us) | Total: 0.3% (16.5ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `update` (2)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 22.0% (923.5ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (105)

**Calls:**
- `(module)` (43)
- `(module)` (20)
- `(module)` (14)
- `(module)` (9)
- `(module)` (5)
- `(module)` (3)
- `(module)` (2)
- `(module)` (2)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `node:fs`
`node:fs:307` | Self: 0.0% (0us) | Total: 0.3% (15.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:116` | Self: 0.0% (0us) | Total: 1.0% (45.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `structuredBytes` (2)

### `readSceneMaterial`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:140` | Self: 0.0% (0us) | Total: 0.0% (852us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `flatMap` (1)

### `bound deleteRecord`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `_start` (3)

**Calls:**
- `deleteRecord` (3)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:186` | Self: 0.0% (0us) | Total: 7.9% (332.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (27)

**Calls:**
- `readSceneDocument` (27)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 82.5% | 3.45s | `[native code]` |
| 9.7% | 409.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` |
| 2.1% | 91.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 1.0% | 45.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts` |
| 0.7% | 31.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts` |
| 0.7% | 30.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js` |
| 0.7% | 30.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.5% | 24.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.3% | 15.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts` |
| 0.3% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js` |
| 0.3% | 15.3ms | `internal:promisify` |
| 0.3% | 13.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.1ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js` |
| 0.0% | 997us | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js` |
| 0.0% | 987us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 980us | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js` |
| 0.0% | 920us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.0% | 856us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.0% | 841us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts` |
