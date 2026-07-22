import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { ensureBlocklyInitialized } from '../../setup'
import {
  type BlockScanner,
  classMethodNames,
  classOfInstance,
  classPropertyNames,
  constructorParams,
  enclosingClass,
  findClass,
  methodParams,
  superClassMethodNames,
} from '../classIntrospection'

interface ExtendsApi extends Blockly.Block {
  addExtends_(): void
}
interface ParamsApi extends Blockly.Block {
  addParam_(): void
}

const scannerFor =
  (ws: Blockly.Workspace): BlockScanner =>
  (type) =>
    ws.getBlocksByType(type, false)

/** Encaixa um bloco de comando no topo de um input de statement do pai. */
function connectStatement(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const conn = parent.getInput(input)?.connection
  if (conn && child.previousConnection) conn.connect(child.previousConnection)
}

/** Encadeia um bloco de comando logo APÓS outro (mesma pilha). */
function chainAfter(prev: Blockly.Block, next: Blockly.Block): void {
  if (prev.nextConnection && next.previousConnection) {
    prev.nextConnection.connect(next.previousConnection)
  }
}

/** Monta uma classe com um construtor (props `this.x`) e métodos, encaixados em MEMBERS. */
function makeClass(
  ws: Blockly.Workspace,
  name: string,
  opts: { props?: string[]; methods?: string[] } = {},
): Blockly.Block {
  const cls = ws.newBlock('sz_js_class')
  cls.setFieldValue(name, 'NAME')
  const ctor = ws.newBlock('sz_js_constructor')
  connectStatement(cls, 'MEMBERS', ctor)
  // Propriedades: `this.<prop> = …` no corpo do construtor.
  let last: Blockly.Block | null = null
  for (const prop of opts.props ?? []) {
    const set = ws.newBlock('sz_js_set_this_prop')
    set.setFieldValue(prop, 'NAME')
    if (last) chainAfter(last, set)
    else connectStatement(ctor, 'BODY', set)
    last = set
  }
  // Métodos: encadeados após o construtor na cadeia MEMBERS.
  let lastMember: Blockly.Block = ctor
  for (const method of opts.methods ?? []) {
    const m = ws.newBlock('sz_js_class_method')
    m.setFieldValue(method, 'NAME')
    chainAfter(lastMember, m)
    lastMember = m
  }
  return cls
}

