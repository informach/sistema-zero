import { z } from 'zod'
import { projectSchema } from './editorial'

export const WORKSPACE_POLL_INTERVAL_MS = 1500
export const workspaceProtocol = {
  protocol: 3,
  minimumDesktopProtocol: 3,
  snapshotPages: 1,
  workspaceHead: 1,
} as const
const protocolSchema = z.object({
  protocol: z.number().int().min(1).max(3),
  minimumDesktopProtocol: z.number().int().min(1).max(3),
  snapshotPages: z.literal(1).optional(),
  workspaceHead: z.literal(1).optional(),
})
export const workspaceHeadSchema = protocolSchema.extend({ projects: z.array(projectSchema) })

/** The current head reauthorizes every project and rechecks compatibility on
 * every cycle. Older servers retain their existing two-request protocol. */
export class WorkspaceHeadReader {
  private supported = false
  constructor(private readonly request: (path: string) => Promise<unknown>) {}
  async read() {
    if (this.supported) return workspaceHeadSchema.parse(await this.request('/head'))
    const protocol = protocolSchema.safeParse(await this.request('/protocol'))
    if (!protocol.success)
      throw new Error(
        'Esta versão do app não é compatível com o servidor. Atualize o app; seus rascunhos foram preservados.',
      )
    if (protocol.data.workspaceHead === 1) {
      const head = workspaceHeadSchema.parse(await this.request('/head'))
      this.supported = true
      return head
    }
    return {
      ...protocol.data,
      projects: z.array(projectSchema).parse(await this.request('/projects')),
    }
  }
}
