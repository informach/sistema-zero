'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso } from '@/lib/dates'
import { mapPool } from '@/lib/pool'
import type { CourseView, OfferListItem, Paginated } from '@/lib/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Presets de validade (cortesia/teste). `''` = vitalício; `'custom'` = data específica. */
const VALIDITY_PRESETS = [
  { value: '', label: 'Para sempre' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'custom', label: 'Até uma data' },
] as const

interface GrantForm {
  mode: 'offer' | 'course' | 'all_courses' | 'all_kids_courses'
  offerId: string
  courseRef: string
  preset: string
  customDate: string
}

const EMPTY_FORM: GrantForm = {
  mode: 'course',
  offerId: '',
  courseRef: '',
  preset: '',
  customDate: '',
}

/** `expiresAt` ISO a partir do preset/data — `null` = vitalício. `undefined` = inválido. */
function resolveExpiresAt(form: GrantForm): string | null | undefined {
  if (form.preset === '') return null
  if (form.preset === 'custom') {
    if (!form.customDate) return undefined
    return dateInputToSaoPauloEndOfDayIso(form.customDate) ?? undefined
  }
  return new Date(Date.now() + Number(form.preset) * DAY_MS).toISOString()
}

/**
 * Dialog de concessão manual de acesso (cortesia/promoção/teste) — compartilhado
 * entre a lista de usuários e o detalhe do membro. Pickers reais (ofertas do
 * catálogo / cursos do members, carregados ao abrir) + validade com presets.
 * Backend: `POST /api/members/entitlements` (idempotente; revogada/expirada → 409).
 */
