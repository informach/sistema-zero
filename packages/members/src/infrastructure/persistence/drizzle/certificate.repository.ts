import { and, eq } from 'drizzle-orm'
import type { CertificateRecord } from '../../../domain/certificate/certificate'
import type { CertificateRepository } from '../../../domain/ports/certificate-repository.port'
import type { Database } from './db'
import { certificatesIssued } from './schema'

type Row = typeof certificatesIssued.$inferSelect

function toRecord(row: Row): CertificateRecord {
  return {
    id: row.id,
    userId: row.userId,
    accountId: row.accountId,
    courseId: row.courseId,
    courseRef: row.courseRef,
    serial: row.serial,
    studentName: row.studentName,
    courseTitle: row.courseTitle,
    completedAt: row.completedAt,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt ?? null,
  }
}

export class DrizzleCertificateRepository implements CertificateRepository {
  constructor(private readonly db: Database) {}

  async findByUserAndCourse(userId: string, courseId: string): Promise<CertificateRecord | null> {
    const rows = await this.db
      .select()
      .from(certificatesIssued)
      .where(and(eq(certificatesIssued.userId, userId), eq(certificatesIssued.courseId, courseId)))
      .limit(1)
    return rows[0] ? toRecord(rows[0]) : null
  }

  async insertIfAbsent(record: CertificateRecord): Promise<CertificateRecord> {
    // Idempotente: o UNIQUE (user_id, course_id) garante 1 cert por aluno+curso. Sob
    // corrida o insert perde o conflito (no-op) e a releitura devolve o VIGENTE.
    // ⚠️ O `onConflictDoNothing` cobre SÓ (user_id, course_id). Uma colisão do UNIQUE
    // `serial` (improvável: 16 bytes aleatórios) NÃO é absorvida aqui — ela propaga 23505
    // de propósito, p/ o retry de `IssueCertificateService.insertCertificate` tentar com
    // um serial novo. Não troque o target nem swallow o 23505 do serial.
    await this.db
      .insert(certificatesIssued)
      .values(record)
      .onConflictDoNothing({
        target: [certificatesIssued.userId, certificatesIssued.courseId],
      })
    const existing = await this.findByUserAndCourse(record.userId, record.courseId)
    // Inserido agora OU já existia — sempre há linha após o insert.
    return existing ?? record
  }

  async findById(id: string): Promise<CertificateRecord | null> {
    const rows = await this.db
      .select()
      .from(certificatesIssued)
      .where(eq(certificatesIssued.id, id))
      .limit(1)
    return rows[0] ? toRecord(rows[0]) : null
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.db.update(certificatesIssued).set({ revokedAt }).where(eq(certificatesIssued.id, id))
  }
}
