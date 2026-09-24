import { courseProjects } from './nave-contra-asteroides-projetos-qa'

function blockTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(blockTypes)
  const node = value as Record<string, unknown>
  return [
    ...(typeof node.type === 'string' ? [node.type] : []),
    ...Object.values(node).flatMap(blockTypes),
  ]
}
/** Configuração de aprendizado do bloco Estúdio declarado no manifesto. */
export function studioSettings(day: number) {
  return {
    kind: 'studio' as const,
    purpose: 'submission' as const,
    chain: day === 0 ? 'desafio-primeiro-jogo' : 'nave-contra-asteroides',
    level: 'iniciante-2d' as const,
    allowedModes: ['blocks' as const],
    allowLevelReveal: false,
    allowBlocks: [...new Set(blockTypes(courseProjects()[day]))].sort(),
    showcase: {
      enabled: day === 5,
      title: 'Nave contra Asteroides',
      summary:
        day === 0
          ? 'Um jogo de nave, tiros e asteroides criado no Desafio do Primeiro Jogo.'
          : 'Um jogo de nave, tiros e asteroides criado em Nave Contra Asteroides.',
    },
  }
}
