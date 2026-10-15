/** Server-safe catalog; sources and engines never enter this module. */
const catalog = [
  {
    id: 'vanilla-js',
    name: 'Vite + JavaScript',
    description: 'Projeto web simples com arquivos JavaScript.',
    engine: 'web',
  },
  {
    id: 'vanilla-vite',
    name: 'Vite + TypeScript',
    description: 'Projeto web com verificação de tipos.',
    engine: 'web',
  },
  {
    id: 'react-ts',
    name: 'React + TypeScript',
    description: 'Interfaces com componentes React.',
    engine: 'react',
  },
  {
    id: 'three-js',
    name: 'Three.js + JavaScript',
    description: 'Cena 3D para começar do zero.',
    engine: 'three',
  },
  {
    id: 'three-ts',
    name: 'Three.js + TypeScript',
    description: 'Cena 3D com verificação de tipos.',
    engine: 'three',
  },
  {
    id: 'canvas-puzzle',
    name: 'Encaixe de cores · 2D',
    description: 'Organize peças e complete linhas. Tabuleiro, pontuação e dificuldade editáveis.',
    engine: 'canvas',
    kitVersion: 1,
  },
  {
    id: 'canvas-survival',
    name: 'Guardiões da arena · 2D',
    description:
      'Mova-se, use pulsos de luz e sobreviva à arena. Sprites, inimigos e regras editáveis em Canvas 2D.',
    engine: 'canvas',
    kitVersion: 1,
  },
  {
    id: 'phaser-arcade',
    name: 'Patrulha das estrelas · 2D',
    description: 'Pilote, lance luzes e complete ondas de alvos. Arcade com Phaser.',
    engine: 'phaser',
    kitVersion: 1,
  },
  {
    id: 'phaser-platformer',
    name: 'Trilha das sementes · 2D',
    description: 'Pule entre plataformas e reúna sementes. Câmera, física e cenário em camadas.',
    engine: 'phaser',
    kitVersion: 1,
  },
  {
    id: 'three-exploration',
    name: 'Ilha dos cristais · 3D',
    description: 'Explore uma ilha, encontre cristais e abra o portal. Feito com Three.js.',
    engine: 'three',
    kitVersion: 1,
  },
  {
    id: 'canvas-grid-arena',
    name: 'Arena dos faróis · 2D',
    description:
      'Planeje pulsos em uma grade, abra caminhos e acenda faróis. Regras e cenário editáveis.',
    engine: 'canvas',
    kitVersion: 1,
  },
  {
    id: 'phaser-tactics',
    name: 'Guardiões da ilha · 2D',
    description:
      'Estratégia por turnos com equipe, terreno, alcance e recrutamento. Feito com Phaser.',
    engine: 'phaser',
    kitVersion: 1,
  },
  {
    id: 'three-tactics',
    name: 'Guardiões da ilha · 3D',
    description: 'Tabuleiro isométrico, seleção e estratégia por turnos. Feito com Three.js.',
    engine: 'three',
    kitVersion: 1,
  },
  {
    id: 'three-action',
    name: 'Jardim das luzes · 3D',
    description: 'Caminhe, mire e acenda alvos com esferas de luz. Feito com Three.js.',
    engine: 'three',
    kitVersion: 1,
  },
] as const

export type StudioProTemplateId = (typeof catalog)[number]['id']
export interface StudioProTemplateMetadata {
  id: StudioProTemplateId
  name: string
  description: string
  engine: 'web' | 'react' | 'canvas' | 'phaser' | 'three'
  devScript: string
  kitVersion?: number
}
export const STUDIO_PRO_TEMPLATES: readonly StudioProTemplateMetadata[] = catalog.map(
  (template) => ({ ...template, devScript: 'dev' }),
)
export const STUDIO_PRO_TEMPLATE_IDS = catalog.map((template) => template.id)
const ids = new Set<string>(STUDIO_PRO_TEMPLATE_IDS)
export function isStudioProTemplateId(value: unknown): value is StudioProTemplateId {
  return typeof value === 'string' && ids.has(value)
}
export function studioProTemplate(id: unknown): StudioProTemplateMetadata | undefined {
  return typeof id === 'string'
    ? STUDIO_PRO_TEMPLATES.find((template) => template.id === id)
    : undefined
}
