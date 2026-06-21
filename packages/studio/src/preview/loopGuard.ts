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

// Parse em modo CLÁSSICO (script) primeiro: `sourceType:'module'` é SEMPRE strict,
// então construções legais num script clássico — `with (o) {}` e `return` no topo —
// viram ERROS recuperáveis e, antes, faziam o arquivo inteiro sair sem
// instrumentação (os loops rodavam sem guarda). 'script' não é strict e aceita
// essas construções. Caímos para 'module' só se o parse clássico LANÇAR de vez
// (ex.: o código usa import/export de topo, que só é válido em módulo).
const BABEL_OPTS_SCRIPT: ParserOptions = {
  sourceType: 'script',
  errorRecovery: true,
  plugins: [],
}
const BABEL_OPTS_MODULE: ParserOptions = {
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
 * quando não há loops ou quando o parse falha de vez (sem corpo de programa
 * utilizável). Erros recuperáveis do Babel (ex.: `with`/`return` de topo num
 * script clássico) NÃO impedem a instrumentação — os loops encontrados no AST
 * recuperado ainda recebem a guarda.
 */
export function instrumentLoops(code: string): string {
  if (!code.trim()) return code
  // Atalho de desempenho: sem palavra-chave de loop, não há o que instrumentar.
  if (!/\b(?:for|while)\b/.test(code)) return code

  let ast: ReturnType<typeof parse>
  try {
    ast = parse(code, BABEL_OPTS_SCRIPT)
  } catch {
    // Parse clássico LANÇOU (não foi só erro recuperável): provavelmente é um
    // módulo de verdade (import/export no topo). Tenta como módulo.
    try {
      ast = parse(code, BABEL_OPTS_MODULE)
    } catch {
      // Parse falhou totalmente nos dois modos → devolve o original intacto. A
      // guarda jamais pode quebrar o preview.
      return code
    }
  }
  // NÃO bailamos só porque `errors.length > 0`: com errorRecovery o Babel ainda
  // produz um `program`/`body` utilizável mesmo registrando erros recuperáveis
  // (ex.: construções clássicas no modo errado). Só desistimos se NÃO há um corpo
  // de programa para instrumentar — aí não há loop algum a alcançar de qualquer
  // forma. Instrumentamos os loops que o AST recuperado expõe.
  const body = (ast.program as { body?: unknown[] } | undefined)?.body
  if (!ast.program || !Array.isArray(body)) return code

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
 *
 * A função do tick é DECLARADA com nome (hoisted) e TRAVADA em `window` via
 * `Object.defineProperty` com `writable:false`/`configurable:false`: o código
 * do aluno (de propósito ou por colisão de nome) NÃO pode reatribuir
 * `window.__szLoopTick` para desligar o orçamento e travar a aba com um
 * `while (true) {}`. O `try/catch` degrada para a atribuição simples caso o
 * `defineProperty` falhe (ambiente exótico) — a guarda nunca pode quebrar o
 * preview.
 */
export function buildLoopGuardRuntime(budgetMs: number = DEFAULT_LOOP_BUDGET_MS): string {
  const budget = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : DEFAULT_LOOP_BUDGET_MS
  return `(function () {
  var BUDGET = ${JSON.stringify(budget)};
  var start = null;
  var schedule = (typeof window !== 'undefined' && window.setTimeout)
    ? window.setTimeout.bind(window)
    : setTimeout;
  // O orçamento RESETA a cada macrotask (o pump de setTimeout(0) zera o start),
  // de propósito: assim um game loop legítimo (requestAnimationFrame/setInterval),
  // que CEDE o thread entre ticks, nunca é cortado.
  //
  // CASO MOLE ACEITO (sem cutoff cumulativo): um laço assíncrono que CEDE o thread
  // mas faz trabalho síncrono pesado a cada tick (recursão de setTimeout/rAF dentro
  // do orçamento) sustenta CPU alta SEM congelar a aba — cada tick fica abaixo do
  // budget, então a guarda (que mede tempo SÍNCRONO contínuo, não acúmulo) não
  // dispara. NÃO adicionamos um corte cumulativo duro aqui: ele daria falso-positivo
  // em game loops legítimos de rAF. É a mesma limitação de "roda no mesmo thread"
  // já documentada nas outras camadas — e o botão Parar (Camada B) recupera a aba.
  function reset() { start = null; try { schedule(reset, 0); } catch (e) {} }
  try { schedule(reset, 0); } catch (e) {}
  // CAPTURA o relógio UMA VEZ, na instalação da guarda (este IIFE roda no <head>
  // ANTES do código do aluno). Se resolvêssemos performance.now/Date.now no tick,
  // o aluno poderia CONGELAR o relógio antes do laço (ex.: Date.now = function(){
  // return 0 } ou redefinir window.performance) e o orçamento NUNCA estouraria →
  // while(true){} travaria a aba. Aqui guardamos a função pristina e ligada (bind)
  // ao seu dono, então uma reatribuição posterior do aluno não tem efeito.
  var nowFn = (typeof window !== 'undefined' && window.performance && typeof window.performance.now === 'function')
    ? window.performance.now.bind(window.performance)
    : ((typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now.bind(performance)
        : Date.now.bind(Date));
  function __szLoopTick() {
    var t = nowFn();
    if (start === null) { start = t; return; }
    if (t - start > BUDGET) {
      start = null;
      var e = new Error('O código ficou preso em um laço por tempo demais e foi interrompido. Verifique se a condição do laço (loop) realmente chega ao fim.');
      e.__szLoopGuard = true;
      throw e;
    }
  }
  // Trava o tick: writable/configurable false impedem o aluno de reatribuir
  // window.__szLoopTick para neutralizar o orçamento. Fallback p/ atribuição
  // simples se defineProperty falhar — a guarda jamais pode quebrar o preview.
  try {
    Object.defineProperty(window, '__szLoopTick', {
      value: __szLoopTick,
      writable: false,
      configurable: false,
      enumerable: false,
    });
  } catch (e) {
    window.__szLoopTick = __szLoopTick;
  }
})();`
}
