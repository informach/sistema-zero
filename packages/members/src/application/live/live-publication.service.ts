import { createHmac, timingSafeEqual } from 'node:crypto'
import { deterministicSourceId } from '../../domain/gamification/source-id'
import { LiveAccessError, LiveUnavailableError } from '../../domain/live/live.errors'
import type { LiveActor } from '../../domain/ports/live-repository.port'
import type { LiveWorkspaceService } from './live-workspace.service'

interface PublicationClaim {
  audience?: 'kids' | 'adult'
  purpose: 'live-showcase'
  workspaceId: string
  revision: number
  userId: string
  accountId: string
  playId: string
  expiresAt: number
}

/** The playable id is bound to the authoritative snapshot, not chosen by the browser. */
export class LivePublicationService {
  constructor(
    private readonly workspace: Pick<LiveWorkspaceService, 'showcaseSnapshot'>,
    private readonly secret: string | undefined,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  private sign(value: string) {
    if (!this.secret)
      throw new LiveUnavailableError('A publicação de oficinas ainda não foi configurada.')
    return createHmac('sha256', this.secret).update(`live-showcase:v1:${value}`).digest('base64url')
  }
  async prepare(
    actor: LiveActor,
    workspaceId: string,
    revision: number,
    clientIdempotencyKey: string,
    audience: 'kids' | 'adult' = 'kids',
  ) {
    const snapshot = await this.workspace.showcaseSnapshot(actor, workspaceId, revision, audience)
    if (audience === 'adult' && snapshot.audience !== 'adult') throw new LiveAccessError()
    const claim: PublicationClaim = {
      ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
      purpose: 'live-showcase',
      workspaceId,
      revision,
      userId: actor.id,
      accountId: actor.accountId,
      // Stable across retries, process restarts and signing-key rotation. A new
      // post gets its own object so deleting it cannot affect another post.
      playId: deterministicSourceId(
        'sistema-zero:live-play:v1:',
        JSON.stringify([actor.accountId, actor.id, workspaceId, revision, clientIdempotencyKey]),
      ),
      expiresAt: this.clock().getTime() + 5 * 60_000,
    }
    const body = Buffer.from(JSON.stringify(claim)).toString('base64url')
    return {
      ...snapshot,
      eligible: true,
      playId: claim.playId,
      publicationToken: `${body}.${this.sign(body)}`,
    }
  }
  async verify(input: {
    userId: string
    accountId: string
    workspaceId: string
    revision: number
    playId: string
    publicationToken: string
    audience?: 'kids' | 'adult'
  }) {
    const parts = input.publicationToken.split('.')
    const body = parts[0],
      signature = parts[1]
    if (parts.length !== 2 || !body || !signature || input.publicationToken.length > 4096)
      throw new LiveAccessError()
    const expected = Buffer.from(this.sign(body)),
      provided = Buffer.from(signature)
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided))
      throw new LiveAccessError()
    let claim: PublicationClaim
    try {
      claim = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PublicationClaim
    } catch {
      throw new LiveAccessError()
    }
    if (
      (claim.audience ?? 'kids') !== (input.audience ?? 'kids') ||
      claim.purpose !== 'live-showcase' ||
      claim.workspaceId !== input.workspaceId ||
      claim.revision !== input.revision ||
      claim.userId !== input.userId ||
      claim.accountId !== input.accountId ||
      claim.playId !== input.playId ||
      !Number.isFinite(claim.expiresAt) ||
      claim.expiresAt <= this.clock().getTime()
    )
      throw new LiveAccessError()
    const snapshot = await this.workspace.showcaseSnapshot(
      { id: input.userId, accountId: input.accountId, name: '', staff: false },
      input.workspaceId,
      input.revision,
      input.audience ?? 'kids',
    )
    if (input.audience === 'adult' && snapshot.audience !== 'adult') throw new LiveAccessError()
    return {
      eligible: true,
      title: snapshot.title,
      ...(input.audience === 'adult' ? { audience: 'adult' as const } : {}),
    }
  }
}
