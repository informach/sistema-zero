import { PREVIEW_MESSAGE_SOURCE, sanitizePreviewStorageData } from './types'

/**
 * Runtime injetado no `<head>` do iframe (ANTES de qualquer script de extensão e
 * do código do aluno) que dá ao preview um `localStorage`/`sessionStorage`
 * FUNCIONAL.
 *
 * Porquê: o preview roda num iframe `sandbox` SEM `allow-same-origin` → origem
 * OPACA. Numa origem opaca o navegador LANÇA `SecurityError` ao só TOCAR em
 * `window.localStorage`/`sessionStorage` — então os blocos "guardar/ler"
 * (`localStorage.setItem/getItem`) quebravam o programa do aluno, e nada
 * persistia entre execuções (cada "Atualizar" recria o srcdoc do zero). Resultado
 * prático: o bichinho esquecia a fome ao recarregar.
 *
 * Como: definimos NOSSO shim de `Storage` em `window` via `Object.defineProperty`
 * (os atributos de interface do objeto global são `configurable: true`, então a
 * redefinição vence o getter que lançaria — e nunca o LEMOS, só o substituímos).
 *
 * Semântica dos dois stores (espelha o dropdown dos blocos):
 *  - `local` (localStorage, "permanente"): semeado por `localSnapshot` no boot e,
 *    a cada mutação, espelhado ao parent por postMessage. O parent persiste por
 *    projeto (IndexedDB) e re-semeia no próximo build → sobrevive a "Atualizar",
 *    Play/Parar e ao recarregar a IDE inteira. E, para sobreviver a um
 *    `location.reload()` disparado DE DENTRO do jogo (ex.: `SZGame2D.restart()`,
 *    que não passa pelo parent e re-semearia do SEED estático do build), o store é
 *    também espelhado em `window.name` (namespaced por `projectId`) — o único canal
 *    síncrono que sobrevive ao reload no mesmo browsing-context — e o boot PREFERE
 *    esse valor ao SEED quando o projeto bate.
 *  - `session` (sessionStorage, "só nesta sessão"): efêmero, vive só na memória
 *    do sandbox e zera a cada execução — não vai ao parent. Funciona (não lança),
 *    mas não persiste, mantendo o contraste didático local×session.
 *
 * Auto-contido (entra como string num `<script>`): sem imports nem refs externas.
 */
export interface StorageBridgeOptions {
  /** Snapshot do store `local` a semear (já clampado pelo chamador). */
  localSnapshot?: Record<string, string>
  /**
   * Origem da app, usada como `targetOrigin` do postMessage (defesa em
   * profundidade). AUSENTE → o bridge NÃO espelha o estado salvo ao parent
   * (não usa '*' para não vazar o snapshot do aluno a janelas arbitrárias).
   */
  parentOrigin?: string
  /** Projeto para o qual o doc é construído — carimbado em cada `storageWrite`. */
  projectId?: string
}

