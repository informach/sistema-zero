# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.42s | 302 | 1.0ms | 224 |

**Top 10:** `hypot` 12.3%, `meshIssues` 8.4%, `meshSurfaceEdges` 6.9%, `entries` 6.0%, `meshSurfaceEdges` 5.6%, `sub` 5.6%, `structuredClone` 4.3%, `Set` 3.6%, `cloneObject` 2.5%, `map` 2.4%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 12.3% | 300.7ms | 12.3% | 300.7ms | `hypot` | `[native code]` |
| 8.4% | 204.0ms | 25.8% | 628.7ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:450` |
| 6.9% | 169.4ms | 6.9% | 169.4ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 6.0% | 146.9ms | 6.0% | 146.9ms | `entries` | `[native code]` |
| 5.6% | 138.3ms | 5.6% | 138.3ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 5.6% | 137.6ms | 5.6% | 137.6ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 4.3% | 104.8ms | 4.3% | 104.8ms | `structuredClone` | `[native code]` |
| 3.6% | 89.6ms | 3.6% | 89.6ms | `Set` | `[native code]` |
| 2.5% | 62.0ms | 2.5% | 62.0ms | `cloneObject` | `[native code]` |
| 2.4% | 58.3ms | 3.7% | 90.8ms | `map` | `[native code]` |
| 2.0% | 49.3ms | 2.0% | 49.3ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.9% | 47.7ms | 6.1% | 148.2ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` |
| 1.9% | 47.1ms | 2.5% | 62.5ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 1.8% | 45.7ms | 1.8% | 45.7ms | `add` | `[native code]` |
| 1.6% | 40.9ms | 1.6% | 40.9ms | `indexOf` | `[native code]` |
| 1.3% | 33.1ms | 1.3% | 33.1ms | `get` | `[native code]` |
| 1.2% | 31.5ms | 1.2% | 31.5ms | `has` | `[native code]` |
| 1.2% | 31.1ms | 1.2% | 31.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` |
| 1.2% | 29.8ms | 3.1% | 75.5ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 1.1% | 27.6ms | 1.1% | 27.6ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:461` |
| 1.1% | 27.3ms | 1.1% | 27.3ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 1.1% | 27.1ms | 1.1% | 27.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` |
| 0.7% | 18.6ms | 0.7% | 18.6ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.7% | 17.0ms | 0.7% | 17.0ms | `values` | `[native code]` |
| 0.7% | 17.0ms | 0.7% | 17.0ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:105` |
| 0.6% | 16.7ms | 0.6% | 16.7ms | `sort` | `[native code]` |
| 0.6% | 16.6ms | 0.6% | 16.6ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 0.6% | 16.4ms | 1.3% | 32.0ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` |
| 0.6% | 16.4ms | 0.6% | 16.4ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.6% | 16.0ms | 0.6% | 16.0ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:301` |
| 0.6% | 15.9ms | 0.6% | 15.9ms | `set` | `[native code]` |
| 0.6% | 15.7ms | 1.2% | 31.4ms | `anonymous` | `[native code]` |
| 0.6% | 15.6ms | 0.6% | 15.6ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.6% | 15.5ms | 99.2% | 2.41s | `processTicksAndRejections` | `[native code]` |
| 0.6% | 15.5ms | 0.6% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\palette.ts:101` |
| 0.6% | 15.5ms | 0.6% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 0.6% | 15.4ms | 0.6% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:509` |
| 0.6% | 15.4ms | 0.6% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` |
| 0.6% | 15.3ms | 0.6% | 15.3ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` |
| 0.6% | 15.2ms | 1.2% | 30.9ms | `parseModule` | `[native code]` |
| 0.6% | 15.2ms | 0.6% | 16.0ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:265` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `next` | `[native code]` |
| 0.6% | 15.0ms | 0.7% | 17.1ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `isMeshFaceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:27` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:158` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:120` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:124` |
| 0.6% | 14.5ms | 2.5% | 61.7ms | `buildBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` |
| 0.5% | 14.3ms | 0.5% | 14.3ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 13.9ms | 0.6% | 14.9ms | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` |
| 0.5% | 13.1ms | 0.5% | 13.1ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18883` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:247` |
| 0.4% | 11.3ms | 0.4% | 11.3ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:449` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` |
| 0.1% | 2.5ms | 0.1% | 2.5ms | `requestInstantiate` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:145` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:101` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:483` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `randomKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:36` |
| 0.0% | 1.1ms | 0.7% | 17.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:464` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.0% | 1.0ms | 1.3% | 31.8ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:467` |
| 0.0% | 1.0ms | 0.6% | 16.7ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:484` |
| 0.0% | 1.0ms | 0.0% | 1.9ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.0% | 992us | 0.0% | 992us | `pairKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` |
| 0.0% | 980us | 0.0% | 980us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` |
| 0.0% | 967us | 0.0% | 967us | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 963us | 0.0% | 963us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` |
| 0.0% | 934us | 0.0% | 934us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:608` |
| 0.0% | 930us | 0.0% | 930us | `isArray` | `[native code]` |
| 0.0% | 929us | 0.0% | 929us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.0% | 927us | 0.0% | 927us | `vec3` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:205` |
| 0.0% | 925us | 0.0% | 925us | `keys` | `[native code]` |
| 0.0% | 925us | 0.0% | 925us | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2306` |
| 0.0% | 922us | 2.4% | 60.5ms | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` |
| 0.0% | 903us | 0.0% | 903us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:24` |
| 0.0% | 897us | 0.0% | 897us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:270` |
| 0.0% | 896us | 0.0% | 896us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.0% | 885us | 0.0% | 885us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:399` |
| 0.0% | 883us | 0.0% | 883us | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.0% | 879us | 0.0% | 879us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:471` |
| 0.0% | 879us | 0.0% | 879us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:138` |
| 0.0% | 867us | 1.2% | 30.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` |
| 0.0% | 866us | 0.0% | 866us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.0% | 858us | 0.0% | 858us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12022` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 4.72s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.2% | 2.41s | 0.6% | 15.5ms | `processTicksAndRejections` | `[native code]` |
| 98.6% | 2.39s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 98.1% | 2.38s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.3% | 2.36s | 0.0% | 0us | `evaluate` | `[native code]` |
| 76.5% | 1.85s | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` |
| 31.9% | 775.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` |
| 26.2% | 637.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` |
| 25.8% | 628.7ms | 8.4% | 204.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:450` |
| 18.2% | 442.9ms | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` |
| 13.8% | 337.2ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` |
| 13.8% | 337.2ms | 0.0% | 0us | `withMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` |
| 12.9% | 314.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` |
| 12.3% | 300.7ms | 12.3% | 300.7ms | `hypot` | `[native code]` |
| 11.2% | 273.0ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` |
| 11.2% | 272.0ms | 0.0% | 0us | `finishCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` |
| 9.9% | 242.6ms | 0.0% | 0us | `sanitizeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` |
| 9.9% | 240.6ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` |
| 9.5% | 233.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` |
| 7.3% | 179.1ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:168` |
| 7.3% | 178.2ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` |
| 6.9% | 169.4ms | 6.9% | 169.4ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 6.1% | 148.2ms | 1.9% | 47.7ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` |
| 6.0% | 146.9ms | 6.0% | 146.9ms | `entries` | `[native code]` |
| 5.9% | 143.7ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:280` |
| 5.6% | 138.3ms | 5.6% | 138.3ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 5.6% | 137.6ms | 5.6% | 137.6ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 4.4% | 106.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` |
| 4.3% | 105.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` |
| 4.3% | 104.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` |
| 4.3% | 104.8ms | 4.3% | 104.8ms | `structuredClone` | `[native code]` |
| 3.9% | 95.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` |
| 3.8% | 94.1ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` |
| 3.7% | 90.8ms | 2.4% | 58.3ms | `map` | `[native code]` |
| 3.6% | 89.6ms | 3.6% | 89.6ms | `Set` | `[native code]` |
| 3.1% | 75.5ms | 1.2% | 29.8ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 3.0% | 73.6ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 2.9% | 72.3ms | 0.0% | 0us | `pruneMeshSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` |
| 2.9% | 72.3ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` |
| 2.5% | 62.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` |
| 2.5% | 62.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` |
| 2.5% | 62.5ms | 1.9% | 47.1ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 2.5% | 62.0ms | 2.5% | 62.0ms | `cloneObject` | `[native code]` |
| 2.5% | 61.7ms | 0.6% | 14.5ms | `buildBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` |
| 2.5% | 61.7ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` |
| 2.4% | 60.5ms | 0.0% | 922us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` |
| 2.3% | 57.3ms | 0.0% | 0us | `link` | `[native code]` |
| 2.3% | 56.8ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` |
| 2.0% | 49.3ms | 2.0% | 49.3ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.9% | 47.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` |
| 1.8% | 46.0ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` |
| 1.8% | 45.7ms | 1.8% | 45.7ms | `add` | `[native code]` |
| 1.6% | 40.9ms | 1.6% | 40.9ms | `indexOf` | `[native code]` |
| 1.3% | 33.6ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` |
| 1.3% | 33.2ms | 0.0% | 0us | `readMoldaDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` |
| 1.3% | 33.2ms | 0.0% | 0us | `assetFromJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` |
| 1.3% | 33.2ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` |
| 1.3% | 33.1ms | 1.3% | 33.1ms | `get` | `[native code]` |
| 1.3% | 32.6ms | 0.0% | 0us | `reduce` | `[native code]` |
| 1.3% | 32.0ms | 0.6% | 16.4ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` |
| 1.3% | 31.8ms | 0.0% | 1.0ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` |
| 1.2% | 31.5ms | 1.2% | 31.5ms | `has` | `[native code]` |
| 1.2% | 31.4ms | 0.6% | 15.7ms | `anonymous` | `[native code]` |
| 1.2% | 31.3ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:470` |
| 1.2% | 31.1ms | 1.2% | 31.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` |
| 1.2% | 30.9ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.2% | 30.9ms | 0.6% | 15.2ms | `parseModule` | `[native code]` |
| 1.2% | 30.8ms | 0.0% | 0us | `filter` | `[native code]` |
| 1.2% | 30.8ms | 0.0% | 867us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` |
| 1.2% | 30.8ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` |
| 1.2% | 30.7ms | 0.0% | 0us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:340` |
| 1.2% | 29.9ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:488` |
| 1.1% | 27.9ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` |
| 1.1% | 27.9ms | 0.0% | 0us | `newVertexKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:44` |
| 1.1% | 27.6ms | 1.1% | 27.6ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:461` |
| 1.1% | 27.3ms | 1.1% | 27.3ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 1.1% | 27.1ms | 1.1% | 27.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` |
| 0.9% | 23.9ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:212` |
| 0.7% | 18.6ms | 0.7% | 18.6ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.7% | 18.0ms | 0.0% | 0us | `newFaceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:48` |
| 0.7% | 17.4ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:462` |
| 0.7% | 17.1ms | 0.6% | 15.0ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` |
| 0.7% | 17.0ms | 0.7% | 17.0ms | `values` | `[native code]` |
| 0.7% | 17.0ms | 0.0% | 1.1ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:464` |
| 0.7% | 17.0ms | 0.7% | 17.0ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:105` |
| 0.7% | 17.0ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:19` |
| 0.6% | 16.7ms | 0.6% | 16.7ms | `sort` | `[native code]` |
| 0.6% | 16.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:93` |
| 0.6% | 16.7ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:484` |
| 0.6% | 16.6ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:220` |
| 0.6% | 16.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:129` |
| 0.6% | 16.6ms | 0.0% | 0us | `faceCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:129` |
| 0.6% | 16.6ms | 0.6% | 16.6ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 0.6% | 16.5ms | 0.0% | 0us | `some` | `[native code]` |
| 0.6% | 16.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` |
| 0.6% | 16.4ms | 0.0% | 0us | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:416` |
| 0.6% | 16.4ms | 0.6% | 16.4ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.6% | 16.3ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` |
| 0.6% | 16.1ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:172` |
| 0.6% | 16.1ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:297` |
| 0.6% | 16.0ms | 0.6% | 16.0ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:301` |
| 0.6% | 16.0ms | 0.6% | 15.2ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:265` |
| 0.6% | 16.0ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` |
| 0.6% | 16.0ms | 0.0% | 0us | `meshTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:140` |
| 0.6% | 16.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` |
| 0.6% | 16.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:196` |
| 0.6% | 16.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` |
| 0.6% | 15.9ms | 0.6% | 15.9ms | `set` | `[native code]` |
| 0.6% | 15.8ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:382` |
| 0.6% | 15.7ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:181` |
| 0.6% | 15.7ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.6% | 15.7ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.6% | 15.7ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.6% | 15.7ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.6% | 15.7ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.6% | 15.6ms | 0.6% | 15.6ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.6% | 15.5ms | 0.6% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\palette.ts:101` |
| 0.6% | 15.5ms | 0.0% | 0us | `sanitizePaletteFields` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:119` |
| 0.6% | 15.5ms | 0.0% | 0us | `sanitizeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:413` |
| 0.6% | 15.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` |
| 0.6% | 15.5ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 0.6% | 15.5ms | 0.6% | 15.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 0.6% | 15.5ms | 0.0% | 0us | `every` | `[native code]` |
| 0.6% | 15.4ms | 0.6% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:509` |
| 0.6% | 15.4ms | 0.0% | 0us | `findIndex` | `[native code]` |
| 0.6% | 15.4ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:507` |
| 0.6% | 15.4ms | 0.6% | 15.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` |
| 0.6% | 15.3ms | 0.6% | 15.3ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` |
| 0.6% | 15.2ms | 0.6% | 15.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` |
| 0.6% | 15.0ms | 0.0% | 0us | `performIteration` | `[native code]` |
| 0.6% | 15.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:205` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `next` | `[native code]` |
| 0.6% | 15.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `isMeshFaceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:27` |
| 0.6% | 15.0ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:297` |
| 0.6% | 15.0ms | 0.6% | 15.0ms | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:158` |
| 0.6% | 14.9ms | 0.6% | 14.9ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` |
| 0.6% | 14.9ms | 0.5% | 13.9ms | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` |
| 0.6% | 14.8ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:295` |
| 0.6% | 14.8ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:270` |
| 0.6% | 14.7ms | 0.6% | 14.7ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:120` |
| 0.6% | 14.7ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:23` |
| 0.6% | 14.6ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:258` |
| 0.6% | 14.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:85` |
| 0.6% | 14.6ms | 0.6% | 14.6ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:124` |
| 0.6% | 14.6ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:217` |
| 0.5% | 14.4ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` |
| 0.5% | 14.3ms | 0.5% | 14.3ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 14.3ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.5% | 14.0ms | 0.0% | 0us | `packAtlas` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:125` |
| 0.5% | 14.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:126` |
| 0.5% | 13.5ms | 0.0% | 0us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:396` |
| 0.5% | 13.1ms | 0.5% | 13.1ms | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18883` |
| 0.5% | 13.1ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` |
| 0.5% | 13.0ms | 0.5% | 13.0ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` |
| 0.5% | 12.8ms | 0.5% | 12.8ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:247` |
| 0.4% | 11.8ms | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:83` |
| 0.4% | 11.3ms | 0.4% | 11.3ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:449` |
| 0.4% | 10.9ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:454` |
| 0.2% | 5.1ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` |
| 0.1% | 2.5ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.1% | 2.5ms | 0.1% | 2.5ms | `requestInstantiate` | `[native code]` |
| 0.1% | 2.5ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 0.0% | 2.0ms | 0.0% | 0us | `addPiece` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` |
| 0.0% | 1.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` |
| 0.0% | 1.9ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` |
| 0.0% | 1.9ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `flatMap` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.0ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:145` |
| 0.0% | 1.9ms | 0.0% | 0us | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:156` |
| 0.0% | 1.9ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:468` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:101` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:483` |
| 0.0% | 1.8ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` |
| 0.0% | 1.8ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:225` |
| 0.0% | 1.7ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:276` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` |
| 0.0% | 1.7ms | 0.0% | 0us | `MeshEditOverlay` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:83` |
| 0.0% | 1.3ms | 0.0% | 1.3ms | `randomKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:36` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` |
| 0.0% | 1.0ms | 0.0% | 0us | `fitMeshToGrid` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:325` |
| 0.0% | 1.0ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:360` |
| 0.0% | 1.0ms | 0.0% | 0us | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:152` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `finishCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:415` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:467` |
| 0.0% | 992us | 0.0% | 992us | `pairKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` |
| 0.0% | 980us | 0.0% | 980us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` |
| 0.0% | 969us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` |
| 0.0% | 967us | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:489` |
| 0.0% | 967us | 0.0% | 967us | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 967us | 0.0% | 0us | `from` | `[native code]` |
| 0.0% | 967us | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:108` |
| 0.0% | 963us | 0.0% | 963us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` |
| 0.0% | 934us | 0.0% | 934us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:608` |
| 0.0% | 930us | 0.0% | 930us | `isArray` | `[native code]` |
| 0.0% | 930us | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` |
| 0.0% | 929us | 0.0% | 929us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.0% | 927us | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:385` |
| 0.0% | 927us | 0.0% | 927us | `vec3` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:205` |
| 0.0% | 925us | 0.0% | 925us | `keys` | `[native code]` |
| 0.0% | 925us | 0.0% | 0us | `PointsMaterial` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27954` |
| 0.0% | 925us | 0.0% | 0us | `Material` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:20442` |
| 0.0% | 925us | 0.0% | 925us | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2306` |
| 0.0% | 925us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:44` |
| 0.0% | 905us | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` |
| 0.0% | 903us | 0.0% | 903us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:24` |
| 0.0% | 897us | 0.0% | 897us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:270` |
| 0.0% | 896us | 0.0% | 896us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.0% | 885us | 0.0% | 885us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:399` |
| 0.0% | 883us | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:30` |
| 0.0% | 883us | 0.0% | 883us | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.0% | 879us | 0.0% | 879us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:471` |
| 0.0% | 879us | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:456` |
| 0.0% | 879us | 0.0% | 879us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:138` |
| 0.0% | 866us | 0.0% | 866us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.0% | 858us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:38` |
| 0.0% | 858us | 0.0% | 0us | `Group` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13376` |
| 0.0% | 858us | 0.0% | 858us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12022` |

