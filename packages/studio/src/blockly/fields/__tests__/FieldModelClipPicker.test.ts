import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { ProjectAsset } from '#core'
import { makeAnimatedGlb } from '../../../official-extensions/__tests__/three3d/assetFixtures'
import skinned from '../../../official-extensions/__tests__/three3d/molda-skinned.json'
import { gameThreeDBlocks } from '../../../official-extensions/game-3d/blocks'
import { gameKit3DBlocks } from '../../../official-extensions/game-3d-advanced/blocks'
import { world3DBlocks } from '../../../official-extensions/world-3d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { buildIRFromWorkspace } from '../../buildIR'
import { ensureBlocklyInitialized } from '../../setup'
import {
  buildModelClipPickerContent,
  FieldModelClipPicker,
  modelClipPickerState,
} from '../FieldModelClipPicker'
import { MODEL_CLIP_BLOCK_TYPES } from '../modelClipResolution'

interface AssetWs extends Blockly.Workspace {
  __szAssets?: () => ProjectAsset[]
}

const HEROI: ProjectAsset = {
  id: 'm1',
  name: 'heroi',
  kind: 'model3d',
  dataUrl: skinned.dataUrl,
  originalFileName: 'heroi.glb',
  source: 'library',
}
const ROBO: ProjectAsset = {
  id: 'm2',
  name: 'robo',
  kind: 'model3d',
  dataUrl: makeAnimatedGlb('robo', ['Girar']),
  originalFileName: 'robo.glb',
  source: 'library',
}

const workspaces: Blockly.Workspace[] = []
function workspace(assets: ProjectAsset[] = [HEROI, ROBO]): AssetWs {
  const ws = new Blockly.Workspace() as AssetWs
  ws.__szAssets = () => assets
  workspaces.push(ws)
  return ws
}

function clipField(block: Blockly.Block): FieldModelClipPicker {
  const field = block.getField('CLIP')
  if (!(field instanceof FieldModelClipPicker)) throw new Error(`${block.type} sem o seletor`)
  return field
}

function optionLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLButtonElement>('.sz-clip-picker__option')].map(
    (button) => button.textContent ?? '',
  )
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
  registerExtensionBlocks(gameKit3DBlocks)
  registerExtensionBlocks(world3DBlocks)
})

afterEach(() => {
  for (const ws of workspaces.splice(0)) ws.dispose()
})

describe('FieldModelClipPicker — os seis blocos', () => {
  it('todo bloco que toca clipe usa o seletor no campo CLIP (o nome do campo não muda)', () => {
    const ws = workspace()
    for (const type of MODEL_CLIP_BLOCK_TYPES) {
      expect(clipField(ws.newBlock(type))).toBeInstanceOf(Blockly.FieldTextInput)
    }
  })
})

describe('FieldModelClipPicker — lista, ⚠️ e valor livre', () => {
  it('lista os clipes 🎬 do modelo do bloco (Jogo 3D)', () => {
    const ws = workspace()
    const create = ws.newBlock('sz_g3d_create_model_file')
    create.setFieldValue('heroi', 'NAME')
    create.setFieldValue('heroi', 'MODEL')
    const play = ws.newBlock('sz_g3d_play_animation')
    play.setFieldValue('heroi', 'OBJ')
    play.setFieldValue('Acenar', 'CLIP')

    const root = buildModelClipPickerContent(clipField(play))
    expect(optionLabels(root)).toEqual(['🎬 Acenar', '🎬 Esticar'])
    expect(root.querySelector('.sz-clip-picker__unknown')).toBeNull()
    expect(root.querySelector('.sz-clip-picker__option[aria-pressed="true"]')?.textContent).toBe(
      '🎬 Acenar',
    )
  })

  it('Avançado: molde → peça "modelo importado"', () => {
    const ws = workspace()
    const mold = ws.newBlock('sz_g3k_define_mold')
    mold.setFieldValue('heroi', 'NAME')
    const part = ws.newBlock('sz_g3k_part')
    part.setFieldValue('modelo', 'SHAPE')
    part.setFieldValue('robo', 'MODEL')
    mold.getInput('BODY')?.connection?.connect(part.previousConnection as Blockly.Connection)
    const anim = ws.newBlock('sz_g3k_state_anim')
    anim.setFieldValue('heroi', 'MOLD')
    const state = modelClipPickerState(clipField(anim))
    expect(state.options).toEqual({ resolved: true, groups: [{ model: 'robo', clips: ['Girar'] }] })
  })

  it('valor fora da lista mostra ⚠️ e segue editável pela entrada livre', () => {
    const ws = workspace()
    const place = ws.newBlock('sz_w3d_place_model')
    place.setFieldValue('heroi', 'MODEL')
    const field = clipField(place)
    field.setValue('Dancar')

    const root = buildModelClipPickerContent(field)
    expect(root.querySelector('.sz-clip-picker__unknown')?.textContent).toContain('⚠️ "Dancar"')
    // "Pôr o modelo" aceita ficar parado (nome vazio).
    expect(optionLabels(root)).toEqual(['⏸️ parado (sem animação)', '🎬 Acenar', '🎬 Esticar'])

    const input = root.querySelector<HTMLInputElement>('.sz-clip-picker__input')
    if (!input) throw new Error('sem entrada livre')
    expect(input.value).toBe('Dancar')
    input.value = '  Nadar  '
    root.querySelector<HTMLButtonElement>('.sz-clip-picker__confirm')?.click()
    expect(field.getValue()).toBe('Nadar')

    const again = buildModelClipPickerContent(field)
    again.querySelector<HTMLButtonElement>('[data-clip="Esticar"]')?.click()
    expect(field.getValue()).toBe('Esticar')
  })

  it('sem resolver o modelo, mostra os clipes de todos os modelos, agrupados', () => {
    const ws = workspace()
    const anim = ws.newBlock('sz_w3d_model_anim')
    anim.setFieldValue('amigo', 'WHO')
    anim.setFieldValue('Ninguem', 'NAME')
    const root = buildModelClipPickerContent(clipField(anim))
    expect(
      [...root.querySelectorAll('.sz-clip-picker__model')].map((el) => el.textContent),
    ).toEqual(['📦 heroi', '📦 robo'])
    expect(optionLabels(root)).toEqual(['🎬 Acenar', '🎬 Esticar', '🎬 Girar'])
    expect(root.textContent).toContain('Não achei o modelo deste bloco')
  })

  it('sem modelo no projeto, ensina o caminho e mantém a entrada livre', () => {
    const ws = workspace([])
    const play = ws.newBlock('sz_g3k_play_anim')
    const root = buildModelClipPickerContent(clipField(play))
    expect(optionLabels(root)).toEqual([])
    expect(root.textContent).toContain('Nenhum modelo 3D no projeto ainda')
    expect(root.querySelector('.sz-clip-picker__input')).not.toBeNull()
  })
})

