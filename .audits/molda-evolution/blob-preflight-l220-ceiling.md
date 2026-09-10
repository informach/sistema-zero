# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 4.22s | 416 | 1.0ms | 170 |

**Top 10:** `structuredClone` 33.8%, `Uint8Array` 18.8%, `sameScenePixelBytes` 16.4%, `digest` 10.2%, `deepEquals` 4.7%, `gc` 2.5%, `update` 2.1%, `getType` 1.0%, `async listSummaries` 0.9%, `readSceneStorageSnapshot` 0.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 33.8% | 1.43s | 33.8% | 1.43s | `structuredClone` | `[native code]` |
| 18.8% | 799.0ms | 18.8% | 799.0ms | `Uint8Array` | `[native code]` |
| 16.4% | 697.0ms | 16.4% | 697.0ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` |
| 10.2% | 433.6ms | 10.2% | 433.6ms | `digest` | `[native code]` |
| 4.7% | 201.5ms | 4.7% | 201.5ms | `deepEquals` | `[native code]` |
| 2.5% | 107.0ms | 2.5% | 107.0ms | `gc` | `[native code]` |
| 2.1% | 91.5ms | 2.1% | 91.5ms | `update` | `[native code]` |
| 1.0% | 43.3ms | 1.0% | 43.3ms | `getType` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:10` |
| 0.9% | 41.6ms | 0.9% | 41.6ms | `async listSummaries` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 0.7% | 31.5ms | 0.7% | 31.5ms | `readSceneStorageSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:26` |
| 0.7% | 30.9ms | 0.7% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.7% | 30.5ms | 0.7% | 30.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.7% | 29.8ms | 0.7% | 29.8ms | `[Symbol.iterator]` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` |
| 0.6% | 28.8ms | 0.6% | 28.8ms | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` |
| 0.3% | 16.0ms | 1.8% | 77.5ms | `from` | `[native code]` |
| 0.3% | 15.2ms | 0.3% | 15.2ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` |
| 0.3% | 15.2ms | 0.3% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:68` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:37` |
| 0.3% | 14.7ms | 1.3% | 58.2ms | `async (anonymous)` | `[native code]` |
| 0.3% | 14.6ms | 13.1% | 556.6ms | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 0.3% | 13.9ms | 11.0% | 466.8ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `readSceneSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:137` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `internal:shared` | `internal:shared` |
| 0.3% | 13.7ms | 0.3% | 13.7ms | `(anonymous)` | `internal:fixed_queue` |
| 0.3% | 13.3ms | 0.3% | 13.3ms | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:159` |
| 0.3% | 13.1ms | 0.3% | 13.1ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.3% | 13.0ms | 2.7% | 115.1ms | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` |
| 0.3% | 13.0ms | 0.3% | 13.0ms | `now` | `[native code]` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 3.1ms | `requestFetch` | `[native code]` |
| 0.0% | 3.0ms | 0.7% | 33.2ms | `parseModule` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `resolve` | `[native code]` |
| 0.0% | 1.7ms | 2.0% | 88.7ms | `anonymous` | `[native code]` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `copyDataProperties` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requestedModules` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 2.2ms | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.0% | 979us | 0.0% | 979us | `FDBTransaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js` |
| 0.0% | 966us | 0.0% | 966us | `references` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:52` |
| 0.0% | 955us | 6.5% | 275.5ms | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:112` |
| 0.0% | 950us | 0.0% | 950us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` |
| 0.0% | 939us | 0.0% | 939us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 0.0% | 931us | 0.0% | 931us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:141` |
| 0.0% | 897us | 0.0% | 897us | `get buffer` | `[native code]` |
| 0.0% | 877us | 0.0% | 877us | `readRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts` |
| 0.0% | 875us | 0.0% | 875us | `deprecate` | `internal:util/deprecate` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 58.5% | 2.47s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 58.2% | 2.46s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 34.2% | 1.44s | 0.0% | 0us | `map` | `[native code]` |
| 33.8% | 1.43s | 33.8% | 1.43s | `structuredClone` | `[native code]` |
| 26.7% | 1.12s | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` |
| 25.9% | 1.09s | 0.0% | 0us | `bound _iterate` | `[native code]` |
| 25.1% | 1.06s | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 25.1% | 1.06s | 0.0% | 0us | `evaluate` | `[native code]` |
| 23.2% | 981.7ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` |
| 18.8% | 799.0ms | 18.8% | 799.0ms | `Uint8Array` | `[native code]` |
| 16.4% | 697.0ms | 16.4% | 697.0ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` |
| 13.5% | 573.6ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 13.5% | 573.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` |
| 13.5% | 573.5ms | 0.0% | 0us | `readSceneImageStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` |
| 13.5% | 573.5ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` |
| 13.5% | 572.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 13.1% | 557.2ms | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` |
| 13.1% | 557.2ms | 0.0% | 0us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` |
| 13.1% | 557.2ms | 0.0% | 0us | `invoke` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` |
| 13.1% | 556.6ms | 0.3% | 14.6ms | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 12.4% | 528.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` |
| 11.7% | 495.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` |
| 11.0% | 466.8ms | 0.3% | 13.9ms | `sameSceneStoredValue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` |
| 10.2% | 433.6ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:78` |
| 10.2% | 433.6ms | 10.2% | 433.6ms | `digest` | `[native code]` |
| 10.2% | 433.6ms | 0.0% | 0us | `async scenePixelHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:87` |
| 9.1% | 385.6ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:186` |
| 8.4% | 355.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` |
| 7.3% | 310.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:187` |
| 7.3% | 310.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:184` |
| 7.3% | 310.6ms | 0.0% | 0us | `some` | `[native code]` |
| 6.5% | 275.5ms | 0.0% | 955us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:112` |
| 6.4% | 274.5ms | 0.0% | 0us | `matchesPreparedBody` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` |
| 6.1% | 260.3ms | 0.0% | 0us | `generatorResume` | `[native code]` |
| 6.0% | 254.8ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:127` |
| 5.9% | 252.2ms | 0.0% | 0us | `async hydrateSceneBlobStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:271` |
| 5.9% | 252.2ms | 0.0% | 0us | `async hydrateSceneBlobStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:278` |
| 5.9% | 252.2ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:163` |
| 5.3% | 226.4ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` |
| 5.3% | 226.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` |
| 4.8% | 203.2ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:85` |
| 4.8% | 203.2ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:108` |
| 4.8% | 203.2ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:106` |
| 4.7% | 201.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` |
| 4.7% | 201.5ms | 4.7% | 201.5ms | `deepEquals` | `[native code]` |
| 4.5% | 190.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` |
| 4.4% | 189.1ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` |
| 4.2% | 178.7ms | 0.0% | 0us | `async hydrateSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` |
| 3.7% | 156.8ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:114` |
| 3.6% | 156.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:214` |
| 2.7% | 115.1ms | 0.3% | 13.0ms | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` |
| 2.5% | 108.1ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` |
| 2.5% | 107.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` |
| 2.5% | 107.0ms | 2.5% | 107.0ms | `gc` | `[native code]` |
| 2.1% | 91.5ms | 2.1% | 91.5ms | `update` | `[native code]` |
| 2.0% | 88.7ms | 0.0% | 1.7ms | `anonymous` | `[native code]` |
| 2.0% | 86.7ms | 0.0% | 0us | `_findRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:206` |
| 1.8% | 77.8ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` |
| 1.8% | 77.5ms | 0.3% | 16.0ms | `from` | `[native code]` |
| 1.4% | 62.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` |
| 1.4% | 61.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` |
| 1.4% | 61.4ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` |
| 1.4% | 61.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:224` |
| 1.4% | 61.3ms | 0.0% | 0us | `put` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` |
| 1.4% | 61.3ms | 0.0% | 0us | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` |
| 1.4% | 61.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:238` |
| 1.4% | 61.3ms | 0.0% | 0us | `cloneValueForInsertion` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` |
| 1.4% | 61.3ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` |
| 1.4% | 61.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` |
| 1.3% | 58.2ms | 0.3% | 14.7ms | `async (anonymous)` | `[native code]` |
| 1.1% | 46.8ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` |
| 1.1% | 46.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` |
| 1.1% | 46.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` |
| 1.0% | 43.3ms | 0.0% | 0us | `cmp` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:30` |
| 1.0% | 43.3ms | 0.0% | 0us | `getRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` |
| 1.0% | 43.3ms | 1.0% | 43.3ms | `getType` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:10` |
| 1.0% | 43.3ms | 0.0% | 0us | `_findRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:200` |
| 1.0% | 43.3ms | 0.0% | 0us | `_findRecords` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:183` |
| 1.0% | 43.3ms | 0.0% | 0us | `_getRecordsForNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:168` |
| 0.9% | 41.6ms | 0.9% | 41.6ms | `async listSummaries` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 0.9% | 41.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:194` |
| 0.8% | 35.2ms | 0.0% | 0us | `link` | `[native code]` |
| 0.7% | 33.2ms | 0.0% | 3.0ms | `parseModule` | `[native code]` |
| 0.7% | 32.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` |
| 0.7% | 32.8ms | 0.0% | 0us | `getAllValues` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` |
| 0.7% | 32.8ms | 0.0% | 0us | `bound getAllValues` | `[native code]` |
| 0.7% | 31.5ms | 0.7% | 31.5ms | `readSceneStorageSnapshot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:26` |
| 0.7% | 31.5ms | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:109` |
| 0.7% | 30.9ms | 0.7% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.7% | 30.5ms | 0.7% | 30.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 0.7% | 30.1ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.7% | 29.8ms | 0.7% | 29.8ms | `[Symbol.iterator]` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` |
| 0.6% | 28.8ms | 0.6% | 28.8ms | `values` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` |
| 0.4% | 17.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` |
| 0.4% | 17.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` |
| 0.4% | 17.0ms | 0.0% | 0us | `waitForOthersClosed` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` |
| 0.3% | 16.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.3% | 16.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.3% | 15.4ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.3% | 15.4ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.3% | 15.4ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.3% | 15.2ms | 0.3% | 15.2ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` |
| 0.3% | 15.2ms | 0.3% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:68` |
| 0.3% | 15.2ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` |
| 0.3% | 15.1ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.3% | 15.0ms | 0.3% | 15.0ms | `sameScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:37` |
| 0.3% | 14.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` |
| 0.3% | 14.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` |
| 0.3% | 14.5ms | 0.0% | 0us | `collectUnreferencedSceneBlobs` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` |
| 0.3% | 14.0ms | 0.0% | 0us | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:113` |
| 0.3% | 13.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:82` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `readSceneSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:137` |
| 0.3% | 13.8ms | 0.3% | 13.8ms | `internal:shared` | `internal:shared` |
| 0.3% | 13.8ms | 0.0% | 0us | `node:assert` | `node:assert:12` |
| 0.3% | 13.8ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.3% | 13.7ms | 0.3% | 13.7ms | `(anonymous)` | `internal:fixed_queue` |
| 0.3% | 13.7ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.3% | 13.7ms | 0.0% | 0us | `WriteStream` | `internal:fs/streams:245` |
| 0.3% | 13.7ms | 0.0% | 0us | `Writable` | `internal:streams/writable:196` |
| 0.3% | 13.7ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.3% | 13.7ms | 0.0% | 0us | `FixedQueue` | `internal:fixed_queue:33` |
| 0.3% | 13.7ms | 0.0% | 0us | `construct` | `internal:streams/destroy:124` |
| 0.3% | 13.7ms | 0.0% | 0us | `nextTick` | `[native code]` |
| 0.3% | 13.7ms | 0.0% | 0us | `setup` | `[native code]` |
| 0.3% | 13.7ms | 0.0% | 0us | `FixedCircularBuffer` | `internal:fixed_queue:8` |
| 0.3% | 13.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` |
| 0.3% | 13.3ms | 0.3% | 13.3ms | `async prepareSceneStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:159` |
| 0.3% | 13.1ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` |
| 0.3% | 13.1ms | 0.0% | 0us | `transform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:57` |
| 0.3% | 13.1ms | 0.3% | 13.1ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.3% | 13.1ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:95` |
| 0.3% | 13.1ms | 0.0% | 0us | `node` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:77` |
| 0.3% | 13.0ms | 0.3% | 13.0ms | `now` | `[native code]` |
| 0.3% | 13.0ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:202` |
| 0.3% | 13.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEvent.js:19` |
| 0.3% | 13.0ms | 0.0% | 0us | `Event` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEvent.js:20` |
| 0.2% | 12.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` |
| 0.2% | 12.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` |
| 0.2% | 8.8ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.2% | 8.8ms | 0.2% | 8.8ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.1% | 6.3ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 3.1ms | `requestFetch` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 3.1ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `resolve` | `[native code]` |
| 0.0% | 2.2ms | 0.0% | 1.0ms | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.0% | 1.8ms | 0.0% | 0us | `async hydrateSceneBlobStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:280` |
| 0.0% | 1.2ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:118` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `copyDataProperties` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `requestedModules` | `[native code]` |
| 0.0% | 979us | 0.0% | 0us | `transaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:158` |
| 0.0% | 979us | 0.0% | 979us | `FDBTransaction` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js` |
| 0.0% | 966us | 0.0% | 0us | `inspectSnapshotStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` |
| 0.0% | 966us | 0.0% | 0us | `async mutateSceneBlobStorage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:110` |
| 0.0% | 966us | 0.0% | 966us | `references` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:52` |
| 0.0% | 950us | 0.0% | 950us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` |
| 0.0% | 939us | 0.0% | 939us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 0.0% | 931us | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 931us | 0.0% | 931us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:141` |
| 0.0% | 931us | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` |
| 0.0% | 931us | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:70` |
| 0.0% | 931us | 0.0% | 0us | `readSceneMaterial` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:140` |
| 0.0% | 897us | 0.0% | 897us | `get buffer` | `[native code]` |
| 0.0% | 897us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:115` |
| 0.0% | 897us | 0.0% | 0us | `checkScenePixelBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:53` |
| 0.0% | 877us | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:78` |
| 0.0% | 877us | 0.0% | 877us | `readRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts` |
| 0.0% | 875us | 0.0% | 875us | `deprecate` | `internal:util/deprecate` |
| 0.0% | 875us | 0.0% | 0us | `get` | `node:assert:575` |

## Function Details

### `structuredClone`
`[native code]` | Self: 33.8% (1.43s) | Total: 33.8% (1.43s) | Samples: 159

**Called by:**
- `_iterate` (100)
- `(module)` (49)
- `cloneValueForInsertion` (6)
- `getAllValues` (4)

### `Uint8Array`
`[native code]` | Self: 18.8% (799.0ms) | Total: 18.8% (799.0ms) | Samples: 69

**Called by:**
- `(anonymous)` (47)
- `(anonymous)` (22)

### `sameScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:43` | Self: 16.4% (697.0ms) | Total: 16.4% (697.0ms) | Samples: 83

**Called by:**
- `sameSceneStoredValue` (59)
- `matchesPreparedBody` (24)

### `digest`
`[native code]` | Self: 10.2% (433.6ms) | Total: 10.2% (433.6ms) | Samples: 24

**Called by:**
- `async scenePixelHash` (24)

### `deepEquals`
`[native code]` | Self: 4.7% (201.5ms) | Total: 4.7% (201.5ms) | Samples: 10

**Called by:**
- `(module)` (10)

### `gc`
`[native code]` | Self: 2.5% (107.0ms) | Total: 2.5% (107.0ms) | Samples: 13

**Called by:**
- `(module)` (13)

### `update`
`[native code]` | Self: 2.1% (91.5ms) | Total: 2.1% (91.5ms) | Samples: 12

**Called by:**
- `digest` (9)
- `(module)` (3)

### `getType`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:10` | Self: 1.0% (43.3ms) | Total: 1.0% (43.3ms) | Samples: 1

