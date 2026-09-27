# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.22s | 433 | 1.0ms | 174 |

**Top 10:** `every` 48.5%, `(anonymous)` 29.6%, `structuredClone` 4.3%, `gc` 2.3%, `sameSceneStoredValue` 1.9%, `Uint8Array` 1.8%, `_start` 1.1%, `entries` 1.1%, `digest` 0.8%, `record` 0.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 48.5% | 2.05s | 78.1% | 3.30s | `every` | `[native code]` |
| 29.6% | 1.25s | 29.6% | 1.25s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:131` |
| 4.3% | 184.7ms | 4.3% | 184.7ms | `structuredClone` | `[native code]` |
| 2.3% | 97.6ms | 2.3% | 97.6ms | `gc` | `[native code]` |
| 1.9% | 82.8ms | 1.9% | 82.8ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` |
| 1.8% | 79.8ms | 1.8% | 79.8ms | `Uint8Array` | `[native code]` |
| 1.1% | 49.7ms | 1.1% | 49.7ms | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:202` |
| 1.1% | 47.3ms | 1.1% | 47.3ms | `entries` | `[native code]` |
| 0.8% | 35.4ms | 0.8% | 35.4ms | `digest` | `[native code]` |
| 0.7% | 31.1ms | 0.7% | 31.1ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.7% | 31.0ms | 0.7% | 31.0ms | `readSceneSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts` |
| 0.6% | 28.5ms | 4.5% | 190.1ms | `anonymous` | `[native code]` |
| 0.6% | 25.5ms | 0.6% | 25.5ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 0.4% | 19.3ms | 1.1% | 49.5ms | `from` | `[native code]` |
| 0.3% | 16.3ms | 0.3% | 16.3ms | `update` | `[native code]` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `resolve` | `[native code]` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `palette` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:255` |
| 0.3% | 15.3ms | 0.3% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.3% | 15.1ms | 0.3% | 15.1ms | `set result` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBRequest.js:27` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:37` |
| 0.3% | 14.9ms | 0.3% | 14.9ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:72` |
| 0.3% | 14.8ms | 0.3% | 14.8ms | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 0.3% | 14.7ms | 0.3% | 14.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.3% | 14.1ms | 0.3% | 14.1ms | `observe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:15` |
| 0.3% | 12.7ms | 1.0% | 42.3ms | `parseModule` | `[native code]` |
| 0.2% | 10.9ms | 0.2% | 10.9ms | `isMoldaAssetId` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\id.ts:7` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `requestInstantiate` | `[native code]` |
| 0.0% | 1.9ms | 1.1% | 49.3ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `FDBRequest` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `storeRecord` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:171` |
| 0.0% | 1.0ms | 0.0% | 3.0ms | `link` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hideFromStack` | `internal:shared` |
| 0.0% | 985us | 0.0% | 985us | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:23` |
| 0.0% | 984us | 0.0% | 984us | `ensureRegistered` | `[native code]` |
| 0.0% | 969us | 0.0% | 969us | `has` | `[native code]` |
| 0.0% | 969us | 0.0% | 969us | `cloneObject` | `[native code]` |
| 0.0% | 962us | 0.0% | 962us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` |
| 0.0% | 951us | 0.0% | 951us | `filter` | `[native code]` |
| 0.0% | 943us | 0.0% | 943us | `add` | `[native code]` |
| 0.0% | 922us | 0.0% | 922us | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:46` |
| 0.0% | 842us | 0.0% | 842us | `push` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 90.6% | 3.82s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 90.3% | 3.81s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 78.1% | 3.30s | 48.5% | 2.05s | `every` | `[native code]` |
| 78.1% | 3.30s | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:131` |
| 29.6% | 1.25s | 29.6% | 1.25s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:131` |
| 6.9% | 293.9ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 6.9% | 293.9ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 6.6% | 282.8ms | 0.0% | 0us | `map` | `[native code]` |
| 4.5% | 190.1ms | 0.6% | 28.5ms | `anonymous` | `[native code]` |
| 4.4% | 188.6ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 4.4% | 188.6ms | 0.0% | 0us | `invoke` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` |
| 4.4% | 188.6ms | 0.0% | 0us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` |
| 4.4% | 188.6ms | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` |
| 4.4% | 188.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` |
| 4.3% | 184.7ms | 4.3% | 184.7ms | `structuredClone` | `[native code]` |
| 3.7% | 157.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` |
| 2.9% | 125.8ms | 0.0% | 0us | `readSceneImageStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` |
| 2.9% | 125.8ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` |
| 2.9% | 125.8ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 2.9% | 122.9ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:188` |
| 2.3% | 99.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` |
| 2.3% | 99.8ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` |
| 2.3% | 98.8ms | 0.0% | 0us | `bound _iterate` | `[native code]` |
| 2.3% | 97.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` |
| 2.3% | 97.6ms | 2.3% | 97.6ms | `gc` | `[native code]` |
| 1.9% | 84.0ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` |
| 1.9% | 82.8ms | 1.9% | 82.8ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` |
| 1.9% | 81.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` |
| 1.8% | 79.8ms | 1.8% | 79.8ms | `Uint8Array` | `[native code]` |
| 1.8% | 79.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 1.8% | 79.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` |
| 1.4% | 62.0ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` |
| 1.4% | 59.3ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.1% | 49.7ms | 1.1% | 49.7ms | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:202` |
| 1.1% | 49.5ms | 0.4% | 19.3ms | `from` | `[native code]` |
| 1.1% | 49.3ms | 0.0% | 1.9ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 1.1% | 47.3ms | 1.1% | 47.3ms | `entries` | `[native code]` |
| 1.1% | 47.3ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` |
| 1.1% | 47.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` |
| 1.1% | 47.3ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` |
| 1.1% | 46.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:192` |
| 1.0% | 46.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` |
| 1.0% | 42.3ms | 0.3% | 12.7ms | `parseModule` | `[native code]` |
| 0.8% | 35.4ms | 0.8% | 35.4ms | `digest` | `[native code]` |
| 0.8% | 35.4ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:64` |
| 0.8% | 35.4ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:55` |
| 0.7% | 33.5ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:126` |
| 0.7% | 31.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:179` |
| 0.7% | 31.3ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` |
| 0.7% | 31.3ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` |
| 0.7% | 31.1ms | 0.7% | 31.1ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.7% | 31.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:231` |
| 0.7% | 31.0ms | 0.0% | 0us | `sceneBlobSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:68` |
| 0.7% | 31.0ms | 0.7% | 31.0ms | `readSceneSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts` |
| 0.7% | 31.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` |
| 0.7% | 31.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` |
| 0.7% | 30.3ms | 0.0% | 0us | `async inspectSceneBlobRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` |
| 0.7% | 30.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` |
| 0.7% | 30.1ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` |
| 0.7% | 30.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` |
| 0.7% | 29.5ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.6% | 28.4ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:165` |
| 0.6% | 28.4ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` |
| 0.6% | 28.2ms | 0.0% | 0us | `some` | `[native code]` |
| 0.6% | 28.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` |
| 0.6% | 28.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` |
| 0.6% | 27.4ms | 0.0% | 0us | `readSceneStorageManifest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:76` |
| 0.6% | 26.5ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:170` |
| 0.6% | 25.5ms | 0.6% | 25.5ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 0.4% | 19.2ms | 0.0% | 0us | `waitForOthersClosed` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` |
| 0.4% | 19.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` |
| 0.4% | 18.9ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` |
| 0.4% | 18.9ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:105` |
| 0.4% | 18.9ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` |
| 0.4% | 17.9ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:119` |
| 0.3% | 16.3ms | 0.3% | 16.3ms | `update` | `[native code]` |
| 0.3% | 16.3ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `resolve` | `[native code]` |
| 0.3% | 16.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` |
| 0.3% | 15.5ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:362` |
| 0.3% | 15.5ms | 0.3% | 15.5ms | `palette` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:255` |
| 0.3% | 15.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` |
| 0.3% | 15.3ms | 0.3% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.3% | 15.1ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:195` |
| 0.3% | 15.1ms | 0.3% | 15.1ms | `set result` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBRequest.js:27` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:37` |
| 0.3% | 15.0ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:13` |
| 0.3% | 15.0ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.3% | 15.0ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:96` |
| 0.3% | 15.0ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.3% | 14.9ms | 0.3% | 14.9ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:72` |
| 0.3% | 14.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:238` |
| 0.3% | 14.9ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.3% | 14.9ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.3% | 14.9ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.3% | 14.9ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.3% | 14.9ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.3% | 14.8ms | 0.3% | 14.8ms | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 0.3% | 14.8ms | 0.0% | 0us | `async listSummaries` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:59` |
| 0.3% | 14.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:194` |
| 0.3% | 14.7ms | 0.3% | 14.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.3% | 14.6ms | 0.0% | 0us | `node:assert` | `node:assert:12` |
| 0.3% | 14.1ms | 0.3% | 14.1ms | `observe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.3% | 14.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:207` |
| 0.3% | 13.8ms | 0.0% | 0us | `valueToKey` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:15` |
| 0.3% | 13.8ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:108` |
| 0.3% | 13.8ms | 0.0% | 0us | `bound` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBKeyRange.js:36` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.3% | 12.9ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.3% | 12.9ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.2% | 12.1ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.2% | 10.9ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:368` |
| 0.2% | 10.9ms | 0.2% | 10.9ms | `isMoldaAssetId` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\id.ts:7` |
| 0.2% | 10.9ms | 0.0% | 0us | `creationId` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:37` |
| 0.1% | 7.5ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.1% | 6.5ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 3.2ms | 0.0% | 3.2ms | `requestInstantiate` | `[native code]` |
| 0.0% | 3.2ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 3.2ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 3.0ms | 0.0% | 1.0ms | `link` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` |
| 0.0% | 2.0ms | 0.0% | 0us | `async readSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:123` |
| 0.0% | 2.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:188` |
| 0.0% | 2.0ms | 0.0% | 0us | `async store` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:15` |
| 0.0% | 2.0ms | 0.0% | 0us | `async read` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:30` |
| 0.0% | 2.0ms | 0.0% | 0us | `async readSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:117` |
| 0.0% | 2.0ms | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:33` |
| 0.0% | 1.9ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:191` |
| 0.0% | 1.8ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:184` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:49` |
| 0.0% | 1.0ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:16` |
| 0.0% | 1.0ms | 0.0% | 0us | `Promise` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `FDBRequest` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:80` |
| 0.0% | 1.0ms | 0.0% | 0us | `openCursor` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:251` |
| 0.0% | 1.0ms | 0.0% | 0us | `bound storeRecord` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `storeRecord` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:171` |
| 0.0% | 1.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `hideFromStack` | `internal:shared` |
| 0.0% | 1.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:47` |
| 0.0% | 995us | 0.0% | 0us | `FDBObjectStore` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:70` |
| 0.0% | 995us | 0.0% | 0us | `objectStore` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:137` |
| 0.0% | 985us | 0.0% | 985us | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:23` |
| 0.0% | 984us | 0.0% | 984us | `ensureRegistered` | `[native code]` |
| 0.0% | 969us | 0.0% | 969us | `cloneObject` | `[native code]` |
| 0.0% | 969us | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:138` |
| 0.0% | 969us | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:214` |
| 0.0% | 969us | 0.0% | 969us | `has` | `[native code]` |
| 0.0% | 962us | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` |
| 0.0% | 962us | 0.0% | 0us | `async inspectSceneBlobRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:141` |
| 0.0% | 962us | 0.0% | 962us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` |
| 0.0% | 951us | 0.0% | 951us | `filter` | `[native code]` |
| 0.0% | 951us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:15` |
| 0.0% | 943us | 0.0% | 943us | `add` | `[native code]` |
| 0.0% | 943us | 0.0% | 0us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` |
| 0.0% | 943us | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:231` |
| 0.0% | 922us | 0.0% | 922us | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:46` |
| 0.0% | 922us | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` |
| 0.0% | 882us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` |
| 0.0% | 877us | 0.0% | 0us | `sceneBlobSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:81` |
| 0.0% | 847us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` |
| 0.0% | 847us | 0.0% | 0us | `put` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` |
| 0.0% | 847us | 0.0% | 0us | `cloneValueForInsertion` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` |
| 0.0% | 847us | 0.0% | 0us | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` |
| 0.0% | 842us | 0.0% | 0us | `transaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:159` |
| 0.0% | 842us | 0.0% | 842us | `push` | `[native code]` |

