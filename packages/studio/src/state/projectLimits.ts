// Precisa ser ≥ a soma dos sub-limites (arquivos + blocos + assets). Fica num
// módulo leve para a listagem rejeitar arquivos gigantes antes de carregar a
// store completa e o catálogo de extensões.
export const MAX_PROJECT_IMPORT_CHARS = 48_000_000
