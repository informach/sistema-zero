'use client'
import {
  type Permission,
  type Project,
  permissions,
  type StaffIdentity,
  staffIdentitySchema,
  type TeamMember,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { useId, useState } from 'react'
import { z } from 'zod'
import { errorMessage, type WorkbenchPort } from './port'

const labels: Record<Permission, string> = {
  read: 'Consultar',
  edit: 'Editar',
  execute: 'Executar IA',
  approve: 'Aprovar',
  publish: 'Publicar',
  admin: 'Administrar equipe',
}
export function TeamPanel({
  port,
  project,
  team,
  error,
  onChanged,
}: {
  port: WorkbenchPort
  project: Project
  team: TeamMember[]
  error: string
  onChanged: () => Promise<void>
}) {
  const id = useId(),
    [query, setQuery] = useState(''),
    [found, setFound] = useState<StaffIdentity[]>([]),
    [selected, setSelected] = useState<StaffIdentity | null>(null),
    [grants, setGrants] = useState<Permission[]>(['read', 'edit', 'execute']),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState('')
  const admin = project.permissions.includes('admin')
  async function work(action: () => Promise<void>) {
    setBusy(true)
    setIssue('')
    try {
      await action()
    } catch (error) {
      setIssue(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="rounded-xl border bg-card p-5">
      <summary className="cursor-pointer font-semibold">
        Equipe do projeto · {team.filter((member) => member.permissions.length).length}
      </summary>
      <ul className="my-3 space-y-2">
        {team
          .filter((member) => member.permissions.length)
          .map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {member.name}
                {member.active ? '' : ' · Conta inativa'} ·{' '}
                {member.permissions.map((permission) => labels[permission]).join(', ')}
              </span>
              {admin ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelected(member)
                    setGrants(member.permissions)
                  }}
                >
                  Permissões
                </Button>
              ) : null}
            </li>
          ))}
      </ul>
      {admin ? (
        <>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void work(async () =>
                setFound(
                  z
                    .array(staffIdentitySchema)
                    .parse(
                      await port.request(
                        `/projects/${project.id}/staff?q=${encodeURIComponent(query)}`,
                      ),
                    ),
                ),
              )
            }}
          >
            <label htmlFor={id} className="flex-1 text-sm">
              Encontrar pessoa da equipe
              <Input
                id={id}
                minLength={2}
                maxLength={100}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Button className="self-end" disabled={busy || query.trim().length < 2}>
              Buscar
            </Button>
          </form>
          <div className="my-3 flex flex-wrap gap-2">
            {found.map((person) => (
              <Button
                key={person.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(person)
                  setGrants(
                    team.find((member) => member.id === person.id)?.permissions ?? [
                      'read',
                      'edit',
                      'execute',
                    ],
                  )
                }}
              >
                {person.name}
              </Button>
            ))}
          </div>
          {selected ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">Acesso de {selected.name}</p>
              <div className="flex flex-wrap gap-3">
                {permissions.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={grants.includes(permission)}
                      onChange={(event) =>
                        setGrants((old) =>
                          event.target.checked
                            ? [...old, permission]
                            : old.filter((value) => value !== permission),
                        )
                      }
                    />
                    {labels[permission]}
                  </label>
                ))}
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  void work(async () => {
                    await port.request(`/projects/${project.id}/members`, 'PUT', {
                      operationId: crypto.randomUUID(),
                      userId: selected.id,
                      permissions: grants,
                    })
                    await onChanged()
                    setSelected(null)
                  })
                }
              >
                Salvar permissões
              </Button>
              <p className="text-xs text-muted-foreground">
                Para retirar o acesso, desmarque todas as permissões.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      {error || issue ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {issue || error}
        </p>
      ) : null}
    </details>
  )
}
