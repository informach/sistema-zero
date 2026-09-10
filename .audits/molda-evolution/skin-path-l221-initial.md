# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.19s | 295 | 1.0ms | 246 |

**Top 10:** `checkIntersection$1` 17.1%, `copy` 9.1%, `intersectTriangle` 5.2%, `parseModule` 4.4%, `intersectTriangle` 4.1%, `indexSceneDocument` 3.8%, `structuredClone` 2.9%, `indexMeshEdges` 2.7%, `_computeIntersections` 2.1%, `cloneObject` 1.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 17.1% | 377.2ms | 35.8% | 785.9ms | `checkIntersection$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23401` |
| 9.1% | 201.0ms | 9.1% | 201.0ms | `copy` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4994` |
| 5.2% | 115.3ms | 5.2% | 115.3ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 4.4% | 97.0ms | 7.6% | 167.2ms | `parseModule` | `[native code]` |
| 4.1% | 90.4ms | 4.1% | 90.4ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22641` |
| 3.8% | 85.1ms | 4.5% | 98.9ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` |
| 2.9% | 65.6ms | 2.9% | 65.6ms | `structuredClone` | `[native code]` |
| 2.7% | 60.1ms | 2.7% | 60.1ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` |
| 2.1% | 47.7ms | 38.0% | 834.6ms | `_computeIntersections` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23347` |
| 1.5% | 32.9ms | 1.5% | 32.9ms | `cloneObject` | `[native code]` |
| 1.4% | 31.0ms | 1.4% | 31.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:84` |
| 1.4% | 30.9ms | 1.4% | 30.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 1.3% | 30.5ms | 1.3% | 30.5ms | `deepEquals` | `[native code]` |
| 1.3% | 30.2ms | 1.3% | 30.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 1.3% | 29.4ms | 1.3% | 29.4ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` |
| 1.3% | 28.9ms | 1.3% | 28.9ms | `resolve` | `[native code]` |
| 1.3% | 28.7ms | 1.3% | 28.7ms | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:123` |
| 1.2% | 27.8ms | 1.2% | 27.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.2% | 27.0ms | 1.2% | 27.0ms | `stringify` | `[native code]` |
| 0.7% | 17.3ms | 1.0% | 22.3ms | `node:url` | `node:url:2` |
| 0.7% | 17.2ms | 0.7% | 17.2ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.7% | 16.5ms | 89.0% | 1.95s | `evaluate` | `[native code]` |
| 0.7% | 16.4ms | 0.7% | 16.4ms | `@lazy` | `[native code]` |
| 0.7% | 16.4ms | 1.0% | 23.7ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` |
| 0.7% | 16.3ms | 7.1% | 157.0ms | `anonymous` | `[native code]` |
| 0.7% | 16.3ms | 0.7% | 16.3ms | `entries` | `[native code]` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `push` | `[native code]` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.7% | 15.7ms | 1.4% | 31.8ms | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` |
| 0.7% | 15.6ms | 1.4% | 31.2ms | `every` | `[native code]` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:46` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:83` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:10` |
| 0.6% | 15.2ms | 2.2% | 48.4ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:86` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.6% | 15.1ms | 0.6% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 0.6% | 15.1ms | 0.6% | 15.1ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:46` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` |
| 0.6% | 15.0ms | 1.3% | 29.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:95` |
| 0.6% | 14.8ms | 0.6% | 14.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:124` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `flatIntoArray` | `[native code]` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `hypot` | `[native code]` |
| 0.6% | 14.4ms | 0.6% | 14.4ms | `clip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts:23` |
| 0.6% | 14.4ms | 0.6% | 14.4ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `(anonymous)` | `node:zlib:438` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `copyDataProperties` | `[native code]` |
| 0.6% | 13.9ms | 0.6% | 13.9ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:62` |
| 0.6% | 13.9ms | 0.6% | 13.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:30` |
| 0.6% | 13.8ms | 1.3% | 29.3ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` |
| 0.6% | 13.7ms | 0.6% | 13.7ms | `hasOwn` | `[native code]` |
| 0.6% | 13.7ms | 0.6% | 13.7ms | `randomUUID` | `[native code]` |
| 0.6% | 13.5ms | 0.6% | 13.5ms | `invert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6361` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.5% | 12.7ms | 0.5% | 12.7ms | `fromEntries` | `[native code]` |
| 0.5% | 12.6ms | 0.5% | 12.6ms | `add` | `[native code]` |
| 0.5% | 11.7ms | 0.5% | 11.7ms | `compose` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.3% | 7.3ms | 0.3% | 7.3ms | `set` | `[native code]` |
| 0.1% | 3.0ms | 0.1% | 3.0ms | `makeSafe` | `internal:primordials` |
| 0.1% | 2.8ms | 0.1% | 2.8ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `get` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `hideFromStack` | `internal:shared` |
| 0.0% | 1.9ms | 0.1% | 2.9ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22643` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:25` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:186` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.0% | 995us | 0.0% | 995us | `getMaxScaleOnAxis` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10617` |
| 0.0% | 994us | 4.4% | 97.8ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 994us | 0.0% | 994us | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 991us | 0.0% | 991us | `requestInstantiate` | `[native code]` |
| 0.0% | 989us | 0.0% | 989us | `transformDirection` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5315` |
| 0.0% | 986us | 0.0% | 986us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` |
| 0.0% | 976us | 0.0% | 976us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 0.0% | 963us | 0.0% | 963us | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.0% | 960us | 0.0% | 960us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:92` |
| 0.0% | 958us | 0.0% | 958us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 956us | 0.0% | 956us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:44` |
| 0.0% | 944us | 0.0% | 944us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 935us | 0.0% | 1.9ms | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` |
| 0.0% | 916us | 0.0% | 916us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.0% | 915us | 0.7% | 15.5ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` |
| 0.0% | 913us | 0.0% | 913us | `getY` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17120` |
| 0.0% | 902us | 0.0% | 902us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` |
| 0.0% | 896us | 13.9% | 305.6ms | `map` | `[native code]` |
| 0.0% | 894us | 0.0% | 894us | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:181` |
| 0.0% | 886us | 0.0% | 886us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:91` |
| 0.0% | 885us | 0.0% | 885us | `Agent` | `node:_http_agent:12` |
| 0.0% | 885us | 2.2% | 48.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:126` |
| 0.0% | 882us | 0.7% | 16.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:24` |
| 0.0% | 877us | 0.0% | 877us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` |
| 0.0% | 872us | 0.0% | 872us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.0% | 864us | 0.0% | 864us | `_onChangeCallback` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 853us | 0.0% | 853us | `find` | `[native code]` |
| 0.0% | 845us | 0.0% | 845us | `pop` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 0.0% | 842us | 0.0% | 842us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:125` |
| 0.0% | 829us | 0.0% | 829us | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.94s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 90.4% | 1.98s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 89.0% | 1.95s | 0.7% | 16.5ms | `evaluate` | `[native code]` |
| 38.7% | 849.2ms | 0.0% | 0us | `pickSceneSkinPaint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:19` |
| 38.6% | 848.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:121` |
| 38.1% | 836.6ms | 0.0% | 0us | `intersect` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:55911` |
| 38.1% | 836.6ms | 0.0% | 0us | `intersectObjects` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:55887` |
| 38.1% | 836.6ms | 0.0% | 0us | `sceneSurfaceHit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:34` |
| 38.0% | 834.6ms | 0.0% | 0us | `raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23250` |
| 38.0% | 834.6ms | 2.1% | 47.7ms | `_computeIntersections` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23347` |
| 35.8% | 785.9ms | 17.1% | 377.2ms | `checkIntersection$1` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23401` |
| 35.8% | 785.9ms | 0.0% | 0us | `checkGeometryIntersection` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23428` |
| 15.0% | 329.5ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:100` |
| 14.4% | 316.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:111` |
| 13.9% | 305.6ms | 0.0% | 896us | `map` | `[native code]` |
| 12.9% | 284.3ms | 0.0% | 0us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:118` |
| 11.7% | 258.8ms | 0.0% | 0us | `link` | `[native code]` |
| 9.2% | 202.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:83` |
| 9.1% | 201.0ms | 9.1% | 201.0ms | `copy` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4994` |
| 9.1% | 201.0ms | 0.0% | 0us | `at` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22179` |
| 9.1% | 201.0ms | 0.0% | 0us | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22706` |
| 8.9% | 196.2ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 7.6% | 167.2ms | 4.4% | 97.0ms | `parseModule` | `[native code]` |
| 7.1% | 157.0ms | 0.7% | 16.3ms | `anonymous` | `[native code]` |
| 7.0% | 154.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:268` |
| 6.7% | 147.7ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:81` |
| 5.2% | 115.3ms | 5.2% | 115.3ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 4.5% | 98.9ms | 3.8% | 85.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` |
| 4.4% | 97.8ms | 0.0% | 994us | `flatIntoArrayWithCallback` | `[native code]` |
| 4.3% | 95.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:123` |
| 4.2% | 92.4ms | 0.0% | 0us | `createSceneSkinPaintStroke` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:45` |
| 4.2% | 92.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:103` |
| 4.1% | 90.4ms | 4.1% | 90.4ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22641` |
| 3.4% | 75.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:43` |
| 3.0% | 67.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:127` |
| 2.9% | 65.6ms | 2.9% | 65.6ms | `structuredClone` | `[native code]` |
| 2.9% | 65.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:63` |
| 2.9% | 65.4ms | 0.0% | 0us | `commit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:162` |
| 2.8% | 62.7ms | 0.0% | 0us | `readNormalizedSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:7` |
| 2.7% | 60.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 2.7% | 60.1ms | 2.7% | 60.1ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` |
| 2.7% | 59.9ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` |
| 2.7% | 59.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:44` |
| 2.2% | 49.5ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:114` |
| 2.2% | 48.5ms | 0.0% | 885us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:126` |
| 2.2% | 48.4ms | 0.6% | 15.2ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:86` |
| 2.1% | 46.1ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 2.0% | 45.3ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 2.0% | 44.2ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 1.5% | 32.9ms | 1.5% | 32.9ms | `cloneObject` | `[native code]` |
| 1.4% | 32.5ms | 0.0% | 0us | `patchSceneSkinWeights` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:18` |
| 1.4% | 31.8ms | 0.7% | 15.7ms | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` |
| 1.4% | 31.2ms | 0.7% | 15.6ms | `every` | `[native code]` |
| 1.4% | 31.0ms | 1.4% | 31.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:84` |
| 1.4% | 30.9ms | 0.0% | 0us | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:19` |
| 1.4% | 30.9ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 1.4% | 30.9ms | 1.4% | 30.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 1.4% | 30.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:372` |
| 1.4% | 30.8ms | 0.0% | 0us | `SceneSkinResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSkinResource.ts:42` |
| 1.4% | 30.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` |
| 1.3% | 30.5ms | 1.3% | 30.5ms | `deepEquals` | `[native code]` |
| 1.3% | 30.2ms | 1.3% | 30.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 1.3% | 29.5ms | 0.0% | 0us | `bindSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:51` |
| 1.3% | 29.5ms | 0.0% | 0us | `createSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:60` |
| 1.3% | 29.4ms | 1.3% | 29.4ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` |
| 1.3% | 29.3ms | 0.6% | 13.8ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` |
| 1.3% | 29.1ms | 0.6% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 1.3% | 28.9ms | 1.3% | 28.9ms | `resolve` | `[native code]` |
| 1.3% | 28.7ms | 1.3% | 28.7ms | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:123` |
| 1.2% | 27.8ms | 1.2% | 27.8ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.2% | 27.0ms | 1.2% | 27.0ms | `stringify` | `[native code]` |
| 1.2% | 27.0ms | 0.0% | 0us | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:35` |
| 1.0% | 23.7ms | 0.7% | 16.4ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` |
| 1.0% | 22.3ms | 0.7% | 17.3ms | `node:url` | `node:url:2` |
| 0.8% | 18.1ms | 0.0% | 0us | `node:http` | `node:http:2` |
| 0.8% | 18.1ms | 0.0% | 0us | `ws` | `ws:3` |
| 0.8% | 18.1ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 0.8% | 17.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:148` |
| 0.7% | 17.5ms | 0.0% | 0us | `patchSceneSkinWeights` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:38` |
| 0.7% | 17.2ms | 0.7% | 17.2ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.7% | 16.9ms | 0.0% | 882us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:24` |
| 0.7% | 16.9ms | 0.0% | 0us | `from` | `[native code]` |
| 0.7% | 16.6ms | 0.0% | 0us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:74` |
| 0.7% | 16.5ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:373` |
| 0.7% | 16.4ms | 0.0% | 0us | `node:_http_agent` | `node:_http_agent:2` |
| 0.7% | 16.4ms | 0.7% | 16.4ms | `@lazy` | `[native code]` |
| 0.7% | 16.4ms | 0.0% | 0us | `internal:http` | `internal:http:14` |
| 0.7% | 16.3ms | 0.7% | 16.3ms | `entries` | `[native code]` |
| 0.7% | 16.2ms | 0.0% | 0us | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:100` |
| 0.7% | 16.2ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:101` |
| 0.7% | 16.2ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:102` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.7% | 15.9ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `push` | `[native code]` |
| 0.7% | 15.8ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` |
| 0.7% | 15.7ms | 0.0% | 0us | `readSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:29` |
| 0.7% | 15.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:64` |
| 0.7% | 15.7ms | 0.0% | 0us | `readSceneSkinBindings` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:15` |
| 0.7% | 15.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:66` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` |
| 0.7% | 15.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` |
| 0.7% | 15.7ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` |
| 0.7% | 15.6ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 0.7% | 15.5ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` |
| 0.7% | 15.5ms | 0.0% | 0us | `makeSceneSkinFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneSkin.ts:5` |
| 0.7% | 15.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:39` |
| 0.7% | 15.5ms | 0.0% | 0us | `animatedScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:46` |
| 0.7% | 15.5ms | 0.0% | 915us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` |
| 0.7% | 15.5ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.7% | 15.5ms | 0.0% | 0us | `internal:streams/lazy_transform` | `internal:streams/lazy_transform:2` |
| 0.7% | 15.5ms | 0.0% | 0us | `node:crypto` | `node:crypto:2` |
| 0.7% | 15.5ms | 0.0% | 0us | `internal:streams/transform` | `internal:streams/transform:2` |
| 0.7% | 15.5ms | 0.0% | 0us | `internal:streams/readable` | `internal:streams/readable:2` |
| 0.7% | 15.5ms | 0.0% | 0us | `internal:streams/add-abort-signal` | `internal:streams/add-abort-signal:2` |
| 0.7% | 15.5ms | 0.7% | 15.5ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:83` |
| 0.7% | 15.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:138` |
| 0.7% | 15.4ms | 0.0% | 0us | `readPatch` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` |
| 0.6% | 15.2ms | 0.0% | 0us | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:9` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:10` |
| 0.6% | 15.2ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 0.6% | 15.1ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` |
| 0.6% | 15.1ms | 0.6% | 15.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` |
| 0.6% | 15.1ms | 0.6% | 15.1ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:46` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` |
| 0.6% | 15.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:95` |
| 0.6% | 14.8ms | 0.6% | 14.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:124` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `flatIntoArray` | `[native code]` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `hypot` | `[native code]` |
| 0.6% | 14.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:119` |
| 0.6% | 14.4ms | 0.0% | 0us | `paintPointerPath` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts:59` |
| 0.6% | 14.4ms | 0.0% | 0us | `generatorResume` | `[native code]` |
| 0.6% | 14.4ms | 0.6% | 14.4ms | `clip` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts:23` |
| 0.6% | 14.4ms | 0.6% | 14.4ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `(anonymous)` | `node:zlib:438` |
| 0.6% | 14.1ms | 0.0% | 0us | `node:zlib` | `node:zlib:438` |
| 0.6% | 14.1ms | 0.6% | 14.1ms | `copyDataProperties` | `[native code]` |
| 0.6% | 14.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:109` |
| 0.6% | 13.9ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:85` |
| 0.6% | 13.9ms | 0.6% | 13.9ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:62` |
| 0.6% | 13.9ms | 0.6% | 13.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:30` |
| 0.6% | 13.7ms | 0.0% | 0us | `readSceneSkinBindings` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:16` |
| 0.6% | 13.7ms | 0.6% | 13.7ms | `hasOwn` | `[native code]` |
| 0.6% | 13.7ms | 0.0% | 0us | `makeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:31` |
| 0.6% | 13.7ms | 0.6% | 13.7ms | `randomUUID` | `[native code]` |
| 0.6% | 13.7ms | 0.0% | 0us | `createModelAsset` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts:223` |
| 0.6% | 13.5ms | 0.6% | 13.5ms | `invert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6361` |
| 0.6% | 13.5ms | 0.0% | 0us | `getNormalMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6394` |
| 0.6% | 13.5ms | 0.0% | 0us | `pickSceneSkinPaint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:41` |
| 0.6% | 13.3ms | 0.0% | 0us | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` |
| 0.6% | 13.3ms | 0.0% | 0us | `createSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:38` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts` |
| 0.5% | 12.8ms | 0.0% | 0us | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:28` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.5% | 12.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:126` |
| 0.5% | 12.7ms | 0.0% | 0us | `result` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:151` |
| 0.5% | 12.7ms | 0.5% | 12.7ms | `fromEntries` | `[native code]` |
| 0.5% | 12.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:139` |
| 0.5% | 12.6ms | 0.0% | 0us | `sceneSurfaceHit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:24` |
| 0.5% | 12.6ms | 0.0% | 0us | `cacheSatisfyAndReturn` | `[native code]` |
| 0.5% | 12.6ms | 0.5% | 12.6ms | `add` | `[native code]` |
| 0.5% | 11.7ms | 0.0% | 0us | `updateMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12823` |
| 0.5% | 11.7ms | 0.0% | 0us | `updateWorldMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:45715` |
| 0.5% | 11.7ms | 0.5% | 11.7ms | `compose` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.5% | 11.7ms | 0.0% | 0us | `updateWorldMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12910` |
| 0.4% | 8.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:64` |
| 0.3% | 7.3ms | 0.3% | 7.3ms | `set` | `[native code]` |
| 0.1% | 3.0ms | 0.1% | 3.0ms | `makeSafe` | `internal:primordials` |
| 0.1% | 3.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.1% | 3.0ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:71` |
| 0.1% | 3.0ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.1% | 2.9ms | 0.0% | 1.9ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.1% | 2.8ms | 0.1% | 2.8ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `get` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:92` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `hideFromStack` | `internal:shared` |
| 0.0% | 2.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:47` |
| 0.0% | 2.0ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` |
| 0.0% | 1.9ms | 0.0% | 935us | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` |
| 0.0% | 1.8ms | 0.0% | 0us | `commit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:175` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `intersectTriangle` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22643` |
| 0.0% | 1.8ms | 0.0% | 0us | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:17` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:25` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `transformPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:186` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.0% | 995us | 0.0% | 0us | `raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23221` |
| 0.0% | 995us | 0.0% | 0us | `applyMatrix4` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17972` |
| 0.0% | 995us | 0.0% | 995us | `getMaxScaleOnAxis` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10617` |
| 0.0% | 994us | 0.0% | 994us | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 991us | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.0% | 991us | 0.0% | 991us | `requestInstantiate` | `[native code]` |
| 0.0% | 989us | 0.0% | 0us | `applyMatrix4` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22719` |
| 0.0% | 989us | 0.0% | 0us | `raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23238` |
| 0.0% | 989us | 0.0% | 989us | `transformDirection` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5315` |
| 0.0% | 986us | 0.0% | 986us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` |
| 0.0% | 976us | 0.0% | 976us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` |
| 0.0% | 963us | 0.0% | 963us | `/^[A-Za-z0-9_:-]+$/` | `[native code]` |
| 0.0% | 960us | 0.0% | 960us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:92` |
| 0.0% | 958us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6071` |
| 0.0% | 958us | 0.0% | 958us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 956us | 0.0% | 956us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:44` |
| 0.0% | 944us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` |
| 0.0% | 944us | 0.0% | 944us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 916us | 0.0% | 916us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` |
| 0.0% | 913us | 0.0% | 913us | `getY` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17120` |
| 0.0% | 913us | 0.0% | 0us | `checkGeometryIntersection` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23424` |
| 0.0% | 913us | 0.0% | 0us | `getVertexPosition` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23165` |
| 0.0% | 913us | 0.0% | 0us | `fromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5986` |
| 0.0% | 902us | 0.0% | 902us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` |
| 0.0% | 896us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.0% | 896us | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.0% | 894us | 0.0% | 894us | `affineDeterminant` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:181` |
| 0.0% | 894us | 0.0% | 0us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` |
| 0.0% | 894us | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 0.0% | 894us | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.0% | 886us | 0.0% | 886us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:91` |
| 0.0% | 885us | 0.0% | 885us | `Agent` | `node:_http_agent:12` |
| 0.0% | 885us | 0.0% | 0us | `node:_http_agent` | `node:_http_agent:236` |
| 0.0% | 877us | 0.0% | 877us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` |
| 0.0% | 877us | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:80` |
| 0.0% | 872us | 0.0% | 872us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.0% | 867us | 0.0% | 0us | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:29` |
| 0.0% | 864us | 0.0% | 864us | `_onChangeCallback` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 864us | 0.0% | 0us | `decompose` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10921` |
| 0.0% | 864us | 0.0% | 0us | `updateWorldMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:45719` |
| 0.0% | 864us | 0.0% | 0us | `setFromRotationMatrix` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4323` |
| 0.0% | 853us | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:137` |
| 0.0% | 853us | 0.0% | 853us | `find` | `[native code]` |
| 0.0% | 845us | 0.0% | 845us | `pop` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 0.0% | 845us | 0.0% | 0us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:119` |
| 0.0% | 842us | 0.0% | 842us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:125` |
| 0.0% | 829us | 0.0% | 0us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` |
| 0.0% | 829us | 0.0% | 829us | `number` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 829us | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:333` |