**Called by:**
- `cmp` (1)

### `async listSummaries`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` | Self: 0.9% (41.6ms) | Total: 0.9% (41.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `readSceneStorageSnapshot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:26` | Self: 0.7% (31.5ms) | Total: 0.7% (31.5ms) | Samples: 1

**Called by:**
- `async mutateSceneBlobStorage` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.7% (30.9ms) | Total: 0.7% (30.9ms) | Samples: 2

**Called by:**
- `from` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` | Self: 0.7% (30.5ms) | Total: 0.7% (30.5ms) | Samples: 2

**Called by:**
- `from` (2)

### `[Symbol.iterator]`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` | Self: 0.7% (29.8ms) | Total: 0.7% (29.8ms) | Samples: 1

**Called by:**
- `_iterate` (1)

### `values`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js:50` | Self: 0.6% (28.8ms) | Total: 0.6% (28.8ms) | Samples: 1

**Called by:**
- `_iterate` (1)

### `from`
`[native code]` | Self: 0.3% (16.0ms) | Total: 1.8% (77.5ms) | Samples: 2

**Called by:**
- `(anonymous)` (4)
- `waitForOthersClosed` (2)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)

### `sameScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` | Self: 0.3% (15.2ms) | Total: 0.3% (15.2ms) | Samples: 1

