# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 12.27s | 1598 | 1.0ms | 220 |

**Top 10:** `indexSceneDocument` 5.5%, `meshFaceRegion` 5.5%, `(anonymous)` 5.1%, `get` 4.6%, `extrude` 4.1%, `cloneObject` 3.7%, `Set` 3.6%, `filter` 3.6%, `stringify` 2.5%, `(anonymous)` 2.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 5.5% | 683.6ms | 5.6% | 687.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` |
| 5.5% | 678.7ms | 5.5% | 678.7ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` |
| 5.1% | 626.6ms | 7.4% | 914.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:92` |
| 4.6% | 575.4ms | 4.6% | 575.4ms | `get` | `[native code]` |
| 4.1% | 505.6ms | 4.7% | 584.9ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:110` |
| 3.7% | 456.1ms | 3.7% | 456.1ms | `cloneObject` | `[native code]` |
| 3.6% | 446.0ms | 3.6% | 446.0ms | `Set` | `[native code]` |
| 3.6% | 443.4ms | 4.0% | 493.4ms | `filter` | `[native code]` |
| 2.5% | 315.4ms | 2.5% | 315.4ms | `stringify` | `[native code]` |
| 2.5% | 311.8ms | 3.7% | 458.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:117` |
| 2.4% | 301.7ms | 20.7% | 2.55s | `map` | `[native code]` |
| 2.3% | 294.1ms | 6.2% | 761.3ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:101` |
| 2.3% | 285.8ms | 2.3% | 285.8ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 2.1% | 267.4ms | 2.8% | 346.1ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:100` |
| 2.1% | 267.4ms | 2.1% | 267.4ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` |
| 2.1% | 258.3ms | 2.1% | 258.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:116` |
| 1.9% | 233.4ms | 1.9% | 233.4ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:103` |
| 1.8% | 225.7ms | 1.8% | 225.7ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` |
| 1.8% | 221.1ms | 1.8% | 221.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` |
| 1.7% | 218.6ms | 1.7% | 218.6ms | `entries` | `[native code]` |
| 1.7% | 212.8ms | 1.7% | 212.8ms | `add` | `[native code]` |
| 1.6% | 201.4ms | 2.7% | 336.0ms | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:33` |
| 1.4% | 177.7ms | 9.5% | 1.17s | `every` | `[native code]` |
| 1.3% | 161.6ms | 1.3% | 161.6ms | `max` | `[native code]` |
| 1.2% | 154.8ms | 1.2% | 154.8ms | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:30` |
| 1.2% | 153.7ms | 1.2% | 153.7ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` |
| 1.2% | 153.3ms | 1.2% | 153.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:49` |
| 1.2% | 153.0ms | 1.2% | 153.0ms | `frameFor` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 1.1% | 145.8ms | 1.4% | 176.4ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 1.1% | 139.7ms | 1.1% | 139.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` |
| 1.1% | 139.7ms | 2.5% | 312.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:122` |
| 1.1% | 137.6ms | 1.1% | 137.6ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 1.0% | 134.5ms | 1.0% | 134.5ms | `set` | `[native code]` |
| 1.0% | 126.8ms | 1.0% | 126.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 0.9% | 112.6ms | 0.9% | 112.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` |
| 0.9% | 112.0ms | 0.9% | 112.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:120` |
| 0.8% | 106.5ms | 0.8% | 106.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.8% | 99.1ms | 0.8% | 99.1ms | `keys` | `[native code]` |
| 0.7% | 97.4ms | 0.7% | 97.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 0.7% | 96.6ms | 4.8% | 590.0ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` |
| 0.7% | 93.6ms | 0.7% | 93.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:85` |
| 0.6% | 79.2ms | 4.3% | 530.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:115` |
| 0.6% | 77.6ms | 0.6% | 77.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.6% | 75.2ms | 0.7% | 86.5ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:78` |
| 0.5% | 71.3ms | 15.2% | 1.87s | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:112` |
| 0.5% | 66.1ms | 0.5% | 66.1ms | `abs` | `[native code]` |
| 0.5% | 65.1ms | 0.5% | 65.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.5% | 61.5ms | 0.6% | 76.7ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` |
| 0.4% | 60.8ms | 0.4% | 60.8ms | `min` | `[native code]` |
| 0.4% | 58.6ms | 2.8% | 344.5ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:89` |
| 0.4% | 49.9ms | 0.4% | 49.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` |
| 0.3% | 48.3ms | 0.3% | 48.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:94` |
| 0.3% | 45.9ms | 1.4% | 172.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` |
| 0.3% | 45.8ms | 0.3% | 46.8ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` |
| 0.3% | 45.6ms | 1.8% | 222.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.3% | 44.2ms | 0.3% | 44.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 0.2% | 31.8ms | 0.2% | 31.8ms | `has` | `[native code]` |
| 0.2% | 30.1ms | 0.2% | 30.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:113` |
| 0.2% | 29.9ms | 0.2% | 29.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.2% | 29.8ms | 0.2% | 29.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` |
| 0.2% | 29.5ms | 0.2% | 29.5ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:88` |
| 0.2% | 29.4ms | 0.2% | 29.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.2% | 29.2ms | 0.7% | 90.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.2% | 28.7ms | 0.2% | 28.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.2% | 28.5ms | 0.2% | 28.5ms | `deepEquals` | `[native code]` |
| 0.2% | 28.5ms | 0.2% | 28.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` |
| 0.2% | 26.8ms | 0.2% | 26.8ms | `delete` | `[native code]` |
| 0.1% | 24.5ms | 0.1% | 24.5ms | `flatIntoArray` | `[native code]` |
| 0.1% | 21.1ms | 0.1% | 21.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` |
| 0.1% | 19.1ms | 0.1% | 19.1ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 17.9ms | 0.1% | 17.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 17.0ms | 3.4% | 425.9ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` |
| 0.1% | 16.9ms | 0.1% | 16.9ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` |
| 0.1% | 16.7ms | 1.2% | 152.9ms | `anonymous` | `[native code]` |
| 0.1% | 16.1ms | 0.1% | 16.1ms | `values` | `[native code]` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.1% | 15.9ms | 0.1% | 17.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `copyDataProperties` | `[native code]` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 0.1% | 15.3ms | 0.3% | 47.2ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:79` |
| 0.1% | 15.3ms | 0.1% | 15.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.1% | 15.2ms | 0.3% | 42.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:158` |
| 0.1% | 15.1ms | 0.2% | 29.0ms | `flatMap` | `[native code]` |
| 0.1% | 14.6ms | 0.1% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.1% | 14.6ms | 0.1% | 14.6ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:62` |
| 0.1% | 14.5ms | 0.1% | 14.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:191` |
| 0.1% | 14.5ms | 0.1% | 14.5ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 0.1% | 14.3ms | 0.1% | 14.3ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.1% | 13.9ms | 0.1% | 13.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.1% | 13.2ms | 3.8% | 471.6ms | `meshIdAllocator` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` |
| 0.0% | 11.9ms | 0.0% | 11.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` |
| 0.0% | 11.9ms | 0.0% | 11.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.0% | 11.5ms | 0.0% | 11.5ms | `fromEntries` | `[native code]` |
| 0.0% | 11.4ms | 0.0% | 11.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `next` | `[native code]` |
| 0.0% | 10.8ms | 0.0% | 10.8ms | `resolve` | `[native code]` |
| 0.0% | 10.7ms | 0.0% | 11.6ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `hasOwn` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` |
| 0.0% | 1.9ms | 0.0% | 2.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:132` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 1.0ms | 0.1% | 19.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:25` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `push` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 0.0% | 1.0ms | 0.3% | 42.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` |
| 0.0% | 978us | 0.0% | 978us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 0.0% | 969us | 0.0% | 969us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` |
| 0.0% | 961us | 0.0% | 961us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` |
| 0.0% | 961us | 0.0% | 961us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.0% | 905us | 0.0% | 905us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:70` |
| 0.0% | 900us | 0.0% | 900us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 890us | 0.0% | 890us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.0% | 880us | 0.0% | 880us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:249` |
| 0.0% | 878us | 9.5% | 1.17s | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:90` |
| 0.0% | 872us | 6.9% | 855.1ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:87` |
| 0.0% | 870us | 0.0% | 870us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 854us | 0.3% | 41.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.0% | 833us | 0.2% | 26.2ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 826us | 0.0% | 826us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 824us | 0.0% | 824us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:128` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 24.48s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.9% | 12.26s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 99.7% | 12.24s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 99.7% | 12.24s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 99.7% | 12.24s | 0.0% | 0us | `evaluate` | `[native code]` |
| 86.1% | 10.57s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:78` |
| 84.7% | 10.40s | 0.0% | 0us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:245` |
| 20.7% | 2.55s | 2.4% | 301.7ms | `map` | `[native code]` |
| 15.2% | 1.87s | 0.5% | 71.3ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:112` |
| 9.5% | 1.17s | 0.0% | 878us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:90` |
| 9.5% | 1.17s | 1.4% | 177.7ms | `every` | `[native code]` |
| 9.4% | 1.15s | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:73` |
| 9.3% | 1.14s | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:317` |
| 7.8% | 963.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:72` |
| 7.8% | 958.4ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:80` |
| 7.4% | 914.8ms | 5.1% | 626.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:92` |
| 6.9% | 855.1ms | 0.0% | 872us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:87` |
| 6.2% | 761.3ms | 2.3% | 294.1ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:101` |
| 5.6% | 687.4ms | 5.5% | 683.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` |
| 5.5% | 678.7ms | 5.5% | 678.7ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` |
| 4.8% | 590.0ms | 0.7% | 96.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` |
| 4.7% | 584.9ms | 4.1% | 505.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:110` |
| 4.6% | 575.4ms | 4.6% | 575.4ms | `get` | `[native code]` |
| 4.3% | 530.8ms | 0.6% | 79.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:115` |
| 4.2% | 517.7ms | 0.0% | 0us | `frameFor` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:39` |
| 4.0% | 493.4ms | 3.6% | 443.4ms | `filter` | `[native code]` |
| 3.8% | 471.6ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:74` |
| 3.8% | 471.6ms | 0.1% | 13.2ms | `meshIdAllocator` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` |
| 3.7% | 458.8ms | 2.5% | 311.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:117` |
| 3.7% | 456.1ms | 3.7% | 456.1ms | `cloneObject` | `[native code]` |
| 3.6% | 446.0ms | 3.6% | 446.0ms | `Set` | `[native code]` |
| 3.4% | 425.9ms | 0.1% | 17.0ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` |
| 3.0% | 373.0ms | 0.0% | 0us | `selection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:280` |
| 3.0% | 373.0ms | 0.0% | 0us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:239` |
| 2.8% | 346.1ms | 2.1% | 267.4ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:100` |
| 2.8% | 344.5ms | 0.4% | 58.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:89` |
| 2.7% | 336.0ms | 1.6% | 201.4ms | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:33` |
| 2.5% | 315.4ms | 2.5% | 315.4ms | `stringify` | `[native code]` |
| 2.5% | 313.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:10` |
| 2.5% | 312.2ms | 1.1% | 139.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:122` |
| 2.3% | 285.8ms | 2.3% | 285.8ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 2.3% | 282.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:54` |
| 2.1% | 267.4ms | 2.1% | 267.4ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` |
| 2.1% | 258.3ms | 2.1% | 258.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:116` |
| 1.9% | 233.4ms | 1.9% | 233.4ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:103` |
| 1.8% | 225.7ms | 1.8% | 225.7ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` |
| 1.8% | 222.9ms | 0.3% | 45.6ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 1.8% | 221.1ms | 1.8% | 221.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` |
| 1.7% | 218.6ms | 1.7% | 218.6ms | `entries` | `[native code]` |
| 1.7% | 212.8ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:86` |
| 1.7% | 212.8ms | 1.7% | 212.8ms | `add` | `[native code]` |
| 1.4% | 183.5ms | 0.0% | 0us | `frameFor` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:41` |
| 1.4% | 176.4ms | 1.1% | 145.8ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 1.4% | 172.6ms | 0.3% | 45.9ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` |
| 1.3% | 161.6ms | 1.3% | 161.6ms | `max` | `[native code]` |
| 1.2% | 154.8ms | 1.2% | 154.8ms | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:30` |
| 1.2% | 153.7ms | 1.2% | 153.7ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` |
| 1.2% | 153.3ms | 1.2% | 153.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:49` |
| 1.2% | 153.0ms | 1.2% | 153.0ms | `frameFor` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 1.2% | 152.9ms | 0.1% | 16.7ms | `anonymous` | `[native code]` |
| 1.2% | 149.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:412` |
| 1.1% | 139.7ms | 1.1% | 139.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` |
| 1.1% | 138.2ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:16` |
| 1.1% | 137.6ms | 1.1% | 137.6ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 1.1% | 137.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:82` |
| 1.0% | 134.5ms | 1.0% | 134.5ms | `set` | `[native code]` |
| 1.0% | 126.8ms | 1.0% | 126.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 1.0% | 123.6ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:155` |
| 0.9% | 121.9ms | 0.0% | 0us | `sceneToJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentJson.ts:13` |
| 0.9% | 112.6ms | 0.9% | 112.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` |
| 0.9% | 112.0ms | 0.9% | 112.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:120` |
| 0.9% | 111.8ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:75` |
| 0.8% | 108.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:40` |
| 0.8% | 107.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:56` |
| 0.8% | 106.5ms | 0.8% | 106.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.8% | 99.1ms | 0.8% | 99.1ms | `keys` | `[native code]` |
| 0.7% | 97.4ms | 0.7% | 97.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 0.7% | 93.6ms | 0.7% | 93.6ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:85` |
| 0.7% | 92.5ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:76` |
| 0.7% | 90.1ms | 0.2% | 29.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.7% | 86.5ms | 0.6% | 75.2ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:78` |
| 0.6% | 77.6ms | 0.6% | 77.6ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.6% | 76.7ms | 0.5% | 61.5ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` |
| 0.5% | 66.1ms | 0.5% | 66.1ms | `abs` | `[native code]` |
| 0.5% | 65.3ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:435` |
| 0.5% | 65.1ms | 0.5% | 65.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.4% | 60.8ms | 0.4% | 60.8ms | `min` | `[native code]` |
| 0.4% | 50.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 0.4% | 49.9ms | 0.4% | 49.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` |
| 0.3% | 48.4ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:69` |
| 0.3% | 48.3ms | 0.3% | 48.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:94` |
| 0.3% | 47.2ms | 0.1% | 15.3ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:79` |
| 0.3% | 46.8ms | 0.3% | 45.8ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` |
| 0.3% | 45.3ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:130` |
| 0.3% | 44.2ms | 0.3% | 44.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 0.3% | 44.1ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:63` |
| 0.3% | 42.2ms | 0.0% | 1.0ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` |
| 0.3% | 42.2ms | 0.1% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:158` |
| 0.3% | 41.3ms | 0.0% | 854us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.2% | 32.6ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:148` |
| 0.2% | 31.8ms | 0.2% | 31.8ms | `has` | `[native code]` |
| 0.2% | 30.1ms | 0.2% | 30.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:113` |
| 0.2% | 29.9ms | 0.2% | 29.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.2% | 29.8ms | 0.2% | 29.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` |
| 0.2% | 29.7ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.2% | 29.5ms | 0.2% | 29.5ms | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:88` |
| 0.2% | 29.4ms | 0.2% | 29.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 0.2% | 29.0ms | 0.1% | 15.1ms | `flatMap` | `[native code]` |
| 0.2% | 28.7ms | 0.2% | 28.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.2% | 28.6ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.2% | 28.5ms | 0.2% | 28.5ms | `deepEquals` | `[native code]` |
| 0.2% | 28.5ms | 0.2% | 28.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` |
| 0.2% | 28.5ms | 0.0% | 0us | `deepStrictEqual` | `node:assert:133` |
| 0.2% | 27.3ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.2% | 26.8ms | 0.2% | 26.8ms | `delete` | `[native code]` |
| 0.2% | 26.8ms | 0.0% | 0us | `get` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:32` |
| 0.2% | 26.2ms | 0.0% | 833us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.2% | 24.7ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:81` |
| 0.1% | 24.5ms | 0.1% | 24.5ms | `flatIntoArray` | `[native code]` |
| 0.1% | 21.1ms | 0.1% | 21.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` |
| 0.1% | 19.3ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` |
| 0.1% | 19.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:91` |
| 0.1% | 19.1ms | 0.1% | 19.1ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.1% | 17.9ms | 0.0% | 0us | `from` | `[native code]` |
| 0.1% | 17.9ms | 0.1% | 17.9ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 17.7ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:11` |
| 0.1% | 17.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:170` |
| 0.1% | 17.0ms | 0.1% | 15.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.1% | 16.9ms | 0.1% | 16.9ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` |
| 0.1% | 16.7ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `parseModule` | `[native code]` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.1% | 16.7ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.1% | 16.7ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.1% | 16.7ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.1% | 16.7ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.1% | 16.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:64` |
| 0.1% | 16.1ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:21` |
| 0.1% | 16.1ms | 0.1% | 16.1ms | `values` | `[native code]` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `copyDataProperties` | `[native code]` |
| 0.1% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:179` |
| 0.1% | 15.5ms | 0.1% | 14.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.1% | 15.5ms | 0.1% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 0.1% | 15.3ms | 0.1% | 15.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.1% | 14.6ms | 0.1% | 14.6ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:62` |
| 0.1% | 14.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:175` |
| 0.1% | 14.5ms | 0.1% | 14.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:191` |
| 0.1% | 14.5ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:189` |
| 0.1% | 14.5ms | 0.1% | 14.5ms | `requireScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` |
| 0.1% | 14.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:42` |
| 0.1% | 14.3ms | 0.1% | 14.3ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 0.1% | 14.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:168` |
| 0.1% | 14.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:58` |
| 0.1% | 13.9ms | 0.1% | 13.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 11.9ms | 0.0% | 11.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` |
| 0.0% | 11.9ms | 0.0% | 11.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.0% | 11.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.0% | 11.6ms | 0.0% | 10.7ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` |
| 0.0% | 11.5ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:154` |
| 0.0% | 11.5ms | 0.0% | 11.5ms | `fromEntries` | `[native code]` |
| 0.0% | 11.4ms | 0.0% | 11.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `next` | `[native code]` |
| 0.0% | 10.8ms | 0.0% | 10.8ms | `resolve` | `[native code]` |
| 0.0% | 8.0ms | 0.0% | 8.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` |
| 0.0% | 4.7ms | 0.0% | 4.7ms | `hasOwn` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 3.8ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` |
| 0.0% | 2.9ms | 0.0% | 1.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.0% | 2.8ms | 0.0% | 2.8ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 2.7ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` |
| 0.0% | 1.9ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:132` |
| 0.0% | 1.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 1.4ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 1.4ms | 0.0% | 1.4ms | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `fetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:44` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:25` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `push` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:108` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` |
| 0.0% | 978us | 0.0% | 978us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 0.0% | 969us | 0.0% | 969us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` |
| 0.0% | 961us | 0.0% | 961us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` |
| 0.0% | 961us | 0.0% | 961us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.0% | 961us | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:9` |
| 0.0% | 961us | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` |
| 0.0% | 905us | 0.0% | 905us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:70` |
| 0.0% | 900us | 0.0% | 900us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 900us | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 900us | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:24` |
| 0.0% | 890us | 0.0% | 890us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.0% | 880us | 0.0% | 0us | `some` | `[native code]` |
| 0.0% | 880us | 0.0% | 0us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:248` |
| 0.0% | 880us | 0.0% | 880us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:249` |
| 0.0% | 870us | 0.0% | 870us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.0% | 867us | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` |
| 0.0% | 834us | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:38` |
| 0.0% | 826us | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.0% | 826us | 0.0% | 826us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 824us | 0.0% | 824us | `extrude` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:128` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` | Self: 5.5% (683.6ms) | Total: 5.6% (687.4ms) | Samples: 96

**Called by:**
- `finish` (66)
- `selection` (31)
- `readSceneDocument` (2)

**Calls:**
- `hasOwn` (3)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` | Self: 5.5% (678.7ms) | Total: 5.5% (678.7ms) | Samples: 80

