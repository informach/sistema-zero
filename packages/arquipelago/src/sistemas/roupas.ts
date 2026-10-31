import { origemDaRoupa } from '@sistemazero/arquipelago-contracts'
import { AVATAR_PART_INFO } from '@sistemazero/avatar-quarto/avatar/catalog'
import type { Festa } from './festas'
import { NOMES_DAS_FESTAS } from './festas'
import { VIDA_NO_ANEL } from './moradores-do-anel'

export {
  CORACOES_DA_ROUPA,
  ROUPAS_DA_AMIZADE,
  roupasConquistadas,
} from '@sistemazero/arquipelago-contracts'

/** O nome da peça como a loja do avatar mostra ("Chapéu 4", "Cachecol"). */
export function nomeDaPeca(peca: string): string {
  return AVATAR_PART_INFO[peca]?.labelPt ?? peca
}

const NOMES_DO_PEDIDO: Readonly<Record<string, string>> = {
  capi: 'a Capi',
  bento: 'o Bento',
  ...Object.fromEntries(
    Object.entries(VIDA_NO_ANEL).map(([quem, vida]) => [
      quem,
      `${['mare', 'jade', 'irie'].includes(quem) ? 'a' : 'o'} ${vida.nome}`,
    ]),
  ),
}

/**
 * A fala do Zappy quando roupa nova chega ao avatar (§6.28, A21): de quem é o presente da amizade
 * e quais vieram com a festa.
 */
export function falaDasRoupasNovas(novas: readonly string[], festa: Festa | null): string | null {
  if (novas.length === 0) return null
  const partes: string[] = []
  for (const peca of novas) {
    const origem = origemDaRoupa(peca)
    if (origem.tipo === 'amizade')
      partes.push(
        `Roupa nova no seu avatar: ${nomeDaPeca(peca).toLowerCase()}, presente da amizade com ${NOMES_DO_PEDIDO[origem.quem] ?? origem.quem}.`,
      )
  }
  const daFesta = novas.filter((p) => origemDaRoupa(p).tipo === 'festa').map(nomeDaPeca)
  if (daFesta.length > 0) {
    const lista =
      daFesta.length === 1
        ? daFesta[0]!.toLowerCase()
        : `${daFesta
            .slice(0, -1)
            .map((n) => n.toLowerCase())
            .join(', ')} e ${daFesta.at(-1)!.toLowerCase()}`
    partes.push(
      festa
        ? `Roupas ${festa === 'carnaval' ? 'do' : 'da'} ${NOMES_DAS_FESTAS[festa]} no seu avatar: ${lista}. Elas continuam suas depois da festa.`
        : `Roupas de festa no seu avatar: ${lista}.`,
    )
  }
  return partes.join(' ')
}
