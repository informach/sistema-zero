# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 1.36s | 191 | 1.0ms | 210 |

**Top 10:** `indexSceneDocument` 7.9%, `parseModule` 6.8%, `structuredClone` 4.5%, `resolve` 4.4%, `moduleDeclarationInstantiation` 3.5%, `entries` 3.5%, `deepEquals` 3.4%, `push` 3.3%, `point` 3.2%, `indexMeshEdges` 3.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 7.9% | 108.7ms | 7.9% | 108.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` |
| 6.8% | 93.3ms | 9.0% | 123.8ms | `parseModule` | `[native code]` |
| 4.5% | 62.2ms | 4.5% | 62.2ms | `structuredClone` | `[native code]` |
| 4.4% | 61.1ms | 4.4% | 61.1ms | `resolve` | `[native code]` |
| 3.5% | 48.7ms | 3.5% | 48.7ms | `moduleDeclarationInstantiation` | `[native code]` |
| 3.5% | 48.4ms | 3.5% | 48.4ms | `entries` | `[native code]` |
| 3.4% | 46.7ms | 3.4% | 46.7ms | `deepEquals` | `[native code]` |
| 3.3% | 45.7ms | 3.3% | 45.7ms | `push` | `[native code]` |
| 3.2% | 44.1ms | 3.2% | 44.1ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` |
| 3.1% | 43.6ms | 3.1% | 43.6ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` |
| 2.3% | 31.7ms | 2.3% | 31.7ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` |
| 2.2% | 30.4ms | 3.3% | 45.8ms | `anonymous` | `[native code]` |
| 1.9% | 26.9ms | 1.9% | 26.9ms | `stringify` | `[native code]` |
| 1.6% | 22.3ms | 1.6% | 22.3ms | `splitNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:86` |
| 1.5% | 21.4ms | 1.5% | 21.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:26` |
| 1.5% | 20.7ms | 1.5% | 20.7ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 1.4% | 20.3ms | 1.4% | 20.3ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 1.2% | 16.5ms | 1.2% | 16.5ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` |
| 1.1% | 16.3ms | 1.1% | 16.3ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:74` |
| 1.1% | 16.1ms | 1.1% | 16.1ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 1.1% | 16.0ms | 1.1% | 16.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` |
| 1.1% | 15.9ms | 1.1% | 15.9ms | `next` | `[native code]` |
| 1.1% | 15.9ms | 1.1% | 15.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 1.1% | 15.8ms | 1.1% | 15.8ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 1.1% | 15.8ms | 1.1% | 15.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 1.1% | 15.7ms | 1.1% | 15.7ms | `fetch` | `[native code]` |
| 1.1% | 15.6ms | 1.1% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:68` |
| 1.1% | 15.6ms | 1.2% | 16.5ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` |
| 1.1% | 15.5ms | 1.1% | 15.5ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 1.1% | 15.3ms | 1.1% | 15.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:159` |
| 1.1% | 15.0ms | 2.2% | 30.9ms | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` |
| 1.1% | 15.0ms | 1.1% | 15.0ms | `flatIntoArray` | `[native code]` |
| 1.1% | 15.0ms | 1.1% | 15.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.0% | 14.8ms | 1.0% | 14.8ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` |
| 1.0% | 14.6ms | 1.0% | 14.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` |
| 1.0% | 14.6ms | 2.3% | 31.4ms | `(anonymous)` | `[native code]` |
| 1.0% | 14.5ms | 1.0% | 14.5ms | `_raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:42` |
| 1.0% | 14.4ms | 1.0% | 14.4ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 1.0% | 14.4ms | 1.0% | 14.4ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 1.0% | 14.1ms | 1.0% | 14.1ms | `onSegment` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:16` |
| 1.0% | 14.1ms | 1.2% | 16.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:66` |
| 1.0% | 13.7ms | 1.0% | 13.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 1.0% | 13.6ms | 1.0% | 13.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.9% | 13.4ms | 0.9% | 13.4ms | `cloneObject` | `[native code]` |
| 0.9% | 13.3ms | 0.9% | 13.3ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` |
| 0.9% | 13.2ms | 0.9% | 13.2ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:55` |
| 0.9% | 13.1ms | 0.9% | 13.1ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` |
| 0.9% | 12.8ms | 3.0% | 41.2ms | `every` | `[native code]` |
| 0.9% | 12.8ms | 0.9% | 12.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` |
| 0.9% | 12.5ms | 0.9% | 12.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12091` |
| 0.9% | 12.4ms | 0.9% | 12.4ms | `Set` | `[native code]` |
| 0.8% | 12.0ms | 0.8% | 12.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:90` |
| 0.8% | 12.0ms | 0.8% | 12.0ms | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.8% | 11.5ms | 0.8% | 11.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.8% | 11.4ms | 0.8% | 11.4ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:89` |
| 0.6% | 9.1ms | 0.6% | 9.1ms | `pop` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 0.2% | 2.8ms | 13.5% | 185.3ms | `map` | `[native code]` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` |
| 0.0% | 1.2ms | 0.1% | 2.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `slice` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `internalAll` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `Camera` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `stats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `SRGBToLinear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 1.0ms | 1.1% | 15.9ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.0% | 982us | 0.0% | 982us | `set` | `[native code]` |
| 0.0% | 981us | 0.1% | 1.9ms | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:45` |
| 0.0% | 976us | 0.0% | 976us | `materialLink` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:24` |
| 0.0% | 970us | 0.0% | 970us | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:72` |
| 0.0% | 963us | 0.0% | 963us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:131` |
| 0.0% | 955us | 0.0% | 955us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.0% | 954us | 0.0% | 954us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 944us | 0.0% | 944us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 941us | 0.0% | 941us | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` |
| 0.0% | 939us | 0.0% | 939us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.0% | 923us | 0.0% | 923us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:12` |
| 0.0% | 905us | 0.0% | 905us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.0% | 904us | 0.0% | 904us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.0% | 903us | 0.0% | 903us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` |
| 0.0% | 896us | 0.0% | 896us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:33` |
| 0.0% | 895us | 0.0% | 895us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:47` |
| 0.0% | 892us | 0.0% | 892us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` |
| 0.0% | 881us | 0.0% | 881us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:116` |
| 0.0% | 878us | 0.0% | 878us | `has` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 80.5% | 1.10s | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 80.5% | 1.10s | 0.0% | 0us | `evaluate` | `[native code]` |
| 25.3% | 345.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:126` |
| 25.3% | 345.8ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:100` |
| 24.5% | 335.7ms | 0.0% | 0us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:118` |
| 21.8% | 299.0ms | 0.0% | 0us | `link` | `[native code]` |
| 15.8% | 216.5ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 14.8% | 202.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:94` |
| 13.5% | 185.3ms | 0.2% | 2.8ms | `map` | `[native code]` |
| 11.3% | 154.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:283` |
| 10.8% | 147.7ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:81` |
| 9.0% | 123.8ms | 6.8% | 93.3ms | `parseModule` | `[native code]` |
| 9.0% | 123.2ms | 0.0% | 0us | `createSceneSkinPaintStroke` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:45` |
| 9.0% | 123.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:117` |
| 8.1% | 111.5ms | 0.0% | 0us | `splitNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:131` |
| 7.9% | 108.7ms | 7.9% | 108.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` |
| 6.1% | 84.2ms | 0.0% | 0us | `flatIntoArrayWithCallback` | `[native code]` |
| 4.9% | 67.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:146` |
| 4.8% | 66.9ms | 0.0% | 0us | `splitNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:122` |
| 4.8% | 66.6ms | 0.0% | 0us | `commit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:162` |
| 4.8% | 66.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:55` |
| 4.7% | 65.2ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` |
| 4.5% | 62.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:74` |
| 4.5% | 62.2ms | 4.5% | 62.2ms | `structuredClone` | `[native code]` |
| 4.4% | 61.1ms | 4.4% | 61.1ms | `resolve` | `[native code]` |
| 4.4% | 60.5ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:85` |
| 4.3% | 59.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:54` |
| 4.1% | 56.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` |
| 3.8% | 53.2ms | 0.0% | 0us | `patchSceneSkinWeights` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:18` |
| 3.5% | 49.1ms | 0.0% | 0us | `readNormalizedSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:7` |
| 3.5% | 48.7ms | 3.5% | 48.7ms | `moduleDeclarationInstantiation` | `[native code]` |
| 3.5% | 48.7ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 3.5% | 48.7ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 3.5% | 48.4ms | 3.5% | 48.4ms | `entries` | `[native code]` |
| 3.4% | 47.7ms | 0.0% | 0us | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:35` |
| 3.4% | 46.7ms | 3.4% | 46.7ms | `deepEquals` | `[native code]` |
| 3.4% | 46.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:169` |
| 3.3% | 45.8ms | 2.2% | 30.4ms | `anonymous` | `[native code]` |
| 3.3% | 45.7ms | 3.3% | 45.7ms | `push` | `[native code]` |
| 3.3% | 45.6ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:86` |
| 3.2% | 44.7ms | 0.0% | 0us | `readSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` |
| 3.2% | 44.7ms | 0.0% | 0us | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` |
| 3.2% | 44.1ms | 3.2% | 44.1ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` |
| 3.2% | 43.7ms | 0.0% | 0us | `_raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:37` |
| 3.1% | 43.6ms | 3.1% | 43.6ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` |
| 3.0% | 41.2ms | 0.9% | 12.8ms | `every` | `[native code]` |
| 2.7% | 36.9ms | 0.0% | 0us | `pickSceneSkinPaint` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:19` |
| 2.7% | 36.9ms | 0.0% | 0us | `sceneSurfaceHit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:33` |
| 2.7% | 36.9ms | 0.0% | 0us | `surfaceIntersections` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:180` |
| 2.4% | 33.2ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 2.3% | 32.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:142` |
| 2.3% | 32.2ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 2.3% | 31.7ms | 2.3% | 31.7ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` |
| 2.3% | 31.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:24` |
| 2.3% | 31.6ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` |
| 2.3% | 31.4ms | 1.0% | 14.6ms | `(anonymous)` | `[native code]` |
| 2.2% | 30.9ms | 1.1% | 15.0ms | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` |
| 2.1% | 29.6ms | 0.0% | 0us | `createSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:60` |
| 2.1% | 29.6ms | 0.0% | 0us | `bindSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:51` |
| 2.1% | 29.5ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:387` |
| 2.1% | 29.5ms | 0.0% | 0us | `SceneSkinResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSkinResource.ts:42` |
| 2.1% | 28.8ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` |
| 1.9% | 26.9ms | 1.9% | 26.9ms | `stringify` | `[native code]` |
| 1.6% | 22.3ms | 0.0% | 0us | `MeshBVH` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\MeshBVH.js:154` |
| 1.6% | 22.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:172` |
| 1.6% | 22.3ms | 1.6% | 22.3ms | `splitNode` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:86` |
| 1.6% | 22.3ms | 0.0% | 0us | `buildPackedTree` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:170` |
| 1.6% | 22.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:123` |
| 1.6% | 22.3ms | 0.0% | 0us | `buildTree` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:52` |
| 1.6% | 22.3ms | 0.0% | 0us | `createEntry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:44` |
| 1.6% | 22.3ms | 0.0% | 0us | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:94` |
| 1.5% | 21.4ms | 1.5% | 21.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:26` |
| 1.5% | 20.7ms | 1.5% | 20.7ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 1.4% | 20.4ms | 0.0% | 0us | `finishSceneCommand` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:74` |
| 1.4% | 20.3ms | 1.4% | 20.3ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 1.4% | 19.5ms | 0.0% | 0us | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:29` |
| 1.3% | 18.1ms | 0.0% | 0us | `readSceneSkinInfluences` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:9` |
| 1.3% | 17.9ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:388` |
| 1.2% | 16.5ms | 1.2% | 16.5ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` |
| 1.2% | 16.5ms | 1.1% | 15.6ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` |
| 1.2% | 16.4ms | 0.0% | 0us | `readSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:29` |
| 1.2% | 16.4ms | 0.0% | 0us | `readSceneSkinBindings` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:15` |
| 1.2% | 16.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:64` |
| 1.2% | 16.4ms | 1.0% | 14.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:66` |
| 1.1% | 16.3ms | 1.1% | 16.3ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:74` |
| 1.1% | 16.1ms | 1.1% | 16.1ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 1.1% | 16.1ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:93` |
| 1.1% | 16.0ms | 1.1% | 16.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` |
| 1.1% | 15.9ms | 1.1% | 15.9ms | `next` | `[native code]` |
| 1.1% | 15.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` |
| 1.1% | 15.9ms | 1.1% | 15.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` |
| 1.1% | 15.9ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:114` |
| 1.1% | 15.9ms | 0.0% | 0us | `createSceneSkin` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:38` |
| 1.1% | 15.9ms | 0.0% | 0us | `sceneCommandSelection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` |
| 1.1% | 15.9ms | 0.0% | 1.0ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` |
| 1.1% | 15.8ms | 1.1% | 15.8ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 1.1% | 15.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:11` |
| 1.1% | 15.8ms | 1.1% | 15.8ms | `record` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` |
| 1.1% | 15.7ms | 1.1% | 15.7ms | `fetch` | `[native code]` |
| 1.1% | 15.7ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 1.1% | 15.7ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 1.1% | 15.7ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 1.1% | 15.6ms | 1.1% | 15.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:68` |
| 1.1% | 15.6ms | 0.0% | 0us | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:68` |
| 1.1% | 15.5ms | 1.1% | 15.5ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 1.1% | 15.3ms | 1.1% | 15.3ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:159` |
| 1.1% | 15.0ms | 0.0% | 0us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:44` |
| 1.1% | 15.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:126` |
| 1.1% | 15.0ms | 0.0% | 0us | `paintSceneSkinWeight` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:19` |
| 1.1% | 15.0ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 1.1% | 15.0ms | 1.1% | 15.0ms | `flatIntoArray` | `[native code]` |
| 1.1% | 15.0ms | 1.1% | 15.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.0% | 15.0ms | 0.0% | 0us | `get ReadStream` | `node:fs:727` |
| 1.0% | 14.8ms | 1.0% | 14.8ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` |
| 1.0% | 14.6ms | 0.0% | 0us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` |
| 1.0% | 14.6ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` |
| 1.0% | 14.6ms | 1.0% | 14.6ms | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` |
| 1.0% | 14.5ms | 0.0% | 0us | `raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\MeshBVH.js:230` |
| 1.0% | 14.5ms | 1.0% | 14.5ms | `_raycast` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:42` |
| 1.0% | 14.5ms | 0.0% | 0us | `raycast_indirect` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:14` |
| 1.0% | 14.5ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:140` |
| 1.0% | 14.5ms | 0.0% | 0us | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:101` |
| 1.0% | 14.4ms | 1.0% | 14.4ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 1.0% | 14.4ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 1.0% | 14.4ms | 0.0% | 0us | `node:url` | `node:url:2` |
| 1.0% | 14.4ms | 1.0% | 14.4ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` |
| 1.0% | 14.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` |
| 1.0% | 14.1ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 1.0% | 14.1ms | 1.0% | 14.1ms | `onSegment` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:16` |
| 1.0% | 13.7ms | 1.0% | 13.7ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` |
| 1.0% | 13.6ms | 1.0% | 13.6ms | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` |
| 0.9% | 13.4ms | 0.0% | 0us | `patchSceneSkinWeights` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:38` |
| 0.9% | 13.4ms | 0.9% | 13.4ms | `cloneObject` | `[native code]` |
| 0.9% | 13.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` |
| 0.9% | 13.3ms | 0.9% | 13.3ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` |
| 0.9% | 13.2ms | 0.9% | 13.2ms | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:55` |
| 0.9% | 13.2ms | 0.0% | 0us | `readSceneSkinBindings` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:17` |
| 0.9% | 13.1ms | 0.9% | 13.1ms | `prepareSceneSkinDraw` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` |
| 0.9% | 13.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:75` |
| 0.9% | 12.8ms | 0.0% | 0us | `validateBuffers` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` |
| 0.9% | 12.8ms | 0.0% | 0us | `from` | `[native code]` |
| 0.9% | 12.8ms | 0.9% | 12.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` |
| 0.9% | 12.8ms | 0.0% | 0us | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:80` |
| 0.9% | 12.5ms | 0.9% | 12.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12091` |
| 0.9% | 12.4ms | 0.9% | 12.4ms | `Set` | `[native code]` |
| 0.8% | 12.0ms | 0.8% | 12.0ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:90` |
| 0.8% | 12.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:50` |
| 0.8% | 12.0ms | 0.8% | 12.0ms | `readSceneDocumentStructure` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.8% | 12.0ms | 0.0% | 0us | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` |
| 0.8% | 12.0ms | 0.0% | 0us | `makeSceneSkinFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneSkin.ts:5` |
| 0.8% | 12.0ms | 0.0% | 0us | `animatedScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` |
| 0.8% | 12.0ms | 0.0% | 0us | `makeSceneGlbFixture` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` |
| 0.8% | 11.5ms | 0.8% | 11.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` |
| 0.8% | 11.4ms | 0.8% | 11.4ms | `graph` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:89` |
| 0.6% | 9.1ms | 0.6% | 9.1ms | `pop` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 0.6% | 9.1ms | 0.0% | 0us | `query` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:119` |
| 0.2% | 3.7ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 0.1% | 2.2ms | 0.0% | 1.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` |
| 0.1% | 1.9ms | 0.0% | 981us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:45` |
| 0.1% | 1.9ms | 0.1% | 1.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 0.1% | 1.8ms | 0.1% | 1.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 0.1% | 1.3ms | 0.1% | 1.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` |
| 0.0% | 1.2ms | 0.0% | 0us | `commit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:175` |
| 0.0% | 1.1ms | 0.0% | 1.1ms | `slice` | `[native code]` |
| 0.0% | 1.1ms | 0.0% | 0us | `mergeUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37380` |
| 0.0% | 1.1ms | 0.0% | 0us | `cloneUniforms` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37348` |
| 0.0% | 1.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:1000` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `internalAll` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:58052` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `Camera` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `stats` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:146` |
| 0.0% | 1.0ms | 0.0% | 0us | `convert` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6709` |
| 0.0% | 1.0ms | 0.0% | 0us | `Mesh` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` |
| 0.0% | 1.0ms | 0.0% | 0us | `setHex` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:14034` |
| 0.0% | 1.0ms | 0.0% | 0us | `Color` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13958` |
| 0.0% | 1.0ms | 0.0% | 0us | `MeshBasicMaterial` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22790` |
| 0.0% | 1.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` |
| 0.0% | 1.0ms | 0.0% | 0us | `set` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13985` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `SRGBToLinear` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareSceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.0% | 982us | 0.0% | 982us | `set` | `[native code]` |
| 0.0% | 976us | 0.0% | 976us | `materialLink` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:24` |
| 0.0% | 976us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` |
| 0.0% | 970us | 0.0% | 970us | `indexSceneSkins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:72` |
| 0.0% | 963us | 0.0% | 963us | `sample` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:131` |
| 0.0% | 955us | 0.0% | 955us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.0% | 954us | 0.0% | 954us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 945us | 0.0% | 0us | `ws` | `ws:3` |
| 0.0% | 945us | 0.0% | 0us | `node:http` | `node:http:2` |
| 0.0% | 944us | 0.0% | 944us | `Object3D` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.0% | 944us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18128` |
| 0.0% | 941us | 0.0% | 941us | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` |
| 0.0% | 939us | 0.0% | 939us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.0% | 923us | 0.0% | 923us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:12` |
| 0.0% | 911us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.0% | 906us | 0.0% | 0us | `performIteration` | `[native code]` |
| 0.0% | 905us | 0.0% | 905us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.0% | 904us | 0.0% | 904us | `orientation` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
| 0.0% | 904us | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` |
| 0.0% | 904us | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` |
| 0.0% | 903us | 0.0% | 903us | `buildSceneGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` |
| 0.0% | 896us | 0.0% | 896us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:33` |
| 0.0% | 895us | 0.0% | 895us | `compileSceneSkinGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:47` |
| 0.0% | 892us | 0.0% | 0us | `readPatch` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` |
| 0.0% | 892us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:145` |
| 0.0% | 892us | 0.0% | 0us | `result` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:151` |
| 0.0% | 892us | 0.0% | 892us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` |
| 0.0% | 881us | 0.0% | 881us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:116` |
| 0.0% | 878us | 0.0% | 878us | `has` | `[native code]` |

## Function Details

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:32` | Self: 7.9% (108.7ms) | Total: 7.9% (108.7ms) | Samples: 14

