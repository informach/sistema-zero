import 'server-only'
import { type StudyGrantView, studyGrantSchema } from '@sistemazero/member-shell/lib/study-access'
import { z } from 'zod'
import { shell } from './shell'

const grantsView = z.object({ grants: z.array(studyGrantSchema) })

/**
 * As autorizações de cada criança, lidas no servidor para a área dos pais nascer sabendo se a
 * família já preparou algum acesso (o guia e o aviso de vencimento dependem disso, e não só do
 * painel que o responsável abrir). Somente leitura: o Server Component não renova cookies.
 * `null` por criança = a consulta falhou; a tela trata como "não sei", nunca como "sem acesso".
 */
export async function listFamilyGrantsReadonly(
  profileIds: readonly string[],
): Promise<Record<string, StudyGrantView[] | null>> {
  if (!profileIds.length) return {}
  const deviceToken = (await shell.study.getDeviceToken()) ?? undefined
  const entries = await Promise.all(
    profileIds.map(async (profileId) => {
      const response = await shell.gateway
        .gatewayFetchReadonly<unknown>('/auth/kids/grants/list', {
          method: 'POST',
          body: { profileId, deviceToken },
        })
        .catch(() => null)
      const parsed = grantsView.safeParse(response?.status === 200 ? response.body : null)
      return [profileId, parsed.success ? parsed.data.grants : null] as const
    }),
  )
  return Object.fromEntries(entries)
}
