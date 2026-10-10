/**
 * O rascunho do Estúdio e do Pinta DENTRO da fase, guardado na conta (10/10/2026).
 *
 * Este arquivo é só o CONTRATO entre os blocos da aula (aqui no member-shell) e quem sabe falar
 * com a nuvem (o app: hoje só o Kids implementa, em `lib/lesson-draft-cloud.ts` de lá). O bloco
 * decide O QUE guardar e QUAL versão abrir; o app cuida da fila, das marcas e do transporte. Sem
 * o contrato no contexto do player (`lessonDrafts`), o bloco segue só com o rascunho local, como
 * sempre foi (é o caso da comunidade adulta e do ensaio do admin).
 */

/** O que a pílula do bloco mostra. */
export type LessonDraftStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'unsupported'

export interface LessonDraftState {
  status: LessonDraftStatus
  /** Recado na linguagem da criança quando algo deu errado (nunca a mensagem crua do servidor). */
  message: string | null
}

/** A cópia que está na conta, sem baixar o conteúdo (a decisão de abrir vem antes). */
export interface LessonDraftRemote {
  revision: number
  /** Relógio do SERVIDOR (ms) da última subida confirmada. */
  syncedAt: number
  /** Impressão digital do conteúdo guardado. */
  fingerprint: string | null
  /** Relógio do servidor (ms) na hora da resposta: corrige o relógio deste aparelho. */
  serverNow: number
  /**
   * Baixa e monta o documento (o `Project` do Estúdio ou o desenho do Pinta no formato de
   * transporte). `localAssets` são os assets que este aparelho já tem do mesmo projeto: as partes
   * iguais não descem de novo.
   */
  load(localAssets?: readonly unknown[]): Promise<unknown>
}

/** O que sobe: o documento inteiro e o que o índice da conta guarda dele. */
export interface LessonDraftUpload {
  document: unknown
  name: string
  kind: string
  /** `updatedAt` do documento no relógio deste aparelho (ms). */
  updatedAt: number
  fingerprint: string | null
  formatVersion?: number
}

/** O que este aparelho confirmou com a nuvem para um bloco (`null` = nunca). */
export interface LessonDraftMark {
  revision: number
  updatedAt: number
}

export interface LessonDraftChannel {
  /** A nuvem funciona neste navegador? Sem ela, tudo é no-op e o bloco fica só no local. */
  readonly supported: boolean
  mark(blockId: string): LessonDraftMark | null
  setMark(blockId: string, mark: LessonDraftMark): void
  /** A cópia da conta, sem baixar o conteúdo. `null` = não há. Lança se não conseguiu perguntar. */
  peek(blockId: string, options?: { signal?: AbortSignal }): Promise<LessonDraftRemote | null>
  /**
   * Enfileira a subida (o produtor roda na hora de subir, sempre com o estado mais recente).
   * `onConflict` roda quando a conta tem uma versão de OUTRO aparelho mais nova que a base deste:
   * o bloco guarda essa versão como a "outra" e esta sobe por cima.
   */
  enqueue(
    blockId: string,
    produce: () => Promise<LessonDraftUpload | null>,
    onConflict?: (remote: LessonDraftRemote) => Promise<void>,
  ): void
  flush(timeoutMs?: number): Promise<void>
  getState(): LessonDraftState
  subscribe(listener: (state: LessonDraftState) => void): () => void
}

export interface LessonDraftCloud {
  studio: LessonDraftChannel
  pinta: LessonDraftChannel
  /** Sobe o que estiver pendente nos dois (com teto): o player chama antes de avançar e concluir. */
  flushAll(timeoutMs?: number): Promise<void>
}
