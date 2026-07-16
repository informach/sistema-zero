import type { ExtensionPermission } from '#extensions'
import { sanitizeFetchOrigins } from './csp'

/**
 * Enforcement em RUNTIME das permissões dentro do iframe do preview. Hoje as
 * permissions de extensão (`extensions/manifest.ts`) são só declarativas; este
 * guard as torna efetivas, fechando o gap do checklist do `docs/EXTENSIONS.md`.
 *
 * Foco no vetor de risco real deste ambiente: REDE (exfiltração / supply-chain).
 * As capacidades que o aluno PRECISA para aprender (canvas, teclado, mouse,
 * áudio, storage) ficam liberadas por uma baseline — só a rede é travada por
 * padrão, e o professor a libera por origem (`fetchAllowedOrigins`). Uma
 * extensão que declare `network` também libera (código 1st-party auditado).
 *
 * Injetado ANTES dos `bootstrapScript` de extensões e do código do aluno, então
 * vale para ambos — até uma extensão que esqueça de declarar `network` é barrada.
 */

/** Capacidades sempre disponíveis ao código do aluno (não são vetor de exfil). */
export const STUDENT_BASELINE_PERMISSIONS: readonly ExtensionPermission[] = [
  'canvas',
  'keyboard',
  'mouse',
  'audio',
  'storage',
]

export interface PermissionGuardOptions {
  /** Permissões concedidas (união das extensões instaladas). */
  granted?: readonly ExtensionPermission[]
  /** Origens https/http liberadas pelo professor para fetch/XHR. */
  fetchAllowedOrigins?: readonly string[]
}

/**
 * Monta o IIFE de enforcement. Retorna `''` quando a rede está totalmente
 * liberada (extensão com `network` e sem allowlist restritiva) — nada a fazer.
 */
export function buildPermissionGuardRuntime(options: PermissionGuardOptions = {}): string {
  const granted = new Set<ExtensionPermission>([
    ...STUDENT_BASELINE_PERMISSIONS,
    ...(options.granted ?? []),
  ])
  const origins = sanitizeFetchOrigins(options.fetchAllowedOrigins)

  // Rede liberada sem restrição de origem: extensão 1st-party declarou network e
  // o professor não impôs allowlist. Nada a neutralizar.
  if (granted.has('network') && origins.length === 0) return ''

  const allowJson = origins.length > 0 ? JSON.stringify(origins) : 'null'
  return `(function () {
  var ALLOW = ${allowJson};
  function blocked(api) {
    return function () {
      throw new Error('Acesso à rede bloqueado neste preview (' + api + '). Peça ao professor para liberar o domínio ou use o modo profissional.');
    };
  }
  function parseUrl(u) {
    try { return new URL(typeof u === 'string' ? u : (u && u.url), location.href); }
    catch (e) { return null; }
  }
  function originOf(u) {
    var parsed = parseUrl(u);
    return parsed ? parsed.origin : null;
  }
  function allowed(u) {
    if (!ALLOW) return false;
    var parsed = parseUrl(u);
    if (!parsed) return false;
    // Só http/https podem casar a allowlist. URLs como blob:/data:/filesystem:
    // têm um esquema externo + uma origem INTERNA herdada do conteúdo embutido
    // (ex.: blob:https://api-permitida/uuid → origin 'https://api-permitida'),
    // então a comparação por .origin passaria indevidamente. Travamos pelo
    // protocolo ANTES de comparar a origem.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return ALLOW.indexOf(parsed.origin) >= 0;
  }
  if (ALLOW) {
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        if (allowed(input)) return origFetch.apply(this, arguments);
        return Promise.reject(new Error('Domínio não liberado no preview: ' + (originOf(input) || input)));
      };
    }
    var OrigXHR = window.XMLHttpRequest;
    if (OrigXHR && OrigXHR.prototype && OrigXHR.prototype.open) {
      var origOpen = OrigXHR.prototype.open;
      OrigXHR.prototype.open = function (method, url) {
        if (!allowed(url)) throw new Error('Domínio não liberado no preview: ' + (originOf(url) || url));
        return origOpen.apply(this, arguments);
      };
    }
  } else {
    // fetch REJEITA (não lança síncrono): é a semântica correta do fetch p/ erro
    // de rede — assim os loaders (GLTFLoader/RGBELoader → FileLoader) tratam no
    // .catch/onError em vez de estourar um "Uncaught Error" no console.
    window.fetch = function () {
      return Promise.reject(new Error('Acesso à rede bloqueado neste preview (fetch). Peça ao professor para liberar o domínio ou use o modo profissional.'));
    };
    if (window.XMLHttpRequest) {
      window.XMLHttpRequest = function () { throw new Error('Acesso à rede bloqueado neste preview (XMLHttpRequest). Peça ao professor para liberar o domínio ou use o modo profissional.'); };
    }
  }
  // WebSocket/EventSource não casam com a allowlist http(s): sempre bloqueados
  // quando a rede não é totalmente liberada.
  if (window.WebSocket) window.WebSocket = blocked('WebSocket');
  if (window.EventSource) window.EventSource = blocked('EventSource');
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon = function () { return false; };
  }
})();`
}
