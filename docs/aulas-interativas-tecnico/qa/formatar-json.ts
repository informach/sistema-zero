import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../../..')
// Use the installed formatter directly, without resolving a package-manager command per clip.
const biome = Bun.resolveSync('@biomejs/biome/bin/biome', root)

/** Usa o mesmo formato da CI antes de comparar ou gravar um JSON gerado (índice de edição, manifesto). */
export function formatarJson(valor: unknown): string {
  const resultado = Bun.spawnSync({
    cmd: [process.execPath, biome, 'format', '--stdin-file-path', 'aula.edicao.json'],
    cwd: root,
    stdin: Buffer.from(`${JSON.stringify(valor, null, 2)}\n`),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (resultado.exitCode !== 0)
    throw new Error(`Não foi possível formatar o JSON gerado: ${resultado.stderr.toString()}`)
  // Um JSON maior que o files.maxSize do Biome (2 MB) sai vazio, com código 0: gravar isso apagaria o
  // arquivo (aconteceu com o manifesto de Moedas no caminho, 22/11/2026). Quem grava um JSON desse
  // tamanho usa o JSON.stringify puro.
  const formatado = resultado.stdout.toString()
  if (!formatado.trim())
    throw new Error(
      'O Biome não formatou o JSON (maior que o files.maxSize?): grave com JSON.stringify',
    )
  return formatado
}
