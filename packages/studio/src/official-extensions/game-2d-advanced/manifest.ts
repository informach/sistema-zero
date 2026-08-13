import type { ExtensionManifest } from '#extensions'
import { gameKitDocs } from './docs'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.59.0',
  description:
    'Um motor completo para jogos 2D em blocos: simulação suave, ações para teclado, toque e controle, campanhas com fases pintáveis, saves e repetições, além de estados, física, câmera, som e efeitos. Inclui kits de plataforma, RPG, monstrinhos, luta, nave, defesa de torre e cartas.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões e jogos apontáveis. Audio: sons e efeitos. Storage: saves
  // e valores persistentes usam o shim isolado por projeto do preview.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: gameKitDocs,
}
