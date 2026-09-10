# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 9.53s | 1292 | 1.0ms | 110 |

**Top 10:** `normalize` 11.2%, `triangle` 10.2%, `triangle` 10.1%, `faceRegion` 10.0%, `hypot` 8.3%, `typedArrayViewTypedArrayFromFast` 6.7%, `triangle` 6.5%, `Float32BufferAttribute` 5.4%, `buildSphere` 4.7%, `buildSphere` 3.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 11.2% | 1.07s | 15.6% | 1.49s | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 10.2% | 980.6ms | 10.2% | 980.6ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 10.1% | 963.0ms | 10.1% | 963.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 10.0% | 954.6ms | 11.6% | 1.10s | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |
| 8.3% | 800.2ms | 8.3% | 800.2ms | `hypot` | `[native code]` |
| 6.7% | 645.5ms | 6.7% | 645.5ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 6.5% | 620.8ms | 6.6% | 635.2ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 5.4% | 518.7ms | 6.5% | 624.6ms | `Float32BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17703` |
| 4.7% | 456.5ms | 38.3% | 3.65s | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` |
| 3.5% | 337.2ms | 22.8% | 2.17s | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:236` |
| 2.6% | 252.8ms | 2.6% | 252.8ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:41` |
| 2.3% | 219.5ms | 2.3% | 219.5ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 1.6% | 156.7ms | 1.6% | 156.7ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:47` |
| 1.5% | 151.4ms | 1.5% | 151.4ms | `faceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` |
| 1.4% | 135.7ms | 1.4% | 135.7ms | `join` | `[native code]` |
| 1.3% | 129.9ms | 1.3% | 129.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 1.3% | 126.6ms | 1.3% | 126.6ms | `mapFaceUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:273` |
| 1.2% | 122.2ms | 1.2% | 122.2ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 1.1% | 108.5ms | 1.1% | 108.5ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:221` |
| 0.9% | 91.8ms | 0.9% | 91.8ms | `BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16722` |
| 0.8% | 78.5ms | 0.8% | 78.5ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.8% | 76.6ms | 1.8% | 172.4ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18193` |
| 0.7% | 70.3ms | 0.7% | 70.3ms | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.6% | 58.1ms | 70.9% | 6.76s | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:39` |
| 0.5% | 51.0ms | 0.5% | 51.0ms | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2309` |
| 0.4% | 44.7ms | 0.4% | 44.7ms | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.3% | 37.9ms | 0.3% | 37.9ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.3% | 31.1ms | 4.1% | 399.2ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:83` |
| 0.2% | 19.2ms | 0.3% | 33.7ms | `parseModule` | `[native code]` |
| 0.1% | 18.1ms | 0.1% | 18.1ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` |
| 0.1% | 16.1ms | 0.1% | 16.1ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18243` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:27` |
| 0.1% | 15.7ms | 0.5% | 49.1ms | `map` | `[native code]` |
| 0.1% | 15.5ms | 2.4% | 237.9ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` |
| 0.1% | 14.6ms | 0.1% | 14.6ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18292` |
| 0.1% | 14.4ms | 1.4% | 136.9ms | `anonymous` | `[native code]` |
| 0.1% | 14.3ms | 1.6% | 154.6ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:73` |
| 0.1% | 13.5ms | 98.8% | 9.42s | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:40` |
| 0.1% | 13.1ms | 0.1% | 13.1ms | `EventDispatcher` | `[native code]` |
| 0.1% | 13.0ms | 0.1% | 13.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.1% | 9.6ms | 0.1% | 9.6ms | `newRegistryEntry` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `geometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `requestInstantiate` | `[native code]` |
| 0.0% | 1.8ms | 0.6% | 60.3ms | `geometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:52` |
| 0.0% | 992us | 0.0% | 992us | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18300` |
| 0.0% | 969us | 0.0% | 969us | `(unknown)` | `[native code]` |
| 0.0% | 926us | 0.0% | 926us | `BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16777` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 18.94s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.8% | 9.51s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 99.7% | 9.50s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 99.5% | 9.49s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 99.3% | 9.47s | 0.0% | 0us | `evaluate` | `[native code]` |
| 98.8% | 9.42s | 0.1% | 13.5ms | `paletteUpdate` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:40` |
| 98.0% | 9.34s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:49` |
| 96.9% | 9.23s | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:25` |
| 70.9% | 6.76s | 0.6% | 58.1ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:39` |
| 62.7% | 5.97s | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:284` |
| 38.3% | 3.65s | 4.7% | 456.5ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` |
| 22.8% | 2.17s | 3.5% | 337.2ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:236` |
| 16.9% | 1.61s | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` |
| 15.6% | 1.49s | 11.2% | 1.07s | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` |
| 12.9% | 1.23s | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:53` |
| 11.6% | 1.10s | 0.0% | 0us | `mapFaceUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` |
| 11.6% | 1.10s | 10.0% | 954.6ms | `faceRegion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` |
| 10.2% | 980.6ms | 10.2% | 980.6ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` |
| 10.1% | 963.0ms | 10.1% | 963.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` |
| 8.3% | 800.2ms | 8.3% | 800.2ms | `hypot` | `[native code]` |
| 6.7% | 645.5ms | 6.7% | 645.5ms | `typedArrayViewTypedArrayFromFast` | `[native code]` |
| 6.7% | 645.5ms | 0.0% | 0us | `from` | `[native code]` |
| 6.6% | 635.2ms | 6.5% | 620.8ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` |
| 6.5% | 624.6ms | 5.4% | 518.7ms | `Float32BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17703` |
| 6.1% | 583.1ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:290` |
| 4.1% | 399.2ms | 0.3% | 31.1ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:83` |
| 3.6% | 347.6ms | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:59` |
| 3.1% | 299.9ms | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` |
| 3.1% | 298.0ms | 0.0% | 0us | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:81` |
| 2.6% | 252.8ms | 2.6% | 252.8ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:41` |
| 2.4% | 237.9ms | 0.1% | 15.5ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` |
| 2.3% | 219.5ms | 2.3% | 219.5ms | `sub` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` |
| 2.0% | 196.4ms | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:108` |
| 1.8% | 176.5ms | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:61` |
| 1.8% | 172.4ms | 0.8% | 76.6ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18193` |
| 1.6% | 156.7ms | 1.6% | 156.7ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:47` |
| 1.6% | 154.6ms | 0.1% | 14.3ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` |
| 1.5% | 151.4ms | 1.5% | 151.4ms | `faceKey` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` |
| 1.5% | 149.2ms | 0.0% | 0us | `build` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:109` |
| 1.4% | 136.9ms | 0.1% | 14.4ms | `anonymous` | `[native code]` |
| 1.4% | 135.7ms | 1.4% | 135.7ms | `join` | `[native code]` |
| 1.3% | 129.9ms | 1.3% | 129.9ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` |
| 1.3% | 126.6ms | 1.3% | 126.6ms | `mapFaceUv` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:273` |
| 1.2% | 122.2ms | 1.2% | 122.2ms | `normalize` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` |
| 1.1% | 108.5ms | 1.1% | 108.5ms | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:221` |
| 1.0% | 100.4ms | 0.0% | 0us | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:60` |
| 0.9% | 91.8ms | 0.9% | 91.8ms | `BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16722` |
| 0.8% | 79.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:43` |
| 0.8% | 78.5ms | 0.8% | 78.5ms | `cross` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` |
| 0.7% | 70.3ms | 0.7% | 70.3ms | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.6% | 65.4ms | 0.0% | 0us | `link` | `[native code]` |
| 0.6% | 60.3ms | 0.0% | 1.8ms | `geometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` |
| 0.5% | 51.0ms | 0.5% | 51.0ms | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2309` |
| 0.5% | 49.1ms | 0.1% | 15.7ms | `map` | `[native code]` |
| 0.4% | 44.7ms | 0.4% | 44.7ms | `generateUUID` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 0.4% | 43.3ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.4% | 42.5ms | 0.0% | 0us | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:232` |
| 0.3% | 37.9ms | 0.3% | 37.9ms | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.3% | 33.7ms | 0.2% | 19.2ms | `parseModule` | `[native code]` |
| 0.3% | 33.5ms | 0.0% | 0us | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:230` |
| 0.3% | 33.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:20` |
| 0.3% | 33.3ms | 0.0% | 0us | `PartGeometryResource` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:15` |
| 0.3% | 33.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:20` |
| 0.3% | 31.7ms | 0.0% | 0us | `geometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:50` |
| 0.1% | 18.1ms | 0.1% | 18.1ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` |
| 0.1% | 17.5ms | 0.0% | 0us | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:233` |
| 0.1% | 16.1ms | 0.1% | 16.1ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18243` |
| 0.1% | 16.0ms | 0.1% | 16.0ms | `triangle` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` |
| 0.1% | 15.9ms | 0.1% | 15.9ms | `update` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:27` |
| 0.1% | 15.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:17` |
| 0.1% | 15.7ms | 0.0% | 0us | `assetFromJson` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` |
| 0.1% | 15.7ms | 0.0% | 0us | `readMoldaDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` |
| 0.1% | 15.7ms | 0.0% | 0us | `bakeTwins` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\twins.ts:192` |
| 0.1% | 15.7ms | 0.0% | 0us | `buildSphere` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:231` |
| 0.1% | 14.6ms | 0.1% | 14.6ms | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18292` |
| 0.1% | 14.2ms | 0.0% | 0us | `GeometryBuilder` | `[native code]` |
| 0.1% | 14.2ms | 0.1% | 14.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:73` |
| 0.1% | 14.2ms | 0.0% | 0us | `buildPartGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:272` |
| 0.1% | 13.6ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.1% | 13.6ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.1% | 13.6ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.1% | 13.6ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.1% | 13.6ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.1% | 13.6ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.1% | 13.1ms | 0.0% | 0us | `BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16698` |
| 0.1% | 13.1ms | 0.1% | 13.1ms | `EventDispatcher` | `[native code]` |
| 0.1% | 13.0ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.1% | 13.0ms | 0.1% | 13.0ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.1% | 9.6ms | 0.1% | 9.6ms | `newRegistryEntry` | `[native code]` |
| 0.1% | 9.6ms | 0.0% | 0us | `ensureRegistered` | `[native code]` |
| 0.0% | 4.3ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.0% | 2.7ms | 0.0% | 2.7ms | `geometryHash` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` |
| 0.0% | 2.1ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 2.1ms | 0.0% | 2.1ms | `requestInstantiate` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `buildGeometry` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:52` |
| 0.0% | 992us | 0.0% | 992us | `BufferGeometry` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18300` |
| 0.0% | 969us | 0.0% | 969us | `(unknown)` | `[native code]` |
| 0.0% | 969us | 0.0% | 0us | `point` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 0.0% | 926us | 0.0% | 926us | `BufferAttribute` | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16777` |
| 0.0% | 893us | 0.0% | 0us | `node:assert` | `node:assert:2` |