## Function Details

### `checkIntersection$1`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23401` | Self: 17.1% (377.2ms) | Total: 35.8% (785.9ms) | Samples: 51

**Called by:**
- `checkGeometryIntersection` (110)

**Calls:**
- `intersectTriangle` (29)
- `intersectTriangle` (15)
- `intersectTriangle` (13)
- `intersectTriangle` (2)

### `copy`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4994` | Self: 9.1% (201.0ms) | Total: 9.1% (201.0ms) | Samples: 29

**Called by:**
- `at` (29)

### `intersectTriangle`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 5.2% (115.3ms) | Total: 5.2% (115.3ms) | Samples: 15

**Called by:**
- `checkIntersection$1` (15)

### `parseModule`
`[native code]` | Self: 4.4% (97.0ms) | Total: 7.6% (167.2ms) | Samples: 12

**Called by:**
- `async (anonymous)` (22)

**Calls:**
- `ws` (4)
- `node:url` (4)
- `node:crypto` (1)
- `node:zlib` (1)

### `intersectTriangle`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22641` | Self: 4.1% (90.4ms) | Total: 4.1% (90.4ms) | Samples: 13

**Called by:**
- `checkIntersection$1` (13)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` | Self: 3.8% (85.1ms) | Total: 4.5% (98.9ms) | Samples: 10

**Called by:**
- `createSceneSkinPaintStroke` (4)
- `finishSceneCommand` (2)
- `readSceneDocument` (2)
- `readSceneSkinBindings` (1)
- `(module)` (1)
- `sceneCommandSelection` (1)

**Calls:**
- `hasOwn` (1)

### `structuredClone`
`[native code]` | Self: 2.9% (65.6ms) | Total: 2.9% (65.6ms) | Samples: 9

**Called by:**
- `(module)` (9)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` | Self: 2.7% (60.1ms) | Total: 2.7% (60.1ms) | Samples: 6

