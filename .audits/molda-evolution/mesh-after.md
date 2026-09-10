# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.01s | 265 | 1.0ms | 224 |

**Top 10:** `overlappingVertices` 11.3%, `get` 8.6%, `entries` 5.4%, `meshSurfaceEdges` 5.3%, `Set` 4.8%, `meshSurfaceEdges` 4.0%, `sort` 3.1%, `roundMesh` 3.0%, `normalizeMesh` 2.9%, `map` 2.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 11.3% | 227.7ms | 17.8% | 359.1ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:26` |
| 8.6% | 174.8ms | 8.6% | 174.8ms | `get` | `[native code]` |
| 5.4% | 109.0ms | 5.4% | 109.0ms | `entries` | `[native code]` |
| 5.3% | 106.8ms | 5.3% | 106.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 4.8% | 96.9ms | 4.8% | 96.9ms | `Set` | `[native code]` |
| 4.0% | 80.6ms | 4.0% | 80.6ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 3.1% | 62.9ms | 3.1% | 62.9ms | `sort` | `[native code]` |
| 3.0% | 60.6ms | 3.0% | 60.6ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` |
| 2.9% | 59.1ms | 2.9% | 59.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` |
| 2.2% | 46.1ms | 3.8% | 78.5ms | `map` | `[native code]` |
| 2.2% | 45.1ms | 2.2% | 45.1ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 1.9% | 39.4ms | 1.9% | 39.4ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.6% | 32.6ms | 1.6% | 32.6ms | `hypot` | `[native code]` |
| 1.5% | 30.6ms | 3.9% | 80.1ms | `filter` | `[native code]` |
| 1.5% | 30.3ms | 1.5% | 30.3ms | `indexOf` | `[native code]` |
| 1.3% | 28.1ms | 1.3% | 28.1ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:121` |
| 1.3% | 26.5ms | 1.3% | 26.5ms | `scale` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:34` |
| 1.1% | 23.1ms | 1.9% | 39.5ms | `parseModule` | `[native code]` |
| 0.9% | 18.8ms | 0.9% | 18.8ms | `structuredClone` | `[native code]` |
| 0.9% | 18.5ms | 0.9% | 18.5ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 0.8% | 17.8ms | 0.8% | 17.8ms | `add` | `[native code]` |
| 0.8% | 17.4ms | 0.8% | 17.4ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 0.8% | 17.3ms | 0.9% | 19.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` |
| 0.8% | 16.9ms | 0.8% | 16.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 0.8% | 16.4ms | 0.8% | 17.4ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` |
| 0.8% | 16.4ms | 2.3% | 46.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `has` | `[native code]` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `cloneObject` | `[native code]` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:90` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:94` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `vec3` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:207` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `checkBox` | `internal:util/inspect` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `pointKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:89` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:36` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `max` | `[native code]` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `pairKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `isArray` | `[native code]` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:480` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `normalizeBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:245` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.7% | 15.0ms | 1.5% | 31.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` |
| 0.7% | 14.7ms | 0.7% | 14.7ms | `resolve` | `[native code]` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `meshTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` |
| 0.7% | 14.5ms | 0.7% | 14.5ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:22` |
| 0.7% | 14.4ms | 1.6% | 32.6ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 0.7% | 14.4ms | 0.7% | 14.4ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:13` |
| 0.6% | 14.0ms | 1.5% | 31.4ms | `faceCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` |
| 0.6% | 14.0ms | 0.6% | 14.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.6% | 13.7ms | 3.6% | 74.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` |
| 0.6% | 13.6ms | 0.6% | 13.6ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18881` |
| 0.6% | 13.2ms | 0.6% | 13.2ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` |
| 0.6% | 13.1ms | 0.6% | 13.1ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.6% | 12.3ms | 1.4% | 30.2ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:279` |
| 0.5% | 11.9ms | 0.5% | 11.9ms | `values` | `[native code]` |
| 0.5% | 10.2ms | 0.5% | 10.2ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` |
| 0.3% | 7.3ms | 0.3% | 7.3ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` |
| 0.1% | 2.8ms | 0.1% | 2.8ms | `keys` | `[native code]` |
| 0.1% | 2.7ms | 2.4% | 49.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `newRegistryEntry` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `faceUvToPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `planarFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:50` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pruneMeshSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:67` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `min` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` |
| 0.0% | 988us | 0.0% | 988us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` |
| 0.0% | 986us | 2.3% | 46.6ms | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` |
| 0.0% | 976us | 0.0% | 976us | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:118` |
| 0.0% | 972us | 0.0% | 972us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:154` |
| 0.0% | 965us | 0.0% | 965us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:463` |
| 0.0% | 946us | 0.0% | 946us | `normalizeBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:251` |
| 0.0% | 933us | 0.0% | 933us | `(anonymous)` | `internal:util/inspect` |
| 0.0% | 926us | 0.0% | 1.9ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` |
| 0.0% | 910us | 0.0% | 910us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` |
| 0.0% | 896us | 0.0% | 896us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.0% | 896us | 0.0% | 896us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:395` |
| 0.0% | 888us | 0.0% | 888us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 888us | 0.8% | 17.2ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:224` |
| 0.0% | 868us | 0.0% | 868us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:455` |
| 0.0% | 865us | 0.0% | 865us | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.0% | 861us | 0.0% | 861us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` |
| 0.0% | 860us | 0.8% | 16.3ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.0% | 848us | 0.0% | 848us | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 840us | 0.0% | 840us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.88s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 98.7% | 1.98s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 98.7% | 1.98s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 97.4% | 1.96s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 96.4% | 1.94s | 0.0% | 0us | `evaluate` | `[native code]` |
| 76.4% | 1.54s | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` |
| 27.8% | 560.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` |
| 26.1% | 526.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` |
| 20.8% | 419.6ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` |
| 19.9% | 402.0ms | 0.0% | 0us | `withMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` |
| 19.3% | 389.1ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:445` |
| 17.8% | 359.1ms | 11.3% | 227.7ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:26` |
| 16.8% | 339.1ms | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` |
| 15.5% | 312.5ms | 0.0% | 0us | `sanitizeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` |
| 14.8% | 300.0ms | 0.0% | 0us | `finishCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` |
| 14.8% | 300.0ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` |
| 14.6% | 294.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` |
| 13.9% | 280.5ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` |
| 12.4% | 251.7ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` |
| 10.7% | 216.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` |
| 8.6% | 174.8ms | 8.6% | 174.8ms | `get` | `[native code]` |
| 6.5% | 132.3ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` |
| 6.1% | 124.8ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` |
| 5.9% | 119.6ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` |
| 5.4% | 109.0ms | 5.4% | 109.0ms | `entries` | `[native code]` |
| 5.3% | 106.8ms | 5.3% | 106.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 4.8% | 96.9ms | 4.8% | 96.9ms | `Set` | `[native code]` |
| 4.6% | 92.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` |
| 4.5% | 91.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` |
| 4.4% | 89.7ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` |
| 4.0% | 80.6ms | 4.0% | 80.6ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 3.9% | 80.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` |
| 3.9% | 80.1ms | 1.5% | 30.6ms | `filter` | `[native code]` |
| 3.9% | 79.5ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` |
| 3.8% | 78.5ms | 2.2% | 46.1ms | `map` | `[native code]` |
| 3.8% | 77.2ms | 0.0% | 0us | `pruneMeshSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` |
| 3.8% | 77.2ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` |
| 3.6% | 74.0ms | 0.6% | 13.7ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` |
| 3.1% | 62.9ms | 3.1% | 62.9ms | `sort` | `[native code]` |
| 3.0% | 60.6ms | 3.0% | 60.6ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` |
| 3.0% | 60.6ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 2.9% | 60.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` |
| 2.9% | 60.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` |
| 2.9% | 59.1ms | 2.9% | 59.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` |
| 2.9% | 59.0ms | 0.0% | 0us | `buildBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` |
| 2.9% | 59.0ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` |
| 2.9% | 58.5ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` |
| 2.7% | 56.2ms | 0.0% | 0us | `link` | `[native code]` |
| 2.6% | 54.2ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 2.4% | 49.9ms | 0.1% | 2.7ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` |
| 2.3% | 47.0ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` |
| 2.3% | 46.7ms | 0.8% | 16.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 2.3% | 46.6ms | 0.0% | 986us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` |
| 2.2% | 45.1ms | 2.2% | 45.1ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 2.1% | 44.2ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` |
| 2.0% | 40.3ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` |
| 1.9% | 39.5ms | 1.1% | 23.1ms | `parseModule` | `[native code]` |
| 1.9% | 39.4ms | 1.9% | 39.4ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.6% | 33.3ms | 0.0% | 0us | `readMoldaDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` |
| 1.6% | 33.3ms | 0.0% | 0us | `assetFromJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` |
| 1.6% | 32.9ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` |
| 1.6% | 32.8ms | 0.0% | 0us | `anonymous` | `[native code]` |
| 1.6% | 32.8ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` |
| 1.6% | 32.6ms | 0.7% | 14.4ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 1.6% | 32.6ms | 1.6% | 32.6ms | `hypot` | `[native code]` |
| 1.5% | 31.6ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` |
| 1.5% | 31.4ms | 0.6% | 14.0ms | `faceCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` |
| 1.5% | 31.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` |
| 1.5% | 31.3ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` |
| 1.5% | 31.3ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 1.5% | 31.3ms | 0.7% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` |
| 1.5% | 31.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` |
| 1.5% | 30.5ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:226` |
| 1.5% | 30.3ms | 1.5% | 30.3ms | `indexOf` | `[native code]` |
| 1.5% | 30.2ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:463` |
| 1.4% | 30.2ms | 0.6% | 12.3ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:279` |
| 1.4% | 29.1ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:218` |
| 1.3% | 28.1ms | 1.3% | 28.1ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:121` |
| 1.3% | 26.5ms | 1.3% | 26.5ms | `scale` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:34` |
| 0.9% | 19.1ms | 0.8% | 17.3ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` |
| 0.9% | 18.8ms | 0.9% | 18.8ms | `structuredClone` | `[native code]` |
| 0.9% | 18.5ms | 0.9% | 18.5ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 0.9% | 18.3ms | 0.0% | 0us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` |
| 0.9% | 18.2ms | 0.0% | 0us | `reduce` | `[native code]` |
| 0.8% | 17.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` |
| 0.8% | 17.8ms | 0.8% | 17.8ms | `add` | `[native code]` |
| 0.8% | 17.5ms | 0.0% | 0us | `withMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:50` |
| 0.8% | 17.4ms | 0.8% | 16.4ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` |
| 0.8% | 17.4ms | 0.8% | 17.4ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 0.8% | 17.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` |
| 0.8% | 17.2ms | 0.0% | 888us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:224` |
| 0.8% | 17.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` |
| 0.8% | 17.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` |
| 0.8% | 16.9ms | 0.8% | 16.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 0.8% | 16.9ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` |
| 0.8% | 16.4ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.8% | 16.4ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.8% | 16.4ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.8% | 16.4ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.8% | 16.4ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.8% | 16.3ms | 0.0% | 860us | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.8% | 16.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:94` |
| 0.8% | 16.1ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:368` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `has` | `[native code]` |
| 0.8% | 16.1ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:544` |
| 0.8% | 16.1ms | 0.8% | 16.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.7% | 16.0ms | 0.0% | 0us | `flatMap` | `[native code]` |
| 0.7% | 16.0ms | 0.7% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.7% | 16.0ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:28` |
| 0.7% | 15.9ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:188` |
| 0.7% | 15.9ms | 0.7% | 15.9ms | `cloneObject` | `[native code]` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` |
| 0.7% | 15.8ms | 0.7% | 15.8ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:90` |
| 0.7% | 15.8ms | 0.0% | 0us | `fitMeshToGrid` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:325` |
| 0.7% | 15.8ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:360` |
| 0.7% | 15.7ms | 0.7% | 15.7ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` |
| 0.7% | 15.7ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:19` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:94` |
| 0.7% | 15.6ms | 0.7% | 15.6ms | `vec3` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:207` |
| 0.7% | 15.6ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:288` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `checkBox` | `internal:util/inspect` |
| 0.7% | 15.4ms | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:35` |
| 0.7% | 15.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` |
| 0.7% | 15.4ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `pointKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:89` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:36` |
| 0.7% | 15.4ms | 0.7% | 15.4ms | `max` | `[native code]` |
| 0.7% | 15.4ms | 0.0% | 0us | `faceCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:131` |
| 0.7% | 15.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` |
| 0.7% | 15.3ms | 0.0% | 0us | `some` | `[native code]` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `pairKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` |
| 0.7% | 15.3ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` |
| 0.7% | 15.3ms | 0.7% | 15.3ms | `isArray` | `[native code]` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:480` |
| 0.7% | 15.2ms | 0.7% | 15.2ms | `normalizeBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:245` |
| 0.7% | 15.1ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:225` |
| 0.7% | 15.1ms | 0.0% | 0us | `newFaceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:49` |
| 0.7% | 15.1ms | 0.0% | 0us | `addPiece` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` |
| 0.7% | 15.1ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` |
| 0.7% | 15.0ms | 0.7% | 15.0ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.7% | 15.0ms | 0.0% | 0us | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:417` |
| 0.7% | 14.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:228` |
| 0.7% | 14.7ms | 0.7% | 14.7ms | `resolve` | `[native code]` |
| 0.7% | 14.6ms | 0.7% | 14.6ms | `meshTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` |
| 0.7% | 14.5ms | 0.7% | 14.5ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:22` |
| 0.7% | 14.4ms | 0.7% | 14.4ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.7% | 14.1ms | 0.7% | 14.1ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:13` |
| 0.6% | 14.0ms | 0.0% | 0us | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` |
| 0.6% | 14.0ms | 0.6% | 14.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.6% | 14.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.6% | 13.8ms | 0.0% | 0us | `sanitizeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:428` |
| 0.6% | 13.8ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:47` |
| 0.6% | 13.6ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:99` |
| 0.6% | 13.6ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` |
| 0.6% | 13.6ms | 0.6% | 13.6ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18881` |
| 0.6% | 13.2ms | 0.0% | 0us | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` |
| 0.6% | 13.2ms | 0.6% | 13.2ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` |
| 0.6% | 13.1ms | 0.6% | 13.1ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.6% | 12.7ms | 0.0% | 0us | `faceUvToPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:105` |
| 0.5% | 11.9ms | 0.5% | 11.9ms | `values` | `[native code]` |
| 0.5% | 11.9ms | 0.0% | 0us | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:153` |
| 0.5% | 10.2ms | 0.5% | 10.2ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` |
| 0.3% | 7.3ms | 0.3% | 7.3ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` |
| 0.2% | 4.7ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.1% | 2.8ms | 0.1% | 2.8ms | `keys` | `[native code]` |
| 0.1% | 2.3ms | 0.1% | 2.3ms | `newRegistryEntry` | `[native code]` |
| 0.1% | 2.3ms | 0.0% | 0us | `ensureRegistered` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `faceUvToPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts` |
| 0.0% | 1.9ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` |
| 0.0% | 1.9ms | 0.0% | 0us | `frameOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:118` |
| 0.0% | 1.9ms | 0.0% | 926us | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.0% | 1.8ms | 0.0% | 0us | `from` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.7ms | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:81` |
| 0.0% | 1.1ms | 0.0% | 0us | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:125` |
| 0.0% | 1.1ms | 0.0% | 0us | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:419` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `planarFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:50` |
| 0.0% | 1.0ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:100` |
| 0.0% | 1.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:162` |
| 0.0% | 1.0ms | 0.0% | 0us | `selectedFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:95` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pruneMeshSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:67` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `min` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` |
| 0.0% | 999us | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:489` |
| 0.0% | 988us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` |
| 0.0% | 988us | 0.0% | 0us | `Line` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27536` |
| 0.0% | 988us | 0.0% | 0us | `LineSegments` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27832` |
| 0.0% | 988us | 0.0% | 988us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` |
| 0.0% | 988us | 0.0% | 0us | `MeshEditOverlay` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:86` |
| 0.0% | 976us | 0.0% | 976us | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:118` |
| 0.0% | 972us | 0.0% | 972us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:154` |
| 0.0% | 972us | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` |
| 0.0% | 972us | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:152` |
| 0.0% | 965us | 0.0% | 965us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:463` |
| 0.0% | 946us | 0.0% | 946us | `normalizeBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:251` |
| 0.0% | 945us | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` |
| 0.0% | 933us | 0.0% | 0us | `bound call` | `[native code]` |
| 0.0% | 933us | 0.0% | 0us | `internal:util/inspect` | `internal:util/inspect:179` |
| 0.0% | 933us | 0.0% | 933us | `(anonymous)` | `internal:util/inspect` |
| 0.0% | 916us | 0.0% | 0us | `frame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:35` |
| 0.0% | 910us | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:125` |
| 0.0% | 910us | 0.0% | 910us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` |
| 0.0% | 896us | 0.0% | 896us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:395` |
| 0.0% | 896us | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` |
| 0.0% | 896us | 0.0% | 896us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.0% | 893us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` |
| 0.0% | 888us | 0.0% | 888us | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 887us | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:126` |
| 0.0% | 868us | 0.0% | 868us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:455` |
| 0.0% | 866us | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:109` |
| 0.0% | 865us | 0.0% | 865us | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.0% | 861us | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` |
| 0.0% | 861us | 0.0% | 861us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` |
| 0.0% | 848us | 0.0% | 848us | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 840us | 0.0% | 840us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` |
| 0.0% | 831us | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` |
| 0.0% | 831us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` |

## Function Details

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:26` | Self: 11.3% (227.7ms) | Total: 17.8% (359.1ms) | Samples: 29