## Function Details

### `hypot`
`[native code]` | Self: 12.3% (300.7ms) | Total: 12.3% (300.7ms) | Samples: 31

**Called by:**
- `meshIssues` (30)
- `triangle` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:450` | Self: 8.4% (204.0ms) | Total: 25.8% (628.7ms) | Samples: 26

**Called by:**
- `time` (49)
- `time` (25)

**Calls:**
- `hypot` (30)
- `sub` (18)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` | Self: 6.9% (169.4ms) | Total: 6.9% (169.4ms) | Samples: 18

**Called by:**
- `normalizeMesh` (11)
- `meshEdges` (6)
- `setMesh` (1)

### `entries`
`[native code]` | Self: 6.0% (146.9ms) | Total: 6.0% (146.9ms) | Samples: 21

**Called by:**
- `loopCut` (15)
- `roundMesh` (4)
- `sanitizeMesh` (1)
- `meshIssues` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` | Self: 5.6% (138.3ms) | Total: 5.6% (138.3ms) | Samples: 10

**Called by:**
- `meshEdges` (7)
- `setMesh` (2)
- `normalizeMesh` (1)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 5.6% (137.6ms) | Total: 5.6% (137.6ms) | Samples: 20

**Called by:**
- `meshIssues` (18)
- `orderQuad` (1)
- `(anonymous)` (1)

### `structuredClone`
`[native code]` | Self: 4.3% (104.8ms) | Total: 4.3% (104.8ms) | Samples: 9

**Called by:**
- `(anonymous)` (9)

### `Set`
`[native code]` | Self: 3.6% (89.6ms) | Total: 3.6% (89.6ms) | Samples: 12

**Called by:**
- `newFaceKey` (3)
- `newVertexKey` (3)
- `extrudeFaces` (2)
- `normalizeMesh` (2)
- `loopCut` (1)
- `meshEdges` (1)

### `cloneObject`
`[native code]` | Self: 2.5% (62.0ms) | Total: 2.5% (62.0ms) | Samples: 5

**Called by:**
- `loopCut` (3)
- `loopCut` (1)
- `extrudeFaces` (1)

### `map`
`[native code]` | Self: 2.4% (58.3ms) | Total: 3.7% (90.8ms) | Samples: 11

**Called by:**
- `orderQuad` (4)
- `meshEdges` (3)
- `normalizeMesh` (2)
- `orderQuad` (2)
- `normalizeMesh` (2)
- `faceGeometryIssue` (1)
- `normalizeMesh` (1)
- `pruneMeshSelection` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` | Self: 2.0% (49.3ms) | Total: 2.0% (49.3ms) | Samples: 8

