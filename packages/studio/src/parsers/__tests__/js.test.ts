import { describe, expect, it } from 'bun:test'
import { parse } from '@babel/parser'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

/** Confere que `code` é JS re-parseável (sem lançar nem erros de recuperação). */
function isReparseable(code: string): boolean {
  try {
    const ast = parse(code, { sourceType: 'module', errorRecovery: true })
    return ((ast as { errors?: unknown[] }).errors ?? []).length === 0
  } catch {
    return false
  }
}

describe('parseJS', () => {
  it('reconhece console.log com string literal', () => {
    const ir = parseJS('console.log("oi");')
    expect(ir).toEqual([{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }])
  })

  it('reconhece var literal numérico', () => {
    const ir = parseJS('let contador = 0;')
    expect(ir).toEqual([{ type: 'var', name: 'contador', value: { type: 'num', value: 0 } }])
  })

  it('preserva literal numérico que estoura (1e1000 → texto cru, não 0)', () => {
    // O Babel parseia `1e1000` como `Infinity` sem erro; `Infinity` viraria `null`
    // no JSON e o gerador o reescreve como `0` — então a linha precisa cair em
    // rawJS, preservando o texto-fonte original (atalho do var fast-path inclusive).
    expect(parseJS('const x = 1e1000;')).toEqual([
      { type: 'rawJS', code: 'const x = 1e1000;', advanced: true },
    ])
    // Mesmo via toExpr (init não-literal direto): valor não finito dentro de uma conta.
    expect(parseJS('let y = 1e999 + 1;')).toEqual([
      { type: 'rawJS', code: 'let y = 1e999 + 1;', advanced: true },
    ])
  })

  it('reconhece atribuição literal', () => {
    const ir = parseJS('x = 5;')
    expect(ir).toEqual([{ type: 'assign', name: 'x', value: { type: 'num', value: 5 } }])
  })

  it('reconhece const como var com kind:const', () => {
    const ir = parseJS('const PI = 3;')
    expect(ir).toEqual([
      { type: 'var', name: 'PI', value: { type: 'num', value: 3 }, kind: 'const' },
    ])
  })

  it('reconhece contas (resto, potência) e Math.* como valor de variável', () => {
    expect(parseJS('let r = a % 2;')).toEqual([
      {
        type: 'var',
        name: 'r',
        value: {
          type: 'binop',
          op: '%',
          left: { type: 'var', name: 'a' },
          right: { type: 'num', value: 2 },
        },
      },
    ])
    expect(parseJS('let p = a ** 2;')).toEqual([
      {
        type: 'var',
        name: 'p',
        value: {
          type: 'binop',
          op: '**',
          left: { type: 'var', name: 'a' },
          right: { type: 'num', value: 2 },
        },
      },
    ])
    expect(parseJS('const q = Math.sqrt(a);')).toEqual([
      {
        type: 'var',
        name: 'q',
        kind: 'const',
        value: { type: 'mathUnary', fn: 'sqrt', arg: { type: 'var', name: 'a' } },
      },
    ])
    expect(parseJS('let m = Math.max(a, 10);')).toEqual([
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
    ])
  })

  it('reconhece trigonometria, atan2, Math.PI e conversão de ângulo', () => {
    expect(parseJS('let s = Math.sin(a);')[0]).toMatchObject({
      type: 'var',
      value: { type: 'mathUnary', fn: 'sin', arg: { type: 'var', name: 'a' } },
    })
    expect(parseJS('let g = Math.atan2(dy, dx);')[0]).toMatchObject({
      type: 'var',
      value: {
        type: 'mathBinary',
        fn: 'atan2',
        a: { type: 'var', name: 'dy' },
        b: { type: 'var', name: 'dx' },
      },
    })
    expect(parseJS('let p = Math.PI;')[0]).toMatchObject({
      type: 'var',
      value: { type: 'mathConst', name: 'PI' },
    })
    expect(parseJS('let rad = (90 * Math.PI / 180);')[0]).toMatchObject({
      type: 'var',
      value: { type: 'angleConvert', dir: 'degToRad', arg: { type: 'num', value: 90 } },
    })
    expect(parseJS('let deg = (r * 180 / Math.PI);')[0]).toMatchObject({
      type: 'var',
      value: { type: 'angleConvert', dir: 'radToDeg', arg: { type: 'var', name: 'r' } },
    })
  })

  it('reconhece clique global no documento → event com targetKind document', () => {
    const code = `document.addEventListener("click", (event) => {\n  let mx = event.clientX;\n  let my = event.clientY;\n});`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({
      type: 'event',
      event: 'click',
      targetKind: 'document',
      body: [
        { type: 'var', name: 'mx', value: { type: 'eventProp', prop: 'clientX' } },
        { type: 'var', name: 'my', value: { type: 'eventProp', prop: 'clientY' } },
      ],
    })
  })

  it('reconhece vetores 2D e 3D como objeto literal', () => {
    expect(parseJS('let pos = { x: 10, y: 20 };')[0]).toMatchObject({
      type: 'var',
      value: { type: 'vec2', x: { type: 'num', value: 10 }, y: { type: 'num', value: 20 } },
    })
    expect(parseJS('let p3 = { x: a, y: 0, z: 5 };')[0]).toMatchObject({
      type: 'var',
      value: {
        type: 'vec3',
        x: { type: 'var', name: 'a' },
        y: { type: 'num', value: 0 },
        z: { type: 'num', value: 5 },
      },
    })
    // Objeto com outras chaves NÃO vira vetor: vira objeto literal genérico.
    expect(parseJS('let o = { x: 1, foo: 2 };')[0]).toMatchObject({
      type: 'var',
      value: {
        type: 'objectLiteral',
        entries: [
          { key: 'x', value: { type: 'num', value: 1 } },
          { key: 'foo', value: { type: 'num', value: 2 } },
        ],
      },
    })
  })

  it('reconhece lista (array), tamanho, push e pop/shift', () => {
    expect(parseJS('let itens = [1, 2];')[0]).toMatchObject({
      type: 'var',
      value: {
        type: 'array',
        items: [
          { type: 'num', value: 1 },
          { type: 'num', value: 2 },
        ],
      },
    })
    expect(parseJS('let vazia = [];')[0]).toMatchObject({
      type: 'var',
      value: { type: 'array', items: [] },
    })
    expect(parseJS('itens.push(3);')[0]).toMatchObject({
      type: 'arrayPush',
      arrayVar: 'itens',
      value: { type: 'num', value: 3 },
    })
    expect(parseJS('itens.pop();')[0]).toMatchObject({
      type: 'arrayRemove',
      arrayVar: 'itens',
      end: 'pop',
    })
    expect(parseJS('itens.shift();')[0]).toMatchObject({
      type: 'arrayRemove',
      arrayVar: 'itens',
      end: 'shift',
    })
    expect(parseJS('let n = itens.length;')[0]).toMatchObject({
      type: 'var',
      value: { type: 'arrayLength', arrayVar: 'itens' },
    })
  })

  it('try/catch agora é reconhecido (não degrada mais para rawJS)', () => {
    const ir = parseJS('try { fazer(); } catch (e) {}')
    expect(ir[0]?.type).toBe('tryCatch')
  })

  it('JS arbitrário não-representável (generator) vira rawJS advanced preservando o código', () => {
    const code = 'function* contar() { yield 1; }'
    const ir = parseJS(code)
    expect(ir).toEqual([{ type: 'rawJS', code, advanced: true }])
  })

  it('preserva imports/export de módulo como rawJS advanced sem erro de sintaxe', () => {
    const code = 'import { ok } from "./utils.js";\nexport const resposta = ok;'
    const ir = parseJS(code)
    expect(ir).toEqual([
      { type: 'rawJS', code: 'import { ok } from "./utils.js";', advanced: true },
      { type: 'rawJS', code: 'export const resposta = ok;', advanced: true },
    ])
  })

  it('código com erro de sintaxe vira rawJS advanced sem quebrar', () => {
    const code = 'function bad( {'
    const ir = parseJS(code)
    expect(ir[0]?.type).toBe('rawJS')
  })

  it('cadeia aditiva muito longa não estoura a pilha (degrada para rawJS)', () => {
    // O Babel parseia o aninhamento sem reclamar; só a descida recursiva do
    // mapeamento pode estourar a pilha. Não pode crashar: degrada para rawJS.
    const code = `let total = ${Array.from({ length: 50000 }, (_, i) => i).join(' + ')};`
    const ir = parseJS(code)
    expect(Array.isArray(ir)).toBe(true)
    // Ou reconhece como árvore de binop, ou degrada para rawJS — mas nunca crasha.
    if (ir[0]?.type === 'rawJS') {
      expect(ir).toEqual([{ type: 'rawJS', code, advanced: true }])
    }
  })

  it('reconhece addEventListener click em getElementById', () => {
    const code = `document.getElementById("meuBotao")?.addEventListener("click", (event) => {\n  console.log("oi");\n});`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({
      type: 'event',
      target: 'meuBotao',
      event: 'click',
    })
  })

  it('reconhece addEventListener mouseover/submit/input', () => {
    for (const evt of ['mouseover', 'submit', 'input']) {
      const code = `document.getElementById("x")?.addEventListener("${evt}", (event) => { console.log("y"); });`
      const ir = parseJS(code)
      expect(ir[0]).toMatchObject({ type: 'event', event: evt })
    }
  })

  it('reconhece if (var op num) { ... } com binop', () => {
    const code = `if (contador > 5) { console.log("alto"); } else { console.log("baixo"); }`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({
      type: 'if',
      cond: { type: 'binop', op: '>' },
    })
  })

  it('reconhece for clássico → repeat', () => {
    const code = `for (let i = 0; i < 3; i++) { console.log("oi"); }`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({
      type: 'repeat',
      times: { type: 'num', value: 3 },
    })
  })

  it('reconhece document.querySelector como statement querySelector', () => {
    const code = `const caixa = document.querySelector(".caixa");`
    const ir = parseJS(code)
    expect(ir[0]).toEqual({ type: 'querySelector', selector: '.caixa', varName: 'caixa' })
  })

  it('reconhece classList.add/remove/toggle', () => {
    for (const op of ['add', 'remove', 'toggle'] as const) {
      const code = `document.getElementById("x")?.classList.${op}("ativo");`
      const ir = parseJS(code)
      expect(ir[0]).toEqual({ type: 'classOp', targetId: 'x', op, className: 'ativo' })
    }
  })

  it('reconhece const x = document.getElementById("id") como getElementById', () => {
    const ir = parseJS('const menuButton = document.getElementById("menuButton");')
    expect(ir[0]).toEqual({ type: 'getElementById', id: 'menuButton', varName: 'menuButton' })
  })

  it('funde getElementById + getContext("2d") num único canvasSetup', () => {
    const code = `const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");`
    const ir = parseJS(code)
    expect(ir).toEqual([{ type: 'canvasSetup', canvasId: 'tela', varName: 'ctx' }])
  })

  it('mantém getElementById quando não há getContext (sem falso positivo)', () => {
    const ir = parseJS('const tela = document.getElementById("tela");')
    expect(ir).toEqual([{ type: 'getElementById', id: 'tela', varName: 'tela' }])
  })

  it('resolve addEventListener via variável de elemento', () => {
    const code = `const menuButton = document.getElementById("menuButton");
menuButton.addEventListener("click", () => { navMenu.classList.toggle("active"); });`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({ type: 'getElementById', id: 'menuButton' })
    expect(ir[1]).toMatchObject({ type: 'event', target: 'menuButton', event: 'click' })
  })

  it('resolve classList.toggle via variável de elemento', () => {
    const code = `const navMenu = document.getElementById("navMenu");
navMenu.classList.toggle("active");`
    const ir = parseJS(code)
    expect(ir[1]).toEqual({
      type: 'classOp',
      targetId: 'navMenu',
      targetKind: 'var',
      op: 'toggle',
      className: 'active',
    })
  })

  it('reconhece x.textContent = "..." como setProperty (via variável)', () => {
    const code = `const titulo = document.getElementById("titulo");
titulo.textContent = "Olá";`
    const ir = parseJS(code)
    expect(ir[1]).toEqual({
      type: 'setProperty',
      targetId: 'titulo',
      targetKind: 'var',
      property: 'textContent',
      value: { type: 'str', value: 'Olá' },
    })
  })

  it('reconhece x.value = variável como setProperty (escrita em campo)', () => {
    const code = `const campo = document.getElementById("campo");
campo.value = nome;`
    const ir = parseJS(code)
    expect(ir[1]).toEqual({
      type: 'setProperty',
      targetId: 'campo',
      targetKind: 'var',
      property: 'value',
      value: { type: 'var', name: 'nome' },
    })
  })

  it('reconhece currentYear.textContent = new Date().getFullYear() como setProperty/now', () => {
    const ir = parseJS('currentYear.textContent = new Date().getFullYear();')
    expect(ir).toEqual([
      {
        type: 'setProperty',
        targetId: 'currentYear',
        targetKind: 'var',
        property: 'textContent',
        value: { type: 'now', kind: 'year' },
      },
    ])
  })

  it('reconhece valores calculados de data/hora (now) por id', () => {
    const dataIr = parseJS(
      'document.getElementById("d").textContent = new Date().toLocaleDateString();',
    )
    expect(dataIr[0]).toMatchObject({ type: 'setProperty', value: { type: 'now', kind: 'date' } })
    const horaIr = parseJS(
      'document.getElementById("h").textContent = new Date().toLocaleTimeString();',
    )
    expect(horaIr[0]).toMatchObject({ type: 'setProperty', value: { type: 'now', kind: 'time' } })
  })

  it('setProperty inline por id não recebe targetKind', () => {
    const ir = parseJS('document.getElementById("saida").textContent = "Oi";')
    expect(ir).toEqual([
      {
        type: 'setProperty',
        targetId: 'saida',
        property: 'textContent',
        value: { type: 'str', value: 'Oi' },
      },
    ])
  })

  it('mantém textContent com expressão não modelada (getTime) como rawJS', () => {
    // getTime() NÃO é uma das partes do sz_val_date_part (horas/minutos/… e getMonth
    // agora SÃO modeladas como dateGet); serve para checar o fallback rawJS.
    const code = `const ano = document.getElementById("ano");
ano.textContent = new Date().getTime();`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({ type: 'getElementById', id: 'ano' })
    expect(ir[1]?.type).toBe('rawJS')
  })

  it('reconhece alert("...") com texto, número e variável', () => {
    expect(parseJS('alert("Olá!");')).toEqual([
      { type: 'alert', value: { type: 'str', value: 'Olá!' } },
    ])
    expect(parseJS('alert(contador);')).toEqual([
      { type: 'alert', value: { type: 'var', name: 'contador' } },
    ])
  })

  it('reconhece leitura de propriedade (getProperty) via getElementById direto', () => {
    const ir = parseJS('const conteudo = document.getElementById("saida")?.textContent;')
    expect(ir).toEqual([
      { type: 'getProperty', targetId: 'saida', property: 'textContent', varName: 'conteudo' },
    ])
  })

  it('reconhece getProperty .value via variável de elemento', () => {
    const code = `const campo = document.getElementById("campo");
const digitado = campo.value;`
    const ir = parseJS(code)
    expect(ir[0]).toMatchObject({ type: 'getElementById', id: 'campo' })
    expect(ir[1]).toEqual({
      type: 'getProperty',
      targetId: 'campo',
      targetKind: 'var',
      property: 'value',
      varName: 'digitado',
    })
  })

  // ----- canvas -----
  // Prefixo de setup: registra `ctx` (contexto) e `canvas` (elemento). Sem ele,
  // os matchers de canvas não disparam (guard por ctx conhecido). Depois do
  // parse, ir[0] é o canvasSetup e ir[1] é a operação.
  const SETUP = `const canvas = document.getElementById("tela");
const ctx = canvas.getContext("2d");
`

  it('reconhece canvas.width/height → canvasSetSize', () => {
    const ir = parseJS(`${SETUP}canvas.width = 400;\ncanvas.height = 300;`)
    expect(ir[0]).toMatchObject({ type: 'canvasSetup' })
    expect(ir[1]).toEqual({
      type: 'canvasSetSize',
      ctxVar: 'ctx',
      w: { type: 'num', value: 400 },
      h: { type: 'num', value: 300 },
    })
  })

  it('reconhece canvas.width/height numa conta como canvasDim (não vira avançado)', () => {
    const ir = parseJS(`${SETUP}const x = canvas.width / 2;\nconst y = canvas.height / 2;`)
    expect(ir[0]).toMatchObject({ type: 'canvasSetup' })
    expect(ir[1]).toEqual({
      type: 'var',
      name: 'x',
      kind: 'const',
      value: {
        type: 'binop',
        op: '/',
        left: { type: 'canvasDim', ctxVar: 'ctx', dim: 'width' },
        right: { type: 'num', value: 2 },
      },
    })
    expect(ir[2]).toMatchObject({
      type: 'var',
      name: 'y',
      kind: 'const',
      value: { left: { type: 'canvasDim', ctxVar: 'ctx', dim: 'height' } },
    })
  })

  it('reconhece ctx.clearRect(0,0,canvas.width,canvas.height) → canvasClear', () => {
    const ir = parseJS(`${SETUP}ctx.clearRect(0, 0, canvas.width, canvas.height);`)
    expect(ir[1]).toEqual({ type: 'canvasClear', ctxVar: 'ctx', canvasVar: 'canvas' })
  })

  it('reconhece ctx.fillStyle = "#cor" → canvasFillStyle (cor hexadecimal vira tipo color)', () => {
    const ir = parseJS(`${SETUP}ctx.fillStyle = "#22d3ee";`)
    expect(ir[1]).toEqual({
      type: 'canvasFillStyle',
      ctxVar: 'ctx',
      color: { type: 'color', value: '#22d3ee' },
    })
  })

  it('reconhece ctx.fillStyle = variável → canvasFillStyle com cor por variável', () => {
    const ir = parseJS(`${SETUP}ctx.fillStyle = minhaCor;`)
    expect(ir[1]).toEqual({
      type: 'canvasFillStyle',
      ctxVar: 'ctx',
      color: { type: 'var', name: 'minhaCor' },
    })
  })

  it('reconhece ctx.fillStyle = "rgba(...)" → canvasFillStyle com cor com transparência', () => {
    const ir = parseJS(`${SETUP}ctx.fillStyle = "rgba(0, 0, 0, 0.1)";`)
    expect(ir[1]).toEqual({
      type: 'canvasFillStyle',
      ctxVar: 'ctx',
      color: { type: 'colorAlpha', hex: '#000000', alpha: 0.1 },
    })
  })

  it('rgba com canal fora de [0,255] preserva o literal como string (não vira hex malformado)', () => {
    // rgba(999,0,0,1): 999 não cabe em 2 dígitos hex — sem validação geraria um
    // hex de 3 dígitos que o gerador re-fatiaria numa cor DIFERENTE.
    expect(parseJS('let cor = "rgba(999,0,0,1)";')).toEqual([
      { type: 'var', name: 'cor', value: { type: 'str', value: 'rgba(999,0,0,1)' } },
    ])
  })

  it('rgba com alpha de múltiplos pontos preserva o literal como string (sem NaN)', () => {
    // rgba(0,0,0,1.2.3): Number("1.2.3") seria NaN; preserva verbatim.
    expect(parseJS('let cor = "rgba(0,0,0,1.2.3)";')).toEqual([
      { type: 'var', name: 'cor', value: { type: 'str', value: 'rgba(0,0,0,1.2.3)' } },
    ])
  })

  it('reconhece hsl com Math.random()*360 e S/L literais → hslColor (matiz como expressão)', () => {
    const ir = parseJS(`${SETUP}ctx.fillStyle = \`hsl(\${Math.random() * 360}, 50%, 50%)\`;`)
    expect(ir[1]).toEqual({
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
    })
  })

  it('reconhece hsl com matiz por variável → hslColor (específico, não concat)', () => {
    const ir = parseJS(`${SETUP}ctx.fillStyle = \`hsl(\${matiz}, 50%, 50%)\`;`)
    expect(ir[1]).toEqual({
      type: 'canvasFillStyle',
      ctxVar: 'ctx',
      color: {
        type: 'hslColor',
        h: { type: 'var', name: 'matiz' },
        s: { type: 'num', value: 50 },
        l: { type: 'num', value: 50 },
      },
    })
  })

  it('string hexadecimal #rrggbb vira tipo color em qualquer posição de valor', () => {
    const code = `const titulo = document.getElementById("titulo");
titulo.textContent = "#ff0000";`
    const ir = parseJS(code)
    expect(ir[1]).toMatchObject({
      type: 'setProperty',
      value: { type: 'color', value: '#ff0000' },
    })
  })

  it('reconhece ctx.fillRect(x,y,w,h) → canvasFillRect', () => {
    const ir = parseJS(`${SETUP}ctx.fillRect(10, 10, 50, 50);`)
    expect(ir[1]).toEqual({
      type: 'canvasFillRect',
      ctxVar: 'ctx',
      x: { type: 'num', value: 10 },
      y: { type: 'num', value: 10 },
      w: { type: 'num', value: 50 },
      h: { type: 'num', value: 50 },
    })
  })

  it('canvas.width/height nos args do fillRect viram canvasDim (bloco específico), não memberGet', () => {
    const ir = parseJS(`${SETUP}ctx.fillRect(0, 0, canvas.width, canvas.height);`)
    expect(ir[1]).toEqual({
      type: 'canvasFillRect',
      ctxVar: 'ctx',
      x: { type: 'num', value: 0 },
      y: { type: 'num', value: 0 },
      w: { type: 'canvasDim', ctxVar: 'ctx', dim: 'width' },
      h: { type: 'canvasDim', ctxVar: 'ctx', dim: 'height' },
    })
  })

  it('reconhece beginPath/arc/fill → canvasArc', () => {
    const ir = parseJS(
      `${SETUP}ctx.beginPath();\nctx.arc(100, 100, 20, 0, Math.PI * 2);\nctx.fill();`,
    )
    expect(ir[1]).toEqual({
      type: 'canvasArc',
      ctxVar: 'ctx',
      x: { type: 'num', value: 100 },
      y: { type: 'num', value: 100 },
      r: { type: 'num', value: 20 },
    })
  })

  it('reconhece ctx.fillText(text,x,y) → canvasFillText', () => {
    const ir = parseJS(`${SETUP}ctx.fillText("Olá", 10, 30);`)
    expect(ir[1]).toEqual({
      type: 'canvasFillText',
      ctxVar: 'ctx',
      text: { type: 'str', value: 'Olá' },
      x: { type: 'num', value: 10 },
      y: { type: 'num', value: 30 },
    })
  })

  it('reconhece ctx.save() / ctx.restore()', () => {
    const ir = parseJS(`${SETUP}ctx.save();\nctx.restore();`)
    expect(ir[1]).toEqual({ type: 'canvasSave', ctxVar: 'ctx' })
    expect(ir[2]).toEqual({ type: 'canvasRestore', ctxVar: 'ctx' })
  })

  it('reconhece translate / rotate / scale', () => {
    const ir = parseJS(`${SETUP}ctx.translate(50, 50);\nctx.rotate(0.5);\nctx.scale(1, 1);`)
    expect(ir[1]).toEqual({
      type: 'canvasTranslate',
      ctxVar: 'ctx',
      x: { type: 'num', value: 50 },
      y: { type: 'num', value: 50 },
    })
    expect(ir[2]).toEqual({
      type: 'canvasRotate',
      ctxVar: 'ctx',
      angle: { type: 'num', value: 0.5 },
    })
    expect(ir[3]).toEqual({
      type: 'canvasScale',
      ctxVar: 'ctx',
      sx: { type: 'num', value: 1 },
      sy: { type: 'num', value: 1 },
    })
  })

  it('reconhece createLinearGradient + addColorStop → canvasGradient', () => {
    const ir = parseJS(
      `${SETUP}const grad = ctx.createLinearGradient(0, 0, 100, 100);\ngrad.addColorStop(0, "#000000");\ngrad.addColorStop(1, "#ffffff");`,
    )
    expect(ir[1]).toEqual({
      type: 'canvasGradient',
      ctxVar: 'ctx',
      varName: 'grad',
      x0: { type: 'num', value: 0 },
      y0: { type: 'num', value: 0 },
      x1: { type: 'num', value: 100 },
      y1: { type: 'num', value: 100 },
      stops: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#ffffff' },
      ],
    })
  })

  it('reconhece bloco de Image + onload → canvasDrawImage', () => {
    const ir = parseJS(
      `${SETUP}{\n  const ctxImg = new Image();\n  ctxImg.src = "foto.png";\n  ctxImg.onload = () => ctx.drawImage(ctxImg, 0, 0, 64, 64);\n}`,
    )
    expect(ir[1]).toEqual({
      type: 'canvasDrawImage',
      ctxVar: 'ctx',
      src: 'foto.png',
      x: { type: 'num', value: 0 },
      y: { type: 'num', value: 0 },
      w: { type: 'num', value: 64 },
      h: { type: 'num', value: 64 },
    })
  })

  it('reconhece função frame + requestAnimationFrame → animationLoop', () => {
    const ir = parseJS(
      `${SETUP}function frame() {\n  ctx.fillRect(0, 0, 10, 10);\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);`,
    )
    expect(ir[1]).toMatchObject({
      type: 'animationLoop',
      body: [{ type: 'canvasFillRect', ctxVar: 'ctx' }],
    })
  })

  it('reconhece animationLoop com pontapé externo frame() (forma atual)', () => {
    const ir = parseJS(
      `${SETUP}function frame() {\n  ctx.fillRect(0, 0, 10, 10);\n  requestAnimationFrame(frame);\n}\nframe();`,
    )
    expect(ir[1]).toMatchObject({
      type: 'animationLoop',
      body: [{ type: 'canvasFillRect', ctxVar: 'ctx' }],
    })
  })

  it('reconhece animationLoop cancelável com re-agendamento no FIM (forma legada)', () => {
    const ir = parseJS(
      `${SETUP}let animId;\nfunction frame() {\n  ctx.fillRect(0, 0, 10, 10);\n  animId = requestAnimationFrame(frame);\n}\nframe();`,
    )
    expect(ir[1]).toMatchObject({
      type: 'animationLoop',
      handle: 'animId',
      body: [{ type: 'canvasFillRect', ctxVar: 'ctx' }],
    })
  })

  it('reconhece animationLoop cancelável com re-agendamento no TOPO (forma atual)', () => {
    const ir = parseJS(
      `${SETUP}let animId;\nfunction frame() {\n  animId = requestAnimationFrame(frame);\n  ctx.fillRect(0, 0, 10, 10);\n}\nframe();`,
    )
    expect(ir[1]).toMatchObject({
      type: 'animationLoop',
      handle: 'animId',
      body: [{ type: 'canvasFillRect', ctxVar: 'ctx' }],
    })
  })

  it('reconhece cancelAnimationFrame(id) com a variável do id', () => {
    expect(parseJS('cancelAnimationFrame(animId);')).toEqual([
      { type: 'cancelAnimationFrame', handle: { type: 'var', name: 'animId' } },
    ])
  })

  it('reconhece estado + listeners de seta → keyboardSimple', () => {
    const code = `${SETUP}const teclas = { left: false, right: false, up: false, down: false };
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') teclas.left = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') teclas.left = false;
});`
    const ir = parseJS(code)
    expect(ir[1]).toEqual({ type: 'keyboardSimple', varName: 'teclas' })
  })

  it('método em objeto desconhecido (sem setup de canvas) vira chamada de método genérica', () => {
    // Sem ctx conhecido não é bloco de canvas; vira `memberCall` genérico (round-trip).
    const ir = parseJS('foo.fillRect(1, 2, 3, 4);')
    expect(ir[0]).toEqual({
      type: 'memberCall',
      object: { type: 'var', name: 'foo' },
      method: 'fillRect',
      args: [
        { type: 'num', value: 1 },
        { type: 'num', value: 2 },
        { type: 'num', value: 3 },
        { type: 'num', value: 4 },
      ],
    })
  })

  it('reconhece canvas.width = window.innerWidth → canvasSetSize com valor global', () => {
    const ir = parseJS(
      `${SETUP}canvas.width = window.innerWidth;\ncanvas.height = window.innerHeight;`,
    )
    expect(ir[1]).toEqual({
      type: 'canvasSetSize',
      ctxVar: 'ctx',
      w: { type: 'global', kind: 'innerWidth' },
      h: { type: 'global', kind: 'innerHeight' },
    })
  })

  // ----- classes / OO -----
  it('reconhece classe com construtor parametrizado, propriedades e método', () => {
    const code = [
      'class Pessoa {',
      '  constructor(nome, idade) {',
      '    this.nome = nome;',
      '    this.idade = idade;',
      '  }',
      '  cumprimentar(saudacao) {',
      '    alert(saudacao);',
      '  }',
      '}',
    ].join('\n')
    expect(parseJS(code)).toEqual([
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
    ])
  })

  it('reconhece new com argumentos e chamada de método (via instância) com argumentos', () => {
    const code = ['const p = new Pessoa("Ana", 20);', 'p.cumprimentar("Oi");'].join('\n')
    expect(parseJS(code)).toEqual([
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
        type: 'memberCall',
        object: { type: 'var', name: 'p' },
        method: 'cumprimentar',
        args: [{ type: 'str', value: 'Oi' }],
      },
    ])
  })

  it('reconhece new com argumento de cor (#rrggbb) → newInstance, não código avançado', () => {
    const ir = parseJS('const player = new Player(100, 100, 20, "#22d3ee");')
    expect(ir[0]).toEqual({
      type: 'newInstance',
      varName: 'player',
      className: 'Player',
      args: [
        { type: 'num', value: 100 },
        { type: 'num', value: 100 },
        { type: 'num', value: 20 },
        { type: 'color', value: '#22d3ee' },
      ],
    })
  })

  it('construtor com lógica livre (além de this.x = v) é reconhecido', () => {
    const code = ['class X {', '  constructor() {', '    console.log("oi");', '  }', '}'].join('\n')
    expect(parseJS(code)).toEqual([
      {
        type: 'classDecl',
        name: 'X',
        ctorParams: [],
        ctorBody: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
        methods: [],
      },
    ])
  })

  it('reconhece herança simples (extends Identificador)', () => {
    const code = ['class Cao extends Animal {', '  latir() {', '    alert("au");', '  }', '}'].join(
      '\n',
    )
    expect(parseJS(code)).toEqual([
      {
        type: 'classDecl',
        name: 'Cao',
        superClass: 'Animal',
        ctorParams: [],
        ctorBody: [],
        methods: [
          {
            name: 'latir',
            params: [],
            body: [{ type: 'alert', value: { type: 'str', value: 'au' } }],
          },
        ],
      },
    ])
  })

  it('reconhece ler/escrever propriedade, retorno e chamada de método como valor', () => {
    const code = [
      'class Caixa {',
      '  guardar(item) {',
      '    this.item = item;',
      '    return this.item;',
      '  }',
      '}',
      'const c = new Caixa();',
      'c.item = 5;',
      'c.copia = c.item;',
      'c.eco = c.guardar(10);',
    ].join('\n')
    expect(parseJS(code)).toEqual([
      {
        type: 'classDecl',
        name: 'Caixa',
        ctorParams: [],
        ctorBody: [],
        methods: [
          {
            name: 'guardar',
            params: ['item'],
            body: [
              { type: 'setThisProp', name: 'item', value: { type: 'var', name: 'item' } },
              { type: 'return', value: { type: 'thisProp', name: 'item' } },
            ],
          },
        ],
      },
      { type: 'newInstance', varName: 'c', className: 'Caixa', args: [] },
      {
        type: 'memberSet',
        object: { type: 'var', name: 'c' },
        name: 'item',
        value: { type: 'num', value: 5 },
      },
      {
        type: 'memberSet',
        object: { type: 'var', name: 'c' },
        name: 'copia',
        value: { type: 'memberGet', object: { type: 'var', name: 'c' }, name: 'item' },
      },
      {
        type: 'memberSet',
        object: { type: 'var', name: 'c' },
        name: 'eco',
        value: {
          type: 'memberCallExpr',
          object: { type: 'var', name: 'c' },
          method: 'guardar',
          args: [{ type: 'num', value: 10 }],
        },
      },
    ])
  })

  it('herança com expressão complexa (extends fn()) vira rawJS advanced', () => {
    const code = ['class Cao extends getBase() {', '  latir() {}', '}'].join('\n')
    expect(parseJS(code)[0]?.type).toBe('rawJS')
  })

  // ---- Fase 0: booleano, incremento, atribuição geral ----
  it('reconhece let booleano', () => {
    expect(parseJS('let lockBoard = false;')).toEqual([
      { type: 'var', name: 'lockBoard', value: { type: 'bool', value: false } },
    ])
  })

  it('reconhece let com null (bloco sz_val_null)', () => {
    expect(parseJS('let alvo = null;')).toEqual([
      { type: 'var', name: 'alvo', value: { type: 'null' } },
    ])
  })

  it('reconhece comparação com null (alvo !== null)', () => {
    expect(parseJS('temAlvo = alvo !== null;')).toEqual([
      {
        type: 'assign',
        name: 'temAlvo',
        value: {
          type: 'binop',
          op: '!==',
          left: { type: 'var', name: 'alvo' },
          right: { type: 'null' },
        },
      },
    ])
  })

  it('reconhece x++ como incremento (assign x = x + 1)', () => {
    expect(parseJS('moves++;')).toEqual([
      {
        type: 'assign',
        name: 'moves',
        value: {
          type: 'binop',
          op: '+',
          left: { type: 'var', name: 'moves' },
          right: { type: 'num', value: 1 },
        },
      },
    ])
  })

  it('reconhece x-- como decremento (assign x = x - 1)', () => {
    expect(parseJS('vidas--;')).toEqual([
      {
        type: 'assign',
        name: 'vidas',
        value: {
          type: 'binop',
          op: '-',
          left: { type: 'var', name: 'vidas' },
          right: { type: 'num', value: 1 },
        },
      },
    ])
  })

  it('reconhece x += n e x -= n', () => {
    expect(parseJS('pontos += 10;')[0]).toMatchObject({
      type: 'assign',
      name: 'pontos',
      value: { type: 'binop', op: '+', right: { type: 'num', value: 10 } },
    })
    expect(parseJS('pontos -= 3;')[0]).toMatchObject({
      type: 'assign',
      name: 'pontos',
      value: { type: 'binop', op: '-', right: { type: 'num', value: 3 } },
    })
  })

  it('reconhece atribuição de variável a variável (x = y)', () => {
    expect(parseJS('total = parcial;')).toEqual([
      { type: 'assign', name: 'total', value: { type: 'var', name: 'parcial' } },
    ])
  })

  // ---- Fase 1: funções ----
  it('reconhece declaração de função com parâmetros e return', () => {
    const code = ['function dobro(n) {', '  return n * 2;', '}'].join('\n')
    expect(parseJS(code)).toEqual([
      {
        type: 'funcDecl',
        name: 'dobro',
        params: ['n'],
        body: [
          {
            type: 'return',
            value: {
              type: 'binop',
              op: '*',
              left: { type: 'var', name: 'n' },
              right: { type: 'num', value: 2 },
            },
          },
        ],
      },
    ])
  })

  it('reconhece chamada de função como comando', () => {
    expect(parseJS('iniciar();')).toEqual([{ type: 'callFunction', name: 'iniciar', args: [] }])
    expect(parseJS('mover(10, x);')).toEqual([
      {
        type: 'callFunction',
        name: 'mover',
        args: [
          { type: 'num', value: 10 },
          { type: 'var', name: 'x' },
        ],
      },
    ])
  })

  it('reconhece chamada de função como valor', () => {
    expect(parseJS('cards = embaralhar(lista);')).toEqual([
      {
        type: 'assign',
        name: 'cards',
        value: { type: 'call', name: 'embaralhar', args: [{ type: 'var', name: 'lista' }] },
      },
    ])
  })

  it('não confunde requestAnimationFrame/alert com chamada de função do aluno', () => {
    expect(parseJS('requestAnimationFrame(loop);')[0]?.type).toBe('rawJS')
  })

  // ---- Fase 2: forEach e setTimeout ----
  it('reconhece forEach com item e índice', () => {
    const code = ['cards.forEach((emoji, index) => {', '  console.log(emoji);', '});'].join('\n')
    expect(parseJS(code)).toEqual([
      {
        type: 'forEach',
        arrayExpr: { type: 'var', name: 'cards' },
        itemName: 'emoji',
        indexName: 'index',
        body: [{ type: 'consoleLog', value: { type: 'var', name: 'emoji' } }],
      },
    ])
  })

  it('reconhece forEach só com item (sem índice)', () => {
    const code = ['itens.forEach((x) => {', '  total += x;', '});'].join('\n')
    expect(parseJS(code)[0]).toMatchObject({
      type: 'forEach',
      arrayExpr: { type: 'var', name: 'itens' },
      itemName: 'x',
    })
    expect((parseJS(code)[0] as { indexName?: string }).indexName).toBeUndefined()
  })

  it('forEach aceita uma EXPRESSÃO como lista (Object.keys), não só variável', () => {
    const code = 'Object.keys(config).forEach((chave) => { total += 1; });'
    expect(parseJS(code)[0]).toMatchObject({
      type: 'forEach',
      arrayExpr: { type: 'objectOp', op: 'keys', object: { type: 'var', name: 'config' } },
      itemName: 'chave',
    })
  })

  it('reconhece setTimeout(callback, ms)', () => {
    const ir = parseJS('setTimeout(() => alert("hi"), 100);')
    expect(ir).toEqual([
      {
        type: 'setTimeout',
        delay: { type: 'num', value: 100 },
        body: [{ type: 'alert', value: { type: 'str', value: 'hi' } }],
      },
    ])
  })

  it('reconhece setInterval(callback, ms)', () => {
    const ir = parseJS('setInterval(() => alert("hi"), 100);')
    expect(ir).toEqual([
      {
        type: 'setInterval',
        delay: { type: 'num', value: 100 },
        body: [{ type: 'alert', value: { type: 'str', value: 'hi' } }],
      },
    ])
  })

  // ---- Fase 3: DOM dinâmico ----
  it('reconhece innerHTML em setProperty', () => {
    expect(parseJS('board.innerHTML = "";')).toEqual([
      {
        type: 'setProperty',
        targetId: 'board',
        targetKind: 'var',
        property: 'innerHTML',
        value: { type: 'str', value: '' },
      },
    ])
  })

  it('reconhece createElement', () => {
    expect(parseJS("const card = document.createElement('div');")).toEqual([
      { type: 'createElement', tag: 'div', varName: 'card' },
    ])
  })

  it('reconhece appendChild', () => {
    expect(parseJS('board.appendChild(card);')).toEqual([
      { type: 'appendChild', parentVar: 'board', childVar: 'card' },
    ])
  })

  it('reconhece escrita e leitura de dataset', () => {
    expect(parseJS('card.dataset.emoji = emoji;')).toEqual([
      {
        type: 'setDataset',
        targetId: 'card',
        targetKind: 'var',
        key: 'emoji',
        value: { type: 'var', name: 'emoji' },
      },
    ])
    expect(parseJS('let e = card.dataset.emoji;')).toEqual([
      { type: 'var', name: 'e', value: { type: 'datasetGet', objectVar: 'card', key: 'emoji' } },
    ])
  })

  it('reconhece classList.contains como valor', () => {
    expect(parseJS('let ativo = caixa.classList.contains("flip");')).toEqual([
      {
        type: 'var',
        name: 'ativo',
        value: {
          type: 'classContains',
          targetId: 'caixa',
          targetKind: 'var',
          className: 'flip',
        },
      },
    ])
  })

  // ---- Fase 4: açúcar de sintaxe ----
  it('reconhece template literal como juntar texto (concat)', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: o `${moves}` é código de entrada do parser (string de teste), não interpolação.
    expect(parseJS('let msg = `Vitória em ${moves} jogadas!`;')).toEqual([
      {
        type: 'var',
        name: 'msg',
        value: {
          type: 'concat',
          parts: [
            { type: 'str', value: 'Vitória em ' },
            { type: 'var', name: 'moves' },
            { type: 'str', value: ' jogadas!' },
          ],
        },
      },
    ])
  })

  it('reconhece item da lista por índice (arr[i])', () => {
    expect(parseJS('let primeiro = cartas[0];')).toEqual([
      {
        type: 'var',
        name: 'primeiro',
        value: { type: 'index', arrayVar: 'cartas', index: { type: 'num', value: 0 } },
      },
    ])
  })

  it('reconhece desestruturação de lista como índices', () => {
    expect(parseJS('const [a, b] = lista;')).toEqual([
      {
        type: 'var',
        kind: 'const',
        name: 'a',
        value: { type: 'index', arrayVar: 'lista', index: { type: 'num', value: 0 } },
      },
      {
        type: 'var',
        kind: 'const',
        name: 'b',
        value: { type: 'index', arrayVar: 'lista', index: { type: 'num', value: 1 } },
      },
    ])
  })

  it('reconhece juntar listas (spread)', () => {
    expect(parseJS('let todas = [...a, ...b];')).toEqual([
      {
        type: 'var',
        name: 'todas',
        value: {
          type: 'concatArrays',
          parts: [
            { type: 'var', name: 'a' },
            { type: 'var', name: 'b' },
          ],
        },
      },
    ])
  })

  it('reconhece embaralhar lista (sort com Math.random - 0.5)', () => {
    expect(parseJS('let r = baralho.sort(() => Math.random() - 0.5);')).toEqual([
      { type: 'var', name: 'r', value: { type: 'shuffle', arrayVar: 'baralho' } },
    ])
  })

  it('reconhece Math.random() cru como randomFloat', () => {
    expect(parseJS('const a = Math.random();')).toEqual([
      { type: 'var', name: 'a', kind: 'const', value: { type: 'randomFloat' } },
    ])
  })

  it('reconhece Math.random() dentro de conta e comparação', () => {
    expect(parseJS('const raio = Math.random() * (30 - 4) + 4;')).toEqual([
      {
        type: 'var',
        name: 'raio',
        kind: 'const',
        value: {
          type: 'binop',
          op: '+',
          left: {
            type: 'binop',
            op: '*',
            left: { type: 'randomFloat' },
            right: {
              type: 'binop',
              op: '-',
              left: { type: 'num', value: 30 },
              right: { type: 'num', value: 4 },
            },
          },
          right: { type: 'num', value: 4 },
        },
      },
    ])
    expect(parseJS('if (Math.random() < 0.5) { x = 1; }')[0]).toMatchObject({
      type: 'if',
      cond: {
        type: 'binop',
        op: '<',
        left: { type: 'randomFloat' },
        right: { type: 'num', value: 0.5 },
      },
    })
  })

  it('não confunde o embaralhamento com randomFloat (regressão)', () => {
    expect(parseJS('let r = baralho.sort(() => Math.random() - 0.5);')).toEqual([
      { type: 'var', name: 'r', value: { type: 'shuffle', arrayVar: 'baralho' } },
    ])
  })

  it('reconhece declaração sem valor (let x;) como declareVar', () => {
    expect(parseJS('let x;')).toEqual([{ type: 'declareVar', name: 'x' }])
    expect(parseJS('let x;\nlet y;')).toEqual([
      { type: 'declareVar', name: 'x' },
      { type: 'declareVar', name: 'y' },
    ])
  })

  it('reconhece ternário numa atribuição (não vira rawJS)', () => {
    expect(parseJS('x = Math.random() < 0.5 ? 0 - raio : canvas.width + raio;')[0]).toMatchObject({
      type: 'assign',
      name: 'x',
      value: {
        type: 'ternary',
        condition: { type: 'binop', op: '<', left: { type: 'randomFloat' } },
        whenTrue: { type: 'binop', op: '-' },
        whenFalse: { type: 'binop', op: '+' },
      },
    })
  })

  it('reconhece Math.hypot genérico de dois valores como mathBinary', () => {
    expect(parseJS('const h = Math.hypot(catetoA, catetoB);')[0]).toMatchObject({
      type: 'var',
      name: 'h',
      kind: 'const',
      value: {
        type: 'mathBinary',
        fn: 'hypot',
        a: { type: 'var', name: 'catetoA' },
        b: { type: 'var', name: 'catetoB' },
      },
    })
  })

  it('reconhece Math.hypot(a.x-b.x, a.y-b.y) como distância entre objetos', () => {
    expect(parseJS('const d = Math.hypot(player.x - enemy.x, player.y - enemy.y);')[0]).toEqual({
      type: 'var',
      name: 'd',
      kind: 'const',
      value: {
        type: 'distance',
        a: { type: 'var', name: 'player' },
        b: { type: 'var', name: 'enemy' },
      },
    })
  })

  it('hypot com diferenças prontas ou objetos diferentes cai no hypot genérico', () => {
    expect(parseJS('const d = Math.hypot(dx, dy);')[0]).toMatchObject({
      value: { type: 'mathBinary', fn: 'hypot' },
    })
    // objetos diferentes em x e y (a/b vs a/c) → não é distância, vira hypot genérico.
    expect(parseJS('const d = Math.hypot(a.x - b.x, a.y - c.y);')[0]).toMatchObject({
      value: { type: 'mathBinary', fn: 'hypot' },
    })
  })

  it('reconhece arr.splice(start, count) como arraySplice', () => {
    expect(parseJS('enemies.splice(index, 1);')).toEqual([
      {
        type: 'arraySplice',
        arrayVar: 'enemies',
        start: { type: 'var', name: 'index' },
        count: { type: 'num', value: 1 },
      },
    ])
  })

  // ---- Fase 5: this e listener por nome ----
  it('reconhece addEventListener com função nomeada (eventHandler)', () => {
    expect(parseJS("restartBtn.addEventListener('click', startGame);")).toEqual([
      {
        type: 'eventHandler',
        target: 'restartBtn',
        targetKind: 'var',
        event: 'click',
        handlerName: 'startGame',
      },
    ])
  })

  it('mantém addEventListener com arrow como event (corpo inline)', () => {
    const ir = parseJS("botao.addEventListener('click', () => { alert('oi'); });")
    expect(ir[0]).toMatchObject({ type: 'event', event: 'click', targetKind: 'var' })
  })

  it('reconhece this.classList.add e this.classList.contains', () => {
    expect(parseJS("this.classList.add('flip');")).toEqual([
      { type: 'classOp', targetId: '', targetKind: 'this', op: 'add', className: 'flip' },
    ])
    expect(parseJS("let v = this.classList.contains('flip');")).toEqual([
      {
        type: 'var',
        name: 'v',
        value: { type: 'classContains', targetId: '', targetKind: 'this', className: 'flip' },
      },
    ])
  })

  it('reconhece push(this) com elemento atual', () => {
    expect(parseJS('selecionadas.push(this);')).toEqual([
      { type: 'arrayPush', arrayVar: 'selecionadas', value: { type: 'thisRef' } },
    ])
  })

  // ---- desestruturação não-representável PRESERVA a palavra-chave (HIGH) ----
  describe('desestruturação não-representável vira rawJS do nó-pai (preserva const/let/var)', () => {
    it('const {a, b} = obj → rawJS com a palavra const e re-parseável', () => {
      const ir = parseJS('const {a, b} = obj;')
      // O snippet preserva a palavra-chave: sem ela viraria `{a, b} = obj;`, que
      // o parser lê como bloco + erro (não é um objeto de atribuição válido).
      expect(ir).toEqual([{ type: 'rawJS', code: 'const {a, b} = obj;', advanced: true }])
      const gen = generateJS({ statements: ir })
      expect(gen).toContain('const ')
      expect(isReparseable(gen)).toBe(true)
    })

    it('let {x} = obj → rawJS com a palavra let e re-parseável', () => {
      const ir = parseJS('let {x} = obj;')
      expect(ir).toEqual([{ type: 'rawJS', code: 'let {x} = obj;', advanced: true }])
      expect(isReparseable(generateJS({ statements: ir }))).toBe(true)
    })

    it('desestruturação de lista não-modelável mantém const e é re-parseável', () => {
      // Padrões que NÃO casam o modelo "índices por posição" (default, rest, buraco)
      // caem em rawJS do nó-pai inteiro — com a palavra `const`.
      for (const src of ['const [a, b = 5] = x;', 'const [a, ...r] = x;', 'const [a, , c] = x;']) {
        const ir = parseJS(src)
        expect(ir).toEqual([{ type: 'rawJS', code: src, advanced: true }])
        const gen = generateJS({ statements: ir })
        expect(gen).toContain('const ')
        expect(isReparseable(gen)).toBe(true)
      }
    })

    it('não duplica statement com vários declaradores quando um não é representável', () => {
      // Um único asRaw do nó-pai: não emite o nó duas vezes (um por declarador).
      const ir = parseJS('const a = 1, {b} = obj;')
      expect(ir).toEqual([{ type: 'rawJS', code: 'const a = 1, {b} = obj;', advanced: true }])
      expect(isReparseable(generateJS({ statements: ir }))).toBe(true)
    })

    it('mantém os casos representáveis intactos (lista por índice e literal)', () => {
      // const [a, b] = lista → atribuições por índice (não regride).
      expect(parseJS('const [a, b] = lista;')).toEqual([
        {
          type: 'var',
          kind: 'const',
          name: 'a',
          value: { type: 'index', arrayVar: 'lista', index: { type: 'num', value: 0 } },
        },
        {
          type: 'var',
          kind: 'const',
          name: 'b',
          value: { type: 'index', arrayVar: 'lista', index: { type: 'num', value: 1 } },
        },
      ])
      // const x = ... simples segue como var const.
      expect(parseJS('const x = 5;')).toEqual([
        { type: 'var', name: 'x', value: { type: 'num', value: 5 }, kind: 'const' },
      ])
    })
  })

  // ---- canvasSetup aninhado: remoção do getElementById órfão por ESCOPO (MED) ----
  describe('getElementById órfão do canvasSetup some também em corpos aninhados', () => {
    const nested = [
      'function setup() {',
      '  const canvas = document.getElementById("c");',
      '  const ctx = canvas.getContext("2d");',
      '  ctx.fillRect(0, 0, 10, 10);',
      '}',
    ].join('\n')

    it('o getElementById solto dentro da função é absorvido pelo canvasSetup', () => {
      const ir = parseJS(nested)
      expect(ir[0]).toMatchObject({ type: 'funcDecl', name: 'setup' })
      const body = (ir[0] as { body: Array<{ type: string }> }).body
      // O corpo NÃO contém um getElementById solto: o canvasSetup regenera as duas
      // linhas. Sem a remoção por escopo, ele sobraria e cresceria a cada ciclo.
      expect(body.some((s) => s.type === 'getElementById')).toBe(false)
      expect(body[0]).toMatchObject({ type: 'canvasSetup' })
    })

    it('é ponto fixo: parse→gen→parse→gen não cresce o getElementById', () => {
      const gen1 = generateJS({ statements: parseJS(nested) })
      const gen2 = generateJS({ statements: parseJS(gen1) })
      expect(gen2).toBe(gen1)
      // Exatamente UMA criação do canvas (o canvasSetup), nada acumulado.
      const count = (gen2.match(/getElementById/g) ?? []).length
      expect(count).toBe(1)
    })
  })

  // ---- mapClass: bail não vaza ctx para statements irmãos (LOW) ----
  describe('classe que cai em rawJS não corrompe matches irmãos', () => {
    it('sprite registrado num construtor de classe que dá bail não funde s.x/s.y irmãos', () => {
      // A classe registra `s` como sprite no construtor, mas tem um getter
      // (não-representável) → cai em rawJS. As mutações de ctx do construtor NÃO
      // podem vazar: o `s.x = ...; s.y = ...;` solto seguinte deve ficar como dois
      // memberSet, e NÃO virar g2d:setPosition.
      const src = [
        'class Bola {',
        '  constructor() {',
        '    const s = SZGame2D.createSprite({ x: 1, y: 2 });',
        '  }',
        '  get raio() {',
        '    return 5;',
        '  }',
        '}',
        'const s = obj;',
        's.x = 1;',
        's.y = 2;',
      ].join('\n')
      const ir = parseJS(src)
      expect(ir[0]).toMatchObject({ type: 'rawJS', advanced: true })
      // s = obj (não é sprite), e as duas atribuições seguem como memberSet.
      expect(ir.slice(1)).toEqual([
        { type: 'var', name: 's', value: { type: 'var', name: 'obj' }, kind: 'const' },
        {
          type: 'memberSet',
          object: { type: 'var', name: 's' },
          name: 'x',
          value: { type: 'num', value: 1 },
        },
        {
          type: 'memberSet',
          object: { type: 'var', name: 's' },
          name: 'y',
          value: { type: 'num', value: 2 },
        },
      ])
      // Nenhuma fusão de sprite vazou.
      expect(ir.some((s) => s.type === 'g2d:setPosition' || s.type === 'g2d:setVelocity')).toBe(
        false,
      )
    })

    it('classe válida seguida de uso de sprite continua funcionando (sem regressão)', () => {
      // Garante que a 2ª passada ainda mapeia corpos corretamente.
      const src = ['class X {', '  oi() {', '    alert("a");', '  }', '}'].join('\n')
      expect(parseJS(src)).toEqual([
        {
          type: 'classDecl',
          name: 'X',
          ctorParams: [],
          ctorBody: [],
          methods: [
            {
              name: 'oi',
              params: [],
              body: [{ type: 'alert', value: { type: 'str', value: 'a' } }],
            },
          ],
        },
      ])
    })
  })
})

