import { describe, expect, it } from 'bun:test'
import type { JSExpr, JSStatement } from '#ir'
import { num, str, variable } from '#ir'
import { GeneratorError } from '../expr'
import { GeneratorDepthError, generateJS, MAX_GENERATOR_DEPTH } from '../js'

describe('generateJS', () => {
  it('emite var/assign/consoleLog', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'contador', value: num(0) },
        {
          type: 'assign',
          name: 'contador',
          value: { type: 'binop', op: '+', left: variable('contador'), right: num(1) },
        },
        { type: 'consoleLog', value: variable('contador') },
      ],
    })
    expect(code).toContain('let contador = 0;')
    expect(code).toContain('contador = contador + 1;')
    expect(code).toContain('console.log(contador);')
  })

  it('emite const quando o var tem kind:const', () => {
    const code = generateJS({
      statements: [{ type: 'var', kind: 'const', name: 'PI', value: num(3.14) }],
    })
    expect(code).toContain('const PI = 3.14;')
  })

  it('emite declaração sem valor (declareVar) e Math.random() cru (randomFloat)', () => {
    const code = generateJS({
      statements: [
        { type: 'declareVar', name: 'x' },
        {
          type: 'var',
          kind: 'const',
          name: 'raio',
          value: { type: 'binop', op: '*', left: { type: 'randomFloat' }, right: num(26) },
        },
      ],
    })
    expect(code).toContain('let x;')
    expect(code).toContain('const raio = Math.random() * 26;')
  })

  it('emite Math.hypot (mathBinary) e splice (arraySplice)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'var',
          kind: 'const',
          name: 'dist',
          value: { type: 'mathBinary', fn: 'hypot', a: variable('dx'), b: variable('dy') },
        },
        { type: 'arraySplice', arrayVar: 'enemies', start: variable('index'), count: num(1) },
      ],
    })
    expect(code).toContain('const dist = Math.hypot(dx, dy);')
    expect(code).toContain('enemies.splice(index, 1);')
  })

  it('emite distância entre objetos (Math.hypot a.x-b.x, a.y-b.y)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'var',
          kind: 'const',
          name: 'd',
          value: { type: 'distance', a: variable('player'), b: variable('enemy') },
        },
      ],
    })
    expect(code).toContain('const d = Math.hypot(player.x - enemy.x, player.y - enemy.y);')
  })

  it('usa IIFE na distância quando um operando tem efeito colateral (avalia uma vez)', () => {
    // a = lista.pop(). Na forma inline, `a` saía DUAS vezes (a.x e a.y) → dois pop().
    // A IIFE liga cada operando a um parâmetro e avalia uma única vez.
    const code = generateJS({
      statements: [
        {
          type: 'var',
          kind: 'const',
          name: 'd',
          value: {
            type: 'distance',
            a: { type: 'memberCallExpr', object: variable('lista'), method: 'pop', args: [] },
            b: variable('enemy'),
          },
        },
      ],
    })
    // O efeito colateral aparece UMA única vez no código gerado.
    expect(code.match(/lista\.pop\(\)/g)?.length).toBe(1)
    expect(code).toContain('((a, b) => Math.hypot(a.x - b.x, a.y - b.y))(lista.pop(), enemy)')
    expect(() => new Function(code)).not.toThrow()
  })

  it('mantém a forma inline da distância quando ambos os operandos são puros', () => {
    const code = generateJS({
      statements: [
        {
          type: 'var',
          kind: 'const',
          name: 'd',
          value: { type: 'distance', a: variable('player'), b: variable('enemy') },
        },
      ],
    })
    expect(code).toContain('const d = Math.hypot(player.x - enemy.x, player.y - enemy.y);')
    expect(code).not.toContain('=>')
    expect(() => new Function(code)).not.toThrow()
  })

  it('emite operações de matemática (resto, potência, Math.*)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'var',
          name: 'r',
          value: { type: 'binop', op: '%', left: variable('a'), right: num(2) },
        },
        {
          type: 'var',
          name: 'p',
          value: { type: 'binop', op: '**', left: variable('a'), right: num(2) },
        },
        { type: 'var', name: 'q', value: { type: 'mathUnary', fn: 'sqrt', arg: variable('a') } },
        {
          type: 'var',
          name: 'm',
          value: { type: 'mathBinary', fn: 'max', a: variable('a'), b: num(10) },
        },
      ],
    })
    expect(code).toContain('let r = a % 2;')
    expect(code).toContain('let p = a ** 2;')
    expect(code).toContain('let q = Math.sqrt(a);')
    expect(code).toContain('let m = Math.max(a, 10);')
  })

  it('emite trigonometria, atan2, Math.PI e conversão de ângulo', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 's', value: { type: 'mathUnary', fn: 'sin', arg: variable('a') } },
        {
          type: 'var',
          name: 'ang',
          value: { type: 'mathBinary', fn: 'atan2', a: variable('dy'), b: variable('dx') },
        },
        { type: 'var', name: 'p', value: { type: 'mathConst', name: 'PI' } },
        {
          type: 'var',
          name: 'rad',
          value: { type: 'angleConvert', dir: 'degToRad', arg: num(90) },
        },
        {
          type: 'var',
          name: 'deg',
          value: { type: 'angleConvert', dir: 'radToDeg', arg: variable('r') },
        },
      ],
    })
    expect(code).toContain('let s = Math.sin(a);')
    expect(code).toContain('let ang = Math.atan2(dy, dx);')
    expect(code).toContain('let p = Math.PI;')
    expect(code).toContain('let rad = (90 * Math.PI / 180);')
    expect(code).toContain('let deg = (r * 180 / Math.PI);')
  })

  it('emite clique global com event.clientX/clientY', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'click',
          body: [
            { type: 'var', name: 'mx', value: { type: 'eventProp', prop: 'clientX' } },
            { type: 'var', name: 'my', value: { type: 'eventProp', prop: 'clientY' } },
          ],
        },
      ],
    })
    expect(code).toContain('document.addEventListener("click", (event) => {')
    expect(code).toContain('let mx = event.clientX;')
    expect(code).toContain('let my = event.clientY;')
  })

  it('emite lista (array), tamanho, adicionar e remover', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'itens', value: { type: 'array', items: [num(1), num(2)] } },
        { type: 'var', name: 'vazia', value: { type: 'array', items: [] } },
        { type: 'arrayPush', arrayVar: 'itens', value: num(3) },
        { type: 'arrayRemove', arrayVar: 'itens', end: 'pop' },
        { type: 'arrayRemove', arrayVar: 'itens', end: 'shift' },
        { type: 'var', name: 'n', value: { type: 'arrayLength', arrayVar: 'itens' } },
      ],
    })
    expect(code).toContain('let itens = [1, 2];')
    expect(code).toContain('let vazia = [];')
    expect(code).toContain('itens.push(3);')
    expect(code).toContain('itens.pop();')
    expect(code).toContain('itens.shift();')
    expect(code).toContain('let n = itens.length;')
  })

  it('emite vetores 2D e 3D como objeto literal', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'pos', value: { type: 'vec2', x: num(10), y: num(20) } },
        {
          type: 'var',
          name: 'p3',
          value: { type: 'vec3', x: variable('a'), y: num(0), z: num(5) },
        },
      ],
    })
    expect(code).toContain('let pos = { x: 10, y: 20 };')
    expect(code).toContain('let p3 = { x: a, y: 0, z: 5 };')
  })

  it('não redeclara quando a instância tem o mesmo nome da classe', () => {
    // `class Player {}` + `const Player = new Player()` seria
    // "Identifier 'Player' has already been declared". A variável recebe sufixo.
    const code = generateJS({
      statements: [
        { type: 'classDecl', name: 'Player', ctorParams: [], ctorBody: [], methods: [] },
        { type: 'newInstance', varName: 'Player', className: 'Player', args: [] },
      ],
    })
    expect(code).toContain('class Player {')
    expect(code).toContain('= new Player();')
    expect(code).not.toMatch(/const Player =/)
  })

  it('não declara a mesma classe duas vezes (duplicata vira nome único)', () => {
    // Dois blocos de classe "Pessoa" não podem gerar `class Pessoa` duas vezes
    // (SyntaxError que quebra o preview inteiro); a segunda recebe sufixo.
    const code = generateJS({
      statements: [
        { type: 'classDecl', name: 'Pessoa', __id: 'a', ctorParams: [], ctorBody: [], methods: [] },
        { type: 'classDecl', name: 'Pessoa', __id: 'b', ctorParams: [], ctorBody: [], methods: [] },
      ],
    })
    expect(code).toContain('class Pessoa {')
    expect(code).toContain('class Pessoa_2 {')
  })

  it('emite if/else aninhado e repeat', () => {
    const code = generateJS({
      statements: [
        {
          type: 'if',
          cond: { type: 'binop', op: '>', left: variable('x'), right: num(0) },
          then: [{ type: 'consoleLog', value: str('positivo') }],
          else: [{ type: 'consoleLog', value: str('negativo') }],
        },
        {
          type: 'repeat',
          times: num(3),
          body: [{ type: 'consoleLog', value: str('!') }],
        },
      ],
    })
    expect(code).toMatch(/if \(x > 0\) \{/)
    expect(code).toContain('console.log("positivo");')
    expect(code).toContain('} else {')
    expect(code).toMatch(/for \(let i = 0; i < 3; i\+\+\) \{/)
  })

  it('emite event click usando getElementById + addEventListener', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'meuBotao',
          event: 'click',
          body: [{ type: 'consoleLog', value: str('clicado') }],
        },
      ],
    })
    expect(code).toContain('document.getElementById("meuBotao")?.addEventListener("click"')
    expect(code).toContain('console.log("clicado");')
  })

  it('emite setText via textContent', () => {
    const code = generateJS({
      statements: [{ type: 'setText', targetId: 'saida', value: str('Olá!') }],
    })
    expect(code).toContain('document.getElementById("saida")')
    expect(code).toContain('el.textContent = "Olá!"')
  })

  it('emite alert com texto e com variável', () => {
    const code = generateJS({
      statements: [
        { type: 'alert', value: str('Oi!') },
        { type: 'alert', value: variable('contador') },
      ],
    })
    expect(code).toContain('alert("Oi!");')
    expect(code).toContain('alert(contador);')
  })

  it('emite setProperty escrevendo textContent/value (texto e variável)', () => {
    const code = generateJS({
      statements: [
        { type: 'setProperty', targetId: 'saida', property: 'textContent', value: str('Oi') },
        { type: 'setProperty', targetId: 'campo', property: 'value', value: variable('nome') },
      ],
    })
    expect(code).toContain('document.getElementById("saida").textContent = "Oi";')
    expect(code).toContain('document.getElementById("campo").value = nome;')
  })

  it('emite getProperty lendo textContent/value via optional chaining', () => {
    const code = generateJS({
      statements: [
        { type: 'getProperty', targetId: 'saida', property: 'textContent', varName: 'conteudo' },
        { type: 'getProperty', targetId: 'campo', property: 'value', varName: 'digitado' },
      ],
    })
    expect(code).toContain('const conteudo = document.getElementById("saida")?.textContent;')
    expect(code).toContain('const digitado = document.getElementById("campo")?.value;')
  })

  it('emite setProperty com valor calculado (now): ano/data/hora', () => {
    const code = generateJS({
      statements: [
        {
          type: 'setProperty',
          targetId: 'currentYear',
          targetKind: 'var',
          property: 'textContent',
          value: { type: 'now', kind: 'year' },
        },
        {
          type: 'setProperty',
          targetId: 'd',
          property: 'textContent',
          value: { type: 'now', kind: 'date' },
        },
        {
          type: 'setProperty',
          targetId: 'h',
          property: 'textContent',
          value: { type: 'now', kind: 'time' },
        },
      ],
    })
    expect(code).toContain('currentYear.textContent = new Date().getFullYear();')
    expect(code).toContain(
      'document.getElementById("d").textContent = new Date().toLocaleDateString();',
    )
    expect(code).toContain(
      'document.getElementById("h").textContent = new Date().toLocaleTimeString();',
    )
  })

  it('quando targetKind é var, usa a variável direto (set/get/classOp/event)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'setProperty',
          targetId: 'caixa',
          targetKind: 'var',
          property: 'textContent',
          value: str('Oi'),
        },
        {
          type: 'getProperty',
          targetId: 'caixa',
          targetKind: 'var',
          property: 'value',
          varName: 'v',
        },
        { type: 'classOp', targetId: 'caixa', targetKind: 'var', op: 'add', className: 'ativo' },
        { type: 'event', target: 'caixa', targetKind: 'var', event: 'click', body: [] },
      ],
    })
    expect(code).toContain('caixa.textContent = "Oi";')
    expect(code).toContain('const v = caixa?.value;')
    expect(code).toContain('caixa?.classList.add("ativo");')
    expect(code).toContain('caixa?.addEventListener("click"')
    // Não deve cair no document.getElementById quando é variável.
    expect(code).not.toContain('document.getElementById("caixa")')
  })

  it('emite canvasSetup com par canvas + contexto', () => {
    const code = generateJS({
      statements: [{ type: 'canvasSetup', canvasId: 'game', varName: 'ctx' }],
    })
    expect(code).toContain('const canvas = document.getElementById("game")')
    expect(code).toContain("const ctx = canvas.getContext('2d');")
  })

  it('console.log de "canvas" referencia o elemento (não vira canvas_2)', () => {
    const code = generateJS({
      statements: [
        { type: 'canvasSetup', canvasId: 'game', varName: 'ctx' },
        { type: 'consoleLog', value: { type: 'var', name: 'canvas' } },
      ],
    })
    // Referenciar `canvas` resolve para o próprio elemento do canvas.
    expect(code).toContain('const canvas = document.getElementById("game");')
    expect(code).toContain('console.log(canvas);')
    expect(code).not.toContain('canvas_2')
  })

  it('é determinístico independente da ordem dos statements (canvas estável)', () => {
    const stmts = [
      { type: 'canvasSetup', canvasId: 'game', varName: 'ctx' },
      { type: 'canvasClear', ctxVar: 'ctx', canvasVar: 'ctx' },
    ] as const
    const a = generateJS({ statements: [...stmts] })
    const b = generateJS({ statements: [...stmts] })
    expect(a).toBe(b)
    expect(a).not.toContain('canvas_2')
  })

  it('emite canvasSetSize com window.innerWidth/Height (tela cheia)', () => {
    const code = generateJS({
      statements: [
        { type: 'canvasSetup', canvasId: 'game', varName: 'ctx' },
        {
          type: 'canvasSetSize',
          ctxVar: 'ctx',
          w: { type: 'global', kind: 'innerWidth' },
          h: { type: 'global', kind: 'innerHeight' },
        },
      ],
    })
    expect(code).toContain('canvas.width = window.innerWidth;')
    expect(code).toContain('canvas.height = window.innerHeight;')
  })

  it('compila valores helper: canvasDim e random', () => {
    const code = generateJS({
      statements: [
        { type: 'canvasSetup', canvasId: 'game', varName: 'ctx' },
        {
          type: 'canvasArc',
          ctxVar: 'ctx',
          x: { type: 'canvasDim', ctxVar: 'ctx', dim: 'width' },
          y: { type: 'canvasDim', ctxVar: 'ctx', dim: 'height' },
          r: { type: 'random', min: { type: 'num', value: 5 }, max: { type: 'num', value: 20 } },
        },
      ],
    })
    expect(code).toContain('ctx.arc(canvas.width, canvas.height,')
    expect(code).toContain('Math.floor(Math.random() * ((20) - (5) + 1)) + (5)')
  })

  it('emite animationLoop com requestAnimationFrame interno e pontapé frame()', () => {
    const code = generateJS({
      statements: [{ type: 'animationLoop', body: [{ type: 'consoleLog', value: num(1) }] }],
    })
    expect(code).toContain('function frame()')
    // RAF reagenda o próximo quadro dentro da função.
    expect(code).toContain('requestAnimationFrame(frame);')
    // Pontapé inicial: chama a própria função (sem parâmetros) fora de tudo.
    expect(code).toContain('frame();')
  })

  it('emite animationLoop cancelável guardando o id em uma variável', () => {
    const code = generateJS({
      statements: [
        { type: 'animationLoop', handle: 'animId', body: [{ type: 'consoleLog', value: num(1) }] },
      ],
    })
    expect(code).toContain('let animId;')
    expect(code).toContain('function frame()')
    // Dentro da função, o id é reatribuído a cada quadro.
    expect(code).toContain('animId = requestAnimationFrame(frame);')
    expect(code).toContain('frame();')
    // O re-agendamento fica NO TOPO da função (antes do corpo), para que um
    // cancelAnimationFrame chamado de dentro do corpo realmente pare o loop.
    expect(code.indexOf('animId = requestAnimationFrame(frame);')).toBeLessThan(
      code.indexOf('console.log(1)'),
    )
  })

  it('emite cancelAnimationFrame com a variável do id', () => {
    const code = generateJS({
      statements: [{ type: 'cancelAnimationFrame', handle: { type: 'var', name: 'animId' } }],
    })
    expect(code).toContain('cancelAnimationFrame(animId);')
  })

  it('emite keyboardSimple com mapeamento de teclas', () => {
    const code = generateJS({
      statements: [{ type: 'keyboardSimple', varName: 'teclas' }],
    })
    expect(code).toContain('const teclas = { left: false, right: false, up: false, down: false };')
    expect(code).toContain("if (e.key === 'ArrowLeft') teclas.left = true;")
  })

  it('emite g2d:createSprite com chamada didática para SZGame2D', () => {
    const code = generateJS({
      statements: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 100,
          y: 100,
          w: 40,
          h: 40,
          color: '#22d3ee',
        },
      ],
    })
    expect(code).toContain(
      'const jogador = SZGame2D.createSprite({ x: 100, y: 100, w: 40, h: 40, color: "#22d3ee" });',
    )
  })

  it('emite g2d:topDown e drawSprite', () => {
    const code = generateJS({
      statements: [
        { type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 },
        { type: 'g2d:drawSprite', spriteVar: 'jogador', ctxVar: 'ctx' },
      ],
    })
    expect(code).toContain('SZGame2D.topDown(jogador, 4);')
    expect(code).toContain('SZGame2D.drawSprite(ctx, jogador);')
  })

  it('emite g2d:updateEachFrame envolvendo body em gameLoop', () => {
    const code = generateJS({
      statements: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'canvasClear', ctxVar: 'ctx', canvasVar: 'ctx' },
            { type: 'g2d:drawSprite', spriteVar: 'p', ctxVar: 'ctx' },
          ],
        },
      ],
    })
    expect(code).toMatch(/SZGame2D\.gameLoop\(function update\(\) \{/)
    expect(code).toContain('SZGame2D.drawSprite(ctx, p);')
  })

  it('eleva o loop de animação aninhado para o nível global (fora de tudo)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'btn',
          event: 'click',
          body: [
            { type: 'consoleLog', value: str('iniciar') },
            { type: 'animationLoop', body: [{ type: 'consoleLog', value: num(1) }] },
          ],
        },
      ],
    })
    // A função e a chamada frame() ficam no topo, sem indentação.
    expect(code).toMatch(/^function frame\(\) \{/m)
    expect(code).toMatch(/^frame\(\);/m)
    // O addEventListener fecha ANTES de declarar a função frame (loop não está aninhado).
    const idxClose = code.indexOf('});')
    const idxFrameFn = code.indexOf('function frame()')
    expect(idxClose).toBeGreaterThanOrEqual(0)
    expect(idxFrameFn).toBeGreaterThan(idxClose)
    // Dentro do handler não há chamada frame().
    const handler = code.slice(0, idxClose)
    expect(handler).not.toContain('frame()')
  })

  it('gera setInterval(() => {…}, ms)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'setInterval',
          delay: num(500),
          body: [{ type: 'consoleLog', value: str('tick') }],
        },
      ],
    })
    expect(code).toContain('setInterval(() => {')
    expect(code).toContain('}, 500);')
    expect(code).toContain('console.log("tick");')
  })

  it('preserva rawJS (modo avançado) sem alteração', () => {
    const code = generateJS({
      statements: [{ type: 'rawJS', code: 'setTimeout(() => alert("hi"), 100);', advanced: true }],
    })
    expect(code).toContain('setTimeout(() => alert("hi"), 100);')
  })

  it('preserva o interior de um template literal multilinha no rawJS (sem re-indentar cada linha)', () => {
    // O conteúdo entre crases (incl. linhas em branco e indentação própria) NÃO
    // pode ser tocado: re-indentar cada linha física inseria espaços DENTRO da
    // string. No nível raiz (sem pad) o texto sai byte-a-byte idêntico.
    const raw = ['const msg = `linha1', '  meio indentado', '', 'fim`;'].join('\n')
    const code = generateJS({
      statements: [{ type: 'rawJS', code: raw, advanced: true }],
    })
    expect(code).toContain(raw)
  })

  it('mantém o template literal multilinha verbatim mesmo quando o rawJS é indentado (dentro de um if)', () => {
    // Aqui o rawJS está aninhado, então a 1ª linha recebe o pad de indentação,
    // mas as linhas seguintes (interior do template) permanecem intocadas.
    const raw = ['const html = `<p>', '  recuo do autor', 'fim</p>`;'].join('\n')
    const code = generateJS({
      statements: [
        {
          type: 'if',
          cond: { type: 'binop', op: '>', left: variable('x'), right: num(0) },
          then: [{ type: 'rawJS', code: raw, advanced: true }],
        },
      ],
    })
    // 1ª linha recebe o pad (2 espaços), abrindo a crase indentada uma vez.
    expect(code).toContain('  const html = `<p>')
    // As linhas internas do template ficam exatamente como o autor escreveu.
    expect(code).toContain('\n  recuo do autor\n')
    expect(code).toContain('\nfim</p>`;')
  })

  it('emite event mouseover ligado a um elemento por id', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'cartao',
          event: 'mouseover',
          body: [{ type: 'consoleLog', value: str('hover!') }],
        },
      ],
    })
    expect(code).toContain('document.getElementById("cartao")?.addEventListener("mouseover"')
  })

  it('emite event submit em formulário por id', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'meuForm',
          event: 'submit',
          body: [{ type: 'consoleLog', value: str('enviou') }],
        },
      ],
    })
    expect(code).toContain('document.getElementById("meuForm")?.addEventListener("submit"')
    expect(code).toContain('event.preventDefault();')
  })

  it('emite querySelector com const', () => {
    const code = generateJS({
      statements: [{ type: 'querySelector', selector: '.caixa', varName: 'caixa' }],
    })
    expect(code).toContain('const caixa = document.querySelector(".caixa");')
  })

  it('emite classOp.add com classList.add', () => {
    const code = generateJS({
      statements: [{ type: 'classOp', targetId: 'meuBotao', op: 'add', className: 'ativo' }],
    })
    expect(code).toContain('document.getElementById("meuBotao")?.classList.add("ativo");')
  })

  it('pré-carrega canvasDrawImage e resolve o asset antes de desenhar', () => {
    const code = generateJS({
      statements: [
        {
          type: 'canvasDrawImage',
          ctxVar: 'ctx',
          src: 'https://exemplo.com/img.png',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 100 },
          h: { type: 'num', value: 100 },
        },
      ],
    })
    expect(code).toContain('new Image()')
    expect(code).toContain('imagem.src = window.__SZGAME_ASSETS?.[nomeDaImagem] ?? nomeDaImagem')
    expect(code).toContain('imagensCanvas.get("https://exemplo.com/img.png")')
    expect(code).toContain('ctx.drawImage(ctxImagem, 0, 0, 100, 100)')
  })

  it('carrega uma imagem uma vez e a reutiliza em todos os quadros', async () => {
    const code = generateJS({
      statements: [
        {
          type: 'animationLoop',
          body: [
            {
              type: 'canvasDrawImage',
              ctxVar: 'ctx',
              src: 'nave.png',
              x: { type: 'num', value: 10 },
              y: { type: 'num', value: 20 },
              w: { type: 'num', value: 64 },
              h: { type: 'num', value: 64 },
            },
          ],
        },
      ],
    })

    let imageCreations = 0
    class TestImage {
      complete = false
      naturalWidth = 64
      private loadListeners: Array<() => void> = []

      constructor() {
        imageCreations += 1
      }

      addEventListener(type: string, listener: () => void): void {
        if (type === 'load') this.loadListeners.push(listener)
      }

      set src(_value: string) {
        this.complete = true
        for (const listener of this.loadListeners) listener()
      }
    }

    let nextFrame: (() => void) | undefined
    const requestFrame = (callback: () => void): number => {
      nextFrame = callback
      return 1
    }
    let draws = 0
    const ctx = { drawImage: () => draws++ }

    new Function('window', 'Image', 'requestAnimationFrame', 'ctx', code)(
      {},
      TestImage,
      requestFrame,
      ctx,
    )
    await Promise.resolve()
    await Promise.resolve()
    nextFrame?.()
    nextFrame?.()

    expect(imageCreations).toBe(1)
    expect(draws).toBe(3)
  })

  it('continua o projeto quando uma imagem falha, sem tentar desenhá-la', async () => {
    const code = generateJS({
      statements: [
        {
          type: 'canvasDrawImage',
          ctxVar: 'ctx',
          src: 'ausente.png',
          x: { type: 'num', value: 0 },
          y: { type: 'num', value: 0 },
          w: { type: 'num', value: 32 },
          h: { type: 'num', value: 32 },
        },
        { type: 'consoleLog', value: { type: 'str', value: 'projeto começou' } },
      ],
    })

    class BrokenImage {
      private errorListeners: Array<() => void> = []

      addEventListener(type: string, listener: () => void): void {
        if (type === 'error') this.errorListeners.push(listener)
      }

      set src(_value: string) {
        for (const listener of this.errorListeners) listener()
      }
    }

    let draws = 0
    const logs: string[] = []
    const warnings: string[] = []
    new Function('window', 'Image', 'ctx', 'console', code)(
      {},
      BrokenImage,
      { drawImage: () => draws++ },
      {
        log: (message: string) => logs.push(message),
        warn: (_message: string, source: string) => warnings.push(source),
      },
    )
    await Promise.resolve()
    await Promise.resolve()

    expect(draws).toBe(0)
    expect(logs).toEqual(['projeto começou'])
    expect(warnings).toEqual(['ausente.png'])
  })

  it('emite canvasSave/restore/translate/rotate/scale', () => {
    const code = generateJS({
      statements: [
        { type: 'canvasSave', ctxVar: 'ctx' },
        {
          type: 'canvasTranslate',
          ctxVar: 'ctx',
          x: { type: 'num', value: 50 },
          y: { type: 'num', value: 50 },
        },
        { type: 'canvasRotate', ctxVar: 'ctx', angle: { type: 'num', value: 0.5 } },
        {
          type: 'canvasScale',
          ctxVar: 'ctx',
          sx: { type: 'num', value: 2 },
          sy: { type: 'num', value: 2 },
        },
        { type: 'canvasRestore', ctxVar: 'ctx' },
      ],
    })
    expect(code).toContain('ctx.save();')
    expect(code).toContain('ctx.translate(50, 50);')
    expect(code).toContain('ctx.rotate(0.5);')
    expect(code).toContain('ctx.scale(2, 2);')
    expect(code).toContain('ctx.restore();')
  })

  it('emite canvasGradient com addColorStop para cada parada', () => {
    const code = generateJS({
      statements: [
        {
          type: 'canvasGradient',
          ctxVar: 'ctx',
          varName: 'g',
          x0: { type: 'num', value: 0 },
          y0: { type: 'num', value: 0 },
          x1: { type: 'num', value: 200 },
          y1: { type: 'num', value: 0 },
          stops: [
            { offset: 0, color: '#22d3ee' },
            { offset: 1, color: '#a78bfa' },
          ],
        },
      ],
    })
    expect(code).toContain('const g = ctx.createLinearGradient(0, 0, 200, 0);')
    expect(code).toContain('g.addColorStop(0, "#22d3ee");')
    expect(code).toContain('g.addColorStop(1, "#a78bfa");')
  })

  it('normaliza palavras reservadas preservando referências', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'class', value: num(1) },
        {
          type: 'assign',
          name: 'class',
          value: { type: 'binop', op: '+', left: variable('class'), right: num(1) },
        },
        { type: 'consoleLog', value: variable('class') },
      ],
    })

    expect(code).toContain('let class_ = 1;')
    expect(code).toContain('class_ = class_ + 1;')
    expect(code).toContain('console.log(class_);')
    expect(() => new Function(code)).not.toThrow()
  })

  it('evita colisões quando nomes diferentes viram o mesmo identificador', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'a-b', value: num(1) },
        { type: 'var', name: 'a_b', value: num(2) },
        { type: 'consoleLog', value: variable('a-b') },
        { type: 'consoleLog', value: variable('a_b') },
      ],
    })

    expect(code).toContain('let a_b_2 = 1;')
    expect(code).toContain('let a_b = 2;')
    expect(code).toContain('console.log(a_b_2);')
    expect(code).toContain('console.log(a_b);')
    expect(() => new Function(code)).not.toThrow()
  })

  it('evita colisão entre variáveis do aluno e temporários internos', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'i', value: num(0) },
        {
          type: 'repeat',
          times: num(2),
          body: [{ type: 'consoleLog', value: variable('i') }],
        },
      ],
    })

    expect(code).toContain('let i = 0;')
    expect(code).toMatch(/for \(let i_2 = 0; i_2 < 2; i_2\+\+\)/)
    expect(code).toContain('console.log(i);')
    expect(() => new Function(code)).not.toThrow()
  })

  it('emite rgba() válido para hex bem formado (#rrggbb e #rgb)', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'c1', value: { type: 'colorAlpha', hex: '#22d3ee', alpha: 0.5 } },
        { type: 'var', name: 'c2', value: { type: 'colorAlpha', hex: '#abc', alpha: 1 } },
      ],
    })
    expect(code).toContain('let c1 = "rgba(34, 211, 238, 0.5)";')
    // #abc expande para #aabbcc.
    expect(code).toContain('let c2 = "rgba(170, 187, 204, 1)";')
  })

  it('colorAlpha com hex malformado cai para preto (sem NaN) e clampa o alpha', () => {
    const code = generateJS({
      statements: [
        { type: 'var', name: 'ruim', value: { type: 'colorAlpha', hex: 'azul', alpha: 0.3 } },
        { type: 'var', name: 'over', value: { type: 'colorAlpha', hex: '#fff', alpha: 9 } },
        { type: 'var', name: 'under', value: { type: 'colorAlpha', hex: '#000000', alpha: -2 } },
      ],
    })
    expect(code).not.toContain('NaN')
    expect(code).toContain('let ruim = "rgba(0, 0, 0, 0.3)";')
    // alpha fora de [0,1] é truncado.
    expect(code).toContain('let over = "rgba(255, 255, 255, 1)";')
    expect(code).toContain('let under = "rgba(0, 0, 0, 0)";')
  })

  it('parentiza os limites do random (limite aditivo não quebra a aritmética)', () => {
    // min = a - b, max = m. Sem parênteses sairia `Math.random() * (m - a - b + 1)`
    // — aritmética errada. Com parênteses: `((m) - (a - b) + 1)`.
    const code = generateJS({
      statements: [
        {
          type: 'var',
          name: 'n',
          value: {
            type: 'random',
            min: { type: 'binop', op: '-', left: variable('a'), right: variable('b') },
            max: variable('m'),
          },
        },
      ],
    })
    expect(code).toContain('Math.floor(Math.random() * ((m) - (a - b) + 1)) + (a - b)')
    expect(() => new Function(code)).not.toThrow()
  })

  it('usa IIFE no random quando um limite tem efeito colateral (avalia uma vez)', () => {
    // min = lista.pop(). Na forma inline, `min` saía DUAS vezes → dois pop().
    // A IIFE liga cada limite a um parâmetro e avalia uma única vez.
    const code = generateJS({
      statements: [
        {
          type: 'var',
          name: 'n',
          value: {
            type: 'random',
            min: { type: 'memberCallExpr', object: variable('lista'), method: 'pop', args: [] },
            max: num(10),
          },
        },
      ],
    })
    // O efeito colateral aparece UMA única vez no código gerado.
    expect(code.match(/lista\.pop\(\)/g)?.length).toBe(1)
    expect(code).toContain(
      '((a, b) => Math.floor(Math.random() * (b - a + 1)) + a)(lista.pop(), 10)',
    )
    expect(() => new Function(code)).not.toThrow()
  })

  it('mantém a forma inline do random quando ambos os limites são puros', () => {
    const code = generateJS({
      statements: [
        {
          type: 'var',
          name: 'n',
          value: { type: 'random', min: num(1), max: variable('m') },
        },
      ],
    })
    expect(code).toContain('Math.floor(Math.random() * ((m) - (1) + 1)) + (1)')
    expect(code).not.toContain('=>')
  })

  it('inclui header quando fornecido', () => {
    const code = generateJS({
      statements: [],
      header: '// Gerado pelo Sistema Zero Studio',
    })
    expect(code.startsWith('// Gerado pelo Sistema Zero Studio')).toBe(true)
  })

  it('lança GeneratorDepthError (capturável) numa IR aninhada demais, sem estourar a pilha', () => {
    // Monta `if` dentro de `if` … bem além do teto. Sem a guarda, isto estourava
    // a pilha do motor (RangeError) e os chamadores na thread principal (que não
    // têm try/catch) tinham tela branca. Agora vira um erro TIPADO e capturável.
    let nested: JSStatement = { type: 'consoleLog', value: num(1) }
    for (let i = 0; i < MAX_GENERATOR_DEPTH + 50; i += 1) {
      nested = { type: 'if', cond: { type: 'bool', value: true }, then: [nested] }
    }
    expect(() => generateJS({ statements: [nested] })).toThrow(GeneratorDepthError)
  })

  it('aceita aninhamento dentro do limite (não lança)', () => {
    let nested: JSStatement = { type: 'consoleLog', value: num(1) }
    for (let i = 0; i < 50; i += 1) {
      nested = { type: 'if', cond: { type: 'bool', value: true }, then: [nested] }
    }
    expect(() => generateJS({ statements: [nested] })).not.toThrow()
  })
})