## Function Details

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:21` | Self: 11.2% (1.07s) | Total: 15.6% (1.49s) | Samples: 136

**Called by:**
- `triangle` (189)

**Calls:**
- `hypot` (53)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:85` | Self: 10.2% (980.6ms) | Total: 10.2% (980.6ms) | Samples: 152

**Called by:**
- `buildSphere` (117)
- `buildSphere` (35)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:86` | Self: 10.1% (963.0ms) | Total: 10.1% (963.0ms) | Samples: 127

**Called by:**
- `buildSphere` (95)
- `buildSphere` (32)

### `faceRegion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:247` | Self: 10.0% (954.6ms) | Total: 11.6% (1.10s) | Samples: 136

**Called by:**
- `mapFaceUv` (162)

**Calls:**
- `faceKey` (26)

### `hypot`
`[native code]` | Self: 8.3% (800.2ms) | Total: 8.3% (800.2ms) | Samples: 98

**Called by:**
- `normalize` (53)
- `triangle` (44)
- `triangle` (1)

### `typedArrayViewTypedArrayFromFast`
`[native code]` | Self: 6.7% (645.5ms) | Total: 6.7% (645.5ms) | Samples: 94

**Called by:**
- `from` (94)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:87` | Self: 6.5% (620.8ms) | Total: 6.6% (635.2ms) | Samples: 83

