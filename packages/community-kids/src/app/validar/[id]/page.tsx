import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BadgeCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Validar certificado — Sistema Zero',
  description: 'Confirme a autenticidade de um certificado emitido pelo Sistema Zero.',
  // Página alcançável anonimamente (link/QR). NÃO indexar (plataforma infantil).
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const NOT_VALID: CertificateValidationView = {
  valid: false,
  studentName: null,
  courseTitle: null,
  issuedAt: null,
  serial: null,
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/**
 * Página PÚBLICA (sem login) de validação de certificado — aberta pelo QR. Fica FORA
 * do grupo `(app)` (sem sidebar/gate). Mostra só dados não-sensíveis (nome de exibição
 * + curso + data + série). Busca no servidor pelo client público do members.
 */
export default async function ValidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const { status, body } = await shell.members.validateCertificate(id)
  // 5xx (inclui o 503 fail-soft do `publicGet` quando o gateway/members soluça) NÃO é
  // um veredito: cair no ramo "inválido" aqui acusaria um certificado REAL de ser falso
  // a quem escaneou o QR. Só status 200 com `valid` é uma resposta autoritativa.
  const serviceError = status >= 500
  const v: CertificateValidationView =
    !serviceError && body && typeof body === 'object' && 'valid' in body
      ? (body as CertificateValidationView)
      : NOT_VALID

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-8 text-center shadow-[0_6px_0_var(--border)]">
        {serviceError ? (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <RefreshCw className="size-9" aria-hidden />
            </div>
            <h1 className="sz-display text-2xl font-bold text-foreground">
              Não foi possível validar agora
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Tivemos um tropeço ao conferir este certificado. Recarregue a página em alguns
              instantes.
            </p>
          </>
        ) : v.valid ? (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BadgeCheck className="size-9" aria-hidden />
            </div>
            <h1 className="sz-display text-2xl font-bold text-foreground">
              Certificado válido! 🎉
            </h1>
            <p className="mt-4 text-base text-foreground">
              <strong>{v.studentName}</strong> concluiu
            </p>
            <p className="text-lg font-bold text-primary">{v.courseTitle}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Emitido pelo Sistema Zero em {formatDate(v.issuedAt)}
            </p>
            {v.serial ? (
              <p className="mt-4 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Nº {v.serial}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <ShieldAlert className="size-9" aria-hidden />
            </div>
            <h1 className="sz-display text-2xl font-bold text-foreground">
              Certificado não encontrado
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Este certificado não existe ou não é mais válido. Confira o código do QR.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