**Called by:**
- `createSceneSkinPaintStroke` (10)
- `sceneCommandSelection` (2)
- `(module)` (1)
- `finishSceneCommand` (1)

### `parseModule`
`[native code]` | Self: 6.8% (93.3ms) | Total: 9.0% (123.8ms) | Samples: 10

**Called by:**
- `async (anonymous)` (13)

**Calls:**
- `ws` (1)
- `get ReadStream` (1)
- `node:url` (1)

### `structuredClone`
`[native code]` | Self: 4.5% (62.2ms) | Total: 4.5% (62.2ms) | Samples: 8

**Called by:**
- `(module)` (8)

### `resolve`
`[native code]` | Self: 4.4% (61.1ms) | Total: 4.4% (61.1ms) | Samples: 8

**Called by:**
- `async (anonymous)` (8)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 3.5% (48.7ms) | Total: 3.5% (48.7ms) | Samples: 6

**Called by:**
- `link` (6)

### `entries`
`[native code]` | Self: 3.5% (48.4ms) | Total: 3.5% (48.4ms) | Samples: 7

**Called by:**
- `indexMeshEdges` (5)
- `indexSceneDocument` (2)

### `deepEquals`
`[native code]` | Self: 3.4% (46.7ms) | Total: 3.4% (46.7ms) | Samples: 5

