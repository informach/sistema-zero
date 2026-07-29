import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Vila das Vocações" (o Vocation Vista da v3).
 * Rode com `bun src/official-extensions/world-3d/__gen_vila.ts` e cole a saída
 * em examples.ts. O drift test guarda o resultado.
 *
 * A vitrine da cidade: cidadezinha completa com trânsito e semáforos, duas
 * PORTAS de profissão (padaria/oficina com cartaz local no lugar dos vídeos
 * do VV), a Guia com PERGUNTA ramificada, missão + conquista, moedas na praça
 * e minimapa com teleporte. 100% asset-free.
 */
export const VILA_SOURCE = `
SZWorld3D.setup({ style: "primavera", world: 200 });
SZWorld3D.city(0, 0, "media", "dia");
SZWorld3D.traffic(6, "semaforos");
SZWorld3D.car({ style: "passeio", color: "#3b82f6" });
SZWorld3D.person("#f59e0b", "bone");
SZWorld3D.door(31, -6, 270, "Padaria", "Cheiro de pao quentinho! A padeira acorda cedinho para assar o pao da vila inteira.", "");
SZWorld3D.door(-31, 6, 90, "Oficina", "Aqui a mecanica conserta os carrinhos da vila. Chaves, parafusos e muita engenhoca!", "");
SZWorld3D.npc("Guia", 4, 6, "#22c55e", "coroa");
SZWorld3D.npcWander("Guia", 4);
SZWorld3D.npcTalk("Guia", function () {
  SZWorld3D.npcSay("Guia", "Bem-vindo a Vila das Vocacoes!");
  SZWorld3D.npcAsk("Guia", "O que voce quer ser quando crescer?", "Padeiro", function () {
    SZWorld3D.npcSay("Guia", "A padaria fica na entrada leste. Va conhecer!");
    SZWorld3D.questDone("conhecer");
  }, "Mecanico", function () {
    SZWorld3D.npcSay("Guia", "A oficina fica na entrada oeste. Boa visita!");
    SZWorld3D.questDone("conhecer");
  });
});
SZWorld3D.quest("conhecer", "Converse com a Guia da vila");
SZWorld3D.onQuestDone("conhecer", function () {
  SZWorld3D.confetti();
  SZWorld3D.achievement("Cidadao da Vila");
});
SZWorld3D.coinsRing(10, 0, 0, 12);
SZWorld3D.minimap("teleporte");
SZWorld3D.hud("Aperte E nas portas e converse com a Guia!", "baixo-esquerda");
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
  const parsed = stripIds(parseJS(VILA_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
