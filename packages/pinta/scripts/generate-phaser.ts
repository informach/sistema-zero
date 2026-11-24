import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

export const PHASER_VERSION = '3.90.0'
export const PHASER_SHA256 = 'e92ddef111ba42e92d316979c732311757093688ea1810591cb7aa2858eba7a7'
const file = new URL('../src/export/phaser/phaser.generated.ts', import.meta.url)
const digest = (source: string) => createHash('sha256').update(source).digest('hex')
/** O Phaser embutido é o da versão fixada? Devolve o que está errado (vazio = confere). */
export async function checkPhaser(): Promise<string[]> {
  const generated = await import('../src/export/phaser/phaser.generated')
  const problems: string[] = []
  if (digest(generated.phaserSource) !== PHASER_SHA256)
    problems.push('O Phaser incluído difere do SHA-256 fixado.')
  if (
    !generated.phaserSource.includes(`v${PHASER_VERSION}`) &&
    !generated.phaserSource.includes(PHASER_VERSION)
  )
    problems.push(`O Phaser incluído não se declara ${PHASER_VERSION}.`)
  if (!generated.phaserLicense.includes('Copyright (c) 2024 Richard Davey'))
    problems.push('A licença do Phaser não é a esperada.')
  return problems
}
async function download(): Promise<void> {
  const source = await fetch(
    `https://cdn.jsdelivr.net/npm/phaser@${PHASER_VERSION}/dist/phaser.min.js`,
  ).then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  })
  const license = await fetch(
    `https://raw.githubusercontent.com/phaserjs/phaser/v${PHASER_VERSION}/LICENSE.md`,
  ).then((r) => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  })
  if (digest(source) !== PHASER_SHA256)
    throw new Error('A distribuição do Phaser não corresponde ao SHA-256 fixado.')
  await writeFile(
    file,
    `// Phaser ${PHASER_VERSION}, MIT. Gerado por scripts/generate-phaser.ts.\nexport const phaserSource=${JSON.stringify(source)}\nexport const phaserLicense=${JSON.stringify(license)}\n`,
  )
}
if (import.meta.main) {
  if (process.argv.includes('--check')) {
    const problems = await checkPhaser()
    if (problems.length) {
      console.error(problems.join('\n'))
      process.exit(1)
    }
    console.log(`Phaser ${PHASER_VERSION}: hash e licença conferem.`)
  } else await download()
}
