import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Corrida do Pôr do Sol". Rode com
 * `bun src/official-extensions/world-3d/__gen_corrida.ts`. Demonstra o Kit
 * Corrida: pista com trilha, 5 checkpoints em ordem, cronômetro e recorde.
 * 100% asset-free.
 */
export const CORRIDA_SOURCE = `
SZWorld3D.setup({ style: "deserto", world: 220 });
SZWorld3D.terrain(5, 7);
SZWorld3D.setTime("entardecer");
SZWorld3D.grass("pouca");
SZWorld3D.clearArea(0, 0, 30);
SZWorld3D.path(0, 0, 60, 40, 8);
SZWorld3D.path(60, 40, 20, -60, 8);
SZWorld3D.path(20, -60, 0, 0, 8);
SZWorld3D.scatter(120, "cactos");
SZWorld3D.scatter(60, "pedras");
SZWorld3D.car({ style: "corrida", color: "#f59e0b" });
SZWorld3D.carBoost(2);
SZWorld3D.engineSound("ligado");
SZWorld3D.totemText(0, 8, "Corrida do Por do Sol", "Passe pelos checkpoints na ordem e feche a volta!");
SZWorld3D.raceCreate(0, 0, 0, 2);
SZWorld3D.raceCheckpoint(60, 40, 0);
SZWorld3D.raceCheckpoint(40, 0, 90);
SZWorld3D.raceCheckpoint(20, -60, 0);
SZWorld3D.raceCheckpoint(-20, -20, 45);
SZWorld3D.raceCheckpoint(-10, 30, 90);
SZWorld3D.raceOnStart(function () {
  SZWorld3D.say("Valendo!", 2);
});
SZWorld3D.raceOnFinish(function () {
  SZWorld3D.say("Chegou! Tempo: " + Math.round(SZWorld3D.raceTime()) + "s", 4);
  SZWorld3D.cameraShake(0.7, 0.5);
});
SZWorld3D.onUpdate(function (dt) {
  SZWorld3D.hud("Recorde: " + Math.round(SZWorld3D.raceBest()) + "s", "baixo-direita");
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
  const parsed = stripIds(parseJS(CORRIDA_SOURCE))
  const bad = [...collectTypes(parsed)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
