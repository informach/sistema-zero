import type { ProjectTree } from '../../../core/proProject'

const textOf = (tree: ProjectTree, path: string) => {
  const node = tree[path]
  return node?.kind === 'file' ? node.content : ''
}

/**
 * Os arquivos que mudaram entre duas árvores do Pro (a versão guardada e o projeto de agora), em
 * ordem. Um arquivo que existe de um lado só também mudou, mesmo vazio: só pelo texto, um arquivo
 * novo vazio parecia igual ao ausente, e a janela do Histórico dizia "Esta versão é igual ao
 * projeto de agora" (achado na conferência do staging, 21/11/2026).
 */
export function changedTreePaths(then: ProjectTree, now: ProjectTree): string[] {
  return [...new Set([...Object.keys(then), ...Object.keys(now)])]
    .filter(
      (path) =>
        (then[path]?.kind === 'file' || now[path]?.kind === 'file') &&
        (then[path]?.kind !== now[path]?.kind || textOf(then, path) !== textOf(now, path)),
    )
    .sort()
}

/** As duas árvores têm os mesmos caminhos, do mesmo tipo e com o mesmo texto (pastas incluídas)? */
export function sameTree(left: ProjectTree, right: ProjectTree): boolean {
  const paths = new Set([...Object.keys(left), ...Object.keys(right)])
  return [...paths].every(
    (path) => left[path]?.kind === right[path]?.kind && textOf(left, path) === textOf(right, path),
  )
}
