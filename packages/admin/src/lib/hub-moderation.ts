import type { HubReportedContentView } from '@/lib/hub-types'

/** Só conteúdo atualmente visível aceita a ação de ocultar. */
export function canHideReportedContent(
  content: HubReportedContentView | null,
): content is HubReportedContentView {
  return content?.status === 'visible'
}