**Called by:**
- `extrude` (80)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:92` | Self: 5.1% (626.6ms) | Total: 7.4% (914.8ms) | Samples: 80

**Called by:**
- `every` (110)

**Calls:**
- `map` (19)
- `max` (11)

### `get`
`[native code]` | Self: 4.6% (575.4ms) | Total: 4.6% (575.4ms) | Samples: 92

**Called by:**
- `extrude` (75)
- `extrude` (15)
- `extrude` (2)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:110` | Self: 4.1% (505.6ms) | Total: 4.7% (584.9ms) | Samples: 59

**Called by:**
- `editSceneMesh` (70)

**Calls:**
- `cloneObject` (11)

### `cloneObject`
`[native code]` | Self: 3.7% (456.1ms) | Total: 3.7% (456.1ms) | Samples: 60

**Called by:**
- `(anonymous)` (20)
- `extrude` (16)
- `extrude` (13)
- `extrude` (11)

### `Set`
`[native code]` | Self: 3.6% (446.0ms) | Total: 3.6% (446.0ms) | Samples: 64

**Called by:**
- `meshIdAllocator` (44)
- `extrude` (11)
- `extrude` (6)
- `(anonymous)` (3)

### `filter`
`[native code]` | Self: 3.6% (443.4ms) | Total: 4.0% (493.4ms) | Samples: 50

