import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
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

describe('media query no round-trip pelos blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('preserva @media (max-width) e as regras internas', () => {
    const css = `.menu {
  display: flex;
}

@media (max-width: 768px) {
  .menu {
    display: none;
  }
}`
    const out = bridgeCss(css)

    expect(out).toContain('@media (max-width: 768px) {')
    // Regra interna preservada e indentada dentro do bloco @media.
    expect(out).toMatch(
      /@media \(max-width: 768px\) \{[\s\S]*\.menu \{[\s\S]*display: none;[\s\S]*\}\s*\}/,
    )
    // Regra de fora segue intacta.
    expect(out).toContain('display: flex;')
    // Um único bloco @media (não duplica).
    expect((out.match(/@media/g) ?? []).length).toBe(1)
  })

  it('preserva @media (min-width)', () => {
    const out = bridgeCss('@media (min-width: 1024px) {\n  .grid {\n    gap: 24px;\n  }\n}')
    expect(out).toContain('@media (min-width: 1024px) {')
    expect(out).toContain('gap: 24px;')
  })

  it('mantém condição fora do formato como CSS avançado (verbatim)', () => {
    const out = bridgeCss('@media (orientation: landscape) {\n  body {\n    color: red;\n  }\n}')
    expect(out).toContain('@media (orientation: landscape)')
    expect(out).toContain('color: red')
  })
})
