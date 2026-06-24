import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
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

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

/**
 * Página PÚBLICA (sem login) de validação de certificado — aberta pelo QR. FORA do
 * grupo `(app)` (sem gate). Mostra só dados não-sensíveis (nome + curso + data + série);
 * busca no servidor pelo client público do members.
 */
export default async function ValidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const { body } = await shell.members.validateCertificate(id)
  const v: CertificateValidationView =
    body && typeof body === 'object' && 'valid' in body
      ? (body as CertificateValidationView)
      : { valid: false, studentName: null, courseTitle: null, issuedAt: null, serial: null }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {v.valid ? (
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