describe('FieldModelClipPicker — serialização igual à do field_input', () => {
  it('o valor é texto puro e sobrevive ao save/load sem mudar a IR', () => {
    const ws = workspace()
    const create = ws.newBlock('sz_g3d_create_model_file')
    create.setFieldValue('heroi', 'NAME')
    create.setFieldValue('heroi', 'MODEL')
    const play = ws.newBlock('sz_g3d_play_animation')
    play.setFieldValue('heroi', 'OBJ')
    play.setFieldValue('Nome Que Não Existe', 'CLIP')

    const saved = Blockly.serialization.workspaces.save(ws) as {
      blocks: { blocks: Array<{ type: string; fields?: Record<string, unknown> }> }
    }
    const playJson = saved.blocks.blocks.find((b) => b.type === 'sz_g3d_play_animation')
    expect(playJson?.fields?.CLIP).toBe('Nome Que Não Existe')

    const copy = workspace()
    Blockly.serialization.workspaces.load(saved as unknown as Record<string, unknown>, copy)
    const loaded = copy.getAllBlocks(false).find((b) => b.type === 'sz_g3d_play_animation')
    expect(loaded?.getFieldValue('CLIP')).toBe('Nome Que Não Existe')
    expect(JSON.stringify(Blockly.serialization.workspaces.save(copy))).toBe(JSON.stringify(saved))
    expect(JSON.stringify(buildIRFromWorkspace(copy))).toBe(
      JSON.stringify(buildIRFromWorkspace(ws)),
    )
  })
})

describe('FieldModelClipPicker — ilegível ≠ sem animações; nome longo', () => {
  it('modelo que não pôde ser lido diz isso (e não "não tem animações")', () => {
    const QUEBRADO: ProjectAsset = {
      ...ROBO,
      id: 'm3',
      name: 'quebrado',
      dataUrl: 'data:model/gltf-binary;base64,@@@@',
    }
    const SEM: ProjectAsset = {
      ...ROBO,
      id: 'm4',
      name: 'estatua',
      dataUrl: makeAnimatedGlb('estatua', []),
    }
    const ws = workspace([QUEBRADO, SEM])
    const play = ws.newBlock('sz_g3d_play_animation')
    const root = buildModelClipPickerContent(clipField(play))
    const notes = [...root.querySelectorAll('.sz-clip-picker__none')].map((el) => el.textContent)
    expect(notes).toEqual([
      'Não consegui ler as animações deste modelo.',
      'Este modelo não tem animações.',
    ])
  })

  it('nome de clipe longo: o rótulo encurta, o valor e o title ficam inteiros', () => {
    const long = `Dancinha-${'x'.repeat(70)}`
    const LONGO: ProjectAsset = {
      ...ROBO,
      id: 'm5',
      name: 'longo',
      dataUrl: makeAnimatedGlb('longo', [long]),
    }
    const ws = workspace([LONGO])
    const play = ws.newBlock('sz_g3d_play_animation')
    const root = buildModelClipPickerContent(clipField(play))
    const button = root.querySelector<HTMLButtonElement>('.sz-clip-picker__option')
    expect(button?.dataset.clip).toBe(long)
    expect(button?.title).toBe(long)
    expect((button?.textContent ?? '').length).toBeLessThan(long.length)
    expect(button?.textContent?.endsWith('…')).toBe(true)
  })
})

describe('MODEL_CLIP_BLOCK_TYPES é a lista EXATA dos blocos com campo CLIP', () => {
  it('todo bloco das três extensões com campo CLIP está na lista, e só eles', () => {
    const definitions = [...gameThreeDBlocks, ...gameKit3DBlocks, ...world3DBlocks] as {
      type: string
      args0?: unknown[]
      args1?: unknown[]
      args2?: unknown[]
    }[]
    const withClip = definitions
      .filter((definition) =>
        [definition.args0, definition.args1, definition.args2].some((args) =>
          ((args ?? []) as { name?: string }[]).some((arg) => arg?.name === 'CLIP'),
        ),
      )
      .map((definition) => definition.type)
      .sort()
    expect(withClip).toEqual([...MODEL_CLIP_BLOCK_TYPES].sort())
  })
})
