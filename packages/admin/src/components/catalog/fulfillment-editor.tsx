'use client'

import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import type { AccessType, FulfillmentSpec, ReleaseMode } from '@/lib/types'

const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: 'course', label: 'Um curso específico' },
  { value: 'all_courses', label: 'Todos os cursos (atuais e futuros)' },
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
 * Editor do fulfillment (Entrega / Acesso) do produto. A entrega é SEMPRE via
 * área de membros: "Um curso específico" (escolhe o curso pelo SLUG) ou
 * "Todos os cursos" (chave-mestra — cobre cursos atuais E futuros, sem curso
 * vinculado). + regra de liberação (drip; armazenada, ainda não aplicada).
 * Não renderize para combos (kind=bundle) — combo entrega via componentes.
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
  const spec: FulfillmentSpec = value ?? { accessType: 'course' }
  const release = spec.release ?? { mode: 'immediate' as ReleaseMode }

  function update(patch: Partial<FulfillmentSpec>) {
    const next = { ...spec, ...patch }
    // "curso" sem curso escolhido e sem drip → null no payload (rascunho sem entrega
    // definida ainda; o domínio exige entrega só para ATIVAR o produto).
    if (
      next.accessType === 'course' &&
      !next.courseRef &&
      (!next.release || next.release.mode === 'immediate')
    ) {
      onChange(null)
      return
    }
    onChange(next)
  }

  function setAccessType(accessType: AccessType) {
    // Chave-mestra não leva curso vinculado.
    update({ accessType, ...(accessType === 'all_courses' ? { courseRef: undefined } : {}) })
  }

  function setReleaseMode(mode: ReleaseMode) {
    update({ release: mode === 'immediate' ? undefined : { mode } })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <Field
        label="O que esta compra libera"
        htmlFor="accessType"
        tooltip="A entrega é sempre pela área de membros: um curso específico ou TODOS os cursos (chave-mestra — inclui cursos lançados depois da compra)."
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
      ) : (
        <p className="text-muted-foreground text-sm">
          O comprador ganha acesso a todos os cursos publicados — inclusive os lançados depois da
          compra. Nenhuma configuração extra.
        </p>
      )}

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
    </div>
  )
}