**Called by:**
- `buildSphere` (50)
- `buildSphere` (34)

**Calls:**
- `hypot` (1)

### `Float32BufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:17703` | Self: 5.4% (518.7ms) | Total: 6.5% (624.6ms) | Samples: 60

**Called by:**
- `buildGeometry` (35)
- `buildGeometry` (21)
- `buildGeometry` (16)

**Calls:**
- `BufferAttribute` (10)
- `BufferAttribute` (1)
- `BufferAttribute` (1)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:238` | Self: 4.7% (456.5ms) | Total: 38.3% (3.65s) | Samples: 69

**Called by:**
- `buildPartGeometry` (507)

**Calls:**
- `triangle` (117)
- `triangle` (111)
- `triangle` (95)
- `triangle` (50)
- `triangle` (24)
- `triangle` (23)
- `triangle` (18)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:236` | Self: 3.5% (337.2ms) | Total: 22.8% (2.17s) | Samples: 37

**Called by:**
- `buildPartGeometry` (273)

**Calls:**
- `triangle` (90)
- `triangle` (35)
- `triangle` (34)
- `triangle` (32)
- `triangle` (29)
- `triangle` (15)
- `triangle` (1)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:41` | Self: 2.6% (252.8ms) | Total: 2.6% (252.8ms) | Samples: 35

**Called by:**
- `update` (35)

### `sub`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:30` | Self: 2.3% (219.5ms) | Total: 2.3% (219.5ms) | Samples: 24

