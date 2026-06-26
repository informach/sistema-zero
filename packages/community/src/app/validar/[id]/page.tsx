import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BadgeCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Validar certificado — Sistema Zero',
  description: 'Confirme a autenticidade de um certificado emitido pelo Sistema Zero.',
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const NOT_VALID: CertificateValidationView = {
  valid: false,
  revoked: false,
  studentName: null,
  courseTitle: null,
  issuedAt: null,
  revokedAt: null,
  serial: null,
}

// Fuso FIXO de São Paulo — casa com a data IMPRESSA no PDF (certificate-pdf.ts) e com a
// convenção do app. Em UTC, uma emissão à noite no BR exibiria aqui um dia diferente do diploma.
const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_FMT.format(d)
}

/**
 * Página PÚBLICA (sem login) de validação de certificado — aberta pelo QR. FORA do
 * grupo `(app)` (sem gate). Mostra só dados não-sensíveis (nome + curso + data + série);
 * busca no servidor pelo client público do members.
 */
export default async function ValidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const { status, body } = await shell.members.validateCertificate(id)
  // 5xx (inclui o 503 fail-soft do `publicGet`) NÃO é um veredito — cair no ramo "inválido"
  // acusaria um certificado REAL de falso a quem escaneou o QR. Só 200 com `valid` é autoritativo.
  const serviceError = status >= 500
  const v: CertificateValidationView =
    !serviceError && body && typeof body === 'object' && 'valid' in body
      ? (body as CertificateValidationView)
      : NOT_VALID
  const revoked = !v.valid && v.revoked

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {serviceError ? (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <RefreshCw className="size-8" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-foreground">Não foi possível validar agora</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Tivemos um tropeço ao conferir este certificado. Recarregue a página em alguns
              instantes.
            </p>
          </>
        ) : v.valid ? (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BadgeCheck className="size-8" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-foreground">Certificado válido</h1>
            <p className="mt-4 text-base text-foreground">
              <strong>{v.studentName}</strong> concluiu o curso
            </p>
            <p className="text-lg font-semibold text-primary">{v.courseTitle}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Emitido pelo Sistema Zero em {formatDate(v.issuedAt)}
            </p>
            {v.serial ? (
              <p className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Nº {v.serial}
              </p>
            ) : null}
          </>
        ) : revoked ? (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-8" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-foreground">Certificado revogado</h1>
            <p className="mt-4 text-base text-foreground">
              {v.studentName ? (
                <>
                  <strong>{v.studentName}</strong> concluiu o curso
                </>
              ) : (
                'Este certificado foi emitido'
              )}
            </p>
            {v.courseTitle ? (
              <p className="text-lg font-semibold text-primary">{v.courseTitle}</p>
            ) : null}
            <p className="mt-3 text-sm text-muted-foreground">
              Este certificado foi revogado e não é mais válido.
            </p>
            {v.revokedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Revogado em {formatDate(v.revokedAt)}
              </p>
            ) : null}
            {v.serial ? (
              <p className="mt-4 inline-block rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Nº {v.serial}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-8" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-foreground">Certificado não encontrado</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Este certificado não existe ou não é mais válido. Verifique o código do QR.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
