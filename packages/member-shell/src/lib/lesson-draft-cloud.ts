/**
 * O rascunho do Estúdio e do Pinta DENTRO da fase, guardado na conta (10/10/2026).
 *
 * Este arquivo reúne o CONTRATO entre os blocos da aula (aqui no member-shell) e quem sabe falar
 * com a nuvem (o app: hoje só o Kids implementa, em `lib/lesson-draft-cloud.ts` de lá). O bloco
 * decide O QUE guardar e QUAL versão abrir; o app cuida da fila, das marcas e do transporte. Sem
 * o contrato no contexto do player (`lessonDrafts`), o bloco segue só com o rascunho local, como
 * sempre foi (é o caso da comunidade adulta e do ensaio do admin).
 *
 * O coordenador (`createLessonDraftCoordinator`) põe ordem no avanço: salvar o que está na tela →
 * subir para a conta → avançar/concluir. Só as partes com "envio em dia" EXIGEM a confirmação da
 * conta, porque é ao sair delas que o servidor compara o envio com o rascunho guardado. Nas outras,
 * a subida é tentativa (como sempre foi): a nuvem do rascunho nunca prende a criança.
 */

/** O que a pílula do bloco mostra. */
export type LessonDraftStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'unsupported'

export interface LessonDraftState {
  status: LessonDraftStatus
  /** Recado na linguagem da criança quando algo deu errado (nunca a mensagem crua do servidor). */
  message: string | null
  /**
   * A versão da conta é de um editor mais novo que o desta página (ou o servidor não aceita mais o
   * formato daqui). Tentar de novo não resolve: a pílula oferece atualizar a página.
   */
  outdated?: boolean
}

/** O código da falha que só uma página nova resolve (o mesmo do servidor para o cliente antigo). */
export const LESSON_DRAFT_OUTDATED = 'CREATION_CLIENT_OUTDATED'

/**
 * O bloco não conseguiu ler a versão da conta num conflito. O servidor só promove uma revisão
 * depois de conferi-la com o editor do deploy de agora, então, se esta página a recusa, é ela que
 * está com o editor antigo.
 */
export class LessonDraftOutdatedError extends Error {
  readonly code = LESSON_DRAFT_OUTDATED

