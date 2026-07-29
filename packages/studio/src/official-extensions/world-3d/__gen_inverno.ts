import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Inverno Mágico". Rode com
 * `bun src/official-extensions/world-3d/__gen_inverno.ts`. Demonstra estilos,
 * clima e noite: mundo de neve, nevando, à noite, com vento e totens.
 * 100% asset-free.
 */
export const INVERNO_SOURCE = `
SZWorld3D.setup({ style: "neve", world: 170 });
SZWorld3D.terrain(6, 5);
SZWorld3D.setTime("noite");
SZWorld3D.weather("neve");
SZWorld3D.setWind(2);
SZWorld3D.grass("pouca");
SZWorld3D.clearArea(0, 0, 35);
SZWorld3D.scatter(200, "pinheiros");
SZWorld3D.scatter(80, "pedras");
SZWorld3D.car({ style: "jipe", color: "#38bdf8" });
SZWorld3D.carBoost(1.5);
SZWorld3D.engineSound("ligado");
SZWorld3D.totemText(0, 12, "Inverno Magico", "Uma noite de neve. Dirija com cuidado, o gelo escorrega!");
SZWorld3D.totemText(30, -20, "Floresta Gelada", "Os pinheiros dormem sob a neve.");
SZWorld3D.cameraMode("seguir");
SZWorld3D.onUpdate(function (dt) {
  SZWorld3D.hud("Noite de neve", "baixo-esquerda");
});
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
  const parsed = stripIds(parseJS(INVERNO_SOURCE))
  const bad = [...collectTypes(parsed)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
