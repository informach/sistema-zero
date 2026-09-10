# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 5.01s | 508 | 1.0ms | 174 |

**Top 10:** `structuredClone` 39.3%, `sameSceneStoredValue` 24.2%, `Uint8Array` 13.3%, `digest` 11.1%, `update` 1.8%, `sameSceneStoredValue` 1.2%, `deepEquals` 1.2%, `gc` 0.6%, `(anonymous)` 0.6%, `openCursor` 0.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 39.3% | 1.97s | 39.3% | 1.97s | `structuredClone` | `[native code]` |
| 24.2% | 1.21s | 24.2% | 1.21s | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` |
| 13.3% | 671.3ms | 13.3% | 671.3ms | `Uint8Array` | `[native code]` |
| 11.1% | 558.7ms | 11.1% | 558.7ms | `digest` | `[native code]` |
| 1.8% | 93.2ms | 1.8% | 93.2ms | `update` | `[native code]` |
| 1.2% | 63.8ms | 1.2% | 63.8ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 1.2% | 61.3ms | 1.2% | 61.3ms | `deepEquals` | `[native code]` |
| 0.6% | 33.1ms | 0.6% | 33.1ms | `gc` | `[native code]` |
| 0.6% | 32.9ms | 0.6% | 32.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.5% | 29.5ms | 0.5% | 29.5ms | `openCursor` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:249` |
| 0.5% | 28.1ms | 0.5% | 28.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.5% | 26.6ms | 0.5% | 26.6ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` |
| 0.5% | 25.7ms | 1.1% | 55.4ms | `parseModule` | `[native code]` |
| 0.3% | 17.0ms | 41.1% | 2.06s | `(anonymous)` | `[native code]` |
| 0.3% | 16.7ms | 0.3% | 16.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:187` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `min` | `[native code]` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `_getRecordsForNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:164` |
| 0.3% | 15.1ms | 0.3% | 16.0ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:7` |
| 0.2% | 14.9ms | 0.3% | 15.8ms | `filter` | `[native code]` |
| 0.2% | 14.1ms | 1.4% | 70.8ms | `async (anonymous)` | `[native code]` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:70` |
| 0.2% | 13.5ms | 0.2% | 13.5ms | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` |
| 0.2% | 12.2ms | 0.2% | 12.2ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 11.9ms | 0.2% | 11.9ms | `FakeDOMStringList` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeDOMStringList.js:3` |
| 0.2% | 10.7ms | 0.2% | 10.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.1% | 8.0ms | 0.1% | 8.0ms | `WriteStream` | `internal:fs/streams` |
| 0.0% | 2.9ms | 1.9% | 95.8ms | `anonymous` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `addEventListener` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `checkScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:32` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `resolvePromiseWithFirstResolvingFunctionCallCheck` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `includes` | `[native code]` |
| 0.0% | 997us | 0.0% | 997us | `refresh` | `internal:util/colors` |
| 0.0% | 990us | 0.0% | 990us | `FDBObjectStore` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:65` |
| 0.0% | 967us | 0.0% | 967us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 958us | 0.0% | 958us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 910us | 0.0% | 910us | `WritableState` | `internal:streams/writable` |
| 0.0% | 906us | 0.0% | 906us | `readRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:32` |
| 0.0% | 881us | 0.0% | 881us | `pop` | `[native code]` |
| 0.0% | 877us | 24.2% | 1.21s | `map` | `[native code]` |
| 0.0% | 873us | 1.5% | 75.6ms | `from` | `[native code]` |
| 0.0% | 869us | 0.0% | 869us | `call` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 41.1% | 2.06s | 0.3% | 17.0ms | `(anonymous)` | `[native code]` |
| 40.7% | 2.04s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 39.3% | 1.97s | 39.3% | 1.97s | `structuredClone` | `[native code]` |
| 29.9% | 1.50s | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` |
| 29.6% | 1.48s | 0.0% | 0us | `bound _iterate` | `[native code]` |
| 28.8% | 1.44s | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` |
| 28.4% | 1.42s | 0.0% | 0us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` |
| 28.4% | 1.42s | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` |
| 28.4% | 1.42s | 0.0% | 0us | `invoke` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` |
| 28.3% | 1.42s | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 27.7% | 1.39s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` |
| 26.9% | 1.35s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` |
| 24.2% | 1.21s | 0.0% | 877us | `map` | `[native code]` |
| 24.2% | 1.21s | 24.2% | 1.21s | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` |
| 16.8% | 845.9ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 16.8% | 845.9ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 14.5% | 729.4ms | 0.0% | 0us | `some` | `[native code]` |
| 14.5% | 729.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` |
| 14.5% | 729.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` |
| 13.3% | 671.3ms | 13.3% | 671.3ms | `Uint8Array` | `[native code]` |
| 11.1% | 558.7ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:64` |
| 11.1% | 558.7ms | 11.1% | 558.7ms | `digest` | `[native code]` |
| 11.1% | 558.7ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:55` |
| 11.0% | 552.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` |
| 9.0% | 452.5ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 8.7% | 438.0ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` |
| 8.7% | 437.1ms | 0.0% | 0us | `readSceneImageStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` |
| 8.7% | 437.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` |
| 8.6% | 435.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 8.5% | 428.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` |
| 7.7% | 390.6ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:184` |
| 6.5% | 329.3ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:188` |
| 6.2% | 313.5ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:165` |
| 6.2% | 313.5ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` |
| 6.2% | 313.5ms | 0.0% | 0us | `async inspectSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` |
| 4.6% | 235.6ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` |
| 4.6% | 235.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` |
| 4.4% | 222.7ms | 0.0% | 0us | `async inspectSceneBlobRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` |
| 4.4% | 222.7ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` |
| 3.3% | 168.0ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:126` |
| 3.1% | 156.8ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` |
| 3.1% | 156.8ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` |
| 3.1% | 156.8ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:105` |
| 2.7% | 139.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` |
| 2.7% | 139.1ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:119` |
| 2.5% | 126.6ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` |
| 1.9% | 97.1ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` |
| 1.9% | 97.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` |
| 1.9% | 97.1ms | 0.0% | 0us | `put` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` |
| 1.9% | 97.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` |
| 1.9% | 97.1ms | 0.0% | 0us | `cloneValueForInsertion` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` |
| 1.9% | 97.1ms | 0.0% | 0us | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` |
| 1.9% | 95.8ms | 0.0% | 2.9ms | `anonymous` | `[native code]` |
| 1.8% | 93.2ms | 1.8% | 93.2ms | `update` | `[native code]` |
| 1.5% | 75.6ms | 0.0% | 873us | `from` | `[native code]` |
| 1.4% | 72.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` |
| 1.4% | 71.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` |
| 1.4% | 71.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` |
| 1.4% | 70.8ms | 0.2% | 14.1ms | `async (anonymous)` | `[native code]` |
| 1.2% | 65.1ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` |
| 1.2% | 63.8ms | 1.2% | 63.8ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 1.2% | 61.3ms | 1.2% | 61.3ms | `deepEquals` | `[native code]` |
| 1.2% | 61.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` |
| 1.2% | 61.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` |
| 1.2% | 61.0ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` |
| 1.1% | 55.4ms | 0.5% | 25.7ms | `parseModule` | `[native code]` |
| 1.0% | 54.2ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` |
| 0.8% | 42.8ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` |
| 0.8% | 42.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` |
| 0.8% | 41.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` |
| 0.6% | 33.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` |
| 0.6% | 33.1ms | 0.6% | 33.1ms | `gc` | `[native code]` |
| 0.6% | 32.9ms | 0.6% | 32.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.5% | 29.6ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.5% | 29.6ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.5% | 29.6ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.5% | 29.6ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.5% | 29.6ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.5% | 29.6ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.5% | 29.5ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:16` |
| 0.5% | 29.5ms | 0.5% | 29.5ms | `openCursor` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:249` |
| 0.5% | 29.0ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` |
| 0.5% | 28.1ms | 0.5% | 28.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.5% | 28.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` |
| 0.5% | 27.6ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.5% | 26.6ms | 0.0% | 0us | `includes` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBKeyRange.js:59` |
| 0.5% | 26.6ms | 0.5% | 26.6ms | `valueToKeyWithoutThrowing` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` |
| 0.5% | 26.6ms | 0.0% | 0us | `valueToKey` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` |
| 0.5% | 26.6ms | 0.0% | 0us | `cmp` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:27` |
| 0.5% | 26.6ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:140` |
| 0.3% | 18.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` |
| 0.3% | 18.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` |
| 0.3% | 18.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` |
| 0.3% | 16.7ms | 0.0% | 0us | `readSurfaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:182` |
| 0.3% | 16.7ms | 0.3% | 16.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:187` |
| 0.3% | 16.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` |
| 0.3% | 16.7ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.3% | 16.0ms | 0.3% | 15.1ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:7` |
| 0.3% | 16.0ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:105` |
| 0.3% | 16.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` |
| 0.3% | 16.0ms | 0.3% | 16.0ms | `min` | `[native code]` |
| 0.3% | 15.8ms | 0.2% | 14.9ms | `filter` | `[native code]` |
| 0.3% | 15.8ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.3% | 15.4ms | 0.3% | 15.4ms | `_getRecordsForNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:164` |
| 0.3% | 15.4ms | 0.0% | 0us | `getRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` |
| 0.3% | 15.4ms | 0.0% | 0us | `generatorResume` | `[native code]` |
| 0.3% | 15.4ms | 0.0% | 0us | `bound deleteRecord` | `[native code]` |
| 0.3% | 15.4ms | 0.0% | 0us | `performIteration` | `[native code]` |
| 0.3% | 15.4ms | 0.0% | 0us | `delete` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:24` |
| 0.3% | 15.4ms | 0.0% | 0us | `deleteRecord` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:197` |
| 0.3% | 15.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:179` |
| 0.3% | 15.1ms | 0.0% | 0us | `sceneBlobSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:81` |
| 0.2% | 14.6ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:112` |
| 0.2% | 14.6ms | 0.0% | 0us | `link` | `[native code]` |
| 0.2% | 13.8ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.2% | 13.7ms | 0.2% | 13.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:70` |
| 0.2% | 13.7ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:70` |
| 0.2% | 13.5ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` |
| 0.2% | 13.5ms | 0.2% | 13.5ms | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` |
| 0.2% | 12.8ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.2% | 12.2ms | 0.2% | 12.2ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 12.2ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:48` |
| 0.2% | 11.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:254` |
| 0.2% | 11.9ms | 0.0% | 0us | `FDBDatabase` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:40` |
| 0.2% | 11.9ms | 0.0% | 0us | `Promise` | `[native code]` |
| 0.2% | 11.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:288` |
| 0.2% | 11.9ms | 0.2% | 11.9ms | `FakeDOMStringList` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeDOMStringList.js:3` |
| 0.2% | 11.6ms | 0.0% | 0us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` |
| 0.2% | 11.6ms | 0.0% | 0us | `makeSceneAtlasDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAtlasFixture.ts:7` |
| 0.2% | 11.6ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:46` |
| 0.2% | 10.7ms | 0.2% | 10.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.1% | 9.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` |
| 0.1% | 8.0ms | 0.1% | 8.0ms | `WriteStream` | `internal:fs/streams` |
| 0.0% | 3.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` |
| 0.0% | 2.9ms | 0.0% | 0us | `forEach` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.0% | 2.4ms | 0.0% | 0us | `waitForOthersClosed` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` |
| 0.0% | 1.9ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.0% | 1.6ms | 0.0% | 0us | `bound getAllValues` | `[native code]` |
| 0.0% | 1.6ms | 0.0% | 0us | `getAllValues` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` |
| 0.0% | 1.5ms | 0.0% | 0us | `FDBTransaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:35` |
| 0.0% | 1.5ms | 0.0% | 1.5ms | `addEventListener` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js` |
| 0.0% | 1.5ms | 0.0% | 0us | `transaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:158` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `checkScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:32` |
| 0.0% | 1.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:114` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `resolvePromiseWithFirstResolvingFunctionCallCheck` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `cacheSatisfy` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:162` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` |
| 0.0% | 1.0ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `includes` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.0% | 1.0ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` |
| 0.0% | 1.0ms | 0.0% | 0us | `readSceneMaterial` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:98` |
| 0.0% | 997us | 0.0% | 997us | `refresh` | `internal:util/colors` |
| 0.0% | 990us | 0.0% | 0us | `objectStore` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:137` |
| 0.0% | 990us | 0.0% | 0us | `waitForOthersClosed` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:192` |
| 0.0% | 990us | 0.0% | 990us | `FDBObjectStore` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:65` |
| 0.0% | 967us | 0.0% | 967us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 958us | 0.0% | 958us | `node:fs/promises` | `node:fs/promises:2` |
| 0.0% | 910us | 0.0% | 0us | `WriteStream` | `internal:fs/streams:245` |
| 0.0% | 910us | 0.0% | 910us | `WritableState` | `internal:streams/writable` |
| 0.0% | 910us | 0.0% | 0us | `Writable` | `internal:streams/writable:181` |
| 0.0% | 906us | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:78` |
| 0.0% | 906us | 0.0% | 906us | `readRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:32` |
| 0.0% | 881us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:116` |
| 0.0% | 881us | 0.0% | 881us | `pop` | `[native code]` |
| 0.0% | 877us | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:170` |
| 0.0% | 877us | 0.0% | 0us | `readSceneStorageManifest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:76` |
| 0.0% | 869us | 0.0% | 0us | `(anonymous)` | `internal:util/inspect:179` |
| 0.0% | 869us | 0.0% | 869us | `call` | `[native code]` |

## Function Details

### `structuredClone`
`[native code]` | Self: 39.3% (1.97s) | Total: 39.3% (1.97s) | Samples: 161

**Called by:**
- `_iterate` (120)
- `(module)` (35)
- `cloneValueForInsertion` (5)
- `getAllValues` (1)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:29` | Self: 24.2% (1.21s) | Total: 24.2% (1.21s) | Samples: 164

