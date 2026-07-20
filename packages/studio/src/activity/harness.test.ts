import { describe, expect, it } from 'bun:test'
import type { SandboxCheck } from './harness'
import { buildCheckHarness } from './harness'

const CHECKS: SandboxCheck[] = [
  { id: 'c1', label: 'loga oi', kind: 'behavior', rule: { type: 'consoleContains', text: 'oi' } },
  {
    id: 'c2',
    label: 'soma',
    kind: 'testcase',
    functionName: 'somar',
    cases: [{ args: [2, 3], expected: 5 }],
  },
  { id: 'c3', label: 'tem título', kind: 'code', source: 'return !!ctx.doc.querySelector("h1");' },
]

describe('buildCheckHarness', () => {
  it('gera JS SINTATICAMENTE válido (compila via new Function)', () => {
    const code = buildCheckHarness(CHECKS, { parentOrigin: 'https://x.test' })
    // new Function compila (lança em erro de sintaxe) sem executar.
    expect(() => new Function(code)).not.toThrow()
  })

  it('embute as checagens como JSON parseado (sem injeção) e o canal checkResult', () => {
    const code = buildCheckHarness(CHECKS)
    expect(code).toContain('JSON.parse(')
    expect(code).toContain("kind: 'checkResult'")
    // o source do code-check entra como STRING (literal JSON), não concatenado.
    expect(code).toContain('querySelector')
  })

  it('neutraliza fechamento de script no payload', () => {
    const evil: SandboxCheck[] = [
      { id: 'x', label: 'x', kind: 'code', source: '</script><script>alert(1)</script>' },
    ]
    const code = buildCheckHarness(evil)
    expect(code).not.toContain('</script>')
  })

  it('NÃO usa eval/new Function (a CSP do preview bloqueia unsafe-eval)', () => {
    // Regressão do 6º review: runCode usava `new Function('ctx', source)`, que a
    // CSP (script-src sem 'unsafe-eval') BLOQUEIA → toda checagem `code` morria.
    const code = buildCheckHarness(CHECKS)
    expect(code).not.toContain('new Function(')
    expect(code).not.toMatch(/\beval\s*\(/)
  })

  it('roda code/leitura de globais via <script> inline injetado', () => {
    // O nonce do harness autentica o <script> interno sem liberar unsafe-inline.
    const code = buildCheckHarness(CHECKS)
    expect(code).toContain("createElement('script')")
    expect(code).toContain('.textContent')
    expect(code).toContain('s.nonce = SCRIPT_NONCE')
    expect(code).toContain('readGlobal') // window-first + fallback léxico
  })
})
