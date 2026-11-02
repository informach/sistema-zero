import { existsSync, readFileSync } from 'node:fs'
import type { ManifestoDeDesafios } from '../../../packages/arquipelago-contracts/src/desafios'
import { LIMITES_DO_DESAFIO } from '../../../packages/arquipelago-contracts/src/desafios'
import { RESUMOS_DOS_QUADROS } from './resumos'

/** O slug comum aos dois públicos: o adulto só acrescenta `-adulto`. */
export const slugBase = (slug: string) => slug.replace(/-adulto$/, '')

/** Onde mora o print "Como fica" de um quadro (gerado por `imagens.ts`). */
export const arquivoDaImagem = (slug: string) =>
  new URL(`./imagens/${slugBase(slug)}.webp`, import.meta.url)

/**
 * A apresentação dos quadros no jogo (retorno de quem testou, 01/11/2026): a linha "o que se faz"
 * (`resumos.ts`) e o print do jogo resolvido pelo gabarito (`imagens/<slug>.webp`, tirado por
 * `imagens.ts`). Só nos quadros do Quadro das Cores; um quadro sem linha ou sem print sai como
 * estava. Todo gerador de manifesto com quadros passa por aqui, então os testes que comparam o
 * arquivo com o gerador também conferem a apresentação.
 */
export function comApresentacao<M extends ManifestoDeDesafios>(manifesto: M): M {
  return {
    ...manifesto,
    desafios: manifesto.desafios.map((d) => {
      if (d.tipo !== 'quadro-das-cores') return d
      const resumo = RESUMOS_DOS_QUADROS[slugBase(d.slug)]
      const arquivo = arquivoDaImagem(d.slug)
      const imagem = existsSync(arquivo)
        ? `data:image/webp;base64,${readFileSync(arquivo, 'base64')}`
        : undefined
      if (imagem && imagem.length > LIMITES_DO_DESAFIO.imagemCaracteres)
        throw new Error(
          `O print de ${d.slug} passa do teto de ${LIMITES_DO_DESAFIO.imagemCaracteres}.`,
        )
      return {
        ...d,
        conteudo: {
          ...d.conteudo,
          ...(resumo ? { resumo } : {}),
          ...(imagem ? { imagem } : {}),
        },
      }
    }),
  }
}