**Called by:**
- `meshIssues` (41)

**Calls:**
- `get` (12)

### `get`
`[native code]` | Self: 8.6% (174.8ms) | Total: 8.6% (174.8ms) | Samples: 15

**Called by:**
- `overlappingVertices` (12)
- `meshIssues` (3)

### `entries`
`[native code]` | Self: 5.4% (109.0ms) | Total: 5.4% (109.0ms) | Samples: 12

**Called by:**
- `loopCut` (8)
- `roundMesh` (3)
- `loopCut` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` | Self: 5.3% (106.8ms) | Total: 5.3% (106.8ms) | Samples: 13

**Called by:**
- `meshEdges` (8)
- `normalizeMesh` (5)

### `Set`
`[native code]` | Self: 4.8% (96.9ms) | Total: 4.8% (96.9ms) | Samples: 15

**Called by:**
- `normalizeMesh` (6)
- `meshEdges` (3)
- `newFaceKey` (3)
- `pruneMeshSelection` (3)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` | Self: 4.0% (80.6ms) | Total: 4.0% (80.6ms) | Samples: 10

**Called by:**
- `normalizeMesh` (5)
- `meshEdges` (3)
- `setMesh` (2)

### `sort`
`[native code]` | Self: 3.1% (62.9ms) | Total: 3.1% (62.9ms) | Samples: 5

