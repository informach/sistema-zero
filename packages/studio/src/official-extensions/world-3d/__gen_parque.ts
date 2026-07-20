import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Parque dos Brinquedos" (o folio-like da v2).
 * Rode com `bun src/official-extensions/world-3d/__gen_parque.ts` e cole a
 * saída em examples.ts. O drift test guarda o resultado.
 *
 * O parquinho de física do folio: letras empurráveis com o nome do parque,
 * bagunça de objetos, boliche com conquista no strike, TNTs em cadeia, o
 * "botão do tornado", show de fogos, carrinho completo (buzina, luzes, marcas,
 * pintura de corrida) e o cantinho de recados. 100% asset-free.
 */
export const PARQUE_SOURCE = `
SZWorld3D.setup({ style: "primavera", world: 200 });
SZWorld3D.terrain(3, 6);
SZWorld3D.flatten(0, 0, 45);
SZWorld3D.grass("media");
SZWorld3D.dayNight(5);
SZWorld3D.scatter(150, "arvores");
SZWorld3D.scatter(80, "flores");
SZWorld3D.car({ style: "corrida", color: "#3b82f6" });
SZWorld3D.carBoost(2);
SZWorld3D.horn();
SZWorld3D.carLights();
SZWorld3D.tireMarks("ligadas");
SZWorld3D.carPaint("listras");
SZWorld3D.letters("PARQUE", 0, 18, 1.4);
SZWorld3D.pushScatter(20, -20, 0, 12);
SZWorld3D.stack(6, "caixas", 20, 0);
SZWorld3D.bowlingCreate(0, -30, 0);
SZWorld3D.bowlingOnStrike(function () {
  SZWorld3D.confetti();
  SZWorld3D.achievement("Strike");
});
SZWorld3D.explosive(30, 20);
SZWorld3D.explosive(30, 26);
SZWorld3D.explosive(34, 23);
SZWorld3D.onExplosion(function () {
  SZWorld3D.cameraShake(0.6, 0.4);
});
SZWorld3D.point("tornado", -30, 25);
SZWorld3D.onPoint("tornado", function () {
  SZWorld3D.tornado(12);
  SZWorld3D.say("SEGURA!", 2);
});
SZWorld3D.point("festa", 25, -12);
SZWorld3D.onPoint("festa", function () {
  SZWorld3D.fireworks();
  SZWorld3D.fireworks();
});
SZWorld3D.coinsLine(10, 0, 5, 0, -25);
SZWorld3D.whisperCorner(-12, 12);
SZWorld3D.minimap("ver");
SZWorld3D.hud("Buzine com H! E tem um segredo: cima cima baixo baixo esq dir esq dir B A", "baixo-esquerda");
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
  const parsed = stripIds(parseJS(PARQUE_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
