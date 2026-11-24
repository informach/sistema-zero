import type { AdultJourneyView } from '@sistemazero/core/journey'
import { FAIXAS_DA_OFICINA, familiasDasFaixas } from '@sistemazero/molda-cenarios-core/v2'
import { adultMoldaOpenBands } from './adult-molda-tool-access'

/**
 * As faixas da oficina de cenários (Molda › Cenários), na mesma régua das faixas do Molda: as
 * três faixas têm os mesmos nomes (`basic`, `intermediate`, `professional`), então cada app
 * traduz a jornada do jeito que já traduz para o Molda e só troca o catálogo de famílias.
 *
 * Ausente (`undefined`) = todas liberadas: a equipe e quem tem as três faixas. O Members confere
 * o mesmo catálogo no lote, então isto só decide o que a tela mostra.
 */
export interface AcessoAsFerramentasDosCenarios {
  allow: string[]
  upcoming: { when: string; families: string[] }[]
}

export function cenariosToolAccessFromBands(
  open: readonly string[],
  upcoming: readonly { when: string; bands: readonly string[] }[],
): AcessoAsFerramentasDosCenarios | undefined {
  if (FAIXAS_DA_OFICINA.every((faixa) => open.includes(faixa))) return undefined
  return {
    allow: familiasDasFaixas(open),
    upcoming: upcoming
      .map((g) => ({
        when: g.when,
        families: familiasDasFaixas(g.bands.filter((b) => !open.includes(b))),
      }))
      .filter((g) => g.families.length > 0),
  }
}

/** Sem a jornada (leitura falhou): só o básico na tela. O Members confere a faixa no lote. */
export function cenariosBasicToolAccess(): AcessoAsFerramentasDosCenarios {
  return { allow: familiasDasFaixas(['basic']), upcoming: [] }
}

/** No adulto: as faixas da jornada adulta, e a mesma frase do Molda para o que vem depois. */
export function adultCenariosToolAccess(
  journey: Pick<AdultJourneyView, 'capabilities' | 'curriculum'>,
): AcessoAsFerramentasDosCenarios | undefined {
  const open = adultMoldaOpenBands(journey)
  return cenariosToolAccessFromBands(open, [
    {
      when: 'Veja na jornada como liberar estas ferramentas.',
      bands: FAIXAS_DA_OFICINA.filter((faixa) => !open.includes(faixa)),
    },
  ])
}
