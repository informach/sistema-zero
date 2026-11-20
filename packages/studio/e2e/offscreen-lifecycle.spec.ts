import { expect, type Page, test } from '@playwright/test'
import { buildSync } from 'esbuild'

// A standalone browser fixture uses the actual Blockly and production controller.
// No app globals or mocked WorkspaceSvg methods are needed for disposal checks.
const bundle = buildSync({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      import * as Blockly from 'blockly/core';
      import { createOffscreenBodies } from './src/blockly/offscreenBodies';
      const host = document.getElementById('workspace');
      const workspace = Blockly.inject(host, {sounds:false});
      const center = workspace.centerOnBlock, undo = workspace.undo;
      const first = createOffscreenBodies(workspace);
      const installed = workspace.centerOnBlock !== center && workspace.undo !== undo;
      first.sync();
      first.dispose();
      const restored = workspace.centerOnBlock === center && workspace.undo === undo;
      first.dispose();
      const second = createOffscreenBodies(workspace);
      const wrappedUndo = workspace.undo;
      const wrappedCenter = workspace.centerOnBlock;
      const laterUndo = function(redo) { wrappedUndo.call(this, redo); };
      const laterCenter = function(id, animate) { wrappedCenter.call(this, id, animate); };
      workspace.undo = laterUndo;
      workspace.centerOnBlock = laterCenter;
      second.dispose();
      const preserved = workspace.undo === laterUndo && workspace.centerOnBlock === laterCenter;
      workspace.undo(false);
      const emptyHistory = workspace.getUndoStack().length === 0;
      workspace.undo = undo;
      workspace.centerOnBlock = center;
      const third = createOffscreenBodies(workspace);
      third.dispose();
      const remounted = workspace.centerOnBlock === center && workspace.undo === undo;
      workspace.dispose();
      document.body.dataset.result = JSON.stringify({installed,restored,preserved,emptyHistory,remounted});
    `,
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
}).outputFiles[0]?.text

test('demand rendering releases workspace methods and preserves later integrations', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (!bundle) throw new Error('The Blockly lifecycle fixture was not compiled')
  await page.setContent('<div id="workspace" style="width:800px;height:600px"></div>')
  await page.addScriptTag({ content: bundle })
  const result = await page.locator('body').getAttribute('data-result')
  expect(errors).toEqual([])
  expect(JSON.parse(result ?? 'null')).toEqual({
    installed: true,
    restored: true,
    preserved: true,
    emptyHistory: true,
    remounted: true,
  })
})

// "Mostrar o bloco", o cursor do código e o chip do Zappy chegam ao bloco por
// `centerOnBlock`, que o controlador intercepta para devolver o corpo à página.
// Limiar baixo (minBlocks) para provar com poucos blocos de verdade.
const revealBundle = buildSync({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      import * as Blockly from 'blockly/core';
      import 'blockly/blocks';
      import * as En from 'blockly/msg/en';
      import { createOffscreenBodies } from './src/blockly/offscreenBodies';
      Blockly.setLocale(En);
      (async () => {
        const host = document.getElementById('workspace');
        const workspace = Blockly.inject(host, { sounds: false });
        Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [
          { type: 'controls_repeat_ext', id: 'perto', x: 20, y: 20,
            inputs: { DO: { block: { type: 'controls_if', id: 'perto-dentro' } } } },
          { type: 'controls_repeat_ext', id: 'longe', x: 20, y: 6000,
            inputs: { DO: { block: { type: 'controls_if', id: 'longe-dentro' } } } },
        ] } }, workspace);
        const controller = createOffscreenBodies(workspace, { minBlocks: 2 });
        controller.sync();
        await Blockly.renderManagement.finishQueuedRenders();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const svg = (id) => workspace.getBlockById(id).getSvgRoot();
        const farBodyDetached = !svg('longe-dentro').isConnected;
        const nearBodyKept = svg('perto-dentro').isConnected;
        workspace.centerOnBlock('longe-dentro');
        const revealed = svg('longe-dentro').isConnected;
        controller.dispose();
        workspace.dispose();
        document.body.dataset.result = JSON.stringify({ farBodyDetached, nearBodyKept, revealed });
      })();
    `,
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
}).outputFiles[0]?.text

