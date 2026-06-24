import type { CertificateRepository } from '../../domain/ports/certificate-repository.port'
import { type CertificateValidationView, toCertificateValidationView } from '../mappers/views'

/**
 * Validação PÚBLICA do certificado pelo id (lido do QR / `/validar/:id`). Devolve só
 * dados não-sensíveis (nome de exibição + curso + data + série) — é o propósito de um
 * validador. Inexistente / revogado → `valid:false`. Sem efeitos colaterais.
 */
export class ValidateCertificateService {
  constructor(private readonly certificates: CertificateRepository) {}

  async execute(id: string): Promise<CertificateValidationView> {
    const record = await this.certificates.findById(id)
    return toCertificateValidationView(record)
  }
}

/** Revoga um certificado (admin) — a validação pública passa a mostrar inválido. Idempotente. */
export class RevokeCertificateService {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(id: string): Promise<void> {
    await this.certificates.revoke(id, this.clock())
  }
}
