/**
 * Lote 7 da missão (seção 14, homologação F): a exportação conferida FORA do Estúdio, como uma
 * criança faria no computador dela. Cada projeto é exportado pelo mesmo `exportProjectSource` do
 * botão "Baixar o código", aberto numa pasta limpa e instalado e construído com o npm de verdade.
 *
 * - Com a trava (`package-lock.json`, tirada do grafo aprovado), `npm ci`; sem ela, `npm install`.
 * - O build roda DUAS vezes (pasta `dist` apagada entre elas) e os bytes têm de bater: build
 *   reproduzível na mesma máquina. Com a trava, a instalação também é a mesma em qualquer máquina.
 *
 *   bun scripts/verify-exports.ts [--templates=vanilla-js,react-ts [--with-extra]] [--output=arquivo.json]
 *
 * Sem `--templates`, confere os 14 modelos do Pro e um projeto com uma biblioteca que o grafo
 * aprovado não tem (o caminho sem trava). Rede para o registro do npm é obrigatória.
 */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { cpus, tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import { createProProject, listProTemplates } from '../src/components/code/pro-templates'
import { exportProjectSource } from '../src/export/sourceExport'

const argument = (name: string) =>
  process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3)
const chosen = argument('templates')?.split(',').filter(Boolean)
const templates = listProTemplates()
  .map((template) => template.id)
  .filter((id) => !chosen || chosen.includes(id))
if (chosen && templates.length !== chosen.length) throw new Error('Modelo desconhecido.')

async function run(command: string[], cwd: string) {
  const started = performance.now()
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (code) throw new Error(`${command.join(' ')} (saída ${code})\n${stdout}\n${stderr}`)
  return Math.round(performance.now() - started)
}

/** O conteúdo inteiro de `dist`: caminho e bytes de cada arquivo, numa impressão só. */
async function distDigest(root: string) {
  const files: string[] = []
  const walk = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else files.push(path)
    }
  }
  await walk(join(root, 'dist'))
  files.sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(relative(root, file).replaceAll('\\', '/'))
    hash.update(await readFile(file))
  }
  return { files: files.length, sha256: hash.digest('hex') }
}

async function verify(label: string, project: Awaited<ReturnType<typeof createProProject>>) {
  const root = await mkdtemp(join(tmpdir(), 'studio-export-proof-'))
  if (
    dirname(resolve(root)) !== resolve(tmpdir()) ||
    !basename(root).startsWith('studio-export-proof-')
  )
    throw new Error('Diretório temporário fora do destino de verificação.')
  try {
    const exported = await exportProjectSource(project)
    if (exported.warnings.length) throw new Error(exported.warnings.join('\n'))
    const files = unzipSync(new Uint8Array(await exported.blob.arrayBuffer()))
    for (const [path, bytes] of Object.entries(files)) {
      if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))
        throw new Error('Caminho inválido no ZIP.')
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), bytes)
    }
    const locked = 'package-lock.json' in files
    const readme = strFromU8(files['LEIA-ME.txt'] ?? new Uint8Array())
    const install = locked ? ['npm', 'ci'] : ['npm', 'install']
    if (!readme.includes(install.join(' ')))
      throw new Error(`O LEIA-ME não manda "${install.join(' ')}".`)
    const installMs = await run([...install, '--no-audit', '--no-fund'], root)
    const firstBuildMs = await run(['npm', 'run', 'build'], root)
    const first = await distDigest(root)
    if (!(await readFile(join(root, 'dist/index.html'), 'utf8')).includes('<html'))
      throw new Error('Build sem HTML.')
    await rm(join(root, 'dist'), { recursive: true, force: true })
    const secondBuildMs = await run(['npm', 'run', 'build'], root)
    const second = await distDigest(root)
    if (first.sha256 !== second.sha256)
      throw new Error(`${label}: o segundo build saiu diferente do primeiro.`)
    return {
      project: label,
      sourceFiles: Object.keys(files).length,
      lockfile: locked,
      install: install.join(' '),
      installMs,
      buildMs: [firstBuildMs, secondBuildMs],
      dist: first,
      reproducibleBuild: true,
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

const results = []
for (const id of templates) {
  results.push(await verify(id, await createProProject(`export-${id}`, id, id)))
  console.log(JSON.stringify(results.at(-1)))
}
if (!chosen || process.argv.includes('--with-extra')) {
  // Uma biblioteca que a criança instalou e o grafo aprovado não tem: sai sem trava.
  const project = await createProProject('export-extra', 'Com biblioteca', 'vanilla-js')
  const node = project.tree?.['package.json']
  if (node?.kind !== 'file') throw new Error('Modelo sem package.json.')
  const manifest = JSON.parse(node.content)
  manifest.dependencies = { ...manifest.dependencies, nanoid: '5.0.9' }
  node.content = `${JSON.stringify(manifest, null, 2)}\n`
  const main = project.tree?.['src/main.js']
  if (main?.kind !== 'file') throw new Error('Modelo sem src/main.js.')
  main.content = `import { nanoid } from 'nanoid'\n${main.content}\nconsole.log(nanoid(6))\n`
  results.push(await verify('vanilla-js + nanoid (fora do grafo aprovado)', project))
  console.log(JSON.stringify(results.at(-1)))
}

const report = {
  measuredAt: new Date().toISOString(),
  commit:
    process.env.GITHUB_SHA ?? ((await Bun.$`git rev-parse HEAD`.nothrow().text()).trim() || null),
  environment: {
    platform: process.platform,
    node: (await Bun.$`node --version`.text()).trim(),
    npm: (await Bun.$`npm --version`.text()).trim(),
    cpu: cpus()[0]?.model,
  },
  method:
    'exportProjectSource (o mesmo do "Baixar o código") → pasta limpa → npm ci (com a trava) ou npm install → npm run build duas vezes, dist apagado entre elas, impressão SHA-256 de caminhos e bytes.',
  results,
}
const output = argument('output')
if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(`Exportações conferidas: ${results.length}.`)
