import type { ProfileAggregate, ProfileSnapshot, VoiceInputActor } from './profile.aggregate'

/** Only explicitly requested fields may be written. Lifecycle and admission are separate operations. */
export interface ProfileDetailsChanges {
  name?: string
  avatarUrl?: string | null
  whatsapp?: string | null
  birthDate?: string | null
  publicProfileEnabled?: boolean
  voiceInputEnabled?: boolean
}

/** Scalars observed under the owned profile lock, for synchronous application authorization. */
export type ProfileDetailsState = Readonly<
  Pick<
    ProfileSnapshot,
    'birthDate' | 'publicProfileEnabled' | 'voiceInputEnabled' | 'admissionState'
  >
>

export interface ProfileDetailsDecision {
  changes: ProfileDetailsChanges
  voiceActor: VoiceInputActor
  now: Date
}

export function profileDetailsState(profile: ProfileAggregate): ProfileDetailsState {
  return Object.freeze({
    birthDate: profile.birthDate,
    publicProfileEnabled: profile.publicProfileEnabled,
    voiceInputEnabled: profile.voiceInputEnabled,
    admissionState: profile.admissionState,
  })
}

/** Domain validation and voice consent transition always use the freshly locked aggregate. */
export function applyProfileDetails(
  profile: ProfileAggregate,
  decision: ProfileDetailsDecision,
): void {
  const { changes, now, voiceActor } = decision
  profile.updateDetails(
    { name: changes.name, avatarUrl: changes.avatarUrl, whatsapp: changes.whatsapp },
    now,
  )
  if (changes.birthDate !== undefined) profile.setBirthDate(changes.birthDate, now)
  if (changes.publicProfileEnabled !== undefined)
    profile.setPublicProfileEnabled(changes.publicProfileEnabled, now)
  if (changes.voiceInputEnabled !== undefined)
    profile.setVoiceInputEnabled(changes.voiceInputEnabled, voiceActor, now)
}
