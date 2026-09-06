import { describe, expect, it } from 'bun:test'
import {
  commandForShortcut,
  contextualModelCommands,
  MODEL_COMMANDS,
  type ModelCommandContext,
} from './commandRegistry'

const CONTEXTS: readonly ModelCommandContext[] = [
  'build',
  'paint',
  'mesh-vertex',
  'mesh-edge',
  'mesh-face',
  'face-paint',
]

describe('model command registry', () => {
  it('has unique ids and no shortcut collision in the same context', () => {
    expect(new Set(MODEL_COMMANDS.map((command) => command.id)).size).toBe(MODEL_COMMANDS.length)
    for (const context of CONTEXTS) {
      const signatures = contextualModelCommands(context).flatMap((command) =>
        command.shortcut
          ? command.shortcut.keys.map(
              (key) => `${command.shortcut?.modifier ?? 'none'}:${key.toLowerCase()}`,
            )
          : [],
      )
      expect(new Set(signatures).size).toBe(signatures.length)
    }
  })

  it('finds shortcuts only in their valid context', () => {
    const event = { key: 'f', ctrlKey: false, metaKey: false, altKey: false }
    expect(commandForShortcut('paint', event)).toBe('paint.face-editor')
    expect(commandForShortcut('build', event)).toBeNull()
    expect(commandForShortcut('build', { ...event, key: 'd', ctrlKey: true })).toBe(
      'part.duplicate',
    )
    expect(commandForShortcut('mesh-vertex', { ...event, key: 'e' })).toBe('mesh.done')
    expect(commandForShortcut('mesh-face', { ...event, key: 'Escape' })).toBe('mesh.done')
  })

  it('carries availability, disabled reason and execution in the resolved command', () => {
    let ran = false
    const commands = contextualModelCommands('build', {
      'arrange.floor': {
        enabled: false,
        disabledReason: 'Escolha uma peça',
        run: () => {
          ran = true
        },
      },
    })
    const floor = commands.find((command) => command.id === 'arrange.floor')
    expect(floor?.enabled).toBe(false)
    expect(floor?.disabledReason).toBe('Escolha uma peça')
    floor?.run()
    expect(ran).toBe(true)
  })
})
