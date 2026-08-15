import type { ExtensionManifest } from '#extensions'

export const gameKitManifest: ExtensionManifest = {
  id: 'game-2d-advanced',
  name: 'Jogo 2D Avançado',
  version: '0.60.0',
  description:
    'Um motor completo para jogos 2D em blocos: simulação suave, ações para teclado, toque e controle, campanhas com fases pintáveis, saves e repetições, além de estados, física, câmera, som e efeitos. Inclui kits de plataforma, RPG, monstrinhos, luta, nave, defesa de torre e cartas.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões e jogos apontáveis. Audio: sons e efeitos. Storage: saves
  // e valores persistentes usam o shim isolado por projeto do preview.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  // ⭐ RESUMO, não o manual. O manual inteiro (48k chars) vive no `docs.ts` e
  // entra por PROVIDER preguiçoso no `index.ts`, como o irmão do g2d já fazia:
  // eager ele viajava no chunk de entrada da extensão e custava 50 KB crus (21%
  // do bundle) a todo mundo que apenas ABRE a lista de extensões.
  docs: 'Motor completo de jogos 2D em blocos: telas, estados, física, câmera, som, efeitos e os kits de gênero. Abra “Saiba mais” para o manual completo.',
}
