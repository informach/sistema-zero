import { courseProjects } from './desafio-projetos-qa'

function blockTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(blockTypes)
  const node = value as Record<string, unknown>
  return [
    ...(typeof node.type === 'string' ? [node.type] : []),
    ...Object.values(node).flatMap(blockTypes),
  ]
}
/** Fields to review on the existing Studio block, not a replacement project or import payload. */
export function studioSettings(day: number) {
  return {
    kind: 'studio' as const,
    purpose: 'submission' as const,
    chain: 'desafio-primeiro-jogo',
    level: 'iniciante-2d' as const,
    allowedModes: ['blocks' as const],
    allowLevelReveal: false,
    allowBlocks: [...new Set(blockTypes(courseProjects()[day]))].sort(),
    showcase: {
      enabled: day === 5,
      title: 'Nave contra Asteroides',
      summary: 'Um jogo de nave, tiros e asteroides criado no Desafio do Primeiro Jogo.',
    },
  }
}
