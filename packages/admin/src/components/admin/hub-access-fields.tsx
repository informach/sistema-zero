'use client'

import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HubAccessConfig, HubVisibility } from '@/lib/hub-types'
import { type CourseView, type Paginated, ROLE_LABELS } from '@/lib/types'

/**
 * Papéis que podem ser usados em `role_gated` (RBAC do auth). O papel `customer` aparece como
 * "Alunos" aqui: no fórum é quem estuda; os outros usam os nomes de `ROLE_LABELS`.
 */
const ROLES: { value: string; label: string }[] = [
  { value: 'customer', label: 'Alunos' },
  { value: 'staff', label: ROLE_LABELS.staff ?? 'Equipe' },
  { value: 'admin', label: ROLE_LABELS.admin ?? 'Admin' },
  { value: 'superadmin', label: ROLE_LABELS.superadmin ?? 'Superadmin' },
]

export const PUBLIC_ACCESS: HubAccessConfig = { visibility: 'public', courses: [], roles: [] }

/**
 * Campos de configuração de acesso (público / por curso / por comunidade / por papel).
 * Controlado: recebe `value` + `onChange`. Carrega os cursos do members para o seletor de
 * `course_gated`. Reusado nos forms de espaço e de canal.
 */
export function HubAccessFields({
  value,
  onChange,
}: {
  value: HubAccessConfig
  onChange: (next: HubAccessConfig) => void
}) {
  const [courses, setCourses] = useState<CourseView[]>([])
  const [coursesFailed, setCoursesFailed] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((page) => {
        if (alive) setCourses(page.items)
      })
      .catch(() => {
        if (alive) setCoursesFailed(true)
      })
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
          <option value="public">Público (toda conta ativa)</option>
          <option value="course_gated">Por curso (quem tem matrícula)</option>
          <option value="community_gated">Por comunidade (quem comprou o produto)</option>
          <option value="role_gated">Por papel (Equipe, Admin)</option>
        </Select>
      </Field>

      {value.visibility === 'community_gated' ? (
        <Field
          label="Chaves de comunidade que liberam o acesso"
          htmlFor="hub-communities"
          tooltip="A chave do produto de comunidade: a MESMA do campo 'Chave da comunidade' no produto do catálogo. Separe por vírgula para aceitar mais de uma."
        >
          <Input
            id="hub-communities"
            value={(value.communities ?? []).join(', ')}
            placeholder="Por exemplo: clube-dos-criadores"
            onChange={(e) =>
              onChange({
                ...value,
                communities: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      ) : null}

      {value.visibility === 'course_gated' ? (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs text-muted-foreground">
            Cursos que liberam o acesso (matrícula em qualquer um deles)
          </legend>
          <div className="max-h-44 overflow-y-auto">
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {coursesFailed
                  ? 'Não consegui carregar os cursos. Feche e abra de novo para tentar outra vez.'
                  : 'Carregando os cursos…'}
              </p>
            ) : (
              courses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={value.courses.includes(c.slug)}
                    onChange={() => onChange({ ...value, courses: toggle(value.courses, c.slug) })}
                  />
                  <span>
                    {c.title} <span className="text-muted-foreground">/{c.slug}</span>
                    {c.audience === 'kids' ? (
                      <span className="text-muted-foreground"> · Kids</span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </fieldset>
      ) : null}

      {value.visibility === 'role_gated' ? (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-1 text-xs text-muted-foreground">Papéis com acesso</legend>
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
