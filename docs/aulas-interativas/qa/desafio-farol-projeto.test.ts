import { describe, expect, test } from 'bun:test'
import { farolSvg } from '../../../packages/studio/src/arte/farol-assets'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { montarProjetoFarol } from './desafio-farol-projeto'

describe('projeto preparado A Chave do Farol', () => {
  test('a arte distingue a porta fechada da porta aberta além da luz', () => {
    expect(farolSvg('farol-apagado')).toContain('data-porta="fechada"')
    expect(farolSvg('farol-aceso')).toContain('data-porta="aberta"')
  })
  test('três retomadas válidas, uma extensão e arte inteiramente local', () => {
    const d1 = montarProjetoFarol('dia-1')
    const d2 = montarProjetoFarol('dia-2')
    const d3 = montarProjetoFarol('dia-3')
    for (const project of [d1, d2, d3]) {
      expect(project.installedExtensions?.map((item) => item.id)).toEqual(['game-2d'])
      expect(SZIRV2Schema.safeParse(project.ir).success).toBe(true)
      expect(
        project.assets.every((asset) => asset.dataUrl.startsWith('data:image/svg+xml;base64,')),
      ).toBe(true)
      expect(project.assets.map((asset) => asset.name)).toEqual([
        'cenario',
        'personagem',
        'chave',
        'farol-apagado',
        'farol-aceso',
        'barco',
      ])
    }
    expect(JSON.stringify(d1.ir)).not.toContain('g2d:topDown')
    expect(JSON.stringify(d1.ir)).not.toContain('g2d:onOverlap')
    expect(JSON.stringify(d2.ir)).toContain('g2d:topDown')
    expect(JSON.stringify(d2.ir)).not.toContain('g2d:onOverlap')
    expect(JSON.stringify(d3.ir)).toContain('g2d:onOverlap')
  })

  test('o jogo real anda, recolhe a chave uma vez e só acende o farol depois dela', () => {
    const project = montarProjetoFarol('concluido')
    const game = exampleHarness({
      name: project.name,
      experience: 'game',
      ir: project.ir,
      assets: project.assets,
    })
    const [personagem, chave, farol, barco] = game.sprites
    if (!personagem || !chave || !farol || !barco)
      throw new Error('Personagens preparados ausentes')

    const initialX = personagem.x
    game.fireKey('ArrowRight')
    expect(game.api.actionDown('right')).toBe(true)
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
    expect(personagem.x).toBeGreaterThan(initialX)

    personagem.x = farol.x
    personagem.y = farol.y
    game.nextFrame()
    expect(barco.x).toBe(655)

    personagem.x = chave.x
    personagem.y = chave.y
    game.nextFrame()
    expect((chave as typeof chave & { image?: unknown }).image).toBeNull()

    personagem.x = farol.x
    personagem.y = farol.y
    game.nextFrame()
    game.nextFrame()
    expect(barco.x).toBeLessThan(655)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