**Called by:**
- `graph` (6)

### `_computeIntersections`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23347` | Self: 2.1% (47.7ms) | Total: 38.0% (834.6ms) | Samples: 7

**Called by:**
- `raycast` (118)

**Calls:**
- `checkGeometryIntersection` (110)
- `checkGeometryIntersection` (1)

### `cloneObject`
`[native code]` | Self: 1.5% (32.9ms) | Total: 1.5% (32.9ms) | Samples: 6

**Called by:**
- `patchSceneSkinWeights` (5)
- `(anonymous)` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:84` | Self: 1.4% (31.0ms) | Total: 1.4% (31.0ms) | Samples: 2

**Called by:**
- `query` (2)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 1.4% (30.9ms) | Total: 1.4% (30.9ms) | Samples: 2

**Called by:**
- `link` (2)

### `deepEquals`
`[native code]` | Self: 1.3% (30.5ms) | Total: 1.3% (30.5ms) | Samples: 5

**Called by:**
- `(module)` (4)
- `(module)` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` | Self: 1.3% (30.2ms) | Total: 1.3% (30.2ms) | Samples: 3

**Called by:**
- `graph` (3)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` | Self: 1.3% (29.4ms) | Total: 1.3% (29.4ms) | Samples: 3

**Called by:**
- `graph` (3)

### `resolve`
`[native code]` | Self: 1.3% (28.9ms) | Total: 1.3% (28.9ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:123` | Self: 1.3% (28.7ms) | Total: 1.3% (28.7ms) | Samples: 3