**Called by:**
- `normalizeMesh` (3)
- `normalizeMesh` (2)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` | Self: 3.0% (60.6ms) | Total: 3.0% (60.6ms) | Samples: 5

**Called by:**
- `withMesh` (5)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` | Self: 2.9% (59.1ms) | Total: 2.9% (59.1ms) | Samples: 6

**Called by:**
- `withMesh` (4)
- `sanitizeMesh` (2)

### `map`
`[native code]` | Self: 2.2% (46.1ms) | Total: 3.8% (78.5ms) | Samples: 4

**Called by:**
- `normalizeMesh` (4)
- `orderQuad` (4)
- `meshEdges` (1)
- `loopCut` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` | Self: 2.2% (45.1ms) | Total: 2.2% (45.1ms) | Samples: 5

**Called by:**
- `time` (4)
- `time` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` | Self: 1.9% (39.4ms) | Total: 1.9% (39.4ms) | Samples: 4

**Called by:**
- `quad` (4)

### `hypot`
`[native code]` | Self: 1.6% (32.6ms) | Total: 1.6% (32.6ms) | Samples: 3

**Called by:**
- `meshFaceFrame` (1)
- `faceNormal` (1)
- `normalize` (1)

### `filter`
`[native code]` | Self: 1.5% (30.6ms) | Total: 3.9% (80.1ms) | Samples: 5

