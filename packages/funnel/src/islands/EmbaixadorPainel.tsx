import { useId, useState } from 'react'
import { ApiError, apiPost } from '../lib/api-fetch'
import { formatBRLFromCents2 } from '../lib/money'

/**
 * Painel do embaixador (landing /embaixador/<token>, capability URL — sem
 * conta/senha). Duas ações: COMPARTILHAR o link de bolsa (primário — a mensagem
 * pronta vai no WhatsApp DELE, nunca da plataforma) e convidar por e-mail
 * (secundário — a plataforma envia UM convite, com opt-out, LGPD por desenho).
 */
export interface BonusItem {
  id: string
  status: 'pending' | 'eligible' | 'paid'
  bonusCents: number
  subscribedAt: string
  paidMarkedAt: string | null
}

export interface EmbaixadorPainelProps {
  token: string
  name: string
  shareUrl: string
  stats: { redemptionsCompleted: number; invitesSent: number }
  bonus?: { pixKey: string | null; items: BonusItem[] }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function bonusLabel(item: BonusItem, hasPixKey: boolean): string {
  if (item.status === 'paid') {
    const when = item.paidMarkedAt
      ? ` em ${new Date(item.paidMarkedAt).toLocaleDateString('pt-BR')}`
      : ''
    return `pago${when}`
  }
  // ⚠️ Sem chave cadastrada NÃO há "pagamento a caminho": ele fica parado
  // esperando o próprio embaixador, e prometer o contrário faz a pessoa
  // fechar a página sem resolver a única coisa que trava o Pix.
  if (item.status === 'eligible') {
    return hasPixKey ? 'liberado, pagamento a caminho' : 'liberado, falta a sua chave Pix'
  }
  return 'aguardando a garantia de 7 dias'
}

export default function EmbaixadorPainel({ token, shareUrl, stats, bonus }: EmbaixadorPainelProps) {
  const uid = useId()
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [invitesSent, setInvitesSent] = useState(stats.invitesSent)
  const [pixKey, setPixKey] = useState(bonus?.pixKey ?? '')
  const [savingPix, setSavingPix] = useState(false)
  const [pixMsg, setPixMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Chave que o SERVIDOR tem (só muda quando o salvamento confirma) — digitar
  // no campo não pode fazer o rótulo do bônus dizer que o Pix vai sair.
  const [savedPixKey, setSavedPixKey] = useState(bonus?.pixKey ?? '')
  const hasPixKey = savedPixKey.trim().length > 0
  const needsPixKey = !hasPixKey && Boolean(bonus?.items.some((i) => i.status === 'eligible'))

  async function salvarPix() {
    if (savingPix) return
    const key = pixKey.trim()
    if (key.length < 5 || key.length > 140) {
      setPixMsg({
        kind: 'err',
        text: 'Confira a chave: ela parece incompleta ou longa demais. Vale CPF, e-mail, telefone ou chave aleatória.',
      })
      return
    }
    setSavingPix(true)
    setPixMsg(null)
    try {
      await apiPost('/api/embaixador/pix', { token, pixKey: key })
      setSavedPixKey(key)
      setPixMsg({ kind: 'ok', text: 'Chave Pix salva!' })
    } catch (err) {
      // 4xx é DETERMINÍSTICO (chave inválida/página fora do ar): "tente de
      // novo em instantes" mentiria — re-tentar nunca resolveria.
      const status = err instanceof ApiError ? err.status : 0
      setPixMsg({
        kind: 'err',
        text:
          status >= 400 && status < 500
            ? 'Essa chave não passou. Confira se ela está completa e tente com outra se precisar.'
            : 'Não foi possível salvar agora. Tente de novo em instantes.',
      })
    }
    setSavingPix(false)
  }

  const shareMessage = [
    `Oi! Eu consegui uma bolsa 100% de um curso em que a criança cria o próprio jogo de computador em 5 dias (a partir de 9 anos) 🎮`,
    ``,
    `É do Sistema Zero, e com o meu link o acesso é completo, vitalício e sem pagar nada:`,
    shareUrl,
  ].join('\n')

  async function copy(text: string, kind: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      // Clipboard bloqueado (http/permissão): selecionar à mão ainda funciona.
      window.prompt('Copie o texto abaixo:', text)
    }
  }

  async function convidar() {
    if (sending) return
    if (nome.trim().length < 2 || !EMAIL_RE.test(email.trim())) {
      setInviteMsg({ kind: 'err', text: 'Preencha o nome e um e-mail válido.' })
      return
    }
    setSending(true)
    setInviteMsg(null)
    try {
      await apiPost('/api/embaixador/convites', {
        token,
        nome: nome.trim(),
        email: email.trim(),
      })
      setInvitesSent((n) => n + 1)
      setInviteMsg({ kind: 'ok', text: `Convite enviado para ${email.trim()} 🎉` })
      setNome('')
      setEmail('')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVITE_ALREADY_SENT') {
        setInviteMsg({ kind: 'err', text: 'Esse e-mail já recebeu o convite.' })
      } else if (err instanceof ApiError && err.code === 'EMAIL_ALREADY_REDEEMED') {
        setInviteMsg({ kind: 'err', text: 'Boa notícia: esse e-mail já resgatou a bolsa!' })
      } else if (err instanceof ApiError && err.code === 'INVITE_DAILY_LIMIT') {
        setInviteMsg({
          kind: 'err',
          text: 'Você atingiu o limite de convites de hoje. Amanhã pode mais!',
        })
      } else {
        setInviteMsg({
          kind: 'err',
          text: 'Não foi possível enviar agora. Tente de novo em instantes.',
        })
      }
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card rounded-2xl border-line/80 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-ink">Compartilhe o seu link de bolsa</h2>
        <p className="mt-2 text-sm text-muted">
          Quem entrar por ele ganha o <strong className="text-ink">Desafio do Primeiro Jogo</strong>{' '}
          completo, de graça e para sempre, indicado por você.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Seu link de bolsa"
            className="w-full flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => void copy(shareUrl, 'link')}
            className="btn btn-primary shrink-0"
          >
            {copied === 'link' ? 'Copiado! ✓' : 'Copiar link'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copy(shareMessage, 'message')}
          className="mt-3 text-sm font-semibold text-cyan underline-offset-2 hover:underline"
        >
          {copied === 'message' ? 'Mensagem copiada! ✓' : 'Copiar mensagem pronta pro WhatsApp'}
        </button>
      </div>

      <div className="card rounded-2xl border-line/80 bg-card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-ink">Ou envie o convite por e-mail</h2>
        <p className="mt-2 text-sm text-muted">
          A gente manda um único e-mail dizendo que foi você quem indicou, com o link da bolsa. Nada
          de spam depois.
        </p>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void convidar()
          }}
          className="mt-4 flex flex-col gap-3"
        >
          <input
            id={`${uid}-nome`}
            type="text"
            placeholder="Nome de quem vai receber"
            aria-label="Nome de quem vai receber"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan"
          />
          <input
            id={`${uid}-email`}
            type="email"
            inputMode="email"
            placeholder="email@dapessoa.com"
            aria-label="E-mail de quem vai receber"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan"
          />
          {inviteMsg && (
            <p className={`text-sm ${inviteMsg.kind === 'ok' ? 'text-ink' : 'text-red-400'}`}>
              {inviteMsg.text}
            </p>
          )}
          <button type="submit" disabled={sending} className="btn btn-primary disabled:opacity-50">
            {sending ? 'Enviando…' : 'Enviar convite'}
          </button>
        </form>
      </div>

