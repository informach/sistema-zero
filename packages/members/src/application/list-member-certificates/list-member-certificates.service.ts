import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import { type MemberCertificateView, toMemberCertificateView } from '../mappers/admin-views'

/**
 * Certificados emitidos para um aluno (ficha admin) — inclui revogados, mais recentes
 * primeiro. O `userId` é o APRENDIZ (conta no adulto, perfil no kids). Read-only.
 */
export class ListMemberCertificatesService {
  constructor(private readonly certificates: CertificateRepository) {}

  async execute(userId: string): Promise<{ certificates: MemberCertificateView[] }> {
    const rows = await this.certificates.listByUser(userId)
    return { certificates: rows.map(toMemberCertificateView) }
  }
}
