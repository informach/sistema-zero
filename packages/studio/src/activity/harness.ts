import type { BehaviorCheck, CodeCheck, TestCaseCheck } from '../studio/activity'

/** Checagens que rodam DENTRO do sandbox (todas menos `structure`). */
export type SandboxCheck = BehaviorCheck | TestCaseCheck | CodeCheck

export interface BuildHarnessOptions {
  /** Origem do parent para o `targetOrigin` do postMessage (default '*'). */
  parentOrigin?: string
  /** Espera após o `load` antes de rodar (deixa async inicial assentar). Default 60ms. */
  delayMs?: number
}

/**
 * Monta o HARNESS de auto-correção como STRING PURA (entra como `extensionScript`
 * no `buildPreviewDoc`; o `scriptTag` já neutraliza `</script`). Sem imports.
 *
 * Roda no sandbox null-origin do aluno (loopGuard/CSP/permissionGuard valem). As
 * checagens entram como DADOS (JSON). O `code.source` do professor roda num
 * `<script>` INLINE autenticado pelo nonce do harness (a CSP NÃO libera inline
 * `'unsafe-eval'` — `eval`/`new Function` estão BLOQUEADOS; ver `preview/csp.ts`).
 * O corpo vai por `script.textContent` (não re-tokenizado como HTML → `</script>`
 * é inócuo) e a leitura de globais usa o MESMO truque (`readGlobal`), porque
 * `let`/`const` de topo do aluno são globais LÉXICAS, invisíveis em `window[...]`.
 * O harness:
 *  1. captura `console.*` (para `consoleContains`) por cima do interceptor;
 *  2. no `load` + `delayMs`, roda cada checagem e posta um `checkResult` ao parent.
 *
 * Contexto do `code` (escape hatch): `ctx = { doc, consoleText, getGlobal(name),
 * callFn(name, ...args), assert(cond, msg) }`. A asserção pode `return` booleano
 * (false reprova) OU usar `assert`/lançar (sem return = passou).
 */