**Called by:**
- `(anonymous)` (87)
- `(anonymous)` (77)

### `Uint8Array`
`[native code]` | Self: 13.3% (671.3ms) | Total: 13.3% (671.3ms) | Samples: 64

**Called by:**
- `(anonymous)` (45)
- `(anonymous)` (19)

### `digest`
`[native code]` | Self: 11.1% (558.7ms) | Total: 11.1% (558.7ms) | Samples: 36

**Called by:**
- `async scenePixelHash` (36)

### `update`
`[native code]` | Self: 1.8% (93.2ms) | Total: 1.8% (93.2ms) | Samples: 20

**Called by:**
- `digest` (17)
- `(module)` (3)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` | Self: 1.2% (63.8ms) | Total: 1.2% (63.8ms) | Samples: 6

**Called by:**
- `(anonymous)` (4)
- `(anonymous)` (2)

### `deepEquals`
`[native code]` | Self: 1.2% (61.3ms) | Total: 1.2% (61.3ms) | Samples: 4

**Called by:**
- `(module)` (4)

### `gc`
`[native code]` | Self: 0.6% (33.1ms) | Total: 0.6% (33.1ms) | Samples: 4

**Called by:**
- `(module)` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.6% (32.9ms) | Total: 0.6% (32.9ms) | Samples: 5

**Called by:**
- `from` (5)

### `openCursor`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:249` | Self: 0.5% (29.5ms) | Total: 0.5% (29.5ms) | Samples: 1

