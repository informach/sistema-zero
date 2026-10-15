import { createHash } from 'node:crypto'
import { profileIdentity } from './profile-identity'

export class Credentials {
  private service: string
  constructor(directory: string) {
    this.service = `sistemazero.agent.${createHash('sha256').update(profileIdentity(directory)).digest('hex').slice(0, 24)}`
  }
  get(name: string) {
    return Bun.secrets.get({ service: this.service, name })
  }
  set(name: string, value: string) {
    return Bun.secrets.set({ service: this.service, name, value })
  }
  delete(name: string) {
    return Bun.secrets.delete({ service: this.service, name })
  }
}
