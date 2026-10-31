import { fileURLToPath } from 'node:url'

/**
 * Grava o manifesto e passa o Biome por cima, como o `repertorio-local.ts`: o `JSON.stringify`
 * abre em várias linhas as listas curtas de texto (os parâmetros de uma função, por exemplo) que o
 * Biome junta numa linha só, e o `biome ci` da CI recusaria o arquivo gerado. Os testes comparam o
 * conteúdo (`.json()`), não o texto.
 */
export async function gravarManifesto(destino: URL, manifesto: unknown): Promise<void> {
  await Bun.write(destino, `${JSON.stringify(manifesto, null, 2)}\n`)
  const formatar = Bun.spawn(['bunx', 'biome', 'format', '--write', fileURLToPath(destino)], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await formatar.exited) !== 0) throw new Error('Não foi possível formatar o manifesto.')
}
