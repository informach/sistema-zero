import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { gameKit3DBlocks } from '../../../official-extensions/game-3d-advanced/blocks'
import { CAMPO_DO_HEROI_ASSETS } from '../../../official-extensions/game-3d-advanced/sceneExampleAssets'
import { world3DBlocks } from '../../../official-extensions/world-3d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import {
  buildSceneRegionPickerContent,
  FieldSceneRegionPicker,
  regionNamesOfProject,
  sceneRegionPickerState,
} from '../FieldSceneRegionPicker'

/**
 * O seletor do nome da região do "Quando … entrar na região …" (lote 6 da conclusão, 22/11/2026):
 * lista as regiões dos cenários do Molda trazidos para o projeto, avisa o nome que nenhum cenário
 * tem e, sem regiões, diz onde desenhá-las. O valor é texto livre (o cenário pode chegar depois).
 */

interface AssetWs extends Blockly.Workspace {
  __szAssets?: () => ProjectAsset[]
}

/** Um envelope `studio-cena3d` mínimo, só com o que o seletor lê. */
function cenario(id: string, regioes: unknown): ProjectAsset {
  const json = JSON.stringify({ formato: 'studio-cena3d', versao: 1, cena: { regioes } })
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  return {
    id,
    name: id,
    kind: 'scene3d',
    dataUrl: `data:application/vnd.sistemazero.cena3d+json;base64,${base64}`,
    originalFileName: `${id}.scene3d.json`,
    source: 'library',
  }
}

const VILA = cenario('vila', [
  { id: 'vila', nome: 'Vila', caixa: { x0: 0, z0: 0, x1: 10, z1: 10 }, vizinhas: [] },
  { id: 'lago', nome: 'Lago Azul', caixa: { x0: 10, z0: 0, x1: 20, z1: 10 }, vizinhas: [] },
])

const workspaces: Blockly.Workspace[] = []
function workspace(assets: ProjectAsset[]): AssetWs {
  const ws = new Blockly.Workspace() as AssetWs
  ws.__szAssets = () => assets
  workspaces.push(ws)
  return ws
}

function regionField(ws: Blockly.Workspace, type = 'sz_g3d_on_enter_region') {
  const block = ws.newBlock(type)
  const field = block.getField('REGION')
  if (!(field instanceof FieldSceneRegionPicker)) throw new Error(`${type} sem o seletor`)
  return field
}

const options = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLButtonElement>('.sz-region-picker__option')].map(
    (button) => button.dataset.region,
  )

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
  registerExtensionBlocks(gameKit3DBlocks)
  registerExtensionBlocks(world3DBlocks)
})

afterEach(() => {
  for (const ws of workspaces.splice(0)) ws.dispose()
})

describe('as regiões dos cenários do projeto', () => {
  it('lê o envelope que o compilador de verdade grava (o Campo do Herói)', () => {
    expect(regionNamesOfProject(CAMPO_DO_HEROI_ASSETS)).toEqual(['Campo', 'Pomar'])
  })

  it('junta os cenários na ordem, sem repetir, e ignora o que não é cenário ou não se lê', () => {
    const outro = cenario('outro', [
      { id: 'v2', nome: 'Vila', caixa: { x0: 0, z0: 0, x1: 1, z1: 1 }, vizinhas: [] },
      { id: 'cav', nome: 'Caverna', caixa: { x0: 1, z0: 0, x1: 2, z1: 1 }, vizinhas: [] },
    ])
    const quebrado = { ...VILA, id: 'q', dataUrl: 'data:application/json;base64,@@@' }
    const modelo = { ...VILA, id: 'm', kind: 'model3d' as const }
    const semRegioes = cenario('vazio', undefined)
    expect(regionNamesOfProject([quebrado, VILA, modelo, semRegioes, outro])).toEqual([
      'Vila',
      'Lago Azul',
      'Caverna',
    ])
  })
})

describe('o seletor no bloco', () => {
  it('é o campo dos três motores', () => {
    const ws = workspace([VILA])
    for (const type of [
      'sz_g3d_on_enter_region',
      'sz_w3d_on_enter_region',
      'sz_g3k_on_enter_region',
    ])
      expect(regionField(ws, type)).toBeInstanceOf(FieldSceneRegionPicker)
  })

  it('lista as regiões e escolher uma grava o nome', () => {
    const field = regionField(workspace([VILA]))
    field.setValue('Vila')
    expect(sceneRegionPickerState(field)).toEqual({
      names: ['Vila', 'Lago Azul'],
      current: 'Vila',
      unknownCurrent: false,
    })
    const root = buildSceneRegionPickerContent(field)
    expect(options(root)).toEqual(['Vila', 'Lago Azul'])
    expect(root.querySelector('[data-region="Vila"]')?.getAttribute('aria-pressed')).toBe('true')
    root.querySelector<HTMLButtonElement>('[data-region="Lago Azul"]')?.click()
    expect(field.getValue()).toBe('Lago Azul')
    expect(root.textContent).not.toContain('⚠️')
  })

  it('o nome que nenhum cenário tem é avisado e continua valendo', () => {
    const field = regionField(workspace([VILA]))
    field.setValue('Floresta')
    expect(sceneRegionPickerState(field).unknownCurrent).toBe(true)
    const root = buildSceneRegionPickerContent(field)
    expect(root.textContent).toContain('Nenhum cenário do projeto tem a região "Floresta"')
    expect(field.getValue()).toBe('Floresta')
  })

  it('sem regiões, diz onde desenhá-las; o nome digitado entra mesmo assim', () => {
    const field = regionField(workspace([]))
    const root = buildSceneRegionPickerContent(field)
    expect(options(root)).toEqual([])
    expect(root.textContent).toContain('Desenhe as regiões no Molda Cenários, na aba Jogo.')
    const input = root.querySelector<HTMLInputElement>('.sz-region-picker__input')
    if (!input) throw new Error('sem a entrada livre')
    input.value = '  Praia  '
    root.querySelector<HTMLButtonElement>('.sz-region-picker__confirm')?.click()
    expect(field.getValue()).toBe('Praia')
  })
})
