import type { AmbassadorShareUrls, GiftAudience } from '@sistemazero/core/referrals'
import { useId, useState } from 'react'
import { PAINEL_EMBAIXADOR } from '../content/embaixador'
import { ApiError, apiPost } from '../lib/api-fetch'

/**
 * Painel do embaixador (landing /embaixador/<token>, capability URL, sem conta/senha), Canvas
 * "Presente Kids e adulto · proposta" de 20/10/2026. O embaixador escolhe para quem é o presente
 * (uma família, no Kids, ou um adulto) e o painel mostra o link público, a mensagem pronta e o
 * convite por e-mail DAQUELE público. A mensagem vai no WhatsApp DELE (a plataforma nunca envia);
 * o convite por e-mail é um só por pessoa e leva o `audience` escolhido. O bônus e a chave Pix
 * moram em `EmbaixadorBonus`.
 */
export interface EmbaixadorPainelProps {
  token: string
  /** O link Kids, o único do painel anterior a 20/10/2026. */
  shareUrl: string
  /** Um link por público; ausente na resposta antiga do referrals (vale só o Kids). */
  shareUrls?: AmbassadorShareUrls
  stats: { redemptionsCompleted: number; invitesSent: number }
}

const T = PAINEL_EMBAIXADOR
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PUBLICOS: GiftAudience[] = ['kids', 'adult']

/** Só um endereço http(s) vira `href` e entra na mensagem; qualquer outro esquema conta como ausente. */
const linkPublico = (url: string | null | undefined): string | null =>
  typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url) ? url : null

/** Os links por público, com o `shareUrl` antigo como o link Kids de reserva. */
export function linksDoEmbaixador(
  shareUrl: string,
  shareUrls?: AmbassadorShareUrls,
): Record<GiftAudience, string | null> {
  return {
    kids: linkPublico(shareUrls?.kids ?? shareUrl),
    adult: linkPublico(shareUrls?.adult),
  }
}

