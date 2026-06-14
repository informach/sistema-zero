import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import type { SZIR } from '#ir'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** IR -> blocos -> Blockly -> IR -> código (sem passar pelo parser). */
function irRoundTrip(js: SZIR['js']): string {
  const ir1: SZIR = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return generateProjectFiles({ ir: ir2, projectName: 'X' })['script.js']
}

describe('blocos de valor (sockets) — round-trip IR<->blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('preserva window.innerWidth/Height no bloco de tamanho do canvas', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasSetSize',
        ctxVar: 'ctx',
        w: { type: 'global', kind: 'innerWidth' },
        h: { type: 'global', kind: 'innerHeight' },
      },
    ])
    expect(js).toContain('canvas.width = window.innerWidth;')
    expect(js).toContain('canvas.height = window.innerHeight;')
  })

  it('preserva canvasDim e número aleatório no desenho de círculo', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasArc',
        ctxVar: 'ctx',
        x: { type: 'canvasDim', ctxVar: 'ctx', dim: 'width' },
        y: { type: 'num', value: 50 },
        r: { type: 'random', min: { type: 'num', value: 5 }, max: { type: 'num', value: 20 } },
      },
    ])
    expect(js).toContain(
      'ctx.arc(canvas.width, 50, Math.floor(Math.random() * ((20) - (5) + 1)) + (5)',
    )
  })

  it('preserva números simples (shadow) num retângulo', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasFillRect',
        ctxVar: 'ctx',
        x: { type: 'num', value: 10 },
        y: { type: 'num', value: 20 },
        w: { type: 'num', value: 30 },
        h: { type: 'num', value: 40 },
      },
    ])
    expect(js).toContain('ctx.fillRect(10, 20, 30, 40);')
  })

  it('preserva cor literal no bloco de cor do pincel (seletor → sz_val_color)', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'color', value: '#ff0000' } },
    ])
    expect(js).toContain('ctx.fillStyle = "#ff0000";')
  })

  it('preserva cor com transparência (rgba) no bloco de cor do pincel', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasFillStyle',
        ctxVar: 'ctx',
        color: { type: 'colorAlpha', hex: '#000000', alpha: 0.1 },
      },
    ])
    expect(js).toContain('ctx.fillStyle = "rgba(0, 0, 0, 0.1)";')
  })

  it('cor HSL com matiz aleatório: número literal inline e expressão interpolada', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasFillStyle',
        ctxVar: 'ctx',
        color: {
          type: 'hslColor',
          h: {
            type: 'binop',
            op: '*',
            left: { type: 'randomFloat' },
            right: { type: 'num', value: 360 },
          },
          s: { type: 'num', value: 50 },
          l: { type: 'num', value: 50 },
        },
      },
    ])
    // biome-ignore lint/suspicious/noTemplateCurlyInString: o `${...}` é o código esperado a casar, não interpolação.
    expect(js).toContain('ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;')
  })

  it('preserva cor por variável no bloco de cor do pincel (não vira código avançado)', () => {
    const ir1: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
        { type: 'canvasFillStyle', ctxVar: 'ctx', color: { type: 'var', name: 'minhaCor' } },
      ],
      extensions: [],
    }
    const serialized = JSON.stringify(buildWorkspaceStateFromIR(ir1))
    expect(serialized).toContain('sz_canvas_fill_style')
    expect(serialized).toContain('sz_val_variable')
    expect(serialized).not.toContain('sz_adv_raw_js')

    const js = irRoundTrip(ir1.js)
    expect(js).toContain('ctx.fillStyle = minhaCor;')
  })

  it('preserva expressões encaixadas no translate do canvas', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'canvasTranslate',
        ctxVar: 'ctx',
        x: { type: 'canvasDim', ctxVar: 'ctx', dim: 'width' },
        y: { type: 'global', kind: 'innerHeight' },
      },
    ])

    expect(js).toContain('ctx.translate(canvas.width, window.innerHeight);')
  })

  it('round-trip de constante e variável com conta de matemática encaixada', () => {
    const js = irRoundTrip([
      { type: 'var', kind: 'const', name: 'PI', value: { type: 'num', value: 3 } },
      {
        type: 'var',
        name: 'area',
        value: {
          type: 'binop',
          op: '*',
          left: { type: 'var', name: 'PI' },
          right: {
            type: 'binop',
            op: '**',
            left: { type: 'var', name: 'r' },
            right: { type: 'num', value: 2 },
          },
        },
      },
      {
        type: 'assign',
        name: 'area',
        value: { type: 'mathUnary', fn: 'round', arg: { type: 'var', name: 'area' } },
      },
    ])
    expect(js).toContain('const PI = 3;')
    expect(js).toContain('let area = PI * r ** 2;')
    expect(js).toContain('area = Math.round(area);')
  })

  it('os blocos de matemática não viram código avançado no editor', () => {
    const ir1: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'var',
          name: 'm',
          value: {
            type: 'mathBinary',
            fn: 'max',
            a: { type: 'var', name: 'a' },
            b: { type: 'num', value: 10 },
          },
        },
      ],
      extensions: [],
    }
    const serialized = JSON.stringify(buildWorkspaceStateFromIR(ir1))
    expect(serialized).toContain('sz_math_minmax')
    expect(serialized).toContain('sz_js_var_create')
    expect(serialized).not.toContain('sz_adv_raw_js')
  })

  it('round-trip de classe completa (propriedades, método usando this, new e chamada)', () => {
    const js = irRoundTrip([
      { type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' },
      {
        type: 'classDecl',
        name: 'Jogador',
        ctorBody: [
          { type: 'setThisProp', name: 'x', value: { type: 'num', value: 100 } },
          { type: 'setThisProp', name: 'y', value: { type: 'num', value: 50 } },
        ],
        methods: [
          {
            name: 'desenhar',
            params: [],
            body: [
              {
                type: 'canvasFillRect',
                ctxVar: 'ctx',
                x: { type: 'thisProp', name: 'x' },
                y: { type: 'thisProp', name: 'y' },
                w: { type: 'num', value: 20 },
                h: { type: 'num', value: 20 },
              },
            ],
          },
        ],
      },
      { type: 'newInstance', varName: 'jogador', className: 'Jogador' },
      { type: 'callMethod', objectVar: 'jogador', method: 'desenhar' },
    ])
    expect(js).toContain('class Jogador {')
    expect(js).toContain('this.x = 100;')
    expect(js).toContain('this.y = 50;')
    expect(js).toContain('desenhar() {')
    expect(js).toContain('ctx.fillRect(this.x, this.y, 20, 20);')
    expect(js).toContain('const jogador = new Jogador();')
    expect(js).toContain('jogador.desenhar();')
  })

  it('round-trip de classe com construtor parametrizado, params no corpo e argumentos', () => {
    const js = irRoundTrip([
      {
        type: 'classDecl',
        name: 'Pessoa',
        ctorParams: ['nome', 'idade'],
        ctorBody: [
          { type: 'setThisProp', name: 'nome', value: { type: 'var', name: 'nome' } },
          { type: 'setThisProp', name: 'idade', value: { type: 'var', name: 'idade' } },
        ],
        methods: [
          {
            name: 'cumprimentar',
            params: ['saudacao'],
            body: [{ type: 'alert', value: { type: 'var', name: 'saudacao' } }],
          },
        ],
      },
      {
        type: 'newInstance',
        varName: 'p',
        className: 'Pessoa',
        args: [
          { type: 'str', value: 'Ana' },
          { type: 'num', value: 20 },
        ],
      },
      {
        type: 'callMethod',
        objectVar: 'p',
        method: 'cumprimentar',
        args: [{ type: 'str', value: 'Oi' }],
      },
    ])
    expect(js).toContain('constructor(nome, idade) {')
    expect(js).toContain('this.nome = nome;')
    expect(js).toContain('this.idade = idade;')
    expect(js).toContain('cumprimentar(saudacao) {')
    expect(js).toContain('alert(saudacao);')
    expect(js).toContain('const p = new Pessoa("Ana", 20);')
    expect(js).toContain('p.cumprimentar("Oi");')
  })

  it('round-trip dos recursos novos: ctor com lógica, método com retorno, get/set e chamada-valor', () => {
    const js = irRoundTrip([
      {
        type: 'classDecl',
        name: 'Caixa',
        ctorParams: ['inicial'],
        ctorBody: [
          { type: 'setThisProp', name: 'valor', value: { type: 'var', name: 'inicial' } },
          {
            type: 'if',
            cond: {
              type: 'binop',
              op: '<',
              left: { type: 'var', name: 'inicial' },
              right: { type: 'num', value: 0 },
            },
            then: [{ type: 'setThisProp', name: 'valor', value: { type: 'num', value: 0 } }],
          },
        ],
        methods: [
          {
            name: 'ler',
            params: [],
            body: [{ type: 'return', value: { type: 'thisProp', name: 'valor' } }],
          },
        ],
      },
      { type: 'newInstance', varName: 'c', className: 'Caixa', args: [{ type: 'num', value: 5 }] },
      { type: 'setProp', objectVar: 'c', name: 'valor', value: { type: 'num', value: 9 } },
      {
        type: 'setProp',
        objectVar: 'c',
        name: 'copia',
        value: { type: 'propAccess', objectVar: 'c', name: 'valor' },
      },
      {
        type: 'setProp',
        objectVar: 'c',
        name: 'lido',
        value: { type: 'callMethodExpr', objectVar: 'c', method: 'ler', args: [] },
      },
    ])
    expect(js).toContain('constructor(inicial) {')
    expect(js).toContain('this.valor = inicial;')
    expect(js).toContain('if (inicial < 0) {')
    expect(js).toContain('ler() {')
    expect(js).toContain('return this.valor;')
    expect(js).toContain('const c = new Caixa(5);')
    expect(js).toContain('c.valor = 9;')
    expect(js).toContain('c.copia = c.valor;')
    expect(js).toContain('c.lido = c.ler();')
  })

  it('round-trip de classe com herança (extends) e construtor', () => {
    const js = irRoundTrip([
      {
        type: 'classDecl',
        name: 'Cao',
        superClass: 'Animal',
        ctorParams: ['nome'],
        ctorBody: [{ type: 'setThisProp', name: 'nome', value: { type: 'var', name: 'nome' } }],
        methods: [
          {
            name: 'latir',
            params: [],
            body: [{ type: 'alert', value: { type: 'str', value: 'au' } }],
          },
        ],
      },
    ])
    expect(js).toContain('class Cao extends Animal {')
    expect(js).toContain('constructor(nome) {')
    expect(js).toContain('this.nome = nome;')
    expect(js).toContain('latir() {')
  })

  it('propriedade que usa parâmetro do construtor vira relator (sz_val_arg)', () => {
    const ir1: SZIR = {
      html: [],
      css: [],
      js: [
        {
          type: 'classDecl',
          name: 'Pessoa',
          ctorParams: ['nome'],
          ctorBody: [{ type: 'setThisProp', name: 'nome', value: { type: 'var', name: 'nome' } }],
          methods: [],
        },
      ],
      extensions: [],
    }
    const serialized = JSON.stringify(buildWorkspaceStateFromIR(ir1))
    expect(serialized).toContain('sz_val_arg')
    expect(serialized).not.toContain('sz_val_variable')
  })
})
