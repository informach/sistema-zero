import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  fonte = `(async function () {
    const r = { origem: self.origin, seguro: isSecureContext, subtle: !!crypto.subtle };
    try {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('prova'));
      r.digest = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
    } catch (e) { r.erro = String(e); }
    parent.postMessage({ tag: 'mcn-sandbox-crypto', resultado: r }, '*');
  })();`,
  hash = createHash('sha256').update(fonte).digest('base64'),
  doc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; connect-src 'none';"><script>${fonte}</script>`,
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  pagina = await browser.newPage()
try {
  await pagina.route('http://127.0.0.1:5413/prova-sandbox', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }),
  )
  await pagina.goto('http://127.0.0.1:5413/prova-sandbox')
  const resultado = await pagina.evaluate(
    (srcdoc) =>
      new Promise((resolve) => {
        const iframe = document.createElement('iframe')
        iframe.setAttribute('sandbox', 'allow-scripts')
        iframe.srcdoc = srcdoc
        window.addEventListener('message', (e) => {
          if (e.source === iframe.contentWindow && e.data?.tag === 'mcn-sandbox-crypto')
            resolve(e.data.resultado)
        })
        document.body.append(iframe)
      }),
    doc,
  )
  const saida = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores')
  mkdirSync(saida, { recursive: true })
  writeFileSync(resolve(saida, 'sandbox-crypto.json'), `${JSON.stringify(resultado, null, 2)}\n`)
  assert.equal(resultado.origem, 'null')
  assert.equal(resultado.seguro, true)
  assert.equal(resultado.subtle, true)
  assert.equal(resultado.digest, createHash('sha256').update('prova').digest('hex'))
  console.log(
    'Sandbox opaco: WebCrypto e SHA-256 disponíveis, script validado por hash e rede fechada.',
  )
} finally {
  await browser.close()
}
