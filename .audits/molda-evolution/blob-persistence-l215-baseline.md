# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.33s | 304 | 1.0ms | 109 |

**Top 10:** `structuredClone` 73.6%, `(anonymous)` 5.9%, `update` 4.0%, `Uint8Array` 3.4%, `gc` 1.9%, `(anonymous)` 1.3%, `(anonymous)` 1.3%, `deepEquals` 0.8%, `anonymous` 0.6%, `reduce` 0.6%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 73.6% | 1.72s | 73.6% | 1.72s | `structuredClone` | `[native code]` |
| 5.9% | 139.8ms | 9.4% | 221.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:196` |
| 4.0% | 94.5ms | 4.0% | 94.5ms | `update` | `[native code]` |
| 3.4% | 81.3ms | 3.4% | 81.3ms | `Uint8Array` | `[native code]` |
| 1.9% | 44.9ms | 1.9% | 44.9ms | `gc` | `[native code]` |
| 1.3% | 31.6ms | 1.3% | 31.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 1.3% | 30.9ms | 1.3% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.8% | 18.7ms | 0.8% | 18.7ms | `deepEquals` | `[native code]` |
| 0.6% | 16.3ms | 7.4% | 175.4ms | `anonymous` | `[native code]` |
| 0.6% | 16.1ms | 0.6% | 16.1ms | `reduce` | `[native code]` |
| 0.6% | 15.9ms | 0.6% | 15.9ms | `get buffer` | `[native code]` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.5% | 13.9ms | 0.5% | 13.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 13.5ms | 30.5% | 714.2ms | `processTicksAndRejections` | `[native code]` |
| 0.5% | 13.2ms | 0.5% | 13.2ms | `async nativeDatabase` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `BroadcastChannel` | `[native code]` |
| 0.5% | 12.4ms | 0.5% | 12.4ms | `resolve` | `[native code]` |
| 0.4% | 11.1ms | 0.4% | 11.1ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:338` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 999us | 0.0% | 999us | `internal:streams/readable` | `internal:streams/readable:530` |
| 0.0% | 877us | 0.0% | 877us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.0% | 864us | 0.0% | 864us | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:190` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 73.6% | 1.72s | 73.6% | 1.72s | `structuredClone` | `[native code]` |
| 39.5% | 924.4ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` |
| 38.2% | 895.2ms | 0.0% | 0us | `bound _iterate` | `[native code]` |
| 38.2% | 895.2ms | 0.0% | 0us | `_iterate` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` |
| 30.7% | 719.0ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 30.5% | 714.2ms | 0.5% | 13.5ms | `processTicksAndRejections` | `[native code]` |
| 28.6% | 670.8ms | 0.0% | 0us | `invoke` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` |
| 28.6% | 670.8ms | 0.0% | 0us | `invokeEventListeners` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` |
| 28.6% | 670.8ms | 0.0% | 0us | `dispatchEvent` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` |
| 28.1% | 657.9ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` |
| 28.1% | 657.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:82` |
| 26.7% | 626.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` |
| 26.1% | 611.5ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 26.1% | 611.5ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 23.6% | 552.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:256` |
| 23.6% | 552.5ms | 0.0% | 0us | `buildRecordAddPut` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` |
| 23.6% | 552.5ms | 0.0% | 0us | `put` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` |
| 23.6% | 552.5ms | 0.0% | 0us | `cloneValueForInsertion` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` |
| 22.8% | 534.1ms | 0.0% | 0us | `map` | `[native code]` |
| 12.8% | 299.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` |
| 10.5% | 246.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` |
| 10.0% | 234.2ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:344` |
| 9.4% | 221.2ms | 5.9% | 139.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:196` |
| 9.4% | 221.2ms | 0.0% | 0us | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:186` |
| 7.7% | 181.5ms | 0.0% | 0us | `link` | `[native code]` |
| 7.4% | 175.4ms | 0.6% | 16.3ms | `anonymous` | `[native code]` |
| 6.3% | 148.7ms | 0.0% | 0us | `inspect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:94` |
| 5.5% | 129.6ms | 0.0% | 0us | `async mutate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:161` |
| 4.8% | 113.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` |
| 4.0% | 94.5ms | 4.0% | 94.5ms | `update` | `[native code]` |
| 3.8% | 89.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:199` |
| 3.4% | 81.3ms | 3.4% | 81.3ms | `Uint8Array` | `[native code]` |
| 2.7% | 63.4ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` |
| 2.6% | 62.9ms | 0.0% | 0us | `collectRecords` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` |
| 2.6% | 62.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` |
| 2.6% | 62.5ms | 0.0% | 0us | `fixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` |
| 2.6% | 62.5ms | 0.0% | 0us | `from` | `[native code]` |
| 2.6% | 62.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` |
| 1.9% | 44.9ms | 1.9% | 44.9ms | `gc` | `[native code]` |
| 1.9% | 44.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` |
| 1.3% | 31.7ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.3% | 31.6ms | 1.3% | 31.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` |
| 1.3% | 31.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:77` |
| 1.3% | 31.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:42` |
| 1.3% | 31.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` |
| 1.3% | 30.9ms | 1.3% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 1.2% | 29.1ms | 0.0% | 0us | `getAllValues` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` |
| 1.2% | 29.1ms | 0.0% | 0us | `bound getAllValues` | `[native code]` |
| 1.2% | 28.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:361` |
| 0.8% | 18.7ms | 0.8% | 18.7ms | `deepEquals` | `[native code]` |
| 0.8% | 18.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` |
| 0.7% | 17.3ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.7% | 17.3ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.7% | 17.3ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.7% | 17.3ms | 0.0% | 0us | `node:assert/strict` | `node:assert/strict:3` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `parseModule` | `[native code]` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.7% | 17.3ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.7% | 17.3ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.7% | 17.3ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.7% | 17.3ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.7% | 17.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` |
| 0.7% | 16.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` |
| 0.7% | 16.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` |
| 0.6% | 16.1ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:65` |
| 0.6% | 16.1ms | 0.6% | 16.1ms | `reduce` | `[native code]` |
| 0.6% | 15.9ms | 0.6% | 15.9ms | `get buffer` | `[native code]` |
| 0.6% | 15.9ms | 0.0% | 0us | `sceneSummary` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:37` |
| 0.6% | 15.9ms | 0.0% | 0us | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:12` |
| 0.6% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:248` |
| 0.6% | 15.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` |
| 0.6% | 15.0ms | 0.0% | 0us | `inspect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:111` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `structuredBytes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `choice` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` |
| 0.6% | 15.0ms | 0.0% | 0us | `node` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:61` |
| 0.6% | 15.0ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:335` |
| 0.5% | 13.9ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 0.5% | 13.9ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.5% | 13.9ms | 0.5% | 13.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 13.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` |
| 0.5% | 13.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:157` |
| 0.5% | 13.2ms | 0.5% | 13.2ms | `async nativeDatabase` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts` |
| 0.5% | 13.2ms | 0.0% | 0us | `async nativeDatabase` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:5` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `readSceneImage` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` |
| 0.5% | 12.8ms | 0.0% | 0us | `open` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:26` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `BroadcastChannel` | `[native code]` |
| 0.5% | 12.8ms | 0.0% | 0us | `notifySceneStorageCommit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:62` |
| 0.5% | 12.8ms | 0.0% | 0us | `_start` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` |
| 0.5% | 12.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:185` |
| 0.5% | 12.4ms | 0.5% | 12.4ms | `resolve` | `[native code]` |
| 0.4% | 11.1ms | 0.4% | 11.1ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.4% | 11.1ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` |
| 0.0% | 1.8ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:338` |
| 0.0% | 1.0ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:338` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 999us | 0.0% | 999us | `internal:streams/readable` | `internal:streams/readable:530` |
| 0.0% | 877us | 0.0% | 877us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.0% | 864us | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` |
| 0.0% | 864us | 0.0% | 864us | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:190` |

## Function Details

### `structuredClone`
`[native code]` | Self: 73.6% (1.72s) | Total: 73.6% (1.72s) | Samples: 222

**Called by:**
- `_iterate` (119)
- `cloneValueForInsertion` (66)
- `(module)` (33)
- `getAllValues` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:196` | Self: 5.9% (139.8ms) | Total: 9.4% (221.2ms) | Samples: 23

