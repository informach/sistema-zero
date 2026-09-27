# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.61s | 227 | 1.0ms | 225 |

**Top 10:** `Set` 9.5%, `structuredClone` 9.2%, `meshSurfaceEdges` 7.7%, `entries` 5.7%, `sort` 4.6%, `add` 3.7%, `triangle` 2.8%, `filter` 2.8%, `hypot` 2.0%, `indexOf` 1.9%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 9.5% | 153.9ms | 9.5% | 153.9ms | `Set` | `[native code]` |
| 9.2% | 149.0ms | 9.2% | 149.0ms | `structuredClone` | `[native code]` |
| 7.7% | 125.1ms | 7.7% | 125.1ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 5.7% | 93.4ms | 5.7% | 93.4ms | `entries` | `[native code]` |
| 4.6% | 75.1ms | 4.7% | 76.1ms | `sort` | `[native code]` |
| 3.7% | 59.9ms | 3.7% | 59.9ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 2.8% | 46.4ms | 2.8% | 46.4ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 2.8% | 45.4ms | 5.0% | 81.9ms | `filter` | `[native code]` |
| 2.0% | 32.4ms | 2.0% | 32.4ms | `hypot` | `[native code]` |
| 1.9% | 31.2ms | 1.9% | 31.2ms | `indexOf` | `[native code]` |
| 1.9% | 30.7ms | 1.9% | 30.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 1.8% | 30.5ms | 1.8% | 30.5ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.7% | 28.2ms | 1.7% | 28.2ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 1.7% | 28.1ms | 1.7% | 28.1ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` |
| 1.7% | 28.1ms | 1.7% | 28.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 1.4% | 23.2ms | 6.1% | 98.7ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` |
| 1.0% | 17.1ms | 1.0% | 17.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` |
| 1.0% | 17.0ms | 1.0% | 17.0ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` |
| 1.0% | 16.9ms | 1.9% | 32.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 1.0% | 16.3ms | 1.0% | 16.3ms | `get` | `[native code]` |
| 1.0% | 16.2ms | 1.0% | 16.2ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `shift` | `internal:fixed_queue:44` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.9% | 15.9ms | 0.9% | 15.9ms | `meshTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` |
| 0.9% | 15.7ms | 0.9% | 15.7ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.9% | 15.6ms | 0.9% | 15.6ms | `GeometryBuilder` | `[native code]` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `min` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5358` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:381` |
| 0.9% | 15.3ms | 0.9% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.9% | 15.3ms | 7.3% | 119.4ms | `map` | `[native code]` |
| 0.9% | 15.2ms | 0.9% | 15.2ms | `has` | `[native code]` |
| 0.9% | 15.1ms | 0.9% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:122` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:297` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `flat` | `[native code]` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:485` |
| 0.9% | 14.9ms | 1.8% | 29.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:227` |
| 0.9% | 14.6ms | 0.9% | 14.6ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` |
| 0.8% | 14.4ms | 5.5% | 89.1ms | `reduce` | `[native code]` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.8% | 14.1ms | 0.9% | 15.0ms | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` |
| 0.8% | 13.9ms | 0.8% | 13.9ms | `modelTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` |
| 0.8% | 13.8ms | 1.7% | 28.0ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 0.8% | 13.7ms | 0.8% | 13.7ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` |
| 0.8% | 13.7ms | 0.8% | 13.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:58` |
| 0.8% | 13.6ms | 1.8% | 30.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` |
| 0.8% | 13.5ms | 0.8% | 13.5ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:13` |
| 0.8% | 13.1ms | 0.8% | 13.1ms | `defineProperty` | `[native code]` |
| 0.8% | 13.1ms | 0.8% | 13.1ms | `min` | `[native code]` |
| 0.6% | 10.9ms | 0.6% | 10.9ms | `file` | `[native code]` |
| 0.2% | 4.3ms | 0.2% | 4.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` |
| 0.1% | 2.7ms | 0.1% | 2.7ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 0.1% | 2.6ms | 2.5% | 40.4ms | `anonymous` | `[native code]` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `values` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` |
| 0.0% | 1.1ms | 0.1% | 2.0ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.0ms | 0.9% | 15.0ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:31` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:548` |
| 0.0% | 1.0ms | 0.1% | 2.0ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:454` |
| 0.0% | 1.0ms | 2.0% | 32.8ms | `every` | `[native code]` |
| 0.0% | 1.0ms | 1.0% | 17.7ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:223` |
| 0.0% | 1.0ms | 0.8% | 14.1ms | `forEach` | `[native code]` |
| 0.0% | 1.0ms | 2.9% | 47.4ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `performIteration` | `[native code]` |
| 0.0% | 995us | 0.0% | 995us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` |
| 0.0% | 994us | 0.0% | 994us | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` |
| 0.0% | 982us | 0.0% | 982us | `keys` | `[native code]` |
| 0.0% | 968us | 0.0% | 968us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:273` |
| 0.0% | 967us | 0.0% | 967us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:23` |
| 0.0% | 959us | 0.0% | 959us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:116` |
| 0.0% | 939us | 0.0% | 939us | `defineProperties` | `[native code]` |
| 0.0% | 932us | 0.0% | 932us | `node:assert` | `node:assert:182` |
| 0.0% | 930us | 0.0% | 930us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.0% | 930us | 2.0% | 33.4ms | `flatIntoArrayWithCallback` | `[native code]` |
| 0.0% | 912us | 0.0% | 912us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` |
| 0.0% | 905us | 0.0% | 905us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` |
| 0.0% | 902us | 0.0% | 902us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:460` |
| 0.0% | 884us | 0.0% | 884us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` |
| 0.0% | 871us | 0.1% | 1.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:298` |
| 0.0% | 866us | 0.0% | 866us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` |
| 0.0% | 861us | 0.0% | 861us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.0% | 861us | 0.0% | 861us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 0.0% | 825us | 0.1% | 1.7ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 3.10s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 98.2% | 1.58s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 97.9% | 1.58s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 97.2% | 1.56s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 96.2% | 1.55s | 0.0% | 0us | `evaluate` | `[native code]` |
| 74.1% | 1.19s | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` |
| 33.0% | 533.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` |
| 19.2% | 310.6ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` |
| 19.1% | 309.6ms | 0.0% | 0us | `withMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` |
| 18.3% | 296.3ms | 0.0% | 0us | `time` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` |
| 17.4% | 281.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` |
| 14.4% | 233.5ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` |
| 14.4% | 233.5ms | 0.0% | 0us | `finishCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` |
| 11.5% | 185.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` |
| 11.2% | 182.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` |
| 10.9% | 176.8ms | 0.0% | 0us | `sanitizeModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` |
| 10.9% | 176.8ms | 0.0% | 0us | `sanitizePart` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` |
| 9.5% | 153.9ms | 9.5% | 153.9ms | `Set` | `[native code]` |
| 9.2% | 149.0ms | 9.2% | 149.0ms | `structuredClone` | `[native code]` |
| 8.3% | 135.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` |
| 7.7% | 125.1ms | 7.7% | 125.1ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` |
| 7.3% | 119.4ms | 0.9% | 15.3ms | `map` | `[native code]` |
| 6.7% | 109.1ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` |
| 6.2% | 100.7ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` |
| 6.1% | 98.7ms | 1.4% | 23.2ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` |
| 5.9% | 95.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` |
| 5.8% | 94.8ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` |
| 5.7% | 93.4ms | 5.7% | 93.4ms | `entries` | `[native code]` |
| 5.7% | 93.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` |
| 5.7% | 92.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` |
| 5.6% | 91.5ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` |
| 5.5% | 89.1ms | 0.8% | 14.4ms | `reduce` | `[native code]` |
| 5.0% | 81.9ms | 2.8% | 45.4ms | `filter` | `[native code]` |
| 4.8% | 77.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` |
| 4.8% | 77.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` |
| 4.7% | 76.3ms | 0.0% | 0us | `pruneMeshSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` |
| 4.7% | 76.3ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` |
| 4.7% | 76.1ms | 4.6% | 75.1ms | `sort` | `[native code]` |
| 4.6% | 75.1ms | 0.0% | 0us | `link` | `[native code]` |
| 4.5% | 73.2ms | 0.0% | 0us | `faceCenter` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` |
| 4.2% | 69.0ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` |
| 4.2% | 68.1ms | 0.0% | 0us | `meshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` |
| 3.9% | 64.0ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` |
| 3.8% | 62.2ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` |
| 3.8% | 62.2ms | 0.0% | 0us | `buildBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` |
| 3.7% | 59.9ms | 3.7% | 59.9ms | `add` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` |
| 3.6% | 59.6ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` |
| 3.5% | 57.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` |
| 2.9% | 47.4ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 2.9% | 47.4ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` |
| 2.8% | 46.4ms | 2.8% | 46.4ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 2.7% | 44.6ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` |
| 2.7% | 44.1ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` |
| 2.7% | 44.1ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:463` |
| 2.6% | 43.4ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:445` |
| 2.6% | 43.3ms | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:226` |
| 2.5% | 40.4ms | 0.1% | 2.6ms | `anonymous` | `[native code]` |
| 2.0% | 33.4ms | 0.0% | 930us | `flatIntoArrayWithCallback` | `[native code]` |
| 2.0% | 33.4ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` |
| 2.0% | 33.2ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` |
| 2.0% | 33.0ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` |
| 2.0% | 32.8ms | 0.0% | 1.0ms | `every` | `[native code]` |
| 2.0% | 32.4ms | 2.0% | 32.4ms | `hypot` | `[native code]` |
| 1.9% | 32.1ms | 1.0% | 16.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` |
| 1.9% | 31.2ms | 1.9% | 31.2ms | `indexOf` | `[native code]` |
| 1.9% | 31.2ms | 0.0% | 0us | `assetFromJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` |
| 1.9% | 31.2ms | 0.0% | 0us | `readMoldaDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` |
| 1.9% | 30.8ms | 0.0% | 0us | `newFaceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:49` |
| 1.9% | 30.8ms | 0.0% | 0us | `addPiece` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` |
| 1.9% | 30.8ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` |
| 1.9% | 30.7ms | 1.9% | 30.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 1.9% | 30.7ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` |
| 1.8% | 30.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` |
| 1.8% | 30.6ms | 0.8% | 13.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` |
| 1.8% | 30.5ms | 1.8% | 30.5ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 1.8% | 29.9ms | 0.9% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:227` |
| 1.8% | 29.9ms | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` |
| 1.8% | 29.2ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` |
| 1.7% | 29.0ms | 0.0% | 0us | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` |
| 1.7% | 28.7ms | 0.0% | 0us | `parseModule` | `[native code]` |
| 1.7% | 28.7ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 1.7% | 28.2ms | 1.7% | 28.2ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` |
| 1.7% | 28.1ms | 1.7% | 28.1ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` |
| 1.7% | 28.1ms | 1.7% | 28.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 1.7% | 28.1ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` |
| 1.7% | 28.0ms | 0.8% | 13.8ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` |
| 1.1% | 17.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` |
| 1.0% | 17.7ms | 0.0% | 1.0ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:223` |
| 1.0% | 17.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` |
| 1.0% | 17.1ms | 1.0% | 17.1ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` |
| 1.0% | 17.0ms | 0.0% | 0us | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` |
| 1.0% | 17.0ms | 1.0% | 17.0ms | `canonicalEdge` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` |
| 1.0% | 16.6ms | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` |
| 1.0% | 16.3ms | 1.0% | 16.3ms | `get` | `[native code]` |
| 1.0% | 16.2ms | 1.0% | 16.2ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 0.9% | 16.1ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:454` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `shift` | `internal:fixed_queue:44` |
| 0.9% | 16.0ms | 0.0% | 0us | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:295` |
| 0.9% | 16.0ms | 0.9% | 15.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` |
| 0.9% | 16.0ms | 0.9% | 16.0ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` |
| 0.9% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` |
| 0.9% | 15.9ms | 0.9% | 15.9ms | `meshTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` |
| 0.9% | 15.8ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` |
| 0.9% | 15.7ms | 0.9% | 15.7ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` |
| 0.9% | 15.6ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:272` |
| 0.9% | 15.6ms | 0.9% | 15.6ms | `GeometryBuilder` | `[native code]` |
| 0.9% | 15.5ms | 0.0% | 0us | `setFromBufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` |
| 0.9% | 15.5ms | 0.0% | 0us | `computeBoundingSphere` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18842` |
| 0.9% | 15.5ms | 0.0% | 0us | `expandByPoint` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15905` |
| 0.9% | 15.5ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `min` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5358` |
| 0.9% | 15.5ms | 0.9% | 15.5ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:381` |
| 0.9% | 15.4ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` |
| 0.9% | 15.3ms | 0.9% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.9% | 15.2ms | 0.9% | 15.2ms | `has` | `[native code]` |
| 0.9% | 15.1ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:383` |
| 0.9% | 15.1ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` |
| 0.9% | 15.0ms | 0.8% | 14.1ms | `faceGeometryIssue` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `faceNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:122` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:297` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.9% | 15.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.9% | 15.0ms | 0.9% | 15.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.9% | 15.0ms | 0.0% | 1.0ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:31` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `flat` | `[native code]` |
| 0.9% | 14.9ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:120` |
| 0.9% | 14.9ms | 0.9% | 14.9ms | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:485` |
| 0.9% | 14.9ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:515` |
| 0.9% | 14.6ms | 0.9% | 14.6ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` |
| 0.8% | 14.2ms | 0.8% | 14.2ms | `sanitizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` |
| 0.8% | 14.1ms | 0.0% | 0us | `makeSafe` | `internal:primordials:30` |
| 0.8% | 14.1ms | 0.0% | 0us | `bound call` | `[native code]` |
| 0.8% | 14.1ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:78` |
| 0.8% | 14.1ms | 0.0% | 1.0ms | `forEach` | `[native code]` |
| 0.8% | 14.1ms | 0.0% | 0us | `node:assert` | `node:assert:2` |
| 0.8% | 14.0ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:23` |
| 0.8% | 14.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:170` |
| 0.8% | 13.9ms | 0.8% | 13.9ms | `modelTriangleCount` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` |
| 0.8% | 13.7ms | 0.8% | 13.7ms | `sortedKeys` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` |
| 0.8% | 13.7ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:255` |
| 0.8% | 13.7ms | 0.8% | 13.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:58` |
| 0.8% | 13.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` |
| 0.8% | 13.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` |
| 0.8% | 13.5ms | 0.0% | 0us | `makePoints` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:396` |
| 0.8% | 13.5ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` |
| 0.8% | 13.5ms | 0.0% | 0us | `newVertexKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:45` |
| 0.8% | 13.5ms | 0.8% | 13.5ms | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:13` |
| 0.8% | 13.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:93` |
| 0.8% | 13.1ms | 0.0% | 0us | `(anonymous)` | `internal:primordials:44` |
| 0.8% | 13.1ms | 0.8% | 13.1ms | `defineProperty` | `[native code]` |
| 0.8% | 13.1ms | 0.8% | 13.1ms | `min` | `[native code]` |
| 0.8% | 13.1ms | 0.0% | 0us | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:14` |
| 0.7% | 12.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:85` |
| 0.7% | 11.8ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.7% | 11.8ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.7% | 11.8ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.7% | 11.8ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.7% | 11.8ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.6% | 10.9ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.6% | 10.9ms | 0.0% | 0us | `WriteStream` | `internal:fs/streams:244` |
| 0.6% | 10.9ms | 0.6% | 10.9ms | `file` | `[native code]` |
| 0.6% | 10.9ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.4% | 6.4ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` |
| 0.2% | 4.3ms | 0.0% | 0us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:125` |
| 0.2% | 4.3ms | 0.2% | 4.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` |
| 0.1% | 2.7ms | 0.1% | 2.7ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` |
| 0.1% | 2.0ms | 0.0% | 1.0ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` |
| 0.1% | 2.0ms | 0.0% | 1.1ms | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` |
| 0.1% | 2.0ms | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.1% | 1.9ms | 0.0% | 0us | `buildMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:253` |
| 0.1% | 1.9ms | 0.0% | 871us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:298` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `values` | `[native code]` |
| 0.1% | 1.8ms | 0.0% | 0us | `flatMap` | `[native code]` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `meshSurfaceEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` |
| 0.1% | 1.7ms | 0.0% | 0us | `node:assert` | `node:assert:12` |
| 0.1% | 1.7ms | 0.0% | 825us | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.0% | 1.2ms | 0.0% | 0us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:461` |
| 0.0% | 1.2ms | 0.0% | 1.2ms | `faceVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` |
| 0.0% | 1.0ms | 0.0% | 0us | `from` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `extrudeFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` |
| 0.0% | 1.0ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:47` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:548` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:454` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` |
| 0.0% | 1.0ms | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:601` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `performIteration` | `[native code]` |
| 0.0% | 996us | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:218` |
| 0.0% | 995us | 0.0% | 995us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` |
| 0.0% | 994us | 0.0% | 994us | `pointsAlong` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` |
| 0.0% | 982us | 0.0% | 982us | `keys` | `[native code]` |
| 0.0% | 968us | 0.0% | 968us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:273` |
| 0.0% | 968us | 0.0% | 0us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:273` |
| 0.0% | 967us | 0.0% | 0us | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:23` |
| 0.0% | 967us | 0.0% | 967us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:23` |
| 0.0% | 959us | 0.0% | 959us | `setMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:116` |
| 0.0% | 949us | 0.0% | 0us | `faceUvToPoint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:105` |
| 0.0% | 949us | 0.0% | 0us | `quad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:98` |
| 0.0% | 948us | 0.0% | 0us | `meshBox` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:90` |
| 0.0% | 948us | 0.0% | 0us | `withMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:50` |
| 0.0% | 940us | 0.0% | 0us | `loopCut` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` |
| 0.0% | 939us | 0.0% | 0us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11848` |
| 0.0% | 939us | 0.0% | 0us | `Points` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:28071` |
| 0.0% | 939us | 0.0% | 939us | `defineProperties` | `[native code]` |
| 0.0% | 939us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` |
| 0.0% | 939us | 0.0% | 0us | `MeshEditOverlay` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:84` |
| 0.0% | 932us | 0.0% | 932us | `node:assert` | `node:assert:182` |
| 0.0% | 930us | 0.0% | 930us | `roundMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 0.0% | 912us | 0.0% | 912us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` |
| 0.0% | 905us | 0.0% | 905us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` |
| 0.0% | 902us | 0.0% | 902us | `meshIssues` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:460` |
| 0.0% | 884us | 0.0% | 884us | `positionsOf` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` |
| 0.0% | 866us | 0.0% | 866us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` |
| 0.0% | 861us | 0.0% | 861us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 0.0% | 861us | 0.0% | 861us | `normalizeMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` |
| 0.0% | 843us | 0.0% | 0us | `overlappingVertices` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:6` |
| 0.0% | 837us | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 0.0% | 825us | 0.0% | 0us | `orderQuad` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:224` |