**Called by:**
- `collectRecords` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` | Self: 0.5% (28.1ms) | Total: 0.5% (28.1ms) | Samples: 2

**Called by:**
- `from` (2)

### `valueToKeyWithoutThrowing`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js:9` | Self: 0.5% (26.6ms) | Total: 0.5% (26.6ms) | Samples: 1

**Called by:**
- `valueToKey` (1)

### `parseModule`
`[native code]` | Self: 0.5% (25.7ms) | Total: 1.1% (55.4ms) | Samples: 4

**Called by:**
- `async (anonymous)` (14)

**Calls:**
- `node:assert/strict` (10)

### `(anonymous)`
`[native code]` | Self: 0.3% (17.0ms) | Total: 41.1% (2.06s) | Samples: 2

**Called by:**
- `processTicksAndRejections` (191)
- `refresh` (6)
- `(anonymous)` (2)
- `forEach` (2)

**Calls:**
- `async asyncModuleEvaluation` (98)
- `async hydrateSceneStorage` (27)
- `async hydrateSceneStorage` (19)
- `async mutateSceneBlobStorage` (14)
- `async inspectSnapshot` (11)
- `async prepareSceneStorage` (11)
- `anonymous` (4)
- `async (anonymous)` (3)
- `(anonymous)` (2)
- `forEach` (2)
- `async loadAndEvaluateModule` (2)
- `async scenePixelHash` (1)
- `WriteStream` (1)
- `(anonymous)` (1)
- `async (anonymous)` (1)
- `cacheSatisfy` (1)
- `WriteStream` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:187` | Self: 0.3% (16.7ms) | Total: 0.3% (16.7ms) | Samples: 1

**Called by:**
- `map` (1)

### `min`
`[native code]` | Self: 0.3% (16.0ms) | Total: 0.3% (16.0ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `_getRecordsForNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:164` | Self: 0.3% (15.4ms) | Total: 0.3% (15.4ms) | Samples: 1

**Called by:**
- `getRecords` (1)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:7` | Self: 0.3% (15.1ms) | Total: 0.3% (16.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)
- `sceneBlobSummary` (1)

