/** Limites do contrato legado, usados pelo produtor e pelo consumidor. Não ampliam blocos publicados. */
export const PINTA_STUDIO_LEGACY_LIMITS = {
  imageChars: 800_000,
  sheetChars: 180_000,
  gridChars: 60_000,
  dimension: 128,
  tiles: 64,
} as const

/** Os métodos do tocador de cenários, na ordem em que os motores os publicam. */
export const PINTA_SCENE_PLAYER_METHODS = [
  'createMapScene',
  'drawMapScene',
  'collideMapScene',
  'mapObjects',
  'mapObjectNamed',
  'mapObjectProperty',
  'mapObjectField',
  'mapInArea',
  'mapArea',
  'useMapDoor',
  'mapSpawn',
  'mapSize',
] as const
const SCENE_PLAYER_USE = new RegExp(`\\b(?:${PINTA_SCENE_PLAYER_METHODS.join('|')})\\b`)
/**
 * O código usa algum bloco de cenário? Procura o NOME do método como palavra inteira, em
 * qualquer lugar (apelido, colchete com texto). Larga de propósito: um falso positivo só custa
 * bytes, um falso negativo deixaria o jogo sem o cenário. É a MESMA pergunta para o motor que
 * vai ao documento e para a cena que vai aos metadados.
 *
 * Mora neste arquivo, sem dependência nenhuma, porque entra no pedaço inicial das extensões
 * 2D: junto do esquema da cena traria o validador inteiro para o primeiro carregamento.
 */
export function codeUsesPintaScenePlayer(code: string): boolean {
  return SCENE_PLAYER_USE.test(code)
}
