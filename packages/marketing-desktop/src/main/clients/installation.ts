import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, open, readdir, readFile, rename, rm, statfs } from 'node:fs/promises'
import path from 'node:path'
import { x as extract } from 'tar'
import { z } from 'zod'
import type { Provider } from '../../shared/contracts'
import { collectProcess, nativeEnvironment, registerManagedClient } from '../native-client'
import { type ClientRelease, clientReleases, supportsClientInstallation } from './catalog'
import { downloadClient } from './download'

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
const fileSchema = z
  .string()
  .min(1)
  .max(400)
  .refine((value) => {
    return (
      !value.includes('\\') &&
      value
        .split('/')
        .every((part) => /^[a-zA-Z0-9_.-]+$/.test(part) && part !== '.' && part !== '..')
    )
  })
const receiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    provider: z.enum(['codex', 'claude']),
    version: z.string(),
    archiveSha256: hashSchema,
    files: z
      .array(z.object({ path: fileSchema, sha256: hashSchema }))
      .min(1)
      .max(10000),
  })
  .strict()
const selectionSchema = z
  .object({ directory: z.string().regex(/^(codex|claude)-[0-9.]+-[a-f0-9-]{36}$/) })
  .strict()
function missing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
function childPath(root: string, child: string) {
  const result = path.resolve(root, child)
  if (path.dirname(result) !== path.resolve(root))
    throw new Error('Diretório de instalação inválido.')
  return result
}
async function digest(file: string, signal?: AbortSignal) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) {
    signal?.throwIfAborted()
    hash.update(chunk)
  }
  return hash.digest('hex')
}
async function filesWithin(root: string, signal?: AbortSignal, relative = ''): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    signal?.throwIfAborted()
    const name = relative ? `${relative}/${entry.name}` : entry.name
    fileSchema.parse(name)
    if (entry.isDirectory()) files.push(...(await filesWithin(root, signal, name)))
    else if (entry.isFile()) files.push(name)
    else throw new Error('A instalação contém um vínculo ou arquivo inesperado.')
  }
  return files.sort()
}
async function durableJson(file: string, value: unknown) {
  const handle = await open(file, 'wx')
  try {
    await handle.writeFile(JSON.stringify(value))
    await handle.sync()
  } finally {
    await handle.close()
  }
}

export async function readClientInstallation(
  root: string,
  release: ClientRelease,
  signal?: AbortSignal,
) {
  const selection = selectionSchema.parse(
    JSON.parse(await readFile(childPath(root, `${release.provider}.json`), 'utf8')),
  )
  if (!selection.directory.startsWith(`${release.provider}-`))
    throw new Error('Instalação de outro cliente.')
  const directory = childPath(root, selection.directory)
  if (!(await lstat(directory)).isDirectory()) throw new Error('Diretório do cliente inválido.')
  const receiptFile = path.join(directory, 'ready.json')
  const receiptStat = await lstat(receiptFile)
  if (!receiptStat.isFile() || receiptStat.size > 2 * 1024 * 1024)
    throw new Error('Registro de instalação inválido.')
  const receipt = receiptSchema.parse(JSON.parse(await readFile(receiptFile, 'utf8')))
  if (
    receipt.provider !== release.provider ||
    receipt.version !== release.version ||
    receipt.archiveSha256 !== release.sha256
  )
    throw new Error('Instale a versão do cliente compatível com este app.')
  const files = (await filesWithin(directory, signal)).filter((file) => file !== 'ready.json')
  if (
    files.length !== receipt.files.length ||
    new Set(receipt.files.map((file) => file.path)).size !== files.length
  )
    throw new Error('Os arquivos do cliente foram alterados; repare a instalação.')
  for (const file of receipt.files) {
    if (
      !files.includes(file.path) ||
      (await digest(path.join(directory, file.path), signal)) !== file.sha256
    )
      throw new Error('O cliente foi alterado; repare a instalação pelo app.')
  }
  if (!files.includes(release.executable)) throw new Error('Executável oficial ausente.')
  return path.join(directory, release.executable)
}

/** Startup and install share the same validation, including companion binaries/resources. */
export async function initializeNativeClients(root: string) {
  if (!supportsClientInstallation()) return
  await mkdir(root, { recursive: true })
  for (const release of Object.values(clientReleases)) {
    try {
      await lstat(childPath(root, `${release.provider}.json`))
    } catch (error) {
      if (missing(error)) continue
      throw error
    }
    try {
      registerManagedClient(release.provider, {
        executable: await readClientInstallation(root, release),
        version: release.version,
      })
    } catch (error) {
      registerManagedClient(release.provider, {
        error: error instanceof Error ? error.message : 'Repare a instalação do cliente.',
      })
    }
  }
}