**Called by:**
- `(module)` (5)

### `push`
`[native code]` | Self: 3.3% (45.7ms) | Total: 3.3% (45.7ms) | Samples: 3

**Called by:**
- `graph` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:65` | Self: 3.2% (44.1ms) | Total: 3.2% (44.1ms) | Samples: 5

**Called by:**
- `graph` (3)
- `graph` (2)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:41` | Self: 3.1% (43.6ms) | Total: 3.1% (43.6ms) | Samples: 7

**Called by:**
- `graph` (7)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:66` | Self: 2.3% (31.7ms) | Total: 2.3% (31.7ms) | Samples: 3

**Called by:**
- `graph` (2)
- `graph` (1)

### `anonymous`
`[native code]` | Self: 2.2% (30.4ms) | Total: 3.3% (45.8ms) | Samples: 3

**Called by:**
- `ws` (1)
- `node:http` (1)
- `get ReadStream` (1)
- `node:url` (1)
- `internal:validators` (1)

**Calls:**
- `node:http` (1)
- `internal:validators` (1)

### `stringify`
`[native code]` | Self: 1.9% (26.9ms) | Total: 1.9% (26.9ms) | Samples: 5

**Called by:**
- `indexMeshEdges` (5)

### `splitNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:86` | Self: 1.6% (22.3ms) | Total: 1.6% (22.3ms) | Samples: 3

**Called by:**
- `splitNode` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:26` | Self: 1.5% (21.4ms) | Total: 1.5% (21.4ms) | Samples: 6

