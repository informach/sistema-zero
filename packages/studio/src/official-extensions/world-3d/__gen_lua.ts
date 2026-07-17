import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Base da Lua" (o mundo lunar da v3).
 * Rode com `bun src/official-extensions/world-3d/__gen_lua.ts` e cole a saída
 * em examples.ts. O drift test guarda o resultado.
 *
 * Gravidade fraquinha + jetpack, foguete e bandeira na base, missão de moedas
 * na cratera grande com conquista "Astronauta". 100% asset-free.
 */
export const LUA_SOURCE = `
SZWorld3D.setup({ style: "lua", world: 180 });
SZWorld3D.person("#e8e8f0", "capacete");
SZWorld3D.personAccessory("jetpack");
SZWorld3D.rocket(8, -10);
SZWorld3D.flag(0, -10, "#ef4444");
SZWorld3D.crater(30, 30, 10);
SZWorld3D.coinsRing(12, 30, 30, 8);
SZWorld3D.quest("moedas", "Pegue 12 moedas na cratera");
SZWorld3D.onCollect(function () {
  if (SZWorld3D.coinCount() >= 12) {
    SZWorld3D.questDone("moedas");
  }
});
SZWorld3D.onQuestDone("moedas", function () {
  SZWorld3D.fireworks();
  SZWorld3D.achievement("Astronauta");
});
SZWorld3D.marker("estrela", 30, 30);
SZWorld3D.guideArrow(30, 30, "ligada");
SZWorld3D.totemText(0, 6, "Base da Lua", "Pulos flutuantes! Segure espaco com o jetpack para voar.");
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
  const parsed = stripIds(parseJS(LUA_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
