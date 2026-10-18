import type { ProjectTree } from '../../../core/proProject'
import type { ProLanguageQueries } from '../../../monaco/pro/protocol'

export type ProWorkspaceQueries = Pick<
  ProLanguageQueries,
  'symbols' | 'references' | 'renameFile' | 'renameSymbol'
>

/** Workspace actions depend on this document contract, not on a particular interpreter. */
export interface ProWorkspaceLanguage {
  /** Static module dependencies, without pretending that deletion is a valid rename. */
  referencesToFile?(tree: ProjectTree, path: string): Promise<string[]>
  /** Optional adapter for editors that normalize the document's mixed line endings. */
  documentOffset?(
    source: string,
    buffer: string,
    position: { lineNumber: number; column: number },
  ): number | null
  request<K extends keyof ProWorkspaceQueries>(
    method: K,
    ...args: ProLanguageQueries[K]['args']
  ): Promise<ProLanguageQueries[K]['result']>
  requestForTree<K extends keyof ProWorkspaceQueries>(
    tree: ProjectTree,
    method: K,
    ...args: ProLanguageQueries[K]['args']
  ): Promise<ProLanguageQueries[K]['result']>
  synchronizeDocument(tree: ProjectTree, pathMap: Readonly<Record<string, string>>): void
}
