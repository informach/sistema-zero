// Entry do recorder rodado sob NODE (via `node --import tsx`), não Bun: o
// Playwright não conecta o pipe de debug do browser quando lançado pelo Bun
// (fd 3/4). O CLI (`src/cli.ts`, que roda sob Bun) dispara ESTE arquivo em um
// processo Node. Slug vem por argv.
import { gravarTela } from './index'

const slug = process.argv[2]
if (!slug) {
  console.error('uso: run.ts <slug-da-aula>')
  process.exit(1)
}

gravarTela(slug)
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error((e as Error).message ?? e)
    process.exit(1)
  })