export function buildStorageBridgeRuntime(options: StorageBridgeOptions = {}): string {
  // Clampa o snapshot aqui também: o doc do preview não deve carregar um seed
  // gigante mesmo que o mirror do parent tenha escapado dos limites.
  const seed = sanitizePreviewStorageData(options.localSnapshot ?? {})
  // Ao contrário do canal de console (não-sensível), o bridge ESPELHA o estado
  // salvo do aluno (localStorage) ao parent. Postar isso com targetOrigin '*'
  // entregaria o snapshot a QUALQUER janela que interceptasse a mensagem — um
  // foot-gun se um chamador futuro instanciar o bridge sem a origem da app. Sem
  // uma origem conhecida, NÃO espelhamos (TARGET = null abaixo desliga o post).
  const targetOrigin = options.parentOrigin ?? null
  // SEED entra como STRING JSON + JSON.parse em runtime (não como objeto literal):
  // um literal `{ "__proto__": ... }` definiria o protótipo em vez de criar a
  // chave própria, perdendo uma chave literal `__proto__`. JSON.parse cria own key.
  const seedLiteral = JSON.stringify(JSON.stringify(seed))
  return `(function () {
  var SRC = ${JSON.stringify(PREVIEW_MESSAGE_SOURCE)};
  var TARGET = ${JSON.stringify(targetOrigin)};
  var PROJECT_ID = ${JSON.stringify(options.projectId ?? null)};
  var SEED;
  try { SEED = JSON.parse(${seedLiteral}); } catch (e) { SEED = {}; }
  // Limites do store — ESPELHAM src/preview/types.ts (PREVIEW_STORAGE_MAX_KEYS,
  // PREVIEW_STORAGE_MAX_TOTAL_CHARS), inlinados como literais porque este runtime é
  // string pura (sem imports). Mantê-los em SINCRONIA com types.ts: o parent clampa
  // o mirror com os mesmos números; aqui dentro lançamos QuotaExceededError ao
  // estourar (semântica do localStorage real — também didático).
  var MAX_KEYS = 500;
  var MAX_TOTAL_CHARS = 1000000;
  // Canal de reload: window.name é o ÚNICO armazenamento síncrono que sobrevive a
  // um location.reload() DENTRO deste iframe de origem opaca (o mesmo
  // browsing-context é reusado; localStorage/sessionStorage reais lançam). O jogo
  // do aluno pode chamar location.reload() (ex.: SZGame2D.restart()), e nesse caso
  // o srcdoc é re-parseado com o SEED ESTÁTICO do build — sem o window.name, tudo
  // que o aluno salvou desde o último build sumiria. Então espelhamos o store
  // "local" em window.name (namespaced por PROJECT_ID) e, no boot, PREFERIMOS ele
  // ao SEED quando o projeto bate. Leituras síncronas do aluno (getItem no topo do
  // script) rodam antes de qualquer postMessage chegar, por isso precisa ser
  // síncrono. Só ativo com PROJECT_ID (editor); o player público não semeia storage.
  function readNameSeed() {
    if (!PROJECT_ID) return null;
    try {
      var raw = window.name;
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.__szStorage && parsed.__szStorage.p === PROJECT_ID) {
        var d = parsed.__szStorage.d;
        if (d && typeof d === 'object') return d;
      }
    } catch (e) {}
    return null;
  }
  function writeName(out) {
    if (!PROJECT_ID) return;
    try { window.name = JSON.stringify({ __szStorage: { p: PROJECT_ID, d: out } }); } catch (e) {}
  }
  function makeStore(initial, persistKind) {
    var data = Object.create(null);
    if (initial) {
      for (var sk in initial) {
        if (Object.prototype.hasOwnProperty.call(initial, sk)) data[sk] = String(initial[sk]);
      }
    }
    function notify() {
      if (!persistKind) return;
      // Null-proto: preserva uma chave própria "__proto__" no snapshot.
      var out = Object.create(null);
      for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k]; }
      // Espelho de reload (window.name) é INDEPENDENTE do mirror do parent: roda
      // mesmo sem TARGET (é no-op sem PROJECT_ID). Assim o reload interno sobrevive
      // até no player, se um dia ele semear storage.
      writeName(out);
      // Sem origem conhecida da app, NÃO espelhamos o estado salvo do aluno ao parent
      // (não vazamos o snapshot a '*'). O store local segue funcionando dentro do
      // sandbox; só a persistência no parent fica desligada.
      if (TARGET === null) return;
      try {
        parent.postMessage({ source: SRC, kind: 'storageWrite', store: persistKind, projectId: PROJECT_ID, data: out, timestamp: Date.now() }, TARGET);
      } catch (e) {}
    }
    function totalChars() {
      var n = 0;
      for (var tk in data) {
        if (Object.prototype.hasOwnProperty.call(data, tk)) n += tk.length + data[tk].length;
      }
      return n;
    }
    function quotaError() {
      // Espelha o localStorage real: estourar a cota LANÇA QuotaExceededError. Onde
      // houver DOMException usamos ela (instanceof/name corretos); senão, um Error
      // com name marcado — o aluno aprende a tratar a cota como no navegador.
      try { return new DOMException('Cota do armazenamento excedida.', 'QuotaExceededError'); }
      catch (e) {
        var err = new Error('Cota do armazenamento excedida.');
        err.name = 'QuotaExceededError';
        return err;
      }
    }
    var store = {
      getItem: function (key) {
        var k = String(key);
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      setItem: function (key, value) {
        var k = String(key);
        var v = String(value);
        var existed = Object.prototype.hasOwnProperty.call(data, k);
        // Cap de quantidade: só barra CHAVE NOVA (substituir uma existente não cresce
        // a contagem). Cap de total: desconta o valor antigo da chave que será trocada.
        if (!existed && Object.keys(data).length >= MAX_KEYS) throw quotaError();
        var prevLen = existed ? data[k].length : 0;
        if (totalChars() - prevLen + k.length + v.length > MAX_TOTAL_CHARS) throw quotaError();
        data[k] = v;
        notify();
      },
      removeItem: function (key) { delete data[String(key)]; notify(); },
      clear: function () { data = Object.create(null); notify(); },
      key: function (i) {
        var ks = Object.keys(data);
        var n = Number(i);
        return (n >= 0 && n < ks.length) ? ks[n] : null;
      }
    };
    try {
      Object.defineProperty(store, 'length', {
        get: function () { return Object.keys(data).length; },
        enumerable: false
      });
    } catch (e) {}
    return store;
  }
  function install(name, store) {
    try {
      Object.defineProperty(window, name, { value: store, writable: false, configurable: true });
    } catch (e) {
      try { window[name] = store; } catch (e2) {}
    }
  }
  install('localStorage', makeStore(readNameSeed() || SEED, 'local'));
  install('sessionStorage', makeStore(null, null));
})();`
}