**Called by:**
- `triangle` (24)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:47` | Self: 1.6% (156.7ms) | Total: 1.6% (156.7ms) | Samples: 22

**Called by:**
- `update` (22)

### `faceKey`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:54` | Self: 1.5% (151.4ms) | Total: 1.5% (151.4ms) | Samples: 26

**Called by:**
- `faceRegion` (26)

### `join`
`[native code]` | Self: 1.4% (135.7ms) | Total: 1.4% (135.7ms) | Samples: 17

**Called by:**
- `geometryHash` (6)
- `update` (6)
- `geometryHash` (5)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:89` | Self: 1.3% (129.9ms) | Total: 1.3% (129.9ms) | Samples: 24

**Called by:**
- `buildSphere` (24)

### `mapFaceUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:273` | Self: 1.3% (126.6ms) | Total: 1.3% (126.6ms) | Samples: 26

**Called by:**
- `buildGeometry` (26)

### `normalize`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:22` | Self: 1.2% (122.2ms) | Total: 1.2% (122.2ms) | Samples: 12

**Called by:**
- `triangle` (12)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:221` | Self: 1.1% (108.5ms) | Total: 1.1% (108.5ms) | Samples: 13

**Called by:**
- `buildSphere` (4)
- `buildSphere` (4)
- `buildSphere` (4)
- `buildSphere` (1)

### `BufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16722` | Self: 0.9% (91.8ms) | Total: 0.9% (91.8ms) | Samples: 10

**Called by:**
- `Float32BufferAttribute` (10)

### `cross`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts:9` | Self: 0.8% (78.5ms) | Total: 0.8% (78.5ms) | Samples: 9

**Called by:**
- `triangle` (9)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18193` | Self: 0.8% (76.6ms) | Total: 1.8% (172.4ms) | Samples: 8

**Called by:**
- `buildGeometry` (23)

**Calls:**
- `generateUUID` (9)
- `generateUUID` (6)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` | Self: 0.7% (70.3ms) | Total: 0.7% (70.3ms) | Samples: 6

**Called by:**
- `buildGeometry` (6)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:39` | Self: 0.6% (58.1ms) | Total: 70.9% (6.76s) | Samples: 5

**Called by:**
- `update` (903)
- `PartGeometryResource` (1)

**Calls:**
- `buildPartGeometry` (798)
- `buildPartGeometry` (83)
- `buildPartGeometry` (6)
- `build` (5)
- `build` (3)
- `build` (3)
- `buildPartGeometry` (1)

### `generateUUID`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:2309` | Self: 0.5% (51.0ms) | Total: 0.5% (51.0ms) | Samples: 9

**Called by:**
- `BufferGeometry` (9)

### `generateUUID`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` | Self: 0.4% (44.7ms) | Total: 0.4% (44.7ms) | Samples: 6

**Called by:**
- `BufferGeometry` (6)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` | Self: 0.3% (37.9ms) | Total: 0.3% (37.9ms) | Samples: 4

**Called by:**
- `buildPartGeometry` (4)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:83` | Self: 0.3% (31.1ms) | Total: 4.1% (399.2ms) | Samples: 8

**Called by:**
- `buildSphere` (29)
- `buildSphere` (23)

**Calls:**
- `hypot` (44)

### `parseModule`
`[native code]` | Self: 0.2% (19.2ms) | Total: 0.3% (33.7ms) | Samples: 5

**Called by:**
- `async (anonymous)` (7)