export async function extractClientArchive(archive: string, target: string, signal: AbortSignal) {
  let bytes = 0
  let count = 0
  let invalid = false
  await extract({
    file: archive,
    cwd: target,
    strict: true,
    preservePaths: false,
    filter: (name, entry) => {
      if (signal.aborted || invalid) return false
      const relative = name.replace(/\/$/, '')
      bytes += entry.size
      invalid =
        !fileSchema.safeParse(relative).success ||
        !('type' in entry && ['File', 'Directory'].includes(entry.type)) ||
        ++count > 10000 ||
        bytes > 1024 ** 3
      return !invalid
    },
  })
  signal.throwIfAborted()
  if (invalid)
    throw new Error('O pacote oficial contém caminhos, tipos ou tamanhos não permitidos.')
}

/** Remove abandoned downloads and unselected releases only inside this installer's root.
 * The selected release survives a failed/cancelled replacement. Other providers are untouched.
 */
export async function cleanClientInstallations(root: string, provider: Provider) {
  let selected: string | undefined
  try {
    const value: unknown = JSON.parse(await readFile(childPath(root, `${provider}.json`), 'utf8'))
    const result = selectionSchema.safeParse(value)
    if (result.success) selected = result.data.directory
  } catch (error) {
    if (!missing(error) && !(error instanceof SyntaxError)) throw error
  }
  const releasePattern = new RegExp(`^${provider}-[0-9.]+-[a-f0-9-]{36}$`)
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const abandoned = /^\.install-[a-f0-9-]{36}$/.test(entry.name)
    const unselected = releasePattern.test(entry.name) && entry.name !== selected
    const pointer = /^\.selection-[a-f0-9-]{36}\.json$/.test(entry.name)
    if ((abandoned || unselected) && entry.isDirectory())
      await rm(childPath(root, entry.name), { recursive: true })
    else if (pointer && entry.isFile()) await rm(childPath(root, entry.name))
  }
}

export async function installNativeClient(
  root: string,
  provider: Provider,
  signal: AbortSignal,
  progress: (stage: string) => void,
) {
  if (!supportsClientInstallation())
    throw new Error('A instalação pelo app está disponível para Windows x64 nesta versão.')
  signal.throwIfAborted()
  await mkdir(root, { recursive: true })
  await cleanClientInstallations(root, provider)
  const disk = await statfs(root)
  if (disk.bavail * disk.bsize < 2 * 1024 ** 3)
    throw new Error('Libere 2 GB para preparar o cliente oficial.')
  const release = clientReleases[provider]
  const staging = childPath(root, `.install-${randomUUID()}`)
  const directoryName = `${provider}-${release.version}-${randomUUID()}`
  const destination = childPath(root, directoryName)
  const pointer = childPath(root, `.selection-${randomUUID()}.json`)
  await mkdir(staging)
  try {
    const contents = path.join(staging, 'contents')
    await mkdir(contents)
    const download =
      release.archive === 'binary'
        ? path.join(contents, release.executable)
        : path.join(staging, 'package.tar.gz')
    await downloadClient(release, download, signal, (percent) =>
      progress(
        `Baixando ${provider === 'codex' ? 'Codex' : 'Claude Code'} ${release.version} · ${percent}%`,
      ),
    )
    progress('Verificando o cliente e seus componentes')
    if (release.archive === 'tar.gz') await extractClientArchive(download, contents, signal)
    const executable = path.join(contents, release.executable)
    const output = await collectProcess(
      spawn(executable, ['--version'], {
        cwd: contents,
        windowsHide: true,
        shell: false,
        stdio: 'pipe',
        env: { ...nativeEnvironment(), DISABLE_AUTOUPDATER: '1', DISABLE_UPDATES: '1' },
      }),
      30000,
      signal,
    )
    const expected =
      provider === 'codex' ? `codex-cli ${release.version}` : `${release.version} (Claude Code)`
    if (output.trim() !== expected) throw new Error('O cliente não confirmou a versão esperada.')
    const files: z.infer<typeof receiptSchema>['files'] = []
    for (const file of await filesWithin(contents, signal))
      files.push({ path: file, sha256: await digest(path.join(contents, file), signal) })
    await durableJson(path.join(contents, 'ready.json'), {
      schemaVersion: 1,
      provider,
      version: release.version,
      archiveSha256: release.sha256,
      files,
    })
    signal.throwIfAborted()
    await rename(contents, destination)
    await durableJson(pointer, { directory: directoryName })
    // Atomic selection: an interruption cannot expose a partially installed binary.
    await rename(pointer, childPath(root, `${provider}.json`))
    registerManagedClient(provider, {
      executable: path.join(destination, release.executable),
      version: release.version,
    })
    progress(`${provider === 'codex' ? 'Codex' : 'Claude Code'} instalado. Conecte sua assinatura.`)
  } finally {
    await rm(pointer, { force: true })
    // staging was created above under the installer-owned root, never a caller-supplied target.
    await rm(staging, { recursive: true, force: true })
  }
}
