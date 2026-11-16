import { basename, resolve } from 'node:path'

/** Artefato independente. O host importa o runtime publicado por URL, nunca o código do jogo. */
const saida = resolve(import.meta.dir, '../dist/cenarios')
const r = await Bun.build({
  entrypoints: [resolve(import.meta.dir, '../src/cenarios/entrada.ts')],
  outdir: saida,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  naming: { entry: 'entrada-[hash].js', chunk: 'parte-[hash].js', asset: 'arquivo-[hash].[ext]' },
  define: { 'process.env.NODE_ENV': '"production"' },
})
if (!r.success) throw Error(r.logs.join('\n'))
const entrada = r.outputs.find((o) => o.kind === 'entry-point')
if (!entrada) throw Error('Entrada ausente')
await Bun.write(
  resolve(saida, 'manifesto.json'),
  JSON.stringify(
    {
      formato: 'molda-cenarios-runtime',
      versao: 1,
      entrada: basename(entrada.path),
      arquivos: r.outputs.map((o) => ({ arquivo: basename(o.path), bytes: o.size })),
      geradoEm: new Date().toISOString(),
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    entrada: basename(entrada.path),
    arquivos: r.outputs.length,
    bytes: r.outputs.reduce((n, o) => n + o.size, 0),
  }),
)
