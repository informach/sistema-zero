import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(fileURLToPath(new URL('../../..', import.meta.url))),
  entrada = resolve(raiz, 'packages/molda-cenarios-motor/src/compilar/portatil.ts'),
  destino = resolve(raiz, 'packages/molda-cenarios/src/exportar/runtime-three.generated.ts')
// O metafile do Bun usa caminhos relativos ao cwd, inclusive quando root é explícito.
// Fixar o diretório também torna a geração idêntica pelo script do pacote e pelo CI.
process.chdir(raiz)
if (Bun.version !== '1.3.11')
  throw Error('Gere o runtime com Bun 1.3.11, a mesma versão fixada no CI.')
const resultado = await Bun.build({
  entrypoints: [entrada],
  root: raiz,
  target: 'browser',
  format: 'esm',
  splitting: false,
  minify: true,
  sourcemap: 'none',
  packages: 'bundle',
  env: 'disable',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
})
if (!resultado.success)
  throw new AggregateError(resultado.logs, 'Não consegui empacotar o runtime Three.')
if (resultado.outputs.length !== 1 || resultado.outputs[0]!.kind !== 'entry-point')
  throw Error('O runtime portátil precisa ser um único módulo, sem dependências externas.')
const fonte = await resultado.outputs[0]!.text(),
  scan = new Bun.Transpiler({ loader: 'js' }).scan(fonte)
if (
  scan.imports.length ||
  !scan.exports.includes('carregarCenaNoThree') ||
  !scan.exports.includes('carregarCenaDoEndereco') ||
  !scan.exports.includes('iniciarExploracaoDoCenario') ||
  new TextEncoder().encode(fonte).length > 4 * 1024 * 1024 ||
  fonte.includes(raiz) ||
  fonte.includes('/@fs/')
)
  throw Error(
    'O módulo gerado contém dependências, caminhos locais ou excede o orçamento de distribuição.',
  )
if (!resultado.metafile) throw Error('O empacotador não forneceu o inventário de dependências.')
// Bun 1.3.11 retorna o objeto em memória; outras revisões descrevem esse campo como JSON.
const meta = (
    typeof resultado.metafile === 'string' ? JSON.parse(resultado.metafile) : resultado.metafile
  ) as { inputs: Record<string, unknown> },
  dependencias = new Map<
    string,
    { nome: string; versao: string; licenca: string; texto: string }
  >(),
  pastas = new Set<string>()
for (const arquivo of Object.keys(meta.inputs)) {
  let pasta = dirname(resolve(raiz, arquivo))
  if (!pasta.replaceAll('\\', '/').includes('/node_modules/')) continue
  for (;;) {
    if (pastas.has(pasta)) break
    pastas.add(pasta)
    const caminho = resolve(pasta, 'package.json')
    if (existsSync(caminho)) {
      const p = JSON.parse(readFileSync(caminho, 'utf8')) as {
        name?: string
        version?: string
        license?: string
      }
      if (p.name && p.version && !p.name.startsWith('@sistemazero/')) {
        const licenca = [
          'LICENSE',
          'LICENSE.md',
          'LICENSE.txt',
          'license',
          'license.md',
          'LICENSE-MIT',
        ]
          .map((n) => resolve(pasta, n))
          .find(existsSync)
        if (!licenca || !p.license) throw Error(`Falta a licença redistribuível de ${p.name}.`)
        const chave = `${p.name}@${p.version}`
        dependencias.set(chave, {
          nome: p.name,
          versao: p.version,
          licenca: p.license,
          texto: readFileSync(licenca, 'utf8').replaceAll('\r\n', '\n'),
        })
        break
      }
    }
    const pai = dirname(pasta)
    if (pai === pasta) break
    pasta = pai
  }
}
if (!dependencias.size) throw Error('Não identifiquei as licenças das dependências empacotadas.')
const licencas = [...dependencias.values()].sort((a, b) =>
    a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0,
  ),
  digest = createHash('sha256').update(fonte).digest('hex'),
  texto =
    `// Gerado por bun --no-env-file scripts/gerar-runtime.ts (Bun 1.3.11). Não editar.\n` +
    `export const RUNTIME_THREE_DIGEST = ${JSON.stringify(digest)}\n` +
    `export const RUNTIME_THREE_DEPENDENCIAS = ${JSON.stringify(licencas)} as const\n` +
    `export const RUNTIME_THREE_FONTE = ${JSON.stringify(fonte)}\n`
if (process.argv.includes('--check')) {
  if (!existsSync(destino) || readFileSync(destino, 'utf8').replaceAll('\r\n', '\n') !== texto)
    throw Error(
      'O runtime portátil está desatualizado. Execute bun run gerar:runtime em molda-cenarios.',
    )
  console.log(
    `Runtime conferido: ${fonte.length} caracteres, ${licencas.length} dependências, SHA-256 ${digest}.`,
  )
} else {
  writeFileSync(destino, texto, 'utf8')
  console.log(
    `Runtime gerado: ${fonte.length} caracteres, ${licencas.map((l) => `${l.nome}@${l.versao}`).join(', ')}.`,
  )
}
