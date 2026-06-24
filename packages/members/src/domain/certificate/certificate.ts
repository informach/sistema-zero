import { randomBytes } from 'node:crypto'

/**
 * Certificado de conclusão emitido (1 linha por aluno+curso, imutável). Os campos de
 * EXIBIÇÃO (`studentName`/`courseTitle`) são SNAPSHOTS congelados na 1ª emissão — renome
 * posterior do perfil/curso NÃO altera um certificado já emitido (espelha o
 * `authorDisplayName` do hub). `id` é o identificador PÚBLICO de validação (vai no QR).
 */
export interface CertificateRecord {
  /** UUID público — usado em `/validar/:id` e no QR code. */
  id: string
  /** Perfil/aluno (kids = perfil; adulto = a própria conta). */
  userId: string
  /** Conta do responsável (kids); = userId no adulto. */
  accountId: string
  courseId: string
  /** Slug do curso (snapshot). */
  courseRef: string
  /** Número de série legível (`SZ-<ano>-XXXXXXXX`), UNIQUE. */
  serial: string
  /** Nome de exibição do aluno na emissão (snapshot imutável). */
  studentName: string
  /** Título do curso na emissão (snapshot imutável). */
  courseTitle: string
  /** Quando os requisitos do curso foram cumpridos. */
  completedAt: Date
  issuedAt: Date
  /** Revogado pelo admin (validação pública passa a mostrar inválido). */
  revokedAt: Date | null
}

/**
 * Elegível a emitir? TODAS as aulas publicadas do curso MENOS a do certificado precisam
 * estar concluídas, E precisa existir ≥1 OUTRA aula publicada — um certificado certifica a
 * conclusão de ALGO. Sem o piso, um curso publicado SÓ com a aula do certificado (conteúdo
 * ainda em rascunho) emitiria um diploma por zero trabalho. Como concluir cada aula já
 * exige passar nos quizzes com nota de corte e enviar os projetos do Estúdio (gates de
 * `mark-lesson-complete`), isso cobre transitivamente quizzes + atividades + envio. Puro/testável.
 */
export function eligibleForCertificate(
  publishedLessonIds: string[],
  certLessonId: string,
  completedLessonIds: string[],
): boolean {
  const completed = new Set(completedLessonIds)
  const others = publishedLessonIds.filter((id) => id !== certLessonId)
  return others.length > 0 && others.every((id) => completed.has(id))
}

// Alfabeto Crockford base32 (sem I/L/O/U — evita ambiguidade ao ler/digitar o serial).
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function base32(bytes: Buffer): string {
  let out = ''
  for (const b of bytes) out += BASE32[b % 32]
  return out
}

/** Formato do serial (validação de testes + leitura humana). */
export const SERIAL_RE = /^SZ-\d{4}-[0-9A-HJKMNP-TV-Z]{16}$/

/**
 * Gera o número de série legível: `SZ-<ano>-XXXXXXXXXXXXXXXX` (16 chars base32 de
 * 16 bytes aleatórios). O UNIQUE no banco segue como rede de segurança.
 */
export function generateSerial(now: Date): string {
  return `SZ-${now.getUTCFullYear()}-${base32(randomBytes(16))}`
}
