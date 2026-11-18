/**
 * Os tetos do editor de mapa que não moram em `PINTA_LIMITS` (as ferramentas novas do mapa).
 * Ficam todos AQUI, com nome, para nenhum número solto aparecer no meio de um painel.
 */
export const MAP_EDITOR_LIMITS = {
  /** Quadros de uma peça animada. */
  maxTileAnimationFrames: 64,
  /** Duração de um quadro, em milissegundos. */
  minFrameDurationMs: 16,
  maxFrameDurationMs: 60_000,
  defaultFrameDurationMs: 150,
  /** Cores (tipos de chão) de um terreno inteligente. */
  maxTerrainColors: 15,
  /** Pontos de um polígono ou de uma linha de objeto. */
  maxObjectPoints: 256,
  minPolygonPoints: 3,
  minPolylinePoints: 2,
  /** Mapas ligados por portas num mesmo teste. */
  maxPlaytestMaps: 16,
  /** Menor alvo de toque, em px de tela. */
  touchTargetPx: 44,
} as const
