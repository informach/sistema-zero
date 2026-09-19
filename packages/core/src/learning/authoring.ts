import type { LessonSection } from './index'

export interface DraftBlockContent {
  kind: string
  [key: string]: unknown
}
export interface DraftBlock<T extends { kind: string } = DraftBlockContent> {
  id: string
  content: T
}
export interface DraftAttachment {
  id: string
  label: string
  url: string
  fileType: string | null
  sizeBytes: number | null
  /** PDF publicado autorizado como fonte do Caderno do aluno para o Zappy. */
  zappyStudentNotebook?: boolean
}

export function isPdfAttachment(
  attachment: Pick<DraftAttachment, 'fileType' | 'url' | 'label'>,
): boolean {
  const mime = attachment.fileType?.split(';', 1)[0]?.trim().toLowerCase()
  if (mime) return mime === 'application/pdf'
  return [attachment.url, attachment.label].some((value) => /\.pdf(?:[?#]|$)/i.test(value))
}
export interface PlannedLessonVideo {
  blockId: string
  instructions: string
  videoId: string | null
}
export interface LessonDraftDocument<T extends { kind: string } = DraftBlockContent> {
  title: string
  slug: string
  estimatedMinutes: number | null
  blocks: DraftBlock<T>[]
  sections: LessonSection[]
  attachments: DraftAttachment[]
  plannedVideos: PlannedLessonVideo[]
}
export interface LessonDraft<T extends { kind: string } = DraftBlockContent> {
  lessonId: string
  revision: string
  publishedRevision: string
  isPublished: boolean
  /**
   * Há um rascunho guardado para desfazer a última restauração?
   *
   * ⚠️ Vale só até a PRÓXIMA alteração do rascunho: qualquer edição, publicação ou importação
   * limpa o guardado. Desfazer horas depois devolveria um documento velho por cima de trabalho
   * novo, que é exatamente o acidente que esta rede existe para evitar.
   */
  canUndoRestore: boolean
  document: LessonDraftDocument<T>
  updatedBy: string | null
  updatedAt: string
}
/** Content travels per block; moving a tool never retransmits its project. */
export type LessonDraftChange<T extends { kind: string } = DraftBlockContent> =
  | { type: 'block'; block: DraftBlock<T>; sectionId?: string | null }
  | { type: 'remove-block'; blockId: string }
  | { type: 'structure'; sections: LessonSection[] }
  | { type: 'metadata'; title: string; slug: string; estimatedMinutes: number | null }
  | { type: 'attachments'; attachments: DraftAttachment[] }
  | { type: 'planned-videos'; plannedVideos: PlannedLessonVideo[] }

export interface LessonDraftCommand<T extends { kind: string } = DraftBlockContent> {
  expectedRevision: string
  operationId: string
  change: LessonDraftChange<T>
}
export interface LessonDraftIssue {
  blockId?: string
  sectionId?: string
  message: string
}

export function applyLessonDraftChange<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  change: LessonDraftChange<T>,
): LessonDraftDocument<T> {
  switch (change.type) {
    case 'metadata':
      return {
        ...document,
        title: change.title,
        slug: change.slug,
        estimatedMinutes: change.estimatedMinutes,
      }
    case 'attachments':
      return { ...document, attachments: change.attachments }
    case 'planned-videos':
      return { ...document, plannedVideos: change.plannedVideos }
    case 'structure':
      return { ...document, sections: change.sections }
    case 'remove-block':
      return {
        ...document,
        blocks: document.blocks.filter((b) => b.id !== change.blockId),
        sections: document.sections.map((s) => ({
          ...s,
          blockIds: s.blockIds.filter((id) => id !== change.blockId),
          ...(s.completion
            ? {
                completion: {
                  ...s.completion,
                  blockIds: s.completion.blockIds.filter((id) => id !== change.blockId),
                  ...(s.workspaceBlockId === change.blockId ? { projectChecks: [] } : {}),
                },
              }
            : {}),
          workspaceBlockId: s.workspaceBlockId === change.blockId ? null : s.workspaceBlockId,
        })),
        plannedVideos: document.plannedVideos.filter((v) => v.blockId !== change.blockId),
      }
    case 'block': {
      const existing = document.blocks.some((b) => b.id === change.block.id)
      /**
       * ⚠️⚠️ **Todo bloco pertence a UMA seção.** Não existe mais lugar fora delas: o que era
       * "materiais de apoio" virou o bloco `materials`, que mora numa seção como qualquer outro.
       * Criação que não diz a seção (ou diz uma que já sumiu) cai no fim da ÚLTIMA — a mesma
       * regra que o members aplica ao bloco que chega sem lugar. Sem isso o bloco ficaria órfão
       * em `blocks` e a aula inteira seria recusada na gravação, sem ninguém saber por quê.
       */
      const destino = existing
        ? undefined
        : (document.sections.find((s) => s.id === change.sectionId) ?? document.sections.at(-1))
      return {
        ...document,
        plannedVideos: document.plannedVideos.filter(
          (v) => v.blockId !== change.block.id || change.block.content.kind === 'video',
        ),
        blocks: existing
          ? document.blocks.map((b) => (b.id === change.block.id ? change.block : b))
          : [...document.blocks, change.block],
        sections: destino
          ? document.sections.map((s) =>
              s.id === destino.id ? { ...s, blockIds: [...s.blockIds, change.block.id] } : s,
            )
          : document.sections,
      }
    }
  }
}

/**
 * Trazer o que está PUBLICADO de volta para o rascunho.
 *
 * ⚠️ Rascunho e publicado são documentos SEPARADOS: apagar um bloco no percurso da edição não
 * toca a aula que está no ar. Esta é a volta — e é a MESMA função para o painel do admin (que
 * mostra o que vai mudar) e para o servidor (que decide), para os dois nunca divergirem.
 *
 * `'all'` devolve o publicado inteiro. Com uma lista de ids (blocos e/ou materiais), cada peça
 * volta SOZINHA, sem desfazer o resto do rascunho:
 * - peça que ainda existe no rascunho tem só o CONTEÚDO trocado pelo publicado (fica onde está);
 * - peça que sumiu volta para a seção de onde saiu, na posição que ocupava lá;
 * - seção que não existe mais no rascunho → o bloco volta para o fim da ÚLTIMA seção;
 * - vínculo de seção (critério de conclusão, oficina) só é restaurado quando o rascunho NÃO tem
 *   um: a autora pode ter escrito outro depois, e sobrescrevê-lo apagaria trabalho novo.
 *
 * ⚠️ O que ela recupera é o que está publicado AGORA. Publicar o rascunho arquiva o que não
 * estiver nele, e a partir daí o bloco não volta mais por aqui.
 */
export function restoreFromPublished<T extends { kind: string }>(
  draft: LessonDraftDocument<T>,
  published: LessonDraftDocument<T>,
  ids: readonly string[] | 'all',
): LessonDraftDocument<T> {
  if (ids === 'all') return structuredClone(published)
  const alvos = new Set(ids)
  if (alvos.size === 0) return draft

  const publicados = new Map(published.blocks.map((b) => [b.id, b]))
  const noRascunho = new Set(draft.blocks.map((b) => b.id))

  // De onde cada bloco saiu: a seção (ou os materiais de apoio) e a posição que ele ocupava.
  const origem = new Map<string, { sectionId: string; indice: number }>()
  for (const secao of published.sections)
    for (const [i, id] of secao.blockIds.entries())
      origem.set(id, { sectionId: secao.id, indice: i })

  // 1. Quem ainda está no rascunho volta ao conteúdo do ar, sem sair do lugar.
  let blocks = draft.blocks.map((b) => {
    const publicado = alvos.has(b.id) ? publicados.get(b.id) : undefined
    return publicado ? { id: b.id, content: structuredClone(publicado.content) } : b
  })

  // 2. Quem sumiu volta para onde estava.
  let sections = draft.sections
  for (const id of alvos) {
    if (noRascunho.has(id)) continue
    const publicado = publicados.get(id)
    if (!publicado) continue
    blocks = [...blocks, { id, content: structuredClone(publicado.content) }]

    const de = origem.get(id)
    const secaoPublicada = de?.sectionId
      ? published.sections.find((s) => s.id === de.sectionId)
      : undefined
    // ⚠️ A seção de onde ele saiu pode não existir mais no rascunho: aí ele volta para o FIM da
    // ÚLTIMA, porque todo bloco precisa de uma seção. A posição guardada só vale na seção original.
    const original = de?.sectionId ? draft.sections.find((s) => s.id === de.sectionId) : undefined
    const alvo = original ?? sections.at(-1)
    if (!alvo) continue
    sections = sections.map((secao) => {
      if (secao.id !== alvo.id) return secao
      const posicao = original
        ? Math.min(de?.indice ?? secao.blockIds.length, secao.blockIds.length)
        : secao.blockIds.length
      const restaurada = {
        ...secao,
        blockIds: [...secao.blockIds.slice(0, posicao), id, ...secao.blockIds.slice(posicao)],
      }
      if (secaoPublicada?.workspaceBlockId === id && !restaurada.workspaceBlockId)
        restaurada.workspaceBlockId = id
      if (
        restaurada.completion &&
        restaurada.completion.blockIds.length === 0 &&
        secaoPublicada?.completion?.blockIds.includes(id)
      )
        restaurada.completion = { ...restaurada.completion, blockIds: [id] }
      return restaurada
    })
  }

  // 3. Vídeo planejado acompanha o bloco dele (o rascunho manda, se já tiver um).
  // ⚠️ Um planejado só sobrevive se o bloco restaurado AINDA for de vídeo — é a mesma regra do
  // `applyLessonDraftChange` ao trocar um bloco. Sem isso, restaurar um bloco que no ar não é
  // vídeo deixaria um planejado órfão, e o documento inteiro seria recusado na gravação
  // ("Os vídeos planejados precisam corresponder a blocos de vídeo distintos da aula").
  const planejados = new Set(draft.plannedVideos.map((v) => v.blockId))
  const tipoAgora = new Map(blocks.map((b) => [b.id, b.content.kind]))
  const plannedVideos = [
    ...draft.plannedVideos.filter(
      (v) => !alvos.has(v.blockId) || tipoAgora.get(v.blockId) === 'video',
    ),
    ...published.plannedVideos.filter(
      (v) => alvos.has(v.blockId) && !planejados.has(v.blockId) && tipoAgora.has(v.blockId),
    ),
  ]

  // 4. Materiais: mesmo critério dos blocos, na posição que ocupavam no publicado.
  const anexosDoRascunho = new Map(draft.attachments.map((a) => [a.id, a]))
  const attachments = draft.attachments.map((a) =>
    alvos.has(a.id) ? (published.attachments.find((p) => p.id === a.id) ?? a) : a,
  )
  for (const [i, anexo] of published.attachments.entries()) {
    if (!alvos.has(anexo.id) || anexosDoRascunho.has(anexo.id)) continue
    attachments.splice(Math.min(i, attachments.length), 0, { ...anexo })
  }

  return { ...draft, blocks, sections, plannedVideos, attachments }
}
