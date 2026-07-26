import { behaviorStatements, normalizeSZIR } from './behavior'
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
 * Lista TODOS os corpos (sub-listas de statements) de um statement. A versão
 * antiga de {@link countAdvancedJS} só descia em `if/repeat/event/animationLoop/
 * g2d:updateEachFrame`, então um trecho `rawJS` aninhado dentro de `while`,
 * `funcDecl`, `forEach`, `tryCatch`, `classDecl` etc. NÃO era contado — o aviso
 * "N trechos viraram Código avançado" subnotificava e furava a garantia de que
 * "código é sagrado". Este walk é EXAUSTIVO sobre todas as variantes que
 * carregam corpo (espelha o walk de statements do `generators/js.ts`); variantes
 * sem corpo devolvem `[]`. Ao evoluir o schema com um novo statement-bloco,
 * adicione o(s) corpo(s) dele aqui.
 */
function childStatementBodies(stmt: JSStatement): JSStatement[][] {
  switch (stmt.type) {
    case 'if':
      return [stmt.then, stmt.else ?? []]
    case 'repeat':
    case 'while':
    case 'doWhile':
    case 'forOf':
    case 'forRange':
    case 'event':
    case 'animationLoop':
    case 'g2d:onStart':
    case 'g2d:updateEachFrame':
    case 'g2d:onPointer':
    case 'g2d:onKey':
    case 'g2d:onOverlap':
    case 'g2d:forEachInGroup':
    case 'g2d:pruneOffscreen':
    case 'g2d:onGroupOverlap':
    case 'g2d:onSpriteGroupOverlap':
    case 'g2d:onEnemyDefeated':
    case 'g2d:onEnemyShotHit':
    case 'g2d:defineShape':
    case 'g2d:everyFrames':
    case 'g2d:everySeconds':
    case 'g2d:afterSeconds':
    case 'g3d:animate':
    case 'g3d:everyFrames':
    case 'g3d:everySeconds':
    case 'g3d:forEachInGroup':
    case 'g3d:pruneOffscreen':
    case 'gk:addButton':
    case 'gk:onEnterState':
    case 'gk:onUpdate':
    case 'gk:onDraw':
    case 'gk:onEvent':
    case 'gk:onDrawHud':
    case 'gk:onGameClick':
    case 'gk:rpgOnTalk':
    case 'gk:rpgCreateMap':
    case 'gk:rpgOnEnterMap':
    case 'gk:rpgOnBattleEnd':
    case 'gk:rpgCutscene':
    case 'gk:rpgOnStep':
    case 'gk:rpgMenu':
    case 'gk:rpgOption':
    case 'gk:forEachActive':
    case 'gk:defineLook':
    case 'g3k:defineMold':
    case 'g3k:forEachAlive':
    case 'g3k:onUpdate':
    case 'g3k:onEnterEntityState':
    case 'g3k:onEntityStateUpdate':
    case 'g3k:onExitEntityState':
    case 'g3k:forEachNear':
    case 'g3k:onEntityDeath':
    case 'g3k:addButton':
    case 'g3k:onEnterState':
    case 'g3k:onEvent':
    case 'funcDecl':
    case 'forEach':
    case 'setTimeout':
    case 'setInterval':
      return [stmt.body]
    case 'tryCatch':
      return [stmt.body, stmt.handler, stmt.finalizer ?? []]
    case 'fetchJson':
      return [stmt.body, stmt.catchBody ?? []]
    case 'classDecl':
      return [stmt.ctorBody, ...stmt.methods.map((m) => m.body)]
    default:
      return []
  }
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
