import { afterAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/**
 * O worker de importação como o Next o entrega: o Turbopack troca `typeof window` por "object"
 * em todo o código do cliente, workers incluídos. Sem `window` no worker, o three quebrava ao
 * carregar e o worker não respondia nunca (a importação ficava parada em "Conferindo" no
 * staging). Aqui o worker é empacotado com a mesma troca e roda num Worker de verdade, sem
 * `window`: ele precisa responder.
 */
const pasta = mkdtempSync(join(tmpdir(), 'sz-converter-next-'))
afterAll(() => rmSync(pasta, { recursive: true, force: true }))

test('o worker de importação responde mesmo com typeof window trocado como no Next', async () => {
  const r = await Bun.build({
    entrypoints: [resolve(import.meta.dirname, '../src/importacao/converter.worker.ts')],
    target: 'browser',
    format: 'esm',
    outdir: pasta,
    plugins: [
      {
        name: 'typeof-window-como-o-next',
        setup(construtor) {
          construtor.onLoad({ filter: /\.(m?js|ts)$/ }, async (arquivo) => ({
            contents: (await Bun.file(arquivo.path).text()).replaceAll('typeof window', '"object"'),
            loader: arquivo.path.endsWith('.ts') ? 'ts' : 'js',
          }))
        },
      },
    ],
  })
  expect(r.success).toBe(true)
  const saida = r.outputs.find((o) => o.path.endsWith('.js'))!
  // A troca chegou ao three: é exatamente a guarda que quebrava.
  expect(await saida.text()).toContain('window.__THREE__')
  expect(await saida.text()).not.toContain('typeof window')

  const worker = new Worker(saida.path)
  try {
    const resposta = await new Promise<unknown>((ok, falha) => {
      const prazo = setTimeout(() => falha(Error('o worker não respondeu')), 20_000)
      worker.onmessage = (e) => {
        clearTimeout(prazo)
        ok(e.data)
      }
      worker.onerror = (e) => {
        clearTimeout(prazo)
        falha(Error(`o worker quebrou ao carregar: ${e.message}`))
      }
      worker.postMessage({ arquivos: [] })
    })
    expect(resposta).toMatchObject({ tipo: 'resultado', resultado: { modelos: [] } })
  } finally {
    worker.terminate()
  }
}, 60_000)
