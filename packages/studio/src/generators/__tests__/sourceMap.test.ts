import { describe, expect, it } from 'bun:test'
import { generateProjectFilesWithMap } from '../project'
import { findIdAtLine, reverseSourceMap } from '../sourceMap'

describe('source map (top-level)', () => {
  it('mapeia cada bloco filho em conteúdo HTML misto', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [
          {
            __id: 'paragraph',
            type: 'element',
            tag: 'p',
            children: [
              { __id: 'text', type: 'text', text: 'Olá ' },
              { __id: 'strong', type: 'element', tag: 'strong', text: 'mundo' },
            ],
          },
        ],
        css: [],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.paragraph?.file).toBe('index.html')
    expect(sourceMap.text?.file).toBe('index.html')
    expect(sourceMap.strong?.file).toBe('index.html')
    expect(sourceMap.text?.startLine).toBe(sourceMap.paragraph?.startLine)
    expect(sourceMap.strong?.startColumn).toBeGreaterThan(sourceMap.text?.startColumn ?? 0)
  })

  it('mapeia cada statement top-level para sua faixa de linhas no script.js', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          { __id: 'b1', type: 'var', name: 'x', value: { type: 'num', value: 0 } },
          { __id: 'b2', type: 'consoleLog', value: { type: 'str', value: 'oi' } },
        ],
        extensions: [],
      },
    })
    expect(sourceMap.b1?.file).toBe('script.js')
    expect(sourceMap.b1?.startLine).toBe(3)
    expect(sourceMap.b1?.endLine).toBe(3)
    expect(sourceMap.b2?.file).toBe('script.js')
    expect(sourceMap.b2?.startLine).toBe(4)
    const lines = files['script.js'].split('\n')
    expect(lines[0]).toBe('(function __szProjectRun() {')
    expect(lines[1]).toContain('// Ao iniciar')
    expect(lines[2]).toContain('let x = 0;')
    expect(lines[3]).toContain('console.log("oi");')
  })

  it('considera o header de JS no offset', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      jsHeader: '// header\n// linha 2',
      ir: {
        html: [],
        css: [],
        js: [{ __id: 'b1', type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
        extensions: [],
      },
    })
    // Header ocupa 3 linhas; a fábrica é a 4ª, o marcador a 5ª e o statement a 6ª.
    expect(sourceMap.b1?.startLine).toBe(6)
  })

  it('mapeia statements JS aninhados para o bloco específico', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'evt',
            type: 'event',
            target: 'btn',
            event: 'click',
            body: [
              { __id: 'log', type: 'consoleLog', value: { type: 'str', value: 'oi' } },
              {
                __id: 'if',
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '>',
                  left: { type: 'var', name: 'x' },
                  right: { type: 'num', value: 1 },
                },
                then: [{ __id: 'inside', type: 'alert', value: { type: 'str', value: 'ok' } }],
              },
            ],
          },
        ],
        extensions: [],
      },
    })

    expect(files['script.js'].split('\n')[4]).toContain('console.log("oi");')
    expect(sourceMap.evt).toMatchObject({ file: 'script.js', startLine: 4, endLine: 9 })
    expect(sourceMap.log).toMatchObject({
      file: 'script.js',
      startLine: 5,
      endLine: 5,
      startColumn: 5,
    })
    expect(sourceMap.if).toMatchObject({ file: 'script.js', startLine: 6, endLine: 8 })
    expect(sourceMap.inside).toMatchObject({
      file: 'script.js',
      startLine: 7,
      endLine: 7,
      startColumn: 7,
    })
  })

  it('mapeia cada bloco de caso da escolha para suas linhas', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'escolha',
            type: 'switch',
            subject: { type: 'var', name: 'direcao' },
            cases: [
              {
                __id: 'caso-cima',
                match: { type: 'str', value: 'cima' },
                body: [
                  { __id: 'acao', type: 'consoleLog', value: { type: 'str', value: 'subiu' } },
                ],
              },
            ],
          },
        ],
        extensions: [],
      },
    })

    const entry = sourceMap['caso-cima']
    expect(entry).toMatchObject({ file: 'script.js' })
    const lines = files['script.js'].split('\n')
    expect(lines[(entry?.startLine ?? 0) - 1]).toContain('case "cima"')
    expect(lines[(entry?.endLine ?? 0) - 1]?.trim()).toBe('}')
    expect(sourceMap.acao?.startLine).toBe((entry?.startLine ?? 0) + 1)
  })

  it('mapeia HTML top-level no index.html', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [
          { __id: 'h1', type: 'element', tag: 'h1', text: 'Olá' },
          { __id: 'h2', type: 'element', tag: 'p', text: 'mundo' },
        ],
        css: [],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.h1?.file).toBe('index.html')
    expect(sourceMap.h2?.file).toBe('index.html')
    expect(sourceMap.h1?.startLine).toBe(9)
    expect(sourceMap.h2?.startLine).toBe(10)
    const lines = files['index.html'].split('\n')
    expect(lines[8]).toContain('<h1>Olá</h1>')
    expect(lines[9]).toContain('<p>mundo</p>')
  })

  it('mapeia HTML aninhado para o bloco filho específico', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [
          {
            __id: 'section',
            type: 'element',
            tag: 'section',
            children: [{ __id: 'title', type: 'element', tag: 'h1', text: 'Olá' }],
          },
        ],
        css: [],
        js: [],
        extensions: [],
      },
    })

    expect(sourceMap.section).toMatchObject({ file: 'index.html', startLine: 9, endLine: 11 })
    expect(sourceMap.title).toMatchObject({
      file: 'index.html',
      startLine: 10,
      endLine: 10,
      startColumn: 7,
    })
  })

  it('mapeia CSS rules separadas por linha em branco', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [
          { __id: 'c1', selector: 'body', declarations: { background: '#000' } },
          { __id: 'c2', selector: 'h1', declarations: { color: '#fff' } },
        ],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.c1?.file).toBe('style.css')
    expect(sourceMap.c1?.startLine).toBe(1)
    expect(sourceMap.c1?.endLine).toBe(3) // body { \n   background: #000; \n }
    expect(sourceMap.c2?.startLine).toBe(5) // após linha em branco
  })

  it('reverseSourceMap + findIdAtLine resolvem linha para id corretamente', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          { __id: 'a', type: 'consoleLog', value: { type: 'num', value: 1 } },
          { __id: 'b', type: 'consoleLog', value: { type: 'num', value: 2 } },
        ],
        extensions: [],
      },
    })
    const rev = reverseSourceMap(sourceMap)
    expect(findIdAtLine(rev, 'script.js', 3)).toBe('a')
    expect(findIdAtLine(rev, 'script.js', 4)).toBe('b')
    expect(findIdAtLine(rev, 'script.js', 999)).toBeNull()
  })

  it('indexa source map reverso com prefixo de endLine para lookup eficiente', () => {
    const rev = reverseSourceMap({
      early: { file: 'script.js', startLine: 1, endLine: 100 },
      short: { file: 'script.js', startLine: 90, endLine: 90 },
      late: { file: 'script.js', startLine: 120, endLine: 120 },
    })

    expect(rev['script.js'].entries.map((entry) => entry.id)).toEqual(['early', 'short', 'late'])
    expect(rev['script.js'].maxEndLinePrefix).toEqual([100, 100, 120])
    expect(findIdAtLine(rev, 'script.js', 95)).toBe('early')
  })

  it('usa coluna quando há ranges na mesma linha', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [{ __id: 'a', type: 'consoleLog', value: { type: 'num', value: 1 } }],
        extensions: [],
      },
    })
    const rev = reverseSourceMap(sourceMap)

    expect(findIdAtLine(rev, 'script.js', 3, 3)).toBe('a')
    expect(findIdAtLine(rev, 'script.js', 3, 999)).toBeNull()
  })
})

