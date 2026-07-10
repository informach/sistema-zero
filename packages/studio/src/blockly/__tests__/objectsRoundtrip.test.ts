import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import type { JSStatement } from '#ir'
import { parseProjectFiles } from '#parsers'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '../workspaceState'

// Cenário do "joguinho de tiro" da aluna: o que motivou o suporte a objetos.
// Exercita criar objeto literal genérico, ler/escrever propriedade aninhada
// (`this.velocidade.x`) e chamar método (comando e valor) sobre uma instância.
const SCRIPT = `class Projetil {
  constructor(x, y, velocidade) {
    this.x = x;
    this.y = y;
    this.velocidade = velocidade;
  }
  atualizar() {
    this.x = this.x + this.velocidade.x;
    this.y = this.y + this.velocidade.y;
  }
}

const config = { dano: 10, ativo: true };

function atirar() {
  const velocidade = { x: 1, y: 2 };
  const p = new Projetil(0, 0, velocidade);
  config.dano = 20;
  p.atualizar();
  const total = p.calcular(5);
}`

function files(script: string): {
  'index.html': string
  'style.css': string
  'script.js': string
} {
  return { 'index.html': '<canvas id="tela"></canvas>', 'style.css': '', 'script.js': script }
}

function collectTypes(blocks: SerializedBlocklyBlock[]): string[] {
  const out: string[] = []
  const visit = (b: SerializedBlocklyBlock) => {
    out.push(b.type)
    if (b.inputs) {
      for (const input of Object.values(b.inputs)) {
        if (input.block) visit(input.block)
        if (input.shadow) visit(input.shadow)
      }
    }
    if (b.next) visit(b.next.block)
  }
  for (const b of blocks) visit(b)
  return out
}

function rawCount(stmts: JSStatement[]): number {
  let n = 0
  const walk = (list: JSStatement[]) => {
    for (const s of list) {
      if (s.type === 'rawJS') n += 1
      else if (s.type === 'classDecl') {
        walk(s.ctorBody)
        for (const m of s.methods) walk(m.body)
      } else if (s.type === 'if') {
        walk(s.then)
        if (s.else) walk(s.else)
      } else if ('body' in s && Array.isArray((s as { body?: unknown }).body)) {
        walk((s as { body: JSStatement[] }).body)
      }
    }
  }
  walk(stmts)
  return n
}

describe('Objetos — round-trip código↔blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  const parsed1 = parseProjectFiles(files(SCRIPT))
  const regenerated = generateProjectFiles({ ir: parsed1, projectName: 'Tiro' })
  const parsed2 = parseProjectFiles(regenerated)

  it('o ciclo bloco↔texto é estável (parse → gerar → parse não degrada)', () => {
    expect(parsed2.js).toEqual(parsed1.js)
  })

  it('o ciclo completo da Ponte (via Blockly real) preserva a IR — mutator e buildIR ok', () => {
    // Carrega o estado serializado num workspace de verdade (exercita
    // loadExtraState do sz_object_mutator/sz_args_mutator) e lê de volta.
    const state = buildWorkspaceStateFromIR(parsed1)
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const ir2 = buildIRFromWorkspace(ws)
    // Compara o CÓDIGO regenerado (a IR vinda do workspace carrega __id dos blocos).
    const out = generateProjectFiles({
      ir: { ...ir2, htmlShell: parsed1.htmlShell },
      projectName: 'Tiro',
    })
    expect(out['script.js']).toEqual(regenerated['script.js'])
  })

  it('cria objeto, lê/escreve propriedade aninhada e chama método como blocos', () => {
    const types = collectTypes(buildWorkspaceStateFromIR(parsed1).blocks.blocks)
    for (const expected of [
      'sz_val_object', // const config = { dano: 10, ativo: true }
      'sz_val_member_get', // this.velocidade.x / this.velocidade.y
      'sz_js_member_set', // config.dano = 20
      'sz_js_method_on', // p.atualizar()
      'sz_val_method_on', // const total = p.calcular(5)
      'sz_val_vector2d', // const velocidade = { x: 1, y: 2 }
    ]) {
      expect(types, `faltou o bloco ${expected}`).toContain(expected)
    }
  })

  it('nada sobra como código avançado (rawCount == 0)', () => {
    expect(rawCount(parsed1.js)).toBe(0)
  })

  it('`this.velocidade.x` vira memberGet aninhado (objeto = minha propriedade)', () => {
    const klass = parsed1.js.find((s) => s.type === 'classDecl')
    expect(klass?.type).toBe('classDecl')
    if (klass?.type !== 'classDecl') return
    const atualizar = klass.methods.find((m) => m.name === 'atualizar')
    expect(atualizar?.body[0]).toMatchObject({
      type: 'setThisProp',
      name: 'x',
      value: {
        type: 'binop',
        op: '+',
        left: { type: 'thisProp', name: 'x' },
        right: { type: 'memberGet', object: { type: 'thisProp', name: 'velocidade' }, name: 'x' },
      },
    })
  })
})

// Blocos novos: Object.keys/values/entries, acesso por chave e imagem do projeto.
const SCRIPT2 = `const chaves = Object.keys(config);
const valores = Object.values(config);
const arte = (window.__SZGAME_ASSETS?.["heroi"] ?? "heroi");

class Cena {
  desenhar() {
    const atual = this.dados[chave];
  }
}`

