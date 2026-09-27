# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 21.68s | 2869 | 1.0ms | 259 |

**Top 10:** `map` 8.2%, `get` 4.8%, `indexSceneDocument` 3.4%, `flatIntoArray` 2.9%, `cloneObject` 2.6%, `(anonymous)` 2.5%, `meshFaceRegion` 2.4%, `extrudeMeshFaces` 2.2%, `(anonymous)` 1.7%, `meshFaceFrame` 1.7%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 8.2% | 1.78s | 29.0% | 6.29s | `map` | `[native code]` |
| 4.8% | 1.06s | 4.8% | 1.06s | `get` | `[native code]` |
| 3.4% | 749.3ms | 3.4% | 749.3ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` |
| 2.9% | 647.4ms | 2.9% | 647.4ms | `flatIntoArray` | `[native code]` |
| 2.6% | 576.9ms | 2.6% | 576.9ms | `cloneObject` | `[native code]` |
| 2.5% | 542.9ms | 2.8% | 612.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:66` |
| 2.4% | 525.1ms | 2.4% | 525.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` |
| 2.2% | 486.9ms | 2.7% | 596.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:59` |
| 1.7% | 387.7ms | 2.2% | 491.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 1.7% | 378.1ms | 1.7% | 378.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` |
| 1.7% | 370.5ms | 1.7% | 370.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.7% | 370.0ms | 2.6% | 564.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:41` |
| 1.6% | 358.9ms | 1.6% | 358.9ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` |
| 1.6% | 354.7ms | 5.5% | 1.20s | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:50` |
| 1.6% | 353.1ms | 1.6% | 353.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 1.5% | 332.9ms | 1.8% | 396.4ms | `filter` | `[native code]` |
| 1.5% | 331.1ms | 1.5% | 331.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` |
| 1.5% | 329.7ms | 1.5% | 329.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 1.4% | 319.7ms | 1.4% | 319.7ms | `Set` | `[native code]` |
| 1.3% | 284.8ms | 1.3% | 284.8ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:52` |
| 1.3% | 283.0ms | 1.3% | 283.0ms | `max` | `[native code]` |
| 1.2% | 277.2ms | 1.2% | 277.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` |
| 1.1% | 251.5ms | 1.1% | 251.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:47` |
| 1.1% | 244.0ms | 1.1% | 244.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:12` |
| 1.1% | 240.8ms | 2.2% | 495.8ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:43` |
| 1.1% | 239.4ms | 1.1% | 239.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.0% | 237.1ms | 1.0% | 237.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` |
| 1.0% | 234.3ms | 1.0% | 234.3ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` |
| 1.0% | 225.5ms | 2.0% | 447.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` |
| 1.0% | 223.0ms | 1.0% | 223.0ms | `stringify` | `[native code]` |
| 0.9% | 213.7ms | 0.9% | 213.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` |
| 0.9% | 211.4ms | 1.3% | 302.0ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 0.9% | 197.0ms | 1.8% | 407.1ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:49` |
| 0.8% | 182.6ms | 0.8% | 183.7ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` |
| 0.8% | 175.4ms | 1.4% | 324.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 0.7% | 166.6ms | 0.7% | 166.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.7% | 165.6ms | 1.4% | 320.5ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:38` |
| 0.7% | 165.5ms | 0.7% | 165.5ms | `min` | `[native code]` |
| 0.7% | 160.0ms | 0.7% | 163.0ms | `some` | `[native code]` |
| 0.7% | 159.3ms | 3.0% | 662.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 0.7% | 159.2ms | 0.7% | 159.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.7% | 157.9ms | 0.7% | 157.9ms | `splice` | `[native code]` |
| 0.7% | 156.9ms | 0.7% | 156.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` |
| 0.7% | 153.2ms | 0.7% | 153.2ms | `abs` | `[native code]` |
| 0.6% | 145.4ms | 0.6% | 145.4ms | `add` | `[native code]` |
| 0.6% | 142.8ms | 0.6% | 142.8ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.6% | 137.0ms | 0.6% | 137.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.6% | 132.2ms | 4.0% | 886.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` |
| 0.6% | 130.4ms | 5.2% | 1.13s | `flatIntoArrayWithCallback` | `[native code]` |
| 0.5% | 124.3ms | 0.6% | 142.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.5% | 120.4ms | 0.5% | 120.4ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.5% | 111.1ms | 0.5% | 126.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.5% | 110.0ms | 0.5% | 110.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:69` |
| 0.4% | 106.7ms | 0.4% | 106.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.4% | 105.8ms | 0.8% | 188.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 0.4% | 104.7ms | 1.7% | 389.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 0.4% | 103.9ms | 0.4% | 103.9ms | `has` | `[native code]` |
| 0.4% | 103.5ms | 0.4% | 103.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.4% | 103.1ms | 1.2% | 270.2ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:44` |
| 0.4% | 102.6ms | 0.4% | 102.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:20` |
| 0.4% | 97.5ms | 0.4% | 97.5ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 0.4% | 97.4ms | 0.4% | 97.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 0.4% | 97.4ms | 0.4% | 97.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:62` |
| 0.4% | 90.8ms | 0.4% | 90.8ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` |
| 0.4% | 89.1ms | 0.5% | 119.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.4% | 88.8ms | 0.4% | 88.8ms | `entries` | `[native code]` |
| 0.3% | 85.9ms | 3.3% | 725.3ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:11` |
| 0.3% | 85.0ms | 1.3% | 296.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 0.3% | 82.6ms | 0.4% | 105.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.3% | 80.6ms | 0.3% | 80.6ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.3% | 78.5ms | 0.3% | 78.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 0.3% | 78.1ms | 3.3% | 721.1ms | `every` | `[native code]` |
| 0.3% | 77.6ms | 0.3% | 77.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 0.3% | 76.9ms | 0.3% | 76.9ms | `hypot` | `[native code]` |
| 0.3% | 76.4ms | 2.7% | 604.2ms | `flatMap` | `[native code]` |
| 0.3% | 75.8ms | 1.0% | 226.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 0.3% | 73.9ms | 0.3% | 73.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` |
| 0.3% | 73.5ms | 0.3% | 73.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:34` |
| 0.3% | 70.5ms | 2.1% | 466.0ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` |
| 0.3% | 68.6ms | 0.5% | 129.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.3% | 67.2ms | 25.7% | 5.58s | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:16` |
| 0.3% | 66.1ms | 0.3% | 66.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.3% | 65.1ms | 0.3% | 70.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:10` |
| 0.2% | 65.0ms | 1.0% | 225.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` |
| 0.2% | 64.6ms | 2.8% | 628.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:64` |
| 0.2% | 63.5ms | 0.2% | 63.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` |
| 0.2% | 62.8ms | 0.4% | 93.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.2% | 61.8ms | 0.4% | 105.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` |
| 0.2% | 61.6ms | 0.2% | 61.6ms | `indexOf` | `[native code]` |
| 0.2% | 61.2ms | 0.2% | 61.2ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` |
| 0.2% | 60.7ms | 0.2% | 60.7ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 0.2% | 60.5ms | 0.2% | 60.5ms | `deepEquals` | `[native code]` |
| 0.2% | 59.6ms | 2.7% | 585.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:24` |
| 0.2% | 59.4ms | 0.2% | 59.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.2% | 56.3ms | 0.2% | 56.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.2% | 50.8ms | 48.6% | 10.55s | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:36` |
| 0.2% | 48.7ms | 1.1% | 247.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 0.2% | 48.6ms | 0.2% | 48.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:37` |
| 0.2% | 48.2ms | 0.2% | 48.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.2% | 48.1ms | 0.3% | 86.3ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.2% | 48.1ms | 0.2% | 48.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.2% | 48.0ms | 0.2% | 48.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:40` |
| 0.2% | 46.8ms | 0.2% | 46.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.2% | 46.7ms | 0.2% | 46.7ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:27` |
| 0.2% | 45.3ms | 0.2% | 45.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:29` |
| 0.2% | 44.8ms | 0.2% | 44.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.2% | 44.4ms | 0.2% | 44.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` |
| 0.1% | 42.4ms | 3.2% | 714.0ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:39` |
| 0.1% | 42.4ms | 0.2% | 57.5ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` |
| 0.1% | 35.7ms | 0.1% | 37.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.1% | 35.1ms | 0.1% | 35.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.1% | 34.3ms | 0.1% | 34.3ms | `keys` | `[native code]` |
| 0.1% | 33.9ms | 0.1% | 33.9ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 32.2ms | 1.2% | 269.3ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` |
| 0.1% | 31.5ms | 0.1% | 34.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` |
| 0.1% | 31.0ms | 0.1% | 31.0ms | `fromEntries` | `[native code]` |
| 0.1% | 30.9ms | 0.1% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:43` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `values` | `[native code]` |
| 0.1% | 30.5ms | 0.1% | 30.5ms | `from` | `[native code]` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `push` | `[native code]` |
| 0.1% | 30.1ms | 0.1% | 30.1ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 29.3ms | 0.1% | 29.3ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:48` |
| 0.1% | 29.2ms | 0.1% | 29.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.1% | 28.1ms | 0.2% | 43.8ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.1% | 27.6ms | 0.1% | 27.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` |
| 0.1% | 27.2ms | 0.1% | 27.2ms | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 26.1ms | 0.1% | 26.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` |
| 0.0% | 20.2ms | 0.2% | 47.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.0% | 18.1ms | 9.3% | 2.02s | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:61` |
| 0.0% | 18.0ms | 0.0% | 18.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:33` |
| 0.0% | 17.5ms | 0.0% | 19.4ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:38` |
| 0.0% | 17.0ms | 0.0% | 17.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.0% | 16.6ms | 0.1% | 32.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:111` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:45` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` |
| 0.0% | 16.0ms | 0.7% | 161.4ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:35` |
| 0.0% | 15.8ms | 0.8% | 178.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.0% | 15.6ms | 0.7% | 154.4ms | `anonymous` | `[native code]` |
| 0.0% | 15.6ms | 0.0% | 15.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:51` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.0% | 15.5ms | 0.1% | 31.4ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `sign` | `[native code]` |
| 0.0% | 15.4ms | 1.1% | 247.4ms | `meshIdAllocator` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 15.0ms | 0.0% | 17.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` |
| 0.0% | 14.9ms | 0.1% | 28.8ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:175` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 14.9ms | 0.2% | 47.7ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:97` |
| 0.0% | 14.8ms | 0.0% | 15.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 14.8ms | 0.0% | 14.8ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:77` |
| 0.0% | 14.2ms | 0.0% | 14.2ms | `next` | `[native code]` |
| 0.0% | 14.1ms | 0.0% | 14.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` |
| 0.0% | 12.9ms | 0.0% | 12.9ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 0.0% | 12.4ms | 0.0% | 12.4ms | `copyDataProperties` | `[native code]` |
| 0.0% | 11.5ms | 0.0% | 11.5ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 11.5ms | 0.4% | 100.3ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:28` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` |
| 0.0% | 9.8ms | 0.1% | 26.5ms | `parseModule` | `[native code]` |
| 0.0% | 9.4ms | 0.0% | 9.4ms | `editable` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `hasOwn` | `[native code]` |
| 0.0% | 2.3ms | 0.1% | 31.2ms | `async (anonymous)` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isFinite` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 1.8ms | 0.1% | 30.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` |
| 0.0% | 1.8ms | 1.0% | 229.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:26` |
| 0.0% | 1.8ms | 0.1% | 37.4ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` |
| 0.0% | 1.2ms | 0.0% | 15.4ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:19` |
| 0.0% | 1.1ms | 4.4% | 973.9ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:29` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `internal:primordials` | `internal:primordials:50` |
| 0.0% | 985us | 0.0% | 985us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:22` |
| 0.0% | 962us | 0.0% | 962us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.0% | 929us | 1.4% | 305.5ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` |
| 0.0% | 895us | 0.7% | 158.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.0% | 886us | 91.9% | 19.95s | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:245` |
| 0.0% | 872us | 0.0% | 872us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` |
| 0.0% | 864us | 0.0% | 864us | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` |
| 0.0% | 861us | 0.0% | 861us | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 43.28s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.9% | 21.67s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 99.8% | 21.66s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 99.8% | 21.65s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 99.7% | 21.64s | 0.0% | 0us | `evaluate` | `[native code]` |
| 91.9% | 19.95s | 0.0% | 886us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:245` |
| 88.4% | 19.18s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:69` |
| 48.6% | 10.55s | 0.2% | 50.8ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:36` |
| 29.0% | 6.29s | 8.2% | 1.78s | `map` | `[native code]` |
| 25.7% | 5.58s | 0.3% | 67.2ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:16` |
| 9.3% | 2.02s | 0.0% | 18.1ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:61` |
| 7.9% | 1.71s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:63` |
| 5.5% | 1.20s | 1.6% | 354.7ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:50` |
| 5.5% | 1.19s | 0.0% | 0us | `finish` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:317` |
| 5.4% | 1.17s | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:22` |
| 5.2% | 1.13s | 0.6% | 130.4ms | `flatIntoArrayWithCallback` | `[native code]` |
| 4.8% | 1.06s | 4.8% | 1.06s | `get` | `[native code]` |
| 4.4% | 973.9ms | 0.0% | 1.1ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:29` |
| 4.0% | 886.0ms | 0.6% | 132.2ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` |
| 3.7% | 816.5ms | 0.0% | 0us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` |
| 3.4% | 749.3ms | 3.4% | 749.3ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` |
| 3.3% | 725.3ms | 0.3% | 85.9ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:11` |
| 3.3% | 721.1ms | 0.3% | 78.1ms | `every` | `[native code]` |
| 3.2% | 714.0ms | 0.1% | 42.4ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:39` |
| 3.0% | 662.3ms | 0.7% | 159.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` |
| 2.9% | 647.4ms | 2.9% | 647.4ms | `flatIntoArray` | `[native code]` |
| 2.8% | 628.2ms | 0.2% | 64.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:64` |
| 2.8% | 612.7ms | 2.5% | 542.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:66` |
| 2.7% | 604.2ms | 0.3% | 76.4ms | `flatMap` | `[native code]` |
| 2.7% | 596.5ms | 2.2% | 486.9ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:59` |
| 2.7% | 585.9ms | 0.2% | 59.6ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:24` |
| 2.6% | 576.9ms | 2.6% | 576.9ms | `cloneObject` | `[native code]` |
| 2.6% | 564.4ms | 1.7% | 370.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:41` |
| 2.4% | 525.1ms | 2.4% | 525.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` |
| 2.2% | 495.8ms | 1.1% | 240.8ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:43` |
| 2.2% | 491.2ms | 1.7% | 387.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` |
| 2.1% | 466.0ms | 0.3% | 70.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` |
| 2.0% | 447.1ms | 1.0% | 225.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` |
| 1.8% | 407.1ms | 0.9% | 197.0ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:49` |
| 1.8% | 396.4ms | 1.5% | 332.9ms | `filter` | `[native code]` |
| 1.7% | 389.1ms | 0.4% | 104.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` |
| 1.7% | 378.1ms | 1.7% | 378.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` |
| 1.7% | 370.5ms | 1.7% | 370.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` |
| 1.6% | 364.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:10` |
| 1.6% | 358.9ms | 1.6% | 358.9ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` |
| 1.6% | 353.1ms | 1.6% | 353.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 1.5% | 331.1ms | 1.5% | 331.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` |
| 1.5% | 329.7ms | 1.5% | 329.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 1.4% | 324.7ms | 0.8% | 175.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` |
| 1.4% | 320.5ms | 0.7% | 165.6ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:38` |
| 1.4% | 319.7ms | 1.4% | 319.7ms | `Set` | `[native code]` |
| 1.4% | 305.5ms | 0.0% | 929us | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` |
| 1.3% | 302.0ms | 0.9% | 211.4ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` |
| 1.3% | 296.8ms | 0.3% | 85.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` |
| 1.3% | 284.8ms | 1.3% | 284.8ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:52` |
| 1.3% | 283.0ms | 1.3% | 283.0ms | `max` | `[native code]` |
| 1.2% | 277.2ms | 1.2% | 277.2ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` |
| 1.2% | 270.2ms | 0.4% | 103.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:44` |
| 1.2% | 269.3ms | 0.1% | 32.2ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` |
| 1.1% | 254.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` |
| 1.1% | 251.5ms | 1.1% | 251.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:47` |
| 1.1% | 248.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:50` |
| 1.1% | 247.7ms | 0.2% | 48.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` |
| 1.1% | 247.4ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:23` |
| 1.1% | 247.4ms | 0.0% | 15.4ms | `meshIdAllocator` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` |
| 1.1% | 244.0ms | 1.1% | 244.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:12` |
| 1.1% | 239.4ms | 1.1% | 239.4ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` |
| 1.0% | 237.1ms | 1.0% | 237.1ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` |
| 1.0% | 234.3ms | 1.0% | 234.3ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` |
| 1.0% | 229.1ms | 0.0% | 1.8ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:26` |
| 1.0% | 226.0ms | 0.3% | 75.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` |
| 1.0% | 225.0ms | 0.2% | 65.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` |
| 1.0% | 223.0ms | 1.0% | 223.0ms | `stringify` | `[native code]` |
| 0.9% | 213.7ms | 0.9% | 213.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` |
| 0.9% | 201.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:73` |
| 0.8% | 188.3ms | 0.4% | 105.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` |
| 0.8% | 183.7ms | 0.8% | 182.6ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` |
| 0.8% | 178.9ms | 0.0% | 15.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` |
| 0.7% | 173.3ms | 0.0% | 0us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:239` |
| 0.7% | 173.3ms | 0.0% | 0us | `selection` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:280` |
| 0.7% | 168.1ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:412` |
| 0.7% | 166.6ms | 0.7% | 166.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` |
| 0.7% | 165.5ms | 0.7% | 165.5ms | `min` | `[native code]` |
| 0.7% | 163.0ms | 0.7% | 160.0ms | `some` | `[native code]` |
| 0.7% | 161.4ms | 0.0% | 16.0ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:35` |
| 0.7% | 159.2ms | 0.7% | 159.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` |
| 0.7% | 158.8ms | 0.0% | 895us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` |
| 0.7% | 157.9ms | 0.7% | 157.9ms | `splice` | `[native code]` |
| 0.7% | 156.9ms | 0.7% | 156.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` |
| 0.7% | 154.4ms | 0.0% | 15.6ms | `anonymous` | `[native code]` |
| 0.7% | 153.2ms | 0.7% | 153.2ms | `abs` | `[native code]` |
| 0.6% | 145.4ms | 0.6% | 145.4ms | `add` | `[native code]` |
| 0.6% | 142.8ms | 0.6% | 142.8ms | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` |
| 0.6% | 142.7ms | 0.5% | 124.3ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` |
| 0.6% | 139.5ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:25` |
| 0.6% | 137.0ms | 0.6% | 137.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` |
| 0.5% | 129.8ms | 0.3% | 68.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` |
| 0.5% | 126.6ms | 0.5% | 111.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` |
| 0.5% | 123.5ms | 0.0% | 0us | `sceneToJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentJson.ts:13` |
| 0.5% | 122.8ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:51` |
| 0.5% | 120.4ms | 0.5% | 120.4ms | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.5% | 119.4ms | 0.4% | 89.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` |
| 0.5% | 110.0ms | 0.5% | 110.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:69` |
| 0.4% | 106.7ms | 0.4% | 106.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` |
| 0.4% | 106.2ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:24` |
| 0.4% | 105.9ms | 0.2% | 61.8ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` |
| 0.4% | 105.0ms | 0.3% | 82.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` |
| 0.4% | 103.9ms | 0.4% | 103.9ms | `has` | `[native code]` |
| 0.4% | 103.5ms | 0.4% | 103.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` |
| 0.4% | 102.6ms | 0.4% | 102.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:20` |
| 0.4% | 100.3ms | 0.0% | 11.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:28` |
| 0.4% | 97.5ms | 0.4% | 97.5ms | `meshEdgeKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` |
| 0.4% | 97.4ms | 0.4% | 97.4ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` |
| 0.4% | 97.4ms | 0.4% | 97.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:62` |
| 0.4% | 94.1ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:40` |
| 0.4% | 93.0ms | 0.2% | 62.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` |
| 0.4% | 92.5ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:155` |
| 0.4% | 90.8ms | 0.4% | 90.8ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` |
| 0.4% | 88.8ms | 0.4% | 88.8ms | `entries` | `[native code]` |
| 0.3% | 86.3ms | 0.2% | 48.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` |
| 0.3% | 80.6ms | 0.3% | 80.6ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 0.3% | 78.5ms | 0.3% | 78.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 0.3% | 77.6ms | 0.3% | 77.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` |
| 0.3% | 76.9ms | 0.3% | 76.9ms | `hypot` | `[native code]` |
| 0.3% | 73.9ms | 0.3% | 73.9ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` |
| 0.3% | 73.5ms | 0.3% | 73.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:34` |
| 0.3% | 70.9ms | 0.3% | 65.1ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:10` |
| 0.3% | 66.1ms | 0.3% | 66.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` |
| 0.2% | 63.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` |
| 0.2% | 63.5ms | 0.2% | 63.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` |
| 0.2% | 61.6ms | 0.2% | 61.6ms | `indexOf` | `[native code]` |
| 0.2% | 61.2ms | 0.2% | 61.2ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` |
| 0.2% | 60.7ms | 0.2% | 60.7ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 0.2% | 60.5ms | 0.2% | 60.5ms | `deepEquals` | `[native code]` |
| 0.2% | 60.5ms | 0.0% | 0us | `deepStrictEqual` | `node:assert:133` |
| 0.2% | 59.4ms | 0.2% | 59.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` |
| 0.2% | 57.5ms | 0.1% | 42.4ms | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` |
| 0.2% | 56.3ms | 0.2% | 56.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` |
| 0.2% | 52.1ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` |
| 0.2% | 49.6ms | 0.0% | 0us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:34` |
| 0.2% | 48.7ms | 0.0% | 0us | `readSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:435` |
| 0.2% | 48.6ms | 0.2% | 48.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:37` |
| 0.2% | 48.2ms | 0.2% | 48.2ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 0.2% | 48.1ms | 0.2% | 48.1ms | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` |
| 0.2% | 48.0ms | 0.2% | 48.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:40` |
| 0.2% | 47.7ms | 0.0% | 14.9ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:97` |
| 0.2% | 47.5ms | 0.0% | 20.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` |
| 0.2% | 46.8ms | 0.2% | 46.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` |
| 0.2% | 46.7ms | 0.2% | 46.7ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:27` |
| 0.2% | 46.7ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:30` |
| 0.2% | 46.2ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` |
| 0.2% | 46.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` |
| 0.2% | 46.1ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` |
| 0.2% | 45.7ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:18` |
| 0.2% | 45.3ms | 0.2% | 45.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:29` |
| 0.2% | 44.8ms | 0.0% | 0us | `link` | `[native code]` |
| 0.2% | 44.8ms | 0.2% | 44.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` |
| 0.2% | 44.4ms | 0.2% | 44.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` |
| 0.2% | 43.8ms | 0.1% | 28.1ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 0.1% | 37.6ms | 0.1% | 35.7ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` |
| 0.1% | 37.4ms | 0.0% | 1.8ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` |
| 0.1% | 35.1ms | 0.1% | 35.1ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` |
| 0.1% | 34.3ms | 0.1% | 34.3ms | `keys` | `[native code]` |
| 0.1% | 34.3ms | 0.1% | 31.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` |
| 0.1% | 33.9ms | 0.1% | 33.9ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 32.9ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:79` |
| 0.1% | 32.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:40` |
| 0.1% | 32.0ms | 0.0% | 16.6ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:111` |
| 0.1% | 31.4ms | 0.0% | 15.5ms | `list` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` |
| 0.1% | 31.2ms | 0.0% | 2.3ms | `async (anonymous)` | `[native code]` |
| 0.1% | 31.0ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` |
| 0.1% | 31.0ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:154` |
| 0.1% | 31.0ms | 0.1% | 31.0ms | `fromEntries` | `[native code]` |
| 0.1% | 30.9ms | 0.1% | 30.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:43` |
| 0.1% | 30.6ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:21` |
| 0.1% | 30.6ms | 0.1% | 30.6ms | `values` | `[native code]` |
| 0.1% | 30.5ms | 0.1% | 30.5ms | `from` | `[native code]` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 0.1% | 30.3ms | 0.1% | 30.3ms | `push` | `[native code]` |
| 0.1% | 30.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:53` |
| 0.1% | 30.2ms | 0.0% | 1.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` |
| 0.1% | 30.2ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:42` |
| 0.1% | 30.1ms | 0.1% | 30.1ms | `intersect` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 29.6ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:189` |
| 0.1% | 29.3ms | 0.1% | 29.3ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:48` |
| 0.1% | 29.2ms | 0.1% | 29.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` |
| 0.1% | 28.8ms | 0.0% | 14.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:175` |
| 0.1% | 27.6ms | 0.1% | 27.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` |
| 0.1% | 27.2ms | 0.1% | 27.2ms | `turn` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.1% | 26.5ms | 0.0% | 9.8ms | `parseModule` | `[native code]` |
| 0.1% | 26.1ms | 0.1% | 26.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` |
| 0.0% | 19.4ms | 0.0% | 17.5ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:38` |
| 0.0% | 18.0ms | 0.0% | 18.0ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:33` |
| 0.0% | 17.9ms | 0.0% | 17.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` |
| 0.0% | 17.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:170` |
| 0.0% | 17.0ms | 0.0% | 15.0ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` |
| 0.0% | 16.5ms | 0.0% | 16.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:45` |
| 0.0% | 16.4ms | 0.0% | 0us | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:31` |
| 0.0% | 16.4ms | 0.0% | 16.4ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 0.0% | 16.1ms | 0.0% | 16.1ms | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` |
| 0.0% | 15.7ms | 0.0% | 14.8ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` |
| 0.0% | 15.6ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.0% | 15.6ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.0% | 15.6ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.0% | 15.6ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.0% | 15.6ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.0% | 15.6ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.0% | 15.6ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.0% | 15.6ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.0% | 15.6ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 15.6ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 15.6ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.0% | 15.6ms | 0.0% | 15.6ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:51` |
| 0.0% | 15.6ms | 0.0% | 0us | `tuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` |
| 0.0% | 15.5ms | 0.0% | 15.5ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` |
| 0.0% | 15.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:191` |
| 0.0% | 15.4ms | 0.0% | 1.2ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:19` |
| 0.0% | 15.4ms | 0.0% | 15.4ms | `sign` | `[native code]` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` |
| 0.0% | 15.2ms | 0.0% | 15.2ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 0.0% | 15.0ms | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:58` |
| 0.0% | 14.9ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 0us | `geometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:146` |
| 0.0% | 14.8ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.0% | 14.8ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.0% | 14.8ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.0% | 14.8ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.0% | 14.8ms | 0.0% | 14.8ms | `extrudeMeshFaces` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:77` |
| 0.0% | 14.2ms | 0.0% | 14.2ms | `next` | `[native code]` |
| 0.0% | 14.1ms | 0.0% | 14.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` |
| 0.0% | 13.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:190` |
| 0.0% | 12.9ms | 0.0% | 12.9ms | `indexMeshEdges` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` |
| 0.0% | 12.4ms | 0.0% | 0us | `sceneBounds` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:60` |
| 0.0% | 12.4ms | 0.0% | 12.4ms | `copyDataProperties` | `[native code]` |
| 0.0% | 12.4ms | 0.0% | 0us | `evaluateSceneInstances` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:60` |
| 0.0% | 11.5ms | 0.0% | 0us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` |
| 0.0% | 11.5ms | 0.0% | 11.5ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.0% | 11.1ms | 0.0% | 11.1ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` |
| 0.0% | 9.4ms | 0.0% | 0us | `editSceneMesh` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:240` |
| 0.0% | 9.4ms | 0.0% | 9.4ms | `editable` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts` |
| 0.0% | 5.7ms | 0.0% | 5.7ms | `hasOwn` | `[native code]` |
| 0.0% | 4.7ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 2.3ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `isFinite` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `dot` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 0.0% | 1.0ms | 0.0% | 0us | `node:assert` | `node:assert:2` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `internal:primordials` | `internal:primordials:50` |
| 0.0% | 985us | 0.0% | 985us | `meshFaceFrame` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:22` |
| 0.0% | 962us | 0.0% | 962us | `triangleUnitNormal` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` |
| 0.0% | 890us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:56` |
| 0.0% | 883us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:59` |
| 0.0% | 872us | 0.0% | 872us | `triangulateFace` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` |
| 0.0% | 864us | 0.0% | 864us | `meshFaceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` |
| 0.0% | 861us | 0.0% | 861us | `id` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |

