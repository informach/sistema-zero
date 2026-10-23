import {
  configureMonitoringSchema,
  idSchema,
  monitoringObservationSchema,
} from '@sistemazero/marketing-contracts'
import type { MonitoringRepository } from '../../domain/ports/monitoring-repository.port'
import type { Actor } from '../actor'
import { parseWorkspace, payloadHash, workspaceActor } from '../workspace/workspace.service'
export class MonitoringService {
  constructor(private readonly repo: MonitoringRepository) {}
  overview(actor: Actor, projectId: string) {
    return this.repo.overview(workspaceActor(actor), parseWorkspace(idSchema, projectId))
  }
  status(actor: Actor, projectId: string, watchlistId: string, before?: string) {
    return this.repo.status(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, watchlistId),
      before ? parseWorkspace(idSchema, before) : undefined,
    )
  }
  configure(actor: Actor, projectId: string, watchlistId: string, raw: unknown) {
    const input = parseWorkspace(configureMonitoringSchema, raw)
    return this.repo.configure(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, watchlistId),
      input,
      payloadHash({ action: 'configure-monitor', watchlistId, input }),
    )
  }
  observe(actor: Actor, projectId: string, watchlistId: string, raw: unknown) {
    const input = parseWorkspace(monitoringObservationSchema, raw)
    return this.repo.observe(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, watchlistId),
      input,
      payloadHash({ action: 'monitor-observation', watchlistId, input }),
    )
  }
}
