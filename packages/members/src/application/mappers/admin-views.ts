import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { MemberSummary } from '../../domain/ports/entitlement-repository.port'

/**
 * Views ADMIN (painel `@sistemazero/admin`). Diferente das views do aluno, exibem
 * tudo que um operador precisa: status, origem (pagamento/assinatura/manual),
 * validade e a versão (concorrência otimista). Datas → ISO-8601.
 */
export interface AdminEntitlementView {
  id: string
  version: number
  status: string
  accessType: string
  productId: string
  productKind: string
  courseRef: string | null
  offerId: string | null
  /** Nome do produto congelado no snapshot (legível no painel). */
  name: string
  sourceKind: string
  sourceId: string
  subscriptionId: string | null
  grantedAt: string
  expiresAt: string | null
  revokedAt: string | null
}

export function toAdminEntitlementView(e: EntitlementAggregate): AdminEntitlementView {
  const s = e.toSnapshot()
  return {
    id: s.id,
    version: s.version,
    status: s.status,
    accessType: s.accessType,
    productId: s.productId,
    productKind: s.productKind,
    courseRef: s.courseRef,
    offerId: s.offerId,
    name: s.snapshot.name,
    sourceKind: s.sourceKind,
    sourceId: s.sourceId,
    subscriptionId: s.subscriptionId,
    grantedAt: s.grantedAt.toISOString(),
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
  }
}

/** Sumário do membro na listagem admin (1 linha = 1 usuário com matrículas). */
export interface MemberSummaryView {
  userId: string
  totalCount: number
  activeCount: number
  lastGrantedAt: string
  courseRefs: string[]
}

export function toMemberSummaryView(m: MemberSummary): MemberSummaryView {
  return {
    userId: m.userId,
    totalCount: m.totalCount,
    activeCount: m.activeCount,
    lastGrantedAt: m.lastGrantedAt.toISOString(),
    courseRefs: m.courseRefs,
  }
}

/** Progresso do membro num curso (no detalhe). `title`/`status` nulos = curso ausente. */
export interface MemberCourseProgressView {
  courseRef: string
  title: string | null
  status: string | null
  completedLessons: number
  totalLessons: number
  percent: number
}

/** Progresso de UM perfil (estilo Netflix) da conta, por curso. `userId` = profileId. */
export interface MemberProfileProgressView {
  userId: string
  progress: MemberCourseProgressView[]
}

/**
 * Detalhe do membro: matrículas (todos status) + progresso por curso. O `progress`
 * é o da CONTA (`userId` — pré-perfis = o aprendiz único). Quando o painel passa os
 * `profileIds` da conta (perfis estilo Netflix), vem TAMBÉM `profilesProgress` com o
 * progresso de CADA perfil sobre os MESMOS cursos da família (o nome do perfil é
 * hidratado pelo painel a partir do auth).
 */
export interface MemberDetailView {
  userId: string
  entitlements: AdminEntitlementView[]
  progress: MemberCourseProgressView[]
  profilesProgress?: MemberProfileProgressView[]
}
