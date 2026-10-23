'use client'

import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Input } from '@sistemazero/ui/input'
import { useEffect, useId, useState } from 'react'
import {
  MAX_TEACHERS,
  mergeStaffPages,
  type StaffUser,
  TEACHER_ROLES,
  teacherDisplayName,
  toggleTeacher,
} from '@/lib/live-teachers'

export interface StaffDirectory {
  users: StaffUser[]
  loading: boolean
  error: string | null
}

/**
 * A equipe do painel (superadmin, admin e staff ativos), uma consulta por papel. Uma consulta
 * recusada não derruba as outras; só sem nenhuma resposta a lista vira erro.
 */
export function useStaffUsers(enabled: boolean): StaffDirectory {
  const [state, setState] = useState<StaffDirectory>({
    users: [],
    loading: enabled,
    error: null,
  })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void Promise.allSettled(
      TEACHER_ROLES.map((role) =>
        liveRequest<{ items?: StaffUser[] }>(
          `/api/admin/users?role=${role}&status=active&limit=100`,
          undefined,
          'GET',
          controller.signal,
        ),
      ),
    ).then((results) => {
      if (controller.signal.aborted) return
      const pages = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value.items ?? []] : [],
      )
      setState({
        users: mergeStaffPages(pages),
        loading: false,
        error: pages.length ? null : 'Não foi possível carregar a equipe agora.',
      })
    })
    return () => controller.abort()
  }, [enabled])
  return state
}

export function TeacherPicker({
  value,
  onChange,
  staff,
  currentUserId,
  disabled,
}: {
  value: string[]
  onChange(next: string[]): void
  staff: StaffDirectory
  currentUserId: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const hintId = useId()
  const searchId = useId()
  const term = query.trim().toLocaleLowerCase('pt-BR')
  const visible = staff.users.filter(
    (user) =>
      !term ||
      value.includes(user.id) ||
      `${teacherDisplayName(user)} ${user.email}`.toLocaleLowerCase('pt-BR').includes(term),
  )
  const unknown = value.filter((id) => !staff.users.some((user) => user.id === id))
  const full = value.length >= MAX_TEACHERS
  return (
    <fieldset className="space-y-2" aria-describedby={hintId} disabled={disabled}>
      <legend className="text-sm font-medium">Quem conduz a turma</legend>
      <p id={hintId} className="text-xs text-muted-foreground">
        Escolha de 1 a {MAX_TEACHERS} pessoas da equipe. Só elas abrem a sala, conduzem os encontros
        e revisam a gravação.
      </p>
      {staff.users.length > 8 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-xs font-medium">
            Buscar na equipe
          </label>
          <Input
            id={searchId}
            value={query}
            placeholder="Nome ou e-mail"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}
      {staff.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando a equipe…
        </p>
      ) : null}
      {staff.error ? (
        <p role="alert" className="text-sm text-destructive">
          {staff.error} A turma fica com quem já está marcado.
        </p>
      ) : null}
      <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
        {unknown.map((id) => (
          <li key={id}>
            <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked
                onChange={(event) => onChange(toggleTeacher(value, id, event.target.checked))}
              />
              {id === currentUserId ? 'Você' : 'Alguém que não está mais na equipe ativa'}
            </label>
          </li>
        ))}
        {visible.map((user) => {
          const checked = value.includes(user.id)
          return (
            <li key={user.id}>
              <label className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={(event) =>
                    onChange(toggleTeacher(value, user.id, event.target.checked))
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {teacherDisplayName(user)}
                    {user.id === currentUserId ? ' (você)' : ''}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
              </label>
            </li>
          )
        })}
        {!staff.loading && !visible.length && !unknown.length ? (
          <li className="px-2 py-1 text-sm text-muted-foreground">Ninguém encontrado.</li>
        ) : null}
      </ul>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {value.length} de {MAX_TEACHERS} pessoas escolhidas.
        {full ? ' Para trocar, desmarque alguém antes.' : ''}
      </p>
    </fieldset>
  )
}
