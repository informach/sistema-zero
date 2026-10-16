import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, rename, rm, stat, statfs } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { boundedMediaProcess } from './media-process'

const VERSION = '1.6.0'
const MODEL_HASH = '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe'
const ARCHIVE_HASH = '0f60fc3318772f4d678e0eb022b08e143d7e8f43c647c0acff5c68bb126b1b02'
async function digest(file: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
export async function speechDirectory() {
  const { app } = await import('electron')
  return path.join(app.getPath('userData'), 'speech')
}
export async function speechEngine(root: string) {
  const directory = path.join(root, `whisper-${VERSION}`)
  const executable = path.join(directory, 'main.exe'),
    model = path.join(directory, 'ggml-base.bin')
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error(
      'A instalação de transcrição local desta versão está disponível para Windows x64',
    )
  const receipt = z
    .object({ executableSha256: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(JSON.parse(await readFile(path.join(directory, 'ready.json'), 'utf8')))
  if (
    !receipt.executableSha256 ||
    (await digest(executable)) !== receipt.executableSha256 ||
    (await digest(model)) !== MODEL_HASH
  )
    throw new Error(
      'A instalação de transcrição precisa ser reparada nas ferramentas do computador',
    )
  return { executable, model, version: VERSION, modelSha256: MODEL_HASH }
}
async function download(
  url: string,
  file: string,
  bytes: number,
  sha256: string,
  signal: AbortSignal,
  progress: (value: number) => void,
) {
  const response = await fetch(url, { signal })
  if (!response.ok || !response.body || !response.url.startsWith('https:'))
    throw new Error('Não foi possível baixar a ferramenta oficial')
  const handle = await open(file, 'wx'),
    reader = response.body.getReader(),
    hash = createHash('sha256')
  let received = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      received += chunk.value.length
      if (received > bytes) throw new Error('O download excedeu o tamanho publicado')
      hash.update(chunk.value)
      let offset = 0
      while (offset < chunk.value.length) {
        const written = await handle.write(chunk.value, offset, chunk.value.length - offset)
        if (!written.bytesWritten) throw new Error('Não foi possível gravar o download')
        offset += written.bytesWritten
      }
      progress(received / bytes)
    }
    if (received !== bytes || hash.digest('hex') !== sha256)
      throw new Error('O download não corresponde à versão verificada')
    await handle.sync()
  } finally {
    try {
      await reader.cancel()
    } finally {
      await handle.close()
    }
  }
}
export async function installSpeechEngine(
  root: string,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  signal.throwIfAborted()
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('Instalação disponível para Windows x64 nesta versão')
  await mkdir(root, { recursive: true })
  const disk = await statfs(root)
  if (disk.bavail * disk.bsize < 500 * 1024 * 1024)
    throw new Error('Libere 500 MB para instalar a transcrição local')
  const staging = path.join(root, `install-${randomUUID()}`),
    target = path.join(root, `whisper-${VERSION}`)
  // Only paths wholly owned by this installer can be replaced or recursively removed.
  if (
    path.dirname(path.resolve(staging)) !== path.resolve(root) ||
    path.dirname(path.resolve(target)) !== path.resolve(root)
  )
    throw new Error('Diretório de instalação inválido')
  await mkdir(staging)
  try {
    const archive = path.join(staging, 'engine.zip'),
      engine = path.join(staging, 'engine')
    progress('Baixando Whisper.cpp verificado')
    await download(
      `https://github.com/ggml-org/whisper.cpp/releases/download/v${VERSION}/whisper-bin-x64.zip`,
      archive,
      2249966,
      ARCHIVE_HASH,
      signal,
      () => {},
    )
    await mkdir(engine)
    // Literal path arguments encoded as UTF-16 PowerShell source; values are single-quoted safely.
    const literal = (value: string) => `'${value.replaceAll("'", "''")}'`
    const command = `Expand-Archive -LiteralPath ${literal(archive)} -DestinationPath ${literal(engine)} -ErrorAction Stop`
    const systemRoot = process.env.SystemRoot
    if (!systemRoot || !path.isAbsolute(systemRoot))
      throw new Error('Pasta do Windows não identificada')
    await boundedMediaProcess(
      path.join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(command, 'utf16le').toString('base64'),
      ],
      signal,
    )
    await stat(path.join(engine, 'main.exe'))
    await download(
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      path.join(engine, 'ggml-base.bin'),
      147951465,
      MODEL_HASH,
      signal,
      (value) => progress(`Instalando modelo de transcrição · ${Math.floor(value * 100)}%`),
    )
    const receipt = await open(path.join(engine, 'ready.json'), 'wx')
    try {
      await receipt.writeFile(
        JSON.stringify({
          version: VERSION,
          modelSha256: MODEL_HASH,
          executableSha256: await digest(path.join(engine, 'main.exe')),
        }),
      )
      await receipt.sync()
    } finally {
      await receipt.close()
    }
    signal.throwIfAborted()
    // Preserve the previous installation until the complete replacement has passed verification.
    const previous = path.join(root, `previous-${randomUUID()}`)
    let old = false
    try {
      await rename(target, previous)
      old = true
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    try {
      await rename(engine, target)
    } catch (error) {
      if (old) await rename(previous, target)
      throw error
    }
    if (old && path.dirname(path.resolve(previous)) === path.resolve(root))
      await rm(previous, { recursive: true })
    progress('Transcrição local instalada')
    return await speechEngine(root)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}
