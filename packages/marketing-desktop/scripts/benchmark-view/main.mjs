import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'

const directory = path.dirname(fileURLToPath(import.meta.url))
async function benchmark() {
  const output = path.resolve(directory, '../../.cache/view-benchmark')
  await mkdir(output, { recursive: true })
  app.setPath('userData', path.join(output, 'profile'))
  await app.whenReady()
  const view = {
    items: Array.from({ length: 500 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      projectId: '10000000-0000-4000-8000-000000000000',
      revisionId: '20000000-0000-4000-8000-000000000000',
      kind: 'direction',
      archived: false,
      updatedAt: '2026-10-16T00:00:00.000Z',
      document: {
        schemaVersion: 1,
        kind: 'direction',
        title: `Origem ${index}`,
        body: 'Texto literal “ação” 🎨\r\n'.repeat(100),
        objective: 'Preservar',
        audience: 'Equipe',
        voice: 'Clara',
        referenceIds: [],
        protectedTerms: [],
      },
    })),
    pending: [],
    pendingBatches: [],
    resolvedDrafts: [],
    transfers: [],
    report: { phase: 'idle', message: 'Sincronizado', pending: 0, confirmedAt: null },
  }
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(directory, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })
  let current = view,
    calls = 0,
    version = 0
  ipcMain.handle('benchmark:read-view', (event, mode, knownVersion) => {
    if (event.sender !== window.webContents || !['full', 'delta'].includes(mode))
      throw new Error('Pedido fora da prova')
    if (++calls === 5) {
      const first = view.items[0]
      current = {
        ...view,
        items: [
          {
            ...first,
            revisionId: '20000000-0000-4000-8000-000000000001',
            document: { ...first.document, body: `${first.document.body}Revisão preservada` },
          },
          ...view.items.slice(1),
        ],
      }
      version++
    }
    if (mode === 'full') return current
    const { items, ...rest } = current
    return {
      changes: {
        projectId: items[0].projectId,
        version,
        reset: knownVersion === null,
        items: knownVersion === null ? items : knownVersion === version ? [] : [items[0]],
        removed: [],
      },
      ...rest,
    }
  })
  const rows = []
  try {
    await window.loadFile(path.join(directory, 'index.html'))
    window.webContents.debugger.attach('1.3')
    for (let run = 0; run < 13; run++) {
      for (const mode of ['full', 'delta']) {
        current = view
        calls = 0
        version = 0
        // GC controls the benchmark starting state only; never runs in the product.
        await window.webContents.debugger.sendCommand('HeapProfiler.collectGarbage')
        const initial = await window.webContents.debugger.sendCommand('Runtime.getHeapUsage')
        const result = await window.webContents.executeJavaScript(`(async () => {
        const start = performance.now(); let data, version = null; const items = new Map();
        for (let i=0;i<10;i++) {
          const received = await window.viewBenchmark.read('${mode}', version);
          if ('${mode}' === 'full') data = received;
          else {
            const {changes, ...rest} = received;
            if(changes.reset) items.clear();
            for(const item of changes.items) items.set(item.id, item);
            for(const id of changes.removed) items.delete(id);
            version = changes.version;
            data = {items:[...items.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0), ...rest};
          }
        }
        const elapsedMs = performance.now()-start;
        const bytes = new TextEncoder().encode(JSON.stringify(data));
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return { elapsedMs, bytes: bytes.byteLength, golden: Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('') };
      })()`)
        const heap = await window.webContents.debugger.sendCommand('Runtime.getHeapUsage')
        const memory = app
          .getAppMetrics()
          .filter((value) => value.type === 'Tab')
          .map((value) => value.memory)
        if (run >= 3) rows.push({ run: run - 3, mode, ...result, initial, heap, memory })
      }
    }
    const golden = [...new Set(rows.map((row) => row.golden))]
    if (golden.length !== 1) throw new Error('A projeção alterou o conteúdo')
    const summarize = (mode) => {
      const selected = rows.filter((row) => row.mode === mode)
      const latency = selected.map((row) => row.elapsedMs).sort((a, b) => a - b)
      return {
        p50: latency[4],
        p95: latency[9],
        maxHeapDelta: Math.max(...selected.map((row) => row.heap.usedSize - row.initial.usedSize)),
        maxPrivateBytesKiB: Math.max(
          ...selected.flatMap((row) => row.memory.map((value) => value.privateBytes)),
        ),
      }
    }
    const result = {
      warmups: 3,
      runs: 10,
      callsPerRun: 10,
      rows,
      golden,
      full: summarize('full'),
      delta: summarize('delta'),
      electron: process.versions.electron,
    }
    await writeFile(path.join(output, 'evidence.json'), JSON.stringify(result, null, 2))
    console.log(
      JSON.stringify({
        golden,
        full: result.full,
        delta: result.delta,
        bytesPerView: rows[0].bytes,
      }),
    )
  } finally {
    if (window.webContents.debugger.isAttached()) window.webContents.debugger.detach()
    window.destroy()
    app.quit()
  }
}
void benchmark().catch((error) => {
  console.error(error)
  app.exit(1)
})
