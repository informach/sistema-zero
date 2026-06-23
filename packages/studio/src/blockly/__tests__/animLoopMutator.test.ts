import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { ensureBlocklyInitialized } from '../setup'
import { irInFrame } from './frameTestUtils'

interface AnimLoopApi extends Blockly.Block {
  addHandle_(): void
  removeHandle_(): void
}

function animLoopOf(ws: Blockly.Workspace) {
  const stmt = irInFrame(ws).js.find((s) => s.type === 'animationLoop')
  if (stmt?.type !== 'animationLoop') throw new Error('sem animationLoop')
  return stmt
}

describe('mutator do "A cada frame fazer" — + revela "guardar id em [var]"', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('sem clicar no +, o loop não guarda id (sem handle)', () => {
    const ws = new Blockly.Workspace()
    ws.newBlock('sz_canvas_anim_loop')
    expect(animLoopOf(ws).handle).toBeUndefined()
  })

  it('addHandle_ → handle "animId"; renomear o campo muda o handle no IR', () => {
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('sz_canvas_anim_loop') as AnimLoopApi

    loop.addHandle_()
    expect(animLoopOf(ws).handle).toBe('animId')

    loop.setFieldValue('frameId', 'HANDLE')
    expect(animLoopOf(ws).handle).toBe('frameId')
  })

  it('removeHandle_ volta ao loop sem id', () => {
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('sz_canvas_anim_loop') as AnimLoopApi

    loop.addHandle_()
    expect(animLoopOf(ws).handle).toBe('animId')

    loop.removeHandle_()
    expect(animLoopOf(ws).handle).toBeUndefined()
  })

  it('o estado (handle) sobrevive a salvar/carregar a serialização do bloco', () => {
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('sz_canvas_anim_loop') as AnimLoopApi
    loop.addHandle_()
    loop.setFieldValue('meuId', 'HANDLE')

    const state = Blockly.serialization.workspaces.save(ws)
    const ws2 = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state, ws2)

    expect(animLoopOf(ws2).handle).toBe('meuId')
  })
})
