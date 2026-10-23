import { expect, it } from 'bun:test'
import { findProCommands, runProCommand } from './commands'

it('resolves current availability before invoking a shared command', () => {
  let runs = 0
  const command = {
    id: 'rename',
    label: 'Renomear símbolo',
    enabled: true,
    run: () => {
      runs++
    },
  }
  expect(findProCommands([command], 'simbolo renomear')).toEqual([command])
  runProCommand([command], 'rename')
  command.enabled = false
  runProCommand([command], 'rename')
  runProCommand([], 'rename')
  expect(runs).toBe(1)
})