## Function Details

### `Set`
`[native code]` | Self: 9.5% (153.9ms) | Total: 9.5% (153.9ms) | Samples: 20

**Called by:**
- `meshEdges` (9)
- `normalizeMesh` (4)
- `newFaceKey` (2)
- `extrudeFaces` (1)
- `loopCut` (1)
- `pruneMeshSelection` (1)
- `extrudeFaces` (1)
- `newVertexKey` (1)

### `structuredClone`
`[native code]` | Self: 9.2% (149.0ms) | Total: 9.2% (149.0ms) | Samples: 18

**Called by:**
- `(anonymous)` (17)
- `(anonymous)` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:159` | Self: 7.7% (125.1ms) | Total: 7.7% (125.1ms) | Samples: 18

**Called by:**
- `meshEdges` (9)
- `normalizeMesh` (6)
- `setMesh` (3)

### `entries`
`[native code]` | Self: 5.7% (93.4ms) | Total: 5.7% (93.4ms) | Samples: 11

**Called by:**
- `loopCut` (8)
- `sanitizeMesh` (1)
- `overlappingVertices` (1)
- `roundMesh` (1)

### `sort`
`[native code]` | Self: 4.6% (75.1ms) | Total: 4.7% (76.1ms) | Samples: 7

**Called by:**
- `normalizeMesh` (5)
- `normalizeMesh` (2)
- `overlappingVertices` (1)

**Calls:**
- `(anonymous)` (1)

### `add`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:26` | Self: 3.7% (59.9ms) | Total: 3.7% (59.9ms) | Samples: 9

