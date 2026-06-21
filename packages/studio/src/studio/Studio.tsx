// Alias de compatibilidade. O `<Studio>` virou dois componentes públicos sobre
// um núcleo comum (`StudioCore`):
//   - `<StudioEditor>` — editor COMPLETO independente (projeto livre).
//   - `<StudioLesson>` — bloco de AULA configurável (curadoria + auto-correção).
// Este alias mantém a API antiga funcionando enquanto os consumidores migram.

/**
 * @deprecated Use `<StudioEditor>` (editor completo) ou `<StudioLesson>` (bloco
 * de aula configurável). `Studio` é apenas um alias do núcleo `StudioCore`.
 */
export { StudioCore as Studio } from './StudioCore'
