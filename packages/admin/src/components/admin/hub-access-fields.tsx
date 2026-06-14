'use client'

import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HubAccessConfig, HubVisibility } from '@/lib/hub-types'
import type { CourseView, Paginated } from '@/lib/types'

/** Papéis que podem ser usados em `role_gated` (RBAC do auth). */
const ROLES: { value: string; label: string }[] = [
  { value: 'customer', label: 'Aluno (customer)' },
  { value: 'staff', label: 'Equipe (staff)' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
]

export const PUBLIC_ACCESS: HubAccessConfig = { visibility: 'public', courses: [], roles: [] }

/**
 * Campos de configuração de acesso (público / por curso / por cargo). Controlado:
 * recebe `value` + `onChange`. Carrega os cursos do members para o seletor de
 * `course_gated`. Reusado nos forms de servidor e de canal.
 */
export function HubAccessFields({
  value,
  onChange,
}: {
  value: HubAccessConfig
  onChange: (next: HubAccessConfig) => void
}) {
  const [courses, setCourses] = useState<CourseView[]>([])

  useEffect(() => {
    let alive = true
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((page) => {
        if (alive) setCourses(page.items)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  function toggle(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Quem vê" htmlFor="hub-visibility">
        <Select
          id="hub-visibility"
          value={value.visibility}
          onChange={(e) => onChange({ ...value, visibility: e.target.value as HubVisibility })}
        >
          <option value="public">Público (todo aluno ativo)</option>
          <option value="course_gated">Por curso (liberado pela matrícula)</option>
          <option value="role_gated">Por cargo (equipe/papel)</option>
        </Select>
      </Field>

      {value.visibility === 'course_gated' ? (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs text-muted-foreground">
            Cursos que liberam o acesso (matrícula em qualquer um)
          </legend>
          <div className="max-h-44 overflow-y-auto">
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando cursos…</p>
            ) : (
              courses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={value.courses.includes(c.slug)}
                    onChange={() => onChange({ ...value, courses: toggle(value.courses, c.slug) })}
                  />
                  <span>
                    {c.title} <span className="text-muted-foreground">({c.slug})</span>
                    {c.audience === 'kids' ? ' [Kids]' : ''}
                  </span>
                </label>
              ))
            )}
          </div>
        </fieldset>
      ) : null}

      {value.visibility === 'role_gated' ? (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs text-muted-foreground">Cargos com acesso</legend>
          {ROLES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={value.roles.includes(r.value)}
                onChange={() => onChange({ ...value, roles: toggle(value.roles, r.value) })}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
  )
}