**Called by:**
- `map` (37)

**Calls:**
- `Uint8Array` (14)

### `update`
`[native code]` | Self: 4.0% (94.5ms) | Total: 4.0% (94.5ms) | Samples: 11

**Called by:**
- `digest` (7)
- `(module)` (4)

### `Uint8Array`
`[native code]` | Self: 3.4% (81.3ms) | Total: 3.4% (81.3ms) | Samples: 14

**Called by:**
- `(anonymous)` (14)

### `gc`
`[native code]` | Self: 1.9% (44.9ms) | Total: 1.9% (44.9ms) | Samples: 6

**Called by:**
- `(module)` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:58` | Self: 1.3% (31.6ms) | Total: 1.3% (31.6ms) | Samples: 2

**Called by:**
- `from` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 1.3% (30.9ms) | Total: 1.3% (30.9ms) | Samples: 2

**Called by:**
- `from` (2)

### `deepEquals`
`[native code]` | Self: 0.8% (18.7ms) | Total: 0.8% (18.7ms) | Samples: 5

**Called by:**
- `(module)` (5)

### `anonymous`
`[native code]` | Self: 0.6% (16.3ms) | Total: 7.4% (175.4ms) | Samples: 2

**Called by:**
- `internal:assert/assertion_error` (3)
- `loadAssertionError` (3)
- `internal:fs/streams` (3)
- `node:assert/strict` (3)
- `node:stream` (3)
- `internal:streams/operators` (3)
- `get WriteStream` (3)
- `internal:streams/pipeline` (3)
- `internal:stream` (3)
- `internal:streams/compose` (3)
- `internal:streams/duplex` (2)

**Calls:**
- `internal:assert/assertion_error` (3)
- `internal:util/colors` (3)
- `internal:fs/streams` (3)
- `node:stream` (3)
- `node:assert` (3)
- `internal:streams/operators` (3)
- `internal:streams/pipeline` (3)
- `internal:stream` (3)
- `internal:streams/compose` (3)
- `internal:streams/duplex` (2)
- `internal:streams/readable` (1)

### `reduce`
`[native code]` | Self: 0.6% (16.1ms) | Total: 0.6% (16.1ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `get buffer`
`[native code]` | Self: 0.6% (15.9ms) | Total: 0.6% (15.9ms) | Samples: 2

**Called by:**
- `structuredBytes` (2)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:16` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 1

