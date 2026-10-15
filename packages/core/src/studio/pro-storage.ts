import { PRO_STORAGE_LIMITS } from './pro-limits'
export const PRO_STORAGE_SOURCE = 'sz-pro-storage-v1'
export { PRO_STORAGE_LIMITS } from './pro-limits'

/** The child creates the channel; replies cannot reach a document that navigated in its place. */
export function buildProStorageBridgeScript(parentOrigin: string): string {
  return `(() => {
    if (window.szGameStorage || window.parent === window) return;
    var HOST = ${JSON.stringify(parentOrigin)};
    var SOURCE = ${JSON.stringify(PRO_STORAGE_SOURCE)};
    var binding;
    try { binding = JSON.parse(window.name).studioStorage; } catch (_) { return; }
    if (!binding || typeof binding.token !== 'string' || !/^[a-f0-9]{32}$/.test(binding.token) || typeof binding.revision !== 'number') return;
    var channel = new MessageChannel(), pending = new Map(), sequence = 0, closed = false;
    var resolveReady, rejectReady;
    var ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    // No unhandled rejection if a game does not use the bridge.
    ready.catch(() => {});
    var timer = setTimeout(() => { rejectReady(new Error('Armazenamento indisponível.')); close(); }, 10000);
    function close() { if (closed) return; closed = true; clearTimeout(timer); channel.port1.close(); rejectReady(new Error('Armazenamento encerrado.')); pending.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Armazenamento encerrado.')); }); pending.clear(); }
    channel.port1.onmessage = event => {
      var data = event.data;
      if (!data || data.source !== SOURCE || data.token !== binding.token) return;
      if (data.ready === true) { clearTimeout(timer); resolveReady(); return; }
      var item = pending.get(data.id); if (!item) return;
      pending.delete(data.id); clearTimeout(item.timer);
      if (data.ok === true) item.resolve(typeof data.value === 'string' ? data.value : null);
      else item.reject(new Error('Não foi possível guardar o progresso neste aparelho.'));
    };
    function request(operation, key, value) {
      if (operation !== 'clear' && (typeof key !== 'string' || !key.length || key.length > ${PRO_STORAGE_LIMITS.maxKeyChars})) return Promise.reject(new Error('Chave de progresso inválida.'));
      if (operation === 'set' && (typeof value !== 'string' || value.length > ${PRO_STORAGE_LIMITS.maxValueChars})) return Promise.reject(new Error('Progresso grande demais.'));
      return ready.then(() => new Promise((resolve, reject) => {
        if (closed || pending.size >= ${PRO_STORAGE_LIMITS.maxPending}) { reject(new Error('Armazenamento ocupado.')); return; }
        var id = ++sequence;
        var timeout = setTimeout(() => { pending.delete(id); reject(new Error('Armazenamento sem confirmação.')); }, 10000);
        pending.set(id, { resolve, reject, timer: timeout });
        try { channel.port1.postMessage({ source: SOURCE, token: binding.token, id, operation, key, value }); }
        catch (error) { clearTimeout(timeout); pending.delete(id); reject(error); }
      }));
    }
    Object.defineProperty(window, 'szGameStorage', { configurable: false, value: Object.freeze({
      get: key => request('get', key), set: (key, value) => request('set', key, value), remove: key => request('remove', key), clear: () => request('clear'),
    }) });
    window.addEventListener('pagehide', event => { if (!event.persisted) close(); });
    window.parent.postMessage({ source: SOURCE, token: binding.token, revision: binding.revision, hello: true }, HOST, [channel.port2]);
  })();`
}

export function proStorageBinding(token: string, revision: number): string {
  return JSON.stringify({ studioStorage: { token, revision } })
}

export function isProStorageHello(value: unknown, token: string, revision: number): boolean {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    data.source === PRO_STORAGE_SOURCE &&
    data.hello === true &&
    data.token === token &&
    data.revision === revision
  )
}

export type ProStorageRequest = {
  id: number
  operation: 'get' | 'set' | 'remove' | 'clear'
  key?: string
  value?: string
}
export function parseProStorageRequest(value: unknown, token: string): ProStorageRequest | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (
    raw.source !== PRO_STORAGE_SOURCE ||
    raw.token !== token ||
    !Number.isSafeInteger(raw.id) ||
    Number(raw.id) < 1
  )
    return null
  if (
    typeof raw.operation !== 'string' ||
    !['get', 'set', 'remove', 'clear'].includes(raw.operation)
  )
    return null
  if (
    raw.operation !== 'clear' &&
    (typeof raw.key !== 'string' ||
      !raw.key.length ||
      raw.key.length > PRO_STORAGE_LIMITS.maxKeyChars)
  )
    return null
  if (
    raw.operation === 'set' &&
    (typeof raw.value !== 'string' || raw.value.length > PRO_STORAGE_LIMITS.maxValueChars)
  )
    return null
  return {
    id: Number(raw.id),
    operation: raw.operation as ProStorageRequest['operation'],
    ...(typeof raw.key === 'string' ? { key: raw.key } : {}),
    ...(typeof raw.value === 'string' ? { value: raw.value } : {}),
  }
}

export function applyProStorageOperation(
  data: Readonly<Record<string, string>>,
  request: ProStorageRequest,
): { data: Record<string, string>; value: string | null; changed: boolean } {
  if (request.operation === 'get')
    return {
      data: data as Record<string, string>,
      value: Object.hasOwn(data, request.key!) ? data[request.key!]! : null,
      changed: false,
    }
  const next: Record<string, string> = Object.assign(
    Object.create(null),
    request.operation === 'clear' ? {} : data,
  )
  if (request.operation === 'set') next[request.key!] = request.value!
  if (request.operation === 'remove') delete next[request.key!]
  const entries = Object.entries(next)
  if (
    entries.length > PRO_STORAGE_LIMITS.maxKeys ||
    entries.reduce((sum, [key, value]) => sum + key.length + value.length, 0) >
      PRO_STORAGE_LIMITS.maxTotalChars
  )
    throw new Error('Limite do progresso excedido.')
  return { data: next, value: null, changed: true }
}
