'use client'

import type {
  AmbassadorOfferItem,
  AmbassadorOfferKind,
  AmbassadorOfferView,
} from '@sistemazero/core/referrals'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Switch } from '@sistemazero/ui/switch'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCommunityRequests } from '@/components/admin/community-page'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import {
  type CatalogOfferInfo,
  type CatalogOffersState,
  DEFAULT_GIFT_OFFER_SLUGS,
  useCatalogOffers,
} from './ambassador-offer-catalog'
import { giftOfferStatusLabel } from './campaign-gift-offer'

type Lists = Record<AmbassadorOfferKind, AmbassadorOfferItem[]>

const SECTIONS: Record<
  AmbassadorOfferKind,
  { title: string; text: string; add: string; empty: string }
> = {
  gift: {
    title: 'Presentes',
    text: 'Pagamento único, sem prazo ou com prazo em dias, deste público. Uma oferta pausada pode servir só de presente.',
    add: 'Adicionar presente',
    empty:
      'Nenhum presente nesta lista ainda. Sem nenhum, os links continuam dando o presente padrão.',
  },
  referral: {
    title: 'Ofertas para indicar',
    text: 'Ofertas deste público com página de venda. A venda conta como vinda do embaixador; só a assinatura da Comunidade dá bônus.',
    add: 'Adicionar oferta para indicar',
    empty: 'Nenhuma oferta para indicar nesta lista ainda.',
  },
}

/**
 * Duas ofertas LIGADAS do mesmo produto na mesma lista: o referrals recusa (o link curto por
 * produto precisa saber qual abrir). A frase é a mesma do serviço, para o recado ser um só.
 */
export function sameCourseProblem(
  items: AmbassadorOfferItem[],
  catalog: ReadonlyMap<string, CatalogOfferInfo>,
): string | null {
  const seen = new Map<string, CatalogOfferInfo>()
  for (const item of items) {
    if (!item.enabled) continue
    const offer = catalog.get(item.offerId)
    if (!offer?.productSku) continue
    const other = seen.get(offer.productSku)
    if (other)
      return `${other.name} e ${offer.name} são do mesmo curso. Deixe só uma delas ligada nesta lista.`
    seen.set(offer.productSku, offer)
  }
  return null
}

const toItems = (views: AmbassadorOfferView[]): AmbassadorOfferItem[] =>
  [...views]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({ offerId: v.offerId, enabled: v.enabled }))

/**
 * Campanhas › Ofertas dos embaixadores (25/11/2026, Canvas "admin-ofertas"): o que os embaixadores
 * podem mandar, por público, em duas listas (presentes e ofertas para indicar), com ligar e
 * desligar, a ordem e o recado de "uma por curso". Cada mudança grava a lista inteira na hora.
 */
