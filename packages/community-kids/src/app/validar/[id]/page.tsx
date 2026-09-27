import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BadgeCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { KidsRecado } from '@/components/kids/kids-recado'
import { KIDS_SCREEN_BAND } from '@/components/kids/kids-screen'
import { cn } from '@/lib/cn'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Validar certificado do Sistema Zero',
  description: 'Confirme a autenticidade de um certificado emitido pelo Sistema Zero.',
  // Página alcançável anonimamente (link/QR). NÃO indexar (plataforma infantil).
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
// convenção do app (gamificação). Em UTC, uma emissão à noite no BR exibiria aqui um dia
// diferente do que está no diploma.
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
  const revoked = !v.valid && v.revoked

  // No molde das telas de recado (`KidsRecado`, 11/09/2026): a faixa creme de cima a
  // baixo e o cartão branco no meio. O círculo do veredito é a arte do cartão.
  const content = serviceError
    ? {
        art: (
          <VerdictCircle className="bg-background text-muted-foreground">
            <RefreshCw className="size-9" aria-hidden />
          </VerdictCircle>
        ),
        title: 'Não foi possível validar agora',
        body: (
          <p>
            Tivemos um tropeço ao conferir este certificado. Recarregue a página em alguns
            instantes.
          </p>
        ),
      }
    : v.valid
      ? {
          art: (
            <VerdictCircle className="kids-marca">
              <BadgeCheck className="size-9" aria-hidden />
            </VerdictCircle>
          ),
          title: 'Certificado válido! 🎉',
          body: (
            <>
              <div>
                <p className="text-foreground">
                  <strong>{v.studentName}</strong> concluiu
                </p>
                <p className="font-bold text-lg text-primary">{v.courseTitle}</p>
              </div>
              <p className="text-sm">Emitido pelo Sistema Zero em {formatDate(v.issuedAt)}</p>
              {v.serial ? <Serial serial={v.serial} /> : null}
            </>
          ),
        }
      : revoked
        ? {
            art: (
              <VerdictCircle className="bg-destructive/15 text-destructive">
                <ShieldAlert className="size-9" aria-hidden />
              </VerdictCircle>
            ),
            title: 'Certificado revogado',
            body: (
              <>
                <div>
                  <p className="text-foreground">
                    {v.studentName ? (
                      <>
                        <strong>{v.studentName}</strong> concluiu
                      </>
                    ) : (
                      'Este certificado foi emitido'
                    )}
                  </p>
                  {v.courseTitle ? (
                    <p className="font-bold text-lg text-primary">{v.courseTitle}</p>
                  ) : null}
                </div>
                <p className="text-sm">Este certificado foi revogado e não é mais válido.</p>
                {v.revokedAt ? (
                  <p className="text-xs">Revogado em {formatDate(v.revokedAt)}</p>
                ) : null}
                {v.serial ? <Serial serial={v.serial} /> : null}
              </>
            ),
          }
        : {
            art: (
              <VerdictCircle className="bg-destructive/15 text-destructive">
                <ShieldAlert className="size-9" aria-hidden />
              </VerdictCircle>
            ),
            title: 'Certificado não encontrado',
            body: <p>Este certificado não existe ou não é mais válido. Confira o código do QR.</p>,
          }

  return (
    <main className="flex min-h-dvh flex-col">
      <KidsRecado bandClassName={KIDS_SCREEN_BAND} art={content.art} title={content.title}>
        {content.body}
      </KidsRecado>
    </main>
  )
}

function VerdictCircle({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={cn('flex size-16 items-center justify-center rounded-full', className)}>
      {children}
    </div>
  )
}

function Serial({ serial }: { serial: string }) {
  return (
    <p className="rounded-full bg-background px-3 py-1 text-muted-foreground text-xs">
      Nº {serial}
    </p>
  )
}
