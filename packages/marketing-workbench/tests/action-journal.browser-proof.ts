import { approvedEditionSchema, editionPageSchema } from '@sistemazero/marketing-contracts'
import {
  confirmWorkspaceAction,
  pendingWorkspaceActions,
  retryWorkspaceAction,
  workspaceAction,
} from '../src/action-journal'
import type { WorkbenchPort } from '../src/port'

type Port = Pick<WorkbenchPort, 'identity' | 'userId' | 'request'>
type Fixture = { projectId: string; representationId: string; expectedHash: string }
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
export async function loseResponse(port: Port, fixture: Fixture) {
  console.log('action-journal-renderer: preparing request')
  let committed = '',
    requests = 0,
    failed = false
  const dropping: Port = {
    ...port,
    request: async (path, method, body) => {
      console.log('action-journal-renderer: journal committed; requesting server')
      requests++
      const result = approvedEditionSchema.parse(await port.request(path, method, body))
      console.log('action-journal-renderer: server response received')
      committed = result.id
      throw new Error('Resposta perdida deliberadamente na prova')
    },
  }
  try {
    await workspaceAction(
      dropping,
      `/projects/${fixture.projectId}/editions`,
      {
        schemaVersion: 1,
        representationId: fixture.representationId,
        expectedHash: fixture.expectedHash,
        checks: { copy: true, visual: true, destination: true },
      },
      approvedEditionSchema,
    )
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('deliberadamente')) throw error
    failed = true
  }
  const pending = await pendingWorkspaceActions(port, fixture.projectId)
  console.log('action-journal-renderer: pending read')
  check(
    failed && committed && requests === 1 && pending.items.length === 1,
    'A resposta perdida não preservou exatamente um pedido',
  )
  check(
    (await pendingWorkspaceActions({ ...port, userId: crypto.randomUUID() }, fixture.projectId))
      .items.length === 0,
    'Outra identidade leu a pendência',
  )
  return { committed, operationId: pending.items[0]?.operationId }
}
export async function recover(
  port: Port,
  fixture: Fixture,
  mode: 'read' | 'retry',
  expected: { committed: string; operationId: string },
) {
  const pending = await pendingWorkspaceActions(port, fixture.projectId),
    entry = pending.items[0]
  check(
    entry && entry.operationId === expected.operationId,
    'O recarregamento perdeu a identidade do pedido',
  )
  let posts = 0,
    gets = 0
  const tracked: Port = {
    ...port,
    request: async (path, method, body) => {
      if (method === 'POST') posts++
      else gets++
      return port.request(path, method, body)
    },
  }
  if (mode === 'read') {
    check(await confirmWorkspaceAction(tracked, entry), 'O recibo confirmado não foi encontrado')
    check(posts === 0 && gets === 1, 'Conferir confirmação provocou uma mutação')
  } else {
    const first = approvedEditionSchema.parse(await retryWorkspaceAction(tracked, entry)),
      second = approvedEditionSchema.parse(await retryWorkspaceAction(tracked, entry))
    check(
      first.id === expected.committed && second.id === first.id && posts === 2,
      'A repetição após outra aba confirmar criou uma edição diferente',
    )
  }
  check(
    (await pendingWorkspaceActions(port, fixture.projectId)).items.length === 0,
    'A confirmação não encerrou a pendência local',
  )
  const editions = editionPageSchema.parse(
    await port.request(
      `/projects/${fixture.projectId}/representations/${fixture.representationId}/editions`,
    ),
  )
  check(
    editions.items.filter((item) => item.id === expected.committed).length === 1,
    'O servidor duplicou a edição',
  )
  return {
    restoredOperationId: entry.operationId,
    posts,
    gets,
    editionId: expected.committed,
    editions: editions.items.length,
  }
}
