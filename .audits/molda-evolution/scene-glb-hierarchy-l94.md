# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 622.4ms | 87 | 1.0ms | 74 |

**Top 10:** `stringify` 12.8%, `get` 11.9%, `unit` 10.2%, `finiteTuple` 7.4%, `affineMultiply` 5.3%, `affineTrsChain` 5.0%, `migrateLegacyModel` 4.5%, `affineTrsChain` 2.5%, `map` 2.5%, `rotationQuaternion` 2.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 12.8% | 79.6ms | 12.8% | 79.6ms | `stringify` | `[native code]` |
| 11.9% | 74.3ms | 11.9% | 74.3ms | `get` | `[native code]` |
| 10.2% | 63.5ms | 10.3% | 64.4ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:22` |
| 7.4% | 46.1ms | 7.4% | 46.1ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:34` |
| 5.3% | 33.2ms | 5.3% | 33.2ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 5.0% | 31.2ms | 5.0% | 31.2ms | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:56` |
| 4.5% | 28.0ms | 4.5% | 28.0ms | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:68` |
| 2.5% | 16.1ms | 13.0% | 80.9ms | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:60` |
| 2.5% | 16.0ms | 7.7% | 48.2ms | `map` | `[native code]` |
| 2.5% | 15.8ms | 2.5% | 15.8ms | `rotationQuaternion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:7` |
| 2.5% | 15.7ms | 2.5% | 15.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts` |
| 2.5% | 15.5ms | 2.5% | 15.5ms | `next` | `[native code]` |
| 2.5% | 15.5ms | 2.5% | 15.5ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:82` |
| 2.4% | 15.0ms | 2.4% | 15.0ms | `isFinite` | `[native code]` |
| 2.3% | 14.8ms | 2.3% | 14.8ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:172` |
| 2.3% | 14.6ms | 2.3% | 14.6ms | `rotationQuaternion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:24` |
| 2.2% | 14.2ms | 4.7% | 29.5ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:93` |
| 2.2% | 14.1ms | 2.2% | 14.1ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:199` |
| 2.2% | 14.0ms | 2.2% | 14.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:123` |
| 2.2% | 13.9ms | 2.2% | 13.9ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` |
| 2.1% | 13.6ms | 2.1% | 13.6ms | `push` | `[native code]` |
| 2.0% | 13.0ms | 2.0% | 13.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 1.8% | 11.2ms | 1.8% | 11.2ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:170` |
| 1.0% | 6.8ms | 2.9% | 18.4ms | `async (anonymous)` | `[native code]` |
| 0.9% | 5.6ms | 0.9% | 5.6ms | `parseModule` | `[native code]` |
| 0.5% | 3.5ms | 0.5% | 3.5ms | `resolve` | `[native code]` |
| 0.3% | 1.9ms | 0.3% | 1.9ms | `set` | `[native code]` |
| 0.3% | 1.9ms | 2.7% | 16.9ms | `every` | `[native code]` |
| 0.2% | 1.8ms | 0.2% | 1.8ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:96` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:71` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:161` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:171` |
| 0.1% | 1.0ms | 7.2% | 45.3ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:97` |
| 0.1% | 980us | 0.1% | 980us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:169` |
| 0.1% | 973us | 0.1% | 973us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 0.1% | 939us | 0.1% | 939us | `hypot` | `[native code]` |
| 0.1% | 912us | 2.3% | 14.5ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:92` |
| 0.1% | 888us | 0.1% | 888us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:196` |
| 0.1% | 876us | 0.1% | 876us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts` |
| 0.1% | 844us | 0.1% | 844us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:57` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 1.21s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 98.2% | 611.2ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 97.4% | 606.3ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 77.8% | 484.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:54` |
| 42.8% | 266.7ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:156` |
| 13.0% | 80.9ms | 2.5% | 16.1ms | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:60` |
| 12.8% | 79.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:58` |
| 12.8% | 79.6ms | 12.8% | 79.6ms | `stringify` | `[native code]` |
| 12.5% | 77.8ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:128` |
| 11.9% | 74.3ms | 11.9% | 74.3ms | `get` | `[native code]` |
| 10.3% | 64.4ms | 10.2% | 63.5ms | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:22` |
| 7.8% | 48.9ms | 0.0% | 0us | `indexSceneDocument` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` |
| 7.8% | 48.9ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` |
| 7.7% | 48.2ms | 2.5% | 16.0ms | `map` | `[native code]` |
| 7.4% | 46.1ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:73` |
| 7.4% | 46.1ms | 7.4% | 46.1ms | `finiteTuple` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:34` |
| 7.2% | 45.3ms | 0.1% | 1.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:97` |
| 5.3% | 33.2ms | 5.3% | 33.2ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` |
| 5.1% | 32.3ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` |
| 5.0% | 31.2ms | 5.0% | 31.2ms | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:56` |
| 4.7% | 29.5ms | 2.2% | 14.2ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:93` |
| 4.5% | 28.0ms | 0.0% | 0us | `animatedScene` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` |
| 4.5% | 28.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:17` |
| 4.5% | 28.0ms | 4.5% | 28.0ms | `migrateLegacyModel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:68` |
| 2.9% | 18.4ms | 1.0% | 6.8ms | `async (anonymous)` | `[native code]` |
| 2.7% | 16.9ms | 0.3% | 1.9ms | `every` | `[native code]` |
| 2.7% | 16.9ms | 0.0% | 0us | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` |
| 2.5% | 15.9ms | 0.0% | 0us | `unit` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:24` |
| 2.5% | 15.8ms | 2.5% | 15.8ms | `rotationQuaternion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:7` |
| 2.5% | 15.8ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:125` |
| 2.5% | 15.7ms | 2.5% | 15.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts` |
| 2.5% | 15.5ms | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:166` |
| 2.5% | 15.5ms | 2.5% | 15.5ms | `next` | `[native code]` |
| 2.5% | 15.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:80` |
| 2.5% | 15.5ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:80` |
| 2.5% | 15.5ms | 2.5% | 15.5ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:82` |
| 2.4% | 15.5ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:118` |
| 2.4% | 15.0ms | 2.4% | 15.0ms | `isFinite` | `[native code]` |
| 2.4% | 14.9ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:41` |
| 2.3% | 14.8ms | 2.3% | 14.8ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:172` |
| 2.3% | 14.6ms | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:59` |
| 2.3% | 14.6ms | 2.3% | 14.6ms | `rotationQuaternion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:24` |
| 2.3% | 14.5ms | 0.1% | 912us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:92` |
| 2.2% | 14.1ms | 2.2% | 14.1ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:199` |
| 2.2% | 14.0ms | 2.2% | 14.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:123` |
| 2.2% | 13.9ms | 2.2% | 13.9ms | `affineMultiply` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` |
| 2.2% | 13.9ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:50` |
| 2.1% | 13.6ms | 2.1% | 13.6ms | `push` | `[native code]` |
| 2.0% | 13.0ms | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:40` |
| 2.0% | 13.0ms | 2.0% | 13.0ms | `composeTransform` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 1.8% | 11.2ms | 1.8% | 11.2ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:170` |
| 1.0% | 6.8ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 1.0% | 6.8ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.9% | 5.6ms | 0.9% | 5.6ms | `parseModule` | `[native code]` |
| 0.7% | 4.8ms | 0.0% | 0us | `async loadModule` | `[native code]` |
| 0.7% | 4.3ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 0.5% | 3.5ms | 0.5% | 3.5ms | `resolve` | `[native code]` |
| 0.3% | 2.4ms | 0.0% | 0us | `requestSatisfy` | `[native code]` |
| 0.3% | 1.9ms | 0.3% | 1.9ms | `set` | `[native code]` |
| 0.2% | 1.8ms | 0.2% | 1.8ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:96` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:71` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:161` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:171` |
| 0.1% | 980us | 0.1% | 980us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:169` |
| 0.1% | 973us | 0.0% | 0us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:167` |
| 0.1% | 973us | 0.1% | 973us | `append` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 0.1% | 965us | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:61` |
| 0.1% | 957us | 0.0% | 0us | `indexSceneNodes` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` |
| 0.1% | 939us | 0.1% | 939us | `hypot` | `[native code]` |
| 0.1% | 888us | 0.1% | 888us | `prepareSceneGlbHierarchy` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:196` |
| 0.1% | 876us | 0.1% | 876us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts` |
| 0.1% | 876us | 0.0% | 0us | `rotationQuaternion` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:26` |
| 0.1% | 863us | 0.0% | 0us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:121` |
| 0.1% | 844us | 0.1% | 844us | `affineTrsChain` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:57` |