export function buildCheckHarness(
  checks: readonly SandboxCheck[],
  opts: BuildHarnessOptions = {},
): string {
  const parentOrigin = typeof opts.parentOrigin === 'string' ? opts.parentOrigin : '*'
  const delayMs = typeof opts.delayMs === 'number' && opts.delayMs >= 0 ? opts.delayMs : 60
  // Serialização segura: as checagens são dados; embute como JSON parseado em
  // runtime (não como literal de código). `<\/script` evita fechar a tag cedo.
  const checksJson = JSON.stringify(checks).replace(/<\/script/gi, '<\\/script')
  const originJson = JSON.stringify(parentOrigin)

  return `(function () {
  var CHECKS = JSON.parse(${JSON.stringify(checksJson)});
  var TARGET_ORIGIN = ${originJson};
  var DELAY = ${delayMs};
  var SCRIPT_NONCE = (document.currentScript && document.currentScript.nonce) ||
    ((document.querySelector('script[nonce]') || {}).nonce || '');
  var consoleText = [];
  function capture(method) {
    var original = console[method];
    console[method] = function () {
      try {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) parts.push(stringify(arguments[i]));
        consoleText.push(parts.join(' '));
      } catch (e) {}
      if (typeof original === 'function') return original.apply(console, arguments);
    };
  }
  function stringify(v) {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return String(v);
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    return String(v);
  }
  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a && b && typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      var ka = Object.keys(a), kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (var i = 0; i < ka.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(b, ka[i])) return false;
        if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
      }
      return true;
    }
    return false;
  }
  function post(checkId, passed, message) {
    try {
      parent.postMessage(
        { source: 'sz-preview', kind: 'checkResult', checkId: checkId, passed: !!passed,
          message: message ? String(message).slice(0, 2000) : undefined, timestamp: Date.now() },
        TARGET_ORIGIN,
      );
    } catch (e) {}
  }
  function readGlobal(name) {
    if (typeof name !== 'string') return undefined;
    // var / function de topo / window.x = … são PROPRIEDADES de window.
    if (name in window) return window[name];
    // let/const/class de topo são globais LÉXICAS — NÃO viram propriedade de
    // window. Só são alcançáveis por referência crua dentro de um <script>
    // inline (a CSP do preview libera 'unsafe-inline', mas NÃO 'unsafe-eval';
    // por isso eval/new Function estão fora — ver activity/sandbox + preview/csp).
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return undefined;
    try {
      delete window.__szG;
      var s = document.createElement('script');
      s.nonce = SCRIPT_NONCE;
      s.textContent = 'try{window.__szG={v:(' + name + ')}}catch(e){}';
      (document.head || document.documentElement).appendChild(s);
      s.remove();
      var box = window.__szG;
      delete window.__szG;
      return box ? box.v : undefined;
    } catch (e) { return undefined; }
  }
  function runBehavior(c) {
    var r = c.rule;
    if (r.type === 'consoleContains') return { passed: consoleText.join('\\n').indexOf(r.text) !== -1, message: 'console não contém o texto esperado' };
    if (r.type === 'domSelectorExists') return { passed: !!document.querySelector(r.selector), message: 'nenhum elemento casa "' + r.selector + '"' };
    if (r.type === 'domSelectorText') {
      var el = document.querySelector(r.selector);
      var txt = el ? (el.textContent || '') : '';
      return { passed: !!el && txt.indexOf(r.text) !== -1, message: 'o elemento não contém o texto esperado' };
    }
    if (r.type === 'globalEquals') return { passed: deepEqual(readGlobal(r.name), r.value), message: 'a variável global "' + r.name + '" não tem o valor esperado' };
    return { passed: false, message: 'regra de comportamento desconhecida' };
  }
  function runTestCase(c) {
    // readGlobal (não window[...]): funções escritas em modo Código (let/const/
    // function expression de topo) são globais LÉXICAS e NÃO viram propriedade de
    // window — pegá-las só por window[...] dava falso-negativo "função não definida".
    var fn = readGlobal(c.functionName);
    if (typeof fn !== 'function') return { passed: false, message: 'a função "' + c.functionName + '" não foi definida' };
    for (var i = 0; i < c.cases.length; i++) {
      var tc = c.cases[i];
      try {
        var got = fn.apply(null, tc.args || []);
        if (!deepEqual(got, tc.expected)) {
          return { passed: false, message: 'caso ' + (i + 1) + ': esperado ' + stringify(tc.expected) + ', obtido ' + stringify(got) };
        }
      } catch (e) {
        return { passed: false, message: 'caso ' + (i + 1) + ' lançou erro: ' + (e && e.message ? e.message : e) };
      }
    }
    return { passed: true };
  }
  function runCode(c) {
    window.__szCtx = {
      doc: document,
      consoleText: consoleText.slice(),
      getGlobal: readGlobal,
      callFn: function (name) { var f = readGlobal(name); var a = Array.prototype.slice.call(arguments, 1); return f.apply(null, a); },
      assert: function (cond, msg) { if (!cond) throw new Error(msg || 'asserção falhou'); },
    };
    // A asserção do professor roda num <script> INLINE (a CSP libera
    // 'unsafe-inline'; new Function/eval exigiriam 'unsafe-eval', que NÃO é
    // liberado). Rodar inline também dá acesso às globais LÉXICAS do aluno via
    // ctx.getGlobal. textContent NÃO é re-tokenizado como HTML → um fechamento de
    // script literal no corpo do professor é inócuo (sem necessidade de escape).
    delete window.__szCodeOut;
    var s = document.createElement('script');
    s.nonce = SCRIPT_NONCE;
    s.textContent =
      '(function(){var ctx=window.__szCtx;try{var __o=(function(){' + c.source +
      '\\n})();window.__szCodeOut={ok:true,passed:__o===undefined?true:!!__o};}' +
      'catch(e){window.__szCodeOut={ok:true,passed:false,msg:(e&&e.message)?e.message:String(e)};}})();';
    try {
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e) {}
    var out = window.__szCodeOut;
    delete window.__szCodeOut;
    if (!out || !out.ok) return { passed: false, message: 'a asserção não pôde ser avaliada (erro de sintaxe?)' };
    return out.passed ? { passed: true } : { passed: false, message: out.msg || 'a asserção retornou falso' };
  }
  function runAll() {
    for (var i = 0; i < CHECKS.length; i++) {
      var c = CHECKS[i];
      var res;
      try {
        if (c.kind === 'behavior') res = runBehavior(c);
        else if (c.kind === 'testcase') res = runTestCase(c);
        else if (c.kind === 'code') res = runCode(c);
        else res = { passed: false, message: 'tipo de checagem desconhecido' };
      } catch (e) {
        res = { passed: false, message: e && e.message ? e.message : String(e) };
      }
      post(c.id, res.passed, res.passed ? undefined : res.message);
    }
  }
  for (var m of ['log', 'info', 'warn', 'error']) capture(m);
  window.addEventListener('load', function () { setTimeout(runAll, DELAY); });
})();`
}
