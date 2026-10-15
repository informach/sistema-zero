import { describe, expect, test } from 'bun:test'
import { completeLibraryAssets } from '../../../packages/member-shell/src/lib/studio-lesson-seed'
import {
  FAROL_BARCOS,
  FAROL_CENARIOS,
  FAROL_CHAVES,
  FAROL_FAROIS,
  FAROL_LAYOUT,
  FAROL_PERSONAGENS,
  FAROL_POSICOES_CHAVE,
} from '../../../packages/studio/src/arte/farol-assets'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { farolEscolhido, portaCompleta } from './desafio-farol-criterios'
import { montarProjetoFarol } from './desafio-farol-projeto'

describe('personalização completa do Farol', () => {
  test.each(
    FAROL_PERSONAGENS.map((personagem, i) => ({
      personagem,
      cenario: FAROL_CENARIOS[i % FAROL_CENARIOS.length]!,
      barco: FAROL_BARCOS[i % FAROL_BARCOS.length]!,
      chave: FAROL_CHAVES[i % FAROL_CHAVES.length]!,
      farol: FAROL_FAROIS[i % FAROL_FAROIS.length]!,
      posicao: FAROL_POSICOES_CHAVE[i % FAROL_POSICOES_CHAVE.length]!,
    })),
  )('combinação $personagem / $cenario conserva coleta, porta, barco e reinício', (choice) => {
    const project = montarProjetoFarol('concluido')
    const ir = structuredClone(project.ir) as SZIRV2
    const names: Record<string, string> = {
      personagem: choice.personagem,
      chave: choice.chave,
      barco: choice.barco,
      farol: choice.farol.apagado,
    }
    for (const statement of ir.behavior.start) {
      if (statement.type !== 'g2d:createImageSprite') continue
      statement.image = names[statement.varName]!
      if (statement.varName === 'chave') {
        statement.x = choice.posicao.x
        statement.y = choice.posicao.y
      }
    }
    const frame = ir.behavior.loops.find((item) => item.type === 'g2d:updateEachFrame')
    if (frame?.type !== 'g2d:updateEachFrame') throw new Error('Quadro ausente')
    for (const item of frame.body) if (item.type === 'g2d:drawBackdrop') item.image = choice.cenario
    const encounter = ir.behavior.events.find(
      (item) => item.type === 'g2d:onOverlap' && item.bVar === 'farol',
    )
    if (encounter?.type !== 'g2d:onOverlap') throw new Error('Porta ausente')
    const condition = encounter.body.find((item) => item.type === 'if')
    if (condition?.type !== 'if') throw new Error('Condição ausente')
    const light = condition.then.find((item) => item.type === 'g2d:setImage')
    if (light?.type !== 'g2d:setImage') throw new Error('Luz ausente')
    light.image = choice.farol.aceso
    const result = evaluateStudioSectionProject(portaCompleta, {
      ...project,
      ir,
      blocksState: buildWorkspaceStateFromIR(ir),
    })
    expect(result.every((item) => item.passed)).toBe(true)
    // A conferência da parte da troca (personalizar) aceita o par escolhido.
    const escolha = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(
      evaluateStudioSectionProject(farolEscolhido, escolha).map((item) => item.passed),
    ).toEqual([true])
    const game = exampleHarness({
      name: project.name,
      experience: 'game',
      ir,
      assets: project.assets,
    })
    const [actor, key, tower, boat] = game.sprites
    if (!actor || !key || !tower || !boat) throw new Error('Objetos ausentes')
    const towerImage = () => (tower as typeof tower & { image: unknown }).image
    const dark = towerImage()
    actor.x = FAROL_LAYOUT.personagemNaPorta.x
    actor.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    expect(towerImage()).toBe(dark)
    expect(boat.x).toBe(FAROL_LAYOUT.barco.x)
    actor.x = key.x
    actor.y = key.y
    game.nextFrame()
    expect((key as typeof key & { image: unknown }).image).toBeNull()
    actor.x = FAROL_LAYOUT.personagemNaPorta.x
    actor.y = FAROL_LAYOUT.personagemNaPorta.y
    game.nextFrame()
    expect(towerImage()).not.toBe(dark)
    for (let frame = 0; frame < 100; frame++) game.nextFrame()
    expect(boat.x).toBe(FAROL_LAYOUT.chegadaBarcoX)
    expect([tower.x, tower.y, tower.w, tower.h]).toEqual(Object.values(FAROL_LAYOUT.farol))
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
    const restart = exampleHarness({
      name: project.name,
      experience: 'game',
      ir,
      assets: project.assets,
    })
    expect(restart.sprites[1]?.x).toBe(choice.posicao.x)
    expect(restart.sprites[1]?.y).toBe(choice.posicao.y)
    expect(restart.sprites[3]?.x).toBe(FAROL_LAYOUT.barco.x)
    light.image = choice.farol.apagado
    const apagado = { ...project, ir, blocksState: buildWorkspaceStateFromIR(ir) }
    expect(
      evaluateStudioSectionProject(portaCompleta, apagado).find(
        (item) => item.checkId === 'acender',
      )?.passed,
    ).toBe(false)
    expect(evaluateStudioSectionProject(farolEscolhido, apagado)[0]?.passed).toBe(false)
  })

  test('um projeto salvo recebe novas escolhas sem perder imagens, código ou mensagens próprias', () => {
    const initial = montarProjetoFarol('concluido')
    const legacy = {
      ...initial.assets.find((asset) => asset.name === 'aventureiro')!,
      id: 'desafio-farol-personagem',
      name: 'personagem',
    }
    const saved = {
      ...initial,
      assets: [legacy],
      name: 'Minha ilha',
      files: { ...initial.files, 'script.js': '// código já salvo pela criança' },
    }
    const completed = completeLibraryAssets(saved, initial)
    expect(completed.assets[0]).toBe(legacy)
    expect(completed.files).toBe(saved.files)
    expect(completed.ir).toBe(saved.ir)
    expect(completed.assets.some((asset) => asset.name === 'menina-de-laco')).toBe(true)
    expect(completed.assets.some((asset) => asset.name === 'aventureiro')).toBe(true)
    expect(completeLibraryAssets(completed, initial)).toBe(completed)
  })
})
