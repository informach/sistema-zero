import type { GiftAudience, GiftMuralAccess } from '@sistemazero/core/referrals'
import { formatTelefone } from '@sistemazero/ui/phone'
import { useEffect, useId, useRef, useState } from 'react'
import {
  dataBrasilia,
  RESGATE_COPY,
  type ResgateCopy,
  resgateHref,
} from '../content/presente-resgate'
import { ApiError, apiPost } from '../lib/api-fetch'

/**
 * Formulário de resgate do presente (landing /bolsa/<codigo>), um por público (20/10/2026):
 * - `kids`: dados do RESPONSÁVEL (mesmo aviso do pré-checkout Kids), Termos da Comunidade Kids e
 *   botões para o app Kids;
 * - `adult`: dados da própria pessoa, confirmação de 18 anos ou mais, Termos adultos e botões para
 *   o app adulto.
 * Telefone opcional nos dois. O resgate é retomável no servidor: repetir o envio após uma falha
 * CONTINUA de onde parou (mesmo e-mail), então o botão de tentar de novo é sempre seguro. A ilha
 * não lê env: a URL do app do público chega por prop. O visual vem da página (classes `bz-*`,
 * desenhadas em presente-kids.css e presente-adulto.css).
 */
export interface BolsaResgateProps {
  code: string
  referrerName: string
  /** Base do app do público (Kids ou adulto), sem a barra final. */
  communityUrl: string
  /** Ausente = `kids` (o formulário anterior ao presente adulto). */
  audience?: GiftAudience
  retryOnly?: boolean
}

