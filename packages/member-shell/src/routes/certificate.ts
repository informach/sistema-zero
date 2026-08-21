import 'server-only'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { renderCertificatePdf } from '../server/certificate-pdf'
import type { MembersClient } from '../server/clients'
import { mediaErrorResponse } from '../server/media'
import { r2GetObjectPrivate, r2HeadObjectPrivate, r2PutObjectPrivate } from '../server/r2'
import type { SessionModule } from '../server/session'

export type CertificateRoutes = ReturnType<typeof createCertificateRoutes>

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
/** Artefato no bucket PRIVADO (servido só por esta rota, mesma origem). */
const CERT_KEY = (id: string) => `certificates/${id}.pdf`

/** Validação inexistente/indisponível → resposta pública neutra (não vaza). */
const NOT_VALID = {
  valid: false as const,
  revoked: false,
  studentName: null,
  courseTitle: null,
  issuedAt: null,
  revokedAt: null,
  serial: null,
}

function pdfFilename(courseRef: string): string {
  const slug = courseRef
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
  return `certificado-${slug || 'curso'}.pdf`
}

/**
 * Rotas do certificado de conclusão (consumidas pelos apps de aluno):
 * - `GET  /api/members/lessons/:lessonId/blocks/:blockId/certificate` — estado (emitir vs baixar).
 * - `POST /api/members/lessons/:lessonId/blocks/:blockId/certificate` — emite (idempotente) e
 *   devolve o PDF em STREAM (mesma origem, sem CORS); cacheia o PDF no R2 privado.
 * - `GET  /api/certificates/:id/validate` — PÚBLICA (sem login): validação por QR.
 */
export function createCertificateRoutes(deps: { members: MembersClient; session: SessionModule }) {
  const { members, session } = deps

  const certificateState = {
    GET: async (_req: Request, ctx: { params: Promise<{ lessonId: string; blockId: string }> }) => {
      const { lessonId, blockId } = await ctx.params
      const { status, body } = await members.getCertificateState(lessonId, blockId)
      return NextResponse.json(body ?? { error: { code: 'CERTIFICATE_STATE_FAILED' } }, { status })
    },
  }

  const certificateIssue = {
    POST: async (
      _req: Request,
      ctx: { params: Promise<{ lessonId: string; blockId: string }> },
    ) => {
      // Impersonação (claim `act`) é SOMENTE-LEITURA: suporte não emite certificado alheio.
      const user = await session.getSession()
      if (isReadonlyImpersonation(user)) {
        return NextResponse.json(
          { error: { code: 'IMPERSONATION_READONLY', message: 'Sessão de suporte é só leitura.' } },
          { status: 403 },
        )
      }

      const { lessonId, blockId } = await ctx.params
      const { status, body } = await members.issueCertificate(lessonId, blockId)
      if (status !== 200 || !body) {
        // 409 (não elegível) e demais erros chegam ao cliente como vieram.
        return NextResponse.json(body ?? { error: { code: 'CERTIFICATE_FAILED' } }, {
          status: status === 200 ? 502 : status,
        })
      }

      const { certificate, config } = body
      if (certificate.revokedAt) {
        return NextResponse.json(
          { error: { code: 'CERTIFICATE_REVOKED', message: 'Certificado revogado.' } },
          { status: 410 },
        )
      }
      const key = CERT_KEY(certificate.id)
      const headers = {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${pdfFilename(certificate.courseRef)}"`,
        'cache-control': 'private, no-store',
      }
      try {
        // Já gerado? Serve o MESMO PDF do cache (re-download não regenera).
        const head = await r2HeadObjectPrivate(key)
        if (head) {
          const obj = await r2GetObjectPrivate(key)
          return new NextResponse(obj.body, { status: 200, headers })
        }
        // 1ª vez: monta o PDF (registro imutável + config) e cacheia no R2 privado.
        const base = getEnv().APP_PUBLIC_URL?.replace(/\/+$/, '') ?? ''
        const verifyUrl = base ? `${base}/validar/${certificate.id}` : ''
        const bytes = await renderCertificatePdf({ certificate, config, verifyUrl })
        await r2PutObjectPrivate({ key, body: Buffer.from(bytes), contentType: 'application/pdf' })
        return new NextResponse(new Uint8Array(bytes), { status: 200, headers })
      } catch (error) {
        return mediaErrorResponse(error)
      }
    },
  }

  const certificateValidate = {
    GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const { id } = await ctx.params
      if (!UUID_RE.test(id)) return NextResponse.json(NOT_VALID, { status: 200 })
      const { status, body } = await members.validateCertificate(id)
      if (status !== 200 || !body) return NextResponse.json(NOT_VALID, { status: 200 })
      return NextResponse.json(body, { status: 200 })
    },
  }

  return { certificateState, certificateIssue, certificateValidate }
}