export function AmbassadorOffersPanel({
  audience,
  canWrite,
}: {
  audience: Platform
  canWrite: boolean
}) {
  const { get, send } = useCommunityRequests(audience)
  const catalog = useCatalogOffers(audience)
  const [lists, setLists] = useState<Lists | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState<AmbassadorOfferKind | null>(null)
  const [problem, setProblem] = useState<Record<AmbassadorOfferKind, string>>({
    gift: '',
    referral: '',
  })
  const sequence = useRef(0)
  const load = useCallback(async () => {
    const current = ++sequence.current
    setFailed(false)
    try {
      const result = await get<Record<AmbassadorOfferKind, AmbassadorOfferView[]>>(
        '/api/admin/referrals/ambassador-offers',
      )
      if (current !== sequence.current) return
      setLists({ gift: toItems(result.gift ?? []), referral: toItems(result.referral ?? []) })
    } catch (err) {
      if (isCanceledCommunityRequest(err) || current !== sequence.current) return
      setFailed(true)
    }
  }, [get])
  useEffect(() => {
    void load()
  }, [load])

  async function save(kind: AmbassadorOfferKind, next: AmbassadorOfferItem[]) {
    if (!lists || saving) return
    const local = sameCourseProblem(next, catalog.byId)
    setProblem((p) => ({ ...p, [kind]: local ?? '' }))
    if (local) return
    const previous = lists[kind]
    setLists({ ...lists, [kind]: next })
    setSaving(kind)
    try {
      const result = await send<{ items: AmbassadorOfferView[] }>(
        '/api/admin/referrals/ambassador-offers',
        'PUT',
        { audience, kind, items: next },
      )
      setLists((current) => (current ? { ...current, [kind]: toItems(result.items) } : current))
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      setLists((current) => (current ? { ...current, [kind]: previous } : current))
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Não deu certo. Tente de novo.'
      setProblem((p) => ({ ...p, [kind]: message }))
      toast.error(message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">O que os embaixadores podem mandar</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-muted-foreground">
          Na página dele, o embaixador só escolhe entre as ofertas desta tela, na ordem em que estão
          aqui. O presente sai sem custo para quem recebe. A oferta indicada leva à página de venda:
          a compra fica registrada como vinda do embaixador, e o bônus continua só para a assinatura
          da Comunidade.
        </p>
      </div>
      {!canWrite ? <ReadOnlyNotice /> : null}
      {failed ? (
        <p role="alert" className="text-destructive">
          As listas não carregaram.{' '}
          <button type="button" className="underline" onClick={() => void load()}>
            Tentar de novo
          </button>
        </p>
      ) : null}
      {catalog.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          As ofertas do Catálogo não carregaram, então os nomes podem faltar.{' '}
          <button type="button" className="underline" onClick={catalog.reload}>
            Tentar de novo
          </button>
        </p>
      ) : null}
      {lists === null && !failed ? (
        <p role="status" className="text-muted-foreground">
          Carregando as listas…
        </p>
      ) : null}
      {lists
        ? (['gift', 'referral'] as const).map((kind) => (
            <OfferList
              key={kind}
              kind={kind}
              audience={audience}
              items={lists[kind]}
              catalog={catalog}
              canWrite={canWrite}
              busy={saving !== null}
              problem={problem[kind]}
              onChange={(next) => void save(kind, next)}
            />
          ))
        : null}
      <p className="text-xs text-muted-foreground">
        Desligar uma oferta tira a opção da página dos embaixadores na hora. Os links que eles já
        mandaram continuam abrindo a página, e o que já foi resgatado ou comprado mantém a origem
        registrada.
        {audience === 'adult'
          ? ''
          : ' No público adulto, a mesma tela mostra as ofertas adultas, sem o grupo Para os pais.'}
      </p>
    </div>
  )
}

function OfferList({
  kind,
  audience,
  items,
  catalog,
  canWrite,
  busy,
  problem,
  onChange,
}: {
  kind: AmbassadorOfferKind
  audience: Platform
  items: AmbassadorOfferItem[]
  catalog: CatalogOffersState
  canWrite: boolean
  busy: boolean
  problem: string
  onChange: (next: AmbassadorOfferItem[]) => void
}) {
  const section = SECTIONS[kind]
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const inList = new Set(items.map((i) => i.offerId))
  const candidates = catalog.offers.filter(
    (o) =>
      !inList.has(o.id) &&
      (kind === 'gift' ? o.giftEligible : o.status !== 'archived' && o.status !== 'draft') &&
      `${o.name} ${o.productName ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  // Os grupos "Para os filhos" e "Para os pais" só existem no Kids.
  const groups =
    audience === 'kids'
      ? ([
          ['Para os filhos', false],
          ['Para os pais', true],
        ] as const)
      : ([['', null]] as const)
  const move = (index: number, delta: number) => {
    const next = [...items]
    const [item] = next.splice(index, 1)
    if (!item) return
    next.splice(index + delta, 0, item)
    onChange(next)
  }
  return (
    <Card className="space-y-4 rounded-2xl p-5">
      <section aria-labelledby={`lista-${kind}`} className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id={`lista-${kind}`} className="font-display text-lg font-bold">
              {section.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{section.text}</p>
          </div>
          {canWrite ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding((v) => !v)}
              disabled={busy || catalog.status !== 'ready'}
            >
              {adding ? (
                'Fechar a busca'
              ) : (
                <>
                  <Plus className="size-4" aria-hidden /> {section.add}
                </>
              )}
            </Button>
          ) : null}
        </div>
        {problem ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {problem}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{section.empty}</p>
        ) : null}
        {groups.map(([label, parents]) => {
          const rows = items
            .map((item, index) => ({ item, index, offer: catalog.byId.get(item.offerId) }))
            .filter(({ offer }) => parents === null || Boolean(offer?.forParents) === parents)
          if (rows.length === 0 && parents === null) return null
          return (
            <div key={label || 'all'} className="space-y-2">
              {label ? (
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
              ) : null}
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum {parents ? 'curso para pais' : 'item'} nesta lista ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map(({ item, index, offer }) => (
                    <li
                      key={item.offerId}
                      className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{offer?.name ?? 'Oferta do Catálogo'}</div>
                        <div className="text-xs text-muted-foreground">
                          {offer
                            ? `${offer.summary}${offer.status === 'active' ? '' : ` · ${giftOfferStatusLabel(offer.status)} no Catálogo`}`
                            : item.offerId}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {kind === 'gift' && offer?.slug === DEFAULT_GIFT_OFFER_SLUGS[audience] ? (
                            <Badge variant="outline">Padrão dos links antigos</Badge>
                          ) : null}
                          {kind === 'referral' && offer?.pricingMode === 'subscription' ? (
                            <Badge variant="outline">Dá bônus</Badge>
                          ) : kind === 'referral' ? (
                            <Badge variant="muted">Marca a origem</Badge>
                          ) : null}
                          {kind === 'referral' && offer && !offer.pageEligible ? (
                            <Badge variant="muted">Sem página de venda</Badge>
                          ) : null}
                        </div>
                      </div>
                      <label
                        htmlFor={`oferta-${kind}-${item.offerId}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Switch
                          id={`oferta-${kind}-${item.offerId}`}
                          checked={item.enabled}
                          disabled={!canWrite || busy}
                          onCheckedChange={(enabled: boolean) =>
                            onChange(items.map((i, at) => (at === index ? { ...i, enabled } : i)))
                          }
                        />
                        <span className="sr-only">
                          Disponível para os embaixadores: {offer?.name ?? item.offerId}
                        </span>
                        <span aria-hidden>{item.enabled ? 'Ligada' : 'Desligada'}</span>
                      </label>
                      {canWrite ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Subir ${offer?.name ?? 'oferta'}`}
                            disabled={busy || index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Descer ${offer?.name ?? 'oferta'}`}
                            disabled={busy || index === items.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Tirar ${offer?.name ?? 'oferta'} da lista`}
                            disabled={busy}
                            onClick={() => onChange(items.filter((_, at) => at !== index))}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
        {adding ? (
          <div className="space-y-3 rounded-xl border border-dashed p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome do curso ou da oferta"
              aria-label={`Buscar para ${section.add.toLowerCase()}`}
            />
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma oferta deste público para adicionar.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.slice(0, 20).map((offer) => (
                  <li key={offer.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{offer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {offer.summary}
                        {kind === 'referral' && !offer.pageEligible
                          ? ' · precisa de uma página de venda para entrar'
                          : ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || (kind === 'referral' && !offer.pageEligible)}
                      onClick={() => {
                        onChange([...items, { offerId: offer.id, enabled: true }])
                        setAdding(false)
                        setQuery('')
                      }}
                    >
                      {audience === 'kids'
                        ? `Adicionar em ${offer.forParents ? 'Para os pais' : 'Para os filhos'}`
                        : 'Adicionar'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    </Card>
  )
}
