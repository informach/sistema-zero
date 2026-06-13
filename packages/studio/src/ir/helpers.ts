import type { CSSEntry, HTMLNode, JSExpr, JSStatement, SZIR } from './schema'

export const EMPTY_IR: SZIR = { html: [], css: [], js: [], extensions: [] }

export function num(value: number): JSExpr {
  return { type: 'num', value }
}

export function str(value: string): JSExpr {
  return { type: 'str', value }
}

export function variable(name: string): JSExpr {
  return { type: 'var', name }
}

export function bool(value: boolean): JSExpr {
  return { type: 'bool', value }
}

export function deepEqualIR(a: SZIR | null, b: SZIR | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Igualdade ESTRUTURAL para fins de blocos: compara `html`/`css`/`js`/`extensions`
 * ignorando os campos só-de-source-map (`__id`, `ctorId`, `__declIds`) e a casca
 * (`htmlShell`). A Ponte usa isso para decidir se uma reparse mexeu em algo que os
 * blocos representam — mudanças só na casca (ex.: espaços no `<head>`) ou nos ids
 * NÃO devem reconstruir/colapsar o workspace. `ctorId` (no classDecl) e `__declIds`
 * (na CSSRule) só são setados pelo buildIR — os reverse parsers nunca os emitem —,
 * então mantê-los na comparação faria qualquer projeto com classe JS ou declaração
 * CSS cair em rebuild total a cada edição cosmética do código.
 */
export function irBlockStructureEqual(a: SZIR, b: SZIR): boolean {
  const norm = (ir: SZIR): string =>
    JSON.stringify(
      { html: ir.html, css: ir.css, js: ir.js, extensions: ir.extensions },
      (key, value) =>
        key === '__id' || key === 'ctorId' || key === '__declIds' ? undefined : value,
    )
  return norm(a) === norm(b)
}

// ---------- Contagem de "Código avançado" ----------
// Análise pura da IR (sem parsing). Vive aqui — e não em #parsers — para que
// a UI (ex.: aviso de degradação) possa contar trechos avançados sem arrastar o
// parser/Babel para os modos Blocos/Ponte.

/** Total de nós/trechos com `advanced: true` em toda a IR. */
export function countAdvancedIR(ir: SZIR): number {
  return countAdvancedHTML(ir.html) + countAdvancedCSS(ir.css) + countAdvancedJS(ir.js)
}

export function countAdvancedHTML(nodes: HTMLNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === 'rawHTML') return total + 1
    if (node.type === 'element') return total + countAdvancedHTML(node.children ?? [])
    return total
  }, 0)
}

export function countAdvancedCSS(entries: CSSEntry[]): number {
  return entries.filter((entry) => 'type' in entry && entry.type === 'rawCSS').length
}

export function countAdvancedJS(statements: JSStatement[]): number {
  return statements.reduce((total, statement) => {
    if (statement.type === 'rawJS') return total + 1
    if (statement.type === 'if') {
      return total + countAdvancedJS(statement.then) + countAdvancedJS(statement.else ?? [])
    }
    if (statement.type === 'repeat') return total + countAdvancedJS(statement.body)
    if (statement.type === 'event') return total + countAdvancedJS(statement.body)
    if (statement.type === 'animationLoop') return total + countAdvancedJS(statement.body)
    if (statement.type === 'g2d:updateEachFrame') return total + countAdvancedJS(statement.body)
    return total
  }, 0)
}
