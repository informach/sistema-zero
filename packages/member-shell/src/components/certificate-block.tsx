'use client'

import { Award, Download, Loader2, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CertificateBlock, CertificateStateView } from '../lib/types'
import { useLessonPlayer } from './lesson-player-context'

/** Nome do arquivo do `content-disposition` do servidor (por curso: `certificado-<slug>.pdf`). */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename="?([^";]+)"?/i.exec(header)
  return m?.[1]?.trim() || null
}

/**
 * Copy por tom: `default` (adulto) e `kids` (8–13 anos — voz humana/fluida, sem
 * jargão como "emissão", sem travessão). A semântica/estado é idêntica nos dois.
 */
const CERTIFICATE_COPY = {
  default: {
    locked: 'Conclua as aulas anteriores ao certificado para liberar a emissão.',
    eligibleDesc: 'Você concluiu as aulas necessárias. Emita seu certificado de conclusão.',
    eligibleBtn: 'Emitir meu certificado',
    issuedDesc: 'Seu certificado está pronto. Baixe quantas vezes quiser, é sempre o mesmo.',
    issuedBtn: 'Baixar certificado (PDF)',
    notEligible: 'Conclua as aulas anteriores ao certificado para emitir.',
  },
  kids: {
    locked: 'Conclua as aulas de antes e seu certificado aparece aqui!',
    eligibleDesc: 'Você arrasou! Toque no botão para pegar o seu certificado.',
    eligibleBtn: 'Pegar meu certificado',
    issuedDesc: 'Seu certificado está pronto! Pode baixar quantas vezes quiser.',
    issuedBtn: 'Baixar certificado (PDF)',
    notEligible: 'Conclua as aulas de antes para pegar o seu certificado.',
  },
} as const

/**
 * Bloco CERTIFICADO (pode ficar em qualquer aula do curso). Lê o estado no members
 * (`GET …/certificate`): bloqueado até concluir as aulas anteriores; elegível → "Emitir";
 * já emitido → "Baixar (PDF)" + nº de série + link de validação. Emitir/baixar é um POST
 * que devolve o PDF em STREAM (mesma origem) — o navegador baixa o blob; a 1ª vez emite,
 * as próximas rebaixam o MESMO certificado (idempotente no members).
 */
export function CertificateBlockView({
  blockId,
  content,
  tone = 'default',
}: {
  blockId: string
  content: CertificateBlock
  /** Voz do texto: `kids` suaviza a copy para crianças (default = adulto). */
  tone?: 'default' | 'kids'
}) {
  const copy = CERTIFICATE_COPY[tone]
  const player = useLessonPlayer()
  const lessonId = player?.lessonId ?? null
  const [state, setState] = useState<CertificateStateView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const path = lessonId
    ? `/api/members/lessons/${encodeURIComponent(lessonId)}/blocks/${encodeURIComponent(blockId)}/certificate`
    : null

  useEffect(() => {
    if (!path) return
    let alive = true
    setLoading(true)
    fetch(path)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CertificateStateView | null) => {
        if (alive) setState(data)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [path])

  const download = useCallback(async () => {
    if (!path) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
        const code = data?.error?.code
        if (code === 'CERTIFICATE_REVOKED') {
          // Revogado pelo admin entre a leitura do estado e o clique — reflete na UI
          // (o ramo "revogado" esconde o botão); revogação é terminal, sem "tente de novo".
          setState((s) => (s ? { ...s, revoked: true } : s))
          setError('Este certificado foi revogado e não está mais disponível.')
          return
        }
        setError(
          code === 'CERTIFICATE_NOT_ELIGIBLE'
            ? copy.notEligible
            : 'Não foi possível gerar o certificado agora. Tente novamente.',
        )
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // O servidor nomeia por curso (`certificado-<slug>.pdf`); blob ignora o header, então o
      // `download` lê o `content-disposition` explicitamente (fallback genérico se faltar).
      a.download =
        filenameFromDisposition(res.headers.get('content-disposition')) ?? 'certificado.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      // Pós-emissão: estado vira "emitido" (o botão passa a "Baixar").
      setState((s) => ({
        eligible: true,
        issued: true,
        revoked: false,
        serial: s?.serial ?? null,
        issuedAt: s?.issuedAt ?? null,
        revokedAt: null,
      }))
    } catch {
      setError('Não foi possível gerar o certificado agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }, [path, copy.notEligible])

  const title = content.title?.trim() || 'Certificado de Conclusão'

  if (loading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center rounded-lg border border-border bg-card py-10 text-sm text-muted-foreground"
      >
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Carregando certificado…
      </div>
    )
  }

  const eligible = state?.eligible ?? false
  const issued = state?.issued ?? false
  const revoked = state?.revoked ?? false

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {eligible || issued ? (
          <Award className="size-6" aria-hidden />
        ) : (
          <Lock className="size-6" aria-hidden />
        )}
      </div>
      <h3 className="sz-display text-lg font-bold text-foreground">{title}</h3>

      {/* Região viva: a virada bloqueado→elegível→emitido é anunciada ao leitor de tela. */}
      <div aria-live="polite">
        {revoked ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Este certificado foi revogado e não está disponível para download.
            </p>
            {state?.serial ? (
              <p className="mt-3 text-xs text-muted-foreground">Nº {state.serial}</p>
            ) : null}
          </>
        ) : issued ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{copy.issuedDesc}</p>
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {copy.issuedBtn}
            </button>
            {state?.serial ? (
              <p className="mt-3 text-xs text-muted-foreground">Nº {state.serial}</p>
            ) : null}
          </>
        ) : eligible ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{copy.eligibleDesc}</p>
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Award className="size-4" aria-hidden />
              )}
              {copy.eligibleBtn}
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{copy.locked}</p>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