type Phase = 'form' | 'processing' | 'done'
type Errors = Partial<Record<'nome' | 'email', string>>
type Destino = ResgateCopy['linksAposErro'][number]['destino']

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function BolsaResgate({
  code,
  referrerName,
  communityUrl,
  audience = 'kids',
  retryOnly = false,
}: BolsaResgateProps) {
  const t = RESGATE_COPY[audience]
  const [phase, setPhase] = useState<Phase>('form')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [linksErro, setLinksErro] = useState<ResgateCopy['linksAposErro'] | null>(null)
  const [jaResgatado, setJaResgatado] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    email: string
    expiresAt: string | null
    emailStatus: 'accepted' | 'failed' | 'unknown'
    muralAccess?: GiftMuralAccess
  } | null>(null)
  const uid = useId()
  const inFlight = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const href = (destino: Destino) => resgateHref(destino, communityUrl)
  useEffect(() => {
    if (phase !== 'form') resultHeading.current?.focus()
  }, [phase])

  function validate(): boolean {
    const next: Errors = {}
    if (nome.trim().length < 2 || nome.trim().length > 120) next.nome = t.campos.nome.erro
    if (!EMAIL_RE.test(email.trim()) || email.trim().length > 254) next.email = t.campos.email.erro
    setErrors(next)
    if (Object.keys(next).length) {
      form.current
        ?.querySelector<HTMLInputElement>(`[name="${next.nome ? 'nome' : 'email'}"]`)
        ?.focus()
    }
    return Object.keys(next).length === 0
  }

  function falhou(mensagem: string, links: ResgateCopy['linksAposErro'] | null = null) {
    setErroGeral(mensagem)
    setLinksErro(links)
  }

  async function resgatar() {
    if (inFlight.current || !validate()) return
    inFlight.current = true
    setSubmitting(true)
    setErroGeral(null)
    setLinksErro(null)
    setJaResgatado(false)
    try {
      const params = new URLSearchParams(window.location.search)
      const res = await apiPost<{
        status: 'completed' | 'processing'
        expiresAt: string | null
        emailStatus: 'accepted' | 'failed' | 'unknown'
        muralAccess?: GiftMuralAccess
      }>('/api/bolsa/resgatar', {
        code,
        nome: nome.trim(),
        email: email.trim(),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
        attribution: {
          utmSource: params.get('utm_source'),
          utmMedium: params.get('utm_medium'),
          utmCampaign: params.get('utm_campaign'),
          utmContent: params.get('utm_content'),
        },
      })
      if (res.status === 'completed')
        setConfirmation({
          email: email.trim(),
          expiresAt: res.expiresAt,
          emailStatus: res.emailStatus,
          muralAccess: res.muralAccess,
        })
      setPhase(res.status === 'completed' ? 'done' : 'processing')
    } catch (err) {
      if (!(err instanceof ApiError)) falhou(t.erros.rede)
      // Desde 20/10/2026 o "já resgatado" vale por público: o mesmo e-mail pode ter um Kids e um adulto.
      else if (err.code === 'SCHOLARSHIP_ALREADY_REDEEMED') setJaResgatado(true)
      else if (err.code === 'GIFT_EXPIRED') falhou(t.erros.expirado, t.linksAposErro)
      else if (err.code === 'CAMPAIGN_UNAVAILABLE') falhou(t.erros.campanha, t.linksAposErro)
      else if (err.code === 'CODE_NOT_FOUND') falhou(t.erros.naoEncontrado)
      else if (err.code === 'GIFT_UNAVAILABLE') falhou(t.erros.preparando)
      else if (err.code === 'SCHOLARSHIP_FAILED') falhou(t.erros.falhou)
      else if (err.status === 429) falhou(t.erros.limite)
      else falhou(t.erros.generico)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  if (phase === 'done') {
    const c = t.concluido
    return (
      <div role="status" aria-live="polite" className="bz-card bz-card--resultado">
        <span className="bz-selo">{c.selo}</span>
        <h3 ref={resultHeading} tabIndex={-1} className="bz-titulo">
          {c.titulo}
        </h3>
        <p className="bz-texto">
          {c.conta.split('{{email}}')[0]}
          <strong>{confirmation?.email}</strong>
          {confirmation?.expiresAt
            ? c.ate.replace('{{data}}', dataBrasilia(confirmation.expiresAt))
            : '.'}{' '}
          {confirmation?.emailStatus === 'accepted' ? c.emailAceito : c.emailIncerto}
        </p>
        <p className="bz-texto">
          {c.proximo}
          {confirmation?.muralAccess === 'trial' && ` ${c.muralTrial}`}
          {confirmation?.muralAccess === 'visitor' && ` ${c.muralVisitante}`}
        </p>
        <div className="bz-acoes">
          <a className="bz-btn" href={href('login')}>
            {c.entrar}
          </a>
          <a className="bz-link" href={href('senha')}>
            {c.senha}
          </a>
        </div>
        <p className="bz-nota">{c.nota}</p>
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div role="status" className="bz-card bz-card--resultado">
        <h3 ref={resultHeading} tabIndex={-1} className="bz-titulo">
          {t.processando.titulo}
        </h3>
        <p className="bz-texto">{t.processando.texto}</p>
        <div className="bz-acoes">
          <button
            type="button"
            onClick={() => {
              setPhase('form')
              void resgatar()
            }}
            className="bz-btn"
          >
            {t.processando.botao}
          </button>
        </div>
      </div>
    )
  }

  const campoClasse = (erro?: string) => `bz-input${erro ? ' bz-input--erro' : ''}`
  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void resgatar()
      }}
      className="bz-card"
    >
      {t.aviso && (
        <p className="bz-aviso">
          <strong>{t.aviso.destaque}</strong>
          {t.aviso.texto}
        </p>
      )}

      <div className="bz-campo">
        <label htmlFor={`${uid}-nome`} className="bz-rotulo">
          {t.campos.nome.rotulo}
        </label>
        <input
          id={`${uid}-nome`}
          name="nome"
          required
          maxLength={120}
          disabled={submitting}
          type="text"
          autoComplete="name"
          placeholder={t.campos.nome.placeholder}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }))
          }}
          aria-invalid={errors.nome ? true : undefined}
          aria-describedby={errors.nome ? `${uid}-nome-error` : undefined}
          className={campoClasse(errors.nome)}
        />
        {errors.nome && (
          <p id={`${uid}-nome-error`} role="alert" className="bz-erro">
            {errors.nome}
          </p>
        )}
      </div>

      <div className="bz-campo">
        <label htmlFor={`${uid}-email`} className="bz-rotulo">
          {t.campos.email.rotulo}
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          required
          maxLength={254}
          disabled={submitting}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.campos.email.placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
            if (jaResgatado) setJaResgatado(false)
          }}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${uid}-email-error` : undefined}
          className={campoClasse(errors.email)}
        />
        {errors.email && (
          <p id={`${uid}-email-error`} role="alert" className="bz-erro">
            {errors.email}
          </p>
        )}
      </div>

      <div className="bz-campo">
        <label htmlFor={`${uid}-telefone`} className="bz-rotulo">
          {t.campos.telefone.rotulo}{' '}
          <span className="bz-opcional">{t.campos.telefone.opcional}</span>
        </label>
        <input
          id={`${uid}-telefone`}
          name="telefone"
          maxLength={20}
          disabled={submitting}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t.campos.telefone.placeholder}
          value={telefone}
          onChange={(e) => setTelefone(formatTelefone(e.target.value))}
          className="bz-input"
        />
      </div>

      {jaResgatado && (
        <div role="alert" className="bz-estado">
          <h3 className="bz-estado__titulo">{t.jaResgatado.titulo}</h3>
          <p className="bz-texto">{t.jaResgatado.texto}</p>
          <div className="bz-acoes">
            {t.jaResgatado.links.map((link, index) => (
              <a
                key={link.destino}
                className={index === 0 ? 'bz-btn' : 'bz-link'}
                href={href(link.destino)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
      {erroGeral && (
        <p role="alert" className="bz-alerta">
          {erroGeral}
        </p>
      )}
      {linksErro && (
        <div className="bz-acoes bz-acoes--links">
          {linksErro.map((link) => (
            <a key={link.destino} className="bz-link" href={href(link.destino)}>
              {link.label}
            </a>
          ))}
        </div>
      )}

      <button type="submit" disabled={submitting} className="bz-btn bz-btn--enviar">
        {submitting ? t.enviando : retryOnly ? t.botaoRetomar : t.botao}
      </button>
      <p className="bz-nota">
        {t.rodape.replace('{{nome}}', referrerName)} {t.aceite.antes}
        <a href={t.termosHref}>{t.aceite.termos}</a>
        {t.aceite.meio}
        <a href="/privacidade">{t.aceite.privacidade}</a>
        {t.aceite.depois}
      </p>
    </form>
  )
}
