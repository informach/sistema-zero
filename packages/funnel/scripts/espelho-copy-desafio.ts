/**
 * Espelho editorial das três páginas de oferta do Desafio do Primeiro Jogo (21/10/2026):
 * docs/marketing/kids/desafio-primeiro-jogo/copy/pagina-*.md a partir da copy tipada. A copy vive no
 * código; o espelho existe para ler e revisar a página inteira em Markdown. Para mudar uma frase,
 * edite o `.ts` e rode `bun scripts/espelho-copy-desafio.ts`; `desafio-offer-copy.test.ts` reprova
 * espelho desatualizado.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGINA_DESAFIO_ADULTO } from '../src/funnels/desafio-adulto/oferta/pagina'
import { PAGINA_DESAFIO_9A17 } from '../src/funnels/desafio-primeiro-jogo/oferta/pagina-9a17'
import { PAGINA_DESAFIO_MENOR9 } from '../src/funnels/desafio-primeiro-jogo/oferta/pagina-menor9'
import { espelhoDoModulo } from './espelho-copy-comunidade'

export const PASTA_ESPELHO_DESAFIO = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'kids',
  'desafio-primeiro-jogo',
  'copy',
)

/** As três páginas, na ordem do módulo de cada uma (que é a ordem da página). */
export const MODULOS_ESPELHO_DESAFIO: Record<string, { arquivo: string; modulo: object }> = {
  '9a17': { arquivo: 'pagina-9-a-17.md', modulo: PAGINA_DESAFIO_9A17 },
  'criar-junto': { arquivo: 'pagina-menor-9.md', modulo: PAGINA_DESAFIO_MENOR9 },
  adulto: { arquivo: 'pagina-adulto.md', modulo: PAGINA_DESAFIO_ADULTO },
}

export const CABECALHO_DESAFIO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/desafio-primeiro-jogo/oferta/ e desafio-adulto/oferta/. Edite o código e rode `bun scripts/espelho-copy-desafio.ts` (em packages/funnel). -->'

export function espelhoDesafio(modulo: object): string {
  return espelhoDoModulo(modulo, CABECALHO_DESAFIO)
}

if (import.meta.main) {
  mkdirSync(PASTA_ESPELHO_DESAFIO, { recursive: true })
  for (const { arquivo, modulo } of Object.values(MODULOS_ESPELHO_DESAFIO)) {
    writeFileSync(join(PASTA_ESPELHO_DESAFIO, arquivo), espelhoDesafio(modulo))
    console.log(arquivo)
  }
}
