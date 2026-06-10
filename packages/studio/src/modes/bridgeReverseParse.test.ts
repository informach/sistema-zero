import { describe, expect, it } from 'bun:test'
import type { GeneratedFiles } from '#generators'
import { generateProjectFilesWithMap } from '#generators'
import type { SZIR } from '#ir'
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
})
