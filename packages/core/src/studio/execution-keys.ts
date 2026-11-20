/**
 * As teclas do contrato dos objetivos num caminho leve (`@sistemazero/core/studio/execution-keys`).
 * O quadro do Python aperta a tecla de um teste da aba "Meus testes" e confere a tecla por esta
 * lista; importá-la pelo índice de `@sistemazero/core/learning` levava ao quadro as cenas das aulas
 * inteiras (medido em 20/11/2026: +302 KB no `frame.mjs`). O módulo de origem já entra no quadro
 * pela observação das missões.
 */
export { EXECUTION_KEYS, type ExecutionKey } from '../learning/project-execution'
