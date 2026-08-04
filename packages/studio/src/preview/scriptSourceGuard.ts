/**
 * Runtime injetado no `<head>` do iframe (DEPOIS do modalGuard e ANTES do
 * importmap, dos runtimes de extensão e do código do aluno — é 1st-party) que
 * RECUSA `<script src="data:…">` / `<script src="blob:…">` criado EM RUNTIME.
 *
 * Porquê existe: até 08/2026 quem barrava isso era a CSP — `script-src` listava
 * só os hashes SHA-256 exatos dos scripts que o Studio gera, sem `data:`/`blob:`
 * como esquemas. Só que casar fonte de HASH com script EXTERNO é CSP nível 3 que
 * apenas o Chromium implementa; o Firefox só casa hash com script INLINE (bug
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1409200, aberto). Como TODO o JS do
 * aluno é externalizado para `data:text/javascript;base64,…` (ver bootstrap.ts),
 * fora do Chromium o programa inteiro era recusado em silêncio: guardas e CSS
 * (inline) rodavam, o preview aparecia vivo e nada acontecia. A CSP passou a
 * liberar `data:` em `script-src`, e esta guarda assumiu a promessa que ela
 * deixou de dar — agora nos DOIS navegadores, em vez de só no Chrome.
 *
 * O que a promessa protege: um `s.src = 'data:text/javascript,while(true){}'`
 * rodaria FORA da instrumentação do loopGuard (que reescreve o JS canônico ANTES
 * de virar data: URL) e congelaria a aba. É a mesma família do modalGuard: manter
 * o preview do aluno destravável.
 *
 * COMO distingue o nosso script do dele, sem allowlist: os scripts autorizados do
 * preview nascem no PARSE do srcdoc (o parser de HTML escreve o atributo direto),
 * enquanto injeção em runtime passa obrigatoriamente pelo setter IDL
 * `HTMLScriptElement.prototype.src` ou por `setAttribute`. Fechar os dois não
 * alcança um único script nosso. Import de módulo dos arquivos extras resolve
 * pelo importmap (nunca pelo setter), então também segue intacto.
 *
 * ⚠️ NÃO é barreira dura, é ergonomia anti-travamento — mesma régua do loopGuard
 * e do modalGuard. Fora do alcance, de propósito:
 * - `document.write('<script src=data:…>')` — o atributo vem do parser, não do
 *   setter. Depois do load, `document.write` destrói o documento; não vale o custo.
 * - `innerHTML` / `insertAdjacentHTML` — não precisam de tratamento: por
 *   especificação, `<script>` inserido assim NÃO executa.
 * O que continua sendo garantia REAL da CSP: `script-src` sem `https:` (nada de
 * `<script src=remoto>`), sem `'unsafe-inline'` e sem `blob:`, e `worker-src 'none'`.
 *
 * Auto-contido (entra como STRING num `<script>`): sem imports nem refs externas,
 * e sem regex com barra invertida (mesma regra dos outros bridges).
 */

/** Máximo de avisos no Console — um laço que tentasse injetar inundaria tudo. */
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
  // Esquemas recusados. O navegador ignora espacos/controles no INICIO da URL e
  // nao diferencia maiusculas no esquema — normalizamos igual antes de comparar.
  function isBlockedSource(value) {
    var text;
    try {
      text = (value === null || value === undefined) ? '' : String(value);
    } catch (e) {
      // Objeto com toString hostil: nao da p/ inspecionar, entao recusa.
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
  // Camada 1 — o setter IDL (\`s.src = '...'\`), o caminho comum de longe.
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
        // Travado (igual ao __szLoopTick): nao da p/ redefinir de volta.
        configurable: false,
      });
    }
  } catch (e) {}
  // Camada 2 — \`setAttribute('src', ...)\` e a forma com namespace. O atributo
  // posto pelo PARSER do srcdoc nao passa por aqui, entao os scripts do Studio
  // (e do aluno, ja instrumentados) seguem intactos.
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
