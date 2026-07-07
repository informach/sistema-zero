'use client'

import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { TeamMember } from '@/lib/types'

/**
 * Select de responsável (equipe staff+ via `/api/team`, micro-cache no BFF).
 * `onChange` devolve id E nome — o backend guarda o nome como SNAPSHOT.
 */
export function OwnerSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string | null
  onChange: (ownerUserId: string | null, ownerName: string | null) => void
  disabled?: boolean
  className?: string
}) {
  const [team, setTeam] = useState<TeamMember[] | null>(null)

  useEffect(() => {
    let alive = true
    apiGet<TeamMember[]>('/api/team')
      .then((members) => {
        if (alive) setTeam(members)
      })
      .catch(() => {
        // Falha ao carregar a equipe não trava o form: fica só "Sem responsável".
        if (alive) setTeam([])
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Select
      value={value ?? ''}
      disabled={disabled || team === null}
      className={className}
      onChange={(e) => {
        const id = e.target.value || null
        const member = team?.find((m) => m.id === id) ?? null
        onChange(id, member?.name ?? null)
      }}
    >
      <option value="">Sem responsável</option>
      {(team ?? []).map((member) => (
        <option key={member.id} value={member.id}>
          {member.name}
        </option>
      ))}
    </Select>
  )
}
