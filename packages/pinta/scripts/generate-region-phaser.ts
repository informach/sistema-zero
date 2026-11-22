import { fileURLToPath } from 'node:url'

const input = new URL('../src/export/phaser/regionEntry.ts', import.meta.url)
const output = new URL('../src/export/phaser/regionPlayer.generated.ts', import.meta.url)
const built = await Bun.build({
  entrypoints: [fileURLToPath(input)],
  target: 'browser',
  format: 'iife',
  minify: { syntax: true, whitespace: true, identifiers: false },
})
if (!built.success || built.outputs.length !== 1)
  throw new Error('Não consegui compor o adaptador regional do Phaser.', { cause: built.logs })
const source = await built.outputs[0]!.text()
const literal = `'${JSON.stringify(source)
  .slice(1, -1)
  .replaceAll('\\"', '"')
  .replaceAll("'", "\\'")
  .replaceAll('${', '\\u0024{')}'`
const content =
  '// Gerado por scripts/generate-region-phaser.ts. Não editar.\n' +
  `export const regionPhaserPlayer =\n  ${literal}\n`
if (process.argv.includes('--check')) {
  if (content !== (await Bun.file(output).text()))
    throw new Error('Rode bun packages/pinta/scripts/generate-region-phaser.ts')
} else await Bun.write(output, content)
