import type { EncaixeDoModeloDeAgua, ModeloDoCenario } from '@sistemazero/molda-cenarios-core/v2'

/** Curadoria do adaptador da Faísca, fixada pelo conteúdo, sem heurística de nome no motor.
 * lago_nadavel: fabricação registra água em 1,4 m; GLB conferido em 18/11/2026.
 * espuma/caustica/cor_2_brilho são decoração original e não geram piso sólido.
 */
const ENCAIXES: Readonly<Record<string, EncaixeDoModeloDeAgua>> = {
  '87f49a7059052af87ab2d2c162f441b908ce92ded82e4f43936d071a5114fd5b': {
    nivelLocal: 1.4,
    materiaisDaAgua: ['agua'],
    materiaisSolidos: ['cor', 'cor_2'],
  },
}

export function encaixeDaAguaImportada(modelo: Pick<ModeloDoCenario, 'digest'>) {
  const encaixe = ENCAIXES[modelo.digest]
  return encaixe ? structuredClone(encaixe) : undefined
}