**Called by:**
- `normalizeMesh` (8)
- `meshIssues` (3)
- `bound call` (1)
- `setMesh` (1)
- `setMesh` (1)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `indexOf`
`[native code]` | Self: 1.5% (30.3ms) | Total: 1.5% (30.3ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:121` | Self: 1.3% (28.1ms) | Total: 1.3% (28.1ms) | Samples: 3

**Called by:**
- `orderQuad` (3)

### `scale`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:34` | Self: 1.3% (26.5ms) | Total: 1.3% (26.5ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (1)
- `faceUvToPoint` (1)

### `parseModule`
`[native code]` | Self: 1.1% (23.1ms) | Total: 1.9% (39.5ms) | Samples: 4

**Called by:**
- `async (anonymous)` (6)

**Calls:**
- `node:assert` (2)

### `structuredClone`
`[native code]` | Self: 0.9% (18.8ms) | Total: 0.9% (18.8ms) | Samples: 6

**Called by:**
- `(anonymous)` (5)
- `(anonymous)` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` | Self: 0.9% (18.5ms) | Total: 0.9% (18.5ms) | Samples: 4

**Called by:**
- `normalizeMesh` (3)
- `meshEdges` (1)

### `add`
`[native code]` | Self: 0.8% (17.8ms) | Total: 0.8% (17.8ms) | Samples: 5

**Called by:**
- `normalizeMesh` (5)

### `add`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` | Self: 0.8% (17.4ms) | Total: 0.8% (17.4ms) | Samples: 6

**Called by:**
- `(anonymous)` (6)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` | Self: 0.8% (17.3ms) | Total: 0.9% (19.1ms) | Samples: 3

**Called by:**
- `sanitizeMesh` (3)
- `withMesh` (2)

**Calls:**
- `faceNormal` (2)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` | Self: 0.8% (16.9ms) | Total: 0.8% (16.9ms) | Samples: 3

**Called by:**
- `buildMesh` (2)
- `quad` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` | Self: 0.8% (16.4ms) | Total: 0.8% (17.4ms) | Samples: 2

**Called by:**
- `time` (3)

**Calls:**
- `entries` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` | Self: 0.8% (16.4ms) | Total: 2.3% (46.7ms) | Samples: 3

**Called by:**
- `filter` (6)

**Calls:**
- `indexOf` (3)

### `has`
`[native code]` | Self: 0.8% (16.1ms) | Total: 0.8% (16.1ms) | Samples: 1

**Called by:**
- `loopCut` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` | Self: 0.8% (16.1ms) | Total: 0.8% (16.1ms) | Samples: 3

**Called by:**
- `withMesh` (3)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.7% (16.0ms) | Total: 0.7% (16.0ms) | Samples: 2

**Called by:**
- `orderQuad` (1)
- `frame` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` | Self: 0.7% (16.0ms) | Total: 0.7% (16.0ms) | Samples: 2

**Called by:**
- `buildMesh` (2)

### `cloneObject`
`[native code]` | Self: 0.7% (15.9ms) | Total: 0.7% (15.9ms) | Samples: 2

**Called by:**
- `extrudeFaces` (2)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 2

**Called by:**
- `time` (2)

### `sortedKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 2

**Called by:**
- `normalizeMesh` (2)

### `meshBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:90` | Self: 0.7% (15.8ms) | Total: 0.7% (15.8ms) | Samples: 1

**Called by:**
- `fitMeshToGrid` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` | Self: 0.7% (15.7ms) | Total: 0.7% (15.7ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `meshBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:94` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `withMesh` (1)

### `vec3`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:207` | Self: 0.7% (15.6ms) | Total: 0.7% (15.6ms) | Samples: 1

**Called by:**
- `sanitizeMesh` (1)

### `checkBox`
`internal:util/inspect` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `internal:util/inspect` (1)

### `pointKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:89` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:36` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `meshIssues` (1)

### `max`
`[native code]` | Self: 0.7% (15.4ms) | Total: 0.7% (15.4ms) | Samples: 1

**Called by:**
- `faceCenter` (1)

### `pairKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` | Self: 0.7% (15.3ms) | Total: 0.7% (15.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isArray`
`[native code]` | Self: 0.7% (15.3ms) | Total: 0.7% (15.3ms) | Samples: 2

**Called by:**
- `normalizeMesh` (2)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` | Self: 0.7% (15.2ms) | Total: 0.7% (15.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:480` | Self: 0.7% (15.2ms) | Total: 0.7% (15.2ms) | Samples: 1

**Called by:**
- `time` (1)

### `normalizeBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:245` | Self: 0.7% (15.2ms) | Total: 0.7% (15.2ms) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.7% (15.0ms) | Total: 0.7% (15.0ms) | Samples: 1

**Called by:**
- `faceGeometryIssue` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` | Self: 0.7% (15.0ms) | Total: 1.5% (31.3ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (3)

**Calls:**
- `pointsAlong` (1)
- `pointsAlong` (1)

### `resolve`
`[native code]` | Self: 0.7% (14.7ms) | Total: 0.7% (14.7ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `meshTriangleCount`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` | Self: 0.7% (14.6ms) | Total: 0.7% (14.6ms) | Samples: 2

**Called by:**
- `sanitizeModel` (1)
- `(anonymous)` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:22` | Self: 0.7% (14.5ms) | Total: 0.7% (14.5ms) | Samples: 1

**Called by:**
- `meshIssues` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` | Self: 0.7% (14.4ms) | Total: 1.6% (32.6ms) | Samples: 1

**Called by:**
- `withMesh` (4)
- `sanitizeMesh` (1)

**Calls:**
- `map` (4)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` | Self: 0.7% (14.4ms) | Total: 0.7% (14.4ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `dot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:13` | Self: 0.7% (14.1ms) | Total: 0.7% (14.1ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `faceCenter`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` | Self: 0.6% (14.0ms) | Total: 1.5% (31.4ms) | Samples: 1

**Called by:**
- `orderQuad` (6)
- `faceGeometryIssue` (1)

**Calls:**
- `reduce` (6)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.6% (14.0ms) | Total: 0.6% (14.0ms) | Samples: 1

**Called by:**
- `link` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` | Self: 0.6% (13.7ms) | Total: 3.6% (74.0ms) | Samples: 1

**Called by:**
- `time` (7)

**Calls:**
- `filter` (3)
- `get` (3)

### `computeBoundingSphere`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18881` | Self: 0.6% (13.6ms) | Total: 0.6% (13.6ms) | Samples: 1

**Called by:**
- `setMesh` (1)

### `canonicalEdge`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` | Self: 0.6% (13.2ms) | Total: 0.6% (13.2ms) | Samples: 1

**Called by:**
- `meshSurfaceEdges` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` | Self: 0.6% (13.1ms) | Total: 0.6% (13.1ms) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:279` | Self: 0.6% (12.3ms) | Total: 1.4% (30.2ms) | Samples: 2

**Called by:**
- `withMesh` (4)
- `sanitizeMesh` (3)

**Calls:**
- `add` (5)

### `values`
`[native code]` | Self: 0.5% (11.9ms) | Total: 0.5% (11.9ms) | Samples: 1

**Called by:**
- `meshSurfaceEdges` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` | Self: 0.5% (10.2ms) | Total: 0.5% (10.2ms) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` | Self: 0.3% (7.3ms) | Total: 0.3% (7.3ms) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `keys`
`[native code]` | Self: 0.1% (2.8ms) | Total: 0.1% (2.8ms) | Samples: 3

**Called by:**
- `extrudeFaces` (1)
- `loopCut` (1)
- `finish` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` | Self: 0.1% (2.7ms) | Total: 2.4% (49.9ms) | Samples: 3

**Called by:**
- `withMesh` (5)
- `sanitizeMesh` (2)

**Calls:**
- `sort` (2)
- `sortedKeys` (2)

### `newRegistryEntry`
`[native code]` | Self: 0.1% (2.3ms) | Total: 0.1% (2.3ms) | Samples: 1

**Called by:**
- `ensureRegistered` (1)

### `faceUvToPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `quad` (1)
- `quad` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `withMesh` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `map` (2)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `normalizeMesh` (2)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `from` (2)

### `planarFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:50` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `frameOf` (1)

### `pruneMeshSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:67` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `selectedFaces` (1)

### `min`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `meshBox` (1)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `quad` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12076` | Self: 0.0% (988us) | Total: 0.0% (988us) | Samples: 1

**Called by:**
- `Line` (1)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` | Self: 0.0% (986us) | Total: 2.3% (46.6ms) | Samples: 1

**Called by:**
- `buildPartGeometry` (4)

**Calls:**
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:118` | Self: 0.0% (976us) | Total: 0.0% (976us) | Samples: 1

**Called by:**
- `orderQuad` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:154` | Self: 0.0% (972us) | Total: 0.0% (972us) | Samples: 1

**Called by:**
- `filter` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:463` | Self: 0.0% (965us) | Total: 0.0% (965us) | Samples: 1

**Called by:**
- `time` (1)

### `normalizeBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:251` | Self: 0.0% (946us) | Total: 0.0% (946us) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `(anonymous)`
`internal:util/inspect` | Self: 0.0% (933us) | Total: 0.0% (933us) | Samples: 1

**Called by:**
- `filter` (1)

### `meshBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` | Self: 0.0% (926us) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `withMesh` (2)

**Calls:**
- `min` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` | Self: 0.0% (910us) | Total: 0.0% (910us) | Samples: 1

**Called by:**
- `filter` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `time` (1)

### `makePoints`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:395` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `loopCut` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (888us) | Total: 0.0% (888us) | Samples: 1

**Called by:**
- `triangle` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:224` | Self: 0.0% (888us) | Total: 0.8% (17.2ms) | Samples: 1

**Called by:**
- `normalizeMesh` (3)

**Calls:**
- `normalize` (2)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:455` | Self: 0.0% (868us) | Total: 0.0% (868us) | Samples: 1

**Called by:**
- `time` (1)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.0% (865us) | Total: 0.0% (865us) | Samples: 1

**Called by:**
- `triangle` (1)

### `positionsOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `setMesh` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.0% (860us) | Total: 0.8% (16.3ms) | Samples: 1

**Called by:**
- `orderQuad` (2)

**Calls:**
- `hypot` (1)

### `dot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (848us) | Total: 0.0% (848us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` | Self: 0.0% (840us) | Total: 0.0% (840us) | Samples: 1

**Called by:**
- `withMesh` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:81` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `buildMesh` (1)
- `quad` (1)

**Calls:**
- `sub` (1)
- `cross` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` | Self: 0.0% (0us) | Total: 2.9% (59.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (12)

**Calls:**
- `buildBox` (12)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.8% (16.4ms) | Samples: 0

**Called by:**
- `assign` (2)

**Calls:**
- `loadAssertionError` (2)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:463` | Self: 0.0% (0us) | Total: 1.5% (30.2ms) | Samples: 0

**Called by:**
- `time` (2)
- `time` (1)

**Calls:**
- `faceGeometryIssue` (1)
- `faceGeometryIssue` (1)
- `faceGeometryIssue` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` | Self: 0.0% (0us) | Total: 2.1% (44.2ms) | Samples: 0

**Called by:**
- `time` (4)

**Calls:**
- `meshEdges` (3)
- `some` (1)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `buildBox` (2)

**Calls:**
- `triangle` (1)
- `triangle` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:226` | Self: 0.0% (0us) | Total: 1.5% (30.5ms) | Samples: 0

**Called by:**
- `normalizeMesh` (4)

**Calls:**
- `map` (4)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (4.7ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `ensureRegistered` (1)
- `async loadModule` (1)

### `flatMap`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (16.0ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `ensureRegistered`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `newRegistryEntry` (1)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` | Self: 0.0% (0us) | Total: 1.6% (32.9ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (5)

**Calls:**
- `triangle` (2)
- `triangle` (2)
- `triangle` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:125` | Self: 0.0% (0us) | Total: 0.0% (910us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `filter` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 98.7% (1.98s) | Samples: 0

**Calls:**
- `(anonymous)` (260)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` | Self: 0.0% (0us) | Total: 13.9% (280.5ms) | Samples: 0

**Called by:**
- `sanitizeModel` (31)

**Calls:**
- `sanitizeMesh` (29)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)

### `internal:util/inspect`
`internal:util/inspect:179` | Self: 0.0% (0us) | Total: 0.0% (933us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound call` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:228` | Self: 0.0% (0us) | Total: 0.7% (14.9ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `dot` (2)
- `dot` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` | Self: 0.0% (0us) | Total: 0.0% (988us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `MeshEditOverlay` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` | Self: 0.0% (0us) | Total: 0.8% (17.0ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `time` (3)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `time` (3)

**Calls:**
- `addPiece` (3)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` | Self: 0.0% (0us) | Total: 2.3% (47.0ms) | Samples: 0

**Called by:**
- `time` (2)
- `setMesh` (1)
- `pruneMeshSelection` (1)

**Calls:**
- `Set` (3)
- `map` (1)

### `pruneMeshSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` | Self: 0.0% (0us) | Total: 3.8% (77.2ms) | Samples: 0

**Called by:**
- `finish` (8)

**Calls:**
- `meshEdges` (4)
- `Set` (3)
- `meshEdges` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:489` | Self: 0.0% (0us) | Total: 0.0% (999us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `keys` (1)

### `sanitizeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` | Self: 0.0% (0us) | Total: 15.5% (312.5ms) | Samples: 0

**Called by:**
- `time` (25)
- `readMoldaDocument` (6)
- `time` (3)

**Calls:**
- `sanitizePart` (31)
- `sanitizePart` (2)
- `sanitizePart` (1)

### `addPiece`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `loopCut` (3)

**Calls:**
- `newFaceKey` (3)

### `faceUvToPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:105` | Self: 0.0% (0us) | Total: 0.6% (12.7ms) | Samples: 0

**Called by:**
- `quad` (1)

**Calls:**
- `scale` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` | Self: 0.0% (0us) | Total: 1.5% (31.0ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `time` (3)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:109` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `from` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `loopCut` (1)

**Calls:**
- `(anonymous)` (1)

### `MeshEditOverlay`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:86` | Self: 0.0% (0us) | Total: 0.0% (988us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `LineSegments` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` | Self: 0.0% (0us) | Total: 3.9% (80.3ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `time` (9)
- `time` (1)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:99` | Self: 0.0% (0us) | Total: 0.6% (13.6ms) | Samples: 0

**Called by:**
- `buildBox` (2)

**Calls:**
- `faceUvToPoint` (1)
- `faceUvToPoint` (1)

### `withMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` | Self: 0.0% (0us) | Total: 19.9% (402.0ms) | Samples: 0

**Called by:**
- `finish` (68)

**Calls:**
- `normalizeMesh` (16)
- `normalizeMesh` (12)
- `normalizeMesh` (6)
- `roundMesh` (5)
- `normalizeMesh` (5)
- `normalizeMesh` (4)
- `normalizeMesh` (4)
- `normalizeMesh` (4)
- `normalizeMesh` (3)
- `roundMesh` (3)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (1)
- `normalizeMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` | Self: 0.0% (0us) | Total: 0.8% (17.9ms) | Samples: 0

**Called by:**
- `time` (5)

**Calls:**
- `structuredClone` (5)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:368` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `sanitizeModel` (2)

**Calls:**
- `normalizeBox` (1)
- `normalizeBox` (1)

### `selectedFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:95` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `extrudeFaces` (1)

**Calls:**
- `pruneMeshSelection` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `pointKey` (1)

### `fitMeshToGrid`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:325` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `meshBox` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` | Self: 0.0% (0us) | Total: 3.0% (60.6ms) | Samples: 0

**Called by:**
- `withMesh` (6)
- `sanitizeMesh` (2)

**Calls:**
- `filter` (8)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:417` | Self: 0.0% (0us) | Total: 0.7% (15.0ms) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `faceVertices` (1)

### `buildBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` | Self: 0.0% (0us) | Total: 2.9% (59.0ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (12)

**Calls:**
- `quad` (5)
- `frameOf` (2)
- `quad` (2)
- `quad` (2)
- `quad` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.8% (16.4ms) | Samples: 0

**Called by:**
- `get` (2)

**Calls:**
- `anonymous` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` | Self: 0.0% (0us) | Total: 14.8% (300.0ms) | Samples: 0

**Called by:**
- `time` (30)
- `time` (10)
- `(module)` (3)

**Calls:**
- `finishCut` (43)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` | Self: 0.0% (0us) | Total: 0.0% (896us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `makePoints` (1)

### `faceCenter`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:131` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `orderQuad` (1)

**Calls:**
- `max` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` | Self: 0.0% (0us) | Total: 6.5% (132.3ms) | Samples: 0

**Called by:**
- `withMesh` (16)
- `sanitizeMesh` (4)

**Calls:**
- `orderQuad` (7)
- `orderQuad` (4)
- `orderQuad` (4)
- `orderQuad` (3)
- `orderQuad` (1)
- `orderQuad` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:188` | Self: 0.0% (0us) | Total: 0.7% (15.9ms) | Samples: 0

**Called by:**
- `time` (2)

**Calls:**
- `cloneObject` (2)

### `reduce`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (18.2ms) | Samples: 0

**Called by:**
- `faceCenter` (6)
- `finish` (1)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 98.7% (1.98s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (260)

**Calls:**
- `async loadAndEvaluateModule` (257)
- `async (anonymous)` (3)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 2.6% (54.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `parseModule` (6)
- `resolve` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:544` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `has` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` | Self: 0.0% (0us) | Total: 26.1% (526.2ms) | Samples: 0

**Called by:**
- `evaluate` (58)

**Calls:**
- `time` (48)
- `time` (10)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `reduce` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.8% (16.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:28` | Self: 0.0% (0us) | Total: 0.7% (16.0ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `hypot` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 2.7% (56.2ms) | Samples: 0

**Called by:**
- `link` (3)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (3)
- `moduleDeclarationInstantiation` (1)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` | Self: 0.0% (0us) | Total: 0.6% (14.0ms) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `faceCenter` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:126` | Self: 0.0% (0us) | Total: 0.0% (887us) | Samples: 0

**Called by:**
- `finishCut` (1)

**Calls:**
- `keys` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (933us) | Samples: 0

**Called by:**
- `internal:util/inspect` (1)

**Calls:**
- `filter` (1)

### `sanitizeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:428` | Self: 0.0% (0us) | Total: 0.6% (13.8ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `meshTriangleCount` (1)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:360` | Self: 0.0% (0us) | Total: 0.7% (15.8ms) | Samples: 0

**Called by:**
- `sanitizeModel` (1)

**Calls:**
- `fitMeshToGrid` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:225` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `normalizeMesh` (1)

**Calls:**
- `cross` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 1.5% (31.3ms) | Samples: 0

**Called by:**
- `flatMap` (2)
- `loopCut` (1)

**Calls:**
- `(anonymous)` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` | Self: 0.0% (0us) | Total: 2.9% (60.0ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `time` (7)
- `time` (6)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` | Self: 0.0% (0us) | Total: 3.8% (77.2ms) | Samples: 0

**Called by:**
- `finishCut` (8)

**Calls:**
- `pruneMeshSelection` (8)

### `Line`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27536` | Self: 0.0% (0us) | Total: 0.0% (988us) | Samples: 0

**Called by:**
- `LineSegments` (1)

**Calls:**
- `Object3D` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (14.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` | Self: 0.0% (0us) | Total: 4.5% (91.8ms) | Samples: 0

**Called by:**
- `time` (11)
- `time` (2)

**Calls:**
- `setMesh` (7)
- `setMesh` (2)
- `setMesh` (1)
- `setMesh` (1)
- `setMesh` (1)
- `setMesh` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (16.4ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (2)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:419` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `faceNormal` (1)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` | Self: 0.0% (0us) | Total: 0.9% (18.3ms) | Samples: 0

**Called by:**
- `withMesh` (3)

**Calls:**
- `entries` (3)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` | Self: 0.0% (0us) | Total: 1.5% (31.6ms) | Samples: 0

**Called by:**
- `sanitizeMesh` (2)
- `withMesh` (1)

**Calls:**
- `sort` (3)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` | Self: 0.0% (0us) | Total: 0.0% (861us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `positionsOf` (1)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:125` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `faceGeometryIssue` (1)

**Calls:**
- `hypot` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.88s) | Samples: 0

**Called by:**
- `moduleEvaluation` (256)
- `async loadAndEvaluateModule` (256)

**Calls:**
- `evaluate` (256)
- `moduleEvaluation` (256)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` | Self: 0.0% (0us) | Total: 4.4% (89.7ms) | Samples: 0

**Called by:**
- `time` (8)

**Calls:**
- `entries` (8)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:288` | Self: 0.0% (0us) | Total: 0.7% (15.6ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `vec3` (1)

### `newFaceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:49` | Self: 0.0% (0us) | Total: 0.7% (15.1ms) | Samples: 0

**Called by:**
- `addPiece` (3)

**Calls:**
- `Set` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` | Self: 0.0% (0us) | Total: 0.0% (831us) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `meshTriangleCount` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` | Self: 0.0% (0us) | Total: 20.8% (419.6ms) | Samples: 0

**Called by:**
- `finishCut` (34)
- `time` (34)
- `time` (3)

**Calls:**
- `withMesh` (68)
- `withMesh` (3)

### `internal:util/inspect`
`internal:util/inspect:35` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `checkBox` (1)

### `withMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:50` | Self: 0.0% (0us) | Total: 0.8% (17.5ms) | Samples: 0

**Called by:**
- `finish` (3)

**Calls:**
- `meshBox` (2)
- `meshBox` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:19` | Self: 0.0% (0us) | Total: 0.7% (15.7ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `faceVertices` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:47` | Self: 0.0% (0us) | Total: 0.6% (13.8ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `scale` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` | Self: 0.0% (0us) | Total: 1.5% (31.3ms) | Samples: 0

**Called by:**
- `time` (3)

**Calls:**
- `flatMap` (2)
- `flatIntoArrayWithCallback` (1)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` | Self: 0.0% (0us) | Total: 2.0% (40.3ms) | Samples: 0

**Called by:**
- `buildBox` (5)

**Calls:**
- `triangle` (4)
- `triangle` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` | Self: 0.0% (0us) | Total: 0.0% (945us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `keys` (1)

### `finishCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` | Self: 0.0% (0us) | Total: 14.8% (300.0ms) | Samples: 0

**Called by:**
- `loopCut` (43)

**Calls:**
- `finish` (34)
- `finish` (8)
- `finish` (1)

### `frame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:35` | Self: 0.0% (0us) | Total: 0.0% (916us) | Samples: 0

**Called by:**
- `frameOf` (1)

**Calls:**
- `cross` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:218` | Self: 0.0% (0us) | Total: 1.4% (29.1ms) | Samples: 0

**Called by:**
- `normalizeMesh` (4)

**Calls:**
- `faceNormal` (3)
- `faceNormal` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` | Self: 0.0% (0us) | Total: 10.7% (216.5ms) | Samples: 0

**Called by:**
- `evaluate` (42)

**Calls:**
- `time` (39)
- `time` (3)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `sanitizeMesh` (2)

**Calls:**
- `isArray` (2)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` | Self: 0.0% (0us) | Total: 3.9% (79.5ms) | Samples: 0

**Called by:**
- `time` (8)
- `time` (1)

**Calls:**
- `buildMesh` (5)
- `buildMesh` (4)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` | Self: 0.0% (0us) | Total: 1.6% (32.8ms) | Samples: 0

**Called by:**
- `normalizeMesh` (7)

**Calls:**
- `faceCenter` (6)
- `faceCenter` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` | Self: 0.0% (0us) | Total: 27.8% (560.5ms) | Samples: 0

**Called by:**
- `evaluate` (71)

**Calls:**
- `time` (59)
- `time` (12)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:445` | Self: 0.0% (0us) | Total: 19.3% (389.1ms) | Samples: 0

**Called by:**
- `time` (35)
- `time` (8)

**Calls:**
- `overlappingVertices` (41)
- `overlappingVertices` (1)
- `overlappingVertices` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` | Self: 0.0% (0us) | Total: 16.8% (339.1ms) | Samples: 0

**Called by:**
- `(module)` (12)
- `(module)` (10)
- `(module)` (6)
- `(module)` (3)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)

**Calls:**
- `loopCut` (10)
- `meshIssues` (8)
- `(anonymous)` (6)
- `finish` (3)
- `sanitizeModel` (3)
- `(anonymous)` (2)
- `buildPartGeometry` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `meshIssues` (1)
- `loopCut` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` | Self: 0.0% (0us) | Total: 14.6% (294.7ms) | Samples: 0

**Called by:**
- `evaluate` (32)

**Calls:**
- `time` (29)
- `time` (3)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.8% (16.4ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `assign` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` | Self: 0.0% (0us) | Total: 0.8% (17.4ms) | Samples: 0

**Called by:**
- `reduce` (6)

**Calls:**
- `add` (6)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` | Self: 0.0% (0us) | Total: 2.9% (58.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `meshEdges` (6)
- `meshEdges` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` | Self: 0.0% (0us) | Total: 0.6% (13.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `computeBoundingSphere` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.4% (1.96s) | Samples: 0

**Called by:**
- `(anonymous)` (257)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (256)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` | Self: 0.0% (0us) | Total: 0.7% (15.3ms) | Samples: 0

**Called by:**
- `some` (1)

**Calls:**
- `pairKey` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:152` | Self: 0.0% (0us) | Total: 0.0% (972us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `filter` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` | Self: 0.0% (0us) | Total: 0.6% (13.2ms) | Samples: 0

**Called by:**
- `meshEdges` (1)

**Calls:**
- `canonicalEdge` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `build` (1)
- `build` (1)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (2)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` | Self: 0.0% (0us) | Total: 12.4% (251.7ms) | Samples: 0

**Called by:**
- `sanitizePart` (29)

**Calls:**
- `normalizeMesh` (8)
- `normalizeMesh` (4)
- `normalizeMesh` (3)
- `normalizeMesh` (3)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:94` | Self: 0.0% (0us) | Total: 0.8% (16.1ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `assetFromJson` (3)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:153` | Self: 0.0% (0us) | Total: 0.5% (11.9ms) | Samples: 0

**Called by:**
- `meshEdges` (1)

**Calls:**
- `values` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` | Self: 0.0% (0us) | Total: 76.4% (1.54s) | Samples: 0

**Called by:**
- `(module)` (59)
- `(module)` (48)
- `(module)` (39)
- `(module)` (29)
- `(module)` (12)
- `(module)` (9)
- `(module)` (7)
- `(module)` (3)
- `(module)` (3)

**Calls:**
- `meshIssues` (35)
- `finish` (34)
- `loopCut` (30)
- `sanitizeModel` (25)
- `(anonymous)` (11)
- `buildPartGeometry` (8)
- `loopCut` (8)
- `meshIssues` (7)
- `(anonymous)` (7)
- `(anonymous)` (5)
- `loopCut` (4)
- `loopCut` (4)
- `loopCut` (3)
- `loopCut` (3)
- `loopCut` (3)
- `meshEdges` (2)
- `meshIssues` (2)
- `meshIssues` (2)
- `extrudeFaces` (2)
- `loopCut` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `finish` (1)
- `sanitizeModel` (1)
- `meshIssues` (1)
- `(anonymous)` (1)
- `meshEdges` (1)
- `extrudeFaces` (1)
- `extrudeFaces` (1)
- `loopCut` (1)
- `(anonymous)` (1)
- `build` (1)
- `loopCut` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` | Self: 0.0% (0us) | Total: 0.8% (16.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `meshSurfaceEdges` (2)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` | Self: 0.0% (0us) | Total: 0.0% (972us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `from` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` | Self: 0.0% (0us) | Total: 2.9% (60.0ms) | Samples: 0

**Called by:**
- `time` (7)
- `time` (6)

**Calls:**
- `buildPartGeometry` (12)
- `build` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` | Self: 0.0% (0us) | Total: 0.8% (17.1ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `assetFromJson` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` | Self: 0.0% (0us) | Total: 0.0% (893us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `structuredClone` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` | Self: 0.0% (0us) | Total: 6.1% (124.8ms) | Samples: 0

**Called by:**
- `withMesh` (12)
- `sanitizeMesh` (8)

**Calls:**
- `Set` (6)
- `meshSurfaceEdges` (5)
- `meshSurfaceEdges` (5)
- `meshSurfaceEdges` (3)
- `meshSurfaceEdges` (1)

### `frameOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:118` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `buildBox` (2)

**Calls:**
- `planarFaceFrame` (1)
- `frame` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` | Self: 0.0% (0us) | Total: 1.5% (31.3ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `loopCut` (3)
- `loopCut` (1)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` | Self: 0.0% (0us) | Total: 5.9% (119.6ms) | Samples: 0

**Called by:**
- `setMesh` (6)
- `pruneMeshSelection` (4)
- `loopCut` (3)
- `time` (1)

**Calls:**
- `meshSurfaceEdges` (8)
- `meshSurfaceEdges` (3)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:162` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `selectedFaces` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` | Self: 0.0% (0us) | Total: 0.7% (15.4ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `map` (1)

### `LineSegments`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27832` | Self: 0.0% (0us) | Total: 0.0% (988us) | Samples: 0

**Called by:**
- `MeshEditOverlay` (1)

**Calls:**
- `Line` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` | Self: 0.0% (0us) | Total: 4.6% (92.8ms) | Samples: 0

**Called by:**
- `evaluate` (14)

**Calls:**
- `time` (12)
- `time` (2)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 96.4% (1.94s) | Samples: 0

**Called by:**
- `moduleEvaluation` (256)

**Calls:**
- `(module)` (71)
- `(module)` (58)
- `(module)` (42)
- `(module)` (32)
- `(module)` (14)
- `(module)` (13)
- `(module)` (10)
- `(module)` (4)
- `(module)` (3)
- `(module)` (3)
- `(module)` (3)
- `(module)` (3)

### `anonymous`
`[native code]` | Self: 0.0% (0us) | Total: 1.6% (32.8ms) | Samples: 0

**Called by:**
- `internal:assert/assertion_error` (2)
- `loadAssertionError` (2)

**Calls:**
- `internal:assert/assertion_error` (2)
- `internal:util/inspect` (1)
- `internal:util/inspect` (1)

### `assetFromJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` | Self: 0.0% (0us) | Total: 1.6% (33.3ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (3)

**Calls:**
- `readMoldaDocument` (6)

### `readMoldaDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` | Self: 0.0% (0us) | Total: 1.6% (33.3ms) | Samples: 0

**Called by:**
- `assetFromJson` (6)

**Calls:**
- `sanitizeModel` (6)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:100` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `buildBox` (1)

**Calls:**
- `faceUvToPoint` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 37.4% | 755.1ms | `[native code]` |
| 31.1% | 627.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 12.7% | 257.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts` |
| 6.9% | 140.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 3.8% | 77.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 3.6% | 74.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 2.2% | 44.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 0.8% | 16.4ms | `internal:util/inspect` |
| 0.7% | 14.6ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.1% | 3.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts` |
| 0.1% | 2.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts` |
| 0.0% | 1.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts` |
