import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import { type MemberCertificateView, toMemberCertificateView } from '../mappers/admin-views'
import {
  type MemberCourseHistoryScope,
  memberCourseHistory,
} from '../mappers/member-course-history'

/**
 * Certificados emitidos para um aluno (ficha admin) — inclui revogados, mais recentes
 * primeiro. O `userId` é o APRENDIZ (conta no adulto, perfil no kids). Read-only.
 */
export class ListMemberCertificatesService {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly courses: CourseRepository,
  ) {}

  async execute(
    userId: string,
    scope: MemberCourseHistoryScope = {},
  ): Promise<{ certificates: MemberCertificateView[] }> {
    const rows = await this.certificates.listByUser(userId)
    return {
      certificates: (await memberCourseHistory(rows, this.courses, scope)).map(
        toMemberCertificateView,
      ),
    }
  }
}