**Called by:**
- `sameSceneStoredValue` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:68` | Self: 0.3% (15.2ms) | Total: 0.3% (15.2ms) | Samples: 1

**Called by:**
- `invoke` (1)

### `sameScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:37` | Self: 0.3% (15.0ms) | Total: 0.3% (15.0ms) | Samples: 1

**Called by:**
- `sameSceneStoredValue` (1)

### `async (anonymous)`
`[native code]` | Self: 0.3% (14.7ms) | Total: 1.3% (58.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (7)
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (8)
- `resolve` (3)
- `requestedModules` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` | Self: 0.3% (14.6ms) | Total: 13.1% (556.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `dispatchEvent` (69)

### `sameSceneStoredValue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts:30` | Self: 0.3% (13.9ms) | Total: 11.0% (466.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (42)
- `(anonymous)` (20)

**Calls:**
- `sameScenePixelBytes` (59)
- `sameScenePixelBytes` (1)
- `sameScenePixelBytes` (1)

### `readSceneSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:137` | Self: 0.3% (13.8ms) | Total: 0.3% (13.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `internal:shared`
`internal:shared` | Self: 0.3% (13.8ms) | Total: 0.3% (13.8ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`internal:fixed_queue` | Self: 0.3% (13.7ms) | Total: 0.3% (13.7ms) | Samples: 1

**Called by:**
- `FixedCircularBuffer` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:159` | Self: 0.3% (13.3ms) | Total: 0.3% (13.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.3% (13.1ms) | Total: 0.3% (13.1ms) | Samples: 1

**Called by:**
- `composeTransform` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:109` | Self: 0.3% (13.0ms) | Total: 2.7% (115.1ms) | Samples: 1

**Called by:**
- `bound _iterate` (4)

**Calls:**
- `[Symbol.iterator]` (1)
- `generatorResume` (1)
- `values` (1)

### `now`
`[native code]` | Self: 0.3% (13.0ms) | Total: 0.3% (13.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.2% (8.8ms) | Total: 0.2% (8.8ms) | Samples: 1

**Called by:**
- `link` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (3.1ms) | Total: 0.0% (3.1ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `parseModule`
`[native code]` | Self: 0.0% (3.0ms) | Total: 0.7% (33.2ms) | Samples: 3

**Called by:**
- `async (anonymous)` (8)

**Calls:**
- `node:assert/strict` (5)

### `resolve`
`[native code]` | Self: 0.0% (2.8ms) | Total: 0.0% (2.8ms) | Samples: 3

**Called by:**
- `async (anonymous)` (3)

### `anonymous`
`[native code]` | Self: 0.0% (1.7ms) | Total: 2.0% (88.7ms) | Samples: 2

**Called by:**
- `node:assert/strict` (5)
- `internal:assert/assertion_error` (3)
- `loadAssertionError` (3)
- `node:assert` (1)
- `internal:validators` (1)

**Calls:**
- `node:assert` (4)
- `internal:assert/assertion_error` (3)
- `internal:shared` (1)
- `internal:util/colors` (1)
- `node:assert` (1)
- `internal:validators` (1)

### `copyDataProperties`
`[native code]` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `requestedModules`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (1.0ms) | Total: 0.0% (2.2ms) | Samples: 1

**Called by:**
- `async hydrateSceneStorage` (1)
- `async prepareSceneStorage` (1)

**Calls:**
- `indexSceneDocument` (1)

### `FDBTransaction`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js` | Self: 0.0% (979us) | Total: 0.0% (979us) | Samples: 1

**Called by:**
- `transaction` (1)

### `references`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:52` | Self: 0.0% (966us) | Total: 0.0% (966us) | Samples: 1

**Called by:**
- `inspectSnapshotStructure` (1)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:112` | Self: 0.0% (955us) | Total: 6.5% (275.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (25)

**Calls:**
- `matchesPreparedBody` (24)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:11` | Self: 0.0% (950us) | Total: 0.0% (950us) | Samples: 1

**Called by:**
- `async hydrateSceneBlobStructure` (1)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` | Self: 0.0% (939us) | Total: 0.0% (939us) | Samples: 1

**Called by:**
- `async hydrateSceneBlobStructure` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:141` | Self: 0.0% (931us) | Total: 0.0% (931us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `get buffer`
`[native code]` | Self: 0.0% (897us) | Total: 0.0% (897us) | Samples: 1

**Called by:**
- `checkScenePixelBytes` (1)

### `readRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts` | Self: 0.0% (877us) | Total: 0.0% (877us) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `deprecate`
`internal:util/deprecate` | Self: 0.0% (875us) | Total: 0.0% (875us) | Samples: 1

**Called by:**
- `get` (1)

### `node`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:77` | Self: 0.0% (0us) | Total: 0.3% (13.1ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `transform` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` | Self: 0.0% (0us) | Total: 1.4% (61.4ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `from` (4)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:394` | Self: 0.0% (0us) | Total: 13.5% (573.5ms) | Samples: 0

**Called by:**
- `readSceneDocument` (47)
- `async prepareSceneStorage` (1)

**Calls:**
- `map` (48)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 58.5% (2.47s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (226)
- `refresh` (1)

**Calls:**
- `async asyncModuleEvaluation` (120)
- `async mutateSceneBlobStorage` (25)
- `async hydrateSceneStorage` (21)
- `async mutateSceneBlobStorage` (15)
- `async prepareSceneStorage` (13)
- `async hydrateSceneBlobStructure` (9)
- `async hydrateSceneStorage` (9)
- `async (anonymous)` (7)
- `async hydrateSceneBlobStructure` (2)
- `async mutateSceneBlobStorage` (1)
- `async mutateSceneBlobStorage` (1)
- `WriteStream` (1)
- `async (anonymous)` (1)
- `async prepareSceneStorage` (1)
- `async loadAndEvaluateModule` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (35.2ms) | Samples: 0

**Called by:**
- `link` (3)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (3)
- `moduleDeclarationInstantiation` (1)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:110` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `inspectSnapshotStructure` (1)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `put` (6)

**Calls:**
- `cloneValueForInsertion` (6)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:112` | Self: 0.0% (0us) | Total: 1.1% (46.8ms) | Samples: 0

**Called by:**
- `collectRecords` (5)

**Calls:**
- `collectRecords` (5)

### `async hydrateSceneBlobStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:280` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `structuredBytes` (1)
- `structuredBytes` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 25.1% (1.06s) | Samples: 0

**Called by:**
- `(anonymous)` (120)

**Calls:**
- `evaluate` (120)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `readSceneMaterial` (1)

**Calls:**
- `(anonymous)` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:182` | Self: 0.0% (0us) | Total: 4.2% (178.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (9)
- `async hydrateSceneStorage` (2)

**Calls:**
- `async scenePixelHash` (11)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` | Self: 0.0% (0us) | Total: 26.7% (1.12s) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `bound _iterate` (104)
- `bound getAllValues` (4)

### `_findRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:183` | Self: 0.0% (0us) | Total: 1.0% (43.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `cmp` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:238` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `finish` (6)

**Calls:**
- `put` (6)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:120` | Self: 0.0% (0us) | Total: 4.4% (189.1ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (28)

**Calls:**
- `readSceneDocument` (27)
- `readSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:232` | Self: 0.0% (0us) | Total: 13.5% (573.5ms) | Samples: 0

**Called by:**
- `map` (48)

**Calls:**
- `(anonymous)` (47)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:73` | Self: 0.0% (0us) | Total: 1.1% (46.8ms) | Samples: 0

**Called by:**
- `invoke` (5)

**Calls:**
- `collectRecords` (5)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` | Self: 0.0% (0us) | Total: 0.7% (32.9ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `digest` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` | Self: 0.0% (0us) | Total: 8.4% (355.1ms) | Samples: 0

**Called by:**
- `evaluate` (49)

**Calls:**
- `structuredClone` (49)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:106` | Self: 0.0% (0us) | Total: 4.8% (203.2ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (30)

**Calls:**
- `async prepareSceneStorage` (28)
- `async prepareSceneStorage` (2)

### `_findRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:206` | Self: 0.0% (0us) | Total: 2.0% (86.7ms) | Samples: 0

**Called by:**
- `generatorResume` (2)

**Calls:**
- `generatorResume` (2)

### `invoke`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` | Self: 0.0% (0us) | Total: 13.1% (557.2ms) | Samples: 0

**Called by:**
- `invokeEventListeners` (70)

**Calls:**
- `(anonymous)` (64)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` | Self: 0.0% (0us) | Total: 0.3% (14.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `get`
`node:assert:575` | Self: 0.0% (0us) | Total: 0.0% (875us) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `deprecate` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (8.8ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `bound _iterate`
`[native code]` | Self: 0.0% (0us) | Total: 25.9% (1.09s) | Samples: 0

**Called by:**
- `_start` (104)

**Calls:**
- `_iterate` (100)
- `_iterate` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:184` | Self: 0.0% (0us) | Total: 7.3% (310.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (42)

**Calls:**
- `some` (42)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `node:assert` (4)

**Calls:**
- `get` (3)
- `get` (1)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:108` | Self: 0.0% (0us) | Total: 4.8% (203.2ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (30)

**Calls:**
- `async prepareSceneStorage` (30)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (15.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:163` | Self: 0.0% (0us) | Total: 5.9% (252.2ms) | Samples: 0

**Called by:**
- `async hydrateSceneBlobStructure` (24)

**Calls:**
- `async hydrateSceneStorage` (22)
- `async hydrateSceneStorage` (2)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:95` | Self: 0.0% (0us) | Total: 0.3% (13.1ms) | Samples: 0

**Called by:**
- `transform` (1)

**Calls:**
- `finiteTuple` (1)

### `generatorResume`
`[native code]` | Self: 0.0% (0us) | Total: 6.1% (260.3ms) | Samples: 0

**Called by:**
- `_findRecords` (2)
- `_findRecords` (1)
- `getRecords` (1)
- `_iterate` (1)
- `_getRecordsForNode` (1)

**Calls:**
- `_findRecords` (2)
- `_findRecords` (1)
- `getRecords` (1)
- `_getRecordsForNode` (1)
- `_findRecords` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:393` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `map` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 34.2% (1.44s) | Samples: 0

**Called by:**
- `readSceneImageStructure` (48)
- `readSceneDocumentStructure` (48)
- `async hydrateSceneStorage` (22)
- `fixture` (4)
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)

**Calls:**
- `(anonymous)` (48)
- `readSceneImageStructure` (48)
- `(anonymous)` (22)
- `(anonymous)` (4)
- `node` (1)
- `readSceneMaterial` (1)

### `getAllValues`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` | Self: 0.0% (0us) | Total: 0.7% (32.8ms) | Samples: 0

**Called by:**
- `bound getAllValues` (4)

**Calls:**
- `structuredClone` (4)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:186` | Self: 0.0% (0us) | Total: 9.1% (385.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `readSceneDocument` (20)
- `readSceneDocument` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` | Self: 0.0% (0us) | Total: 1.4% (61.4ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `map` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` | Self: 0.0% (0us) | Total: 0.2% (12.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `FixedCircularBuffer`
`internal:fixed_queue:8` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `FixedQueue` (1)

**Calls:**
- `(anonymous)` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:113` | Self: 0.0% (0us) | Total: 0.3% (14.0ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (2)

**Calls:**
- `readSceneDocumentStructure` (1)
- `readSceneDocumentStructure` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` | Self: 0.0% (0us) | Total: 0.2% (12.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async mutateSceneBlobStorage` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` | Self: 0.0% (0us) | Total: 11.7% (495.1ms) | Samples: 0

**Called by:**
- `invoke` (64)

**Calls:**
- `(anonymous)` (63)
- `(anonymous)` (1)

### `cmp`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js:30` | Self: 0.0% (0us) | Total: 1.0% (43.3ms) | Samples: 0

**Called by:**
- `_findRecords` (1)

**Calls:**
- `getType` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 7.3% (310.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (42)

**Calls:**
- `(anonymous)` (42)

### `FixedQueue`
`internal:fixed_queue:33` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `setup` (1)

**Calls:**
- `FixedCircularBuffer` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:247` | Self: 0.0% (0us) | Total: 0.4% (17.0ms) | Samples: 0

**Calls:**
- `waitForOthersClosed` (3)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `async hydrateSceneBlobStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:278` | Self: 0.0% (0us) | Total: 5.9% (252.2ms) | Samples: 0

**Called by:**
- `async hydrateSceneBlobStructure` (24)

**Calls:**
- `async hydrateSceneStorage` (24)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:114` | Self: 0.0% (0us) | Total: 3.7% (156.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (15)

**Calls:**
- `async hydrateSceneBlobStructure` (15)

### `Writable`
`internal:streams/writable:196` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `WriteStream` (1)

**Calls:**
- `construct` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `assign` (3)

**Calls:**
- `loadAssertionError` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` | Self: 0.0% (0us) | Total: 5.3% (226.4ms) | Samples: 0

**Called by:**
- `map` (22)

**Calls:**
- `Uint8Array` (22)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:118` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `copyDataProperties` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` | Self: 0.0% (0us) | Total: 0.4% (17.6ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `digest` (4)

### `cloneValueForInsertion`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `buildRecordAddPut` (6)

**Calls:**
- `structuredClone` (6)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:87` | Self: 0.0% (0us) | Total: 10.2% (433.6ms) | Samples: 0

**Called by:**
- `async scenePixelHash` (24)

**Calls:**
- `digest` (24)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` | Self: 0.0% (0us) | Total: 2.5% (108.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)
- `(anonymous)` (5)
- `collectUnreferencedSceneBlobs` (1)

**Calls:**
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (1)

### `async prepareSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:127` | Self: 0.0% (0us) | Total: 6.0% (254.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)

**Calls:**
- `async scenePixelHash` (13)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.7% (30.1ms) | Samples: 0

**Called by:**
- `parseModule` (5)

**Calls:**
- `anonymous` (5)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.3% (16.3ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `assign` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:136` | Self: 0.0% (0us) | Total: 0.3% (14.5ms) | Samples: 0

**Called by:**
- `collectRecords` (1)

**Calls:**
- `finish` (1)

### `node:assert`
`node:assert:12` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `readSceneImageStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:229` | Self: 0.0% (0us) | Total: 13.5% (573.5ms) | Samples: 0

**Called by:**
- `map` (48)

**Calls:**
- `map` (48)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:70` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readSceneDocument` (1)

### `Event`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEvent.js:20` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Called by:**
- `_start` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:115` | Self: 0.0% (0us) | Total: 0.0% (897us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `checkScenePixelBytes` (1)

### `waitForOthersClosed`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBFactory.js:165` | Self: 0.0% (0us) | Total: 0.4% (17.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `from` (2)
- `transaction` (1)

### `put`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `buildRecordAddPut` (6)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.3% (15.4ms) | Samples: 0

**Called by:**
- `get` (3)

**Calls:**
- `anonymous` (3)

### `getRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:162` | Self: 0.0% (0us) | Total: 1.0% (43.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `generatorResume` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (6.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:224` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `collectUnreferencedSceneBlobs` (5)
- `collectUnreferencedSceneBlobs` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (3.1ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:214` | Self: 0.0% (0us) | Total: 3.6% (156.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (20)

**Calls:**
- `sameSceneStoredValue` (20)

### `construct`
`internal:streams/destroy:124` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `Writable` (1)

**Calls:**
- `nextTick` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 13.5% (573.6ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (27)
- `async hydrateSceneStorage` (20)
- `fixture` (1)

**Calls:**
- `readSceneDocumentStructure` (47)
- `readSceneDocumentStructure` (1)

### `setup`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `nextTick` (1)

**Calls:**
- `FixedQueue` (1)

### `async scenePixelHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:78` | Self: 0.0% (0us) | Total: 10.2% (433.6ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (13)
- `async hydrateSceneStorage` (11)

**Calls:**
- `async scenePixelHash` (24)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:187` | Self: 0.0% (0us) | Total: 7.3% (310.6ms) | Samples: 0

**Called by:**
- `some` (42)

**Calls:**
- `sameSceneStoredValue` (42)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:85` | Self: 0.0% (0us) | Total: 4.8% (203.2ms) | Samples: 0

**Called by:**
- `(module)` (29)
- `(module)` (1)

**Calls:**
- `async mutateSceneBlobStorage` (30)

### `async hydrateSceneStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts:180` | Self: 0.0% (0us) | Total: 5.3% (226.4ms) | Samples: 0

**Called by:**
- `async hydrateSceneStorage` (22)

**Calls:**
- `map` (22)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:78` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readRecords` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:47` | Self: 0.0% (0us) | Total: 1.4% (61.3ms) | Samples: 0

**Called by:**
- `collectUnreferencedSceneBlobs` (5)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (6)

### `bound getAllValues`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (32.8ms) | Samples: 0

**Called by:**
- `_start` (4)

**Calls:**
- `getAllValues` (4)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 58.2% (2.46s) | Samples: 0

**Calls:**
- `(anonymous)` (226)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:117` | Self: 0.0% (0us) | Total: 12.4% (528.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (63)
- `collectRecords` (5)

**Calls:**
- `(anonymous)` (42)
- `(anonymous)` (20)
- `(anonymous)` (6)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:66` | Self: 0.0% (0us) | Total: 1.1% (46.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `finish` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 13.5% (572.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (47)

**Calls:**
- `Uint8Array` (47)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:202` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Calls:**
- `Event` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` | Self: 0.0% (0us) | Total: 2.5% (107.0ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `gc` (13)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` | Self: 0.0% (0us) | Total: 13.1% (557.2ms) | Samples: 0

**Called by:**
- `_start` (69)
- `_start` (1)

**Calls:**
- `invokeEventListeners` (70)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` | Self: 0.0% (0us) | Total: 1.4% (62.4ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `fixture` (4)
- `fixture` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:387` | Self: 0.0% (0us) | Total: 0.3% (13.1ms) | Samples: 0

**Called by:**
- `async prepareSceneStorage` (1)

**Calls:**
- `map` (1)

### `collectUnreferencedSceneBlobs`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobCollection.ts:113` | Self: 0.0% (0us) | Total: 0.3% (14.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `collectRecords` (1)

### `inspectSnapshotStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:226` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (1)

**Calls:**
- `references` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEvent.js:19` | Self: 0.0% (0us) | Total: 0.3% (13.0ms) | Samples: 0

**Called by:**
- `Event` (1)

**Calls:**
- `now` (1)

### `_findRecords`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:200` | Self: 0.0% (0us) | Total: 1.0% (43.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `generatorResume` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` | Self: 0.0% (0us) | Total: 4.5% (190.5ms) | Samples: 0

**Called by:**
- `evaluate` (29)

**Calls:**
- `async mutateSceneBlobStorage` (29)

### `WriteStream`
`internal:fs/streams:245` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Writable` (1)

### `transaction`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBDatabase.js:158` | Self: 0.0% (0us) | Total: 0.0% (979us) | Samples: 0

**Called by:**
- `waitForOthersClosed` (1)

**Calls:**
- `FDBTransaction` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` | Self: 0.0% (0us) | Total: 13.1% (557.2ms) | Samples: 0

**Called by:**
- `dispatchEvent` (70)

**Calls:**
- `invoke` (70)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` | Self: 0.0% (0us) | Total: 1.8% (77.8ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `update` (9)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` | Self: 0.0% (0us) | Total: 0.3% (15.2ms) | Samples: 0

**Calls:**
- `dispatchEvent` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `checkScenePixelBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts:53` | Self: 0.0% (0us) | Total: 0.0% (897us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `get buffer` (1)

### `_getRecordsForNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\binarySearchTree.js:168` | Self: 0.0% (0us) | Total: 1.0% (43.3ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `generatorResume` (1)

### `matchesPreparedBody`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:71` | Self: 0.0% (0us) | Total: 6.4% (274.5ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (24)

**Calls:**
- `sameScenePixelBytes` (24)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` | Self: 0.0% (0us) | Total: 4.7% (201.5ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `deepEquals` (10)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:82` | Self: 0.0% (0us) | Total: 0.3% (13.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readSceneSummary` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `update` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` | Self: 0.0% (0us) | Total: 1.4% (61.2ms) | Samples: 0

**Calls:**
- `_start` (5)
- `_start` (1)

### `async mutateSceneBlobStorage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts:109` | Self: 0.0% (0us) | Total: 0.7% (31.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readSceneStorageSnapshot` (1)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` | Self: 0.0% (0us) | Total: 23.2% (981.7ms) | Samples: 0

**Called by:**
- `bound _iterate` (100)

**Calls:**
- `structuredClone` (100)

### `transform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:57` | Self: 0.0% (0us) | Total: 0.3% (13.1ms) | Samples: 0

**Called by:**
- `node` (1)

**Calls:**
- `composeTransform` (1)

### `readSceneMaterial`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:140` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 25.1% (1.06s) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (120)

**Calls:**
- `(module)` (49)
- `(module)` (29)
- `(module)` (13)
- `(module)` (10)
- `(module)` (5)
- `(module)` (4)
- `(module)` (3)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `async hydrateSceneBlobStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts:271` | Self: 0.0% (0us) | Total: 5.9% (252.2ms) | Samples: 0

**Called by:**
- `async mutateSceneBlobStorage` (15)
- `(anonymous)` (9)

**Calls:**
- `async hydrateSceneBlobStructure` (24)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:194` | Self: 0.0% (0us) | Total: 0.9% (41.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async listSummaries` (1)

### `nextTick`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (13.7ms) | Samples: 0

**Called by:**
- `construct` (1)

**Calls:**
- `setup` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 74.0% | 3.13s | `[native code]` |
| 17.2% | 727.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlob.ts` |
| 1.4% | 61.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 1.3% | 58.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\RecordStore.js` |
| 1.3% | 56.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts` |
| 1.0% | 43.3ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cmp.js` |
| 0.7% | 31.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts` |
| 0.3% | 15.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js` |
| 0.3% | 13.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageCompare.ts` |
| 0.3% | 13.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts` |
| 0.3% | 13.8ms | `internal:shared` |
| 0.3% | 13.7ms | `internal:fixed_queue` |
| 0.3% | 13.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageDocument.ts` |
| 0.3% | 13.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.3% | 13.0ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js` |
| 0.0% | 1.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts` |
| 0.0% | 966us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobStorage.ts` |
| 0.0% | 955us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneBlobWrite.ts` |
| 0.0% | 877us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts` |
| 0.0% | 875us | `internal:util/deprecate` |
