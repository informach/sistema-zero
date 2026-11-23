/**
 * O jogo E na galeria "Ver os jogos prontos" (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026). O projeto (20 MB de modelos) não cabe no pacote do app nem no git: ele vira UM
 * arquivo `{ir, assets}` com o nome do próprio hash, que vai para o R2 do ambiente
 * (`estudio-exemplos/jogo-e/<sha256>.json`), e o Estúdio guarda só o resumo
 * (`src/examples/jogoEArquivo.generated.ts`: caminho, hash, tamanho e a capa, a foto do início
 * tirada pela própria prova do jogo E).
 *
 * Entrada: a pasta que `playground/cenarios-integration/preparar-jogo-e.ts` grava
 * (`regioes.project.json`, `regioes.programa.js` e `olhar-inicio.png`); no CI ela vai nos
 * artefatos do `studio-engines.yml`.
 *
 * ⚠️ O projeto do jogo E é do modo Ponte: o programa mora no CÓDIGO (`files['script.js']`), e a
 * `ir` e o `blocksState` dele ficam vazios. A galeria abre o exemplo pela IR, então ela é montada
 * aqui a partir do programa da galeria (`regioes.programa.js`, o código regerado dos blocos, sem a
 * ponte de ensaio), como o gerador do jogo D faz. O primeiro arquivo levou a `ir` vazia e o
 * Estúdio abria um projeto em branco (conferência logada no staging, 22/11/2026).
 *
 *   bun scripts/gen-jogo-e-galeria.ts [pasta]
 *
 * O arquivo sai em `.cache/galeria/estudio-exemplos/jogo-e/` para ser enviado ao R2. É uma foto
 * do jogo E: o gerador do jogo mudar não troca o arquivo publicado até rodar este de novo.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import { parseProjectFilesFromParts } from '../src/parsers/project'
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
const programa = await readFile(join(pasta, 'regioes.programa.js'), 'utf8')
const montada = parseProjectFilesFromParts({
  html: [{ type: 'canvas', id: 'tela', width: 960, height: 600 }] as never,
  cssSource: '',
  jsSource: programa,
}).ir
if (JSON.stringify(montada).includes('"rawJS"'))
  throw new Error('O programa do jogo E saiu como código cru.')
const ir = { ...(semIds(montada) as Record<string, unknown>), extensions }
const comportamento = (ir as { behavior?: Record<string, unknown> }).behavior ?? {}
if (!Object.values(comportamento).some((lista) => Array.isArray(lista) && lista.length > 0))
  throw new Error('A IR do jogo E saiu sem programa.')
const conteudo = Buffer.from(JSON.stringify({ ir, assets: projeto.assets }))
const sha256 = createHash('sha256').update(conteudo).digest('hex')
const destino = join(import.meta.dir, '../.cache/galeria/estudio-exemplos/jogo-e')
await mkdir(destino, { recursive: true })
await writeFile(join(destino, `${sha256}.json`), conteudo)
// A foto da prova tem 1280 x 720; a capa do card vai em 640 x 360 (JPEG), leve para a galeria.
const foto = await sharp(await readFile(join(pasta, 'olhar-inicio.png')))
  .resize(640, 360)
  .jpeg({ quality: 82 })
  .toBuffer()
const capa = `data:image/jpeg;base64,${foto.toString('base64')}`
writeGeneratedSource(
  join(import.meta.dir, '../src/examples/jogoEArquivo.generated.ts'),
  `// Gerado por scripts/gen-jogo-e-galeria.ts. Não edite.
/** O arquivo do jogo E no R2 do ambiente (estudio-exemplos/<caminho>), conferido pelo hash. */
export const JOGO_E_ARQUIVO = {
  caminho: 'jogo-e/${sha256}.json',
  sha256: '${sha256}',
  bytes: ${conteudo.length},
} as const
/** A capa: a foto da Floresta, tirada pela própria prova do jogo E (e2e/engine-regions.spec.ts). */
export const JOGO_E_CAPA =
  '${capa}'
`,
)
console.log(
  `jogo E: ${conteudo.length} bytes, ${projeto.assets.length} materiais, sha256 ${sha256}, capa ${capa.length}`,
)
