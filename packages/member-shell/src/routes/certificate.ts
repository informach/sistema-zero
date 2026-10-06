import 'server-only'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { renderCertificatePdf } from '../server/certificate-pdf'
import type { MembersClient } from '../server/clients'
import { mediaErrorResponse } from '../server/media'
import {
  type R2PrivateHead,
  type R2PrivateObject,
  type R2PutObjectInput,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PutObjectPrivate,
} from '../server/r2'
import type { SessionModule } from '../server/session'

export type CertificateRoutes = ReturnType<typeof createCertificateRoutes>

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
/**
 * A versão do DESENHO do PDF (`server/certificate-pdf.ts`). Ela entra na chave do cache: o PDF
 * fica guardado no R2 e todo download serve o guardado, então sem a versão um conserto no
 * renderizador só valia para as emissões NOVAS, e quem já tinha emitido baixava o PDF velho
 * para sempre.
 *
 * ⚠️ Mudou o desenho ou o texto do PDF? SUBA este número. O próximo download de cada
 * certificado já emitido monta o PDF de novo, com o MESMO registro imutável do members (nome,
 * curso, data, série) e a config atual do curso; o PDF da versão anterior fica sem uso no bucket.
 *
 * - v1: `certificates/<id>.pdf` (sem versão na chave).
 * - v2 (06/10/2026): o "concluiu" que saía duas vezes, o `bodyText` e o título "Certificado de
 *   Criador" da config nova.
 */
export const CERTIFICATE_LAYOUT_VERSION = 2

/** Artefato no bucket PRIVADO (servido só por esta rota, mesma origem). */
export const certificatePdfKey = (id: string) =>
  `certificates/${id}.v${CERTIFICATE_LAYOUT_VERSION}.pdf`

/**
 * Onde o PDF emitido fica guardado: o R2 PRIVADO. É injetável SÓ para o teste da rota conferir a
 * chave (a versão do desenho): mockar o módulo `server/r2` foi rejeitado, porque o registro de mocks
 * do bun é global na suíte e outros testes importam o R2 de verdade.
 */
export interface CertificatePdfStorage {
  head(key: string): Promise<R2PrivateHead | null>
  get(key: string): Promise<R2PrivateObject>
  put(input: R2PutObjectInput): Promise<void>
}

const R2_PRIVADO: CertificatePdfStorage = {
  head: r2HeadObjectPrivate,
  get: r2GetObjectPrivate,
  put: r2PutObjectPrivate,
}

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
  return slug ? `certificado-${slug}.pdf` : 'certificado.pdf'
}

/**
 * Rotas do certificado de conclusão (consumidas pelos apps de aluno):
 * - `GET  /api/members/lessons/:lessonId/blocks/:blockId/certificate` — estado (emitir vs baixar).
 * - `POST /api/members/lessons/:lessonId/blocks/:blockId/certificate` — emite (idempotente) e
 *   devolve o PDF em STREAM (mesma origem, sem CORS); cacheia o PDF no R2 privado.
 * - `GET  /api/certificates/:id/validate` — PÚBLICA (sem login): validação por QR.
 */
export function createCertificateRoutes(deps: {
  members: MembersClient
  session: SessionModule
  storage?: CertificatePdfStorage
}) {
  const { members, session, storage = R2_PRIVADO } = deps

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
      const key = certificatePdfKey(certificate.id)
      const headers = {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${pdfFilename(certificate.courseRef)}"`,
        'cache-control': 'private, no-store',
      }
      try {
        // Já gerado NESTA versão do desenho? Serve o MESMO PDF do cache (re-download não regenera).
        const head = await storage.head(key)
        if (head) {
          const obj = await storage.get(key)
          return new NextResponse(obj.body, { status: 200, headers })
        }
        // 1ª vez: monta o PDF (registro imutável + config) e cacheia no R2 privado.
        const base = getEnv().APP_PUBLIC_URL?.replace(/\/+$/, '') ?? ''
        const verifyUrl = base ? `${base}/validar/${certificate.id}` : ''
        const bytes = await renderCertificatePdf({ certificate, config, verifyUrl })
        await storage.put({ key, body: Buffer.from(bytes), contentType: 'application/pdf' })
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
