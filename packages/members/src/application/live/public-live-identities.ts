import type { LiveOccurrence, LiveRoomView } from '@sistemazero/core/live'
import type { AuthGateway } from '../../domain/ports/auth-gateway.port'
import type { LiveMediaAuthorization } from './live.service'

/** Resolve current public names after the cohort transaction has released its connection. */
export class PublicLiveIdentities {
  constructor(
    private readonly auth?: Pick<AuthGateway, 'getProfileNames'>,
    private readonly onError?: (error: unknown) => void,
  ) {}

  private async names(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    const names = new Map<string, string>()
    for (let offset = 0; offset < unique.length; offset += 200) {
      try {
        const batch = await this.auth?.getProfileNames(unique.slice(offset, offset + 200))
        for (const [id, name] of batch ?? []) names.set(id, name.trim() || 'Criador(a)')
      } catch (error) {
        // The class remains usable during an identity outage, without exposing old private names.
        this.onError?.(error)
      }
    }
    return names
  }

  private ids(occurrence: LiveOccurrence): string[] {
    return [
      ...occurrence.participants.map((participant) => participant.learnerId),
      ...occurrence.messages.flatMap((message) =>
        message.role === 'learner' && message.authorId ? [message.authorId] : [],
      ),
    ]
  }

  private occurrence(occurrence: LiveOccurrence, names: Map<string, string>): LiveOccurrence {
    return {
      ...occurrence,
      participants: occurrence.participants.map((participant) => ({
        ...participant,
        displayName: names.get(participant.learnerId) ?? 'Criador(a)',
      })),
      messages: occurrence.messages.map((message) =>
        message.role === 'learner'
          ? { ...message, authorName: names.get(message.authorId ?? '') ?? 'Criador(a)' }
          : message,
      ),
    }
  }

  async room(view: LiveRoomView): Promise<LiveRoomView> {
    if (!view.occurrence) return view
    const occurrence =
      view.cohort.course?.audience === 'adult'
        ? view.occurrence
        : this.occurrence(view.occurrence, await this.names(this.ids(view.occurrence)))
    return {
      ...view,
      occurrence: {
        ...occurrence,
        // Resolve identity before hiding classmates' UUIDs from the learner's browser.
        messages: occurrence.messages.map((message) =>
          view.role === 'learner' && message.role === 'learner' && message.authorId !== view.actorId
            ? { ...message, authorId: null }
            : message,
        ),
      },
    }
  }

  async media(accesses: LiveMediaAuthorization[]): Promise<LiveMediaAuthorization[]> {
    const names = await this.names(
      accesses.flatMap((access) =>
        access.cohort.course?.audience === 'adult' ? [] : this.ids(access.occurrence),
      ),
    )
    return accesses.map((access) => {
      if (access.cohort.course?.audience === 'adult') return access
      const occurrence = this.occurrence(access.occurrence, names)
      const participation =
        occurrence.participants.find((participant) => participant.learnerId === access.actorId) ??
        null
      return {
        ...access,
        occurrence,
        participation,
        displayName:
          access.role === 'learner'
            ? (names.get(access.actorId) ?? 'Criador(a)')
            : access.displayName,
      }
    })
  }
}
