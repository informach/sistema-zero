import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Ilha dos Criadores" (o Coastal-like da v2).
 * Rode com `bun src/official-extensions/world-3d/__gen_ilha.ts` e cole a saída
 * em examples.ts. O drift test guarda o resultado.
 *
 * A vitrine da v2 a pé: arquipélago com barco, farol, palmeiras e postes; um
 * personagem que ENTRA no carrinho e no barco com E; uma amiga que conversa em
 * fila (com fonemas); moedas + missão composta pela criança (onCollect + se) e
 * a recompensa com fogos + conquista persistente; minimapa com teleporte.
 * 100% asset-free.
 */
export const ILHA_SOURCE = `
SZWorld3D.setup({ style: "praia", world: 240 });
SZWorld3D.islands(4, 0);
SZWorld3D.grass("pouca");
SZWorld3D.clouds("muitas");
SZWorld3D.ambience("mar");
SZWorld3D.dayNight(6);
SZWorld3D.clearArea(0, 0, 30);
SZWorld3D.scatter(120, "palmeiras");
SZWorld3D.scatter(60, "flores");
SZWorld3D.car({ style: "jipe", color: "#f59e0b" });
SZWorld3D.person("#3b82f6", "palha");
SZWorld3D.boat("#f8fafc");
SZWorld3D.bridge(18, -16, 52, -60, 4);
SZWorld3D.lighthouse(60, -70);
SZWorld3D.lamp(6, 6);
SZWorld3D.lamp(-6, 6);
SZWorld3D.npc("Lia", 8, 10, "#f97316", "palha");
SZWorld3D.npcWander("Lia", 10);
SZWorld3D.npcTalk("Lia", function () {
  SZWorld3D.npcSay("Lia", "Oi! Bem-vindo a ilha!");
  SZWorld3D.npcSay("Lia", "Dizem que o farol guarda um tesouro...");
  SZWorld3D.npcSay("Lia", "Pegue 15 moedas e va ate la!");
});
SZWorld3D.coinsScatter(30);
SZWorld3D.coinsRing(8, 60, -70, 8);
SZWorld3D.quest("moedas", "Pegue 15 moedas");
SZWorld3D.onCollect(function () {
  if (SZWorld3D.coinCount() >= 15) {
    SZWorld3D.questDone("moedas");
  }
});
SZWorld3D.onQuestDone("moedas", function () {
  SZWorld3D.fireworks();
  SZWorld3D.say("Missao completa! Voce e um Cacador de Moedas!", 4);
  SZWorld3D.achievement("Cacador de Moedas");
});
SZWorld3D.marker("moeda", 60, -70);
SZWorld3D.guideArrow(60, -70, "ligada");
SZWorld3D.minimap("teleporte");
SZWorld3D.totemText(0, 12, "Ilha dos Criadores", "Ande com WASD; E entra no carrinho e no barco!");
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
  const parsed = stripIds(parseJS(ILHA_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
