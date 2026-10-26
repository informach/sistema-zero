import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { BadgeCheck, RefreshCw, SearchX, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PublicTopBar } from '@/components/community/public-top-bar'
import { cn } from '@/lib/cn'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Validar certificado | Sistema Zero',
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
 * busca no servidor pelo client público do members. Estúdio à noite (25/10/2026): a barra escura, o
 * certificado como um cartão da noite com a moldura dourada e frases diretas nos outros estados.
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
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicTopBar label="Sistema Zero" />
      <main className="sz-page flex flex-1 flex-col items-center gap-6 pt-10 pb-16 md:justify-center">
        <div className="flex w-full max-w-[44rem] flex-col gap-4">
          <span className="sz-kicker">Validar certificado</span>
          {serviceError ? (
            <StateCard title="Não deu para validar agora" tone="neutro">
              <p className="m-0">
                A conferência falhou do nosso lado. Recarregue a página em alguns instantes.
              </p>
            </StateCard>
          ) : v.valid ? (
            <>
              <article
                aria-labelledby="certificado-valido"
                className="sz-palco sz-certificado flex flex-col gap-7 rounded-[1.2rem] px-6 py-8 sm:px-10 sm:py-10"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <BrandLogo fundo="escuro" label="Sistema Zero" className="block h-auto w-36" />
                  <span className="sz-chip sz-chip-ok">
                    <BadgeCheck aria-hidden="true" />
                    <span id="certificado-valido">Certificado válido</span>
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="font-(family-name:--font-pixel) text-(--dourado) text-[0.9rem] uppercase tracking-[0.06em]">
                    Certificado de conclusão
                  </span>
                  <p className="sz-h1 m-0">{v.studentName}</p>
                  <p className="m-0 text-(--texto-claro-2)">
                    concluiu o curso <strong className="text-white">{v.courseTitle}</strong>.
                  </p>
                </div>
                <dl className="m-0 flex flex-wrap justify-between gap-x-8 gap-y-3 border-(--linha-escura) border-t pt-5 text-(--texto-claro-2)">
                  <div className="flex flex-col">
                    <dt className="text-xs">Emitido pelo Sistema Zero em</dt>
                    <dd className="m-0 font-bold text-white">{formatDate(v.issuedAt)}</dd>
                  </div>
                  {v.serial ? (
                    <div className="flex flex-col">
                      <dt className="text-xs">Número do certificado</dt>
                      <dd className="m-0 font-(family-name:--font-pixel) text-white tracking-[0.04em]">
                        {v.serial}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </article>
              <p className="m-0 text-muted-foreground">
                Esta página confirma que o certificado foi emitido pela Sistema Zero e continua
                válido. Ela abre para qualquer pessoa que escanear o QR do certificado.
              </p>
            </>
          ) : revoked ? (
            <StateCard title="Certificado revogado" tone="alerta">
              {v.studentName && v.courseTitle ? (
                <p className="m-0">
                  Emitido para <strong>{v.studentName}</strong>, no curso{' '}
                  <strong>{v.courseTitle}</strong>.
                </p>
              ) : null}
              <p className="m-0">Este certificado foi revogado e não é mais válido.</p>
              {v.revokedAt || v.serial ? (
                <p className="m-0 text-xs">
                  {[
                    v.revokedAt ? `Revogado em ${formatDate(v.revokedAt)}` : null,
                    v.serial ? `Nº ${v.serial}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </StateCard>
          ) : (
            <StateCard title="Certificado não encontrado" tone="claro">
              <p className="m-0">
                Este certificado não existe ou não é mais válido. Confira se o QR foi lido inteiro.
              </p>
            </StateCard>
          )}
        </div>
      </main>
    </div>
  )
}

/**
 * Os outros resultados, como no Canvas: revogado em tom de alerta, não encontrado numa folha
 * branca e "fora do ar" no cinza. O título leva o ícone e a palavra, nunca só a cor.
 */
function StateCard({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'alerta' | 'claro' | 'neutro'
  children: ReactNode
}) {
  const Icon = tone === 'alerta' ? ShieldAlert : tone === 'claro' ? SearchX : RefreshCw
  return (
    <article
      aria-labelledby="certificado-estado"
      className={cn(
        'flex w-full flex-col gap-3 rounded-[1.2rem] px-6 py-7 sm:px-8',
        tone === 'alerta' &&
          'bg-[color-mix(in_oklab,var(--destructive)_9%,white)] text-[color-mix(in_oklab,var(--destructive)_62%,black)]',
        tone === 'claro' && 'sz-card',
        tone === 'neutro' && 'bg-muted',
      )}
    >
      <h1 id="certificado-estado" className="sz-h2 flex items-center gap-3">
        <Icon aria-hidden="true" className="size-8 flex-none" />
        {title}
      </h1>
      {children}
    </article>
  )
}
