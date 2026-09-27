import { expect, test } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { migrateProjectDocument } from './index'
import { migrateGameTwoDJavaScript } from './javascript'
import { assertConvertedLifecycle } from './lifecycleAudit'
import { migrateRpgMapsIR } from './rpgMaps'

test('versão desconhecida das áreas não é promovida como se fosse antiga', async () => {
  await expect(
    migrateProjectDocument({
      ...createEmptyProject('future-areas', 'Áreas futuras'),
      formatVersion: 1,
      blocksState: { szBehaviorAreasVersion: 8, blocks: { blocks: [] } },
    }),
  ).rejects.toThrow('versão das áreas')
})

test('registro de mapa no meio de um rascunho antigo não ativa sua criação', async () => {
  await expect(
    migrateProjectDocument({
      ...createEmptyProject('draft-map', 'Mapa solto'),
      formatVersion: 1,
      blocksState: {
        blocks: {
          blocks: [
            { type: 'sz_frame_behavior' },
            {
              type: 'sz_js_console_log_text',
              next: { block: { type: 'sz_gk_rpg_on_map', fields: { MAP: 'vila' } } },
            },
          ],
        },
      },
    }),
  ).rejects.toThrow('rascunho')
})

test('encaixe desconhecido de área é recusado antes de o Blockly descartar seu conteúdo', async () => {
  const project = {
    ...createEmptyProject('bad-frame', 'Original'),
    formatVersion: 1,
    ir: null,
    blocksState: {
      blocks: {
        blocks: [
          { type: 'sz_frame_start', inputs: { BODY: { block: { type: 'sz_g2d_play_jump' } } } },
        ],
      },
    },
  }
  const original = structuredClone(project)
  await expect(migrateProjectDocument(project)).rejects.toThrow('encaixe desconhecido')
  expect(project).toEqual(original)
})

test('o corte do motor recusa o reinício antigo por recarga da página, inclusive opcional', () => {
  for (const code of ['SZGame2D.restart()', 'SZGame2D?.restart?.()', 'SZGame2D["restart"]()']) {
    expect(() => assertConvertedLifecycle({ files: { 'script.js': code } })).toThrow(
      'recarregando a página',
    )
    expect(() =>
      assertConvertedLifecycle({ files: { 'script.js': `SZGame2D.onStart(() => {}); ${code}` } }),
    ).not.toThrow()
  }
})

test('o mapa centralizado avalia argumentos uma vez e na ordem antes de preparar e desenhar', () => {
  const source = 'SZGame2D.drawTileMap(valor(1), valor(2), valor(3), valor(4), valor(5));'
  const migrated = migrateGameTwoDJavaScript(source, [], '$')
  const order: unknown[] = []
  new Function('SZGame2D', 'valor', migrated)(
    {
      centerTileMap: (...args: unknown[]) => order.push(['preparar', ...args]),
      drawTileMap: (...args: unknown[]) => order.push(['desenhar', ...args]),
    },
    (n: number) => {
      order.push(n)
      return n
    },
  )
  expect(order).toEqual([1, 2, 3, 4, 5, ['preparar', 1, 2, 3, 4, 5], ['desenhar', 1, 2]])
})

test('a flag desativada antiga vira motivo atual sem duplicar nem ativar o bloco', async () => {
  const raw = {
    ...createEmptyProject('disabled', 'Desativado'),
    formatVersion: 1,
    ir: null,
    blocksState: {
      szBehaviorAreasVersion: 7,
      blocks: {
        blocks: [
          {
            id: 'sound',
            type: 'sz_g2d_play_jump',
            disabled: true,
            disabledReasons: ['custom', 'MANUALLY_DISABLED'],
          },
        ],
      },
    },
  }
  const { document } = await migrateProjectDocument(raw)
  expect(document.blocksState).toMatchObject({
    blocks: {
      blocks: [
        { id: 'sound', type: 'sz_g2d_play_fx', disabledReasons: ['custom', 'MANUALLY_DISABLED'] },
      ],
    },
  })
  expect(JSON.stringify(document.blocksState)).not.toContain('"disabled":')
  expect(raw.blocksState.blocks.blocks[0]?.disabled).toBe(true)
  expect((await migrateProjectDocument(document)).document).toEqual(document)
})

test('viagem imediata após registrar um mapa exige revisão para não antecipar a entrada', () => {
  expect(() =>
    migrateRpgMapsIR(
      {
        js: [
          { type: 'gk:rpgOnMap', map: 'vila', body: [] },
          { type: 'gk:rpgGoMap', map: 'vila' },
        ],
      },
      [],
    ),
  ).toThrow('ordem dos eventos')
})

test('callback antigo em bloco de propriedade não passa por faltar IR ou código gerado', async () => {
  await expect(
    migrateProjectDocument({
      ...createEmptyProject('callback', 'Inimigo'),
      formatVersion: 1,
      ir: null,
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          blocks: [{ type: 'sz_js_member_set', id: 'callback', fields: { NAME: 'onDefeat' } }],
        },
      },
    }),
  ).rejects.toThrow('onDefeat')
})