**Called by:**
- `(anonymous)` (7)
- `meshFaceFrame` (1)
- `faceUvToPoint` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` | Self: 2.8% (46.4ms) | Total: 2.8% (46.4ms) | Samples: 4

**Called by:**
- `buildMesh` (2)
- `quad` (1)
- `quad` (1)

### `filter`
`[native code]` | Self: 2.8% (45.4ms) | Total: 5.0% (81.9ms) | Samples: 6

**Called by:**
- `normalizeMesh` (6)
- `meshIssues` (3)
- `setMesh` (1)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (1)

### `hypot`
`[native code]` | Self: 2.0% (32.4ms) | Total: 2.0% (32.4ms) | Samples: 5

**Called by:**
- `orderQuad` (2)
- `overlappingVertices` (1)
- `normalize` (1)
- `normalizeMesh` (1)

### `indexOf`
`[native code]` | Self: 1.9% (31.2ms) | Total: 1.9% (31.2ms) | Samples: 3

**Called by:**
- `loopCut` (2)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` | Self: 1.9% (30.7ms) | Total: 1.9% (30.7ms) | Samples: 2

**Called by:**
- `every` (2)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` | Self: 1.8% (30.5ms) | Total: 1.8% (30.5ms) | Samples: 3

**Called by:**
- `buildMesh` (1)
- `quad` (1)
- `quad` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:160` | Self: 1.7% (28.2ms) | Total: 1.7% (28.2ms) | Samples: 4

