import type { JSX } from 'react'
import type { StudioFeatures } from './config'
import { StudioCore } from './StudioCore'
import type { StudioLessonProps } from './types'

/**
 * Editor de AULA configurável: o professor fixa o projeto inicial, o nível, os
 * blocos/categorias liberados e os modos, e (fase seguinte) uma ATIVIDADE com
 * auto-correção. Consumido pelos wrappers de autoria (admin) e do aluno
 * (member-shell). Para edição autônoma sem conceito de aula, use `<StudioEditor>`.
 *
 * Wrapper fino sobre o `StudioCore`: aplica os DEFAULTS RESTRITOS da aula
 * (terminal/IA/profissional/export/download desligados) e repassa as props de
 * aprendizado + `activity`. O chamador ainda pode religar item a item via
 * `features` (ex.: o aluno desliga também `extensions`). Renderizar SOMENTE no
 * client (Monaco/Blockly/IndexedDB).
 */
export function StudioLesson({ features, ...rest }: StudioLessonProps): JSX.Element {
  // Defaults da aula: editor enxuto. `extensions` NÃO é forçado aqui (segue o
  // default do config = ligado, como na autoria); quem quer cortá-lo passa em
  // `features` (o aluno faz isso). O `features` do chamador sobrescreve.
  const lessonFeatures: StudioFeatures = {
    terminal: false,
    ai: false,
    professional: false,
    export: false,
    download: false,
    ...features,
  }
  return <StudioCore {...rest} features={lessonFeatures} />
}