describe('Object.keys/values, acesso por chave e imagem — round-trip', () => {
  beforeAll(() => ensureBlocklyInitialized())

  const parsed1 = parseProjectFiles(files(SCRIPT2))
  const regenerated = generateProjectFiles({ ir: parsed1, projectName: 'Cena' })
  const parsed2 = parseProjectFiles(regenerated)

  it('o ciclo bloco↔texto é estável (parse → gerar → parse não degrada)', () => {
    expect(parsed2.js).toEqual(parsed1.js)
  })

  it('gera os blocos novos e nada sobra como avançado', () => {
    const types = collectTypes(buildWorkspaceStateFromIR(parsed1).blocks.blocks)
    for (const expected of ['sz_val_object_op', 'sz_val_index_get', 'sz_val_image']) {
      expect(types, `faltou o bloco ${expected}`).toContain(expected)
    }
    expect(rawCount(parsed1.js)).toBe(0)
  })

  it('via Blockly real: bloco → IR → código preserva a saída', () => {
    const state = buildWorkspaceStateFromIR(parsed1)
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const ir2 = buildIRFromWorkspace(ws)
    const out = generateProjectFiles({
      ir: { ...ir2, htmlShell: parsed1.htmlShell },
      projectName: 'Cena',
    })
    expect(out['script.js']).toEqual(regenerated['script.js'])
  })
})

// Fase 4b — o padrão `Resources` que motivou a ampliação: carrega imagens
// iterando um objeto (`Object.keys(...).forEach`), lê por chave (`toLoad[key]`)
// e cria a imagem (`new Image(); img.src = ...`).
const SCRIPT3 = `class Resources {
  constructor() {
    this.toLoad = { sky: "sky.png", ground: "ground.png" };
    this.images = {};
    Object.keys(this.toLoad).forEach((key) => {
      const img = new Image();
      img.src = this.toLoad[key];
    });
  }
}`

describe('Resources — new Image + forEach + Object.keys + índice (Fase 4b)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  const parsed1 = parseProjectFiles(files(SCRIPT3))
  const regenerated = generateProjectFiles({ ir: parsed1, projectName: 'Recursos' })
  const parsed2 = parseProjectFiles(regenerated)

  it('o ciclo bloco↔texto é estável (parse → gerar → parse não degrada)', () => {
    expect(parsed2.js).toEqual(parsed1.js)
  })

  it('gera os blocos novos e nada sobra como avançado', () => {
    const types = collectTypes(buildWorkspaceStateFromIR(parsed1).blocks.blocks)
    for (const expected of [
      'sz_js_for_each',
      'sz_val_object_op',
      'sz_js_new_image',
      'sz_val_index_get',
    ]) {
      expect(types, `faltou o bloco ${expected}`).toContain(expected)
    }
    expect(rawCount(parsed1.js)).toBe(0)
  })

  it('via Blockly real: bloco → IR → código preserva a saída', () => {
    const state = buildWorkspaceStateFromIR(parsed1)
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const ir2 = buildIRFromWorkspace(ws)
    const out = generateProjectFiles({
      ir: { ...ir2, htmlShell: parsed1.htmlShell },
      projectName: 'Recursos',
    })
    expect(out['script.js']).toEqual(regenerated['script.js'])
  })
})

// Resources COMPLETO: escrita por índice (`this.images[key] = {…}`) + handler de
// carregamento (`img.onload = () => {…}`) — os 2 últimos trechos que caíam no rawJS.
const SCRIPT4 = `class Resources {
  constructor() {
    this.toLoad = { sky: (window.__SZGAME_ASSETS?.["sky"] ?? "sky") };
    this.images = {};
    Object.keys(this.toLoad).forEach((key) => {
      const img = new Image();
      img.src = this.toLoad[key];
      this.images[key] = { image: img, isLoaded: false };
      img.onload = () => {
        this.images[key].isLoaded = true;
      };
    });
  }
}`

describe('Resources completo — indexSet + img.onload viram blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  const parsed1 = parseProjectFiles(files(SCRIPT4))
  const regenerated = generateProjectFiles({ ir: parsed1, projectName: 'Recursos' })
  const parsed2 = parseProjectFiles(regenerated)

  it('o ciclo bloco↔texto é estável (parse → gerar → parse não degrada)', () => {
    expect(parsed2.js).toEqual(parsed1.js)
  })

  it('gera os blocos novos e nada sobra como avançado', () => {
    const types = collectTypes(buildWorkspaceStateFromIR(parsed1).blocks.blocks)
    for (const expected of ['sz_js_index_set', 'sz_js_image_onload']) {
      expect(types, `faltou o bloco ${expected}`).toContain(expected)
    }
    expect(rawCount(parsed1.js)).toBe(0)
  })

  it('via Blockly real: bloco → IR → código preserva a saída', () => {
    const state = buildWorkspaceStateFromIR(parsed1)
    const ws = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const ir2 = buildIRFromWorkspace(ws)
    const out = generateProjectFiles({
      ir: { ...ir2, htmlShell: parsed1.htmlShell },
      projectName: 'Recursos',
    })
    expect(out['script.js']).toEqual(regenerated['script.js'])
  })
})
