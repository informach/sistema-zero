/** Converte os seis quadros vetoriais do Pinta em arte embutida no Estúdio. */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const source = resolve(root, 'src/arte/jardim-spritesheet.svg')
const target = resolve(root, 'src/arte/jardim-sprites.generated.ts')
const sheet = readFileSync(source, 'utf8')
const frames = [
  ...sheet.matchAll(
    /<svg x="\d+" y="0" width="64" height="64" viewBox="0 0 64 64">([\s\S]*?)<\/svg>/g,
  ),
]

if (frames.length !== 6 || !sheet.includes('viewBox="0 0 384 64"')) {
  throw new Error('A folha do Pinta precisa ter seis quadros de 64 × 64.')
}

const names = ['coruja', 'pedras', 'arbusto', 'flores', 'raposa', 'coelho'] as const
const entries = names.map((name, index) => {
  const body = frames[index]?.[1]?.trim()
  if (!body) throw new Error(`Quadro vazio: ${name}`)
  return `  ${name}: ${JSON.stringify(body)},`
})

writeFileSync(
  target,
  `/** Gerado de jardim-spritesheet.svg por scripts/gerar-jardim-sprites.ts. */\nexport const JARDIM_SPRITE_BODIES = {\n${entries.join('\n')}\n} as const\n`,
)
const formatted = spawnSync(process.execPath, ['x', 'biome', 'format', '--write', target], {
  cwd: root,
  stdio: 'inherit',
})
if (formatted.error || formatted.status !== 0)
  throw new Error(
    `Falha ao formatar sprites gerados: ${formatted.error?.message ?? formatted.status}`,
  )
console.log(target)