**Called by:**
- `extrude` (57)

**Calls:**
- `(anonymous)` (7)

### `stringify`
`[native code]` | Self: 2.5% (315.4ms) | Total: 2.5% (315.4ms) | Samples: 37

**Called by:**
- `indexMeshEdges` (34)
- `digest` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:117` | Self: 2.5% (311.8ms) | Total: 3.7% (458.8ms) | Samples: 52

**Called by:**
- `map` (70)

**Calls:**
- `map` (18)

### `map`
`[native code]` | Self: 2.4% (301.7ms) | Total: 20.7% (2.55s) | Samples: 43

**Called by:**
- `extrude` (261)
- `readSceneDocument` (22)
- `geometry` (20)
- `(anonymous)` (19)
- `(anonymous)` (18)
- `(anonymous)` (11)
- `triangulateFace` (3)
- `extrude` (3)
- `meshFaceFrame` (3)
- `triangulateFace` (2)
- `(anonymous)` (1)
- `meshFaceFrame` (1)
- `triangulateFace` (1)
- `geometry` (1)
- `meshFaceFrame` (1)
- `triangulateFace` (1)
- `extrude` (1)
- `tuple` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (72)
- `(anonymous)` (70)
- `(anonymous)` (49)
- `(anonymous)` (30)
- `geometry` (20)
- `(anonymous)` (15)
- `(anonymous)` (14)
- `(anonymous)` (11)
- `abs` (10)
- `(anonymous)` (6)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `geometry` (1)
- `(anonymous)` (1)
- `geometry` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:101` | Self: 2.3% (294.1ms) | Total: 6.2% (761.3ms) | Samples: 43