describe('source map (expressões / blocos de valor)', () => {
  it('mapeia a condição de um "se" (e seus operandos) para a linha do if', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'if',
            type: 'if',
            cond: {
              __id: 'cond',
              type: 'binop',
              op: '>',
              left: { __id: 'cleft', type: 'var', name: 'x' },
              right: { __id: 'cright', type: 'num', value: 1 },
            },
            then: [],
          },
        ],
        extensions: [],
      },
    })
    // A fábrica e o marcador ocupam as linhas 1–2; o `if` fica na linha 3.
    expect(sourceMap.cond).toMatchObject({ file: 'script.js', startLine: 3, endLine: 3 })
    expect(sourceMap.cleft).toMatchObject({ file: 'script.js', startLine: 3, endLine: 3 })
    expect(sourceMap.cright).toMatchObject({ file: 'script.js', startLine: 3, endLine: 3 })
  })

  it('mapeia o valor calculado de uma variável para a linha da declaração', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'v',
            type: 'var',
            name: 'total',
            value: {
              __id: 'sum',
              type: 'binop',
              op: '+',
              left: { type: 'num', value: 2 },
              right: { type: 'num', value: 3 },
            },
          },
        ],
        extensions: [],
      },
    })
    expect(sourceMap.sum).toMatchObject({ file: 'script.js', startLine: 3, endLine: 3 })
  })

  it('mapeia o valor de el.textContent (setText) para a 3ª linha do bloco', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 's',
            type: 'setText',
            targetId: 'alvo',
            value: { __id: 'txt', type: 'str', value: 'oi' },
          },
        ],
        extensions: [],
      },
    })
    // bloco { (1) / const el (2) / if (el) el.textContent = <txt> (3) / } (4)
    expect(sourceMap.txt).toMatchObject({ file: 'script.js', startLine: 5, endLine: 5 })
  })

  it('no empate de linha, editor→bloco seleciona o statement, não a expressão interna', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'stmt',
            type: 'var',
            name: 'x',
            value: { __id: 'val', type: 'num', value: 5 },
          },
        ],
        extensions: [],
      },
    })
    const rev = reverseSourceMap(sourceMap)
    // bloco→editor: a expressão interna tem entrada própria (linha única).
    expect(sourceMap.val).toMatchObject({ file: 'script.js', startLine: 3, endLine: 3 })
    // editor→bloco: empate de span → vence o statement (tem colunas definidas).
    expect(findIdAtLine(rev, 'script.js', 3)).toBe('stmt')
    expect(findIdAtLine(rev, 'script.js', 3, 3)).toBe('stmt')
  })
})

