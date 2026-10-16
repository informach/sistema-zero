export interface ProCommand {
  id: string
  label: string
  enabled: boolean
  shortcut?: string
  run(): void
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
