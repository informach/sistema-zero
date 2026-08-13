import type { ExtensionManifest } from '#extensions'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.76.0',
  description:
    'Blocos para crianças criarem jogos 2D no Canvas: sprites, movimento, mapas, Mundos com câmera, Fases opcionais, colisões, HUD acessível, som, inimigos e kits prontos.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: listeners de pointer (onPointer). Audio: Web Audio em playSound.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: 'Monte jogos 2D com sprites, controles, colisões, mapas, Mundos, Fases, inimigos e kits. Abra “Saiba mais” para ver o manual completo e as receitas.',
}
