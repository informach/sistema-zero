import type { AmbassadorCampaignPage, AmbassadorCampaignView } from '@sistemazero/core/referrals'
import { campaignCouponPromotion } from '@sistemazero/core/referrals'
import { ShareCard } from '@sistemazero/ui/share-card'
import { CalendarDays, Gift, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

const states: Record<AmbassadorCampaignView['state'], string> = {
  scheduled: 'Agendada',
  active: 'Resgates abertos',
  paused: 'Pausada',
  ended: 'Encerrada',
}
const date = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
const money = (value: number) =>
  (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Campaign({ campaign }: { campaign: AmbassadorCampaignView }) {
  const [copy, setCopy] = useState<'idle' | 'done' | 'manual'>('idle')
  const [couponCopy, setCouponCopy] = useState('')
  const shareable = campaign.state === 'active' || campaign.state === 'scheduled'
  const coupon = campaign.couponView
  const couponShareable = coupon?.state === 'active' || coupon?.state === 'scheduled'
  const period = `De ${date(campaign.startsAt)} até ${date(new Date(Date.parse(campaign.endsAt) - 1).toISOString())} (Brasília).`
  const audience = campaign.audience === 'kids' ? 'Kids · 9 a 17 anos' : 'Adultos · 18 anos ou mais'
  return (
    <article
      className={`emb-cartao emb-campanha ${!shareable && !couponShareable ? 'emb-campanha--inativa' : ''}`}
    >
      <div className="emb-cartao__topo">
        <span
          className={`emb-chip emb-chip--${campaign.audience}${campaign.audience === 'adult' ? ' theme-arcade' : ''}`}
        >
          {audience}
        </span>
        <span className={`emb-campanha__estado emb-campanha__estado--${campaign.state}`}>
          {couponShareable && !shareable ? 'Cupom disponível' : states[campaign.state]}
        </span>
      </div>
      <h3 className="emb-h3">{campaign.publicTitle}</h3>
      <p className="emb-campanha__periodo">
        <CalendarDays size={20} aria-hidden="true" />
        <span>
          <strong>Período de resgate</strong>
          <br />
          {period}
        </span>
      </p>
      <div className="emb-campanha__acordo">
        <Gift size={20} aria-hidden="true" />
        <div>
          <strong>
            {campaign.commissionEnabled ? 'Sua comissão nesta campanha' : 'Campanha sem comissão'}
          </strong>
          <p>
            {campaign.commissionEnabled
              ? `${money(campaign.commissionAmountCents ?? 0)} no mensal ou ${money(campaign.commissionAnnualAmountCents ?? campaign.commissionAmountCents ?? 0)} no anual. Bônus único pela primeira assinatura paga em até ${campaign.commissionWindowDays} dias após o resgate, liberado após a garantia. Sem comissão nas renovações.`
              : 'Os cadastros pelo link são atribuídos a você, sem pagamento de bônus por esta campanha.'}
          </p>
        </div>
      </div>
      {shareable ? (
        <>
          <p className="emb-campanha__orientacao">
            {campaign.state === 'scheduled'
              ? 'Prepare a divulgação. O presente poderá ser resgatado a partir da data de início.'
              : 'Use este link para divulgar a campanha e manter as condições acima.'}
          </p>
          <div className="emb-campanha__acoes">
            <button
              type="button"
              className="emb-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(campaign.shareUrl)
                  setCopy('done')
                } catch {
                  setCopy('manual')
                }
              }}
            >
              <LinkIcon size={18} aria-hidden="true" />
              Copiar link da campanha
            </button>
            <ShareCard
              buttonClassName="emb-btn emb-btn--contorno"
              url={campaign.shareUrl}
              title={campaign.publicTitle}
              subtitle={audience}
              description="7 dias gratuitos no curso Cadê Todo Mundo e no Mural de criações."
              notice={`Resgate: ${period} ${campaign.audience === 'kids' ? 'Cadastro pelo responsável pela criança.' : 'Cadastro para pessoas de 18 anos ou mais.'}`}
            />
          </div>
          <p className="emb-campanha__retorno" role="status">
            {copy === 'done'
              ? 'Link da campanha copiado.'
              : copy === 'manual'
                ? 'Selecione e copie o endereço abaixo.'
                : ''}
          </p>
          <input
            className="emb-input"
            aria-label={`Link público: ${campaign.publicTitle}`}
            readOnly
            value={campaign.shareUrl}
            onFocus={(event) => event.target.select()}
          />
        </>
      ) : (
        <p className="emb-campanha__orientacao">
          Esta campanha não aceita novos resgates. Os acessos e acordos já aceitos são preservados.
        </p>
      )}
      {coupon && (
        <section className="emb-campanha__cupom" aria-label="Cupom de desconto da campanha">
          <span className="emb-etiqueta">Benefício separado · desconto</span>
          <h4 className="emb-h3">{campaignCouponPromotion(coupon, campaign.audience).title}</h4>
          <p>{campaignCouponPromotion(coupon, campaign.audience).description}</p>
          <p className="emb-campanha__periodo">
            {campaignCouponPromotion(coupon, campaign.audience).notice}
          </p>
          <p className="emb-campanha__orientacao">
            {coupon.state === 'unavailable'
              ? 'Cupom indisponível no momento.'
              : couponShareable
                ? 'Este cupom tem seu próprio prazo, independente do presente gratuito.'
                : 'O desconto está encerrado ou pausado. O link permite consultar a oferta pelo preço normal.'}
          </p>
          {couponShareable && (
            <ShareCard
              {...campaignCouponPromotion(coupon, campaign.audience)}
              label="Cartão do cupom"
              buttonClassName="emb-btn emb-btn--contorno"
            />
          )}
          <button
            type="button"
            className="emb-btn emb-btn--contorno"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(coupon.shareUrl)
                setCouponCopy('Link do cupom copiado.')
              } catch {
                setCouponCopy('Selecione e copie o endereço abaixo.')
              }
            }}
          >
            Copiar link do cupom
          </button>
          <p role="status">{couponCopy}</p>
          <a className="emb-link" href={coupon.shareUrl} target="_blank" rel="noreferrer">
            Abrir oferta com cupom
          </a>
          <input
            className="emb-input"
            aria-label={`Link do cupom ${coupon.code}`}
            readOnly
            value={coupon.shareUrl}
            onFocus={(event) => event.target.select()}
          />
        </section>
      )}
    </article>
  )
}