## Function Details

### `map`
`[native code]` | Self: 8.2% (1.78s) | Total: 29.0% (6.29s) | Samples: 226

**Called by:**
- `extrudeMeshFaces` (263)
- `triangulateFace` (107)
- `meshFaceFrame` (87)
- `(anonymous)` (34)
- `triangulateFace` (33)
- `meshFaceFrame` (32)
- `meshFaceFrame` (28)
- `meshFaceFrame` (23)
- `triangulateFace` (23)
- `(anonymous)` (22)
- `triangulateFace` (21)
- `meshFaceFrame` (18)
- `triangulateFace` (16)
- `(anonymous)` (15)
- `readSceneDocument` (14)
- `(anonymous)` (12)
- `meshFaceFrame` (11)
- `triangulateFace` (10)
- `triangleUnitNormal` (9)
- `geometry` (8)
- `(anonymous)` (6)
- `extrudeMeshFaces` (5)
- `extrudeMeshFaces` (3)
- `geometry` (2)
- `tuple` (1)

**Calls:**
- `(anonymous)` (80)
- `(anonymous)` (78)
- `(anonymous)` (68)
- `(anonymous)` (58)
- `(anonymous)` (42)
- `(anonymous)` (40)
- `(anonymous)` (35)
- `(anonymous)` (28)
- `(anonymous)` (26)
- `abs` (19)
- `(anonymous)` (16)
- `(anonymous)` (15)
- `(anonymous)` (12)
- `geometry` (8)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (3)
- `geometry` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `geometry` (2)
- `(anonymous)` (1)
- `geometry` (1)
- `(anonymous)` (1)

