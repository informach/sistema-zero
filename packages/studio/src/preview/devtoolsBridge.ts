/**
 * A ponte das abas Investigar e Desempenho (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`). Só entra no documento da prévia quando a
 * criança liga a medida ou a investigação: a prévia a põe como mais um script confiável, depois
 * dos motores, com `runtimeInspection` ligado. O documento de sempre não ganha um byte (o do
 * Reino Zero está a ~57 bytes do teto de 790 000). Este módulo inteiro é baixado sob demanda.
 *
 * Desempenho: um relógio de `requestAnimationFrame` dentro do jogo conta os quadros que o
 * navegador conseguiu desenhar e o maior intervalo entre dois deles, em fatias de meio segundo.
 * Os motores que contam o que desenharam (o Jogo 2D, pelo inspetor `game-2d:observation`) mandam
 * junto quantos sprites entraram no último quadro; os outros mandam `null` ("indisponível").
 *
 * Investigar: Pausar e Continuar chamam a pausa que o Jogo 2D já tem (`SZGame2D.pauseGame` e
 * `resumeGame`), na troca de quadro. Avançar 1 quadro continua e pausa de novo no quadro seguinte:
 * a pausa do motor zera o relógio dele, então ao continuar ele roda exatamente UM quadro antes de
 * o callback daqui (registrado depois) pausar. Os valores vêm do leitor dos objetivos
 * (`instrumentCheckScript`, que a prévia aplica no script da criança só com a aba ligada), uma
 * vez a cada meio segundo com o jogo rodando e a cada comando. Quando o jogo para com erro, a
 * ponte manda as linhas do script da criança que estavam no caminho (o mesmo `__SZ_USER_JS_TAIL`
 * que o interceptor usa) e os valores daquele momento.
 *
 * String pura (vai dentro de um `<script>`): sem imports, sem crase crua. O `postMessage` leva
 * SEMPRE a origem do pai (nunca `'*'`); o editor ainda confere `ev.source`. Os comandos do editor
 * só valem vindos do `parent` (na casca, a casca, que repassa o do editor).
 */

import { instrumentCheckScript } from '../check/instrumentCheckScript'
import { investigationWindowFor, perfWindowFor } from '../state/devtools'
import {
  DEVTOOLS_COMMAND_MESSAGE,
  DEVTOOLS_MAX_PATH,
  DEVTOOLS_MAX_VALUES,
  DEVTOOLS_PERF_MESSAGE,
  DEVTOOLS_PERF_SLICE_MS,
  DEVTOOLS_STATE_MESSAGE,
  type DevtoolsCommand,
  isDevtoolsPerfMessage,
  isDevtoolsStateMessage,
} from './devtoolsMessage'

export {
  forgetInvestigationWindow,
  forgetPerfWindow,
  investigationWindowFor,
  perfWindowFor,
  sendDevtoolsCommand,
  setDevtoolsSender,
} from '../state/devtools'
export {
  DEVTOOLS_COMMAND_MESSAGE,
  DEVTOOLS_PERF_MESSAGE,
  DEVTOOLS_PERF_SLICE_MS,
  DEVTOOLS_STATE_MESSAGE,
  type DevtoolsCommand,
  type DevtoolsPerfMessage,
  type DevtoolsStateMessage,
  isDevtoolsPerfMessage,
  isDevtoolsStateMessage,
} from './devtoolsMessage'

/** Como os valores aparecem, no idioma do Estúdio (a ponte escreve o texto dentro do jogo). */
export interface DevtoolsValueLabels {
  empty: string
  yes: string
  no: string
  listOne: string
  listMany: string
  object: string
  decimal: string
}

export const PT_BR_VALUE_LABELS: DevtoolsValueLabels = {
  empty: 'vazio',
  yes: 'verdadeiro',
  no: 'falso',
  listOne: 'lista com 1 item',
  listMany: 'lista com {count} itens',
  object: 'objeto',
  decimal: ',',
}

export const EN_VALUE_LABELS: DevtoolsValueLabels = {
  empty: 'empty',
  yes: 'true',
  no: 'false',
  listOne: 'list with 1 item',
  listMany: 'list with {count} items',
  object: 'object',
  decimal: '.',
}

