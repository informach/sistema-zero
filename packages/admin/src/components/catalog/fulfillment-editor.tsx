'use client'

import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { COMMUNITY_NAMES } from '@/lib/platform'
import type { AccessType, FulfillmentSpec, ReleaseMode } from '@/lib/types'

const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: 'course', label: 'Um curso' },
  { value: 'all_courses', label: 'Todos os cursos da Comunidade Sistema Zero, hoje e depois' },
  {
    value: 'all_kids_courses',
    label: 'Todos os cursos da Comunidade dos Criadores, hoje e depois',
  },
  { value: 'community', label: 'Um espaço da comunidade' },
]

const RELEASE_MODES: { value: ReleaseMode; label: string }[] = [
  { value: 'immediate', label: 'Na hora da compra' },
  { value: 'days_after_purchase', label: 'Alguns dias depois da compra' },
  { value: 'fixed_date', label: 'Numa data marcada' },
]

export interface CourseOption {
  slug: string
  title: string
  /** A comunidade do curso: vai junto do endereço na lista, como na concessão de acesso. */
  audience?: string
}

/** O texto do curso na lista: título, comunidade e endereço (dois títulos iguais se distinguem). */
export function courseOptionLabel(course: CourseOption): string {
  const community =
    course.audience === 'kids'
      ? COMMUNITY_NAMES.kids
      : course.audience === 'adult'
        ? COMMUNITY_NAMES.adult
        : null
  return [course.title, community, `/${course.slug}`].filter(Boolean).join(' · ')
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
    // Chave-mestra (adulta ou kids) não leva ref; `course`/`community` usam o
    // `courseRef` (slug do curso OU chave da comunidade) — preservado na troca.
    const clearsRef = accessType === 'all_courses' || accessType === 'all_kids_courses'
    update({ accessType, ...(clearsRef ? { courseRef: undefined } : {}) })
  }

  function setReleaseMode(mode: ReleaseMode) {
    update({ release: mode === 'immediate' ? undefined : { mode } })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <Field
        label="O que esta compra libera"
        htmlFor="accessType"
        tooltip="Tudo chega pela área do aluno: um curso, ou todos os cursos de uma comunidade, inclusive os que forem lançados depois da compra."
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
          label="Qual curso"
          htmlFor="courseRef"
          tooltip="O curso que esta compra libera na área do aluno. A matrícula usa o endereço do curso, que aparece ao lado do nome."
        >
          <Select
            id="courseRef"
            value={spec.courseRef ?? ''}
            onChange={(e) => update({ courseRef: e.target.value || undefined })}
            disabled={coursesLoading}
          >
            <option value="">{coursesLoading ? 'Carregando cursos…' : 'Escolha um curso'}</option>
            {/* Comunidade e endereço vão junto: dois cursos com o mesmo título ficam diferentes. */}
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {courseOptionLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
      ) : spec.accessType === 'community' ? (
        <Field
          label="Chave do espaço"
          htmlFor="communityRef"
          tooltip="O nome curto do espaço da comunidade que esta compra libera. Use a mesma chave nos espaços do Clube e da Comunidade, no campo 'Chaves de comunidade'. Ex.: comunidade-vip."
        >
          <Input
            id="communityRef"
            value={spec.courseRef ?? ''}
            placeholder="ex.: comunidade-vip"
            onChange={(e) => update({ courseRef: e.target.value || undefined })}
          />
        </Field>
      ) : (
        <p className="text-muted-foreground text-sm">
          Quem compra ganha todos os cursos publicados da{' '}
          {spec.accessType === 'all_kids_courses'
            ? 'Comunidade dos Criadores'
            : 'Comunidade Sistema Zero'}
          , inclusive os lançados depois da compra. Não precisa configurar mais nada.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Quando libera"
          htmlFor="releaseMode"
          tooltip="Na hora da compra, alguns dias depois (um pouco de cada vez) ou numa data marcada."
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
          <Field label="Quantos dias depois da compra" htmlFor="releaseDays">
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
          <Field label="Libera no dia" htmlFor="releaseDate">
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
