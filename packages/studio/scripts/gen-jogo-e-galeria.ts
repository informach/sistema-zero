/**
 * O jogo E na galeria "Ver os jogos prontos" (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026). O projeto (20 MB de modelos) não cabe no pacote do app nem no git: ele vira UM
 * arquivo `{ir, assets}` com o nome do próprio hash, que vai para o R2 do ambiente
 * (`estudio-exemplos/jogo-e/<sha256>.json`), e o Estúdio guarda só o resumo
 * (`src/examples/jogoEArquivo.generated.ts`: caminho, hash, tamanho e a capa, a foto do início
 * tirada pela própria prova do jogo E).
 *
 * Entrada: a pasta que `playground/cenarios-integration/preparar-jogo-e.ts` grava (`regioes.project.json`
 * e `olhar-inicio.png`); no CI ela vai nos artefatos do `studio-engines.yml`.
 *
 *   bun scripts/gen-jogo-e-galeria.ts [pasta]
 *
 * O arquivo sai em `.cache/galeria/estudio-exemplos/jogo-e/` para ser enviado ao R2. É uma foto
 * do jogo E: o gerador do jogo mudar não troca o arquivo publicado até rodar este de novo.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { writeGeneratedSource } from './writeGeneratedSource'

const raiz = resolve(import.meta.dir, '../../..')
const pasta = resolve(process.argv[2] ?? join(raiz, 'output/cenarios-reforma/jogo-e'))

function semIds(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(semIds)
  if (!valor || typeof valor !== 'object') return valor
  return Object.fromEntries(
    Object.entries(valor)
      .filter(([chave]) => chave !== '__id')
      .map(([chave, filho]) => [chave, semIds(filho)]),
  )
}

const projeto = JSON.parse(await readFile(join(pasta, 'regioes.project.json'), 'utf8')) as {
  ir?: Record<string, unknown>
  assets?: unknown[]
  installedExtensions?: { id: string }[]
}
if (!projeto.ir || !Array.isArray(projeto.assets) || projeto.assets.length === 0)
  throw new Error('O projeto do jogo E não tem a IR e os materiais.')
// A galeria instala as extensões pela IR (`buildProjectFromKitEntry`); o projeto do jogo E as
// guarda em `installedExtensions`.
const extensions = (projeto.installedExtensions ?? []).map((extensao) => ({
  extensionId: extensao.id,
}))
if (!extensions.some((extensao) => extensao.extensionId === 'game-3d'))
  throw new Error('O jogo E precisa do Jogo 3D.')
const ir = { ...(semIds(projeto.ir) as Record<string, unknown>), extensions }
const conteudo = Buffer.from(JSON.stringify({ ir, assets: projeto.assets }))
const sha256 = createHash('sha256').update(conteudo).digest('hex')
const destino = join(import.meta.dir, '../.cache/galeria/estudio-exemplos/jogo-e')
await mkdir(destino, { recursive: true })
await writeFile(join(destino, `${sha256}.json`), conteudo)
const capa = `data:image/png;base64,${(await readFile(join(pasta, 'olhar-inicio.png'))).toString('base64')}`
writeGeneratedSource(
  join(import.meta.dir, '../src/examples/jogoEArquivo.generated.ts'),
  `// Gerado por scripts/gen-jogo-e-galeria.ts. Não edite.
/** O arquivo do jogo E no R2 do ambiente (estudio-exemplos/<caminho>), conferido pelo hash. */
export const JOGO_E_ARQUIVO = {
  caminho: 'jogo-e/${sha256}.json',
  sha256: '${sha256}',
  bytes: ${conteudo.length},
} as const
/** A capa: a foto do início do jogo E, tirada pela própria prova dele. */
export const JOGO_E_CAPA =
  '${capa}'
`,
)
console.log(
  `jogo E: ${conteudo.length} bytes, ${projeto.assets.length} materiais, sha256 ${sha256}, capa ${capa.length}`,
)