## Function Details

### `every`
`[native code]` | Self: 48.5% (2.05s) | Total: 78.1% (3.30s) | Samples: 210

**Called by:**
- `async prepareSceneStorage` (323)

**Calls:**
- `(anonymous)` (113)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:131` | Self: 29.6% (1.25s) | Total: 29.6% (1.25s) | Samples: 113

**Called by:**
- `every` (113)

### `structuredClone`
`[native code]` | Self: 4.3% (184.7ms) | Total: 4.3% (184.7ms) | Samples: 23

**Called by:**
- `_iterate` (16)
- `(module)` (6)
- `cloneValueForInsertion` (1)

### `gc`
`[native code]` | Self: 2.3% (97.6ms) | Total: 2.3% (97.6ms) | Samples: 10

**Called by:**
- `(module)` (10)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` | Self: 1.9% (82.8ms) | Total: 1.9% (82.8ms) | Samples: 11

**Called by:**
- `(anonymous)` (7)
- `(anonymous)` (4)

### `Uint8Array`
`[native code]` | Self: 1.8% (79.8ms) | Total: 1.8% (79.8ms) | Samples: 10

**Called by:**
- `(anonymous)` (10)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:202` | Self: 1.1% (49.7ms) | Total: 1.1% (49.7ms) | Samples: 1

### `entries`
`[native code]` | Self: 1.1% (47.3ms) | Total: 1.1% (47.3ms) | Samples: 3

**Called by:**
- `structuredBytes` (3)

### `digest`
`[native code]` | Self: 0.8% (35.4ms) | Total: 0.8% (35.4ms) | Samples: 5

**Called by:**
- `async scenePixelHash` (5)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.7% (31.1ms) | Total: 0.7% (31.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `readSceneSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts` | Self: 0.7% (31.0ms) | Total: 0.7% (31.0ms) | Samples: 1

**Called by:**
- `sceneBlobSummary` (1)

### `anonymous`
`[native code]` | Self: 0.6% (28.5ms) | Total: 4.5% (190.1ms) | Samples: 5

**Called by:**
- `node:assert/strict` (6)
- `internal:assert/assertion_error` (4)
- `loadAssertionError` (4)
- `node:stream` (2)
- `internal:streams/pipeline` (2)
- `internal:stream` (2)
- `internal:streams/compose` (2)
- `internal:fs/streams` (2)
- `internal:streams/duplex` (2)
- `internal:streams/operators` (2)
- `get WriteStream` (2)
- `node:assert` (2)
- `internal:streams/readable` (1)

**Calls:**
- `internal:assert/assertion_error` (4)
- `node:assert` (4)
- `internal:util/colors` (2)
- `node:stream` (2)
- `internal:streams/pipeline` (2)
- `internal:stream` (2)
- `internal:streams/compose` (2)
- `internal:fs/streams` (2)
- `internal:streams/duplex` (2)
- `internal:streams/operators` (2)
- `node:assert` (2)
- `internal:validators` (1)
- `internal:streams/readable` (1)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` | Self: 0.6% (25.5ms) | Total: 0.6% (25.5ms) | Samples: 4

