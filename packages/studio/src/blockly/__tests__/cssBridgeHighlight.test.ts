import * as Blockly from 'blockly/core'
import { buildCssSourceMapFromText, findIdAtLine, reverseSourceMap } from '#generators'
import { parseProjectFiles } from '#parsers'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** Reverse-parse pelo round-trip dos blocos: código → IR (com __id/__declIds). */
function irFromCss(css: string) {
  const ir1 = parseProjectFiles({ 'index.html': '<h1>x</h1>', 'style.css': css, 'script.js': '' })
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  ws.dispose()
  return ir2
}

describe('realce bloco↔código do CSS pela posição no texto exibido (modo Ponte)', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('seletor multilinha: clicar `margin` realça `margin` (e não `width`)', () => {
    // O IR vem do CSS canônico (seletor em 1 linha); o aluno, porém, escreveu o
    // seletor em DUAS linhas. É o cenário exato reportado: o sourcemap canônico
    // ficaria deslocado +1 e clicar `margin` realçava `width`.
    const canonical = [
      'html, body {',
      '  width: 100%;',
      '  margin: 0;',
      '  padding: 0;',
      '  height: 100%;',
      '  line-height: 1.5;',
      '  background: #000;',
      '}',
    ].join('\n')
    const displayed = [
      'html,', // 1
      'body {', // 2
      '  width: 100%;', // 3
      '  margin: 0;', // 4
      '  padding: 0;', // 5
      '  height: 100%;', // 6
      '  line-height: 1.5;', // 7
      '  background: #000;', // 8
      '}', // 9
    ].join('\n')

    const ir = irFromCss(canonical)
    const rules = ir.css.filter(
      (
        e,
      ): e is {
        selector: string
        declarations: Record<string, string>
        __id?: string
        __declIds?: Record<string, string>
      } => !('type' in e) && (e as { selector?: string }).selector === 'html, body',
    )
    const widthRule = rules.find((r) => 'width' in r.declarations)
    const genericRule = rules.find((r) => !('width' in r.declarations))
    const widthId = widthRule?.__id
    const marginId = genericRule?.__declIds?.margin
    if (!widthId || !marginId) throw new Error('faltam ids no IR do round-trip')

    const map = buildCssSourceMapFromText(displayed, ir.css, 'style.css')

    // bloco da largura → linha do `width: 100%` (linha 3 no texto exibido)
    expect(map[widthId]).toMatchObject({ file: 'style.css', startLine: 3, endLine: 3 })
    // bloco da margem → linha do `margin: 0` (linha 4) — NÃO a do width
    expect(map[marginId]).toMatchObject({ startLine: 4, endLine: 4 })
    expect(map[marginId]?.startLine).not.toBe(3)

    // direção inversa: cursor na linha do margin seleciona o bloco do margin
    const rev = reverseSourceMap(map)
    expect(findIdAtLine(rev, 'style.css', 4)).toBe(marginId)
  })
})
