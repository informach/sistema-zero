import { fileSystemErrorCode } from '../../components/terminal/fileSystemError'
import type { ProFileSystem } from './proFileSystem'

/**
 * Lote 6 da missão (21/11/2026): enquanto o `npm install` ainda não criou a pasta, ou com um
 * pacote sendo trocado no meio da leitura, um diretório ou arquivo some. Isso é "nada instalado
 * ainda" (a instalação terminada pede outra leitura), nunca um erro para a criança: antes, o
 * "ENOENT: no such file or directory, scandir '…/node_modules'" aparecia cru no alto do editor.
 */
const vanished = (error: unknown) =>
  ['ENOENT', 'ENOTDIR'].includes(fileSystemErrorCode(error) ?? '')

/**
 * A frase da faixa do editor quando a leitura falha. As recusas deste módulo (limites) já são
 * frases; um erro do sistema de arquivos vira uma frase e o texto técnico fica no console.
 */
export function dependencyIndexIssue(error: unknown): string {
  if (fileSystemErrorCode(error) !== null) {
    console.warn('Leitura das bibliotecas instaladas:', error)
    return 'Não consegui ler as bibliotecas instaladas agora. Elas voltam a ser lidas quando a instalação terminar.'
  }
  return error instanceof Error ? error.message : String(error)
}

/** Reads types and manifests, never evaluates package code or downloads arbitrary URLs. */
export async function readDependencyDeclarations(
  fs: Pick<ProFileSystem, 'readdir' | 'readFile'>,
  active: () => boolean,
) {
  const files: Record<string, string> = {}
  const availableFiles: string[] = []
  let queue = ['node_modules']
  const paths: string[] = []
  let nodes = 0
  while (queue.length) {
    if (!active()) throw new DOMException('Indexação cancelada.', 'AbortError')
    const batch = queue.splice(0, 12)
    const directories = await Promise.all(
      batch.map(async (directory) => {
        let entries: Awaited<ReturnType<typeof fs.readdir>>
        try {
          entries = await fs.readdir(directory, { withFileTypes: true })
        } catch (error) {
          if (vanished(error)) return []
          throw error
        }
        const children: string[] = []
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const path = `${directory}/${entry.name}`
          if (++nodes > 30_000 || path.split('/').length > 24)
            throw new Error('As dependências ultrapassaram o limite de indexação do editor.')
          if (entry.isDirectory()) {
            // Standard libraries are bundled with the supported compiler version.
            if (path !== 'node_modules/typescript/lib') children.push(path)
          } else if (
            entry.isFile() &&
            (entry.name === 'package.json' || /\.d\.[cm]?ts$/.test(entry.name))
          )
            paths.push(path)
          else if (entry.isFile() && /\.[cm]?jsx?$/.test(entry.name)) availableFiles.push(path)
        }
        return children
      }),
    )
    queue = queue.concat(directories.flat())
  }
  let total = 0
  let index = 0
  await Promise.all(
    Array.from({ length: Math.min(8, paths.length) }, async () => {
      while (index < paths.length) {
        if (!active()) throw new DOMException('Indexação cancelada.', 'AbortError')
        const path = paths[index++]!
        let content: string
        try {
          content = await fs.readFile(path, 'utf-8')
        } catch (error) {
          if (vanished(error)) continue
          throw error
        }
        total += content.length
        // Phaser 3.90 ships a single 6.21 MB declaration file. Keep a measured
        // per-file allowance without raising the total index memory budget.
        if (content.length > 8_000_000 || total > 32_000_000)
          throw new Error('Os tipos instalados ultrapassaram o limite de memória do editor.')
        files[path] = content
      }
    }),
  )
  return { files, availableFiles }
}
