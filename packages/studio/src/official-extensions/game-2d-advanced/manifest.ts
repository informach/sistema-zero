import type { ExtensionManifest } from '#extensions'
import { gameKitDocs } from './docs'
import { gameKitExamples } from './exampleCatalog'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.53.0',
  description:
    'A base de um jogo profissional em blocos: estados, telas, tempo, enxames, colisão, física, câmera, som e efeitos. Inclui sete kits prontos: 🏃 plataforma, 🧙 RPG com mapas autorais, 👾 monstrinhos, 🥊 luta, 🚀 nave, 🏰 defesa de torre e 🃏 cartas. Use os kits para começar e as peças de motor para inventar qualquer jogo 2D.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões e jogos apontáveis. Audio: sons e efeitos. Storage: saves
  // e valores persistentes usam o shim isolado por projeto do preview.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: gameKitDocs,
  examples: [...gameKitExamples],
}
