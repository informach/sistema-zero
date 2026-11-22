import {
  createExecutionObservationCodec,
  type ExecutionStep,
  type ExecutionTarget,
} from '@sistemazero/core/learning'
import {
  CLICK_TARGET_LIMITS,
  chooseTargetPoint,
  createClickTargetReaderInPage,
  readStageGeometryInPage,
  stagePointToViewport,
} from '../check/clickTargetInPage'
import { executionKeyEvent } from './keyEvent'

/**
 * O piloto de um teste da aba "Meus testes" (proposta aprovada em 20/11/2026), que roda DENTRO do
 * jogo, num quadro escondido: faz os passos e devolve o que viu, no mesmo formato e na mesma
 * ordem do executor dos objetivos do servidor (`studio-runtime/runtime/check-objectives.mjs`):
 * espera o jogo carregar (e os modelos 3D, `__szModelosPendentes`), mais 250 ms; lê o valor do
 * começo; faz os passos; espera 250 ms; lê o valor do fim. As mensagens do jogo e os erros são
 * anotados desde o começo, com os tetos do servidor (200 mensagens de até 300 caracteres).
 *
 * A diferença é a mão: lá o navegador de teste aperta teclas e clica de verdade; aqui o piloto
 * despacha a tecla (KeyboardEvent) e o clique (PointerEvent e MouseEvent), como os controles da
 * página de jogar. O clique no sprite de um grupo segue o servidor passo a passo, com as MESMAS
 * funções (`check/clickTargetInPage.ts`, injetadas pela fonte): mede o palco, lê o grupo pelo
 * inspetor oficial do Jogo 2D, escolhe um ponto só daquele sprite, confere que o palco não mudou,
 * clica e registra o ponto (o "último ponto" do contrato). Os valores saem pelo leitor das
 * variáveis (`instrumentCheckScript`, o nome sorteado em `scope`) e pelo codificador dos
 * objetivos (`createExecutionObservationCodec`, feito para ser injetado pela fonte).
 *
 * String pura (vai dentro de um `<script>`): sem imports e sem crase crua. O resultado vai ao
 * `parent` com a origem do editor; o editor confere `event.source` e o `token` deste teste.
 */

export const STUDENT_TEST_MESSAGE = 'sz:student-test'
const SETTLE_MS = 250
const MAX_CONSOLE_LINES = 200
const MAX_LINE_CHARS = 300
const MAX_VALUE_CHARS = 20_000
const MAX_TEXT_CHARS = 50_000
/** Quanto o piloto espera os modelos 3D ficarem prontos antes de começar. */
const MODELS_WAIT_MS = 10_000

export interface StudentTestDriverOptions {
  parentOrigin: string
  /** O nome do leitor das variáveis (`__sz` + 24 hex). */
  scope: string
  /** O número deste teste, que volta na resposta (resposta atrasada de outro teste é ignorada). */
  token: string
  steps: readonly ExecutionStep[]
  target: ExecutionTarget
}

