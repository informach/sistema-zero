import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseStructuredCopy } from '../packages/marketing-import/src'

const root =
  'C:/Users/tocha/projects/sistema-zero/docs/marketing/kids/comunidade-dos-criadores/instagram'
const files = [
  'postagens/01-p01-a-p10.md',
  'postagens/02-p11-a-p20.md',
  'postagens/03-p21-a-p30.md',
  'postagens/09-p31-a-p40.md',
  'postagens/10-p41-a-p50.md',
  'postagens/11-p51-a-p60.md',
  'postagens/04-stories.md',
  'postagens/07-extras-para-familias.md',
  '01-destaques.md',
  '02-fixados.md',
  '04-postagens-manychat.md',
]
const result = []
for (const file of files) {
  const parsed = parseStructuredCopy(await readFile(path.join(root, file), 'utf8'))
  result.push({
    file,
    pieces: parsed.pieces.map((piece) => ({
      key: piece.key,
      format: piece.format,
      components: piece.components.length,
      main: piece.components.filter((component) => component.channel === 'main').length,
      direct: piece.components.filter((component) => component.channel === 'direct').length,
    })),
    issues: parsed.issues,
  })
}
await writeFile('.cache/structured-copy-review.json', JSON.stringify(result, null, 2))
console.log(
  JSON.stringify(
    result.map((source) => ({
      file: source.file,
      pieces: source.pieces.length,
      components: source.pieces.reduce((total, piece) => total + piece.components, 0),
      direct: source.pieces.reduce((total, piece) => total + piece.direct, 0),
      issues: source.issues,
    })),
  ),
)
