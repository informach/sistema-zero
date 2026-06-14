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
  /**
   * Caminhos em CONFLITO arquivo↔diretório entre os snapshots: o MESMO caminho era
   * arquivo e virou pasta (o aluno trocou o arquivo `src/data` pela pasta
   * `src/data/x.ts`) ou era pasta e virou arquivo (`src/data/x.ts` → arquivo
   * `src/data`). Esses caminhos precisam ser removidos RECURSIVAMENTE *antes* de
   * qualquer mkdir/write — senão `mkdir('src/data')` colide com o arquivo homônimo
   * que ainda existe (e a falha é engolida) ou `writeFile('src/data')` colide com
   * a pasta homônima ainda presente, e o write nunca aplica → sync travado. Cada
   * caminho aqui já NÃO aparece em `removes`/`rmdirs` (seria operação redundante e
   * fora de ordem).
   */
  removeFirstPaths: string[]
  /**
   * Atalho: `removeFirstPaths.length > 0`. O sincronizador, quando `true`, aplica
   * `removeFirstPaths` ANTES de mkdirs/writes.
   */
  removeFirst: boolean
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

  // Transição arquivo↔diretório no MESMO caminho. `prev`/`next` são mapas PLANOS
  // (path → conteúdo só de arquivos), então o conflito se manifesta de dois jeitos:
  //  - arquivo→pasta: `path` era arquivo (chave em prev), sumiu de next e agora é
  //    pasta-pai de algum arquivo do snapshot novo (está em `nextDirs`).
  //  - pasta→arquivo: `path` era pasta-pai em prev (está em `prevDirs`) e agora é
  //    um arquivo (chave em next).
  // Em ambos os casos o caminho em conflito precisa ser apagado RECURSIVAMENTE
  // antes de qualquer mkdir/write.
  const removeFirstSet = new Set<string>()
  for (const path of removes) {
    if (nextDirs.has(path)) removeFirstSet.add(path) // arquivo→pasta
  }
  for (const dir of prevDirs) {
    if (dir in next) removeFirstSet.add(dir) // pasta→arquivo (dir virou arquivo)
  }
  const removeFirstPaths = [...removeFirstSet]

  // Os caminhos em conflito saem de `removes`/`rmdirs`: removê-los ali seria
  // redundante (já estão em removeFirstPaths) e, no caso pasta→arquivo, um rmdir
  // do caminho rodaria DEPOIS do write e apagaria o arquivo recém-escrito.
  const filteredRemoves = removes.filter((p) => !removeFirstSet.has(p))
  const filteredRmdirs = rmdirs.filter((d) => !removeFirstSet.has(d))

  return {
    writes,
    removes: filteredRemoves,
    mkdirs: [...mkdirSet],
    rmdirs: filteredRmdirs,
    removeFirstPaths,
    removeFirst: removeFirstPaths.length > 0,
  }
}
