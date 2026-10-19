import { type AdultJourneyView, adultJourneyPosition } from '@sistemazero/core/journey'
import type { AdultJourneyBadgeView } from '@sistemazero/member-shell/lib/types'

/**
 * A etapa da jornada adulta como ela aparece nas telas (prancha "Perfil público e a cor da etapa",
 * 19/10/2026): uma COR por posição, o nome e "Etapa N de T". A cor vem da posição, não do nome
 * (que a equipe edita no Admin), e é a mesma do nível de mesma posição no Kids: os tokens
 * `--etapa-*` do `globals.css` repetem os `--level-*` de lá. A última posição é sempre a Lenda
 * (quem concluiu todas as etapas), em dourado.
 */
export type StageBadge = AdultJourneyBadgeView

/** Quantas cores de etapa existem antes da Lenda (as sete do Kids). */
export const STAGE_COLOR_COUNT = 7

export function isLegend(badge: StageBadge): boolean {
  return badge.position >= badge.total
}

/** A cor da etapa (um `var(--etapa-*)`). Jornada com mais de 7 etapas volta ao começo da lista. */
export function stageColor(badge: StageBadge): string {
  if (isLegend(badge)) return 'var(--etapa-lenda)'
  return `var(--etapa-${((badge.position - 1) % STAGE_COLOR_COUNT) + 1})`
}

/** A cor do número escrito sobre a cor da etapa (o dourado da Lenda pede tinta escura). */
export function stageInk(badge: StageBadge): string {
  return isLegend(badge) ? 'var(--etapa-lenda-tinta)' : '#fff'
}

export function stageName(badge: StageBadge): string {
  return badge.title ?? 'Lenda'
}

/** "Etapa 3 de 8" (ou "Lenda", para quem concluiu tudo). */
export function stageShortLabel(badge: StageBadge): string {
  return isLegend(badge) ? 'Lenda' : `Etapa ${badge.position} de ${badge.total}`
}

/** "Etapa 3" (ou "Lenda"): o rótulo curto ao lado do nome numa lista apertada. */
export function stageTinyLabel(badge: StageBadge): string {
  return isLegend(badge) ? 'Lenda' : `Etapa ${badge.position}`
}

/** A etapa falada pelo leitor de tela, com vírgula no lugar do "·". */
export function stageSpokenLabel(badge: StageBadge): string {
  return isLegend(badge)
    ? 'Lenda, jornada completa'
    : `etapa ${badge.position} de ${badge.total}, ${stageName(badge)}`
}

/** "Etapa 3 de 8 · Inventor(a)" (ou "Lenda · jornada completa"). */
export function stageLabel(badge: StageBadge): string {
  return isLegend(badge)
    ? 'Lenda · jornada completa'
    : `Etapa ${badge.position} de ${badge.total} · ${stageName(badge)}`
}

/**
 * A jornada com `requirements` e `capabilities` sempre presentes em cada etapa. Os dois campos
 * chegaram ao members em 19/10/2026 e os serviços sobem em separado: um members anterior os omite,
 * e a tela não pode quebrar por isso.
 */
export function normalizeJourney<T extends AdultJourneyView | null | undefined>(view: T): T {
  if (!view) return view
  return {
    ...view,
    stages: view.stages.map((stage) => ({
      ...stage,
      requirements: stage.requirements ?? [],
      missing: stage.missing ?? [],
      capabilities: stage.capabilities ?? [],
    })),
  }
}

/** A etapa de quem tem a jornada inteira à mão (o próprio perfil, o perfil público). */
export function stageBadgeOf(view: AdultJourneyView | null | undefined): StageBadge | null {
  const position = adultJourneyPosition(view)
  return position
    ? { position: position.position, total: position.total, title: position.title }
    : null
}

/** O nome de cada posição da jornada, na ordem (a última é a Lenda), para a fita e a legenda. */
export function stageTitles(view: AdultJourneyView): string[] {
  return [...view.stages.map((stage) => stage.title), 'Lenda']
}
