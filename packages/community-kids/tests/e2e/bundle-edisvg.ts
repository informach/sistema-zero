import { resolve } from 'node:path'

const [output] = process.argv.slice(2)
if (!output) throw new Error('Informe a saída da fixture.')
const result = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'fixtures/edisvg.tsx')],
  outdir: resolve(output),
  target: 'browser',
  format: 'esm',
  splitting: true,
  define: { 'process.env.NODE_ENV': '"development"' },
})
if (!result.success) throw new Error(result.logs.map((log) => log.message).join('\n'))
console.log(JSON.stringify(result.outputs.map((file) => ({ path: file.path, bytes: file.size }))))