**Called by:**
- `normalizeMesh` (3)
- `setMesh` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:476` | Self: 1.7% (28.1ms) | Total: 1.7% (28.1ms) | Samples: 2

**Called by:**
- `time` (1)
- `time` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` | Self: 1.7% (28.1ms) | Total: 1.7% (28.1ms) | Samples: 2

**Called by:**
- `map` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:452` | Self: 1.4% (23.2ms) | Total: 6.1% (98.7ms) | Samples: 8

**Called by:**
- `time` (14)
- `time` (2)

**Calls:**
- `entries` (8)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:262` | Self: 1.0% (17.1ms) | Total: 1.0% (17.1ms) | Samples: 2

**Called by:**
- `withMesh` (1)
- `sanitizeMesh` (1)

### `canonicalEdge`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:146` | Self: 1.0% (17.0ms) | Total: 1.0% (17.0ms) | Samples: 2

**Called by:**
- `meshSurfaceEdges` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` | Self: 1.0% (16.9ms) | Total: 1.9% (32.1ms) | Samples: 2

**Called by:**
- `filter` (3)

**Calls:**
- `indexOf` (1)

### `get`
`[native code]` | Self: 1.0% (16.3ms) | Total: 1.0% (16.3ms) | Samples: 2

**Called by:**
- `meshIssues` (2)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` | Self: 1.0% (16.2ms) | Total: 1.0% (16.2ms) | Samples: 2

