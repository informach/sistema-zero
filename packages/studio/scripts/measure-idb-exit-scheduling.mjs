import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { chromium, webkit } from '@playwright/test'

// Native browser experiment, not a product acceptance test. Missing journal in
// the shared-store control is an observation, never an excuse to green its gate.
const html = `<!doctype html><script type="module">
const params = new URLSearchParams(location.search);
const mode = params.get('mode'), suite = params.get('suite');
if (!['same-store', 'same-db-store', 'separate-db'].includes(mode)) throw Error('Invalid probe');
const prefix = 'studio-native-exit-probe-' + suite + '-' + mode;
function open(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('kv');
      request.result.createObjectStore('recovery');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const main = await open(prefix), separate = await open(prefix + '-journal');
const target = mode === 'separate-db' ? separate : main;
const store = mode === 'same-db-store' ? 'recovery' : 'kv';
let draft;
const previousLifecycle = window.name;
function trace(value) {
  const entries = window.name ? JSON.parse(window.name) : [];
  window.name = JSON.stringify([...entries.slice(-19), value]);
}
function put(db, store, key, value, label) {
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).put(value, key);
  transaction.addEventListener('complete', () => trace('complete:' + label));
  transaction.addEventListener('abort', () => trace('abort:' + label));
  transaction.commit();
  trace('commit-requested:' + label);
}
function read(db, store, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly');
    const request = transaction.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result?.revision ?? null);
    request.onerror = () => reject(request.error);
    transaction.commit();
  });
}
// Same full payload in both writes: no assets omitted to improve the result.
const payload = 'x'.repeat(4 * 1024 * 1024);
addEventListener('beforeunload', () => {
  if (!draft) return;
  trace('beforeunload');
  put(target, store, 'journal', {revision:draft, payload}, 'exit');
});
addEventListener('pagehide', () => trace('pagehide'));
window.nativeExitProbe = {
  previousLifecycle,
  start(round) {
    window.name = '[]';
    put(main, 'kv', 'project', {revision:'in-flight-' + round, payload}, 'old');
    draft = 'exit-' + round;
  },
  async read() {
    return { project: await read(main, 'kv', 'project'), journal: await read(target, store, 'journal'), previousLifecycle };
  }
};
</script>`
const server = createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(html)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Probe server did not listen')
const report = {
  method:
    'Native IDB only, 4 MiB full payload, immediate reload, no sleeps. Not product acceptance.',
  samples: [],
}
try {
  for (const [name, engine] of [
    ['chromium', chromium],
    ['webkit', webkit],
  ]) {
    const browser = await engine.launch({ headless: true })
    try {
      for (const mode of ['same-store', 'same-db-store', 'separate-db']) {
        const context = await browser.newContext()
        try {
          const page = await context.newPage()
          await page.goto(
            `http://127.0.0.1:${address.port}/?mode=${mode}&suite=${crypto.randomUUID()}`,
          )
          await page.waitForFunction(() => Boolean(window.nativeExitProbe))
          for (let round = 0; round < 12; round++) {
            await page.evaluate((round) => window.nativeExitProbe.start(round), round)
            await page.reload({ waitUntil: 'commit' })
            await page.waitForFunction(() => Boolean(window.nativeExitProbe))
            const observed = await page.evaluate(() => window.nativeExitProbe.read())
            report.samples.push({
              engine: name,
              browser: browser.version(),
              mode,
              round,
              journalMatches: observed.journal === `exit-${round}`,
              ...observed,
            })
          }
        } finally {
          await context.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
} finally {
  await mkdir('.cache/mission', { recursive: true })
  await writeFile('.cache/mission/native-idb-exit-scheduling.json', JSON.stringify(report, null, 2))
  server.close()
}
for (const engine of ['chromium', 'webkit'])
  for (const mode of ['same-store', 'same-db-store', 'separate-db']) {
    const samples = report.samples.filter(
      (sample) => sample.engine === engine && sample.mode === mode,
    )
    console.log(
      JSON.stringify({
        engine,
        mode,
        samples: samples.length,
        journalMatches: samples.filter((sample) => sample.journalMatches).length,
      }),
    )
  }