**Called by:**
- `flatIntoArrayWithCallback` (6)

### `meshEdgeKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` | Self: 1.5% (20.7ms) | Total: 1.5% (20.7ms) | Samples: 7

**Called by:**
- `indexMeshEdges` (7)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` | Self: 1.4% (20.3ms) | Total: 1.4% (20.3ms) | Samples: 5

**Called by:**
- `graph` (5)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:39` | Self: 1.2% (16.5ms) | Total: 1.2% (16.5ms) | Samples: 3

**Called by:**
- `graph` (3)

### `prepareSceneSkinDraw`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:74` | Self: 1.1% (16.3ms) | Total: 1.1% (16.3ms) | Samples: 1

**Called by:**
- `SceneSkinResource` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` | Self: 1.1% (16.1ms) | Total: 1.1% (16.1ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:87` | Self: 1.1% (16.0ms) | Total: 1.1% (16.0ms) | Samples: 1

**Called by:**
- `query` (1)

### `next`
`[native code]` | Self: 1.1% (15.9ms) | Total: 1.1% (15.9ms) | Samples: 2

**Called by:**
- `compileSceneSkinGeometry` (1)
- `performIteration` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:138` | Self: 1.1% (15.9ms) | Total: 1.1% (15.9ms) | Samples: 1

**Called by:**
- `map` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 1.1% (15.8ms) | Total: 1.1% (15.8ms) | Samples: 1

**Called by:**
- `readSceneSkinInfluences` (1)

### `record`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:29` | Self: 1.1% (15.8ms) | Total: 1.1% (15.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `fetch`
`[native code]` | Self: 1.1% (15.7ms) | Total: 1.1% (15.7ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:68` | Self: 1.1% (15.6ms) | Total: 1.1% (15.6ms) | Samples: 1

**Called by:**
- `every` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:85` | Self: 1.1% (15.6ms) | Total: 1.2% (16.5ms) | Samples: 1

**Called by:**
- `readSceneSkinBindings` (1)
- `indexSceneDocument` (1)

**Calls:**
- `has` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 1.1% (15.5ms) | Total: 1.1% (15.5ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:159` | Self: 1.1% (15.3ms) | Total: 1.1% (15.3ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `readSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:6` | Self: 1.1% (15.0ms) | Total: 2.2% (30.9ms) | Samples: 1

**Called by:**
- `readNormalizedSceneSkinInfluences` (2)

**Calls:**
- `list` (1)

### `flatIntoArray`
`[native code]` | Self: 1.1% (15.0ms) | Total: 1.1% (15.0ms) | Samples: 2

**Called by:**
- `flatIntoArrayWithCallback` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 1.1% (15.0ms) | Total: 1.1% (15.0ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:68` | Self: 1.0% (14.8ms) | Total: 1.0% (14.8ms) | Samples: 1

**Called by:**
- `graph` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:136` | Self: 1.0% (14.6ms) | Total: 1.0% (14.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`[native code]` | Self: 1.0% (14.6ms) | Total: 2.3% (31.4ms) | Samples: 1

**Calls:**
- `internalAll` (1)
- `requestSatisfyUtil` (1)

### `_raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:42` | Self: 1.0% (14.5ms) | Total: 1.0% (14.5ms) | Samples: 1

**Called by:**
- `_raycast` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` | Self: 1.0% (14.4ms) | Total: 1.0% (14.4ms) | Samples: 1

**Called by:**
- `graph` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:35` | Self: 1.0% (14.4ms) | Total: 1.0% (14.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `onSegment`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:16` | Self: 1.0% (14.1ms) | Total: 1.0% (14.1ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:66` | Self: 1.0% (14.1ms) | Total: 1.2% (16.4ms) | Samples: 2

**Called by:**
- `map` (4)

**Calls:**
- `readNormalizedSceneSkinInfluences` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:30` | Self: 1.0% (13.7ms) | Total: 1.0% (13.7ms) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:56` | Self: 1.0% (13.6ms) | Total: 1.0% (13.6ms) | Samples: 1

**Called by:**
- `update` (1)

### `cloneObject`
`[native code]` | Self: 0.9% (13.4ms) | Total: 0.9% (13.4ms) | Samples: 1

**Called by:**
- `patchSceneSkinWeights` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:94` | Self: 0.9% (13.3ms) | Total: 0.9% (13.3ms) | Samples: 3

**Called by:**
- `query` (3)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:55` | Self: 0.9% (13.2ms) | Total: 0.9% (13.2ms) | Samples: 2

**Called by:**
- `readSceneSkinBindings` (1)
- `indexSceneDocument` (1)

### `prepareSceneSkinDraw`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts:49` | Self: 0.9% (13.1ms) | Total: 0.9% (13.1ms) | Samples: 2

**Called by:**
- `SceneSkinResource` (2)

### `every`
`[native code]` | Self: 0.9% (12.8ms) | Total: 3.0% (41.2ms) | Samples: 1

**Called by:**
- `indexSceneSkins` (1)
- `validateBuffers` (1)
- `every` (1)

**Calls:**
- `every` (1)
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:82` | Self: 0.9% (12.8ms) | Total: 0.9% (12.8ms) | Samples: 1

**Called by:**
- `from` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:12091` | Self: 0.9% (12.5ms) | Total: 0.9% (12.5ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `Set`
`[native code]` | Self: 0.9% (12.4ms) | Total: 0.9% (12.4ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:90` | Self: 0.8% (12.0ms) | Total: 0.8% (12.0ms) | Samples: 1

**Called by:**
- `query` (1)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` | Self: 0.8% (12.0ms) | Total: 0.8% (12.0ms) | Samples: 1

**Called by:**
- `readSceneDocument` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:56` | Self: 0.8% (11.5ms) | Total: 0.8% (11.5ms) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:89` | Self: 0.8% (11.4ms) | Total: 0.8% (11.4ms) | Samples: 1

**Called by:**
- `query` (1)

### `pop`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` | Self: 0.6% (9.1ms) | Total: 0.6% (9.1ms) | Samples: 1

**Called by:**
- `query` (1)

### `map`
`[native code]` | Self: 0.2% (2.8ms) | Total: 13.5% (185.3ms) | Samples: 3

**Called by:**
- `readSceneGeometry` (6)
- `readSceneDocumentStructure` (6)
- `triangulateFace` (4)
- `(anonymous)` (4)
- `readSceneSkins` (4)
- `readSceneSkinInfluences` (3)
- `buildPackedTree` (3)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `readPatch` (1)
- `(anonymous)` (1)

**Calls:**
- `readSceneGeometry` (6)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (3)
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

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` | Self: 0.1% (1.9ms) | Total: 0.1% (1.9ms) | Samples: 2

**Called by:**
- `buildSceneGeometry` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 0.1% (1.8ms) | Total: 0.1% (1.8ms) | Samples: 2

**Called by:**
- `map` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:14` | Self: 0.1% (1.3ms) | Total: 0.1% (1.3ms) | Samples: 1

**Called by:**
- `map` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:50` | Self: 0.0% (1.2ms) | Total: 0.1% (2.2ms) | Samples: 1

**Called by:**
- `commit` (1)
- `finishSceneCommand` (1)

**Calls:**
- `prepareSceneBounds` (1)

### `slice`
`[native code]` | Self: 0.0% (1.1ms) | Total: 0.0% (1.1ms) | Samples: 1

**Called by:**
- `cloneUniforms` (1)

### `internalAll`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `Camera`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `stats`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sample` (1)

### `SRGBToLinear`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `convert` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:58` | Self: 0.0% (1.0ms) | Total: 1.1% (15.9ms) | Samples: 1

**Called by:**
- `update` (2)

**Calls:**
- `push` (1)

### `prepareSceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `sceneBounds` (1)

### `set`
`[native code]` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `compileSceneSkinGeometry` (1)

### `compileSceneSkinGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:45` | Self: 0.0% (981us) | Total: 0.1% (1.9ms) | Samples: 1

**Called by:**
- `update` (2)

**Calls:**
- `set` (1)

### `materialLink`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:24` | Self: 0.0% (976us) | Total: 0.0% (976us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:72` | Self: 0.0% (970us) | Total: 0.0% (970us) | Samples: 1

**Called by:**
- `indexSceneDocument` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:131` | Self: 0.0% (963us) | Total: 0.0% (963us) | Samples: 1

**Called by:**
- `(module)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.0% (955us) | Total: 0.0% (955us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` | Self: 0.0% (954us) | Total: 0.0% (954us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `Object3D`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.0% (944us) | Total: 0.0% (944us) | Samples: 1

**Called by:**
- `(module)` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:70` | Self: 0.0% (941us) | Total: 0.0% (941us) | Samples: 1

**Called by:**
- `graph` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` | Self: 0.0% (939us) | Total: 0.0% (939us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:12` | Self: 0.0% (923us) | Total: 0.0% (923us) | Samples: 1

**Called by:**
- `map` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` | Self: 0.0% (905us) | Total: 0.0% (905us) | Samples: 1

**Called by:**
- `buildSceneGeometry` (1)

### `orientation`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` | Self: 0.0% (904us) | Total: 0.0% (904us) | Samples: 1

**Called by:**
- `evaluateSceneInstances` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:60` | Self: 0.0% (903us) | Total: 0.0% (903us) | Samples: 1

**Called by:**
- `update` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:33` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `finishSceneCommand` (1)

### `compileSceneSkinGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:47` | Self: 0.0% (895us) | Total: 0.0% (895us) | Samples: 1

**Called by:**
- `update` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` | Self: 0.0% (892us) | Total: 0.0% (892us) | Samples: 1

**Called by:**
- `map` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:116` | Self: 0.0% (881us) | Total: 0.0% (881us) | Samples: 1

**Called by:**
- `flatIntoArrayWithCallback` (1)

### `has`
`[native code]` | Self: 0.0% (878us) | Total: 0.0% (878us) | Samples: 1

**Called by:**
- `indexSceneSkins` (1)

### `readSceneSkinBindings`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:17` | Self: 0.0% (0us) | Total: 0.9% (13.2ms) | Samples: 0

**Called by:**
- `bindSceneSkin` (2)

**Calls:**
- `indexSceneSkins` (1)
- `indexSceneSkins` (1)

### `raycast_indirect`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:14` | Self: 0.0% (0us) | Total: 1.0% (14.5ms) | Samples: 0

**Called by:**
- `raycast` (1)

**Calls:**
- `_raycast` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:62` | Self: 0.0% (0us) | Total: 0.0% (904us) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `orientation` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:24` | Self: 0.0% (0us) | Total: 2.3% (31.7ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (2)

**Calls:**
- `readNormalizedSceneSkinInfluences` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:283` | Self: 0.0% (0us) | Total: 11.3% (154.9ms) | Samples: 0

**Called by:**
- `(module)` (25)

**Calls:**
- `buildSceneGeometry` (15)
- `buildSceneGeometry` (4)
- `buildSceneGeometry` (2)
- `validateBuffers` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)
- `buildSceneGeometry` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:85` | Self: 0.0% (0us) | Total: 4.4% (60.5ms) | Samples: 0

**Called by:**
- `query` (5)

**Calls:**
- `point` (2)
- `point` (2)
- `point` (1)

### `createEntry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:44` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `intersect` (3)

**Calls:**
- `MeshBVH` (3)

### `buildPackedTree`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:170` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `MeshBVH` (3)

**Calls:**
- `map` (3)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:101` | Self: 0.0% (0us) | Total: 1.0% (14.5ms) | Samples: 0

**Called by:**
- `surfaceIntersections` (1)

**Calls:**
- `raycast` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:75` | Self: 0.0% (0us) | Total: 0.9% (13.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `indexSceneDocument` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:29` | Self: 0.0% (0us) | Total: 1.4% (19.5ms) | Samples: 0

**Called by:**
- `graph` (5)

**Calls:**
- `entries` (5)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:74` | Self: 0.0% (0us) | Total: 4.5% (62.2ms) | Samples: 0

**Called by:**
- `evaluate` (8)

**Calls:**
- `structuredClone` (8)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:64` | Self: 0.0% (0us) | Total: 1.2% (16.4ms) | Samples: 0

**Called by:**
- `map` (4)

**Calls:**
- `map` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.0% (0us) | Total: 0.0% (911us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:28` | Self: 0.0% (0us) | Total: 2.1% (28.8ms) | Samples: 0

**Called by:**
- `createSceneSkinPaintStroke` (1)
- `sceneCommandSelection` (1)

**Calls:**
- `entries` (2)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:387` | Self: 0.0% (0us) | Total: 2.1% (29.5ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `SceneSkinResource` (3)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 1.0% (14.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `Mesh`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:23029` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `MeshBasicMaterial` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:142` | Self: 0.0% (0us) | Total: 2.3% (32.4ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `sample` (2)
- `sample` (1)
- `sample` (1)
- `sample` (1)

### `cloneUniforms`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37348` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `mergeUniforms` (1)

**Calls:**
- `slice` (1)

### `readSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:9` | Self: 0.0% (0us) | Total: 1.3% (18.1ms) | Samples: 0

**Called by:**
- `readNormalizedSceneSkinInfluences` (3)

**Calls:**
- `map` (3)

### `result`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:151` | Self: 0.0% (0us) | Total: 0.0% (892us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readPatch` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:146` | Self: 0.0% (0us) | Total: 4.9% (67.8ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `commit` (9)
- `commit` (1)

### `node:http`
`node:http:2` | Self: 0.0% (0us) | Total: 0.0% (945us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:145` | Self: 0.0% (0us) | Total: 0.9% (13.3ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `Set` (2)
- `map` (1)

### `createSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:38` | Self: 0.0% (0us) | Total: 1.1% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `sceneCommandSelection` (3)

### `readSceneDocumentStructure`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:390` | Self: 0.0% (0us) | Total: 3.2% (44.7ms) | Samples: 0

**Called by:**
- `readSceneDocument` (6)

**Calls:**
- `map` (6)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (15.7ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.module.js:1000` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `mergeUniforms` (1)

### `sceneSurfaceHit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSurfaceHit.ts:33` | Self: 0.0% (0us) | Total: 2.7% (36.9ms) | Samples: 0

**Called by:**
- `pickSceneSkinPaint` (4)

**Calls:**
- `surfaceIntersections` (4)

### `pickSceneSkinPaint`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneSkinPaintPick.ts:19` | Self: 0.0% (0us) | Total: 2.7% (36.9ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (1)

**Calls:**
- `sceneSurfaceHit` (4)

### `splitNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:122` | Self: 0.0% (0us) | Total: 4.8% (66.9ms) | Samples: 0

**Called by:**
- `buildTree` (3)
- `splitNode` (3)
- `splitNode` (3)

**Calls:**
- `splitNode` (6)
- `splitNode` (3)

### `readSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:29` | Self: 0.0% (0us) | Total: 1.2% (16.4ms) | Samples: 0

**Called by:**
- `readSceneSkinBindings` (4)

**Calls:**
- `map` (4)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:52` | Self: 0.0% (0us) | Total: 2.3% (31.6ms) | Samples: 0

**Called by:**
- `update` (4)

**Calls:**
- `triangleUnitNormal` (2)
- `normalize` (2)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:81` | Self: 0.0% (0us) | Total: 10.8% (147.7ms) | Samples: 0

**Called by:**
- `query` (32)

**Calls:**
- `indexMeshEdges` (12)
- `indexMeshEdges` (7)
- `indexMeshEdges` (5)
- `indexMeshEdges` (5)
- `indexMeshEdges` (3)

### `compileSceneSkinGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts:44` | Self: 0.0% (0us) | Total: 1.1% (15.0ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `next` (1)

### `patchSceneSkinWeights`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:38` | Self: 0.0% (0us) | Total: 0.9% (13.4ms) | Samples: 0

**Called by:**
- `commit` (1)

**Calls:**
- `cloneObject` (1)

### `commit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:175` | Self: 0.0% (0us) | Total: 0.0% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `sceneBounds` (1)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:40` | Self: 0.0% (0us) | Total: 4.7% (65.2ms) | Samples: 0

**Called by:**
- `update` (15)

**Calls:**
- `triangulateFace` (4)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` | Self: 0.0% (0us) | Total: 2.4% (33.2ms) | Samples: 0

**Called by:**
- `finishSceneCommand` (3)
- `createSceneSkinPaintStroke` (1)

**Calls:**
- `indexSceneSkins` (1)
- `indexSceneSkins` (1)
- `indexSceneSkins` (1)
- `indexSceneSkins` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts:11` | Self: 0.0% (0us) | Total: 1.1% (15.8ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `record` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:123` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `pickSceneSkinPaint` (3)

### `createSceneSkinPaintStroke`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:45` | Self: 0.0% (0us) | Total: 9.0% (123.2ms) | Samples: 0

**Called by:**
- `(module)` (12)

**Calls:**
- `indexSceneDocument` (10)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)

### `finishSceneCommand`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:74` | Self: 0.0% (0us) | Total: 1.4% (20.4ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `indexSceneDocument` (3)
- `indexSceneDocument` (1)
- `indexSceneDocument` (1)
- `sceneBounds` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:126` | Self: 0.0% (0us) | Total: 25.3% (345.9ms) | Samples: 0

**Called by:**
- `evaluate` (53)

**Calls:**
- `sample` (52)
- `sample` (1)

### `createSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinCommands.ts:60` | Self: 0.0% (0us) | Total: 2.1% (29.6ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `bindSceneSkin` (6)

### `_raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js:37` | Self: 0.0% (0us) | Total: 3.2% (43.7ms) | Samples: 0

**Called by:**
- `_raycast` (2)
- `raycast_indirect` (1)

**Calls:**
- `_raycast` (2)
- `_raycast` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:93` | Self: 0.0% (0us) | Total: 1.1% (16.1ms) | Samples: 0

**Called by:**
- `query` (1)

**Calls:**
- `push` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:94` | Self: 0.0% (0us) | Total: 14.8% (202.4ms) | Samples: 0

**Called by:**
- `evaluate` (32)

**Calls:**
- `update` (25)
- `update` (4)
- `update` (3)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:118` | Self: 0.0% (0us) | Total: 24.5% (335.7ms) | Samples: 0

**Called by:**
- `sample` (51)

**Calls:**
- `graph` (32)
- `graph` (6)
- `graph` (5)
- `graph` (3)
- `graph` (1)
- `graph` (1)
- `graph` (1)
- `graph` (1)
- `graph` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 15.8% (216.5ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (13)
- `resolve` (8)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSurfaceQuery.ts:94` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `surfaceIntersections` (3)

**Calls:**
- `createEntry` (3)

### `makeSceneGlbFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneGlbFixture.ts:14` | Self: 0.0% (0us) | Total: 0.8% (12.0ms) | Samples: 0

**Called by:**
- `makeSceneSkinFixture` (1)

**Calls:**
- `animatedScene` (1)

### `get ReadStream`
`node:fs:727` | Self: 0.0% (0us) | Total: 1.0% (15.0ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `validateBuffers`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:78` | Self: 0.0% (0us) | Total: 0.9% (12.8ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `every` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:24411` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Mesh` (1)

### `performIteration`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (906us) | Samples: 0

**Called by:**
- `sample` (1)

**Calls:**
- `next` (1)

### `set`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13985` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `Color` (1)

**Calls:**
- `setHex` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:55` | Self: 0.0% (0us) | Total: 4.8% (66.0ms) | Samples: 0

**Called by:**
- `evaluate` (15)

**Calls:**
- `finishSceneCommand` (6)
- `createSceneSkin` (6)
- `createSceneSkin` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:140` | Self: 0.0% (0us) | Total: 1.0% (14.5ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `pickSceneSkinPaint` (1)

### `patchSceneSkinWeights`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts:18` | Self: 0.0% (0us) | Total: 3.8% (53.2ms) | Samples: 0

**Called by:**
- `commit` (8)

**Calls:**
- `flatIntoArrayWithCallback` (8)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 21.8% (299.0ms) | Samples: 0

**Called by:**
- `link` (31)
- `linkAndEvaluateModule` (6)

**Calls:**
- `link` (31)
- `moduleDeclarationInstantiation` (6)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 0.2% (3.7ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (4)

**Calls:**
- `map` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:54` | Self: 0.0% (0us) | Total: 4.3% (59.3ms) | Samples: 0

**Called by:**
- `evaluate` (8)

**Calls:**
- `readSceneDocument` (6)
- `readSceneDocument` (2)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 3.5% (48.7ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (6)

**Calls:**
- `link` (6)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:86` | Self: 0.0% (0us) | Total: 0.0% (904us) | Samples: 0

**Called by:**
- `readSceneDocument` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:310` | Self: 0.0% (0us) | Total: 1.0% (14.6ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (1)
- `sceneBounds` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (15.7ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `MeshBasicMaterial`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:22790` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `Mesh` (1)

**Calls:**
- `Color` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:169` | Self: 0.0% (0us) | Total: 3.4% (46.7ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `deepEquals` (5)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 80.5% (1.10s) | Samples: 0

**Calls:**
- `evaluate` (156)
- `moduleEvaluation` (5)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.0% (0us) | Total: 6.1% (84.2ms) | Samples: 0

**Called by:**
- `patchSceneSkinWeights` (8)
- `sample` (2)
- `triangulateFace` (2)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (2)
- `flatIntoArray` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `convert`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:6709` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `setHex` (1)

**Calls:**
- `SRGBToLinear` (1)

### `surfaceIntersections`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:180` | Self: 0.0% (0us) | Total: 2.7% (36.9ms) | Samples: 0

**Called by:**
- `sceneSurfaceHit` (4)

**Calls:**
- `intersect` (3)
- `intersect` (1)

### `mergeUniforms`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:37380` | Self: 0.0% (0us) | Total: 0.0% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `cloneUniforms` (1)

### `node:url`
`node:url:2` | Self: 0.0% (0us) | Total: 1.0% (14.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:86` | Self: 0.0% (0us) | Total: 3.3% (45.6ms) | Samples: 0

**Called by:**
- `query` (6)

**Calls:**
- `point` (3)
- `point` (1)
- `point` (1)
- `point` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:146` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `stats` (1)

### `ws`
`ws:3` | Self: 0.0% (0us) | Total: 0.0% (945us) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `Color`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:13958` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `MeshBasicMaterial` (1)

**Calls:**
- `set` (1)

### `raycast`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\MeshBVH.js:230` | Self: 0.0% (0us) | Total: 1.0% (14.5ms) | Samples: 0

**Called by:**
- `intersect` (1)

**Calls:**
- `raycast_indirect` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18128` | Self: 0.0% (0us) | Total: 0.0% (944us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Object3D` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:126` | Self: 0.0% (0us) | Total: 1.1% (15.0ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (1)

**Calls:**
- `paintSceneSkinWeight` (1)

### `paintSceneSkinWeight`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaintWeights.ts:19` | Self: 0.0% (0us) | Total: 1.1% (15.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `readNormalizedSceneSkinInfluences` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:100` | Self: 0.0% (0us) | Total: 25.3% (345.8ms) | Samples: 0

**Called by:**
- `(module)` (52)
- `(module)` (1)

**Calls:**
- `query` (51)
- `query` (1)
- `performIteration` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 2.3% (32.2ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (5)
- `moduleEvaluation` (4)

**Calls:**
- `evaluate` (5)
- `moduleEvaluation` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:50` | Self: 0.0% (0us) | Total: 0.8% (12.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `makeSceneSkinFixture` (1)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:179` | Self: 0.0% (0us) | Total: 0.8% (12.0ms) | Samples: 0

**Called by:**
- `animatedScene` (1)

**Calls:**
- `readSceneDocument` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:172` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `buildTree` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.0% (0us) | Total: 1.1% (15.0ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `splitNode`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:131` | Self: 0.0% (0us) | Total: 8.1% (111.5ms) | Samples: 0

**Called by:**
- `splitNode` (9)
- `splitNode` (6)

**Calls:**
- `splitNode` (9)
- `splitNode` (3)
- `splitNode` (3)

### `setHex`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:14034` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `set` (1)

**Calls:**
- `convert` (1)

### `readSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:123` | Self: 0.0% (0us) | Total: 3.2% (44.7ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `readNormalizedSceneSkinInfluences`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts:7` | Self: 0.0% (0us) | Total: 3.5% (49.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `paintSceneSkinWeight` (1)

**Calls:**
- `readSceneSkinInfluences` (3)
- `readSceneSkinInfluences` (2)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 1.1% (15.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `MeshBVH`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\MeshBVH.js:154` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `createEntry` (3)

**Calls:**
- `buildPackedTree` (3)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:302` | Self: 0.0% (0us) | Total: 4.1% (56.7ms) | Samples: 0

**Called by:**
- `(module)` (6)
- `migrateLegacyModel` (1)

**Calls:**
- `readSceneDocumentStructure` (6)
- `readSceneDocumentStructure` (1)

### `sample`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:114` | Self: 0.0% (0us) | Total: 1.1% (15.9ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `flatIntoArrayWithCallback` (2)

### `animatedScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` | Self: 0.0% (0us) | Total: 0.8% (12.0ms) | Samples: 0

**Called by:**
- `makeSceneGlbFixture` (1)

**Calls:**
- `migrateLegacyModel` (1)

### `graph`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:80` | Self: 0.0% (0us) | Total: 0.9% (12.8ms) | Samples: 0

**Called by:**
- `query` (1)

**Calls:**
- `from` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:58052` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `Camera` (1)

### `indexSceneSkins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts:68` | Self: 0.0% (0us) | Total: 1.1% (15.6ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `every` (1)

### `buildTree`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js:52` | Self: 0.0% (0us) | Total: 1.6% (22.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `splitNode` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:117` | Self: 0.0% (0us) | Total: 9.0% (123.2ms) | Samples: 0

**Called by:**
- `evaluate` (12)

**Calls:**
- `createSceneSkinPaintStroke` (12)

### `buildSceneGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts:53` | Self: 0.0% (0us) | Total: 1.0% (14.6ms) | Samples: 0

**Called by:**
- `update` (1)

**Calls:**
- `push` (1)

### `SceneSkinResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\SceneSkinResource.ts:42` | Self: 0.0% (0us) | Total: 2.1% (29.5ms) | Samples: 0

**Called by:**
- `update` (3)

**Calls:**
- `prepareSceneSkinDraw` (2)
- `prepareSceneSkinDraw` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 3.5% (48.7ms) | Samples: 0

**Calls:**
- `linkAndEvaluateModule` (6)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\sceneRenderResource.ts:388` | Self: 0.0% (0us) | Total: 1.3% (17.9ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `compileSceneSkinGeometry` (2)
- `compileSceneSkinGeometry` (1)
- `compileSceneSkinGeometry` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:149` | Self: 0.0% (0us) | Total: 0.0% (976us) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `materialLink` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:134` | Self: 0.0% (0us) | Total: 1.1% (15.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `map` (1)

### `bindSceneSkin`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:51` | Self: 0.0% (0us) | Total: 2.1% (29.6ms) | Samples: 0

**Called by:**
- `createSceneSkin` (6)

**Calls:**
- `readSceneSkinBindings` (4)
- `readSceneSkinBindings` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts:126` | Self: 0.0% (0us) | Total: 1.0% (14.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `list` (1)

### `readPatch`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:85` | Self: 0.0% (0us) | Total: 0.0% (892us) | Samples: 0

**Called by:**
- `result` (1)

**Calls:**
- `map` (1)

### `sceneCommandSelection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commandContext.ts:32` | Self: 0.0% (0us) | Total: 1.1% (15.9ms) | Samples: 0

**Called by:**
- `createSceneSkin` (3)

**Calls:**
- `indexSceneDocument` (2)
- `indexSceneDocument` (1)

### `readSceneSkinBindings`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinBinding.ts:15` | Self: 0.0% (0us) | Total: 1.2% (16.4ms) | Samples: 0

**Called by:**
- `bindSceneSkin` (4)

**Calls:**
- `readSceneSkins` (4)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts:145` | Self: 0.0% (0us) | Total: 0.0% (892us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `result` (1)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (12.8ms) | Samples: 0

**Called by:**
- `graph` (1)

**Calls:**
- `(anonymous)` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:35` | Self: 0.0% (0us) | Total: 3.4% (47.7ms) | Samples: 0

**Called by:**
- `graph` (12)

**Calls:**
- `meshEdgeKey` (7)
- `stringify` (5)

### `commit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts:162` | Self: 0.0% (0us) | Total: 4.8% (66.6ms) | Samples: 0

**Called by:**
- `(module)` (9)

**Calls:**
- `patchSceneSkinWeights` (8)
- `patchSceneSkinWeights` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.0% (0us) | Total: 1.0% (14.1ms) | Samples: 0

**Called by:**
- `buildSceneGeometry` (1)

**Calls:**
- `onSegment` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 80.5% (1.10s) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (156)
- `moduleEvaluation` (5)

**Calls:**
- `(module)` (53)
- `(module)` (32)
- `(module)` (15)
- `(module)` (12)
- `(module)` (10)
- `(module)` (8)
- `(module)` (8)
- `(module)` (5)
- `(module)` (5)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `query`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts:119` | Self: 0.0% (0us) | Total: 0.6% (9.1ms) | Samples: 0

**Called by:**
- `sample` (1)

**Calls:**
- `pop` (1)

### `makeSceneSkinFixture`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneSkin.ts:5` | Self: 0.0% (0us) | Total: 0.8% (12.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `makeSceneGlbFixture` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 41.7% | 570.7ms | `[native code]` |
| 13.2% | 181.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshDistanceField.ts` |
| 9.0% | 123.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 7.4% | 101.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 3.5% | 48.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 3.3% | 46.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 3.3% | 45.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinIndex.ts` |
| 2.3% | 31.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 2.1% | 29.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinDraw.ts` |
| 1.6% | 22.3ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\build\buildTree.js` |
| 1.5% | 21.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeightPatch.ts` |
| 1.3% | 18.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPaint.ts` |
| 1.2% | 17.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinWeights.ts` |
| 1.2% | 16.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readGeometry.ts` |
| 1.1% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 1.1% | 15.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\geometry.ts` |
| 1.1% | 15.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-skin-path.ts` |
| 1.0% | 14.5ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three-mesh-bvh@0.9.2+7b565cd016fb14f9\node_modules\three-mesh-bvh\src\core\cast\raycast_indirect.generated.js` |
| 1.0% | 14.1ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readSkin.ts` |
| 0.8% | 12.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.1% | 2.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.1% | 1.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\skinPose.ts` |
| 0.0% | 904us | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts` |
