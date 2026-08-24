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
  /**
   * SKU do produto congelado no snapshot — identidade estável p/ o painel casar a
   * matrícula com o cartão de USO da ferramenta (Pensa/Pinta/Estúdio/Clube/Mural).
   * `null` em snapshot legado sem o campo.
   */
  sku: string | null
  sourceKind: string
  sourceId: string
  subscriptionId: string | null
  grantedAt: string
  expiresAt: string | null
  revokedAt: string | null
  /**
   * O acesso está liberado AGORA (`isActiveAt`)? ⚠️⚠️ Não é redundante com o
   * `status`: a coluna fica `'active'` mesmo depois da validade passar (só um
   * cancelamento do provedor, a ação manual do admin ou a varredura de vencidas a
   * mudam), então o painel mostrava "Ativo" ao lado de uma data vencida — foi
   * assim que um assinante cortado passou por "ativo" no incidente de 08/2026.
   * A regra vem de QUEM É O DONO dela, em vez de ser recalculada na tela.
   */
  activeNow: boolean
}

export function toAdminEntitlementView(
  e: EntitlementAggregate,
  now: Date = new Date(),
): AdminEntitlementView {
  const s = e.toSnapshot()
  return {
    id: s.id,
    userId: s.userId,
    version: s.version,
    status: s.status,
    activeNow: e.isActiveAt(now),
    accessType: s.accessType,
    productId: s.productId,
    productKind: s.productKind,
    courseRef: s.courseRef,
    offerId: s.offerId,
    name: s.snapshot.name,
    sku: s.snapshot.sku ?? null,
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

/**
 * Progresso do membro num curso (no detalhe). Uma linha por CURSO REAL do
 * aprendiz — por matrícula específica (mesmo sem começar) OU por atividade
 * (cobre a chave-mestra). `title`/`status`/`courseId` nulos = matrícula cuja
 * ref não resolve mais um curso (linha degradada, visível de propósito).
 */
export interface MemberCourseProgressView {
  courseRef: string
  courseId: string | null
  title: string | null
  status: string | null
  /** Plataforma do curso (`adult`/`kids`); `null` na linha degradada. */
  audience: string | null
  completedLessons: number
  totalLessons: number
  percent: number
  /**
   * Última atividade do APRENDIZ no curso (max de conclusão de aula e acesso a
   * vídeo), ISO. `null` = matriculado e nunca abriu.
   */
  lastActivityAt: string | null
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
