import { resolve } from 'node:path'

const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'meu-jeito-preview.tsx')],
  target: 'browser',
  minify: true,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!bundle.success || !bundle.outputs[0]) throw new Error(bundle.logs.join('\n'))
const javascript = await bundle.outputs[0].text()
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.MEU_JEITO_PREVIEW_PORT ?? 4322),
  fetch(request) {
    if (new URL(request.url).pathname === '/app.js')
      return new Response(javascript, { headers: { 'content-type': 'text/javascript' } })
    return new Response(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ensaio Meu Jeito</title><style>body{margin:0;background:#f5f2e9;color:#20323c;font:16px/1.5 sans-serif}*{box-sizing:border-box}button,select{font:inherit;min-height:44px;max-width:100%;margin:4px 0}iframe{width:100%;border:0}fieldset{border:1px solid #789;border-radius:12px}input{margin-right:8px}</style><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log(`Preview local: ${server.url}`)
