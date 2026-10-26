/**
 * pygame-ce's side module carries SDL's EM_ASM/EM_JS code as strings; emscripten's dynamic
 * linker turns them into functions with a direct `eval`, which the worker CSP forbids (no
 * 'unsafe-eval'). This derivation compiles exactly the pinned strings
 * (src/runtime/python/pygame/approved-js-snippets.json) into the factory of pyodide.asm.mjs, in
 * the scope those snippets expect (Module, HEAP views, UTF8ToString), and points the two linker
 * call sites at that table. Any other string is refused with the same EvalError as the CSP.
 */
import { createHash } from 'node:crypto'
import pinned from '../../src/runtime/python/pygame/approved-js-snippets.json'

export const APPROVED_EVAL_RECIPE = 'approved-eval-v1'
const SITES = ['ASM_CONSTS[start]=eval(func)', 'moduleExports[name]=eval(func)'] as const
const FACTORY_END = ';return moduleRtn}export default _createPyodideModule;'
// Compiled once per worker, on the first side module that asks (function declarations hoist,
// so this works however early a module loads).
const SHAPE = /^\(([$\w, ]*)\) => [\s\S]*;$/

export function approvedEvalSha256() {
  return createHash('sha256').update(JSON.stringify(pinned)).digest('hex')
}

export function applyApprovedEval(source: string, snippets: readonly string[] = pinned.snippets) {
  for (const site of SITES)
    if (source.split(site).length !== 2)
      throw new Error(`O carregador Python mudou: ponto de eval ${site} não encontrado uma vez.`)
  if (source.split(FACTORY_END).length !== 2)
    throw new Error('O carregador Python mudou: fim da fábrica não encontrado.')
  const entries = snippets.map((snippet) => {
    if (!SHAPE.test(snippet)) throw new Error('Trecho JavaScript do SDL fora do formato esperado.')
    // The key is the exact string the linker builds; the value is the same code, compiled.
    return `[${JSON.stringify(snippet)},${snippet.slice(0, -1)}]`
  })
  const table =
    ';var __szApprovedSnippets;function __szApprovedEval(code){' +
    `__szApprovedSnippets??=new Map([${entries.join(',')}]);` +
    'var compiled=__szApprovedSnippets.get(code);' +
    "if(compiled===undefined)throw new EvalError('Código JavaScript de módulo nativo não aprovado.');" +
    'return compiled}'
  let derived = source
  for (const site of SITES)
    derived = derived.replace(site, site.replace('eval(', '__szApprovedEval('))
  return derived.replace(FACTORY_END, `${table}${FACTORY_END}`)
}
