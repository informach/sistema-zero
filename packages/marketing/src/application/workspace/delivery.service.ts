import {
  createDeliverySchema,
  deliveryActionSchema,
  idSchema,
  metricsAnalysisSchema,
} from '@sistemazero/marketing-contracts'
import type { DeliveryRepository } from '../../domain/ports/delivery-repository.port'
import type { Actor } from '../actor'
import { parseWorkspace, payloadHash, workspaceActor } from './workspace.service'
export class DeliveryService {
  analyze(actor: Actor, projectId: string, id: string, raw: unknown) {
    const input = parseWorkspace(metricsAnalysisSchema, raw)
    return this.repository.analyze(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input,
      payloadHash({ action: 'analyze-delivery', id, input }),
    )
  }
  metrics(actor: Actor, projectId: string, id: string) {
    return this.repository.metrics(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
    )
  }
  constructor(private readonly repository: DeliveryRepository) {}
  options(actor: Actor, projectId: string) {
    return this.repository.options(workspaceActor(actor), parseWorkspace(idSchema, projectId))
  }
  create(actor: Actor, projectId: string, raw: unknown) {
    const input = parseWorkspace(createDeliverySchema, raw)
    return this.repository.create(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      input,
      payloadHash({ action: 'create-delivery', input }),
    )
  }
  act(actor: Actor, projectId: string, id: string, raw: unknown) {
    const input = parseWorkspace(deliveryActionSchema, raw)
    return this.repository.act(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      input,
      payloadHash({ action: 'delivery-action', id, input }),
    )
  }
  list(actor: Actor, projectId: string, representationId: string, before?: string) {
    return this.repository.list(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, representationId),
      before ? parseWorkspace(idSchema, before) : undefined,
    )
  }
}