describe('source map (membros de classe)', () => {
  it('mapeia o construtor e o método ao seu cabeçalho..fim no script.js', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'cls',
            type: 'classDecl',
            name: 'Pessoa',
            ctorParams: ['nome'],
            ctorId: 'ctor1',
            ctorBody: [
              {
                __id: 'sett',
                type: 'setThisProp',
                name: 'nome',
                value: { type: 'var', name: 'nome' },
              },
            ],
            methods: [
              {
                __id: 'met1',
                name: 'falar',
                params: [],
                body: [
                  { __id: 'log', type: 'consoleLog', value: { type: 'thisProp', name: 'nome' } },
                ],
              },
            ],
          },
        ],
        extensions: [],
      },
    })
    const lines = files['script.js'].split('\n')
    // Layout esperado (1-indexed):
    // A fábrica ocupa a linha 1; marcador na 2; classe nas linhas 3–10.
    expect(lines[3]).toContain('constructor(nome)')
    expect(lines[6]).toContain('falar()')
    expect(sourceMap.cls).toMatchObject({ file: 'script.js', startLine: 3, endLine: 10 })
    expect(sourceMap.ctor1).toMatchObject({ file: 'script.js', startLine: 4, endLine: 6 })
    expect(sourceMap.sett).toMatchObject({ file: 'script.js', startLine: 5, endLine: 5 })
    expect(sourceMap.met1).toMatchObject({ file: 'script.js', startLine: 7, endLine: 9 })
    expect(sourceMap.log).toMatchObject({ file: 'script.js', startLine: 8, endLine: 8 })
  })

  it('omite ctorId no sourcemap quando o construtor está vazio (sem header gerado)', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          {
            __id: 'cls',
            type: 'classDecl',
            name: 'X',
            ctorParams: [],
            ctorId: 'ghost',
            ctorBody: [],
            methods: [],
          },
        ],
        extensions: [],
      },
    })
    // Sem ctorParams nem ctorBody, o gerador não emite `constructor(...) { ... }`.
    expect(files['script.js']).not.toContain('constructor(')
    expect(sourceMap.ghost).toBeUndefined()
  })
})

