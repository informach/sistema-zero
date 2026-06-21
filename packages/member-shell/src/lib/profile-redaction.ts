import type { ProfileView } from './types'

/**
 * In a profile session, the child can see sibling tiles to switch profiles, but
 * sibling PII stays hidden. The active profile keeps its own editable fields so
 * "Meu perfil" does not overwrite them with redacted nulls.
 */
export function redactProfilesForProfileSession(
  profiles: ProfileView[],
  activeProfileId: string | null,
): ProfileView[] {
  if (!activeProfileId) return profiles
  return profiles.map((profile) =>
    profile.id === activeProfileId ? profile : { ...profile, whatsapp: null, birthDate: null },
  )
}
