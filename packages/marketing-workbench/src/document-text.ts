import type { EditorialDocument } from '@sistemazero/marketing-contracts'
export function documentText(value: EditorialDocument | undefined): string {
  if (!value) return 'Sem conteúdo'
  return [
    value.title,
    'body' in value ? value.body : '',
    'brief' in value ? value.brief : '',
    'objective' in value ? `Objetivo: ${value.objective}` : '',
    'caption' in value ? `Legenda: ${value.caption}` : '',
    'cta' in value ? `Chamada para ação: ${value.cta}` : '',
    'format' in value ? `Formato: ${value.format} · ${value.medium}` : '',
    'week' in value
      ? `Semana: ${value.week ?? 'Sem semana'} · Data: ${value.editorialDate ?? 'Sem data'}`
      : '',
    'source' in value ? `Origem: ${value.source.label} ${value.source.url ?? ''}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
/** Restoring text/metadata is distinct from undoing a structural adaptation. */
export function restoreContent(
  previous: EditorialDocument,
  current: EditorialDocument,
): EditorialDocument {
  if (previous.kind !== current.kind) throw new Error('A revisão pertence a outro tipo de conteúdo')
  if (previous.kind === 'piece' && current.kind === 'piece')
    return { ...previous, representationIds: current.representationIds }
  if (previous.kind === 'representation' && current.kind === 'representation')
    return {
      ...previous,
      pieceId: current.pieceId,
      componentIds: current.componentIds,
      sourceRevisionId: current.sourceRevisionId,
    }
  if (previous.kind === 'component' && current.kind === 'component')
    return {
      ...previous,
      representationId: current.representationId,
      sourceRevisionId: current.sourceRevisionId,
    }
  return previous
}