describe('source map (declarações CSS por bloco)', () => {
  it('registra uma entrada por sz_css_decl quando __declIds está presente', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [
          {
            __id: 'rule',
            selector: '.box',
            declarations: { background: 'red', padding: '8px' },
            __declIds: { background: 'declBg', padding: 'declPad' },
          },
        ],
        js: [],
        extensions: [],
      },
    })
    const lines = files['style.css'].split('\n')
    // Layout: .box {  / padding: 8px; (sem garantia de ordem? sim, Object.entries preserva inserção)
    expect(lines[0]).toContain('.box {')
    expect(lines[1]).toContain('background: red')
    expect(lines[2]).toContain('padding: 8px')
    expect(sourceMap.rule).toMatchObject({ file: 'style.css', startLine: 1, endLine: 4 })
    expect(sourceMap.declBg).toMatchObject({ file: 'style.css', startLine: 2, endLine: 2 })
    expect(sourceMap.declPad).toMatchObject({ file: 'style.css', startLine: 3, endLine: 3 })
  })

  it('mantém o realce da regra-pai sem declIds (sem novas entradas)', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [{ __id: 'rule2', selector: 'body', declarations: { color: '#fff' } }],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.rule2).toMatchObject({ file: 'style.css', startLine: 1, endLine: 3 })
    // Nenhum id "fantasma" sem origem.
    expect(Object.keys(sourceMap)).toEqual(['rule2'])
  })

  it('regras fundidas com mesmo seletor: cada id realça SÓ suas declarações', () => {
    // Cenário relatado: o parser separou `html, body { width: 100%; margin: 0; ... }`
    // em um `sz_css_width_percent` (regra específica) + uma `sz_css_rule` genérica
    // (margin/padding/etc.). O gerador funde no texto. Sem segmentos, os dois ids
    // apontariam para a faixa toda e clicar em qualquer um realçava a regra inteira.
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [
          { __id: 'widthBlock', selector: 'html, body', declarations: { width: '100%' } },
          {
            __id: 'genericRule',
            selector: 'html, body',
            declarations: { margin: '0', padding: '0', height: '100%' },
            __declIds: { margin: 'dMargin', padding: 'dPadding', height: 'dHeight' },
          },
        ],
        js: [],
        extensions: [],
      },
    })
    const lines = files['style.css'].split('\n')
    // Esperado:
    //  1: html, body {
    //  2:   width: 100%;
    //  3:   margin: 0;
    //  4:   padding: 0;
    //  5:   height: 100%;
    //  6: }
    expect(lines[0]).toContain('html, body')
    expect(lines[1]).toContain('width: 100%')
    expect(lines[4]).toContain('height: 100%')
    // `widthBlock` realça SÓ a linha do width (não a regra inteira).
    expect(sourceMap.widthBlock).toMatchObject({
      file: 'style.css',
      startLine: 2,
      endLine: 2,
    })
    // `genericRule` realça as 3 linhas das suas declarações (margin..height).
    expect(sourceMap.genericRule).toMatchObject({
      file: 'style.css',
      startLine: 3,
      endLine: 5,
    })
    // Cada `sz_css_decl` realça a linha exata.
    expect(sourceMap.dMargin).toMatchObject({ startLine: 3, endLine: 3 })
    expect(sourceMap.dPadding).toMatchObject({ startLine: 4, endLine: 4 })
    expect(sourceMap.dHeight).toMatchObject({ startLine: 5, endLine: 5 })
  })

  it('regra única continua realçando o seletor inteiro', () => {
    // Quando NÃO há fusão (só um CSSRule no IR), o bloco da regra deve cobrir
    // `selector { … }` inteiro — não só as declarações.
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [
          {
            __id: 'only',
            selector: '.card',
            declarations: { padding: '8px', background: '#fff' },
          },
        ],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.only).toMatchObject({ file: 'style.css', startLine: 1, endLine: 4 })
  })

  it('mapeia rawCSS para a faixa do trecho colado no style.css', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [
          {
            __id: 'raw',
            type: 'rawCSS',
            advanced: true,
            code: 'body { font-family: sans-serif; }',
          },
        ],
        js: [],
        extensions: [],
      },
    })
    expect(sourceMap.raw).toMatchObject({ file: 'style.css', startLine: 1, endLine: 1 })
  })
})