  constructor(cause?: unknown) {
    super('A versão guardada na conta foi feita por um editor mais novo que esta página.', {
      cause,
    })
    this.name = 'LessonDraftOutdatedError'
  }
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

/**
 * O que o bloco fez com um conflito na subida. `adopted`: o disco já tem o conteúdo da conta (o
 * mesmo de antes ou a versão da conta trazida para cima); marque com este `updatedAt` e não suba de
 * novo. Sem `adopted`, a versão daqui sobe por cima e a da conta ficou como a "outra".
 */
export interface LessonDraftConflictOutcome {
  adopted?: { updatedAt: number }
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
   * o bloco guarda essa versão como a "outra" e esta sobe por cima. `firstContact` = este aparelho
   * nunca conversou com a conta sobre o bloco (abriu sem conseguir perguntar): o que está aqui pode
   * ser só o modelo inicial, então a versão da conta passa a ser a de cima.
   */
  enqueue(
    blockId: string,
    produce: () => Promise<LessonDraftUpload | null>,
    onConflict?: (
      remote: LessonDraftRemote,
      context: { firstContact: boolean },
    ) => Promise<LessonDraftConflictOutcome | undefined>,
  ): void
  flush(timeoutMs?: number): Promise<void>
  /** Espera a confirmação do bloco; timeout/falha nunca são tratados como sucesso. */
  confirm(blockId: string, timeoutMs?: number): Promise<void>
  /** O estado do rascunho DESTE bloco (a pílula é do bloco, não da fila da ferramenta). */
  getState(blockId: string): LessonDraftState
  /** Avisa quando o estado de algum bloco pode ter mudado; releia com `getState`. */
  subscribe(listener: () => void): () => void
}

export interface LessonDraftEditor {
  /** Grava o que está na tela no disco do editor e põe na fila da conta. Editor fora do ar: nada. */
  save(): Promise<void>
  /**
   * `true` quando o "envio em dia" não depende da fila: nada enviado ainda (o servidor pede o
   * envio), envio sem impressão (o critério deixa passar) ou o trabalho deste computador é igual
   * ao último envio. É a saída quando a conta não confirma: enviar de novo sempre destrava.
   * `saved: false` = o `save` acabou de falhar (o disco pode estar atrás da tela).
   */
  matchesSubmission(context: { saved: boolean }): Promise<boolean>
}

export interface LessonDraftCoordinator {
  registerEditor(
    lessonId: string,
    tool: 'studio' | 'pinta',
    blockId: string,
    editor: LessonDraftEditor,
  ): () => void
  /**
   * Salva os editores da fase, sobe o rascunho e só então roda `action` (o pedido de avançar ou
   * concluir). `confirm` = os blocos das partes com "envio em dia" que esta ação fecha: eles
   * precisam chegar à conta (ou bater com o envio); os demais sobem em tentativa, com teto.
   * Duas ações na mesma fase entram em fila, nunca se atropelam.
   */
  withSavedDrafts<T>(
    lessonId: string,
    action: () => Promise<T>,
    options?: { confirm?: readonly string[]; timeoutMs?: number },
  ): Promise<T>
  isSaving(lessonId: string): boolean
  subscribeSaving(listener: () => void): () => void
}

export interface LessonDraftCloud extends LessonDraftCoordinator {
  studio: LessonDraftChannel
  pinta: LessonDraftChannel
  /** Melhor esforço para saída da página; não confirma que é seguro avançar/concluir. */
  flushAll(timeoutMs?: number): Promise<void>
}

export class LessonDraftSaveError extends Error {
  /**
   * `VIEWER_CHANGED` = o perfil desta aba mudou (a subida ouviu `VIEWER_MISMATCH`).
   * `PAGE_OUTDATED` = a versão da conta é de um editor mais novo: só a página atualizada guarda.
   */
  readonly code: 'LESSON_DRAFT_NOT_SAVED' | 'VIEWER_CHANGED' | 'PAGE_OUTDATED'
  /** Repetir não adianta: só abrindo a fase de novo. */
  readonly viewerChanged: boolean
  /** Repetir não adianta: só atualizando a página (ou enviando de novo). */
  readonly outdated: boolean

