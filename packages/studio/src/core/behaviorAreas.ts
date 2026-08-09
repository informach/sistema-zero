/** Áreas de comportamento, na ordem de execução e leitura. */
export const BEHAVIOR_AREAS = ['molds', 'start', 'events', 'loops'] as const

export type BehaviorArea = (typeof BEHAVIOR_AREAS)[number]

/** As seis áreas-container do projeto, na ordem pedagógica. */
export const PROJECT_AREAS = ['structure', 'appearance', ...BEHAVIOR_AREAS] as const

export type ProjectAreaKind = (typeof PROJECT_AREAS)[number]

/** O catálogo também classifica blocos de valor, que não possuem container. */
export const BLOCK_CATALOG_AREAS = [...PROJECT_AREAS, 'value'] as const

export type BlockCatalogArea = (typeof BLOCK_CATALOG_AREAS)[number]

/** Layout canônico usado por “Organizar blocos”. */
export const PROJECT_AREA_LAYOUT_ROWS: readonly (readonly ProjectAreaKind[])[] = [
  ['structure', 'appearance'],
  ['molds', 'start', 'events', 'loops'],
]

/** Rótulos canônicos mostrados na interface, documentação e orientação da IA. */
export const BEHAVIOR_AREA_LABELS: Readonly<Record<BehaviorArea, string>> = Object.freeze({
  molds: '🧩 Meus moldes',
  start: '⚙️ Ao iniciar',
  events: '⚡ Quando acontecer',
  loops: '🔁 Enquanto estiver rodando',
})