### `get`
`[native code]` | Self: 4.8% (1.06s) | Total: 4.8% (1.06s) | Samples: 156

**Called by:**
- `extrudeMeshFaces` (127)
- `extrudeMeshFaces` (26)
- `extrudeMeshFaces` (3)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:26` | Self: 3.4% (749.3ms) | Total: 3.4% (749.3ms) | Samples: 96

**Called by:**
- `finish` (74)
- `selection` (20)
- `readSceneDocument` (2)

### `flatIntoArray`
`[native code]` | Self: 2.9% (647.4ms) | Total: 2.9% (647.4ms) | Samples: 70

**Called by:**
- `flatIntoArrayWithCallback` (70)

### `cloneObject`
`[native code]` | Self: 2.6% (576.9ms) | Total: 2.6% (576.9ms) | Samples: 74

**Called by:**
- `(anonymous)` (32)
- `extrudeMeshFaces` (18)
- `extrudeMeshFaces` (12)
- `extrudeMeshFaces` (12)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:66` | Self: 2.5% (542.9ms) | Total: 2.8% (612.7ms) | Samples: 68

**Called by:**
- `map` (80)

**Calls:**
- `map` (12)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:58` | Self: 2.4% (525.1ms) | Total: 2.4% (525.1ms) | Samples: 74

**Called by:**
- `extrudeMeshFaces` (74)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:59` | Self: 2.2% (486.9ms) | Total: 2.7% (596.5ms) | Samples: 85

