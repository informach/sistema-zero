import type { LumiId } from './salvamento'

/**
 * Os Lumis de luz (B12, 31/10/2026, §6.28): a terceira versão de cada família, que só sai dos baús
 * da Íris nos segredos das ilhas (nunca sorteada nem vendida, A28). Ter um Lumi de luz é ter aberto
 * o baú dele: o salvamento não guarda contador (`lumis` não aceita estas espécies), só o bit do
 * segredo em `segredos` (o mesmo de `sistemas/segredos.ts` do jogo; nunca reordenar). A família
 * do Pico não tem baú na própria ilha: o Cristal de Luz fica na gruta debaixo do píer, a caverna
 * da sua ilha.
 */
export const BIT_DO_LUMI_DE_LUZ = {
  'buzio-de-luz': 1, // o vento da sua ilha
  'ipe-de-luz': 2, // o vento do Bosque
  'brigadeiro-de-luz': 4, // o vento da Vila Doce
  'perola-de-luz': 8, // o vento do Recife
  'cristal-de-luz': 64, // a gruta debaixo do píer (mergulho)
  'brotinho-de-luz': 128, // o terraço da montaria no Vale
  'pluma-de-luz': 256, // a nuvem do balão
} as const satisfies Partial<Record<LumiId, number>>

export type LumiDeLuz = keyof typeof BIT_DO_LUMI_DE_LUZ

export const LUMIS_DE_LUZ = Object.keys(BIT_DO_LUMI_DE_LUZ) as LumiDeLuz[]

export function ehLumiDeLuz(id: LumiId): id is LumiDeLuz {
  return id in BIT_DO_LUMI_DE_LUZ
}

/** Quantos Lumis desta espécie ela tem: os presos com a lanterna, ou o de luz do baú aberto. */
export function quantosLumis(
  s: { lumis: Partial<Record<LumiId, number>>; segredos?: number },
  id: LumiId,
): number {
  if (ehLumiDeLuz(id)) return ((s.segredos ?? 0) & BIT_DO_LUMI_DE_LUZ[id]) !== 0 ? 1 : 0
  return s.lumis[id] ?? 0
}

/** Ela tem algum Lumi desta espécie? */
export function temOLumi(
  s: { lumis: Partial<Record<LumiId, number>>; segredos?: number },
  id: LumiId,
): boolean {
  return quantosLumis(s, id) > 0
}

/** O Lumi de luz que sai do baú deste bit de segredo, se houver. */
export function lumiDeLuzDoSegredo(bit: number): LumiDeLuz | null {
  return LUMIS_DE_LUZ.find((id) => BIT_DO_LUMI_DE_LUZ[id] === bit) ?? null
}
