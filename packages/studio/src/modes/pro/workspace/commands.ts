export interface ProCommand {
  id: string
  label: string
  enabled: boolean
  shortcut?: string
  keybinding?: 'quickOpen' | 'searchProject' | 'symbols' | 'rename' | 'references'
  run(): void
}

/** Menus and Monaco resolve the latest descriptor, including availability, at invocation. */
export function runProCommand(commands: readonly ProCommand[], id: string): void {
  const command = commands.find((item) => item.id === id)
  if (command?.enabled) command.run()
}

export function findProCommands(commands: ProCommand[], query: string): ProCommand[] {
  const terms = query
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
  return commands.filter((command) => {
    const label = command.label
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return terms.every((term) => label.includes(term))
  })
}