**Called by:**
- `editSceneMesh` (97)

**Calls:**
- `cloneObject` (12)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:67` | Self: 1.7% (387.7ms) | Total: 2.2% (491.2ms) | Samples: 57

**Called by:**
- `map` (68)

**Calls:**
- `max` (7)
- `min` (4)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:9` | Self: 1.7% (378.1ms) | Total: 1.7% (378.1ms) | Samples: 53

**Called by:**
- `extrudeMeshFaces` (53)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:83` | Self: 1.7% (370.5ms) | Total: 1.7% (370.5ms) | Samples: 48

**Called by:**
- `meshFaceFrame` (47)
- `extrudeMeshFaces` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:41` | Self: 1.7% (370.0ms) | Total: 2.6% (564.4ms) | Samples: 62

**Called by:**
- `every` (88)

**Calls:**
- `map` (15)
- `max` (10)
- `abs` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:38` | Self: 1.6% (358.9ms) | Total: 1.6% (358.9ms) | Samples: 41

**Called by:**
- `extrudeMeshFaces` (41)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:50` | Self: 1.6% (354.7ms) | Total: 5.5% (1.20s) | Samples: 59

**Called by:**
- `editSceneMesh` (186)

**Calls:**
- `get` (127)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` | Self: 1.6% (353.1ms) | Total: 1.6% (353.1ms) | Samples: 49

**Called by:**
- `map` (42)
- `flatIntoArrayWithCallback` (5)
- `every` (2)

### `filter`
`[native code]` | Self: 1.5% (332.9ms) | Total: 1.8% (396.4ms) | Samples: 58

**Called by:**
- `extrudeMeshFaces` (69)
- `extrudeMeshFaces` (1)

**Calls:**
- `(anonymous)` (12)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:42` | Self: 1.5% (331.1ms) | Total: 1.5% (331.1ms) | Samples: 38

**Called by:**
- `extrudeMeshFaces` (38)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 1.5% (329.7ms) | Total: 1.5% (329.7ms) | Samples: 43

**Called by:**
- `map` (40)
- `some` (3)

### `Set`
`[native code]` | Self: 1.4% (319.7ms) | Total: 1.4% (319.7ms) | Samples: 38

**Called by:**
- `meshIdAllocator` (26)
- `extrudeMeshFaces` (6)
- `extrudeMeshFaces` (5)
- `(anonymous)` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:52` | Self: 1.3% (284.8ms) | Total: 1.3% (284.8ms) | Samples: 25

**Called by:**
- `editSceneMesh` (25)

### `max`
`[native code]` | Self: 1.3% (283.0ms) | Total: 1.3% (283.0ms) | Samples: 48

**Called by:**
- `(anonymous)` (10)
- `triangulateFace` (7)
- `meshFaceFrame` (7)
- `(anonymous)` (7)
- `sceneBounds` (5)
- `triangleUnitNormal` (4)
- `triangulateFace` (3)
- `meshFaceFrame` (3)
- `meshFaceFrame` (1)
- `triangulateFace` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:40` | Self: 1.2% (277.2ms) | Total: 1.2% (277.2ms) | Samples: 28

**Called by:**
- `extrudeMeshFaces` (28)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:47` | Self: 1.1% (251.5ms) | Total: 1.1% (251.5ms) | Samples: 30

**Called by:**
- `(anonymous)` (30)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:12` | Self: 1.1% (244.0ms) | Total: 1.1% (244.0ms) | Samples: 26

**Called by:**
- `map` (26)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:43` | Self: 1.1% (240.8ms) | Total: 2.2% (495.8ms) | Samples: 26

**Called by:**
- `extrudeMeshFaces` (59)

**Calls:**
- `map` (28)
- `min` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:60` | Self: 1.1% (239.4ms) | Total: 1.1% (239.4ms) | Samples: 29

**Called by:**
- `meshFaceFrame` (27)
- `extrudeMeshFaces` (2)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:57` | Self: 1.0% (237.1ms) | Total: 1.0% (237.1ms) | Samples: 20

**Called by:**
- `extrudeMeshFaces` (20)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:46` | Self: 1.0% (234.3ms) | Total: 1.0% (234.3ms) | Samples: 36

**Called by:**
- `extrudeMeshFaces` (36)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:71` | Self: 1.0% (225.5ms) | Total: 2.0% (447.1ms) | Samples: 26

**Called by:**
- `map` (58)

**Calls:**
- `cloneObject` (32)

### `stringify`
`[native code]` | Self: 1.0% (223.0ms) | Total: 1.0% (223.0ms) | Samples: 35

**Called by:**
- `indexMeshEdges` (32)
- `digest` (2)
- `indexMeshEdges` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:13` | Self: 0.9% (213.7ms) | Total: 0.9% (213.7ms) | Samples: 35

**Called by:**
- `map` (35)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:37` | Self: 0.9% (211.4ms) | Total: 1.3% (302.0ms) | Samples: 25

**Called by:**
- `meshFaceFrame` (38)

**Calls:**
- `map` (9)
- `max` (4)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:49` | Self: 0.9% (197.0ms) | Total: 1.8% (407.1ms) | Samples: 40

**Called by:**
- `editSceneMesh` (67)

**Calls:**
- `get` (26)
- `filter` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:36` | Self: 0.8% (182.6ms) | Total: 0.8% (183.7ms) | Samples: 26

**Called by:**
- `extrudeMeshFaces` (27)

**Calls:**
- `stringify` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:71` | Self: 0.8% (175.4ms) | Total: 1.4% (324.7ms) | Samples: 18

**Called by:**
- `meshFaceFrame` (39)
- `extrudeMeshFaces` (1)

**Calls:**
- `map` (16)
- `max` (3)
- `indexOf` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:142` | Self: 0.7% (166.6ms) | Total: 0.7% (166.6ms) | Samples: 21

**Called by:**
- `meshFaceFrame` (21)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:38` | Self: 0.7% (165.6ms) | Total: 1.4% (320.5ms) | Samples: 16

**Called by:**
- `extrudeMeshFaces` (33)

**Calls:**
- `map` (11)
- `indexOf` (5)
- `max` (1)

### `min`
`[native code]` | Self: 0.7% (165.5ms) | Total: 0.7% (165.5ms) | Samples: 16

**Called by:**
- `meshFaceFrame` (5)
- `(anonymous)` (4)
- `sceneBounds` (4)
- `triangulateFace` (3)

### `some`
`[native code]` | Self: 0.7% (160.0ms) | Total: 0.7% (163.0ms) | Samples: 13

**Called by:**
- `triangulateFace` (16)

**Calls:**
- `(anonymous)` (3)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:43` | Self: 0.7% (159.3ms) | Total: 3.0% (662.3ms) | Samples: 18

**Called by:**
- `meshFaceFrame` (71)
- `extrudeMeshFaces` (4)

**Calls:**
- `flatMap` (31)
- `flatIntoArrayWithCallback` (26)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:78` | Self: 0.7% (159.2ms) | Total: 0.7% (159.2ms) | Samples: 20

**Called by:**
- `meshFaceFrame` (20)

### `splice`
`[native code]` | Self: 0.7% (157.9ms) | Total: 0.7% (157.9ms) | Samples: 24

**Called by:**
- `triangulateFace` (24)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:11` | Self: 0.7% (156.9ms) | Total: 0.7% (156.9ms) | Samples: 21

**Called by:**
- `(anonymous)` (21)

### `abs`
`[native code]` | Self: 0.7% (153.2ms) | Total: 0.7% (153.2ms) | Samples: 21

**Called by:**
- `map` (19)
- `(anonymous)` (1)
- `triangulateFace` (1)

### `add`
`[native code]` | Self: 0.6% (145.4ms) | Total: 0.6% (145.4ms) | Samples: 21

**Called by:**
- `extrudeMeshFaces` (21)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:50` | Self: 0.6% (142.8ms) | Total: 0.6% (142.8ms) | Samples: 16

**Called by:**
- `(anonymous)` (13)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:117` | Self: 0.6% (137.0ms) | Total: 0.6% (137.0ms) | Samples: 16

**Called by:**
- `meshFaceFrame` (15)
- `extrudeMeshFaces` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` | Self: 0.6% (132.2ms) | Total: 4.0% (886.0ms) | Samples: 18