**Called by:**
- `editSceneMesh` (118)

**Calls:**
- `get` (75)

### `dot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 2.3% (285.8ms) | Total: 2.3% (285.8ms) | Samples: 32

**Called by:**
- `extrude` (32)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:100` | Self: 2.1% (267.4ms) | Total: 2.8% (346.1ms) | Samples: 28

**Called by:**
- `editSceneMesh` (43)

**Calls:**
- `get` (15)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` | Self: 2.1% (267.4ms) | Total: 2.1% (267.4ms) | Samples: 36

**Called by:**
- `extrude` (36)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:116` | Self: 2.1% (258.3ms) | Total: 2.1% (258.3ms) | Samples: 30

**Called by:**
- `map` (30)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:103` | Self: 1.9% (233.4ms) | Total: 1.9% (233.4ms) | Samples: 29

**Called by:**
- `editSceneMesh` (29)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` | Self: 1.8% (225.7ms) | Total: 1.8% (225.7ms) | Samples: 29

**Called by:**
- `extrude` (29)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` | Self: 1.8% (221.1ms) | Total: 1.8% (221.1ms) | Samples: 31

**Called by:**
- `extrude` (31)

### `entries`
`[native code]` | Self: 1.7% (218.6ms) | Total: 1.7% (218.6ms) | Samples: 30

**Called by:**
- `indexSceneDocument` (22)
- `indexMeshEdges` (8)

### `add`
`[native code]` | Self: 1.7% (212.8ms) | Total: 1.7% (212.8ms) | Samples: 26

**Called by:**
- `extrude` (26)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:33` | Self: 1.6% (201.4ms) | Total: 2.7% (336.0ms) | Samples: 21

**Called by:**
- `frameFor` (35)

**Calls:**
- `set` (14)

### `every`
`[native code]` | Self: 1.4% (177.7ms) | Total: 9.5% (1.17s) | Samples: 17

**Called by:**
- `extrude` (140)

**Calls:**
- `(anonymous)` (110)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (3)

### `max`
`[native code]` | Self: 1.3% (161.6ms) | Total: 1.3% (161.6ms) | Samples: 15

**Called by:**
- `(anonymous)` (11)
- `sceneBounds` (2)
- `(anonymous)` (1)
- `triangulateFace` (1)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:30` | Self: 1.2% (154.8ms) | Total: 1.2% (154.8ms) | Samples: 15

**Called by:**
- `frameFor` (15)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` | Self: 1.2% (153.7ms) | Total: 1.2% (153.7ms) | Samples: 14

**Called by:**
- `extrude` (14)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:49` | Self: 1.2% (153.3ms) | Total: 1.2% (153.3ms) | Samples: 20

**Called by:**
- `(anonymous)` (20)

### `frameFor`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` | Self: 1.2% (153.0ms) | Total: 1.2% (153.0ms) | Samples: 18

**Called by:**
- `extrude` (18)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 1.1% (145.8ms) | Total: 1.4% (176.4ms) | Samples: 21

**Called by:**
- `(anonymous)` (21)
- `(anonymous)` (3)

**Calls:**
- `/^[A-Za-z0-9_:-]+$/` (2)
- `requireScene` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` | Self: 1.1% (139.7ms) | Total: 1.1% (139.7ms) | Samples: 21

**Called by:**
- `(anonymous)` (20)
- `extrude` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:122` | Self: 1.1% (139.7ms) | Total: 2.5% (312.2ms) | Samples: 29

**Called by:**
- `map` (49)

**Calls:**
- `cloneObject` (20)

### `meshEdgeKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` | Self: 1.1% (137.6ms) | Total: 1.1% (137.6ms) | Samples: 20

**Called by:**
- `indexMeshEdges` (20)

### `set`
`[native code]` | Self: 1.0% (134.5ms) | Total: 1.0% (134.5ms) | Samples: 14

**Called by:**
- `get` (14)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` | Self: 1.0% (126.8ms) | Total: 1.0% (126.8ms) | Samples: 16

**Called by:**
- `finish` (11)
- `selection` (5)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` | Self: 0.9% (112.6ms) | Total: 0.9% (112.6ms) | Samples: 11