describe('source map — placement inline (CSS/JS dentro do index.html)', () => {
  // Regressão: num projeto de arquivo único (CSS/JS embutidos no HTML), o gerador
  // DESCARTAVA as entradas de JS/CSS — selecionar um bloco JS/CSS no modo Ponte
  // não realçava nada (cross.lookupBlock devolvia null). Agora as entradas são
  // remapeadas para o index.html, na linha real do trecho inline.
  it('JS inline (inline-body-end): blocos mapeiam para o index.html na linha real', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          { __id: 'j1', type: 'var', name: 'x', value: { type: 'num', value: 0 } },
          { __id: 'j2', type: 'consoleLog', value: { type: 'str', value: 'oi' } },
        ],
        htmlShell: { jsPlacement: 'inline-body-end' },
        extensions: [],
      },
    })
    // O JS vive embutido no index.html → script.js fica vazio.
    expect(files['script.js']).toBe('')
    expect(files['index.html']).toContain('<script>')
    const htmlLines = files['index.html'].split('\n')
    expect(sourceMap.j1?.file).toBe('index.html')
    expect(sourceMap.j2?.file).toBe('index.html')
    // A linha apontada contém de fato o código gerado do bloco.
    expect(htmlLines[(sourceMap.j1?.startLine ?? 0) - 1]).toContain('let x = 0;')
    expect(htmlLines[(sourceMap.j2?.startLine ?? 0) - 1]).toContain('console.log("oi");')
  })

  it('CSS inline (inline-head): a regra mapeia para o index.html na linha real', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [{ __id: 'c1', selector: '.box', declarations: { background: 'red' } }],
        js: [],
        htmlShell: { cssPlacement: 'inline-head' },
        extensions: [],
      },
    })
    expect(files['style.css']).toBe('')
    expect(files['index.html']).toContain('<style>')
    const htmlLines = files['index.html'].split('\n')
    expect(sourceMap.c1?.file).toBe('index.html')
    // A faixa da regra cobre o seletor + declaração, dentro do index.html.
    expect(htmlLines[(sourceMap.c1?.startLine ?? 0) - 1]).toContain('.box {')
  })

  it('round-trip: reverseSourceMap + findIdAtLine resolve a linha inline para o id', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [
          { __id: 'a', type: 'consoleLog', value: { type: 'num', value: 1 } },
          { __id: 'b', type: 'consoleLog', value: { type: 'num', value: 2 } },
        ],
        htmlShell: { jsPlacement: 'inline-body-end' },
        extensions: [],
      },
    })
    const rev = reverseSourceMap(sourceMap)
    const lineA = sourceMap.a?.startLine ?? 0
    const lineB = sourceMap.b?.startLine ?? 0
    expect(findIdAtLine(rev, 'index.html', lineA)).toBe('a')
    expect(findIdAtLine(rev, 'index.html', lineB)).toBe('b')
  })

  it('placement external segue mapeando para script.js/style.css (sem regressão)', () => {
    const { sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [{ __id: 'c1', selector: 'body', declarations: { color: '#fff' } }],
        js: [{ __id: 'j1', type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
        htmlShell: { cssPlacement: 'external', jsPlacement: 'external' },
        extensions: [],
      },
    })
    expect(sourceMap.j1?.file).toBe('script.js')
    expect(sourceMap.c1?.file).toBe('style.css')
  })

  it('script externo no cabeçalho continua mapeando para script.js', () => {
    const { files, sourceMap } = generateProjectFilesWithMap({
      projectName: 'Test',
      ir: {
        html: [],
        css: [],
        js: [{ __id: 'j1', type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
        htmlShell: { jsPlacement: 'external-head' },
        extensions: [],
      },
    })
    expect(files['script.js']).toContain('console.log("oi");')
    expect(files['index.html'].indexOf('<script src="script.js"></script>')).toBeLessThan(
      files['index.html'].indexOf('<body>'),
    )
    expect(sourceMap.j1?.file).toBe('script.js')
  })
})
