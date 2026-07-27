import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Duelo de Heróis Profissional" — o
 * fighting-game do Chris Courses (samurai contra kenji) recriado com o 🥊 Kit
 * Luta do motor avançado (o mesmo kit do `dueloDosBonecosExample`), SEM assets
 * (os dois heróis, o chão e o cenário são `defineLook`/`drawBackground` em
 * blocos de Canvas). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_dueloDeHeroisProfissional.ts`
 * e cole a saída em `examples/dueloDeHeroisProfissionalExample.ts`. O drift test
 * (`__tests__/dueloDeHeroisProfissionalExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (index.js do fighting-game):
 * - São DOIS jogadores humanos (o `player` no A/D/W e o `enemy` nas setas): um no
 *   teclado da esquerda, outro nas setas + teclas de golpe. Sem IA.
 * - Andar (o `velocity.x = -5/5`), pular (o `velocity.y = -20`) e agachar viram o
 *   "Lutador" do kit (`lutaFighter`), que regula o pulo/gravidade de graça.
 * - Cada herói tem golpes: soco rápido (o `attack()` do player, framesCurrent 4),
 *   chute pesado e um especial de barra cheia (`lutaMove`/`lutaAttack`). O combo
 *   emerge da tabela de tempos, como no `dueloDosBonecos`.
 * - A vida cai por golpe (o `enemy.takeHit()` → `health -= 20` do original) e a
 *   barra some (o `gsap.to('#enemyHealth')`); o kit desenha as duas barras e o
 *   relógio no `lutaDrawHud`.
 * - Vence quem ganhar a melhor de 3 rounds OU quem tiver mais vida quando o
 *   relógio zerar (o `determineWinner` do original, que olhava o timer). O
 *   `luta:acabou` escreve o vencedor na tela de fim.
 * - O CHÃO é geral (molde + nascer + colidir), como manda a regra do kit.
 */
