export interface BrowserSession {
  id: string
  userId: string
  familyId: string
  expiresAt: Date
}
export interface BrowserSessionRepository {
  /** Atomically consumes one ordinary staff refresh and binds a distinct stable
   * browser credential to the same revocable family and absolute deadline. */
  exchange(refreshHash: string, credentialHash: string, now: Date): Promise<BrowserSession | null>
  find(credentialHash: string, now: Date): Promise<BrowserSession | null>
  disconnect(credentialHash: string, now: Date): Promise<void>
}
