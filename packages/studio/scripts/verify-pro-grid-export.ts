import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_PRO_ARTIFACT_LIMITS, STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio'
import { unzipSync } from 'fflate'
import { parseBuildRequest } from '../../studio-runtime/src/contracts'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createProProject } from '../src/components/code/pro-templates'
import { exportProjectSource } from '../src/export/sourceExport'

const runtime = fileURLToPath(new URL('../../studio-runtime/runtime/', import.meta.url))
const evidence: unknown[] = []
for (const id of ['canvas-grid-arena', 'phaser-tactics', 'three-tactics']) {
  const root = await mkdtemp(join(tmpdir(), 'studio-grid-export-'))
  try {
    const exported = await exportProjectSource(await createProProject('grid-export-proof', id, id))
    if (exported.warnings.length) throw new Error(exported.warnings.join('\n'))
    const zip = new Uint8Array(await exported.blob.arrayBuffer())
    for (const [path, bytes] of Object.entries(unzipSync(zip))) {
      if (
        path.startsWith('/') ||
        path.includes('\\') ||
        path.split('/').some((part) => part === '..')
      )
        throw new Error('ZIP inválido.')
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), bytes)
    }
    const { files, binaries } = await materializeTestTemplate(id)
    const request = {
      executionId: 'grid-proof-1234567890abcdef',
      templateId: id,
      files,
      binaries,
      parentOrigin: 'https://kids.test',
      validate: true,
    }
    parseBuildRequest(request)
    const envelopeBytes = Buffer.byteLength(JSON.stringify(request))
    if (envelopeBytes > STUDIO_PRO_BUILD_LIMITS.maxRequestBytes)
      throw new Error('Envelope excessivo.')
    const run = async (command: string[]) => {
      const child = Bun.spawn(command, { cwd: root, stdout: 'pipe', stderr: 'pipe' })
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      if (code !== 0) throw new Error(`${id}: ${command.join(' ')}\n${stdout}\n${stderr}`)
    }
    const lock = await readFile(join(root, 'package-lock.json'), 'utf8')
    await run(['npm', 'ci', '--no-audit', '--no-fund'])
    await run(['npm', 'ls', '--all'])
    await run(['npm', 'run', 'typecheck'])
    await run(['npm', 'run', 'build'])
    if ((await readFile(join(root, 'package-lock.json'), 'utf8')) !== lock)
      throw new Error('Lock mudou durante a instalação.')
    await writeFile(join(root, 'artifact-options.json'), JSON.stringify({ consoleBridge: '' }))
    await writeFile(join(root, 'validation-options.json'), JSON.stringify({ templateId: id }))
    await run([
      'node',
      join(runtime, 'pack-artifact.mjs'),
      String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
      String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
    ])
    await run(['node', join(runtime, 'playtest.mjs')])
    const manifest = JSON.parse(await readFile(join(root, 'artifact-manifest.json'), 'utf8')) as {
      files: Array<{ bytes: number }>
    }
    const capture = (await readFile(join(root, 'dist/__studio-proof.png'))).byteLength
    const artifactBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0)
    if (artifactBytes + capture > STUDIO_PRO_ARTIFACT_LIMITS.maxBytes)
      throw new Error('Captura e artefato excederam o limite.')
    const result = {
      id,
      envelopeBytes,
      zipBytes: zip.byteLength,
      sources: Object.keys(files).length,
      assets: Object.keys(binaries).length,
      artifactBytes,
      captureBytes: capture,
      independentNpmCi: true,
      lockUnchanged: true,
      playtest: JSON.parse(await readFile(join(root, 'playtest-result.json'), 'utf8')),
    }
    evidence.push(result)
    console.log(JSON.stringify(result))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
const output = new URL('../../../.cache/studio-grid-export-evidence.json', import.meta.url)
await mkdir(dirname(fileURLToPath(output)), { recursive: true })
await writeFile(output, JSON.stringify({ measuredAt: new Date().toISOString(), evidence }, null, 2))
