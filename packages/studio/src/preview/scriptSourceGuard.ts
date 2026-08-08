/**
 * Runtime injetado antes do código do aluno para recusar scripts `data:` ou
 * `blob:` criados em runtime. Os scripts autorizados do preview nascem no parse
 * do srcdoc e não passam pelos setters fechados aqui.
 */
const SCRIPT_SOURCE_MAX_WARNINGS = 3

export function buildScriptSourceGuardRuntime(): string {
  return `(function () {
  var MAX_WARNINGS = ${JSON.stringify(SCRIPT_SOURCE_MAX_WARNINGS)};
  var warnings = 0;
  function warn() {
    if (warnings >= MAX_WARNINGS) return;
    warnings++;
    try {
      console.warn('Um <script> criado pelo proprio programa (data: ou blob:) foi bloqueado. Escreva o codigo no editor: assim o Estudio consegue proteger o seu projeto de travar.');
    } catch (e) {}
  }
  function isBlockedSource(value) {
    var text;
    try {
      text = (value === null || value === undefined) ? '' : String(value);
    } catch (e) {
      return true;
    }
    var start = 0;
    while (start < text.length && text.charCodeAt(start) <= 32) start++;
    var head = text.slice(start, start + 5).toLowerCase();
    return head === 'data:' || head === 'blob:';
  }
  function isScriptElement(el) {
    if (!el) return false;
    var tag;
    try { tag = el.tagName; } catch (e) { return false; }
    return typeof tag === 'string' && tag.toLowerCase() === 'script';
  }
  function isSrcName(name) {
    var text;
    try { text = String(name); } catch (e) { return false; }
    return text.toLowerCase() === 'src';
  }
  try {
    var scriptProto = (typeof HTMLScriptElement !== 'undefined') ? HTMLScriptElement.prototype : null;
    var srcDesc = scriptProto ? Object.getOwnPropertyDescriptor(scriptProto, 'src') : null;
    if (srcDesc && typeof srcDesc.get === 'function' && typeof srcDesc.set === 'function') {
      var nativeGet = srcDesc.get;
      var nativeSet = srcDesc.set;
      Object.defineProperty(scriptProto, 'src', {
        get: function () { return nativeGet.call(this); },
        set: function (value) {
          if (isBlockedSource(value)) { warn(); return; }
          nativeSet.call(this, value);
        },
        enumerable: !!srcDesc.enumerable,
        configurable: false,
      });
    }
  } catch (e) {}
  try {
    var elProto = (typeof Element !== 'undefined') ? Element.prototype : null;
    var nativeSetAttribute = elProto ? elProto.setAttribute : null;
    if (elProto && typeof nativeSetAttribute === 'function') {
      Object.defineProperty(elProto, 'setAttribute', {
        value: function (name, value) {
          if (isScriptElement(this) && isSrcName(name) && isBlockedSource(value)) {
            warn();
            return undefined;
          }
          return nativeSetAttribute.apply(this, arguments);
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }
    var nativeSetAttributeNS = elProto ? elProto.setAttributeNS : null;
    if (elProto && typeof nativeSetAttributeNS === 'function') {
      Object.defineProperty(elProto, 'setAttributeNS', {
        value: function (ns, name, value) {
          if (isScriptElement(this) && isSrcName(name) && isBlockedSource(value)) {
            warn();
            return undefined;
          }
          return nativeSetAttributeNS.apply(this, arguments);
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }
  } catch (e) {}
})();`
}
