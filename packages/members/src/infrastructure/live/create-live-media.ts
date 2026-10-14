import type { LiveService } from '../../application/live/live.service'
import type { Database } from '../persistence/drizzle/db'
import { CloudflareSfuClient } from './cloudflare-sfu.client'
import { CloudflareSfuMediaProvider } from './cloudflare-sfu.provider'
import { DrizzleLiveMediaRegistry } from './drizzle-media-registry'
import { HttpLiveMediaSupervisor } from './live-supervisor.client'
import { LiveMediaError } from './media-registry'

export interface LiveMediaConfiguration {
  appId: string
  appSecret: string
  supervisorUrl: string
  supervisorToken: string
  turnKeyId: string
  turnApiToken: string
}

export function createLiveMediaInfrastructure(options: {
  db: Database
  live: LiveService
  config: LiveMediaConfiguration
}) {
  const { config, live } = options
  if (!config.turnKeyId || !config.turnApiToken)
    throw new LiveMediaError('MEDIA_TURN_MISSING', 'Relay de mídia não configurado.', 503)
  return new CloudflareSfuMediaProvider(
    new CloudflareSfuClient(config),
    new DrizzleLiveMediaRegistry(options.db),
    {
      async authorize(actor, occurrenceId, deviceId) {
        const access = await live.authorizeMedia(actor, occurrenceId, deviceId)
        const teacher = access.role === 'teacher'
        const participation = access.participation
        return {
          actorId: actor.id,
          role: access.role,
          canPublishAudio:
            teacher ||
            (!!participation &&
              !participation.microphoneLocked &&
              (access.occurrence.speakingMode === 'open' ||
                (access.occurrence.speakingMode === 'turns' && participation.turnGranted))),
          canPublishVideo: teacher || (!!participation && !participation.cameraLocked),
          muteEpoch: participation?.muteEpoch ?? 0,
          hardEndsAt: access.occurrence.hardEndsAt,
        }
      },
    },
    new HttpLiveMediaSupervisor({ url: config.supervisorUrl, token: config.supervisorToken }),
    async (hardEndsAt) => {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(config.turnKeyId)}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.turnApiToken}`,
            'Content-Type': 'application/json',
          },
          // Bound relay credentials to the remaining occurrence plus 15 minutes, not an account lifetime.
          body: JSON.stringify({
            ttl: Math.max(
              60,
              Math.min(18_000, Math.ceil((Date.parse(hardEndsAt) - Date.now()) / 1000) + 900),
            ),
          }),
          signal: AbortSignal.timeout(5_000),
        },
      )
      if (!response.ok)
        throw new LiveMediaError(
          'MEDIA_TURN_UNAVAILABLE',
          'Não foi possível preparar a conexão da sala.',
          503,
        )
      const result = (await response.json()) as {
        iceServers?: { urls: string | string[]; username?: string; credential?: string }[]
      }
      if (!Array.isArray(result.iceServers) || !result.iceServers.length)
        throw new LiveMediaError('MEDIA_TURN_INVALID', 'Conexão de mídia incompleta.', 503)
      return result.iceServers
    },
  )
}
