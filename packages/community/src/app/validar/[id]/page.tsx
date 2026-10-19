import type { CertificateValidationView } from '@sistemazero/member-shell/lib/types'
import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { BadgeCheck, type LucideIcon, RefreshCw, SearchX, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
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
 * busca no servidor pelo client público do members. Pele adulta de 18/10/2026: a logo no alto, o
 * cartão com a faixa verde de válido e frases diretas nos outros três estados.
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
      <header className="border-border border-b bg-card">
        <div className="sz-page flex min-h-20 items-center">
          <BrandLogo fundo="claro" label="Sistema Zero" className="block h-auto w-44" />
        </div>
      </header>
      <main className="sz-page flex flex-1 items-start justify-center pt-10 pb-16 md:items-center">
        {serviceError ? (
          <StateCard
            icon={RefreshCw}
            chip="Fora do ar"
            title="Não foi possível validar agora"
            tone="neutro"
          >
            <p className="m-0">
              A conferência falhou do nosso lado. Recarregue a página em alguns instantes.
            </p>
          </StateCard>
        ) : v.valid ? (
          <article
            aria-labelledby="certificado-valido"
            className="sz-card w-full max-w-[41rem] overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-(--pen-sucesso) px-7 py-5 text-white">
              <BadgeCheck aria-hidden="true" className="size-8 flex-none" />
              <h1 id="certificado-valido" className="sz-h2 text-white">
                Certificado válido
              </h1>
            </div>
            <div className="flex flex-col gap-5 p-7">
              <div className="flex flex-col gap-1">
                <p className="m-0 text-[1.1rem]">
                  <strong>{v.studentName}</strong> concluiu o curso
                </p>
                <p className="sz-h3 m-0">{v.courseTitle}</p>
              </div>
              <dl className="m-0 grid gap-3 sm:grid-cols-2">
                <div className="sz-soft flex flex-col gap-1 px-4 py-3">
                  <dt className="text-muted-foreground text-xs">Emitido pelo Sistema Zero em</dt>
                  <dd className="m-0 font-bold">{formatDate(v.issuedAt)}</dd>
                </div>
                {v.serial ? (
                  <div className="sz-soft flex flex-col gap-1 px-4 py-3">
                    <dt className="text-muted-foreground text-xs">Número do certificado</dt>
                    <dd className="m-0 font-bold font-mono">{v.serial}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="m-0 text-muted-foreground">
                Esta página confirma que o certificado foi emitido pela Sistema Zero e continua
                válido. Ela abre para qualquer pessoa que escanear o QR do certificado.
              </p>
            </div>
          </article>
        ) : revoked ? (
          <StateCard icon={ShieldAlert} chip="Revogado" title="Certificado revogado" tone="alerta">
            {v.studentName && v.courseTitle ? (
              <p className="m-0">
                Emitido para <strong>{v.studentName}</strong>, no curso{' '}
                <strong>{v.courseTitle}</strong>.
              </p>
            ) : null}
            <p className="m-0">Este certificado foi revogado e não é mais válido.</p>
            {v.revokedAt || v.serial ? (
              <p className="m-0 text-muted-foreground text-xs">
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
          <StateCard
            icon={SearchX}
            chip="Não encontrado"
            title="Certificado não encontrado"
            tone="alerta"
          >
            <p className="m-0">
              Este certificado não existe ou não é mais válido. Confira se o QR foi lido inteiro.
            </p>
          </StateCard>
        )}
      </main>
    </div>
  )
}

function StateCard({
  icon: Icon,
  chip,
  title,
  tone,
  children,
}: {
  icon: LucideIcon
  chip: string
  title: string
  tone: 'alerta' | 'neutro'
  children: ReactNode
}) {
  return (
    <article
      aria-labelledby="certificado-estado"
      className="sz-card flex w-full max-w-[41rem] flex-col gap-4 p-7"
    >
      <span
        className={tone === 'alerta' ? 'sz-chip sz-chip-aviso self-start' : 'sz-chip self-start'}
      >
        <Icon aria-hidden="true" />
        {chip}
      </span>
      <h1 id="certificado-estado" className="sz-h2">
        {title}
      </h1>
      {children}
    </article>
  )
}