export default function EmbaixadorPainel({
  token,
  shareUrl,
  shareUrls,
  stats,
}: EmbaixadorPainelProps) {
  const uid = useId()
  const links = linksDoEmbaixador(shareUrl, shareUrls)
  const [publico, setPublico] = useState<GiftAudience>('kids')
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  // Uma mensagem editável por público: trocar de público não apaga o que a pessoa ajustou.
  const [mensagens, setMensagens] = useState<Record<GiftAudience, string>>(() => ({
    kids: T.mensagens.kids.replace('{{link}}', links.kids ?? ''),
    adult: T.mensagens.adult.replace('{{link}}', links.adult ?? ''),
  }))
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [invitesSent, setInvitesSent] = useState(stats.invitesSent)
  const link = links[publico]
  const mensagem = mensagens[publico]

  async function copy(text: string, kind: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setManualCopy(null)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // Clipboard bloqueado (http/permissão): selecionar à mão ainda funciona.
      setManualCopy(text)
    }
  }

  async function convidar() {
    if (sending || !link) return
    if (nome.trim().length < 2 || !EMAIL_RE.test(email.trim())) {
      setInviteMsg({ kind: 'err', text: T.convite.invalido })
      return
    }
    setSending(true)
    setInviteMsg(null)
    try {
      await apiPost('/api/embaixador/convites', {
        token,
        nome: nome.trim(),
        email: email.trim(),
        audience: publico,
      })
      setInvitesSent((n) => n + 1)
      setInviteMsg({ kind: 'ok', text: T.convite.enviado.replace('{{email}}', email.trim()) })
      setNome('')
      setEmail('')
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      setInviteMsg({
        kind: 'err',
        text:
          code === 'INVITE_ALREADY_SENT'
            ? T.convite.jaEnviado
            : code === 'EMAIL_ALREADY_REDEEMED'
              ? T.convite.jaResgatou[publico]
              : code === 'INVITE_DAILY_LIMIT'
                ? T.convite.limite
                : T.convite.falha,
      })
    }
    setSending(false)
  }

  return (
    <div className="emb-painel">
      <fieldset className="emb-publicos">
        <legend className="emb-sr">{T.seletor.legenda}</legend>
        {PUBLICOS.map((alvo) => {
          const opcao = T.seletor.opcoes[alvo]
          const marcado = publico === alvo
          return (
            <label
              key={alvo}
              className={`emb-publico emb-publico--${alvo}${alvo === 'adult' ? ' theme-arcade' : ''}${marcado ? ' is-marcado' : ''}`}
            >
              <input
                type="radio"
                name={`${uid}-publico`}
                value={alvo}
                checked={marcado}
                onChange={() => {
                  setPublico(alvo)
                  setInviteMsg(null)
                  setManualCopy(null)
                  setCopied(null)
                }}
                className="emb-publico__radio"
              />
              <span className="emb-publico__topo">
                <span className="emb-publico__selo">{opcao.selo}</span>
                <span className="emb-publico__marca" aria-hidden="true">
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              </span>
              <span className="emb-publico__corpo">
                <img
                  src={opcao.imagem.src}
                  alt={opcao.imagem.alt}
                  width={opcao.imagem.width}
                  height={opcao.imagem.height}
                  loading="lazy"
                  decoding="async"
                  className="emb-publico__imagem"
                />
                <span className="emb-publico__texto">
                  <strong className="emb-publico__titulo">{opcao.titulo}</strong>
                  <span>{opcao.texto}</span>
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="emb-grade">
        <section className="emb-cartao emb-cartao--link" aria-labelledby={`${uid}-link-titulo`}>
          <div className="emb-cartao__topo">
            <h2 id={`${uid}-link-titulo`} className="emb-h3">
              {T.link.titulo[publico]}
            </h2>
            <span
              className={`emb-chip emb-chip--${publico}${publico === 'adult' ? ' theme-arcade' : ''}`}
            >
              {T.link.chip[publico]}
            </span>
          </div>
          {link ? (
            <>
              <div className="emb-linha">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={T.link.campo}
                  className="emb-input emb-input--link"
                />
                <button type="button" onClick={() => void copy(link, 'link')} className="emb-btn">
                  {copied === 'link' ? T.link.copiado : T.link.copiar}
                </button>
              </div>
              <a className="emb-link" href={link} target="_blank" rel="noreferrer">
                {T.link.ver}
              </a>
              <label className="emb-rotulo" htmlFor={`${uid}-mensagem`}>
                {T.link.mensagemRotulo}
              </label>
              <p className="emb-ajuda">{T.link.mensagemAjuda}</p>
              <textarea
                id={`${uid}-mensagem`}
                value={mensagem}
                onChange={(event) =>
                  setMensagens((atual) => ({ ...atual, [publico]: event.target.value }))
                }
                rows={6}
                className="emb-input emb-input--mensagem"
              />
              <div className="emb-acoes">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="emb-btn"
                >
                  {T.link.whatsapp}
                </a>
                <button
                  type="button"
                  onClick={() => void copy(mensagem, 'message')}
                  className="emb-btn emb-btn--contorno"
                >
                  {copied === 'message' ? T.link.mensagemCopiada : T.link.copiarMensagem}
                </button>
              </div>
              <p className="emb-ajuda">{T.link.nota}</p>
              {manualCopy && (
                <div role="status" className="emb-manual">
                  <p className="emb-ajuda">{T.link.manual}</p>
                  <textarea
                    aria-label={T.link.manualAria}
                    readOnly
                    value={manualCopy}
                    rows={4}
                    onFocus={(event) => event.target.select()}
                    className="emb-input emb-input--mensagem"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="emb-aviso-link" role="status">
              {T.link.indisponivel}
            </p>
          )}
        </section>

        <div className="emb-coluna">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void convidar()
            }}
            className="emb-cartao emb-form"
            aria-labelledby={`${uid}-convite-titulo`}
          >
            <h2 id={`${uid}-convite-titulo`} className="emb-h3">
              {T.convite.titulo}
            </h2>
            <p className="emb-ajuda">
              {T.convite.antes}
              <strong>{T.convite.paraQuem[publico]}</strong>
              {T.convite.depois}
            </p>
            <label className="emb-rotulo" htmlFor={`${uid}-nome`}>
              {T.convite.nome}
            </label>
            <input
              id={`${uid}-nome`}
              type="text"
              autoComplete="off"
              placeholder={T.convite.nomePlaceholder}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="emb-input"
            />
            <label className="emb-rotulo" htmlFor={`${uid}-email`}>
              {T.convite.email}
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder={T.convite.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="emb-input"
            />
            {!link && <p className="emb-ajuda">{T.convite.semLink}</p>}
            {inviteMsg && (
              <p
                role={inviteMsg.kind === 'err' ? 'alert' : 'status'}
                className={inviteMsg.kind === 'ok' ? 'emb-ok' : 'emb-erro'}
              >
                {inviteMsg.text}
              </p>
            )}
            <button type="submit" disabled={sending || !link} className="emb-btn">
              {sending ? T.convite.enviando : T.convite.enviar}
            </button>
          </form>

          <section className="emb-cartao emb-resgates" aria-labelledby={`${uid}-resgates`}>
            <h2 id={`${uid}-resgates`} className="emb-resgates__titulo">
              {T.resgates.titulo}
            </h2>
            <p className="emb-resgates__numero">{stats.redemptionsCompleted}</p>
            <p className="emb-ajuda">
              {(invitesSent === 1 ? T.resgates.convites.um : T.resgates.convites.varios).replace(
                '{{n}}',
                String(invitesSent),
              )}
            </p>
            <p className="emb-ajuda">{T.resgates.nota}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
