import type { StudioFeatures } from './config'

/**
 * Os recursos que a AULA desliga por padrão (editor enxuto). Fonte única: o `StudioLesson` os
 * aplica e o playground monta a aula dos e2e com os mesmos, sem importar o componente.
 */
export const LESSON_DEFAULT_FEATURES = {
  terminal: false,
  ai: false,
  professional: false,
  export: false,
  download: false,
  // O rascunho da aula nunca é apagado: as versões do Histórico do projeto ficariam para sempre.
  projectHistory: false,
} as const satisfies StudioFeatures
