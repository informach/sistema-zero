import type { JSX } from 'react'
import { StudioCore } from './StudioCore'
import type { StudioEditorProps } from './types'

/**
 * Editor COMPLETO independente do Sistema Zero Studio: projeto livre, com todas
 * as funcionalidades (terminal/IA são opt-in via `features`; preview/console/
 * extensões/export ligados por default). Use para um app/playground de edição
 * autônoma — NÃO carrega conceito de aula (sem nível, allowlist de blocos ou
 * atividade). Para o editor embarcado numa AULA (configurável + auto-correção),
 * use `<StudioLesson>`.
 *
 * Wrapper fino sobre o `StudioCore`: repassa as props de editor sem nenhuma
 * curadoria de aprendizado — a paleta abre cheia (default 'avancado' do
 * `resolveLearning`). Renderizar SOMENTE no client (Monaco/Blockly/IndexedDB).
 */
export function StudioEditor(props: StudioEditorProps): JSX.Element {
  return <StudioCore {...props} />
}
