'use client'

import { RuntimeLoader } from '@rive-app/react-canvas'

/**
 * ⚠️⚠️ O WASM vem da NOSSA origem, e o CDN fica DESLIGADO. Sem estas duas linhas o
 * runtime busca `https://unpkg.com/@rive-app/canvas@<versão>/rive.wasm` (fallback no
 * jsdelivr) e a criança baixa código executável de host de terceiro, no caminho de
 * render. `scripts/sync-rive-wasm.ts` põe o binário em `public/rive/` no `dev` e no
 * `build`; o `enableRiveAssetCDN: false` de cada consumidor fecha a mesma porta para
 * os ASSETS (imagem/fonte/áudio) embutidos no `.riv`.
 *
 * ⚠️ Módulo próprio porque são DOIS consumidores (`mascot-rive-canvas` e
 * `trail-rive-canvas`): duas cópias de uma decisão de segurança é como uma delas
 * apodrece. Importar pelo efeito colateral basta — o ES module roda antes do corpo
 * de quem importa, e ambos os consumidores são `ssr:false`, então isto só existe no
 * navegador e sempre antes da primeira instância.
 */
RuntimeLoader.setWasmUrl('/rive/rive.wasm')
RuntimeLoader.setWasmFallbackUrl(null)
