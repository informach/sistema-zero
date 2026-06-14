/**
 * Diff PURO entre dois snapshots planos (path → conteúdo) do FS do projeto
 * profissional. É o cálculo que o sincronizador único (`useWebContainerSync`)
 * usa para decidir o que escrever/remover/criar no WebContainer. Extraído para
 * cá para ser testável em bun sem o runtime real.
 */

export interface FsDiff {
  /** Arquivos a (re)escrever — novos ou com conteúdo alterado. */
  writes: Array<{ path: string; content: string }>
  /** Arquivos que sumiram do snapshot novo e devem ser removidos. */
  removes: string[]
  /** Pastas-pai a garantir (mkdir recursivo) antes de escrever arquivos NOVOS. */
  mkdirs: string[]
  /**
   * Pastas que existiam (como pai de algum arquivo do snapshot antigo) e ficaram
   * SEM nenhum arquivo descendente no snapshot novo — devem ser removidas
   * (recursivamente) para não deixar diretórios fantasmas no FS após apagar o
   * último arquivo dentro deles. Ordenadas da mais profunda para a mais rasa.
   */
  rmdirs: string[]
}

function parentDirsOf(path: string): string[] {
  const segments = path.split('/')
  const dirs: string[] = []
  for (let i = 1; i < segments.length; i++) dirs.push(segments.slice(0, i).join('/'))
  return dirs
}

/** Conjunto de diretórios que contêm (em qualquer nível) ao menos um arquivo. */
function dirsWithFiles(files: Iterable<string>): Set<string> {
  const dirs = new Set<string>()
  for (const path of files) {
    for (const dir of parentDirsOf(path)) dirs.add(dir)
  }
  return dirs
}

export function computeFsDiff(prev: Record<string, string>, next: Record<string, string>): FsDiff {
  const writes: FsDiff['writes'] = []
  const removes: string[] = []
  const mkdirSet = new Set<string>()

  for (const [path, content] of Object.entries(next)) {
    const isNew = !(path in prev)
    if (isNew || prev[path] !== content) writes.push({ path, content })
    // mkdir só para arquivos NOVOS (conteúdo mudado já tem a pasta).
    if (isNew) for (const dir of parentDirsOf(path)) mkdirSet.add(dir)
  }
  for (const path of Object.keys(prev)) {
    if (!(path in next)) removes.push(path)
  }

  // Poda de diretórios: toda pasta que tinha arquivo no snapshot antigo mas
  // perdeu o último deles (nenhum arquivo descendente no novo) é removida. Não
  // poda pastas que continuam sendo criadas (mkdirs) — só as órfãs reais. Remove
  // da mais profunda para a mais rasa para que o rm recursivo não tente apagar um
  // pai já removido.
  const prevDirs = dirsWithFiles(Object.keys(prev))
  const nextDirs = dirsWithFiles(Object.keys(next))
  const rmdirs = [...prevDirs]
    .filter((dir) => !nextDirs.has(dir))
    .sort((a, b) => b.split('/').length - a.split('/').length)

  return { writes, removes, mkdirs: [...mkdirSet], rmdirs }
}