**Called by:**
- `extrudeMeshFaces` (112)

**Calls:**
- `flatMap` (47)
- `flatIntoArrayWithCallback` (40)
- `max` (7)

### `flatIntoArrayWithCallback`
`[native code]` | Self: 0.6% (130.4ms) | Total: 5.2% (1.13s) | Samples: 16

**Called by:**
- `flatMap` (66)
- `meshFaceFrame` (40)
- `triangulateFace` (26)

**Calls:**
- `flatIntoArray` (70)
- `(anonymous)` (36)
- `(anonymous)` (5)
- `(anonymous)` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:42` | Self: 0.5% (124.3ms) | Total: 0.6% (142.7ms) | Samples: 16

**Called by:**
- `meshFaceFrame` (23)

**Calls:**
- `max` (7)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.5% (120.4ms) | Total: 0.5% (120.4ms) | Samples: 11

**Called by:**
- `meshFaceFrame` (11)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:81` | Self: 0.5% (111.1ms) | Total: 0.5% (126.6ms) | Samples: 16

**Called by:**
- `meshFaceFrame` (17)

**Calls:**
- `max` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:69` | Self: 0.5% (110.0ms) | Total: 0.5% (110.0ms) | Samples: 15

**Called by:**
- `map` (15)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:85` | Self: 0.4% (106.7ms) | Total: 0.4% (106.7ms) | Samples: 14

**Called by:**
- `meshFaceFrame` (14)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:112` | Self: 0.4% (105.8ms) | Total: 0.8% (188.3ms) | Samples: 15

**Called by:**
- `meshFaceFrame` (22)
- `extrudeMeshFaces` (3)

**Calls:**
- `map` (10)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:50` | Self: 0.4% (104.7ms) | Total: 1.7% (389.1ms) | Samples: 13

**Called by:**
- `meshFaceFrame` (44)
- `extrudeMeshFaces` (2)

**Calls:**
- `map` (33)

### `has`
`[native code]` | Self: 0.4% (103.9ms) | Total: 0.4% (103.9ms) | Samples: 10

**Called by:**
- `extrudeMeshFaces` (9)
- `meshFaceRegion` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:108` | Self: 0.4% (103.5ms) | Total: 0.4% (103.5ms) | Samples: 9

**Called by:**
- `meshFaceFrame` (9)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:44` | Self: 0.4% (103.1ms) | Total: 1.2% (270.2ms) | Samples: 14

**Called by:**
- `extrudeMeshFaces` (35)

**Calls:**
- `map` (18)
- `max` (3)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:20` | Self: 0.4% (102.6ms) | Total: 0.4% (102.6ms) | Samples: 12

**Called by:**
- `editSceneMesh` (12)

### `meshEdgeKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:5` | Self: 0.4% (97.5ms) | Total: 0.4% (97.5ms) | Samples: 15

**Called by:**
- `indexMeshEdges` (15)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:19` | Self: 0.4% (97.4ms) | Total: 0.4% (97.4ms) | Samples: 14

**Called by:**
- `finish` (11)
- `selection` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:62` | Self: 0.4% (97.4ms) | Total: 0.4% (97.4ms) | Samples: 16

**Called by:**
- `map` (16)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:61` | Self: 0.4% (90.8ms) | Total: 0.4% (90.8ms) | Samples: 9

**Called by:**
- `extrudeMeshFaces` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:150` | Self: 0.4% (89.1ms) | Total: 0.5% (119.4ms) | Samples: 14

**Called by:**
- `meshFaceFrame` (15)
- `extrudeMeshFaces` (1)

**Calls:**
- `push` (2)

### `entries`
`[native code]` | Self: 0.4% (88.8ms) | Total: 0.4% (88.8ms) | Samples: 20

**Called by:**
- `indexSceneDocument` (11)
- `indexMeshEdges` (8)
- `geometry` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:11` | Self: 0.3% (85.9ms) | Total: 3.3% (725.3ms) | Samples: 6

**Called by:**
- `extrudeMeshFaces` (93)

**Calls:**
- `map` (87)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:79` | Self: 0.3% (85.0ms) | Total: 1.3% (296.8ms) | Samples: 10

**Called by:**
- `meshFaceFrame` (30)
- `extrudeMeshFaces` (3)

**Calls:**
- `map` (23)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:80` | Self: 0.3% (82.6ms) | Total: 0.4% (105.0ms) | Samples: 17

**Called by:**
- `meshFaceFrame` (20)

**Calls:**
- `min` (3)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 0.3% (80.6ms) | Total: 0.3% (80.6ms) | Samples: 8

**Called by:**
- `(anonymous)` (4)
- `(anonymous)` (2)
- `triangleUnitNormal` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` | Self: 0.3% (78.5ms) | Total: 0.3% (78.5ms) | Samples: 13

**Called by:**
- `map` (12)
- `every` (1)

### `every`
`[native code]` | Self: 0.3% (78.1ms) | Total: 3.3% (721.1ms) | Samples: 9

**Called by:**
- `extrudeMeshFaces` (99)
- `meshFaceFrame` (8)

**Calls:**
- `(anonymous)` (88)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:39` | Self: 0.3% (77.6ms) | Total: 0.3% (77.6ms) | Samples: 14

**Called by:**
- `meshFaceFrame` (14)

### `hypot`
`[native code]` | Self: 0.3% (76.9ms) | Total: 0.3% (76.9ms) | Samples: 8

**Called by:**
- `triangulateFace` (6)
- `normalize` (2)

### `flatMap`
`[native code]` | Self: 0.3% (76.4ms) | Total: 2.7% (604.2ms) | Samples: 12

**Called by:**
- `meshFaceFrame` (47)
- `triangulateFace` (31)

**Calls:**
- `flatIntoArrayWithCallback` (66)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:73` | Self: 0.3% (75.8ms) | Total: 1.0% (226.0ms) | Samples: 12

**Called by:**
- `meshFaceFrame` (31)
- `extrudeMeshFaces` (2)

**Calls:**
- `map` (21)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:78` | Self: 0.3% (73.9ms) | Total: 0.3% (73.9ms) | Samples: 6

**Called by:**
- `finish` (6)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:34` | Self: 0.3% (73.5ms) | Total: 0.3% (73.5ms) | Samples: 8

**Called by:**
- `editSceneMesh` (8)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` | Self: 0.3% (70.5ms) | Total: 2.1% (466.0ms) | Samples: 10

**Called by:**
- `editSceneMesh` (79)

**Calls:**
- `filter` (69)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:70` | Self: 0.3% (68.6ms) | Total: 0.5% (129.8ms) | Samples: 13

**Called by:**
- `meshFaceFrame` (16)
- `extrudeMeshFaces` (3)

**Calls:**
- `hypot` (6)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:16` | Self: 0.3% (67.2ms) | Total: 25.7% (5.58s) | Samples: 6

**Called by:**
- `extrudeMeshFaces` (711)
- `extrudeMeshFaces` (1)

**Calls:**
- `triangulateFace` (104)
- `triangulateFace` (71)
- `triangulateFace` (47)
- `triangulateFace` (44)
- `triangulateFace` (39)
- `triangulateFace` (31)
- `triangulateFace` (30)
- `triangulateFace` (27)
- `triangulateFace` (24)
- `triangulateFace` (23)
- `triangulateFace` (22)
- `triangulateFace` (21)
- `triangulateFace` (20)
- `triangulateFace` (20)
- `triangulateFace` (18)
- `triangulateFace` (17)
- `triangulateFace` (16)
- `triangulateFace` (15)
- `triangulateFace` (15)
- `triangulateFace` (14)
- `triangulateFace` (14)
- `triangulateFace` (10)
- `triangulateFace` (9)
- `triangulateFace` (8)
- `triangulateFace` (8)
- `triangulateFace` (7)
- `triangulateFace` (5)
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (3)
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

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:29` | Self: 0.3% (66.1ms) | Total: 0.3% (66.1ms) | Samples: 10

**Called by:**
- `finish` (10)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:10` | Self: 0.3% (65.1ms) | Total: 0.3% (70.9ms) | Samples: 12

**Called by:**
- `extrudeMeshFaces` (18)

**Calls:**
- `hasOwn` (6)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:39` | Self: 0.2% (65.0ms) | Total: 1.0% (225.0ms) | Samples: 8

**Called by:**
- `extrudeMeshFaces` (31)

**Calls:**
- `map` (23)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:64` | Self: 0.2% (64.6ms) | Total: 2.8% (628.2ms) | Samples: 8

**Called by:**
- `map` (78)

**Calls:**
- `(anonymous)` (39)
- `(anonymous)` (21)
- `(anonymous)` (6)
- `(anonymous)` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:56` | Self: 0.2% (63.5ms) | Total: 0.2% (63.5ms) | Samples: 12

**Called by:**
- `filter` (12)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:94` | Self: 0.2% (62.8ms) | Total: 0.4% (93.0ms) | Samples: 7

**Called by:**
- `meshFaceFrame` (10)

**Calls:**
- `intersect` (3)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:31` | Self: 0.2% (61.8ms) | Total: 0.4% (105.9ms) | Samples: 5

**Called by:**
- `finish` (9)
- `readSceneDocument` (1)

**Calls:**
- `max` (5)

### `indexOf`
`[native code]` | Self: 0.2% (61.6ms) | Total: 0.2% (61.6ms) | Samples: 8

**Called by:**
- `meshFaceFrame` (5)
- `triangulateFace` (3)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:59` | Self: 0.2% (61.2ms) | Total: 0.2% (61.2ms) | Samples: 5

**Called by:**
- `extrudeMeshFaces` (5)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` | Self: 0.2% (60.7ms) | Total: 0.2% (60.7ms) | Samples: 5

**Called by:**
- `extrudeMeshFaces` (4)
- `extrudeMeshFaces` (1)

### `deepEquals`
`[native code]` | Self: 0.2% (60.5ms) | Total: 0.2% (60.5ms) | Samples: 5

**Called by:**
- `deepStrictEqual` (5)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:24` | Self: 0.2% (59.6ms) | Total: 2.7% (585.9ms) | Samples: 4