**Calls:**
- `node:assert` (1)
- `node:assert` (1)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18185` | Self: 0.1% (18.1ms) | Total: 0.1% (18.1ms) | Samples: 5

**Called by:**
- `buildGeometry` (5)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18243` | Self: 0.1% (16.1ms) | Total: 0.1% (16.1ms) | Samples: 1

**Called by:**
- `buildGeometry` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:92` | Self: 0.1% (16.0ms) | Total: 0.1% (16.0ms) | Samples: 1

**Called by:**
- `buildSphere` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:27` | Self: 0.1% (15.9ms) | Total: 0.1% (15.9ms) | Samples: 1

**Called by:**
- `paletteUpdate` (1)

### `map`
`[native code]` | Self: 0.1% (15.7ms) | Total: 0.5% (49.1ms) | Samples: 1

**Called by:**
- `(module)` (5)
- `bakeTwins` (1)

**Calls:**
- `(anonymous)` (5)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:58` | Self: 0.1% (15.5ms) | Total: 2.4% (237.9ms) | Samples: 1

**Called by:**
- `update` (32)

**Calls:**
- `BufferGeometry` (23)
- `BufferGeometry` (5)
- `BufferGeometry` (1)
- `BufferGeometry` (1)
- `BufferGeometry` (1)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18292` | Self: 0.1% (14.6ms) | Total: 0.1% (14.6ms) | Samples: 1

**Called by:**
- `buildGeometry` (1)

### `anonymous`
`[native code]` | Self: 0.1% (14.4ms) | Total: 1.4% (136.9ms) | Samples: 2

**Called by:**
- `internal:assert/assertion_error` (1)
- `loadAssertionError` (1)
- `internal:fs/streams` (1)
- `internal:streams/duplex` (1)
- `node:stream` (1)
- `internal:streams/operators` (1)
- `get WriteStream` (1)
- `internal:streams/pipeline` (1)
- `node:assert` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)

**Calls:**
- `internal:assert/assertion_error` (1)
- `internal:util/colors` (1)
- `internal:fs/streams` (1)
- `internal:streams/duplex` (1)
- `node:stream` (1)
- `internal:streams/operators` (1)
- `internal:streams/pipeline` (1)
- `internal:stream` (1)
- `internal:streams/compose` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:23` | Self: 0.1% (14.3ms) | Total: 1.6% (154.6ms) | Samples: 2

**Called by:**
- `paletteUpdate` (24)

**Calls:**
- `geometryHash` (7)
- `join` (6)
- `geometryHash` (6)
- `geometryHash` (3)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:73` | Self: 0.1% (14.2ms) | Total: 0.1% (14.2ms) | Samples: 1

**Called by:**
- `GeometryBuilder` (1)

### `paletteUpdate`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:40` | Self: 0.1% (13.5ms) | Total: 98.8% (9.42s) | Samples: 2

**Called by:**
- `(module)` (1263)
- `(module)` (13)

**Calls:**
- `update` (1249)
- `update` (24)
- `update` (1)

### `EventDispatcher`
`[native code]` | Self: 0.1% (13.1ms) | Total: 0.1% (13.1ms) | Samples: 1

**Called by:**
- `BufferAttribute` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.1% (13.0ms) | Total: 0.1% (13.0ms) | Samples: 1

**Called by:**
- `link` (1)

### `newRegistryEntry`
`[native code]` | Self: 0.1% (9.6ms) | Total: 0.1% (9.6ms) | Samples: 1

**Called by:**
- `ensureRegistered` (1)

### `geometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` | Self: 0.0% (2.7ms) | Total: 0.0% (2.7ms) | Samples: 3

**Called by:**
- `update` (3)

### `requestInstantiate`
`[native code]` | Self: 0.0% (2.1ms) | Total: 0.0% (2.1ms) | Samples: 1

**Called by:**
- `requestSatisfyUtil` (1)

### `geometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:51` | Self: 0.0% (1.8ms) | Total: 0.6% (60.3ms) | Samples: 2

**Called by:**
- `update` (7)

**Calls:**
- `join` (5)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:52` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `PartGeometryResource` (1)

### `BufferGeometry`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:18300` | Self: 0.0% (992us) | Total: 0.0% (992us) | Samples: 1

**Called by:**
- `buildGeometry` (1)

### `(unknown)`
`[native code]` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `point` (1)

### `BufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16777` | Self: 0.0% (926us) | Total: 0.0% (926us) | Samples: 1

