import { type ParserOptions, parse } from '@babel/parser'

/**
 * Guarda contra loops síncronos que travam a aba (Camada A do endurecimento do
 * preview). Instrumenta o código do aluno injetando uma chamada
 * `__szLoopTick()` no início do corpo de cada `for`/`while`/`do-while`/
 * `for-of`/`for-in`. O runtime (`buildLoopGuardRuntime`) mantém um orçamento de
 * tempo CONTÍNUO que reseta a cada macrotask — assim um game loop legítimo
 * (`requestAnimationFrame`/`setInterval`, que cedem o thread) NUNCA é
 * interrompido, mas um `while (true) {}` síncrono é cortado após o orçamento.
 *
 * Regras de ouro:
 * - Só roda no caminho de PREVIEW; o código exibido no Monaco e persistido
 *   NUNCA é instrumentado (preservaria o sourceMap/realce). A injeção é inline
 *   (sem novas quebras de linha), então os números de linha são preservados.
 * - Degrada com elegância: se o parse falhar, devolve o código original — a
 *   guarda jamais pode quebrar o preview.
 * - NÃO instrumenta `requestAnimationFrame`/`setInterval` (não são loops no AST)
 *   nem os `bootstrapScript` de extensões (código 1st-party auditado).
 */

const BABEL_OPTS: ParserOptions = {
  sourceType: 'module',
  errorRecovery: true,
  plugins: [],
}

/** Orçamento default de tempo SÍNCRONO contínuo de um loop antes de cortar. */
export const DEFAULT_LOOP_BUDGET_MS = 4_000
/** Timeout default do watchdog de heartbeat (Camada B) no PreviewIframe. */
export const DEFAULT_HEARTBEAT_TIMEOUT_MS = 6_000

const LOOP_TYPES: ReadonlySet<string> = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
])

// Chaves de nós Babel que não contêm AST filho (evita percorrer comentários,
// posições e metadados à toa).
const SKIP_KEYS: ReadonlySet<string> = new Set([
  'loc',
  'start',
  'end',
  'range',
  'extra',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'comments',
  'tokens',
  'errors',
])

const TICK = '__szLoopTick();'

interface LoopBody {
  type?: string
  start?: number
  end?: number
}

/**
 * Instrumenta os loops do código. Retorna o código original (sem alteração)
 * quando não há loops, quando o parse falha ou quando há erros recuperáveis.
 */
export function instrumentLoops(code: string): string {
  if (!code.trim()) return code
  // Atalho de desempenho: sem palavra-chave de loop, não há o que instrumentar.
  if (!/\b(?:for|while)\b/.test(code)) return code

  let ast: ReturnType<typeof parse>
  try {
    ast = parse(code, BABEL_OPTS)
  } catch {
    return code
  }
  const errors = (ast as { errors?: unknown[] }).errors ?? []
  if (errors.length > 0) return code

  const edits: Array<{ pos: number; text: string }> = []
  walk(ast.program, (node) => {
    const type = (node as { type?: string }).type
    if (!type || !LOOP_TYPES.has(type)) return
    const body = (node as { body?: LoopBody }).body
    if (!body || typeof body.start !== 'number' || typeof body.end !== 'number') return
    if (body.type === 'BlockStatement') {
      // Logo após a `{`.
      edits.push({ pos: body.start + 1, text: TICK })
    } else {
      // Corpo de uma instrução só (ex.: `while (c) faz()`): embrulha em bloco.
      edits.push({ pos: body.start, text: `{${TICK}` })
      edits.push({ pos: body.end, text: '}' })
    }
  })
  if (edits.length === 0) return code

  // Aplica do fim para o começo para os offsets continuarem válidos. O sort é
  // estável (ES2019+); empates de posição preservam a ordem de descoberta
  // (pré-ordem = pai antes do filho), o que aninha os fechamentos corretamente.
  edits.sort((a, b) => b.pos - a.pos)
  let out = code
  for (const edit of edits) {
    out = out.slice(0, edit.pos) + edit.text + out.slice(edit.pos)
  }
  return out
}

function walk(node: unknown, visit: (node: object) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if (!node || typeof node !== 'object') return
  if (typeof (node as { type?: unknown }).type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue
    walk((node as Record<string, unknown>)[key], visit)
  }
}

/**
 * Runtime injetado no `<head>` do iframe (antes do código do aluno) que define
 * `window.__szLoopTick`. Usa um orçamento de tempo contínuo que reseta entre
 * macrotasks via um "pump" de `setTimeout(0)` capturado pristino — durante um
 * loop síncrono longo o pump não roda, o orçamento estoura e a checagem lança um
 * `Error` marcado com `__szLoopGuard` (o interceptor traduz para 'loopStopped').
 */
export function buildLoopGuardRuntime(budgetMs: number = DEFAULT_LOOP_BUDGET_MS): string {
  const budget = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : DEFAULT_LOOP_BUDGET_MS
  return `(function () {
  var BUDGET = ${JSON.stringify(budget)};
  var start = null;
  var schedule = (typeof window !== 'undefined' && window.setTimeout)
    ? window.setTimeout.bind(window)
    : setTimeout;
  function reset() { start = null; try { schedule(reset, 0); } catch (e) {} }
  try { schedule(reset, 0); } catch (e) {}
  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }
  window.__szLoopTick = function () {
    var t = now();
    if (start === null) { start = t; return; }
    if (t - start > BUDGET) {
      start = null;
      var e = new Error('O código ficou preso em um laço por tempo demais e foi interrompido. Verifique se a condição do laço (loop) realmente chega ao fim.');
      e.__szLoopGuard = true;
      throw e;
    }
  };
})();`
}