**Called by:**
- `sample` (3)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 1.2% (27.8ms) | Total: 1.2% (27.8ms) | Samples: 2

**Called by:**
- `update` (2)

### `stringify`
`[native code]` | Self: 1.2% (27.0ms) | Total: 1.2% (27.0ms) | Samples: 4

**Called by:**
- `indexMeshEdges` (4)

### `node:url`
`node:url:2` | Self: 0.7% (17.3ms) | Total: 1.0% (22.3ms) | Samples: 1

**Called by:**
- `parseModule` (4)

**Calls:**
- `anonymous` (3)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.7% (17.2ms) | Total: 0.7% (17.2ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `evaluate`
`[native code]` | Self: 0.7% (16.5ms) | Total: 89.0% (1.95s) | Samples: 1

**Called by:**
- `moduleEvaluation` (267)

**Calls:**
- `(module)` (122)
- `(module)` (43)
- `(module)` (23)
- `(module)` (16)
- `(module)` (13)
- `(module)` (10)
- `(module)` (9)
- `(module)` (9)
- `(module)` (6)
- `(module)` (4)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `@lazy`
`[native code]` | Self: 0.7% (16.4ms) | Total: 0.7% (16.4ms) | Samples: 2

**Called by:**
- `internal:http` (2)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` | Self: 0.7% (16.4ms) | Total: 1.0% (23.7ms) | Samples: 2

**Called by:**
- `query` (3)

**Calls:**
- `set` (1)

### `anonymous`
`[native code]` | Self: 0.7% (16.3ms) | Total: 7.1% (157.0ms) | Samples: 2

**Called by:**
- `node:http` (4)
- `ws` (4)
- `node:url` (3)
- `node:_http_agent` (2)
- `internal:streams/add-abort-signal` (1)
- `internal:validators` (1)
- `internal:streams/transform` (1)
- `node:crypto` (1)
- `internal:streams/duplex` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)

**Calls:**
- `node:http` (4)
- `internal:http` (2)
- `internal:validators` (2)
- `node:_http_agent` (2)
- `node:_http_agent` (1)
- `internal:streams/add-abort-signal` (1)
- `internal:validators` (1)
- `internal:primordials` (1)
- `internal:streams/transform` (1)
- `internal:streams/duplex` (1)
- `internal:streams/readable` (1)
- `internal:shared` (1)
- `internal:streams/lazy_transform` (1)

### `entries`
`[native code]` | Self: 0.7% (16.3ms) | Total: 0.7% (16.3ms) | Samples: 3

**Called by:**
- `(module)` (2)
- `indexMeshEdges` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` | Self: 0.7% (16.0ms) | Total: 0.7% (16.0ms) | Samples: 2

**Called by:**
- `point` (1)
- `graph` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.7% (16.0ms) | Total: 0.7% (16.0ms) | Samples: 1

**Called by:**
- `from` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` | Self: 0.7% (15.9ms) | Total: 0.7% (15.9ms) | Samples: 2

**Called by:**
- `indexSceneDocument` (2)

### `push`
`[native code]` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:25` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 2

**Called by:**
- `createSceneSkinPaintStroke` (2)

### `readSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` | Self: 0.7% (15.7ms) | Total: 1.4% (31.8ms) | Samples: 1

**Called by:**
- `readNormalizedSceneSkinInfluences` (2)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:161` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `map` (1)

### `prepareSceneSkinDraw`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 2

**Called by:**
- `SceneSkinResource` (2)

### `every`
`[native code]` | Self: 0.7% (15.6ms) | Total: 1.4% (31.2ms) | Samples: 1

**Called by:**
- `every` (1)
- `validateBuffers` (1)

**Calls:**
- `every` (1)

### `compileSceneSkinGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:46` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `update` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:83` | Self: 0.7% (15.5ms) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:10` | Self: 0.6% (15.2ms) | Total: 0.6% (15.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:86` | Self: 0.6% (15.2ms) | Total: 2.2% (48.4ms) | Samples: 1

**Called by:**
- `query` (8)

**Calls:**
- `point` (3)
- `point` (2)
- `point` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` | Self: 0.6% (15.2ms) | Total: 0.6% (15.2ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:35` | Self: 0.6% (15.1ms) | Total: 0.6% (15.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `prepareSceneSkinDraw`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:46` | Self: 0.6% (15.1ms) | Total: 0.6% (15.1ms) | Samples: 1

**Called by:**
- `SceneSkinResource` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 4

**Called by:**
- `graph` (2)
- `graph` (1)
- `point` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.6% (15.0ms) | Total: 1.3% (29.1ms) | Samples: 2

**Called by:**
- `map` (3)

**Calls:**
- `copyDataProperties` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:95` | Self: 0.6% (14.9ms) | Total: 0.6% (14.9ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 0.6% (14.8ms) | Total: 0.6% (14.8ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:124` | Self: 0.6% (14.7ms) | Total: 0.6% (14.7ms) | Samples: 1

**Called by:**
- `sample` (1)

### `flatIntoArray`
`[native code]` | Self: 0.6% (14.6ms) | Total: 0.6% (14.6ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `hypot`
`[native code]` | Self: 0.6% (14.6ms) | Total: 0.6% (14.6ms) | Samples: 1

**Called by:**
- `graph` (1)

### `clip`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts:23` | Self: 0.6% (14.4ms) | Total: 0.6% (14.4ms) | Samples: 1

**Called by:**
- `paintPointerPath` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 0.6% (14.4ms) | Total: 0.6% (14.4ms) | Samples: 1

**Called by:**
- `point` (1)

### `(anonymous)`
`node:zlib:438` | Self: 0.6% (14.1ms) | Total: 0.6% (14.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `copyDataProperties`
`[native code]` | Self: 0.6% (14.1ms) | Total: 0.6% (14.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:62` | Self: 0.6% (13.9ms) | Total: 0.6% (13.9ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:30` | Self: 0.6% (13.9ms) | Total: 0.6% (13.9ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` | Self: 0.6% (13.8ms) | Total: 1.3% (29.3ms) | Samples: 1

**Called by:**
- `graph` (3)

**Calls:**
- `transformPoint` (1)
- `transformPoint` (1)

### `hasOwn`
`[native code]` | Self: 0.6% (13.7ms) | Total: 0.6% (13.7ms) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `randomUUID`
`[native code]` | Self: 0.6% (13.7ms) | Total: 0.6% (13.7ms) | Samples: 1

**Called by:**
- `createModelAsset` (1)

### `invert`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6361` | Self: 0.6% (13.5ms) | Total: 0.6% (13.5ms) | Samples: 1

**Called by:**
- `getNormalMatrix` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 0.5% (13.0ms) | Total: 0.5% (13.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts` | Self: 0.5% (12.8ms) | Total: 0.5% (12.8ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.5% (12.8ms) | Total: 0.5% (12.8ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `fromEntries`
`[native code]` | Self: 0.5% (12.7ms) | Total: 0.5% (12.7ms) | Samples: 1

**Called by:**
- `result` (1)

### `add`
`[native code]` | Self: 0.5% (12.6ms) | Total: 0.5% (12.6ms) | Samples: 1

**Called by:**
- `cacheSatisfyAndReturn` (1)

### `compose`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.5% (11.7ms) | Total: 0.5% (11.7ms) | Samples: 1

**Called by:**
- `updateMatrix` (1)

### `set`
`[native code]` | Self: 0.3% (7.3ms) | Total: 0.3% (7.3ms) | Samples: 1

**Called by:**
- `graph` (1)

### `makeSafe`
`internal:primordials` | Self: 0.1% (3.0ms) | Total: 0.1% (3.0ms) | Samples: 1

**Called by:**
- `internal:primordials` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` | Self: 0.1% (2.8ms) | Total: 0.1% (2.8ms) | Samples: 3

**Called by:**
- `graph` (2)
- `graph` (1)

### `get`
`[native code]` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `graph` (2)

### `hideFromStack`
`internal:shared` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `internal:validators` (2)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.0% (1.9ms) | Total: 0.1% (2.9ms) | Samples: 2

**Called by:**
- `paintSceneSkinWeight` (2)
- `(anonymous)` (1)

**Calls:**
- `/^[A-Za-z0-9_:-]+$/` (1)

### `intersectTriangle`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22643` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `checkIntersection$1` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:25` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 2

**Called by:**
- `flatIntoArrayWithCallback` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `animatedScene` (1)

### `transformPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:186` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `point` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `getMaxScaleOnAxis`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10617` | Self: 0.0% (995us) | Total: 0.0% (995us) | Samples: 1

**Called by:**
- `applyMatrix4` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (994us) | Total: 4.4% (97.8ms) | Samples: 1

**Called by:**
- `sample` (9)
- `patchSceneSkinWeights` (5)
- `triangulateFace` (2)

**Calls:**
- `(anonymous)` (8)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `flatIntoArray` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` | Self: 0.0% (994us) | Total: 0.0% (994us) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (991us) | Total: 0.0% (991us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `transformDirection`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5315` | Self: 0.0% (989us) | Total: 0.0% (989us) | Samples: 1

**Called by:**
- `applyMatrix4` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` | Self: 0.0% (986us) | Total: 0.0% (986us) | Samples: 1

**Called by:**
- `map` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:49` | Self: 0.0% (976us) | Total: 0.0% (976us) | Samples: 1

**Called by:**
- `update` (1)

### `/^[A-Za-z0-9_:-]+$/`
`[native code]` | Self: 0.0% (963us) | Total: 0.0% (963us) | Samples: 1

**Called by:**
- `id` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:92` | Self: 0.0% (960us) | Total: 0.0% (960us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (958us) | Total: 0.0% (958us) | Samples: 1

**Called by:**
- `(module)` (1)

### `compileSceneSkinGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:44` | Self: 0.0% (956us) | Total: 0.0% (956us) | Samples: 1

**Called by:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (944us) | Total: 0.0% (944us) | Samples: 1

**Called by:**
- `map` (1)

### `paintSceneSkinWeight`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:25` | Self: 0.0% (935us) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `map` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:41` | Self: 0.0% (916us) | Total: 0.0% (916us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` | Self: 0.0% (915us) | Total: 0.7% (15.5ms) | Samples: 1

**Called by:**
- `query` (2)

**Calls:**
- `hypot` (1)

### `getY`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17120` | Self: 0.0% (913us) | Total: 0.0% (913us) | Samples: 1

**Called by:**
- `fromBufferAttribute` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` | Self: 0.0% (902us) | Total: 0.0% (902us) | Samples: 1

**Called by:**
- `(module)` (1)

### `map`
`[native code]` | Self: 0.0% (896us) | Total: 13.9% (305.6ms) | Samples: 1

**Called by:**
- `readSceneDocumentStructure` (7)
- `readSceneGeometry` (6)
- `(anonymous)` (3)
- `sample` (2)
- `triangulateFace` (1)
- `readSceneSkinInfluences` (1)
- `(anonymous)` (1)
- `readNormalizedSceneSkinInfluences` (1)
- `buildSceneGeometry` (1)
- `(anonymous)` (1)
- `buildSceneGeometry` (1)
- `readPatch` (1)
- `paintSceneSkinWeight` (1)
- `(anonymous)` (1)
- `paintSceneSkinWeight` (1)
- `(anonymous)` (1)
- `readSceneSkins` (1)
- `readSceneGeometry` (1)
- `node:zlib` (1)

**Calls:**
- `readSceneGeometry` (6)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readSceneGeometry` (1)
- `(anonymous)` (1)

### `affineDeterminant`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:181` | Self: 0.0% (894us) | Total: 0.0% (894us) | Samples: 1

**Called by:**
- `orientation` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:91` | Self: 0.0% (886us) | Total: 0.0% (886us) | Samples: 1

**Called by:**
- `query` (1)

### `Agent`
`node:_http_agent:12` | Self: 0.0% (885us) | Total: 0.0% (885us) | Samples: 1

**Called by:**
- `node:_http_agent` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:126` | Self: 0.0% (885us) | Total: 2.2% (48.5ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (8)

**Calls:**
- `paintSceneSkinWeight` (2)
- `paintSceneSkinWeight` (2)
- `paintSceneSkinWeight` (2)
- `paintSceneSkinWeight` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:24` | Self: 0.0% (882us) | Total: 0.7% (16.9ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (2)

**Calls:**
- `readNormalizedSceneSkinInfluences` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` | Self: 0.0% (877us) | Total: 0.0% (877us) | Samples: 1

**Called by:**
- `from` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` | Self: 0.0% (872us) | Total: 0.0% (872us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `_onChangeCallback`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (864us) | Total: 0.0% (864us) | Samples: 1

**Called by:**
- `setFromRotationMatrix` (1)

### `find`
`[native code]` | Self: 0.0% (853us) | Total: 0.0% (853us) | Samples: 1

**Called by:**
- `sample` (1)

### `pop`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` | Self: 0.0% (845us) | Total: 0.0% (845us) | Samples: 1

**Called by:**
- `query` (1)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:125` | Self: 0.0% (842us) | Total: 0.0% (842us) | Samples: 1

**Called by:**
- `sample` (1)

### `number`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (829us) | Total: 0.0% (829us) | Samples: 1

**Called by:**
- `readSceneDocumentStructure` (1)

### `intersectObjects`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:55887` | Self: 0.0% (0us) | Total: 38.1% (836.6ms) | Samples: 0

**Called by:**
- `sceneSurfaceHit` (120)

**Calls:**
- `intersect` (120)

### `applyMatrix4`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22719` | Self: 0.0% (0us) | Total: 0.0% (989us) | Samples: 0

**Called by:**
- `raycast` (1)

**Calls:**
- `transformDirection` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6071` | Self: 0.0% (0us) | Total: 0.0% (958us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `internal:streams/add-abort-signal`
`internal:streams/add-abort-signal:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:100` | Self: 0.0% (0us) | Total: 0.7% (16.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `point` (1)
- `point` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:119` | Self: 0.0% (0us) | Total: 0.6% (14.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `generatorResume` (1)

### `paintSceneSkinWeight`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:17` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `id` (2)

### `paintPointerPath`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts:59` | Self: 0.0% (0us) | Total: 0.6% (14.4ms) | Samples: 0

**Called by:**
- `generatorResume` (1)

**Calls:**
- `clip` (1)

### `readSceneSkinBindings`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:16` | Self: 0.0% (0us) | Total: 0.6% (13.7ms) | Samples: 0

**Called by:**
- `bindSceneSkin` (1)

**Calls:**
- `indexSceneDocument` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:139` | Self: 0.0% (0us) | Total: 0.5% (12.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `deepEquals` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:109` | Self: 0.0% (0us) | Total: 0.6% (14.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `pickSceneSkinPaint` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:29` | Self: 0.0% (0us) | Total: 0.0% (867us) | Samples: 0

**Called by:**
- `graph` (1)

**Calls:**
- `entries` (1)

### `internal:validators`
`internal:validators:47` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `hideFromStack` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:64` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.0% (0us) | Total: 0.0% (896us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:102` | Self: 0.0% (0us) | Total: 0.7% (16.2ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `point` (2)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` | Self: 0.0% (0us) | Total: 2.7% (59.9ms) | Samples: 0

**Called by:**
- `readSceneDocument` (7)

**Calls:**
- `map` (7)

### `node:http`
`node:http:2` | Self: 0.0% (0us) | Total: 0.8% (18.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `anonymous` (4)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `updateWorldMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12910` | Self: 0.0% (0us) | Total: 0.5% (11.7ms) | Samples: 0

**Called by:**
- `updateWorldMatrix` (1)

**Calls:**
- `updateMatrix` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.0% (896us) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `map` (1)

### `readSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:9` | Self: 0.0% (0us) | Total: 0.6% (15.2ms) | Samples: 0

**Called by:**
- `readNormalizedSceneSkinInfluences` (1)

**Calls:**
- `map` (1)

### `makeSceneSkinFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneSkin.ts:5` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `makeSceneGlbFixture` (3)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:92` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `query` (2)

**Calls:**
- `get` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:44` | Self: 0.0% (0us) | Total: 2.7% (59.5ms) | Samples: 0

**Called by:**
- `evaluate` (6)

**Calls:**
- `finishSceneCommand` (3)
- `createSceneSkin` (2)
- `createSceneSkin` (1)

### `updateWorldMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:45715` | Self: 0.0% (0us) | Total: 0.5% (11.7ms) | Samples: 0

**Called by:**
- `sceneSurfaceHit` (1)

**Calls:**
- `updateWorldMatrix` (1)

### `raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23250` | Self: 0.0% (0us) | Total: 38.0% (834.6ms) | Samples: 0

**Called by:**
- `intersect` (118)

**Calls:**
- `_computeIntersections` (118)

### `pickSceneSkinPaint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:19` | Self: 0.0% (0us) | Total: 38.7% (849.2ms) | Samples: 0

**Called by:**
- `(module)` (121)
- `(module)` (1)

**Calls:**
- `sceneSurfaceHit` (120)
- `sceneSurfaceHit` (2)

### `result`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:151` | Self: 0.0% (0us) | Total: 0.5% (12.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `fromEntries` (1)

### `createSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:38` | Self: 0.0% (0us) | Total: 0.6% (13.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sceneCommandSelection` (1)

### `updateWorldMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:45719` | Self: 0.0% (0us) | Total: 0.0% (864us) | Samples: 0

**Called by:**
- `sceneSurfaceHit` (1)

**Calls:**
- `decompose` (1)

### `getVertexPosition`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23165` | Self: 0.0% (0us) | Total: 0.0% (913us) | Samples: 0

**Called by:**
- `checkGeometryIntersection` (1)

**Calls:**
- `fromBufferAttribute` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `commit` (1)
- `finishSceneCommand` (1)

**Calls:**
- `prepareSceneBounds` (1)
- `prepareSceneBounds` (1)

### `makeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\fixtures.ts:31` | Self: 0.0% (0us) | Total: 0.6% (13.7ms) | Samples: 0

**Called by:**
- `animatedScene` (1)

**Calls:**
- `createModelAsset` (1)

### `node:crypto`
`node:crypto:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/transform`
`internal:streams/transform:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 0.8% (18.1ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `triangleUnitNormal` (2)
- `triangleUnitNormal` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:81` | Self: 0.0% (0us) | Total: 6.7% (147.7ms) | Samples: 0

**Called by:**
- `query` (17)

**Calls:**
- `indexMeshEdges` (6)
- `indexMeshEdges` (4)
- `indexMeshEdges` (3)
- `indexMeshEdges` (3)
- `indexMeshEdges` (1)

### `patchSceneSkinWeights`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:38` | Self: 0.0% (0us) | Total: 0.7% (17.5ms) | Samples: 0

**Called by:**
- `commit` (5)

**Calls:**
- `cloneObject` (5)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 2.1% (46.1ms) | Samples: 0

**Called by:**
- `update` (8)

**Calls:**
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `readSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:29` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `readSceneSkinBindings` (1)

**Calls:**
- `map` (1)

### `commit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:175` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `sceneBounds` (1)
- `sceneBounds` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` | Self: 0.0% (0us) | Total: 2.0% (45.3ms) | Samples: 0

**Called by:**
- `createSceneSkinPaintStroke` (4)

**Calls:**
- `indexSceneSkins` (2)
- `indexSceneSkins` (1)
- `indexSceneSkins` (1)

### `createSceneSkinPaintStroke`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:45` | Self: 0.0% (0us) | Total: 4.2% (92.4ms) | Samples: 0

**Called by:**
- `(module)` (10)

**Calls:**
- `indexSceneDocument` (4)
- `indexSceneDocument` (4)
- `indexSceneDocument` (2)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:55911` | Self: 0.0% (0us) | Total: 38.1% (836.6ms) | Samples: 0

**Called by:**
- `intersectObjects` (120)

**Calls:**
- `raycast` (118)
- `raycast` (1)
- `raycast` (1)

### `finishSceneCommand`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:74` | Self: 0.0% (0us) | Total: 0.7% (16.6ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `indexSceneDocument` (2)
- `sceneBounds` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:126` | Self: 0.0% (0us) | Total: 0.5% (12.7ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `result` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:123` | Self: 0.0% (0us) | Total: 4.3% (95.6ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `sample` (7)
- `sample` (5)
- `sample` (2)
- `sample` (1)
- `sample` (1)

### `createSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:60` | Self: 0.0% (0us) | Total: 1.3% (29.5ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `bindSceneSkin` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:34` | Self: 0.0% (0us) | Total: 0.6% (15.1ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:43` | Self: 0.0% (0us) | Total: 3.4% (75.8ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `readSceneDocument` (7)
- `readSceneDocument` (2)

### `node:_http_agent`
`node:_http_agent:236` | Self: 0.0% (0us) | Total: 0.0% (885us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `Agent` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (991us) | Samples: 0

**Calls:**
- `requestInstantiate` (1)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:118` | Self: 0.0% (0us) | Total: 12.9% (284.3ms) | Samples: 0

**Called by:**
- `sample` (39)

**Calls:**
- `graph` (17)
- `graph` (8)
- `graph` (3)
- `graph` (3)
- `graph` (2)
- `graph` (2)
- `graph` (2)
- `graph` (1)
- `graph` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:64` | Self: 0.0% (0us) | Total: 0.4% (8.9ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `indexSceneDocument` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 8.9% (196.2ms) | Samples: 0

**Calls:**
- `parseModule` (22)
- `resolve` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:111` | Self: 0.0% (0us) | Total: 14.4% (316.3ms) | Samples: 0

**Called by:**
- `evaluate` (43)

**Calls:**
- `sample` (40)
- `sample` (2)
- `sample` (1)

### `applyMatrix4`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17972` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `raycast` (1)

**Calls:**
- `getMaxScaleOnAxis` (1)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `makeSceneSkinFixture` (3)

**Calls:**
- `animatedScene` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:121` | Self: 0.0% (0us) | Total: 38.6% (848.7ms) | Samples: 0

**Called by:**
- `evaluate` (122)

**Calls:**
- `pickSceneSkinPaint` (121)
- `pickSceneSkinPaint` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 0.7% (15.6ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `every` (1)

### `internal:streams/readable`
`internal:streams/readable:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:http`
`internal:http:14` | Self: 0.0% (0us) | Total: 0.7% (16.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `@lazy` (2)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:57` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `push` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:39` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `makeSceneSkinFixture` (3)

### `fromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5986` | Self: 0.0% (0us) | Total: 0.0% (913us) | Samples: 0

**Called by:**
- `getVertexPosition` (1)

**Calls:**
- `getY` (1)

### `patchSceneSkinWeights`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:18` | Self: 0.0% (0us) | Total: 1.4% (32.5ms) | Samples: 0

**Called by:**
- `commit` (5)

**Calls:**
- `flatIntoArrayWithCallback` (5)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:127` | Self: 0.0% (0us) | Total: 3.0% (67.3ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `commit` (11)
- `commit` (2)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 1.4% (30.9ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (2)

**Calls:**
- `link` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:66` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `readNormalizedSceneSkinInfluences` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:373` | Self: 0.0% (0us) | Total: 0.7% (16.5ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `compileSceneSkinGeometry` (1)
- `compileSceneSkinGeometry` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (0us) | Total: 0.7% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (2)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 11.7% (258.8ms) | Samples: 0

**Called by:**
- `link` (15)
- `linkAndEvaluateModule` (2)

**Calls:**
- `link` (15)
- `moduleDeclarationInstantiation` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:372` | Self: 0.0% (0us) | Total: 1.4% (30.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `SceneSkinResource` (3)

### `checkGeometryIntersection`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23428` | Self: 0.0% (0us) | Total: 35.8% (785.9ms) | Samples: 0

**Called by:**
- `_computeIntersections` (110)

**Calls:**
- `checkIntersection$1` (110)

### `node:_http_agent`
`node:_http_agent:2` | Self: 0.0% (0us) | Total: 0.7% (16.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:114` | Self: 0.0% (0us) | Total: 2.2% (49.5ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `(module)` (2)

**Calls:**
- `flatIntoArrayWithCallback` (9)

### `checkGeometryIntersection`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23424` | Self: 0.0% (0us) | Total: 0.0% (913us) | Samples: 0

**Called by:**
- `_computeIntersections` (1)

**Calls:**
- `getVertexPosition` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` | Self: 0.0% (0us) | Total: 0.0% (894us) | Samples: 0

**Called by:**
- `commit` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `pickSceneSkinPaint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:41` | Self: 0.0% (0us) | Total: 0.6% (13.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `getNormalMatrix` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `ws`
`ws:3` | Self: 0.0% (0us) | Total: 0.8% (18.1ms) | Samples: 0

**Called by:**
- `parseModule` (4)

**Calls:**
- `anonymous` (4)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:101` | Self: 0.0% (0us) | Total: 0.7% (16.2ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `map` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:268` | Self: 0.0% (0us) | Total: 7.0% (154.9ms) | Samples: 0

**Called by:**
- `(module)` (18)

**Calls:**
- `buildSceneGeometry` (8)
- `buildSceneGeometry` (3)
- `buildSceneGeometry` (2)
- `buildSceneGeometry` (1)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:100` | Self: 0.0% (0us) | Total: 15.0% (329.5ms) | Samples: 0

**Called by:**
- `(module)` (40)
- `(module)` (5)

**Calls:**
- `query` (39)
- `query` (3)
- `query` (1)
- `query` (1)
- `query` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.94s) | Samples: 0

**Called by:**
- `moduleEvaluation` (271)
- `async loadAndEvaluateModule` (267)

**Calls:**
- `moduleEvaluation` (271)
- `evaluate` (267)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:137` | Self: 0.0% (0us) | Total: 0.0% (853us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `find` (1)

### `raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23221` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `intersect` (1)

**Calls:**
- `applyMatrix4` (1)

### `setFromRotationMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:4323` | Self: 0.0% (0us) | Total: 0.0% (864us) | Samples: 0

**Called by:**
- `decompose` (1)

**Calls:**
- `_onChangeCallback` (1)

### `at`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22179` | Self: 0.0% (0us) | Total: 9.1% (201.0ms) | Samples: 0

**Called by:**
- `intersectTriangle` (29)

**Calls:**
- `copy` (29)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:103` | Self: 0.0% (0us) | Total: 4.2% (92.4ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `createSceneSkinPaintStroke` (10)

### `createModelAsset`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\model.ts:223` | Self: 0.0% (0us) | Total: 0.6% (13.7ms) | Samples: 0

**Called by:**
- `makeModel` (1)

**Calls:**
- `randomUUID` (1)

### `cacheSatisfyAndReturn`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (12.6ms) | Samples: 0

**Calls:**
- `add` (1)

### `readNormalizedSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:7` | Self: 0.0% (0us) | Total: 2.8% (62.7ms) | Samples: 0

**Called by:**
- `paintSceneSkinWeight` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `readSceneSkinInfluences` (2)
- `readSceneSkinInfluences` (1)
- `map` (1)

### `paintSceneSkinWeight`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:19` | Self: 0.0% (0us) | Total: 1.4% (30.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `readNormalizedSceneSkinInfluences` (2)

### `raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23238` | Self: 0.0% (0us) | Total: 0.0% (989us) | Samples: 0

**Called by:**
- `intersect` (1)

**Calls:**
- `applyMatrix4` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` | Self: 0.0% (0us) | Total: 0.0% (829us) | Samples: 0

**Called by:**
- `animatedScene` (1)

**Calls:**
- `readSceneDocument` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `paintSceneSkinWeight`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:28` | Self: 0.0% (0us) | Total: 0.5% (12.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:137` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:46` | Self: 0.0% (0us) | Total: 0.6% (15.2ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `map` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 2.0% (44.2ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:21` | Self: 0.0% (0us) | Total: 0.0% (894us) | Samples: 0

**Called by:**
- `evaluateSceneInstances` (1)

**Calls:**
- `affineDeterminant` (1)

### `SceneSkinResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSkinResource.ts:42` | Self: 0.0% (0us) | Total: 1.4% (30.8ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `prepareSceneSkinDraw` (2)
- `prepareSceneSkinDraw` (1)

### `internal:primordials`
`internal:primordials:71` | Self: 0.0% (0us) | Total: 0.1% (3.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `makeSafe` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 2.7% (60.7ms) | Samples: 0

**Called by:**
- `(module)` (7)
- `migrateLegacyModel` (1)

**Calls:**
- `readSceneDocumentStructure` (7)
- `readSceneDocumentStructure` (1)

### `generatorResume`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (14.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `paintPointerPath` (1)

### `intersectTriangle`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22706` | Self: 0.0% (0us) | Total: 9.1% (201.0ms) | Samples: 0

**Called by:**
- `checkIntersection$1` (29)

**Calls:**
- `at` (29)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:63` | Self: 0.0% (0us) | Total: 2.9% (65.6ms) | Samples: 0

**Called by:**
- `evaluate` (9)

**Calls:**
- `structuredClone` (9)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 90.4% (1.98s) | Samples: 0

**Calls:**
- `moduleEvaluation` (267)
- `linkAndEvaluateModule` (2)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:80` | Self: 0.0% (0us) | Total: 0.0% (877us) | Samples: 0

**Called by:**
- `query` (1)

**Calls:**
- `from` (1)

### `node:zlib`
`node:zlib:438` | Self: 0.0% (0us) | Total: 0.6% (14.1ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `map` (1)

### `bindSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:51` | Self: 0.0% (0us) | Total: 1.3% (29.5ms) | Samples: 0

**Called by:**
- `createSceneSkin` (2)

**Calls:**
- `readSceneSkinBindings` (1)
- `readSceneSkinBindings` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:148` | Self: 0.0% (0us) | Total: 0.8% (17.9ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `deepEquals` (4)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (16.9ms) | Samples: 0

**Called by:**
- `readSceneSkinInfluences` (1)
- `graph` (1)

**Calls:**
- `arrayFromFastWithoutMapFn` (1)
- `(anonymous)` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:333` | Self: 0.0% (0us) | Total: 0.0% (829us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `number` (1)

### `sceneSurfaceHit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:34` | Self: 0.0% (0us) | Total: 38.1% (836.6ms) | Samples: 0

**Called by:**
- `pickSceneSkinPaint` (120)

**Calls:**
- `intersectObjects` (120)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.0% (894us) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `orientation` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `map` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:83` | Self: 0.0% (0us) | Total: 9.2% (202.3ms) | Samples: 0

**Called by:**
- `evaluate` (23)

**Calls:**
- `update` (18)
- `update` (3)
- `update` (2)

### `getNormalMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6394` | Self: 0.0% (0us) | Total: 0.6% (13.5ms) | Samples: 0

**Called by:**
- `pickSceneSkinPaint` (1)

**Calls:**
- `invert` (1)

### `decompose`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:10921` | Self: 0.0% (0us) | Total: 0.0% (864us) | Samples: 0

**Called by:**
- `updateWorldMatrix` (1)

**Calls:**
- `setFromRotationMatrix` (1)

### `readPatch`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `commit` (1)

**Calls:**
- `map` (1)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` | Self: 0.0% (0us) | Total: 0.6% (13.3ms) | Samples: 0

**Called by:**
- `createSceneSkin` (1)

**Calls:**
- `indexSceneDocument` (1)

### `readSceneSkinBindings`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:15` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `bindSceneSkin` (1)

**Calls:**
- `readSceneSkins` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` | Self: 0.0% (0us) | Total: 1.4% (30.8ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `cloneObject` (1)
- `map` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:35` | Self: 0.0% (0us) | Total: 1.2% (27.0ms) | Samples: 0

**Called by:**
- `graph` (4)

**Calls:**
- `stringify` (4)

### `commit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:162` | Self: 0.0% (0us) | Total: 2.9% (65.4ms) | Samples: 0

**Called by:**
- `(module)` (11)

**Calls:**
- `patchSceneSkinWeights` (5)
- `patchSceneSkinWeights` (5)
- `readPatch` (1)

### `updateMatrix`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12823` | Self: 0.0% (0us) | Total: 0.5% (11.7ms) | Samples: 0

**Called by:**
- `updateWorldMatrix` (1)

**Calls:**
- `compose` (1)

### `sceneSurfaceHit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:24` | Self: 0.0% (0us) | Total: 0.5% (12.6ms) | Samples: 0

**Called by:**
- `pickSceneSkinPaint` (2)

**Calls:**
- `updateWorldMatrix` (1)
- `updateWorldMatrix` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:141` | Self: 0.0% (0us) | Total: 0.0% (944us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:85` | Self: 0.0% (0us) | Total: 0.6% (13.9ms) | Samples: 0

**Called by:**
- `query` (3)

**Calls:**
- `point` (1)
- `point` (1)
- `point` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:138` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `entries` (2)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:159` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `internal:streams/lazy_transform`
`internal:streams/lazy_transform:2` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:119` | Self: 0.0% (0us) | Total: 0.0% (845us) | Samples: 0

**Called by:**
- `sample` (1)

**Calls:**
- `pop` (1)

### `animatedScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` | Self: 0.0% (0us) | Total: 0.7% (15.5ms) | Samples: 0

**Called by:**
- `makeSceneGlbFixture` (3)

**Calls:**
- `migrateLegacyModel` (1)
- `makeModel` (1)
- `migrateLegacyModel` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 39.3% | 863.7ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 24.4% | 536.6ms | `[native code]` |
| 7.2% | 158.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 5.4% | 119.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 4.6% | 101.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 2.7% | 59.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 2.1% | 46.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts` |
| 2.0% | 45.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts` |
| 1.9% | 43.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 1.4% | 30.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts` |
| 1.3% | 30.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.8% | 18.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.7% | 17.3ms | `node:url` |
| 0.7% | 16.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts` |
| 0.7% | 16.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts` |
| 0.7% | 16.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts` |
| 0.7% | 16.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 0.6% | 14.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts` |
| 0.6% | 14.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\paintPointerPath.ts` |
| 0.6% | 14.1ms | `node:zlib` |
| 0.1% | 3.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.1% | 3.0ms | `internal:primordials` |
| 0.0% | 2.0ms | `internal:shared` |
| 0.0% | 2.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.0% | 1.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
| 0.0% | 885us | `node:_http_agent` |
