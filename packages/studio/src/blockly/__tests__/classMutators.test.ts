import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'

interface ExtendsApi extends Blockly.Block {
  addExtends_(): void
}
interface ParamsApi extends Blockly.Block {
  addParam_(): void
}
interface ArgsApi extends Blockly.Block {
  syncShape_(): void
}

function classDeclOf(ws: Blockly.Workspace) {
  const ir = buildIRFromWorkspace(ws)
  const decl = ir.js.find((s) => s.type === 'classDecl')
  if (decl?.type !== 'classDecl') throw new Error('sem classDecl')
  return decl
}

describe('mutators de classe — + adiciona herança e parâmetros', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('addExtends_ + campo SUPER → classDecl.superClass no IR', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class') as ExtendsApi
    cls.setFieldValue('Cao', 'NAME')

    // Antes de clicar no +, não há herança.
    expect(classDeclOf(ws).superClass).toBeUndefined()

    // Clicar no + abre a cláusula extends (com SUPER = 'Base' por padrão).
    cls.addExtends_()
    cls.setFieldValue('Animal', 'SUPER')
    expect(classDeclOf(ws).superClass).toBe('Animal')
  })

  it('addParam_ no construtor → ctorParams no IR', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    // Encaixa o construtor em MEMBERS da classe.
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    expect(classDeclOf(ws).ctorParams).toEqual([])

    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')
    expect(classDeclOf(ws).ctorParams).toEqual(['nome'])
  })

  it('rejeita renomear um parâmetro para um nome já usado por outro (evita constructor(x, x))', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    ctor.addParam_()
    ctor.addParam_()
    ctor.setFieldValue('x', 'P0')
    ctor.setFieldValue('y', 'P1')
    expect(classDeclOf(ws).ctorParams).toEqual(['x', 'y'])

    // Renomear P1 para 'x' colidiria com P0 → o validador rejeita e mantém 'y',
    // evitando gerar `constructor(x, x)` (SyntaxError ao rodar).
    ctor.setFieldValue('x', 'P1')
    expect(ctor.getFieldValue('P1')).toBe('y')
    expect(classDeclOf(ws).ctorParams).toEqual(['x', 'y'])
  })

  it('ignora insertion markers ao montar a IR', () => {
    const ws = new Blockly.Workspace()
    const real = ws.newBlock('sz_js_class')
    real.setFieldValue('Pessoa', 'NAME')
    const marker = ws.newBlock('sz_js_class')
    marker.setFieldValue('Pessoa', 'NAME')
    marker.setInsertionMarker(true)

    const ir = buildIRFromWorkspace(ws)
    expect(ir.js.filter((s) => s.type === 'classDecl')).toHaveLength(1)
  })

  it('sincroniza argumentos de new Classe com parâmetros do construtor', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    const members = cls.getInput('MEMBERS')
    if (members?.connection && ctor.previousConnection) {
      members.connection.connect(ctor.previousConnection)
    }

    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')

    const createPessoa = ws.newBlock('sz_js_new_var') as ArgsApi
    createPessoa.setFieldValue('pessoa', 'VARNAME')
    createPessoa.setFieldValue('Pessoa', 'CLASS')
    createPessoa.syncShape_()

    expect(createPessoa.getInput('ARG0')).toBeTruthy()
    expect(createPessoa.getInput('ARG1')).toBeNull()
  })

  it('sincroniza argumentos de chamada de método usando o input MEMBERS da classe', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const method = ws.newBlock('sz_js_class_method') as ParamsApi
    method.setFieldValue('falar', 'NAME')
    const members = cls.getInput('MEMBERS')
    if (members?.connection && method.previousConnection) {
      members.connection.connect(method.previousConnection)
    }
    method.addParam_()
    method.setFieldValue('texto', 'P0')

    const createPessoa = ws.newBlock('sz_js_new_var')
    createPessoa.setFieldValue('pessoa', 'VARNAME')
    createPessoa.setFieldValue('Pessoa', 'CLASS')

    const call = ws.newBlock('sz_js_call_method') as ArgsApi
    call.setFieldValue('pessoa', 'OBJ')
    call.setFieldValue('falar', 'METHOD')
    call.syncShape_()

    expect(call.getInput('ARG0')).toBeTruthy()
    expect(call.getInput('ARG1')).toBeNull()
  })
})
