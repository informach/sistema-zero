'use client'

import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { COMMUNITY_NAMES, type Platform } from '@/lib/platform'

/** O recorte de uma fila da Turma: a comunidade da lente ou `''`, as duas comunidades juntas. */
export type CommunityScope = Platform | ''

/** As duas opções do filtro: a comunidade da lente (o padrão) e as duas juntas. */
export function communityScopeOptions(
  platform: Platform,
): { value: CommunityScope; label: string }[] {
  return [
    { value: platform, label: `Só a ${COMMUNITY_NAMES[platform]}` },
    { value: '', label: 'As duas comunidades' },
  ]
}

/** Lê o valor do <select> de volta como recorte (qualquer coisa fora da lente é "as duas"). */
export function parseCommunityScope(value: string, platform: Platform): CommunityScope {
  return value === platform ? platform : ''
}

/**
 * Filtro "Comunidade" das filas da Turma (Projetos, Recados): nasce na comunidade da lente e
 * volta para ela quando a lente muda; "As duas comunidades" junta as duas na mesma lista.
 */
export function CommunityScopeSelect({
  id,
  platform,
  value,
  onChange,
}: {
  id: string
  platform: Platform
  value: CommunityScope
  onChange: (scope: CommunityScope) => void
}) {
  return (
    <Field label="Comunidade" htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(parseCommunityScope(e.target.value, platform))}
      >
        {communityScopeOptions(platform).map((option) => (
          <option key={option.value || 'duas'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  )
}