describe('generateJS — eventos de teclado/mouse/janela + temporizadores em segundos', () => {
  it('teclado: keydown vira document.addEventListener + event.code', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'keydown',
          body: [{ type: 'var', name: 'tecla', value: { type: 'eventProp', prop: 'code' } }],
        },
      ],
    })
    expect(code).toContain('document.addEventListener("keydown", (event) => {')
    expect(code).toContain('let tecla = event.code;')
  })

  it('mousemove vira document.addEventListener', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'document',
          targetKind: 'document',
          event: 'mousemove',
          body: [{ type: 'consoleLog', value: str('movendo') }],
        },
      ],
    })
    expect(code).toContain('document.addEventListener("mousemove", (event) => {')
  })

  it('load/resize viram window.addEventListener', () => {
    const code = generateJS({
      statements: [
        {
          type: 'event',
          target: 'window',
          targetKind: 'window',
          event: 'resize',
          body: [{ type: 'consoleLog', value: str('mudou') }],
        },
      ],
    })
    expect(code).toContain('window.addEventListener("resize", (event) => {')
  })

  it('temporizadores em segundos emitem delay × 1000', () => {
    const code = generateJS({
      statements: [
        {
          type: 'setIntervalSeconds',
          delay: num(3),
          body: [{ type: 'consoleLog', value: str('tick') }],
        },
        {
          type: 'setTimeoutSeconds',
          delay: num(1),
          body: [{ type: 'consoleLog', value: str('depois') }],
        },
      ],
    })
    expect(code).toContain('setInterval(() => {')
    expect(code).toContain('}, 3 * 1000);')
    expect(code).toContain('setTimeout(() => {')
    expect(code).toContain('}, 1 * 1000);')
  })

  it('segundos com delay composto sai parentizado: (a + b) * 1000', () => {
    const code = generateJS({
      statements: [
        {
          type: 'setTimeoutSeconds',
          delay: { type: 'binop', op: '+', left: variable('a'), right: variable('b') },
          body: [{ type: 'consoleLog', value: str('x') }],
        },
      ],
    })
    expect(code).toContain('}, (a + b) * 1000);')
  })
})

