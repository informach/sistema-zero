import { buildProConsoleBridgeScript } from './pro-console'
import { buildProStorageBridgeScript } from './pro-storage'

export function buildProRuntimeBridgeScript(parentOrigin: string): string {
  return `${buildProConsoleBridgeScript(parentOrigin)}\n${buildProStorageBridgeScript(parentOrigin)}\n${buildProHostBridgeScript(parentOrigin)}`
}

/** Host controls are authenticated just like storage; games opt into the audio contract. */
export function buildProHostBridgeScript(parentOrigin: string): string {
  const origin = JSON.stringify(parentOrigin).replaceAll('<', '\\u003c')
  return `(() => {
  const parentOrigin = ${origin};
  if (window.parent === window) return;
  let muted = false;
  const held = new Map();
  Object.defineProperty(window, 'szStudioHost', { configurable: false, value: Object.freeze({ get muted() { return muted; } }) });
  const sendKey = (action, key, code, repeat = false) => window.dispatchEvent(new KeyboardEvent(action, { key, code, repeat, bubbles: true }));
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
    } else if (data.type === 'sz:pro-document?' && document.readyState === 'complete') {
      window.parent.postMessage({ type: 'sz:pro-document-ready', version: 1 }, parentOrigin);
    }
  });
})();`
}
