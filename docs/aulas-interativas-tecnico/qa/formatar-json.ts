import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../../..')
// Use the installed formatter directly, without resolving a package-manager command per clip.
const biome = Bun.resolveSync('@biomejs/biome/bin/biome', root)

/** Usa o mesmo formato da CI antes de comparar ou gravar o índice de edição. */
export function formatarJson(valor: unknown): string {
  const resultado = Bun.spawnSync({
    cmd: [process.execPath, biome, 'format', '--stdin-file-path', 'aula.edicao.json'],
    cwd: root,
    stdin: Buffer.from(`${JSON.stringify(valor, null, 2)}\n`),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (resultado.exitCode !== 0)
    throw new Error(`Não foi possível formatar o índice de edição: ${resultado.stderr.toString()}`)
  return resultado.stdout.toString()
}
