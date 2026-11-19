import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`,
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage(),
  erros = []
pagina.on('pageerror', (e) => erros.push(e.message))
try {
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  const r = await pagina.evaluate(
    async (u) => {
      const { readZipFiles } = await import(u.leitor),
        { digestDosBytes } = await import(u.core),
        bytes = new Uint8Array(await (await fetch(u.zip)).arrayBuffer()),
        file = new File([bytes], 'cenario.zip'),
        inicio = performance.now(),
        r = await readZipFiles(file, { maxBytes: 300 * 1024 * 1024, maxEntries: 100 }),
        ms = performance.now() - inicio
      if (!r.ok) throw Error(`O ZIP não reabriu: ${r.reason}`)
      const manifesto = r.files.find((f) => f.path === 'cenario.json'),
        cena = JSON.parse(new TextDecoder().decode(manifesto.bytes)),
        porCaminho = new Map(r.files.map((f) => [f.path, f.bytes]))
      for (const a of cena.arquivos)
        if ((await digestDosBytes(porCaminho.get(a.caminho))) !== a.digest)
          throw Error('Conteúdo do ZIP diferente do manifesto')
      const copia = bytes.slice(),
        v = new DataView(copia.buffer),
        eocd = copia.length - 22,
        central = v.getUint32(eocd + 16, true)
      if (v.getUint32(eocd, true) !== 0x06054b50 || v.getUint32(central, true) !== 0x02014b50)
        throw Error('Envelope ZIP inesperado')
      v.setUint32(central + 16, v.getUint32(central + 16, true) ^ 1, true)
      const crc = await readZipFiles(new File([copia], 'invalido.zip'), {
          maxBytes: 300 * 1024 * 1024,
          maxEntries: 100,
        }),
        orcamento = await readZipFiles(file, { maxBytes: 100, maxEntries: 100 })
      if (
        crc.ok ||
        crc.reason !== 'invalid-zip' ||
        orcamento.ok ||
        orcamento.reason !== 'too-large'
      )
        throw Error('O leitor deixou de conferir CRC ou orçamento')
      return {
        arquivos: r.files.length,
        recursosConferidos: cena.arquivos.length,
        ms,
        crcRecusado: true,
        orcamentoRecusado: true,
      }
    },
    {
      leitor: modulo('packages/molda/src/export/backupFile.ts'),
      core: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      zip: modulo('output/cenarios-reforma/lote8-portatil/cenario.zip'),
    },
  )
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(raiz, 'output/cenarios-reforma/lote8-portatil/leitura-browser.json'),
    JSON.stringify(r, null, 2),
  )
  console.log(JSON.stringify(r))
} finally {
  await browser.close()
}
