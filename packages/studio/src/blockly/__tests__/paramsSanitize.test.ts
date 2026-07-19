import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { behaviorStatements } from '#ir'
import { ensureBlocklyInitialized } from '../setup'
import { irInFrame } from './frameTestUtils'

interface ParamsApi extends Blockly.Block {
  addParam_(): void
}

function ctorParamsOf(ws: Blockly.Workspace): string[] {
  const ir = irInFrame(ws)
  const decl = behaviorStatements(ir).find((s) => s.type === 'classDecl')
  if (decl?.type !== 'classDecl') throw new Error('sem classDecl')
  return decl.ctorParams ?? []
}

function newCtorWith(ws: Blockly.Workspace): ParamsApi {
  const cls = ws.newBlock('sz_js_class')
  cls.setFieldValue('Pessoa', 'NAME')
  const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
  const members = cls.getInput('MEMBERS')
  if (members?.connection && ctor.previousConnection) {
    members.connection.connect(ctor.previousConnection)
  }
  return ctor
}

describe('sanitize de parâmetro no bloco — nome do modelo casa com o código (#25)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('palavra reservada `class` vira `class_` já na camada de blocos', () => {
    const ws = new Blockly.Workspace()
    const ctor = newCtorWith(ws)
    ctor.addParam_()
    ctor.setFieldValue('class', 'P0')
    // O modelo NÃO guarda mais `class` cru (gerava `constructor(class)` →
    // SyntaxError); guarda o mesmo identificador que o gerador emitiria.
    expect(ctor.getFieldValue('P0')).toBe('class_')
    expect(ctorParamsOf(ws)).toEqual(['class_'])
  })

  it('nome com dígito inicial `2x` vira `_2x`', () => {
    const ws = new Blockly.Workspace()
    const ctor = newCtorWith(ws)
    ctor.addParam_()
    ctor.setFieldValue('2x', 'P0')
    expect(ctor.getFieldValue('P0')).toBe('_2x')
    expect(ctorParamsOf(ws)).toEqual(['_2x'])
  })

  it('`return` vira `return_`', () => {
    const ws = new Blockly.Workspace()
    const ctor = newCtorWith(ws)
    ctor.addParam_()
    ctor.setFieldValue('return', 'P0')
    expect(ctor.getFieldValue('P0')).toBe('return_')
  })
})
