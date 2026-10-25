import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { compileStatements } from '../../../generators'
import { behaviorStatements, normalizeSZIR } from '../../../ir'
import { parseJS } from '../../../parsers/js'
import { GAME_TWO_D_KEY_OPTIONS } from '../blockCatalogShared'
import { GAME_TWO_D_RECIPE_SOURCES } from '../recipeSources'
import { gameTwoDRecipes } from '../recipes.generated'
import { GAME_TWO_D_API_KEYS } from '../runtimeContract'
import { setupGameTwoDExampleTests } from './exampleContractHarness'
import { exampleHarness } from './examplePlaythroughHarness'

setupGameTwoDExampleTests()

function recipe(name: string) {
  const example = gameTwoDRecipes.find((item) => item.name === name)
  if (!example) throw new Error(`Receita ausente: ${name}`)
  return example
}

describe('receitas Jogo 2D — fonte, execução e interação', () => {
  it('o seletor de teclas inclui todas as letras e conserva códigos e números existentes', () => {
    const values = GAME_TWO_D_KEY_OPTIONS.map(([, value]) => value)
    expect(new Set(values).size).toBe(values.length)
    for (const key of [
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'Space',
      'Enter',
      'Escape',
      ...'abcdefghijklmnopqrstuvwxyz0123456789',
    ]) {
      expect(values).toContain(key)
    }
  })

  for (const key of ['i', 'n', 'e']) {
    it(`a tecla ${key} conserva evento e pergunta ao salvar e reconstruir blocos`, () => {
      const source = `SZGame2D.setupStage(320, 240, '#102238');
SZGame2D.onKey('${key}', () => { SZGame2D.setScene('selecionada'); });
SZGame2D.gameLoop(() => { if (SZGame2D.keyDown('${key}')) { SZGame2D.clear(); } });`
      const ir = normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId: 'game-2d' }],
      })
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
        const saved = Blockly.serialization.workspaces.save(workspace)
        workspace.clear()
        Blockly.serialization.workspaces.load(saved, workspace)
        for (const type of ['sz_g2d_on_key', 'sz_g2d_key_down']) {
          expect(
            workspace
              .getAllBlocks(false)
              .find((block) => block.type === type)
              ?.getFieldValue('KEY'),
          ).toBe(key)
        }
        const code = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
        expect(code).toContain(`SZGame2D.onKey("${key}",`)
        expect(code).toContain(`SZGame2D.keyDown("${key}")`)
      } finally {
        workspace.dispose()
      }
    })
  }

  it('as nove receitas estáticas correspondem às fontes autorais', () => {
    expect(gameTwoDRecipes).toHaveLength(9)
    for (const source of GAME_TWO_D_RECIPE_SOURCES) {
      const parsed = normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source.source),
        extensions: [{ extensionId: 'game-2d' }],
      })
      expect(recipe(source.name).ir).toEqual(parsed)
    }
  })

  for (const example of gameTwoDRecipes) {
    it(`${example.name} executa seus quadros e controles sem erro`, () => {
      const code = compileStatements(behaviorStatements(example.ir), 0)
      const calls = [...code.matchAll(/SZGame2D\.(\w+)\(/g)].map((match) => match[1])
      expect(calls.length).toBeGreaterThan(5)
      const methods = new Set<string>(GAME_TWO_D_API_KEYS)
      expect(calls.filter((method) => !methods.has(method ?? ''))).toEqual([])
      const game = exampleHarness(example, () => 0.5, { contarCtx: true })
      for (let frame = 0; frame < 5; frame++) game.nextFrame()
      for (const key of [
        'Enter',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        'i',
        'n',
        'e',
        'Space',
        'ArrowRight',
      ]) {
        game.fireKey(key)
        game.nextFrame()
        game.fireKey(key, 'keyup')
      }
      game.firePointer('pointerdown', 250, 190)
      game.nextFrame()
      game.firePointer('pointerup', 250, 190)
      expect(game.errors).toEqual([])
      expect(game.contarCtxOps()).toBeGreaterThan(0)
    })
  }

  it('o personagem do Pinta anda e pode recomeçar depois da animação', () => {
    const game = exampleHarness(recipe('Meu personagem do Pinta'))
    const first = game.sprites[0]
    if (!first) throw new Error('Personagem ausente')
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(first.x).toBeGreaterThan(260)
    game.fireKey('Space')
    game.nextFrame()
    expect(first.anim).toMatchObject({ once: true })
    game.fireKey('Space', 'keyup')
    for (let frame = 0; frame < 70; frame++) game.nextFrame()
    expect(first.anim).toMatchObject({ once: false })
    game.fireKey('r')
    game.nextFrame()
    expect(game.sprites.at(-1)?.x).toBe(260)
    expect(game.errors).toEqual([])
  })

  it('I mantém a imagem fixa ao andar, Espaço volta à animação e R restaura a partida', () => {
    const example = recipe('Meu personagem do Pinta')
    const game = exampleHarness(example)
    const hero = game.sprites[0]
    if (!hero) throw new Error('Personagem ausente')
    game.nextFrame()
    game.fireKey('i')
    game.fireKey('i', 'keyup')
    for (let frame = 0; frame < 3; frame++) game.nextFrame()
    expect(hero.anim === null).toBe(true)
    expect(Reflect.get(hero, 'image')).toMatchObject({
      url: example.assets?.find((asset) => asset.name === 'heroi-receita')?.dataUrl,
    })
    game.fireKey('ArrowRight')
    game.nextFrame()
    game.fireKey('ArrowRight', 'keyup')
    expect(hero.x).toBeGreaterThan(260)
    expect(hero.anim === null).toBe(true)
    game.fireKey('Space')
    game.nextFrame()
    game.fireKey('Space', 'keyup')
    expect(hero.anim).toMatchObject({ once: true })
    for (let frame = 0; frame < 70; frame++) game.nextFrame()
    expect(hero.anim).toMatchObject({ once: false })
    game.fireKey('r')
    game.nextFrame()
    const restarted = game.sprites.at(-1)
    expect(restarted).not.toBe(hero)
    expect(restarted?.x).toBe(260)
    expect(restarted?.anim).toMatchObject({ once: false })
    expect(game.errors).toEqual([])
  })

  it('o tamanho da placa selecionada muda pelo controle anunciado', () => {
    const game = exampleHarness(recipe('Placas e camadas'))
    const first = game.groups[0]?.items[0]
    if (!first) throw new Error('Placa ausente')
    expect(first.w).toBe(280)
    game.fireKey('2')
    game.nextFrame()
    expect(first.w).toBeCloseTo(308)
    game.fireKey('r')
    game.nextFrame()
    expect(game.groups.at(-1)?.items[0]?.w).toBe(280)
    expect(game.errors).toEqual([])
  })

  it('o perigo tira uma vida e a recarga protege contra contato contínuo', () => {
    const game = exampleHarness(recipe('Caixas, círculos e plataformas'))
    const first = game.sprites[0]
    if (!first) throw new Error('Personagem ausente')
    first.x = 275
    first.y = 295
    game.nextFrame()
    expect(game.api.getHealth(first)).toBe(2)
    for (let frame = 0; frame < 10; frame++) game.nextFrame()
    expect(game.api.getHealth(first)).toBe(2)
    expect(game.errors).toEqual([])
  })

  it('um tiro atinge o inimigo e muda seu comportamento depois do dano', () => {
    const game = exampleHarness(recipe('Inimigo que muda ao levar dano'))
    const type = game.enemyTypes[0]
    const enemy = type?.items[0]
    if (!type || !enemy) throw new Error('Inimigo ausente')
    expect(game.api.getHealth(enemy)).toBe(4)
    game.fireKey('Space')
    game.nextFrame()
    const shot = game.groups[0]?.items[0]
    if (!shot) throw new Error('Tiro ausente')
    enemy.x = shot.x
    enemy.y = shot.y - 7
    game.nextFrame()
    game.nextFrame()
    expect(game.api.getHealth(enemy)).toBe(3)
    expect(type.config?.behaviors).toContain('perseguidor-lado')
    expect(game.groups[0]?.items).not.toContain(shot)
    expect(game.errors).toEqual([])
  })

  it('a pista termina com o percurso avançando e mantém desenho após trocar a vista', () => {
    const game = exampleHarness(recipe('Pista do meu desenho'), () => 0.5, { contarCtx: true })
    game.fireKey('Enter')
    for (let frame = 0; frame < 270; frame++) game.nextFrame()
    const arrival = game.api.spriteTrackValue('pista', 'distance')
    expect(arrival).toBeGreaterThanOrEqual(600)
    for (let frame = 0; frame < 10; frame++) game.nextFrame()
    expect(game.api.spriteTrackValue('pista', 'distance')).toBe(arrival)
    game.fireKey('3')
    game.nextFrame()
    expect(game.contarCtxOps()).toBeGreaterThan(0)
    expect(game.errors).toEqual([])
  })
})