test('centerOnBlock puts a far body back on the page (Mostrar o bloco, code cursor, Zappy)', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (!revealBundle) throw new Error('The reveal fixture was not compiled')
  await page.setContent('<div id="workspace" style="width:800px;height:600px"></div>')
  await page.addScriptTag({ content: revealBundle })
  await expect(page.locator('body')).toHaveAttribute('data-result', /revealed/)
  const result = await page.locator('body').getAttribute('data-result')
  expect(errors).toEqual([])
  expect(JSON.parse(result ?? 'null')).toEqual({
    farBodyDetached: true,
    nearBodyKept: true,
    revealed: true,
  })
})

/*
 * Abertura sem desenhar a cauda distante (`src/blockly/deferredTail.ts`, etapa 3 da evolução).
 *
 * Dois workspaces lado a lado com o MESMO projeto (uma área com 50 unidades encadeadas de 31
 * blocos, 1 551 blocos, acima do limiar de 1 500): um abre como sempre, o outro com a cauda
 * adiada. O que vale comparar é o que a criança e o código veem: o estado gravado, e a posição e o
 * tamanho de cada bloco desenhado. As adaptações do Blockly são globais; o workspace normal na mesma página prova
 * que elas não mudam nada onde não há cauda.
 */
const tailBundle = buildSync({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      import * as Blockly from 'blockly/core';
      import 'blockly/blocks';
      import * as En from 'blockly/msg/en';
      import { showBlocksFromTop } from './src/blockly/cornerSpacer';
      import { isDeferredBlock, prepareDeferredTail } from './src/blockly/deferredTail';
      Blockly.setLocale(En);
      Blockly.common.defineBlocksWithJsonArray([{
        type: 'sz_frame_test', message0: 'area %1 %2',
        args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'CHILDREN' }],
        colour: 200,
      }]);
      // Cada unidade: um "repetir" com 30 comandos no corpo (31 blocos). A cadeia fica curta (50
      // unidades para 1 551 blocos): o caminho normal do Firefox leva 80 s com 300 unidades
      // aninhadas de 2 blocos (6 s com estas 50), e o workspace normal é a régua de cada teste.
      const BODY = 30;
      const unit = (i) => {
        let body;
        for (let k = BODY - 1; k >= 0; k--)
          body = { type: 'controls_if', id: k ? 'c' + i + '_' + k : 'c' + i, ...(body ? { next: { block: body } } : {}) };
        return { type: 'controls_repeat', id: 'u' + i, fields: { TIMES: 10 }, inputs: { DO: { block: body } } };
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
      const units = (name) => {
        const out = [];
        for (let u = block(name, 'area').getInputTargetBlock('CHILDREN'); u; u = u.getNextBlock()) out.push(u);
        return out;
      };
      window.__tail = {
        settle,
        async open(name, count, deferred) {
          const ws = Blockly.inject(document.getElementById(name), {
            sounds: false, renderer: 'zelos', move: { scrollbars: true, drag: true, wheel: true },
          });
          spaces[name] = ws;
          const json = project(count);
          const load = deferred ? prepareDeferredTail(ws, json, true) : null;
          try {
            Blockly.serialization.workspaces.load(load ? load.state : json, ws);
          } finally {
            if (load) load.finish();
          }
          showBlocksFromTop(ws);
          await settle();
          return Boolean(load);
        },
        snapshot(name) {
          const ws = spaces[name], normal = spaces.normal, geometry = [];
          const tracked = Blockly.RenderedConnection.TrackedState.TRACKED;
          const all = ws.getAllBlocks(false);
          const anyDeferred = all.some((b) => isDeferredBlock(b));
          let trackedDeferred = 0;
          for (const b of all) {
            if (isDeferredBlock(b)) {
              if (b.getConnections_(true).some((c) => c.trackedState === tracked)) trackedDeferred++;
              continue;
            }
            const other = normal.getBlockById(b.id);
            const p = b.getRelativeToSurfaceXY(), q = other.getRelativeToSurfaceXY();
            // A área cobre só o que já foi desenhado: a altura dela só vale com a cauda inteira.
            const height = anyDeferred && !b.getParent() ? 0 : Math.abs(b.height - other.height);
            if (Math.abs(p.x - q.x) > 0.01 || Math.abs(p.y - q.y) > 0.01 ||
                Math.abs(b.width - other.width) > 0.01 || height > 0.01)
              geometry.push(b.id);
          }
          // A área termina na borda da última unidade desenhada: a altura dela é a do caminho normal
          // menos o que as adiadas ocupariam (cada uma desconta NOTCH_HEIGHT do encaixe).
          const notch = ws.getRenderer().getConstants().NOTCH_HEIGHT;
          let areaHeightExpected = normal.getBlockById('area').height;
          for (const u of units(name)) if (isDeferredBlock(u)) areaHeightExpected -= normal.getBlockById(u.id).height - notch;
          return {
            areaHeight: ws.getBlockById('area').height,
            areaHeightExpected,
            deferred: Number(document.querySelector('#' + name + ' [data-sz-deferred-blocks]')?.dataset.szDeferredBlocks ?? 0),
            inPage: document.querySelectorAll('#' + name + ' .blocklyBlockCanvas .blocklyDraggable').length,
            state: JSON.stringify(Blockly.serialization.workspaces.save(ws)),
            geometry,
            trackedDeferred,
            deferredInPage: all.filter((b) => isDeferredBlock(b) && b.getSvgRoot().isConnected).length,
            units: units(name).map((u) => !isDeferredBlock(u)),
          };
        },
        isDeferred: (name, id) => isDeferredBlock(block(name, id)),
        inPage: (name, id) => block(name, id).getSvgRoot().isConnected,
        scrollDown(name, px) { const ws = spaces[name]; ws.scroll(ws.scrollX, ws.scrollY - px); },
        center(name, id) {
          const ws = spaces[name];
          ws.centerOnBlock(id, true);
          const view = ws.getMetricsManager().getViewMetrics(true);
          const y = block(name, id).getRelativeToSurfaceXY().y;
          return y >= view.top && y <= view.top + view.height;
        },
        select: (name, id) => block(name, id).select(),
        setField: (name, id, value) => block(name, id).setFieldValue(value, 'TIMES'),
        field: (name, id) => block(name, id).getFieldValue('TIMES'),
        undo: (name, redo) => spaces[name].undo(redo),
        /** Apagar como a tecla Delete: a pilha de baixo sobe para o lugar do apagado. */
        remove: (name, id) => block(name, id).dispose(true),
        /** Leva \`id\` (com o que vem depois dele) para baixo de um bloco novo, longe de tudo. */
        moveUnder(name, id) {
          const novo = spaces[name].newBlock('controls_repeat', 'solto');
          novo.initSvg();
          novo.moveBy(2000, 2000);
          novo.nextConnection.connect(block(name, id).previousConnection);
        },
        /** Encaixa um bloco novo logo depois de \`id\`: o que vinha depois desce para baixo dele. */
        insertAfter(name, id) {
          // Sem desenhar solto antes: um bloco desenhado em (0, 0) empurraria a área para um
          // lugar sorteado (o empurrão do Blockly é aleatório) e os dois lados divergiriam.
          const novo = spaces[name].newBlock('controls_if', 'novo');
          novo.initSvg();
          block(name, id).nextConnection.connect(novo.previousConnection);
        },
        /** Blocos adiados (sem desenho) que estão na página: seriam lixo à vista. */
        deferredInPage: (name) =>
          spaces[name].getAllBlocks(false).filter((b) => isDeferredBlock(b) && b.getSvgRoot().isConnected).length,
        pathBox(name, id) {
          const rect = block(name, id).getSvgRoot().querySelector('.blocklyPath').getBoundingClientRect();
          return { x: rect.x, y: rect.y };
        },
        /**
         * A pilha que começa em \`id\`: é raiz? quantos blocos? As desenhadas com a conexão no lugar
         * e no banco; quais desenhadas, na ordem.
         */
        stack(name, id) {
          const first = block(name, id);
          const tracked = Blockly.RenderedConnection.TrackedState.TRACKED;
          let length = 0, misplaced = 0, untracked = 0;
          const drawn = [];
          for (let b = first; b; b = b.getNextBlock()) {
            length++;
            drawn.push(!isDeferredBlock(b));
            if (isDeferredBlock(b)) continue;
            const c = b.previousConnection;
            if (Math.abs(c.y - b.getRelativeToSurfaceXY().y) > 0.5) misplaced++;
            if (c.trackedState !== tracked) untracked++;
          }
          return { root: first.getParent() === null, length, misplaced, untracked, drawn };
        },
        /** A conexão de baixo da pilha que começa em \`id\` (a que encaixa a pilha em cima de outro). */
        bottomY(name, id) {
          let last = block(name, id);
          while (last.getNextBlock()) last = last.getNextBlock();
          return last.nextConnection.y;
        },
        areaUnits: (name) => units(name).length,
      };
    `,
  },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
}).outputFiles[0]?.text

interface TailSnapshot {
  areaHeight: number
  areaHeightExpected: number
  deferred: number
  inPage: number
  state: string
  geometry: string[]
  trackedDeferred: number
  deferredInPage: number
  units: boolean[]
}

declare global {
  interface Window {
    __tail: {
      settle(): Promise<void>
      open(name: string, count: number, deferred: boolean): Promise<boolean>
      snapshot(name: string): TailSnapshot
      isDeferred(name: string, id: string): boolean
      inPage(name: string, id: string): boolean
      scrollDown(name: string, px: number): void
      center(name: string, id: string): boolean
      select(name: string, id: string): void
      setField(name: string, id: string, value: string): void
      field(name: string, id: string): unknown
      undo(name: string, redo: boolean): void
      remove(name: string, id: string): void
      insertAfter(name: string, id: string): void
      moveUnder(name: string, id: string): void
      deferredInPage(name: string): number
      pathBox(name: string, id: string): { x: number; y: number }
      stack(
        name: string,
        id: string,
      ): { root: boolean; length: number; misplaced: number; untracked: number; drawn: boolean[] }
      bottomY(name: string, id: string): number
      areaUnits(name: string): number
    }
  }
}

/** Abre o mesmo projeto nos dois workspaces e devolve se o adiado de fato adiou. */
async function openPair(page: Page, units = 50): Promise<{ deferred: boolean; errors: string[] }> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (!tailBundle) throw new Error('The deferred tail fixture was not compiled')
  await page.setViewportSize({ width: 1700, height: 700 })
  await page.setContent(
    '<div style="display:flex;gap:8px"><div id="normal" style="width:820px;height:600px"></div>' +
      '<div id="adiado" style="width:820px;height:600px"></div></div>',
  )
  await page.addScriptTag({ content: tailBundle })
  const deferred = await page.evaluate(async (count) => {
    await window.__tail.open('normal', count, false)
    return window.__tail.open('adiado', count, true)
  }, units)
  return { deferred, errors }
}

/** As unidades desenhadas vêm todas antes das adiadas (a k+1 nunca antes da k). */
function topDown(units: boolean[]): boolean {
  const first = units.indexOf(false)
  return first < 0 || units.slice(first).every((drawn) => !drawn)
}

test('cauda adiada: o que está longe fica fora da página, o modelo inteiro e a geometria exata', async ({
  page,
}) => {
  const { deferred, errors } = await openPair(page)
  expect(deferred).toBe(true)
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  const adiado = await page.evaluate(() => window.__tail.snapshot('adiado'))
  expect(normal.inPage).toBe(1551)
  expect(adiado.deferred).toBeGreaterThan(1400)
  expect(adiado.inPage).toBe(1551 - adiado.deferred)
  expect(await page.evaluate(() => window.__tail.inPage('adiado', 'u49'))).toBe(false)
  expect(adiado.state).toBe(normal.state)
  expect(adiado.geometry).toEqual([])
  expect(adiado.areaHeight).toBeCloseTo(adiado.areaHeightExpected, 2)
  // Nada encaixa num bloco invisível: as conexões dos adiados não estão no banco.
  expect(adiado.trackedDeferred).toBe(0)
  expect(adiado.deferredInPage).toBe(0)
  expect(adiado.units.indexOf(false)).toBeGreaterThan(0)
  expect(topDown(adiado.units)).toBe(true)
  expect(errors).toEqual([])
})

test('cauda adiada: rolar desenha as próximas unidades, com a geometria do caminho normal', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  const antes = await page.evaluate(() => window.__tail.snapshot('adiado'))
  for (let vez = 0; vez < 6; vez++)
    await page.evaluate(async () => {
      window.__tail.scrollDown('adiado', 1500)
      await window.__tail.settle()
    })
  const depois = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(depois.deferred).toBeLessThan(antes.deferred)
  expect(depois.deferred).toBeGreaterThan(0)
  expect(depois.geometry).toEqual([])
  expect(depois.areaHeight).toBeCloseTo(depois.areaHeightExpected, 2)
  expect(topDown(depois.units)).toBe(true)
  expect(depois.state).toBe(normal.state)
  expect(depois.trackedDeferred).toBe(0)
  expect(depois.deferredInPage).toBe(0)
  expect(errors).toEqual([])
})

test('cauda adiada: "Mostrar o bloco" e o cursor do código chegam a um bloco ainda não desenhado', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'c35_7'))).toBe(true)
  // "Mostrar o bloco" e o chip do Zappy: `centerOnBlock(id, true)`.
  expect(await page.evaluate(() => window.__tail.center('adiado', 'c35_7'))).toBe(true)
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'c35_7'))).toBe(false)
  expect(await page.evaluate(() => window.__tail.inPage('adiado', 'c35_7'))).toBe(true)
  // O cursor do código seleciona o bloco antes de medir se ele está na vista.
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'u38'))).toBe(true)
  await page.evaluate(() => window.__tail.select('adiado', 'u38'))
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'u38'))).toBe(false)
  const depois = await page.evaluate(async () => {
    await window.__tail.settle()
    return window.__tail.snapshot('adiado')
  })
  expect(depois.units.slice(0, 39).every(Boolean)).toBe(true)
  expect(topDown(depois.units)).toBe(true)
  expect(depois.geometry).toEqual([])
  expect(errors).toEqual([])
})

test('cauda adiada: desfazer e refazer uma mudança num bloco ainda não desenhado', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  // Uma mudança feita por programa (como a Ponte) num bloco adiado entra no histórico sem desenhá-lo.
  await page.evaluate(async () => {
    for (const name of ['normal', 'adiado']) window.__tail.setField(name, 'u40', '7')
    await window.__tail.settle()
  })
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'u40'))).toBe(true)
  await page.evaluate(async () => {
    for (const name of ['normal', 'adiado']) window.__tail.undo(name, false)
    await window.__tail.settle()
  })
  expect(await page.evaluate(() => window.__tail.isDeferred('adiado', 'u40'))).toBe(false)
  expect(await page.evaluate(() => window.__tail.field('adiado', 'u40'))).toBe(10)
  let adiado = await page.evaluate(() => window.__tail.snapshot('adiado'))
  let normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(adiado.state).toBe(normal.state)
  await page.evaluate(async () => {
    for (const name of ['normal', 'adiado']) window.__tail.undo(name, true)
    await window.__tail.settle()
  })
  expect(await page.evaluate(() => window.__tail.field('adiado', 'u40'))).toBe(7)
  adiado = await page.evaluate(() => window.__tail.snapshot('adiado'))
  normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(adiado.state).toBe(normal.state)
  expect(adiado.geometry).toEqual([])
  expect(errors).toEqual([])
})

test('cauda adiada: arrastar uma unidade leva a cauda no modelo, sem desenhá-la, e nada encaixa no fim invisível', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  // Arrastar uma unidade da área (sem segurar Ctrl) leva junto tudo o que vem depois dela, inclusive
  // a cauda que a abertura não desenhou. O gesto não a desenha (custaria a abertura inteira).
  const caixa = await page.evaluate(() => window.__tail.pathBox('adiado', 'u0'))
  await page.mouse.move(caixa.x + 12, caixa.y + 12)
  await page.mouse.down()
  await page.mouse.move(caixa.x + 150, caixa.y + 20, { steps: 8 })
  // No meio do gesto: a conexão de baixo da pilha (num bloco sem desenho) está longe de tudo.
  expect(await page.evaluate(() => window.__tail.bottomY('adiado', 'u0'))).toBeGreaterThan(1e8)
  await page.mouse.move(caixa.x + 300, caixa.y + 40, { steps: 8 })
  await page.mouse.up()
  await page.evaluate(() => window.__tail.settle())
  const pilha = await page.evaluate(() => window.__tail.stack('adiado', 'u0'))
  expect(pilha).toMatchObject({ root: true, length: 50, misplaced: 0, untracked: 0 })
  // A cauda continua sem desenho; o que a vista alcança na pilha nova é desenhado de cima para baixo.
  expect(pilha.drawn[0]).toBe(true)
  expect(pilha.drawn.includes(false)).toBe(true)
  expect(topDown(pilha.drawn)).toBe(true)
  expect(await page.evaluate(() => window.__tail.areaUnits('adiado'))).toBe(0)
  const depois = await page.evaluate(() => window.__tail.snapshot('adiado'))
  expect(depois.deferred).toBeGreaterThan(1000)
  expect(depois.deferredInPage).toBe(0)
  expect(depois.trackedDeferred).toBe(0)
  // Desfazer devolve a pilha à área, como no caminho normal.
  await page.evaluate(async () => {
    window.__tail.undo('adiado', false)
    await window.__tail.settle()
  })
  const desfeito = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(desfeito.state).toBe(normal.state)
  expect(desfeito.geometry).toEqual([])
  expect(desfeito.areaHeight).toBeCloseTo(desfeito.areaHeightExpected, 2)
  expect(desfeito.deferredInPage).toBe(0)
  expect(errors).toEqual([])
})

test('cauda adiada: apagar a última unidade desenhada sobe a cauda, que continua fora da página', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  const aberto = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const ultima = `u${aberto.units.indexOf(false) - 1}`
  // Apagar cura a pilha: a primeira unidade adiada é desencaixada e sobe para o lugar da apagada.
  // Ela é desenhada antes do desencaixe (o Blockly mede a posição dela ali) e o resto da cauda
  // continua fora da página (conferido logo depois de apagar, na mesma tarefa).
  const lixo = await page.evaluate((id) => {
    for (const name of ['normal', 'adiado']) window.__tail.remove(name, id)
    return window.__tail.deferredInPage('adiado')
  }, ultima)
  expect(lixo).toBe(0)
  await page.evaluate(() => window.__tail.settle())
  expect(await page.evaluate(() => window.__tail.deferredInPage('adiado'))).toBe(0)
  const depois = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(depois.inPage).toBe(1520 - depois.deferred)
  expect(depois.state).toBe(normal.state)
  expect(depois.geometry).toEqual([])
  expect(depois.areaHeight).toBeCloseTo(depois.areaHeightExpected, 2)
  expect(topDown(depois.units)).toBe(true)
  expect(errors).toEqual([])
})

test('cauda adiada: encaixar um bloco na fronteira deixa a cauda embaixo dele, o resto fora da página', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  const aberto = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const ultima = `u${aberto.units.indexOf(false) - 1}`
  // A primeira unidade adiada vira órfã e é reencaixada embaixo do bloco novo: ela é desenhada
  // antes do desencaixe e o resto da cauda continua fora da página.
  const lixo = await page.evaluate((id) => {
    for (const name of ['normal', 'adiado']) window.__tail.insertAfter(name, id)
    return window.__tail.deferredInPage('adiado')
  }, ultima)
  expect(lixo).toBe(0)
  await page.evaluate(() => window.__tail.settle())
  const depois = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(depois.deferredInPage).toBe(0)
  expect(depois.state).toBe(normal.state)
  expect(depois.geometry).toEqual([])
  expect(depois.trackedDeferred).toBe(0)
  expect(depois.areaHeight).toBeCloseTo(depois.areaHeightExpected, 2)
  expect(errors).toEqual([])
})

test('cauda adiada: um bloco adiado levado por programa para baixo de um desenhado continua fora da página', async ({
  page,
}) => {
  const { errors } = await openPair(page)
  const aberto = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const adiado = `u${aberto.units.indexOf(false) + 5}`
  // O Blockly troca o pai sem passar por "sem pai" (a conexão é desfeita sem `setParent(null)`) e
  // põe o SVG dentro do novo pai, que está na página: ele sai de novo na mesma hora.
  const lixo = await page.evaluate((id) => {
    for (const name of ['normal', 'adiado']) window.__tail.moveUnder(name, id)
    return window.__tail.deferredInPage('adiado')
  }, adiado)
  expect(lixo).toBe(0)
  await page.evaluate(() => window.__tail.settle())
  const depois = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(depois.deferredInPage).toBe(0)
  expect(depois.state).toBe(normal.state)
  expect(depois.trackedDeferred).toBe(0)
  expect(errors).toEqual([])
})

test('cauda adiada: abaixo de 1 500 blocos nada muda', async ({ page }) => {
  // 1 área + 48 unidades de 31 blocos = 1 489 blocos.
  const { deferred, errors } = await openPair(page, 48)
  expect(deferred).toBe(false)
  const adiado = await page.evaluate(() => window.__tail.snapshot('adiado'))
  const normal = await page.evaluate(() => window.__tail.snapshot('normal'))
  expect(adiado.inPage).toBe(1489)
  expect(adiado.deferred).toBe(0)
  expect(await page.locator('#adiado [data-sz-deferred-blocks]').count()).toBe(0)
  expect(adiado.state).toBe(normal.state)
  expect(adiado.geometry).toEqual([])
  expect(errors).toEqual([])
})
