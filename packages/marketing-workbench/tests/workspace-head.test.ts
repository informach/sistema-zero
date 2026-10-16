import { expect, test } from 'bun:test'
import { WorkspaceHeadReader, workspaceProtocol } from '@sistemazero/marketing-contracts'

test('head rechecks compatibility every cycle without a second project request', async () => {
  const paths: string[] = []
  let minimum = 1
  const reader = new WorkspaceHeadReader(async (path) => {
    paths.push(path)
    if (path === '/protocol') return workspaceProtocol
    if (path === '/head')
      return { ...workspaceProtocol, minimumDesktopProtocol: minimum, projects: [] }
    throw new Error('Unexpected request')
  })
  expect((await reader.read()).projects).toEqual([])
  expect((await reader.read()).projects).toEqual([])
  expect(paths).toEqual(['/protocol', '/head', '/head'])
  minimum = workspaceProtocol.protocol + 1
  await expect(reader.read()).rejects.toThrow()
})

test('older servers retain negotiation and project authorization on every cycle', async () => {
  const paths: string[] = []
  const reader = new WorkspaceHeadReader(async (path) => {
    paths.push(path)
    return path === '/protocol' ? { protocol: 1, minimumDesktopProtocol: 1 } : []
  })
  await reader.read()
  await reader.read()
  expect(paths).toEqual(['/protocol', '/projects', '/protocol', '/projects'])
})
