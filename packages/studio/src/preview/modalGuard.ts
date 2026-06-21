/**
 * Runtime injetado no `<head>` do iframe (DEPOIS do loopGuard e ANTES dos
 * runtimes de extensão e do código do aluno — é 1st-party) que LIMITA A TAXA de
 * `alert`/`confirm`/`prompt`.
 *
 * Porquê: o sandbox do preview tem `allow-modals` de PROPÓSITO — `alert` é um
 * bloco ENSINADO ("avisar"), então NÃO removemos a permissão. Mas um `while`/laço
 * que chame `alert` repetidamente (de propósito ou por engano) abriria uma
 * enxurrada de modais nativos que TRAVAM a aba (cada modal é síncrono e bloqueia
 * o thread; o loopGuard mede tempo de laço, não conta modais). A guarda deixa as
 * primeiras chamadas passarem normalmente e, ao estourar uma janela deslizante,
 * silencia o excedente: `alert`/`confirm` viram no-op e `prompt` devolve `null`.
 *
 * CONTRATO SÍNCRONO preservado: as três funções continuam retornando na hora
 * (string-ou-null no `prompt`, boolean no `confirm`), então o código do aluno que
 * faz `var nome = prompt(...)` nunca recebe um Promise nem quebra — só para de ver
 * modais quando exagera. UM `console.warn` em PT explica o corte (uma vez por
 * rajada), virando feedback didático no Console.
 *
 * Auto-contido (entra como STRING num `<script>`): sem imports nem refs externas,
 * e sem regex com barra invertida (mesma regra dos outros bridges).
 */

/** Máximo de modais permitidos dentro da janela deslizante antes de silenciar. */
const MODAL_MAX_CALLS = 5
/** Tamanho da janela deslizante (ms) — ~5 modais a cada ~3s. */
const MODAL_WINDOW_MS = 3_000

export function buildModalGuardRuntime(): string {
  return `(function () {
  var MAX = ${JSON.stringify(MODAL_MAX_CALLS)};
  var WINDOW_MS = ${JSON.stringify(MODAL_WINDOW_MS)};
  // Carimbos de tempo das chamadas recentes (janela deslizante). Capturamos o
  // relógio pristino no boot (igual ao loopGuard): o aluno não congela o tempo p/
  // burlar o limite.
  var nowFn = (typeof Date !== 'undefined' && typeof Date.now === 'function')
    ? Date.now.bind(Date)
    : function () { return 0; };
  var stamps = [];
  // Evita repetir o aviso a cada chamada silenciada: só avisa na 1ª da rajada.
  var warned = false;
  function allow() {
    var t = nowFn();
    // Descarta carimbos fora da janela (mantém só os últimos WINDOW_MS).
    var keep = [];
    for (var i = 0; i < stamps.length; i++) {
      if (t - stamps[i] < WINDOW_MS) keep.push(stamps[i]);
    }
    stamps = keep;
    if (stamps.length >= MAX) {
      if (!warned) {
        warned = true;
        try {
          console.warn('Muitas janelas (alert/confirm/prompt) seguidas foram bloqueadas para o programa não travar. Use com calma — talvez haja um aviso dentro de um laço (loop).');
        } catch (e) {}
      }
      return false;
    }
    stamps.push(t);
    // Saiu da rajada (havia espaço) → rearma o aviso p/ a próxima enxurrada.
    warned = false;
    return true;
  }
  function wrap(name, blocked) {
    var original = (typeof window !== 'undefined') ? window[name] : undefined;
    var fn = function () {
      if (!allow()) return blocked;
      // Repassa à implementação nativa preservando o retorno síncrono. Se não
      // houver nativa (ambiente exótico) devolvemos o valor de bloqueio.
      if (typeof original === 'function') {
        try { return original.apply(window, arguments); } catch (e) { return blocked; }
      }
      return blocked;
    };
    try {
      Object.defineProperty(window, name, { value: fn, writable: true, configurable: true });
    } catch (e) {
      try { window[name] = fn; } catch (e2) {}
    }
  }
  // alert/confirm bloqueados viram no-op/false; prompt devolve null (contrato real).
  wrap('alert', undefined);
  wrap('confirm', false);
  wrap('prompt', null);
})();`
}
