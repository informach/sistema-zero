import { describe, expect, it } from 'bun:test'
import type { GeneratedFiles } from '#generators'
import { generateProjectFilesWithMap } from '#generators'
import { deepEqualIR, type SZIR } from '#ir'
import { extractInlineAssets } from '#parsers'
import { type BridgeReverseParseInput, runBridgeReverseParse } from './bridgeReverseParse'

/** Monta o input da Ponte como a main thread faz: extrai assets inline do HTML. */
function inputFromFiles(
  files: GeneratedFiles,
  rest: Pick<BridgeReverseParseInput, 'ir' | 'projectName' | 'installedExtensionIds'>,
): BridgeReverseParseInput {
  const assets = extractInlineAssets(files['index.html'], files['style.css'], files['script.js'])
  return {
    files,
    html: assets.html,
    htmlShell: assets.htmlShell,
    cssSource: assets.cssSource,
    jsSource: assets.jsSource,
    ...rest,
  }
}

describe('runBridgeReverseParse', () => {
  it('devolve source map sem reparsar quando os arquivos ja vieram da IR atual', () => {
    const ir: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Oi', __id: 'title' }],
      css: [],
      js: [],
      extensions: [],
    }
    const generated = generateProjectFilesWithMap({
      ir,
      projectName: 'Projeto',
      jsHeader: '// Gerado pelo Sistema Zero Studio',
    })
    const result = runBridgeReverseParse(
      inputFromFiles(generated.files, { ir, projectName: 'Projeto', installedExtensionIds: [] }),
    )

    if (result.kind !== 'generated-match') {
      throw new Error(`Resultado inesperado: ${result.kind}`)
    }
    expect(result.diagnostics).toEqual([])
    expect(result.sourceMap.title?.file).toBe('index.html')
  })

  it('múltiplas pilhas JS (vários statements) batem com a IR → generated-match, sem reconstruir blocos', () => {
    // Duas "colunas"/pilhas de JS viram dois statements no ir.js (em ordem de
    // leitura). Como o IR gera exatamente os arquivos, a Ponte não reparseia nem
    // reconstrói o workspace — o arranjo do aluno é preservado.
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [],
      js: [
        { type: 'rawJS', code: 'console.log("a");', advanced: true, __id: 'j1' },
        { type: 'rawJS', code: 'console.log("b");', advanced: true, __id: 'j2' },
      ],
    }
    const generated = generateProjectFilesWithMap({
      ir,
      projectName: 'Projeto',
      jsHeader: '// Gerado pelo Sistema Zero Studio',
    })
    // Ordem preservada no código gerado.
    expect(generated.files['script.js'].indexOf('"a"')).toBeLessThan(
      generated.files['script.js'].indexOf('"b"'),
    )

    const result = runBridgeReverseParse(
      inputFromFiles(generated.files, { ir, projectName: 'Projeto', installedExtensionIds: [] }),
    )
    expect(result.kind).toBe('generated-match')
  })

  it('reparseia arquivos editados e preserva extensoes instaladas', () => {
    const files = {
      'index.html': '<button id="play">Play</button>',
      'style.css': '#play { color: red; }',
      'script.js': 'console.log("ok");',
    }
    const result = runBridgeReverseParse(
      inputFromFiles(files, {
        ir: null,
        projectName: 'Projeto',
        installedExtensionIds: ['game-2d', 'game-2d'],
      }),
    )

    expect(result.kind).toBe('parsed')
    if (result.kind !== 'parsed') return
    expect(result.ir?.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(result.sourceMap).not.toBeNull()
    expect(result.diagnostics.some((diagnostic) => diagnostic.kind === 'syntaxError')).toBe(false)
  })

  it('arquivos editados produzem IR NOVO e distinto da IR atual (não pode ser dropado)', () => {
    // Contrato do handler PERSISTENTE da Ponte: quando o aluno edita o texto, o
    // worker devolve `kind: parsed` com um `ir` DIFERENTE do `ir` em vigor. Esse
    // é exatamente o resultado que o handler antigo dropava quando uma edição de
    // bloco re-rodava o efeito no meio do parse (ele nulava o onmessage). Aqui
    // garantimos que o resultado carrega um IR aplicável e distinto.
    const baseIr: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Oi', __id: 'title' }],
      css: [],
      js: [],
      extensions: [],
    }
    const editedFiles: GeneratedFiles = {
      'index.html': '<h1>Oi</h1><p>Novo parágrafo</p>',
      'style.css': '',
      'script.js': '',
    }
    const result = runBridgeReverseParse(
      inputFromFiles(editedFiles, {
        ir: baseIr,
        projectName: 'Projeto',
        installedExtensionIds: [],
      }),
    )

    expect(result.kind).toBe('parsed')
    if (result.kind !== 'parsed') return
    expect(result.ir).not.toBeNull()
    // O resultado precisa ser distinto da IR vigente — senão o handler o ignora.
    expect(deepEqualIR(result.ir, baseIr)).toBe(false)
  })

  it('rejeita IR semanticamente inválida e mantém os blocos anteriores como fonte válida', () => {
    const files: GeneratedFiles = {
      'index.html': '',
      'style.css': '',
      'script.js': `// Meus moldes
let dificuldade = base + 1;
// Ao iniciar
let base = 2;
// Quando acontecer
// Enquanto estiver rodando`,
    }

    const result = runBridgeReverseParse(
      inputFromFiles(files, {
        ir: null,
        projectName: 'Projeto inválido',
        installedExtensionIds: [],
      }),
    )

    expect(result.kind).toBe('parsed')
    if (result.kind !== 'parsed') return
    expect(result.ir).toBeNull()
    expect(result.sourceMap).toBeNull()
    expect(result.diagnostics.some((diagnostic) => diagnostic.kind === 'semanticError')).toBe(true)
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.message.includes('base') &&
          diagnostic.message.includes('ainda não foi declarada'),
      ),
    ).toBe(true)
  })
})
