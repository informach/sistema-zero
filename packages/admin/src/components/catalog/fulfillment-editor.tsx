'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { AccessType, FulfillmentSpec, ReleaseMode } from '@/lib/types'

const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: 'none', label: 'Nenhum (sem entrega automática)' },
  { value: 'course', label: 'Curso (área de membros)' },
  { value: 'download', label: 'Download (arquivos/links)' },
  { value: 'community', label: 'Comunidade' },
  { value: 'external', label: 'Externo (link de terceiros)' },
]

const RELEASE_MODES: { value: ReleaseMode; label: string }[] = [
  { value: 'immediate', label: 'Imediata (na compra)' },
  { value: 'days_after_purchase', label: 'X dias após a compra' },
  { value: 'fixed_date', label: 'Data fixa' },
]

export interface CourseOption {
  slug: string
  title: string
}

/**
 * Editor do fulfillment (Entrega / Acesso) do produto: define COMO a área de
 * membros libera o conteúdo após a compra — tipo de acesso, curso vinculado
 * (pelo SLUG), arquivos/links entregues e regra de liberação (drip).
 */
export function FulfillmentEditor({
  value,
  onChange,
  courses,
  coursesLoading = false,
}: {
  value: FulfillmentSpec | null
  onChange: (next: FulfillmentSpec | null) => void
  courses: CourseOption[]
  coursesLoading?: boolean
}) {
  const spec: FulfillmentSpec = value ?? { accessType: 'none' }
  const assets = spec.assets ?? []
  const release = spec.release ?? { mode: 'immediate' as ReleaseMode }

  function update(patch: Partial<FulfillmentSpec>) {
    const next = { ...spec, ...patch }
    // "none" puro (sem extras) → null no payload (produto sem entrega automática).
    if (
      next.accessType === 'none' &&
      !next.assets?.length &&
      !next.courseRef &&
      (!next.release || next.release.mode === 'immediate')
    ) {
      onChange(null)
      return
    }
    onChange(next)
  }

  function setAccessType(accessType: AccessType) {
    // Troca de tipo limpa o que não se aplica (curso ↔ arquivos).
    update({
      accessType,
      ...(accessType === 'course' ? { assets: undefined } : { courseRef: undefined }),
    })
  }

  function setAsset(index: number, patch: { label?: string; url?: string }) {
    update({ assets: assets.map((a, i) => (i === index ? { ...a, ...patch } : a)) })
  }

  function addAsset() {
    update({ assets: [...assets, { label: '' }] })
  }

  function removeAsset(index: number) {
    const next = assets.filter((_, i) => i !== index)
    update({ assets: next.length ? next : undefined })
  }

  function setReleaseMode(mode: ReleaseMode) {
    update({ release: mode === 'immediate' ? undefined : { mode } })
  }

  const showAssets =
    spec.accessType === 'download' ||
    spec.accessType === 'external' ||
    spec.accessType === 'community'

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <Field
        label="Tipo de acesso"
        htmlFor="accessType"
        tooltip="Como o aluno acessa o produto após a compra: curso na área de membros, arquivos para download, comunidade, link externo — ou nenhum (entrega manual)."
      >
        <Select
          id="accessType"
          value={spec.accessType}
          onChange={(e) => setAccessType(e.target.value as AccessType)}
        >
          {ACCESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {spec.accessType === 'course' ? (
        <Field
          label="Curso vinculado"
          htmlFor="courseRef"
          tooltip="Curso da área de membros liberado nesta compra. A matrícula usa o slug do curso."
        >
          <Select
            id="courseRef"
            value={spec.courseRef ?? ''}
            onChange={(e) => update({ courseRef: e.target.value || undefined })}
            disabled={coursesLoading}
          >
            <option value="">{coursesLoading ? 'Carregando cursos…' : 'Selecione um curso'}</option>
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title} ({c.slug})
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {showAssets ? (
        <Field
          label="Arquivos / links entregues"
          tooltip="O que o aluno recebe (ex.: 'Ebook (PDF)' + URL). O rótulo aparece para o aluno."
        >
          <div className="flex flex-col gap-2">
            {assets.map((a, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lista editável sem id natural
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Rótulo (ex.: Ebook PDF)"
                  value={a.label}
                  onChange={(e) => setAsset(i, { label: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="URL (opcional)"
                  value={a.url ?? ''}
                  onChange={(e) => setAsset(i, { url: e.target.value || undefined })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover arquivo"
                  onClick={() => removeAsset(i)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAsset}
              className="self-start"
            >
              <Plus className="size-4" /> Adicionar arquivo/link
            </Button>
          </div>
        </Field>
      ) : null}

      {spec.accessType !== 'none' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Liberação"
            htmlFor="releaseMode"
            tooltip="Quando o acesso é liberado: na hora da compra, X dias depois (drip) ou numa data fixa."
          >
            <Select
              id="releaseMode"
              value={release.mode}
              onChange={(e) => setReleaseMode(e.target.value as ReleaseMode)}
            >
              {RELEASE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          {release.mode === 'days_after_purchase' ? (
            <Field label="Dias após a compra" htmlFor="releaseDays">
              <Input
                id="releaseDays"
                inputMode="numeric"
                value={release.days != null ? String(release.days) : ''}
                onChange={(e) => {
                  const days = Number.parseInt(e.target.value, 10)
                  update({
                    release: {
                      mode: 'days_after_purchase',
                      ...(Number.isFinite(days) && days >= 0 ? { days } : {}),
                    },
                  })
                }}
              />
            </Field>
          ) : null}
          {release.mode === 'fixed_date' ? (
            <Field label="Data de liberação" htmlFor="releaseDate">
              <Input
                id="releaseDate"
                type="date"
                value={release.date ? release.date.slice(0, 10) : ''}
                onChange={(e) =>
                  update({
                    release: {
                      mode: 'fixed_date',
                      ...(e.target.value
                        ? { date: new Date(`${e.target.value}T00:00:00`).toISOString() }
                        : {}),
                    },
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