**Called by:**
- `quad` (4)
- `buildMesh` (3)
- `quad` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` | Self: 1.9% (47.7ms) | Total: 6.1% (148.2ms) | Samples: 4

**Called by:**
- `time` (10)
- `time` (9)

**Calls:**
- `entries` (15)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` | Self: 1.9% (47.1ms) | Total: 2.5% (62.5ms) | Samples: 5

**Called by:**
- `time` (4)
- `time` (3)

**Calls:**
- `has` (2)

### `add`
`[native code]` | Self: 1.8% (45.7ms) | Total: 1.8% (45.7ms) | Samples: 3

**Called by:**
- `normalizeMesh` (3)

### `indexOf`
`[native code]` | Self: 1.6% (40.9ms) | Total: 1.6% (40.9ms) | Samples: 4

**Called by:**
- `(anonymous)` (3)
- `loopCut` (1)

### `get`
`[native code]` | Self: 1.3% (33.1ms) | Total: 1.3% (33.1ms) | Samples: 4

**Called by:**
- `meshIssues` (3)
- `meshIssues` (1)

### `has`
`[native code]` | Self: 1.2% (31.5ms) | Total: 1.2% (31.5ms) | Samples: 3

**Called by:**
- `loopCut` (2)
- `normalizeMesh` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` | Self: 1.2% (31.1ms) | Total: 1.2% (31.1ms) | Samples: 3

**Called by:**
- `withMesh` (2)
- `sanitizeMesh` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` | Self: 1.2% (29.8ms) | Total: 3.1% (75.5ms) | Samples: 2

