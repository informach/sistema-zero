import type { AmbassadorShareUrls, GiftAudience } from '@sistemazero/core/referrals'
import { ShareCard } from '@sistemazero/ui/share-card'
import { useId, useState } from 'react'
import {
  type ModoEmbaixador,
  type OfertaDoEmbaixador,
  type OpcaoDoEmbaixador,
  opcaoDeOferta,
  opcoesPadrao,
  PAINEL_EMBAIXADOR,
} from '../content/embaixador'
import { ApiError, apiPost } from '../lib/api-fetch'

/**
 * Painel do embaixador (landing /embaixador/<token>, capability URL, sem conta/senha), Canvas da
 * frente de embaixadores e campanhas (25/11/2026): os números (pessoas, convites, bônus), o passo 1
 * (dar um presente ou indicar uma oferta), o passo 2 (as ofertas que o Admin liberou para o
 * público, vindas do referrals) e o passo 3 (o link, com o destino na oferta, o cartão, a mensagem
 * de WhatsApp e o convite por e-mail). A mensagem vai no WhatsApp DELE (a plataforma nunca envia);
 * o convite por e-mail é um só por pessoa. Só quantidades: nenhum valor de venda chega aqui. O
 * bônus e a chave Pix moram em `EmbaixadorBonus`.
 */
export interface EmbaixadorStats {
  redemptionsCompleted: number
  invitesSent: number
  /** Pessoas que entraram pelos links (25/11/2026); `null`/ausente no referrals anterior. */
  people?: number | null
  gifts?: number | null
  purchases?: number | null
}

export interface EmbaixadorPainelProps {
  token: string
  /** O link Kids, o único do painel anterior a 20/10/2026. */
  shareUrl: string
  /** Um link por público; ausente na resposta antiga do referrals (vale só o Kids). */
  shareUrls?: AmbassadorShareUrls
  stats: EmbaixadorStats
  /** As ofertas das listas do Admin, com os links prontos (ausente no referrals anterior). */
  offers?: OfertaDoEmbaixador[]
  /** Quantas assinaturas viraram bônus (os itens visíveis da seção Bônus). */
  bonusCount?: number
}

const T = PAINEL_EMBAIXADOR
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

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

/**
 * As escolhas do painel: as ofertas do Admin (só as com link http(s)), na ordem da lista. Sem
 * nenhum presente na lista, os presentes padrão de cada público (os links de sempre).
 */
export function opcoesDoPainel(
  offers: OfertaDoEmbaixador[] | undefined,
  links: Record<GiftAudience, string | null>,
): Record<ModoEmbaixador, OpcaoDoEmbaixador[]> {
  const validas = (offers ?? [])
    .filter((o) => linkPublico(o.link))
    .map((o) => ({ ...o, checkoutLink: linkPublico(o.checkoutLink) }))
  const presentes = validas.filter((o) => o.kind === 'gift').map(opcaoDeOferta)
  return {
    presente: presentes.length > 0 ? presentes : opcoesPadrao(links),
    oferta: validas.filter((o) => o.kind === 'referral').map(opcaoDeOferta),
  }
}

/** O link do passo 3: o pagamento direto só na indicação de oferta que o tem. */
export function linkDaEscolha(
  opcao: OpcaoDoEmbaixador | undefined,
  destino: 'pagina' | 'pagamento',
): string | null {
  if (!opcao) return null
  if (opcao.modo === 'oferta' && destino === 'pagamento' && opcao.checkoutLink)
    return opcao.checkoutLink
  return opcao.link
}

/** O corpo do convite por e-mail: a oferta e o tipo só quando a escolha não é o presente padrão. */
export function corpoDoConvite(
  token: string,
  opcao: OpcaoDoEmbaixador,
  contato: { nome: string; email: string },
) {
  return {
    token,
    nome: contato.nome,
    email: contato.email,
    audience: opcao.audience,
    ...(opcao.conviteOferta
      ? { offer: opcao.conviteOferta, kind: opcao.modo === 'presente' ? 'gift' : 'referral' }
      : {}),
  }
}

