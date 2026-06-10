// Entry de Web Worker do editor base do Monaco. O módulo do monaco-editor se
// auto-bootstrapa por side effect (registra o onmessage no escopo do worker);
// este wrapper existe para que `new Worker(new URL('./workers/editor.worker.ts',
// import.meta.url))` seja um caminho RELATIVO analisável estaticamente por
// Vite, Turbopack e webpack (bare specifier dentro de new URL() não resolve no
// Vite). Ver workers.ts.
import 'monaco-editor/esm/vs/editor/editor.worker.js'
