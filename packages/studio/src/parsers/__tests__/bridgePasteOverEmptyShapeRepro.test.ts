import { describe, expect, it } from 'bun:test'
import { normalizeBlocksStateToFrames } from '../../blockly/normalizeFrames'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { parseProjectFilesWithDiagnostics } from '../project'

const BEFORE = `// Gerado pelo Sistema Zero Studio

SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStageFull("#22d3ee");
  SZGame2D.defineShape("dino", (ctx) => {
    SZGame2D.paintRect(ctx, 20, 50, 8, 14, "#3f8f49");
    SZGame2D.paintRect(ctx, 34, 50, 8, 14, "#3f8f49");
    SZGame2D.paintTriangle(ctx, 8, 30, 8, 46, 0, 38, "#5fb45f");
    SZGame2D.paintRect(ctx, 8, 26, 40, 26, "#5fb45f");
    SZGame2D.paintRect(ctx, 38, 10, 22, 20, "#5fb45f");
    SZGame2D.paintTriangle(ctx, 16, 26, 20, 18, 24, 26, "#3f8f49");
    SZGame2D.paintTriangle(ctx, 26, 26, 30, 18, 34, 26, "#3f8f49");
    SZGame2D.paintCircle(ctx, 52, 18, 4, "#ffffff");
    SZGame2D.paintCircle(ctx, 53, 18, 2, "#20415c");
  });
  const heroi = SZGame2D.createShapeSprite("dino", { x: 100, y: 600, w: 60, h: 64 });
  SZGame2D.defineShape("inimigo", (ctx) => {

  });
  const zumbi = SZGame2D.createEnemyType({ behavior: "patrulha", color: "#aab1cf", image: "", shape: "inimigo", hp: 3, speed: 2, dmg: 1, w: 32, h: 32 });
  SZGame2D.spawnEnemy(zumbi, 100, 100);
  SZGame2D.setGravity(0.5);
  // Quando acontecer
  SZGame2D.onKey("ArrowRight", () => {
    SZGame2D.flipSprite(heroi, "right");
  }, "bridge_events_0");
  SZGame2D.onKey("ArrowLeft", () => {
    SZGame2D.flipSprite(heroi, "left");
  }, "bridge_events_1");
  // Enquanto estiver rodando
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.platformer(heroi, ctx, 4, 11);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.updateEnemyType(zumbi, ctx, heroi);
    SZGame2D.drawEnemyType(ctx, zumbi);
    SZGame2D.overlapSpriteGroup(() => heroi, zumbi, (inimigo) => {
      SZGame2D.pauseGame();
    });
  }, "bridge_loops_0");
}, "__sz-project");`

const PASTED_SHAPE = `SZGame2D.defineShape("inimigo", (ctx) => {
  SZGame2D.paintRect(ctx, 10, 34, 8, 6, "#a83a52");
  SZGame2D.paintRect(ctx, 26, 34, 8, 6, "#a83a52");
  SZGame2D.paintEllipse(ctx, 4, 10, 36, 28, "#e0556b");
  SZGame2D.paintTriangle(ctx, 7, 12, 12, 4, 17, 12, "#a83a52");
  SZGame2D.paintTriangle(ctx, 17, 12, 22, 4, 27, 12, "#a83a52");
  SZGame2D.paintTriangle(ctx, 27, 12, 32, 4, 37, 12, "#a83a52");
  SZGame2D.paintCircle(ctx, 15, 23, 5, "#ffffff");
  SZGame2D.paintCircle(ctx, 29, 23, 5, "#ffffff");
  SZGame2D.paintCircle(ctx, 16, 24, 2, "#20415c");
  SZGame2D.paintCircle(ctx, 28, 24, 2, "#20415c");
  SZGame2D.paintLine(ctx, 9, 16, 19, 19, "#a83a52", 3);
  SZGame2D.paintLine(ctx, 35, 16, 25, 19, "#a83a52", 3);
  SZGame2D.paintLine(ctx, 16, 31, 28, 31, "#a83a52", 3);
});`

// Colar EXATAMENTE por cima do defineShape vazio (indentação do clipboard, col 0).
const AFTER = BEFORE.replace(
  `  SZGame2D.defineShape("inimigo", (ctx) => {

  });`,
  PASTED_SHAPE,
)