describe('objectLiteral / objectKey', () => {
  const objVar = (entries: Array<{ key: string; value: JSExpr }>): JSStatement => ({
    type: 'var',
    kind: 'const',
    name: 'obj',
    value: { type: 'objectLiteral', entries },
  })

  it('força aspas na chave __proto__ (propriedade própria, não prototype)', () => {
    const code = generateJS({ statements: [objVar([{ key: '__proto__', value: num(1) }])] })
    // Com aspas, `{ "__proto__": 1 }` é uma propriedade PRÓPRIA normal — não
    // define o protótipo do objeto (o que `{ __proto__: 1 }` faria).
    expect(code).toContain('{ "__proto__": 1 }')
    expect(code).not.toContain('{ __proto__: 1 }')
  })

  it('mantém constructor/prototype como chaves CRUAS (sem tratamento especial)', () => {
    const code = generateJS({
      statements: [
        objVar([
          { key: 'constructor', value: num(1) },
          { key: 'prototype', value: num(2) },
          { key: 'comum', value: str('x') },
        ]),
      ],
    })
    expect(code).toContain('constructor: 1')
    expect(code).toContain('prototype: 2')
    expect(code).toContain('comum: "x"')
  })

  it('coloca entre aspas chaves que não são identificadores', () => {
    const code = generateJS({
      statements: [objVar([{ key: 'tem espaço', value: num(1) }])] as JSStatement[],
    })
    expect(code).toContain('"tem espaço": 1')
  })
})

describe('ramos default exaustivos (nó fora do esquema)', () => {
  it('compileStatementCode lança GeneratorError (não emite "undefined")', () => {
    // Statement com `type` que NENHUM case cobre (ex.: IR de um JSON importado de
    // um estranho). Sem o default, o switch caía pela borda e o gerador emitia a
    // string literal "undefined". Agora é erro tipado e capturável.
    const bogus = { type: 'naoExiste', __id: 'b1' } as unknown as JSStatement
    expect(() => generateJS({ statements: [bogus] })).toThrow(GeneratorError)
    let emitted = ''
    try {
      emitted = generateJS({ statements: [bogus] })
    } catch {
      /* esperado */
    }
    expect(emitted).not.toContain('undefined')
  })

  it('compileExpr lança GeneratorError para expressão fora do esquema', () => {
    const bogusExpr = { type: 'exprFantasma' } as unknown as JSExpr
    const stmt: JSStatement = { type: 'consoleLog', value: bogusExpr }
    expect(() => generateJS({ statements: [stmt] })).toThrow(GeneratorError)
  })
})
