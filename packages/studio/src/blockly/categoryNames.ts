/**
 * D3 do redesenho do clássico (11/2026): as categorias das linguagens da web com o nome em
 * português e a sigla pequena. SÓ EXIBIÇÃO, aplicada no fim da montagem: o nome original segue
 * sendo a chave da curadoria (`isCategoryAllowed`), do mapa da paleta e do catálogo do Zappy
 * (`openTutorCategory` aceita os dois). Nenhum roteiro gravado cita estas categorias.
 */
export const CATEGORY_DISPLAY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  HTML: 'Página · HTML',
  CSS: 'Estilo · CSS',
  SVG: 'Figuras · SVG',
  Canvas: 'Pintura · Canvas',
  'Canvas 3D': 'Cena 3D',
  Avançado: 'Código avançado',
})

const KEY_BY_DISPLAY: ReadonlyMap<string, string> = new Map(
  Object.entries(CATEGORY_DISPLAY_NAMES).map(([key, display]) => [display, key]),
)

/** O nome-chave de uma categoria a partir do que a paleta mostra ("Página · HTML" → "HTML"). */
export function categoryKey(name: string): string {
  return KEY_BY_DISPLAY.get(name) ?? name
}
