import { UnauthorizedError } from '@sistemazero/core/http'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { AdultJourneyService } from '../../../application/adult-journey/adult-journey.service'
import type { ArquipelagoReadsService } from '../../../application/arquipelago/arquipelago-reads.service'
import type { KidsJourneyQueryService } from '../../../application/kids-journey/kids-journey-query.service'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../../domain/kids-journey/kids-journey.errors'

/**
 * Leituras S2S para o serviço do jogo (Arquipélago): nunca roteadas pelo gateway nem expostas ao
 * navegador. Token PRÓPRIO, separado do das moedas (`x-arquipelago-token` com o
 * `ARQUIPELAGO_MEMBERS_TOKEN`): quem só lê não move moeda. O formato da resposta é o
 * `JornadaDosMembrosSchema` de `@sistemazero/arquipelago-contracts`, validado do lado do jogo.
 */
const Publico = z.enum(['kids', 'adult'])
const PerguntaDoJogador = z.object({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: Publico,
})

export function arquipelagoInternalRoutes(deps: {
  kidsJourney: Pick<KidsJourneyQueryService, 'staffPreview'>
  adultJourney: Pick<AdultJourneyService, 'policy'>
  leituras: Pick<ArquipelagoReadsService, 'jogador' | 'curriculoDeBlocos'>
  token?: string
}) {
  const jornadaIndisponivel = (error: unknown) =>
    error instanceof KidsJourneyInitializingError || error instanceof KidsJourneyUnavailableError
  return (
    new Elysia({ prefix: '/members/internal/arquipelago' })
      .onBeforeHandle(({ headers }) => {
        if (
          !deps.token ||
          !headers['x-arquipelago-token'] ||
          !safeEqual(headers['x-arquipelago-token'], deps.token)
        )
          throw new UnauthorizedError('Chamada não autorizada')
      })
      .get('/jornada', async () => {
        // Política do Kids não publicada (iniciando ou indisponível) responde versão 0, sem postos;
        // outra falha (banco fora) sobe como erro, para o jogo não ler "não publicada" por engano.
        const kids = await deps.kidsJourney.staffPreview().then(
          (preview) => ({ versao: preview.policyVersion, postos: [...JOURNEY_LEVEL_SLUGS] }),
          (error: unknown) => {
            if (jornadaIndisponivel(error)) return { versao: 0, postos: [] as string[] }
            throw error
          },
        )
        const adulto = await deps.adultJourney.policy()
        return {
          kids,
          adulto: {
            versao: adulto.version,
            configurada: adulto.version > 0 && adulto.policy.stages.length > 0,
            etapas: adulto.policy.stages.map((etapa) => ({ id: etapa.id, titulo: etapa.title })),
          },
        }
      })
      /** Posto (posição) e blocos conquistados de quem joga. 424 = jornada do Kids indisponível. */
      .get('/jogador', async ({ query, set }) => {
        const pergunta = PerguntaDoJogador.safeParse(query)
        if (!pergunta.success) {
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
        try {
          return await deps.leituras.jogador(pergunta.data)
        } catch (error) {
          if (!jornadaIndisponivel(error)) throw error
          set.status = 424
          return { error: { code: 'JORNADA_INDISPONIVEL' } }
        }
      })
      /** Cursos publicados (gravados) com os blocos que liberam e o posto de cada um. */
      .get('/curriculo-de-blocos', async ({ query, set }) => {
        const publico = Publico.safeParse(query.audience)
        if (!publico.success) {
          set.status = 400
          return { error: { code: 'INVALID_QUERY' } }
        }
        try {
          return await deps.leituras.curriculoDeBlocos(publico.data)
        } catch (error) {
          if (!jornadaIndisponivel(error)) throw error
          set.status = 424
          return { error: { code: 'JORNADA_INDISPONIVEL' } }
        }
      })
  )
}
