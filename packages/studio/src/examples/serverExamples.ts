/**
 * Índice DISTILADO dos exemplos oficiais para consumo no SERVIDOR (tutor
 * Zappy): mecânicas pesquisáveis + blocos usados + requisitos de extensão,
 * SEM a IR (20–45KB por exemplo — duas ordens acima do orçamento de prompt)
 * e sem Blockly/DOM. Os dados vivem no arquivo GERADO
 * `__gen_serverExamplesIndex.ts` — rode `bun run gen:server-examples` após
 * mexer em qualquer catálogo de exemplos (o drift test compara).
 */

export interface ServerExampleIndexEntry {
  /** `${extensionId}:${name}` ou `core:${name}` — mesma chave do qaContracts. */
  key: string
  extension: string | null
  name: string
  description: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  concepts?: readonly string[]
  genre?: string
  /** Promessa observável do card (EXAMPLE_QA_CONTRACTS). */
  promise: string
  /** Caminho de aceite do card (EXAMPLE_QA_CONTRACTS). */
  scenario: string
  /** Tipos Blockly únicos usados pelo exemplo (via buildWorkspaceStateFromIR). */
  blockTypes: readonly string[]
  /** Extensões que o exemplo precisa (ir.extensions). */
  requires: readonly string[]
}

export { SERVER_EXAMPLES_INDEX } from './__gen_serverExamplesIndex'
