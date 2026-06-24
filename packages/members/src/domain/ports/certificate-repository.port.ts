import type { CertificateRecord } from '../certificate/certificate'

export interface CertificateRepository {
  /** Certificado já emitido para este aluno+curso (idempotência da emissão). */
  findByUserAndCourse(userId: string, courseId: string): Promise<CertificateRecord | null>
  /**
   * Insere o certificado SE ainda não existir (UNIQUE user+course). Sob corrida, o
   * insert perde o conflito e o caller relê o existente — devolve o registro VIGENTE
   * (o recém-inserido ou o que já estava lá). Nunca emite dois.
   */
  insertIfAbsent(record: CertificateRecord): Promise<CertificateRecord>
  /** Busca pelo id público (validação por QR/serial). */
  findById(id: string): Promise<CertificateRecord | null>
  /** Marca como revogado (admin). Idempotente; no-op se já revogado/inexistente. */
  revoke(id: string, revokedAt: Date): Promise<void>
}
