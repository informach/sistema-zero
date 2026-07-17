import type { JSX } from 'react'
import { StudioCore } from './StudioCore'
import type { StudioEditorProps } from './types'

/**
 * Editor COMPLETO independente do Sistema Zero Studio: projeto livre, com todas
 * as funcionalidades (terminal/IA são opt-in via `features`; preview/console/
 * extensões/export ligados por default). Use para um app/playground de edição
 * autônoma — NÃO carrega conceito de aula (sem atividade/auto-correção). Para o
 * editor embarcado numa AULA (configurável + auto-correção), use `<StudioLesson>`.
 *
 * Wrapper fino sobre o `StudioCore`. A curadoria de aprendizado é OPCIONAL
 * (07/2026): sem `level`, a paleta abre cheia (default 'avancado-3d' — topo da
 * escada de 6 degraus 2D/3D — do `resolveLearning`); o host kids passa o degrau
 * derivado do RANK do aluno (`resolveStudioTier` do member-shell) com o reveal
 * DESLIGADO — a carreira é o portão estrito do Estúdio Completo.
 * Renderizar SOMENTE no client (Monaco/Blockly/IndexedDB).
 */
export function StudioEditor(props: StudioEditorProps): JSX.Element {
  return <StudioCore {...props} />
}
