/**
 * Constrói o script que roda DENTRO do iframe sandboxed.
 *
 * Intercepta console.* / window.onerror / unhandledrejection e envia ao parent
 * via postMessage. Não usa nenhuma referência externa (precisa ser auto-contido,
 * pois é inserido como string no <script>).
 *
 * `targetOrigin` restringe o destino do postMessage à origem da app (defesa em
 * profundidade — o receptor já valida `event.source` e `data.source`). Quando
 * não informado, usa `'*'` (ex.: ambientes onde a origem não é conhecida).
 */
import {
  PREVIEW_MAX_ERROR_CHARS,
  PREVIEW_MAX_LOG_PART_CHARS,
  PREVIEW_MAX_LOG_PARTS,
  PREVIEW_MESSAGE_SOURCE,
} from './types'

export function buildInterceptorScript(targetOrigin = '*'): string {
  return `(function () {
  var SRC = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
  var TARGET_ORIGIN = ${JSON.stringify(targetOrigin)};
  var MAX_LOG_PARTS = ${PREVIEW_MAX_LOG_PARTS};
  var MAX_LOG_PART_CHARS = ${PREVIEW_MAX_LOG_PART_CHARS};
  var MAX_ERROR_CHARS = ${PREVIEW_MAX_ERROR_CHARS};
  function truncateText(text) {
    if (typeof text !== 'string') return text;
    if (text.length <= MAX_LOG_PART_CHARS) return text;
    return text.slice(0, MAX_LOG_PART_CHARS) + '... [truncado]';
  }
  function truncateErrorText(text) {
    if (typeof text !== 'string') return text;
    if (text.length <= MAX_ERROR_CHARS) return text;
    return text.slice(0, MAX_ERROR_CHARS) + '... [truncado]';
  }
  function describeNode(node) {
    // Elemento: mostra a tag de abertura (como o navegador), ex.: <canvas id="tela" width="400">.
    if (node.nodeType === 1) {
      var html = typeof node.outerHTML === 'string' ? node.outerHTML : '';
      var m = html.match(/^<[^>]*>/);
      if (m) return m[0];
      return '<' + (node.tagName ? node.tagName.toLowerCase() : 'elemento') + '>';
    }
    // Nó de texto.
    if (node.nodeType === 3) return '"' + (node.textContent || '') + '"';
    if (node === document) return '[document]';
    return '[' + (node.nodeName || 'nó') + ']';
  }
  function isDomNode(v) {
    return typeof Node !== 'undefined' && v instanceof Node;
  }
  function safeStringify(v) {
    try {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'function') return '[function ' + (v.name || 'anônima') + ']';
      if (typeof v === 'string') return truncateText(v);
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      // Nós do DOM (ex.: a variável que guarda um <canvas>): JSON.stringify daria
      // "{}" porque não têm propriedades próprias enumeráveis. Mostra a tag.
      if (isDomNode(v)) return truncateText(describeNode(v));
      var seen = new WeakSet();
      var json = JSON.stringify(v, function (k, val) {
        if (isDomNode(val)) return describeNode(val);
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[circular]';
          seen.add(val);
        }
        if (typeof val === 'function') return '[function]';
        return val;
      });
      // Objeto sem propriedades próprias enumeráveis (host object, window, etc.):
      // JSON.stringify devolve "{}". Mostra o nome do construtor para dar pista.
      if (
        (json === '{}' || json === undefined) &&
        v &&
        v.constructor &&
        v.constructor.name &&
        v.constructor.name !== 'Object'
      ) {
        return '[' + v.constructor.name + ']';
      }
      return truncateText(json);
    } catch (e) {
      try {
        if (v && v.constructor && v.constructor.name) return '[' + v.constructor.name + ']';
      } catch (e2) {}
      return '[unserializável]';
    }
  }
  function send(kind, args, error) {
    try {
      var rawArgs = Array.prototype.slice.call(args || [], 0, MAX_LOG_PARTS);
      var parts = rawArgs.map(safeStringify);
      if (args && args.length > MAX_LOG_PARTS) {
        parts.push('... [' + (args.length - MAX_LOG_PARTS) + ' itens truncados]');
      }
      parent.postMessage({
        source: SRC,
        kind: kind,
        parts: parts,
        error: error,
        timestamp: Date.now()
      }, TARGET_ORIGIN);
    } catch (e) {
      // se postMessage falhar, não há para onde reclamar
    }
  }
  // Sinal de vida sem payload — o watchdog do PreviewIframe (Camada B) detecta
  // travamento síncrono pela AUSÊNCIA de heartbeats (o setInterval não dispara
  // enquanto o thread está preso). setInterval é capturado pristino aqui (o
  // interceptor é o primeiro script do <head>).
  function sendBare(kind) {
    try {
      parent.postMessage({ source: SRC, kind: kind, parts: [], timestamp: Date.now() }, TARGET_ORIGIN);
    } catch (e) {}
  }
  // Erro lançado pela guarda de loop (loopGuard) carrega a marca __szLoopGuard.
  function isLoopGuard(err) {
    return !!(err && typeof err === 'object' && err.__szLoopGuard);
  }
  // O erro veio do script.js do ALUNO? A cauda da data URL é semeada pelo
  // buildPreviewDoc (window.__SZ_USER_JS_TAIL) logo antes do script do aluno —
  // runtimes de extensão/extras têm URLs diferentes e ficam de fora.
  function isUserSrc(src) {
    try {
      var tail = window.__SZ_USER_JS_TAIL;
      if (!tail || typeof src !== 'string' || src.length < tail.length) return false;
      return src.slice(-tail.length) === tail;
    } catch (e) { return false; }
  }
  var origLog = console.log;
  var origWarn = console.warn;
  var origError = console.error;
  var origInfo = console.info;
  console.log = function () { send('log', arguments); origLog.apply(console, arguments); };
  console.warn = function () { send('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function () { send('error', arguments); origError.apply(console, arguments); };
  console.info = function () { send('info', arguments); origInfo.apply(console, arguments); };
  window.onerror = function (msg, src, line, col, err) {
    if (isLoopGuard(err)) {
      var loopMsg = String((err && err.message) || msg);
      send('loopStopped', [truncateText(loopMsg)], { message: truncateErrorText(loopMsg) });
      return true;
    }
    send('runtimeError', [truncateText(String(msg))], {
      message: truncateErrorText(String(msg)),
      stack: err && err.stack ? truncateErrorText(String(err.stack)) : undefined,
      line: line,
      col: col,
      userCode: isUserSrc(src)
    });
    return false;
  };
  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev && ev.reason;
    if (isLoopGuard(reason)) {
      var loopMsg = String(reason.message || 'Laço interrompido pela guarda de tempo.');
      send('loopStopped', [truncateText(loopMsg)], { message: truncateErrorText(loopMsg) });
      return;
    }
    var msg = reason && reason.message ? reason.message : safeStringify(reason);
    send('unhandledRejection', [truncateText(String(msg))], {
      message: truncateErrorText(String(msg)),
      stack: reason && reason.stack ? truncateErrorText(String(reason.stack)) : undefined
    });
  });
  // Âncoras internas (href="#secao"): num iframe srcdoc sandbox, o navegador
  // tentaria ir para "about:srcdoc#secao" e RECARREGA a página em branco. Em vez
  // disso, interceptamos o clique e rolamos suavemente até o alvo.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var a = t && t.closest ? t.closest('a[href^="#"]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return;
    ev.preventDefault();
    if (href === '#' || href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var id = href.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    var target = document.getElementById(id);
    if (!target) {
      try { target = document.querySelector('a[name="' + id.replace(/"/g, '\\\\"') + '"]'); } catch (e) {}
    }
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, true);
  // Heartbeat: imediato + periódico. Enquanto um loop síncrono prende o thread,
  // este intervalo NÃO dispara — é assim que o watchdog detecta travamento.
  sendBare('heartbeat');
  try { setInterval(function () { sendBare('heartbeat'); }, 1000); } catch (e) {}
})();`
}

/**
 * Script padrão (targetOrigin `'*'`). Mantido por compatibilidade; prefira
 * `buildInterceptorScript(parentOrigin)` informando a origem da app.
 */
export const PREVIEW_INTERCEPTOR_SCRIPT = buildInterceptorScript('*')
