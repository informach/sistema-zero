import { describe, expect, test } from 'bun:test'
import { sceneSolidAt } from '@sistemazero/core/studio/pinta-scene-runtime'
import { physicsScenario } from '../../../../scripts/homologacao/physics'
import { galleryToPintaJson, importPintaJson } from '../../../export/projectJson'
import { exportPintaScene } from '../../../export/scene'
import { playtestWorldFromScene } from '../MapPlaytestDialog'
import { playtestBody, playtestFree, playtestStart, stepPlaytest } from './playtest'

async function narrowWall() {
  const fixture = physicsScenario()
  const backup = galleryToPintaJson(fixture.assets)
  expect(JSON.parse(backup).version).toBe(4)
  const loaded = importPintaJson(backup)
  expect(loaded.warnings).toEqual([])
  const map = loaded.assets.find((a) => a.id === fixture.map.id)
  if (map?.kind !== 'tilemap') throw new Error('A fixture perdeu o mapa no ciclo nativo')
  return exportPintaScene(
    map,
    (id) => loaded.assets.find((a) => a.id === id) ?? null,
    async () => 'data:image/png;base64,AAAA',
  )
}

describe('teste com personagem usa a geometria completa do documento', () => {
  test('corpo sobre uma peça fina de conjunto não é considerado livre entre as amostras', async () => {
    const scene = await narrowWall(),
      world = playtestWorldFromScene(scene)
    const position = { x: 39, y: 30 }
    const { hw, hh } = playtestBody(16, 'top')
    // Reproduction: every sample of the former body grid misses this actual tile.
    for (const dx of [-hw + 0.001, 0, hw - 0.001])
      for (const dy of [-hh + 0.001, 0, hh - 0.001])
        expect(sceneSolidAt(scene, position.x + dx, position.y + dy)).toBe(false)
    expect(playtestFree(world, 'top', position.x, position.y)).toBe(false)
  })
  test('andar para a direita para no contorno real, sem atravessar a parede fina', async () => {
    const world = playtestWorldFromScene(await narrowWall())
    let state = { ...playtestStart(world), x: 20, y: 30 }
    for (let i = 0; i < 80; i++)
      state = stepPlaytest(state, { x: 1, y: 0, jump: false }, 16, world, 'top').state
    const edge = 40 - playtestBody(16, 'top').hw
    expect(state.x).toBeLessThanOrEqual(edge + 0.01)
    expect(state.x).toBeGreaterThan(edge - 0.2)
    expect(state.y).toBe(30)
  })
})
