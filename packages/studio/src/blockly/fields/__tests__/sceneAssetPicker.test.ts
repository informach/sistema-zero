import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { world3DBlocks } from '../../../official-extensions/world-3d/blocks'
import { criarTransporteDeEnsaio } from '../../../testing/scene3dTransportFixture'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'

test('seletor mostra o nome da cena, mas serializa seu ID e continua ligado após renomear', async () => {
  const plano = await criarTransporteDeEnsaio(),
    cena = plano.assets.find((a) => a.kind === 'scene3d')!,
    ws = new Blockly.Workspace()
  Object.assign(ws, { __szAssets: () => plano.assets })
  ensureBlocklyInitialized()
  registerExtensionBlocks(world3DBlocks)
  const bloco = ws.newBlock('sz_w3d_use_scene'),
    campo = bloco.getField('SCENE')!
  try {
    campo.setValue(cena.id)
    expect(campo.getValue()).toBe(cena.id)
    expect(campo.getText()).toBe(cena.name)
    cena.name = 'Vila renomeada'
    expect(campo.getText()).toBe('Vila renomeada')
    expect(campo.saveState()).toBe(cena.id)
    expect(campo.getValue()).toBe(cena.id)
  } finally {
    ws.dispose()
  }
})
