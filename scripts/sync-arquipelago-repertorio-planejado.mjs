import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const output = new URL(
  'packages/arquipelago-api/src/infrastructure/config/repertorio-planejado.json',
  root,
)
const sources = [
  ['faisca/desafio-primeiro-jogo', 'noob', 'base2d'],
  ['faisca/a-ilha-do-farol', 'noob', 'base3d'],
  ['faisca/o-jardim-secreto', 'noob', 'mission'],
  ['construtor/nave-contra-asteroides', 'coder', 'base2d'],
  ['inventor/corre-dino', 'hacker', 'base2d'],
]
const canonical = (value) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, value[key]]),
    ),
  )
const document = {
  versao: 1,
  fontes: sources.map(([course, posto, papel]) => {
    const origem = `docs/aulas-interativas/${course}/blocos.json`
    const data = JSON.parse(readFileSync(new URL(origem, root), 'utf8'))
    const blocos = [
      ...new Set([...(data.blocks ?? data['2d'] ?? []), ...(data['3d'] ?? [])]),
    ].sort()
    if (
      !blocos.length ||
      blocos.some((block) => typeof block !== 'string' || !block.startsWith('sz_'))
    )
      throw Error('Fonte de blocos inválida')
    return {
      origem,
      posto,
      papel,
      sha256: createHash('sha256').update(canonical(data)).digest('hex'),
      blocos,
    }
  }),
}
if (process.argv.includes('--write'))
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`)
else if (JSON.stringify(JSON.parse(readFileSync(output, 'utf8'))) !== JSON.stringify(document))
  throw Error('Inventário desatualizado. Execute com --write e revise as fontes.')
console.log(
  JSON.stringify({
    fontes: document.fontes.length,
    blocos: new Set(document.fontes.flatMap((source) => source.blocos)).size,
    modo: process.argv.includes('--write') ? 'gravado' : 'conferido',
  }),
)
