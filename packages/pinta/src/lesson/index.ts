/**
 * `@sistemazero/pinta/lesson` — o Pinta embarcado num BLOCO DE AULA (React).
 *
 * Dois consumidores, os dois no navegador:
 * - **admin** edita o desenho inicial do bloco (`PintaLesson` + `PintaHandle`) e o lê pelo handle
 *   na hora de salvar;
 * - **member-shell** monta o mesmo componente para a criança, com a curadoria do professor, e
 *   guarda cada revisão pelo `onChange`.
 *
 * ⚠️ **O servidor não entra aqui.** Para validar na borda (`sanitizePintaAsset`, `PINTA_LIMITS`,
 * `assetFromJson`) use `@sistemazero/pinta/assets`, que é livre de React — o `members` não tem
 * React nas dependências e importar QUALQUER coisa deste barril avalia o `PintaLesson.tsx`.
 * A separação é do grafo de módulos, com teste-guarda em `assets/purity.test.ts`.
 */

// Reexportado por conveniência do navegador: o admin cria o desenho e monta o editor no mesmo
// arquivo. Quem está no servidor importa de `/assets`, nunca daqui.
export * from '../assets'
/**
 * Armazenamento do bloco: `createPintaPersistence({namespace})` abre um banco PRÓPRIO (por bloco +
 * perfil), isolado da galeria pessoal da criança.
 */
export { createPintaPersistence, type PintaPersistence } from '../state/persistence'
export type { PintaHandle, PintaLessonFeatures, PintaLessonProps } from './PintaLesson'
export { PintaLesson } from './PintaLesson'