**Called by:**
- `extrudeMeshFaces` (63)

**Calls:**
- `triangleUnitNormal` (38)
- `triangleUnitNormal` (11)
- `triangleUnitNormal` (4)
- `triangleUnitNormal` (2)
- `triangleUnitNormal` (1)
- `normalize` (1)
- `normalize` (1)
- `triangleUnitNormal` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:46` | Self: 0.2% (59.4ms) | Total: 0.2% (59.4ms) | Samples: 5

**Called by:**
- `flatIntoArrayWithCallback` (5)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:52` | Self: 0.2% (56.3ms) | Total: 0.2% (56.3ms) | Samples: 7

**Called by:**
- `map` (7)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:36` | Self: 0.2% (50.8ms) | Total: 48.6% (10.55s) | Samples: 9

**Called by:**
- `editSceneMesh` (1346)

**Calls:**
- `meshFaceFrame` (711)
- `meshFaceFrame` (112)
- `meshFaceFrame` (93)
- `meshFaceFrame` (63)
- `meshFaceFrame` (59)
- `meshFaceFrame` (53)
- `meshFaceFrame` (38)
- `meshFaceFrame` (36)
- `meshFaceFrame` (35)
- `meshFaceFrame` (34)
- `meshFaceFrame` (33)
- `meshFaceFrame` (31)
- `meshFaceFrame` (18)
- `meshFaceFrame` (8)
- `meshFaceFrame` (4)
- `meshFaceFrame` (4)
- `meshFaceFrame` (2)
- `meshFaceFrame` (2)
- `meshFaceFrame` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:66` | Self: 0.2% (48.7ms) | Total: 1.1% (247.7ms) | Samples: 6

**Called by:**
- `map` (28)

**Calls:**
- `map` (22)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:37` | Self: 0.2% (48.6ms) | Total: 0.2% (48.6ms) | Samples: 6

**Called by:**
- `editSceneMesh` (6)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` | Self: 0.2% (48.2ms) | Total: 0.2% (48.2ms) | Samples: 7

**Called by:**
- `finish` (7)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:30` | Self: 0.2% (48.1ms) | Total: 0.3% (86.3ms) | Samples: 6

**Called by:**
- `finish` (10)

**Calls:**
- `min` (4)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:28` | Self: 0.2% (48.1ms) | Total: 0.2% (48.1ms) | Samples: 8

**Called by:**
- `finish` (8)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:40` | Self: 0.2% (48.0ms) | Total: 0.2% (48.0ms) | Samples: 7

**Called by:**
- `map` (7)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:135` | Self: 0.2% (46.8ms) | Total: 0.2% (46.8ms) | Samples: 5

**Called by:**
- `meshFaceFrame` (4)
- `extrudeMeshFaces` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:27` | Self: 0.2% (46.7ms) | Total: 0.2% (46.7ms) | Samples: 11

**Called by:**
- `editSceneMesh` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:29` | Self: 0.2% (45.3ms) | Total: 0.2% (45.3ms) | Samples: 7

**Called by:**
- `map` (7)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:121` | Self: 0.2% (44.8ms) | Total: 0.2% (44.8ms) | Samples: 6

**Called by:**
- `meshFaceFrame` (5)
- `extrudeMeshFaces` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:12` | Self: 0.2% (44.4ms) | Total: 0.2% (44.4ms) | Samples: 4

**Called by:**
- `(anonymous)` (4)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:39` | Self: 0.1% (42.4ms) | Total: 3.2% (714.0ms) | Samples: 4

**Called by:**
- `editSceneMesh` (103)

**Calls:**
- `every` (99)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:60` | Self: 0.1% (42.4ms) | Total: 0.2% (57.5ms) | Samples: 6

**Called by:**
- `extrudeMeshFaces` (7)

**Calls:**
- `has` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:107` | Self: 0.1% (35.7ms) | Total: 0.1% (37.6ms) | Samples: 7

**Called by:**
- `meshFaceFrame` (8)
- `extrudeMeshFaces` (1)

**Calls:**
- `point` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:27` | Self: 0.1% (35.1ms) | Total: 0.1% (35.1ms) | Samples: 6

**Called by:**
- `finish` (3)
- `readSceneDocument` (2)
- `selection` (1)

### `keys`
`[native code]` | Self: 0.1% (34.3ms) | Total: 0.1% (34.3ms) | Samples: 6

**Called by:**
- `meshIdAllocator` (4)
- `(module)` (1)
- `geometry` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.1% (33.9ms) | Total: 0.1% (33.9ms) | Samples: 8

**Called by:**
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (2)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` | Self: 0.1% (32.2ms) | Total: 1.2% (269.3ms) | Samples: 7

**Called by:**
- `editSceneMesh` (46)

**Calls:**
- `map` (5)
- `triangulateFace` (4)
- `triangulateFace` (3)
- `triangulateFace` (3)
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
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)
- `triangulateFace` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:147` | Self: 0.1% (31.5ms) | Total: 0.1% (34.3ms) | Samples: 4

**Called by:**
- `meshFaceFrame` (7)

**Calls:**
- `point` (2)
- `abs` (1)

### `fromEntries`
`[native code]` | Self: 0.1% (31.0ms) | Total: 0.1% (31.0ms) | Samples: 2

**Called by:**
- `geometry` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:43` | Self: 0.1% (30.9ms) | Total: 0.1% (30.9ms) | Samples: 3

**Called by:**
- `every` (3)

### `values`
`[native code]` | Self: 0.1% (30.6ms) | Total: 0.1% (30.6ms) | Samples: 3

**Called by:**
- `sceneBounds` (3)

### `from`
`[native code]` | Self: 0.1% (30.5ms) | Total: 0.1% (30.5ms) | Samples: 2

**Called by:**
- `tuple` (1)
- `list` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` | Self: 0.1% (30.3ms) | Total: 0.1% (30.3ms) | Samples: 6

**Called by:**
- `(anonymous)` (6)

### `push`
`[native code]` | Self: 0.1% (30.3ms) | Total: 0.1% (30.3ms) | Samples: 2

**Called by:**
- `triangulateFace` (2)

### `intersect`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.1% (30.1ms) | Total: 0.1% (30.1ms) | Samples: 3

**Called by:**
- `triangulateFace` (3)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:48` | Self: 0.1% (29.3ms) | Total: 0.1% (29.3ms) | Samples: 2

**Called by:**
- `extrudeMeshFaces` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:97` | Self: 0.1% (29.2ms) | Total: 0.1% (29.2ms) | Samples: 3

**Called by:**
- `meshFaceFrame` (2)
- `extrudeMeshFaces` (1)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 0.1% (28.1ms) | Total: 0.2% (43.8ms) | Samples: 2

**Called by:**
- `triangleUnitNormal` (3)
- `meshFaceFrame` (1)

**Calls:**
- `hypot` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:74` | Self: 0.1% (27.6ms) | Total: 0.1% (27.6ms) | Samples: 2

**Called by:**
- `map` (2)

### `turn`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.1% (27.2ms) | Total: 0.1% (27.2ms) | Samples: 2

**Called by:**
- `triangulateFace` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:93` | Self: 0.1% (26.1ms) | Total: 0.1% (26.1ms) | Samples: 5

**Called by:**
- `map` (5)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:124` | Self: 0.0% (20.2ms) | Total: 0.2% (47.5ms) | Samples: 6

**Called by:**
- `meshFaceFrame` (8)

**Calls:**
- `turn` (2)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:61` | Self: 0.0% (18.1ms) | Total: 9.3% (2.02s) | Samples: 4

**Called by:**
- `editSceneMesh` (267)

**Calls:**
- `map` (263)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:33` | Self: 0.0% (18.0ms) | Total: 0.0% (18.0ms) | Samples: 4

**Called by:**
- `extrudeMeshFaces` (4)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:38` | Self: 0.0% (17.5ms) | Total: 0.0% (19.4ms) | Samples: 3

**Called by:**
- `editSceneMesh` (5)