**Called by:**
- `sanitizeMesh` (3)
- `withMesh` (2)

**Calls:**
- `add` (3)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:461` | Self: 1.1% (27.6ms) | Total: 1.1% (27.6ms) | Samples: 4

**Called by:**
- `time` (4)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` | Self: 1.1% (27.3ms) | Total: 1.1% (27.3ms) | Samples: 3

**Called by:**
- `setMesh` (1)
- `meshEdges` (1)
- `normalizeMesh` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` | Self: 1.1% (27.1ms) | Total: 1.1% (27.1ms) | Samples: 2

**Called by:**
- `buildMesh` (2)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` | Self: 0.7% (18.6ms) | Total: 0.7% (18.6ms) | Samples: 4

**Called by:**
- `time` (2)
- `time` (2)

### `values`
`[native code]` | Self: 0.7% (17.0ms) | Total: 0.7% (17.0ms) | Samples: 2

**Called by:**
- `meshSurfaceEdges` (1)
- `meshTriangleCount` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:105` | Self: 0.7% (17.0ms) | Total: 0.7% (17.0ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (2)

### `sort`
`[native code]` | Self: 0.6% (16.7ms) | Total: 0.6% (16.7ms) | Samples: 4

**Called by:**
- `normalizeMesh` (2)
- `packAtlas` (1)
- `normalizeMesh` (1)

### `add`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` | Self: 0.6% (16.6ms) | Total: 0.6% (16.6ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` | Self: 0.6% (16.4ms) | Total: 1.3% (32.0ms) | Samples: 2

**Called by:**
- `withMesh` (3)

**Calls:**
- `map` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.6% (16.4ms) | Total: 0.6% (16.4ms) | Samples: 1

**Called by:**
- `faceGeometryIssue` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:301` | Self: 0.6% (16.0ms) | Total: 0.6% (16.0ms) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `set`
`[native code]` | Self: 0.6% (15.9ms) | Total: 0.6% (15.9ms) | Samples: 2

**Called by:**
- `meshIssues` (2)

### `anonymous`
`[native code]` | Self: 0.6% (15.7ms) | Total: 1.2% (31.4ms) | Samples: 2

**Called by:**
- `internal:assert/assertion_error` (2)
- `loadAssertionError` (2)

**Calls:**
- `internal:assert/assertion_error` (2)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.6% (15.6ms) | Total: 0.6% (15.6ms) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.6% (15.5ms) | Total: 99.2% (2.41s) | Samples: 1

**Calls:**
- `(anonymous)` (298)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\palette.ts:101` | Self: 0.6% (15.5ms) | Total: 0.6% (15.5ms) | Samples: 1

**Called by:**
- `some` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` | Self: 0.6% (15.5ms) | Total: 0.6% (15.5ms) | Samples: 1

**Called by:**
- `every` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:509` | Self: 0.6% (15.4ms) | Total: 0.6% (15.4ms) | Samples: 1

**Called by:**
- `findIndex` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` | Self: 0.6% (15.4ms) | Total: 0.6% (15.4ms) | Samples: 1

**Called by:**
- `map` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` | Self: 0.6% (15.3ms) | Total: 0.6% (15.3ms) | Samples: 1

**Called by:**
- `quad` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` | Self: 0.6% (15.2ms) | Total: 0.6% (15.2ms) | Samples: 3

**Called by:**
- `withMesh` (2)
- `sanitizeMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` | Self: 0.6% (15.2ms) | Total: 0.6% (15.2ms) | Samples: 2

**Called by:**
- `map` (2)

### `parseModule`
`[native code]` | Self: 0.6% (15.2ms) | Total: 1.2% (30.9ms) | Samples: 2

**Called by:**
- `async (anonymous)` (4)

**Calls:**
- `node:assert` (2)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:265` | Self: 0.6% (15.2ms) | Total: 0.6% (16.0ms) | Samples: 1

**Called by:**
- `withMesh` (2)

**Calls:**
- `sort` (1)

### `next`
`[native code]` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 1

**Called by:**
- `performIteration` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` | Self: 0.6% (15.0ms) | Total: 0.7% (17.1ms) | Samples: 1

**Called by:**
- `time` (2)
- `(module)` (1)

**Calls:**
- `addPiece` (2)

### `isMeshFaceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:27` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 1

**Called by:**
- `sanitizeMesh` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:158` | Self: 0.6% (15.0ms) | Total: 0.6% (15.0ms) | Samples: 1

**Called by:**
- `time` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` | Self: 0.6% (14.9ms) | Total: 0.6% (14.9ms) | Samples: 1

**Called by:**
- `time` (1)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:120` | Self: 0.6% (14.7ms) | Total: 0.6% (14.7ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:124` | Self: 0.6% (14.6ms) | Total: 0.6% (14.6ms) | Samples: 1

**Called by:**
- `orderQuad` (1)

### `buildBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` | Self: 0.6% (14.5ms) | Total: 2.5% (61.7ms) | Samples: 1

**Called by:**
- `buildPartGeometry` (7)

**Calls:**
- `quad` (4)
- `quad` (2)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.5% (14.3ms) | Total: 0.5% (14.3ms) | Samples: 1

**Called by:**
- `link` (1)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` | Self: 0.5% (13.9ms) | Total: 0.6% (14.9ms) | Samples: 1

**Called by:**
- `meshIssues` (2)

**Calls:**
- `map` (1)

### `computeBoundingSphere`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18883` | Self: 0.5% (13.1ms) | Total: 0.5% (13.1ms) | Samples: 1

**Called by:**
- `setMesh` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` | Self: 0.5% (13.0ms) | Total: 0.5% (13.0ms) | Samples: 1

**Called by:**
- `withMesh` (1)

### `sortedKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:247` | Self: 0.5% (12.8ms) | Total: 0.5% (12.8ms) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:449` | Self: 0.4% (11.3ms) | Total: 0.4% (11.3ms) | Samples: 1

**Called by:**
- `time` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` | Self: 0.1% (2.9ms) | Total: 0.1% (2.9ms) | Samples: 3

**Called by:**
- `withMesh` (2)
- `sanitizeMesh` (1)

### `requestInstantiate`
`[native code]` | Self: 0.1% (2.5ms) | Total: 0.1% (2.5ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 2

**Called by:**
- `buildMesh` (2)

### `canonicalEdge`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:145` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `meshSurfaceEdges` (2)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:101` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `meshIssues` (2)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:483` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `time` (2)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `meshEdges` (1)
- `normalizeMesh` (1)

### `randomKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:36` | Self: 0.0% (1.3ms) | Total: 0.0% (1.3ms) | Samples: 1

**Called by:**
- `makePoints` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:464` | Self: 0.0% (1.1ms) | Total: 0.7% (17.0ms) | Samples: 1

**Called by:**
- `time` (3)

**Calls:**
- `set` (2)

### `meshBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:93` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `fitMeshToGrid` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `some` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` | Self: 0.0% (1.0ms) | Total: 1.3% (31.8ms) | Samples: 1

**Called by:**
- `withMesh` (3)
- `sanitizeMesh` (2)

**Calls:**
- `filter` (4)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:467` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `time` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:484` | Self: 0.0% (1.0ms) | Total: 0.6% (16.7ms) | Samples: 1

**Called by:**
- `time` (2)

**Calls:**
- `get` (1)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` | Self: 0.0% (1.0ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `pairKey` (1)

### `pairKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:76` | Self: 0.0% (992us) | Total: 0.0% (992us) | Samples: 1

**Called by:**
- `pointsAlong` (1)

### `positionsOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` | Self: 0.0% (980us) | Total: 0.0% (980us) | Samples: 1

**Called by:**
- `setMesh` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.0% (967us) | Total: 0.0% (967us) | Samples: 1

**Called by:**
- `from` (1)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` | Self: 0.0% (963us) | Total: 0.0% (963us) | Samples: 1

**Called by:**
- `withMesh` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:608` | Self: 0.0% (934us) | Total: 0.0% (934us) | Samples: 1

**Called by:**
- `time` (1)

### `isArray`
`[native code]` | Self: 0.0% (930us) | Total: 0.0% (930us) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` | Self: 0.0% (929us) | Total: 0.0% (929us) | Samples: 1

**Called by:**
- `buildMesh` (1)

### `vec3`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:205` | Self: 0.0% (927us) | Total: 0.0% (927us) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `keys`
`[native code]` | Self: 0.0% (925us) | Total: 0.0% (925us) | Samples: 1

**Called by:**
- `extrudeFaces` (1)

### `generateUUID`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2306` | Self: 0.0% (925us) | Total: 0.0% (925us) | Samples: 1

**Called by:**
- `Material` (1)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` | Self: 0.0% (922us) | Total: 2.4% (60.5ms) | Samples: 1

**Called by:**
- `buildPartGeometry` (10)

**Calls:**
- `triangle` (3)
- `triangle` (2)
- `triangle` (2)
- `triangle` (1)
- `triangle` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:24` | Self: 0.0% (903us) | Total: 0.0% (903us) | Samples: 1

**Called by:**
- `buildMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:270` | Self: 0.0% (897us) | Total: 0.0% (897us) | Samples: 1

**Called by:**
- `map` (1)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `time` (1)

### `makePoints`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:399` | Self: 0.0% (885us) | Total: 0.0% (885us) | Samples: 1

**Called by:**
- `loopCut` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.0% (883us) | Total: 0.0% (883us) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:471` | Self: 0.0% (879us) | Total: 0.0% (879us) | Samples: 1

**Called by:**
- `time` (1)

### `positionsOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:138` | Self: 0.0% (879us) | Total: 0.0% (879us) | Samples: 1

**Called by:**
- `setMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:268` | Self: 0.0% (867us) | Total: 1.2% (30.8ms) | Samples: 1

**Called by:**
- `filter` (4)

**Calls:**
- `indexOf` (3)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` | Self: 0.0% (866us) | Total: 0.0% (866us) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12022` | Self: 0.0% (858us) | Total: 0.0% (858us) | Samples: 1

**Called by:**
- `Group` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:205` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `performIteration` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:181` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `time` (2)

**Calls:**
- `newVertexKey` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` | Self: 0.0% (0us) | Total: 3.9% (95.0ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `time` (13)
- `time` (3)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:297` | Self: 0.0% (0us) | Total: 0.6% (16.1ms) | Samples: 0

**Called by:**
- `withMesh` (1)

**Calls:**
- `has` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `get` (2)

**Calls:**
- `anonymous` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` | Self: 0.0% (0us) | Total: 11.2% (273.0ms) | Samples: 0

**Called by:**
- `time` (28)

**Calls:**
- `finishCut` (27)
- `finishCut` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:454` | Self: 0.0% (0us) | Total: 0.4% (10.9ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `indexOf` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` | Self: 0.0% (0us) | Total: 0.5% (14.4ms) | Samples: 0

**Called by:**
- `time` (3)

**Calls:**
- `makePoints` (2)
- `makePoints` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:468` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `time` (2)

**Calls:**
- `faceVertices` (2)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:340` | Self: 0.0% (0us) | Total: 1.2% (30.7ms) | Samples: 0

**Called by:**
- `withMesh` (3)
- `sanitizeMesh` (1)

**Calls:**
- `entries` (4)

### `sanitizePaletteFields`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:119` | Self: 0.0% (0us) | Total: 0.6% (15.5ms) | Samples: 0

**Called by:**
- `sanitizeModel` (1)

**Calls:**
- `some` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` | Self: 0.0% (0us) | Total: 31.9% (775.6ms) | Samples: 0

**Called by:**
- `evaluate` (101)

**Calls:**
- `time` (71)
- `time` (30)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:462` | Self: 0.0% (0us) | Total: 0.7% (17.4ms) | Samples: 0

**Called by:**
- `time` (2)
- `time` (1)

**Calls:**
- `get` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` | Self: 0.0% (0us) | Total: 12.9% (314.1ms) | Samples: 0

**Called by:**
- `evaluate` (33)

**Calls:**
- `time` (28)
- `time` (5)

### `performIteration`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `extrudeFaces` (1)

**Calls:**
- `next` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 2.3% (57.3ms) | Samples: 0

**Called by:**
- `link` (3)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (3)
- `moduleDeclarationInstantiation` (1)

### `MeshEditOverlay`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:83` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `meshTriangleCount`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:140` | Self: 0.0% (0us) | Total: 0.6% (16.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `values` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `flatMap` (2)

**Calls:**
- `(anonymous)` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` | Self: 0.0% (0us) | Total: 2.5% (62.6ms) | Samples: 0

**Called by:**
- `evaluate` (8)

**Calls:**
- `time` (6)
- `time` (2)

### `PointsMaterial`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:27954` | Self: 0.0% (0us) | Total: 0.0% (925us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Material` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (4.72s) | Samples: 0

**Called by:**
- `moduleEvaluation` (295)
- `async loadAndEvaluateModule` (295)

**Calls:**
- `evaluate` (295)
- `moduleEvaluation` (295)

### `sanitizeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:413` | Self: 0.0% (0us) | Total: 0.6% (15.5ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `sanitizePaletteFields` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` | Self: 0.0% (0us) | Total: 0.6% (16.0ms) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `meshTriangleCount` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` | Self: 0.0% (0us) | Total: 13.8% (337.2ms) | Samples: 0

**Called by:**
- `finishCut` (20)
- `time` (13)
- `time` (11)
- `(module)` (1)

**Calls:**
- `withMesh` (45)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:44` | Self: 0.0% (0us) | Total: 0.0% (925us) | Samples: 0

**Called by:**
- `MeshEditOverlay` (1)

**Calls:**
- `PointsMaterial` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:297` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `isMeshFaceKey` (1)

### `packAtlas`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:125` | Self: 0.0% (0us) | Total: 0.5% (14.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `sort` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:156` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `meshEdges` (2)

**Calls:**
- `canonicalEdge` (2)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` | Self: 0.0% (0us) | Total: 9.9% (240.6ms) | Samples: 0

**Called by:**
- `sanitizeModel` (26)

**Calls:**
- `sanitizeMesh` (21)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:172` | Self: 0.0% (0us) | Total: 0.6% (16.1ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `cloneObject` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:258` | Self: 0.0% (0us) | Total: 0.6% (14.6ms) | Samples: 0

**Called by:**
- `sanitizeMesh` (2)
- `withMesh` (1)

**Calls:**
- `sort` (2)
- `sortedKeys` (1)

### `flatMap`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` | Self: 0.0% (0us) | Total: 0.6% (15.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `time` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:280` | Self: 0.0% (0us) | Total: 5.9% (143.7ms) | Samples: 0

**Called by:**
- `withMesh` (12)
- `sanitizeMesh` (4)

**Calls:**
- `meshSurfaceEdges` (11)
- `Set` (2)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (5.1ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `pruneMeshSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` | Self: 0.0% (0us) | Total: 2.9% (72.3ms) | Samples: 0

**Called by:**
- `finish` (7)

**Calls:**
- `meshEdges` (4)
- `meshEdges` (2)
- `map` (1)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:416` | Self: 0.0% (0us) | Total: 0.6% (16.4ms) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `faceVertices` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:489` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `Set` (1)

### `Group`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13376` | Self: 0.0% (0us) | Total: 0.0% (858us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Object3D` (1)

### `addPiece`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `newFaceKey` (2)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` | Self: 0.0% (0us) | Total: 0.6% (16.3ms) | Samples: 0

**Called by:**
- `buildBox` (2)

**Calls:**
- `triangle` (1)
- `triangle` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` | Self: 0.0% (0us) | Total: 1.9% (47.2ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `time` (3)
- `time` (1)

### `findIndex`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (15.4ms) | Samples: 0

**Called by:**
- `loopCut` (1)

**Calls:**
- `(anonymous)` (1)

### `some`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (16.5ms) | Samples: 0

**Called by:**
- `finishCut` (1)
- `sanitizePaletteFields` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` | Self: 0.0% (0us) | Total: 1.8% (46.0ms) | Samples: 0

**Called by:**
- `time` (4)
- `time` (1)

**Calls:**
- `meshEdges` (4)
- `meshEdges` (1)

### `newFaceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:48` | Self: 0.0% (0us) | Total: 0.7% (18.0ms) | Samples: 0

**Called by:**
- `addPiece` (2)
- `extrudeFaces` (1)

**Calls:**
- `Set` (3)

### `withMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` | Self: 0.0% (0us) | Total: 13.8% (337.2ms) | Samples: 0

**Called by:**
- `finish` (45)

**Calls:**
- `normalizeMesh` (12)
- `normalizeMesh` (5)
- `roundMesh` (3)
- `normalizeMesh` (3)
- `normalizeMesh` (3)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `roundMesh` (1)
- `normalizeMesh` (1)

### `finishCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:415` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `loopCut` (1)

**Calls:**
- `some` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` | Self: 0.0% (0us) | Total: 4.3% (104.8ms) | Samples: 0

**Called by:**
- `time` (8)
- `time` (1)

**Calls:**
- `structuredClone` (9)

### `fitMeshToGrid`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:325` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `meshBox` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:276` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `withMesh` (2)

**Calls:**
- `map` (2)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:108` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `from` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` | Self: 0.0% (0us) | Total: 3.0% (73.6ms) | Samples: 0

**Called by:**
- `sanitizeMesh` (6)
- `withMesh` (5)

**Calls:**
- `orderQuad` (4)
- `orderQuad` (2)
- `orderQuad` (2)
- `orderQuad` (1)
- `orderQuad` (1)
- `orderQuad` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `time` (1)
- `time` (1)

**Calls:**
- `MeshEditOverlay` (2)

### `Material`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:20442` | Self: 0.0% (0us) | Total: 0.0% (925us) | Samples: 0

**Called by:**
- `PointsMaterial` (1)

**Calls:**
- `generateUUID` (1)

### `reduce`
`[native code]` | Self: 0.0% (0us) | Total: 1.3% (32.6ms) | Samples: 0

**Called by:**
- `faceCenter` (2)
- `finish` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 98.6% (2.39s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (298)

**Calls:**
- `async loadAndEvaluateModule` (296)
- `async (anonymous)` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.2% (30.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `parseModule` (4)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:38` | Self: 0.0% (0us) | Total: 0.0% (858us) | Samples: 0

**Called by:**
- `MeshEditOverlay` (1)

**Calls:**
- `Group` (1)

### `newVertexKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:44` | Self: 0.0% (0us) | Total: 1.1% (27.9ms) | Samples: 0

**Called by:**
- `extrudeFaces` (2)
- `makePoints` (1)

**Calls:**
- `Set` (3)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` | Self: 0.0% (0us) | Total: 0.6% (16.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `reduce` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` | Self: 0.0% (0us) | Total: 0.6% (15.5ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `every` (1)

### `faceCenter`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:129` | Self: 0.0% (0us) | Total: 0.6% (16.6ms) | Samples: 0

**Called by:**
- `orderQuad` (2)

**Calls:**
- `reduce` (2)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `assign` (2)

**Calls:**
- `loadAssertionError` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:23` | Self: 0.0% (0us) | Total: 0.6% (14.7ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `faceNormal` (1)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:360` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `sanitizeModel` (1)

**Calls:**
- `fitMeshToGrid` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` | Self: 0.0% (0us) | Total: 2.5% (61.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `buildBox` (7)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:456` | Self: 0.0% (0us) | Total: 0.0% (879us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `entries` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:295` | Self: 0.0% (0us) | Total: 0.6% (14.8ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `entries` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:225` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `normalizeMesh` (2)

**Calls:**
- `map` (2)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` | Self: 0.0% (0us) | Total: 1.3% (33.6ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (5)

**Calls:**
- `meshFaceFrame` (2)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)

### `readMoldaDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` | Self: 0.0% (0us) | Total: 1.3% (33.2ms) | Samples: 0

**Called by:**
- `assetFromJson` (4)

**Calls:**
- `sanitizeModel` (4)

### `assetFromJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` | Self: 0.0% (0us) | Total: 1.3% (33.2ms) | Samples: 0

**Called by:**
- `(module)` (2)
- `(module)` (2)

**Calls:**
- `readMoldaDocument` (4)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:217` | Self: 0.0% (0us) | Total: 0.6% (14.6ms) | Samples: 0

**Called by:**
- `normalizeMesh` (1)

**Calls:**
- `faceNormal` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` | Self: 0.0% (0us) | Total: 2.9% (72.3ms) | Samples: 0

**Called by:**
- `finishCut` (7)

**Calls:**
- `pruneMeshSelection` (7)

### `makePoints`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:396` | Self: 0.0% (0us) | Total: 0.5% (13.5ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `randomKey` (1)
- `newVertexKey` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:152` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `setMesh` (1)

**Calls:**
- `values` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (14.3ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:30` | Self: 0.0% (0us) | Total: 0.0% (883us) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `normalize` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` | Self: 0.0% (0us) | Total: 4.3% (105.1ms) | Samples: 0

**Called by:**
- `time` (9)
- `time` (5)

**Calls:**
- `setMesh` (6)
- `setMesh` (5)
- `setMesh` (2)
- `setMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `sub` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:220` | Self: 0.0% (0us) | Total: 0.6% (16.6ms) | Samples: 0

**Called by:**
- `normalizeMesh` (2)

**Calls:**
- `faceCenter` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` | Self: 0.0% (0us) | Total: 2.5% (62.6ms) | Samples: 0

**Called by:**
- `time` (6)
- `time` (2)

**Calls:**
- `buildPartGeometry` (7)
- `build` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (2)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `positionsOf` (1)
- `positionsOf` (1)

### `filter`
`[native code]` | Self: 0.0% (0us) | Total: 1.2% (30.8ms) | Samples: 0

**Called by:**
- `normalizeMesh` (4)

**Calls:**
- `(anonymous)` (4)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `build` (1)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:19` | Self: 0.0% (0us) | Total: 0.7% (17.0ms) | Samples: 0

**Called by:**
- `buildMesh` (2)

**Calls:**
- `faceVertices` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `time` (2)

**Calls:**
- `flatMap` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:382` | Self: 0.0% (0us) | Total: 0.6% (15.8ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `cloneObject` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:126` | Self: 0.0% (0us) | Total: 0.5% (14.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `time` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` | Self: 0.0% (0us) | Total: 0.6% (16.0ms) | Samples: 0

**Called by:**
- `time` (2)
- `time` (1)

**Calls:**
- `Set` (2)
- `keys` (1)

### `finishCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` | Self: 0.0% (0us) | Total: 11.2% (272.0ms) | Samples: 0

**Called by:**
- `loopCut` (27)

**Calls:**
- `finish` (20)
- `finish` (7)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:470` | Self: 0.0% (0us) | Total: 1.2% (31.3ms) | Samples: 0

**Called by:**
- `time` (2)
- `time` (1)

**Calls:**
- `faceGeometryIssue` (2)
- `faceGeometryIssue` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:196` | Self: 0.0% (0us) | Total: 0.6% (16.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `newFaceKey` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:93` | Self: 0.0% (0us) | Total: 0.6% (16.7ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `assetFromJson` (2)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` | Self: 0.0% (0us) | Total: 0.0% (905us) | Samples: 0

**Called by:**
- `normalizeMesh` (1)

**Calls:**
- `sub` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` | Self: 0.0% (0us) | Total: 26.2% (637.5ms) | Samples: 0

**Called by:**
- `evaluate` (75)

**Calls:**
- `time` (59)
- `time` (16)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 98.1% (2.38s) | Samples: 0

**Called by:**
- `(anonymous)` (296)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (295)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:385` | Self: 0.0% (0us) | Total: 0.0% (927us) | Samples: 0

**Called by:**
- `sanitizeModel` (1)

**Calls:**
- `vec3` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (2)

**Calls:**
- `pointsAlong` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:507` | Self: 0.0% (0us) | Total: 0.6% (15.4ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `findIndex` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.6% (15.7ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `assign` (2)

### `every`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (15.5ms) | Samples: 0

**Called by:**
- `sanitizeMesh` (1)

**Calls:**
- `(anonymous)` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` | Self: 0.0% (0us) | Total: 18.2% (442.9ms) | Samples: 0

**Called by:**
- `(module)` (30)
- `(module)` (16)
- `(module)` (14)
- `(module)` (6)
- `(module)` (5)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)

**Calls:**
- `meshIssues` (25)
- `finish` (11)
- `loopCut` (9)
- `(anonymous)` (5)
- `sanitizeModel` (4)
- `loopCut` (3)
- `extrudeFaces` (2)
- `meshIssues` (2)
- `(anonymous)` (2)
- `buildPartGeometry` (2)
- `build` (1)
- `loopCut` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `loopCut` (1)
- `finish` (1)
- `meshEdges` (1)
- `(anonymous)` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `(anonymous)` (1)
- `meshIssues` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` | Self: 0.0% (0us) | Total: 0.5% (13.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `computeBoundingSphere` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` | Self: 0.0% (0us) | Total: 2.3% (56.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `meshEdges` (5)
- `meshEdges` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:488` | Self: 0.0% (0us) | Total: 1.2% (29.9ms) | Samples: 0

**Called by:**
- `time` (2)
- `time` (1)

**Calls:**
- `cloneObject` (3)

### `sanitizeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` | Self: 0.0% (0us) | Total: 9.9% (242.6ms) | Samples: 0

**Called by:**
- `time` (20)
- `readMoldaDocument` (4)
- `time` (4)

**Calls:**
- `sanitizePart` (26)
- `sanitizePart` (1)
- `sanitizePart` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:85` | Self: 0.0% (0us) | Total: 0.6% (14.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `finish` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (2.5ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` | Self: 0.0% (0us) | Total: 3.8% (94.1ms) | Samples: 0

**Called by:**
- `time` (13)
- `time` (2)

**Calls:**
- `buildMesh` (10)
- `buildMesh` (5)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` | Self: 0.0% (0us) | Total: 0.0% (930us) | Samples: 0

**Called by:**
- `withMesh` (1)

**Calls:**
- `isArray` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` | Self: 0.0% (0us) | Total: 7.3% (178.2ms) | Samples: 0

**Called by:**
- `sanitizePart` (21)

**Calls:**
- `normalizeMesh` (6)
- `normalizeMesh` (4)
- `normalizeMesh` (3)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `roundMesh` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` | Self: 0.0% (0us) | Total: 76.5% (1.85s) | Samples: 0

**Called by:**
- `(module)` (71)
- `(module)` (59)
- `(module)` (28)
- `(module)` (20)
- `(module)` (13)
- `(module)` (10)
- `(module)` (6)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `meshIssues` (49)
- `loopCut` (28)
- `sanitizeModel` (20)
- `finish` (13)
- `buildPartGeometry` (13)
- `loopCut` (10)
- `(anonymous)` (9)
- `(anonymous)` (8)
- `(anonymous)` (6)
- `loopCut` (4)
- `meshIssues` (4)
- `loopCut` (4)
- `meshIssues` (3)
- `meshEdges` (3)
- `loopCut` (3)
- `loopCut` (2)
- `meshIssues` (2)
- `meshIssues` (2)
- `extrudeFaces` (2)
- `loopCut` (2)
- `meshIssues` (2)
- `meshIssues` (2)
- `meshIssues` (2)
- `meshIssues` (2)
- `loopCut` (2)
- `loopCut` (1)
- `meshIssues` (1)
- `loopCut` (1)
- `sanitizeModel` (1)
- `meshIssues` (1)
- `extrudeFaces` (1)
- `extrudeFaces` (1)
- `extrudeFaces` (1)
- `loopCut` (1)
- `(anonymous)` (1)
- `meshIssues` (1)
- `extrudeFaces` (1)
- `packAtlas` (1)
- `extrudeFaces` (1)
- `loopCut` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` | Self: 0.0% (0us) | Total: 1.3% (33.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `meshSurfaceEdges` (2)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:270` | Self: 0.0% (0us) | Total: 0.6% (14.8ms) | Samples: 0

**Called by:**
- `withMesh` (2)

**Calls:**
- `map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` | Self: 0.0% (0us) | Total: 0.6% (16.5ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `assetFromJson` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` | Self: 0.0% (0us) | Total: 9.5% (233.0ms) | Samples: 0

**Called by:**
- `evaluate` (34)

**Calls:**
- `time` (20)
- `time` (14)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` | Self: 0.0% (0us) | Total: 1.2% (30.8ms) | Samples: 0

**Called by:**
- `buildBox` (4)

**Calls:**
- `triangle` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` | Self: 0.0% (0us) | Total: 0.6% (15.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `loopCut` (1)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` | Self: 0.0% (0us) | Total: 1.1% (27.9ms) | Samples: 0

**Called by:**
- `pruneMeshSelection` (2)
- `loopCut` (1)
- `setMesh` (1)

**Calls:**
- `map` (3)
- `Set` (1)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:168` | Self: 0.0% (0us) | Total: 7.3% (179.1ms) | Samples: 0

**Called by:**
- `setMesh` (5)
- `loopCut` (4)
- `pruneMeshSelection` (4)
- `time` (3)
- `time` (1)

**Calls:**
- `meshSurfaceEdges` (7)
- `meshSurfaceEdges` (6)
- `meshSurfaceEdges` (2)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` | Self: 0.0% (0us) | Total: 4.4% (106.9ms) | Samples: 0

**Called by:**
- `evaluate` (16)

**Calls:**
- `time` (10)
- `time` (6)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:212` | Self: 0.0% (0us) | Total: 0.9% (23.9ms) | Samples: 0

**Called by:**
- `normalizeMesh` (4)

**Calls:**
- `map` (4)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.3% (2.36s) | Samples: 0

**Called by:**
- `moduleEvaluation` (295)

**Calls:**
- `(module)` (101)
- `(module)` (75)
- `(module)` (34)
- `(module)` (33)
- `(module)` (16)
- `(module)` (16)
- `(module)` (8)
- `(module)` (4)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:83` | Self: 0.0% (0us) | Total: 0.4% (11.8ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `hypot` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:129` | Self: 0.0% (0us) | Total: 0.6% (16.6ms) | Samples: 0

**Called by:**
- `reduce` (2)

**Calls:**
- `add` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 43.0% | 1.04s | `[native code]` |
| 36.0% | 874.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 6.6% | 160.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 6.3% | 155.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 4.5% | 111.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 1.3% | 33.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 0.6% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\palette.ts` |
| 0.6% | 15.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts` |
| 0.6% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts` |
| 0.0% | 903us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts` |
