import * as Blockly from 'blockly/core'
import { generateProjectFiles, generateProjectFilesWithMap } from '#generators'
import { parseProjectFiles } from '#parsers'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** Ciclo da Ponte: código → IR → blocos → Blockly → IR → código. */
function bridgeCss(css: string): string {
  const ir1 = parseProjectFiles({ 'index.html': '<h1>x</h1>', 'style.css': css, 'script.js': '' })
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return generateProjectFiles({ ir: ir2, projectName: 'X' })['style.css']
}

/** Igual ao `bridgeCss`, mas devolve também o IR final e o sourcemap. */
function bridgeCssWithMap(css: string) {
  const ir1 = parseProjectFiles({ 'index.html': '<h1>x</h1>', 'style.css': css, 'script.js': '' })
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  const { files, sourceMap } = generateProjectFilesWithMap({ ir: ir2, projectName: 'X' })
  return { ir: ir2, files, sourceMap, workspace: ws }
}

describe('fidelidade do CSS no round-trip pelos blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('não corrompe unidades, shorthand, cores nem agrupa errado (CSS do jogo da memória)', () => {
    const css = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  background: linear-gradient(135deg, #eef2ff, #dbeafe);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: #1e293b;
}
.container {
  text-align: center;
  background: white;
  padding: 25px;
  border-radius: 20px;
  width: 500px;
  max-width: 95%;
}
.card-face {
  width: 100%;
  height: 100%;
}
button {
  padding: 12px 20px;
}`
    const out = bridgeCss(css)

    // Unidades preservadas (sem %→px nem truncar shorthand).
    expect(out).toContain('max-width: 95%')
    expect(out).toContain('height: 100%')
    expect(out).toContain('padding: 12px 20px')
    expect(out).not.toMatch(/max-width:\s*95px/)
    expect(out).not.toMatch(/height:\s*100px/)

    // Valores verbatim preservados (sem normalizar cor nem inventar unidade).
    expect(out).toContain('box-sizing: border-box')
    expect(out).toContain('background: white')
    expect(out).toContain('margin: 0;')
    expect(out).not.toMatch(/margin:\s*0px/)

    // Agrupado: cada seletor aparece uma única vez.
    expect((out.match(/\.container\s*\{/g) ?? []).length).toBe(1)
    expect((out.match(/\.card-face\s*\{/g) ?? []).length).toBe(1)

    // body NÃO ganha propriedades inventadas pelo bloco de centralização.
    const bodyBlock = out.slice(out.indexOf('body {'), out.indexOf('}', out.indexOf('body {')))
    expect(bodyBlock).not.toContain('flex-direction: column')
    expect(bodyBlock).not.toMatch(/\bmargin:/)
    expect(bodyBlock).toContain('min-height: 100vh')
  })

  it('promove para bloco amigável quando é sem perda (px e hex canônico)', () => {
    const out = bridgeCss('.box {\n  width: 200px;\n  color: #3b82f6;\n}')
    expect(out).toContain('width: 200px')
    expect(out).toContain('color: #3b82f6')
    expect((out.match(/\.box\s*\{/g) ?? []).length).toBe(1)
  })

  it('mantém fallbacks repetidos ao atravessar código, blocos e código', () => {
    const css = '.caixa {\n  display: flex;\n  display: grid;\n}'
    expect(bridgeCss(css).trim()).toBe(css)
  })

  // Cenário reportado pelo aluno: CSS com width em % (vira `sz_css_width_percent`)
  // + outras propriedades sem bloco amigável (caem num `sz_css_rule` genérico).
  // O gerador FUNDE as duas regras (mesmo seletor) no texto final; cada bloco
  // deve realçar SÓ a faixa que ele de fato contribuiu.
  it('width em % + rule genérica de mesmo seletor → cada bloco realça só sua parte', () => {
    const css = `html, body {
  width: 100%;
  margin: 0;
  padding: 0;
  height: 100%;
  line-height: 1.5;
  background: #000;
}`
    const { sourceMap, files, ir, workspace } = bridgeCssWithMap(css)

    // O reverse-parse deve ter produzido duas CSSRules separadas no IR.
    const rules = ir.css.filter(
      (e): e is { selector: string; declarations: Record<string, string>; __id?: string } =>
        !('type' in e) && (e as { selector: string }).selector === 'html, body',
    )
    expect(rules.length).toBe(2)
    const widthRule = rules.find((r) => 'width' in r.declarations)
    const genericRule = rules.find((r) => !('width' in r.declarations))
    expect(widthRule?.declarations).toEqual({ width: '100%' })
    expect(Object.keys(genericRule?.declarations ?? {})).toEqual([
      'margin',
      'padding',
      'height',
      'line-height',
      'background',
    ])

    // O CSS gerado funde tudo num único bloco visual (sem duplicar o seletor).
    const lines = files['style.css'].split('\n')
    expect(lines[0]).toBe('html, body {')
    expect(lines[1]).toBe('  width: 100%;')
    expect(lines[2]).toBe('  margin: 0;')
    expect(lines[3]).toBe('  padding: 0;')
    expect(lines[4]).toBe('  height: 100%;')
    expect(lines[5]).toBe('  line-height: 1.5;')
    expect(lines[6]).toBe('  background: #000;')
    expect(lines[7]).toBe('}')

    // Cada bloco no canvas tem um id; o sourcemap deve mapear corretamente.
    const widthBlockId = widthRule?.__id
    const genericBlockId = genericRule?.__id
    if (!widthBlockId || !genericBlockId) throw new Error('faltam ids no IR')

    // O bloco `sz_css_width_percent` realça EXATAMENTE a linha do `width: 100%`.
    expect(sourceMap[widthBlockId]).toMatchObject({
      file: 'style.css',
      startLine: 2,
      endLine: 2,
    })
    // O bloco `sz_css_rule` genérico realça SÓ a faixa de margin..background.
    expect(sourceMap[genericBlockId]).toMatchObject({
      file: 'style.css',
      startLine: 3,
      endLine: 7,
    })

    // Cada `sz_css_decl` aninhado dentro da regra genérica realça SUA linha.
    // Os ids vivem no `__declIds` do IR; encontramos pelo block.id no workspace.
    const declIds = (genericRule as unknown as { __declIds?: Record<string, string> }).__declIds
    if (!declIds) throw new Error('faltam __declIds no IR')
    const { margin, padding, height, background } = declIds
    const lineHeight = declIds['line-height']
    if (!margin || !padding || !height || !lineHeight || !background) {
      throw new Error('faltam __declIds no IR')
    }
    expect(sourceMap[margin]).toMatchObject({ startLine: 3, endLine: 3 })
    expect(sourceMap[padding]).toMatchObject({ startLine: 4, endLine: 4 })
    expect(sourceMap[height]).toMatchObject({ startLine: 5, endLine: 5 })
    expect(sourceMap[lineHeight]).toMatchObject({ startLine: 6, endLine: 6 })
    expect(sourceMap[background]).toMatchObject({ startLine: 7, endLine: 7 })

    workspace.dispose()
  })
})