  constructor(cause?: unknown) {
    const code = (cause as { code?: string } | null)?.code
    const viewerChanged = code === 'VIEWER_MISMATCH'
    const outdated = code === LESSON_DRAFT_OUTDATED
    super(
      viewerChanged
        ? 'O perfil mudou. Abra a fase de novo.'
        : outdated
          ? 'Esta página ficou desatualizada. Clique em Atualizar, no aviso do Estúdio ou do Pinta, ou clique em Enviar de novo para a equipe receber a versão nova. Nada se perde.'
          : 'Não consegui guardar suas últimas mudanças na conta. Tente de novo, ou clique em Enviar de novo para a equipe receber a versão nova.',
      { cause },
    )
    this.name = 'LessonDraftSaveError'
    this.code = viewerChanged
      ? 'VIEWER_CHANGED'
      : outdated
        ? 'PAGE_OUTDATED'
        : 'LESSON_DRAFT_NOT_SAVED'
    this.viewerChanged = viewerChanged
    this.outdated = outdated
  }
}

/**
 * Os blocos que precisam estar na conta para o servidor fechar as partes com "envio em dia" entre
 * `from` (a parte de agora) e `to` (exclusive). Avançar fecha as partes antes do destino; voltar
 * não fecha nada; concluir fecha da parte de agora até o fim. As partes antes da de agora já foram
 * fechadas quando a criança passou por elas.
 */
export function upToDateWorkspaceIds(
  sections: readonly {
    workspaceBlockId?: string | null
    completion?: { submissionUpToDate?: boolean } | null
  }[],
  from: number,
  to: number,
): string[] {
  return sections
    .slice(Math.max(0, from), Math.max(0, to))
    .flatMap((section) =>
      section.completion?.submissionUpToDate === true && section.workspaceBlockId
        ? [section.workspaceBlockId]
        : [],
    )
}

/** Prazo padrão de salvar e de confirmar (cada um); a subida segue na fila depois dele. */
const PRAZO_MS = 15_000
/** Teto da tentativa de subir os blocos sem "envio em dia" (o mesmo de antes do coordenador). */
const PRAZO_TENTATIVA_MS = 4_000

function comPrazo<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Tempo esgotado')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/** A fila só conhece o disco. Antes de avançar, ela precisa receber também a edição na tela. */
export function createLessonDraftCoordinator(
  channels: Pick<LessonDraftCloud, 'studio' | 'pinta'>,
): LessonDraftCoordinator {
  const editors = new Set<{
    lessonId: string
    tool: 'studio' | 'pinta'
    blockId: string
    editor: LessonDraftEditor
  }>()
  const saving = new Map<string, number>()
  const tails = new Map<string, Promise<unknown>>()
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  const busy = (lessonId: string, delta: number) => {
    const next = (saving.get(lessonId) ?? 0) + delta
    if (next > 0) saving.set(lessonId, next)
    else saving.delete(lessonId)
    notify()
  }

  async function prepare(lessonId: string, confirm: ReadonlySet<string>, timeoutMs: number) {
    const current = [...editors].filter((entry) => entry.lessonId === lessonId)
    const strict = current.filter((entry) => confirm.has(entry.blockId))
    const loose = current.filter((entry) => !confirm.has(entry.blockId))
    await Promise.all([
      // Sem "envio em dia": salva e tenta subir, sem nunca segurar a criança por isso.
      (async () => {
        await Promise.allSettled(loose.map((entry) => comPrazo(entry.editor.save(), timeoutMs)))
        const tools = new Set(loose.map((entry) => entry.tool))
        await Promise.allSettled([...tools].map((tool) => channels[tool].flush(PRAZO_TENTATIVA_MS)))
      })(),
      ...strict.map(async (entry) => {
        let saved = false
        try {
          await comPrazo(entry.editor.save(), timeoutMs)
          saved = true
          await channels[entry.tool].confirm(entry.blockId, timeoutMs)
        } catch (cause) {
          if ((cause as { code?: string } | null)?.code === 'VIEWER_MISMATCH')
            throw new LessonDraftSaveError(cause)
          // A conta não confirmou. Se o que está aqui é o que foi enviado, a conferência do
          // servidor não muda com a fila: segue. Senão, a criança tenta de novo ou reenvia.
          const ok = await comPrazo(entry.editor.matchesSubmission({ saved }), timeoutMs).catch(
            () => false,
          )
          if (!ok) throw new LessonDraftSaveError(cause)
        }
      }),
    ])
  }

  return {
    registerEditor(lessonId, tool, blockId, editor) {
      const entry = { lessonId, tool, blockId, editor }
      editors.add(entry)
      return () => {
        editors.delete(entry)
      }
    },
    isSaving: (lessonId) => saving.has(lessonId),
    subscribeSaving(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    withSavedDrafts(lessonId, action, options) {
      const confirm = new Set(options?.confirm ?? [])
      const timeoutMs = options?.timeoutMs ?? PRAZO_MS
      // A edição para já no clique, inclusive quando esta ação espera a anterior.
      busy(lessonId, 1)
      const run = async () => {
        try {
          await prepare(lessonId, confirm, timeoutMs)
          return await action()
        } finally {
          busy(lessonId, -1)
        }
      }
      // Concluir e voltar ao mesmo tempo: a segunda ação espera a primeira terminar.
      const result = (tails.get(lessonId) ?? Promise.resolve()).then(run)
      const tail = result.catch(() => {})
      tails.set(lessonId, tail)
      void tail.then(() => {
        if (tails.get(lessonId) === tail) tails.delete(lessonId)
      })
      return result
    },
  }
}
