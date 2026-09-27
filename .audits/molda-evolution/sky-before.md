# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 2.77s | 358 | 1.0ms | 67 |

**Top 10:** `floatToRgbe` 22.3%, `renderSky` 21.3%, `fbm` 11.0%, `encodeRleChannel` 8.1%, `renderSky` 7.7%, `typedArrayViewLength` 7.5%, `arrayIteratorNextHelper` 5.8%, `from` 3.3%, `encodeRgbe` 1.2%, `encodeRleChannel` 1.1%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 22.3% | 620.0ms | 22.3% | 620.0ms | `floatToRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts` |
| 21.3% | 592.9ms | 32.4% | 900.7ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:139` |
| 11.0% | 307.8ms | 11.0% | 307.8ms | `fbm` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\noise.ts` |
| 8.1% | 225.1ms | 8.1% | 225.1ms | `encodeRleChannel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:72` |
| 7.7% | 216.1ms | 7.7% | 216.1ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:105` |
| 7.5% | 208.2ms | 7.5% | 208.2ms | `typedArrayViewLength` | `[native code]` |
| 5.8% | 161.9ms | 13.3% | 370.1ms | `arrayIteratorNextHelper` | `[native code]` |
| 3.3% | 94.0ms | 17.3% | 482.6ms | `from` | `[native code]` |
| 1.2% | 34.4ms | 23.5% | 654.5ms | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:97` |
| 1.1% | 32.5ms | 1.1% | 32.5ms | `encodeRleChannel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:76` |
| 0.9% | 27.1ms | 6.0% | 168.8ms | `anonymous` | `[native code]` |
| 0.9% | 26.7ms | 0.9% | 26.7ms | `mix` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:48` |
| 0.6% | 19.2ms | 0.6% | 19.2ms | `fromCharCode` | `[native code]` |
| 0.6% | 19.0ms | 0.6% | 19.0ms | `btoa` | `[native code]` |
| 0.5% | 16.5ms | 1.1% | 31.9ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:124` |
| 0.5% | 16.5ms | 9.8% | 274.1ms | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:106` |
| 0.5% | 16.1ms | 0.5% | 16.1ms | `min` | `[native code]` |
| 0.5% | 16.0ms | 0.5% | 16.0ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:145` |
| 0.5% | 15.6ms | 0.5% | 15.6ms | `smoothstep` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:38` |
| 0.5% | 15.5ms | 0.5% | 15.5ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:74` |
| 0.5% | 15.5ms | 13.9% | 388.6ms | `next` | `[native code]` |
| 0.5% | 15.3ms | 0.5% | 15.3ms | `exp` | `[native code]` |
| 0.5% | 15.3ms | 18.6% | 517.2ms | `bytesToBase64` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:11` |
| 0.5% | 15.0ms | 0.5% | 15.0ms | `Uint8Array` | `[native code]` |
| 0.5% | 14.2ms | 0.5% | 14.2ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:165` |
| 0.4% | 13.8ms | 0.4% | 13.8ms | `set` | `[native code]` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `typedArrayViewIsDetached` | `[native code]` |
| 0.0% | 997us | 0.0% | 997us | `update` | `[native code]` |
| 0.0% | 926us | 0.0% | 926us | `bytesToBase64` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:10` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 5.49s | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 99.5% | 2.76s | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 99.0% | 2.74s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 99.0% | 2.74s | 0.0% | 0us | `evaluate` | `[native code]` |
| 99.0% | 2.74s | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 94.9% | 2.63s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:19` |
| 82.1% | 2.27s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:30` |
| 41.1% | 1.14s | 0.0% | 0us | `exportSkyHdr` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:23` |
| 34.4% | 957.5ms | 0.0% | 0us | `exportSkyHdr` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:24` |
| 32.4% | 900.7ms | 21.3% | 592.9ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:139` |
| 23.5% | 654.5ms | 1.2% | 34.4ms | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:97` |
| 22.3% | 620.0ms | 22.3% | 620.0ms | `floatToRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts` |
| 19.3% | 537.2ms | 0.0% | 0us | `exportSkyHdr` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:25` |
| 18.6% | 517.2ms | 0.5% | 15.3ms | `bytesToBase64` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:11` |
| 17.3% | 482.6ms | 3.3% | 94.0ms | `from` | `[native code]` |
| 13.9% | 388.6ms | 0.5% | 15.5ms | `next` | `[native code]` |
| 13.3% | 370.1ms | 5.8% | 161.9ms | `arrayIteratorNextHelper` | `[native code]` |
| 11.6% | 323.7ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:25` |
| 11.0% | 307.8ms | 11.0% | 307.8ms | `fbm` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\noise.ts` |
| 9.8% | 274.1ms | 0.5% | 16.5ms | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:106` |
| 8.1% | 225.1ms | 8.1% | 225.1ms | `encodeRleChannel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:72` |
| 7.7% | 216.1ms | 7.7% | 216.1ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:105` |
| 7.5% | 208.2ms | 7.5% | 208.2ms | `typedArrayViewLength` | `[native code]` |
| 6.0% | 168.8ms | 0.9% | 27.1ms | `anonymous` | `[native code]` |
| 5.2% | 144.4ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:24` |
| 4.0% | 111.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:15` |
| 1.1% | 32.5ms | 1.1% | 32.5ms | `encodeRleChannel` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:76` |
| 1.1% | 31.9ms | 0.5% | 16.5ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:124` |
| 0.9% | 27.1ms | 0.0% | 0us | `parseModule` | `[native code]` |
| 0.9% | 27.1ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.9% | 26.7ms | 0.0% | 0us | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:103` |
| 0.9% | 26.7ms | 0.9% | 26.7ms | `mix` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:48` |
| 0.6% | 19.2ms | 0.6% | 19.2ms | `fromCharCode` | `[native code]` |
| 0.6% | 19.0ms | 0.6% | 19.0ms | `btoa` | `[native code]` |
| 0.5% | 16.1ms | 0.0% | 0us | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:121` |
| 0.5% | 16.1ms | 0.5% | 16.1ms | `min` | `[native code]` |
| 0.5% | 16.0ms | 0.5% | 16.0ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:145` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `get WriteStream` | `node:fs:737` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:util/colors` | `internal:util/colors:24` |
| 0.5% | 15.7ms | 0.0% | 0us | `get` | `node:assert:70` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `node:assert` | `node:assert:588` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:fs/streams` | `internal:fs/streams:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:assert/assertion_error` | `internal:assert/assertion_error:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `loadAssertionError` | `node:assert:28` |
| 0.5% | 15.7ms | 0.0% | 0us | `assign` | `[native code]` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.5% | 15.7ms | 0.0% | 0us | `refresh` | `internal:util/colors:18` |
| 0.5% | 15.6ms | 0.5% | 15.6ms | `smoothstep` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:38` |
| 0.5% | 15.6ms | 0.0% | 0us | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:114` |
| 0.5% | 15.5ms | 0.5% | 15.5ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:74` |
| 0.5% | 15.3ms | 0.5% | 15.3ms | `exp` | `[native code]` |
| 0.5% | 15.0ms | 0.5% | 15.0ms | `Uint8Array` | `[native code]` |
| 0.5% | 15.0ms | 0.0% | 0us | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:109` |
| 0.5% | 14.2ms | 0.5% | 14.2ms | `renderSky` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:165` |
| 0.4% | 13.8ms | 0.0% | 0us | `encodeRgbe` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:111` |
| 0.4% | 13.8ms | 0.4% | 13.8ms | `set` | `[native code]` |
| 0.4% | 11.4ms | 0.0% | 0us | `node:assert` | `node:assert:2` |
| 0.1% | 2.9ms | 0.1% | 2.9ms | `typedArrayViewIsDetached` | `[native code]` |
| 0.0% | 997us | 0.0% | 0us | `digest` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:10` |
| 0.0% | 997us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:32` |
| 0.0% | 997us | 0.0% | 997us | `update` | `[native code]` |
| 0.0% | 926us | 0.0% | 926us | `bytesToBase64` | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:10` |

## Function Details

### `floatToRgbe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts` | Self: 22.3% (620.0ms) | Total: 22.3% (620.0ms) | Samples: 84

**Called by:**
- `encodeRgbe` (84)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:139` | Self: 21.3% (592.9ms) | Total: 32.4% (900.7ms) | Samples: 70

