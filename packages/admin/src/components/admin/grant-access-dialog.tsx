'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { CourseView, OfferListItem, Paginated } from '@/lib/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Presets de validade (cortesia/teste). `''` = vitalício; `'custom'` = data específica. */
const VALIDITY_PRESETS = [
  { value: '', label: 'Vitalício' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'custom', label: 'Data específica…' },
] as const

interface GrantForm {
  mode: 'offer' | 'course'
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
    const d = new Date(form.customDate)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
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
  onClose,
  onGranted,
}: {
  open: boolean
  userId: string
  onClose: () => void
  onGranted?: () => void
}) {
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
        toast.error('Não foi possível carregar ofertas/cursos.')
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
    const ref = form.mode === 'offer' ? form.offerId : form.courseRef
    if (!ref) {
      toast.error(form.mode === 'offer' ? 'Selecione a oferta.' : 'Selecione o curso.')
      return
    }
    const expiresAt = resolveExpiresAt(form)
    if (expiresAt === undefined) {
      toast.error('Informe uma data de validade válida.')
      return
    }
    setSaving(true)
    try {
      const body =
        form.mode === 'offer'
          ? { mode: 'offer', userId, offerRef: ref, expiresAt }
          : { mode: 'course', userId, courseRef: ref, expiresAt }
      await apiSend('/api/members/entitlements', 'POST', body)
      toast.success('Acesso concedido.')
      setForm(EMPTY_FORM)
      onGranted?.()
      onClose()
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        toast.error('Já existe uma matrícula revogada/expirada deste conteúdo — use "Estender".')
      } else {
        toast.error(e.message ?? 'Não foi possível conceder o acesso.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Conceder acesso manual"
      description="Cortesia/promoção/teste. Por oferta (resolve no catálogo) ou direto por curso."
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
        <Field label="Modo" htmlFor="grant-mode">
          <Select
            id="grant-mode"
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as GrantForm['mode'] }))}
          >
            <option value="course">Por curso</option>
            <option value="offer">Por oferta do catálogo</option>
          </Select>
        </Field>

        {form.mode === 'course' ? (
          <Field label="Curso" htmlFor="grant-course">
            <Select
              id="grant-course"
              value={form.courseRef}
              onChange={(e) => setForm((f) => ({ ...f, courseRef: e.target.value }))}
            >
              <option value="">{optionsLoaded ? 'Selecione…' : 'Carregando…'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.title} ({c.slug})
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Oferta"
            htmlFor="grant-offer"
            hint="Concede tudo que a oferta dá direito (combos/bônus inclusos)."
          >
            <Select
              id="grant-offer"
              value={form.offerId}
              onChange={(e) => setForm((f) => ({ ...f, offerId: e.target.value }))}
            >
              <option value="">{optionsLoaded ? 'Selecione…' : 'Carregando…'}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Validade" htmlFor="grant-preset">
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
