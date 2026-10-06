import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, test } from 'bun:test'
import { montarProjetoFarol } from '../../../../../../docs/aulas-interativas/qa/desafio-farol-projeto'
import {
  FAROL_BARCOS,
  FAROL_CHAVES,
  FAROL_FAROIS,
  FAROL_LAYOUT,
  FAROL_PERSONAGENS,
} from '../../../arte/farol-assets'
import type { ProjectAsset } from '../../../core/project'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { applySuggestedSize } from '../FieldAssetPicker'

const groups = [
  { names: FAROL_PERSONAGENS, layout: FAROL_LAYOUT.personagem },
  { names: FAROL_CHAVES, layout: FAROL_LAYOUT.chave },
  { names: FAROL_BARCOS, layout: FAROL_LAYOUT.barco },
  {
    names: FAROL_FAROIS.flatMap(({ apagado, aceso }) => [apagado, aceso]),
    layout: FAROL_LAYOUT.farol,
  },
]

describe('personalização completa do Farol', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  test('a escolha real no campo de imagem preserva x, y, largura e altura em cada categoria', () => {
    const assets = montarProjetoFarol('concluido').assets
    if (!assets) throw new Error('Biblioteca de imagens ausente')
    const ws = new Blockly.Workspace() as Blockly.Workspace & { __szAssets: () => ProjectAsset[] }
    ws.__szAssets = () => assets
    try {
      for (const { names, layout } of groups) {
        const block = ws.newBlock('sz_g2d_create_image_sprite')
        const values = { X: layout.x, Y: layout.y, W: layout.w, H: layout.h }
        for (const [input, value] of Object.entries(values))
          block
            .getInput(input)
            ?.connection?.setShadowState({ type: 'sz_val_number', fields: { NUM: value } })
        let previous: string = names[0]!
        for (const name of names) {
          const asset = assets.find((item) => item.name === name)
          const field = block.getField('IMAGE')
          if (!asset || !field) throw new Error(`Imagem ausente: ${name}`)
          applySuggestedSize(field, asset, previous)
          field.setValue(name)
          for (const [input, value] of Object.entries(values))
            expect(
              block.getInput(input)?.connection?.targetBlock()?.getFieldValue('NUM'),
              `${name}: ${input}`,
            ).toBe(value)
          previous = name
        }
      }
    } finally {
      ws.dispose()
    }
  })
})