**Calls:**
- `dot` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:106` | Self: 0.0% (17.0ms) | Total: 0.0% (17.9ms) | Samples: 3

**Called by:**
- `meshFaceFrame` (3)
- `extrudeMeshFaces` (1)

**Calls:**
- `point` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:111` | Self: 0.0% (16.6ms) | Total: 0.1% (32.0ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (3)

**Calls:**
- `sign` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (16.5ms) | Total: 0.0% (16.5ms) | Samples: 2

**Called by:**
- `map` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:45` | Self: 0.0% (16.4ms) | Total: 0.0% (16.4ms) | Samples: 2

**Called by:**
- `extrudeMeshFaces` (2)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` | Self: 0.0% (16.4ms) | Total: 0.0% (16.4ms) | Samples: 2

**Called by:**
- `triangleUnitNormal` (1)
- `meshFaceFrame` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:30` | Self: 0.0% (16.1ms) | Total: 0.0% (16.1ms) | Samples: 2

**Called by:**
- `evaluate` (2)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:35` | Self: 0.0% (16.0ms) | Total: 0.7% (161.4ms) | Samples: 1

**Called by:**
- `editSceneMesh` (22)

**Calls:**
- `add` (21)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:125` | Self: 0.0% (15.8ms) | Total: 0.8% (178.9ms) | Samples: 3

**Called by:**
- `meshFaceFrame` (18)
- `extrudeMeshFaces` (1)

**Calls:**
- `some` (16)

### `anonymous`
`[native code]` | Self: 0.0% (15.6ms) | Total: 0.7% (154.4ms) | Samples: 2

**Called by:**
- `internal:assert/assertion_error` (2)
- `loadAssertionError` (2)
- `internal:fs/streams` (2)
- `node:stream` (2)
- `get WriteStream` (2)
- `internal:stream` (2)
- `internal:streams/duplex` (1)
- `internal:streams/operators` (1)
- `internal:streams/pipeline` (1)
- `node:assert` (1)
- `internal:streams/compose` (1)

**Calls:**
- `internal:assert/assertion_error` (2)
- `internal:util/colors` (2)
- `internal:fs/streams` (2)
- `node:stream` (2)
- `internal:stream` (2)
- `internal:streams/duplex` (1)
- `internal:streams/operators` (1)
- `internal:primordials` (1)
- `internal:streams/pipeline` (1)
- `internal:streams/compose` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:51` | Self: 0.0% (15.6ms) | Total: 0.0% (15.6ms) | Samples: 1

**Called by:**
- `editSceneMesh` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:95` | Self: 0.0% (15.5ms) | Total: 0.0% (15.5ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `list`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:36` | Self: 0.0% (15.5ms) | Total: 0.1% (31.4ms) | Samples: 1

**Called by:**
- `tuple` (2)

**Calls:**
- `from` (1)

### `sign`
`[native code]` | Self: 0.0% (15.4ms) | Total: 0.0% (15.4ms) | Samples: 1

**Called by:**
- `triangulateFace` (1)

### `meshIdAllocator`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:8` | Self: 0.0% (15.4ms) | Total: 1.1% (247.4ms) | Samples: 3

**Called by:**
- `extrudeMeshFaces` (33)

**Calls:**
- `Set` (26)
- `keys` (4)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:24` | Self: 0.0% (15.2ms) | Total: 0.0% (15.2ms) | Samples: 1

**Called by:**
- `finish` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` | Self: 0.0% (15.2ms) | Total: 0.0% (15.2ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:49` | Self: 0.0% (15.0ms) | Total: 0.0% (17.0ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (3)

**Calls:**
- `isFinite` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:175` | Self: 0.0% (14.9ms) | Total: 0.1% (28.8ms) | Samples: 1

**Called by:**
- `map` (2)

**Calls:**
- `Set` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `link` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:97` | Self: 0.0% (14.9ms) | Total: 0.2% (47.7ms) | Samples: 2

**Called by:**
- `editSceneMesh` (6)

**Calls:**
- `(anonymous)` (4)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:98` | Self: 0.0% (14.8ms) | Total: 0.0% (15.7ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (2)

**Calls:**
- `point` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:77` | Self: 0.0% (14.8ms) | Total: 0.0% (14.8ms) | Samples: 1

**Called by:**
- `editSceneMesh` (1)

### `next`
`[native code]` | Self: 0.0% (14.2ms) | Total: 0.0% (14.2ms) | Samples: 1

**Called by:**
- `extrudeMeshFaces` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:110` | Self: 0.0% (14.1ms) | Total: 0.0% (14.1ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:37` | Self: 0.0% (12.9ms) | Total: 0.0% (12.9ms) | Samples: 1

**Called by:**
- `extrudeMeshFaces` (1)

### `copyDataProperties`
`[native code]` | Self: 0.0% (12.4ms) | Total: 0.0% (12.4ms) | Samples: 1

**Called by:**
- `evaluateSceneInstances` (1)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.0% (11.5ms) | Total: 0.0% (11.5ms) | Samples: 1

**Called by:**
- `triangleUnitNormal` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:28` | Self: 0.0% (11.5ms) | Total: 0.4% (100.3ms) | Samples: 1

**Called by:**
- `editSceneMesh` (10)

**Calls:**
- `has` (9)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:151` | Self: 0.0% (11.1ms) | Total: 0.0% (11.1ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `parseModule`
`[native code]` | Self: 0.0% (9.8ms) | Total: 0.1% (26.5ms) | Samples: 1

**Called by:**
- `async (anonymous)` (4)

**Calls:**
- `node:assert` (2)
- `node:assert` (1)

### `editable`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts` | Self: 0.0% (9.4ms) | Total: 0.0% (9.4ms) | Samples: 1

**Called by:**
- `editSceneMesh` (1)

### `hasOwn`
`[native code]` | Self: 0.0% (5.7ms) | Total: 0.0% (5.7ms) | Samples: 6

**Called by:**
- `meshFaceFrame` (6)

### `async (anonymous)`
`[native code]` | Self: 0.0% (2.3ms) | Total: 0.1% (31.2ms) | Samples: 1

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (4)
- `async (anonymous)` (1)

### `isFinite`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `triangulateFace` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:62` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (2)

### `dot`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `extrudeMeshFaces` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:96` | Self: 0.0% (1.8ms) | Total: 0.1% (30.2ms) | Samples: 2

**Called by:**
- `meshFaceFrame` (3)
- `extrudeMeshFaces` (1)

**Calls:**
- `point` (2)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:26` | Self: 0.0% (1.8ms) | Total: 1.0% (229.1ms) | Samples: 2

**Called by:**
- `extrudeMeshFaces` (34)

**Calls:**
- `map` (32)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:28` | Self: 0.0% (1.8ms) | Total: 0.1% (37.4ms) | Samples: 2

**Called by:**
- `extrudeMeshFaces` (10)

**Calls:**
- `entries` (8)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:19` | Self: 0.0% (1.2ms) | Total: 0.0% (15.4ms) | Samples: 1

**Called by:**
- `editSceneMesh` (2)

**Calls:**
- `next` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:29` | Self: 0.0% (1.1ms) | Total: 4.4% (973.9ms) | Samples: 1

**Called by:**
- `editSceneMesh` (117)

**Calls:**
- `meshFaceRegion` (74)
- `meshFaceRegion` (20)
- `meshFaceRegion` (9)
- `meshFaceRegion` (7)
- `meshFaceRegion` (5)
- `meshFaceRegion` (1)

### `internal:primordials`
`internal:primordials:50` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:22` | Self: 0.0% (985us) | Total: 0.0% (985us) | Samples: 1

**Called by:**
- `extrudeMeshFaces` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:42` | Self: 0.0% (962us) | Total: 0.0% (962us) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `indexMeshEdges`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:34` | Self: 0.0% (929us) | Total: 1.4% (305.5ms) | Samples: 1

**Called by:**
- `extrudeMeshFaces` (48)

**Calls:**
- `stringify` (32)
- `meshEdgeKey` (15)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:136` | Self: 0.0% (895us) | Total: 0.7% (158.8ms) | Samples: 1

**Called by:**
- `meshFaceFrame` (24)
- `extrudeMeshFaces` (1)

**Calls:**
- `splice` (24)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:245` | Self: 0.0% (886us) | Total: 91.9% (19.95s) | Samples: 1

**Called by:**
- `(module)` (2400)
- `(module)` (195)
- `(module)` (39)
- `(module)` (21)

**Calls:**
- `extrudeMeshFaces` (1346)
- `extrudeMeshFaces` (267)
- `extrudeMeshFaces` (186)
- `extrudeMeshFaces` (155)
- `extrudeMeshFaces` (117)
- `extrudeMeshFaces` (103)
- `extrudeMeshFaces` (97)
- `extrudeMeshFaces` (79)
- `extrudeMeshFaces` (67)
- `extrudeMeshFaces` (46)
- `extrudeMeshFaces` (33)
- `extrudeMeshFaces` (25)
- `extrudeMeshFaces` (22)
- `extrudeMeshFaces` (18)
- `extrudeMeshFaces` (12)
- `extrudeMeshFaces` (12)
- `extrudeMeshFaces` (11)
- `extrudeMeshFaces` (10)
- `extrudeMeshFaces` (8)
- `extrudeMeshFaces` (6)
- `extrudeMeshFaces` (6)
- `extrudeMeshFaces` (6)
- `extrudeMeshFaces` (6)
- `extrudeMeshFaces` (5)
- `extrudeMeshFaces` (5)
- `extrudeMeshFaces` (2)
- `extrudeMeshFaces` (2)
- `extrudeMeshFaces` (1)
- `extrudeMeshFaces` (1)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:40` | Self: 0.0% (872us) | Total: 0.0% (872us) | Samples: 1

**Called by:**
- `meshFaceFrame` (1)

### `meshFaceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:56` | Self: 0.0% (864us) | Total: 0.0% (864us) | Samples: 1

**Called by:**
- `extrudeMeshFaces` (1)

### `id`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `evaluateSceneInstances`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\evaluate.ts:60` | Self: 0.0% (0us) | Total: 0.0% (12.4ms) | Samples: 0

**Called by:**
- `sceneBounds` (1)

**Calls:**
- `copyDataProperties` (1)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.0% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `meshFaceFrame`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:34` | Self: 0.0% (0us) | Total: 0.2% (49.6ms) | Samples: 0

**Called by:**
- `extrudeMeshFaces` (8)

**Calls:**
- `every` (8)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:24` | Self: 0.0% (0us) | Total: 0.4% (106.2ms) | Samples: 0

**Called by:**
- `editSceneMesh` (12)

**Calls:**
- `cloneObject` (12)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:56` | Self: 0.0% (0us) | Total: 0.0% (890us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `keys` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts:10` | Self: 0.0% (0us) | Total: 1.6% (364.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (39)
- `extrudeMeshFaces` (4)

**Calls:**
- `(anonymous)` (30)
- `id` (13)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:31` | Self: 0.0% (0us) | Total: 0.0% (16.4ms) | Samples: 0

**Called by:**
- `editSceneMesh` (2)

**Calls:**
- `meshFaceFrame` (1)
- `meshFaceFrame` (1)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:21` | Self: 0.0% (0us) | Total: 0.1% (30.6ms) | Samples: 0

**Called by:**
- `finish` (3)

**Calls:**
- `values` (3)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:239` | Self: 0.0% (0us) | Total: 0.7% (173.3ms) | Samples: 0

**Called by:**
- `(module)` (27)
- `(module)` (1)

**Calls:**
- `selection` (28)

### `sceneBounds`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts:60` | Self: 0.0% (0us) | Total: 0.0% (12.4ms) | Samples: 0

**Called by:**
- `finish` (1)

**Calls:**
- `evaluateSceneInstances` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:22` | Self: 0.0% (0us) | Total: 5.4% (1.17s) | Samples: 0

**Called by:**
- `editSceneMesh` (155)

**Calls:**
- `indexMeshEdges` (48)
- `indexMeshEdges` (41)
- `indexMeshEdges` (28)
- `indexMeshEdges` (27)
- `indexMeshEdges` (10)
- `indexMeshEdges` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:42` | Self: 0.0% (0us) | Total: 0.1% (30.2ms) | Samples: 0

**Called by:**
- `evaluate` (3)

**Calls:**
- `deepStrictEqual` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:40` | Self: 0.0% (0us) | Total: 0.1% (32.7ms) | Samples: 0

**Called by:**
- `every` (4)

**Calls:**
- `sub` (4)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:18` | Self: 0.0% (0us) | Total: 0.2% (45.7ms) | Samples: 0

**Called by:**
- `editSceneMesh` (5)

**Calls:**
- `Set` (5)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:146` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `keys` (1)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `node:assert` (2)

**Calls:**
- `get` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:166` | Self: 0.0% (0us) | Total: 0.2% (63.7ms) | Samples: 0

**Called by:**
- `map` (6)

**Calls:**
- `map` (6)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.8% (21.65s) | Samples: 0

**Calls:**
- `(anonymous)` (2864)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:30` | Self: 0.0% (0us) | Total: 0.2% (46.7ms) | Samples: 0

**Called by:**
- `editSceneMesh` (6)

**Calls:**
- `Set` (6)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:412` | Self: 0.0% (0us) | Total: 0.7% (168.1ms) | Samples: 0

**Called by:**
- `sceneToJson` (6)
- `(module)` (5)
- `(module)` (3)

**Calls:**
- `map` (14)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:51` | Self: 0.0% (0us) | Total: 0.5% (122.8ms) | Samples: 0

**Called by:**
- `evaluate` (12)

**Calls:**
- `sceneToJson` (5)
- `readSceneDocument` (5)
- `readSceneDocument` (2)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:155` | Self: 0.0% (0us) | Total: 0.4% (92.5ms) | Samples: 0

**Called by:**
- `map` (8)

**Calls:**
- `map` (8)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (4.7ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:53` | Self: 0.0% (0us) | Total: 0.1% (30.3ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `deepStrictEqual` (2)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:81` | Self: 0.0% (0us) | Total: 0.2% (46.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)

**Calls:**
- `list` (2)
- `from` (1)

### `deepStrictEqual`
`node:assert:133` | Self: 0.0% (0us) | Total: 0.2% (60.5ms) | Samples: 0

**Called by:**
- `(module)` (3)
- `(module)` (2)

**Calls:**
- `deepEquals` (5)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `assign` (2)

**Calls:**
- `loadAssertionError` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:170` | Self: 0.0% (0us) | Total: 0.0% (17.5ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `id` (2)
- `id` (1)

### `tuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts:83` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `map` (1)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `refresh` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:40` | Self: 0.0% (0us) | Total: 0.0% (11.5ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (1)

**Calls:**
- `cross` (1)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:58` | Self: 0.0% (0us) | Total: 0.0% (15.0ms) | Samples: 0

**Called by:**
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `stringify` (2)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:79` | Self: 0.0% (0us) | Total: 0.1% (32.9ms) | Samples: 0

**Called by:**
- `editSceneMesh` (6)

**Calls:**
- `get` (3)
- `map` (3)

### `editSceneMesh`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:240` | Self: 0.0% (0us) | Total: 0.0% (9.4ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `editable` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:189` | Self: 0.0% (0us) | Total: 0.1% (29.6ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `map` (2)
- `entries` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:171` | Self: 0.0% (0us) | Total: 0.2% (46.1ms) | Samples: 0

**Called by:**
- `map` (3)

**Calls:**
- `tuple` (2)
- `tuple` (1)

### `geometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:154` | Self: 0.0% (0us) | Total: 0.1% (31.0ms) | Samples: 0

**Called by:**
- `map` (2)

**Calls:**
- `fromEntries` (2)

### `finish`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:317` | Self: 0.0% (0us) | Total: 5.5% (1.19s) | Samples: 0

**Called by:**
- `(module)` (134)
- `(module)` (14)
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (74)
- `indexSceneDocument` (11)
- `sceneBounds` (10)
- `sceneBounds` (10)
- `sceneBounds` (9)
- `sceneBounds` (8)
- `sceneBounds` (7)
- `indexSceneDocument` (7)
- `sceneBounds` (6)
- `sceneBounds` (3)
- `indexSceneDocument` (3)
- `sceneBounds` (1)
- `indexSceneDocument` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `anonymous` (2)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.0% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `assign` (2)

### `triangulateFace`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts:65` | Self: 0.0% (0us) | Total: 3.7% (816.5ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (104)
- `extrudeMeshFaces` (3)

**Calls:**
- `map` (107)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:22` | Self: 0.0% (0us) | Total: 0.2% (52.1ms) | Samples: 0

**Called by:**
- `finish` (7)
- `selection` (4)

**Calls:**
- `entries` (11)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `internal:util/colors` (2)

**Calls:**
- `(anonymous)` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:50` | Self: 0.0% (0us) | Total: 1.1% (248.0ms) | Samples: 0

**Called by:**
- `evaluate` (39)

**Calls:**
- `editSceneMesh` (39)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:25` | Self: 0.0% (0us) | Total: 0.6% (139.5ms) | Samples: 0

**Called by:**
- `editSceneMesh` (18)

**Calls:**
- `cloneObject` (18)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.8% (21.66s) | Samples: 0

**Called by:**
- `(anonymous)` (2864)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (2863)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `get` (2)

**Calls:**
- `anonymous` (2)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (43.28s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2863)
- `async loadAndEvaluateModule` (2863)

**Calls:**
- `evaluate` (2863)
- `moduleEvaluation` (2863)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.0% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts:25` | Self: 0.0% (0us) | Total: 1.1% (254.1ms) | Samples: 0

**Called by:**
- `flatIntoArrayWithCallback` (36)

**Calls:**
- `map` (34)
- `sub` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:69` | Self: 0.0% (0us) | Total: 88.4% (19.18s) | Samples: 0

**Called by:**
- `evaluate` (2562)

**Calls:**
- `editSceneMesh` (2400)
- `finish` (134)
- `editSceneMesh` (27)
- `editSceneMesh` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `extrudeMeshFaces`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts:23` | Self: 0.0% (0us) | Total: 1.1% (247.4ms) | Samples: 0

**Called by:**
- `editSceneMesh` (33)

**Calls:**
- `meshIdAllocator` (33)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:73` | Self: 0.0% (0us) | Total: 0.9% (201.2ms) | Samples: 0

**Called by:**
- `evaluate` (24)

**Calls:**
- `editSceneMesh` (21)
- `finish` (2)
- `digest` (1)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:36` | Self: 0.0% (0us) | Total: 0.1% (31.0ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (2)

**Calls:**
- `sub` (2)

### `triangleUnitNormal`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:39` | Self: 0.0% (0us) | Total: 0.2% (46.2ms) | Samples: 0

**Called by:**
- `meshFaceFrame` (4)

**Calls:**
- `normalize` (3)
- `normalize` (1)

### `sceneToJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentJson.ts:13` | Self: 0.0% (0us) | Total: 0.5% (123.5ms) | Samples: 0

**Called by:**
- `(module)` (5)
- `(module)` (4)

**Calls:**
- `readSceneDocument` (6)
- `readSceneDocument` (3)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:59` | Self: 0.0% (0us) | Total: 0.0% (883us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:63` | Self: 0.0% (0us) | Total: 7.9% (1.71s) | Samples: 0

**Called by:**
- `evaluate` (210)

**Calls:**
- `editSceneMesh` (195)
- `finish` (14)
- `editSceneMesh` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts:40` | Self: 0.0% (0us) | Total: 0.4% (94.1ms) | Samples: 0

**Called by:**
- `evaluate` (7)

**Calls:**
- `sceneToJson` (4)
- `readSceneDocument` (3)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (44.8ms) | Samples: 0

**Called by:**
- `link` (2)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (2)
- `moduleDeclarationInstantiation` (1)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.0% (14.8ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.0% (15.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 99.9% (21.67s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (2864)
- `refresh` (2)

**Calls:**
- `async loadAndEvaluateModule` (2864)
- `get WriteStream` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:191` | Self: 0.0% (0us) | Total: 0.0% (15.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `tuple` (1)

### `readSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:435` | Self: 0.0% (0us) | Total: 0.2% (48.7ms) | Samples: 0

**Called by:**
- `sceneToJson` (3)
- `(module)` (2)

**Calls:**
- `indexSceneDocument` (2)
- `indexSceneDocument` (2)
- `sceneBounds` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (21.64s) | Samples: 0

**Called by:**
- `moduleEvaluation` (2863)

**Calls:**
- `(module)` (2562)
- `(module)` (210)
- `(module)` (39)
- `(module)` (24)
- `(module)` (12)
- `(module)` (7)
- `(module)` (3)
- `(module)` (2)
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)

### `node:assert`
`node:assert:2` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts:190` | Self: 0.0% (0us) | Total: 0.0% (13.0ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `id` (1)

### `selection`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts:280` | Self: 0.0% (0us) | Total: 0.7% (173.3ms) | Samples: 0

**Called by:**
- `editSceneMesh` (28)

**Calls:**
- `indexSceneDocument` (20)
- `indexSceneDocument` (4)
- `indexSceneDocument` (3)
- `indexSceneDocument` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 31.9% | 6.93s | `[native code]` |
| 18.2% | 3.95s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\triangulate.ts` |
| 16.1% | 3.51s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshExtrude.ts` |
| 13.6% | 2.96s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshFaceFrame.ts` |
| 9.8% | 2.13s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\meshTopology.ts` |
| 4.1% | 897.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts` |
| 2.1% | 471.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 1.5% | 346.4ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\bounds.ts` |
| 1.2% | 267.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-surface.ts` |
| 0.8% | 175.7ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\validation.ts` |
| 0.0% | 14.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\readDocument.ts` |
| 0.0% | 10.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\commands.ts` |
| 0.0% | 1.0ms | `internal:primordials` |
