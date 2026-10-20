import { useId, useState } from 'react'
import { PAINEL_EMBAIXADOR } from '../content/embaixador'
import { ApiError, apiPost } from '../lib/api-fetch'
import { formatBRLFromCents2 } from '../lib/money'

/**
 * O bônus do embaixador e a chave Pix (seção #bonus de /embaixador/<token>). O valor do
 * agradecimento vem SEMPRE do serviço (`bonus.amountCents`); sem ele, a copy diz "um bônus" e não
 * inventa valor. ⚠️ "liberado, aguardando pagamento" só com chave SALVA no servidor: sem ela o Pix
 * fica parado esperando o próprio embaixador, e prometer o contrário faz a pessoa fechar a página
 * sem resolver a única coisa que trava o pagamento.
 */
export interface BonusItem {
  id: string
  status: 'pending' | 'eligible' | 'paid'
  bonusCents: number
  subscribedAt: string
  paidMarkedAt: string | null
}

export interface EmbaixadorBonusProps {
  token: string
  bonus: { pixKey: string | null; items: BonusItem[]; amountCents?: number }
}

const T = PAINEL_EMBAIXADOR.bonus
// Fuso fixo: o servidor (UTC) e o navegador renderizam o mesmo dia, sem divergir na hidratação.
const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

export function bonusLabel(item: BonusItem, hasPixKey: boolean): string {
  if (item.status === 'paid')
    return item.paidMarkedAt
      ? T.estados.pagoEm.replace('{{data}}', dataCurta(item.paidMarkedAt))
      : T.estados.pago
  if (item.status === 'eligible')
    return hasPixKey ? T.estados.liberadoComChave : T.estados.liberadoSemChave
  return T.estados.garantia
}

export default function EmbaixadorBonus({ token, bonus }: EmbaixadorBonusProps) {
  const uid = useId()
  const [pixKey, setPixKey] = useState(bonus.pixKey ?? '')
  const [savingPix, setSavingPix] = useState(false)
  const [pixMsg, setPixMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Chave que o SERVIDOR tem (só muda quando o salvamento confirma): digitar no campo não pode
  // fazer o rótulo do bônus dizer que o Pix vai sair.
  const [savedPixKey, setSavedPixKey] = useState(bonus.pixKey ?? '')
  const hasPixKey = savedPixKey.trim().length > 0
  const needsPixKey = !hasPixKey && bonus.items.some((i) => i.status === 'eligible')

  async function salvarPix() {
    if (savingPix) return
    const key = pixKey.trim()
    if (key.length < 5 || key.length > 140) {
      setPixMsg({ kind: 'err', text: T.pixTamanho })
      return
    }
    setSavingPix(true)
    setPixMsg(null)
    try {
      await apiPost('/api/embaixador/pix', { token, pixKey: key })
      setSavedPixKey(key)
      setPixMsg({ kind: 'ok', text: T.salvo })
    } catch (err) {
      // 4xx é DETERMINÍSTICO (chave inválida/página fora do ar): "tente de novo em instantes"
      // mentiria, porque tentar de novo nunca resolveria.
      const status = err instanceof ApiError ? err.status : 0
      setPixMsg({ kind: 'err', text: status >= 400 && status < 500 ? T.pixRecusada : T.pixFalha })
    }
    setSavingPix(false)
  }

  return (
    <div className="emb-bonus">
      <div className="emb-bonus__texto">
        <h2 className="emb-h2">{T.titulo}</h2>
        <p className="emb-p">
          {T.antes}
          {typeof bonus.amountCents === 'number'
            ? formatBRLFromCents2(bonus.amountCents)
            : T.semValor}
          {T.depois}
        </p>
        {bonus.items.length > 0 ? (
          <ul className="emb-bonus__lista">
            {bonus.items.map((item) => (
              <li key={item.id}>
                <span>{T.item.replace('{{data}}', dataCurta(item.subscribedAt))}</span>
                <strong>
                  {formatBRLFromCents2(item.bonusCents)} · {bonusLabel(item, hasPixKey)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="emb-ajuda">{T.vazio}</p>
        )}
        <p className="emb-ajuda">{T.termos}</p>
      </div>
      <form
        noValidate
        className="emb-cartao emb-cartao--suave emb-form"
        onSubmit={(e) => {
          e.preventDefault()
          void salvarPix()
        }}
      >
        <label htmlFor={`${uid}-pix`} className="emb-rotulo">
          {T.pixRotulo}
        </label>
        {needsPixKey && (
          <p id={`${uid}-pix-hint`} className="emb-alerta">
            {T.pixFalta}
          </p>
        )}
        <input
          id={`${uid}-pix`}
          type="text"
          placeholder={T.pixPlaceholder}
          value={pixKey}
          onChange={(e) => {
            setPixKey(e.target.value)
            // A mensagem antiga ("Chave Pix salva.") não pode sobreviver à edição: quem corrigiu a
            // chave sairia achando que salvou.
            setPixMsg(null)
          }}
          aria-invalid={pixMsg?.kind === 'err' || undefined}
          aria-describedby={
            [pixMsg ? `${uid}-pix-msg` : '', needsPixKey ? `${uid}-pix-hint` : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="emb-input"
        />
        <button type="submit" disabled={savingPix} className="emb-btn emb-btn--inicio">
          {savingPix ? T.salvando : T.salvar}
        </button>
        {pixMsg && (
          // role=alert: a confirmação/recusa é sobre DINHEIRO e precisa ser anunciada a quem usa
          // leitor de tela.
          <p
            id={`${uid}-pix-msg`}
            role="alert"
            className={pixMsg.kind === 'ok' ? 'emb-ok' : 'emb-erro'}
          >
            {pixMsg.text}
          </p>
        )}
        <p className="emb-ajuda">{T.resumo}</p>
      </form>
    </div>
  )
}
