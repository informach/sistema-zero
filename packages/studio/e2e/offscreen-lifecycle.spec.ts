import { expect, test } from '@playwright/test'
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