describe('parseJS — ⚡ Eventos: teclado, mouse, janela e tempo em segundos (round-trip)', () => {
  it('document.addEventListener("keydown", (event) => {…}) → event keydown + event.code', () => {
    const code = `document.addEventListener("keydown", (event) => {\n  let t = event.code;\n});`
    expect(parseJS(code)).toEqual([
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'keydown',
        body: [{ type: 'var', name: 't', value: { type: 'eventProp', prop: 'code' } }],
      },
    ])
  })

  it('ACEITA window.addEventListener para teclado e NORMALIZA para document', () => {
    // O bloco "Quando tecla…" (sz_js_on_key) só emite document — normalizar já
    // no parse deixa o fixpoint blocos⇄código byte-estável (a tecla borbulha,
    // comportamento idêntico). load/resize seguem sendo da janela (teste abaixo).
    const code = `window.addEventListener("keyup", (event) => {\n  let k = event.key;\n});`
    expect(parseJS(code)).toEqual([
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'keyup',
        body: [{ type: 'var', name: 'k', value: { type: 'eventProp', prop: 'key' } }],
      },
    ])
  })

  it('window.addEventListener("resize"/"load", …) → event de janela', () => {
    for (const evt of ['load', 'resize']) {
      const code = `window.addEventListener("${evt}", (event) => { console.log("x"); });`
      expect(parseJS(code)[0]).toMatchObject({ type: 'event', event: evt, targetKind: 'window' })
    }
  })

  it('mousemove no documento → event mousemove', () => {
    const code = `document.addEventListener("mousemove", (event) => { console.log("m"); });`
    expect(parseJS(code)[0]).toMatchObject({
      type: 'event',
      event: 'mousemove',
      targetKind: 'document',
    })
  })

  it('setInterval(cb, N * 1000) → setIntervalSeconds(N); ms cru fica setInterval', () => {
    expect(parseJS('setInterval(() => { console.log("t"); }, 3 * 1000);')).toEqual([
      {
        type: 'setIntervalSeconds',
        delay: { type: 'num', value: 3 },
        body: [{ type: 'consoleLog', value: { type: 'str', value: 't' } }],
      },
    ])
    expect(parseJS('setTimeout(() => { console.log("t"); }, 200);')).toEqual([
      {
        type: 'setTimeout',
        delay: { type: 'num', value: 200 },
        body: [{ type: 'consoleLog', value: { type: 'str', value: 't' } }],
      },
    ])
  })

  it('round-trip: cada bloco novo volta a virar bloco (IR→código→IR estável)', () => {
    const irs: import('#ir').JSStatement[] = [
      {
        type: 'event',
        target: 'document',
        targetKind: 'document',
        event: 'keydown',
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'k' } }],
      },
      {
        type: 'event',
        target: 'window',
        targetKind: 'window',
        event: 'resize',
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'r' } }],
      },
      {
        type: 'setTimeoutSeconds',
        delay: { type: 'num', value: 2 },
        body: [{ type: 'consoleLog', value: { type: 'str', value: 's' } }],
      },
    ]
    for (const ir of irs) {
      expect(parseJS(generateJS({ statements: [ir] }))).toEqual([ir])
    }
  })
})