export default function EmbaixadorCampanhas({ campaigns }: { campaigns: AmbassadorCampaignPage }) {
  const page = Math.floor(campaigns.offset / campaigns.limit) + 1
  const pages = Math.max(1, Math.ceil(campaigns.total / campaigns.limit))
  return (
    <div className="emb-pilha">
      <div className="emb-cabeca">
        <span className="emb-etiqueta">Ações em parceria</span>
        <h2 id="emb-campanhas-titulo" className="emb-h2">
          Minhas campanhas
        </h2>
        <p className="emb-lead">
          Cada encontro tem seu próprio convite. Confira o período e use o link da campanha para
          divulgá-la.
        </p>
        <p className="emb-campanhas__nota">
          Datas e comissões são definidas pela equipe do Sistema Zero. Aqui você consulta e prepara
          a divulgação. As condições exibidas valem para novos resgates; quem já resgatou conserva o
          acordo aceito.
        </p>
      </div>
      {campaigns.items.length ? (
        <div className="emb-campanhas__grade">
          {campaigns.items.map((campaign) => (
            <Campaign key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <p className="emb-cartao emb-cartao--suave">
          {campaigns.total
            ? 'Não há campanhas nesta página. Volte para a página anterior.'
            : 'Quando a equipe vincular uma campanha a você, o convite e o cartão aparecerão aqui.'}
        </p>
      )}
      {(pages > 1 || page > 1) && (
        <nav className="emb-campanhas__paginacao" aria-label="Páginas de campanhas">
          {page > 1 && (
            <a
              className="emb-link"
              href={`?campanhas=${Math.min(page - 1, pages)}#minhas-campanhas`}
            >
              Anteriores
            </a>
          )}
          <span>{page <= pages ? `Página ${page} de ${pages}` : 'Página indisponível'}</span>
          {page < pages && (
            <a className="emb-link" href={`?campanhas=${page + 1}#minhas-campanhas`}>
              Próximas
            </a>
          )}
        </nav>
      )}
    </div>
  )
}
