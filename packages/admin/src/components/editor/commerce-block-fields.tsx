'use client'

import type { CampaignView, CourseBenefitSummary } from '@sistemazero/core/referrals'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { apiGet, apiSend } from '@/lib/api'
import type { BlockForm } from '@/lib/lesson-block-form'
import { slugify } from '@/lib/slug'
import type { OfferListItem } from '@/lib/types'

export function CommerceBlockFields({
  form,
  onChange,
  audience,
  courseSlug,
}: {
  form: Pick<
    BlockForm,
    | 'kind'
    | 'commerceOfferRef'
    | 'commerceCampaignCode'
    | 'commerceBenefitCode'
    | 'commerceDescription'
    | 'commerceButtonLabel'
    | 'title'
  >
  onChange: (patch: Partial<BlockForm>) => void
  audience: 'kids' | 'adult'
  courseSlug?: string
}) {
  const [offers, setOffers] = useState<OfferListItem[]>([])
  const [campaigns, setCampaigns] = useState<CampaignView[]>([])
  const [benefits, setBenefits] = useState<CourseBenefitSummary[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [campaignCode, setCampaignCode] = useState('')
  const [campaignEnd, setCampaignEnd] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  )
  const gift = form.kind === 'gift'
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ audience, limit: '100', q: query })
    Promise.all([
      apiGet<{ items: OfferListItem[] }>(`/api/catalog/offers?${params}`, {
        signal: controller.signal,
      }),
      gift
        ? apiGet<{ items: CampaignView[] }>(
            `/api/admin/referrals/campaigns?audience=${audience}&limit=100`,
            { signal: controller.signal },
          )
        : Promise.resolve({ items: [] as CampaignView[] }),
      gift && courseSlug
        ? apiGet<{ items: CourseBenefitSummary[] }>(
            `/api/admin/referrals/course-benefits?${new URLSearchParams({ audience, courseSlug })}`,
            { signal: controller.signal },
          )
        : Promise.resolve({ items: [] as CourseBenefitSummary[] }),
    ])
      .then(([o, c, b]) => {
        setOffers(o.items)
        setCampaigns(c.items)
        setBenefits(b.items)
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Não foi possível consultar ofertas e campanhas. Tente novamente.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [audience, gift, query, courseSlug])
  const campaign = campaigns.find((c) => c.code === form.commerceCampaignCode)
  const benefit = benefits.find((b) => b.code === form.commerceBenefitCode)
  const selected =
    form.commerceOfferRef ||
    offers.find((o) => o.id === (benefit?.giftOfferId ?? campaign?.giftOfferId))?.slug ||
    ''
  const offer = offers.find((o) => o.slug === selected)
  const available = campaigns.filter((c) => c.giftOfferId === offer?.id)
  function newCampaign() {
    setCampaignName(`Presente: ${offer?.name ?? courseSlug ?? 'curso'}`.slice(0, 120))
    setCampaignCode(`${slugify(courseSlug ?? 'curso', 18)}-pres-${crypto.randomUUID().slice(0, 5)}`)
    setCreating(true)
  }
  async function saveCampaign() {
    if (!offer || saving) return
    const endsAt = new Date(`${campaignEnd}T23:59:59-03:00`)
    if (
      !campaignName.trim() ||
      !/^[a-z0-9-]{4,32}$/.test(campaignCode) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt.getTime() <= Date.now()
    ) {
      setError('Confira nome, código e data final da campanha.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await apiSend<{ campaign: CampaignView }>(
        '/api/admin/referrals/campaigns',
        'POST',
        {
          name: campaignName.trim(),
          publicTitle: campaignName.trim(),
          description: '',
          context: 'other',
          code: campaignCode,
          audience,
          giftOfferId: offer.id,
          channel: `curso:${courseSlug ?? 'aula'}`.slice(0, 100),
          startsAt: new Date().toISOString(),
          endsAt: endsAt.toISOString(),
          status: 'active',
          commissionEnabled: false,
        },
      )
      setCampaigns((current) => [
        ...current.filter((c) => c.id !== result.campaign.id),
        result.campaign,
      ])
      onChange({
        commerceOfferRef: offer.slug,
        commerceCampaignCode: result.campaign.code,
        commerceBenefitCode: '',
      })
      setCreating(false)
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'Não foi possível criar a campanha.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">
        {gift
          ? 'Um benefício acompanha o acesso ao curso. Uma campanha aceita resgates durante o período cadastrado. Ambos concedem a oferta sem cobrança para a conta logada.'
          : 'O preço, os benefícios e as formas de pagamento vêm da oferta. O comprador permanece na plataforma.'}
      </p>
      <Field label="Buscar oferta">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome da oferta"
        />
      </Field>
      <Field label="Oferta">
        <Select
          disabled={loading}
          value={selected}
          onChange={(e) =>
            onChange({
              commerceOfferRef: e.target.value,
              ...(gift ? { commerceCampaignCode: '', commerceBenefitCode: '' } : {}),
            })
          }
        >
          <option value="">{loading ? 'Carregando…' : 'Selecione uma oferta'}</option>
          {selected && !offers.some((o) => o.slug === selected) ? (
            <option value={selected}>{selected}</option>
          ) : null}
          {offers
            .filter((o) => o.status !== 'archived')
            .map((o) => (
              <option key={o.id} value={o.slug}>
                {o.name}
              </option>
            ))}
        </Select>
      </Field>
      {gift && (benefits.length > 0 || form.commerceBenefitCode) ? (
        <Field
          label="Benefício permanente do curso"
          hint="Disponível enquanto a pessoa tem acesso a este curso. O presente conserva o prazo de acesso da oferta."
        >
          <Select
            value={form.commerceBenefitCode}
            disabled={loading}
            onChange={(e) =>
              onChange({
                commerceBenefitCode: e.target.value,
                commerceCampaignCode: '',
                commerceOfferRef: '',
              })
            }
          >
            <option value="">Usar campanha com período</option>
            {form.commerceBenefitCode &&
            !benefits.some((b) => b.code === form.commerceBenefitCode) ? (
              <option value={form.commerceBenefitCode}>{form.commerceBenefitCode}</option>
            ) : null}
            {benefits.map((b) => (
              <option key={b.id} value={b.code}>
                {b.name} — {b.status === 'active' ? 'ativo' : 'desativado'}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {gift && !form.commerceBenefitCode ? (
        <Field
          label="Campanha do presente"
          hint="Selecione uma campanha da oferta escolhida. Campanhas pausadas ou encerradas não permitem novas ativações."
        >
          <Select
            value={form.commerceCampaignCode}
            onChange={(e) =>
              onChange({ commerceCampaignCode: e.target.value, commerceBenefitCode: '' })
            }
            disabled={loading || !offer}
          >
            <option value="">Selecione a campanha</option>
            {form.commerceCampaignCode &&
            !available.some((c) => c.code === form.commerceCampaignCode) ? (
              <option value={form.commerceCampaignCode}>{form.commerceCampaignCode}</option>
            ) : null}
            {available.map((c) => (
              <option key={c.id} value={c.code}>
                {c.name} — {c.state}
              </option>
            ))}
          </Select>
          <a
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            href="/admin/embaixadores"
            target="_blank"
            rel="noopener noreferrer"
          >
            Gerenciar campanhas
          </a>
          {offer && !creating ? (
            <Button variant="outline" onClick={newCampaign}>
              Criar campanha para este curso
            </Button>
          ) : null}
        </Field>
      ) : null}
      {gift && creating ? (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <legend className="px-2 font-semibold text-sm">Nova campanha desta oferta</legend>
          <Field label="Nome">
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Código">
            <Input
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value)}
              maxLength={32}
            />
          </Field>
          <Field label="Aceitar novas ativações até (Brasília)">
            <Input
              type="date"
              value={campaignEnd}
              onChange={(e) => setCampaignEnd(e.target.value)}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            A campanha começa ao confirmar. Cada presente segue o prazo da oferta a partir da
            ativação da pessoa. Sem comissão de embaixador nesta criação simplificada.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} onClick={saveCampaign}>
              {saving ? 'Salvando…' : 'Criar e ativar campanha'}
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </fieldset>
      ) : null}
      <Field label="Título (opcional)">
        <Input
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={160}
        />
      </Field>
      <Field label="Descrição curta (opcional)">
        <Input
          value={form.commerceDescription}
          onChange={(e) => onChange({ commerceDescription: e.target.value })}
          maxLength={600}
        />
      </Field>
      <Field label="Texto do botão (opcional)">
        <Input
          value={form.commerceButtonLabel}
          onChange={(e) => onChange({ commerceButtonLabel: e.target.value })}
          maxLength={80}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        A prévia não ativa presentes nem realiza cobranças. Este bloco não é requisito para concluir
        a aula.
      </p>
    </div>
  )
}
