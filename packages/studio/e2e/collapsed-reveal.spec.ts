import { expect, type Page, test } from '@playwright/test'
import { buildSync } from 'esbuild'

/*
 * "Mostrar o bloco" dentro de uma função recolhida da cauda que nasce sem desenho (lote 2 da
 * conclusão, 22/11/2026). No Reino Zero Ultra o gesto travava o Chrome conectado por minutos: o
 * desenho descia pelos corpos ESCONDIDOS de todas as funções recolhidas até o alvo (5.752 blocos
 * redesenhados para abrir uma), e a abertura mudava o projeto salvo, que regerava os 7 mil blocos
 * e subia para a conta.
 *
 * Duas áreas de trabalho lado a lado com o MESMO projeto (50 funções recolhidas de 31 blocos,
 * 1.550 blocos, acima do limiar de 1.500): uma abre como sempre, a outra com a cauda adiada. O
 * gesto é o de verdade (`revealBlockInWorkspace`). O que vale: quantos blocos o gesto desenha, a
 * posição e o tamanho de cada bloco desenhado comparados com o caminho normal, nenhuma conexão de
 * bloco sem desenho no banco de conexões, e o estado salvo igual ao de antes.
 */
const bundle = buildSync({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      import * as Blockly from 'blockly/core';
      import 'blockly/blocks';
      import * as En from 'blockly/msg/en';
      import { showBlocksFromTop } from './src/blockly/cornerSpacer';
      import { isDeferredBlock, prepareDeferredTail } from './src/blockly/deferredTail';
      import { withWorkspaceLoad } from './src/blockly/loadFence';
      import { revealBlockInWorkspace } from './src/blockly/runtimeMark';
      import { saveWorkspaceState } from './src/blockly/savedWorkspaceState';
      Blockly.setLocale(En);
      Blockly.common.defineBlocksWithJsonArray([{
        type: 'sz_frame_test', message0: 'area %1 %2',
        args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'CHILDREN' }],
        colour: 200,
      }]);
      // Os desenhos de cada área de trabalho, contados ANTES de a cauda adiada embrulhar o método:
      // o que ela pula (bloco adiado) não chega aqui.
      const renders = new Map();
      const renderEfficiently = Blockly.BlockSvg.prototype.renderEfficiently;
      Blockly.BlockSvg.prototype.renderEfficiently = function () {
        renders.set(this.workspace.id, (renders.get(this.workspace.id) ?? 0) + 1);
        return renderEfficiently.call(this);
      };
      const BODY = 30;
      const unit = (i) => {
        let body;
        for (let k = BODY - 1; k >= 0; k--)
          body = { type: 'controls_if', id: 'c' + i + '_' + k, ...(body ? { next: { block: body } } : {}) };
        return { type: 'controls_repeat', id: 'u' + i, collapsed: true, fields: { TIMES: 10 },
          inputs: { DO: { block: body } } };
      };
      function project(count) {
        let chain;
        for (let i = count - 1; i >= 0; i--) {
          const item = unit(i);
          if (chain) item.next = { block: chain };
          chain = item;
        }
        return { blocks: { languageVersion: 0, blocks: [
          { type: 'sz_frame_test', id: 'area', x: 20, y: 20, inputs: { CHILDREN: { block: chain } } },
        ] } };
      }
      const settle = async () => {
        for (let i = 0; i < 4; i++) {
          await Blockly.renderManagement.finishQueuedRenders();
          await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 5)));
        }
      };
      const spaces = {};
      const block = (name, id) => spaces[name].getBlockById(id);
      // Um bloco de verdade na página: nem adiado nem dentro de um bloco recolhido.
      const visible = (b) => {
        if (isDeferredBlock(b)) return false;
        for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) if (p.isCollapsed()) return false;
        return true;
      };
      window.__reveal = {
        settle,
        async open(name, deferred) {
          const ws = Blockly.inject(document.getElementById(name), {
            sounds: false, renderer: 'zelos', move: { scrollbars: true, drag: true, wheel: true },
          });
          spaces[name] = ws;
          const json = project(50);
          const load = deferred ? prepareDeferredTail(ws, json, true) : null;
          try {
            withWorkspaceLoad(() => Blockly.serialization.workspaces.load(load ? load.state : json, ws));
          } finally {
            if (load) load.finish();
          }
          showBlocksFromTop(ws);
          await settle();
          return Boolean(load);
        },
        resetRenders() { renders.clear(); },
        renders(name) { return renders.get(spaces[name].id) ?? 0; },
        isDeferred: (name, id) => isDeferredBlock(block(name, id)),
        state: (name) => JSON.stringify(saveWorkspaceState(spaces[name])),
        undoSize: (name) => spaces[name].getUndoStack().length,
        reveal: (name, id) => revealBlockInWorkspace(spaces[name], id, false, { transient: true }),
        setCollapsed: (name, id, collapsed) => block(name, id).setCollapsed(collapsed),
        scrollToEnd(name) {
          const ws = spaces[name];
          for (let i = 0; i < 60; i++) ws.scroll(ws.scrollX, ws.scrollY - 600);
        },
        /** Os blocos à vista que divergem do caminho normal, e as conexões adiadas no banco. */
        compare(name) {
          const ws = spaces[name], normal = spaces.normal;
          const tracked = Blockly.RenderedConnection.TrackedState.TRACKED;
          const geometry = [];
          let trackedDeferred = 0;
          for (const b of ws.getAllBlocks(false)) {
            if (isDeferredBlock(b)) {
              if (b.getConnections_(true).some((c) => c.trackedState === tracked)) trackedDeferred++;
              continue;
            }
            if (!visible(b)) continue;
            if (!b.getParent()) continue;
            const other = normal.getBlockById(b.id);
            const p = b.getRelativeToSurfaceXY(), q = other.getRelativeToSurfaceXY();
            if (Math.abs(p.x - q.x) > 0.01 || Math.abs(p.y - q.y) > 0.01 ||
                Math.abs(b.width - other.width) > 0.01 || Math.abs(b.height - other.height) > 0.01)
              geometry.push(b.id);
          }
          const deferredInPage = ws.getAllBlocks(false)
            .filter((b) => isDeferredBlock(b) && b.getSvgRoot().isConnected && visible(b)).length;
          return { geometry, trackedDeferred, deferredInPage };
        },
      };
    `,
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
}).outputFiles[0]?.text

async function openBoth(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (!bundle) throw new Error('The collapsed reveal fixture was not compiled')
  await page.setContent(
    '<div id="normal" style="width:800px;height:600px"></div><div id="adiado" style="width:800px;height:600px"></div>',
  )
  await page.addScriptTag({ content: bundle })
  const opened = await page.evaluate(async () => {
    const r = (window as unknown as { __reveal: Record<string, (...a: unknown[]) => unknown> })
      .__reveal
    const normal = await r.open?.('normal', false)
    const adiado = await r.open?.('adiado', true)
    return { normal, adiado, alvoAdiado: r.isDeferred?.('adiado', 'c40_15') }
  })
  expect(opened).toEqual({ normal: false, adiado: true, alvoAdiado: true })
  return errors
}

type Reveal = { [name: string]: (...args: unknown[]) => unknown }
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(
    ([fn, args]) =>
      (window as unknown as { __reveal: Reveal }).__reveal[fn as string]?.(...(args as unknown[])),
    [fn, args] as const,
  )

test('mostrar um bloco dentro de uma função recolhida da cauda desenha pouco e não muda o projeto', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors = await openBoth(page)
  const before = await call(page, 'state', 'adiado')
  expect(await call(page, 'state', 'normal')).toBe(before)
  // Desenhar a cauda não é editar: o rótulo da forma recolhida, refeito no desenho depois da
  // carga, não pode entrar no desfazer (nem acordar a regeneração e o salvamento).
  expect(await call(page, 'undoSize', 'adiado')).toBe(0)
  expect(await call(page, 'undoSize', 'normal')).toBe(0)
  await call(page, 'resetRenders')
  expect(await call(page, 'reveal', 'adiado', 'c40_15')).toBe(true)
  expect(await call(page, 'reveal', 'normal', 'c40_15')).toBe(true)
  await call(page, 'settle')
  const drawn = (await call(page, 'renders', 'adiado')) as number
  console.log(`[mostrar na função recolhida] blocos desenhados no gesto: ${drawn}`)
  // Antes: o desenho descia pelos corpos escondidos das 40 funções acima (mais de 1.200 blocos).
  // Agora: as 41 funções como recolhidas, o corpo da que abriu e a área.
  expect(drawn).toBeLessThan(120)
  expect(await call(page, 'compare', 'adiado')).toEqual({
    geometry: [],
    trackedDeferred: 0,
    deferredInPage: 0,
  })
  // Abrir para mostrar não é edição: nada no desfazer e o estado salvo é o de antes.
  expect(await call(page, 'undoSize', 'adiado')).toBe(0)
  expect(await call(page, 'state', 'adiado')).toBe(before)
  expect(await call(page, 'state', 'normal')).toBe(before)
  expect(errors).toEqual([])
})

test('depois de mostrar, rolar até o fim completa a cauda com a geometria exata', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors = await openBoth(page)
  await call(page, 'reveal', 'adiado', 'c40_15')
  await call(page, 'reveal', 'normal', 'c40_15')
  await call(page, 'settle')
  await call(page, 'scrollToEnd', 'adiado')
  await call(page, 'settle')
  await call(page, 'settle')
  expect(await call(page, 'compare', 'adiado')).toEqual({
    geometry: [],
    trackedDeferred: 0,
    deferredInPage: 0,
  })
  expect(errors).toEqual([])
})

test('a criança abre outra função recolhida e recolhe a mostrada: o corpo aparece no lugar e o estado segue o gesto dela', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors = await openBoth(page)
  for (const name of ['adiado', 'normal']) await call(page, 'reveal', name, 'c40_15')
  await call(page, 'settle')
  await call(page, 'scrollToEnd', 'adiado')
  await call(page, 'settle')
  // Abrir uma função cujo corpo nunca foi desenhado, e recolher a que só foi mostrada.
  for (const name of ['adiado', 'normal']) {
    await call(page, 'setCollapsed', name, 'u45', false)
    await call(page, 'setCollapsed', name, 'u40', true)
  }
  await call(page, 'settle')
  expect(await call(page, 'compare', 'adiado')).toEqual({
    geometry: [],
    trackedDeferred: 0,
    deferredInPage: 0,
  })
  const state = (await call(page, 'state', 'adiado')) as string
  expect(await call(page, 'state', 'normal')).toBe(state)
  // A 45 ficou aberta (gesto dela) e a 40 recolhida.
  const parsed = JSON.parse(state)
  const ids: Record<string, boolean> = {}
  const walk = (node: { id?: string; collapsed?: boolean; next?: { block?: unknown } }) => {
    if (node.id) ids[node.id] = node.collapsed === true
    if (node.next?.block) walk(node.next.block as typeof node)
  }
  walk(parsed.blocks.blocks[0].inputs.CHILDREN.block)
  expect(ids.u45).toBe(false)
  expect(ids.u40).toBe(true)
  expect(errors).toEqual([])
})

test('abrir uma função recolhida que ainda não foi desenhada não liga as conexões dela no banco', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors = await openBoth(page)
  // A u48 está na cauda, longe da vista: abrir por programa (desfazer de um "recolher", o
  // "abrir todos") não pode pôr no banco as conexões do corpo, ainda sem desenho e sem lugar.
  expect(await call(page, 'isDeferred', 'adiado', 'u48')).toBe(true)
  await call(page, 'setCollapsed', 'adiado', 'u48', false)
  await call(page, 'settle')
  expect(await call(page, 'isDeferred', 'adiado', 'u48')).toBe(true)
  expect(await call(page, 'compare', 'adiado')).toEqual({
    geometry: [],
    trackedDeferred: 0,
    deferredInPage: 0,
  })
  expect(errors).toEqual([])
})
