import { fileURLToPath } from 'node:url'

/**
 * Grava um manifesto gerado já no formato do Biome (revisão de 30/10/2026): o `JSON.stringify`
 * abre as listas curtas em várias linhas, o lint reprovava os arquivos e formatar à mão era
 * desfeito na geração seguinte. Mesmo caminho do `regras-a-completar.ts`.
 */
export async function gravarManifesto(destino: URL, valor: unknown): Promise<void> {
  await Bun.write(destino, `${JSON.stringify(valor, null, 2)}\n`)
  const formatar = Bun.spawn(['bunx', 'biome', 'format', '--write', fileURLToPath(destino)], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    stdout: 'ignore',
    stderr: 'inherit',
  })
  if ((await formatar.exited) !== 0)
    throw new Error(`Não foi possível formatar ${fileURLToPath(destino)}.`)
}
