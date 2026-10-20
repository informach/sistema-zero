/**
 * Espelho editorial das ofertas da Comunidade: docs/marketing/kids/comunidade-dos-criadores/copy/pagina-*.md
 * a partir da copy tipada (src/funnels/comunidade-dos-criadores/oferta). A copy vive no código; o
 * espelho existe para ler e revisar a página inteira em Markdown. Para mudar uma frase, edite o
 * `.ts` e rode `bun scripts/espelho-copy-comunidade.ts`; `comunidade-offer-copy.test.ts` reprova
 * espelho desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGINA_9A17 } from '../src/funnels/comunidade-dos-criadores/oferta/pagina-9a17'
import { PAGINA_CONTINUAR } from '../src/funnels/comunidade-dos-criadores/oferta/pagina-continuar'
import { PAGINA_MENOR9 } from '../src/funnels/comunidade-dos-criadores/oferta/pagina-menor9'

export const PASTA_ESPELHO = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'kids',
  'comunidade-dos-criadores',
  'copy',
)

/**
 * As páginas de oferta Kids (20/10/2026): a copy de cada uma é um módulo tipado, e o espelho lista os
 * textos na ordem do módulo, que é a ordem da página.
 */
export const MODULOS_ESPELHO: Record<string, { arquivo: string; modulo: object }> = {
  '9a17': { arquivo: 'pagina-9-a-17.md', modulo: PAGINA_9A17 },
  'criar-junto': { arquivo: 'pagina-menor-9.md', modulo: PAGINA_MENOR9 },
  continuar: { arquivo: 'pagina-e-continuidade.md', modulo: PAGINA_CONTINUAR },
}

/** Chaves técnicas do módulo que não são texto da página. */
const CHAVES_TECNICAS = new Set([
  'file',
  'arquivo',
  'capa',
  'width',
  'height',
  'id',
  'href',
  'retina',
  'cor',
  'icone',
])

/**
 * O Markdown de uma página de corpo próprio: cada texto do módulo, na ordem, com o caminho da chave
 * para quem revisa achar onde ele está. Imagens aparecem pelo texto alternativo.
 */
export function espelhoDoModulo(modulo: object): string {
  const b: string[] = []
  const visita = (valor: unknown, caminho: string) => {
    if (typeof valor === 'string') {
      b.push(`**${caminho}**: ${valor}`)
      return
    }
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        visita(item, `${caminho}[${i}]`)
      })
      return
    }
    if (valor && typeof valor === 'object')
      for (const [chave, item] of Object.entries(valor)) {
        if (CHAVES_TECNICAS.has(chave)) continue
        visita(item, caminho ? `${caminho}.${chave}` : chave)
      }
  }
  visita(modulo, '')
  return `${CABECALHO}\n\n${b.join('\n\n')}\n`
}

const CABECALHO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-dos-criadores/oferta/. Edite o código e rode `bun scripts/espelho-copy-comunidade.ts` (em packages/funnel). -->'

if (import.meta.main) {
  for (const { arquivo, modulo } of Object.values(MODULOS_ESPELHO)) {
    writeFileSync(join(PASTA_ESPELHO, arquivo), espelhoDoModulo(modulo))
    console.log(arquivo)
  }
}
