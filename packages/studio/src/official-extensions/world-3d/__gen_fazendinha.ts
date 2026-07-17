import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Fazendinha" (o mundo rural da v3).
 * Rode com `bun src/official-extensions/world-3d/__gen_fazendinha.ts` e cole a
 * saída em examples.ts. O drift test guarda o resultado.
 *
 * Celeiro + moinho girando com o vento + 3 plantações + cerquinha + galinhas
 * e vacas passeando + a Rosa com pergunta ramificada. 100% asset-free.
 */
export const FAZENDINHA_SOURCE = `
SZWorld3D.setup({ style: "fazenda", world: 180 });
SZWorld3D.terrain(2, 8);
SZWorld3D.grass("media");
SZWorld3D.car({ style: "jipe", color: "#16a34a" });
SZWorld3D.barn(-15, 15, 20);
SZWorld3D.windmill(15, 25);
SZWorld3D.crops(4, "milho", 0, 30);
SZWorld3D.crops(3, "alface", -18, 34);
SZWorld3D.crops(3, "abobora", 18, 38);
SZWorld3D.fence(-24, 26, 24, 26);
SZWorld3D.animals(5, "galinhas", -12, 12, 6);
SZWorld3D.animals(3, "vacas", 14, 10, 8);
SZWorld3D.npc("Rosa", -8, 8, "#e04f3f", "palha");
SZWorld3D.npcTalk("Rosa", function () {
  SZWorld3D.npcAsk("Rosa", "O que vamos colher hoje?", "Milho", function () {
    SZWorld3D.npcSay("Rosa", "O milharal fica atras da cerca. Nao pise nas mudas!");
  }, "Alface", function () {
    SZWorld3D.npcSay("Rosa", "As alfaces estao do lado do celeiro. Capriche!");
  });
});
SZWorld3D.setWind(3);
SZWorld3D.weather("folhas");
SZWorld3D.totemText(0, 6, "Fazendinha", "Visite o celeiro, veja o moinho girar e cuide dos bichinhos!");
SZWorld3D.start();
`.trim()

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

if (import.meta.main) {
  const parsed = stripIds(parseJS(FAZENDINHA_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