**Called by:**
- `buildMesh` (1)
- `quad` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` | Self: 0.9% (16.0ms) | Total: 0.9% (16.0ms) | Samples: 3

**Called by:**
- `buildMesh` (2)
- `quad` (1)

### `shift`
`internal:fixed_queue:44` | Self: 0.9% (16.0ms) | Total: 0.9% (16.0ms) | Samples: 1

**Called by:**
- `processTicksAndRejections` (1)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:482` | Self: 0.9% (16.0ms) | Total: 0.9% (16.0ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `meshTriangleCount`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:141` | Self: 0.9% (15.9ms) | Total: 0.9% (15.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:457` | Self: 0.9% (15.7ms) | Total: 0.9% (15.7ms) | Samples: 2

**Called by:**
- `time` (2)

### `GeometryBuilder`
`[native code]` | Self: 0.9% (15.6ms) | Total: 0.9% (15.6ms) | Samples: 1

**Called by:**
- `buildPartGeometry` (1)

### `min`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:5358` | Self: 0.9% (15.5ms) | Total: 0.9% (15.5ms) | Samples: 1

**Called by:**
- `expandByPoint` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:381` | Self: 0.9% (15.5ms) | Total: 0.9% (15.5ms) | Samples: 1

**Called by:**
- `time` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.9% (15.3ms) | Total: 0.9% (15.3ms) | Samples: 2

**Called by:**
- `reduce` (1)
- `map` (1)

### `map`
`[native code]` | Self: 0.9% (15.3ms) | Total: 7.3% (119.4ms) | Samples: 4

**Called by:**
- `orderQuad` (4)
- `normalizeMesh` (2)
- `meshEdges` (2)
- `normalizeMesh` (1)
- `faceGeometryIssue` (1)
- `normalizeMesh` (1)
- `buildMesh` (1)
- `normalizeMesh` (1)
- `orderQuad` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `has`
`[native code]` | Self: 0.9% (15.2ms) | Total: 0.9% (15.2ms) | Samples: 3

**Called by:**
- `loopCut` (2)
- `normalizeMesh` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:90` | Self: 0.9% (15.1ms) | Total: 0.9% (16.0ms) | Samples: 1

**Called by:**
- `buildMesh` (2)

**Calls:**
- `normalize` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `map` (1)

### `faceNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:122` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (1)
- `orderQuad` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:297` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.9% (15.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `link` (1)

### `positionsOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:134` | Self: 0.9% (14.9ms) | Total: 0.9% (14.9ms) | Samples: 1

**Called by:**
- `setMesh` (1)

### `flat`
`[native code]` | Self: 0.9% (14.9ms) | Total: 0.9% (14.9ms) | Samples: 1

**Called by:**
- `setMesh` (1)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:485` | Self: 0.9% (14.9ms) | Total: 0.9% (14.9ms) | Samples: 1

**Called by:**
- `loopCut` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:227` | Self: 0.9% (14.9ms) | Total: 1.8% (29.9ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `sub` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:543` | Self: 0.9% (14.6ms) | Total: 0.9% (14.6ms) | Samples: 1

**Called by:**
- `time` (1)

### `reduce`
`[native code]` | Self: 0.8% (14.4ms) | Total: 5.5% (89.1ms) | Samples: 1

**Called by:**
- `faceCenter` (9)
- `finish` (1)

**Calls:**
- `(anonymous)` (7)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:290` | Self: 0.8% (14.2ms) | Total: 0.8% (14.2ms) | Samples: 1

**Called by:**
- `sanitizePart` (1)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` | Self: 0.8% (14.1ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `meshIssues` (2)

**Calls:**
- `map` (1)

### `modelTriangleCount`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` | Self: 0.8% (13.9ms) | Total: 0.8% (13.9ms) | Samples: 1

**Called by:**
- `finish` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:453` | Self: 0.8% (13.8ms) | Total: 1.7% (28.0ms) | Samples: 3

**Called by:**
- `time` (3)
- `time` (2)

**Calls:**
- `has` (2)

### `sortedKeys`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:248` | Self: 0.8% (13.7ms) | Total: 0.8% (13.7ms) | Samples: 1

**Called by:**
- `normalizeMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:58` | Self: 0.8% (13.7ms) | Total: 0.8% (13.7ms) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:547` | Self: 0.8% (13.6ms) | Total: 1.8% (30.6ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (4)

**Calls:**
- `pointsAlong` (2)
- `pointsAlong` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:13` | Self: 0.8% (13.5ms) | Total: 0.8% (13.5ms) | Samples: 1

**Called by:**
- `meshIssues` (1)

### `defineProperty`
`[native code]` | Self: 0.8% (13.1ms) | Total: 0.8% (13.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `min`
`[native code]` | Self: 0.8% (13.1ms) | Total: 0.8% (13.1ms) | Samples: 1

**Called by:**
- `overlappingVertices` (1)

### `file`
`[native code]` | Self: 0.6% (10.9ms) | Total: 0.6% (10.9ms) | Samples: 1

**Called by:**
- `WriteStream` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:126` | Self: 0.2% (4.3ms) | Total: 0.2% (4.3ms) | Samples: 1

**Called by:**
- `filter` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:158` | Self: 0.1% (2.7ms) | Total: 0.1% (2.7ms) | Samples: 3

**Called by:**
- `meshEdges` (2)
- `setMesh` (1)

### `anonymous`
`[native code]` | Self: 0.1% (2.6ms) | Total: 2.5% (40.4ms) | Samples: 3

**Called by:**
- `internal:assert/assertion_error` (2)
- `node:assert` (2)
- `node:assert` (2)
- `loadAssertionError` (2)
- `internal:validators` (1)

**Calls:**
- `internal:assert/assertion_error` (2)
- `internal:primordials` (2)
- `internal:util/colors` (1)
- `internal:validators` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.1% (1.9ms) | Total: 0.1% (1.9ms) | Samples: 2

**Called by:**
- `buildMesh` (2)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:260` | Self: 0.1% (1.9ms) | Total: 0.1% (1.9ms) | Samples: 2

**Called by:**
- `withMesh` (1)
- `sanitizeMesh` (1)

### `values`
`[native code]` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 2

**Called by:**
- `meshBox` (1)
- `loopCut` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:161` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 2

**Called by:**
- `meshEdges` (1)
- `normalizeMesh` (1)

### `faceVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:102` | Self: 0.0% (1.2ms) | Total: 0.0% (1.2ms) | Samples: 1

**Called by:**
- `meshIssues` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:213` | Self: 0.0% (1.1ms) | Total: 0.1% (2.0ms) | Samples: 1

**Called by:**
- `normalizeMesh` (2)

**Calls:**
- `map` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:501` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `time` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `from` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:31` | Self: 0.0% (1.0ms) | Total: 0.9% (15.0ms) | Samples: 1

**Called by:**
- `meshIssues` (2)

**Calls:**
- `hypot` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:548` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:341` | Self: 0.0% (1.0ms) | Total: 0.1% (2.0ms) | Samples: 1

**Called by:**
- `withMesh` (1)
- `sanitizeMesh` (1)

**Calls:**
- `entries` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:454` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `time` (1)

### `every`
`[native code]` | Self: 0.0% (1.0ms) | Total: 2.0% (32.8ms) | Samples: 1

**Called by:**
- `normalizeMesh` (2)
- `sanitizeMesh` (2)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:223` | Self: 0.0% (1.0ms) | Total: 1.0% (17.7ms) | Samples: 1

**Called by:**
- `normalizeMesh` (3)

**Calls:**
- `hypot` (2)

### `forEach`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.8% (14.1ms) | Samples: 1

**Called by:**
- `bound call` (2)

**Calls:**
- `(anonymous)` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:477` | Self: 0.0% (1.0ms) | Total: 2.9% (47.4ms) | Samples: 1

**Called by:**
- `time` (5)
- `time` (1)

**Calls:**
- `filter` (3)
- `get` (2)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:342` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sanitizeMesh` (1)

### `performIteration`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `loopCut` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` | Self: 0.0% (995us) | Total: 0.0% (995us) | Samples: 1

**Called by:**
- `every` (1)

### `pointsAlong`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:483` | Self: 0.0% (994us) | Total: 0.0% (994us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `keys`
`[native code]` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:273` | Self: 0.0% (968us) | Total: 0.0% (968us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:23` | Self: 0.0% (967us) | Total: 0.0% (967us) | Samples: 1

**Called by:**
- `sort` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:116` | Self: 0.0% (959us) | Total: 0.0% (959us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `defineProperties`
`[native code]` | Self: 0.0% (939us) | Total: 0.0% (939us) | Samples: 1

**Called by:**
- `Object3D` (1)

### `node:assert`
`node:assert:182` | Self: 0.0% (932us) | Total: 0.0% (932us) | Samples: 1

**Called by:**
- `parseModule` (1)

### `roundMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` | Self: 0.0% (930us) | Total: 0.0% (930us) | Samples: 1

**Called by:**
- `sanitizeMesh` (1)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (930us) | Total: 2.0% (33.4ms) | Samples: 1

**Called by:**
- `loopCut` (5)
- `flatMap` (2)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:267` | Self: 0.0% (912us) | Total: 0.0% (912us) | Samples: 1

**Called by:**
- `withMesh` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:423` | Self: 0.0% (905us) | Total: 0.0% (905us) | Samples: 1

**Called by:**
- `map` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:460` | Self: 0.0% (902us) | Total: 0.0% (902us) | Samples: 1

**Called by:**
- `time` (1)

### `positionsOf`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:136` | Self: 0.0% (884us) | Total: 0.0% (884us) | Samples: 1

**Called by:**
- `setMesh` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:298` | Self: 0.0% (871us) | Total: 0.1% (1.9ms) | Samples: 1

**Called by:**
- `withMesh` (2)

**Calls:**
- `has` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` | Self: 0.0% (866us) | Total: 0.0% (866us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:278` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `sanitizeMesh` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.0% (825us) | Total: 0.1% (1.7ms) | Samples: 1

**Called by:**
- `triangle` (1)
- `orderQuad` (1)

**Calls:**
- `hypot` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:521` | Self: 0.0% (0us) | Total: 1.9% (30.8ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `time` (1)

**Calls:**
- `addPiece` (2)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:253` | Self: 0.0% (0us) | Total: 0.1% (1.9ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (2)

**Calls:**
- `faceVertices` (2)

### `sanitizeModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:424` | Self: 0.0% (0us) | Total: 10.9% (176.8ms) | Samples: 0

**Called by:**
- `time` (19)
- `readMoldaDocument` (5)
- `time` (4)

**Calls:**
- `sanitizePart` (28)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:255` | Self: 0.0% (0us) | Total: 0.8% (13.7ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (1)

**Calls:**
- `map` (1)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:170` | Self: 0.0% (0us) | Total: 4.2% (69.0ms) | Samples: 0

**Called by:**
- `setMesh` (3)
- `loopCut` (3)
- `pruneMeshSelection` (3)
- `time` (2)

**Calls:**
- `Set` (9)
- `map` (2)

### `faceUvToPoint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\frame.ts:105` | Self: 0.0% (0us) | Total: 0.0% (949us) | Samples: 0

**Called by:**
- `quad` (1)

**Calls:**
- `add` (1)

### `WriteStream`
`internal:fs/streams:244` | Self: 0.0% (0us) | Total: 0.6% (10.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `file` (1)

### `MeshEditOverlay`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:84` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `Points` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:95` | Self: 0.0% (0us) | Total: 5.9% (95.8ms) | Samples: 0

**Called by:**
- `evaluate` (14)

**Calls:**
- `time` (11)
- `time` (3)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:170` | Self: 0.0% (0us) | Total: 0.8% (14.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `Set` (1)

### `buildBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:124` | Self: 0.0% (0us) | Total: 3.8% (62.2ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (7)

**Calls:**
- `quad` (4)
- `quad` (2)
- `quad` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.7% (11.8ms) | Samples: 0

**Called by:**
- `get` (2)

**Calls:**
- `anonymous` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:603` | Self: 0.0% (0us) | Total: 14.4% (233.5ms) | Samples: 0

**Called by:**
- `time` (31)
- `time` (3)

**Calls:**
- `finishCut` (34)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:454` | Self: 0.0% (0us) | Total: 0.9% (16.1ms) | Samples: 0

**Called by:**
- `time` (2)

**Calls:**
- `indexOf` (2)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:477` | Self: 0.0% (0us) | Total: 0.8% (13.5ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `makePoints` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:98` | Self: 0.0% (0us) | Total: 17.4% (281.0ms) | Samples: 0

**Called by:**
- `evaluate` (40)

**Calls:**
- `time` (34)
- `time` (6)

### `node:assert`
`node:assert:2` | Self: 0.0% (0us) | Total: 0.8% (14.1ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `anonymous` (2)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.7% (11.8ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 4.6% (75.1ms) | Samples: 0

**Called by:**
- `link` (4)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (4)
- `moduleDeclarationInstantiation` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:601` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `performIteration` (1)

### `bound call`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (14.1ms) | Samples: 0

**Called by:**
- `makeSafe` (2)

**Calls:**
- `forEach` (2)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:98` | Self: 0.0% (0us) | Total: 0.0% (949us) | Samples: 0

**Called by:**
- `buildBox` (1)

**Calls:**
- `faceUvToPoint` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:123` | Self: 0.0% (0us) | Total: 4.8% (77.9ms) | Samples: 0

**Called by:**
- `evaluate` (8)

**Calls:**
- `time` (7)
- `time` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:259` | Self: 0.0% (0us) | Total: 3.6% (59.6ms) | Samples: 0

**Called by:**
- `withMesh` (4)
- `sanitizeMesh` (1)

**Calls:**
- `sort` (5)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (3.10s) | Samples: 0

**Called by:**
- `moduleEvaluation` (218)
- `async loadAndEvaluateModule` (218)

**Calls:**
- `evaluate` (218)
- `moduleEvaluation` (218)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:68` | Self: 0.0% (0us) | Total: 0.9% (15.9ms) | Samples: 0

**Called by:**
- `reduce` (1)

**Calls:**
- `meshTriangleCount` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:132` | Self: 0.0% (0us) | Total: 19.2% (310.6ms) | Samples: 0

**Called by:**
- `finishCut` (22)
- `time` (18)
- `time` (4)
- `(module)` (1)

**Calls:**
- `withMesh` (44)
- `withMesh` (1)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:101` | Self: 0.0% (0us) | Total: 1.0% (16.6ms) | Samples: 0

**Called by:**
- `buildBox` (2)

**Calls:**
- `triangle` (1)
- `triangle` (1)

### `withMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:50` | Self: 0.0% (0us) | Total: 0.0% (948us) | Samples: 0

**Called by:**
- `finish` (1)

**Calls:**
- `meshBox` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:218` | Self: 0.0% (0us) | Total: 0.0% (996us) | Samples: 0

**Called by:**
- `normalizeMesh` (1)

**Calls:**
- `faceNormal` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:23` | Self: 0.0% (0us) | Total: 0.0% (967us) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `sort` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:96` | Self: 0.0% (0us) | Total: 11.2% (182.1ms) | Samples: 0

**Called by:**
- `evaluate` (23)

**Calls:**
- `time` (17)
- `time` (6)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:107` | Self: 0.0% (0us) | Total: 11.5% (185.8ms) | Samples: 0

**Called by:**
- `evaluate` (26)

**Calls:**
- `time` (21)
- `time` (5)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:266` | Self: 0.0% (0us) | Total: 1.8% (29.2ms) | Samples: 0

**Called by:**
- `withMesh` (3)

**Calls:**
- `sort` (2)
- `sortedKeys` (1)

### `faceCenter`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` | Self: 0.0% (0us) | Total: 4.5% (73.2ms) | Samples: 0

**Called by:**
- `orderQuad` (7)
- `faceGeometryIssue` (2)

**Calls:**
- `reduce` (9)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:287` | Self: 0.0% (0us) | Total: 5.8% (94.8ms) | Samples: 0

**Called by:**
- `time` (10)
- `time` (3)

**Calls:**
- `buildMesh` (8)
- `buildMesh` (2)
- `buildMesh` (2)
- `buildMesh` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:445` | Self: 0.0% (0us) | Total: 2.6% (43.4ms) | Samples: 0

**Called by:**
- `time` (4)
- `time` (2)

**Calls:**
- `overlappingVertices` (2)
- `overlappingVertices` (1)
- `overlappingVertices` (1)
- `overlappingVertices` (1)
- `overlappingVertices` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:43` | Self: 0.0% (0us) | Total: 18.3% (296.3ms) | Samples: 0

**Called by:**
- `(module)` (15)
- `(module)` (6)
- `(module)` (6)
- `(module)` (5)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `finish` (4)
- `sanitizeModel` (4)
- `loopCut` (3)
- `buildPartGeometry` (3)
- `loopCut` (3)
- `loopCut` (2)
- `loopCut` (2)
- `meshIssues` (2)
- `(anonymous)` (2)
- `loopCut` (2)
- `meshIssues` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `meshIssues` (1)
- `(anonymous)` (1)
- `finish` (1)
- `meshIssues` (1)
- `loopCut` (1)
- `loopCut` (1)
- `(anonymous)` (1)

### `meshSurfaceEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:157` | Self: 0.0% (0us) | Total: 1.0% (17.0ms) | Samples: 0

**Called by:**
- `meshEdges` (1)
- `normalizeMesh` (1)

**Calls:**
- `canonicalEdge` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:85` | Self: 0.0% (0us) | Total: 0.7% (12.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `finish` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 97.2% (1.56s) | Samples: 0

**Called by:**
- `(anonymous)` (219)

**Calls:**
- `moduleEvaluation` (218)
- `linkAndEvaluateModule` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:93` | Self: 0.0% (0us) | Total: 0.8% (13.4ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `assetFromJson` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:515` | Self: 0.0% (0us) | Total: 0.9% (14.9ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `pointsAlong` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:99` | Self: 0.0% (0us) | Total: 8.3% (135.4ms) | Samples: 0

**Called by:**
- `time` (15)
- `time` (2)

**Calls:**
- `structuredClone` (17)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:269` | Self: 0.0% (0us) | Total: 2.9% (47.4ms) | Samples: 0

**Called by:**
- `withMesh` (3)
- `sanitizeMesh` (3)

**Calls:**
- `filter` (6)

### `withMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshOps.ts:49` | Self: 0.0% (0us) | Total: 19.1% (309.6ms) | Samples: 0

**Called by:**
- `finish` (44)

**Calls:**
- `normalizeMesh` (12)
- `normalizeMesh` (11)
- `normalizeMesh` (4)
- `normalizeMesh` (3)
- `normalizeMesh` (3)
- `normalizeMesh` (2)
- `normalizeMesh` (2)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `roundMesh` (1)
- `normalizeMesh` (1)

### `flatMap`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.8ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:271` | Self: 0.0% (0us) | Total: 1.7% (28.1ms) | Samples: 0

**Called by:**
- `withMesh` (1)
- `sanitizeMesh` (1)

**Calls:**
- `map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:97` | Self: 0.0% (0us) | Total: 1.8% (30.6ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `time` (2)

### `expandByPoint`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15905` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `setFromBufferAttribute` (1)

**Calls:**
- `min` (1)

### `addPiece`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:493` | Self: 0.0% (0us) | Total: 1.9% (30.8ms) | Samples: 0

**Called by:**
- `loopCut` (2)

**Calls:**
- `newFaceKey` (2)

### `internal:primordials`
`internal:primordials:78` | Self: 0.0% (0us) | Total: 0.8% (14.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `makeSafe` (2)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 97.9% (1.58s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (219)
- `refresh` (1)

**Calls:**
- `async loadAndEvaluateModule` (219)
- `WriteStream` (1)

### `makeSafe`
`internal:primordials:30` | Self: 0.0% (0us) | Total: 0.8% (14.1ms) | Samples: 0

**Called by:**
- `internal:primordials` (2)

**Calls:**
- `bound call` (2)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:272` | Self: 0.0% (0us) | Total: 0.9% (15.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `GeometryBuilder` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 1.7% (28.7ms) | Samples: 0

**Calls:**
- `parseModule` (7)

### `parseModule`
`[native code]` | Self: 0.0% (0us) | Total: 1.7% (28.7ms) | Samples: 0

**Called by:**
- `async (anonymous)` (7)

**Calls:**
- `node:assert` (2)
- `node:assert` (2)
- `node:assert` (2)
- `node:assert` (1)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:136` | Self: 0.0% (0us) | Total: 1.8% (29.9ms) | Samples: 0

**Called by:**
- `time` (1)
- `time` (1)

**Calls:**
- `modelTriangleCount` (1)
- `reduce` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:383` | Self: 0.0% (0us) | Total: 0.9% (15.1ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `Set` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:226` | Self: 0.0% (0us) | Total: 2.6% (43.3ms) | Samples: 0

**Called by:**
- `normalizeMesh` (4)

**Calls:**
- `map` (4)

### `faceGeometryIssue`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:422` | Self: 0.0% (0us) | Total: 1.7% (29.0ms) | Samples: 0

**Called by:**
- `meshIssues` (2)

**Calls:**
- `faceCenter` (2)

### `quad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:102` | Self: 0.0% (0us) | Total: 2.7% (44.6ms) | Samples: 0

**Called by:**
- `buildBox` (4)

**Calls:**
- `triangle` (1)
- `triangle` (1)
- `triangle` (1)
- `triangle` (1)

### `newVertexKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:45` | Self: 0.0% (0us) | Total: 0.8% (13.5ms) | Samples: 0

**Called by:**
- `makePoints` (1)

**Calls:**
- `Set` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:23` | Self: 0.0% (0us) | Total: 0.8% (14.0ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `faceNormal` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:261` | Self: 0.0% (0us) | Total: 0.1% (2.0ms) | Samples: 0

**Called by:**
- `withMesh` (1)
- `sanitizeMesh` (1)

**Calls:**
- `every` (2)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:295` | Self: 0.0% (0us) | Total: 0.9% (16.0ms) | Samples: 0

**Called by:**
- `sanitizePart` (1)

**Calls:**
- `entries` (1)

### `node:assert`
`node:assert:12` | Self: 0.0% (0us) | Total: 0.1% (1.7ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `anonymous` (2)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:143` | Self: 0.0% (0us) | Total: 4.7% (76.3ms) | Samples: 0

**Called by:**
- `finishCut` (12)

**Calls:**
- `pruneMeshSelection` (12)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:252` | Self: 0.0% (0us) | Total: 0.9% (15.1ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (2)

**Calls:**
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:375` | Self: 0.0% (0us) | Total: 2.0% (33.2ms) | Samples: 0

**Called by:**
- `time` (4)

**Calls:**
- `meshEdges` (3)
- `meshEdges` (1)

### `pruneMeshSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshSelection.ts:75` | Self: 0.0% (0us) | Total: 4.7% (76.3ms) | Samples: 0

**Called by:**
- `finish` (12)

**Calls:**
- `meshEdges` (8)
- `meshEdges` (3)
- `Set` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (15.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:104` | Self: 0.0% (0us) | Total: 5.7% (92.1ms) | Samples: 0

**Called by:**
- `time` (18)
- `time` (1)

**Calls:**
- `setMesh` (7)
- `setMesh` (5)
- `setMesh` (2)
- `setMesh` (1)
- `setMesh` (1)
- `keys` (1)
- `setMesh` (1)
- `setMesh` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:125` | Self: 0.0% (0us) | Total: 0.2% (4.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `filter` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (11.8ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:103` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `MeshEditOverlay` (1)

### `meshBox`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:90` | Self: 0.0% (0us) | Total: 0.0% (948us) | Samples: 0

**Called by:**
- `withMesh` (1)

**Calls:**
- `values` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:151` | Self: 0.0% (0us) | Total: 0.9% (15.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `positionsOf` (1)
- `positionsOf` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:6` | Self: 0.0% (0us) | Total: 0.0% (843us) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `entries` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:120` | Self: 0.0% (0us) | Total: 0.9% (14.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `flat` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:463` | Self: 0.0% (0us) | Total: 2.7% (44.1ms) | Samples: 0

**Called by:**
- `time` (3)
- `time` (1)

**Calls:**
- `faceGeometryIssue` (2)
- `faceGeometryIssue` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` | Self: 0.0% (0us) | Total: 0.8% (13.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `time` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:11848` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `Points` (1)

**Calls:**
- `defineProperties` (1)

### `newFaceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:49` | Self: 0.0% (0us) | Total: 1.9% (30.8ms) | Samples: 0

**Called by:**
- `addPiece` (2)

**Calls:**
- `Set` (2)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:277` | Self: 0.0% (0us) | Total: 0.9% (15.4ms) | Samples: 0

**Called by:**
- `withMesh` (2)

**Calls:**
- `hypot` (1)
- `map` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:272` | Self: 0.0% (0us) | Total: 6.7% (109.1ms) | Samples: 0

**Called by:**
- `withMesh` (11)
- `sanitizeMesh` (7)

**Calls:**
- `orderQuad` (7)
- `orderQuad` (4)
- `orderQuad` (3)
- `orderQuad` (2)
- `orderQuad` (1)
- `orderQuad` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:545` | Self: 0.0% (0us) | Total: 2.0% (33.4ms) | Samples: 0

**Called by:**
- `time` (3)
- `(module)` (2)
- `time` (2)

**Calls:**
- `flatIntoArrayWithCallback` (5)
- `flatMap` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts:47` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `buildMesh` (1)

**Calls:**
- `add` (1)

### `extrudeFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:169` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `Set` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.7% (11.8ms) | Samples: 0

**Called by:**
- `assign` (2)

**Calls:**
- `loadAssertionError` (2)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:275` | Self: 0.0% (0us) | Total: 3.8% (62.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `buildBox` (7)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 0.0% (837us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `finishCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:420` | Self: 0.0% (0us) | Total: 14.4% (233.5ms) | Samples: 0

**Called by:**
- `loopCut` (34)

**Calls:**
- `finish` (22)
- `finish` (12)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.6% (10.9ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `computeBoundingSphere`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18842` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `setMesh` (1)

**Calls:**
- `setFromBufferAttribute` (1)

### `setFromBufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:15752` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `computeBoundingSphere` (1)

**Calls:**
- `expandByPoint` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:221` | Self: 0.0% (0us) | Total: 2.7% (44.1ms) | Samples: 0

**Called by:**
- `normalizeMesh` (7)

**Calls:**
- `faceCenter` (7)

### `Points`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:28071` | Self: 0.0% (0us) | Total: 0.0% (939us) | Samples: 0

**Called by:**
- `MeshEditOverlay` (1)

**Calls:**
- `Object3D` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:108` | Self: 0.0% (0us) | Total: 33.0% (533.4ms) | Samples: 0

**Called by:**
- `evaluate` (75)

**Calls:**
- `time` (60)
- `time` (15)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 98.2% (1.58s) | Samples: 0

**Calls:**
- `(anonymous)` (219)
- `shift` (1)

### `sanitizePart`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:358` | Self: 0.0% (0us) | Total: 10.9% (176.8ms) | Samples: 0

**Called by:**
- `sanitizeModel` (28)

**Calls:**
- `sanitizeMesh` (23)
- `sanitizeMesh` (2)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)
- `sanitizeMesh` (1)

### `overlappingVertices`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts:14` | Self: 0.0% (0us) | Total: 0.8% (13.1ms) | Samples: 0

**Called by:**
- `meshIssues` (1)

**Calls:**
- `min` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.7% (11.8ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `assign` (2)

### `assetFromJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` | Self: 0.0% (0us) | Total: 1.9% (31.2ms) | Samples: 0

**Called by:**
- `(module)` (4)
- `(module)` (1)

**Calls:**
- `readMoldaDocument` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:130` | Self: 0.0% (0us) | Total: 3.5% (57.9ms) | Samples: 0

**Called by:**
- `reduce` (7)

**Calls:**
- `add` (7)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:188` | Self: 0.0% (0us) | Total: 0.9% (15.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `computeBoundingSphere` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:146` | Self: 0.0% (0us) | Total: 0.4% (6.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (7)

**Calls:**
- `meshEdges` (4)
- `meshEdges` (3)

### `buildMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:257` | Self: 0.0% (0us) | Total: 3.9% (64.0ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (8)

**Calls:**
- `triangle` (2)
- `triangle` (2)
- `triangle` (2)
- `triangle` (1)
- `triangle` (1)

### `makePoints`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:396` | Self: 0.0% (0us) | Total: 0.8% (13.5ms) | Samples: 0

**Called by:**
- `loopCut` (1)

**Calls:**
- `newVertexKey` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:281` | Self: 0.0% (0us) | Total: 5.6% (91.5ms) | Samples: 0

**Called by:**
- `withMesh` (12)
- `sanitizeMesh` (4)

**Calls:**
- `meshSurfaceEdges` (6)
- `Set` (4)
- `meshSurfaceEdges` (3)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)
- `map` (1)

### `orderQuad`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:224` | Self: 0.0% (0us) | Total: 0.0% (825us) | Samples: 0

**Called by:**
- `normalizeMesh` (1)

**Calls:**
- `normalize` (1)

### `meshIssues`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:461` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `faceVertices` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.6% (10.9ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:316` | Self: 0.0% (0us) | Total: 6.2% (100.7ms) | Samples: 0

**Called by:**
- `sanitizePart` (23)

**Calls:**
- `normalizeMesh` (7)
- `normalizeMesh` (4)
- `normalizeMesh` (3)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `roundMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)
- `roundMesh` (1)
- `roundMesh` (1)
- `normalizeMesh` (1)
- `normalizeMesh` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `build` (1)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (1)

### `time`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:48` | Self: 0.0% (0us) | Total: 74.1% (1.19s) | Samples: 0

**Called by:**
- `(module)` (60)
- `(module)` (34)
- `(module)` (21)
- `(module)` (19)
- `(module)` (17)
- `(module)` (11)
- `(module)` (7)
- `(module)` (2)
- `(module)` (1)

**Calls:**
- `loopCut` (31)
- `sanitizeModel` (19)
- `finish` (18)
- `(anonymous)` (18)
- `(anonymous)` (15)
- `loopCut` (14)
- `buildPartGeometry` (10)
- `(anonymous)` (7)
- `meshIssues` (5)
- `meshIssues` (4)
- `loopCut` (4)
- `meshIssues` (3)
- `loopCut` (3)
- `meshEdges` (2)
- `meshIssues` (2)
- `loopCut` (2)
- `loopCut` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `loopCut` (1)
- `meshIssues` (1)
- `finish` (1)
- `meshIssues` (1)
- `loopCut` (1)
- `extrudeFaces` (1)
- `build` (1)
- `extrudeFaces` (1)
- `loopCut` (1)
- `(anonymous)` (1)
- `loopCut` (1)
- `(anonymous)` (1)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `from` (1)

### `setMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts:142` | Self: 0.0% (0us) | Total: 2.0% (33.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `meshSurfaceEdges` (3)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:81` | Self: 0.0% (0us) | Total: 1.1% (17.8ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `assetFromJson` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:127` | Self: 0.0% (0us) | Total: 0.8% (13.6ms) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `structuredClone` (1)

### `readMoldaDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` | Self: 0.0% (0us) | Total: 1.9% (31.2ms) | Samples: 0

**Called by:**
- `assetFromJson` (5)

**Calls:**
- `sanitizeModel` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:124` | Self: 0.0% (0us) | Total: 4.8% (77.9ms) | Samples: 0

**Called by:**
- `time` (7)
- `time` (1)

**Calls:**
- `buildPartGeometry` (7)
- `buildPartGeometry` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:86` | Self: 0.0% (0us) | Total: 1.0% (17.4ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `loopCut` (2)
- `loopCut` (1)

### `meshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:169` | Self: 0.0% (0us) | Total: 4.2% (68.1ms) | Samples: 0

**Called by:**
- `pruneMeshSelection` (8)
- `setMesh` (4)
- `loopCut` (1)

**Calls:**
- `meshSurfaceEdges` (9)
- `meshSurfaceEdges` (2)
- `meshSurfaceEdges` (1)
- `meshSurfaceEdges` (1)

### `normalizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts:273` | Self: 0.0% (0us) | Total: 0.0% (968us) | Samples: 0

**Called by:**
- `withMesh` (1)

**Calls:**
- `map` (1)

### `loopCut`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts:384` | Self: 0.0% (0us) | Total: 0.0% (940us) | Samples: 0

**Called by:**
- `time` (1)

**Calls:**
- `values` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-mesh.ts:102` | Self: 0.0% (0us) | Total: 5.7% (93.1ms) | Samples: 0

**Called by:**
- `evaluate` (20)

**Calls:**
- `time` (19)
- `time` (1)

### `(anonymous)`
`internal:primordials:44` | Self: 0.0% (0us) | Total: 0.8% (13.1ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `defineProperty` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 96.2% (1.55s) | Samples: 0

**Called by:**
- `moduleEvaluation` (218)

**Calls:**
- `(module)` (75)
- `(module)` (40)
- `(module)` (26)
- `(module)` (23)
- `(module)` (20)
- `(module)` (14)
- `(module)` (8)
- `(module)` (4)
- `(module)` (3)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `sanitizeMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts:300` | Self: 0.0% (0us) | Total: 1.9% (30.7ms) | Samples: 0

**Called by:**
- `sanitizePart` (2)

**Calls:**
- `every` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 45.6% | 736.6ms | `[native code]` |
| 25.0% | 405.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\mesh.ts` |
| 8.5% | 138.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 7.1% | 115.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshTools.ts` |
| 4.6% | 75.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 3.7% | 60.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\sanitize.ts` |
| 1.3% | 21.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\meshEditOverlay.ts` |
| 0.9% | 16.0ms | `internal:fixed_queue` |
| 0.9% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vertexOverlap.ts` |
| 0.9% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.8% | 13.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\meshFrame.ts` |
| 0.0% | 932us | `node:assert` |
