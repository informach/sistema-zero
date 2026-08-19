import type {
  CreationCleanupJob,
  CreationCleanupRepository,
} from '../../../domain/ports/creation-cleanup-repository.port'

const LEASE_MS = 10 * 60_000
const BASE_RETRY_MS = 60_000
const MAX_RETRY_MS = 60 * 60_000

export function creationCleanupRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(30, Math.trunc(attempts) - 1))
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** exponent)
}

export class CreationCleanupService {
  constructor(
    private readonly repo: CreationCleanupRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  claim(): Promise<CreationCleanupJob | null> {
    const now = this.clock()
    return this.repo.claimDue(now, new Date(now.getTime() - LEASE_MS))
  }

  complete(id: string): Promise<boolean> {
    return this.repo.complete(id, this.clock())
  }

  fail(id: string, error: string, attempts: number): Promise<boolean> {
    const now = this.clock()
    const retryAt = new Date(now.getTime() + creationCleanupRetryDelayMs(attempts))
    return this.repo.fail(id, error.slice(0, 1000), now, retryAt)
  }
}
