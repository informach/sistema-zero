import { z } from 'zod'

export const AdultProfilePreferencesSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .refine(
        (value) =>
          [...value].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
        'Nome inválido.',
      ),
    publicEnabled: z.boolean(),
    voiceEnabled: z.boolean(),
  })
  .strict()
export type AdultProfilePreferences = z.infer<typeof AdultProfilePreferencesSchema>
export const DEFAULT_ADULT_PROFILE_PREFERENCES: AdultProfilePreferences = {
  displayName: 'Criador',
  publicEnabled: false,
  voiceEnabled: false,
}
