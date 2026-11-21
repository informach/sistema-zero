import { readFile, writeFile } from 'node:fs/promises'

/**
 * Lote 7 da missão (seção 14, "builds reproduzíveis"): o grafo de dependências APROVADO do Pro é a
 * trava do ambiente de build hospedado (`studio-runtime/runtime/package-lock.json`, versões exatas
 * e hashes de integridade de todas as plataformas). A exportação do Pro tira dele a trava do
 * projeto (`src/export/approvedDependencyLock.ts`), então o Studio guarda uma cópia, conferida no
 * CI (`--check`, dentro do `check:pro-kits`).
 */
interface LockedPackage {
  [key: string]: unknown
}
const source = new URL('../../studio-runtime/runtime/package-lock.json', import.meta.url)
const runtime = JSON.parse(await readFile(source, 'utf8')) as {
  lockfileVersion: number
  packages: Record<string, LockedPackage>
}
if (
  runtime.lockfileVersion !== 3 ||
  Object.keys(runtime.packages).some((path) => path.includes('/node_modules/'))
)
  throw new Error('O lock do runtime mudou de estrutura; revise o gerador da trava aprovada.')
// Um pacote preso a uma plataforma (`os`/`cpu`) que não é opcional quebraria a instalação nas
// outras máquinas (`EBADPLATFORM`). O recorte recalcula as marcas para cada projeto, mas um
// obrigatório preso a uma plataforma no próprio grafo seria obrigatório em qualquer recorte.
for (const [path, entry] of Object.entries(runtime.packages)) {
  if ((entry.os !== undefined || entry.cpu !== undefined) && entry.optional !== true)
    throw new Error(`Pacote preso a uma plataforma sem ser opcional no grafo aprovado: ${path}`)
  // A exportação acha cada pacote pelo NOME da pasta e pela versão (revisão final do lote 7): um
  // apelido (`name` diferente da pasta), um link ou um pacote embutido instalariam outra coisa.
  if (path !== '' && (entry.name !== undefined || entry.link === true || entry.inBundle === true))
    throw new Error(`Apelido, link ou pacote embutido no grafo aprovado: ${path}`)
}
const packages = Object.fromEntries(
  Object.entries(runtime.packages)
    .filter(([path]) => path !== '')
    .sort(([a], [b]) => a.localeCompare(b, 'en')),
)
const json = JSON.stringify(packages)
if (json.includes("'") || json.includes('\\'))
  throw new Error('A trava aprovada tem um caractere que a string gerada não guarda como está.')
const content = [
  '// Gerado por scripts/gen-pro-approved-lock.ts a partir da trava do build hospedado',
  '// (packages/studio-runtime/runtime/package-lock.json). Não edite: rode `bun run gen:pro-kits`.',
  'export const APPROVED_LOCK_PACKAGES_JSON =',
  `  '${json}'`,
  '',
].join('\n')
const destination = new URL('../src/export/approvedDependencyLock.generated.ts', import.meta.url)
if (process.argv.includes('--check')) {
  if ((await readFile(destination, 'utf8')).replaceAll('\r\n', '\n') !== content)
    throw new Error('Trava aprovada divergente do build hospedado. Execute gen:pro-kits.')
  console.log('Trava aprovada conferida.')
} else {
  await writeFile(destination, content, 'utf8')
  console.log(`Trava aprovada gravada: ${Object.keys(packages).length} pacotes.`)
}
