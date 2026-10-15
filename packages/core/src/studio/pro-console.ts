export const PRO_MAX_LOG_PARTS = 20
export const PRO_MAX_LOG_PART_CHARS = 8_000

export function buildProConsoleBridgeScript(hostOrigin: string): string {
  const host = JSON.stringify(hostOrigin)
  return `(() => {
  if (window.__szProConsole) return;
  window.__szProConsole = true;
  var HOST = ${host};
  var MAX_PARTS = ${PRO_MAX_LOG_PARTS};
  var MAX_CHARS = ${PRO_MAX_LOG_PART_CHARS};
  var cap = function (s) {
    return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '… (truncado)' : s;
  };
  var fmt = function (v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || v.message;
    try {
      var json = JSON.stringify(v);
      if (json !== undefined) return json;
    } catch (e) {}
    return String(v);
  };
  var send = function (kind, args) {
    try {
      var parts = [];
      var total = args.length > MAX_PARTS ? MAX_PARTS : args.length;
      for (var i = 0; i < total; i++) parts.push(cap(fmt(args[i])));
      if (args.length > MAX_PARTS) parts.push('… (+' + (args.length - MAX_PARTS) + ' itens)');
      window.parent.postMessage({ source: 'sz-pro-console', kind: kind, parts: parts }, HOST);
    } catch (e) {}
  };
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (name) {
    var original = console[name] ? console[name].bind(console) : null;
    console[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      send(name === 'debug' ? 'log' : name, args);
      if (original) original.apply(null, args);
    };
  });
})();`
}