      {bonus && bonus.items.length > 0 && (
        <div className="card rounded-2xl border-line/80 bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-ink">Seus bônus</h2>
          <p className="mt-2 text-sm text-muted">
            Quando uma família que ganhou a bolsa com o seu link assina a Comunidade dos Criadores,
            você recebe um agradecimento em dinheiro. Ele libera depois do período de garantia de 7
            dias e a gente paga por Pix.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {bonus.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"
              >
                <span className="text-muted">
                  Assinatura em {new Date(item.subscribedAt).toLocaleDateString('pt-BR')}
                </span>
                <span className="font-semibold text-ink">
                  {formatBRLFromCents2(item.bonusCents)} · {bonusLabel(item, hasPixKey)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <label htmlFor={`${uid}-pix`} className="mb-1.5 block text-sm font-semibold text-ink">
              Sua chave Pix para receber
            </label>
            {needsPixKey && (
              <p id={`${uid}-pix-hint`} className="mb-2 text-sm font-semibold text-ink">
                Cadastre a sua chave para o dinheiro sair: sem ela o pagamento fica parado.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`${uid}-pix`}
                type="text"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={pixKey}
                onChange={(e) => {
                  setPixKey(e.target.value)
                  // A mensagem antiga ("Chave Pix salva!") não pode sobreviver à
                  // edição: quem corrigiu a chave sairia achando que salvou.
                  setPixMsg(null)
                }}
                aria-invalid={pixMsg?.kind === 'err' || undefined}
                aria-describedby={
                  [pixMsg ? `${uid}-pix-msg` : '', needsPixKey ? `${uid}-pix-hint` : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className="w-full flex-1 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan"
              />
              <button
                type="button"
                onClick={() => void salvarPix()}
                disabled={savingPix}
                className="btn btn-primary shrink-0 disabled:opacity-50"
              >
                {savingPix ? 'Salvando…' : 'Salvar chave'}
              </button>
            </div>
            {pixMsg && (
              // role=alert: a confirmação/recusa é sobre DINHEIRO e precisa ser
              // anunciada a quem usa leitor de tela.
              <p
                id={`${uid}-pix-msg`}
                role="alert"
                className={`mt-2 text-sm ${pixMsg.kind === 'ok' ? 'text-ink' : 'font-semibold text-red-600'}`}
              >
                {pixMsg.text}
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            O bônus é um agradecimento único por indicação que virar assinatura. Não é salário nem
            renda garantida e não cria vínculo com a plataforma. Pagamos por Pix na chave acima,
            normalmente em poucos dias depois da liberação.
          </p>
        </div>
      )}

      <div className="card rounded-2xl border-line/80 bg-card p-6 text-center sm:p-8">
        <p className="text-sm text-muted">Bolsas resgatadas pelo seu link</p>
        <p className="mt-1 text-4xl font-bold text-ink">{stats.redemptionsCompleted}</p>
        <p className="mt-2 text-xs text-muted">
          {invitesSent} convite{invitesSent === 1 ? '' : 's'} por e-mail enviado
          {invitesSent === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
