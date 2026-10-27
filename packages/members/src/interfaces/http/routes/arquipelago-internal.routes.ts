import { UnauthorizedError } from '@sistemazero/core/http'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import type { AdultJourneyService } from '../../../application/adult-journey/adult-journey.service'
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
export function arquipelagoInternalRoutes(deps: {
  kidsJourney: Pick<KidsJourneyQueryService, 'staffPreview'>
  adultJourney: Pick<AdultJourneyService, 'policy'>
  token?: string
}) {
  return new Elysia({ prefix: '/members/internal/arquipelago' })
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
          if (
            error instanceof KidsJourneyInitializingError ||
            error instanceof KidsJourneyUnavailableError
          )
            return { versao: 0, postos: [] as string[] }
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
}