**Called by:**
- `Float32BufferAttribute` (1)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:232` | Self: 0.0% (0us) | Total: 0.4% (42.5ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (4)

**Calls:**
- `point` (4)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (13.0ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `link` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:290` | Self: 0.0% (0us) | Total: 6.1% (583.1ms) | Samples: 0

**Called by:**
- `buildGeometry` (83)

**Calls:**
- `build` (33)
- `build` (26)
- `build` (24)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.5% (9.49s) | Samples: 0

**Called by:**
- `(anonymous)` (1283)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (1282)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)
- `linkAndEvaluateModule` (1)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:108` | Self: 0.0% (0us) | Total: 2.0% (196.4ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (26)
- `buildGeometry` (3)

**Calls:**
- `from` (29)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:17` | Self: 0.0% (0us) | Total: 0.1% (15.7ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `assetFromJson` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:43` | Self: 0.0% (0us) | Total: 0.8% (79.0ms) | Samples: 0

**Called by:**
- `evaluate` (13)

**Calls:**
- `paletteUpdate` (13)

### `GeometryBuilder`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (14.2ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (1)

**Calls:**
- `(anonymous)` (1)

### `geometryHash`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts:50` | Self: 0.0% (0us) | Total: 0.3% (31.7ms) | Samples: 0

**Called by:**
- `update` (6)

**Calls:**
- `join` (6)

### `from`
`[native code]` | Self: 0.0% (0us) | Total: 6.7% (645.5ms) | Samples: 0

**Called by:**
- `build` (38)
- `build` (29)
- `build` (27)

**Calls:**
- `typedArrayViewTypedArrayFromFast` (94)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:109` | Self: 0.0% (0us) | Total: 1.5% (149.2ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (24)
- `buildGeometry` (3)

**Calls:**
- `from` (27)

### `BufferAttribute`
`C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js:16698` | Self: 0.0% (0us) | Total: 0.1% (13.1ms) | Samples: 0

**Called by:**
- `Float32BufferAttribute` (1)

**Calls:**
- `EventDispatcher` (1)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:61` | Self: 0.0% (0us) | Total: 1.8% (176.5ms) | Samples: 0

**Called by:**
- `update` (21)

**Calls:**
- `Float32BufferAttribute` (21)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `assetFromJson`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\assetJson.ts:50` | Self: 0.0% (0us) | Total: 0.1% (15.7ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `readMoldaDocument` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anonymous` (1)

### `readMoldaDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\documentReader.ts:24` | Self: 0.0% (0us) | Total: 0.1% (15.7ms) | Samples: 0

**Called by:**
- `assetFromJson` (1)

**Calls:**
- `bakeTwins` (1)

### `PartGeometryResource`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:15` | Self: 0.0% (0us) | Total: 0.3% (33.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `buildGeometry` (3)
- `buildGeometry` (1)
- `buildGeometry` (1)

### `mapFaceUv`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts:263` | Self: 0.0% (0us) | Total: 11.6% (1.10s) | Samples: 0

**Called by:**
- `buildGeometry` (162)

**Calls:**
- `faceRegion` (162)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:84` | Self: 0.0% (0us) | Total: 16.9% (1.61s) | Samples: 0

**Called by:**
- `buildSphere` (111)
- `buildSphere` (90)

**Calls:**
- `normalize` (189)
- `normalize` (12)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `node:assert`
`node:assert:2` | Self: 0.0% (0us) | Total: 0.0% (893us) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `triangle`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:81` | Self: 0.0% (0us) | Total: 3.1% (298.0ms) | Samples: 0

**Called by:**
- `buildSphere` (18)
- `buildSphere` (15)

**Calls:**
- `sub` (24)
- `cross` (9)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 99.8% (9.51s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (1286)
- `refresh` (1)

**Calls:**
- `async loadAndEvaluateModule` (1283)
- `async (anonymous)` (3)
- `get WriteStream` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.6% (65.4ms) | Samples: 0

**Called by:**
- `link` (4)
- `linkAndEvaluateModule` (1)

**Calls:**
- `link` (4)
- `moduleDeclarationInstantiation` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.4% (43.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `parseModule` (7)
- `ensureRegistered` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:20` | Self: 0.0% (0us) | Total: 0.3% (33.3ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `map` (5)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `assign` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:49` | Self: 0.0% (0us) | Total: 98.0% (9.34s) | Samples: 0

**Called by:**
- `evaluate` (1263)

**Calls:**
- `paletteUpdate` (1263)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:231` | Self: 0.0% (0us) | Total: 0.1% (15.7ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (1)

**Calls:**
- `point` (1)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (4.3ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:284` | Self: 0.0% (0us) | Total: 62.7% (5.97s) | Samples: 0

**Called by:**
- `buildGeometry` (798)

**Calls:**
- `buildSphere` (507)
- `buildSphere` (273)
- `buildSphere` (5)
- `buildSphere` (4)
- `buildSphere` (4)
- `buildSphere` (4)
- `buildSphere` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.1ms) | Samples: 0

**Called by:**
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (1)

### `ensureRegistered`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (9.6ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `newRegistryEntry` (1)

### `point`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` | Self: 0.0% (0us) | Total: 0.0% (969us) | Samples: 0

**Called by:**
- `buildSphere` (1)

**Calls:**
- `(unknown)` (1)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:230` | Self: 0.0% (0us) | Total: 0.3% (33.5ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (5)

**Calls:**
- `point` (4)
- `point` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.7% (9.50s) | Samples: 0

**Calls:**
- `(anonymous)` (1286)

### `buildPartGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:272` | Self: 0.0% (0us) | Total: 0.1% (14.2ms) | Samples: 0

**Called by:**
- `buildGeometry` (1)

**Calls:**
- `GeometryBuilder` (1)

### `build`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:107` | Self: 0.0% (0us) | Total: 3.1% (299.9ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (33)
- `buildGeometry` (5)

**Calls:**
- `from` (38)

### `buildSphere`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts:233` | Self: 0.0% (0us) | Total: 0.1% (17.5ms) | Samples: 0

**Called by:**
- `buildPartGeometry` (4)

**Calls:**
- `point` (4)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (18.94s) | Samples: 0

**Called by:**
- `moduleEvaluation` (1282)
- `async loadAndEvaluateModule` (1282)

**Calls:**
- `evaluate` (1282)
- `moduleEvaluation` (1282)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts:20` | Self: 0.0% (0us) | Total: 0.3% (33.3ms) | Samples: 0

**Called by:**
- `map` (5)

**Calls:**
- `PartGeometryResource` (5)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.1% (13.6ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:53` | Self: 0.0% (0us) | Total: 12.9% (1.23s) | Samples: 0

**Called by:**
- `update` (185)
- `PartGeometryResource` (3)

**Calls:**
- `mapFaceUv` (162)
- `mapFaceUv` (26)

### `bakeTwins`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\twins.ts:192` | Self: 0.0% (0us) | Total: 0.1% (15.7ms) | Samples: 0

**Called by:**
- `readMoldaDocument` (1)

**Calls:**
- `map` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.3% (9.47s) | Samples: 0

**Called by:**
- `moduleEvaluation` (1282)

**Calls:**
- `(module)` (1263)
- `(module)` (13)
- `(module)` (5)
- `(module)` (1)

### `update`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:25` | Self: 0.0% (0us) | Total: 96.9% (9.23s) | Samples: 0

**Called by:**
- `paletteUpdate` (1249)

**Calls:**
- `buildGeometry` (903)
- `buildGeometry` (185)
- `buildGeometry` (35)
- `buildGeometry` (35)
- `buildGeometry` (32)
- `buildGeometry` (22)
- `buildGeometry` (21)
- `buildGeometry` (16)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:60` | Self: 0.0% (0us) | Total: 1.0% (100.4ms) | Samples: 0

**Called by:**
- `update` (16)

**Calls:**
- `Float32BufferAttribute` (16)

### `buildGeometry`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts:59` | Self: 0.0% (0us) | Total: 3.6% (347.6ms) | Samples: 0

**Called by:**
- `update` (35)

**Calls:**
- `Float32BufferAttribute` (35)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 39.5% | 3.76s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\geometry.ts` |
| 17.5% | 1.67s | `[native code]` |
| 15.6% | 1.49s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\vec.ts` |
| 12.9% | 1.23s | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\model\atlas.ts` |
| 8.7% | 833.8ms | `C:\Users\tocha\projects\sistema-zero\node_modules\.bun\three@0.184.0\node_modules\three\build\three.core.js` |
| 5.3% | 514.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\partGeometryResource.ts` |
| 0.1% | 13.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-viewport-geometry.ts` |
| 0.0% | 4.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\viewport\viewportMath.ts` |