export const DUELO_DE_HEROIS_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#241733", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Duelo de Heróis Profissional", "Jogador 1: A/D anda, W pula, S agacha, F defende, G soco, H chute, J especial. Jogador 2: setas + teclas 1 2 3. Melhor de 3 rounds!", "Lutar");
SZGameKit.defineLook("samurai", function (ctx) {
  ctx.fillStyle = "#e8d9b5";
  ctx.fillRect(14, 4, 22, 20);
  ctx.fillStyle = "#b03a2e";
  ctx.fillRect(10, 0, 30, 8);
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(20, 12, 5, 5);
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(10, 24, 30, 46);
  ctx.fillStyle = "#284b73";
  ctx.fillRect(10, 24, 30, 8);
  ctx.fillStyle = "#c0c8d0";
  ctx.fillRect(40, 18, 6, 54);
  ctx.fillStyle = "#2a2f45";
  ctx.fillRect(14, 70, 9, 40);
  ctx.fillRect(28, 70, 9, 40);
}, 50, 110);
SZGameKit.defineLook("ninja", function (ctx) {
  ctx.fillStyle = "#2a2f45";
  ctx.fillRect(14, 4, 22, 20);
  ctx.fillStyle = "#7b2d8e";
  ctx.fillRect(10, 0, 30, 8);
  ctx.fillStyle = "#ff5e5e";
  ctx.fillRect(20, 12, 6, 4);
  ctx.fillStyle = "#8e44ad";
  ctx.fillRect(10, 24, 30, 46);
  ctx.fillStyle = "#6c3483";
  ctx.fillRect(10, 24, 30, 8);
  ctx.fillStyle = "#c0c8d0";
  ctx.fillRect(4, 18, 6, 54);
  ctx.fillStyle = "#22283a";
  ctx.fillRect(14, 70, 9, 40);
  ctx.fillRect(28, 70, 9, 40);
}, 50, 110);
SZGameKit.defineLook("loja", function (ctx) {
  ctx.fillStyle = "#5a4a7a";
  ctx.fillRect(0, 40, 160, 100);
  ctx.fillStyle = "#3d3357";
  ctx.fillRect(0, 40, 160, 14);
  ctx.fillStyle = "#2a2340";
  ctx.fillRect(60, 80, 40, 60);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(20, 64, 26, 20);
  ctx.fillRect(114, 64, 26, 20);
}, 160, 140);
SZGameKit.defineMold("chao", { w: 960, h: 60, health: 1, speed: 0, damage: 0, color: "#3d2b52", image: "", look: "" });
const heroi1 = SZGameKit.createCharacter({ w: 50, h: 110, speed: 260, color: "#4a9eff" });
const heroi2 = SZGameKit.createCharacter({ w: 50, h: 110, speed: 260, color: "#e0526a" });
SZGameKit.stateLook(heroi1, "parado", "samurai");
SZGameKit.stateLook(heroi2, "parado", "ninja");
SZGameKit.lutaMove("soco", heroi1, "rápido", 8, 80, false, false);
SZGameKit.lutaMove("chute", heroi1, "pesado", 16, 100, false, false);
SZGameKit.lutaMove("especial", heroi1, "médio", 26, 120, true, true);
SZGameKit.lutaMove("soco", heroi2, "rápido", 8, 80, false, false);
SZGameKit.lutaMove("chute", heroi2, "pesado", 16, 100, false, false);
SZGameKit.lutaMove("especial", heroi2, "médio", 26, 120, true, true);
SZGameKit.spawnFromMold("chao", 0, 480);
SZGameKit.placeCharacter(heroi1, 230, 370);
SZGameKit.placeCharacter(heroi2, 680, 370);
SZGameKit.lutaMatch(heroi1, heroi2, 3, 40);
SZGameKit.on("luta:acabou", function () {
  SZGameKit.setScreenText("fim", "Fim da luta!", "Venceu o " + SZGameKit.lutaWinner() + ". Bora de revanche?", "Revanche");
  SZGameKit.playEffect("win");
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.lutaFighter(heroi1, "a", "d", "w", "s", "f", dt);
  SZGameKit.lutaFighter(heroi2, "seta esquerda", "seta direita", "seta para cima", "seta para baixo", "0", dt);
  if (SZGameKit.keyPressed("g")) {
    SZGameKit.lutaAttack(heroi1, "soco");
  }
  if (SZGameKit.keyPressed("h")) {
    SZGameKit.lutaAttack(heroi1, "chute");
  }
  if (SZGameKit.keyPressed("j")) {
    SZGameKit.lutaAttack(heroi1, "especial");
  }
  if (SZGameKit.keyPressed("1")) {
    SZGameKit.lutaAttack(heroi2, "soco");
  }
  if (SZGameKit.keyPressed("2")) {
    SZGameKit.lutaAttack(heroi2, "chute");
  }
  if (SZGameKit.keyPressed("3")) {
    SZGameKit.lutaAttack(heroi2, "especial");
  }
  SZGameKit.collideGroup(heroi1, "chao");
  SZGameKit.collideGroup(heroi2, "chao");
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#241733", false);
  SZGameKit.drawLook("loja", 640, 300, 160, 140);
  SZGameKit.drawActive("chao");
  SZGameKit.drawCharacter(heroi1);
  SZGameKit.drawCharacter(heroi2);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.lutaDrawHud();
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(DUELO_DE_HEROIS_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  // IR persistida é JSON: derruba chaves `undefined` e os `__id` efêmeros.
  const stripIds = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripIds)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key !== '__id') out[key] = stripIds(child)
      }
      return out
    }
    return value
  }
  const clean = stripIds(JSON.parse(JSON.stringify(normalized))) as Record<string, unknown>
  const collectTypes = (value: unknown, out: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(value)) {
      for (const item of value) collectTypes(item, out)
    } else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.type === 'string') out.add(record.type)
      for (const child of Object.values(record)) collectTypes(child, out)
    }
    return out
  }
  const types = collectTypes(behaviorStatements(normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)

  // Impressão compacta no estilo dos exemplos: objetos-folha inline, aspas simples.
  const printTS = (value: unknown, indent: string): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      const inner = indent + '  '
      const items = value.map((item) => inner + printTS(item, inner))
      return '[\n' + items.join(',\n') + ',\n' + indent + ']'
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return '{}'
      const flat =
        '{ ' + entries.map(([key, child]) => `${key}: ${printTS(child, indent)}`).join(', ') + ' }'
      if (!flat.includes('\n') && indent.length + flat.length <= 96) return flat
      const inner = indent + '  '
      const lines = entries.map(([key, child]) => `${inner}${key}: ${printTS(child, inner)}`)
      return '{\n' + lines.join(',\n') + ',\n' + indent + '}'
    }
    if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    return String(value)
  }
  const ordered = {
    html: clean.html,
    css: clean.css,
    extensions: clean.extensions,
    version: clean.version,
    behavior: clean.behavior,
  }
  console.log(printTS(ordered, '  '))
}
