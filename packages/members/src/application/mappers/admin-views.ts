import type { CertificateRecord } from '../../domain/certificate/certificate'
import type { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { MemberCourseRating } from '../../domain/ports/course-rating-repository.port'
import type { MemberSummary } from '../../domain/ports/entitlement-repository.port'

/**
 * Views ADMIN (painel `@sistemazero/admin`). Diferente das views do aluno, exibem
 * tudo que um operador precisa: status, origem (pagamento/assinatura/manual),
 * validade e a versão (concorrência otimista). Datas → ISO-8601.
 */
export interface AdminEntitlementView {
  id: string
  userId: string
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
    userId: s.userId,
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

/** Tipo de evento na linha do tempo de atividade do aluno (ficha admin). */
export type MemberActivityKind =
  | 'lesson_accessed'
  | 'lesson_completed'
  | 'quiz_attempt'
  | 'studio_submission'
  | 'pinta_submission'

/**
 * Um item da linha do tempo de atividade do aluno (ficha admin). União achatada das
 * 4 fontes (aula acessada/concluída, tentativa de quiz, entrega do Estúdio/Pinta) ordenada
 * por `at` desc. Campos específicos (`score`/`passed`/`message`) só vêm quando o
 * `kind` os tem.
 */
export interface MemberActivityItemView {
  kind: MemberActivityKind
  at: string
  lessonId: string | null
  lessonTitle: string | null
  courseTitle: string | null
  score?: number | null
  passed?: boolean | null
  message?: string | null
}

/** Certificado emitido (ficha admin): inclui revogados. */
export interface MemberCertificateView {
  id: string
  serial: string
  courseRef: string
  courseTitle: string
  studentName: string
  issuedAt: string
  completedAt: string
  revokedAt: string | null
}

export function toMemberCertificateView(c: CertificateRecord): MemberCertificateView {
  return {
    id: c.id,
    serial: c.serial,
    courseRef: c.courseRef,
    courseTitle: c.courseTitle,
    studentName: c.studentName,
    issuedAt: c.issuedAt.toISOString(),
    completedAt: c.completedAt.toISOString(),
    revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
  }
}

/** Classificação dada pelo aluno (ficha admin). `rating` = nota 1–5 (ratingHalf÷2). */
export interface MemberRatingView {
  courseId: string
  courseRef: string | null
  courseTitle: string | null
  rating: number
  comment: string | null
  updatedAt: string
}

export function toMemberRatingView(r: MemberCourseRating): MemberRatingView {
  return {
    courseId: r.courseId,
    courseRef: r.courseRef,
    courseTitle: r.courseTitle,
    rating: r.ratingHalf / 2,
    comment: r.comment,
    updatedAt: r.updatedAt.toISOString(),
  }
}