**Called by:**
- `(anonymous)` (4)

### `from`
`[native code]` | Self: 0.4% (19.3ms) | Total: 1.1% (49.5ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)
- `waitForOthersClosed` (2)
- `FDBObjectStore` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `update`
`[native code]` | Self: 0.3% (16.3ms) | Total: 0.3% (16.3ms) | Samples: 2

**Called by:**
- `digest` (2)

### `resolve`
`[native code]` | Self: 0.3% (16.0ms) | Total: 0.3% (16.0ms) | Samples: 3

**Called by:**
- `async (anonymous)` (3)

### `palette`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:255` | Self: 0.3% (15.5ms) | Total: 0.3% (15.5ms) | Samples: 1

**Called by:**
- `readSceneDocumentStructure` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` | Self: 0.3% (15.3ms) | Total: 0.3% (15.3ms) | Samples: 2

**Called by:**
- `from` (2)

### `set result`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBRequest.js:27` | Self: 0.3% (15.1ms) | Total: 0.3% (15.1ms) | Samples: 1

**Called by:**
- `_start` (1)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:37` | Self: 0.3% (15.0ms) | Total: 0.3% (15.0ms) | Samples: 1

**Called by:**
- `composeTransform` (1)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:72` | Self: 0.3% (14.9ms) | Total: 0.3% (14.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` | Self: 0.3% (14.8ms) | Total: 0.3% (14.8ms) | Samples: 1

**Called by:**
- `async listSummaries` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.3% (14.7ms) | Total: 0.3% (14.7ms) | Samples: 1

**Called by:**
- `from` (1)

### `observe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.3% (14.1ms) | Total: 0.3% (14.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `valueToKeyWithoutThrowing`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:15` | Self: 0.3% (13.8ms) | Total: 0.3% (13.8ms) | Samples: 1

**Called by:**
- `valueToKey` (1)

### `parseModule`
`[native code]` | Self: 0.3% (12.7ms) | Total: 1.0% (42.3ms) | Samples: 1

**Called by:**
- `async (anonymous)` (7)

**Calls:**
- `node:assert/strict` (6)

### `isMoldaAssetId`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\id.ts:7` | Self: 0.2% (10.9ms) | Total: 0.2% (10.9ms) | Samples: 1

**Called by:**
- `creationId` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (3.2ms) | Total: 0.0% (3.2ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (1)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` | Self: 0.0% (1.9ms) | Total: 1.1% (49.3ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)
- `async inspectSnapshot` (2)
- `sceneBlobSummary` (1)

**Calls:**
- `entries` (3)

### `FDBRequest`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `openCursor` (1)

### `storeRecord`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:171` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `bound storeRecord` (1)

### `link`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (3.0ms) | Samples: 1

**Called by:**
- `link` (2)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (2)

### `hideFromStack`
`internal:shared` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `internal:validators` (1)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:23` | Self: 0.0% (985us) | Total: 0.0% (985us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `ensureRegistered`
`[native code]` | Self: 0.0% (984us) | Total: 0.0% (984us) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `has`
`[native code]` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `async inspectSnapshot` (1)

### `cloneObject`
`[native code]` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `async prepareSceneStorage` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` | Self: 0.0% (962us) | Total: 0.0% (962us) | Samples: 1

**Called by:**
- `map` (1)

### `filter`
`[native code]` | Self: 0.0% (951us) | Total: 0.0% (951us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `add`
`[native code]` | Self: 0.0% (943us) | Total: 0.0% (943us) | Samples: 1

**Called by:**
- `structuredBytes` (1)

### `values`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:46` | Self: 0.0% (922us) | Total: 0.0% (922us) | Samples: 1

**Called by:**
- `_iterate` (1)

### `push`
`[native code]` | Self: 0.0% (842us) | Total: 0.0% (842us) | Samples: 1

**Called by:**
- `transaction` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` | Self: 0.0% (0us) | Total: 2.9% (125.8ms) | Samples: 0

**Called by:**
- `readSceneDocument` (12)

**Calls:**
- `map` (12)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:105` | Self: 0.0% (0us) | Total: 0.4% (18.9ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (5)

**Calls:**
- `async prepareSceneStorage` (4)
- `async prepareSceneStorage` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 90.6% (3.82s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (380)
- `refresh` (2)

**Calls:**
- `async prepareSceneStorage` (323)
- `async asyncModuleEvaluation` (30)
- `async hydrateSceneStorage` (9)
- `async mutateSceneBlobStorage` (7)
- `async (anonymous)` (5)
- `async prepareSceneStorage` (2)
- `get WriteStream` (2)
- `async prepareSceneStorage` (1)
- `async loadAndEvaluateModule` (1)
- `async inspectSnapshot` (1)
- `async inspectSnapshot` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (59.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `parseModule` (7)
- `resolve` (3)
- `ensureRegistered` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:195` | Self: 0.0% (0us) | Total: 0.3% (15.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `set result` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` | Self: 0.0% (0us) | Total: 0.7% (31.0ms) | Samples: 0

**Called by:**
- `collectRecords` (1)

**Calls:**
- `collectRecords` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `composeTransform` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 6.9% (293.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (30)

**Calls:**
- `evaluate` (30)

### `FDBObjectStore`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:70` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `objectStore` (1)

**Calls:**
- `from` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` | Self: 0.0% (0us) | Total: 0.0% (847us) | Samples: 0

**Called by:**
- `put` (1)

**Calls:**
- `cloneValueForInsertion` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` | Self: 0.0% (0us) | Total: 2.3% (99.8ms) | Samples: 0

**Calls:**
- `bound _iterate` (18)
- `bound storeRecord` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.2% (12.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` | Self: 0.0% (0us) | Total: 1.8% (79.8ms) | Samples: 0

**Called by:**
- `map` (10)

**Calls:**
- `(anonymous)` (10)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` | Self: 0.0% (0us) | Total: 0.0% (943us) | Samples: 0

**Called by:**
- `async inspectSnapshot` (1)

**Calls:**
- `add` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` | Self: 0.0% (0us) | Total: 4.4% (188.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `dispatchEvent` (21)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` | Self: 0.0% (0us) | Total: 0.7% (31.0ms) | Samples: 0

**Called by:**
- `invoke` (1)

**Calls:**
- `collectRecords` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:170` | Self: 0.0% (0us) | Total: 0.6% (26.5ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (2)

**Calls:**
- `readSceneStorageManifest` (2)

### `async listSummaries`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:59` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async (anonymous)` (1)

### `readSceneStorageManifest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:76` | Self: 0.0% (0us) | Total: 0.6% (27.4ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (2)
- `async inspectSceneBlobRecords` (1)

**Calls:**
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:96` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `indexSceneNodes` (1)

**Calls:**
- `finiteTuple` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` | Self: 0.0% (0us) | Total: 0.0% (882us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` | Self: 0.0% (0us) | Total: 2.3% (99.8ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `structuredClone` (6)

### `invoke`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` | Self: 0.0% (0us) | Total: 4.4% (188.6ms) | Samples: 0

**Called by:**
- `invokeEventListeners` (21)

**Calls:**
- `(anonymous)` (20)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:179` | Self: 0.0% (0us) | Total: 0.7% (31.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `sceneBlobSummary` (1)
- `sceneBlobSummary` (1)

### `bound`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBKeyRange.js:36` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `_iterate` (1)

**Calls:**
- `valueToKey` (1)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:231` | Self: 0.0% (0us) | Total: 0.0% (943us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `objectStore`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:137` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `async store` (1)

**Calls:**
- `FDBObjectStore` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:64` | Self: 0.0% (0us) | Total: 0.8% (35.4ms) | Samples: 0

**Called by:**
- `async scenePixelHash` (5)

**Calls:**
- `digest` (5)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:188` | Self: 0.0% (0us) | Total: 2.9% (122.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)

**Calls:**
- `readSceneDocument` (9)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:80` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `Promise` (1)

**Calls:**
- `collectRecords` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `bound _iterate`
`[native code]` | Self: 0.0% (0us) | Total: 2.3% (98.8ms) | Samples: 0

**Called by:**
- `_start` (18)

**Calls:**
- `_iterate` (16)
- `_iterate` (1)
- `_iterate` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `node:assert` (4)

**Calls:**
- `get` (4)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (7.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)

**Calls:**
- `indexSceneDocument` (1)

### `bound storeRecord`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `storeRecord` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:207` | Self: 0.0% (0us) | Total: 0.3% (14.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `observe` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 6.6% (282.8ms) | Samples: 0

**Called by:**
- `readSceneImageStructure` (12)
- `readSceneDocumentStructure` (12)
- `fixture` (3)
- `readSceneDocumentStructure` (1)

**Calls:**
- `readSceneImageStructure` (12)
- `(anonymous)` (10)
- `(anonymous)` (3)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async store`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:15` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async readSceneBlobStorage` (2)

**Calls:**
- `(anonymous)` (1)
- `objectStore` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` | Self: 0.0% (0us) | Total: 0.0% (922us) | Samples: 0

**Called by:**
- `bound _iterate` (1)

**Calls:**
- `values` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `internal:util/colors` (2)

**Calls:**
- `(anonymous)` (2)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:33` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async read` (2)

**Calls:**
- `async readSceneBlobStorage` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:49` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async store` (1)

**Calls:**
- `Promise` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` | Self: 0.0% (0us) | Total: 0.7% (30.1ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `map` (3)

### `valueToKey`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `bound` (1)

**Calls:**
- `valueToKeyWithoutThrowing` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `async read`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:30` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `async (anonymous)` (2)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` | Self: 0.0% (0us) | Total: 0.7% (31.3ms) | Samples: 0

**Called by:**
- `async inspectSceneBlobRecords` (6)
- `(anonymous)` (1)

**Calls:**
- `async inspectSnapshot` (4)
- `async inspectSnapshot` (2)
- `async inspectSnapshot` (1)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `async mutateSceneBlobStorage` (3)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` | Self: 0.0% (0us) | Total: 1.1% (47.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `collectUnreferencedSceneBlobs` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` | Self: 0.0% (0us) | Total: 3.7% (157.5ms) | Samples: 0

**Called by:**
- `invoke` (20)

**Calls:**
- `(anonymous)` (20)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:214` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `async inspectSnapshot` (1)

**Calls:**
- `has` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` | Self: 0.0% (0us) | Total: 0.4% (19.2ms) | Samples: 0

**Calls:**
- `waitForOthersClosed` (3)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `refresh` (2)

### `async inspectSceneBlobRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` | Self: 0.0% (0us) | Total: 0.7% (30.3ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (6)

**Calls:**
- `async inspectSnapshot` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:188` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `async read` (2)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `assign` (4)

**Calls:**
- `loadAssertionError` (4)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (28.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `(anonymous)` (5)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:165` | Self: 0.0% (0us) | Total: 0.6% (28.4ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (4)

**Calls:**
- `async hydrateSceneStorage` (2)
- `async hydrateSceneStorage` (2)

### `cloneValueForInsertion`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` | Self: 0.0% (0us) | Total: 0.0% (847us) | Samples: 0

**Called by:**
- `buildRecordAddPut` (1)

**Calls:**
- `structuredClone` (1)

### `sceneBlobSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:68` | Self: 0.0% (0us) | Total: 0.7% (31.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readSceneSummary` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` | Self: 0.0% (0us) | Total: 1.9% (81.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `sameSceneStoredValue` (7)
- `sameSceneStoredValue` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` | Self: 0.0% (0us) | Total: 0.6% (28.2ms) | Samples: 0

**Called by:**
- `some` (5)

**Calls:**
- `sameSceneStoredValue` (4)
- `sameSceneStoredValue` (1)

### `openCursor`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:251` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `collectRecords` (1)

**Calls:**
- `FDBRequest` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.7% (29.5ms) | Samples: 0

**Called by:**
- `parseModule` (6)

**Calls:**
- `anonymous` (6)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:13` | Self: 0.0% (0us) | Total: 0.3% (15.0ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `indexSceneNodes` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `assign` (4)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` | Self: 0.0% (0us) | Total: 1.4% (62.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `readSceneImageStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` | Self: 0.0% (0us) | Total: 2.9% (125.8ms) | Samples: 0

**Called by:**
- `map` (12)

**Calls:**
- `map` (12)

### `node:assert`
`node:assert:12` | Self: 0.0% (0us) | Total: 0.3% (14.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` | Self: 0.0% (0us) | Total: 0.4% (18.9ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (2)

**Calls:**
- `async mutateSceneBlobStorage` (5)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:362` | Self: 0.0% (0us) | Total: 0.3% (15.5ms) | Samples: 0

**Called by:**
- `readSceneStorageManifest` (1)

**Calls:**
- `palette` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:368` | Self: 0.0% (0us) | Total: 0.2% (10.9ms) | Samples: 0

**Called by:**
- `readSceneStorageManifest` (1)

**Calls:**
- `creationId` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:15` | Self: 0.0% (0us) | Total: 0.0% (951us) | Samples: 0

**Calls:**
- `filter` (1)

### `async readSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:123` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async readSceneBlobStorage` (2)

**Calls:**
- `async store` (2)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` | Self: 0.0% (0us) | Total: 0.7% (31.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `async inspectSceneBlobRecords` (6)
- `async inspectSceneBlobRecords` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` | Self: 0.0% (0us) | Total: 0.0% (847us) | Samples: 0

**Called by:**
- `finish` (1)

**Calls:**
- `put` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:238` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `number` (1)

### `put`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` | Self: 0.0% (0us) | Total: 0.0% (847us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `buildRecordAddPut` (1)

### `waitForOthersClosed`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` | Self: 0.0% (0us) | Total: 0.4% (19.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `from` (2)
- `transaction` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` | Self: 0.0% (0us) | Total: 2.3% (97.6ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `gc` (10)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (6.5ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` | Self: 0.0% (0us) | Total: 0.6% (28.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `some` (5)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.2ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 2.9% (125.8ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (9)
- `async prepareSceneStorage` (3)

**Calls:**
- `readSceneDocumentStructure` (12)

### `async readSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:117` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `async readSceneBlobStorage` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `async mutateSceneBlobStorage` (2)

### `transaction`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:159` | Self: 0.0% (0us) | Total: 0.0% (842us) | Samples: 0

**Called by:**
- `waitForOthersClosed` (1)

**Calls:**
- `push` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:231` | Self: 0.0% (0us) | Total: 0.7% (31.1ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` | Self: 0.0% (0us) | Total: 1.1% (47.3ms) | Samples: 0

**Called by:**
- `collectUnreferencedSceneBlobs` (3)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 90.3% (3.81s) | Samples: 0

**Calls:**
- `(anonymous)` (380)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` | Self: 0.0% (0us) | Total: 4.4% (188.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (20)
- `collectRecords` (1)

**Calls:**
- `(anonymous)` (11)
- `(anonymous)` (5)
- `(anonymous)` (3)
- `(anonymous)` (2)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` | Self: 0.0% (0us) | Total: 1.1% (47.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `finish` (3)

### `sceneBlobSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:81` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 1.8% (79.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (10)

**Calls:**
- `Uint8Array` (10)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.3% (14.9ms) | Samples: 0

**Called by:**
- `get` (4)

**Calls:**
- `anonymous` (4)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` | Self: 0.0% (0us) | Total: 0.4% (18.9ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (5)

**Calls:**
- `async prepareSceneStorage` (5)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` | Self: 0.0% (0us) | Total: 4.4% (188.6ms) | Samples: 0

**Called by:**
- `_start` (21)

**Calls:**
- `invokeEventListeners` (21)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` | Self: 0.0% (0us) | Total: 0.7% (30.1ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `fixture` (3)

### `internal:validators`
`internal:validators:47` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `hideFromStack` (1)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:191` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (2)

**Calls:**
- `structuredBytes` (2)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` | Self: 0.0% (0us) | Total: 0.6% (28.4ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (4)

**Calls:**
- `async hydrateSceneStorage` (4)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:16` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `openCursor` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:108` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `bound _iterate` (1)

**Calls:**
- `bound` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:184` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (2)

**Calls:**
- `async scenePixelHash` (2)

### `Promise`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` | Self: 0.0% (0us) | Total: 4.4% (188.6ms) | Samples: 0

**Called by:**
- `dispatchEvent` (21)

**Calls:**
- `invoke` (21)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:126` | Self: 0.0% (0us) | Total: 0.7% (33.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `async prepareSceneStorage` (1)

**Calls:**
- `async scenePixelHash` (3)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:138` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `cloneObject` (1)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:55` | Self: 0.0% (0us) | Total: 0.8% (35.4ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (3)
- `async hydrateSceneStorage` (2)

**Calls:**
- `async scenePixelHash` (5)

### `creationId`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:37` | Self: 0.0% (0us) | Total: 0.2% (10.9ms) | Samples: 0

**Called by:**
- `readSceneDocumentStructure` (1)

**Calls:**
- `isMoldaAssetId` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:131` | Self: 0.0% (0us) | Total: 78.1% (3.30s) | Samples: 0

**Called by:**
- `(anonymous)` (323)

**Calls:**
- `every` (323)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `readSceneStorageManifest` (1)

**Calls:**
- `map` (1)

### `async inspectSceneBlobRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:141` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (1)

**Calls:**
- `readSceneStorageManifest` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.3% (12.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` | Self: 0.0% (0us) | Total: 1.0% (46.2ms) | Samples: 0

**Calls:**
- `_start` (1)
- `_start` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` | Self: 0.0% (0us) | Total: 1.9% (84.0ms) | Samples: 0

**Called by:**
- `bound _iterate` (16)

**Calls:**
- `structuredClone` (16)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 6.9% (293.9ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (30)

**Calls:**
- `(module)` (10)
- `(module)` (6)
- `(module)` (3)
- `(module)` (3)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:194` | Self: 0.0% (0us) | Total: 0.3% (14.8ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async listSummaries` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:119` | Self: 0.0% (0us) | Total: 0.4% (17.9ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (4)

**Calls:**
- `readSceneDocument` (3)
- `readSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:192` | Self: 0.0% (0us) | Total: 1.1% (46.4ms) | Samples: 0

**Called by:**
- `finish` (2)

**Calls:**
- `structuredBytes` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` | Self: 0.0% (0us) | Total: 0.7% (30.1ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `from` (3)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `update` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 61.5% | 2.59s | `[native code]` |
| 29.6% | 1.25s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` |
| 2.5% | 109.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts` |
| 1.1% | 49.7ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js` |
| 1.0% | 46.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 1.0% | 44.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.7% | 31.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts` |
| 0.3% | 16.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.3% | 15.1ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBRequest.js` |
| 0.3% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.3% | 14.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 0.3% | 13.8ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js` |
| 0.2% | 10.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\id.ts` |
| 0.0% | 1.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts` |
| 0.0% | 1.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js` |
| 0.0% | 1.0ms | `internal:shared` |
| 0.0% | 922us | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` |
