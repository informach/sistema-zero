import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

/** Editor is explicitly selected by the local user, with argv and no shell evaluation. */
export async function editDraft(text: string, workspace: string) {
  const command = process.env.SISTEMAZERO_EDITOR
    ? z.array(z.string().min(1)).min(1).max(20).parse(JSON.parse(process.env.SISTEMAZERO_EDITOR))
    : [
        process.env.VISUAL ||
          process.env.EDITOR ||
          (process.platform === 'win32' ? 'notepad.exe' : 'vi'),
      ]
  const executable = command[0]
  if (!executable || !Bun.which(executable))
    throw new Error(
      'Editor indisponível. Configure SISTEMAZERO_EDITOR como array JSON de executable e args.',
    )
  const directory = await mkdtemp(join(tmpdir(), 'sistemazero-editor-'))
  const file = join(directory, 'draft.md')
  try {
    await writeFile(file, text, { mode: 0o600 })
    await new Promise<void>((resolve, reject) => {
      const child = spawn(executable, [...command.slice(1), file], {
        cwd: workspace,
        stdio: 'inherit',
        shell: false,
      })
      child.once('error', reject)
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(`Editor terminou com código ${code}; o rascunho anterior foi preservado`),
            ),
      )
    })
    if ((await stat(file)).size > 128000) throw new Error('Rascunho do editor excede 128 KB')
    const data = await readFile(file)
    const draft = data.toString('utf8')
    if (!Buffer.from(draft).equals(data) || data.includes(0))
      throw new Error('Editor deve produzir texto UTF-8')
    return draft
  } finally {
    await unlink(file).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
    await rmdir(directory)
  }
}