**Called by:**
- `exportSkyHdr` (106)
- `(anonymous)` (3)

**Calls:**
- `fbm` (39)

### `fbm`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\noise.ts` | Self: 11.0% (307.8ms) | Total: 11.0% (307.8ms) | Samples: 39

**Called by:**
- `renderSky` (39)

### `encodeRleChannel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:72` | Self: 8.1% (225.1ms) | Total: 8.1% (225.1ms) | Samples: 25

**Called by:**
- `encodeRgbe` (25)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:105` | Self: 7.7% (216.1ms) | Total: 7.7% (216.1ms) | Samples: 31

**Called by:**
- `exportSkyHdr` (31)

### `typedArrayViewLength`
`[native code]` | Self: 7.5% (208.2ms) | Total: 7.5% (208.2ms) | Samples: 31

**Called by:**
- `arrayIteratorNextHelper` (31)

### `arrayIteratorNextHelper`
`[native code]` | Self: 5.8% (161.9ms) | Total: 13.3% (370.1ms) | Samples: 20

**Called by:**
- `next` (51)

**Calls:**
- `typedArrayViewLength` (31)

### `from`
`[native code]` | Self: 3.3% (94.0ms) | Total: 17.3% (482.6ms) | Samples: 14

**Called by:**
- `bytesToBase64` (69)

**Calls:**
- `next` (55)

### `encodeRgbe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:97` | Self: 1.2% (34.4ms) | Total: 23.5% (654.5ms) | Samples: 5

**Called by:**
- `exportSkyHdr` (89)

**Calls:**
- `floatToRgbe` (84)

### `encodeRleChannel`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:76` | Self: 1.1% (32.5ms) | Total: 1.1% (32.5ms) | Samples: 4

