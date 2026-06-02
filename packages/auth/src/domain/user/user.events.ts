import { DomainEvent } from '../shared/domain-event'

/** Um novo usuário foi cadastrado. */
export class UserRegisteredEvent extends DomainEvent {
  readonly eventName = 'user.registered'

  constructor(
    aggregateId: string,
    readonly email: string,
    readonly role: string,
    readonly signupSource: string | null,
  ) {
    super(aggregateId)
  }

  toPayload(): Record<string, unknown> {
    return {
      userId: this.aggregateId,
      email: this.email,
      role: this.role,
      signupSource: this.signupSource,
    }
  }
}
