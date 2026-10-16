import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { unzipSync } from 'fflate'
import { createProProject } from '../src/components/code/pro-templates'
import { createEmptyProject } from '../src/core/project'
import { exportProjectSource } from '../src/export/sourceExport'
import { convertClassicToProTree } from '../src/state/convertToPro'

const classic = createEmptyProject('converted-proof', 'Convertido')
classic.mode = 'code'
classic.files['script.js'] = 'document.body.dataset.proof = "converted-source"'
const converted = {
  ...classic,
  kind: 'pro' as const,
  tree: await convertClassicToProTree(classic),
  proMeta: {
    templateId: 'vanilla-vite',
    devScript: 'dev',
    origin: { projectId: classic.id, revision: classic.updatedAt },
  },
}
const projects = [await createProProject('react-proof', 'React', 'react-ts'), converted]
const evidence = []
for (const project of projects) {
  const root = await mkdtemp(join(tmpdir(), 'studio-source-export-'))
  const result = await exportProjectSource(project)
  if (result.warnings.length) throw new Error(result.warnings.join('\n'))
  const files = unzipSync(new Uint8Array(await result.blob.arrayBuffer()))
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))
      throw new Error('Caminho inválido no ZIP.')
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), bytes)
  }
  const commands = [
    ['npm', 'install', '--no-audit', '--no-fund'],
    ['npm', 'run', 'build'],
  ]
  for (const command of commands) {
    const child = Bun.spawn(command, { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    if (code) throw new Error(`${command.join(' ')}\n${stdout}\n${stderr}`)
  }
  const index = await readFile(join(root, 'dist/index.html'), 'utf8')
  if (!index.includes('<html')) throw new Error('Build sem HTML.')
  evidence.push({
    project: project.name,
    root,
    commands,
    sourceFiles: Object.keys(files).length,
    independentInstallation: true,
    built: true,
  })
}
await writeFile(
  new URL('../../../.audits/studio-pro-evolution/additional-exports.json', import.meta.url),
  `${JSON.stringify(evidence, null, 2)}\n`,
)
console.log(JSON.stringify(evidence))