export function GrantAccessDialog({
  open,
  userId,
  userIds,
  onClose,
  onGranted,
}: {
  open: boolean
  /** Alvo único (lista de usuários / detalhe do membro). */
  userId?: string
  /** Alvo em LOTE (seleção múltipla) — tem precedência sobre `userId`. */
  userIds?: string[]
  onClose: () => void
  onGranted?: () => void
}) {
  // Alvos efetivos: o lote (se houver) ou o único. Distintos, sem vazios.
  const targets = [...new Set(userIds && userIds.length > 0 ? userIds : userId ? [userId] : [])]
  const bulk = targets.length > 1
  const [form, setForm] = useState<GrantForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [offers, setOffers] = useState<OfferListItem[]>([])
  const [courses, setCourses] = useState<CourseView[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  // Carrega os pickers 1x, ao abrir pela primeira vez (best-effort: falha mantém
  // o dialog útil — o Select fica vazio e o admin percebe pelo toast).
  useEffect(() => {
    if (!open || optionsLoaded) return
    let alive = true
    Promise.all([
      apiGet<Paginated<OfferListItem>>('/api/catalog/offers?limit=100&status=active').catch(
        () => null,
      ),
      apiGet<Paginated<CourseView>>('/api/members/courses?limit=100').catch(() => null),
    ]).then(([offersPage, coursesPage]) => {
      if (!alive) return
      if (offersPage) setOffers(offersPage.items)
      if (coursesPage) setCourses(coursesPage.items)
      if (!offersPage && !coursesPage) {
        toast.error('As ofertas e os cursos não carregaram. Feche e abra de novo.')
      }
      setOptionsLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [open, optionsLoaded])

  function close() {
    setForm(EMPTY_FORM)
    onClose()
  }

  async function grant() {
    if (form.mode === 'offer' && !form.offerId) {
      toast.error('Escolha a oferta.')
      return
    }
    if (form.mode === 'course' && !form.courseRef) {
      toast.error('Escolha o curso.')
      return
    }
    const expiresAt = resolveExpiresAt(form)
    if (expiresAt === undefined) {
      toast.error('Escolha até quando vale o acesso.')
      return
    }
    if (targets.length === 0) {
      toast.error('Nenhuma conta selecionada.')
      return
    }
    const bodyFor = (uid: string) =>
      form.mode === 'offer'
        ? { mode: 'offer', userId: uid, offerRef: form.offerId, expiresAt }
        : form.mode === 'course'
          ? { mode: 'course', userId: uid, courseRef: form.courseRef, expiresAt }
          : form.mode === 'all_kids_courses'
            ? { mode: 'all_kids_courses', userId: uid, expiresAt }
            : { mode: 'all_courses', userId: uid, expiresAt }

    setSaving(true)
    try {
      if (!bulk) {
        // Alvo único: mantém os toasts precisos (sucesso / 409 → "use Estender").
        try {
          await apiSend('/api/members/entitlements', 'POST', bodyFor(targets[0] as string))
          toast.success('Acesso concedido.')
        } catch (err) {
          const e = err as ApiError
          toast.error(
            e.status === 409
              ? 'Esta pessoa já teve este acesso, que foi tirado ou venceu. Use "Estender" na página dela.'
              : (e.message ?? 'O acesso não foi concedido. Tente de novo.'),
          )
          return
        }
      } else {
        // Lote: cada concessão é idempotente e auditada individualmente no gateway.
        const results = await mapPool(targets, async (uid) => {
          try {
            await apiSend('/api/members/entitlements', 'POST', bodyFor(uid))
            return 'ok' as const
          } catch (err) {
            return (err as ApiError).status === 409 ? ('conflict' as const) : ('error' as const)
          }
        })
        const ok = results.filter((r) => r === 'ok').length
        const conflict = results.filter((r) => r === 'conflict').length
        const failed = results.filter((r) => r === 'error').length
        const parts = [`${ok} com acesso novo`]
        if (conflict > 0) parts.push(`${conflict} já tinham ou tiveram esse acesso`)
        if (failed > 0) parts.push(`${failed} não deram certo`)
        if (failed > 0) toast.warning(`Acesso em lote: ${parts.join(', ')}.`)
        else toast.success(`Acesso em lote: ${parts.join(', ')}.`)
      }
      setForm(EMPTY_FORM)
      onGranted?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={bulk ? `Conceder acesso a ${targets.length} contas` : 'Conceder acesso'}
      description={
        bulk
          ? 'O mesmo acesso vai para cada conta selecionada. Quem já tem fica como está.'
          : 'Para cortesia, promoção ou teste. Escolha um curso, uma oferta do catálogo ou todos os cursos de uma comunidade.'
      }
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={grant} disabled={saving}>
            {saving ? <Spinner /> : null}
            Conceder
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="O que liberar" htmlFor="grant-mode">
          <Select
            id="grant-mode"
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as GrantForm['mode'] }))}
          >
            <option value="course">Um curso</option>
            <option value="offer">Uma oferta do catálogo</option>
            <option value="all_courses">Todos os cursos da Comunidade Sistema Zero</option>
            <option value="all_kids_courses">Todos os cursos da Comunidade dos Criadores</option>
          </Select>
        </Field>

        {form.mode === 'all_courses' || form.mode === 'all_kids_courses' ? (
          <p className="text-muted-foreground text-sm">
            Libera todos os cursos publicados da{' '}
            {form.mode === 'all_kids_courses'
              ? 'Comunidade dos Criadores'
              : 'Comunidade Sistema Zero'}
            , inclusive os que forem lançados depois. A outra comunidade fica de fora. É um acesso
            só, que dá para tirar ou estender como qualquer outro.
          </p>
        ) : form.mode === 'course' ? (
          <Field
            label="Curso"
            htmlFor="grant-course"
            hint={form.courseRef ? `Endereço do curso: /${form.courseRef}` : undefined}
          >
            <Select
              id="grant-course"
              value={form.courseRef}
              onChange={(e) => setForm((f) => ({ ...f, courseRef: e.target.value }))}
            >
              <option value="">{optionsLoaded ? 'Escolha o curso' : 'Carregando…'}</option>
              {/* O endereço vai junto: dois cursos com o mesmo título ficam diferentes. */}
              {courses.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.title}
                  {c.audience === 'kids' ? ' (Comunidade dos Criadores)' : ''} · /{c.slug}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Oferta"
            htmlFor="grant-offer"
            hint="Libera tudo o que a oferta dá, com combos e bônus."
          >
            <Select
              id="grant-offer"
              value={form.offerId}
              onChange={(e) => setForm((f) => ({ ...f, offerId: e.target.value }))}
            >
              <option value="">{optionsLoaded ? 'Escolha a oferta' : 'Carregando…'}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Por quanto tempo" htmlFor="grant-preset">
            <Select
              id="grant-preset"
              value={form.preset}
              onChange={(e) => setForm((f) => ({ ...f, preset: e.target.value }))}
            >
              {VALIDITY_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          {form.preset === 'custom' ? (
            <Field label="Acesso até" htmlFor="grant-date">
              <Input
                id="grant-date"
                type="date"
                value={form.customDate}
                onChange={(e) => setForm((f) => ({ ...f, customDate: e.target.value }))}
              />
            </Field>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
