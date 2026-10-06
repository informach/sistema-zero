/** Converte os quadros vetoriais da folha do jardim em arte embutida no Estúdio. */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JARDIM_FOLHA_VIEWBOX, JARDIM_QUADROS, lerQuadrosDaFolha } from '../src/arte/jardim-quadros'

const root = resolve(import.meta.dir, '..')
const source = resolve(root, 'src/arte/jardim-spritesheet.svg')
const target = resolve(root, 'src/arte/jardim-sprites.generated.ts')
const sheet = readFileSync(source, 'utf8')
const frames = lerQuadrosDaFolha(sheet)
const names = Object.keys(JARDIM_QUADROS) as Array<keyof typeof JARDIM_QUADROS>

if (!sheet.includes(`viewBox="${JARDIM_FOLHA_VIEWBOX}"`) || frames.size !== names.length) {
  throw new Error(
    `A folha do jardim precisa ter ${names.length} quadros de 64 × 64 em ${JARDIM_FOLHA_VIEWBOX}.`,
  )
}

const entries = names.map((name) => {
  const { x, y } = JARDIM_QUADROS[name]
  const body = frames.get(`${x},${y}`)
  if (!body) throw new Error(`Quadro vazio: ${name} (${x}, ${y})`)
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