## Function Details

### `stringify`
`[native code]` | Self: 12.8% (79.6ms) | Total: 12.8% (79.6ms) | Samples: 10

**Called by:**
- `(module)` (10)

### `get`
`[native code]` | Self: 11.9% (74.3ms) | Total: 11.9% (74.3ms) | Samples: 7

**Called by:**
- `prepareSceneGlbHierarchy` (3)
- `prepareSceneGlbHierarchy` (3)
- `indexSceneNodes` (1)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:22` | Self: 10.2% (63.5ms) | Total: 10.3% (64.4ms) | Samples: 7

**Called by:**
- `affineTrsChain` (7)
- `(anonymous)` (1)

**Calls:**
- `hypot` (1)

### `finiteTuple`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:34` | Self: 7.4% (46.1ms) | Total: 7.4% (46.1ms) | Samples: 4

**Called by:**
- `composeTransform` (4)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:112` | Self: 5.3% (33.2ms) | Total: 5.3% (33.2ms) | Samples: 3

**Called by:**
- `indexSceneNodes` (2)
- `affineTrsChain` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:56` | Self: 5.0% (31.2ms) | Total: 5.0% (31.2ms) | Samples: 4

**Called by:**
- `prepareSceneGlbHierarchy` (4)

### `migrateLegacyModel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts:68` | Self: 4.5% (28.0ms) | Total: 4.5% (28.0ms) | Samples: 1

