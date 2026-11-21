import { buildProConsoleBridgeScript } from './pro-console'
import { buildProStorageBridgeScript } from './pro-storage'

export function buildProRuntimeBridgeScript(parentOrigin: string): string {
  return `${buildProConsoleBridgeScript(parentOrigin)}\n${buildProStorageBridgeScript(parentOrigin)}\n${buildProHostBridgeScript(parentOrigin)}`
}

/**
 * Host controls are authenticated just like storage; games opt into the audio contract.
 *
 * As abas do Estúdio no Pro (proposta aprovada em 20/11/2026) também passam por aqui:
 * - Desempenho (`sz:perf`): desligada até o Estúdio pedir. Ligada, conta os quadros do jogo pelo
 *   `requestAnimationFrame` (o pedido de quadro passa por um contador enquanto a medida dura e
 *   volta ao do navegador ao desligar) e manda, a cada meio segundo, os quadros por segundo e o
 *   tempo de cada quadro.
 * - Investigar (`sz:pro-error`): o erro que parou o jogo, com a pilha (arquivo e linha), no
 *   máximo 20 por página. A prévia no WebContainer já recebe o erro pelo `preview-message`.
 */
export function buildProHostBridgeScript(parentOrigin: string): string {
  const origin = JSON.stringify(parentOrigin).replaceAll('<', '\\u003c')
  return `(() => {
  const parentOrigin = ${origin};
  if (window.parent === window) return;
  let muted = false;
  const held = new Map();
  Object.defineProperty(window, 'szStudioHost', { configurable: false, value: Object.freeze({ get muted() { return muted; } }) });
  const sendKey = (action, key, code, repeat = false) => window.dispatchEvent(new KeyboardEvent(action, { key, code, repeat, bubbles: true }));
  let perf = null;
  const perfStop = () => {
    if (!perf) return;
    clearInterval(perf.timer);
    window.requestAnimationFrame = perf.native;
    perf = null;
  };
  const perfStart = () => {
    perfStop();
    const native = window.requestAnimationFrame;
    const state = { native, frames: 0, total: 0, longest: 0, seen: -1, last: 0, start: performance.now(), timer: 0 };
    window.requestAnimationFrame = function (callback) {
      return native.call(window, (time) => {
        if (perf === state && time !== state.seen) {
          if (state.seen >= 0) {
            const gap = time - state.seen;
            state.frames++;
            state.total += gap;
            if (gap > state.longest) state.longest = gap;
          }
          state.seen = time;
          state.last = performance.now();
        }
        return callback(time);
      });
    };
    state.timer = setInterval(() => {
      const now = performance.now();
      const seconds = Math.max((now - state.start) / 1000, 0.001);
      const waiting = now - (state.last || state.start);
      window.parent.postMessage({
        type: 'sz:perf',
        fps: Math.min(1000, state.frames / seconds),
        frameMsAvg: Math.min(60000, state.frames ? state.total / state.frames : waiting),
        frameMsMax: Math.min(60000, Math.max(state.longest, state.frames ? 0 : waiting)),
        canvas: state.seen >= 0 || document.querySelector('canvas') !== null,
      }, parentOrigin);
      state.frames = 0;
      state.total = 0;
      state.longest = 0;
      state.start = now;
    }, 500);
    perf = state;
  };
  let errors = 0;
  const report = (message, stack) => {
    if (errors >= 20) return;
    errors++;
    window.parent.postMessage({ type: 'sz:pro-error', message: String(message || 'Erro').slice(0, 2000), stack: String(stack || '').slice(0, 4000) }, parentOrigin);
  };
  window.addEventListener('error', event => report(event.message, event.error && event.error.stack));
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    report(reason && reason.message ? reason.message : String(reason), reason && reason.stack);
  });
  const release = () => { for (const [code, key] of held) sendKey('keyup', key, code); held.clear(); };
  window.addEventListener('blur', release);
  window.addEventListener('pagehide', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'sz:gamepad') {
      if (!['keydown','keyup'].includes(data.action) || typeof data.key !== 'string' || data.key.length > 24) return;
      const code = data.code ?? (data.key === ' ' ? 'Space' : data.key);
      if (typeof code !== 'string' || !/^(Arrow(Left|Right|Up|Down)|Space|Enter|Escape|Key[A-Z]|Digit[0-9]|Shift(Left|Right))$/.test(code)) return;
      const repeat = held.has(code);
      if (data.action === 'keydown') held.set(code, data.key); else held.delete(code);
      sendKey(data.action, data.key, code, repeat);
    } else if (data.type === 'sz:audio' && typeof data.muted === 'boolean') {
      muted = data.muted;
      window.dispatchEvent(new CustomEvent('studio:host-audio', { detail: { muted } }));
    } else if (data.type === 'sz:stage?') {
      // Pro includes menus/HUD/forms around its canvas. Keep the whole document
      // responsive instead of cropping it to a single canvas aspect ratio.
      window.parent.postMessage({ type: 'sz:stage', w: 0, h: 0, responsive: true }, parentOrigin);
    } else if (data.type === 'sz:perf' && typeof data.on === 'boolean') {
      if (data.on) perfStart(); else perfStop();
    } else if (data.type === 'sz:pro-document?' && document.readyState === 'complete') {
      window.parent.postMessage({ type: 'sz:pro-document-ready', version: 1 }, parentOrigin);
    }
  });
})();`
}