**Called by:**
- `encodeRgbe` (4)

### `anonymous`
`[native code]` | Self: 0.9% (27.1ms) | Total: 6.0% (168.8ms) | Samples: 2

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

### `mix`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:48` | Self: 0.9% (26.7ms) | Total: 0.9% (26.7ms) | Samples: 2

**Called by:**
- `renderSky` (2)

### `fromCharCode`
`[native code]` | Self: 0.6% (19.2ms) | Total: 0.6% (19.2ms) | Samples: 5

**Called by:**
- `bytesToBase64` (5)

### `btoa`
`[native code]` | Self: 0.6% (19.0ms) | Total: 0.6% (19.0ms) | Samples: 5

**Called by:**
- `exportSkyHdr` (5)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:124` | Self: 0.5% (16.5ms) | Total: 1.1% (31.9ms) | Samples: 2

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `exp` (1)

### `encodeRgbe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:106` | Self: 0.5% (16.5ms) | Total: 9.8% (274.1ms) | Samples: 3

**Called by:**
- `exportSkyHdr` (32)

**Calls:**
- `encodeRleChannel` (25)
- `encodeRleChannel` (4)

### `min`
`[native code]` | Self: 0.5% (16.1ms) | Total: 0.5% (16.1ms) | Samples: 1

**Called by:**
- `renderSky` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:145` | Self: 0.5% (16.0ms) | Total: 0.5% (16.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `smoothstep`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:38` | Self: 0.5% (15.6ms) | Total: 0.5% (15.6ms) | Samples: 1

**Called by:**
- `renderSky` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:74` | Self: 0.5% (15.5ms) | Total: 0.5% (15.5ms) | Samples: 1

**Called by:**
- `exportSkyHdr` (1)

### `next`
`[native code]` | Self: 0.5% (15.5ms) | Total: 13.9% (388.6ms) | Samples: 1

**Called by:**
- `from` (55)

**Calls:**
- `arrayIteratorNextHelper` (51)
- `typedArrayViewIsDetached` (3)

### `exp`
`[native code]` | Self: 0.5% (15.3ms) | Total: 0.5% (15.3ms) | Samples: 1

**Called by:**
- `renderSky` (1)

### `bytesToBase64`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:11` | Self: 0.5% (15.3ms) | Total: 18.6% (517.2ms) | Samples: 2

**Called by:**
- `exportSkyHdr` (76)

**Calls:**
- `from` (69)
- `fromCharCode` (5)

### `Uint8Array`
`[native code]` | Self: 0.5% (15.0ms) | Total: 0.5% (15.0ms) | Samples: 1

**Called by:**
- `encodeRgbe` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:165` | Self: 0.5% (14.2ms) | Total: 0.5% (14.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `set`
`[native code]` | Self: 0.4% (13.8ms) | Total: 0.4% (13.8ms) | Samples: 1

**Called by:**
- `encodeRgbe` (1)

### `typedArrayViewIsDetached`
`[native code]` | Self: 0.1% (2.9ms) | Total: 0.1% (2.9ms) | Samples: 3

**Called by:**
- `next` (3)

### `update`
`[native code]` | Self: 0.0% (997us) | Total: 0.0% (997us) | Samples: 1

**Called by:**
- `digest` (1)

### `bytesToBase64`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts:10` | Self: 0.0% (926us) | Total: 0.0% (926us) | Samples: 1

**Called by:**
- `exportSkyHdr` (1)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (27.1ms) | Samples: 0

**Calls:**
- `parseModule` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:32` | Self: 0.0% (0us) | Total: 0.0% (997us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `digest` (1)

### `parseModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.9% (27.1ms) | Samples: 0

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `node:assert` (1)
- `node:assert` (1)

### `refresh`
`internal:util/colors:18` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `internal:util/colors` (1)

**Calls:**
- `(anonymous)` (1)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:15` | Self: 0.0% (0us) | Total: 4.0% (111.0ms) | Samples: 0

**Called by:**
- `(module)` (8)
- `(module)` (1)
- `(module)` (1)

**Calls:**
- `renderSky` (3)
- `renderSky` (3)
- `renderSky` (1)
- `renderSky` (1)
- `renderSky` (1)
- `renderSky` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `encodeRgbe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:109` | Self: 0.0% (0us) | Total: 0.5% (15.0ms) | Samples: 0

**Called by:**
- `exportSkyHdr` (1)

**Calls:**
- `Uint8Array` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:103` | Self: 0.0% (0us) | Total: 0.9% (26.7ms) | Samples: 0

**Called by:**
- `exportSkyHdr` (2)

**Calls:**
- `mix` (2)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 99.0% (2.74s) | Samples: 0

**Calls:**
- `(anonymous)` (356)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (5.49s) | Samples: 0

**Called by:**
- `moduleEvaluation` (356)
- `async loadAndEvaluateModule` (356)

**Calls:**
- `evaluate` (356)
- `moduleEvaluation` (356)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:24` | Self: 0.0% (0us) | Total: 5.2% (144.4ms) | Samples: 0

**Called by:**
- `evaluate` (29)

**Calls:**
- `(anonymous)` (28)
- `(anonymous)` (1)

### `get WriteStream`
`node:fs:737` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `anonymous` (1)

### `exportSkyHdr`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:25` | Self: 0.0% (0us) | Total: 19.3% (537.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (82)

**Calls:**
- `bytesToBase64` (76)
- `btoa` (5)
- `bytesToBase64` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:30` | Self: 0.0% (0us) | Total: 82.1% (2.27s) | Samples: 0

**Called by:**
- `evaluate` (290)

**Calls:**
- `(anonymous)` (282)
- `(anonymous)` (8)

### `internal:util/colors`
`internal:util/colors:24` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `refresh` (1)

### `exportSkyHdr`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:24` | Self: 0.0% (0us) | Total: 34.4% (957.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (123)

**Calls:**
- `encodeRgbe` (89)
- `encodeRgbe` (32)
- `encodeRgbe` (1)
- `encodeRgbe` (1)

### `loadAssertionError`
`node:assert:28` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `get`
`node:assert:70` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `assign` (1)

**Calls:**
- `loadAssertionError` (1)

### `node:assert`
`node:assert:588` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `assign` (1)

### `digest`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:10` | Self: 0.0% (0us) | Total: 0.0% (997us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `update` (1)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:114` | Self: 0.0% (0us) | Total: 0.5% (15.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `smoothstep` (1)

### `internal:fs/streams`
`internal:fs/streams:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `encodeRgbe`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts:111` | Self: 0.0% (0us) | Total: 0.4% (13.8ms) | Samples: 0

**Called by:**
- `exportSkyHdr` (1)

**Calls:**
- `set` (1)

### `node:assert`
`node:assert:2` | Self: 0.0% (0us) | Total: 0.4% (11.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `internal:assert/assertion_error`
`internal:assert/assertion_error:2` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `renderSky`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts:121` | Self: 0.0% (0us) | Total: 0.5% (16.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `min` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:19` | Self: 0.0% (0us) | Total: 94.9% (2.63s) | Samples: 0

**Called by:**
- `(module)` (282)
- `(module)` (35)
- `(module)` (28)

**Calls:**
- `exportSkyHdr` (140)
- `exportSkyHdr` (123)
- `exportSkyHdr` (82)

### `assign`
`[native code]` | Self: 0.0% (0us) | Total: 0.5% (15.7ms) | Samples: 0

**Called by:**
- `node:assert` (1)

**Calls:**
- `get` (1)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 99.5% (2.76s) | Samples: 0

**Called by:**
- `processTicksAndRejections` (356)
- `refresh` (1)

**Calls:**
- `async loadAndEvaluateModule` (356)
- `get WriteStream` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 99.0% (2.74s) | Samples: 0

**Called by:**
- `moduleEvaluation` (356)

**Calls:**
- `(module)` (290)
- `(module)` (36)
- `(module)` (29)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 99.0% (2.74s) | Samples: 0

**Called by:**
- `(anonymous)` (356)

**Calls:**
- `moduleEvaluation` (356)

### `(module)`
`C:\Users\tocha\projects\sistema-zero\packages\molda\scripts\bench-sky.ts:25` | Self: 0.0% (0us) | Total: 11.6% (323.7ms) | Samples: 0

**Called by:**
- `evaluate` (36)

**Calls:**
- `(anonymous)` (35)
- `(anonymous)` (1)

### `exportSkyHdr`
`C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\skyHdr.ts:23` | Self: 0.0% (0us) | Total: 41.1% (1.14s) | Samples: 0

**Called by:**
- `(anonymous)` (140)

**Calls:**
- `renderSky` (106)
- `renderSky` (31)
- `renderSky` (2)
- `renderSky` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 33.4% | 928.6ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\export\rgbe.ts` |
| 32.9% | 913.9ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\render.ts` |
| 21.9% | 609.5ms | `[native code]` |
| 11.0% | 307.8ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\sky\noise.ts` |
| 0.5% | 16.2ms | `C:\Users\tocha\projects\sistema-zero\packages\molda\src\core\skinCodec.ts` |