**Called by:**
- `animatedScene` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:60` | Self: 2.5% (16.1ms) | Total: 13.0% (80.9ms) | Samples: 2

**Called by:**
- `prepareSceneGlbHierarchy` (11)

**Calls:**
- `unit` (7)
- `unit` (2)

### `map`
`[native code]` | Self: 2.5% (16.0ms) | Total: 7.7% (48.2ms) | Samples: 3

**Called by:**
- `unit` (2)
- `affineTrsChain` (2)
- `affineTrsChain` (1)
- `rotationQuaternion` (1)
- `affineTrsChain` (1)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `rotationQuaternion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:7` | Self: 2.5% (15.8ms) | Total: 2.5% (15.8ms) | Samples: 1

**Called by:**
- `affineTrsChain` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts` | Self: 2.5% (15.7ms) | Total: 2.5% (15.7ms) | Samples: 2

**Called by:**
- `map` (2)

### `next`
`[native code]` | Self: 2.5% (15.5ms) | Total: 2.5% (15.5ms) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:82` | Self: 2.5% (15.5ms) | Total: 2.5% (15.5ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `isFinite`
`[native code]` | Self: 2.4% (15.0ms) | Total: 2.4% (15.0ms) | Samples: 2

**Called by:**
- `every` (2)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:172` | Self: 2.3% (14.8ms) | Total: 2.3% (14.8ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `rotationQuaternion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:24` | Self: 2.3% (14.6ms) | Total: 2.3% (14.6ms) | Samples: 2

**Called by:**
- `affineTrsChain` (2)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:93` | Self: 2.2% (14.2ms) | Total: 4.7% (29.5ms) | Samples: 1

**Called by:**
- `(module)` (4)

**Calls:**
- `get` (3)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:199` | Self: 2.2% (14.1ms) | Total: 2.2% (14.1ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:123` | Self: 2.2% (14.0ms) | Total: 2.2% (14.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `affineMultiply`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:111` | Self: 2.2% (13.9ms) | Total: 2.2% (13.9ms) | Samples: 1

**Called by:**
- `affineTrsChain` (1)

### `push`
`[native code]` | Self: 2.1% (13.6ms) | Total: 2.1% (13.6ms) | Samples: 3

**Called by:**
- `prepareSceneGlbHierarchy` (3)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` | Self: 2.0% (13.0ms) | Total: 2.0% (13.0ms) | Samples: 1

**Called by:**
- `affineTrsChain` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:170` | Self: 1.8% (11.2ms) | Total: 1.8% (11.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `async (anonymous)`
`[native code]` | Self: 1.0% (6.8ms) | Total: 2.9% (18.4ms) | Samples: 2

**Called by:**
- `requestInstantiate` (2)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (6)
- `resolve` (1)
- `async (anonymous)` (1)

### `parseModule`
`[native code]` | Self: 0.9% (5.6ms) | Total: 0.9% (5.6ms) | Samples: 6

**Called by:**
- `async (anonymous)` (6)

### `resolve`
`[native code]` | Self: 0.5% (3.5ms) | Total: 0.5% (3.5ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `set`
`[native code]` | Self: 0.3% (1.9ms) | Total: 0.3% (1.9ms) | Samples: 2

**Called by:**
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `every`
`[native code]` | Self: 0.3% (1.9ms) | Total: 2.7% (16.9ms) | Samples: 2

**Called by:**
- `composeTransform` (4)

**Calls:**
- `isFinite` (2)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:96` | Self: 0.2% (1.8ms) | Total: 0.2% (1.8ms) | Samples: 2

**Called by:**
- `(module)` (2)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:71` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:161` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:171` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:97` | Self: 0.1% (1.0ms) | Total: 7.2% (45.3ms) | Samples: 1

**Called by:**
- `(module)` (4)

**Calls:**
- `get` (3)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:169` | Self: 0.1% (980us) | Total: 0.1% (980us) | Samples: 1

**Called by:**
- `(module)` (1)

### `append`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` | Self: 0.1% (973us) | Total: 0.1% (973us) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (1)

### `hypot`
`[native code]` | Self: 0.1% (939us) | Total: 0.1% (939us) | Samples: 1

**Called by:**
- `unit` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:92` | Self: 0.1% (912us) | Total: 2.3% (14.5ms) | Samples: 1

**Called by:**
- `(module)` (4)

**Calls:**
- `push` (3)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:196` | Self: 0.1% (888us) | Total: 0.1% (888us) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts` | Self: 0.1% (876us) | Total: 0.1% (876us) | Samples: 1

**Called by:**
- `map` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:57` | Self: 0.1% (844us) | Total: 0.1% (844us) | Samples: 1

**Called by:**
- `prepareSceneGlbHierarchy` (1)

### `animatedScene`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\testing\sceneAnimation.ts:32` | Self: 0.0% (0us) | Total: 4.5% (28.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `migrateLegacyModel` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 1.0% (6.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `requestSatisfy` (1)

**Calls:**
- `requestInstantiate` (2)

### `indexSceneDocument`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\documentIndex.ts:11` | Self: 0.0% (0us) | Total: 7.8% (48.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (5)

**Calls:**
- `indexSceneNodes` (2)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)
- `indexSceneNodes` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:118` | Self: 0.0% (0us) | Total: 2.4% (15.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (3)

**Calls:**
- `rotationQuaternion` (2)
- `rotationQuaternion` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:61` | Self: 0.0% (0us) | Total: 0.1% (965us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `set` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:125` | Self: 0.0% (0us) | Total: 2.5% (15.8ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `rotationQuaternion` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (4.3ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:121` | Self: 0.0% (0us) | Total: 0.1% (863us) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `map` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:40` | Self: 0.0% (0us) | Total: 2.0% (13.0ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `composeTransform` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (1.21s) | Samples: 0

**Called by:**
- `moduleEvaluation` (78)
- `async loadAndEvaluateModule` (78)

**Calls:**
- `evaluate` (78)
- `moduleEvaluation` (78)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 1.0% (6.8ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (2)

**Calls:**
- `async (anonymous)` (2)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:41` | Self: 0.0% (0us) | Total: 2.4% (14.9ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (2)

**Calls:**
- `map` (2)

### `async loadModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (4.8ms) | Samples: 0

**Called by:**
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

**Calls:**
- `requestSatisfy` (1)
- `async loadModule` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:73` | Self: 0.0% (0us) | Total: 7.4% (46.1ms) | Samples: 0

**Called by:**
- `affineTrsChain` (4)

**Calls:**
- `finiteTuple` (4)

### `rotationQuaternion`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts:26` | Self: 0.0% (0us) | Total: 0.1% (876us) | Samples: 0

**Called by:**
- `affineTrsChain` (1)

**Calls:**
- `map` (1)

### `requestSatisfy`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `async loadModule` (1)

**Calls:**
- `requestSatisfyUtil` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:80` | Self: 0.0% (0us) | Total: 2.5% (15.5ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (1)

**Calls:**
- `map` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:54` | Self: 0.0% (0us) | Total: 77.8% (484.7ms) | Samples: 0

**Called by:**
- `evaluate` (66)

**Calls:**
- `prepareSceneGlbHierarchy` (34)
- `prepareSceneGlbHierarchy` (5)
- `prepareSceneGlbHierarchy` (4)
- `prepareSceneGlbHierarchy` (4)
- `prepareSceneGlbHierarchy` (4)
- `prepareSceneGlbHierarchy` (2)
- `prepareSceneGlbHierarchy` (2)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)
- `prepareSceneGlbHierarchy` (1)

### `affineTrsChain`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:128` | Self: 0.0% (0us) | Total: 12.5% (77.8ms) | Samples: 0

**Called by:**
- `prepareSceneGlbHierarchy` (10)

**Calls:**
- `composeTransform` (4)
- `composeTransform` (4)
- `affineMultiply` (1)
- `affineMultiply` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:44` | Self: 0.0% (0us) | Total: 7.8% (48.9ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `indexSceneDocument` (5)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:167` | Self: 0.0% (0us) | Total: 0.1% (973us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `append` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:50` | Self: 0.0% (0us) | Total: 2.2% (13.9ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `prepareSceneGlbHierarchy` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:58` | Self: 0.0% (0us) | Total: 12.8% (79.6ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `stringify` (10)

### `unit`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:24` | Self: 0.0% (0us) | Total: 2.5% (15.9ms) | Samples: 0

**Called by:**
- `affineTrsChain` (2)

**Calls:**
- `map` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-scene-glb-hierarchy.ts:17` | Self: 0.0% (0us) | Total: 4.5% (28.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `animatedScene` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts:80` | Self: 0.0% (0us) | Total: 2.5% (15.5ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `unit` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:59` | Self: 0.0% (0us) | Total: 2.3% (14.6ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `get` (1)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:166` | Self: 0.0% (0us) | Total: 2.5% (15.5ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `next` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 97.4% (606.3ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (78)

**Calls:**
- `(module)` (66)
- `(module)` (10)
- `(module)` (1)
- `(module)` (1)

### `composeTransform`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts:103` | Self: 0.0% (0us) | Total: 2.7% (16.9ms) | Samples: 0

**Called by:**
- `affineTrsChain` (4)

**Calls:**
- `every` (4)

### `prepareSceneGlbHierarchy`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts:156` | Self: 0.0% (0us) | Total: 42.8% (266.7ms) | Samples: 0

**Called by:**
- `(module)` (34)
- `(module)` (1)

**Calls:**
- `affineTrsChain` (11)
- `affineTrsChain` (10)
- `affineTrsChain` (4)
- `affineTrsChain` (3)
- `affineTrsChain` (2)
- `affineTrsChain` (1)
- `affineTrsChain` (1)
- `affineTrsChain` (1)
- `affineTrsChain` (1)
- `affineTrsChain` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 98.2% (611.2ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `moduleEvaluation` (78)
- `async loadModule` (1)
- `async loadAndEvaluateModule` (1)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:73` | Self: 0.0% (0us) | Total: 5.1% (32.3ms) | Samples: 0

**Called by:**
- `indexSceneDocument` (2)

**Calls:**
- `affineMultiply` (2)

### `indexSceneNodes`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\graph.ts:52` | Self: 0.0% (0us) | Total: 0.1% (957us) | Samples: 0

**Called by:**
- `indexSceneDocument` (1)

**Calls:**
- `set` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 37.7% | 235.1ms | `[native code]` |
| 20.4% | 127.5ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\affineTrsChain.ts` |
| 17.0% | 106.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\matrix.ts` |
| 15.1% | 94.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\sceneGlbHierarchy.ts` |
| 5.0% | 31.3ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\rotationQuaternion.ts` |
| 4.5% | 28.0ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\scene\migrateLegacy.ts` |