export interface DevtoolsBridgeOptions {
  /** A aba Desempenho ligou a medida. */
  measure?: boolean
  /** O nome do leitor de variáveis, quando a aba Investigar está ligada. */
  scope?: string
  labels?: DevtoolsValueLabels
}

/** Cada documento montado ganha um número maior que o anterior (ver `doc` nas mensagens). */
let lastDocument = 0

/** Um nome de leitor novo (`__sz` + 24 hex), no formato que `instrumentCheckScript` aceita. */
export function createInvestigationScope(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return `__sz${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** O script da criança com o leitor das variáveis (as linhas não mudam de número). */
export function instrumentForInvestigation(source: string, scope: string): string {
  return instrumentCheckScript(source, scope)
}

export function buildDevtoolsBridgeRuntime(
  parentOrigin?: string,
  options: DevtoolsBridgeOptions = { measure: true },
): string {
  const origin = JSON.stringify(parentOrigin ?? '*')
  const doc = ++lastDocument
  const measure = options.measure === true
  const scope = options.scope ? JSON.stringify(options.scope) : 'null'
  const labels = JSON.stringify(options.labels ?? PT_BR_VALUE_LABELS)
  return `(function () {
  var host = window.parent;
  if (!host || host === window) return;
  var origin = ${origin};
  var raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
  var send = host.postMessage.bind(host);
  var inspectors = window.__SZSTUDIO_RUNTIME_INSPECTORS;
  function post(message) {
    message.doc = ${doc};
    try { send(message, origin); } catch (error) {}
  }
  function lifecycle() {
    var observe = inspectors && inspectors['game-2d:observation'];
    if (typeof observe !== 'function') return null;
    try { return observe().lifecycle(); } catch (error) { return null; }
  }
  if (${measure} && raf) (function () {
    var started = false, start = 0, last = 0, frames = 0, sum = 0, slowest = 0;
    function sprites() {
      var state = lifecycle();
      var drawn = state && state.drawn;
      return typeof drawn === 'number' && drawn >= 0 && drawn % 1 === 0 ? drawn : null;
    }
    function frame(now) {
      if (started) {
        var gap = now - last;
        frames++;
        sum += gap;
        if (gap > slowest) slowest = gap;
      } else {
        started = true;
        start = now;
      }
      last = now;
      if (now - start >= ${DEVTOOLS_PERF_SLICE_MS} && frames > 0) {
        post({ type: '${DEVTOOLS_PERF_MESSAGE}', ms: now - start, frames: frames,
          frameMsAvg: sum / frames, frameMsMax: slowest, sprites: sprites(),
          canvas: !!document.querySelector('canvas') });
        start = now; frames = 0; sum = 0; slowest = 0;
      }
      raf(frame);
    }
    raf(frame);
  })();
  var scope = ${scope};
  if (!scope) return;
  var labels = ${labels};
  function number(value) {
    return String(Math.round(value * 100) / 100).split('.').join(labels.decimal);
  }
  function text(value) {
    if (value === null || value === undefined) return labels.empty;
    var kind = typeof value;
    if (kind === 'number') return number(value);
    if (kind === 'boolean') return value ? labels.yes : labels.no;
    if (kind === 'string') return JSON.stringify(value.length > 40 ? value.slice(0, 40) + '…' : value);
    if (kind === 'function' || kind === 'symbol') return null;
    if (Array.isArray(value)) return value.length === 1 ? labels.listOne : labels.listMany.split('{count}').join(String(value.length));
    if (kind === 'object') {
      try {
        if (typeof value.x === 'number' && typeof value.y === 'number') return 'x ' + number(value.x) + ' · y ' + number(value.y);
      } catch (error) {}
      return labels.object;
    }
    return null;
  }
  function values() {
    var reader = globalThis[scope], out = [];
    if (!reader || typeof reader.names !== 'function') return out;
    var names = reader.names();
    for (var i = 0; i < names.length && out.length < ${DEVTOOLS_MAX_VALUES}; i++) {
      var found = null;
      try { found = reader.get(names[i]); } catch (error) {}
      if (!found) continue;
      var shown = null;
      try { shown = text(found.v); } catch (error) {}
      if (shown) out.push({ name: String(names[i]).slice(0, 60), text: shown.slice(0, 80) });
    }
    return out;
  }
  function game() {
    var api = window.SZGame2D;
    return api && typeof api.pauseGame === 'function' && typeof api.resumeGame === 'function' ? api : null;
  }
  function report(error) {
    var state = lifecycle();
    post({ type: '${DEVTOOLS_STATE_MESSAGE}',
      frame: state && typeof state.frame === 'number' && state.frame >= 0 && state.frame % 1 === 0 ? state.frame : null,
      paused: !!(state && state.paused), canPause: !!game(), values: values(), error: error || null });
  }
  function userLines(error) {
    var tail = window.__SZ_USER_JS_TAIL, lines = [];
    if (!tail) return lines;
    var stack = String((error && error.stack) || '').split(String.fromCharCode(10));
    for (var i = 0; i < stack.length && lines.length < ${DEVTOOLS_MAX_PATH}; i++) {
      var at = stack[i].indexOf(tail + ':');
      if (at < 0) continue;
      var line = parseInt(stack[i].slice(at + tail.length + 1).split(':')[0], 10);
      if (line > 0) lines.push(line);
    }
    return lines;
  }
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (event.source !== host || !data || data.type !== '${DEVTOOLS_COMMAND_MESSAGE}') return;
    var api = game();
    if (data.cmd === 'pause' && api) api.pauseGame();
    else if (data.cmd === 'resume' && api) api.resumeGame();
    else if (data.cmd === 'step' && api && raf) {
      api.resumeGame();
      raf(function () { api.pauseGame(); report(); });
      return;
    }
    report();
  });
  var caught = window.__szReportCaughtError;
  if (typeof caught === 'function')
    window.__szReportCaughtError = function (error) {
      try { report({ lines: userLines(error) }); } catch (ignored) {}
      return caught.apply(this, arguments);
    };
  window.addEventListener('error', function (event) { report({ lines: userLines(event.error) }); });
  setInterval(function () {
    var state = lifecycle();
    if (!state || !state.paused) report();
  }, 500);
})();`
}

/**
 * Escuta o que a ponte manda, só do iframe da prévia (a referência da janela, que um jogo em
 * sandbox sem `allow-same-origin` não consegue forjar), e guarda nas janelas da instância.
 * Número de documento novo = jogo novo (as janelas recomeçam); número velho = mensagem atrasada
 * do jogo anterior, ignorada. Devolve quem desliga.
 */
export function listenToDevtools(
  source: () => Window | null | undefined,
  instance: object,
): () => void {
  let current = 0
  const fresh = (doc: number) => {
    if (doc < current) return false
    if (doc > current) {
      current = doc
      perfWindowFor(instance).getState().clear()
      investigationWindowFor(instance).getState().clear()
    }
    return true
  }
  const onMessage = (event: MessageEvent) => {
    const frame = source()
    if (!frame || event.source !== frame) return
    const data = event.data
    if (isDevtoolsPerfMessage(data)) {
      if (!fresh(data.doc)) return
      perfWindowFor(instance)
        .getState()
        .push({
          fps: (data.frames * 1000) / data.ms,
          frameMsAvg: data.frameMsAvg,
          frameMsMax: data.frameMsMax,
          sprites: data.sprites,
          canvas: data.canvas,
        })
    } else if (isDevtoolsStateMessage(data)) {
      if (!fresh(data.doc)) return
      investigationWindowFor(instance).getState().receive(data)
    }
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}

/** O mesmo que `listenToDevtools`, com o nome do lote 1 (só a medida). */
export const listenToDevtoolsPerf = listenToDevtools

/** Manda um comando ao jogo da prévia (o iframe recebe com `'*'`: a origem dele é opaca). */
export function commandMessage(cmd: DevtoolsCommand): { type: string; cmd: DevtoolsCommand } {
  return { type: DEVTOOLS_COMMAND_MESSAGE, cmd }
}
