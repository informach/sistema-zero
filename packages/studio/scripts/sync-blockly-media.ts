import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(import.meta.dir, '../../..')
const sdk = dirname(fileURLToPath(import.meta.resolve('blockly')))
const sdkMedia = join(sdk, 'media')
const metadata: unknown = JSON.parse(readFileSync(join(sdk, 'package.json'), 'utf8'))
if (
  !metadata ||
  typeof metadata !== 'object' ||
  !('version' in metadata) ||
  typeof metadata.version !== 'string'
)
  throw new Error('A versão instalada do Blockly não está disponível.')
const files = new Map(
  readdirSync(sdkMedia, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [entry.name, readFileSync(join(sdkMedia, entry.name))]),
)
files.set('LICENSE.txt', readFileSync(join(import.meta.dir, 'vendor/blockly/LICENSE.txt')))
files.set(
  'NOTICE.txt',
  Buffer.from(
    `Blockly ${metadata.version}: unmodified media from the installed, lockfile-pinned package.\n` +
      'Upstream: https://github.com/RaspberryPiFoundation/blockly\n' +
      'License: Apache-2.0 (see LICENSE.txt). Original file notices are retained.\n',
  ),
)
const hosts = [
  'packages/studio/playground/public',
  'packages/admin/public',
  'packages/community/public',
  'packages/community-kids/public',
]
const check = process.argv.includes('--check')
const drift: string[] = []
for (const host of hosts) {
  const folder = join(root, host, 'studio-blockly')
  if (!check) mkdirSync(folder, { recursive: true })
  for (const [name, bytes] of files) {
    const target = join(folder, name)
    if (check) {
      if (!existsSync(target) || !readFileSync(target).equals(bytes))
        drift.push(`${host}/studio-blockly/${name}`)
    } else writeFileSync(target, bytes)
  }
}
if (drift.length) throw new Error(`Mídia do Blockly divergente:\n${drift.join('\n')}`)
console.log(
  `${check ? 'Conferidos' : 'Copiados'} ${files.size} arquivos em ${hosts.length} hosts (Blockly ${metadata.version}).`,
)
