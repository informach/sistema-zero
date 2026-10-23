import { z } from 'zod'
import type { Environments } from '../environments/manager'
import type { Dispatcher } from '../execution/dispatcher'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { Services, serviceRequestSchema } from './registry'

export function setupServices(
  supervisor: Supervisor,
  dispatcher: Dispatcher,
  environments: Environments,
) {
  const services = new Services(environments)
  dispatcher.register(
    tool(
      'service_start',
      'Start a bounded service owned by an environment, verify its port owner and HTTP readiness. Does not adopt existing processes. Container service stop revokes its entire lease.',
      'process',
      serviceRequestSchema,
      (input, context) => services.start(input, context),
    ),
  )
  dispatcher.register(
    tool(
      'service_status',
      'Read owned service state and bounded output.',
      'read',
      z.object({ id: z.string() }),
      (input, context) => services.inspect(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'service_stop',
      'Stop only this owned service. A container service also stops its environment.',
      'process',
      z.object({ id: z.string() }),
      (input, context) => services.stop(input.id, context),
    ),
  )
  supervisor.commands.set('services.list', async (raw) =>
    services.list(z.object({ after: z.string().default('') }).parse(raw).after),
  )
  supervisor.cleanup.add(() => services.close())
  return { services, ready: services.initialize() }
}
