import type { PythonClassicProjectDocument } from '../core/pythonProject'
import type { StudioRuntimeEnvironment } from '../runtime/environment'
import type { PreviewSlot } from './previewDocumentFactory'

/**
 * O que a aba "Meus testes" precisa para rodar um teste no Python (proposta aprovada em
 * 20/11/2026: "no navegador: testar o programa e testar uma função"). Quem tem o ambiente do
 * Python e sabe o que o Rodar rodaria é a prévia (`PythonEditorPreview`); o executor do teste
 * (`studentTests/pythonRunner.ts`) cria com isso uma execução escondida, só dele, e o programa da
 * prévia não muda. Por instância, na mesma vaga da fábrica do documento do JavaScript
 * (`previewDocumentFactory.ts`): dois Estúdios na mesma página não rodam o programa um do outro.
 */
export interface PythonTestHost {
  /** O ambiente do Python desta página (`null` enquanto ele não chegou). */
  environment(): StudioRuntimeEnvironment | null
  /**
   * O projeto como o Rodar o rodaria: o editor descarrega o que ainda segura antes. `null` quando
   * quem olha não pode rodar o programa ou o projeto não é o Python clássico.
   */
  project(): PythonClassicProjectDocument | null
  writerEpoch(): number | null
  /** Quem olha ainda pode rodar o programa (lido a cada passo da execução escondida). */
  canExecute(): boolean
}

export type PythonTestHostSource = PreviewSlot<PythonTestHost>
