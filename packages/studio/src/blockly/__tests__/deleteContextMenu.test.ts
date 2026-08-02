import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import {
  deleteAllLabel,
  deleteBlockLabel,
  visibleBlockCount,
  visibleDeletableCount,
} from '../deleteContextMenu'
import { ensureBlocklyInitialized } from '../setup'

/**
 * O menu de contexto dizia "Deletar 3 blocos" num bloco que a criança vê como UM
 * (relato dela, 02/08). O item nativo do Blockly conta `getDescendants`, e para
 * o Blockly cada soquete PREENCHIDO é um bloco (bloco-sombra) — e aqui todo
 * soquete nasce preenchido, então quase todo bloco vinha com número inflado.
 */

/** Enche os soquetes com sombras, como a paleta faz. */
function fillShadows(ws: Blockly.Workspace, block: Blockly.Block, inputs: string[]): void {
  for (const name of inputs) {
    const shadow = ws.newBlock('sz_val_number')
    shadow.setShadow(true)
    const conn = block.getInput(name)?.connection
    if (conn && shadow.outputConnection) conn.connect(shadow.outputConnection)
  }
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('quantos blocos o menu de apagar diz que vai apagar', () => {
  it('⭐ soquete preenchido NÃO é bloco para a criança', () => {
    const ws = new Blockly.Workspace()
    const mover = ws.newBlock('sz_g2d_platformer')
    fillShadows(ws, mover, ['SPEED', 'JUMP'])

    // O nativo contaria 3 (o bloco + as 2 sombras).
    expect(mover.getDescendants(false).length).toBe(3)
    expect(visibleBlockCount(mover)).toBe(1)
    ws.dispose()
  })

  it('o que está DENTRO conta (é o aviso que importa)', () => {
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('sz_g2d_update_each_frame')
    const corpo = loop.inputList.find((i) => i.connection?.type === Blockly.NEXT_STATEMENT)
    const a = ws.newBlock('sz_g2d_clear')
    const b = ws.newBlock('sz_g2d_clear')
    if (a.previousConnection) corpo?.connection?.connect(a.previousConnection)
    if (b.previousConnection) a.nextConnection?.connect(b.previousConnection)

    expect(visibleBlockCount(loop)).toBe(3)
    ws.dispose()
  })

  it('a pilha ABAIXO sobrevive, então não entra na conta', () => {
    const ws = new Blockly.Workspace()
    const mover = ws.newBlock('sz_g2d_platformer')
    fillShadows(ws, mover, ['SPEED', 'JUMP'])
    const depois = ws.newBlock('sz_g2d_clear')
    if (depois.previousConnection) mover.nextConnection?.connect(depois.previousConnection)

    expect(visibleBlockCount(mover)).toBe(1)
    ws.dispose()
  })

  it('bloco de verdade encaixado num soquete conta', () => {
    const ws = new Blockly.Workspace()
    const mover = ws.newBlock('sz_g2d_platformer')
    const valor = ws.newBlock('sz_val_number') // arrastado pela criança, sem sombra
    const conn = mover.getInput('SPEED')?.connection
    if (conn && valor.outputConnection) conn.connect(valor.outputConnection)

    expect(visibleBlockCount(mover)).toBe(2)
    ws.dispose()
  })

  it('o apagar TUDO do canvas também ignora as sombras', () => {
    const ws = new Blockly.Workspace()
    const mover = ws.newBlock('sz_g2d_platformer')
    fillShadows(ws, mover, ['SPEED', 'JUMP'])
    ws.newBlock('sz_g2d_clear')

    expect(ws.getAllBlocks(false).length).toBe(4) // com as sombras
    expect(visibleDeletableCount(ws)).toBe(2)
    ws.dispose()
  })
})

describe('o texto que a criança lê', () => {
  it('sem número quando é só o bloco', () => {
    expect(deleteBlockLabel(1)).toBe('Apagar este bloco')
    expect(deleteBlockLabel(0)).toBe('Apagar este bloco')
  })

  it('avisa o que vai junto, no singular e no plural', () => {
    expect(deleteBlockLabel(2)).toBe('Apagar este bloco e o de dentro')
    expect(deleteBlockLabel(5)).toBe('Apagar este bloco e os 4 de dentro')
  })

  it('no canvas o número informa mesmo', () => {
    expect(deleteAllLabel(1)).toBe('Apagar o bloco')
    expect(deleteAllLabel(12)).toBe('Apagar os 12 blocos')
  })

  it('nenhum texto herda o "Deletar" do Blockly', () => {
    for (const texto of [deleteBlockLabel(1), deleteBlockLabel(4), deleteAllLabel(3)]) {
      expect(texto.startsWith('Apagar')).toBe(true)
    }
  })
})
