import { behaviorStatements, normalizeSZIR } from './behavior'
import { programmingChildBodyEntries } from './programmingExecution'
import type { CSSEntry, HTMLNode, JSExpr, JSStatement, SZIR, SZIRInput } from './schema'

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

// NOTA: `deepEqualIR` e `irBlockStructureEqual` comparam via `JSON.stringify`,
// que serializa as chaves na ORDEM DE INSERÇÃO. Por isso ambas dependem do IR
// ser CANÔNICO — ou seja, todos os produtores (buildIR a partir dos blocos e os
// reverse parsers a partir do código) precisam montar cada objeto com as chaves
// na MESMA ordem. Dois IRs estruturalmente idênticos mas com chaves inseridas em
// ordens diferentes serializam para strings distintas e seriam tidos como
// diferentes aqui. Mantenha a ordem de inserção dos campos consistente entre os
// geradores ao evoluir o schema (sem isso, a Ponte cairia em rebuild a cada
// reparse). Sem mudança de comportamento — apenas documentação do contrato.
export function deepEqualIR(a: SZIRInput | null, b: SZIRInput | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return JSON.stringify(normalizeSZIR(a)) === JSON.stringify(normalizeSZIR(b))
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
export function irBlockStructureEqual(a: SZIRInput, b: SZIRInput): boolean {
  const norm = (input: SZIRInput): string => {
    const ir = normalizeSZIR(input)
    return JSON.stringify(
      { html: ir.html, css: ir.css, behavior: ir.behavior, extensions: ir.extensions },
      (key, value) =>
        key === '__id' || key === 'ctorId' || key === '__declIds' ? undefined : value,
    )
  }
  return norm(a) === norm(b)
}

// ---------- Contagem de "Código avançado" ----------
// Análise pura da IR (sem parsing). Vive aqui — e não em #parsers — para que
// a UI (ex.: aviso de degradação) possa contar trechos avançados sem arrastar o
// parser/Babel para os modos Blocos/Ponte.

/** Total de nós/trechos com `advanced: true` em toda a IR. */
export function countAdvancedIR(input: SZIRInput): number {
  const ir = normalizeSZIR(input)
  return (
    countAdvancedHTML(ir.html) + countAdvancedCSS(ir.css) + countAdvancedJS(behaviorStatements(ir))
  )
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

/**
 * Lista TODOS os corpos (sub-listas de statements) de um statement pela MESMA travessia do
 * ciclo de vida (`programmingChildBodyEntries`, que lê as chaves de corpo de qualquer nó). A
 * lista escrita à mão que morava aqui esquecia os corpos novos (o `onGame` e o `onStage` do
 * Jogo 3D, o "Depois de N s", o "para cada batida"), e o `rawJS` de dentro deles sumia do
 * aviso "N trechos viraram Código avançado".
 */
function childStatementBodies(stmt: JSStatement): JSStatement[][] {
  return programmingChildBodyEntries(stmt).map((entry) => entry.body)
}

export function countAdvancedJS(statements: JSStatement[]): number {
  return statements.reduce((total, statement) => {
    const here = statement.type === 'rawJS' ? 1 : 0
    const nested = childStatementBodies(statement).reduce(
      (sum, body) => sum + countAdvancedJS(body),
      0,
    )
    return total + here + nested
  }, 0)
}
