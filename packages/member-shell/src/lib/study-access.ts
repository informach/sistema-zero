import { z } from 'zod'

export const studyDurationSchema = z.union([
  z.literal(0),
  z.literal(7),
  z.literal(30),
  z.literal(90),
])
export const studyProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  available: z.boolean(),
  expiresAt: z.string().nullable(),
  revoked: z.boolean(),
  lastUsed: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
})
export const studyDeviceViewSchema = z.object({ profiles: z.array(studyProfileSchema) })
export const studyGrantSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  label: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  isCurrentDevice: z.boolean().optional(),
  /** Opcional: o Auth anterior a 11/10/2026 não mandava (a tela cai na régua de sempre). */
  createdAt: z.string().optional(),
})
export const createStudyAccessSchema = z.object({
  profileId: z.string().uuid(),
  label: z.string().trim().min(2).max(60),
  durationDays: studyDurationSchema,
  mode: z.enum(['code', 'current']),
})
export const changeStudyAccessSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke') }),
  z.object({ action: z.literal('renew'), durationDays: studyDurationSchema }),
  z.object({ action: z.literal('rename'), label: z.string().trim().min(2).max(60) }),
])
export type StudyProfile = z.infer<typeof studyProfileSchema>
export type StudyGrantView = z.infer<typeof studyGrantSchema>
export type StudyDuration = z.infer<typeof studyDurationSchema>

export const STUDY_DURATIONS: { value: StudyDuration; label: string }[] = [
  { value: 0, label: 'Somente hoje' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
]

// Origem fictícia só para RESOLVER o destino; nunca sai daqui.
const DESTINATION_BASE = 'https://destino.sistemazero.invalid'
const STUDY_DESTINATION =
  /^\/(?:cursos|oficinas|como-fazer|criar|clube-dos-criadores|estudio|pensa|pinta|molda)(?:\/|$)/

/**
 * Destino depois de entrar como aluno: só páginas de estudo, nunca URL externa, API ou a
 * gestão adulta. ⚠️ O destino é RESOLVIDO (`new URL`) antes da conferência: comparar o texto
 * cru deixava `/cursos/../pais` passar pela regra de `/cursos` e o navegador abria `/pais`.
 * A regra vale para o caminho já normalizado, e a origem precisa continuar a fictícia
 * (`//outro-site`, `/\outro-site` e esquemas mudam a origem e são recusados).
 */
export function safeStudyDestination(value: string | null): string {
  if (!value?.startsWith('/') || /[\\\r\n\t]/.test(value)) return '/'
  let url: URL
  try {
    url = new URL(value, DESTINATION_BASE)
  } catch {
    return '/'
  }
  if (url.origin !== DESTINATION_BASE) return '/'
  // Barra ou ponto codificado num segmento muda de sentido conforme quem decodifica.
  if (/%2f|%5c|%2e/i.test(url.pathname)) return '/'
  if (!STUDY_DESTINATION.test(url.pathname)) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
