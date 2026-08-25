/**
 * Uso por FERRAMENTA na ficha do aluno (espelha o `tool-usage` do members) —
 * regras PURAS de qual cartão cada matrícula vira e os shapes da resposta.
 */
export interface PensaUsage {
  projects: number
  cyclesCompleted: number
  lastActivityAt: string | null
}
export interface CreationToolUsage {
  /** Criações vivas na nuvem (desenhos no Pinta; jogos no Estúdio). */
  created: number
  /** Entregas de aula (blocos pinta/studio). */
  deliveries: number
  lastActivityAt: string | null
}
export interface ClubeUsage {
  posts: number
  comments: number
  lastActivityAt: string | null
}
export interface MuralUsage {
  published: number
  plays: number
  lastPublishedAt: string | null
}

export interface LearnerToolUsageView {
  userId: string
  pensa: PensaUsage
  pinta: { drawings: number; deliveries: number; lastActivityAt: string | null }
  estudio: { creations: number; deliveries: number; lastActivityAt: string | null }
  /** `null` = hub indisponível AGORA (≠ de zero participação). */
  clube: ClubeUsage | null
  mural: MuralUsage | null
}

export interface MemberToolUsageView {
  learners: LearnerToolUsageView[]
}

/** Qual cartão de uso uma matrícula de produto vira (por SKU do snapshot). */
export type ToolCardKind = 'pensa' | 'pinta' | 'estudio' | 'clube' | 'mural'

const SKU_TO_CARD: Record<string, ToolCardKind> = {
  pensa: 'pensa',
  pinta: 'pinta',
  'estudio-completo': 'estudio',
  'clube-dos-criadores': 'clube',
  'mural-dos-criadores': 'mural',
}

/**
 * Cartão da matrícula de FERRAMENTA/COMUNIDADE (`productKind` tool/community).
 * A identidade é o `sku` do snapshot (matrícula antiga sem sku cai no
 * `courseRef`, que nesses produtos é o próprio sku). Produto desconhecido →
 * `null` (sem cartão; aparece só na tabela de matrículas).
 */
export function toolCardKindFor(entitlement: {
  productKind: string
  sku?: string | null
  courseRef: string | null
}): ToolCardKind | null {
  if (entitlement.productKind !== 'tool' && entitlement.productKind !== 'community') return null
  const ref = entitlement.sku ?? entitlement.courseRef
  return ref ? (SKU_TO_CARD[ref] ?? null) : null
}

/** Ordem estável dos cartões na ficha (jornada: planejar → desenhar → construir → comunidade). */
export const TOOL_CARD_ORDER: ToolCardKind[] = ['pensa', 'pinta', 'estudio', 'clube', 'mural']

/**
 * Cartões a mostrar na ficha = as matrículas de ferramenta/comunidade da FAMÍLIA
 * (qualquer status — o histórico de uso interessa mesmo com a matrícula vencida),
 * dedupadas por cartão e na ordem da jornada. O nome vem do snapshot da matrícula.
 */
export function ownedToolCards(
  entitlements: {
    productKind: string
    sku?: string | null
    courseRef: string | null
    name: string
  }[],
): { kind: ToolCardKind; name: string }[] {
  const byKind = new Map<ToolCardKind, string>()
  for (const e of entitlements) {
    const kind = toolCardKindFor(e)
    if (kind && !byKind.has(kind)) byKind.set(kind, e.name)
  }
  return TOOL_CARD_ORDER.flatMap((kind) => {
    const name = byKind.get(kind)
    return name ? [{ kind, name }] : []
  })
}