**Calls:**
- `pop` (1)

### `filter`
`[native code]` | Self: 0.2% (14.9ms) | Total: 0.3% (15.8ms) | Samples: 2

**Called by:**
- `bound call` (3)

**Calls:**
- `(anonymous)` (1)

### `async (anonymous)`
`[native code]` | Self: 0.2% (14.1ms) | Total: 1.4% (70.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (3)
- `cacheSatisfy` (1)

**Calls:**
- `parseModule` (14)
- `resolvePromiseWithFirstResolvingFunctionCallCheck` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:70` | Self: 0.2% (13.7ms) | Total: 0.2% (13.7ms) | Samples: 1

**Called by:**
- `from` (1)

### `values`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` | Self: 0.2% (13.5ms) | Total: 0.2% (13.5ms) | Samples: 1

**Called by:**
- `_iterate` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.2% (12.2ms) | Total: 0.2% (12.2ms) | Samples: 1

**Called by:**
- `readSceneGeometry` (1)

### `FakeDOMStringList`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeDOMStringList.js:3` | Self: 0.2% (11.9ms) | Total: 0.2% (11.9ms) | Samples: 1

**Called by:**
- `FDBDatabase` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` | Self: 0.2% (10.7ms) | Total: 0.2% (10.7ms) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `WriteStream`
`internal:fs/streams` | Self: 0.1% (8.0ms) | Total: 0.1% (8.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 0.0% (2.9ms) | Total: 1.9% (95.8ms) | Samples: 3

**Called by:**
- `internal:assert/assertion_error` (10)
- `loadAssertionError` (10)
- `node:assert/strict` (10)
- `(anonymous)` (4)
- `node:fs` (3)

**Calls:**
- `internal:assert/assertion_error` (10)
- `node:assert` (10)
- `internal:util/colors` (7)
- `node:fs` (3)
- `internal:util/inspect` (3)
- `node:fs/promises` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `link` (2)

### `addEventListener`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js` | Self: 0.0% (1.5ms) | Total: 0.0% (1.5ms) | Samples: 1

**Called by:**
- `FDBTransaction` (1)

### `checkScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:32` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `resolvePromiseWithFirstResolvingFunctionCallCheck`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `async prepareSceneStorage` (1)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async prepareSceneStorage` (1)

### `includes`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `record` (1)

### `refresh`
`internal:util/colors` | Self: 0.0% (997us) | Total: 0.0% (997us) | Samples: 1

**Called by:**
- `internal:util/colors` (1)

### `FDBObjectStore`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:65` | Self: 0.0% (990us) | Total: 0.0% (990us) | Samples: 1

**Called by:**
- `objectStore` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` | Self: 0.0% (967us) | Total: 0.0% (967us) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `node:fs/promises`
`node:fs/promises:2` | Self: 0.0% (958us) | Total: 0.0% (958us) | Samples: 1

**Called by:**
- `anonymous` (1)

### `WritableState`
`internal:streams/writable` | Self: 0.0% (910us) | Total: 0.0% (910us) | Samples: 1

**Called by:**
- `Writable` (1)

### `readRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:32` | Self: 0.0% (906us) | Total: 0.0% (906us) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `pop`
`[native code]` | Self: 0.0% (881us) | Total: 0.0% (881us) | Samples: 1

**Called by:**
- `structuredBytes` (1)

### `map`
`[native code]` | Self: 0.0% (877us) | Total: 24.2% (1.21s) | Samples: 1

**Called by:**
- `readSceneDocumentStructure` (47)
- `readSceneImageStructure` (46)
- `async hydrateSceneStorage` (19)
- `fixture` (7)
- `readSceneDocumentStructure` (2)
- `readSceneDocumentStructure` (1)
- `readSurfaces` (1)

**Calls:**
- `readSceneImageStructure` (46)
- `(anonymous)` (46)
- `(anonymous)` (19)
- `(anonymous)` (7)
- `readSceneMaterial` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)

### `from`
`[native code]` | Self: 0.0% (873us) | Total: 1.5% (75.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (7)
- `async scenePixelHash` (1)
- `waitForOthersClosed` (1)

**Calls:**
- `(anonymous)` (5)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `call`
`[native code]` | Self: 0.0% (869us) | Total: 0.0% (869us) | Samples: 1

**Called by:**
- `bound call` (1)

### `cmp`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:27` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `includes` (1)

**Calls:**
- `valueToKey` (1)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:150` | Self: 0.0% (0us) | Total: 6.2% (313.5ms) | Samples: 0

**Called by:**
- `async inspectSceneBlobRecords` (14)
- `(anonymous)` (11)

**Calls:**
- `async inspectSnapshot` (25)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 14.5% (729.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (91)

**Calls:**
- `(anonymous)` (91)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:171` | Self: 0.0% (0us) | Total: 11.0% (552.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (79)

**Calls:**
- `sameSceneStoredValue` (77)
- `sameSceneStoredValue` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` | Self: 0.0% (0us) | Total: 0.3% (18.1ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `digest` (4)

### `makeSceneAtlasDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAtlasFixture.ts:7` | Self: 0.0% (0us) | Total: 0.2% (11.6ms) | Samples: 0

**Called by:**
- `fixture` (2)

**Calls:**
- `migrateLegacyModel` (2)

### `sceneBlobSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:81` | Self: 0.0% (0us) | Total: 0.3% (15.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` | Self: 0.0% (0us) | Total: 2.5% (126.6ms) | Samples: 0

**Called by:**
- `collectUnreferencedSceneBlobs` (3)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `readSceneImageStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` | Self: 0.0% (0us) | Total: 8.7% (437.1ms) | Samples: 0

**Called by:**
- `map` (46)

**Calls:**
- `map` (46)

### `cacheSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async (anonymous)` (1)

### `waitForOthersClosed`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` | Self: 0.0% (0us) | Total: 0.0% (2.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `from` (1)
- `transaction` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` | Self: 0.0% (0us) | Total: 0.5% (29.0ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)
- `readSceneDocument` (1)

**Calls:**
- `map` (2)

### `bound getAllValues`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `getAllValues` (1)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` | Self: 0.0% (0us) | Total: 0.8% (42.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `collectRecords` (3)

### `Promise`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:184` | Self: 0.0% (0us) | Total: 7.7% (390.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (19)
- `async hydrateSceneStorage` (5)

**Calls:**
- `async scenePixelHash` (24)

### `readSurfaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:182` | Self: 0.0% (0us) | Total: 0.3% (16.7ms) | Samples: 0

**Called by:**
- `readSceneGeometry` (1)

**Calls:**
- `map` (1)

### `WriteStream`
`internal:fs/streams:245` | Self: 0.0% (0us) | Total: 0.0% (910us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Writable` (1)

### `transaction`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:158` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `waitForOthersClosed` (1)

**Calls:**
- `FDBTransaction` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` | Self: 0.0% (0us) | Total: 1.2% (61.0ms) | Samples: 0

**Called by:**
- `map` (7)

**Calls:**
- `from` (7)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:140` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `bound _iterate` (1)

**Calls:**
- `includes` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` | Self: 0.0% (0us) | Total: 8.7% (438.0ms) | Samples: 0

**Called by:**
- `readSceneDocument` (45)
- `async prepareSceneStorage` (1)
- `readSceneStorageManifest` (1)

**Calls:**
- `map` (47)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:105` | Self: 0.0% (0us) | Total: 3.1% (156.8ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (26)

**Calls:**
- `async prepareSceneStorage` (20)
- `async prepareSceneStorage` (3)
- `async prepareSceneStorage` (1)
- `async prepareSceneStorage` (1)
- `async prepareSceneStorage` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `anonymous` (10)

**Calls:**
- `anonymous` (10)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (14.6ms) | Samples: 0

**Called by:**
- `link` (13)
- `linkAndEvaluateModule` (2)

**Calls:**
- `link` (13)
- `moduleDeclarationInstantiation` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `get` (10)

**Calls:**
- `anonymous` (10)

### `readSceneMaterial`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:98` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `delete`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:24` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `deleteRecord` (1)

**Calls:**
- `performIteration` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:288` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `Promise` (1)

**Calls:**
- `FDBDatabase` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` | Self: 0.0% (0us) | Total: 0.8% (41.8ms) | Samples: 0

**Called by:**
- `collectRecords` (1)

**Calls:**
- `collectRecords` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (16.7ms) | Samples: 0

**Called by:**
- `internal:util/inspect` (3)
- `(anonymous)` (1)

**Calls:**
- `filter` (3)
- `call` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:70` | Self: 0.0% (0us) | Total: 0.2% (13.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:254` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Promise` (1)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `put` (5)

**Calls:**
- `cloneValueForInsertion` (5)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 16.8% (845.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (98)

**Calls:**
- `evaluate` (98)

### `performIteration`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `delete` (1)

**Calls:**
- `generatorResume` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` | Self: 0.0% (0us) | Total: 4.6% (235.6ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (19)

**Calls:**
- `map` (19)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` | Self: 0.0% (0us) | Total: 29.9% (1.50s) | Samples: 0

**Calls:**
- `bound _iterate` (122)
- `bound getAllValues` (1)
- `bound deleteRecord` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)

**Calls:**
- `structuredBytes` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` | Self: 0.0% (0us) | Total: 8.7% (437.1ms) | Samples: 0

**Called by:**
- `map` (46)

**Calls:**
- `(anonymous)` (45)
- `(anonymous)` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` | Self: 0.0% (0us) | Total: 28.3% (1.42s) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `dispatchEvent` (178)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` | Self: 0.0% (0us) | Total: 1.4% (71.4ms) | Samples: 0

**Called by:**
- `invoke` (2)

**Calls:**
- `collectRecords` (1)
- `collectRecords` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:170` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (1)

**Calls:**
- `readSceneStorageManifest` (1)

### `readSceneStorageManifest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:76` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (1)

**Calls:**
- `readSceneDocumentStructure` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:105` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `min` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` | Self: 0.0% (0us) | Total: 0.1% (9.2ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:188` | Self: 0.0% (0us) | Total: 6.5% (329.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (27)

**Calls:**
- `readSceneDocument` (27)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:112` | Self: 0.0% (0us) | Total: 0.2% (14.6ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (3)

**Calls:**
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:48` | Self: 0.0% (0us) | Total: 0.2% (12.2ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `generatorResume`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `performIteration` (1)

**Calls:**
- `getRecords` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `linkAndEvaluateModule` (2)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)

**Calls:**
- `map` (1)

### `deleteRecord`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:197` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `bound deleteRecord` (1)

**Calls:**
- `delete` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` | Self: 0.0% (0us) | Total: 0.2% (13.5ms) | Samples: 0

**Called by:**
- `bound _iterate` (1)

**Calls:**
- `values` (1)

### `getAllValues`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `bound getAllValues` (1)

**Calls:**
- `structuredClone` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `node:assert` (10)

**Calls:**
- `get` (10)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.2% (12.8ms) | Samples: 0

**Called by:**
- `internal:util/colors` (6)

**Calls:**
- `(anonymous)` (6)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` | Self: 0.0% (0us) | Total: 1.2% (61.0ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `map` (7)

### `FDBDatabase`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:40` | Self: 0.0% (0us) | Total: 0.2% (11.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `FakeDOMStringList` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` | Self: 0.0% (0us) | Total: 0.3% (18.7ms) | Samples: 0

**Called by:**
- `evaluate` (7)

**Calls:**
- `digest` (7)

### `valueToKey`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKey.js:7` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `cmp` (1)

**Calls:**
- `valueToKeyWithoutThrowing` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (0us) | Total: 0.5% (27.6ms) | Samples: 0

**Called by:**
- `migrateLegacyModel` (2)
- `async prepareSceneStorage` (1)

**Calls:**
- `sceneBounds` (1)
- `indexSceneDocument` (1)
- `sceneBounds` (1)

### `bound _iterate`
`[native code]` | Self: 0.0% (0us) | Total: 29.6% (1.48s) | Samples: 0

**Called by:**
- `_start` (122)

**Calls:**
- `_iterate` (120)
- `_iterate` (1)
- `_iterate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` | Self: 0.0% (0us) | Total: 26.9% (1.35s) | Samples: 0

**Called by:**
- `invoke` (176)

**Calls:**
- `(anonymous)` (175)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` | Self: 0.0% (0us) | Total: 0.3% (16.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async mutateSceneBlobStorage` (1)

### `includes`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBKeyRange.js:59` | Self: 0.0% (0us) | Total: 0.5% (26.6ms) | Samples: 0

**Called by:**
- `_iterate` (1)

**Calls:**
- `cmp` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:181` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `collectUnreferencedSceneBlobs` (3)
- `collectUnreferencedSceneBlobs` (2)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (2)

**Calls:**
- `link` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` | Self: 0.0% (0us) | Total: 0.0% (3.4ms) | Samples: 0

**Calls:**
- `waitForOthersClosed` (2)
- `waitForOthersClosed` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.2% (13.8ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `refresh` (6)
- `refresh` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:64` | Self: 0.0% (0us) | Total: 11.1% (558.7ms) | Samples: 0

**Called by:**
- `async scenePixelHash` (36)

**Calls:**
- `digest` (36)

### `async inspectSceneBlobRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:147` | Self: 0.0% (0us) | Total: 4.4% (222.7ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (14)

**Calls:**
- `async inspectSnapshot` (14)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `assign` (10)

**Calls:**
- `loadAssertionError` (10)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:165` | Self: 0.0% (0us) | Total: 6.2% (313.5ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (25)

**Calls:**
- `async hydrateSceneStorage` (19)
- `async hydrateSceneStorage` (5)
- `async hydrateSceneStorage` (1)

### `cloneValueForInsertion`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `buildRecordAddPut` (5)

**Calls:**
- `structuredClone` (5)

### `forEach`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:144` | Self: 0.0% (0us) | Total: 14.5% (729.4ms) | Samples: 0

**Called by:**
- `some` (91)

**Calls:**
- `sameSceneStoredValue` (87)
- `sameSceneStoredValue` (4)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `readSceneMaterial` (1)

**Calls:**
- `includes` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `parseModule` (10)

**Calls:**
- `anonymous` (10)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.5% (29.6ms) | Samples: 0

**Called by:**
- `anonymous` (10)

**Calls:**
- `assign` (10)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` | Self: 0.0% (0us) | Total: 0.8% (42.8ms) | Samples: 0

**Called by:**
- `collectRecords` (3)

**Calls:**
- `finish` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:195` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `finish` (5)

**Calls:**
- `put` (5)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:162` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async mutateSceneBlobStorage` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` | Self: 0.0% (0us) | Total: 0.2% (11.6ms) | Samples: 0

**Called by:**
- `makeSceneAtlasDocument` (2)

**Calls:**
- `readSceneDocument` (2)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:46` | Self: 0.0% (0us) | Total: 0.2% (11.6ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `makeSceneAtlasDocument` (2)

### `(anonymous)`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.0% (869us) | Samples: 0

**Called by:**
- `filter` (1)

**Calls:**
- `bound call` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` | Self: 0.0% (0us) | Total: 0.3% (18.9ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `digest` (5)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:46` | Self: 0.0% (0us) | Total: 3.1% (156.8ms) | Samples: 0

**Called by:**
- `(module)` (24)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `async mutateSceneBlobStorage` (26)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` | Self: 0.0% (0us) | Total: 4.4% (222.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)

**Calls:**
- `async inspectSceneBlobRecords` (14)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` | Self: 0.0% (0us) | Total: 4.6% (235.6ms) | Samples: 0

**Called by:**
- `map` (19)

**Calls:**
- `Uint8Array` (19)

### `put`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `buildRecordAddPut` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:141` | Self: 0.0% (0us) | Total: 14.5% (729.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (91)

**Calls:**
- `some` (91)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` | Self: 0.0% (0us) | Total: 0.6% (33.1ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `gc` (4)

### `getRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `_getRecordsForNode` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 9.0% (452.5ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (27)
- `async prepareSceneStorage` (19)

**Calls:**
- `readSceneDocumentStructure` (45)
- `readSceneDocumentStructure` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` | Self: 0.0% (0us) | Total: 2.7% (139.7ms) | Samples: 0

**Called by:**
- `evaluate` (24)

**Calls:**
- `async mutateSceneBlobStorage` (24)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:114` | Self: 0.0% (0us) | Total: 0.0% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `checkScenePixelBytes` (1)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:78` | Self: 0.0% (0us) | Total: 0.0% (906us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readRecords` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` | Self: 0.0% (0us) | Total: 1.9% (97.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)
- `collectUnreferencedSceneBlobs` (2)

**Calls:**
- `(anonymous)` (5)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 40.7% (2.04s) | Samples: 0

**Calls:**
- `(anonymous)` (191)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:69` | Self: 0.0% (0us) | Total: 3.1% (156.8ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (26)

**Calls:**
- `async prepareSceneStorage` (26)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` | Self: 0.0% (0us) | Total: 1.0% (54.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `finish` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` | Self: 0.0% (0us) | Total: 27.7% (1.39s) | Samples: 0

**Called by:**
- `(anonymous)` (175)
- `collectRecords` (1)

**Calls:**
- `(anonymous)` (91)
- `(anonymous)` (79)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 8.6% (435.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (45)

**Calls:**
- `Uint8Array` (45)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:126` | Self: 0.0% (0us) | Total: 3.3% (168.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)
- `async prepareSceneStorage` (1)

**Calls:**
- `async scenePixelHash` (12)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` | Self: 0.0% (0us) | Total: 28.4% (1.42s) | Samples: 0

**Called by:**
- `_start` (178)
- `waitForOthersClosed` (1)

**Calls:**
- `invokeEventListeners` (179)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` | Self: 0.0% (0us) | Total: 1.4% (72.7ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `fixture` (7)
- `fixture` (2)

### `objectStore`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:137` | Self: 0.0% (0us) | Total: 0.0% (990us) | Samples: 0

**Called by:**
- `invoke` (1)

**Calls:**
- `FDBObjectStore` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:179` | Self: 0.0% (0us) | Total: 0.3% (15.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `sceneBlobSummary` (1)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.3% (15.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound call` (3)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:16` | Self: 0.0% (0us) | Total: 0.5% (29.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `openCursor` (1)

### `Writable`
`internal:streams/writable:181` | Self: 0.0% (0us) | Total: 0.0% (910us) | Samples: 0

**Called by:**
- `WriteStream` (1)

**Calls:**
- `WritableState` (1)

### `FDBTransaction`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:35` | Self: 0.0% (0us) | Total: 0.0% (1.5ms) | Samples: 0

**Called by:**
- `transaction` (1)

**Calls:**
- `addEventListener` (1)

### `invoke`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` | Self: 0.0% (0us) | Total: 28.4% (1.42s) | Samples: 0

**Called by:**
- `invokeEventListeners` (179)

**Calls:**
- `(anonymous)` (176)
- `(anonymous)` (2)
- `objectStore` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` | Self: 0.0% (0us) | Total: 28.4% (1.42s) | Samples: 0

**Called by:**
- `dispatchEvent` (179)

**Calls:**
- `invoke` (179)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` | Self: 0.0% (0us) | Total: 1.2% (65.1ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (5)
- `(module)` (4)
- `(module)` (1)

**Calls:**
- `update` (17)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` | Self: 0.0% (0us) | Total: 0.5% (28.0ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `update` (3)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:55` | Self: 0.0% (0us) | Total: 11.1% (558.7ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (24)
- `async prepareSceneStorage` (12)

**Calls:**
- `async scenePixelHash` (36)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:89` | Self: 0.0% (0us) | Total: 0.3% (16.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `readSurfaces` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` | Self: 0.0% (0us) | Total: 1.2% (61.3ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `deepEquals` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` | Self: 0.0% (0us) | Total: 1.4% (71.4ms) | Samples: 0

**Calls:**
- `_start` (2)

### `waitForOthersClosed`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:192` | Self: 0.0% (0us) | Total: 0.0% (990us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `dispatchEvent` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` | Self: 0.0% (0us) | Total: 28.8% (1.44s) | Samples: 0

**Called by:**
- `bound _iterate` (120)

**Calls:**
- `structuredClone` (120)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 16.8% (845.9ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (98)

**Calls:**
- `(module)` (35)
- `(module)` (24)
- `(module)` (9)
- `(module)` (7)
- `(module)` (5)
- `(module)` (4)
- `(module)` (4)
- `(module)` (4)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:119` | Self: 0.0% (0us) | Total: 2.7% (139.1ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (20)

**Calls:**
- `readSceneDocument` (19)
- `readSceneDocument` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` | Self: 0.0% (0us) | Total: 8.5% (428.5ms) | Samples: 0

**Called by:**
- `evaluate` (35)

**Calls:**
- `structuredClone` (35)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:116` | Self: 0.0% (0us) | Total: 0.0% (881us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `bound deleteRecord`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `deleteRecord` (1)

### `async inspectSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` | Self: 0.0% (0us) | Total: 6.2% (313.5ms) | Samples: 0

**Called by:**
- `async inspectSnapshot` (25)

**Calls:**
- `async hydrateSceneStorage` (25)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 69.5% | 3.48s | `[native code]` |
| 25.5% | 1.28s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts` |
| 1.2% | 61.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.6% | 30.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js` |
| 0.5% | 26.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\valueToKeyWithoutThrowing.js` |
| 0.3% | 16.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 0.3% | 16.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts` |
| 0.3% | 15.4ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js` |
| 0.3% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` |
| 0.2% | 13.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` |
| 0.2% | 12.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.2% | 11.9ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeDOMStringList.js` |
| 0.2% | 10.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 0.1% | 8.0ms | `internal:fs/streams` |
| 0.0% | 1.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js` |
| 0.0% | 1.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` |
| 0.0% | 997us | `internal:util/colors` |
| 0.0% | 967us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 958us | `node:fs/promises` |
| 0.0% | 910us | `internal:streams/writable` |
| 0.0% | 906us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts` |
