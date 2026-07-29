import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Meu Mundo" (o folio-mini do Mundo 3D).
 * Rode com `bun src/official-extensions/world-3d/__gen_meumundo.ts` e cole a
 * saída (o array `js`) em examples.ts. O drift test guarda o resultado.
 *
 * É o flagship: mundo aberto de floresta com morros, água, grama ao vento,
 * ciclo dia/noite, carrinho com turbo e som, natureza espalhada, um totem de
 * boas-vindas, um ponto interativo secreto e uma área que mostra um recado.
 * 100% asset-free (natureza procedural, sem imagens).
 */
export const MEU_MUNDO_SOURCE = `
SZWorld3D.setup({ style: "floresta", world: 180 });
SZWorld3D.terrain(4, 6);
SZWorld3D.water(-8, "#2b6cb0");
SZWorld3D.grass("media");
SZWorld3D.dayNight(4);
SZWorld3D.clearArea(0, 0, 40);
SZWorld3D.scatter(280, "arvores");
SZWorld3D.scatter(90, "pedras");
SZWorld3D.scatter(160, "flores");
SZWorld3D.scatter(40, "cogumelos");
SZWorld3D.car({ style: "passeio", color: "#ef4444" });
SZWorld3D.carBoost(1.5);
SZWorld3D.engineSound("ligado");
SZWorld3D.totemText(0, 14, "Meu Mundo", "Dirija com WASD, turbo no Shift. Ache o ponto secreto!");
SZWorld3D.point("segredo", 35, -35);
SZWorld3D.onPoint("segredo", function () {
  SZWorld3D.say("Voce achou o tesouro escondido!", 3);
  SZWorld3D.cameraShake(0.6, 0.4);
});
SZWorld3D.zone("laguinho", -40, 30, 12);
SZWorld3D.onZone("laguinho", function () {
  SZWorld3D.hud("Cuidado com a agua!", "baixo-esquerda");
});
SZWorld3D.onCrash(function () {
  SZWorld3D.cameraShake(0.5, 0.3);
});
SZWorld3D.onUpdate(function (dt) {
  SZWorld3D.hud("Velocidade: " + Math.round(SZWorld3D.carSpeed()), "topo-direita");
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
  const parsed = stripIds(parseJS(MEU_MUNDO_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