**Called by:**
- `inspect` (1)

### `choice`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:91` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 1

**Called by:**
- `node` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.5% (13.9ms) | Total: 0.5% (13.9ms) | Samples: 1

**Called by:**
- `link` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.5% (13.5ms) | Total: 30.5% (714.2ms) | Samples: 1

**Calls:**
- `(anonymous)` (93)

### `async nativeDatabase`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts` | Self: 0.5% (13.2ms) | Total: 0.5% (13.2ms) | Samples: 1

**Called by:**
- `async nativeDatabase` (1)

### `readSceneImage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` | Self: 0.5% (13.0ms) | Total: 0.5% (13.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `BroadcastChannel`
`[native code]` | Self: 0.5% (12.8ms) | Total: 0.5% (12.8ms) | Samples: 1

**Called by:**
- `open` (1)

### `resolve`
`[native code]` | Self: 0.5% (12.4ms) | Total: 0.5% (12.4ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` | Self: 0.4% (11.1ms) | Total: 0.4% (11.1ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:338` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `fetch`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `internal:streams/readable`
`internal:streams/readable:530` | Self: 0.0% (999us) | Total: 0.0% (999us) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` | Self: 0.0% (877us) | Total: 0.0% (877us) | Samples: 1

**Called by:**
- `evaluate` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:190` | Self: 0.0% (864us) | Total: 0.0% (864us) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 7.7% (181.5ms) | Samples: 0

**Called by:**
- `link` (12)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (12)
- `moduleDeclarationInstantiation` (1)

### `sceneSummary`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneMetadata.ts:37` | Self: 0.0% (0us) | Total: 0.6% (15.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `structuredBytes` (2)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.3% (31.7ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (3)
- `resolve` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `buildRecordAddPut`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:36` | Self: 0.0% (0us) | Total: 23.6% (552.5ms) | Samples: 0

**Called by:**
- `put` (66)

**Calls:**
- `cloneValueForInsertion` (66)

### `parseModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `async (anonymous)` (3)

**Calls:**
- `node:assert/strict` (3)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 26.1% (611.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (81)

**Calls:**
- `evaluate` (81)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:193` | Self: 0.0% (0us) | Total: 39.5% (924.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (38)

**Calls:**
- `bound _iterate` (119)
- `bound getAllValues` (4)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:223` | Self: 0.0% (0us) | Total: 28.1% (657.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `dispatchEvent` (82)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:250` | Self: 0.0% (0us) | Total: 0.7% (16.9ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `digest` (2)

### `node`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:61` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `choice` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:173` | Self: 0.0% (0us) | Total: 10.5% (246.8ms) | Samples: 0

**Called by:**
- `evaluate` (33)

**Calls:**
- `structuredClone` (33)

### `invoke`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:14` | Self: 0.0% (0us) | Total: 28.6% (670.8ms) | Samples: 0

**Called by:**
- `invokeEventListeners` (83)

**Calls:**
- `(anonymous)` (78)
- `(anonymous)` (4)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:248` | Self: 0.0% (0us) | Total: 0.6% (15.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `sceneSummary` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:154` | Self: 0.0% (0us) | Total: 0.7% (17.0ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `digest` (3)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (13.9ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `bound _iterate`
`[native code]` | Self: 0.0% (0us) | Total: 38.2% (895.2ms) | Samples: 0

**Called by:**
- `_start` (119)

**Calls:**
- `_iterate` (119)

### `notifySceneStorageCommit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:62` | Self: 0.0% (0us) | Total: 0.5% (12.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `open` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `node:assert` (3)

**Calls:**
- `get` (3)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (13.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `linkAndEvaluateModule` (1)

### `open`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneStorageChannel.ts:26` | Self: 0.0% (0us) | Total: 0.5% (12.8ms) | Samples: 0

**Called by:**
- `notifySceneStorageCommit` (1)

**Calls:**
- `BroadcastChannel` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:97` | Self: 0.0% (0us) | Total: 0.0% (864us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `transformPoint` (1)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 22.8% (534.1ms) | Samples: 0

**Called by:**
- `readSceneDocument` (38)
- `readSceneImage` (37)
- `fixture` (4)
- `readSceneDocument` (1)
- `readSceneDocument` (1)

**Calls:**
- `readSceneImage` (37)
- `(anonymous)` (37)
- `(anonymous)` (4)
- `readSceneImage` (1)
- `(anonymous)` (1)
- `node` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 2.6% (62.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)

### `getAllValues`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\ObjectStore.js:54` | Self: 0.0% (0us) | Total: 1.2% (29.1ms) | Samples: 0

**Called by:**
- `bound getAllValues` (4)

**Calls:**
- `structuredClone` (4)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:335` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `async mutate` (1)

**Calls:**
- `map` (1)

### `fixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:50` | Self: 0.0% (0us) | Total: 2.6% (62.5ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `map` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:233` | Self: 0.0% (0us) | Total: 0.6% (15.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `inspect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:111` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `structuredBytes` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `anonymous` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:210` | Self: 0.0% (0us) | Total: 0.7% (16.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async mutate` (1)

### `structuredBytes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts:12` | Self: 0.0% (0us) | Total: 0.6% (15.9ms) | Samples: 0

**Called by:**
- `sceneSummary` (2)

**Calls:**
- `get buffer` (2)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `refresh` (3)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` | Self: 0.0% (0us) | Total: 0.4% (11.1ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `prepareSceneBounds` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:157` | Self: 0.0% (0us) | Total: 0.5% (13.2ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async nativeDatabase` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `assign` (3)

**Calls:**
- `loadAssertionError` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:21` | Self: 0.0% (0us) | Total: 26.7% (626.5ms) | Samples: 0

**Called by:**
- `invoke` (78)

**Calls:**
- `(anonymous)` (78)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:185` | Self: 0.0% (0us) | Total: 0.5% (12.8ms) | Samples: 0

**Called by:**
- `invoke` (1)

**Calls:**
- `notifySceneStorageCommit` (1)

### `cloneValueForInsertion`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\cloneValueForInsertion.js:19` | Self: 0.0% (0us) | Total: 23.6% (552.5ms) | Samples: 0

**Called by:**
- `buildRecordAddPut` (66)

**Calls:**
- `structuredClone` (66)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:344` | Self: 0.0% (0us) | Total: 10.0% (234.2ms) | Samples: 0

**Called by:**
- `inspect` (21)
- `async mutate` (17)

**Calls:**
- `map` (38)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:232` | Self: 0.0% (0us) | Total: 0.5% (13.8ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `collectRecords`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\readRecords.ts:12` | Self: 0.0% (0us) | Total: 2.6% (62.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)
- `(anonymous)` (4)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (4)

### `async nativeDatabase`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts:5` | Self: 0.0% (0us) | Total: 0.5% (13.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async nativeDatabase` (1)

### `node:assert/strict`
`node:assert/strict:3` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `parseModule` (3)

**Calls:**
- `anonymous` (3)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `assign` (3)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:338` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async mutate` (1)

**Calls:**
- `map` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `get` (3)

**Calls:**
- `anonymous` (3)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:361` | Self: 0.0% (0us) | Total: 1.2% (28.1ms) | Samples: 0

**Called by:**
- `inspect` (2)
- `async mutate` (1)

**Calls:**
- `sceneBounds` (1)
- `sceneBounds` (1)
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:77` | Self: 0.0% (0us) | Total: 1.3% (31.4ms) | Samples: 0

**Called by:**
- `collectRecords` (4)

**Calls:**
- `collectRecords` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:176` | Self: 0.0% (0us) | Total: 1.9% (44.9ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `gc` (6)

### `put`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBObjectStore.js:127` | Self: 0.0% (0us) | Total: 23.6% (552.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (66)

**Calls:**
- `buildRecordAddPut` (66)

### `bound getAllValues`
`[native code]` | Self: 0.0% (0us) | Total: 1.2% (29.1ms) | Samples: 0

**Called by:**
- `_start` (4)

**Calls:**
- `getAllValues` (4)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:182` | Self: 0.0% (0us) | Total: 4.8% (113.2ms) | Samples: 0

**Called by:**
- `evaluate` (19)

**Calls:**
- `async mutate` (19)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:82` | Self: 0.0% (0us) | Total: 28.1% (657.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (78)
- `collectRecords` (4)

**Calls:**
- `(anonymous)` (66)
- `(anonymous)` (14)
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:256` | Self: 0.0% (0us) | Total: 23.6% (552.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (66)

**Calls:**
- `put` (66)

### `async mutate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:161` | Self: 0.0% (0us) | Total: 5.5% (129.6ms) | Samples: 0

**Called by:**
- `(module)` (19)
- `(module)` (1)

**Calls:**
- `readSceneDocument` (17)
- `readSceneDocument` (1)
- `readSceneDocument` (1)
- `readSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:199` | Self: 0.0% (0us) | Total: 3.8% (89.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)

**Calls:**
- `inspect` (13)
- `inspect` (1)

### `inspect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\scenePersistence.ts:94` | Self: 0.0% (0us) | Total: 6.3% (148.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (13)
- `(anonymous)` (10)

**Calls:**
- `readSceneDocument` (21)
- `readSceneDocument` (2)

### `dispatchEvent`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:100` | Self: 0.0% (0us) | Total: 28.6% (670.8ms) | Samples: 0

**Called by:**
- `_start` (82)
- `_start` (1)

**Calls:**
- `invokeEventListeners` (83)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:153` | Self: 0.0% (0us) | Total: 2.6% (62.5ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `fixture` (4)

### `readSceneImage`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:186` | Self: 0.0% (0us) | Total: 9.4% (221.2ms) | Samples: 0

**Called by:**
- `map` (37)

**Calls:**
- `map` (37)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:55` | Self: 0.0% (0us) | Total: 2.6% (62.5ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `from` (4)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:65` | Self: 0.0% (0us) | Total: 0.6% (16.1ms) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `reduce` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `internal:util/colors` (3)

**Calls:**
- `(anonymous)` (3)

### `_start`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBTransaction.js:250` | Self: 0.0% (0us) | Total: 0.5% (12.8ms) | Samples: 0

**Calls:**
- `dispatchEvent` (1)

### `invokeEventListeners`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\FakeEventTarget.js:51` | Self: 0.0% (0us) | Total: 28.6% (670.8ms) | Samples: 0

**Called by:**
- `dispatchEvent` (83)

**Calls:**
- `invoke` (83)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:88` | Self: 0.0% (0us) | Total: 2.7% (63.4ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `update` (7)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:228` | Self: 0.0% (0us) | Total: 1.3% (31.0ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `update` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts:192` | Self: 0.0% (0us) | Total: 0.8% (18.7ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `deepEquals` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\state\sceneQuota.ts:42` | Self: 0.0% (0us) | Total: 1.3% (31.4ms) | Samples: 0

**Called by:**
- `invoke` (4)

**Calls:**
- `collectRecords` (4)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\lib\Database.js:39` | Self: 0.0% (0us) | Total: 12.8% (299.5ms) | Samples: 0

**Calls:**
- `_start` (38)
- `_start` (4)

### `_iterate`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\fake-indexeddb@6.2.5\node_modules\fake-indexeddb\build\esm\FDBCursor.js:259` | Self: 0.0% (0us) | Total: 38.2% (895.2ms) | Samples: 0

**Called by:**
- `bound _iterate` (119)

**Calls:**
- `structuredClone` (119)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 26.1% (611.5ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (81)

**Calls:**
- `(module)` (33)
- `(module)` (19)
- `(module)` (6)
- `(module)` (5)
- `(module)` (4)
- `(module)` (4)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.7% (17.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 30.7% (719.0ms) | Samples: 0

**Called by:**
- `processTicksAndRejections` (93)
- `refresh` (3)
- `(anonymous)` (1)

**Calls:**
- `async asyncModuleEvaluation` (81)
- `inspect` (10)
- `get WriteStream` (3)
- `(anonymous)` (1)
- `requestSatisfyUtil` (1)
- `async loadAndEvaluateModule` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 88.2% | 2.06s | `[native code]` |
| 6.5% | 153.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 2.7% | 63.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-persistence.ts` |
| 0.6% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\structuredBytes.ts` |
| 0.6% | 15.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.5% | 13.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\nativeDatabase.ts` |
| 0.4% | 11.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 999us | `internal:streams/readable` |
| 0.0% | 864us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
