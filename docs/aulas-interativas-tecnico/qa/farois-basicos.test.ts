import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  clearCourseModelCacheForTests,
  isCourseModelStub,
  pendingCourseModels,
} from '../../../packages/studio/src/core/courseModels'
import {
  asset3DManifest,
  sanitizeProjectAssets,
} from '../../../packages/studio/src/core/projectAssets'
import { parseProjectFilesFromParts } from '../../../packages/studio/src/parsers/project'
import { montarProjetoFarol, montarProjetoFarolDaParte } from './desafio-farol-projeto'
import { ILHA_PARTES, montarProjetoIlha } from './ilha-do-farol-projeto'

function types(value: unknown, found = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return found
  if ('type' in value && typeof value.type === 'string' && value.type.startsWith('sz_'))
    found.add(value.type)
  for (const child of Object.values(value)) types(child, found)
  return found
}
describe('Faróis no Faísca', () => {
  test('todas as etapas usam somente blocos iniciantes, inclusive depois de ler o JavaScript', () => {
    const projects = [
      ...ILHA_PARTES.map((p) => montarProjetoIlha(p)),
      ...(['dia-1', 'dia-2', 'dia-3', 'concluido'] as const).map(montarProjetoFarol),
      ...(
        [
          'andar',
          'borda',
          'recolher',
          'guardar',
          'programar-chave',
          'sem-chave',
          'decisao',
        ] as const
      ).map(montarProjetoFarolDaParte),
    ]
    for (const p of projects) {
      for (const state of [
        p.blocksState,
        buildWorkspaceStateFromIR(
          parseProjectFilesFromParts({
            html: [],
            cssSource: p.files['style.css'],
            jsSource: p.files['script.js'],
          }).ir,
        ),
      ]) {
        for (const type of types(state)) {
          // Sem allowBlocks: uma exceção de paleta não pode mascarar um bloco avançado.
          expect(resolveBlockLevel(type).startsWith('iniciante-'), type).toBe(true)
          expect(type).not.toMatch(/^sz_(?:html|css|canvas|adv)_/)
        }
      }
    }
  })
  test('o arquivo importável leva malhas reais, mesmo com cache vazio', () => {
    const raw = JSON.parse(
      readFileSync(
        new URL(
          '../../aulas-interativas/faisca/a-ilha-do-farol/ilha-do-farol.szproject.json',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const assets = sanitizeProjectAssets(raw.assets)
    expect(assets.length).toBe(raw.assets.length)
    clearCourseModelCacheForTests()
    expect(pendingCourseModels(assets)).toEqual([])
    for (const asset of assets) {
      expect(isCourseModelStub(asset), asset.name).toBe(false)
      const bytes = Buffer.from(asset.dataUrl.split(',')[1]!, 'base64')
      const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
      expect(json.meshes.length, asset.name).toBeGreaterThan(0)
      expect(asset3DManifest([asset])[asset.name]?.dataUrl).toBe(asset.dataUrl)
    }
  })
})
