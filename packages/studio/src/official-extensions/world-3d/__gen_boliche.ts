import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Boliche na Praça". Rode com
 * `bun src/official-extensions/world-3d/__gen_boliche.ts`. Demonstra o Kit
 * Boliche: pista de 10 pinos + pilhas de latas para o carrinho derrubar.
 * 100% asset-free.
 */
export const BOLICHE_SOURCE = `
SZWorld3D.setup({ style: "praia", world: 160 });
SZWorld3D.terrain(2, 8);
SZWorld3D.water(-3, "#3182ce");
SZWorld3D.grass("pouca");
SZWorld3D.clearArea(0, 0, 50);
SZWorld3D.scatter(60, "arvores");
SZWorld3D.car({ style: "jipe", color: "#2b6cb0" });
SZWorld3D.carBoost(1.5);
SZWorld3D.engineSound("ligado");
SZWorld3D.totemText(0, -12, "Boliche na Praca", "Acelere contra os pinos! Derrube todos para o strike.");
SZWorld3D.bowlingCreate(0, 25, 0);
SZWorld3D.stack(6, "latas", 20, 10);
SZWorld3D.stack(5, "caixas", -20, 10);
SZWorld3D.bowlingOnStrike(function () {
  SZWorld3D.say("STRIKE!", 3);
  SZWorld3D.cameraShake(0.8, 0.5);
});
SZWorld3D.onUpdate(function (dt) {
  SZWorld3D.hud("Pinos: " + SZWorld3D.pinsDown() + "/10", "topo-esquerda");
  SZWorld3D.hud("Derrubados: " + SZWorld3D.knockedCount(), "topo-direita");
});
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
  const parsed = stripIds(parseJS(BOLICHE_SOURCE))
  const bad = [...collectTypes(parsed)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