export function buildStudentTestDriver(options: StudentTestDriverOptions): string {
  const steps = options.steps.map((step) =>
    step.action === 'press' ? { ...step, event: executionKeyEvent(step.key) } : step,
  )
  const plan = JSON.stringify({ steps, target: options.target })
    .replaceAll('<', '\\u003c')
    .replaceAll('`', '\\u0060')
  // O clique traz as funções do servidor só quando o teste clica.
  const clicks = options.steps.some((step) => step.action === 'clickTarget')
  const clickFunctions = clicks
    ? `var chooseTargetPoint = ${chooseTargetPoint.toString()};
  var stagePointToViewport = ${stagePointToViewport.toString()};
  var readStageGeometryInPage = ${readStageGeometryInPage.toString()};
  var createClickTargetReaderInPage = ${createClickTargetReaderInPage.toString()};`
    : ''
  return `(function () {
  var host = window.parent;
  if (!host || host === window) return;
  // O palco escondido nunca pega o foco: a moldura não tem a permissão de focar sem um gesto, e o
  // foco tirado da página é o que o teste não pode fazer. O pedido de foco do jogo (o menu do Jogo
  // 2D Avançado foca o botão "Jogar") já não fazia nada ali; agora também não chega ao navegador,
  // que registrava uma violação a cada tentativa (lote 3 da conclusão, 22/11/2026).
  try { HTMLElement.prototype.focus = function () {}; } catch (focusError) {}
  var origin = ${JSON.stringify(options.parentOrigin)};
  var token = ${JSON.stringify(options.token)};
  var scope = ${JSON.stringify(options.scope)};
  var plan = ${plan};
  var codec = (${createExecutionObservationCodec.toString()})();
  var lines = [], incomplete = false, errors = [];
  function note(args) {
    try {
      var text = Array.prototype.map.call(args, function (part) {
        return typeof part === 'string' ? part : (function () { try { return JSON.stringify(part); } catch (e) { return String(part); } })();
      }).join(' ');
      if (lines.length >= ${MAX_CONSOLE_LINES} || text.length > ${MAX_LINE_CHARS}) { incomplete = true; return; }
      lines.push(text);
    } catch (e) { incomplete = true; }
  }
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (name) {
    var original = console[name];
    console[name] = function () { note(arguments); return original.apply(console, arguments); };
  });
  function fail(error) {
    if (errors.length < 5) errors.push(String((error && error.message) || error).slice(0, 300));
  }
  window.addEventListener('error', function (event) { fail(event.error || event.message); });
  window.addEventListener('unhandledrejection', function (event) { fail(event.reason); });
  var caught = window.__szReportCaughtError;
  if (typeof caught === 'function')
    window.__szReportCaughtError = function (error) {
      fail(error);
      return caught.apply(this, arguments);
    };
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function frame() { return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); }); }
  function read(target) {
    if (target.kind === 'console') {
      if (incomplete) throw new Error('O console excedeu os limites de observação.');
      return { found: true, value: lines.join(String.fromCharCode(10)) };
    }
    if (target.kind === 'text') {
      var text = document.body ? document.body.innerText : '';
      if (text.length > ${MAX_TEXT_CHARS}) throw new Error('O texto excedeu os limites de observação.');
      return { found: true, value: text };
    }
    if (target.kind !== 'value') throw new Error('O teste não sabe olhar este alvo.');
    var parts = String(target.path).split('.');
    var reader = globalThis[scope];
    var entry = reader && typeof reader.get === 'function' ? reader.get(parts[0]) : null;
    if (!entry) return { found: false };
    var current = entry.v;
    for (var i = 1; i < parts.length; i++) {
      if (current === null || (typeof current !== 'object' && typeof current !== 'function')) return { found: false };
      current = current[parts[i]];
    }
    return { found: true, value: codec.encode(current, ${MAX_VALUE_CHARS}) };
  }
  function key(type, event) {
    var target = document.activeElement || document.body || document.documentElement;
    target.dispatchEvent(new KeyboardEvent(type, { key: event.key, code: event.code, bubbles: true, cancelable: true }));
  }
  ${clickFunctions}
  var targets = null;
  function resolveTarget(path) {
    var parts = String(path).split('.');
    if (parts.length > 4 || parts.some(function (part) { return !part || part === '__proto__' || part === 'prototype' || part === 'constructor'; }))
      throw new Error('Caminho de alvo inválido.');
    function observable(value) {
      if (!value || (typeof value !== 'object' && typeof value !== 'function'))
        throw new Error('O alvo não contém um objeto diretamente observável.');
      return value;
    }
    var value = observable(targets.ownValue(observable(targets.root(parts[0])), 'v'));
    for (var i = 1; i < parts.length; i++) value = observable(targets.ownValue(value, parts[i]));
    return value;
  }
  function pointer(type, point, element) {
    var pressed = type === 'pointerdown' || type === 'mousedown';
    var init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: point.x, clientY: point.y,
      button: 0, buttons: pressed ? 1 : 0, pointerId: 1, pointerType: 'mouse', isPrimary: true, detail: type === 'click' ? 1 : 0 };
    var Kind = type.indexOf('pointer') === 0 && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
    element.dispatchEvent(new Kind(type, init));
  }
  async function clickTarget(step) {
    if (!targets) targets = createClickTargetReaderInPage({ scope: scope, maxGroupItems: ${CLICK_TARGET_LIMITS.maxGroupItems} });
    var geometry = readStageGeometryInPage(null);
    await frame();
    await frame();
    var paths = targets.paths(step.target);
    var group = resolveTarget(paths.groupPath);
    var actor = paths.actorPath === null ? null : resolveTarget(paths.actorPath);
    var scene = targets.read(step.target, group, actor);
    var point = chooseTargetPoint(scene);
    var viewport = stagePointToViewport(point, scene, geometry);
    var current = readStageGeometryInPage(viewport);
    for (var key in geometry)
      if (current[key] !== geometry[key]) throw new Error('O palco mudou durante a observação do gesto.');
    var element = document.elementFromPoint(viewport.x, viewport.y) || document.body;
    ['pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      pointer(type, viewport, element);
    });
    targets.admit(point);
    await frame();
    await frame();
  }
  async function models() {
    var until = Date.now() + ${MODELS_WAIT_MS};
    while (Date.now() < until && Number(window.__szModelosPendentes) > 0) await wait(100);
  }
  async function startFromMenu() {
    // O Jogo 2D Avançado abre sempre no menu dele, e a partida só começa pelo botão (o Enter
    // sintético não aperta o botão focado). O teste aperta o botão principal do menu, como a
    // criança faria (o executor do servidor aperta o "Começar" dos kits do Pro do mesmo jeito).
    // Só o menu: as outras telas (fim, vitória, pausa) são o jogo e ficam como estão.
    var menu = document.querySelector('[data-szgk-screen="menu"].szgk-active');
    var button = menu && menu.querySelector('button');
    if (!button) return;
    button.click();
    await frame();
    await frame();
  }
  async function run() {
    await frame();
    await frame();
    await models();
    await startFromMenu();
    await wait(${SETTLE_MS});
    var initial = read(plan.target);
    for (var i = 0; i < plan.steps.length; i++) {
      var step = plan.steps[i];
      if (step.action === 'wait') await wait(step.ms);
      else if (step.action === 'press') {
        key('keydown', step.event);
        try { await wait(step.holdMs === undefined ? 80 : step.holdMs); }
        finally { key('keyup', step.event); }
      } else if (step.action === 'clickTarget') await clickTarget(step);
      else throw new Error('O teste não sabe fazer este passo.');
    }
    await wait(${SETTLE_MS});
    var final = read(plan.target);
    return { initial: initial, final: final };
  }
  function send(observation) {
    try { host.postMessage({ type: '${STUDENT_TEST_MESSAGE}', token: token, observation: observation }, origin); } catch (e) {}
  }
  function start() {
    run().then(function (seen) {
      send({ type: 'behavior', initial: seen.initial, final: seen.final, errors: errors });
    }, function (error) {
      send({ type: 'behavior', error: String((error && error.message) || error).slice(0, 300), errors: errors });
    });
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();`
}