**Called by:**
- `finish` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:120` | Self: 0.9% (112.0ms) | Total: 0.9% (112.0ms) | Samples: 15

**Called by:**
- `map` (15)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` | Self: 0.8% (106.5ms) | Total: 0.8% (106.5ms) | Samples: 9

**Called by:**
- `finish` (9)

### `keys`
`[native code]` | Self: 0.8% (99.1ms) | Total: 0.8% (99.1ms) | Samples: 12

**Called by:**
- `meshIdAllocator` (12)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` | Self: 0.7% (97.4ms) | Total: 0.7% (97.4ms) | Samples: 17

**Called by:**
- `map` (14)
- `every` (3)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` | Self: 0.7% (96.6ms) | Total: 4.8% (590.0ms) | Samples: 10

**Called by:**
- `editSceneMesh` (67)

**Calls:**
- `filter` (57)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:85` | Self: 0.7% (93.6ms) | Total: 0.7% (93.6ms) | Samples: 12

**Called by:**
- `editSceneMesh` (12)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:115` | Self: 0.6% (79.2ms) | Total: 4.3% (530.8ms) | Samples: 11

**Called by:**
- `map` (72)

**Calls:**
- `(anonymous)` (38)
- `(anonymous)` (20)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` | Self: 0.6% (77.6ms) | Total: 0.6% (77.6ms) | Samples: 9

**Called by:**
- `finish` (9)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:78` | Self: 0.6% (75.2ms) | Total: 0.7% (86.5ms) | Samples: 8

**Called by:**
- `editSceneMesh` (9)

**Calls:**
- `next` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:112` | Self: 0.5% (71.3ms) | Total: 15.2% (1.87s) | Samples: 7

**Called by:**
- `editSceneMesh` (268)

**Calls:**
- `map` (261)

### `abs`
`[native code]` | Self: 0.5% (66.1ms) | Total: 0.5% (66.1ms) | Samples: 10

**Called by:**
- `map` (10)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 0.5% (65.1ms) | Total: 0.5% (65.1ms) | Samples: 10

**Called by:**
- `selection` (6)
- `finish` (3)
- `readSceneDocument` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` | Self: 0.5% (61.5ms) | Total: 0.6% (76.7ms) | Samples: 8

**Called by:**
- `finish` (8)
- `readSceneDocument` (2)

**Calls:**
- `max` (2)

### `min`
`[native code]` | Self: 0.4% (60.8ms) | Total: 0.4% (60.8ms) | Samples: 5

**Called by:**
- `sceneBounds` (5)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:89` | Self: 0.4% (58.6ms) | Total: 2.8% (344.5ms) | Samples: 7

**Called by:**
- `editSceneMesh` (39)

**Calls:**
- `dot` (32)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:107` | Self: 0.4% (49.9ms) | Total: 0.4% (49.9ms) | Samples: 7

**Called by:**
- `filter` (7)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:94` | Self: 0.3% (48.3ms) | Total: 0.3% (48.3ms) | Samples: 5

**Called by:**
- `every` (5)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` | Self: 0.3% (45.9ms) | Total: 1.4% (172.6ms) | Samples: 5

**Called by:**
- `editSceneMesh` (24)

**Calls:**
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `map` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` | Self: 0.3% (45.8ms) | Total: 0.3% (46.8ms) | Samples: 6

**Called by:**
- `editSceneMesh` (7)

**Calls:**
- `hasOwn` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.3% (45.6ms) | Total: 1.8% (222.9ms) | Samples: 5

**Called by:**
- `finish` (12)
- `selection` (12)
- `readSceneDocument` (3)

**Calls:**
- `entries` (22)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` | Self: 0.3% (44.2ms) | Total: 0.3% (44.2ms) | Samples: 3

**Called by:**
- `extrude` (3)

### `has`
`[native code]` | Self: 0.2% (31.8ms) | Total: 0.2% (31.8ms) | Samples: 4

