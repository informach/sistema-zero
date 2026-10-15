# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 52.39s | 975 | 1.0ms | 663 |

**Top 10:** `editBufferSetCursor` 6.3%, `textBufferViewMeasureForDimensions` 5.7%, `from` 4.8%, `bufferDrawTextBufferView` 4.3%, `(anonymous)` 4.2%, `render` 3.9%, `getRealCharBytes` 3.5%, `bufferWriteResolvedChars` 3.4%, `editBufferDeleteRange` 3.2%, `editBufferInsertText` 2.5%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 6.3% | 3.31s | 6.4% | 3.36s | `editBufferSetCursor` | `[native code]` |
| 5.7% | 2.99s | 5.7% | 2.99s | `textBufferViewMeasureForDimensions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3387` |
| 4.8% | 2.52s | 5.7% | 2.99s | `from` | `[native code]` |
| 4.3% | 2.28s | 4.3% | 2.28s | `bufferDrawTextBufferView` | `[native code]` |
| 4.2% | 2.21s | 92.2% | 48.32s | `(anonymous)` | `[native code]` |
| 3.9% | 2.05s | 3.9% | 2.05s | `render` | `[native code]` |
| 3.5% | 1.87s | 3.8% | 2.01s | `getRealCharBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:159` |
| 3.4% | 1.80s | 3.4% | 1.80s | `bufferWriteResolvedChars` | `[native code]` |
| 3.2% | 1.72s | 3.3% | 1.76s | `editBufferDeleteRange` | `[native code]` |
| 2.5% | 1.35s | 2.6% | 1.39s | `editBufferInsertText` | `[native code]` |
| 1.9% | 1.02s | 11.0% | 5.78s | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4254` |
| 1.5% | 791.4ms | 1.5% | 791.4ms | `bufferDrawBox` | `[native code]` |
| 1.4% | 736.9ms | 1.8% | 972.0ms | `next` | `[native code]` |
| 1.2% | 639.4ms | 49.3% | 25.86s | `.wasm-function[61]` | `[native code]` |
| 1.2% | 629.4ms | 1.2% | 629.4ms | `setTimeout` | `[native code]` |
| 1.1% | 606.4ms | 1.1% | 606.4ms | `decode` | `[native code]` |
| 1.0% | 560.6ms | 1.0% | 560.6ms | `Buffer` | `[native code]` |
| 0.9% | 522.2ms | 1.3% | 708.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:32` |
| 0.8% | 471.5ms | 0.8% | 471.5ms | `cloneObject` | `[native code]` |
| 0.8% | 459.2ms | 0.8% | 459.2ms | `slice` | `[native code]` |
| 0.8% | 446.5ms | 4.1% | 2.16s | `anonymous` | `[native code]` |
| 0.8% | 435.1ms | 0.8% | 435.1ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4274` |
| 0.8% | 429.6ms | 0.8% | 429.6ms | `now` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\clock.ts:17` |
| 0.8% | 422.0ms | 3.4% | 1.81s | `scanPending` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:888` |
| 0.7% | 376.5ms | 2.7% | 1.44s | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:153` |
| 0.7% | 375.5ms | 0.7% | 375.5ms | `String` | `[native code]` |
| 0.7% | 374.7ms | 0.7% | 378.6ms | `editBufferGetText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3617` |
| 0.6% | 366.2ms | 0.6% | 366.2ms | `bufferDrawBox` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2687` |
| 0.6% | 358.1ms | 0.6% | 358.1ms | `startsWith` | `[native code]` |
| 0.6% | 330.0ms | 0.6% | 330.0ms | `subarray` | `[native code]` |
| 0.6% | 324.1ms | 0.6% | 324.1ms | `addToHitGrid` | `[native code]` |
| 0.5% | 298.1ms | 10.2% | 5.38s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:33` |
| 0.5% | 281.7ms | 0.6% | 326.6ms | `editorViewGetVisualCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3935` |
| 0.5% | 281.0ms | 0.5% | 281.0ms | `renderSelf` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.5% | 280.7ms | 0.5% | 280.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.5% | 280.1ms | 0.5% | 280.1ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4307` |
| 0.5% | 279.9ms | 0.7% | 368.8ms | `renderNative` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4398` |
| 0.5% | 279.0ms | 0.5% | 279.0ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1365` |
| 0.5% | 277.5ms | 0.5% | 277.5ms | `now` | `[native code]` |
| 0.5% | 276.9ms | 0.5% | 276.9ms | `getKeyBindingAction` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:120` |
| 0.4% | 235.8ms | 0.4% | 235.8ms | `emit` | `node:events:84` |
| 0.4% | 235.6ms | 0.4% | 235.6ms | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\testing.js` |
| 0.4% | 235.1ms | 0.4% | 235.1ms | `getKeyBindingKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:74` |
| 0.4% | 235.1ms | 0.4% | 235.1ms | `mapIteratorNext` | `[native code]` |
| 0.4% | 233.7ms | 0.4% | 233.7ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:193` |
| 0.4% | 233.6ms | 0.4% | 233.6ms | `test` | `[native code]` |
| 0.4% | 233.4ms | 0.4% | 233.4ms | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:135` |
| 0.4% | 233.3ms | 0.4% | 233.3ms | `dispatchSequenceHandlers` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.4% | 233.1ms | 0.4% | 233.1ms | `Set` | `[native code]` |
| 0.4% | 233.1ms | 0.5% | 279.7ms | `fromWireType` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:48` |
| 0.4% | 233.0ms | 1.4% | 781.6ms | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1740` |
| 0.4% | 232.2ms | 0.4% | 232.2ms | `removeListener` | `node:events:227` |
| 0.4% | 231.3ms | 2.3% | 1.21s | `updateFromLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1083` |
| 0.4% | 230.0ms | 0.4% | 230.0ms | `shift` | `[native code]` |
| 0.4% | 229.4ms | 0.6% | 324.4ms | `handleSequence` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:118` |
| 0.4% | 217.0ms | 1.4% | 777.5ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:33` |
| 0.4% | 216.8ms | 0.4% | 216.8ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:31` |
| 0.3% | 189.9ms | 0.3% | 189.9ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:610` |
| 0.3% | 189.0ms | 0.3% | 189.0ms | `addListener` | `node:events:151` |
| 0.3% | 188.5ms | 0.3% | 188.5ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:226` |
| 0.3% | 188.4ms | 2.1% | 1.11s | `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.3% | 187.6ms | 0.3% | 187.6ms | `isValidBorderStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:23` |
| 0.3% | 187.0ms | 0.9% | 517.1ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1379` |
| 0.3% | 186.1ms | 0.3% | 186.1ms | `isIdleNow` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.3% | 185.8ms | 0.3% | 185.8ms | `emit` | `node:events:80` |
| 0.3% | 185.4ms | 1.5% | 830.6ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1168` |
| 0.3% | 184.8ms | 0.3% | 184.8ms | `padStart` | `[native code]` |
| 0.3% | 184.3ms | 0.3% | 184.3ms | `bufferDrawEditorView` | `[native code]` |
| 0.3% | 184.3ms | 1.9% | 996.7ms | `addToHitGrid` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2887` |
| 0.2% | 143.7ms | 0.2% | 143.7ms | `Uint8Array` | `[native code]` |
| 0.2% | 143.3ms | 0.8% | 468.2ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:628` |
| 0.2% | 142.0ms | 0.8% | 424.2ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:147` |
| 0.2% | 141.9ms | 0.4% | 222.1ms | `editorViewGetVisualCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3934` |
| 0.2% | 141.7ms | 0.5% | 281.8ms | `hitGridPushScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2895` |
| 0.2% | 141.7ms | 0.2% | 141.7ms | `renderCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1008` |
| 0.2% | 141.5ms | 0.2% | 141.5ms | `exec` | `[native code]` |
| 0.2% | 141.4ms | 0.2% | 141.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:50` |
| 0.2% | 141.3ms | 0.2% | 141.3ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1420` |
| 0.2% | 141.1ms | 0.2% | 141.1ms | `(anonymous)` | `node:events` |
| 0.2% | 140.7ms | 0.2% | 140.7ms | `.wasm-function[181]` | `[native code]` |
| 0.2% | 139.9ms | 0.2% | 139.9ms | `listeners` | `node:events:263` |
| 0.2% | 139.9ms | 0.2% | 139.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:26` |
| 0.2% | 139.2ms | 0.5% | 277.2ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:202` |
| 0.2% | 139.1ms | 0.2% | 139.1ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:301` |
| 0.2% | 138.7ms | 0.2% | 139.6ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:11` |
| 0.2% | 138.7ms | 0.5% | 278.4ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4282` |
| 0.2% | 138.7ms | 0.2% | 138.7ms | `eb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:25` |
| 0.2% | 138.6ms | 0.2% | 138.6ms | `.wasm-function[127]` | `[native code]` |
| 0.2% | 138.4ms | 25.3% | 13.29s | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1422` |
| 0.2% | 138.0ms | 0.2% | 138.0ms | `.wasm-function[123]` | `[native code]` |
| 0.2% | 137.8ms | 0.2% | 137.8ms | `updateTextFromNodes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:86` |
| 0.2% | 135.8ms | 0.2% | 135.8ms | `textBufferViewMeasureForDimensions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3388` |
| 0.2% | 135.6ms | 0.2% | 135.6ms | `values` | `[native code]` |
| 0.2% | 134.5ms | 1.3% | 701.6ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4267` |
| 0.2% | 125.0ms | 0.2% | 125.0ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:22` |
| 0.2% | 109.3ms | 33.2% | 17.41s | `evaluate` | `[native code]` |
| 0.2% | 107.8ms | 0.2% | 107.8ms | `.wasm-function[93]` | `[native code]` |
| 0.2% | 106.9ms | 0.2% | 106.9ms | `dlopen` | `[native code]` |
| 0.1% | 96.2ms | 0.1% | 96.2ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1401` |
| 0.1% | 95.7ms | 0.1% | 95.7ms | `screenY` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:544` |
| 0.1% | 95.4ms | 1.4% | 745.2ms | `map` | `[native code]` |
| 0.1% | 95.2ms | 0.6% | 316.9ms | `hitGridPopScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2899` |
| 0.1% | 95.0ms | 0.4% | 221.6ms | `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.1% | 94.5ms | 0.1% | 94.5ms | `N` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` |
| 0.1% | 94.5ms | 0.1% | 94.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js:28` |
| 0.1% | 94.4ms | 0.1% | 94.4ms | `setCursorStyleOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2749` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:113` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `toArrayBuffer` | `[native code]` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `updateStats` | `[native code]` |
| 0.1% | 94.0ms | 0.1% | 94.0ms | `parseKittySpecialKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:236` |
| 0.1% | 93.8ms | 0.1% | 93.8ms | `reconcileTimeoutState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1958` |
| 0.1% | 93.7ms | 0.1% | 93.7ms | `handleSequence` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:129` |
| 0.1% | 93.6ms | 0.1% | 93.6ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:48` |
| 0.1% | 93.5ms | 0.1% | 93.5ms | `.wasm-function[31]` | `[native code]` |
| 0.1% | 93.3ms | 0.1% | 93.3ms | `unpack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:654` |
| 0.1% | 93.3ms | 0.1% | 93.3ms | `editBufferGetEOL` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3759` |
| 0.1% | 93.3ms | 0.3% | 187.3ms | `parseKittyKeyboard` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:306` |
| 0.1% | 93.1ms | 0.1% | 93.1ms | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:149` |
| 0.1% | 93.1ms | 0.1% | 93.1ms | `ensureCapacity` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:214` |
| 0.1% | 92.9ms | 0.1% | 92.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:36` |
| 0.1% | 92.8ms | 0.1% | 92.8ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:615` |
| 0.1% | 92.7ms | 0.1% | 92.7ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:308` |
| 0.1% | 92.6ms | 0.1% | 92.6ms | `listenerCount` | `node:events` |
| 0.1% | 92.4ms | 1.0% | 551.1ms | `matchesKeyBinding` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:133` |
| 0.1% | 92.3ms | 1.1% | 586.8ms | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1471` |
| 0.1% | 92.0ms | 0.1% | 92.0ms | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.1% | 91.7ms | 0.1% | 91.7ms | `get height` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.1% | 91.4ms | 0.1% | 91.4ms | `setCursorStyleOptions` | `[native code]` |
| 0.1% | 91.3ms | 15.8% | 8.31s | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1768` |
| 0.1% | 91.0ms | 0.2% | 137.0ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:258` |
| 0.1% | 90.9ms | 0.1% | 90.9ms | `setBigUint64` | `[native code]` |
| 0.1% | 90.9ms | 0.1% | 90.9ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:179` |
| 0.1% | 90.5ms | 0.1% | 90.5ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 88.9ms | 0.1% | 88.9ms | `isSplitCursorSeedFrameBlocked` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:2572` |
| 0.1% | 80.2ms | 0.1% | 80.2ms | `ArrayBuffer` | `[native code]` |
| 0.1% | 75.5ms | 6.7% | 3.53s | `(unknown)` | `[native code]` |
| 0.1% | 62.6ms | 0.1% | 62.6ms | `get` | `[native code]` |
| 0.1% | 60.8ms | 0.1% | 60.8ms | `.wasm-function[59]` | `[native code]` |
| 0.1% | 56.5ms | 0.2% | 140.0ms | `hitGridPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 48.4ms | 0.0% | 48.4ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1421` |
| 0.0% | 48.1ms | 0.0% | 48.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\app.tsx:116` |
| 0.0% | 48.0ms | 0.0% | 48.0ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:148` |
| 0.0% | 47.8ms | 0.0% | 47.8ms | `Ea` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` |
| 0.0% | 47.8ms | 0.0% | 47.8ms | `handleAutoScroll` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-sq86yyfz.js` |
| 0.0% | 47.6ms | 0.0% | 47.6ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:182` |
| 0.0% | 47.6ms | 0.0% | 47.6ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 47.5ms | 0.9% | 516.6ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:268` |
| 0.0% | 47.5ms | 0.4% | 234.8ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:313` |
| 0.0% | 47.5ms | 0.0% | 47.5ms | `scanPending` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:851` |
| 0.0% | 47.4ms | 0.0% | 47.4ms | `hitGridPopScissorRect` | `[native code]` |
| 0.0% | 47.4ms | 0.0% | 47.4ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:327` |
| 0.0% | 47.0ms | 0.0% | 47.0ms | `BigInt` | `[native code]` |
| 0.0% | 46.9ms | 0.0% | 46.9ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:609` |
| 0.0% | 46.9ms | 0.0% | 46.9ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.8ms | 0.1% | 93.3ms | `parseModule` | `[native code]` |
| 0.0% | 46.7ms | 0.0% | 46.7ms | `wrap` | `bun:ffi:320` |
| 0.0% | 46.7ms | 0.0% | 46.7ms | `bufferGetRealCharSize` | `[native code]` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:273` |
| 0.0% | 46.6ms | 0.1% | 92.4ms | `unpack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:657` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:616` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `editorViewGetCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3919` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `.wasm-function[105]` | `[native code]` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3162` |
| 0.0% | 46.5ms | 0.0% | 47.5ms | `gotoLineHome` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:764` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:58` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `getKeyBindingKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `KeyEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `.wasm-function[152]` | `[native code]` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `eb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:32` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `renderNative` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:22` |
| 0.0% | 46.2ms | 3.6% | 1.91s | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:731` |
| 0.0% | 46.2ms | 0.0% | 46.2ms | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:715` |
| 0.0% | 46.2ms | 0.0% | 46.2ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4287` |
| 0.0% | 46.1ms | 28.0% | 14.68s | `bound ` | `[native code]` |
| 0.0% | 46.1ms | 0.1% | 93.9ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1367` |
| 0.0% | 46.1ms | 0.0% | 46.1ms | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6736` |
| 0.0% | 46.0ms | 0.0% | 46.0ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4255` |
| 0.0% | 45.9ms | 0.0% | 45.9ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:328` |
| 0.0% | 45.9ms | 0.0% | 45.9ms | `setCursorPosition` | `[native code]` |
| 0.0% | 45.8ms | 0.0% | 45.8ms | `updateFromLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1095` |
| 0.0% | 45.8ms | 0.2% | 143.1ms | `editorViewGetSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3839` |
| 0.0% | 45.7ms | 0.0% | 45.7ms | `DataView` | `[native code]` |
| 0.0% | 45.7ms | 0.6% | 321.2ms | `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 45.7ms | 0.0% | 45.7ms | `listenerCount` | `node:events:288` |
| 0.0% | 45.6ms | 0.0% | 45.6ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1297` |
| 0.0% | 45.5ms | 0.0% | 45.5ms | `measureFunc` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 45.2ms | 0.0% | 45.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4348` |
| 0.0% | 44.9ms | 3.7% | 1.94s | `bufferWriteResolvedChars` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2453` |
| 0.0% | 44.9ms | 0.0% | 44.9ms | `editorViewGetVisualCursor` | `[native code]` |
| 0.0% | 44.8ms | 0.0% | 44.8ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 44.8ms | 0.0% | 44.8ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1296` |
| 0.0% | 44.7ms | 0.0% | 44.7ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4294` |
| 0.0% | 43.3ms | 0.0% | 43.3ms | `get screenX` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:540` |
| 0.0% | 42.9ms | 0.0% | 42.9ms | `bufferPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 42.5ms | 0.0% | 42.5ms | `addListener` | `node:events:153` |
| 0.0% | 42.1ms | 4.9% | 2.61s | `bufferDrawTextBufferView` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3474` |
| 0.0% | 41.9ms | 29.6% | 15.51s | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:35` |
| 0.0% | 41.2ms | 0.0% | 41.2ms | `textBufferViewMeasureForDimensions` | `[native code]` |
| 0.0% | 31.3ms | 0.0% | 31.3ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 30.6ms | 0.0% | 30.6ms | `isFull` | `internal:fixed_queue` |
| 0.0% | 30.3ms | 0.0% | 30.3ms | `driveAsyncFunction` | `[native code]` |
| 0.0% | 29.0ms | 0.0% | 29.0ms | `getHitGridDirty (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 18.1ms | 0.0% | 18.1ms | `getOpenTUILib` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 17.0ms | 0.0% | 17.0ms | `resolve` | `[native code]` |
| 0.0% | 16.6ms | 0.0% | 16.6ms | `instantiate` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `textBufferSetSyntaxStyle` | `[native code]` |
| 0.0% | 15.3ms | 0.0% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:33` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `o` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:14` |
| 0.0% | 13.2ms | 0.0% | 13.2ms | `setupMarginAndPadding` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:803` |
| 0.0% | 11.6ms | 0.0% | 11.6ms | `isValidElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` |
| 0.0% | 11.4ms | 0.0% | 11.4ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `fetch` | `[native code]` |
| 0.0% | 6.7ms | 0.0% | 6.7ms | `measure` | `[native code]` |
| 0.0% | 6.7ms | 0.0% | 6.7ms | `updateProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:362` |
| 0.0% | 6.6ms | 0.0% | 6.6ms | `Error` | `[native code]` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `freeze` | `[native code]` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `updateProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:368` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `editBufferGetText` | `[native code]` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `createWorkInProgress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:16508` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `ReactElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:187` |
| 0.0% | 2.0ms | 0.0% | 35.4ms | `async loadAndEvaluateModule` | `[native code]` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `getChildHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:424` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js:189` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `timeStamp` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `editorViewGetSelection` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 13.6ms | `bound react_stack_bottom_frame` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `performWorkOnRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14084` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15487` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12263` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `listeners` | `node:events:266` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `getTaskName` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:108` |
| 0.0% | 1.0ms | 0.0% | 1.9ms | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6742` |
| 0.0% | 1.0ms | 0.0% | 49.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2200` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flushMutationEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commitHookLayoutEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10826` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7728` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `handleStdinEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3195` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `beginWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9191` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `isConcurrentActEnvironment` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:13985` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `ReactElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:169` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14729` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `editorViewGetCursor` | `[native code]` |
| 0.0% | 1.0ms | 6.1% | 3.21s | `measure` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:67` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `borderCharsToArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:151` |
| 0.0% | 998us | 0.0% | 998us | `reconcileChildrenArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4210` |
| 0.0% | 995us | 0.0% | 995us | `mapValue` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 990us | 0.0% | 990us | `189` | `[native code]` |
| 0.0% | 986us | 0.0% | 986us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:17438` |
| 0.0% | 983us | 0.0% | 983us | `areHookInputsEqual` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5275` |
| 0.0% | 982us | 0.0% | 982us | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 981us | 0.0% | 981us | `hb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:28` |
| 0.0% | 974us | 0.0% | 974us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14743` |
| 0.0% | 970us | 0.0% | 970us | `emit` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 969us | 0.0% | 969us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3250` |
| 0.0% | 966us | 0.0% | 966us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:767` |
| 0.0% | 962us | 0.0% | 962us | `startEffectTimer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 961us | 0.3% | 167.6ms | `performWorkOnRootViaSchedulerTask` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3335` |
| 0.0% | 958us | 0.0% | 958us | `clearSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 955us | 0.0% | 5.5ms | `setProperty` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:346` |
| 0.0% | 954us | 0.0% | 954us | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:150` |
| 0.0% | 953us | 0.0% | 6.8ms | `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 951us | 0.0% | 951us | `flushSpawnedWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15788` |
| 0.0% | 949us | 0.0% | 4.6ms | `reconcileChildFibersImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4568` |
| 0.0% | 948us | 0.0% | 948us | `write` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:47` |
| 0.0% | 947us | 0.0% | 947us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1370` |
| 0.0% | 946us | 0.0% | 2.8ms | `beginWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9519` |
| 0.0% | 939us | 0.0% | 939us | `clearTimeout` | `[native code]` |
| 0.0% | 938us | 0.0% | 938us | `get screenY` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 938us | 0.0% | 938us | `startUpdateTimerByLane` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2987` |
| 0.0% | 937us | 0.0% | 937us | `mapIterationNext` | `[native code]` |
| 0.0% | 936us | 0.7% | 419.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1122` |
| 0.0% | 932us | 0.0% | 932us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14734` |
| 0.0% | 931us | 0.0% | 931us | `warnIfUpdatesNotWrappedWithActDEV` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 930us | 0.2% | 107.4ms | `runWithFiberInDEV` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2508` |
| 0.0% | 928us | 0.0% | 928us | `updateReducerImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 927us | 0.0% | 927us | `pushHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 923us | 0.0% | 923us | `pushHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:1967` |
| 0.0% | 915us | 0.0% | 915us | `M` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 914us | 0.1% | 103.8ms | `performWorkOnRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14165` |
| 0.0% | 912us | 0.0% | 912us | `useRenderer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js` |
| 0.0% | 912us | 0.2% | 144.2ms | `s` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:60` |
| 0.0% | 909us | 2.2% | 1.18s | `dispatchSequenceHandlers` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3178` |
| 0.0% | 906us | 0.0% | 906us | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 906us | 0.0% | 906us | `bind` | `[native code]` |
| 0.0% | 904us | 0.0% | 3.8ms | `bailoutOnAlreadyFinishedWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:8985` |
| 0.0% | 904us | 0.0% | 1.8ms | `forEach` | `[native code]` |
| 0.0% | 903us | 0.0% | 903us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14657` |
| 0.0% | 902us | 0.0% | 902us | `reconcileChildFibersImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4565` |
| 0.0% | 896us | 0.0% | 896us | `completeWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10141` |
| 0.0% | 892us | 0.0% | 892us | `reconcileChildrenArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4270` |
| 0.0% | 891us | 0.0% | 891us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15546` |
| 0.0% | 890us | 0.0% | 890us | `sanitize` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\contracts.ts:239` |
| 0.0% | 881us | 0.0% | 881us | `flushSyncWorkAcrossRoots_impl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3180` |
| 0.0% | 878us | 0.0% | 878us | `commitHookEffectListUnmount` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10914` |
| 0.0% | 869us | 0.4% | 234.4ms | `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 867us | 0.0% | 867us | `getBorderSides` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 866us | 0.0% | 866us | `applyEventOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1662` |
| 0.0% | 865us | 0.1% | 84.0ms | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12594` |
| 0.0% | 861us | 0.0% | 861us | `cwd` | `[native code]` |
| 0.0% | 859us | 0.0% | 859us | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7692` |
| 0.0% | 859us | 0.0% | 859us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` |
| 0.0% | 856us | 0.0% | 856us | `ZodNumberFormat` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:42` |
| 0.0% | 855us | 0.0% | 855us | `.wasm-function[119]` | `[native code]` |
| 0.0% | 855us | 0.1% | 89.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2197` |
| 0.0% | 852us | 0.0% | 852us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js` |
| 0.0% | 851us | 0.0% | 851us | `popProvider` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2761` |
| 0.0% | 847us | 0.0% | 847us | `borderCharsToArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:150` |
| 0.0% | 846us | 0.7% | 387.2ms | `getText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:134` |
| 0.0% | 834us | 0.0% | 834us | `useContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18151` |
| 0.0% | 834us | 0.0% | 834us | `renderWithHooks` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5308` |
| 0.0% | 831us | 0.0% | 831us | `close` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 92.2% | 48.32s | 4.2% | 2.21s | `(anonymous)` | `[native code]` |
| 87.7% | 45.97s | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 49.3% | 25.86s | 1.2% | 639.4ms | `.wasm-function[61]` | `[native code]` |
| 38.2% | 20.04s | 0.0% | 0us | `emit` | `node:events:95` |
| 34.3% | 17.97s | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4305` |
| 33.2% | 17.41s | 0.2% | 109.3ms | `evaluate` | `[native code]` |
| 33.2% | 17.41s | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 30.6% | 16.05s | 0.0% | 0us | `Promise` | `[native code]` |
| 30.6% | 16.05s | 0.0% | 0us | `async frameWith` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:24` |
| 30.6% | 16.05s | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:35` |
| 30.0% | 15.74s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:27` |
| 29.6% | 15.51s | 0.0% | 41.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:35` |
| 28.0% | 14.68s | 0.0% | 46.1ms | `bound ` | `[native code]` |
| 25.3% | 13.29s | 0.2% | 138.4ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1422` |
| 24.2% | 12.71s | 0.0% | 0us | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:376` |
| 21.5% | 11.31s | 0.0% | 0us | `drain` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:780` |
| 21.5% | 11.31s | 0.0% | 0us | `drainStdinParser` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3189` |
| 21.5% | 11.31s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3190` |
| 21.5% | 11.31s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3062` |
| 15.8% | 8.31s | 0.1% | 91.3ms | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1768` |
| 15.4% | 8.07s | 0.0% | 0us | `handleStdinEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3201` |
| 15.4% | 8.07s | 0.0% | 0us | `processParsedKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:104` |
| 14.5% | 7.60s | 0.0% | 0us | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:185` |
| 11.1% | 5.83s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4349` |
| 11.1% | 5.83s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:403` |
| 11.0% | 5.78s | 1.9% | 1.02s | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4254` |
| 10.9% | 5.71s | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4334` |
| 10.5% | 5.53s | 0.0% | 0us | `frame` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:26` |
| 10.2% | 5.38s | 0.5% | 298.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:33` |
| 9.6% | 5.04s | 0.0% | 0us | `calculateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1801` |
| 9.6% | 5.04s | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1753` |
| 8.9% | 4.70s | 0.0% | 0us | `wasm-stub` | `[native code]` |
| 8.6% | 4.53s | 0.0% | 0us | `.wasm-function[182]` | `[native code]` |
| 8.6% | 4.53s | 0.0% | 0us | `.wasm-function[220]` | `[native code]` |
| 8.4% | 4.41s | 0.0% | 0us | `captureCharFrame` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\test-renderer.ts:229` |
| 6.7% | 3.53s | 0.1% | 75.5ms | `(unknown)` | `[native code]` |
| 6.4% | 3.36s | 0.0% | 0us | `editBufferSetCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3681` |
| 6.4% | 3.36s | 0.0% | 0us | `gotoLineHome` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:771` |
| 6.4% | 3.36s | 0.0% | 0us | `setCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:203` |
| 6.4% | 3.36s | 6.3% | 3.31s | `editBufferSetCursor` | `[native code]` |
| 6.4% | 3.36s | 0.0% | 0us | `.wasm-function[229]` | `[native code]` |
| 6.4% | 3.36s | 0.0% | 0us | `.wasm-function[177]` | `[native code]` |
| 6.1% | 3.21s | 0.0% | 1.0ms | `measure` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:67` |
| 6.1% | 3.21s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:60` |
| 6.0% | 3.16s | 0.0% | 0us | `measureFunc` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:958` |
| 5.9% | 3.13s | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4284` |
| 5.7% | 2.99s | 4.8% | 2.52s | `from` | `[native code]` |
| 5.7% | 2.99s | 5.7% | 2.99s | `textBufferViewMeasureForDimensions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3387` |
| 5.3% | 2.80s | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1758` |
| 4.9% | 2.61s | 0.0% | 42.1ms | `bufferDrawTextBufferView` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3474` |
| 4.9% | 2.61s | 0.0% | 0us | `renderSelf` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:500` |
| 4.9% | 2.61s | 0.0% | 0us | `drawTextBuffer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:344` |
| 4.9% | 2.61s | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:491` |
| 4.9% | 2.57s | 0.0% | 0us | `bufferDrawTextBufferView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 4.9% | 2.56s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3061` |
| 4.7% | 2.47s | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4315` |
| 4.4% | 2.33s | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:994` |
| 4.3% | 2.29s | 0.0% | 0us | `editBufferSetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 4.3% | 2.28s | 4.3% | 2.28s | `bufferDrawTextBufferView` | `[native code]` |
| 4.1% | 2.16s | 0.8% | 446.5ms | `anonymous` | `[native code]` |
| 3.9% | 2.05s | 0.0% | 0us | `async pressKeys` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:163` |
| 3.9% | 2.05s | 0.0% | 0us | `renderNative` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4420` |
| 3.9% | 2.05s | 3.9% | 2.05s | `render` | `[native code]` |
| 3.9% | 2.05s | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:167` |
| 3.8% | 2.01s | 3.5% | 1.87s | `getRealCharBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:159` |
| 3.7% | 1.94s | 0.0% | 0us | `getRealCharBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:160` |
| 3.7% | 1.94s | 0.0% | 44.9ms | `bufferWriteResolvedChars` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2453` |
| 3.6% | 1.91s | 0.0% | 46.2ms | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:731` |
| 3.6% | 1.89s | 0.0% | 0us | `bufferWriteResolvedChars (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 3.5% | 1.85s | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1459` |
| 3.4% | 1.82s | 0.0% | 0us | `handleStdinEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3211` |
| 3.4% | 1.82s | 0.0% | 0us | `processPaste` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:123` |
| 3.4% | 1.81s | 0.8% | 422.0ms | `scanPending` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:888` |
| 3.4% | 1.80s | 3.4% | 1.80s | `bufferWriteResolvedChars` | `[native code]` |
| 3.3% | 1.77s | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:413` |
| 3.3% | 1.77s | 0.0% | 0us | `handlePaste` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Textarea.ts:262` |
| 3.3% | 1.76s | 0.0% | 0us | `editBufferDeleteRange (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 3.3% | 1.76s | 3.2% | 1.72s | `editBufferDeleteRange` | `[native code]` |
| 3.3% | 1.76s | 0.0% | 0us | `editBufferDeleteRange` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3649` |
| 3.3% | 1.76s | 0.0% | 0us | `deleteRange` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:163` |
| 3.3% | 1.76s | 0.0% | 0us | `deleteToLineEnd` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:845` |
| 3.2% | 1.71s | 0.0% | 0us | `renderSelf` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:254` |
| 3.1% | 1.63s | 0.0% | 0us | `insertText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:651` |
| 3.1% | 1.63s | 0.0% | 0us | `insertText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:148` |
| 3.1% | 1.63s | 0.0% | 0us | `editBufferInsertText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 3.1% | 1.63s | 0.0% | 0us | `editBufferInsertText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3631` |
| 3.0% | 1.58s | 0.0% | 0us | `render (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 2.9% | 1.53s | 0.0% | 0us | `drawBox` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:465` |
| 2.7% | 1.46s | 0.0% | 0us | `renderCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1012` |
| 2.7% | 1.44s | 0.7% | 376.5ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:153` |
| 2.6% | 1.41s | 0.0% | 0us | `handleStdinEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3197` |
| 2.6% | 1.39s | 2.5% | 1.35s | `editBufferInsertText` | `[native code]` |
| 2.6% | 1.39s | 0.0% | 0us | `emitKeyOrResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1778` |
| 2.5% | 1.32s | 0.0% | 0us | `setCursorStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3786` |
| 2.3% | 1.21s | 0.4% | 231.3ms | `updateFromLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1083` |
| 2.2% | 1.18s | 0.0% | 909us | `dispatchSequenceHandlers` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3178` |
| 2.2% | 1.16s | 0.0% | 0us | `bufferDrawBox` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2678` |
| 2.1% | 1.11s | 0.3% | 188.4ms | `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 2.0% | 1.06s | 0.0% | 0us | `wrap` | `bun:ffi:299` |
| 1.9% | 996.7ms | 0.0% | 0us | `addToHitGrid` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1354` |
| 1.9% | 996.7ms | 0.3% | 184.3ms | `addToHitGrid` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2887` |
| 1.8% | 972.0ms | 1.4% | 736.9ms | `next` | `[native code]` |
| 1.7% | 930.8ms | 0.0% | 0us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1431` |
| 1.6% | 844.6ms | 0.0% | 0us | `setCursorStyleOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2751` |
| 1.5% | 830.6ms | 0.3% | 185.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1168` |
| 1.5% | 791.4ms | 1.5% | 791.4ms | `bufferDrawBox` | `[native code]` |
| 1.4% | 781.6ms | 0.4% | 233.0ms | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1740` |
| 1.4% | 777.5ms | 0.4% | 217.0ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:33` |
| 1.4% | 745.2ms | 0.1% | 95.4ms | `map` | `[native code]` |
| 1.3% | 708.3ms | 0.9% | 522.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:32` |
| 1.3% | 701.6ms | 0.2% | 134.5ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4267` |
| 1.3% | 688.8ms | 0.0% | 0us | `renderCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1004` |
| 1.2% | 630.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2203` |
| 1.2% | 629.4ms | 1.2% | 629.4ms | `setTimeout` | `[native code]` |
| 1.1% | 606.4ms | 1.1% | 606.4ms | `decode` | `[native code]` |
| 1.1% | 586.8ms | 0.1% | 92.3ms | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1471` |
| 1.0% | 560.6ms | 1.0% | 560.6ms | `Buffer` | `[native code]` |
| 1.0% | 551.1ms | 0.1% | 92.4ms | `matchesKeyBinding` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:133` |
| 0.9% | 517.1ms | 0.3% | 187.0ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1379` |
| 0.9% | 516.6ms | 0.0% | 47.5ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:268` |
| 0.9% | 491.0ms | 0.0% | 0us | `wrap` | `bun:ffi:308` |
| 0.9% | 488.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:60` |
| 0.9% | 482.0ms | 0.0% | 0us | `processCapabilitySequence` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3094` |
| 0.8% | 471.5ms | 0.8% | 471.5ms | `cloneObject` | `[native code]` |
| 0.8% | 470.0ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2756` |
| 0.8% | 470.0ms | 0.0% | 0us | `wrap` | `bun:ffi:296` |
| 0.8% | 468.2ms | 0.2% | 143.3ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:628` |
| 0.8% | 459.2ms | 0.8% | 459.2ms | `slice` | `[native code]` |
| 0.8% | 457.2ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4347` |
| 0.8% | 456.4ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:489` |
| 0.8% | 440.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:188` |
| 0.8% | 435.1ms | 0.8% | 435.1ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4274` |
| 0.8% | 429.6ms | 0.8% | 429.6ms | `now` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\clock.ts:17` |
| 0.8% | 424.2ms | 0.2% | 142.0ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:147` |
| 0.8% | 423.1ms | 0.0% | 0us | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:729` |
| 0.7% | 419.1ms | 0.0% | 936us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1122` |
| 0.7% | 387.2ms | 0.0% | 846us | `getText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:134` |
| 0.7% | 383.4ms | 0.0% | 0us | `setCursorStyleOptions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.7% | 383.4ms | 0.0% | 0us | `setCursorStyleOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2752` |
| 0.7% | 378.6ms | 0.7% | 374.7ms | `editBufferGetText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3617` |
| 0.7% | 375.5ms | 0.7% | 375.5ms | `String` | `[native code]` |
| 0.7% | 374.0ms | 0.0% | 0us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1433` |
| 0.7% | 371.4ms | 0.0% | 0us | `handleKeyPress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Textarea.ts:267` |
| 0.7% | 368.8ms | 0.5% | 279.9ms | `renderNative` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4398` |
| 0.6% | 366.2ms | 0.6% | 366.2ms | `bufferDrawBox` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2687` |
| 0.6% | 362.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:49` |
| 0.6% | 358.1ms | 0.6% | 358.1ms | `startsWith` | `[native code]` |
| 0.6% | 358.1ms | 0.0% | 0us | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:250` |
| 0.6% | 330.0ms | 0.6% | 330.0ms | `subarray` | `[native code]` |
| 0.6% | 326.6ms | 0.5% | 281.7ms | `editorViewGetVisualCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3935` |
| 0.6% | 325.4ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:993` |
| 0.6% | 324.4ms | 0.4% | 229.4ms | `handleSequence` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:118` |
| 0.6% | 324.1ms | 0.6% | 324.1ms | `addToHitGrid` | `[native code]` |
| 0.6% | 321.2ms | 0.0% | 45.7ms | `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.6% | 321.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:112` |
| 0.6% | 316.9ms | 0.1% | 95.2ms | `hitGridPopScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2899` |
| 0.6% | 316.9ms | 0.0% | 0us | `popHitGridScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1363` |
| 0.6% | 316.9ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1777` |
| 0.5% | 290.0ms | 0.0% | 0us | `recursivelyTraverseMutationEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12141` |
| 0.5% | 281.8ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1773` |
| 0.5% | 281.8ms | 0.2% | 141.7ms | `hitGridPushScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2895` |
| 0.5% | 281.8ms | 0.0% | 0us | `pushHitGridScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1359` |
| 0.5% | 281.0ms | 0.5% | 281.0ms | `renderSelf` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.5% | 280.7ms | 0.5% | 280.7ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.5% | 280.1ms | 0.5% | 280.1ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4307` |
| 0.5% | 279.7ms | 0.4% | 233.1ms | `fromWireType` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:48` |
| 0.5% | 279.5ms | 0.0% | 0us | `_getVisibleChildren` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:42` |
| 0.5% | 279.0ms | 0.5% | 279.0ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1365` |
| 0.5% | 278.4ms | 0.2% | 138.7ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4282` |
| 0.5% | 277.5ms | 0.5% | 277.5ms | `now` | `[native code]` |
| 0.5% | 277.2ms | 0.2% | 139.2ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:202` |
| 0.5% | 276.9ms | 0.5% | 276.9ms | `getKeyBindingAction` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:120` |
| 0.4% | 247.8ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1752` |
| 0.4% | 235.8ms | 0.4% | 235.8ms | `emit` | `node:events:84` |
| 0.4% | 235.6ms | 0.4% | 235.6ms | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\testing.js` |
| 0.4% | 235.1ms | 0.4% | 235.1ms | `getKeyBindingKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:74` |
| 0.4% | 235.1ms | 0.4% | 235.1ms | `mapIteratorNext` | `[native code]` |
| 0.4% | 234.8ms | 0.0% | 47.5ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:313` |
| 0.4% | 234.4ms | 0.0% | 869us | `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.4% | 234.4ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4326` |
| 0.4% | 234.4ms | 0.0% | 0us | `updateStats` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2330` |
| 0.4% | 233.7ms | 0.4% | 233.7ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:193` |
| 0.4% | 233.6ms | 0.4% | 233.6ms | `test` | `[native code]` |
| 0.4% | 233.4ms | 0.4% | 233.4ms | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:135` |
| 0.4% | 233.3ms | 0.4% | 233.3ms | `dispatchSequenceHandlers` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.4% | 233.1ms | 0.4% | 233.1ms | `Set` | `[native code]` |
| 0.4% | 232.2ms | 0.4% | 232.2ms | `removeListener` | `node:events:227` |
| 0.4% | 230.0ms | 0.4% | 230.0ms | `shift` | `[native code]` |
| 0.4% | 230.0ms | 0.0% | 0us | `removeListener` | `node:events:223` |
| 0.4% | 222.1ms | 0.2% | 141.9ms | `editorViewGetVisualCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3934` |
| 0.4% | 221.6ms | 0.1% | 95.0ms | `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.4% | 216.8ms | 0.4% | 216.8ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:31` |
| 0.3% | 189.9ms | 0.3% | 189.9ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:610` |
| 0.3% | 189.0ms | 0.3% | 189.0ms | `addListener` | `node:events:151` |
| 0.3% | 188.5ms | 0.3% | 188.5ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:226` |
| 0.3% | 188.5ms | 0.0% | 0us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1434` |
| 0.3% | 187.6ms | 0.0% | 0us | `drawBox` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:455` |
| 0.3% | 187.6ms | 0.0% | 0us | `parseBorderStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:27` |
| 0.3% | 187.6ms | 0.3% | 187.6ms | `isValidBorderStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:23` |
| 0.3% | 187.3ms | 0.1% | 93.3ms | `parseKittyKeyboard` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:306` |
| 0.3% | 186.1ms | 0.3% | 186.1ms | `isIdleNow` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.3% | 186.1ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4380` |
| 0.3% | 186.1ms | 0.0% | 0us | `resolveIdleIfNeeded` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1501` |
| 0.3% | 185.8ms | 0.3% | 185.8ms | `emit` | `node:events:80` |
| 0.3% | 184.8ms | 0.3% | 184.8ms | `padStart` | `[native code]` |
| 0.3% | 184.3ms | 0.3% | 184.3ms | `bufferDrawEditorView` | `[native code]` |
| 0.3% | 184.3ms | 0.0% | 0us | `bufferDrawEditorView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.3% | 184.3ms | 0.0% | 0us | `renderSelf` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:998` |
| 0.3% | 184.3ms | 0.0% | 0us | `bufferDrawEditorView` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3478` |
| 0.3% | 184.3ms | 0.0% | 0us | `drawEditorView` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:349` |
| 0.3% | 172.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:25` |
| 0.3% | 167.6ms | 0.0% | 0us | `bound performWorkOnRootViaSchedulerTask` | `[native code]` |
| 0.3% | 167.6ms | 0.0% | 0us | `performWorkUntilDeadline` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js:45` |
| 0.3% | 167.6ms | 0.0% | 961us | `performWorkOnRootViaSchedulerTask` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3335` |
| 0.2% | 144.3ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 0.2% | 144.2ms | 0.0% | 912us | `s` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:60` |
| 0.2% | 143.7ms | 0.2% | 143.7ms | `Uint8Array` | `[native code]` |
| 0.2% | 143.1ms | 0.0% | 45.8ms | `editorViewGetSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3839` |
| 0.2% | 143.1ms | 0.0% | 0us | `insertText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:647` |
| 0.2% | 143.1ms | 0.0% | 0us | `hasSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\editor-view.ts:102` |
| 0.2% | 142.2ms | 0.0% | 0us | `hasSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:576` |
| 0.2% | 141.9ms | 0.0% | 0us | `gotoLineHome` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:765` |
| 0.2% | 141.7ms | 0.2% | 141.7ms | `renderCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1008` |
| 0.2% | 141.5ms | 0.2% | 141.5ms | `exec` | `[native code]` |
| 0.2% | 141.4ms | 0.2% | 141.4ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:50` |
| 0.2% | 141.3ms | 0.2% | 141.3ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1420` |
| 0.2% | 141.1ms | 0.2% | 141.1ms | `(anonymous)` | `node:events` |
| 0.2% | 140.7ms | 0.2% | 140.7ms | `.wasm-function[181]` | `[native code]` |
| 0.2% | 140.0ms | 0.1% | 56.5ms | `hitGridPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.2% | 139.9ms | 0.2% | 139.9ms | `listeners` | `node:events:263` |
| 0.2% | 139.9ms | 0.2% | 139.9ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:26` |
| 0.2% | 139.6ms | 0.2% | 138.7ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:11` |
| 0.2% | 139.1ms | 0.2% | 139.1ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:301` |
| 0.2% | 139.1ms | 0.0% | 0us | `getEOL` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:243` |
| 0.2% | 139.1ms | 0.0% | 0us | `deleteToLineEnd` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:842` |
| 0.2% | 138.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3057` |
| 0.2% | 138.7ms | 0.2% | 138.7ms | `eb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:25` |
| 0.2% | 138.6ms | 0.2% | 138.6ms | `.wasm-function[127]` | `[native code]` |
| 0.2% | 138.3ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4333` |
| 0.2% | 138.0ms | 0.2% | 138.0ms | `.wasm-function[123]` | `[native code]` |
| 0.2% | 137.8ms | 0.2% | 137.8ms | `updateTextFromNodes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:86` |
| 0.2% | 137.8ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:128` |
| 0.2% | 137.8ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1741` |
| 0.2% | 137.7ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4323` |
| 0.2% | 137.0ms | 0.1% | 91.0ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:258` |
| 0.2% | 135.8ms | 0.2% | 135.8ms | `textBufferViewMeasureForDimensions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3388` |
| 0.2% | 135.6ms | 0.2% | 135.6ms | `values` | `[native code]` |
| 0.2% | 133.0ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 0.2% | 125.0ms | 0.2% | 125.0ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:22` |
| 0.2% | 125.0ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:4447` |
| 0.2% | 125.0ms | 0.0% | 0us | `FFIRenderLib` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2119` |
| 0.2% | 107.8ms | 0.2% | 107.8ms | `.wasm-function[93]` | `[native code]` |
| 0.2% | 107.4ms | 0.0% | 930us | `runWithFiberInDEV` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2508` |
| 0.2% | 106.9ms | 0.0% | 0us | `dlopen` | `bun:ffi:345` |
| 0.2% | 106.9ms | 0.2% | 106.9ms | `dlopen` | `[native code]` |
| 0.2% | 106.9ms | 0.0% | 0us | `dlopen` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\platform\ffi.ts:319` |
| 0.2% | 106.9ms | 0.0% | 0us | `getOpenTUILib` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:142` |
| 0.1% | 103.8ms | 0.0% | 914us | `performWorkOnRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14165` |
| 0.1% | 103.3ms | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12156` |
| 0.1% | 98.0ms | 0.0% | 0us | `link` | `[native code]` |
| 0.1% | 97.3ms | 0.0% | 0us | `editorViewGetSelection (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.1% | 96.2ms | 0.1% | 96.2ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1401` |
| 0.1% | 95.8ms | 0.0% | 0us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1437` |
| 0.1% | 95.7ms | 0.1% | 95.7ms | `screenY` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:544` |
| 0.1% | 95.7ms | 0.0% | 0us | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:99` |
| 0.1% | 95.3ms | 0.0% | 0us | `editorViewGetCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3921` |
| 0.1% | 95.3ms | 0.0% | 0us | `editorViewGetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.1% | 94.5ms | 0.1% | 94.5ms | `N` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` |
| 0.1% | 94.5ms | 0.0% | 0us | `getKeyBindingAction` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:119` |
| 0.1% | 94.5ms | 0.1% | 94.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js:28` |
| 0.1% | 94.4ms | 0.1% | 94.4ms | `setCursorStyleOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2749` |
| 0.1% | 94.3ms | 0.0% | 0us | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:247` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:113` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `toArrayBuffer` | `[native code]` |
| 0.1% | 94.2ms | 0.1% | 94.2ms | `updateStats` | `[native code]` |
| 0.1% | 94.0ms | 0.1% | 94.0ms | `parseKittySpecialKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:236` |
| 0.1% | 94.0ms | 0.0% | 0us | `matchesKeyBinding` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:131` |
| 0.1% | 93.9ms | 0.0% | 46.1ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1367` |
| 0.1% | 93.8ms | 0.1% | 93.8ms | `reconcileTimeoutState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1958` |
| 0.1% | 93.8ms | 0.0% | 0us | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:748` |
| 0.1% | 93.7ms | 0.1% | 93.7ms | `handleSequence` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:129` |
| 0.1% | 93.6ms | 0.1% | 93.6ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:48` |
| 0.1% | 93.5ms | 0.1% | 93.5ms | `.wasm-function[31]` | `[native code]` |
| 0.1% | 93.3ms | 0.1% | 93.3ms | `unpack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:654` |
| 0.1% | 93.3ms | 0.1% | 93.3ms | `editBufferGetEOL` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3759` |
| 0.1% | 93.3ms | 0.0% | 0us | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:243` |
| 0.1% | 93.3ms | 0.0% | 46.8ms | `parseModule` | `[native code]` |
| 0.1% | 93.1ms | 0.1% | 93.1ms | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:149` |
| 0.1% | 93.1ms | 0.1% | 93.1ms | `ensureCapacity` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:214` |
| 0.1% | 93.1ms | 0.0% | 0us | `append` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:174` |
| 0.1% | 92.9ms | 0.1% | 92.9ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:36` |
| 0.1% | 92.8ms | 0.1% | 92.8ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:615` |
| 0.1% | 92.7ms | 0.1% | 92.7ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:308` |
| 0.1% | 92.6ms | 0.1% | 92.6ms | `listenerCount` | `node:events` |
| 0.1% | 92.6ms | 0.0% | 0us | `.wasm-function[33]` | `[native code]` |
| 0.1% | 92.6ms | 0.0% | 0us | `.wasm-function[68]` | `[native code]` |
| 0.1% | 92.4ms | 0.0% | 46.6ms | `unpack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:657` |
| 0.1% | 92.0ms | 0.1% | 92.0ms | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.1% | 91.7ms | 0.1% | 91.7ms | `get height` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.1% | 91.4ms | 0.1% | 91.4ms | `setCursorStyleOptions` | `[native code]` |
| 0.1% | 90.9ms | 0.1% | 90.9ms | `setBigUint64` | `[native code]` |
| 0.1% | 90.9ms | 0.1% | 90.9ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:179` |
| 0.1% | 90.5ms | 0.1% | 90.5ms | `arrayFromFastWithoutMapFn` | `[native code]` |
| 0.1% | 90.4ms | 0.0% | 0us | `renderRootSync` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15080` |
| 0.1% | 90.4ms | 0.0% | 0us | `workLoopSync` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15099` |
| 0.1% | 89.4ms | 0.0% | 855us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2197` |
| 0.1% | 88.9ms | 0.1% | 88.9ms | `isSplitCursorSeedFrameBlocked` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:2572` |
| 0.1% | 84.0ms | 0.0% | 865us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12594` |
| 0.1% | 80.2ms | 0.1% | 80.2ms | `ArrayBuffer` | `[native code]` |
| 0.1% | 77.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:50` |
| 0.1% | 62.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:42` |
| 0.1% | 62.6ms | 0.1% | 62.6ms | `get` | `[native code]` |
| 0.1% | 61.4ms | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12262` |
| 0.1% | 61.0ms | 0.0% | 0us | `performWorkOnRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14384` |
| 0.1% | 61.0ms | 0.0% | 0us | `commitRootWhenReady` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14467` |
| 0.1% | 60.8ms | 0.1% | 60.8ms | `.wasm-function[59]` | `[native code]` |
| 0.1% | 53.8ms | 0.0% | 0us | `performUnitOfWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15273` |
| 0.0% | 51.6ms | 0.0% | 0us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15585` |
| 0.0% | 49.4ms | 0.0% | 1.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2200` |
| 0.0% | 48.9ms | 0.0% | 0us | `handleContentChange` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:35` |
| 0.0% | 48.4ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:184` |
| 0.0% | 48.4ms | 0.0% | 48.4ms | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1421` |
| 0.0% | 48.1ms | 0.0% | 48.1ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\app.tsx:116` |
| 0.0% | 48.0ms | 0.0% | 48.0ms | `emitWithPriority` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:148` |
| 0.0% | 47.9ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2196` |
| 0.0% | 47.8ms | 0.0% | 47.8ms | `Ea` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` |
| 0.0% | 47.8ms | 0.0% | 0us | `onUpdate` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:428` |
| 0.0% | 47.8ms | 0.0% | 47.8ms | `handleAutoScroll` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-sq86yyfz.js` |
| 0.0% | 47.6ms | 0.0% | 47.6ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:182` |
| 0.0% | 47.6ms | 0.0% | 47.6ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 47.5ms | 0.0% | 46.5ms | `gotoLineHome` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:764` |
| 0.0% | 47.5ms | 0.0% | 47.5ms | `scanPending` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:851` |
| 0.0% | 47.4ms | 0.0% | 47.4ms | `hitGridPopScissorRect` | `[native code]` |
| 0.0% | 47.4ms | 0.0% | 47.4ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:327` |
| 0.0% | 47.0ms | 0.0% | 47.0ms | `BigInt` | `[native code]` |
| 0.0% | 46.9ms | 0.0% | 46.9ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:609` |
| 0.0% | 46.9ms | 0.0% | 46.9ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.8ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4297` |
| 0.0% | 46.8ms | 0.0% | 0us | `update` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\animation\Timeline.ts:579` |
| 0.0% | 46.8ms | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\animation\Timeline.ts:516` |
| 0.0% | 46.7ms | 0.0% | 46.7ms | `wrap` | `bun:ffi:320` |
| 0.0% | 46.7ms | 0.0% | 0us | `bufferGetRealCharSize` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2449` |
| 0.0% | 46.7ms | 0.0% | 46.7ms | `bufferGetRealCharSize` | `[native code]` |
| 0.0% | 46.7ms | 0.0% | 0us | `getRealCharBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:158` |
| 0.0% | 46.7ms | 0.0% | 0us | `wrap` | `bun:ffi:293` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:273` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `pack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:616` |
| 0.0% | 46.6ms | 0.0% | 46.6ms | `editorViewGetCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3919` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `.wasm-function[105]` | `[native code]` |
| 0.0% | 46.5ms | 0.0% | 0us | `read` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:47` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3162` |
| 0.0% | 46.5ms | 0.0% | 0us | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:324` |
| 0.0% | 46.5ms | 0.0% | 46.5ms | `isCapabilityResponse` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:58` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `getKeyBindingKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `KeyEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `.wasm-function[152]` | `[native code]` |
| 0.0% | 46.4ms | 0.0% | 46.4ms | `eb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:32` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `renderNative` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 46.3ms | 0.0% | 46.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:22` |
| 0.0% | 46.2ms | 0.0% | 46.2ms | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:715` |
| 0.0% | 46.2ms | 0.0% | 46.2ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4287` |
| 0.0% | 46.1ms | 0.0% | 46.1ms | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6736` |
| 0.0% | 46.0ms | 0.0% | 46.0ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4255` |
| 0.0% | 45.9ms | 0.0% | 45.9ms | `pressKey` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:328` |
| 0.0% | 45.9ms | 0.0% | 45.9ms | `setCursorPosition` | `[native code]` |
| 0.0% | 45.9ms | 0.0% | 0us | `wrap` | `bun:ffi:302` |
| 0.0% | 45.9ms | 0.0% | 0us | `setCursorPosition` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2724` |
| 0.0% | 45.9ms | 0.0% | 0us | `renderCursor` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1011` |
| 0.0% | 45.9ms | 0.0% | 0us | `setCursorPosition` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3782` |
| 0.0% | 45.8ms | 0.0% | 45.8ms | `updateFromLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1095` |
| 0.0% | 45.7ms | 0.0% | 45.7ms | `DataView` | `[native code]` |
| 0.0% | 45.7ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:991` |
| 0.0% | 45.7ms | 0.0% | 45.7ms | `listenerCount` | `node:events:288` |
| 0.0% | 45.6ms | 0.0% | 45.6ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1297` |
| 0.0% | 45.5ms | 0.0% | 45.5ms | `measureFunc` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 45.2ms | 0.0% | 45.2ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4348` |
| 0.0% | 44.9ms | 0.0% | 44.9ms | `editorViewGetVisualCursor` | `[native code]` |
| 0.0% | 44.9ms | 0.0% | 0us | `editorViewGetVisualCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 44.8ms | 0.0% | 44.8ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 44.8ms | 0.0% | 44.8ms | `normalizeClockTime` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1296` |
| 0.0% | 44.7ms | 0.0% | 44.7ms | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4294` |
| 0.0% | 44.6ms | 0.0% | 0us | `getKeyBindingKeys` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:105` |
| 0.0% | 43.3ms | 0.0% | 0us | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:138` |
| 0.0% | 43.3ms | 0.0% | 43.3ms | `get screenX` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:540` |
| 0.0% | 42.9ms | 0.0% | 42.9ms | `bufferPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 42.9ms | 0.0% | 0us | `pushScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:482` |
| 0.0% | 42.9ms | 0.0% | 0us | `bufferPushScissorRect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3986` |
| 0.0% | 42.9ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1772` |
| 0.0% | 42.5ms | 0.0% | 42.5ms | `addListener` | `node:events:153` |
| 0.0% | 41.2ms | 0.0% | 0us | `textBufferViewMeasureForDimensions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 41.2ms | 0.0% | 41.2ms | `textBufferViewMeasureForDimensions` | `[native code]` |
| 0.0% | 41.2ms | 0.0% | 0us | `textBufferViewMeasureForDimensions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3389` |
| 0.0% | 35.5ms | 0.0% | 0us | `init` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:21` |
| 0.0% | 35.4ms | 0.0% | 2.0ms | `async loadAndEvaluateModule` | `[native code]` |
| 0.0% | 34.5ms | 0.0% | 0us | `performUnitOfWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15290` |
| 0.0% | 34.5ms | 0.0% | 0us | `completeUnitOfWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15409` |
| 0.0% | 32.7ms | 0.0% | 0us | `completeWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10255` |
| 0.0% | 32.7ms | 0.0% | 0us | `createInstance` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:394` |
| 0.0% | 31.6ms | 0.0% | 0us | `recursivelyTraverseLayoutEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12653` |
| 0.0% | 31.3ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.0% | 31.3ms | 0.0% | 31.3ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.0% | 30.6ms | 0.0% | 0us | `nextTick` | `[native code]` |
| 0.0% | 30.6ms | 0.0% | 0us | `flushMutationEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15613` |
| 0.0% | 30.6ms | 0.0% | 0us | `resetAfterCommit` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:418` |
| 0.0% | 30.6ms | 0.0% | 0us | `requestRender` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1448` |
| 0.0% | 30.6ms | 0.0% | 30.6ms | `isFull` | `internal:fixed_queue` |
| 0.0% | 30.6ms | 0.0% | 0us | `push` | `internal:fixed_queue:39` |
| 0.0% | 30.6ms | 0.0% | 0us | `requestRender` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:505` |
| 0.0% | 30.3ms | 0.0% | 30.3ms | `driveAsyncFunction` | `[native code]` |
| 0.0% | 29.0ms | 0.0% | 29.0ms | `getHitGridDirty (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 29.0ms | 0.0% | 0us | `async loop` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4319` |
| 0.0% | 23.7ms | 0.0% | 0us | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7720` |
| 0.0% | 22.9ms | 0.0% | 0us | `renderWithHooks` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5335` |
| 0.0% | 22.9ms | 0.0% | 0us | `react_stack_bottom_frame` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:17596` |
| 0.0% | 21.0ms | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12332` |
| 0.0% | 21.0ms | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12172` |
| 0.0% | 21.0ms | 0.0% | 0us | `flushMutationEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15611` |
| 0.0% | 18.1ms | 0.0% | 18.1ms | `getOpenTUILib` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 17.2ms | 0.0% | 0us | `commitHostUpdate` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11213` |
| 0.0% | 17.2ms | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12284` |
| 0.0% | 17.0ms | 0.0% | 17.0ms | `resolve` | `[native code]` |
| 0.0% | 16.8ms | 0.0% | 0us | `TextRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:27` |
| 0.0% | 16.6ms | 0.0% | 16.6ms | `instantiate` | `[native code]` |
| 0.0% | 16.2ms | 0.0% | 0us | `commitUpdate` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:448` |
| 0.0% | 16.1ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.0% | 16.0ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.0% | 15.9ms | 0.0% | 0us | `textBufferSetSyntaxStyle (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 0us | `textBufferSetSyntaxStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3420` |
| 0.0% | 15.9ms | 0.0% | 0us | `TextBufferRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:80` |
| 0.0% | 15.9ms | 0.0% | 15.9ms | `textBufferSetSyntaxStyle` | `[native code]` |
| 0.0% | 15.9ms | 0.0% | 0us | `setSyntaxStyle` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:205` |
| 0.0% | 15.3ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\team.ts:51` |
| 0.0% | 15.3ms | 0.0% | 0us | `ZodArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` |
| 0.0% | 15.3ms | 0.0% | 15.3ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:33` |
| 0.0% | 15.3ms | 0.0% | 0us | `_array` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\api.js:707` |
| 0.0% | 15.3ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:533` |
| 0.0% | 14.9ms | 0.0% | 0us | `pushHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:1970` |
| 0.0% | 14.9ms | 0.0% | 0us | `b` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:63` |
| 0.0% | 14.9ms | 0.0% | 0us | `a` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:67` |
| 0.0% | 14.9ms | 0.0% | 0us | `Lb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:66` |
| 0.0% | 14.9ms | 0.0% | 0us | `.wasm-function[109]` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 0us | `za` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:15` |
| 0.0% | 14.9ms | 0.0% | 0us | `.wasm-function[143]` | `[native code]` |
| 0.0% | 14.9ms | 0.0% | 0us | `a` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:63` |
| 0.0% | 14.9ms | 0.0% | 14.9ms | `o` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 14.9ms | 0.0% | 0us | `Mb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:67` |
| 0.0% | 14.8ms | 0.0% | 0us | `attemptEarlyBailoutIfNoScheduledUpdate` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9021` |
| 0.0% | 14.4ms | 0.0% | 14.4ms | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:14` |
| 0.0% | 14.1ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\jsx-dev-runtime.js:6` |
| 0.0% | 14.1ms | 0.0% | 0us | `bound require` | `[native code]` |
| 0.0% | 14.1ms | 0.0% | 0us | `require` | `[native code]` |
| 0.0% | 13.6ms | 0.0% | 1.8ms | `bound react_stack_bottom_frame` | `[native code]` |
| 0.0% | 13.2ms | 0.0% | 0us | `ScrollBoxRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:339` |
| 0.0% | 13.2ms | 0.0% | 0us | `BoxRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:72` |
| 0.0% | 13.2ms | 0.0% | 0us | `Renderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:297` |
| 0.0% | 13.2ms | 0.0% | 13.2ms | `setupMarginAndPadding` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:803` |
| 0.0% | 13.2ms | 0.0% | 0us | `setupYogaProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:778` |
| 0.0% | 12.9ms | 0.0% | 0us | `getChildHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:425` |
| 0.0% | 12.5ms | 0.0% | 0us | `renderRootSync` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15039` |
| 0.0% | 11.6ms | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:18` |
| 0.0% | 11.6ms | 0.0% | 0us | `render` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:581` |
| 0.0% | 11.6ms | 0.0% | 11.6ms | `isValidElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` |
| 0.0% | 11.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js:1006` |
| 0.0% | 11.6ms | 0.0% | 0us | `validateChildKeys` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js:257` |
| 0.0% | 11.4ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11705` |
| 0.0% | 11.4ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11488` |
| 0.0% | 11.4ms | 0.0% | 11.4ms | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 11.3ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.0% | 11.3ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 0.0% | 11.3ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.0% | 11.3ms | 0.0% | 11.3ms | `fetch` | `[native code]` |
| 0.0% | 6.8ms | 0.0% | 0us | `editBufferGetText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3618` |
| 0.0% | 6.8ms | 0.0% | 953us | `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 6.7ms | 0.0% | 6.7ms | `measure` | `[native code]` |
| 0.0% | 6.7ms | 0.0% | 0us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14755` |
| 0.0% | 6.7ms | 0.0% | 6.7ms | `updateProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:362` |
| 0.0% | 6.7ms | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:166` |
| 0.0% | 6.6ms | 0.0% | 6.6ms | `Error` | `[native code]` |
| 0.0% | 6.6ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:333` |
| 0.0% | 5.8ms | 0.0% | 5.8ms | `freeze` | `[native code]` |
| 0.0% | 5.5ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4673` |
| 0.0% | 5.5ms | 0.0% | 0us | `reconcileChildren` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7256` |
| 0.0% | 5.5ms | 0.0% | 955us | `setProperty` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:346` |
| 0.0% | 5.5ms | 0.0% | 0us | `updateProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:372` |
| 0.0% | 4.8ms | 0.0% | 0us | `ReactElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:193` |
| 0.0% | 4.6ms | 0.0% | 949us | `reconcileChildFibersImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4568` |
| 0.0% | 4.6ms | 0.0% | 0us | `beginWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9542` |
| 0.0% | 4.0ms | 0.0% | 4.0ms | `updateProperties` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:368` |
| 0.0% | 3.9ms | 0.0% | 3.9ms | `editBufferGetText` | `[native code]` |
| 0.0% | 3.8ms | 0.0% | 904us | `bailoutOnAlreadyFinishedWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:8985` |
| 0.0% | 3.0ms | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:129` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `createWorkInProgress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:16508` |
| 0.0% | 2.9ms | 0.0% | 2.9ms | `ReactElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:187` |
| 0.0% | 2.8ms | 0.0% | 946us | `beginWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9519` |
| 0.0% | 2.8ms | 0.0% | 0us | `bound dispatchSetState` | `[native code]` |
| 0.0% | 2.8ms | 0.0% | 0us | `flushLayoutEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15671` |
| 0.0% | 2.8ms | 0.0% | 0us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15586` |
| 0.0% | 2.8ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11605` |
| 0.0% | 2.8ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11493` |
| 0.0% | 2.8ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11570` |
| 0.0% | 2.8ms | 0.0% | 0us | `commitLayoutEffectOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11490` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `getChildHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:424` |
| 0.0% | 2.0ms | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:139` |
| 0.0% | 2.0ms | 0.0% | 2.0ms | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js:189` |
| 0.0% | 1.9ms | 0.0% | 0us | `attemptEarlyBailoutIfNoScheduledUpdate` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9126` |
| 0.0% | 1.9ms | 0.0% | 1.0ms | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6742` |
| 0.0% | 1.9ms | 0.0% | 0us | `scheduleUpdateOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14070` |
| 0.0% | 1.9ms | 0.0% | 0us | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6741` |
| 0.0% | 1.9ms | 0.0% | 0us | `dispatchSetStateInternal` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6784` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `timeStamp` | `[native code]` |
| 0.0% | 1.9ms | 0.0% | 0us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14570` |
| 0.0% | 1.9ms | 0.0% | 1.9ms | `editorViewGetSelection` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 0us | `set border` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:149` |
| 0.0% | 1.8ms | 0.0% | 0us | `commitHookEffectListMount` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10861` |
| 0.0% | 1.8ms | 0.0% | 0us | `commitHookLayoutEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10825` |
| 0.0% | 1.8ms | 0.0% | 0us | `set customBorderChars` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:125` |
| 0.0% | 1.8ms | 0.0% | 0us | `reconcileChildrenArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4299` |
| 0.0% | 1.8ms | 0.0% | 904us | `forEach` | `[native code]` |
| 0.0% | 1.8ms | 0.0% | 1.8ms | `performWorkOnRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14084` |
| 0.0% | 1.8ms | 0.0% | 0us | `TextRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:45` |
| 0.0% | 1.8ms | 0.0% | 0us | `updateTextBuffer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:49` |
| 0.0% | 1.8ms | 0.0% | 0us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15587` |
| 0.0% | 1.7ms | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:173` |
| 0.0% | 1.7ms | 0.0% | 1.7ms | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15487` |
| 0.0% | 1.7ms | 0.0% | 0us | `handleContentChange` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:52` |
| 0.0% | 1.7ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3370` |
| 0.0% | 1.7ms | 0.0% | 0us | `processRootScheduleInMicrotask` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3218` |
| 0.0% | 1.6ms | 0.0% | 0us | `useTheme` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\providers\theme\index.tsx:25` |
| 0.0% | 1.6ms | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:28` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12263` |
| 0.0% | 1.0ms | 0.0% | 0us | `parseKeypress` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:217` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `listeners` | `node:events:266` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `getTaskName` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:108` |
| 0.0% | 1.0ms | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:335` |
| 0.0% | 1.0ms | 0.0% | 0us | `stopProfilerTimerIfRunningAndRecordDuration` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3103` |
| 0.0% | 1.0ms | 0.0% | 0us | `performUnitOfWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15280` |
| 0.0% | 1.0ms | 0.0% | 0us | `handleContentChange` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:36` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `commitHookLayoutEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10826` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `flushMutationEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 1.0ms | 0.0% | 0us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15481` |
| 0.0% | 1.0ms | 0.0% | 0us | `flushPendingEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15889` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7728` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `handleStdinEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3195` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `beginWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9191` |
| 0.0% | 1.0ms | 0.0% | 0us | `warnIfUpdatesNotWrappedWithActDEV` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:16304` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `ReactElement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:169` |
| 0.0% | 1.0ms | 0.0% | 0us | `StatusBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\status-bar.tsx:10` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `isConcurrentActEnvironment` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:13985` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14729` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `editorViewGetCursor` | `[native code]` |
| 0.0% | 1.0ms | 0.0% | 1.0ms | `borderCharsToArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:151` |
| 0.0% | 1.0ms | 0.0% | 0us | `jsxDEVImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:214` |
| 0.0% | 998us | 0.0% | 998us | `reconcileChildrenArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4210` |
| 0.0% | 995us | 0.0% | 995us | `mapValue` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 995us | 0.0% | 0us | `packList` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:684` |
| 0.0% | 995us | 0.0% | 0us | `setStyledText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:89` |
| 0.0% | 995us | 0.0% | 0us | `textBufferSetStyledText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3103` |
| 0.0% | 992us | 0.0% | 0us | `performUnitOfWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15272` |
| 0.0% | 992us | 0.0% | 0us | `startProfilerTimer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3098` |
| 0.0% | 990us | 0.0% | 0us | `applyYogaBorders` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:296` |
| 0.0% | 990us | 0.0% | 990us | `189` | `[native code]` |
| 0.0% | 986us | 0.0% | 0us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15484` |
| 0.0% | 986us | 0.0% | 986us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:17438` |
| 0.0% | 983us | 0.0% | 0us | `useEffect` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18158` |
| 0.0% | 983us | 0.0% | 983us | `areHookInputsEqual` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5275` |
| 0.0% | 983us | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:106` |
| 0.0% | 983us | 0.0% | 0us | `updateEffectImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6297` |
| 0.0% | 982us | 0.0% | 0us | `pushPasteBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1929` |
| 0.0% | 982us | 0.0% | 0us | `push` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:717` |
| 0.0% | 982us | 0.0% | 0us | `consumePasteBytes` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1914` |
| 0.0% | 982us | 0.0% | 982us | `arrayIteratorNextHelper` | `[native code]` |
| 0.0% | 981us | 0.0% | 981us | `hb` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:28` |
| 0.0% | 974us | 0.0% | 974us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14743` |
| 0.0% | 970us | 0.0% | 970us | `emit` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 969us | 0.0% | 969us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3250` |
| 0.0% | 966us | 0.0% | 966us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:767` |
| 0.0% | 966us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:551` |
| 0.0% | 966us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:828` |
| 0.0% | 966us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:79` |
| 0.0% | 966us | 0.0% | 0us | `ZodObject` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` |
| 0.0% | 966us | 0.0% | 0us | `object` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:581` |
| 0.0% | 963us | 0.0% | 0us | `ZodLiteral` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` |
| 0.0% | 963us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:810` |
| 0.0% | 963us | 0.0% | 0us | `literal` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:824` |
| 0.0% | 963us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:20` |
| 0.0% | 963us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:1550` |
| 0.0% | 962us | 0.0% | 0us | `.wasm-function[40]` | `[native code]` |
| 0.0% | 962us | 0.0% | 0us | `commitHookLayoutUnmountEffects` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10835` |
| 0.0% | 962us | 0.0% | 962us | `startEffectTimer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 962us | 0.0% | 0us | `.wasm-function[66]` | `[native code]` |
| 0.0% | 962us | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12165` |
| 0.0% | 958us | 0.0% | 958us | `clearSelection` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 958us | 0.0% | 0us | `updateSelectionForMovement` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1155` |
| 0.0% | 954us | 0.0% | 954us | `resolveKeyInput` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:150` |
| 0.0% | 954us | 0.0% | 0us | `async (anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:165` |
| 0.0% | 951us | 0.0% | 951us | `flushSpawnedWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15788` |
| 0.0% | 948us | 0.0% | 948us | `write` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:47` |
| 0.0% | 948us | 0.0% | 0us | `toWireType` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:48` |
| 0.0% | 947us | 0.0% | 947us | `updateLayout` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1370` |
| 0.0% | 942us | 0.0% | 0us | `PasteEvent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:71` |
| 0.0% | 939us | 0.0% | 939us | `clearTimeout` | `[native code]` |
| 0.0% | 938us | 0.0% | 938us | `startUpdateTimerByLane` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2987` |
| 0.0% | 938us | 0.0% | 0us | `getObjectsInViewport` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:125` |
| 0.0% | 938us | 0.0% | 938us | `get screenY` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 937us | 0.0% | 937us | `mapIterationNext` | `[native code]` |
| 0.0% | 932us | 0.0% | 932us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14734` |
| 0.0% | 931us | 0.0% | 0us | `close` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:30` |
| 0.0% | 931us | 0.0% | 931us | `warnIfUpdatesNotWrappedWithActDEV` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 928us | 0.0% | 0us | `useCommandMenu` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:19` |
| 0.0% | 928us | 0.0% | 928us | `updateReducerImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 928us | 0.0% | 0us | `useState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18208` |
| 0.0% | 928us | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:43` |
| 0.0% | 927us | 0.0% | 927us | `pushHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 923us | 0.0% | 923us | `pushHostContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:1967` |
| 0.0% | 915us | 0.0% | 915us | `M` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 912us | 0.0% | 912us | `useRenderer` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js` |
| 0.0% | 912us | 0.0% | 0us | `InputBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:32` |
| 0.0% | 906us | 0.0% | 906us | `bind` | `[native code]` |
| 0.0% | 906us | 0.0% | 0us | `scheduleTaskForRootDuringMicrotask` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3298` |
| 0.0% | 906us | 0.0% | 906us | `dispatchSetState` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 903us | 0.0% | 903us | `prepareFreshStack` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14657` |
| 0.0% | 902us | 0.0% | 902us | `reconcileChildFibersImpl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4565` |
| 0.0% | 902us | 0.0% | 0us | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7736` |
| 0.0% | 901us | 0.0% | 0us | `applyYogaBorders` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:294` |
| 0.0% | 896us | 0.0% | 896us | `completeWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10141` |
| 0.0% | 892us | 0.0% | 892us | `reconcileChildrenArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4270` |
| 0.0% | 891us | 0.0% | 891us | `commitRoot` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15546` |
| 0.0% | 890us | 0.0% | 0us | `StatusBar` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\status-bar.tsx:9` |
| 0.0% | 890us | 0.0% | 890us | `sanitize` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\contracts.ts:239` |
| 0.0% | 886us | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.0% | 886us | 0.0% | 0us | `internal:streams/end-of-stream` | `internal:streams/end-of-stream:17` |
| 0.0% | 886us | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.0% | 884us | 0.0% | 0us | `TextBufferRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:84` |
| 0.0% | 884us | 0.0% | 0us | `setupMeasureFunc` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:422` |
| 0.0% | 881us | 0.0% | 0us | `flushSpawnedWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15868` |
| 0.0% | 881us | 0.0% | 881us | `flushSyncWorkAcrossRoots_impl` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3180` |
| 0.0% | 878us | 0.0% | 0us | `commitMutationEffectsOnFiber` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12159` |
| 0.0% | 878us | 0.0% | 878us | `commitHookEffectListUnmount` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10914` |
| 0.0% | 867us | 0.0% | 867us | `getBorderSides` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 0.0% | 867us | 0.0% | 0us | `set border` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:148` |
| 0.0% | 866us | 0.0% | 0us | `Renderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:299` |
| 0.0% | 866us | 0.0% | 0us | `ScrollBoxRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:366` |
| 0.0% | 866us | 0.0% | 866us | `applyEventOptions` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1662` |
| 0.0% | 866us | 0.0% | 0us | `ScrollBarRenderable` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBar.ts:107` |
| 0.0% | 861us | 0.0% | 861us | `cwd` | `[native code]` |
| 0.0% | 859us | 0.0% | 859us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` |
| 0.0% | 859us | 0.0% | 859us | `updateFunctionComponent` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7692` |
| 0.0% | 856us | 0.0% | 0us | `_int` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\api.js:319` |
| 0.0% | 856us | 0.0% | 0us | `(module)` | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:56` |
| 0.0% | 856us | 0.0% | 856us | `ZodNumberFormat` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:42` |
| 0.0% | 856us | 0.0% | 0us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:373` |
| 0.0% | 855us | 0.0% | 855us | `.wasm-function[119]` | `[native code]` |
| 0.0% | 852us | 0.0% | 0us | `scheduleTaskForRootDuringMicrotask` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3302` |
| 0.0% | 852us | 0.0% | 852us | `(anonymous)` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js` |
| 0.0% | 851us | 0.0% | 851us | `popProvider` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2761` |
| 0.0% | 851us | 0.0% | 0us | `completeWork` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10531` |
| 0.0% | 847us | 0.0% | 847us | `borderCharsToArray` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:150` |
| 0.0% | 843us | 0.0% | 0us | `setStyledText` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:91` |
| 0.0% | 843us | 0.0% | 0us | `textBufferGetLength (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` | `[native code]` |
| 0.0% | 834us | 0.0% | 834us | `useContext` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18151` |
| 0.0% | 834us | 0.0% | 834us | `renderWithHooks` | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5308` |
| 0.0% | 831us | 0.0% | 831us | `close` | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts` |

## Function Details

### `editBufferSetCursor`
`[native code]` | Self: 6.3% (3.31s) | Total: 6.4% (3.36s) | Samples: 53

**Called by:**
- `editBufferSetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (33)
- `anonymous` (22)

**Calls:**
- `(anonymous)` (2)

### `textBufferViewMeasureForDimensions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3387` | Self: 5.7% (2.99s) | Total: 5.7% (2.99s) | Samples: 54

**Called by:**
- `measureFunc` (54)

### `from`
`[native code]` | Self: 4.8% (2.52s) | Total: 5.7% (2.99s) | Samples: 23

**Called by:**
- `async loop` (29)
- `pushPasteBytes` (1)

**Calls:**
- `next` (4)
- `arrayFromFastWithoutMapFn` (2)
- `arrayIteratorNextHelper` (1)

### `bufferDrawTextBufferView`
`[native code]` | Self: 4.3% (2.28s) | Total: 4.3% (2.28s) | Samples: 25

**Called by:**
- `bufferDrawTextBufferView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (24)
- `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `(anonymous)`
`[native code]` | Self: 4.2% (2.21s) | Total: 92.2% (48.32s) | Samples: 26

**Called by:**
- `processTicksAndRejections` (750)
- `pressKey` (8)
- `async (anonymous)` (4)
- `setCursorStyleOptions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)
- `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)
- `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)
- `bufferDrawTextBufferView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)
- `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `editBufferInsertText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `parseKeypress` (1)
- `editBufferSetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `editorViewGetSelection (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `(anonymous)` (1)
- `frame` (1)
- `hitGridPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `bufferWriteResolvedChars (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `editorViewGetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)
- `textBufferGetLength (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

**Calls:**
- `async asyncModuleEvaluation` (254)
- `async loop` (248)
- `(anonymous)` (118)
- `async loop` (68)
- `async loop` (37)
- `Buffer` (11)
- `async loop` (6)
- `(anonymous)` (4)
- `async loop` (3)
- `async loop` (2)
- `async loop` (2)
- `(anonymous)` (2)
- `requestSatisfyUtil` (1)
- `async loop` (1)
- `async loop` (1)
- `async loop` (1)

### `render`
`[native code]` | Self: 3.9% (2.05s) | Total: 3.9% (2.05s) | Samples: 33

**Called by:**
- `render (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (28)
- `anonymous` (5)

### `getRealCharBytes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:159` | Self: 3.5% (1.87s) | Total: 3.8% (2.01s) | Samples: 16

**Called by:**
- `captureCharFrame` (17)

**Calls:**
- `Uint8Array` (1)

### `bufferWriteResolvedChars`
`[native code]` | Self: 3.4% (1.80s) | Total: 3.4% (1.80s) | Samples: 21

**Called by:**
- `bufferWriteResolvedChars (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (21)

### `editBufferDeleteRange`
`[native code]` | Self: 3.2% (1.72s) | Total: 3.3% (1.76s) | Samples: 26

**Called by:**
- `editBufferDeleteRange (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (27)

**Calls:**
- `(anonymous)` (1)

### `editBufferInsertText`
`[native code]` | Self: 2.5% (1.35s) | Total: 2.6% (1.39s) | Samples: 14

**Called by:**
- `editBufferInsertText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (16)

**Calls:**
- `(anonymous)` (2)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4254` | Self: 1.9% (1.02s) | Total: 11.0% (5.78s) | Samples: 12

**Called by:**
- `(anonymous)` (66)

**Calls:**
- `async loop` (31)
- `async loop` (10)
- `async loop` (4)
- `async loop` (3)
- `async loop` (2)
- `async loop` (1)
- `driveAsyncFunction` (1)
- `async loop` (1)
- `async loop` (1)

### `bufferDrawBox`
`[native code]` | Self: 1.5% (791.4ms) | Total: 1.5% (791.4ms) | Samples: 6

**Called by:**
- `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (6)

### `next`
`[native code]` | Self: 1.4% (736.9ms) | Total: 1.8% (972.0ms) | Samples: 16

**Called by:**
- `render` (11)
- `from` (4)
- `update` (2)

**Calls:**
- `mapIteratorNext` (1)

### `.wasm-function[61]`
`[native code]` | Self: 1.2% (639.4ms) | Total: 49.3% (25.86s) | Samples: 4

**Called by:**
- `.wasm-function[61]` (392)
- `.wasm-function[220]` (80)

**Calls:**
- `.wasm-function[61]` (392)
- `.wasm-function[229]` (69)
- `.wasm-function[127]` (1)
- `.wasm-function[33]` (1)
- `.wasm-function[123]` (1)
- `.wasm-function[93]` (1)
- `.wasm-function[119]` (1)
- `.wasm-function[40]` (1)
- `.wasm-function[59]` (1)

### `setTimeout`
`[native code]` | Self: 1.2% (629.4ms) | Total: 1.2% (629.4ms) | Samples: 9

**Called by:**
- `async loop` (6)
- `(anonymous)` (3)

### `decode`
`[native code]` | Self: 1.1% (606.4ms) | Total: 1.1% (606.4ms) | Samples: 13

**Called by:**
- `frame` (12)
- `(anonymous)` (1)

### `Buffer`
`[native code]` | Self: 1.0% (560.6ms) | Total: 1.0% (560.6ms) | Samples: 11

**Called by:**
- `(anonymous)` (11)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:32` | Self: 0.9% (522.2ms) | Total: 1.3% (708.3ms) | Samples: 9

**Called by:**
- `updateFromLayout` (6)
- `calculateLayout` (3)
- `setupMeasureFunc` (1)
- `(anonymous)` (1)
- `applyYogaBorders` (1)

**Calls:**
- `eb` (1)
- `eb` (1)
- `hb` (1)

### `cloneObject`
`[native code]` | Self: 0.8% (471.5ms) | Total: 0.8% (471.5ms) | Samples: 22

**Called by:**
- `getChildHostContext` (12)
- `(anonymous)` (8)
- `renderCursor` (2)

### `slice`
`[native code]` | Self: 0.8% (459.2ms) | Total: 0.8% (459.2ms) | Samples: 7

**Called by:**
- `captureCharFrame` (5)
- `getText` (1)
- `(anonymous)` (1)

### `anonymous`
`[native code]` | Self: 0.8% (446.5ms) | Total: 4.1% (2.16s) | Samples: 10

**Called by:**
- `wrap` (22)
- `wrap` (7)
- `wrap` (5)
- `node:util` (2)
- `node:stream` (2)
- `require` (1)
- `wrap` (1)
- `wrap` (1)
- `internal:streams/operators` (1)
- `internal:streams/end-of-stream` (1)
- `internal:stream` (1)

**Calls:**
- `editBufferSetCursor` (22)
- `render` (5)
- `addToHitGrid` (2)
- `bufferGetRealCharSize` (1)
- `setCursorPosition` (1)
- `internal:streams/operators` (1)
- `internal:streams/end-of-stream` (1)
- `internal:stream` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4274` | Self: 0.8% (435.1ms) | Total: 0.8% (435.1ms) | Samples: 3

**Called by:**
- `async loop` (3)

### `now`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\clock.ts:17` | Self: 0.8% (429.6ms) | Total: 0.8% (429.6ms) | Samples: 4

**Called by:**
- `async loop` (4)

### `scanPending`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:888` | Self: 0.8% (422.0ms) | Total: 3.4% (1.81s) | Samples: 2

**Called by:**
- `push` (19)

**Calls:**
- `emitKeyOrResponse` (17)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:153` | Self: 0.7% (376.5ms) | Total: 2.7% (1.44s) | Samples: 4

**Called by:**
- `processParsedKey` (19)

**Calls:**
- `(anonymous)` (12)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `String`
`[native code]` | Self: 0.7% (375.5ms) | Total: 0.7% (375.5ms) | Samples: 3

**Called by:**
- `(module)` (3)

### `editBufferGetText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3617` | Self: 0.7% (374.7ms) | Total: 0.7% (378.6ms) | Samples: 90

**Called by:**
- `getText` (94)

**Calls:**
- `Uint8Array` (4)

### `bufferDrawBox`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2687` | Self: 0.6% (366.2ms) | Total: 0.6% (366.2ms) | Samples: 1

**Called by:**
- `drawBox` (1)

### `startsWith`
`[native code]` | Self: 0.6% (358.1ms) | Total: 0.6% (358.1ms) | Samples: 2

**Called by:**
- `parseKeypress` (2)

### `subarray`
`[native code]` | Self: 0.6% (330.0ms) | Total: 0.6% (330.0ms) | Samples: 4

**Called by:**
- `push` (4)

### `addToHitGrid`
`[native code]` | Self: 0.6% (324.1ms) | Total: 0.6% (324.1ms) | Samples: 6

**Called by:**
- `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (4)
- `anonymous` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:33` | Self: 0.5% (298.1ms) | Total: 10.2% (5.38s) | Samples: 2

**Called by:**
- `calculateLayout` (81)
- `updateFromLayout` (6)
- `render` (2)
- `applyYogaBorders` (1)
- `(anonymous)` (1)

**Calls:**
- `(unknown)` (56)
- `wasm-stub` (28)
- `fromWireType` (4)
- `189` (1)

### `editorViewGetVisualCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3935` | Self: 0.5% (281.7ms) | Total: 0.6% (326.6ms) | Samples: 1

**Called by:**
- `renderCursor` (2)

**Calls:**
- `editorViewGetVisualCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `renderSelf`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.5% (281.0ms) | Total: 0.5% (281.0ms) | Samples: 2

**Called by:**
- `render` (1)
- `render` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.5% (280.7ms) | Total: 0.5% (280.7ms) | Samples: 5

**Called by:**
- `bound ` (1)
- `(anonymous)` (1)
- `emitWithPriority` (1)
- `dispatchSequenceHandlers` (1)
- `PasteEvent` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4307` | Self: 0.5% (280.1ms) | Total: 0.5% (280.1ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `renderNative`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4398` | Self: 0.5% (279.9ms) | Total: 0.7% (368.8ms) | Samples: 2

**Called by:**
- `async loop` (3)

**Calls:**
- `isSplitCursorSeedFrameBlocked` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1365` | Self: 0.5% (279.0ms) | Total: 0.5% (279.0ms) | Samples: 3

**Called by:**
- `updateLayout` (2)
- `render` (1)

### `now`
`[native code]` | Self: 0.5% (277.5ms) | Total: 0.5% (277.5ms) | Samples: 2

**Called by:**
- `async loop` (1)
- `async loop` (1)

### `getKeyBindingAction`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:120` | Self: 0.5% (276.9ms) | Total: 0.5% (276.9ms) | Samples: 4

**Called by:**
- `handleKeyPress` (4)

### `emit`
`node:events:84` | Self: 0.4% (235.8ms) | Total: 0.4% (235.8ms) | Samples: 5

**Called by:**
- `(anonymous)` (3)
- `pressKey` (2)

### `resolveKeyInput`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\testing.js` | Self: 0.4% (235.6ms) | Total: 0.4% (235.6ms) | Samples: 1

**Called by:**
- `pressKey` (1)

### `getKeyBindingKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:74` | Self: 0.4% (235.1ms) | Total: 0.4% (235.1ms) | Samples: 3

**Called by:**
- `map` (2)
- `matchesKeyBinding` (1)

### `mapIteratorNext`
`[native code]` | Self: 0.4% (235.1ms) | Total: 0.4% (235.1ms) | Samples: 1

**Called by:**
- `next` (1)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:193` | Self: 0.4% (233.7ms) | Total: 0.4% (233.7ms) | Samples: 4

**Called by:**
- `processParsedKey` (4)

### `test`
`[native code]` | Self: 0.4% (233.6ms) | Total: 0.4% (233.6ms) | Samples: 3

**Called by:**
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)

### `resolveKeyInput`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:135` | Self: 0.4% (233.4ms) | Total: 0.4% (233.4ms) | Samples: 2

**Called by:**
- `pressKey` (2)

### `dispatchSequenceHandlers`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.4% (233.3ms) | Total: 0.4% (233.3ms) | Samples: 2

**Called by:**
- `handleStdinEvent` (2)

### `Set`
`[native code]` | Self: 0.4% (233.1ms) | Total: 0.4% (233.1ms) | Samples: 4

**Called by:**
- `updateLayout` (3)
- `getKeyBindingKeys` (1)

### `fromWireType`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:48` | Self: 0.4% (233.1ms) | Total: 0.5% (279.7ms) | Samples: 3

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `read` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1740` | Self: 0.4% (233.0ms) | Total: 1.4% (781.6ms) | Samples: 2

**Called by:**
- `async loop` (13)

**Calls:**
- `next` (11)

### `removeListener`
`node:events:227` | Self: 0.4% (232.2ms) | Total: 0.4% (232.2ms) | Samples: 2

**Called by:**
- `frame` (2)

### `updateFromLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1083` | Self: 0.4% (231.3ms) | Total: 2.3% (1.21s) | Samples: 3

**Called by:**
- `updateLayout` (8)
- `updateLayout` (7)

**Calls:**
- `(anonymous)` (6)
- `(anonymous)` (6)

### `shift`
`[native code]` | Self: 0.4% (230.0ms) | Total: 0.4% (230.0ms) | Samples: 2

**Called by:**
- `removeListener` (2)

### `handleSequence`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:118` | Self: 0.4% (229.4ms) | Total: 0.6% (324.4ms) | Samples: 2

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `exec` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:33` | Self: 0.4% (217.0ms) | Total: 1.4% (777.5ms) | Samples: 2

**Called by:**
- `evaluate` (9)

**Calls:**
- `padStart` (4)
- `String` (3)

### `isCapabilityResponse`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:31` | Self: 0.4% (216.8ms) | Total: 0.4% (216.8ms) | Samples: 1

**Called by:**
- `processCapabilitySequence` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:610` | Self: 0.3% (189.9ms) | Total: 0.3% (189.9ms) | Samples: 1

**Called by:**
- `setCursorStyleOptions` (1)

### `addListener`
`node:events:151` | Self: 0.3% (189.0ms) | Total: 0.3% (189.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:226` | Self: 0.3% (188.5ms) | Total: 0.3% (188.5ms) | Samples: 1

**Called by:**
- `emitKeyOrResponse` (1)

### `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.3% (188.4ms) | Total: 2.1% (1.11s) | Samples: 2

**Called by:**
- `bufferDrawBox` (10)

**Calls:**
- `bufferDrawBox` (6)
- `(anonymous)` (2)

### `isValidBorderStyle`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:23` | Self: 0.3% (187.6ms) | Total: 0.3% (187.6ms) | Samples: 1

**Called by:**
- `parseBorderStyle` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1379` | Self: 0.3% (187.0ms) | Total: 0.9% (517.1ms) | Samples: 3

**Called by:**
- `updateLayout` (9)
- `updateLayout` (1)
- `render` (1)

**Calls:**
- `updateFromLayout` (7)
- `updateFromLayout` (1)

### `isIdleNow`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.3% (186.1ms) | Total: 0.3% (186.1ms) | Samples: 1

**Called by:**
- `resolveIdleIfNeeded` (1)

### `emit`
`node:events:80` | Self: 0.3% (185.8ms) | Total: 0.3% (185.8ms) | Samples: 4

**Called by:**
- `async loop` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1168` | Self: 0.3% (185.4ms) | Total: 1.5% (830.6ms) | Samples: 2

**Called by:**
- `emitWithPriority` (12)

**Calls:**
- `matchesKeyBinding` (8)
- `matchesKeyBinding` (2)

### `padStart`
`[native code]` | Self: 0.3% (184.8ms) | Total: 0.3% (184.8ms) | Samples: 4

**Called by:**
- `(module)` (4)

### `bufferDrawEditorView`
`[native code]` | Self: 0.3% (184.3ms) | Total: 0.3% (184.3ms) | Samples: 3

**Called by:**
- `bufferDrawEditorView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)

### `addToHitGrid`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2887` | Self: 0.3% (184.3ms) | Total: 1.9% (996.7ms) | Samples: 3

**Called by:**
- `addToHitGrid` (17)

**Calls:**
- `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (7)
- `wrap` (7)

### `Uint8Array`
`[native code]` | Self: 0.2% (143.7ms) | Total: 0.2% (143.7ms) | Samples: 5

**Called by:**
- `editBufferGetText` (4)
- `getRealCharBytes` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:628` | Self: 0.2% (143.3ms) | Total: 0.8% (468.2ms) | Samples: 1

**Called by:**
- `setCursorStyleOptions` (6)

**Calls:**
- `pack` (3)
- `pack` (2)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:147` | Self: 0.2% (142.0ms) | Total: 0.8% (424.2ms) | Samples: 3

**Called by:**
- `processParsedKey` (7)

**Calls:**
- `listeners` (2)
- `listeners` (1)
- `map` (1)

### `editorViewGetVisualCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3934` | Self: 0.2% (141.9ms) | Total: 0.4% (222.1ms) | Samples: 2

**Called by:**
- `renderCursor` (4)

**Calls:**
- `ArrayBuffer` (2)

### `hitGridPushScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2895` | Self: 0.2% (141.7ms) | Total: 0.5% (281.8ms) | Samples: 2

**Called by:**
- `pushHitGridScissorRect` (4)

**Calls:**
- `hitGridPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `renderCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1008` | Self: 0.2% (141.7ms) | Total: 0.2% (141.7ms) | Samples: 1

**Called by:**
- `render` (1)

### `exec`
`[native code]` | Self: 0.2% (141.5ms) | Total: 0.2% (141.5ms) | Samples: 2

**Called by:**
- `parseKeypress` (1)
- `handleSequence` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:50` | Self: 0.2% (141.4ms) | Total: 0.2% (141.4ms) | Samples: 4

**Called by:**
- `(anonymous)` (4)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1420` | Self: 0.2% (141.3ms) | Total: 0.2% (141.3ms) | Samples: 2

**Called by:**
- `updateLayout` (1)
- `updateLayout` (1)

### `(anonymous)`
`node:events` | Self: 0.2% (141.1ms) | Total: 0.2% (141.1ms) | Samples: 1

**Called by:**
- `map` (1)

### `.wasm-function[181]`
`[native code]` | Self: 0.2% (140.7ms) | Total: 0.2% (140.7ms) | Samples: 1

**Called by:**
- `(unknown)` (1)

### `listeners`
`node:events:263` | Self: 0.2% (139.9ms) | Total: 0.2% (139.9ms) | Samples: 2

**Called by:**
- `emitWithPriority` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:26` | Self: 0.2% (139.9ms) | Total: 0.2% (139.9ms) | Samples: 1

**Called by:**
- `Promise` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:202` | Self: 0.2% (139.2ms) | Total: 0.5% (277.2ms) | Samples: 1

**Called by:**
- `pack` (3)

**Calls:**
- `setBigUint64` (1)
- `BigInt` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:301` | Self: 0.2% (139.1ms) | Total: 0.2% (139.1ms) | Samples: 2

**Called by:**
- `emitKeyOrResponse` (2)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:11` | Self: 0.2% (138.7ms) | Total: 0.2% (139.6ms) | Samples: 2

**Called by:**
- `evaluate` (3)

**Calls:**
- `cwd` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4282` | Self: 0.2% (138.7ms) | Total: 0.5% (278.4ms) | Samples: 3

**Called by:**
- `async loop` (4)

**Calls:**
- `now` (1)

### `eb`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:25` | Self: 0.2% (138.7ms) | Total: 0.2% (138.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `.wasm-function[127]`
`[native code]` | Self: 0.2% (138.6ms) | Total: 0.2% (138.6ms) | Samples: 1

**Called by:**
- `.wasm-function[61]` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1422` | Self: 0.2% (138.4ms) | Total: 25.3% (13.29s) | Samples: 1

**Called by:**
- `updateLayout` (148)
- `render` (38)

**Calls:**
- `updateLayout` (148)
- `updateLayout` (9)
- `updateLayout` (8)
- `updateLayout` (6)
- `updateLayout` (4)
- `updateLayout` (3)
- `updateLayout` (2)
- `updateLayout` (2)
- `updateLayout` (1)
- `updateLayout` (1)
- `updateLayout` (1)

### `.wasm-function[123]`
`[native code]` | Self: 0.2% (138.0ms) | Total: 0.2% (138.0ms) | Samples: 1

**Called by:**
- `.wasm-function[61]` (1)

### `updateTextFromNodes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:86` | Self: 0.2% (137.8ms) | Total: 0.2% (137.8ms) | Samples: 3

**Called by:**
- `(anonymous)` (3)

### `textBufferViewMeasureForDimensions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3388` | Self: 0.2% (135.8ms) | Total: 0.2% (135.8ms) | Samples: 2

**Called by:**
- `measureFunc` (2)

### `values`
`[native code]` | Self: 0.2% (135.6ms) | Total: 0.2% (135.6ms) | Samples: 2

**Called by:**
- `async loop` (2)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4267` | Self: 0.2% (134.5ms) | Total: 1.3% (701.6ms) | Samples: 3

**Called by:**
- `async loop` (10)

**Calls:**
- `now` (4)
- `normalizeClockTime` (1)
- `normalizeClockTime` (1)
- `normalizeClockTime` (1)

### `isCapabilityResponse`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:22` | Self: 0.2% (125.0ms) | Total: 0.2% (125.0ms) | Samples: 1

**Called by:**
- `processCapabilitySequence` (1)

### `evaluate`
`[native code]` | Self: 0.2% (109.3ms) | Total: 33.2% (17.41s) | Samples: 3

**Called by:**
- `async asyncModuleEvaluation` (272)
- `moduleEvaluation` (5)

**Calls:**
- `(module)` (239)
- `(module)` (15)
- `(module)` (9)
- `(module)` (3)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `.wasm-function[93]`
`[native code]` | Self: 0.2% (107.8ms) | Total: 0.2% (107.8ms) | Samples: 1

**Called by:**
- `.wasm-function[61]` (1)

### `dlopen`
`[native code]` | Self: 0.2% (106.9ms) | Total: 0.2% (106.9ms) | Samples: 11

**Called by:**
- `dlopen` (11)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1401` | Self: 0.1% (96.2ms) | Total: 0.1% (96.2ms) | Samples: 1

**Called by:**
- `updateLayout` (1)

### `screenY`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:544` | Self: 0.1% (95.7ms) | Total: 0.1% (95.7ms) | Samples: 1

**Called by:**
- `getObjectsInViewport` (1)

### `map`
`[native code]` | Self: 0.1% (95.4ms) | Total: 1.4% (745.2ms) | Samples: 2

**Called by:**
- `matchesKeyBinding` (6)
- `getKeyBindingAction` (4)
- `(anonymous)` (1)
- `updateLayout` (1)
- `emitWithPriority` (1)

**Calls:**
- `(anonymous)` (8)
- `getKeyBindingKey` (2)
- `(anonymous)` (1)

### `hitGridPopScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2899` | Self: 0.1% (95.2ms) | Total: 0.6% (316.9ms) | Samples: 1

**Called by:**
- `popHitGridScissorRect` (4)

**Calls:**
- `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)

### `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.1% (95.0ms) | Total: 0.4% (221.6ms) | Samples: 1

**Called by:**
- `hitGridPopScissorRect` (3)

**Calls:**
- `(anonymous)` (1)
- `hitGridPopScissorRect` (1)

### `N`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` | Self: 0.1% (94.5ms) | Total: 0.1% (94.5ms) | Samples: 4

**Called by:**
- `s` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js:28` | Self: 0.1% (94.5ms) | Total: 0.1% (94.5ms) | Samples: 1

**Called by:**
- `emitWithPriority` (1)

### `setCursorStyleOptions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2749` | Self: 0.1% (94.4ms) | Total: 0.1% (94.4ms) | Samples: 1

**Called by:**
- `setCursorStyle` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:113` | Self: 0.1% (94.2ms) | Total: 0.1% (94.2ms) | Samples: 1

**Called by:**
- `calculateLayout` (1)

### `toArrayBuffer`
`[native code]` | Self: 0.1% (94.2ms) | Total: 0.1% (94.2ms) | Samples: 3

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `updateStats`
`[native code]` | Self: 0.1% (94.2ms) | Total: 0.1% (94.2ms) | Samples: 1

**Called by:**
- `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `parseKittySpecialKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:236` | Self: 0.1% (94.0ms) | Total: 0.1% (94.0ms) | Samples: 2

**Called by:**
- `parseKittyKeyboard` (2)

### `reconcileTimeoutState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1958` | Self: 0.1% (93.8ms) | Total: 0.1% (93.8ms) | Samples: 1

**Called by:**
- `push` (1)

### `handleSequence`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts:129` | Self: 0.1% (93.7ms) | Total: 0.1% (93.7ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isCapabilityResponse`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:48` | Self: 0.1% (93.6ms) | Total: 0.1% (93.6ms) | Samples: 2

**Called by:**
- `processCapabilitySequence` (2)

### `.wasm-function[31]`
`[native code]` | Self: 0.1% (93.5ms) | Total: 0.1% (93.5ms) | Samples: 2

**Called by:**
- `.wasm-function[68]` (1)
- `.wasm-function[66]` (1)

### `unpack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:654` | Self: 0.1% (93.3ms) | Total: 0.1% (93.3ms) | Samples: 1

**Called by:**
- `renderCursor` (1)

### `editBufferGetEOL`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3759` | Self: 0.1% (93.3ms) | Total: 0.1% (93.3ms) | Samples: 2

**Called by:**
- `getEOL` (2)

### `parseKittyKeyboard`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts:306` | Self: 0.1% (93.3ms) | Total: 0.3% (187.3ms) | Samples: 1

**Called by:**
- `parseKeypress` (3)

**Calls:**
- `parseKittySpecialKey` (2)

### `getObjectsInViewport`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:149` | Self: 0.1% (93.1ms) | Total: 0.1% (93.1ms) | Samples: 1

**Called by:**
- `_getVisibleChildren` (1)

### `ensureCapacity`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:214` | Self: 0.1% (93.1ms) | Total: 0.1% (93.1ms) | Samples: 1

**Called by:**
- `append` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:36` | Self: 0.1% (92.9ms) | Total: 0.1% (92.9ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:615` | Self: 0.1% (92.8ms) | Total: 0.1% (92.8ms) | Samples: 1

**Called by:**
- `setCursorStyleOptions` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:308` | Self: 0.1% (92.7ms) | Total: 0.1% (92.7ms) | Samples: 1

**Called by:**
- `emitKeyOrResponse` (1)

### `listenerCount`
`node:events` | Self: 0.1% (92.6ms) | Total: 0.1% (92.6ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `matchesKeyBinding`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:133` | Self: 0.1% (92.4ms) | Total: 1.0% (551.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (8)

**Calls:**
- `map` (6)
- `getKeyBindingKeys` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1471` | Self: 0.1% (92.3ms) | Total: 1.1% (586.8ms) | Samples: 1

**Called by:**
- `render` (8)

**Calls:**
- `addToHitGrid` (7)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.1% (92.0ms) | Total: 0.1% (92.0ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `get height`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.1% (91.7ms) | Total: 0.1% (91.7ms) | Samples: 1

**Called by:**
- `calculateLayout` (1)

### `setCursorStyleOptions`
`[native code]` | Self: 0.1% (91.4ms) | Total: 0.1% (91.4ms) | Samples: 2

**Called by:**
- `setCursorStyleOptions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1768` | Self: 0.1% (91.3ms) | Total: 15.8% (8.31s) | Samples: 2

**Called by:**
- `async loop` (93)

**Calls:**
- `render` (28)
- `render` (27)
- `render` (14)
- `render` (9)
- `render` (8)
- `render` (4)
- `render` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:258` | Self: 0.1% (91.0ms) | Total: 0.2% (137.0ms) | Samples: 1

**Called by:**
- `emitKeyOrResponse` (2)

**Calls:**
- `test` (1)

### `setBigUint64`
`[native code]` | Self: 0.1% (90.9ms) | Total: 0.1% (90.9ms) | Samples: 1

**Called by:**
- `pack` (1)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:179` | Self: 0.1% (90.9ms) | Total: 0.1% (90.9ms) | Samples: 1

**Called by:**
- `processParsedKey` (1)

### `arrayFromFastWithoutMapFn`
`[native code]` | Self: 0.1% (90.5ms) | Total: 0.1% (90.5ms) | Samples: 2

**Called by:**
- `from` (2)

### `isSplitCursorSeedFrameBlocked`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:2572` | Self: 0.1% (88.9ms) | Total: 0.1% (88.9ms) | Samples: 1

**Called by:**
- `renderNative` (1)

### `ArrayBuffer`
`[native code]` | Self: 0.1% (80.2ms) | Total: 0.1% (80.2ms) | Samples: 2

**Called by:**
- `editorViewGetVisualCursor` (2)

### `(unknown)`
`[native code]` | Self: 0.1% (75.5ms) | Total: 6.7% (3.53s) | Samples: 2

**Called by:**
- `(anonymous)` (56)

**Calls:**
- `.wasm-function[182]` (52)
- `.wasm-function[152]` (1)
- `.wasm-function[181]` (1)

### `get`
`[native code]` | Self: 0.1% (62.6ms) | Total: 0.1% (62.6ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `.wasm-function[59]`
`[native code]` | Self: 0.1% (60.8ms) | Total: 0.1% (60.8ms) | Samples: 1

**Called by:**
- `.wasm-function[61]` (1)

### `hitGridPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.1% (56.5ms) | Total: 0.2% (140.0ms) | Samples: 1

**Called by:**
- `hitGridPushScissorRect` (2)

**Calls:**
- `(anonymous)` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1421` | Self: 0.0% (48.4ms) | Total: 0.0% (48.4ms) | Samples: 2

**Called by:**
- `updateLayout` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\app.tsx:116` | Self: 0.0% (48.1ms) | Total: 0.0% (48.1ms) | Samples: 1

**Called by:**
- `emitWithPriority` (1)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:148` | Self: 0.0% (48.0ms) | Total: 0.0% (48.0ms) | Samples: 2

**Called by:**
- `processPaste` (2)

### `Ea`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:17` | Self: 0.0% (47.8ms) | Total: 0.0% (47.8ms) | Samples: 2

**Called by:**
- `s` (2)

### `handleAutoScroll`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-sq86yyfz.js` | Self: 0.0% (47.8ms) | Total: 0.0% (47.8ms) | Samples: 1

**Called by:**
- `onUpdate` (1)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:182` | Self: 0.0% (47.6ms) | Total: 0.0% (47.6ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (47.6ms) | Total: 0.0% (47.6ms) | Samples: 2

**Called by:**
- `pack` (2)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:268` | Self: 0.0% (47.5ms) | Total: 0.9% (516.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `resolveKeyInput` (2)
- `resolveKeyInput` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:313` | Self: 0.0% (47.5ms) | Total: 0.4% (234.8ms) | Samples: 1

**Called by:**
- `emitKeyOrResponse` (4)

**Calls:**
- `parseKittyKeyboard` (3)

### `scanPending`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:851` | Self: 0.0% (47.5ms) | Total: 0.0% (47.5ms) | Samples: 1

**Called by:**
- `push` (1)

### `hitGridPopScissorRect`
`[native code]` | Self: 0.0% (47.4ms) | Total: 0.0% (47.4ms) | Samples: 1

**Called by:**
- `hitGridPopScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:327` | Self: 0.0% (47.4ms) | Total: 0.0% (47.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `BigInt`
`[native code]` | Self: 0.0% (47.0ms) | Total: 0.0% (47.0ms) | Samples: 1

**Called by:**
- `pack` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:609` | Self: 0.0% (46.9ms) | Total: 0.0% (46.9ms) | Samples: 1

**Called by:**
- `setCursorStyleOptions` (1)

### `normalizeClockTime`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (46.9ms) | Total: 0.0% (46.9ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `parseModule`
`[native code]` | Self: 0.0% (46.8ms) | Total: 0.1% (93.3ms) | Samples: 4

**Called by:**
- `async (anonymous)` (9)

**Calls:**
- `node:util` (2)
- `node:stream` (2)
- `(anonymous)` (1)

### `wrap`
`bun:ffi:320` | Self: 0.0% (46.7ms) | Total: 0.0% (46.7ms) | Samples: 1

**Called by:**
- `bufferDrawBox` (1)

### `bufferGetRealCharSize`
`[native code]` | Self: 0.0% (46.7ms) | Total: 0.0% (46.7ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:273` | Self: 0.0% (46.6ms) | Total: 0.0% (46.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `unpack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:657` | Self: 0.0% (46.6ms) | Total: 0.1% (92.4ms) | Samples: 1

**Called by:**
- `renderCursor` (1)
- `getEOL` (1)

**Calls:**
- `DataView` (1)

### `pack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:616` | Self: 0.0% (46.6ms) | Total: 0.0% (46.6ms) | Samples: 1

**Called by:**
- `setCursorStyleOptions` (1)

### `editorViewGetCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3919` | Self: 0.0% (46.6ms) | Total: 0.0% (46.6ms) | Samples: 1

**Called by:**
- `gotoLineHome` (1)

### `.wasm-function[105]`
`[native code]` | Self: 0.0% (46.5ms) | Total: 0.0% (46.5ms) | Samples: 1

**Called by:**
- `wasm-stub` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3162` | Self: 0.0% (46.5ms) | Total: 0.0% (46.5ms) | Samples: 1

**Called by:**
- `bound ` (1)

### `gotoLineHome`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:764` | Self: 0.0% (46.5ms) | Total: 0.0% (47.5ms) | Samples: 1

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `updateSelectionForMovement` (1)

### `isCapabilityResponse`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts:58` | Self: 0.0% (46.5ms) | Total: 0.0% (46.5ms) | Samples: 1

**Called by:**
- `processCapabilitySequence` (1)

### `getKeyBindingKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (46.4ms) | Total: 0.0% (46.4ms) | Samples: 1

**Called by:**
- `matchesKeyBinding` (1)

### `KeyEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (46.4ms) | Total: 0.0% (46.4ms) | Samples: 1

**Called by:**
- `processParsedKey` (1)

### `.wasm-function[152]`
`[native code]` | Self: 0.0% (46.4ms) | Total: 0.0% (46.4ms) | Samples: 1

**Called by:**
- `(unknown)` (1)

### `eb`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (46.4ms) | Total: 0.0% (46.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `getObjectsInViewport`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:32` | Self: 0.0% (46.3ms) | Total: 0.0% (46.3ms) | Samples: 1

**Called by:**
- `_getVisibleChildren` (1)

### `renderNative`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (46.3ms) | Total: 0.0% (46.3ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:22` | Self: 0.0% (46.3ms) | Total: 0.0% (46.3ms) | Samples: 2

**Called by:**
- `calculateLayout` (2)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:731` | Self: 0.0% (46.2ms) | Total: 3.6% (1.91s) | Samples: 1

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `scanPending` (19)
- `scanPending` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:715` | Self: 0.0% (46.2ms) | Total: 0.0% (46.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4287` | Self: 0.0% (46.2ms) | Total: 0.0% (46.2ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `bound `
`[native code]` | Self: 0.0% (46.1ms) | Total: 28.0% (14.68s) | Samples: 1

**Called by:**
- `emit` (207)
- `dispatchSequenceHandlers` (8)

**Calls:**
- `(anonymous)` (175)
- `(anonymous)` (31)
- `processCapabilitySequence` (5)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1367` | Self: 0.0% (46.1ms) | Total: 0.1% (93.9ms) | Samples: 1

**Called by:**
- `updateLayout` (2)

**Calls:**
- `onUpdate` (1)

### `dispatchSetState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6736` | Self: 0.0% (46.1ms) | Total: 0.0% (46.1ms) | Samples: 1

**Called by:**
- `handleContentChange` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4255` | Self: 0.0% (46.0ms) | Total: 0.0% (46.0ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:328` | Self: 0.0% (45.9ms) | Total: 0.0% (45.9ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `setCursorPosition`
`[native code]` | Self: 0.0% (45.9ms) | Total: 0.0% (45.9ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `updateFromLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1095` | Self: 0.0% (45.8ms) | Total: 0.0% (45.8ms) | Samples: 1

**Called by:**
- `updateLayout` (1)

### `editorViewGetSelection`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3839` | Self: 0.0% (45.8ms) | Total: 0.2% (143.1ms) | Samples: 1

**Called by:**
- `hasSelection` (4)

**Calls:**
- `editorViewGetSelection (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)

### `DataView`
`[native code]` | Self: 0.0% (45.7ms) | Total: 0.0% (45.7ms) | Samples: 1

**Called by:**
- `unpack` (1)

### `addToHitGrid (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (45.7ms) | Total: 0.6% (321.2ms) | Samples: 1

**Called by:**
- `addToHitGrid` (7)

**Calls:**
- `addToHitGrid` (4)
- `(anonymous)` (1)
- `bufferDrawTextBufferView` (1)

### `listenerCount`
`node:events:288` | Self: 0.0% (45.7ms) | Total: 0.0% (45.7ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `normalizeClockTime`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1297` | Self: 0.0% (45.6ms) | Total: 0.0% (45.6ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `measureFunc`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (45.5ms) | Total: 0.0% (45.5ms) | Samples: 1

**Called by:**
- `measure` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4348` | Self: 0.0% (45.2ms) | Total: 0.0% (45.2ms) | Samples: 1

### `bufferWriteResolvedChars`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2453` | Self: 0.0% (44.9ms) | Total: 3.7% (1.94s) | Samples: 1

**Called by:**
- `getRealCharBytes` (23)

**Calls:**
- `bufferWriteResolvedChars (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (22)

### `editorViewGetVisualCursor`
`[native code]` | Self: 0.0% (44.9ms) | Total: 0.0% (44.9ms) | Samples: 1

**Called by:**
- `editorViewGetVisualCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (44.8ms) | Total: 0.0% (44.8ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `normalizeClockTime`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1296` | Self: 0.0% (44.8ms) | Total: 0.0% (44.8ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4294` | Self: 0.0% (44.7ms) | Total: 0.0% (44.7ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `get screenX`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:540` | Self: 0.0% (43.3ms) | Total: 0.0% (43.3ms) | Samples: 1

**Called by:**
- `getObjectsInViewport` (1)

### `bufferPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (42.9ms) | Total: 0.0% (42.9ms) | Samples: 1

**Called by:**
- `bufferPushScissorRect` (1)

### `addListener`
`node:events:153` | Self: 0.0% (42.5ms) | Total: 0.0% (42.5ms) | Samples: 2

**Called by:**
- `(anonymous)` (2)

### `bufferDrawTextBufferView`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3474` | Self: 0.0% (42.1ms) | Total: 4.9% (2.61s) | Samples: 1

**Called by:**
- `drawTextBuffer` (27)

**Calls:**
- `bufferDrawTextBufferView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (26)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:35` | Self: 0.0% (41.9ms) | Total: 29.6% (15.51s) | Samples: 1

**Called by:**
- `(anonymous)` (232)

**Calls:**
- `pressKey` (192)
- `async pressKeys` (30)
- `pressKey` (4)
- `pressKey` (2)
- `pressKey` (1)
- `pressKey` (1)
- `pressKey` (1)

### `textBufferViewMeasureForDimensions`
`[native code]` | Self: 0.0% (41.2ms) | Total: 0.0% (41.2ms) | Samples: 2

**Called by:**
- `textBufferViewMeasureForDimensions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.0% (31.3ms) | Total: 0.0% (31.3ms) | Samples: 3

**Called by:**
- `link` (3)

### `isFull`
`internal:fixed_queue` | Self: 0.0% (30.6ms) | Total: 0.0% (30.6ms) | Samples: 1

**Called by:**
- `push` (1)

### `driveAsyncFunction`
`[native code]` | Self: 0.0% (30.3ms) | Total: 0.0% (30.3ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `getHitGridDirty (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (29.0ms) | Total: 0.0% (29.0ms) | Samples: 1

**Called by:**
- `async loop` (1)

### `getOpenTUILib`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (18.1ms) | Total: 0.0% (18.1ms) | Samples: 4

**Called by:**
- `FFIRenderLib` (4)

### `resolve`
`[native code]` | Self: 0.0% (17.0ms) | Total: 0.0% (17.0ms) | Samples: 2

**Called by:**
- `async (anonymous)` (2)

### `instantiate`
`[native code]` | Self: 0.0% (16.6ms) | Total: 0.0% (16.6ms) | Samples: 2

### `textBufferSetSyntaxStyle`
`[native code]` | Self: 0.0% (15.9ms) | Total: 0.0% (15.9ms) | Samples: 1

**Called by:**
- `textBufferSetSyntaxStyle (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:33` | Self: 0.0% (15.3ms) | Total: 0.0% (15.3ms) | Samples: 1

**Called by:**
- `init` (1)

### `o`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (14.9ms) | Total: 0.0% (14.9ms) | Samples: 1

**Called by:**
- `wasm-stub` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:14` | Self: 0.0% (14.4ms) | Total: 0.0% (14.4ms) | Samples: 1

**Called by:**
- `evaluate` (1)

### `setupMarginAndPadding`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:803` | Self: 0.0% (13.2ms) | Total: 0.0% (13.2ms) | Samples: 1

**Called by:**
- `setupYogaProperties` (1)

### `isValidElement`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` | Self: 0.0% (11.6ms) | Total: 0.0% (11.6ms) | Samples: 1

**Called by:**
- `validateChildKeys` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (11.4ms) | Total: 0.0% (11.4ms) | Samples: 1

**Called by:**
- `emitKeyOrResponse` (1)

### `fetch`
`[native code]` | Self: 0.0% (11.3ms) | Total: 0.0% (11.3ms) | Samples: 1

**Called by:**
- `requestFetch` (1)

### `measure`
`[native code]` | Self: 0.0% (6.7ms) | Total: 0.0% (6.7ms) | Samples: 7

**Called by:**
- `prepareFreshStack` (7)

### `updateProperties`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:362` | Self: 0.0% (6.7ms) | Total: 0.0% (6.7ms) | Samples: 7

**Called by:**
- `commitUpdate` (7)

### `Error`
`[native code]` | Self: 0.0% (6.6ms) | Total: 0.0% (6.6ms) | Samples: 7

**Called by:**
- `(anonymous)` (7)

### `freeze`
`[native code]` | Self: 0.0% (5.8ms) | Total: 0.0% (5.8ms) | Samples: 6

**Called by:**
- `ReactElement` (5)
- `jsxDEVImpl` (1)

### `updateProperties`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:368` | Self: 0.0% (4.0ms) | Total: 0.0% (4.0ms) | Samples: 4

**Called by:**
- `commitUpdate` (4)

### `editBufferGetText`
`[native code]` | Self: 0.0% (3.9ms) | Total: 0.0% (3.9ms) | Samples: 4

**Called by:**
- `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (4)

### `createWorkInProgress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:16508` | Self: 0.0% (2.9ms) | Total: 0.0% (2.9ms) | Samples: 3

**Called by:**
- `bailoutOnAlreadyFinishedWork` (3)

### `ReactElement`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:187` | Self: 0.0% (2.9ms) | Total: 0.0% (2.9ms) | Samples: 3

**Called by:**
- `InputBar` (2)
- `InputBar` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (2.0ms) | Total: 0.0% (35.4ms) | Samples: 1

**Called by:**
- `async loadAndEvaluateModule` (1)

**Calls:**
- `linkAndEvaluateModule` (3)
- `async loadAndEvaluateModule` (1)

### `getChildHostContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:424` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `pushHostContext` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js:189` | Self: 0.0% (2.0ms) | Total: 0.0% (2.0ms) | Samples: 2

**Called by:**
- `startProfilerTimer` (1)
- `stopProfilerTimerIfRunningAndRecordDuration` (1)

### `timeStamp`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `prepareFreshStack` (2)

### `editorViewGetSelection`
`[native code]` | Self: 0.0% (1.9ms) | Total: 0.0% (1.9ms) | Samples: 2

**Called by:**
- `editorViewGetSelection (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `bound react_stack_bottom_frame`
`[native code]` | Self: 0.0% (1.8ms) | Total: 0.0% (13.6ms) | Samples: 2

**Called by:**
- `renderWithHooks` (12)
- `runWithFiberInDEV` (2)

**Calls:**
- `react_stack_bottom_frame` (12)

### `performWorkOnRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14084` | Self: 0.0% (1.8ms) | Total: 0.0% (1.8ms) | Samples: 2

**Called by:**
- `performWorkOnRootViaSchedulerTask` (2)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15487` | Self: 0.0% (1.7ms) | Total: 0.0% (1.7ms) | Samples: 2

**Called by:**
- `commitRootWhenReady` (2)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12263` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `recursivelyTraverseMutationEffects` (1)

### `listeners`
`node:events:266` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `emitWithPriority` (1)

### `getTaskName`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:108` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `dispatchSetState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6742` | Self: 0.0% (1.0ms) | Total: 0.0% (1.9ms) | Samples: 1

**Called by:**
- `handleContentChange` (1)
- `bound dispatchSetState` (1)

**Calls:**
- `startUpdateTimerByLane` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2200` | Self: 0.0% (1.0ms) | Total: 0.0% (49.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `emit` (3)

### `flushMutationEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `flushPendingEffects` (1)

### `commitHookLayoutEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10826` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `commitLayoutEffectOnFiber` (1)

### `updateFunctionComponent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7728` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (1)

### `handleStdinEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3195` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `beginWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9191` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (1)

### `isConcurrentActEnvironment`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:13985` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `warnIfUpdatesNotWrappedWithActDEV` (1)

### `ReactElement`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:169` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `StatusBar` (1)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14729` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `renderRootSync` (1)

### `editorViewGetCursor`
`[native code]` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `editorViewGetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `measure`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js:67` | Self: 0.0% (1.0ms) | Total: 6.1% (3.21s) | Samples: 1

**Called by:**
- `(anonymous)` (60)

**Calls:**
- `measureFunc` (58)
- `measureFunc` (1)

### `borderCharsToArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:151` | Self: 0.0% (1.0ms) | Total: 0.0% (1.0ms) | Samples: 1

**Called by:**
- `set customBorderChars` (1)

### `reconcileChildrenArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4210` | Self: 0.0% (998us) | Total: 0.0% (998us) | Samples: 1

**Called by:**
- `reconcileChildFibersImpl` (1)

### `mapValue`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (995us) | Total: 0.0% (995us) | Samples: 1

**Called by:**
- `packList` (1)

### `189`
`[native code]` | Self: 0.0% (990us) | Total: 0.0% (990us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:17438` | Self: 0.0% (986us) | Total: 0.0% (986us) | Samples: 1

**Called by:**
- `commitRoot` (1)

### `areHookInputsEqual`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5275` | Self: 0.0% (983us) | Total: 0.0% (983us) | Samples: 1

**Called by:**
- `updateEffectImpl` (1)

### `arrayIteratorNextHelper`
`[native code]` | Self: 0.0% (982us) | Total: 0.0% (982us) | Samples: 1

**Called by:**
- `from` (1)

### `hb`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:28` | Self: 0.0% (981us) | Total: 0.0% (981us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14743` | Self: 0.0% (974us) | Total: 0.0% (974us) | Samples: 1

**Called by:**
- `renderRootSync` (1)

### `emit`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (970us) | Total: 0.0% (970us) | Samples: 1

**Called by:**
- `processParsedKey` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3250` | Self: 0.0% (969us) | Total: 0.0% (969us) | Samples: 1

**Called by:**
- `dispatchSequenceHandlers` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:767` | Self: 0.0% (966us) | Total: 0.0% (966us) | Samples: 1

**Called by:**
- `init` (1)

### `startEffectTimer`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (962us) | Total: 0.0% (962us) | Samples: 1

**Called by:**
- `commitHookLayoutUnmountEffects` (1)

### `performWorkOnRootViaSchedulerTask`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3335` | Self: 0.0% (961us) | Total: 0.3% (167.6ms) | Samples: 1

**Called by:**
- `bound performWorkOnRootViaSchedulerTask` (115)

**Calls:**
- `performWorkOnRoot` (79)
- `performWorkOnRoot` (33)
- `performWorkOnRoot` (2)

### `clearSelection`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (958us) | Total: 0.0% (958us) | Samples: 1

**Called by:**
- `updateSelectionForMovement` (1)

### `setProperty`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:346` | Self: 0.0% (955us) | Total: 0.0% (5.5ms) | Samples: 1

**Called by:**
- `updateProperties` (6)

**Calls:**
- `set customBorderChars` (2)
- `set border` (2)
- `set border` (1)

### `resolveKeyInput`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:150` | Self: 0.0% (954us) | Total: 0.0% (954us) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (953us) | Total: 0.0% (6.8ms) | Samples: 1

**Called by:**
- `editBufferGetText` (7)

**Calls:**
- `editBufferGetText` (4)
- `(anonymous)` (2)

### `flushSpawnedWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15788` | Self: 0.0% (951us) | Total: 0.0% (951us) | Samples: 1

**Called by:**
- `commitRoot` (1)

### `reconcileChildFibersImpl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4568` | Self: 0.0% (949us) | Total: 0.0% (4.6ms) | Samples: 1

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `reconcileChildrenArray` (2)
- `reconcileChildrenArray` (1)
- `reconcileChildrenArray` (1)

### `write`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:47` | Self: 0.0% (948us) | Total: 0.0% (948us) | Samples: 1

**Called by:**
- `toWireType` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1370` | Self: 0.0% (947us) | Total: 0.0% (947us) | Samples: 1

**Called by:**
- `updateLayout` (1)

### `beginWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9519` | Self: 0.0% (946us) | Total: 0.0% (2.8ms) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (3)

**Calls:**
- `pushHostContext` (1)
- `pushHostContext` (1)

### `clearTimeout`
`[native code]` | Self: 0.0% (939us) | Total: 0.0% (939us) | Samples: 1

**Called by:**
- `frame` (1)

### `get screenY`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (938us) | Total: 0.0% (938us) | Samples: 1

**Called by:**
- `getObjectsInViewport` (1)

### `startUpdateTimerByLane`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2987` | Self: 0.0% (938us) | Total: 0.0% (938us) | Samples: 1

**Called by:**
- `dispatchSetState` (1)

### `mapIterationNext`
`[native code]` | Self: 0.0% (937us) | Total: 0.0% (937us) | Samples: 1

**Called by:**
- `forEach` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1122` | Self: 0.0% (936us) | Total: 0.7% (419.1ms) | Samples: 1

**Called by:**
- `dispatchSequenceHandlers` (5)

**Calls:**
- `handleSequence` (3)
- `handleSequence` (1)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14734` | Self: 0.0% (932us) | Total: 0.0% (932us) | Samples: 1

**Called by:**
- `renderRootSync` (1)

### `warnIfUpdatesNotWrappedWithActDEV`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (931us) | Total: 0.0% (931us) | Samples: 1

**Called by:**
- `scheduleUpdateOnFiber` (1)

### `runWithFiberInDEV`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2508` | Self: 0.0% (930us) | Total: 0.2% (107.4ms) | Samples: 1

**Called by:**
- `performUnitOfWork` (55)
- `commitHostUpdate` (18)
- `completeUnitOfWork` (8)
- `commitHookEffectListMount` (2)

**Calls:**
- `updateFunctionComponent` (25)
- `commitUpdate` (17)
- `attemptEarlyBailoutIfNoScheduledUpdate` (14)
- `completeWork` (6)
- `beginWork` (5)
- `beginWork` (3)
- `attemptEarlyBailoutIfNoScheduledUpdate` (2)
- `bailoutOnAlreadyFinishedWork` (2)
- `bound react_stack_bottom_frame` (2)
- `completeWork` (1)
- `updateFunctionComponent` (1)
- `beginWork` (1)
- `updateFunctionComponent` (1)
- `completeWork` (1)
- `updateFunctionComponent` (1)

### `updateReducerImpl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (928us) | Total: 0.0% (928us) | Samples: 1

**Called by:**
- `useState` (1)

### `pushHostContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (927us) | Total: 0.0% (927us) | Samples: 1

**Called by:**
- `attemptEarlyBailoutIfNoScheduledUpdate` (1)

### `pushHostContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:1967` | Self: 0.0% (923us) | Total: 0.0% (923us) | Samples: 1

**Called by:**
- `beginWork` (1)

### `M`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (915us) | Total: 0.0% (915us) | Samples: 1

**Called by:**
- `s` (1)

### `performWorkOnRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14165` | Self: 0.0% (914us) | Total: 0.1% (103.8ms) | Samples: 1

**Called by:**
- `performWorkOnRootViaSchedulerTask` (79)

**Calls:**
- `renderRootSync` (65)
- `renderRootSync` (13)

### `useRenderer`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js` | Self: 0.0% (912us) | Total: 0.0% (912us) | Samples: 1

**Called by:**
- `InputBar` (1)

### `s`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:60` | Self: 0.0% (912us) | Total: 0.2% (144.2ms) | Samples: 1

**Called by:**
- `wasm-stub` (8)

**Calls:**
- `N` (4)
- `Ea` (2)
- `M` (1)

### `dispatchSequenceHandlers`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3178` | Self: 0.0% (909us) | Total: 2.2% (1.18s) | Samples: 1

**Called by:**
- `handleStdinEvent` (16)

**Calls:**
- `bound ` (8)
- `(anonymous)` (5)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `dispatchSetState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` | Self: 0.0% (906us) | Total: 0.0% (906us) | Samples: 1

**Called by:**
- `handleContentChange` (1)

### `bind`
`[native code]` | Self: 0.0% (906us) | Total: 0.0% (906us) | Samples: 1

**Called by:**
- `scheduleTaskForRootDuringMicrotask` (1)

### `bailoutOnAlreadyFinishedWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:8985` | Self: 0.0% (904us) | Total: 0.0% (3.8ms) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (2)
- `attemptEarlyBailoutIfNoScheduledUpdate` (2)

**Calls:**
- `createWorkInProgress` (3)

### `forEach`
`[native code]` | Self: 0.0% (904us) | Total: 0.0% (1.8ms) | Samples: 1

**Called by:**
- `reconcileChildrenArray` (2)

**Calls:**
- `mapIterationNext` (1)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14657` | Self: 0.0% (903us) | Total: 0.0% (903us) | Samples: 1

**Called by:**
- `renderRootSync` (1)

### `reconcileChildFibersImpl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4565` | Self: 0.0% (902us) | Total: 0.0% (902us) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `completeWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10141` | Self: 0.0% (896us) | Total: 0.0% (896us) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (1)

### `reconcileChildrenArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4270` | Self: 0.0% (892us) | Total: 0.0% (892us) | Samples: 1

**Called by:**
- `reconcileChildFibersImpl` (1)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15546` | Self: 0.0% (891us) | Total: 0.0% (891us) | Samples: 1

**Called by:**
- `commitRootWhenReady` (1)

### `sanitize`
`C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\contracts.ts:239` | Self: 0.0% (890us) | Total: 0.0% (890us) | Samples: 1

**Called by:**
- `StatusBar` (1)

### `flushSyncWorkAcrossRoots_impl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3180` | Self: 0.0% (881us) | Total: 0.0% (881us) | Samples: 1

**Called by:**
- `flushSpawnedWork` (1)

### `commitHookEffectListUnmount`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10914` | Self: 0.0% (878us) | Total: 0.0% (878us) | Samples: 1

**Called by:**
- `commitMutationEffectsOnFiber` (1)

### `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (869us) | Total: 0.4% (234.4ms) | Samples: 1

**Called by:**
- `updateStats` (3)

**Calls:**
- `(anonymous)` (1)
- `updateStats` (1)

### `getBorderSides`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` | Self: 0.0% (867us) | Total: 0.0% (867us) | Samples: 1

**Called by:**
- `set border` (1)

### `applyEventOptions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1662` | Self: 0.0% (866us) | Total: 0.0% (866us) | Samples: 1

**Called by:**
- `Renderable` (1)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12594` | Self: 0.0% (865us) | Total: 0.1% (84.0ms) | Samples: 1

**Called by:**
- `recursivelyTraverseMutationEffects` (88)

**Calls:**
- `recursivelyTraverseMutationEffects` (87)

### `cwd`
`[native code]` | Self: 0.0% (861us) | Total: 0.0% (861us) | Samples: 1

**Called by:**
- `(module)` (1)

### `updateFunctionComponent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7692` | Self: 0.0% (859us) | Total: 0.0% (859us) | Samples: 1

**Called by:**
- `runWithFiberInDEV` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` | Self: 0.0% (859us) | Total: 0.0% (859us) | Samples: 1

**Called by:**
- `useTheme` (1)

### `ZodNumberFormat`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:42` | Self: 0.0% (856us) | Total: 0.0% (856us) | Samples: 1

**Called by:**
- `_int` (1)

### `.wasm-function[119]`
`[native code]` | Self: 0.0% (855us) | Total: 0.0% (855us) | Samples: 1

**Called by:**
- `.wasm-function[61]` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2197` | Self: 0.0% (855us) | Total: 0.1% (89.4ms) | Samples: 1

**Called by:**
- `editBufferInsertText` (2)
- `editBufferDeleteRange` (1)

**Calls:**
- `slice` (1)
- `toArrayBuffer` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js` | Self: 0.0% (852us) | Total: 0.0% (852us) | Samples: 1

**Called by:**
- `scheduleTaskForRootDuringMicrotask` (1)

### `popProvider`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:2761` | Self: 0.0% (851us) | Total: 0.0% (851us) | Samples: 1

**Called by:**
- `completeWork` (1)

### `borderCharsToArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:150` | Self: 0.0% (847us) | Total: 0.0% (847us) | Samples: 1

**Called by:**
- `set customBorderChars` (1)

### `getText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:134` | Self: 0.0% (846us) | Total: 0.7% (387.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (53)
- `(anonymous)` (50)

**Calls:**
- `editBufferGetText` (94)
- `editBufferGetText` (7)
- `slice` (1)

### `useContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18151` | Self: 0.0% (834us) | Total: 0.0% (834us) | Samples: 1

**Called by:**
- `useTheme` (1)

### `renderWithHooks`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5308` | Self: 0.0% (834us) | Total: 0.0% (834us) | Samples: 1

**Called by:**
- `updateFunctionComponent` (1)

### `close`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts` | Self: 0.0% (831us) | Total: 0.0% (831us) | Samples: 1

**Called by:**
- `handleContentChange` (1)

### `popHitGridScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1363` | Self: 0.0% (0us) | Total: 0.6% (316.9ms) | Samples: 0

**Called by:**
- `render` (4)

**Calls:**
- `hitGridPopScissorRect` (4)

### `handleContentChange`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:35` | Self: 0.0% (0us) | Total: 0.0% (48.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `bound dispatchSetState` (2)
- `dispatchSetState` (1)
- `dispatchSetState` (1)

### `renderWithHooks`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:5335` | Self: 0.0% (0us) | Total: 0.0% (22.9ms) | Samples: 0

**Called by:**
- `updateFunctionComponent` (24)

**Calls:**
- `react_stack_bottom_frame` (12)
- `bound react_stack_bottom_frame` (12)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:165` | Self: 0.0% (0us) | Total: 0.0% (954us) | Samples: 0

**Called by:**
- `async pressKeys` (1)

**Calls:**
- `resolveKeyInput` (1)

### `bufferWriteResolvedChars (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 3.6% (1.89s) | Samples: 0

**Called by:**
- `bufferWriteResolvedChars` (22)

**Calls:**
- `bufferWriteResolvedChars` (21)
- `(anonymous)` (1)

### `bufferDrawTextBufferView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 4.9% (2.57s) | Samples: 0

**Called by:**
- `bufferDrawTextBufferView` (26)

**Calls:**
- `bufferDrawTextBufferView` (24)
- `(anonymous)` (2)

### `setCursorStyleOptions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2751` | Self: 0.0% (0us) | Total: 1.6% (844.6ms) | Samples: 0

**Called by:**
- `setCursorStyle` (10)

**Calls:**
- `pack` (6)
- `pack` (1)
- `pack` (1)
- `pack` (1)
- `pack` (1)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (11.3ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `commitHookEffectListMount`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10861` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `commitHookLayoutEffects` (2)

**Calls:**
- `runWithFiberInDEV` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:403` | Self: 0.0% (0us) | Total: 11.1% (5.83s) | Samples: 0

**Called by:**
- `emitWithPriority` (99)

**Calls:**
- `gotoLineHome` (56)
- `deleteToLineEnd` (27)
- `handleKeyPress` (8)
- `deleteToLineEnd` (3)
- `gotoLineHome` (3)
- `gotoLineHome` (2)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12156` | Self: 0.0% (0us) | Total: 0.1% (103.3ms) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (108)

**Calls:**
- `recursivelyTraverseMutationEffects` (108)

### `processParsedKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:104` | Self: 0.0% (0us) | Total: 15.4% (8.07s) | Samples: 0

**Called by:**
- `handleStdinEvent` (132)

**Calls:**
- `emitWithPriority` (99)
- `emitWithPriority` (19)
- `emitWithPriority` (7)
- `emitWithPriority` (4)
- `emit` (1)
- `KeyEvent` (1)
- `emitWithPriority` (1)

### `b`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:63` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Calls:**
- `a` (1)

### `completeWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10255` | Self: 0.0% (0us) | Total: 0.0% (32.7ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (6)

**Calls:**
- `createInstance` (6)

### `a`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:67` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `Mb` (1)

**Calls:**
- `za` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:748` | Self: 0.0% (0us) | Total: 0.1% (93.8ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `reconcileTimeoutState` (1)

### `getObjectsInViewport`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:138` | Self: 0.0% (0us) | Total: 0.0% (43.3ms) | Samples: 0

**Called by:**
- `_getVisibleChildren` (1)

**Calls:**
- `get screenX` (1)

### `applyYogaBorders`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:294` | Self: 0.0% (0us) | Total: 0.0% (901us) | Samples: 0

**Called by:**
- `set border` (1)

**Calls:**
- `(anonymous)` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:18` | Self: 0.0% (0us) | Total: 0.0% (11.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `render` (1)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11490` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `recursivelyTraverseLayoutEffects` (3)

**Calls:**
- `commitHookLayoutEffects` (2)
- `commitHookLayoutEffects` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:991` | Self: 0.0% (0us) | Total: 0.0% (45.7ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `addToHitGrid` (1)

### `Promise`
`[native code]` | Self: 0.0% (0us) | Total: 30.6% (16.05s) | Samples: 0

**Called by:**
- `async frameWith` (239)

**Calls:**
- `(anonymous)` (235)
- `(anonymous)` (3)
- `(anonymous)` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4326` | Self: 0.0% (0us) | Total: 0.4% (234.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `updateStats` (3)

### `resetAfterCommit`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:418` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `flushMutationEffects` (1)

**Calls:**
- `requestRender` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4333` | Self: 0.0% (0us) | Total: 0.2% (138.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `listenerCount` (1)
- `listenerCount` (1)

### `za`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:15` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `a` (1)

**Calls:**
- `wasm-stub` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\jsx-dev-runtime.js:6` | Self: 0.0% (0us) | Total: 0.0% (14.1ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `commitRootWhenReady`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14467` | Self: 0.0% (0us) | Total: 0.1% (61.0ms) | Samples: 0

**Called by:**
- `performWorkOnRoot` (33)

**Calls:**
- `commitRoot` (23)
- `commitRoot` (3)
- `commitRoot` (2)
- `commitRoot` (2)
- `commitRoot` (1)
- `commitRoot` (1)
- `commitRoot` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:49` | Self: 0.0% (0us) | Total: 0.6% (362.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (61)

**Calls:**
- `getText` (53)
- `handleContentChange` (4)
- `handleContentChange` (2)
- `decode` (1)
- `handleContentChange` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:42` | Self: 0.0% (0us) | Total: 0.1% (62.6ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `get` (1)

### `emitWithPriority`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:185` | Self: 0.0% (0us) | Total: 14.5% (7.60s) | Samples: 0

**Called by:**
- `processParsedKey` (99)
- `processPaste` (21)

**Calls:**
- `(anonymous)` (99)
- `(anonymous)` (21)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (133.0ms) | Samples: 0

**Called by:**
- `requestInstantiate` (1)
- `async (anonymous)` (1)

**Calls:**
- `parseModule` (9)
- `resolve` (2)
- `requestFetch` (1)
- `async (anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2196` | Self: 0.0% (0us) | Total: 0.0% (47.9ms) | Samples: 0

**Called by:**
- `editBufferSetCursor` (2)

**Calls:**
- `toArrayBuffer` (2)

### `handlePaste`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Textarea.ts:262` | Self: 0.0% (0us) | Total: 3.3% (1.77s) | Samples: 0

**Called by:**
- `(anonymous)` (21)

**Calls:**
- `insertText` (17)
- `insertText` (4)

### `commitHostUpdate`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11213` | Self: 0.0% (0us) | Total: 0.0% (17.2ms) | Samples: 0

**Called by:**
- `commitMutationEffectsOnFiber` (18)

**Calls:**
- `runWithFiberInDEV` (18)

### `wasm-stub`
`[native code]` | Self: 0.0% (0us) | Total: 8.9% (4.70s) | Samples: 0

**Called by:**
- `.wasm-function[177]` (69)
- `(anonymous)` (28)
- `za` (1)
- `.wasm-function[143]` (1)
- `read` (1)

**Calls:**
- `(anonymous)` (60)
- `.wasm-function[182]` (28)
- `s` (8)
- `o` (1)
- `.wasm-function[109]` (1)
- `toWireType` (1)
- `.wasm-function[105]` (1)

### `createInstance`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:394` | Self: 0.0% (0us) | Total: 0.0% (32.7ms) | Samples: 0

**Called by:**
- `completeWork` (6)

**Calls:**
- `TextRenderable` (2)
- `TextRenderable` (2)
- `ScrollBoxRenderable` (1)
- `ScrollBoxRenderable` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:25` | Self: 0.0% (0us) | Total: 0.3% (172.1ms) | Samples: 0

**Called by:**
- `Promise` (3)

**Calls:**
- `setTimeout` (3)

### `commitHookLayoutEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10825` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `commitLayoutEffectOnFiber` (2)

**Calls:**
- `commitHookEffectListMount` (2)

### `beginWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9542` | Self: 0.0% (0us) | Total: 0.0% (4.6ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (5)

**Calls:**
- `reconcileChildren` (5)

### `validateChildKeys`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js:257` | Self: 0.0% (0us) | Total: 0.0% (11.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `isValidElement` (1)

### `_array`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\api.js:707` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodArray` (1)

### `emit`
`node:events:95` | Self: 0.0% (0us) | Total: 38.2% (20.04s) | Samples: 0

**Called by:**
- `pressKey` (182)
- `(anonymous)` (114)
- `async loop` (64)
- `async (anonymous)` (25)

**Calls:**
- `bound ` (207)
- `(anonymous)` (111)
- `frame` (64)
- `(anonymous)` (3)

### `bufferDrawEditorView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (184.3ms) | Samples: 0

**Called by:**
- `bufferDrawEditorView` (3)

**Calls:**
- `bufferDrawEditorView` (3)

### `bufferDrawBox`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2678` | Self: 0.0% (0us) | Total: 2.2% (1.16s) | Samples: 0

**Called by:**
- `drawBox` (11)

**Calls:**
- `bufferDrawBox (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (10)
- `wrap` (1)

### `attemptEarlyBailoutIfNoScheduledUpdate`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9126` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (2)

**Calls:**
- `bailoutOnAlreadyFinishedWork` (2)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15481` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `commitRootWhenReady` (1)

**Calls:**
- `flushPendingEffects` (1)

### `hasSelection`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:576` | Self: 0.0% (0us) | Total: 0.2% (142.2ms) | Samples: 0

**Called by:**
- `insertText` (3)

**Calls:**
- `hasSelection` (3)

### `renderRootSync`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15039` | Self: 0.0% (0us) | Total: 0.0% (12.5ms) | Samples: 0

**Called by:**
- `performWorkOnRoot` (13)

**Calls:**
- `prepareFreshStack` (7)
- `prepareFreshStack` (2)
- `prepareFreshStack` (1)
- `prepareFreshStack` (1)
- `prepareFreshStack` (1)
- `prepareFreshStack` (1)

### `performWorkOnRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14384` | Self: 0.0% (0us) | Total: 0.1% (61.0ms) | Samples: 0

**Called by:**
- `performWorkOnRootViaSchedulerTask` (33)

**Calls:**
- `commitRootWhenReady` (33)

### `_int`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\api.js:319` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `ZodNumberFormat` (1)

### `dlopen`
`bun:ffi:345` | Self: 0.0% (0us) | Total: 0.2% (106.9ms) | Samples: 0

**Called by:**
- `dlopen` (11)

**Calls:**
- `dlopen` (11)

### `reconcileChildrenArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4299` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `reconcileChildFibersImpl` (2)

**Calls:**
- `forEach` (2)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (11.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:60` | Self: 0.0% (0us) | Total: 6.1% (3.21s) | Samples: 0

**Called by:**
- `wasm-stub` (60)

**Calls:**
- `measure` (60)

### `updateTextBuffer`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:49` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `TextRenderable` (2)

**Calls:**
- `setStyledText` (1)
- `setStyledText` (1)

### `editBufferSetCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3681` | Self: 0.0% (0us) | Total: 6.4% (3.36s) | Samples: 0

**Called by:**
- `setCursor` (56)

**Calls:**
- `editBufferSetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (34)
- `wrap` (22)

### `renderCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1012` | Self: 0.0% (0us) | Total: 2.7% (1.46s) | Samples: 0

**Called by:**
- `render` (18)

**Calls:**
- `setCursorStyle` (16)
- `cloneObject` (2)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1772` | Self: 0.0% (0us) | Total: 0.0% (42.9ms) | Samples: 0

**Called by:**
- `async loop` (1)

**Calls:**
- `pushScissorRect` (1)

### `editBufferGetText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3618` | Self: 0.0% (0us) | Total: 0.0% (6.8ms) | Samples: 0

**Called by:**
- `getText` (7)

**Calls:**
- `editBufferGetText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (7)

### `bound dispatchSetState`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `handleContentChange` (2)
- `close` (1)

**Calls:**
- `dispatchSetState` (2)
- `dispatchSetState` (1)

### `getRealCharBytes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:160` | Self: 0.0% (0us) | Total: 3.7% (1.94s) | Samples: 0

**Called by:**
- `captureCharFrame` (23)

**Calls:**
- `bufferWriteResolvedChars` (23)

### `bound performWorkOnRootViaSchedulerTask`
`[native code]` | Self: 0.0% (0us) | Total: 0.3% (167.6ms) | Samples: 0

**Called by:**
- `performWorkUntilDeadline` (115)

**Calls:**
- `performWorkOnRootViaSchedulerTask` (115)

### `renderSelf`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:998` | Self: 0.0% (0us) | Total: 0.3% (184.3ms) | Samples: 0

**Called by:**
- `render` (3)

**Calls:**
- `drawEditorView` (3)

### `.wasm-function[109]`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `wasm-stub` (1)

**Calls:**
- `.wasm-function[143]` (1)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15484` | Self: 0.0% (0us) | Total: 0.0% (986us) | Samples: 0

**Called by:**
- `commitRootWhenReady` (1)

**Calls:**
- `(anonymous)` (1)

### `getObjectsInViewport`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:125` | Self: 0.0% (0us) | Total: 0.0% (938us) | Samples: 0

**Called by:**
- `_getVisibleChildren` (1)

**Calls:**
- `get screenY` (1)

### `emitKeyOrResponse`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1778` | Self: 0.0% (0us) | Total: 2.6% (1.39s) | Samples: 0

**Called by:**
- `scanPending` (17)

**Calls:**
- `parseKeypress` (4)
- `parseKeypress` (2)
- `parseKeypress` (2)
- `parseKeypress` (2)
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)
- `parseKeypress` (1)

### `setCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:203` | Self: 0.0% (0us) | Total: 6.4% (3.36s) | Samples: 0

**Called by:**
- `gotoLineHome` (56)

**Calls:**
- `editBufferSetCursor` (56)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:993` | Self: 0.0% (0us) | Total: 0.6% (325.4ms) | Samples: 0

**Called by:**
- `render` (4)

**Calls:**
- `renderSelf` (3)
- `renderSelf` (1)

### `TextRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:27` | Self: 0.0% (0us) | Total: 0.0% (16.8ms) | Samples: 0

**Called by:**
- `createInstance` (2)

**Calls:**
- `TextBufferRenderable` (1)
- `TextBufferRenderable` (1)

### `performUnitOfWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15290` | Self: 0.0% (0us) | Total: 0.0% (34.5ms) | Samples: 0

**Called by:**
- `workLoopSync` (8)

**Calls:**
- `completeUnitOfWork` (8)

### `updateStats`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2330` | Self: 0.0% (0us) | Total: 0.4% (234.4ms) | Samples: 0

**Called by:**
- `async loop` (3)

**Calls:**
- `updateStats (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)

### `toWireType`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:48` | Self: 0.0% (0us) | Total: 0.0% (948us) | Samples: 0

**Called by:**
- `wasm-stub` (1)

**Calls:**
- `write` (1)

### `scheduleTaskForRootDuringMicrotask`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3298` | Self: 0.0% (0us) | Total: 0.0% (906us) | Samples: 0

**Called by:**
- `processRootScheduleInMicrotask` (1)

**Calls:**
- `bind` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:1550` | Self: 0.0% (0us) | Total: 0.0% (963us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `map` (1)

### `processCapabilitySequence`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3094` | Self: 0.0% (0us) | Total: 0.9% (482.0ms) | Samples: 0

**Called by:**
- `bound ` (5)

**Calls:**
- `isCapabilityResponse` (2)
- `isCapabilityResponse` (1)
- `isCapabilityResponse` (1)
- `isCapabilityResponse` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:4447` | Self: 0.0% (0us) | Total: 0.2% (125.0ms) | Samples: 0

**Called by:**
- `evaluate` (15)

**Calls:**
- `FFIRenderLib` (15)

### `append`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:174` | Self: 0.0% (0us) | Total: 0.1% (93.1ms) | Samples: 0

**Called by:**
- `push` (1)

**Calls:**
- `ensureCapacity` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4305` | Self: 0.0% (0us) | Total: 34.3% (17.97s) | Samples: 0

**Called by:**
- `(anonymous)` (248)

**Calls:**
- `render` (93)
- `render` (88)
- `render` (40)
- `render` (13)
- `render` (4)
- `render` (4)
- `render` (3)
- `render` (2)
- `render` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:994` | Self: 0.0% (0us) | Total: 4.4% (2.33s) | Samples: 0

**Called by:**
- `render` (28)

**Calls:**
- `renderCursor` (18)
- `renderCursor` (8)
- `renderCursor` (1)
- `renderCursor` (1)

### `flushLayoutEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15671` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `commitRoot` (3)

**Calls:**
- `commitLayoutEffectOnFiber` (3)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11570` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `flushLayoutEffects` (3)

**Calls:**
- `recursivelyTraverseLayoutEffects` (3)

### `renderNative`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4420` | Self: 0.0% (0us) | Total: 3.9% (2.05s) | Samples: 0

**Called by:**
- `async loop` (33)

**Calls:**
- `render (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (28)
- `render` (5)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15587` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `commitRootWhenReady` (2)

**Calls:**
- `flushSpawnedWork` (1)
- `flushSpawnedWork` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1773` | Self: 0.0% (0us) | Total: 0.5% (281.8ms) | Samples: 0

**Called by:**
- `async loop` (4)

**Calls:**
- `pushHitGridScissorRect` (4)

### `renderSelf`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:254` | Self: 0.0% (0us) | Total: 3.2% (1.71s) | Samples: 0

**Called by:**
- `render` (13)

**Calls:**
- `drawBox` (12)
- `drawBox` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:56` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `.wasm-function[66]`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `.wasm-function[40]` (1)

**Calls:**
- `.wasm-function[31]` (1)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1431` | Self: 0.0% (0us) | Total: 1.7% (930.8ms) | Samples: 0

**Called by:**
- `updateLayout` (8)

**Calls:**
- `updateFromLayout` (8)

### `update`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\animation\Timeline.ts:579` | Self: 0.0% (0us) | Total: 0.0% (46.8ms) | Samples: 0

**Called by:**
- `async (anonymous)` (2)

**Calls:**
- `next` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:50` | Self: 0.0% (0us) | Total: 0.1% (77.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (50)

**Calls:**
- `getText` (50)

### `pushHostContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:1970` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `attemptEarlyBailoutIfNoScheduledUpdate` (13)
- `beginWork` (1)

**Calls:**
- `getChildHostContext` (12)
- `getChildHostContext` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:551` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `addToHitGrid`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1354` | Self: 0.0% (0us) | Total: 1.9% (996.7ms) | Samples: 0

**Called by:**
- `render` (9)
- `render` (7)
- `render` (1)

**Calls:**
- `addToHitGrid` (17)

### `renderSelf`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:500` | Self: 0.0% (0us) | Total: 4.9% (2.61s) | Samples: 0

**Called by:**
- `render` (27)

**Calls:**
- `drawTextBuffer` (27)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:28` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (2)

**Calls:**
- `useTheme` (2)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:333` | Self: 0.0% (0us) | Total: 0.0% (6.6ms) | Samples: 0

**Called by:**
- `InputBar` (4)
- `InputBar` (2)
- `InputBar` (1)

**Calls:**
- `Error` (7)

### `scheduleTaskForRootDuringMicrotask`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3302` | Self: 0.0% (0us) | Total: 0.0% (852us) | Samples: 0

**Called by:**
- `processRootScheduleInMicrotask` (1)

**Calls:**
- `(anonymous)` (1)

### `TextBufferRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:84` | Self: 0.0% (0us) | Total: 0.0% (884us) | Samples: 0

**Called by:**
- `TextRenderable` (1)

**Calls:**
- `setupMeasureFunc` (1)

### `handleStdinEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3197` | Self: 0.0% (0us) | Total: 2.6% (1.41s) | Samples: 0

**Called by:**
- `(anonymous)` (18)

**Calls:**
- `dispatchSequenceHandlers` (16)
- `dispatchSequenceHandlers` (2)

### `init`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:21` | Self: 0.0% (0us) | Total: 0.0% (35.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodLiteral` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `ZodArray` (1)
- `ZodObject` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `close`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:30` | Self: 0.0% (0us) | Total: 0.0% (931us) | Samples: 0

**Called by:**
- `handleContentChange` (1)

**Calls:**
- `bound dispatchSetState` (1)

### `reconcileChildren`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7256` | Self: 0.0% (0us) | Total: 0.0% (5.5ms) | Samples: 0

**Called by:**
- `beginWork` (5)
- `updateFunctionComponent` (1)

**Calls:**
- `(anonymous)` (6)

### `ZodObject`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `object` (1)

**Calls:**
- `init` (1)

### `literal`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:824` | Self: 0.0% (0us) | Total: 0.0% (963us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodLiteral` (1)

### `performWorkUntilDeadline`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js:45` | Self: 0.0% (0us) | Total: 0.3% (167.6ms) | Samples: 0

**Calls:**
- `bound performWorkOnRootViaSchedulerTask` (115)

### `textBufferViewMeasureForDimensions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3389` | Self: 0.0% (0us) | Total: 0.0% (41.2ms) | Samples: 0

**Called by:**
- `measureFunc` (2)

**Calls:**
- `textBufferViewMeasureForDimensions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `pressKey`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:376` | Self: 0.0% (0us) | Total: 24.2% (12.71s) | Samples: 0

**Called by:**
- `(anonymous)` (192)

**Calls:**
- `emit` (182)
- `(anonymous)` (8)
- `emit` (2)

### `Renderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:297` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `BoxRenderable` (1)

**Calls:**
- `setupYogaProperties` (1)

### `_getVisibleChildren`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:42` | Self: 0.0% (0us) | Total: 0.5% (279.5ms) | Samples: 0

**Called by:**
- `updateLayout` (5)

**Calls:**
- `getObjectsInViewport` (1)
- `getObjectsInViewport` (1)
- `getObjectsInViewport` (1)
- `getObjectsInViewport` (1)
- `getObjectsInViewport` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4349` | Self: 0.0% (0us) | Total: 11.1% (5.83s) | Samples: 0

**Calls:**
- `async loop` (66)
- `async loop` (1)

### `completeWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10531` | Self: 0.0% (0us) | Total: 0.0% (851us) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (1)

**Calls:**
- `popProvider` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `require` (1)

### `setupMeasureFunc`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:422` | Self: 0.0% (0us) | Total: 0.0% (884us) | Samples: 0

**Called by:**
- `TextBufferRenderable` (1)

**Calls:**
- `(anonymous)` (1)

### `PasteEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:71` | Self: 0.0% (0us) | Total: 0.0% (942us) | Samples: 0

**Called by:**
- `processPaste` (1)

**Calls:**
- `(anonymous)` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:489` | Self: 0.0% (0us) | Total: 0.8% (456.4ms) | Samples: 0

**Called by:**
- `render` (9)

**Calls:**
- `addToHitGrid` (9)

### `react_stack_bottom_frame`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:17596` | Self: 0.0% (0us) | Total: 0.0% (22.9ms) | Samples: 0

**Called by:**
- `bound react_stack_bottom_frame` (12)
- `renderWithHooks` (12)

**Calls:**
- `InputBar` (7)
- `InputBar` (3)
- `InputBar` (2)
- `InputBar` (2)
- `ReactElement` (2)
- `InputBar` (2)
- `StatusBar` (1)
- `InputBar` (1)
- `jsxDEVImpl` (1)
- `StatusBar` (1)
- `InputBar` (1)
- `InputBar` (1)

### `renderCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1004` | Self: 0.0% (0us) | Total: 1.3% (688.8ms) | Samples: 0

**Called by:**
- `render` (8)

**Calls:**
- `editorViewGetVisualCursor` (4)
- `editorViewGetVisualCursor` (2)
- `unpack` (1)
- `unpack` (1)

### `.wasm-function[68]`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (92.6ms) | Samples: 0

**Called by:**
- `.wasm-function[33]` (1)

**Calls:**
- `.wasm-function[31]` (1)

### `editBufferDeleteRange (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 3.3% (1.76s) | Samples: 0

**Called by:**
- `editBufferDeleteRange` (27)

**Calls:**
- `editBufferDeleteRange` (27)

### `render (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 3.0% (1.58s) | Samples: 0

**Called by:**
- `renderNative` (28)

**Calls:**
- `render` (28)

### `drawEditorView`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:349` | Self: 0.0% (0us) | Total: 0.3% (184.3ms) | Samples: 0

**Called by:**
- `renderSelf` (3)

**Calls:**
- `bufferDrawEditorView` (3)

### `flushPendingEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15889` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `commitRoot` (1)

**Calls:**
- `flushMutationEffects` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:60` | Self: 0.0% (0us) | Total: 0.9% (488.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (114)

**Calls:**
- `emit` (114)

### `requestRender`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:505` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `resetAfterCommit` (1)

**Calls:**
- `requestRender` (1)

### `ReactElement`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:193` | Self: 0.0% (0us) | Total: 0.0% (4.8ms) | Samples: 0

**Called by:**
- `InputBar` (3)
- `react_stack_bottom_frame` (2)

**Calls:**
- `freeze` (5)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14570` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `renderRootSync` (2)

**Calls:**
- `timeStamp` (2)

### `editBufferSetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 4.3% (2.29s) | Samples: 0

**Called by:**
- `editBufferSetCursor` (34)

**Calls:**
- `editBufferSetCursor` (33)
- `(anonymous)` (1)

### `wrap`
`bun:ffi:302` | Self: 0.0% (0us) | Total: 0.0% (45.9ms) | Samples: 0

**Called by:**
- `setCursorPosition` (1)

**Calls:**
- `anonymous` (1)

### `useEffect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18158` | Self: 0.0% (0us) | Total: 0.0% (983us) | Samples: 0

**Called by:**
- `InputBar` (1)

**Calls:**
- `updateEffectImpl` (1)

### `packList`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js:684` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `textBufferSetStyledText` (1)

**Calls:**
- `mapValue` (1)

### `performUnitOfWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15272` | Self: 0.0% (0us) | Total: 0.0% (992us) | Samples: 0

**Called by:**
- `workLoopSync` (1)

**Calls:**
- `startProfilerTimer` (1)

### `StatusBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\status-bar.tsx:10` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `ReactElement` (1)

### `editBufferInsertText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3631` | Self: 0.0% (0us) | Total: 3.1% (1.63s) | Samples: 0

**Called by:**
- `insertText` (17)

**Calls:**
- `editBufferInsertText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (17)

### `TextRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:45` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `createInstance` (2)

**Calls:**
- `updateTextBuffer` (2)

### `push`
`internal:fixed_queue:39` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `nextTick` (1)

**Calls:**
- `isFull` (1)

### `flushMutationEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15611` | Self: 0.0% (0us) | Total: 0.0% (21.0ms) | Samples: 0

**Called by:**
- `commitRoot` (22)

**Calls:**
- `commitMutationEffectsOnFiber` (22)

### `set border`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:148` | Self: 0.0% (0us) | Total: 0.0% (867us) | Samples: 0

**Called by:**
- `setProperty` (1)

**Calls:**
- `getBorderSides` (1)

### `useCommandMenu`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:19` | Self: 0.0% (0us) | Total: 0.0% (928us) | Samples: 0

**Called by:**
- `InputBar` (1)

**Calls:**
- `useState` (1)

### `wrap`
`bun:ffi:293` | Self: 0.0% (0us) | Total: 0.0% (46.7ms) | Samples: 0

**Called by:**
- `bufferGetRealCharSize` (1)

**Calls:**
- `anonymous` (1)

### `setCursorPosition`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2724` | Self: 0.0% (0us) | Total: 0.0% (45.9ms) | Samples: 0

**Called by:**
- `setCursorPosition` (1)

**Calls:**
- `wrap` (1)

### `a`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:63` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `b` (1)

**Calls:**
- `Lb` (1)

### `TextBufferRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:80` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `TextRenderable` (1)

**Calls:**
- `setSyntaxStyle` (1)

### `performUnitOfWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15273` | Self: 0.0% (0us) | Total: 0.1% (53.8ms) | Samples: 0

**Called by:**
- `workLoopSync` (55)

**Calls:**
- `runWithFiberInDEV` (55)

### `internal:streams/end-of-stream`
`internal:streams/end-of-stream:17` | Self: 0.0% (0us) | Total: 0.0% (886us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1752` | Self: 0.0% (0us) | Total: 0.4% (247.8ms) | Samples: 0

**Called by:**
- `async loop` (2)

**Calls:**
- `(anonymous)` (2)

### `textBufferViewMeasureForDimensions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (41.2ms) | Samples: 0

**Called by:**
- `textBufferViewMeasureForDimensions` (2)

**Calls:**
- `textBufferViewMeasureForDimensions` (2)

### `drainStdinParser`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3189` | Self: 0.0% (0us) | Total: 21.5% (11.31s) | Samples: 0

**Called by:**
- `(anonymous)` (175)

**Calls:**
- `drain` (175)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3370` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `processRootScheduleInMicrotask` (2)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 33.2% (17.41s) | Samples: 0

**Called by:**
- `(anonymous)` (254)

**Calls:**
- `evaluate` (272)
- `moduleEvaluation` (5)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4315` | Self: 0.0% (0us) | Total: 4.7% (2.47s) | Samples: 0

**Called by:**
- `(anonymous)` (37)

**Calls:**
- `renderNative` (33)
- `renderNative` (3)
- `renderNative` (1)

### `attemptEarlyBailoutIfNoScheduledUpdate`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:9021` | Self: 0.0% (0us) | Total: 0.0% (14.8ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (14)

**Calls:**
- `pushHostContext` (13)
- `pushHostContext` (1)

### `updateProperties`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:372` | Self: 0.0% (0us) | Total: 0.0% (5.5ms) | Samples: 0

**Called by:**
- `commitUpdate` (6)

**Calls:**
- `setProperty` (6)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts:128` | Self: 0.0% (0us) | Total: 0.2% (137.8ms) | Samples: 0

**Called by:**
- `render` (3)

**Calls:**
- `updateTextFromNodes` (3)

### `handleKeyPress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Textarea.ts:267` | Self: 0.0% (0us) | Total: 0.7% (371.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (8)

**Calls:**
- `getKeyBindingAction` (4)
- `getKeyBindingAction` (4)

### `scheduleUpdateOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14070` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `dispatchSetStateInternal` (2)

**Calls:**
- `warnIfUpdatesNotWrappedWithActDEV` (1)
- `warnIfUpdatesNotWrappedWithActDEV` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:112` | Self: 0.0% (0us) | Total: 0.6% (321.0ms) | Samples: 0

**Called by:**
- `map` (8)

**Calls:**
- `cloneObject` (8)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3061` | Self: 0.0% (0us) | Total: 4.9% (2.56s) | Samples: 0

**Called by:**
- `bound ` (31)

**Calls:**
- `push` (21)
- `push` (5)
- `push` (2)
- `push` (1)
- `push` (1)
- `push` (1)

### `ScrollBoxRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:366` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `createInstance` (1)

**Calls:**
- `ScrollBarRenderable` (1)

### `useTheme`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\providers\theme\index.tsx:25` | Self: 0.0% (0us) | Total: 0.0% (1.6ms) | Samples: 0

**Called by:**
- `InputBar` (2)

**Calls:**
- `useContext` (1)
- `(anonymous)` (1)

### `drawBox`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:465` | Self: 0.0% (0us) | Total: 2.9% (1.53s) | Samples: 0

**Called by:**
- `renderSelf` (12)

**Calls:**
- `bufferDrawBox` (11)
- `bufferDrawBox` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:810` | Self: 0.0% (0us) | Total: 0.0% (963us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `getChildHostContext`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:425` | Self: 0.0% (0us) | Total: 0.0% (12.9ms) | Samples: 0

**Called by:**
- `pushHostContext` (12)

**Calls:**
- `cloneObject` (12)

### `gotoLineHome`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:765` | Self: 0.0% (0us) | Total: 0.2% (141.9ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `editorViewGetCursor` (2)
- `editorViewGetCursor` (1)

### `handleContentChange`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:36` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `dispatchSetState` (1)

### `editorViewGetCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3921` | Self: 0.0% (0us) | Total: 0.1% (95.3ms) | Samples: 0

**Called by:**
- `gotoLineHome` (2)

**Calls:**
- `editorViewGetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (2)

### `recursivelyTraverseMutationEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12141` | Self: 0.0% (0us) | Total: 0.5% (290.0ms) | Samples: 0

**Called by:**
- `commitMutationEffectsOnFiber` (108)
- `commitMutationEffectsOnFiber` (87)
- `commitMutationEffectsOnFiber` (64)
- `commitMutationEffectsOnFiber` (22)
- `commitMutationEffectsOnFiber` (22)

**Calls:**
- `commitMutationEffectsOnFiber` (108)
- `commitMutationEffectsOnFiber` (88)
- `commitMutationEffectsOnFiber` (64)
- `commitMutationEffectsOnFiber` (22)
- `commitMutationEffectsOnFiber` (18)
- `commitMutationEffectsOnFiber` (1)
- `commitMutationEffectsOnFiber` (1)
- `commitMutationEffectsOnFiber` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:188` | Self: 0.0% (0us) | Total: 0.8% (440.0ms) | Samples: 0

**Called by:**
- `emit` (111)

**Calls:**
- `(anonymous)` (61)
- `(anonymous)` (50)

### `handleStdinEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3211` | Self: 0.0% (0us) | Total: 3.4% (1.82s) | Samples: 0

**Called by:**
- `(anonymous)` (24)

**Calls:**
- `processPaste` (24)

### `ScrollBarRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBar.ts:107` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `ScrollBoxRenderable` (1)

**Calls:**
- `Renderable` (1)

### `require`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.1ms) | Samples: 0

**Called by:**
- `bound require` (1)

**Calls:**
- `anonymous` (1)

### `deleteRange`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:163` | Self: 0.0% (0us) | Total: 3.3% (1.76s) | Samples: 0

**Called by:**
- `deleteToLineEnd` (27)

**Calls:**
- `editBufferDeleteRange` (27)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:533` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `setSyntaxStyle`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:205` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `TextBufferRenderable` (1)

**Calls:**
- `textBufferSetSyntaxStyle` (1)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (98.0ms) | Samples: 0

**Called by:**
- `link` (9)
- `linkAndEvaluateModule` (3)

**Calls:**
- `link` (9)
- `moduleDeclarationInstantiation` (3)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12172` | Self: 0.0% (0us) | Total: 0.0% (21.0ms) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (22)

**Calls:**
- `recursivelyTraverseMutationEffects` (22)

### `object`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:581` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodObject` (1)

### `bufferDrawEditorView`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3478` | Self: 0.0% (0us) | Total: 0.3% (184.3ms) | Samples: 0

**Called by:**
- `drawEditorView` (3)

**Calls:**
- `bufferDrawEditorView (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (3)

### `updateFunctionComponent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7736` | Self: 0.0% (0us) | Total: 0.0% (902us) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (1)

**Calls:**
- `reconcileChildren` (1)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:167` | Self: 0.0% (0us) | Total: 3.9% (2.05s) | Samples: 0

**Called by:**
- `async pressKeys` (29)

**Calls:**
- `emit` (25)
- `(anonymous)` (4)

### `dispatchSetStateInternal`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6784` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `dispatchSetState` (2)

**Calls:**
- `scheduleUpdateOnFiber` (2)

### `recursivelyTraverseLayoutEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12653` | Self: 0.0% (0us) | Total: 0.0% (31.6ms) | Samples: 0

**Called by:**
- `commitLayoutEffectOnFiber` (12)
- `commitLayoutEffectOnFiber` (12)
- `commitLayoutEffectOnFiber` (3)
- `commitLayoutEffectOnFiber` (3)
- `commitLayoutEffectOnFiber` (3)

**Calls:**
- `commitLayoutEffectOnFiber` (12)
- `commitLayoutEffectOnFiber` (12)
- `commitLayoutEffectOnFiber` (3)
- `commitLayoutEffectOnFiber` (3)
- `commitLayoutEffectOnFiber` (3)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:247` | Self: 0.0% (0us) | Total: 0.1% (94.3ms) | Samples: 0

**Called by:**
- `emitKeyOrResponse` (1)

**Calls:**
- `test` (1)

### `textBufferSetSyntaxStyle (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `textBufferSetSyntaxStyle` (1)

**Calls:**
- `textBufferSetSyntaxStyle` (1)

### `drawTextBuffer`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:344` | Self: 0.0% (0us) | Total: 4.9% (2.61s) | Samples: 0

**Called by:**
- `renderSelf` (27)

**Calls:**
- `bufferDrawTextBufferView` (27)

### `.wasm-function[177]`
`[native code]` | Self: 0.0% (0us) | Total: 6.4% (3.36s) | Samples: 0

**Called by:**
- `.wasm-function[229]` (69)

**Calls:**
- `wasm-stub` (69)

### `parseBorderStyle`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts:27` | Self: 0.0% (0us) | Total: 0.3% (187.6ms) | Samples: 0

**Called by:**
- `drawBox` (1)

**Calls:**
- `isValidBorderStyle` (1)

### `consumePasteBytes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1914` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `push` (1)

**Calls:**
- `pushPasteBytes` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:4673` | Self: 0.0% (0us) | Total: 0.0% (5.5ms) | Samples: 0

**Called by:**
- `reconcileChildren` (6)

**Calls:**
- `reconcileChildFibersImpl` (5)
- `reconcileChildFibersImpl` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (11.3ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `fetch` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.0% (886us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `setCursorPosition`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3782` | Self: 0.0% (0us) | Total: 0.0% (45.9ms) | Samples: 0

**Called by:**
- `renderCursor` (1)

**Calls:**
- `setCursorPosition` (1)

### `commitUpdate`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:448` | Self: 0.0% (0us) | Total: 0.0% (16.2ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (17)

**Calls:**
- `updateProperties` (7)
- `updateProperties` (6)
- `updateProperties` (4)

### `.wasm-function[33]`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (92.6ms) | Samples: 0

**Called by:**
- `.wasm-function[61]` (1)

**Calls:**
- `.wasm-function[68]` (1)

### `calculateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1801` | Self: 0.0% (0us) | Total: 9.6% (5.04s) | Samples: 0

**Called by:**
- `render` (88)

**Calls:**
- `(anonymous)` (81)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `get height` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2756` | Self: 0.0% (0us) | Total: 0.8% (470.0ms) | Samples: 0

**Called by:**
- `renderNative` (5)

**Calls:**
- `wrap` (5)

### `warnIfUpdatesNotWrappedWithActDEV`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:16304` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `scheduleUpdateOnFiber` (1)

**Calls:**
- `isConcurrentActEnvironment` (1)

### `.wasm-function[40]`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `.wasm-function[61]` (1)

**Calls:**
- `.wasm-function[66]` (1)

### `pushHitGridScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1359` | Self: 0.0% (0us) | Total: 0.5% (281.8ms) | Samples: 0

**Called by:**
- `render` (4)

**Calls:**
- `hitGridPushScissorRect` (4)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3062` | Self: 0.0% (0us) | Total: 21.5% (11.31s) | Samples: 0

**Called by:**
- `bound ` (175)

**Calls:**
- `drainStdinParser` (175)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:717` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `consumePasteBytes` (1)

### `async frameWith`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:24` | Self: 0.0% (0us) | Total: 30.6% (16.05s) | Samples: 0

**Called by:**
- `(module)` (239)

**Calls:**
- `Promise` (239)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3057` | Self: 0.0% (0us) | Total: 0.2% (138.8ms) | Samples: 0

**Called by:**
- `bound ` (1)

**Calls:**
- `(anonymous)` (1)

### `getOpenTUILib`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:142` | Self: 0.0% (0us) | Total: 0.2% (106.9ms) | Samples: 0

**Called by:**
- `FFIRenderLib` (11)

**Calls:**
- `dlopen` (11)

### `getRealCharBytes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:158` | Self: 0.0% (0us) | Total: 0.0% (46.7ms) | Samples: 0

**Called by:**
- `captureCharFrame` (1)

**Calls:**
- `bufferGetRealCharSize` (1)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (144.3ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (10)
- `async asyncModuleEvaluation` (5)

**Calls:**
- `moduleEvaluation` (10)
- `evaluate` (5)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4347` | Self: 0.0% (0us) | Total: 0.8% (457.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (6)

**Calls:**
- `setTimeout` (6)

### `editBufferInsertText (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 3.1% (1.63s) | Samples: 0

**Called by:**
- `editBufferInsertText` (17)

**Calls:**
- `editBufferInsertText` (16)
- `(anonymous)` (1)

### `getEOL`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:243` | Self: 0.0% (0us) | Total: 0.2% (139.1ms) | Samples: 0

**Called by:**
- `deleteToLineEnd` (3)

**Calls:**
- `editBufferGetEOL` (2)
- `unpack` (1)

### `nextTick`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `requestRender` (1)

**Calls:**
- `push` (1)

### `setStyledText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:91` | Self: 0.0% (0us) | Total: 0.0% (843us) | Samples: 0

**Called by:**
- `updateTextBuffer` (1)

**Calls:**
- `textBufferGetLength (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `set border`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:149` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `setProperty` (2)

**Calls:**
- `applyYogaBorders` (1)
- `applyYogaBorders` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:35` | Self: 0.0% (0us) | Total: 30.6% (16.05s) | Samples: 0

**Called by:**
- `evaluate` (239)

**Calls:**
- `async frameWith` (239)

### `editBufferDeleteRange`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3649` | Self: 0.0% (0us) | Total: 3.3% (1.76s) | Samples: 0

**Called by:**
- `deleteRange` (27)

**Calls:**
- `editBufferDeleteRange (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (27)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1437` | Self: 0.0% (0us) | Total: 0.1% (95.8ms) | Samples: 0

**Called by:**
- `updateLayout` (4)

**Calls:**
- `updateLayout` (2)
- `updateLayout` (1)
- `updateLayout` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4380` | Self: 0.0% (0us) | Total: 0.3% (186.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `resolveIdleIfNeeded` (1)

### `captureCharFrame`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\test-renderer.ts:229` | Self: 0.0% (0us) | Total: 8.4% (4.41s) | Samples: 0

**Called by:**
- `frame` (46)

**Calls:**
- `getRealCharBytes` (23)
- `getRealCharBytes` (17)
- `slice` (5)
- `getRealCharBytes` (1)

### `jsxDEVImpl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:214` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `freeze` (1)

### `setCursorStyleOptions`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2752` | Self: 0.0% (0us) | Total: 0.7% (383.4ms) | Samples: 0

**Called by:**
- `setCursorStyle` (5)

**Calls:**
- `setCursorStyleOptions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (5)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1434` | Self: 0.0% (0us) | Total: 0.3% (188.5ms) | Samples: 0

**Called by:**
- `updateLayout` (3)

**Calls:**
- `Set` (3)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4319` | Self: 0.0% (0us) | Total: 0.0% (29.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getHitGridDirty (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:27` | Self: 0.0% (0us) | Total: 30.0% (15.74s) | Samples: 0

**Called by:**
- `Promise` (235)

**Calls:**
- `(anonymous)` (232)
- `addListener` (2)
- `addListener` (1)

### `read`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:47` | Self: 0.0% (0us) | Total: 0.0% (46.5ms) | Samples: 0

**Called by:**
- `fromWireType` (1)

**Calls:**
- `wasm-stub` (1)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11488` | Self: 0.0% (0us) | Total: 0.0% (11.4ms) | Samples: 0

**Called by:**
- `recursivelyTraverseLayoutEffects` (12)

**Calls:**
- `recursivelyTraverseLayoutEffects` (12)

### `deleteToLineEnd`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:842` | Self: 0.0% (0us) | Total: 0.2% (139.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)

**Calls:**
- `getEOL` (3)

### `wrap`
`bun:ffi:296` | Self: 0.0% (0us) | Total: 0.8% (470.0ms) | Samples: 0

**Called by:**
- `render` (5)

**Calls:**
- `anonymous` (5)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12159` | Self: 0.0% (0us) | Total: 0.0% (878us) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (1)

**Calls:**
- `commitHookEffectListUnmount` (1)

### `updateFunctionComponent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:7720` | Self: 0.0% (0us) | Total: 0.0% (23.7ms) | Samples: 0

**Called by:**
- `runWithFiberInDEV` (25)

**Calls:**
- `renderWithHooks` (24)
- `renderWithHooks` (1)

### `handleStdinEvent`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3201` | Self: 0.0% (0us) | Total: 15.4% (8.07s) | Samples: 0

**Called by:**
- `(anonymous)` (132)

**Calls:**
- `processParsedKey` (132)

### `updateSelectionForMovement`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1155` | Self: 0.0% (0us) | Total: 0.0% (958us) | Samples: 0

**Called by:**
- `gotoLineHome` (1)

**Calls:**
- `clearSelection` (1)

### `.wasm-function[229]`
`[native code]` | Self: 0.0% (0us) | Total: 6.4% (3.36s) | Samples: 0

**Called by:**
- `.wasm-function[61]` (69)

**Calls:**
- `.wasm-function[177]` (69)

### `async (anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\animation\Timeline.ts:516` | Self: 0.0% (0us) | Total: 0.0% (46.8ms) | Samples: 0

**Called by:**
- `async loop` (2)

**Calls:**
- `update` (2)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1758` | Self: 0.0% (0us) | Total: 5.3% (2.80s) | Samples: 0

**Called by:**
- `async loop` (40)

**Calls:**
- `updateLayout` (38)
- `updateLayout` (1)
- `updateLayout` (1)

### `gotoLineHome`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:771` | Self: 0.0% (0us) | Total: 6.4% (3.36s) | Samples: 0

**Called by:**
- `(anonymous)` (56)

**Calls:**
- `setCursor` (56)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.0% (16.0ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `anonymous` (2)

### `getKeyBindingAction`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:119` | Self: 0.0% (0us) | Total: 0.1% (94.5ms) | Samples: 0

**Called by:**
- `handleKeyPress` (4)

**Calls:**
- `map` (4)

### `updateLayout`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1433` | Self: 0.0% (0us) | Total: 0.7% (374.0ms) | Samples: 0

**Called by:**
- `updateLayout` (6)

**Calls:**
- `_getVisibleChildren` (5)
- `map` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\TextBufferRenderable.ts:491` | Self: 0.0% (0us) | Total: 4.9% (2.61s) | Samples: 0

**Called by:**
- `render` (27)

**Calls:**
- `renderSelf` (27)

### `measureFunc`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:958` | Self: 0.0% (0us) | Total: 6.0% (3.16s) | Samples: 0

**Called by:**
- `measure` (58)

**Calls:**
- `textBufferViewMeasureForDimensions` (54)
- `textBufferViewMeasureForDimensions` (2)
- `textBufferViewMeasureForDimensions` (2)

### `onUpdate`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:428` | Self: 0.0% (0us) | Total: 0.0% (47.8ms) | Samples: 0

**Called by:**
- `updateLayout` (1)

**Calls:**
- `handleAutoScroll` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js:1006` | Self: 0.0% (0us) | Total: 0.0% (11.6ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `validateChildKeys` (1)

### `dlopen`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\platform\ffi.ts:319` | Self: 0.0% (0us) | Total: 0.2% (106.9ms) | Samples: 0

**Called by:**
- `getOpenTUILib` (11)

**Calls:**
- `dlopen` (11)

### `requestRender`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1448` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `requestRender` (1)

**Calls:**
- `nextTick` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:250` | Self: 0.0% (0us) | Total: 0.6% (358.1ms) | Samples: 0

**Called by:**
- `emitKeyOrResponse` (2)

**Calls:**
- `startsWith` (2)

### `commitHookLayoutUnmountEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:10835` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `commitMutationEffectsOnFiber` (1)

**Calls:**
- `startEffectTimer` (1)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:32` | Self: 0.0% (0us) | Total: 0.0% (912us) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `useRenderer` (1)

### `dispatchSetState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6741` | Self: 0.0% (0us) | Total: 0.0% (1.9ms) | Samples: 0

**Called by:**
- `bound dispatchSetState` (2)

**Calls:**
- `dispatchSetStateInternal` (2)

### `prepareFreshStack`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:14755` | Self: 0.0% (0us) | Total: 0.0% (6.7ms) | Samples: 0

**Called by:**
- `renderRootSync` (7)

**Calls:**
- `measure` (7)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:139` | Self: 0.0% (0us) | Total: 0.0% (2.0ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (2)

**Calls:**
- `ReactElement` (1)
- `(anonymous)` (1)

### `set customBorderChars`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:125` | Self: 0.0% (0us) | Total: 0.0% (1.8ms) | Samples: 0

**Called by:**
- `setProperty` (2)

**Calls:**
- `borderCharsToArray` (1)
- `borderCharsToArray` (1)

### `insertText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:647` | Self: 0.0% (0us) | Total: 0.2% (143.1ms) | Samples: 0

**Called by:**
- `handlePaste` (4)

**Calls:**
- `hasSelection` (3)
- `hasSelection` (1)

### `.wasm-function[182]`
`[native code]` | Self: 0.0% (0us) | Total: 8.6% (4.53s) | Samples: 0

**Called by:**
- `(unknown)` (52)
- `wasm-stub` (28)

**Calls:**
- `.wasm-function[220]` (80)

### `editorViewGetCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (95.3ms) | Samples: 0

**Called by:**
- `editorViewGetCursor` (2)

**Calls:**
- `(anonymous)` (1)
- `editorViewGetCursor` (1)

### `textBufferSetStyledText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3103` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `setStyledText` (1)

**Calls:**
- `packList` (1)

### `completeUnitOfWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15409` | Self: 0.0% (0us) | Total: 0.0% (34.5ms) | Samples: 0

**Called by:**
- `performUnitOfWork` (8)

**Calls:**
- `runWithFiberInDEV` (8)

### `stopProfilerTimerIfRunningAndRecordDuration`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3103` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `performUnitOfWork` (1)

**Calls:**
- `(anonymous)` (1)

### `ScrollBoxRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\ScrollBox.ts:339` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `createInstance` (1)

**Calls:**
- `BoxRenderable` (1)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:106` | Self: 0.0% (0us) | Total: 0.0% (983us) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `useEffect` (1)

### `Mb`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:67` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `Lb` (1)

**Calls:**
- `a` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js:335` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `InputBar` (1)

**Calls:**
- `getTaskName` (1)

### `performUnitOfWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15280` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `workLoopSync` (1)

**Calls:**
- `stopProfilerTimerIfRunningAndRecordDuration` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2203` | Self: 0.0% (0us) | Total: 1.2% (630.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (118)

**Calls:**
- `(anonymous)` (114)
- `(anonymous)` (4)

### `deleteToLineEnd`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:845` | Self: 0.0% (0us) | Total: 3.3% (1.76s) | Samples: 0

**Called by:**
- `(anonymous)` (27)

**Calls:**
- `deleteRange` (27)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:79` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `object` (1)

### `setupYogaProperties`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:778` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `Renderable` (1)

**Calls:**
- `setupMarginAndPadding` (1)

### `useState`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:18208` | Self: 0.0% (0us) | Total: 0.0% (928us) | Samples: 0

**Called by:**
- `useCommandMenu` (1)

**Calls:**
- `updateReducerImpl` (1)

### `processPaste`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts:123` | Self: 0.0% (0us) | Total: 3.4% (1.82s) | Samples: 0

**Called by:**
- `handleStdinEvent` (24)

**Calls:**
- `emitWithPriority` (21)
- `emitWithPriority` (2)
- `PasteEvent` (1)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.0% (886us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `updateEffectImpl`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:6297` | Self: 0.0% (0us) | Total: 0.0% (983us) | Samples: 0

**Called by:**
- `useEffect` (1)

**Calls:**
- `areHookInputsEqual` (1)

### `bufferPushScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3986` | Self: 0.0% (0us) | Total: 0.0% (42.9ms) | Samples: 0

**Called by:**
- `pushScissorRect` (1)

**Calls:**
- `bufferPushScissorRect (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15586` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `commitRootWhenReady` (3)

**Calls:**
- `flushLayoutEffects` (3)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:166` | Self: 0.0% (0us) | Total: 0.0% (6.7ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (7)

**Calls:**
- `(anonymous)` (4)
- `ReactElement` (3)

### `applyYogaBorders`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:296` | Self: 0.0% (0us) | Total: 0.0% (990us) | Samples: 0

**Called by:**
- `set border` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:413` | Self: 0.0% (0us) | Total: 3.3% (1.77s) | Samples: 0

**Called by:**
- `emitWithPriority` (21)

**Calls:**
- `handlePaste` (21)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3190` | Self: 0.0% (0us) | Total: 21.5% (11.31s) | Samples: 0

**Called by:**
- `drain` (175)

**Calls:**
- `handleStdinEvent` (132)
- `handleStdinEvent` (24)
- `handleStdinEvent` (18)
- `handleStdinEvent` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1777` | Self: 0.0% (0us) | Total: 0.6% (316.9ms) | Samples: 0

**Called by:**
- `async loop` (4)

**Calls:**
- `popHitGridScissorRect` (4)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.0% (16.1ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `anonymous` (2)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:173` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (2)

**Calls:**
- `ReactElement` (2)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11705` | Self: 0.0% (0us) | Total: 0.0% (11.4ms) | Samples: 0

**Called by:**
- `recursivelyTraverseLayoutEffects` (12)

**Calls:**
- `recursivelyTraverseLayoutEffects` (12)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:43` | Self: 0.0% (0us) | Total: 0.0% (928us) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `useCommandMenu` (1)

### `.wasm-function[143]`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `.wasm-function[109]` (1)

**Calls:**
- `wasm-stub` (1)

### `getObjectsInViewport`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts:99` | Self: 0.0% (0us) | Total: 0.1% (95.7ms) | Samples: 0

**Called by:**
- `_getVisibleChildren` (1)

**Calls:**
- `screenY` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4334` | Self: 0.0% (0us) | Total: 10.9% (5.71s) | Samples: 0

**Called by:**
- `(anonymous)` (68)

**Calls:**
- `emit` (64)
- `emit` (4)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (31.3ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (3)

**Calls:**
- `link` (3)

### `FFIRenderLib`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2119` | Self: 0.0% (0us) | Total: 0.2% (125.0ms) | Samples: 0

**Called by:**
- `(module)` (15)

**Calls:**
- `getOpenTUILib` (11)
- `getOpenTUILib` (4)

### `insertText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:651` | Self: 0.0% (0us) | Total: 3.1% (1.63s) | Samples: 0

**Called by:**
- `handlePaste` (17)

**Calls:**
- `insertText` (17)

### `async pressKeys`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts:163` | Self: 0.0% (0us) | Total: 3.9% (2.05s) | Samples: 0

**Called by:**
- `(anonymous)` (30)

**Calls:**
- `async (anonymous)` (29)
- `async (anonymous)` (1)

### `pushScissorRect`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:482` | Self: 0.0% (0us) | Total: 0.0% (42.9ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `bufferPushScissorRect` (1)

### `renderRootSync`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15080` | Self: 0.0% (0us) | Total: 0.1% (90.4ms) | Samples: 0

**Called by:**
- `performWorkOnRoot` (65)

**Calls:**
- `workLoopSync` (65)

### `frame`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx:26` | Self: 0.0% (0us) | Total: 10.5% (5.53s) | Samples: 0

**Called by:**
- `emit` (64)

**Calls:**
- `captureCharFrame` (46)
- `decode` (12)
- `removeListener` (2)
- `removeListener` (2)
- `(anonymous)` (1)
- `clearTimeout` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\team.ts:51` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `_array` (1)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11605` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `recursivelyTraverseLayoutEffects` (3)

**Calls:**
- `recursivelyTraverseLayoutEffects` (3)

### `editorViewGetSelection (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (97.3ms) | Samples: 0

**Called by:**
- `editorViewGetSelection` (3)

**Calls:**
- `editorViewGetSelection` (2)
- `(anonymous)` (1)

### `flushSpawnedWork`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15868` | Self: 0.0% (0us) | Total: 0.0% (881us) | Samples: 0

**Called by:**
- `commitRoot` (1)

**Calls:**
- `flushSyncWorkAcrossRoots_impl` (1)

### `resolveIdleIfNeeded`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:1501` | Self: 0.0% (0us) | Total: 0.3% (186.1ms) | Samples: 0

**Called by:**
- `async loop` (1)

**Calls:**
- `isIdleNow` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4323` | Self: 0.0% (0us) | Total: 0.2% (137.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `now` (1)

### `getKeyBindingKeys`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:105` | Self: 0.0% (0us) | Total: 0.0% (44.6ms) | Samples: 0

**Called by:**
- `matchesKeyBinding` (1)

**Calls:**
- `Set` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:217` | Self: 0.0% (0us) | Total: 0.0% (1.0ms) | Samples: 0

**Called by:**
- `emitKeyOrResponse` (1)

**Calls:**
- `(anonymous)` (1)

### `StatusBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\status-bar.tsx:9` | Self: 0.0% (0us) | Total: 0.0% (890us) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (1)

**Calls:**
- `sanitize` (1)

### `drawBox`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts:455` | Self: 0.0% (0us) | Total: 0.3% (187.6ms) | Samples: 0

**Called by:**
- `renderSelf` (1)

**Calls:**
- `parseBorderStyle` (1)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:243` | Self: 0.0% (0us) | Total: 0.1% (93.3ms) | Samples: 0

**Called by:**
- `emitKeyOrResponse` (1)

**Calls:**
- `test` (1)

### `setStyledText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\text-buffer.ts:89` | Self: 0.0% (0us) | Total: 0.0% (995us) | Samples: 0

**Called by:**
- `updateTextBuffer` (1)

**Calls:**
- `textBufferSetStyledText` (1)

### `InputBar`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\input-bar.tsx:129` | Self: 0.0% (0us) | Total: 0.0% (3.0ms) | Samples: 0

**Called by:**
- `react_stack_bottom_frame` (3)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (1)

### `commitLayoutEffectOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:11493` | Self: 0.0% (0us) | Total: 0.0% (2.8ms) | Samples: 0

**Called by:**
- `recursivelyTraverseLayoutEffects` (3)

**Calls:**
- `recursivelyTraverseLayoutEffects` (3)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js:581` | Self: 0.0% (0us) | Total: 0.0% (11.6ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `(anonymous)` (1)

### `wrap`
`bun:ffi:308` | Self: 0.0% (0us) | Total: 0.9% (491.0ms) | Samples: 0

**Called by:**
- `addToHitGrid` (7)

**Calls:**
- `anonymous` (7)

### `renderCursor`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:1011` | Self: 0.0% (0us) | Total: 0.0% (45.9ms) | Samples: 0

**Called by:**
- `render` (1)

**Calls:**
- `setCursorPosition` (1)

### `ZodLiteral`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` | Self: 0.0% (0us) | Total: 0.0% (963us) | Samples: 0

**Called by:**
- `literal` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js:373` | Self: 0.0% (0us) | Total: 0.0% (856us) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `_int` (1)

### `push`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:729` | Self: 0.0% (0us) | Total: 0.8% (423.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (5)

**Calls:**
- `subarray` (4)
- `append` (1)

### `hasSelection`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\editor-view.ts:102` | Self: 0.0% (0us) | Total: 0.2% (143.1ms) | Samples: 0

**Called by:**
- `hasSelection` (3)
- `insertText` (1)

**Calls:**
- `editorViewGetSelection` (4)

### `editorViewGetVisualCursor (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (44.9ms) | Samples: 0

**Called by:**
- `editorViewGetVisualCursor` (1)

**Calls:**
- `editorViewGetVisualCursor` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4284` | Self: 0.0% (0us) | Total: 5.9% (3.13s) | Samples: 0

**Called by:**
- `async loop` (31)

**Calls:**
- `from` (29)
- `values` (2)

### `Lb`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js:66` | Self: 0.0% (0us) | Total: 0.0% (14.9ms) | Samples: 0

**Called by:**
- `a` (1)

**Calls:**
- `Mb` (1)

### `textBufferSetSyntaxStyle`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:3420` | Self: 0.0% (0us) | Total: 0.0% (15.9ms) | Samples: 0

**Called by:**
- `setSyntaxStyle` (1)

**Calls:**
- `textBufferSetSyntaxStyle (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)` (1)

### `BoxRenderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Box.ts:72` | Self: 0.0% (0us) | Total: 0.0% (13.2ms) | Samples: 0

**Called by:**
- `ScrollBoxRenderable` (1)

**Calls:**
- `Renderable` (1)

### `workLoopSync`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15099` | Self: 0.0% (0us) | Total: 0.1% (90.4ms) | Samples: 0

**Called by:**
- `renderRootSync` (65)

**Calls:**
- `performUnitOfWork` (55)
- `performUnitOfWork` (8)
- `performUnitOfWork` (1)
- `performUnitOfWork` (1)

### `pushPasteBytes`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:1929` | Self: 0.0% (0us) | Total: 0.0% (982us) | Samples: 0

**Called by:**
- `consumePasteBytes` (1)

**Calls:**
- `from` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1459` | Self: 0.0% (0us) | Total: 3.5% (1.85s) | Samples: 0

**Called by:**
- `render` (14)

**Calls:**
- `renderSelf` (13)
- `renderSelf` (1)

### `insertText`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts:148` | Self: 0.0% (0us) | Total: 3.1% (1.63s) | Samples: 0

**Called by:**
- `insertText` (17)

**Calls:**
- `editBufferInsertText` (17)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12332` | Self: 0.0% (0us) | Total: 0.0% (21.0ms) | Samples: 0

**Called by:**
- `flushMutationEffects` (22)

**Calls:**
- `recursivelyTraverseMutationEffects` (22)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12165` | Self: 0.0% (0us) | Total: 0.0% (962us) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (1)

**Calls:**
- `commitHookLayoutUnmountEffects` (1)

### `setCursorStyle`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:3786` | Self: 0.0% (0us) | Total: 2.5% (1.32s) | Samples: 0

**Called by:**
- `renderCursor` (16)

**Calls:**
- `setCursorStyleOptions` (10)
- `setCursorStyleOptions` (5)
- `setCursorStyleOptions` (1)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12284` | Self: 0.0% (0us) | Total: 0.0% (17.2ms) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (18)

**Calls:**
- `commitHostUpdate` (18)

### `.wasm-function[220]`
`[native code]` | Self: 0.0% (0us) | Total: 8.6% (4.53s) | Samples: 0

**Called by:**
- `.wasm-function[182]` (80)

**Calls:**
- `.wasm-function[61]` (80)

### `drain`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts:780` | Self: 0.0% (0us) | Total: 21.5% (11.31s) | Samples: 0

**Called by:**
- `drainStdinParser` (175)

**Calls:**
- `(anonymous)` (175)

### `Renderable`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:299` | Self: 0.0% (0us) | Total: 0.0% (866us) | Samples: 0

**Called by:**
- `ScrollBarRenderable` (1)

**Calls:**
- `applyEventOptions` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts:184` | Self: 0.0% (0us) | Total: 0.0% (48.4ms) | Samples: 0

**Called by:**
- `emit` (3)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `startProfilerTimer`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3098` | Self: 0.0% (0us) | Total: 0.0% (992us) | Samples: 0

**Called by:**
- `performUnitOfWork` (1)

**Calls:**
- `(anonymous)` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 87.7% (45.97s) | Samples: 0

**Calls:**
- `(anonymous)` (750)

### `wrap`
`bun:ffi:299` | Self: 0.0% (0us) | Total: 2.0% (1.06s) | Samples: 0

**Called by:**
- `editBufferSetCursor` (22)

**Calls:**
- `anonymous` (22)

### `parseKeypress`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts:324` | Self: 0.0% (0us) | Total: 0.0% (46.5ms) | Samples: 0

**Called by:**
- `emitKeyOrResponse` (1)

**Calls:**
- `exec` (1)

### `bufferGetRealCharSize`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts:2449` | Self: 0.0% (0us) | Total: 0.0% (46.7ms) | Samples: 0

**Called by:**
- `getRealCharBytes` (1)

**Calls:**
- `wrap` (1)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1753` | Self: 0.0% (0us) | Total: 9.6% (5.04s) | Samples: 0

**Called by:**
- `async loop` (88)

**Calls:**
- `calculateLayout` (88)

### `render`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts:1741` | Self: 0.0% (0us) | Total: 0.2% (137.8ms) | Samples: 0

**Called by:**
- `async loop` (3)

**Calls:**
- `(anonymous)` (3)

### `matchesKeyBinding`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts:131` | Self: 0.0% (0us) | Total: 0.1% (94.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `getKeyBindingKey` (1)
- `getKeyBindingKey` (1)

### `processRootScheduleInMicrotask`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:3218` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `scheduleTaskForRootDuringMicrotask` (1)
- `scheduleTaskForRootDuringMicrotask` (1)

### `(anonymous)`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js:828` | Self: 0.0% (0us) | Total: 0.0% (966us) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `async loop`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts:4297` | Self: 0.0% (0us) | Total: 0.0% (46.8ms) | Samples: 0

**Called by:**
- `async loop` (2)

**Calls:**
- `async (anonymous)` (2)

### `commitMutationEffectsOnFiber`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:12262` | Self: 0.0% (0us) | Total: 0.1% (61.4ms) | Samples: 0

**Called by:**
- `recursivelyTraverseMutationEffects` (64)

**Calls:**
- `recursivelyTraverseMutationEffects` (64)

### `flushMutationEffects`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15613` | Self: 0.0% (0us) | Total: 0.0% (30.6ms) | Samples: 0

**Called by:**
- `commitRoot` (1)

**Calls:**
- `resetAfterCommit` (1)

### `(module)`
`C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\workflow.ts:20` | Self: 0.0% (0us) | Total: 0.0% (963us) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `literal` (1)

### `ZodArray`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js:40` | Self: 0.0% (0us) | Total: 0.0% (15.3ms) | Samples: 0

**Called by:**
- `_array` (1)

**Calls:**
- `init` (1)

### `handleContentChange`
`C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts:52` | Self: 0.0% (0us) | Total: 0.0% (1.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `close` (1)
- `close` (1)

### `commitRoot`
`C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js:15585` | Self: 0.0% (0us) | Total: 0.0% (51.6ms) | Samples: 0

**Called by:**
- `commitRootWhenReady` (23)

**Calls:**
- `flushMutationEffects` (22)
- `flushMutationEffects` (1)

### `setCursorStyleOptions (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (383.4ms) | Samples: 0

**Called by:**
- `setCursorStyleOptions` (5)

**Calls:**
- `(anonymous)` (3)
- `setCursorStyleOptions` (2)

### `textBufferGetLength (C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core-win32-x64@0.3.0\node_modules\@opentui\core-win32-x64\opentui.dll)`
`[native code]` | Self: 0.0% (0us) | Total: 0.0% (843us) | Samples: 0

**Called by:**
- `setStyledText` (1)

**Calls:**
- `(anonymous)` (1)

### `removeListener`
`node:events:223` | Self: 0.0% (0us) | Total: 0.4% (230.0ms) | Samples: 0

**Called by:**
- `frame` (2)

**Calls:**
- `shift` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 54.9% | 28.80s | `[native code]` |
| 9.7% | 5.08s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\zig.ts` |
| 5.5% | 2.89s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer.ts` |
| 3.5% | 1.87s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\buffer.ts` |
| 3.4% | 1.78s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\Renderable.ts` |
| 3.0% | 1.58s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-081xws23.js` |
| 2.5% | 1.33s | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\binaries\yoga-wasm-base64-esm.js` |
| 2.4% | 1.30s | `node:events` |
| 1.7% | 891.3ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\KeyHandler.ts` |
| 1.5% | 799.0ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\bun-ffi-structs@0.2.2+1fb4c65d43e298b9\node_modules\bun-ffi-structs\dist\index.js` |
| 1.4% | 749.0ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\stdin-parser.ts` |
| 1.2% | 630.6ms | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\bench\interaction.tsx` |
| 1.1% | 604.5ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\keybinding.internal.ts` |
| 1.0% | 559.1ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress.ts` |
| 0.9% | 482.0ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\terminal-capability-detection.ts` |
| 0.8% | 469.6ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\testing\mock-keys.ts` |
| 0.8% | 429.6ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\clock.ts` |
| 0.6% | 323.1ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderer-theme-mode.ts` |
| 0.4% | 235.6ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\testing.js` |
| 0.3% | 189.4ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\border.ts` |
| 0.3% | 188.3ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\EditBufferRenderable.ts` |
| 0.3% | 187.3ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\parse.keypress-kitty.ts` |
| 0.2% | 156.7ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\edit-buffer.ts` |
| 0.2% | 141.6ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\.bun\yoga-layout@3.2.1\node_modules\yoga-layout\dist\src\wrapAssembly.js` |
| 0.2% | 139.5ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\lib\objects-in-viewport.ts` |
| 0.2% | 137.8ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\src\renderables\Text.ts` |
| 0.1% | 95.4ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\index.js` |
| 0.1% | 89.3ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react-reconciler@0.33.0+d86b59289c1a13ae\node_modules\react-reconciler\cjs\react-reconciler.development.js` |
| 0.0% | 48.1ms | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\app.tsx` |
| 0.0% | 47.8ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+core@0.3.0+64015adf11caec84\node_modules\@opentui\core\index-sq86yyfz.js` |
| 0.0% | 46.7ms | `bun:ffi` |
| 0.0% | 30.6ms | `internal:fixed_queue` |
| 0.0% | 15.3ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\classic\schemas.js` |
| 0.0% | 13.7ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\@opentui+react@0.3.0+267ab26c85dbf0e3\node_modules\@opentui\react\chunk-w83f8rxy.js` |
| 0.0% | 12.4ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react.development.js` |
| 0.0% | 5.0ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\react@19.2.6\node_modules\react\cjs\react-jsx-dev-runtime.development.js` |
| 0.0% | 2.8ms | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\scheduler@0.27.0\node_modules\scheduler\cjs\scheduler.development.js` |
| 0.0% | 966us | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\schemas.js` |
| 0.0% | 890us | `C:\Users\tocha\projects\sistema-zero-tui\packages\agent-core\src\contracts.ts` |
| 0.0% | 856us | `C:\Users\tocha\projects\sistema-zero-tui\node_modules\.bun\zod@4.3.6\node_modules\zod\v4\core\core.js` |
| 0.0% | 831us | `C:\Users\tocha\projects\sistema-zero-tui\packages\tui\src\components\command-menu\use-command-menu.ts` |
