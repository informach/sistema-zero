import { getEnv } from '../lib/env'

/**
 * O endereço que a página do Estúdio passa à galeria para os exemplos GRANDES (o jogo E): a rota
 * do próprio app (`routes/studio-example-files.ts`), só quando o ambiente tem onde guardá-los
 * (`STUDIO_EXAMPLES_ORIGIN`). Sem ela, `undefined`, e o card desses exemplos não aparece.
 */
export function studioExampleFilesBase(): string | undefined {
  return getEnv().STUDIO_EXAMPLES_ORIGIN ? '/api/studio/example-files' : undefined
}
