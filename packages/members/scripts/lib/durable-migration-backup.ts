import { createHash } from 'node:crypto'
import { mkdir, open, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, 'r')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

/** Apply is qualified only for Linux filesystems supporting directory fsync. No weak fallback. */
export async function prepareDurableMigrationDirectory(path: string): Promise<string> {
  if (process.platform !== 'linux')
    throw new Error(
      'Apply exige Linux e um filesystem com fsync de diretório. Neste ambiente use dry-run; nenhuma escrita SQL foi iniciada.',
    )
  const directory = resolve(path)
  await mkdir(directory, { recursive: false })
  try {
    await syncDirectory(dirname(directory))
    await syncDirectory(directory)
  } catch (cause) {
    throw new Error(
      'O filesystem não confirmou fsync de diretório. Apply recusado antes de qualquer escrita SQL.',
      { cause },
    )
  }
  return directory
}

/** A prepared marker is written only after this file and its directory entry are synced. */
export async function writeDurableMigrationJson(directory: string, name: string, value: unknown) {
  const path = resolve(directory, name)
  if (dirname(path) !== resolve(directory))
    throw new Error('O backup precisa ficar dentro do diretório preparado.')
  const source = `${JSON.stringify(value, null, 2)}\n`
  const sha256 = createHash('sha256').update(source).digest('hex')
  const handle = await open(path, 'wx')
  try {
    await handle.writeFile(source, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await syncDirectory(directory)
  const actual = createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
  if (actual !== sha256)
    throw new Error(
      'A verificação do backup gravado não confere. Nenhuma alteração pode prosseguir.',
    )
  return { path, sha256 }
}
