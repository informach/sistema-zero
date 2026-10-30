/** Usa o módulo real compilado em .cache/praia-miniaturas. Página e JS em pastas distintas. */
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const pasta = path.resolve('.cache/praia-miniaturas')
const arquivos = new Map()
for (const nome of await readdir(pasta)) {
  if (nome.endsWith('.png') || nome === 'miniaturas.mjs')
    arquivos.set(`/recursos/${nome}`, await readFile(path.join(pasta, nome)))
}
assert(arquivos.has('/recursos/miniaturas.mjs'))
const html = `<!doctype html><meta charset="utf-8"><title>Miniaturas da praia</title>
<body><script type="module">
import { MINIATURA_DA_PRAIA } from '/recursos/miniaturas.mjs';
window.resultado = await Promise.all(Object.entries(MINIATURA_DA_PRAIA).map(([id, url]) => new Promise(resolve => {
  const img = document.createElement('img'); img.alt = id;
  img.onload = () => resolve({id, ok: img.naturalWidth > 0, url: img.src});
  img.onerror = () => resolve({id, ok: false, url: img.src});
  img.src = url; img.width = 80; document.body.append(img);
})));
</script></body>`
const servidor = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
  const arquivo = arquivos.get(pathname)
  if (arquivo) {
    res.setHeader('content-type', pathname.endsWith('.mjs') ? 'text/javascript' : 'image/png')
    res.end(arquivo)
  } else if (pathname === '/aulas/exemplo/') {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(html)
  } else {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((resolve, reject) => {
  servidor.once('error', reject)
  servidor.listen(0, '127.0.0.1', resolve)
})
let browser
const terminal = setTimeout(() => {
  void browser?.close()
  servidor.closeAllConnections()
  servidor.close()
}, 60000)
try {
  browser = await chromium.launch({
    ...(process.env.ARQUIPELAGO_CHROMIUM
      ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
      : { channel: 'chrome' }),
    headless: true,
  })
  const endereco = servidor.address()
  assert(endereco && typeof endereco !== 'string')
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${endereco.port}/aulas/exemplo/`)
  await page.waitForFunction(() => Array.isArray(window.resultado))
  const resultado = await page.evaluate(() => window.resultado)
  console.log(JSON.stringify(resultado, null, 2))
  assert.equal(resultado.length, 11)
  assert.deepEqual(
    resultado.filter((p) => !p.ok),
    [],
    'Miniaturas devem resolver pela pasta do módulo',
  )
  assert(resultado.every((p) => new URL(p.url).pathname.startsWith('/recursos/')))
  console.log('PASS: onze PNGs reais, página aninhada e módulo em outra pasta')
} finally {
  clearTimeout(terminal)
  try {
    await browser?.close()
  } finally {
    servidor.closeAllConnections()
    if (servidor.listening)
      await new Promise((resolve, reject) => servidor.close((e) => (e ? reject(e) : resolve())))
  }
}