describe('classIntrospection — achar classes e enumerar membros', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('findClass acha a classe pelo nome (e null quando não existe)', () => {
    const ws = new Blockly.Workspace()
    makeClass(ws, 'Pessoa')
    const scan = scannerFor(ws)
    expect(findClass(scan, 'Pessoa')?.getFieldValue('NAME')).toBe('Pessoa')
    expect(findClass(scan, 'Fantasma')).toBeNull()
    expect(findClass(scan, '')).toBeNull()
  })

  it('classOfInstance resolve a variável de instância → classe (via criar x = novo Classe)', () => {
    const ws = new Blockly.Workspace()
    makeClass(ws, 'Pessoa')
    const novo = ws.newBlock('sz_js_new_var')
    novo.setFieldValue('joao', 'VARNAME')
    novo.setFieldValue('Pessoa', 'CLASS')

    const scan = scannerFor(ws)
    expect(classOfInstance(scan, 'joao')?.getFieldValue('NAME')).toBe('Pessoa')
    expect(classOfInstance(scan, 'ninguem')).toBeNull()
  })

  it('classPropertyNames lista as propriedades escritas com this.<x> (ordem, sem repetir)', () => {
    const ws = new Blockly.Workspace()
    const cls = makeClass(ws, 'Pessoa', { props: ['nome', 'idade', 'nome'] })
    expect(classPropertyNames(scannerFor(ws), cls)).toEqual(['nome', 'idade'])
  })

  it('classMethodNames lista os métodos da classe', () => {
    const ws = new Blockly.Workspace()
    const cls = makeClass(ws, 'Pessoa', { methods: ['falar', 'andar'] })
    expect(classMethodNames(scannerFor(ws), cls)).toEqual(['falar', 'andar'])
  })

  it('propriedades e métodos incluem os HERDADOS da classe-mãe (own primeiro)', () => {
    const ws = new Blockly.Workspace()
    makeClass(ws, 'Animal', { props: ['vida'], methods: ['respirar'] })
    const dog = makeClass(ws, 'Cachorro', { props: ['nome'], methods: ['latir'] }) as ExtendsApi
    dog.addExtends_()
    dog.setFieldValue('Animal', 'SUPER')

    const scan = scannerFor(ws)
    expect(classPropertyNames(scan, dog)).toEqual(['nome', 'vida'])
    expect(classMethodNames(scan, dog)).toEqual(['latir', 'respirar'])
  })

  it('superClassMethodNames oferece somente métodos da classe-mãe e seus ancestrais', () => {
    const ws = new Blockly.Workspace()
    makeClass(ws, 'SerVivo', { methods: ['existir'] })
    const animal = makeClass(ws, 'Animal', { methods: ['respirar'] }) as ExtendsApi
    animal.addExtends_()
    animal.setFieldValue('SerVivo', 'SUPER')
    const dog = makeClass(ws, 'Cachorro', { methods: ['latir'] }) as ExtendsApi
    dog.addExtends_()
    dog.setFieldValue('Animal', 'SUPER')

    expect(superClassMethodNames(scannerFor(ws), dog)).toEqual(['respirar', 'existir'])
  })

  it('herança cíclica (A estende B, B estende A) não trava — guarda de visitados', () => {
    const ws = new Blockly.Workspace()
    const a = makeClass(ws, 'A', { props: ['x'] }) as ExtendsApi
    const b = makeClass(ws, 'B', { props: ['y'] }) as ExtendsApi
    a.addExtends_()
    a.setFieldValue('B', 'SUPER')
    b.addExtends_()
    b.setFieldValue('A', 'SUPER')

    const scan = scannerFor(ws)
    // Termina e junta ambas uma única vez (ordem: própria depois a mãe).
    expect(classPropertyNames(scan, a)).toEqual(['x', 'y'])
    expect(classPropertyNames(scan, b)).toEqual(['y', 'x'])
  })

  it('enclosingClass sobe pelos blocos que envolvem até a classe', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor')
    connectStatement(cls, 'MEMBERS', ctor)
    const set = ws.newBlock('sz_js_set_this_prop')
    set.setFieldValue('nome', 'NAME')
    connectStatement(ctor, 'BODY', set)

    expect(enclosingClass(set)).toBe(cls)
    // Um bloco solto (fora de qualquer classe) → null.
    const solto = ws.newBlock('sz_js_set_this_prop')
    expect(enclosingClass(solto)).toBeNull()
    expect(enclosingClass(null)).toBeNull()
  })

  it('constructorParams e methodParams leem a assinatura pela cadeia MEMBERS', () => {
    const ws = new Blockly.Workspace()
    const cls = ws.newBlock('sz_js_class')
    cls.setFieldValue('Pessoa', 'NAME')
    const ctor = ws.newBlock('sz_js_constructor') as ParamsApi
    connectStatement(cls, 'MEMBERS', ctor)
    ctor.addParam_()
    ctor.setFieldValue('nome', 'P0')
    const method = ws.newBlock('sz_js_class_method') as ParamsApi
    method.setFieldValue('falar', 'NAME')
    chainAfter(ctor, method)
    method.addParam_()
    method.setFieldValue('texto', 'P0')

    expect(constructorParams(cls)).toEqual(['nome'])
    expect(methodParams(cls, 'falar')).toEqual(['texto'])
    expect(methodParams(cls, 'inexistente')).toBeNull()
  })
})