**Called by:**
- `extrude` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:113` | Self: 0.2% (30.1ms) | Total: 0.2% (30.1ms) | Samples: 4

**Called by:**
- `map` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.2% (29.9ms) | Total: 0.2% (29.9ms) | Samples: 4

**Called by:**
- `meshFaceFrame` (3)
- `extrude` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` | Self: 0.2% (29.8ms) | Total: 0.2% (29.8ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:88` | Self: 0.2% (29.5ms) | Total: 0.2% (29.5ms) | Samples: 2

**Called by:**
- `editSceneMesh` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 0.2% (29.4ms) | Total: 0.2% (29.4ms) | Samples: 2

**Called by:**
- `extrude` (2)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` | Self: 0.2% (29.2ms) | Total: 0.7% (90.1ms) | Samples: 5

**Called by:**
- `finish` (10)

**Calls:**
- `min` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` | Self: 0.2% (28.7ms) | Total: 0.2% (28.7ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (2)

### `deepEquals`
`[native code]` | Self: 0.2% (28.5ms) | Total: 0.2% (28.5ms) | Samples: 2

**Called by:**
- `deepStrictEqual` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` | Self: 0.2% (28.5ms) | Total: 0.2% (28.5ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `delete`
`[native code]` | Self: 0.2% (26.8ms) | Total: 0.2% (26.8ms) | Samples: 3

**Called by:**
- `get` (3)

### `flatIntoArray`
`[native code]` | Self: 0.1% (24.5ms) | Total: 0.1% (24.5ms) | Samples: 3

**Called by:**
- `flatIntoArrayWithCallback` (3)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` | Self: 0.1% (21.1ms) | Total: 0.1% (21.1ms) | Samples: 7

**Called by:**
- `extrude` (7)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.1% (19.1ms) | Total: 0.1% (19.1ms) | Samples: 5

**Called by:**
- `(anonymous)` (5)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.1% (17.9ms) | Total: 0.1% (17.9ms) | Samples: 3

**Called by:**
- `from` (3)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` | Self: 0.1% (17.0ms) | Total: 3.4% (425.9ms) | Samples: 3

**Called by:**
- `extrude` (57)

**Calls:**
- `stringify` (34)
- `meshEdgeKey` (20)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` | Self: 0.1% (16.9ms) | Total: 0.1% (16.9ms) | Samples: 2

**Called by:**
- `extrude` (2)

### `anonymous`
`[native code]` | Self: 0.1% (16.7ms) | Total: 1.2% (152.9ms) | Samples: 3

**Called by:**
- `internal:assert/assertion_error` (3)
- `loadAssertionError` (3)
- `internal:fs/streams` (3)
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
- `internal:streams/operators` (3)
- `internal:streams/pipeline` (3)
- `internal:stream` (3)
- `internal:streams/compose` (3)
- `internal:streams/duplex` (2)

### `values`
`[native code]` | Self: 0.1% (16.1ms) | Total: 0.1% (16.1ms) | Samples: 3

**Called by:**
- `sceneBounds` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `/^[A-Za-z0-9_:-]+$/`
`[native code]` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 2

**Called by:**
- `id` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` | Self: 0.1% (15.9ms) | Total: 0.1% (17.0ms) | Samples: 2

**Called by:**
- `extrude` (2)
- `meshFaceFrame` (1)

**Calls:**
- `map` (1)

### `copyDataProperties`
`[native code]` | Self: 0.1% (15.9ms) | Total: 0.1% (15.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` | Self: 0.1% (15.5ms) | Total: 0.1% (15.5ms) | Samples: 1

**Called by:**
- `map` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:79` | Self: 0.1% (15.3ms) | Total: 0.3% (47.2ms) | Samples: 1

**Called by:**
- `editSceneMesh` (5)

**Calls:**
- `has` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 0.1% (15.3ms) | Total: 0.1% (15.3ms) | Samples: 1

**Called by:**
- `extrude` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:158` | Self: 0.1% (15.2ms) | Total: 0.3% (42.2ms) | Samples: 1

**Called by:**
- `map` (3)

**Calls:**
- `from` (1)
- `list` (1)

### `flatMap`
`[native code]` | Self: 0.1% (15.1ms) | Total: 0.2% (29.0ms) | Samples: 1

**Called by:**
- `triangulateFace` (2)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.1% (14.6ms) | Total: 0.1% (15.5ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `map` (1)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:62` | Self: 0.1% (14.6ms) | Total: 0.1% (14.6ms) | Samples: 1

**Called by:**
- `extrude` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:191` | Self: 0.1% (14.5ms) | Total: 0.1% (14.5ms) | Samples: 1

**Called by:**
- `map` (1)

### `requireScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:13` | Self: 0.1% (14.5ms) | Total: 0.1% (14.5ms) | Samples: 1

**Called by:**
- `id` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 0.1% (14.3ms) | Total: 0.1% (14.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.1% (13.9ms) | Total: 0.1% (13.9ms) | Samples: 1

**Called by:**
- `map` (1)

### `meshIdAllocator`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` | Self: 0.1% (13.2ms) | Total: 3.8% (471.6ms) | Samples: 1

**Called by:**
- `extrude` (57)

**Calls:**
- `Set` (44)
- `keys` (12)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` | Self: 0.0% (11.9ms) | Total: 0.0% (11.9ms) | Samples: 2

**Called by:**
- `frameFor` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` | Self: 0.0% (11.9ms) | Total: 0.0% (11.9ms) | Samples: 3

**Called by:**
- `extrude` (2)
- `meshFaceFrame` (1)

### `fromEntries`
`[native code]` | Self: 0.0% (11.5ms) | Total: 0.0% (11.5ms) | Samples: 1

**Called by:**
- `geometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` | Self: 0.0% (11.4ms) | Total: 0.0% (11.4ms) | Samples: 1

**Called by:**
- `extrude` (1)

### `next`
`[native code]` | Self: 0.0% (11.3ms) | Total: 0.0% (11.3ms) | Samples: 1

**Called by:**
- `extrude` (1)

### `resolve`
`[native code]` | Self: 0.0% (10.8ms) | Total: 0.0% (10.8ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` | Self: 0.0% (10.7ms) | Total: 0.0% (11.6ms) | Samples: 1

**Called by:**
- `tuple` (1)
- `(anonymous)` (1)

**Calls:**
- `from` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` | Self: 0.0% (8.0ms) | Total: 0.0% (8.0ms) | Samples: 1

**Called by:**
- `frameFor` (1)

### `hasOwn`
`[native code]` | Self: 0.0% (4.7ms) | Total: 0.0% (4.7ms) | Samples: 4

**Called by:**
- `indexSceneDocument` (3)
- `extrude` (1)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` | Self: 0.0% (3.8ms) | Total: 0.0% (3.8ms) | Samples: 4

**Called by:**
- `extrude` (4)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` | Self: 0.0% (2.8ms) | Total: 0.0% (2.8ms) | Samples: 3

**Called by:**
- `finish` (3)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `extrude` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `frameFor` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.0% (1.9ms) | Total: 0.0% (2.9ms) | Samples: 2

**Called by:**
- `extrude` (2)
- `meshFaceFrame` (1)

**Calls:**
- `intersect` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `finish` (1)
- `readSceneDocument` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `frameFor` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:132` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 2

**Called by:**
- `map` (2)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:62` | Self: 0.0% (1.4ms) | Total: 0.0% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `fetch`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` | Self: 0.0% (1.0ms) | Total: 0.1% (19.3ms) | Samples: 1

**Called by:**
- `map` (6)

**Calls:**
- `tuple` (3)
- `tuple` (1)
- `map` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `tuple` (1)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:25` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `push`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `extrude` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` | Self: 0.0% (1.0ms) | Total: 0.3% (42.2ms) | Samples: 1

**Called by:**
- `extrude` (9)

**Calls:**
- `entries` (8)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:144` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` | Self: 0.0% (978us) | Total: 0.0% (978us) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `map` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:77` | Self: 0.0% (961us) | Total: 0.0% (961us) | Samples: 1

**Called by:**
- `indexSceneNodes` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` | Self: 0.0% (961us) | Total: 0.0% (961us) | Samples: 1

**Called by:**
- `extrude` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:70` | Self: 0.0% (905us) | Total: 0.0% (905us) | Samples: 1

**Called by:**
- `editSceneMesh` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (900us) | Total: 0.0% (900us) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` | Self: 0.0% (890us) | Total: 0.0% (890us) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:249` | Self: 0.0% (880us) | Total: 0.0% (880us) | Samples: 1

**Called by:**
- `some` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:90` | Self: 0.0% (878us) | Total: 9.5% (1.17s) | Samples: 1

**Called by:**
- `editSceneMesh` (141)

**Calls:**
- `every` (140)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:87` | Self: 0.0% (872us) | Total: 6.9% (855.1ms) | Samples: 1

**Called by:**
- `editSceneMesh` (104)

**Calls:**
- `frameFor` (53)
- `frameFor` (32)
- `frameFor` (18)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` | Self: 0.0% (870us) | Total: 0.0% (870us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (854us) | Total: 0.3% (41.3ms) | Samples: 1

**Called by:**
- `extrude` (3)
- `meshFaceFrame` (3)

**Calls:**
- `flatIntoArrayWithCallback` (3)
- `flatMap` (2)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (833us) | Total: 0.2% (26.2ms) | Samples: 1

**Called by:**
- `triangulateFace` (3)
- `meshFaceFrame` (1)
- `flatMap` (1)

**Calls:**
- `flatIntoArray` (3)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (826us) | Total: 0.0% (826us) | Samples: 1

**Called by:**
- `map` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:128` | Self: 0.0% (824us) | Total: 0.0% (824us) | Samples: 1

**Called by:**
- `editSceneMesh` (1)

### `frameFor`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:41` | Self: 0.0% (0us) | Total: 1.4% (183.5ms) | Samples: 0

**Called by:**
- `extrude` (32)

**Calls:**
- `meshFaceFrame` (18)
- `meshFaceFrame` (3)
- `meshFaceFrame` (2)
- `meshFaceFrame` (2)
- `meshFaceFrame` (2)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:81` | Self: 0.0% (0us) | Total: 0.2% (24.7ms) | Samples: 0

**Called by:**
- `editSceneMesh` (11)

**Calls:**
- `Set` (11)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:245` | Self: 0.0% (0us) | Total: 84.7% (10.40s) | Samples: 0

**Called by:**
- `(module)` (1179)
- `(module)` (108)
- `(module)` (51)
- `(module)` (16)

**Calls:**
- `extrude` (268)
- `extrude` (148)
- `extrude` (141)
- `extrude` (127)
- `extrude` (118)
- `extrude` (104)
- `extrude` (70)
- `extrude` (67)
- `extrude` (57)
- `extrude` (43)
- `extrude` (39)
- `extrude` (29)
- `extrude` (26)
- `extrude` (24)
- `extrude` (16)
- `extrude` (13)
- `extrude` (12)
- `extrude` (11)
- `extrude` (9)
- `extrude` (7)
- `extrude` (6)
- `extrude` (5)
- `extrude` (5)
- `extrude` (4)
- `extrude` (2)
- `extrude` (1)
- `extrude` (1)
- `extrude` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:40` | Self: 0.0% (0us) | Total: 0.8% (108.0ms) | Samples: 0

**Called by:**
- `evaluate` (15)

**Calls:**
- `sceneToJson` (10)
- `readSceneDocument` (3)
- `readSceneDocument` (2)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:248` | Self: 0.0% (0us) | Total: 0.0% (880us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `some` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (12.24s) | Samples: 0

**Called by:**
- `(anonymous)` (1593)

**Calls:**
- `moduleEvaluation` (1593)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 99.9% (12.26s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1593)
- `refresh` (3)

**Calls:**
- `async loadAndEvaluateModule` (1593)
- `get WriteStream` (3)
- `requestSatisfyUtil` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (17.9ms) | Samples: 0

**Called by:**
- `tuple` (1)
- `list` (1)
- `(anonymous)` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (3)

### `frameFor`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:39` | Self: 0.0% (0us) | Total: 4.2% (517.7ms) | Samples: 0

**Called by:**
- `extrude` (53)

**Calls:**
- `get` (35)
- `get` (15)
- `get` (3)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (29.7ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (3)
- `resolve` (1)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `internal:util/colors` (3)

**Calls:**
- `(anonymous)` (3)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:435` | Self: 0.0% (0us) | Total: 0.5% (65.3ms) | Samples: 0

**Called by:**
- `sceneToJson` (4)
- `(module)` (3)
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (3)
- `indexSceneDocument` (2)
- `sceneBounds` (2)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `parseModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `async (anonymous)` (3)

**Calls:**
- `node:assert` (3)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:317` | Self: 0.0% (0us) | Total: 9.3% (1.14s) | Samples: 0

**Called by:**
- `(module)` (131)
- `(module)` (11)
- `(module)` (5)

**Calls:**
- `indexSceneDocument` (66)
- `indexSceneDocument` (12)
- `indexSceneDocument` (11)
- `sceneBounds` (11)
- `sceneBounds` (10)
- `sceneBounds` (9)
- `sceneBounds` (9)
- `sceneBounds` (8)
- `sceneBounds` (3)
- `sceneBounds` (3)
- `indexSceneDocument` (3)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:80` | Self: 0.0% (0us) | Total: 7.8% (958.4ms) | Samples: 0

**Called by:**
- `editSceneMesh` (127)

**Calls:**
- `meshFaceRegion` (80)
- `meshFaceRegion` (31)
- `meshFaceRegion` (7)
- `meshFaceRegion` (4)
- `meshFaceRegion` (2)
- `meshFaceRegion` (2)
- `meshFaceRegion` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:76` | Self: 0.0% (0us) | Total: 0.7% (92.5ms) | Samples: 0

**Called by:**
- `editSceneMesh` (13)

**Calls:**
- `cloneObject` (13)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:24` | Self: 0.0% (0us) | Total: 0.0% (900us) | Samples: 0

**Called by:**
- `frameFor` (1)

**Calls:**
- `triangleUnitNormal` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:78` | Self: 0.0% (0us) | Total: 86.1% (10.57s) | Samples: 0

**Called by:**
- `evaluate` (1352)

**Calls:**
- `editSceneMesh` (1179)
- `finish` (131)
- `editSceneMesh` (41)
- `editSceneMesh` (1)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:239` | Self: 0.0% (0us) | Total: 3.0% (373.0ms) | Samples: 0

**Called by:**
- `(module)` (41)
- `(module)` (9)
- `(module)` (4)

**Calls:**
- `selection` (54)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `anonymous` (3)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:63` | Self: 0.0% (0us) | Total: 0.3% (44.1ms) | Samples: 0

**Called by:**
- `(module)` (2)
- `(module)` (1)

**Calls:**
- `stringify` (3)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `refresh` (3)

### `selection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:280` | Self: 0.0% (0us) | Total: 3.0% (373.0ms) | Samples: 0

**Called by:**
- `editSceneMesh` (54)

**Calls:**
- `indexSceneDocument` (31)
- `indexSceneDocument` (12)
- `indexSceneDocument` (6)
- `indexSceneDocument` (5)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:75` | Self: 0.0% (0us) | Total: 0.9% (111.8ms) | Samples: 0

**Called by:**
- `editSceneMesh` (16)

**Calls:**
- `cloneObject` (16)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:91` | Self: 0.0% (0us) | Total: 0.1% (19.1ms) | Samples: 0

**Called by:**
- `every` (5)

**Calls:**
- `sub` (5)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `node:assert` (3)

**Calls:**
- `get` (3)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `assign` (3)

**Calls:**
- `loadAssertionError` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:179` | Self: 0.0% (0us) | Total: 0.1% (15.9ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `copyDataProperties` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:72` | Self: 0.0% (0us) | Total: 7.8% (963.4ms) | Samples: 0

**Called by:**
- `evaluate` (128)

**Calls:**
- `editSceneMesh` (108)
- `finish` (11)
- `editSceneMesh` (9)

### `deepStrictEqual`
`node:assert:133` | Self: 0.0% (0us) | Total: 0.2% (28.5ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `deepEquals` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:9` | Self: 0.0% (0us) | Total: 0.0% (961us) | Samples: 0

**Called by:**
- `finish` (1)

**Calls:**
- `indexSceneNodes` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:155` | Self: 0.0% (0us) | Total: 1.0% (123.6ms) | Samples: 0

**Called by:**
- `map` (20)

**Calls:**
- `map` (20)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (0us) | Total: 0.0% (2.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `from` (1)
- `list` (1)
- `list` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:412` | Self: 0.0% (0us) | Total: 1.2% (149.7ms) | Samples: 0

**Called by:**
- `sceneToJson` (13)
- `(module)` (6)
- `(module)` (3)

**Calls:**
- `map` (22)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (12.24s) | Samples: 0

**Calls:**
- `(anonymous)` (1593)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 0.4% (50.8ms) | Samples: 0

**Called by:**
- `map` (11)

**Calls:**
- `map` (11)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:108` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `editSceneMesh` (1)

**Calls:**
- `push` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.2% (27.3ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (2)
- `extrude` (1)

**Calls:**
- `map` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:170` | Self: 0.0% (0us) | Total: 0.1% (17.2ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `id` (3)
- `id` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:58` | Self: 0.0% (0us) | Total: 0.1% (14.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `deepStrictEqual` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (900us) | Samples: 0

**Called by:**
- `meshFaceFrame` (1)

**Calls:**
- `cross` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:21` | Self: 0.0% (0us) | Total: 0.1% (16.1ms) | Samples: 0

**Called by:**
- `finish` (3)

**Calls:**
- `values` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.0% (0us) | Total: 0.2% (28.6ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (2)
- `extrude` (1)

**Calls:**
- `map` (2)
- `max` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:189` | Self: 0.0% (0us) | Total: 0.1% (14.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:148` | Self: 0.0% (0us) | Total: 0.2% (32.6ms) | Samples: 0

**Called by:**
- `editSceneMesh` (4)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:154` | Self: 0.0% (0us) | Total: 0.0% (11.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `fromEntries` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:130` | Self: 0.0% (0us) | Total: 0.3% (45.3ms) | Samples: 0

**Called by:**
- `editSceneMesh` (5)

**Calls:**
- `map` (3)
- `get` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:11` | Self: 0.0% (0us) | Total: 0.1% (17.7ms) | Samples: 0

**Called by:**
- `frameFor` (3)

**Calls:**
- `map` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:10` | Self: 0.0% (0us) | Total: 2.5% (313.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (38)
- `extrude` (3)

**Calls:**
- `id` (21)
- `(anonymous)` (20)

### `get`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts:32` | Self: 0.0% (0us) | Total: 0.2% (26.8ms) | Samples: 0

**Called by:**
- `frameFor` (3)

**Calls:**
- `delete` (3)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `parseModule` (3)

**Calls:**
- `assign` (3)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:16` | Self: 0.0% (0us) | Total: 1.1% (138.2ms) | Samples: 0

**Called by:**
- `frameFor` (18)

**Calls:**
- `triangulateFace` (3)
- `triangulateFace` (3)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:42` | Self: 0.0% (0us) | Total: 0.1% (14.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `deepStrictEqual` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:73` | Self: 0.0% (0us) | Total: 9.4% (1.15s) | Samples: 0

**Called by:**
- `editSceneMesh` (148)

**Calls:**
- `indexMeshEdges` (57)
- `indexMeshEdges` (36)
- `indexMeshEdges` (29)
- `indexMeshEdges` (14)
- `indexMeshEdges` (9)
- `indexMeshEdges` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:56` | Self: 0.0% (0us) | Total: 0.8% (107.0ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `sceneToJson` (7)
- `readSceneDocument` (6)
- `readSceneDocument` (3)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (880us) | Samples: 0

**Called by:**
- `editSceneMesh` (1)

**Calls:**
- `(anonymous)` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:38` | Self: 0.0% (0us) | Total: 0.0% (834us) | Samples: 0

**Called by:**
- `frameFor` (1)

**Calls:**
- `map` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.0% (0us) | Total: 0.0% (11.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `max` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:82` | Self: 0.0% (0us) | Total: 1.1% (137.3ms) | Samples: 0

**Called by:**
- `evaluate` (17)

**Calls:**
- `editSceneMesh` (16)
- `digest` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:44` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `frameFor` (1)

**Calls:**
- `map` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `get` (3)

**Calls:**
- `anonymous` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:54` | Self: 0.0% (0us) | Total: 2.3% (282.4ms) | Samples: 0

**Called by:**
- `evaluate` (60)

**Calls:**
- `editSceneMesh` (51)
- `finish` (5)
- `editSceneMesh` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:64` | Self: 0.0% (0us) | Total: 0.1% (16.5ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `digest` (2)

### `sceneToJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentJson.ts:13` | Self: 0.0% (0us) | Total: 0.9% (121.9ms) | Samples: 0

**Called by:**
- `(module)` (10)
- `(module)` (7)

**Calls:**
- `readSceneDocument` (13)
- `readSceneDocument` (4)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:53` | Self: 0.0% (0us) | Total: 0.0% (961us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `composeTransform` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `number` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:168` | Self: 0.0% (0us) | Total: 0.1% (14.3ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.1% (16.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:74` | Self: 0.0% (0us) | Total: 3.8% (471.6ms) | Samples: 0

**Called by:**
- `editSceneMesh` (57)

**Calls:**
- `meshIdAllocator` (57)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:86` | Self: 0.0% (0us) | Total: 1.7% (212.8ms) | Samples: 0

**Called by:**
- `editSceneMesh` (26)

**Calls:**
- `add` (26)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:175` | Self: 0.0% (0us) | Total: 0.1% (14.6ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `Set` (3)
- `map` (1)

### `extrude`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:69` | Self: 0.0% (0us) | Total: 0.3% (48.4ms) | Samples: 0

**Called by:**
- `editSceneMesh` (6)

**Calls:**
- `Set` (6)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (24.48s) | Samples: 0

**Called by:**
- `moduleEvaluation` (1593)
- `async loadAndEvaluateModule` (1593)

**Calls:**
- `evaluate` (1593)
- `moduleEvaluation` (1593)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` | Self: 0.0% (0us) | Total: 0.0% (867us) | Samples: 0

**Called by:**
- `frameFor` (1)

**Calls:**
- `flatIntoArrayWithCallback` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (12.24s) | Samples: 0

**Called by:**
- `moduleEvaluation` (1593)

**Calls:**
- `(module)` (1352)
- `(module)` (128)
- `(module)` (60)
- `(module)` (17)
- `(module)` (16)
- `(module)` (15)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.0% (0us) | Total: 0.0% (826us) | Samples: 0

**Called by:**
- `extrude` (1)

**Calls:**
- `map` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 31.9% | 3.92s | `[native code]` |
| 30.5% | 3.74s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 16.2% | 1.98s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 7.5% | 923.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 3.1% | 390.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 2.9% | 356.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\byteLru.ts` |
| 2.4% | 305.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 1.6% | 203.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 1.4% | 181.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts` |
| 1.4% | 181.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.3% | 40.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 0.2% | 30.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.0% | 961us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.0% | 880us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts` |
