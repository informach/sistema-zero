import { expect, test } from 'bun:test'
import { codeUsesPintaScenePlayer, PINTA_SCENE_PLAYER_METHODS } from './pinta-limits'

test('acha o bloco de cenário pelo nome do método, em qualquer forma de chamada', () => {
  for (const method of PINTA_SCENE_PLAYER_METHODS) {
    expect(codeUsesPintaScenePlayer(`SZGame2D.${method}("mapa");`)).toBe(true)
    expect(codeUsesPintaScenePlayer(`const g = SZGameKit; g["${method}"]("mapa");`)).toBe(true)
  }
})

test('jogo de blocos antigos não conta como cenário', () => {
  expect(codeUsesPintaScenePlayer('')).toBe(false)
  expect(
    codeUsesPintaScenePlayer(
      'const mapa = SZGame2D.createTileMapFromAsset("vila"); SZGame2D.drawTileMap(ctx, mapa); SZGameKit.loadTilemap("m", "vila");',
    ),
  ).toBe(false)
  // Só a palavra inteira: um nome parecido não liga o cenário.
  expect(codeUsesPintaScenePlayer('const mapSizes = []; function drawMapScenes() {}')).toBe(false)
})
