import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

const VERSION = '3.90.0'
const HASH = 'e92ddef111ba42e92d316979c732311757093688ea1810591cb7aa2858eba7a7'
const file = new URL('../src/export/phaser/phaser.generated.ts', import.meta.url)
const digest = (source: string) => createHash('sha256').update(source).digest('hex')
if (process.argv.includes('--check')) {
  const generated = await import('../src/export/phaser/phaser.generated')
  if (
    digest(generated.phaserSource) !== HASH ||
    !generated.phaserLicense.includes('Copyright (c) 2024 Richard Davey')
  )
    throw new Error('O Phaser incluído difere da versão fixada.')
} else {
  const source = await fetch(
    `https://cdn.jsdelivr.net/npm/phaser@${VERSION}/dist/phaser.min.js`,
  ).then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  })
  const license = await fetch(
    `https://raw.githubusercontent.com/phaserjs/phaser/v${VERSION}/LICENSE.md`,
  ).then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  })
  if (digest(source) !== HASH)
    throw new Error('A distribuição do Phaser não corresponde ao SHA-256 fixado.')
  await writeFile(
    file,
    `// Phaser ${VERSION}, MIT. Gerado por scripts/generate-phaser.ts.\nexport const phaserSource=${JSON.stringify(source)}\nexport const phaserLicense=${JSON.stringify(license)}\n`,
  )
}
