import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { FAROL_LAYOUT, farolSvg } from '../../../packages/studio/src/arte/farol-assets'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/project'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { montarProjetoFarol } from './desafio-farol-projeto'

describe('projeto preparado A Chave do Farol', () => {
  test('usa os SVGs originais, incluindo as duas versões da porta e o cenário sem atores', () => {
    const files = {
      cenario: 'cenario-farol-limpo',
      personagem: 'player-farol',
      chave: 'chave-farol',
      'farol-apagado': 'farol-apagado',
      'farol-aceso': 'farol-aceso',
      barco: 'barco-farol',
    } as const
    for (const [name, filename] of Object.entries(files)) {
      const original = readFileSync(
        new URL(`../../../packages/studio/src/arte/assets/farol/${filename}.svg`, import.meta.url),
        'utf8',
      )
        .trim()
        .replaceAll('\r\n', '\n')
      expect(farolSvg(name as keyof typeof files)).toBe(original)
    }
    expect(farolSvg('farol-apagado')).not.toBe(farolSvg('farol-aceso'))
  })
  test('três retomadas válidas, uma extensão e arte inteiramente local', () => {
    const d1 = montarProjetoFarol('dia-1')
    const d2 = montarProjetoFarol('dia-2')
    const d3 = montarProjetoFarol('dia-3')
    for (const project of [d1, d2, d3, montarProjetoFarol('concluido')]) {
      expect(project.installedExtensions?.map((item) => item.id)).toEqual(['game-2d'])
      expect(SZIRV2Schema.safeParse(project.ir).success).toBe(true)
      expect(project.ir.html).toEqual([])
      expect(project.ir.css).toEqual([])
      expect(sanitizeProjectAssets(JSON.parse(JSON.stringify(project.assets)))).toEqual(
        project.assets,
      )
      expect(project.ir.behavior.start[0]).toMatchObject({
        type: 'g2d:setupStage',
        width: 480,
        height: 360,
      })
      expect(JSON.stringify(project.blocksState)).not.toMatch(
        /sz_(?:html|css|canvas|frame_structure|frame_appearance)/,
      )
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

    personagem.x = FAROL_LAYOUT.personagemNaPorta.x
    personagem.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.barco.x)

    personagem.x = chave.x
    personagem.y = chave.y
    game.nextFrame()
    expect((chave as typeof chave & { image?: unknown }).image).toBeNull()

    // O facho e a margem transparente da torre não são a porta.
    personagem.x = farol.x
    personagem.y = farol.y
    game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.barco.x)
    personagem.x = FAROL_LAYOUT.personagemNaPorta.x
    personagem.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    game.nextFrame()
    expect(barco.x).toBeLessThan(FAROL_LAYOUT.barco.x)
    for (let frame = 0; frame < 100; frame++) game.nextFrame()
    expect(barco.x).toBe(FAROL_LAYOUT.chegadaBarcoX)
    expect(barco.x + barco.w).toBeLessThanOrEqual(480)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