describe('Ponte — colar por CIMA do defineShape vazio (dentro do envelope)', () => {
  it('sanity: o replace do teste realmente trocou o trecho', () => {
    expect(AFTER).toContain('paintEllipse')
    expect(AFTER).not.toContain('(ctx) => {\n\n  })')
  })

  it('ANTES da colagem: parse limpo, um de cada', () => {
    const html = '<!doctype html>\n<html><head><title>x</title></head><body></body></html>'
    const r = parseProjectFilesWithDiagnostics({
      'index.html': html,
      'style.css': '',
      'script.js': BEFORE,
    })
    const types = r.ir.behavior.start.concat(r.ir.behavior.events, r.ir.behavior.loops)
    console.log('antes:', JSON.stringify(types.map((s) => s.type)))
    console.log('diagnostics antes:', JSON.stringify(r.diagnostics))
    expect(types.filter((s) => s.type === 'g2d:defineShape')).toHaveLength(2)
  })

  it('DEPOIS da colagem: parse limpo, nada duplica', () => {
    const html = '<!doctype html>\n<html><head><title>x</title></head><body></body></html>'
    const r = parseProjectFilesWithDiagnostics({
      'index.html': html,
      'style.css': '',
      'script.js': AFTER,
    })
    const all = r.ir.behavior.start.concat(r.ir.behavior.events, r.ir.behavior.loops)
    console.log('depois:', JSON.stringify(all.map((s) => s.type)))
    console.log('diagnostics depois:', JSON.stringify(r.diagnostics))
    for (const stmt of all) {
      if (stmt.type === 'rawJS') console.log('RAWJS >>>', JSON.stringify(stmt).slice(0, 300))
    }
    const counts = new Map<string, number>()
    for (const stmt of all) counts.set(stmt.type, (counts.get(stmt.type) ?? 0) + 1)
    expect(counts.get('g2d:defineShape') ?? 0).toBe(2)
    expect(counts.get('g2d:setupFull') ?? 0).toBe(1)
    expect(counts.get('g2d:createShapeSprite') ?? 0).toBe(1)
    expect(counts.get('g2d:defineEnemyType') ?? 0).toBe(1)
    expect(counts.get('rawJS') ?? 0).toBe(0)
  })

  it('CADEIA da Ponte inteira: IR → estado de blocos → normalização do load, sem duplicar', () => {
    const html = '<!doctype html>\n<html><head><title>x</title></head><body></body></html>'
    const countBlocks = (node: unknown, counts: Map<string, number>): void => {
      if (!node || typeof node !== 'object') return
      const rec = node as {
        type?: string
        inputs?: Record<string, { block?: unknown; shadow?: unknown }>
        next?: { block?: unknown }
      }
      if (typeof rec.type === 'string') counts.set(rec.type, (counts.get(rec.type) ?? 0) + 1)
      for (const input of Object.values(rec.inputs ?? {})) countBlocks(input.block, counts)
      countBlocks(rec.next?.block, counts)
    }
    const blockCounts = (state: unknown): Map<string, number> => {
      const counts = new Map<string, number>()
      const tops = (state as { blocks?: { blocks?: unknown[] } }).blocks?.blocks ?? []
      for (const top of tops) countBlocks(top, counts)
      return counts
    }

    for (const script of [BEFORE, AFTER]) {
      const parsed = parseProjectFilesWithDiagnostics({
        'index.html': html,
        'style.css': '',
        'script.js': script,
      })
      // O MESMO caminho do BridgeMode → BlocklyPanel.
      const state = buildWorkspaceStateFromIR(parsed.ir, { omitEmptyAuxFrames: true })
      const normalized = normalizeBlocksStateToFrames(state)
      const before = blockCounts(state)
      const after = blockCounts(normalized)
      console.log('estado bruto:', JSON.stringify([...before.entries()]))
      console.log('normalizado :', JSON.stringify([...after.entries()]))
      expect(after.get('sz_g2d_define_shape') ?? 0).toBe(2)
      expect(after.get('sz_g2d_define_enemy_type') ?? 0).toBe(1)
      expect(after.get('sz_g2d_create_shape_sprite') ?? 0).toBe(1)
      // Nenhum tipo pode CRESCER na normalização.
      for (const [type, n] of before) {
        expect(`${type}:${after.get(type) ?? 0}`).toBe(`${type}:${n}`)
      }
    }
  })
})