const plural = (n: number, formas: { um: string; varios: string }) =>
  (n === 1 ? formas.um : formas.varios).replace('{{n}}', String(n))

export default function EmbaixadorPainel({
  token,
  shareUrl,
  shareUrls,
  stats,
  offers,
  bonusCount = 0,
}: EmbaixadorPainelProps) {
  const uid = useId()
  const links = linksDoEmbaixador(shareUrl, shareUrls)
  const opcoes = opcoesDoPainel(offers, links)
  const temOfertas = opcoes.oferta.length > 0
  const [modo, setModo] = useState<ModoEmbaixador>('presente')
  const [escolha, setEscolha] = useState<Record<ModoEmbaixador, string | null>>(() => ({
    presente: opcoes.presente[0]?.id ?? null,
    oferta: opcoes.oferta[0]?.id ?? null,
  }))
  const [destino, setDestino] = useState<'pagina' | 'pagamento'>('pagina')
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  // Uma mensagem editável por escolha (e destino): trocar de escolha não apaga o que a pessoa ajustou.
  const [mensagens, setMensagens] = useState<Record<string, string>>({})
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [invitesSent, setInvitesSent] = useState(stats.invitesSent)

  const lista = opcoes[modo]
  const sel = lista.find((o) => o.id === escolha[modo]) ?? lista[0]
  const link = linkDaEscolha(sel, destino)
  const chaveMensagem = sel ? `${sel.id}:${modo === 'oferta' ? destino : 'pagina'}` : ''
  const mensagem =
    mensagens[chaveMensagem] ?? (sel && link ? sel.mensagem.replace('{{link}}', link) : '')
  const novidades = typeof stats.people === 'number'

  function limpar() {
    setInviteMsg(null)
    setManualCopy(null)
    setCopied(null)
  }

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
    if (sending || !sel || !link) return
    if (nome.trim().length < 2 || !EMAIL_RE.test(email.trim())) {
      setInviteMsg({ kind: 'err', text: T.convite.invalido })
      return
    }
    setSending(true)
    setInviteMsg(null)
    try {
      await apiPost(
        '/api/embaixador/convites',
        corpoDoConvite(token, sel, { nome: nome.trim(), email: email.trim() }),
      )
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
              ? T.convite.jaResgatou[sel.audience]
              : code === 'OFFER_NOT_FOUND'
                ? T.convite.ofertaIndisponivel
                : code === 'INVITE_DAILY_LIMIT'
                  ? T.convite.limite
                  : T.convite.falha,
      })
    }
    setSending(false)
  }

  const cartaoAviso = sel
    ? sel.modo === 'oferta'
      ? T.passo3.cartao.oferta
      : T.passo3.cartao[sel.estilo]
    : ''

  return (
    <div className="emb-painel">
      <div className="emb-numeros">
        <section className="emb-cartao emb-numero" aria-labelledby={`${uid}-pessoas`}>
          <h2 id={`${uid}-pessoas`} className="emb-numero__titulo">
            {novidades ? T.numeros.pessoas.titulo : T.numeros.pessoas.tituloAntigo}
          </h2>
          <p className="emb-numero__valor">
            {novidades ? stats.people : stats.redemptionsCompleted}
          </p>
          {novidades && typeof stats.gifts === 'number' && typeof stats.purchases === 'number' && (
            <p className="emb-ajuda">
              {plural(stats.gifts, T.numeros.pessoas.presentes)} e{' '}
              {plural(stats.purchases, T.numeros.pessoas.compras)}.
            </p>
          )}
        </section>
        <section className="emb-cartao emb-numero" aria-labelledby={`${uid}-convites`}>
          <h2 id={`${uid}-convites`} className="emb-numero__titulo">
            {T.numeros.convites.titulo}
          </h2>
          <p className="emb-numero__valor">{invitesSent}</p>
          <p className="emb-ajuda">{T.numeros.convites.texto}</p>
        </section>
        <section className="emb-cartao emb-numero" aria-labelledby={`${uid}-bonus`}>
          <h2 id={`${uid}-bonus`} className="emb-numero__titulo">
            {T.numeros.bonus.titulo}
          </h2>
          <p className="emb-numero__valor">{bonusCount}</p>
          <p className="emb-ajuda">
            {T.numeros.bonus.antes}
            <a className="emb-link" href="#bonus">
              {T.numeros.bonus.link}
            </a>
            {T.numeros.bonus.depois}
          </p>
        </section>
      </div>
      <p className="emb-ajuda">{T.numeros.nota}</p>

      <section className="emb-passo" aria-labelledby={`${uid}-passo1`}>
        <h2 id={`${uid}-passo1`} className="emb-passo__titulo">
          <span className="emb-passo__numero" aria-hidden="true">
            1
          </span>
          {T.passo1.titulo}
        </h2>
        <fieldset className="emb-segmento">
          <legend className="emb-sr">{T.passo1.titulo}</legend>
          {(['presente', 'oferta'] as const)
            .filter((m) => m === 'presente' || temOfertas)
            .map((m) => (
              <label key={m} className={`emb-segmento__opcao${modo === m ? ' is-marcado' : ''}`}>
                <input
                  type="radio"
                  name={`${uid}-modo`}
                  value={m}
                  checked={modo === m}
                  disabled={sending}
                  onChange={() => {
                    setModo(m)
                    limpar()
                  }}
                  className="emb-segmento__radio"
                />
                {m === 'presente' ? T.passo1.presente : T.passo1.oferta}
              </label>
            ))}
        </fieldset>
        <p className="emb-ajuda">{T.passo1.explica[modo]}</p>
      </section>

      <section className="emb-passo" aria-labelledby={`${uid}-passo2`}>
        <h2 id={`${uid}-passo2`} className="emb-passo__titulo">
          <span className="emb-passo__numero" aria-hidden="true">
            2
          </span>
          {T.passo2.titulo[modo]}
        </h2>
        {lista.length === 0 ? (
          <p className="emb-aviso-link" role="status">
            {T.passo2.vazio}
          </p>
        ) : (
          <fieldset className="emb-opcoes">
            <legend className="emb-sr">{T.passo2.titulo[modo]}</legend>
            {lista.map((opcao) => {
              const marcada = opcao.id === sel?.id
              return (
                <label
                  key={opcao.id}
                  className={`emb-opcao emb-opcao--${opcao.estilo}${opcao.estilo === 'adult' ? ' theme-arcade' : ''}${marcada ? ' is-marcado' : ''}`}
                >
                  <input
                    type="radio"
                    name={`${uid}-escolha-${modo}`}
                    value={opcao.id}
                    checked={marcada}
                    disabled={sending}
                    onChange={() => {
                      setEscolha((atual) => ({ ...atual, [modo]: opcao.id }))
                      limpar()
                    }}
                    className="emb-opcao__radio"
                  />
                  <span className="emb-opcao__topo">
                    <span className="emb-opcao__chip">{opcao.chip}</span>
                    <span className="emb-opcao__marca" aria-hidden="true">
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
                  <img
                    src={opcao.imagem.src}
                    alt={opcao.imagem.alt}
                    width={opcao.imagem.width}
                    height={opcao.imagem.height}
                    loading="lazy"
                    decoding="async"
                    className="emb-opcao__imagem"
                  />
                  <strong className="emb-opcao__titulo">{opcao.titulo}</strong>
                  <span className="emb-opcao__texto">{opcao.texto}</span>
                  {opcao.bonus && <span className="emb-opcao__bonus">{T.passo2.bonus}</span>}
                </label>
              )
            })}
          </fieldset>
        )}
      </section>

      {sel && (
        <section className="emb-passo" aria-labelledby={`${uid}-passo3`}>
          <h2 id={`${uid}-passo3`} className="emb-passo__titulo">
            <span className="emb-passo__numero" aria-hidden="true">
              3
            </span>
            {T.passo3.titulo}
          </h2>
          <div className="emb-grade">
            <section className="emb-cartao emb-cartao--link" aria-labelledby={`${uid}-link-titulo`}>
              <div className="emb-cartao__topo">
                <h3 id={`${uid}-link-titulo`} className="emb-h3">
                  {sel.titulo}
                </h3>
                <span
                  className={`emb-chip emb-chip--${sel.estilo}${sel.estilo === 'adult' ? ' theme-arcade' : ''}`}
                >
                  {sel.chip}
                </span>
              </div>
              {sel.modo === 'oferta' && sel.checkoutLink && (
                <fieldset className="emb-segmento emb-segmento--destino">
                  <legend className="emb-rotulo">{T.passo3.destino.rotulo}</legend>
                  {(['pagina', 'pagamento'] as const).map((d) => (
                    <label
                      key={d}
                      className={`emb-segmento__opcao${destino === d ? ' is-marcado' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-destino`}
                        value={d}
                        checked={destino === d}
                        onChange={() => {
                          setDestino(d)
                          limpar()
                        }}
                        className="emb-segmento__radio"
                      />
                      {d === 'pagina' ? T.passo3.destino.pagina : T.passo3.destino.pagamento}
                    </label>
                  ))}
                </fieldset>
              )}
              {sel.modo === 'oferta' && sel.checkoutLink && (
                <p className="emb-ajuda">{T.passo3.destino.explica[destino]}</p>
              )}
              {link ? (
                <>
                  <div className="emb-linha">
                    <input
                      readOnly
                      value={link}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={T.passo3.campo}
                      className="emb-input emb-input--link"
                    />
                    <button
                      type="button"
                      onClick={() => void copy(link, 'link')}
                      className="emb-btn"
                    >
                      {copied === 'link' ? T.passo3.copiado : T.passo3.copiar}
                    </button>
                  </div>
                  <a className="emb-link" href={link} target="_blank" rel="noreferrer">
                    {T.passo3.ver}
                  </a>
                  <div className="mt-3">
                    <ShareCard
                      buttonClassName="emb-btn emb-btn--contorno"
                      url={link}
                      title={sel.titulo}
                      subtitle={sel.chip}
                      description={sel.texto}
                      notice={cartaoAviso}
                    />
                  </div>
                  <label className="emb-rotulo" htmlFor={`${uid}-mensagem`}>
                    {T.passo3.mensagemRotulo}
                  </label>
                  <p className="emb-ajuda">{T.passo3.mensagemAjuda}</p>
                  <textarea
                    id={`${uid}-mensagem`}
                    value={mensagem}
                    onChange={(event) =>
                      setMensagens((atual) => ({ ...atual, [chaveMensagem]: event.target.value }))
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
                      {T.passo3.whatsapp}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copy(mensagem, 'message')}
                      className="emb-btn emb-btn--contorno"
                    >
                      {copied === 'message' ? T.passo3.mensagemCopiada : T.passo3.copiarMensagem}
                    </button>
                  </div>
                  <p className="emb-ajuda">{T.passo3.nota}</p>
                  {manualCopy && (
                    <div role="status" className="emb-manual">
                      <p className="emb-ajuda">{T.passo3.manual}</p>
                      <textarea
                        aria-label={T.passo3.manualAria}
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
                  {T.passo3.indisponivel}
                </p>
              )}
            </section>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void convidar()
              }}
              className="emb-cartao emb-form emb-coluna"
              aria-labelledby={`${uid}-convite-titulo`}
            >
              <h3 id={`${uid}-convite-titulo`} className="emb-h3">
                {T.convite.titulo}
              </h3>
              <p className="emb-ajuda">
                {T.convite.antes}
                <strong>{sel.convite}</strong>
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
                disabled={sending}
                maxLength={120}
                onChange={(e) => {
                  setNome(e.target.value)
                  setInviteMsg(null)
                }}
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
                disabled={sending}
                maxLength={254}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setInviteMsg(null)
                }}
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
          </div>
        </section>
      )}
    </div>
  )
}
