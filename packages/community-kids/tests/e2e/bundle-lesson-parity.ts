import { resolve } from 'node:path'

const [output, audience] = process.argv.slice(2)
if (!['kids', 'adult'].includes(audience ?? '')) throw Error('Informe o público do ensaio.')
if (!output) throw Error('Informe a pasta nova da fixture.')
const result = await Bun.build({
  entrypoints: [
    audience === 'kids'
      ? resolve(import.meta.dir, 'fixtures/lesson-parity.tsx')
      : resolve(import.meta.dir, '../../../community/tests/e2e/fixtures/lesson-parity.tsx'),
  ],
  outdir: resolve(output),
  target: 'browser',
  format: 'esm',
  splitting: true,
  define: { 'process.env.NODE_ENV': '"development"' },
})
if (!result.success) throw Error(result.logs.map((log) => log.message).join('\n'))
console.log(JSON.stringify(result.outputs.map((file) => ({ path: file.path, bytes: file.size }))))
